"use client";

import {
  offlineDB,
  TaskWithSync,
  ProfileWithSync,
  TeamWithSync,
  SyncQueueItem,
} from "./offline-db";
import { api } from "./api/axios";
import { toast } from "react-hot-toast";

// Network status management
class NetworkManager {
  private isOnline = navigator.onLine;
  private readonly listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    if (globalThis.window !== undefined) {
      globalThis.addEventListener("online", this.handleOnline);
      globalThis.addEventListener("offline", this.handleOffline);
    }
  }

  private readonly handleOnline = () => {
    this.isOnline = true;
    this.notifyListeners();
    console.log("📶 Network: Back online");
    toast.success("Back online! Syncing data...", { duration: 2000 });

    // Trigger background sync when coming back online
    this.triggerBackgroundSync();
  };

  private readonly handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners();
    console.log("📴 Network: Offline mode");
    toast("Working offline", {
      icon: "📴",
      duration: 3000,
    });
  };

  private triggerBackgroundSync() {
    // Use setTimeout to avoid blocking the main thread
    console.log("⏰ Triggering background sync in 100ms...");
    setTimeout(() => {
      console.log("🔄 Starting background sync from network change...");
      offlineAPI.sync().catch((error) => {
        console.error("❌ Background sync failed:", error);
      });
    }, 100);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.isOnline);
    }
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public addListener(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy() {
    if (globalThis.window !== undefined) {
      globalThis.removeEventListener("online", this.handleOnline);
      globalThis.removeEventListener("offline", this.handleOffline);
    }
  }
}

// Offline API Manager
class OfflineAPI {
  private readonly networkManager = new NetworkManager();
  private syncInProgress = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Setup periodic sync when online
    this.setupPeriodicSync();
  }

  // Separate initialization method to avoid async constructor
  async initialize(): Promise<void> {
    try {
      await offlineDB.init();
      console.log("✅ Offline API initialized");
    } catch (error) {
      console.error("❌ Failed to initialize offline API:", error);
    }
  }

  private setupPeriodicSync() {
    // Sync every 5 minutes when online
    this.syncTimer = setInterval(() => {
      if (this.networkManager.getStatus() && !this.syncInProgress) {
        this.sync().catch(console.error);
      }
    }, 5 * 60 * 1000);
  }

  // Network status
  isOnline(): boolean {
    return this.networkManager.getStatus();
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    return this.networkManager.addListener(callback);
  }

  // Generic API request handler with offline support
  async request<T = any>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    data?: any,
    options: {
      skipOfflineQueue?: boolean;
      cacheStrategy?: "cache-first" | "network-first" | "network-only";
      maxRetries?: number;
    } = {}
  ): Promise<T> {
    const {
      skipOfflineQueue = false,
      cacheStrategy = "network-first",
      maxRetries = 3,
    } = options;

    // If online, try network request first (unless cache-first)
    if (this.isOnline() && cacheStrategy !== "cache-first") {
      try {
        const response = await this.makeNetworkRequest<T>(method, url, data);

        // Cache successful responses for certain endpoints
        if (method === "GET") {
          await this.cacheResponse(url, response);
        }

        return response;
      } catch (error: any) {
        console.warn(`Network request failed for ${method} ${url}:`, error);

        // Check if it's a server error (5xx) - these are transient
        const isServerError = error.response?.status >= 500;

        // If network fails and we're not in network-only mode, try cache
        if (cacheStrategy !== "network-only" && method === "GET") {
          const cached = await this.getCachedResponse<T>(url);
          if (cached) {
            // Successfully using cached data - don't throw error
            if (isServerError) {
              toast("Server temporarily unavailable - using cached data", {
                icon: "⚠️",
                duration: 2000,
              });
            } else {
              toast("Using cached data", {
                icon: "💾",
                duration: 2000,
              });
            }
            console.log(`✅ Serving from cache due to network error: ${url}`);
            return cached; // ✅ Return cached data without throwing
          }
        }

        // Only throw if we couldn't recover with cached data
        throw error;
      }
    }

    // If offline or cache-first strategy
    if (method === "GET") {
      const cached = await this.getCachedResponse<T>(url);
      if (cached) {
        console.log(`📦 Serving from cache: ${url}`);
        return cached;
      }
    }

    // For write operations when offline, queue them
    if (
      !this.isOnline() &&
      (method === "POST" ||
        method === "PUT" ||
        method === "PATCH" ||
        method === "DELETE")
    ) {
      if (skipOfflineQueue) {
        throw new Error("Operation not available offline");
      }

      console.log(`📥 Queuing ${method} request for ${url}`);
      console.log(`📥 Request data:`, data);
      console.log(`📥 this.isOnline():`, this.isOnline());
      console.log(`📥 navigator.onLine:`, navigator.onLine);

      try {
        console.log(`📥 Calling offlineDB.addToSyncQueue...`);
        const queueId = await offlineDB.addToSyncQueue({
          method,
          url,
          data,
          maxRetries,
        });

        console.log(
          `✅ Successfully queued ${method} ${url} with ID: ${queueId}`
        );

        // Verify it was actually added
        const queue = await offlineDB.getSyncQueue();
        console.log(`📋 Current queue length:`, queue.length);
        console.log(`📋 Queue items:`, queue);

        // Return a synthetic response for queued operations
        const queuedResponse = this.createQueuedResponse<T>(method, url, data);
        console.log(`📦 Returning queued response:`, queuedResponse);
        return queuedResponse;
      } catch (queueError) {
        console.error(`❌ Failed to queue ${method} ${url}:`, queueError);
        console.error(`❌ Error details:`, queueError);
        throw new Error(
          `Failed to queue operation: ${
            queueError instanceof Error ? queueError.message : "Unknown error"
          }`
        );
      }
    }

    throw new Error(
      `Unable to complete ${method} ${url} - offline and no cache available`
    );
  }

  private async makeNetworkRequest<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    url: string,
    data?: any
  ): Promise<T> {
    let response: any;

    console.log(`🌐 makeNetworkRequest: ${method} ${url}`);

    switch (method) {
      case "GET":
        response = await api.get(url);
        break;
      case "POST":
        response = await api.post(url, data);
        break;
      case "PUT":
        response = await api.put(url, data);
        break;
      case "PATCH":
        response = await api.patch(url, data);
        break;
      case "DELETE":
        response = await api.delete(url);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    console.log(`📦 Response from api.${method.toLowerCase()}:`, response);

    // Safety check: ensure response exists and is an object
    if (!response || typeof response !== "object") {
      console.error(`❌ Invalid response from ${method} ${url}:`, response);
      throw new Error(`No valid response received from ${method} ${url}`);
    }

    // api.* methods already extract response.data from axios response
    // So response is already ApiResponse<T> which has a .data property
    // We need to extract that .data to get the actual data
    const finalData = response && "data" in response ? response.data : response;
    console.log(`✅ Final data to return:`, finalData);
    return finalData;
  }

  private async cacheResponse(url: string, data: any): Promise<void> {
    try {
      // Cache different types of data in appropriate stores
      if (url.includes("/tasks")) {
        if (Array.isArray(data)) {
          const tasks = data.map(this.normalizeTaskForStorage);
          await offlineDB.saveTasks(tasks);
        } else if (data.id) {
          await offlineDB.saveTask(this.normalizeTaskForStorage(data));
        }
      } else if (url.includes("/profile")) {
        if (data.id) {
          await offlineDB.saveProfile(this.normalizeProfileForStorage(data));
        }
      } else if (url.includes("/teams")) {
        if (Array.isArray(data)) {
          const teams = data.map(this.normalizeTeamForStorage);
          await offlineDB.saveTeams(teams);
        }
      }
    } catch (error) {
      console.warn("Failed to cache response:", error);
    }
  }

  private async getCachedResponse<T>(url: string): Promise<T | null> {
    try {
      if (url.includes("/tasks")) {
        if (url.includes("/teams/")) {
          // Get tasks for specific team
          const teamId = this.extractIdFromUrl(url, "/teams/");
          if (teamId) {
            const tasks = await offlineDB.getTasksByTeam(teamId);
            return tasks as T;
          }
        } else {
          // Get all tasks
          const tasks = await offlineDB.getAllTasks();
          return tasks as T;
        }
      } else if (url.includes("/profile/")) {
        const profileId = this.extractIdFromUrl(url, "/profile/");
        if (profileId) {
          const profile = await offlineDB.getProfile(profileId);
          return profile as T;
        }
      } else if (url.includes("/teams")) {
        const teams = await offlineDB.getAllTeams();
        return teams as T;
      }
    } catch (error) {
      console.warn("Failed to get cached response:", error);
    }

    return null;
  }

  private extractIdFromUrl(url: string, pattern: string): string | null {
    const index = url.indexOf(pattern);
    if (index === -1) return null;

    const afterPattern = url.substring(index + pattern.length);
    const nextSlash = afterPattern.indexOf("/");

    return nextSlash === -1
      ? afterPattern
      : afterPattern.substring(0, nextSlash);
  }

  private createQueuedResponse<T>(method: string, url: string, data: any): T {
    console.log(
      `🏗️ Creating queued response for ${method} ${url} with data:`,
      data
    );

    // Create optimistic responses for different operations
    if (method === "POST" && url.includes("/tasks")) {
      const tempId = `temp_${Date.now()}`;
      const task = {
        ...data,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _syncStatus: "pending_create" as const,
        _localId: tempId,
      };

      console.log(`✅ Created optimistic task:`, task);

      // Save optimistically to local storage
      offlineDB.saveTask(task as TaskWithSync).catch((err) => {
        console.error("❌ Failed to save optimistic task:", err);
      });

      return task as T;
    }

    if (method === "POST" && url.includes("/teams")) {
      const tempId = `temp_${Date.now()}`;
      const team = {
        ...data,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _syncStatus: "pending_create" as const,
        _localId: tempId,
        members: [], // Empty members initially
        projects: [], // Empty projects initially
      };

      console.log(`✅ Created optimistic team:`, team);

      // Note: We don't save to IndexedDB here as saveTeams expects an array
      // The team will be saved when sync completes

      return team as T;
    }

    if (method === "POST" && url.includes("/projects")) {
      const tempId = `temp_${Date.now()}`;
      const project = {
        ...data,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _syncStatus: "pending_create" as const,
        _localId: tempId,
      };

      console.log(`✅ Created optimistic project:`, project);

      return project as T;
    }

    if (method === "PUT" && url.includes("/tasks/")) {
      // For UPDATE operations, merge the updates with existing data
      const taskId = this.extractIdFromUrl(url, "/tasks/");
      const updatedTask = {
        ...data,
        id: taskId,
        updatedAt: new Date().toISOString(),
        _syncStatus: "pending_update" as const,
      };

      console.log(`✅ Created optimistic update:`, updatedTask);

      // Save optimistically to local storage
      offlineDB.saveTask(updatedTask as TaskWithSync).catch(console.error);

      return updatedTask as T;
    }

    if (method === "DELETE") {
      // For DELETE operations, return success indicator
      console.log(`✅ Created optimistic delete response`);
      return { success: true, queued: true, deleted: true } as T;
    }

    // Default response for other operations
    console.log(`⚠️ Using default queued response`);
    return { success: true, queued: true } as T;
  }

  // Data normalization helpers
  private normalizeTaskForStorage(task: any): TaskWithSync {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority || "MEDIUM",
      status: task.status || "TODO",
      assignedTo: task.assignedTo,
      teamId: task.teamId,
      dueDate: task.dueDate,
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
      _syncStatus: "synced",
    };
  }

  private normalizeProfileForStorage(profile: any): ProfileWithSync {
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      profilePicture: profile.profilePicture,
      role: profile.role,
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || new Date().toISOString(),
      _cacheTimestamp: Date.now(),
      _syncStatus: "synced",
    };
  }

  private normalizeTeamForStorage(team: any): TeamWithSync {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      members: team.members || [],
      createdAt: team.createdAt || new Date().toISOString(),
      updatedAt: team.updatedAt || new Date().toISOString(),
      _cacheTimestamp: Date.now(),
      _syncStatus: "synced",
    };
  }

  // Sync functionality
  async sync(): Promise<{ success: number; failed: number; errors: string[] }> {
    if (this.syncInProgress) {
      console.log("⏳ Sync already in progress, skipping...");
      return { success: 0, failed: 0, errors: ["Sync already in progress"] };
    }

    if (!this.isOnline()) {
      console.log("📴 Cannot sync while offline");
      return { success: 0, failed: 0, errors: ["Cannot sync while offline"] };
    }

    console.log("🔄 Starting background sync...");
    this.syncInProgress = true;

    try {
      await offlineDB.setSyncInProgress(true);

      const syncQueue = await offlineDB.getSyncQueue();
      const results = { success: 0, failed: 0, errors: [] as string[] };

      console.log(`📤 Processing ${syncQueue.length} queued requests`);

      // Log details of what's in the queue
      syncQueue.forEach((item, index) => {
        console.log(`📋 Queue item ${index + 1}:`, {
          id: item.id,
          method: item.method,
          url: item.url,
          data: item.data,
          retryCount: item.retryCount,
          status: item.status,
        });
      });

      for (const item of syncQueue) {
        try {
          console.log(`🔄 Processing sync item: ${item.method} ${item.url}`);
          await this.processSyncItem(item);
          await offlineDB.updateSyncQueueItem(item.id, { status: "completed" });
          results.success++;
          console.log(`✅ Synced successfully: ${item.method} ${item.url}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`${item.method} ${item.url}: ${errorMessage}`);
          console.error(`❌ Sync error for ${item.method} ${item.url}:`, error);

          // Increment retry count
          const newRetryCount = item.retryCount + 1;

          if (newRetryCount >= item.maxRetries) {
            await offlineDB.updateSyncQueueItem(item.id, {
              status: "failed",
              error: errorMessage,
              retryCount: newRetryCount,
            });
            results.failed++;
            console.error(
              `❌ Failed permanently: ${item.method} ${item.url} - ${errorMessage}`
            );
          } else {
            await offlineDB.updateSyncQueueItem(item.id, {
              retryCount: newRetryCount,
              error: errorMessage,
            });
            console.warn(
              `⚠️ Retry ${newRetryCount}/${item.maxRetries}: ${item.method} ${item.url}`
            );
          }
        }
      }

      // Clean up completed items
      await offlineDB.clearCompletedSyncItems();

      // Update last sync timestamp
      await offlineDB.setLastSync(Date.now());

      console.log(
        `🎉 Sync complete: ${results.success} success, ${results.failed} failed`
      );

      if (results.success > 0) {
        toast.success(`Synced ${results.success} items`, { duration: 2000 });
      }

      if (results.failed > 0) {
        toast.error(`${results.failed} items failed to sync`, {
          duration: 3000,
        });
      }

      return results;
    } finally {
      this.syncInProgress = false;
      await offlineDB.setSyncInProgress(false);
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    console.log(`🔧 Processing sync item:`, {
      method: item.method,
      url: item.url,
      data: item.data,
    });

    let response;

    switch (item.method) {
      case "GET":
        console.log(`📥 Making GET request to ${item.url}`);
        response = await api.get(item.url);
        break;
      case "POST":
        console.log(
          `📤 Making POST request to ${item.url} with data:`,
          item.data
        );
        response = await api.post(item.url, item.data);
        break;
      case "PUT":
        console.log(
          `🔄 Making PUT request to ${item.url} with data:`,
          item.data
        );
        response = await api.put(item.url, item.data);
        break;
      case "PATCH":
        console.log(
          `🔧 Making PATCH request to ${item.url} with data:`,
          item.data
        );
        response = await api.patch(item.url, item.data);
        break;
      case "DELETE":
        console.log(`🗑️ Making DELETE request to ${item.url}`);
        response = await api.delete(item.url);
        break;
      default:
        throw new Error(`Unsupported method: ${item.method}`);
    }

    console.log(`✅ Sync response for ${item.method} ${item.url}:`, response);

    // Update local cache with server response for successful creates/updates
    if (
      response.data &&
      (item.method === "POST" ||
        item.method === "PUT" ||
        item.method === "PATCH")
    ) {
      console.log(`💾 Caching response data for ${item.method} ${item.url}`);
      await this.cacheResponse(item.url, response.data);
    }
  }

  // Convenience methods for common operations
  async getTasks(teamId?: string): Promise<TaskWithSync[]> {
    const url = teamId ? `/tasks?teamId=${teamId}` : "/tasks";
    return this.request<TaskWithSync[]>("GET", url, undefined, {
      cacheStrategy: "cache-first",
    });
  }

  async createTask(taskData: Partial<TaskWithSync>): Promise<TaskWithSync> {
    return this.request<TaskWithSync>("POST", "/tasks", taskData);
  }

  async updateTask(
    id: string,
    updates: Partial<TaskWithSync>
  ): Promise<TaskWithSync> {
    // Update local cache optimistically
    const existingTask = await offlineDB.getTask(id);
    if (existingTask) {
      const updatedTask = {
        ...existingTask,
        ...updates,
        updatedAt: new Date().toISOString(),
        _syncStatus: "pending_update" as const,
      };
      await offlineDB.saveTask(updatedTask);
    }

    return this.request<TaskWithSync>("PUT", `/tasks/${id}`, updates);
  }

  async deleteTask(id: string): Promise<void> {
    // Mark for deletion locally
    const existingTask = await offlineDB.getTask(id);
    if (existingTask) {
      const deletedTask = {
        ...existingTask,
        _syncStatus: "pending_delete" as const,
      };
      await offlineDB.saveTask(deletedTask);
    }

    await this.request<void>("DELETE", `/tasks/${id}`);
  }

  async getProfile(id: string): Promise<ProfileWithSync | null> {
    try {
      return await this.request<ProfileWithSync>(
        "GET",
        `/profile/${id}`,
        undefined,
        {
          cacheStrategy: "cache-first",
        }
      );
    } catch (error) {
      console.error("Failed to get profile:", error);
      return null;
    }
  }

  async updateProfile(
    id: string,
    updates: Partial<ProfileWithSync>
  ): Promise<ProfileWithSync> {
    return this.request<ProfileWithSync>("PUT", `/profile/${id}`, updates);
  }

  async getTeams(): Promise<TeamWithSync[]> {
    return this.request<TeamWithSync[]>("GET", "/teams", undefined, {
      cacheStrategy: "cache-first",
    });
  }

  // Utility methods
  async getStorageInfo() {
    const stats = await offlineDB.getStorageStats();
    const settings = await offlineDB.getSettings();

    return {
      ...stats,
      isOnline: this.isOnline(),
      syncInProgress: this.syncInProgress,
      lastSync: settings?.lastSync || 0,
      offlineMode: settings?.offlineMode || false,
    };
  }

  async clearCache(): Promise<void> {
    await offlineDB.clearAllData();
    toast.success("Cache cleared");
  }

  async forcSync(): Promise<void> {
    if (!this.isOnline()) {
      throw new Error("Cannot sync while offline");
    }

    await this.sync();
  }

  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.networkManager.destroy();
  }
}

// Singleton instance
export const offlineAPI = new OfflineAPI();

// Initialize the offline API when the module is loaded (client-side only)
if (typeof globalThis.window !== "undefined") {
  offlineAPI.initialize().catch(console.error);
}

// Export utility hooks for React components
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(() => {
    if (typeof navigator !== "undefined") {
      return offlineAPI.isOnline();
    }
    return true; // Default to online on server
  });

  React.useEffect(() => {
    return offlineAPI.onNetworkChange(setIsOnline);
  }, []);

  return isOnline;
}

export function useOfflineStorage() {
  const [storageInfo, setStorageInfo] = React.useState<any>(null);

  const refreshInfo = React.useCallback(async () => {
    try {
      const info = await offlineAPI.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error("Failed to get storage info:", error);
    }
  }, []);

  React.useEffect(() => {
    refreshInfo();

    // Refresh info every 30 seconds
    const interval = setInterval(refreshInfo, 30000);
    return () => clearInterval(interval);
  }, [refreshInfo]);

  return { storageInfo, refreshInfo };
}

// Add React import
import React from "react";
