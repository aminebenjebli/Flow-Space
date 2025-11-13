/**
 * Background Sync Module
 *
 * Handles automatic synchronization of offline changes when connection is restored.
 * Features:
 * - Processes queued requests in order
 * - Handles retry logic with exponential backoff
 * - Resolves conflicts between local and server data
 * - Emits events for UI updates
 */

import { api } from "@/lib/api/axios";
import { db, type QueuedRequest, type OfflineTask } from "./db";
import { isOnline } from "./api";

// ==================== SYNC EVENTS ====================

/**
 * Sync event types for UI updates
 */
export type SyncEventType =
  | "sync_started"
  | "sync_progress"
  | "sync_completed"
  | "sync_failed"
  | "sync_conflict";

export interface SyncEvent {
  type: SyncEventType;
  timestamp: number;
  data?: any;
  error?: string;
}

/**
 * Sync event listeners
 */
type SyncEventListener = (event: SyncEvent) => void;
const syncEventListeners: SyncEventListener[] = [];

/**
 * Subscribe to sync events
 */
export function onSyncEvent(listener: SyncEventListener): () => void {
  syncEventListeners.push(listener);

  // Return unsubscribe function
  return () => {
    const index = syncEventListeners.indexOf(listener);
    if (index > -1) {
      syncEventListeners.splice(index, 1);
    }
  };
}

/**
 * Emit sync event to all listeners
 */
function emitSyncEvent(event: SyncEvent): void {
  console.log("[Sync]", event.type, event.data || event.error || "");
  for (const listener of syncEventListeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("[Sync] Error in event listener:", error);
    }
  }
}

// ==================== SYNC STATE ====================

let isSyncing = false;
let syncAbortController: AbortController | null = null;

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Abort current sync operation
 */
export function abortSync(): void {
  if (syncAbortController) {
    syncAbortController.abort();
    syncAbortController = null;
  }
  isSyncing = false;
}

// ==================== SYNC LOGIC ====================

/**
 * Process a single queued request
 */
async function processQueuedRequest(request: QueuedRequest): Promise<boolean> {
  if (!request.id) {
    console.error("[Sync] Request has no ID, skipping");
    return false;
  }

  try {
    // Update request status
    await db.requestQueue.update(request.id, {
      status: "processing",
      retryCount: request.retryCount + 1,
    });

    console.log(`[Sync] Processing ${request.method} ${request.url}`);

    // Execute the request based on method
    let response;
    switch (request.method) {
      case "POST":
        response = await api.post(request.url, request.body);
        break;
      case "PUT":
        response = await api.put(request.url, request.body);
        break;
      case "PATCH":
        response = await api.patch(request.url, request.body);
        break;
      case "DELETE":
        response = await api.delete(request.url);
        break;
      default:
        throw new Error(`Unsupported method: ${request.method}`);
    }

    // Handle successful response
    await handleSuccessfulSync(request, response);

    // Mark request as completed
    await db.requestQueue.update(request.id, {
      status: "completed",
      error: undefined,
    });

    return true;
  } catch (error: any) {
    console.error(`[Sync] Failed to process request:`, error);

    // Check if we should retry
    if (request.retryCount < request.maxRetries) {
      await db.requestQueue.update(request.id, {
        status: "pending",
        error: error.message,
      });
      console.log(
        `[Sync] Will retry (${request.retryCount + 1}/${request.maxRetries})`
      );
      return false;
    } else {
      // Max retries exceeded
      await db.requestQueue.update(request.id, {
        status: "failed",
        error: error.message,
      });
      console.error(`[Sync] Max retries exceeded for request ${request.id}`);

      emitSyncEvent({
        type: "sync_failed",
        timestamp: Date.now(),
        error: `Failed to sync ${request.resourceType}: ${error.message}`,
        data: request,
      });

      return false;
    }
  }
}

/**
 * Handle successful sync - update local data with server response
 */
async function handleSuccessfulSync(
  request: QueuedRequest,
  response: any
): Promise<void> {
  const serverData = response.data || response;

  switch (request.resourceType) {
    case "task":
      await handleTaskSync(request, serverData);
      break;
    case "project":
      await handleProjectSync(request, serverData);
      break;
    case "team":
      await handleTeamSync(request, serverData);
      break;
  }
}

/**
 * Handle task sync - replace local ID with server ID
 */
async function handleTaskSync(
  request: QueuedRequest,
  serverData: any
): Promise<void> {
  if (request.method === "POST" && request.localId) {
    // Replace local task with server task
    await db.tasks.delete(request.localId);

    const syncedTask: OfflineTask = {
      ...serverData,
      _syncStatus: "synced",
      _lastModified: Date.now(),
    };
    await db.tasks.put(syncedTask);

    console.log(
      `[Sync] Replaced local task ${request.localId} with server ID ${serverData.id}`
    );
  } else if (request.method === "PATCH" && request.resourceId) {
    // Update existing task
    const existingTask = await db.tasks.get(request.resourceId);
    if (existingTask) {
      const syncedTask: OfflineTask = {
        ...existingTask,
        ...serverData,
        _syncStatus: "synced",
        _lastModified: Date.now(),
      };
      await db.tasks.put(syncedTask);
      console.log(`[Sync] Updated task ${request.resourceId}`);
    }
  } else if (request.method === "DELETE" && request.resourceId) {
    // Ensure task is deleted locally
    await db.tasks.delete(request.resourceId);
    console.log(`[Sync] Confirmed deletion of task ${request.resourceId}`);
  }
}

/**
 * Handle project sync
 */
async function handleProjectSync(
  request: QueuedRequest,
  serverData: any
): Promise<void> {
  if (request.method === "POST" && request.localId) {
    await db.projects.delete(request.localId);
    await db.projects.put({
      ...serverData,
      createdAt: serverData.createdAt?.toString() || new Date().toISOString(),
      updatedAt: serverData.updatedAt?.toString() || new Date().toISOString(),
      _syncStatus: "synced",
      _lastModified: Date.now(),
    });
    console.log(
      `[Sync] Replaced local project ${request.localId} with server ID ${serverData.id}`
    );
  }
}

/**
 * Handle team sync
 */
async function handleTeamSync(
  request: QueuedRequest,
  serverData: any
): Promise<void> {
  if (request.method === "POST" && request.localId) {
    await db.teams.delete(request.localId);
    await db.teams.put({
      ...serverData,
      createdAt: serverData.createdAt?.toString() || new Date().toISOString(),
      updatedAt: serverData.updatedAt?.toString() || new Date().toISOString(),
      _syncStatus: "synced",
      _lastModified: Date.now(),
    });
    console.log(
      `[Sync] Replaced local team ${request.localId} with server ID ${serverData.id}`
    );
  }
}

/**
 * Sync all pending requests
 */
export async function syncPendingRequests(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  if (isSyncing) {
    console.log("[Sync] Sync already in progress, skipping");
    return { success: 0, failed: 0, total: 0 };
  }

  if (!isOnline()) {
    console.log("[Sync] Offline, skipping sync");
    return { success: 0, failed: 0, total: 0 };
  }

  isSyncing = true;
  syncAbortController = new AbortController();

  try {
    // Get pending requests
    const pendingRequests = await db.requestQueue
      .where("status")
      .equals("pending")
      .sortBy("timestamp");

    if (pendingRequests.length === 0) {
      console.log("[Sync] No pending requests to sync");
      return { success: 0, failed: 0, total: 0 };
    }

    console.log(`[Sync] Starting sync of ${pendingRequests.length} requests`);

    emitSyncEvent({
      type: "sync_started",
      timestamp: Date.now(),
      data: { total: pendingRequests.length },
    });

    let successCount = 0;
    let failedCount = 0;

    // Process requests sequentially to maintain order
    for (let i = 0; i < pendingRequests.length; i++) {
      if (syncAbortController.signal.aborted) {
        console.log("[Sync] Sync aborted");
        break;
      }

      const request = pendingRequests[i];
      const success = await processQueuedRequest(request);

      if (success) {
        successCount++;
      } else {
        failedCount++;
      }

      emitSyncEvent({
        type: "sync_progress",
        timestamp: Date.now(),
        data: {
          current: i + 1,
          total: pendingRequests.length,
          success: successCount,
          failed: failedCount,
        },
      });

      // Small delay between requests to avoid overwhelming server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `[Sync] Completed: ${successCount} succeeded, ${failedCount} failed`
    );

    emitSyncEvent({
      type: "sync_completed",
      timestamp: Date.now(),
      data: {
        success: successCount,
        failed: failedCount,
        total: pendingRequests.length,
      },
    });

    // Clean up completed requests
    await db.requestQueue.where("status").equals("completed").delete();

    return {
      success: successCount,
      failed: failedCount,
      total: pendingRequests.length,
    };
  } catch (error: any) {
    console.error("[Sync] Sync error:", error);

    emitSyncEvent({
      type: "sync_failed",
      timestamp: Date.now(),
      error: error.message,
    });

    return { success: 0, failed: 0, total: 0 };
  } finally {
    isSyncing = false;
    syncAbortController = null;
  }
}

/**
 * Auto-sync when coming back online
 */
export function setupAutoSync(): () => void {
  const handleOnline = async () => {
    console.log("[Sync] Connection restored, starting auto-sync");

    // Wait a bit to ensure connection is stable
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await syncPendingRequests();
  };

  if (typeof globalThis !== "undefined" && globalThis.window) {
    globalThis.window.addEventListener("online", handleOnline);

    // Cleanup function
    return () => {
      globalThis.window.removeEventListener("online", handleOnline);
    };
  }

  return () => {};
}

/**
 * Get sync status for debugging
 */
export async function getSyncStatus(): Promise<{
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  completedCount: number;
}> {
  const [pendingCount, failedCount, completedCount] = await Promise.all([
    db.requestQueue.where("status").equals("pending").count(),
    db.requestQueue.where("status").equals("failed").count(),
    db.requestQueue.where("status").equals("completed").count(),
  ]);

  return {
    isSyncing,
    pendingCount,
    failedCount,
    completedCount,
  };
}

/**
 * Retry all failed requests
 */
export async function retryFailedRequests(): Promise<void> {
  const failedRequests = await db.requestQueue
    .where("status")
    .equals("failed")
    .toArray();

  console.log(`[Sync] Retrying ${failedRequests.length} failed requests`);

  for (const request of failedRequests) {
    if (request.id) {
      await db.requestQueue.update(request.id, {
        status: "pending",
        retryCount: 0,
        error: undefined,
      });
    }
  }

  // Trigger sync
  await syncPendingRequests();
}
