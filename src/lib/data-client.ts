/**
 * Unified Data Client
 *
 * This replaces direct api.* calls with offline-aware operations.
 * All CRUD operations go through this layer which handles:
 * - Offline queueing with proper auth headers
 * - Optimistic UI updates
 * - Client ID generation and mapping
 * - Conflict detection
 * - Proper error handling and retry logic
 */

"use client";

import { getSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import axiosInstance from "./api/axios";
import {
  db,
  generateClientId,
  createTaskEntity,
  calculateNextAttempt,
  getLastSyncTime,
  setLastSyncTime,
  type TaskEntity,
  type SyncQueueItem,
} from "./db/dexie-db";

// ==================== Network Manager ====================

class NetworkManager {
  private isOnline = typeof navigator === "undefined" || navigator.onLine;
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
    console.log("[offline-sync] 📶 Network: Back online");
    toast.success("Back online! Syncing...", { duration: 2000 });

    // Trigger sync after short delay
    setTimeout(() => {
      dataClient.sync().catch(console.error);
    }, 500);
  };

  private readonly handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners();
    console.log("[offline-sync] 📴 Network: Offline mode");
    toast("Working offline", { icon: "📴", duration: 3000 });
  };

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

// ==================== Data Client ====================

class DataClient {
  private readonly networkManager = new NetworkManager();
  private syncInProgress = false;

  // ==================== Network Status ====================

  isOnline(): boolean {
    return this.networkManager.getStatus();
  }

  onNetworkChange(callback: (online: boolean) => void): () => void {
    return this.networkManager.addListener(callback);
  }

  // ==================== Task Operations ====================

  /**
   * Get all tasks (offline-first)
   */
  async getTasks(filters?: {
    projectId?: string;
    teamId?: string;
    status?: string;
    priority?: string;
  }): Promise<TaskEntity[]> {
    try {
      // Try network first if online
      if (this.isOnline()) {
        const params = new URLSearchParams();
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (value) {
              params.append(key, value);
            }
          }
        }

        const queryString = params.toString();
        const url = queryString ? `/tasks?${queryString}` : "/tasks";
        const response = await axiosInstance.get(url);

        // Cache response
        const tasks = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.tasks || [];

        await this.cacheTasks(tasks);
        return tasks.map((t: any) => this.normalizeTask(t));
      }
    } catch (error) {
      console.warn("[offline-sync] Failed to fetch tasks from network:", error);
    }

    // Fallback to local cache
    let query = db.tasks.toCollection();

    if (filters?.projectId) {
      query = db.tasks.where("projectId").equals(filters.projectId);
    } else if (filters?.teamId) {
      query = db.tasks.where("teamId").equals(filters.teamId);
    }

    return await query.toArray();
  }

  /**
   * Create a new task (offline-aware)
   */
  async createTask(input: Partial<TaskEntity>): Promise<TaskEntity> {
    const clientId = generateClientId();
    const now = new Date().toISOString();

    const task = createTaskEntity({
      ...input,
      clientId,
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    });

    // Save locally immediately
    await db.tasks.put(task);
    console.log("[offline-sync] ✅ Task created locally:", task.clientId);

    // Queue for sync
    await this.queueRequest({
      method: "POST",
      url: "/tasks",
      body: this.prepareTaskForApi(task),
      entityType: "task",
      clientEntityId: clientId,
    });

    // Try sync immediately if online
    if (this.isOnline()) {
      this.sync().catch(console.error);
    } else {
      toast("Task queued for sync", { icon: "📥", duration: 2000 });
    }

    return task;
  }

  /**
   * Update an existing task (offline-aware)
   */
  async updateTask(
    clientId: string,
    updates: Partial<TaskEntity>
  ): Promise<TaskEntity> {
    const existing = await db.tasks.get(clientId);
    if (!existing) {
      throw new Error("Task not found");
    }

    const updated: TaskEntity = {
      ...existing,
      ...updates,
      clientId, // Preserve clientId
      updatedAt: new Date().toISOString(),
      syncStatus: "pending",
    };

    // Update locally
    await db.tasks.put(updated);
    console.log("[offline-sync] ✅ Task updated locally:", clientId);

    // Queue for sync
    const method = existing.id ? "PATCH" : "POST";
    const url = existing.id ? `/tasks/${existing.id}` : "/tasks";

    await this.queueRequest({
      method,
      url,
      body: this.prepareTaskForApi(updated),
      entityType: "task",
      clientEntityId: clientId,
    });

    // Try sync if online
    if (this.isOnline()) {
      this.sync().catch(console.error);
    } else {
      toast("Task changes queued", { icon: "📥", duration: 2000 });
    }

    return updated;
  }

  /**
   * Delete a task (offline-aware)
   */
  async deleteTask(clientId: string): Promise<void> {
    const existing = await db.tasks.get(clientId);
    if (!existing) {
      throw new Error("Task not found");
    }

    // If task was never synced, just delete locally
    if (!existing.id) {
      await db.tasks.delete(clientId);
      // Remove from queue
      await db.syncQueue.where("clientEntityId").equals(clientId).delete();
      console.log("[offline-sync] ✅ Unsynced task deleted locally");
      return;
    }

    // Mark for deletion
    await db.tasks.update(clientId, { syncStatus: "pending" });

    // Queue DELETE request
    await this.queueRequest({
      method: "DELETE",
      url: `/tasks/${existing.id}`,
      entityType: "task",
      clientEntityId: clientId,
    });

    // Try sync if online
    if (this.isOnline()) {
      this.sync().catch(console.error);
    } else {
      toast("Task deletion queued", { icon: "📥", duration: 2000 });
    }
  }

  // ==================== Queue Management ====================

  /**
   * Queue a request for sync
   */
  private async queueRequest(params: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    body?: any;
    entityType: "task" | "project" | "team";
    clientEntityId?: string;
  }): Promise<void> {
    const now = new Date().toISOString();

    // Get auth headers
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const session = await getSession();
      if (session?.accessToken) {
        headers["Authorization"] = `Bearer ${session.accessToken}`;
      }
    } catch {
      // Session not available, will use headers without auth
      console.warn("[offline-sync] Could not get session for queue item");
    }

    const queueItem: SyncQueueItem = {
      id: generateClientId(),
      method: params.method,
      url: params.url,
      body: params.body,
      headers,
      entityType: params.entityType,
      clientEntityId: params.clientEntityId,
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await db.syncQueue.add(queueItem);
    console.log("[offline-sync] 📥 Queued:", params.method, params.url);
  }

  // ==================== Sync Processing ====================

  /**
   * Sync all pending requests
   */
  async sync(): Promise<{ success: number; failed: number; errors: string[] }> {
    if (this.syncInProgress) {
      console.log("[offline-sync] ⏳ Sync already in progress");
      return { success: 0, failed: 0, errors: [] };
    }

    if (!this.isOnline()) {
      console.log("[offline-sync] 📴 Cannot sync while offline");
      return { success: 0, failed: 0, errors: [] };
    }

    this.syncInProgress = true;
    console.log("[offline-sync] 🔄 Starting sync...");

    const results = { success: 0, failed: 0, errors: [] as string[] };

    try {
      // Get pending items
      const items = await db.syncQueue
        .where("status")
        .equals("pending")
        .toArray();

      console.log(`[offline-sync] 📋 Processing ${items.length} items`);

      for (const item of items) {
        try {
          // Update status
          await db.syncQueue.update(item.id, { status: "processing" });

          // Process the request
          await this.processSyncItem(item);

          // Mark completed
          await db.syncQueue.update(item.id, {
            status: "completed",
            updatedAt: new Date().toISOString(),
          });

          results.success++;
          console.log(`[offline-sync] ✅ ${item.method} ${item.url}`);
        } catch (error: any) {
          const errorMsg = error.message || "Unknown error";
          results.errors.push(`${item.method} ${item.url}: ${errorMsg}`);

          const attempts = item.attempts + 1;
          const isClientError =
            error.response?.status >= 400 && error.response?.status < 500;

          if (attempts >= item.maxAttempts || isClientError) {
            // Permanent failure
            await db.syncQueue.update(item.id, {
              status: "failed",
              lastError: errorMsg,
              attempts,
              updatedAt: new Date().toISOString(),
            });
            results.failed++;
            console.error(
              `[offline-sync] ❌ Failed permanently: ${item.method} ${item.url}`
            );
          } else {
            // Retry with backoff
            await db.syncQueue.update(item.id, {
              status: "pending",
              lastError: errorMsg,
              attempts,
              nextAttemptAt: calculateNextAttempt(attempts),
              updatedAt: new Date().toISOString(),
            });
            console.warn(
              `[offline-sync] ⚠️ Will retry (${attempts}/${item.maxAttempts})`
            );
          }
        }
      }

      // Clean up completed items
      await db.syncQueue.where("status").equals("completed").delete();

      // Update last sync time
      await setLastSyncTime(Date.now());

      console.log(
        `[offline-sync] 🎉 Sync complete: ${results.success} success, ${results.failed} failed`
      );

      if (results.success > 0) {
        toast.success(`Synced ${results.success} items`);
      }
      if (results.failed > 0) {
        toast.error(`${results.failed} items failed`);
      }
    } finally {
      this.syncInProgress = false;
    }

    return results;
  }

  /**
   * Process a single sync item
   */
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    console.log(`[offline-sync] 🔧 Processing: ${item.method} ${item.url}`);

    let response;
    const config = { headers: item.headers };

    switch (item.method) {
      case "GET":
        response = await axiosInstance.get(item.url, config);
        break;
      case "POST":
        response = await axiosInstance.post(item.url, item.body, config);
        break;
      case "PUT":
        response = await axiosInstance.put(item.url, item.body, config);
        break;
      case "PATCH":
        response = await axiosInstance.patch(item.url, item.body, config);
        break;
      case "DELETE":
        response = await axiosInstance.delete(item.url, config);
        break;
    }

    // Handle response based on entity type
    if (item.clientEntityId) {
      await this.handleSyncResponse(item, response);
    }
  }

  /**
   * Handle successful sync response
   */
  private async handleSyncResponse(
    item: SyncQueueItem,
    response: any
  ): Promise<void> {
    const serverData = response.data.data || response.data;

    if (item.method === "POST" && item.entityType === "task") {
      // Map server ID to client entity
      await db.tasks.update(item.clientEntityId!, {
        id: serverData.id,
        updatedAt: serverData.updatedAt,
        syncStatus: "synced",
        version: serverData.version,
        lastSyncedAt: new Date().toISOString(),
      });
      console.log(
        `[offline-sync] 📌 Mapped ${item.clientEntityId} → ${serverData.id}`
      );
    } else if (item.method === "PATCH" && item.entityType === "task") {
      // Check for conflicts
      const local = await db.tasks.get(item.clientEntityId!);
      if (local?.updatedAt && serverData.updatedAt) {
        const localTime = new Date(local.updatedAt).getTime();
        const serverTime = new Date(serverData.updatedAt).getTime();

        if (serverTime > localTime) {
          // Server has newer data - potential conflict
          await db.tasks.update(item.clientEntityId!, {
            syncStatus: "conflict",
            conflictData: {
              local: local,
              server: serverData,
              detectedAt: new Date().toISOString(),
            },
          });
          console.warn(
            `[offline-sync] ⚠️ Conflict detected for ${item.clientEntityId}`
          );
        } else {
          // Update successful
          await db.tasks.update(item.clientEntityId!, {
            updatedAt: serverData.updatedAt,
            syncStatus: "synced",
            version: serverData.version,
            lastSyncedAt: new Date().toISOString(),
          });
        }
      }
    } else if (item.method === "DELETE" && item.entityType === "task") {
      // Remove from local DB
      await db.tasks.delete(item.clientEntityId!);
      console.log(`[offline-sync] 🗑️ Deleted ${item.clientEntityId}`);
    }
  }

  // ==================== Helpers ====================

  /**
   * Cache tasks from server
   */
  private async cacheTasks(tasks: any[]): Promise<void> {
    const normalized = tasks.map((t) => this.normalizeTask(t));
    await db.tasks.bulkPut(normalized);
  }

  /**
   * Normalize server task to TaskEntity
   */
  private normalizeTask(serverTask: any): TaskEntity {
    return {
      id: serverTask.id,
      clientId: serverTask.clientId || serverTask.id, // Use id as clientId if not present
      title: serverTask.title,
      description: serverTask.description,
      status: serverTask.status,
      priority: serverTask.priority,
      assignedTo: serverTask.assignedTo,
      projectId: serverTask.projectId,
      teamId: serverTask.teamId,
      dueDate: serverTask.dueDate,
      createdAt: serverTask.createdAt,
      updatedAt: serverTask.updatedAt,
      syncStatus: "synced",
      version: serverTask.version,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  /**
   * Prepare task for API (remove offline metadata)
   */
  private prepareTaskForApi(task: TaskEntity): any {
    const {
      clientId,
      syncStatus,
      version,
      lastSyncedAt,
      conflictData,
      ...apiTask
    } = task;
    return apiTask;
  }

  // ==================== Stats & Utilities ====================

  async getStorageInfo() {
    const taskCount = await db.tasks.count();
    const queueCount = await db.syncQueue
      .where("status")
      .equals("pending")
      .count();
    const lastSync = await getLastSyncTime();

    return {
      taskCount,
      queueCount,
      lastSync,
      isOnline: this.isOnline(),
      syncInProgress: this.syncInProgress,
    };
  }

  async clearCache(): Promise<void> {
    await db.tasks.clear();
    await db.projects.clear();
    await db.teams.clear();
    toast.success("Cache cleared");
  }

  destroy() {
    this.networkManager.destroy();
  }
}

// Singleton export
export const dataClient = new DataClient();

// Initialize on client side
if (globalThis.window !== undefined) {
  console.log("[offline-sync] 🚀 Data client initialized");
}
