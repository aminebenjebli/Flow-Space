/**
 * Offline Status Banner Component
 *
 * Displays a banner at the top of the screen showing:
 * - Online/offline status
 * - Sync progress
 * - Pending changes count
 * - Manual sync trigger
 */

"use client";

import { useOffline } from "@/hooks/useOffline";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OfflineStatusBanner() {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncEvent,
    sync,
    retryFailed,
  } = useOffline();

  // Don't show banner if online and no pending changes
  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return null;
  }

  // Helper text for offline message
  const changeWord = pendingCount === 1 ? "change" : "changes";
  const offlineMessage =
    pendingCount > 0
      ? `${pendingCount} ${changeWord} will sync when you're back online`
      : "Your changes will be saved and synced when you reconnect";

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "border-b shadow-sm"
      )}
    >
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5" />
              <div>
                <p className="font-semibold">You're offline</p>
                <p className="text-sm opacity-90">{offlineMessage}</p>
              </div>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>{pendingCount} pending</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Syncing Banner */}
      {isOnline && isSyncing && (
        <div className="bg-blue-500 text-white px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <div>
                <p className="font-semibold">Syncing changes...</p>
                {lastSyncEvent?.type === "sync_progress" &&
                  lastSyncEvent.data && (
                    <p className="text-sm opacity-90">
                      {lastSyncEvent.data.current} of {lastSyncEvent.data.total}{" "}
                      changes synced
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Changes Banner (Online but not syncing) */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="bg-yellow-500 text-white px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" />
              <div>
                <p className="font-semibold">
                  {pendingCount} change{pendingCount === 1 ? "" : "s"} waiting
                  to sync
                </p>
                <p className="text-sm opacity-90">
                  Click sync to upload your changes now
                </p>
              </div>
            </div>
            <Button
              onClick={() => sync()}
              variant="secondary"
              size="sm"
              className="bg-white text-yellow-700 hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </div>
      )}

      {/* Failed Sync Banner */}
      {isOnline && !isSyncing && failedCount > 0 && (
        <div className="bg-destructive text-destructive-foreground px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-semibold">
                  {failedCount} change{failedCount === 1 ? "" : "s"} failed to
                  sync
                </p>
                <p className="text-sm opacity-90">
                  Some changes couldn't be uploaded. Try again?
                </p>
              </div>
            </div>
            <Button
              onClick={() => retryFailed()}
              variant="secondary"
              size="sm"
              className="bg-white text-destructive hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Success Banner (temporary, auto-hide) */}
      {lastSyncEvent?.type === "sync_completed" &&
        lastSyncEvent.data?.success > 0 &&
        Date.now() - lastSyncEvent.timestamp < 5000 && (
          <div className="bg-green-500 text-white px-4 py-3">
            <div className="container mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">
                    All changes synced successfully!
                  </p>
                  <p className="text-sm opacity-90">
                    {lastSyncEvent.data.success} change
                    {lastSyncEvent.data.success === 1 ? "" : "s"} uploaded
                  </p>
                </div>
              </div>
              <Wifi className="h-5 w-5" />
            </div>
          </div>
        )}
    </div>
  );
}

/**
 * Compact version for mobile/small screens
 */
export function OfflineStatusIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOffline();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  let bgColor = "bg-yellow-500 text-white";
  if (!isOnline) {
    bgColor = "bg-destructive text-destructive-foreground";
  } else if (isSyncing) {
    bgColor = "bg-blue-500 text-white";
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "rounded-full px-4 py-2 shadow-lg",
        "flex items-center gap-2 text-sm font-medium",
        "transition-all duration-300",
        bgColor
      )}
    >
      {!isOnline && (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </>
      )}
      {isOnline && isSyncing && (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing...</span>
        </>
      )}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <>
          <Clock className="h-4 w-4" />
          <span>{pendingCount} pending</span>
        </>
      )}
    </div>
  );
}
