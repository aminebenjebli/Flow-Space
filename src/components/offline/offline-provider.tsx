/**
 * Offline Provider Component
 *
 * Initializes the offline infrastructure and provides context to children.
 * Place this high in your component tree (e.g., in app/layout.tsx or app/providers.tsx)
 */

"use client";

import React, { useEffect, useState } from "react";
import { initializeDB } from "@/lib/offline/db";
import { setupAutoSync } from "@/lib/offline/sync";

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanupAutoSync: (() => void) | undefined;

    async function initialize() {
      try {
        console.log("[OfflineProvider] Initializing offline infrastructure...");

        // Initialize IndexedDB
        await initializeDB();

        // Setup auto-sync on connection restore
        cleanupAutoSync = setupAutoSync();

        console.log("[OfflineProvider] Offline infrastructure ready");
        setIsInitialized(true);
      } catch (err: any) {
        console.error(
          "[OfflineProvider] Failed to initialize offline infrastructure:",
          err
        );
        setError(err.message || "Failed to initialize offline mode");

        // Still set initialized to true to prevent blocking the app
        setIsInitialized(true);
      }
    }

    initialize();

    return () => {
      if (cleanupAutoSync) {
        cleanupAutoSync();
      }
    };
  }, []);

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">
            Initializing offline mode...
          </p>
        </div>
      </div>
    );
  }

  // Show error if initialization failed
  if (error) {
    console.warn(
      "[OfflineProvider] Continuing despite initialization error:",
      error
    );
    // Don't block the app, just log the error
  }

  return <>{children}</>;
}

/**
 * Debug Panel for Offline Mode
 * Shows current offline status and database stats
 */
export function OfflineDebugPanel() {
  const [stats, setStats] = useState({
    tasks: 0,
    projects: 0,
    teams: 0,
    queuedRequests: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const { getDBStats } = await import("@/lib/offline/db");
      const dbStats = await getDBStats();
      setStats(dbStats);
    }

    loadStats();

    // Refresh stats every 5 seconds
    const interval = setInterval(loadStats, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-background border rounded-lg shadow-lg p-4 text-xs font-mono">
      <h3 className="font-bold mb-2">Offline Debug</h3>
      <div className="space-y-1">
        <div>Tasks: {stats.tasks}</div>
        <div>Projects: {stats.projects}</div>
        <div>Teams: {stats.teams}</div>
        <div
          className={
            stats.queuedRequests > 0 ? "text-yellow-600 font-bold" : ""
          }
        >
          Queued: {stats.queuedRequests}
        </div>
      </div>
    </div>
  );
}
