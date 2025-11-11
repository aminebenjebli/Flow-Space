"use client";

import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  useNetworkStatus,
  useOfflineStorage,
  offlineAPI,
} from "@/lib/offline-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OfflineStatusBarProps {
  readonly compact?: boolean;
  readonly showDetails?: boolean;
}

// Simple Progress component
function Progress({
  value = 0,
  className = "",
}: {
  readonly value?: number;
  readonly className?: string;
}) {
  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
    >
      <div
        className="h-full bg-blue-500 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function OfflineStatusBar({
  compact = true,
  showDetails = false,
}: OfflineStatusBarProps) {
  const [mounted, setMounted] = useState(false);
  const isOnline = useNetworkStatus();
  const { storageInfo, refreshInfo } = useOfflineStorage();
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;

    setSyncStatus("syncing");
    try {
      await offlineAPI.forcSync();
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 3000);
      refreshInfo();
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 5000);
    }
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    // Return same structure as compact mode to prevent layout shift
    if (compact) {
      return (
        <div
          className="flex items-center gap-2 text-xs"
          suppressHydrationWarning
        >
          <div
            className="flex items-center gap-1 text-muted-foreground"
            suppressHydrationWarning
          >
            {/* Empty during SSR */}
          </div>
        </div>
      );
    }
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs" suppressHydrationWarning>
        {/* Connection Status */}
        <div
          className={`flex items-center gap-1 ${
            isOnline ? "text-green-600" : "text-orange-500"
          }`}
          suppressHydrationWarning
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span className="hidden sm:inline" suppressHydrationWarning>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Pending Operations Badge */}
        {storageInfo?.pendingOperations > 0 && (
          <Badge
            variant="secondary"
            className="text-xs"
            suppressHydrationWarning
          >
            {storageInfo.pendingOperations} pending
          </Badge>
        )}

        {/* Sync Button */}
        {isOnline && storageInfo?.pendingOperations > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSync}
            disabled={syncStatus === "syncing"}
            className="h-6 px-2 text-xs"
            suppressHydrationWarning
          >
            {syncStatus === "syncing" ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            <span className="hidden sm:inline ml-1" suppressHydrationWarning>
              Sync
            </span>
          </Button>
        )}

        {/* Sync Status Icon */}
        {syncStatus === "success" && (
          <CheckCircle className="h-3 w-3 text-green-600" />
        )}
        {syncStatus === "error" && (
          <AlertCircle className="h-3 w-3 text-red-500" />
        )}
      </div>
    );
  }

  if (!showDetails) return null;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4" />
          Offline Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connection</span>
          <div
            className={`flex items-center gap-2 ${
              isOnline ? "text-green-600" : "text-orange-500"
            }`}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="text-sm">{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>

        {/* Storage Stats */}
        {storageInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Cached Data</span>
              <span>
                {storageInfo.tasks + storageInfo.profiles + storageInfo.teams}{" "}
                items
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Tasks: {storageInfo.tasks}</span>
                <span>Profiles: {storageInfo.profiles}</span>
                <span>Teams: {storageInfo.teams}</span>
              </div>
            </div>

            {/* Pending Operations */}
            {storageInfo.pendingOperations > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending Sync</span>
                <Badge variant="secondary">
                  {storageInfo.pendingOperations} operations
                </Badge>
              </div>
            )}

            {/* Last Sync */}
            {storageInfo.lastSync > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Last Sync</span>
                <span>
                  {new Date(storageInfo.lastSync).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Sync Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSync}
            disabled={!isOnline || syncStatus === "syncing"}
            className="flex-1"
          >
            {syncStatus === "syncing" ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Sync Now
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={refreshInfo}
            disabled={syncStatus === "syncing"}
          >
            Refresh
          </Button>
        </div>

        {/* Sync Status */}
        {syncStatus === "success" && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            Sync completed successfully
          </div>
        )}

        {syncStatus === "error" && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            Sync failed. Please try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Full page offline indicator
export function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white px-4 py-2 text-center text-sm z-50">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may be limited.</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDismissed(true)}
          className="text-white hover:bg-orange-600 ml-2"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

// Offline badge for components
export function OfflineBadge({
  className = "",
}: {
  readonly className?: string;
}) {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <Badge variant="secondary" className={`${className} text-xs`}>
      <WifiOff className="h-3 w-3 mr-1" />
      Offline
    </Badge>
  );
}

// Hook for detecting PWA installation
export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = globalThis.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    setIsInstalled(isStandalone);

    if (!isStandalone) {
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
      };

      globalThis.addEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      return () => {
        globalThis.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );
      };
    }
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === "accepted";
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
}

// Sync progress component
export function SyncProgress() {
  const { storageInfo } = useOfflineStorage();
  const [syncProgress, setSyncProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (!storageInfo?.syncInProgress) {
      setSyncProgress(0);
      setShowProgress(false);
      return;
    }

    setShowProgress(true);

    const handleProgress = () => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 10;
      });
    };

    const interval = setInterval(handleProgress, 200);

    const handleComplete = () => {
      setSyncProgress(100);
      setTimeout(() => setShowProgress(false), 1000);
    };

    if (syncProgress >= 100) {
      handleComplete();
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [storageInfo?.syncInProgress, syncProgress]);

  if (!showProgress) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg z-50 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm font-medium">Syncing data...</span>
      </div>
      <Progress value={syncProgress} className="h-2" />
      <div className="text-xs text-muted-foreground mt-1">
        {syncProgress}% complete
      </div>
    </div>
  );
}
