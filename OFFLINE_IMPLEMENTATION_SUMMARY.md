# Offline Mode Implementation Summary

## ✅ What We've Built

### 1. **Dexie Database** (`src/lib/db/dexie-db.ts`)

- Client ID support with UUID v4
- Sync status tracking (pending, syncing, synced, error, conflict)
- Version tracking for conflict detection
- Proper queue with auth header preservation
- Exponential backoff support (nextAttemptAt field)

### 2. **Data Client** (`src/lib/data-client.ts`)

- **Unified API layer** replacing direct `api.*` calls
- **Offline queueing** with auth headers preserved
- **Client ID generation** for all entities
- **Conflict detection** using updatedAt timestamps
- **Exponential backoff** retry logic (1s → 2s → 4s → 8s → max 60s)
- **ID mapping** for POST responses (clientId → server ID)
- **Error classification** (4xx = don't retry, 5xx = retry with backoff)
- **Network-first strategy** for reads

### 3. **UI Components** (`src/components/ui/SyncStatusBadge.tsx`)

- `<SyncStatusBadge status={task.syncStatus} />` - Full badge
- `<SyncIndicator status={task.syncStatus} />` - Minimal icon

### 4. **Documentation** (`OFFLINE_MODE.md`)

- Architecture diagrams
- Offline write flow
- Sync process details
- Conflict resolution strategies
- Migration guide (old → new pattern)
- Testing scenarios
- Best practices
- Troubleshooting guide

---

## 🚀 How to Use

### Quick Start

1. **Import dataClient** instead of api:

```typescript
import { dataClient } from "@/lib/data-client";
```

2. **Create entities** (auto-generates clientId):

```typescript
const task = await dataClient.createTask({
  title: "Fix offline bug",
  priority: "HIGH",
});
// task.clientId is always set
// task.id is set after sync
```

3. **Update using clientId** (not server ID):

```typescript
await dataClient.updateTask(task.clientId, {
  status: "DONE",
});
```

4. **Delete using clientId**:

```typescript
await dataClient.deleteTask(task.clientId);
```

5. **Show sync status**:

```tsx
import { SyncIndicator } from "@/components/ui/SyncStatusBadge";

<div>
  {task.title}
  <SyncIndicator status={task.syncStatus} />
</div>;
```

---

## 📋 Migration Checklist

### For Each Context (task-context, project-context, etc.)

- [ ] Replace `import { api }` with `import { dataClient }`
- [ ] Change `api.tasks.create()` → `dataClient.createTask()`
- [ ] Change `api.tasks.update(id, ...)` → `dataClient.updateTask(clientId, ...)`
- [ ] Change `api.tasks.delete(id)` → `dataClient.deleteTask(clientId)`
- [ ] Update state to use `clientId` instead of `id` for lookups
- [ ] Add `syncStatus` to entity type
- [ ] Display `<SyncIndicator />` in UI

### For Each Component

- [ ] Replace `task.id` lookups with `task.clientId`
- [ ] Add sync status display
- [ ] Handle offline scenario messaging
- [ ] Test offline → online flow

---

## 🔍 Testing

### Use SyncDebugger

```tsx
import SyncDebugger from "@/components/test/SyncDebugger";

// Add to test page
<SyncDebugger />;
```

**Features:**

- Real-time queue monitoring
- Manual sync trigger
- Add test requests
- Clear queue button

### Test Scenarios

1. **Create Offline → Sync**

   - Go offline (Network tab)
   - Create task
   - See ⏳ badge
   - Go online
   - See ✅ badge

2. **Offline Persistence**

   - Go offline
   - Create 3 tasks
   - Reload page
   - All 3 visible with ⏳

3. **Auth Preservation**
   - Go offline
   - Create task (auth in queue)
   - Go online
   - Check Network tab → request has Bearer token

---

## 🎯 Key Improvements

### Before (Old offlineAPI)

```typescript
// ❌ Problems:
- Used temp_${Date.now()} → not unique enough
- No auth headers in queue
- No conflict detection
- Mixed with direct api.* calls
- No client ID tracking
```

### After (New dataClient)

```typescript
// ✅ Solutions:
- UUID v4 client IDs
- Auth headers preserved in queue
- Conflict detection with timestamps
- Single unified layer
- Client ID always present
- Exponential backoff
- ID mapping (client → server)
```

---

## 🐛 Known Issues & Todos

### Immediate Next Steps

1. **Migrate offline-task-context.tsx**

   - Replace offlineAPI with dataClient
   - Add clientId to task state
   - Update all CRUD operations

2. **Add Conflict Resolution UI**

   - Modal showing local vs server diffs
   - Let user choose which to keep
   - Or merge fields manually

3. **Delta Sync** (for performance)

   ```typescript
   const lastSync = await getLastSyncTime();
   const updates = await api.get(`/tasks?updatedSince=${lastSync}`);
   // Merge with local
   ```

4. **Service Worker Integration** (Phase 2)
   - Intercept network requests
   - Workbox Background Sync
   - Transparent offline support

### Future Enhancements

- [ ] BroadcastChannel for multi-tab sync
- [ ] WebSocket reconnection logic
- [ ] Optimistic locking with ETags
- [ ] Tombstones for deletes
- [ ] Full sync on first load after long offline
- [ ] Change feed / event log

---

## 📊 Architecture Comparison

### Old Architecture

```
Component → task-context → api.tasks.* → axios → Server
                ↓
          offlineAPI (partial)
```

**Issues:**

- Mixed online/offline paths
- Incomplete offline support
- No client IDs
- Lost data on offline create

### New Architecture

```
Component → offline-task-context → dataClient → Dexie + axios → Server
                                       ↓
                                 Sync Queue
                                 (with auth!)
```

**Benefits:**

- Single unified path
- Complete offline support
- Client IDs everywhere
- No data loss
- Conflict detection
- Exponential backoff

---

## 💡 Best Practices Reminder

1. **Always use clientId in UI**, never server ID (may be undefined)
2. **Check syncStatus before destructive actions**
3. **Show sync feedback** (badges, toasts)
4. **Handle conflicts gracefully** (check for `conflict` status)
5. **Test offline flows** regularly
6. **Monitor sync queue** in dev tools

---

## 📞 Support

- **Docs:** See `OFFLINE_MODE.md` for detailed guide
- **Debugging:** Use `<SyncDebugger />` component
- **Console:** Filter by `[offline-sync]` prefix
- **IndexedDB:** Chrome DevTools → Application → IndexedDB → `FlowSpaceOfflineDB`

---

**Status:** ✅ Core infrastructure complete  
**Next:** Migrate contexts to use dataClient  
**Version:** 2.0  
**Date:** November 10, 2025
