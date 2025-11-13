/**
 * Migration Helpers
 *
 * Utilities to help migrate from regular API to offline-aware API
 */

import { db, clearOfflineData, type QueuedRequest } from "@/lib/offline/db";
import { api } from "@/lib/api/axios";
import { Task } from "@/types/index";

/**
 * Migrate existing server data to offline cache
 * Run this once after implementing offline mode to populate the cache
 */
export async function migrateServerDataToCache(userId?: string) {
  console.log("[Migration] Starting data migration to offline cache...");

  try {
    // Migrate Tasks
    console.log("[Migration] Fetching tasks from server...");
    const tasksResponse = await api.tasks.getAll({ limit: 1000 });
    const tasks =
      tasksResponse.data?.tasks || (tasksResponse as any).tasks || [];

    console.log(`[Migration] Caching ${tasks.length} tasks...`);
    for (const task of tasks) {
      await db.tasks.put({
        ...task,
        _syncStatus: "synced",
        _lastModified: Date.now(),
      });
    }

    // Update metadata
    await db.syncMetadata.update("tasks", {
      lastSyncTime: Date.now(),
      syncInProgress: false,
    });

    console.log("[Migration] ✅ Tasks migrated successfully");

    // Note: Add similar migration for projects and teams when ready
    // For now, they will be cached on first fetch

    return {
      success: true,
      migrated: {
        tasks: tasks.length,
        projects: 0,
        teams: 0,
      },
    };
  } catch (error: any) {
    console.error("[Migration] Failed to migrate data:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Compare offline cache with server data
 * Useful for debugging sync issues
 */
export async function compareOfflineWithServer() {
  console.log("[Migration] Comparing offline cache with server...");

  try {
    // Get offline tasks
    const offlineTasks = (await db.tasks.toArray()) as Task[];
    const offlineTaskIds = new Set(offlineTasks.map((t: Task) => t.id));

    // Get server tasks
    const serverResponse = await api.tasks.getAll({ limit: 1000 });
    const serverTasks =
      serverResponse.data?.tasks || (serverResponse as any).tasks || [];
    const serverTaskIds = new Set(serverTasks.map((t: Task) => t.id));

    // Compare
    const onlyOffline = offlineTasks.filter(
      (t: Task) => !serverTaskIds.has(t.id)
    );
    const onlyServer = serverTasks.filter(
      (t: Task) => !offlineTaskIds.has(t.id)
    );
    const both = offlineTasks.filter((t: Task) => serverTaskIds.has(t.id));

    console.log("[Migration] Comparison results:", {
      total: {
        offline: offlineTasks.length,
        server: serverTasks.length,
      },
      onlyOffline: onlyOffline.length,
      onlyServer: onlyServer.length,
      inBoth: both.length,
    });

    return {
      offline: {
        total: offlineTasks.length,
        unique: onlyOffline,
        pending: offlineTasks.filter(
          (t: Task & { _syncStatus?: string }) => t._syncStatus === "pending"
        ),
      },
      server: {
        total: serverTasks.length,
        unique: onlyServer,
      },
      synced: both.length,
    };
  } catch (error: any) {
    console.error("[Migration] Comparison failed:", error);
    throw error;
  }
}

/**
 * Force full re-sync from server
 * Clears offline cache and re-downloads everything
 */
export async function forceFullResync() {
  console.log("[Migration] Starting full re-sync...");

  try {
    // Clear offline cache
    await clearOfflineData();
    console.log("[Migration] Offline cache cleared");

    // Re-download and cache
    const result = await migrateServerDataToCache();

    if (result.success) {
      console.log("[Migration] ✅ Full re-sync complete");
    } else {
      console.error("[Migration] ❌ Re-sync failed:", result.error);
    }

    return result;
  } catch (error: any) {
    console.error("[Migration] Full re-sync error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Clean up orphaned local tasks (tasks with local IDs that failed to sync)
 */
export async function cleanupOrphanedTasks() {
  console.log("[Migration] Cleaning up orphaned tasks...");

  try {
    // Find tasks with local IDs
    const orphanedTasks = await db.tasks
      .filter((task: any) => task.id.startsWith("local_") || task._localId)
      .toArray();

    if (orphanedTasks.length === 0) {
      console.log("[Migration] No orphaned tasks found");
      return { cleaned: 0 };
    }

    console.log(`[Migration] Found ${orphanedTasks.length} orphaned tasks`);

    // Ask for confirmation (in a real app, show UI dialog)
    const shouldDelete = confirm(
      `Found ${orphanedTasks.length} orphaned tasks that failed to sync. Delete them?`
    );

    if (shouldDelete) {
      for (const task of orphanedTasks) {
        await db.tasks.delete(task.id);
      }
      console.log(
        `[Migration] ✅ Deleted ${orphanedTasks.length} orphaned tasks`
      );
      return { cleaned: orphanedTasks.length };
    }

    return { cleaned: 0 };
  } catch (error: any) {
    console.error("[Migration] Cleanup failed:", error);
    throw error;
  }
}

/**
 * Export offline data for backup
 */
export async function exportOfflineDataForBackup() {
  console.log("[Migration] Exporting offline data...");

  try {
    const [tasks, projects, teams, queue, metadata] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.teams.toArray(),
      db.requestQueue.toArray(),
      db.syncMetadata.toArray(),
    ]);

    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        tasks,
        projects,
        teams,
        requestQueue: queue,
        syncMetadata: metadata,
      },
      stats: {
        tasks: tasks.length,
        projects: projects.length,
        teams: teams.length,
        queuedRequests: queue.filter(
          (r: QueuedRequest) => r.status === "pending"
        ).length,
      },
    };

    // Download as JSON file
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flowspace-offline-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log("[Migration] ✅ Backup exported successfully");
    return backup.stats;
  } catch (error: any) {
    console.error("[Migration] Export failed:", error);
    throw error;
  }
}

/**
 * Migration checklist for developers
 */
export function printMigrationChecklist() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           OFFLINE MODE MIGRATION CHECKLIST                 ║
╚════════════════════════════════════════════════════════════╝

✅ DEPENDENCIES
  [ ] Install Dexie: npm install dexie

✅ SETUP
  [ ] Add OfflineProvider to app/providers.tsx
  [ ] Add OfflineStatusBanner to UI
  [ ] Initialize offline DB on app load

✅ CODE UPDATES
  [ ] Replace api.tasks with offlineTasksApi
  [ ] Add offline status indicators to UI
  [ ] Update toasts to show offline/online messages
  [ ] Handle offline state in components

✅ TESTING
  [ ] Test create task offline
  [ ] Test update task offline
  [ ] Test delete task offline
  [ ] Test automatic sync when back online
  [ ] Test manual sync button
  [ ] Test failed request retry

✅ DATA MIGRATION
  [ ] Run migrateServerDataToCache() to populate cache
  [ ] Compare offline cache with server data
  [ ] Clean up any orphaned tasks

✅ PRODUCTION
  [ ] Add error tracking for sync failures
  [ ] Monitor IndexedDB quota usage
  [ ] Set up offline analytics
  [ ] Document offline behavior for users

Run these helper functions in browser console:
  - migrateServerDataToCache()
  - compareOfflineWithServer()
  - forceFullResync()
  - cleanupOrphanedTasks()
  - exportOfflineDataForBackup()
  `);
}

// Auto-run checklist in development
if (process.env.NODE_ENV === "development") {
  console.log(
    "[Migration] Run printMigrationChecklist() to see migration checklist"
  );
}
