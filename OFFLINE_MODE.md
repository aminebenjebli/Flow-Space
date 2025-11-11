# Offline Mode Architecture & Implementation Guide

## Overview

This document explains the offline-first architecture for Flow-Space PWA, including how offline writes are handled, synced, and conflicts resolved.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Components](#key-components)
3. [Offline Write Flow](#offline-write-flow)
4. [Sync Process](#sync-process)
5. [Conflict Resolution](#conflict-resolution)
6. [Migration Guide](#migration-guide)
7. [Testing Strategy](#testing-strategy)
8. [Best Practices](#best-practices)

---

## Architecture Overview

### Layers

```
┌─────────────────────────────────────────┐
│   React Components (UI Layer)          │
│   - TaskList, ProjectSettings, etc.    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Context Providers                     │
│   - offline-task-context.tsx           │
│   - project-context.tsx                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Data Client Layer (NEW)               │
│   src/lib/data-client.ts                │
│   - Unified API for all operations      │
│   - Offline queueing                    │
│   - Auth header preservation            │
└──────────────┬──────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
┌───────▼────┐  ┌────▼──────────────────┐
│   Network  │  │  Dexie Database       │
│   (axios)  │  │  src/lib/db/dexie-db.ts│
│            │  │  - Tasks, Projects     │
│            │  │  - Sync Queue          │
│            │  │  - Metadata            │
└────────────┘  └───────────────────────┘
```

### Client ID Strategy

**Every entity** gets two IDs:

- **`clientId`** (UUID v4): Generated client-side, ALWAYS present, used for local tracking
- **`id`** (string): Server-assigned ID, set after successful sync

This ensures:

- Offline-created entities are immediately usable in UI
- No ID conflicts between clients
- Proper mapping after server sync

---

## Key Components

### 1. Dexie Database (`src/lib/db/dexie-db.ts`)

Enhanced IndexedDB wrapper with:

```typescript
interface TaskEntity {
  id?: string;              // Server ID (after sync)
  clientId: string;         // Client UUID (always present)
  title: string;
  // ... task fields ...
  syncStatus: SyncStatus;   // pending | syncing | synced | error | conflict
  version?: number;         // Server version for conflict detection
  lastSyncedAt?: string;
  conflictData?: {...};     // If conflict detected
}
```

**Sync Queue:**

```typescript
interface SyncQueueItem {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  url: string;
  body?: any;
  headers?: Record<string, string>; // Preserves auth headers!
  entityType: "task" | "project" | "team";
  clientEntityId?: string; // Links to entity
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: string; // Exponential backoff
  status: "pending" | "processing" | "completed" | "failed";
  lastError?: string;
}
```

### 2. Data Client (`src/lib/data-client.ts`)

Unified API that:

- ✅ Queues writes when offline
- ✅ Preserves auth headers in queue
- ✅ Generates client IDs
- ✅ Implements exponential backoff
- ✅ Detects conflicts using version/updatedAt
- ✅ Maps server IDs to client entities

**Key Methods:**

```typescript
dataClient.createTask(taskData); // Generates clientId, queues if offline
dataClient.updateTask(clientId, updates); // Uses clientId, not server ID
dataClient.deleteTask(clientId);
dataClient.getTasks(filters); // Network-first, falls back to cache
dataClient.sync(); // Process sync queue
```

### 3. Sync Status Badge (`src/components/ui/SyncStatusBadge.tsx`)

Visual indicators:

- ⏳ **Pending**: Queued for sync
- 🔄 **Syncing**: Currently syncing
- ✅ **Synced**: Successfully synced
- ❌ **Error**: Sync failed
- ⚠️ **Conflict**: Server data newer than local

---

## Offline Write Flow

### Scenario: Create Task While Offline

1. **User Action**: Clicks "Create Task"

2. **Data Client**:

   ```typescript
   const clientId = generateClientId(); // UUID v4
   const task = createTaskEntity({
     clientId,
     title: "Fix offline bug",
     syncStatus: "pending",
     createdAt: new Date().toISOString(),
   });

   await db.tasks.put(task); // Save locally immediately
   ```

3. **Queue Request**:

   ```typescript
   await db.syncQueue.add({
     id: generateClientId(),
     method: 'POST',
     url: '/tasks',
     body: { title: "Fix offline bug", ... }, // NO clientId sent to API
     headers: { Authorization: 'Bearer token' }, // ✅ Preserved!
     entityType: 'task',
     clientEntityId: clientId, // Link to entity
     status: 'pending',
     attempts: 0,
     maxAttempts: 3,
   });
   ```

4. **UI Update**: Task appears immediately with ⏳ badge

5. **When Online**: Sync runs automatically
   - POST request sent with auth
   - Server returns `{id: "srv_123", ...}`
   - `db.tasks.update(clientId, {id: "srv_123", syncStatus: 'synced'})`
   - UI updates badge to ✅

---

## Sync Process

### Automatic Triggers

- Network regains connectivity
- Periodic check (every 5 minutes while online)
- Manual sync button
- After any write operation (if online)

### Processing Steps

```typescript
async sync() {
  const items = await db.syncQueue.where('status').equals('pending').toArray();

  for (const item of items) {
    try {
      // 1. Execute request
      const response = await axiosInstance[item.method](
        item.url,
        item.body,
        { headers: item.headers } // ✅ Auth preserved
      );

      // 2. Handle response
      if (item.method === 'POST') {
        // Map server ID
        await db.tasks.update(item.clientEntityId, {
          id: response.data.id,
          syncStatus: 'synced',
        });
      } else if (item.method === 'PATCH') {
        // Check for conflicts
        const local = await db.tasks.get(item.clientEntityId);
        if (new Date(local.updatedAt) < new Date(response.data.updatedAt)) {
          // Conflict!
          await db.tasks.update(item.clientEntityId, {
            syncStatus: 'conflict',
            conflictData: { local, server: response.data },
          });
        } else {
          await db.tasks.update(item.clientEntityId, { syncStatus: 'synced' });
        }
      } else if (item.method === 'DELETE') {
        await db.tasks.delete(item.clientEntityId);
      }

      // 3. Mark completed
      await db.syncQueue.update(item.id, { status: 'completed' });

    } catch (error) {
      // 4. Handle errors
      const attempts = item.attempts + 1;
      const isClientError = error.response?.status >= 400 && < 500;

      if (attempts >= item.maxAttempts || isClientError) {
        // Permanent failure
        await db.syncQueue.update(item.id, { status: 'failed' });
        await db.tasks.update(item.clientEntityId, { syncStatus: 'error' });
      } else {
        // Retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts), 60000);
        await db.syncQueue.update(item.id, {
          attempts,
          nextAttemptAt: new Date(Date.now() + delay).toISOString(),
        });
      }
    }
  }

  // Clean up completed items
  await db.syncQueue.where('status').equals('completed').delete();
}
```

### Error Handling

| Error Type        | Action                                |
| ----------------- | ------------------------------------- |
| **4xx (Client)**  | Mark failed immediately (don't retry) |
| **5xx (Server)**  | Retry with exponential backoff        |
| **Network Error** | Retry with exponential backoff        |
| **Max Retries**   | Mark failed, show error badge         |

---

## Conflict Resolution

### Detection

Conflicts occur when:

1. User modifies task offline
2. Another user (or same user on different device) modifies same task online
3. Sync attempts to apply offline changes

Detection method:

```typescript
if (local.updatedAt && server.updatedAt) {
  if (new Date(local.updatedAt) < new Date(server.updatedAt)) {
    // Server is newer → CONFLICT
  }
}
```

### Resolution Strategies

#### 1. Last-Write-Wins (Default)

Server data is newer, so local changes are **lost**.

```typescript
await db.tasks.update(clientId, {
  ...serverData,
  syncStatus: "synced",
});
```

#### 2. Local-Wins (Force)

User chooses to keep local changes, re-queue for sync.

```typescript
await db.syncQueue.add({
  method: "PATCH",
  url: `/tasks/${task.id}`,
  body: localTask,
  // ... force overwrite
});
```

#### 3. Manual Merge (Future)

Show UI with diff, let user choose fields to keep.

```tsx
<ConflictResolutionModal
  local={conflictData.local}
  server={conflictData.server}
  onResolve={(merged) => {
    dataClient.updateTask(clientId, merged);
  }}
/>
```

---

## Migration Guide

### Before (Old Pattern)

```typescript
// task-context.tsx
const createTask = async (data) => {
  const response = await api.tasks.create(data); // Direct API call
  setTasks([response.data, ...tasks]);
};
```

**Problems:**

- ❌ No offline support
- ❌ No client ID
- ❌ Lost data if offline

### After (New Pattern)

```typescript
// offline-task-context.tsx
import { dataClient } from "@/lib/data-client";

const createTask = async (data) => {
  const task = await dataClient.createTask(data); // Offline-aware
  setTasks([task, ...tasks]); // Uses clientId
  return task;
};
```

**Benefits:**

- ✅ Works offline
- ✅ Client ID for tracking
- ✅ Auto-sync when online
- ✅ Visual sync status

### Step-by-Step Migration

1. **Replace imports**:

   ```diff
   - import { api } from '@/lib/api/axios';
   + import { dataClient } from '@/lib/data-client';
   ```

2. **Update create operations**:

   ```diff
   - const task = await api.tasks.create(data);
   + const task = await dataClient.createTask(data);
   ```

3. **Update update operations**:

   ```diff
   - await api.tasks.update(id, updates);
   + await dataClient.updateTask(clientId, updates);
   ```

   **Important**: Use `clientId` not server `id`!

4. **Update delete operations**:

   ```diff
   - await api.tasks.delete(id);
   + await dataClient.deleteTask(clientId);
   ```

5. **Update state to use clientId**:

   ```diff
   - tasks.find(t => t.id === id)
   + tasks.find(t => t.clientId === clientId)
   ```

6. **Add sync status display**:

   ```tsx
   import { SyncIndicator } from "@/components/ui/SyncStatusBadge";

   <div>
     {task.title}
     <SyncIndicator status={task.syncStatus} />
   </div>;
   ```

---

## Testing Strategy

### Test Scenarios

#### 1. Basic Offline Create

- [ ] Go offline (Dev Tools → Network → Offline)
- [ ] Create task
- [ ] Verify task appears with ⏳ badge
- [ ] Go online
- [ ] Verify sync occurs automatically
- [ ] Verify badge changes to ✅
- [ ] Refresh page, verify task persists

#### 2. Offline Update

- [ ] Create task online
- [ ] Go offline
- [ ] Update task
- [ ] Verify ⏳ badge appears
- [ ] Go online
- [ ] Verify sync
- [ ] Verify server has updated data

#### 3. Offline Delete

- [ ] Create task online
- [ ] Go offline
- [ ] Delete task
- [ ] Verify task removed from UI
- [ ] Go online
- [ ] Verify server deletion

#### 4. Conflict Detection

- [ ] Open app in two tabs
- [ ] Go offline in Tab 1
- [ ] Edit task in Tab 1
- [ ] Edit same task in Tab 2 (online)
- [ ] Go online in Tab 1
- [ ] Verify ⚠️ conflict badge appears
- [ ] (Future) Resolve conflict

#### 5. Auth Header Preservation

- [ ] Go offline
- [ ] Create task (auth token in queue)
- [ ] Wait for token refresh (or manually update session)
- [ ] Go online
- [ ] Verify sync uses **original** token from queue

#### 6. Exponential Backoff

- [ ] Mock 503 server error
- [ ] Create task
- [ ] Observe retry delays: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
- [ ] Verify gives up after 3 attempts

#### 7. Page Reload Persistence

- [ ] Go offline
- [ ] Create 3 tasks
- [ ] Reload page while offline
- [ ] Verify all 3 tasks still visible with ⏳
- [ ] Go online
- [ ] Verify all sync

### Debugging Tools

Use **SyncDebugger** component:

```tsx
import SyncDebugger from "@/components/test/SyncDebugger";

// Add to page
<SyncDebugger />;
```

Features:

- View sync queue in real-time
- Manual sync trigger
- Add test requests
- Clear queue

---

## Best Practices

### 1. Always Use `clientId` in UI

❌ **Don't:**

```typescript
tasks.find((t) => t.id === selectedId); // id may be undefined offline
```

✅ **Do:**

```typescript
tasks.find((t) => t.clientId === selectedClientId);
```

### 2. Check Sync Status Before Destructive Actions

```typescript
const handleDelete = async (task) => {
  if (task.syncStatus === 'pending') {
    const confirm = await showModal('This task hasn't synced yet. Delete anyway?');
    if (!confirm) return;
  }
  await dataClient.deleteTask(task.clientId);
};
```

### 3. Show Sync Feedback

Always display sync status:

```tsx
{
  task.syncStatus !== "synced" && <SyncIndicator status={task.syncStatus} />;
}
```

### 4. Handle Conflicts Gracefully

```typescript
const conflictTasks = await db.tasks
  .where("syncStatus")
  .equals("conflict")
  .toArray();

if (conflictTasks.length > 0) {
  showConflictNotification(conflictTasks.length);
}
```

### 5. Throttle Network Requests

Don't hammer backend on reconnect:

```typescript
// Built into dataClient - waits 500ms after online event
```

### 6. Use Transactions for Atomic Updates

```typescript
await db.transaction("rw", [db.tasks, db.syncQueue], async () => {
  await db.tasks.put(task);
  await db.syncQueue.add(queueItem);
});
```

### 7. Clean Up Completed Syncs

```typescript
// Auto-cleanup in sync process
await db.syncQueue.where("status").equals("completed").delete();
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Using Server ID Instead of Client ID

**Problem:**

```typescript
const task = await dataClient.createTask(data);
navigate(`/tasks/${task.id}`); // ❌ task.id is undefined offline!
```

**Solution:**

```typescript
navigate(`/tasks/${task.clientId}`); // ✅ Always present
```

---

### Pitfall 2: Not Handling Sync Failures

**Problem:** User never knows sync failed.

**Solution:**

```typescript
useEffect(() => {
  const checkFailures = setInterval(async () => {
    const failed = await db.tasks.where("syncStatus").equals("error").count();
    if (failed > 0) {
      toast.error(`${failed} tasks failed to sync`);
    }
  }, 30000);
  return () => clearInterval(checkFailures);
}, []);
```

---

### Pitfall 3: Assuming Immediate Sync

**Problem:**

```typescript
await dataClient.createTask(data);
const serverTask = await api.tasks.getById(task.id); // ❌ id not set yet!
```

**Solution:**

```typescript
const task = await dataClient.createTask(data);
// Wait for sync
await new Promise((resolve) => {
  const check = setInterval(async () => {
    const updated = await db.tasks.get(task.clientId);
    if (updated.syncStatus === "synced") {
      clearInterval(check);
      resolve();
    }
  }, 500);
});
```

---

### Pitfall 4: Losing Auth on Token Refresh

**Problem:** Queue items created with old token fail after refresh.

**Solution:** Queue captures token **at creation time**:

```typescript
const session = await getSession();
queueItem.headers = { Authorization: `Bearer ${session.accessToken}` };
```

If token expires, sync fails with 401, requiring re-login.

**Future improvement:** Re-capture fresh token before sync execution.

---

## API Reference

### `dataClient.createTask(input)`

**Parameters:**

- `input: Partial<TaskEntity>` - Task data

**Returns:** `Promise<TaskEntity>` with `clientId` always set

**Behavior:**

- Generates UUID clientId
- Saves to IndexedDB immediately
- Queues POST request
- Returns task with `syncStatus: 'pending'`

---

### `dataClient.updateTask(clientId, updates)`

**Parameters:**

- `clientId: string` - Client UUID
- `updates: Partial<TaskEntity>`

**Returns:** `Promise<TaskEntity>`

**Behavior:**

- Updates IndexedDB
- Queues PATCH (if task has server ID) or POST (if not)
- Preserves clientId

---

### `dataClient.deleteTask(clientId)`

**Parameters:**

- `clientId: string`

**Returns:** `Promise<void>`

**Behavior:**

- If task never synced: deletes from IndexedDB + queue
- If task synced: queues DELETE request

---

### `dataClient.getTasks(filters)`

**Parameters:**

- `filters?: { projectId, teamId, status, priority }`

**Returns:** `Promise<TaskEntity[]>`

**Behavior:**

- Network-first strategy
- Falls back to IndexedDB if offline or error
- Caches successful responses

---

### `dataClient.sync()`

**Returns:** `Promise<{ success: number; failed: number; errors: string[] }>`

**Behavior:**

- Processes all pending queue items
- Exponential backoff on retry
- Maps server IDs
- Detects conflicts

---

## Future Enhancements

1. **Service Worker Interception** - Intercept fetch events for transparent offline support
2. **Workbox Background Sync** - Automatic retry using service worker
3. **Delta Sync** - Fetch only changes since last sync: `GET /tasks?updatedSince=timestamp`
4. **BroadcastChannel** - Sync queue changes across tabs
5. **Conflict Resolution UI** - Manual merge interface
6. **WebSocket Reconnection** - Auto-reconnect with missed event replay
7. **Optimistic Locking** - Use `version` field for E-Tag based updates

---

## Troubleshooting

### Sync Not Happening

1. Check network status: `dataClient.isOnline()`
2. View queue: Open IndexedDB in Dev Tools → `FlowSpaceOfflineDB` → `syncQueue`
3. Check console for `[offline-sync]` logs
4. Use SyncDebugger component

### Task Stuck in Pending

1. Check queue item error: `db.syncQueue.get(id).then(item => console.log(item.lastError))`
2. Verify auth token valid
3. Check server logs for request arrival
4. Manual retry: `await dataClient.sync()`

### Conflict Every Time

Server and client clocks may be out of sync. Use server-provided timestamps:

```typescript
// When creating task locally, use server time
const serverTime = await api.get("/time");
task.createdAt = serverTime.data;
```

---

**Last Updated:** November 10, 2025  
**Version:** 2.0  
**Author:** Flow-Space Dev Team
