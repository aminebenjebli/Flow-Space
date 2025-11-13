# Offline-First PWA Implementation Guide

## Overview

This offline infrastructure enables your Flow-Space app to work seamlessly offline with automatic synchronization when back online.

## Architecture

```
src/lib/offline/
  ├─ db.ts          # Dexie IndexedDB setup and schema
  ├─ api.ts         # Offline-aware API wrapper
  └─ sync.ts        # Background sync logic

src/contexts/
  └─ offline-task-context.tsx  # Offline-aware Task context

src/hooks/
  └─ useOffline.ts  # React hook for offline status

src/components/offline/
  ├─ offline-provider.tsx        # Initialization component
  └─ offline-status-banner.tsx   # UI components for offline status
```

## Features

### ✅ Offline-First Data Storage

- **IndexedDB via Dexie.js**: Stores tasks, projects, teams locally
- **Automatic caching**: All fetched data is cached for offline use
- **Optimistic updates**: UI updates immediately, syncs in background

### ✅ Request Queue System

- **Automatic queueing**: POST/PUT/DELETE requests queued when offline
- **Background sync**: Auto-processes queue when connection restored
- **Retry logic**: Exponential backoff with configurable max retries
- **Conflict resolution**: Handles version conflicts between local/server

### ✅ Real-time Sync Status

- **Online/offline detection**: Instant status updates
- **Sync progress**: Shows current progress during sync
- **Pending changes**: Displays count of unsynced changes
- **Error handling**: Clear error messages with retry options

## Installation

### 1. Install Dependencies

```bash
npm install dexie
# or
pnpm add dexie
```

### 2. Update Service Worker

The existing `/public/sw.js` already handles offline caching. Ensure it's registered:

```typescript
// Already exists in src/components/pwa/register-sw.tsx
```

### 3. Add Offline Provider

Update `src/app/providers.tsx`:

```typescript
import { OfflineProvider } from "@/components/offline/offline-provider";
import { OfflineStatusBanner } from "@/components/offline/offline-status-banner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OfflineProvider>
        <OfflineStatusBanner />
        {/* Rest of your providers */}
        {children}
      </OfflineProvider>
    </SessionProvider>
  );
}
```

### 4. Use Offline Contexts (Optional)

You can either:

**Option A**: Replace existing contexts with offline-aware versions:

```typescript
// In your providers.tsx
import { OfflineTaskProvider } from "@/contexts/offline-task-context";

<OfflineTaskProvider projectId={projectId}>{children}</OfflineTaskProvider>;
```

**Option B**: Keep existing contexts and integrate offline API directly:

```typescript
import { offlineTasksApi } from "@/lib/offline/api";

// Use offlineTasksApi instead of api.tasks
const response = await offlineTasksApi.getAll(params);
```

## Usage Examples

### Using Offline Hook

```typescript
import { useOffline } from "@/hooks/useOffline";

function MyComponent() {
  const { isOnline, isSyncing, pendingCount, sync, retryFailed } = useOffline();

  return (
    <div>
      <p>Status: {isOnline ? "Online" : "Offline"}</p>
      <p>Pending changes: {pendingCount}</p>
      {pendingCount > 0 && <button onClick={sync}>Sync Now</button>}
    </div>
  );
}
```

### Using Offline Task Context

```typescript
import { useOfflineTask } from "@/contexts/offline-task-context";

function TaskList() {
  const { tasks, isOffline, createTask, updateTask } = useOfflineTask();

  const handleCreate = async () => {
    await createTask({
      title: "New Task",
      description: "Works offline!",
    });
    // UI updates immediately
    // Syncs automatically when online
  };

  return (
    <div>
      {isOffline && <p>Working offline</p>}
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
```

### Direct Offline API Usage

```typescript
import { offlineTasksApi } from "@/lib/offline/api";

async function createTaskOffline() {
  // Works whether online or offline
  const response = await offlineTasksApi.create({
    title: "Offline Task",
    status: "TODO",
    priority: "HIGH",
  });

  // If offline: saved locally, queued for sync
  // If online: sent to server immediately
  console.log("Task created:", response.data);
}
```

### Listening to Sync Events

```typescript
import { useSyncEvents } from "@/hooks/useOffline";

function SyncStatusComponent() {
  useSyncEvents((event) => {
    switch (event.type) {
      case "sync_started":
        console.log("Sync started");
        break;
      case "sync_progress":
        console.log("Progress:", event.data);
        break;
      case "sync_completed":
        console.log("Sync done!", event.data.success, "items");
        break;
      case "sync_failed":
        console.error("Sync failed:", event.error);
        break;
    }
  });

  return <div>Check console for sync events</div>;
}
```

## How It Works

### Offline Flow

1. **User Creates Task (Offline)**

   ```
   User action → Create optimistic task → Save to IndexedDB → Queue request
   → UI updates immediately → Wait for online
   ```

2. **Connection Restored**

   ```
   Online event → Auto-sync triggered → Process queue → Upload changes
   → Replace optimistic ID with server ID → Update UI
   ```

3. **Data Fetching (Offline)**
   ```
   Fetch tasks → Check online? → No → Return from IndexedDB cache
   → Apply filters in memory → Return cached data
   ```

### Sync Strategy

- **Priority**: Requests synced in chronological order (FIFO)
- **Retries**: Up to 3 attempts with exponential backoff
- **Conflicts**: Last-write-wins (server version takes precedence)
- **Failed requests**: Marked as failed, can be manually retried

### Data Consistency

- **Optimistic IDs**: Local temporary IDs (e.g., `task_1234567890_abc`) replaced with server IDs after sync
- **Sync status**: Each record has `_syncStatus` field:
  - `synced`: In sync with server
  - `pending`: Has local changes waiting to upload
  - `failed`: Sync failed, needs retry
  - `conflict`: Conflict detected, needs resolution

## Testing Offline Mode

### Chrome DevTools

1. Open DevTools → **Network** tab
2. Select **Offline** from throttling dropdown
3. Test creating/updating/deleting tasks
4. Switch back to **Online**
5. Watch automatic sync happen

### Manual Testing

```typescript
// Force offline mode
Object.defineProperty(navigator, "onLine", { value: false });

// Create task
await offlineTasksApi.create({ title: "Test" });

// Check queue
import { getPendingRequests } from "@/lib/offline/api";
const pending = await getPendingRequests();
console.log("Pending:", pending);

// Force online
Object.defineProperty(navigator, "onLine", { value: true });
window.dispatchEvent(new Event("online"));

// Sync should start automatically
```

### Debug Tools

Enable debug panel in development:

```typescript
import { OfflineDebugPanel } from "@/components/offline/offline-provider";

// Add to your layout
<OfflineDebugPanel />;
```

## API Reference

### `db.ts` - Database

```typescript
import {
  db,
  initializeDB,
  clearOfflineData,
  getDBStats,
} from "@/lib/offline/db";

// Initialize database
await initializeDB();

// Access tables
const tasks = await db.tasks.toArray();
const projects = await db.projects.where("teamId").equals("123").toArray();

// Clear all offline data (e.g., on logout)
await clearOfflineData();

// Get statistics
const stats = await getDBStats();
// { tasks: 10, projects: 3, teams: 2, queuedRequests: 5 }
```

### `api.ts` - Offline API

```typescript
import { offlineApi, isOnline, getPendingRequests } from "@/lib/offline/api";

// Check online status
if (isOnline()) {
  console.log("Connected");
}

// Use offline-aware APIs
await offlineApi.tasks.getAll({ status: "TODO" });
await offlineApi.tasks.create({ title: "Task" });
await offlineApi.projects.getAll();
await offlineApi.teams.getById("team-123");

// Get pending requests
const pending = await getPendingRequests();
```

### `sync.ts` - Synchronization

```typescript
import {
  syncPendingRequests,
  getSyncStatus,
  retryFailedRequests,
  onSyncEvent,
} from "@/lib/offline/sync";

// Manual sync
const result = await syncPendingRequests();
// { success: 5, failed: 0, total: 5 }

// Get sync status
const status = await getSyncStatus();
// { isSyncing: false, pendingCount: 0, failedCount: 0, completedCount: 10 }

// Retry failed requests
await retryFailedRequests();

// Listen to sync events
const unsubscribe = onSyncEvent((event) => {
  console.log(event.type, event.data);
});
// Remember to unsubscribe when done
unsubscribe();
```

## Troubleshooting

### Database not initializing

**Error**: "Failed to initialize database"

**Solution**: Check browser IndexedDB quota. Clear IndexedDB in DevTools → Application → Storage → Clear site data.

### Requests not syncing

**Problem**: Pending count stays at same number

**Solution**:

1. Check browser console for errors
2. Verify network connection
3. Check failed requests: `getSyncStatus()` → `failedCount`
4. Retry failed: `retryFailedRequests()`

### Duplicate tasks after sync

**Problem**: Tasks appear twice after syncing

**Solution**: This happens if optimistic ID isn't replaced. Check:

- Request queue has correct `localId` field
- Sync handler is replacing local ID with server ID
- No manual `fetchTasks()` call during sync

### Slow sync performance

**Problem**: Sync takes too long

**Solution**:

- Reduce number of requests (batch operations)
- Increase delay between requests in `sync.ts` (currently 100ms)
- Process requests in parallel (careful: may cause conflicts)

## Best Practices

### 1. Always Use Offline API

```typescript
// ❌ Don't mix APIs
import { api } from '@/lib/api/axios';
await api.tasks.create(...); // Won't work offline!

// ✅ Use offline-aware API
import { offlineApi } from '@/lib/offline/api';
await offlineApi.tasks.create(...); // Works everywhere!
```

### 2. Handle Offline States in UI

```typescript
function TaskForm() {
  const { isOffline } = useOffline();

  return (
    <form>
      {isOffline && (
        <Alert>
          You're offline. Changes will sync when you reconnect.
        </Alert>
      )}
      <input ... />
    </form>
  );
}
```

### 3. Clear Offline Data on Logout

```typescript
import { clearOfflineData } from "@/lib/offline/db";

async function logout() {
  await clearOfflineData();
  // Clear session, redirect, etc.
}
```

### 4. Test Offline Scenarios

Always test:

- Creating while offline
- Updating while offline
- Deleting while offline
- Coming back online (auto-sync)
- Failed sync (retry)
- Conflict resolution

## Performance Optimization

### Lazy Load Offline Infrastructure

```typescript
// Only load when needed
const { initializeDB } = await import("@/lib/offline/db");
await initializeDB();
```

### Limit Cache Size

```typescript
// In db.ts, add cleanup logic
export async function cleanupOldCache() {
  const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await db.tasks.where("_lastModified").below(oneMonthAgo).delete();
}
```

### Batch Operations

```typescript
// Instead of multiple creates
for (const taskData of tasks) {
  await offlineApi.tasks.create(taskData); // ❌ Slow
}

// Use bulk operations
await offlineApi.tasks.bulkUpdateStatus({
  taskIds: ["1", "2", "3"],
  status: "DONE",
}); // ✅ Fast
```

## Migration Guide

### From Regular to Offline-Aware

1. **Replace API imports**:

   ```typescript
   // Before
   import { api } from "@/lib/api/axios";
   const response = await api.tasks.getAll();

   // After
   import { offlineApi } from "@/lib/offline/api";
   const response = await offlineApi.tasks.getAll();
   ```

2. **Update context providers**:

   ```typescript
   // Before
   <TaskProvider>

   // After
   <OfflineTaskProvider>
   ```

3. **Add offline status UI**:

   ```typescript
   import { OfflineStatusBanner } from "@/components/offline/offline-status-banner";

   <OfflineStatusBanner />;
   ```

## Future Enhancements

- [ ] Conflict resolution UI
- [ ] Partial sync (sync specific resources only)
- [ ] Background sync via Service Worker
- [ ] Encrypted offline storage
- [ ] Multi-device sync coordination
- [ ] Offline-first mutations with operation log

## Support

For issues or questions about the offline implementation:

1. Check browser console for detailed logs
2. Use `OfflineDebugPanel` for real-time stats
3. Review sync events via `onSyncEvent`
4. Check IndexedDB in DevTools → Application → Storage
