"use client";

import React, { useState, useEffect } from "react";
import { offlineAPI } from "@/lib/offline-api";
import { offlineDB } from "@/lib/offline-db";
import type { SyncQueueItem } from "@/lib/offline-db";
import { toast } from "react-hot-toast";

export default function SyncDebugger() {
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Listen to network changes
    const unsubscribe = offlineAPI.onNetworkChange((online) => {
      setIsOnline(online);
      console.log(
        `🌐 Network status changed: ${online ? "Online" : "Offline"}`
      );
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const refreshSyncQueue = async () => {
      try {
        const queue = await offlineDB.getSyncQueue();
        setSyncQueue(queue);
      } catch (error) {
        console.error("Failed to get sync queue:", error);
      }
    };

    refreshSyncQueue();
    const interval = setInterval(refreshSyncQueue, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      console.log("🔄 Starting manual sync...");
      const result = await offlineAPI.sync();
      console.log("✅ Manual sync completed:", result);
      toast.success(
        `Sync completed: ${result.success} success, ${result.failed} failed`
      );
    } catch (error) {
      console.error("❌ Manual sync failed:", error);
      toast.error("Manual sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const addTestRequest = async () => {
    try {
      console.log("➕ Adding test request to queue...");

      // Add a test task creation request
      const testData = {
        title: `Test task created offline ${new Date().toLocaleTimeString()}`,
        description: "This is a test task to verify sync functionality",
        priority: "MEDIUM",
        status: "TODO",
      };

      await offlineDB.addToSyncQueue({
        method: "POST",
        url: "/tasks",
        data: testData,
        maxRetries: 3,
      });

      toast.success("Test request added to sync queue");
      console.log("✅ Test request added to queue");
    } catch (error) {
      console.error("❌ Failed to add test request:", error);
      toast.error("Failed to add test request");
    }
  };

  const clearSyncQueue = async () => {
    try {
      console.log("🗑️ Clearing sync queue...");
      // Clear all data includes sync queue
      await offlineDB.clearAllData();
      toast.success("Sync queue cleared");
      console.log("✅ Sync queue cleared");
    } catch (error) {
      console.error("❌ Failed to clear sync queue:", error);
      toast.error("Failed to clear sync queue");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">🔧 Sync Debugger</h1>

        {/* Network Status */}
        <div className="mb-4 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Network Status</h2>
          <div
            className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
              isOnline
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {isOnline ? "🟢 Online" : "🔴 Offline"}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Controls</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isSyncing ? "🔄 Syncing..." : "🔄 Manual Sync"}
            </button>
            <button
              onClick={addTestRequest}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              ➕ Add Test Request
            </button>
            <button
              onClick={clearSyncQueue}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🗑️ Clear Queue
            </button>
          </div>
        </div>

        {/* Sync Queue */}
        <div className="mb-4 p-4 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">
            Sync Queue ({syncQueue.length} items)
          </h2>

          {syncQueue.length === 0 ? (
            <div className="text-gray-500 italic">No items in sync queue</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {syncQueue.map((item, index) => (
                <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">
                        {item.method} {item.url}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div>
                          Status:{" "}
                          <span
                            className={`font-medium ${(() => {
                              if (item.status === "pending")
                                return "text-yellow-600";
                              if (item.status === "completed")
                                return "text-green-600";
                              return "text-red-600";
                            })()}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div>
                          Retry Count: {item.retryCount}/{item.maxRetries}
                        </div>
                        <div>
                          Timestamp: {new Date(item.timestamp).toLocaleString()}
                        </div>
                        {item.error && (
                          <div className="text-red-600">
                            Error: {item.error}
                          </div>
                        )}
                      </div>
                      {item.data && (
                        <details className="mt-2">
                          <summary className="text-sm text-blue-600 cursor-pointer">
                            Show Data
                          </summary>
                          <pre className="text-xs bg-gray-100 p-2 mt-1 rounded overflow-x-auto">
                            {JSON.stringify(item.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 ml-4">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">🔍 Testing Instructions</h3>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Open browser dev tools and check the console</li>
            <li>Click "Add Test Request" to add a request to the queue</li>
            <li>If online, click "Manual Sync" to process the queue</li>
            <li>Watch the console logs to see detailed sync process</li>
            <li>Check your backend logs to verify requests reach the server</li>
            <li>
              Use browser dev tools Network tab to see actual HTTP requests
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
