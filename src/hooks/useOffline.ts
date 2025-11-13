/**
 * useOffline Hook
 *
 * React hook for detecting online/offline status and triggering sync.
 * Provides real-time status updates and sync controls.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  syncPendingRequests,
  setupAutoSync,
  getSyncStatus,
  retryFailedRequests,
  onSyncEvent,
  type SyncEvent,
} from "@/lib/offline/sync";
import { isOnline as checkIsOnline } from "@/lib/offline/api";

export interface OfflineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: number | null;
  lastSyncEvent: SyncEvent | null;
}

/**
 * Hook to detect and manage offline status
 */
export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: checkIsOnline(),
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    lastSyncEvent: null,
  });

  // Update online/offline status
  const updateOnlineStatus = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: checkIsOnline(),
    }));
  }, []);

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    const syncStatus = await getSyncStatus();
    setStatus((prev) => ({
      ...prev,
      isSyncing: syncStatus.isSyncing,
      pendingCount: syncStatus.pendingCount,
      failedCount: syncStatus.failedCount,
    }));
  }, []);

  // Manual sync trigger
  const sync = useCallback(async () => {
    if (!checkIsOnline()) {
      console.warn("[useOffline] Cannot sync while offline");
      return { success: 0, failed: 0, total: 0 };
    }

    const result = await syncPendingRequests();
    await updateSyncStatus();
    return result;
  }, [updateSyncStatus]);

  // Retry failed requests
  const retryFailed = useCallback(async () => {
    await retryFailedRequests();
    await updateSyncStatus();
  }, [updateSyncStatus]);

  // Setup event listeners
  useEffect(() => {
    // Online/offline listeners
    const handleOnline = () => {
      console.log("[useOffline] Connection restored");
      updateOnlineStatus();
      updateSyncStatus();
    };

    const handleOffline = () => {
      console.log("[useOffline] Connection lost");
      updateOnlineStatus();
    };

    if (typeof globalThis !== "undefined" && globalThis.window) {
      globalThis.window.addEventListener("online", handleOnline);
      globalThis.window.addEventListener("offline", handleOffline);
    }

    // Sync event listener
    const unsubscribe = onSyncEvent((event: SyncEvent) => {
      setStatus((prev) => ({
        ...prev,
        lastSyncEvent: event,
        lastSyncTime:
          event.type === "sync_completed" ? event.timestamp : prev.lastSyncTime,
      }));

      // Update counts after sync completes
      if (event.type === "sync_completed" || event.type === "sync_failed") {
        updateSyncStatus();
      }
    });

    // Setup auto-sync
    const cleanupAutoSync = setupAutoSync();

    // Initial sync status update
    updateSyncStatus();

    // Cleanup
    return () => {
      if (typeof globalThis !== "undefined" && globalThis.window) {
        globalThis.window.removeEventListener("online", handleOnline);
        globalThis.window.removeEventListener("offline", handleOffline);
      }
      unsubscribe();
      cleanupAutoSync();
    };
  }, [updateOnlineStatus, updateSyncStatus]);

  return {
    ...status,
    sync,
    retryFailed,
    refresh: updateSyncStatus,
  };
}

/**
 * Hook to listen for specific sync events
 */
export function useSyncEvents(callback: (event: SyncEvent) => void) {
  useEffect(() => {
    const unsubscribe = onSyncEvent(callback);
    return unsubscribe;
  }, [callback]);
}
