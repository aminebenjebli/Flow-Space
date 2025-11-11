import { openDB, IDBPDatabase } from "idb";

// Simplified types without complex schema inheritance
export interface TaskWithSync {
  id: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  assignedTo?: string;
  teamId?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  // Offline metadata
  _syncStatus:
    | "synced"
    | "pending_create"
    | "pending_update"
    | "pending_delete";
  _localId?: string;
  _conflictData?: any;
}

export interface ProfileWithSync {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
  // Cache metadata
  _cacheTimestamp: number;
  _syncStatus: "synced" | "pending_update";
}

export interface TeamWithSync {
  id: string;
  name: string;
  description?: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "MEMBER";
  }>;
  createdAt: string;
  updatedAt: string;
  _cacheTimestamp: number;
  _syncStatus: "synced";
}

export interface SyncQueueItem {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: "pending" | "failed" | "completed";
  error?: string;
}

export interface AppSettings {
  lastSync: number;
  syncInProgress: boolean;
  offlineMode: boolean;
  pendingOperations: number;
}

class OfflineDatabase {
  private db: IDBPDatabase | null = null;
  private readonly DB_NAME = "FlowSpaceOfflineDB";
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB(this.DB_NAME, this.DB_VERSION, {
        upgrade(db) {
          console.log("Setting up offline database...");

          // Tasks store
          if (!db.objectStoreNames.contains("tasks")) {
            const tasksStore = db.createObjectStore("tasks", { keyPath: "id" });
            tasksStore.createIndex("teamId", "teamId", { unique: false });
            tasksStore.createIndex("assignedTo", "assignedTo", {
              unique: false,
            });
            tasksStore.createIndex("status", "status", { unique: false });
            tasksStore.createIndex("priority", "priority", { unique: false });
            tasksStore.createIndex("_syncStatus", "_syncStatus", {
              unique: false,
            });
            tasksStore.createIndex("updatedAt", "updatedAt", { unique: false });
          }

          // Profiles store
          if (!db.objectStoreNames.contains("profiles")) {
            const profilesStore = db.createObjectStore("profiles", {
              keyPath: "id",
            });
            profilesStore.createIndex("email", "email", { unique: true });
            profilesStore.createIndex("_cacheTimestamp", "_cacheTimestamp", {
              unique: false,
            });
          }

          // Teams store
          if (!db.objectStoreNames.contains("teams")) {
            const teamsStore = db.createObjectStore("teams", { keyPath: "id" });
            teamsStore.createIndex("_cacheTimestamp", "_cacheTimestamp", {
              unique: false,
            });
          }

          // Sync queue store
          if (!db.objectStoreNames.contains("syncQueue")) {
            const syncStore = db.createObjectStore("syncQueue", {
              keyPath: "id",
            });
            syncStore.createIndex("timestamp", "timestamp", { unique: false });
            syncStore.createIndex("status", "status", { unique: false });
            syncStore.createIndex("method", "method", { unique: false });
          }

          // App settings store
          if (!db.objectStoreNames.contains("appSettings")) {
            db.createObjectStore("appSettings");
          }
        },
      });

      console.log("✅ Offline database initialized");
      await this.initializeSettings();
    } catch (error) {
      console.error("❌ Failed to initialize offline database:", error);
      throw error;
    }
  }

  private async initializeSettings(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const settings = await this.db.get("appSettings", "main");
    if (!settings) {
      await this.db.put(
        "appSettings",
        {
          lastSync: 0,
          syncInProgress: false,
          offlineMode: !navigator.onLine,
          pendingOperations: 0,
        },
        "main"
      );
    }
  }

  // Tasks operations
  async saveTasks(tasks: TaskWithSync[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction("tasks", "readwrite");

    await Promise.all([...tasks.map((task) => tx.store.put(task)), tx.done]);
  }

  async saveTask(task: TaskWithSync): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put("tasks", task);
  }

  async getTask(id: string): Promise<TaskWithSync | undefined> {
    if (!this.db) await this.init();
    return this.db!.get("tasks", id);
  }

  async getAllTasks(): Promise<TaskWithSync[]> {
    if (!this.db) await this.init();
    const tasks = await this.db!.getAll("tasks");
    return tasks || [];
  }

  async getTasksByTeam(teamId: string): Promise<TaskWithSync[]> {
    if (!this.db) await this.init();
    const tasks = await this.db!.getAllFromIndex("tasks", "teamId", teamId);
    return tasks || [];
  }

  async getTasksByStatus(status: string): Promise<TaskWithSync[]> {
    if (!this.db) await this.init();
    const tasks = await this.db!.getAllFromIndex("tasks", "status", status);
    return tasks || [];
  }

  async getPendingTasks(): Promise<TaskWithSync[]> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction("tasks", "readonly");
    const index = tx.store.index("_syncStatus");

    const [pendingCreate, pendingUpdate, pendingDelete] = await Promise.all([
      index.getAll(IDBKeyRange.only("pending_create")),
      index.getAll(IDBKeyRange.only("pending_update")),
      index.getAll(IDBKeyRange.only("pending_delete")),
    ]);

    return [
      ...(pendingCreate || []),
      ...(pendingUpdate || []),
      ...(pendingDelete || []),
    ];
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete("tasks", id);
  }

  async createTask(
    taskData: Omit<
      TaskWithSync,
      "id" | "createdAt" | "updatedAt" | "_syncStatus" | "_localId"
    >
  ): Promise<TaskWithSync> {
    if (!this.db) await this.init();

    const id = `task_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const now = new Date().toISOString();

    const task: TaskWithSync = {
      id,
      createdAt: now,
      updatedAt: now,
      _syncStatus: "pending_create",
      _localId: id,
      ...taskData,
    };

    await this.saveTask(task);
    await this.incrementPendingOperations();
    return task;
  }

  async updateTask(
    id: string,
    updates: Partial<Omit<TaskWithSync, "id" | "createdAt" | "_localId">>
  ): Promise<TaskWithSync> {
    if (!this.db) await this.init();

    const existingTask = await this.getTask(id);
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`);
    }

    const updatedTask: TaskWithSync = {
      ...existingTask,
      ...updates,
      updatedAt: new Date().toISOString(),
      _syncStatus:
        existingTask._syncStatus === "pending_create"
          ? "pending_create"
          : "pending_update",
    };

    await this.saveTask(updatedTask);

    if (existingTask._syncStatus === "synced") {
      await this.incrementPendingOperations();
    }

    return updatedTask;
  }

  // Profiles operations
  async saveProfile(profile: ProfileWithSync): Promise<void> {
    if (!this.db) await this.init();
    profile._cacheTimestamp = Date.now();
    await this.db!.put("profiles", profile);
  }

  async getProfile(id: string): Promise<ProfileWithSync | undefined> {
    if (!this.db) await this.init();
    return this.db!.get("profiles", id);
  }

  async getAllProfiles(): Promise<ProfileWithSync[]> {
    if (!this.db) await this.init();
    const profiles = await this.db!.getAll("profiles");
    return profiles || [];
  }

  async createProfile(
    profileData: Omit<
      ProfileWithSync,
      "id" | "createdAt" | "updatedAt" | "_cacheTimestamp" | "_syncStatus"
    >
  ): Promise<ProfileWithSync> {
    if (!this.db) await this.init();

    const id = `profile_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const now = new Date().toISOString();

    const profile: ProfileWithSync = {
      id,
      createdAt: now,
      updatedAt: now,
      _cacheTimestamp: Date.now(),
      _syncStatus: "pending_update",
      ...profileData,
    };

    await this.saveProfile(profile);
    return profile;
  }

  // Teams operations
  async saveTeams(teams: TeamWithSync[]): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction("teams", "readwrite");

    await Promise.all([
      ...teams.map((team) => {
        team._cacheTimestamp = Date.now();
        return tx.store.put(team);
      }),
      tx.done,
    ]);
  }

  async getAllTeams(): Promise<TeamWithSync[]> {
    if (!this.db) await this.init();
    const teams = await this.db!.getAll("teams");
    return teams || [];
  }

  async createTeam(
    teamData: Omit<
      TeamWithSync,
      "id" | "createdAt" | "updatedAt" | "_cacheTimestamp" | "_syncStatus"
    >
  ): Promise<TeamWithSync> {
    if (!this.db) await this.init();

    const id = `team_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const now = new Date().toISOString();

    const team: TeamWithSync = {
      id,
      createdAt: now,
      updatedAt: now,
      _cacheTimestamp: Date.now(),
      _syncStatus: "synced",
      ...teamData,
    };

    await this.db!.put("teams", team);
    return team;
  }

  // Sync queue operations
  async addToSyncQueue(
    request: Omit<SyncQueueItem, "id" | "timestamp" | "retryCount" | "status">
  ): Promise<string> {
    if (!this.db) await this.init();

    const id = `sync_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const queueItem: SyncQueueItem = {
      id,
      timestamp: Date.now(),
      retryCount: 0,
      status: "pending",
      ...request,
    };

    await this.db!.put("syncQueue", queueItem);
    await this.incrementPendingOperations();

    return id;
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.init();
    const items = await this.db!.getAllFromIndex(
      "syncQueue",
      "status",
      IDBKeyRange.only("pending")
    );
    return items || [];
  }

  async updateSyncQueueItem(
    id: string,
    updates: Partial<SyncQueueItem>
  ): Promise<void> {
    if (!this.db) await this.init();

    const item = await this.db!.get("syncQueue", id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      await this.db!.put("syncQueue", updatedItem);

      if (updates.status === "completed") {
        await this.decrementPendingOperations();
      }
    }
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete("syncQueue", id);
    await this.decrementPendingOperations();
  }

  async clearCompletedSyncItems(): Promise<void> {
    if (!this.db) await this.init();
    const completed = await this.db!.getAllFromIndex(
      "syncQueue",
      "status",
      IDBKeyRange.only("completed")
    );
    const tx = this.db!.transaction("syncQueue", "readwrite");

    await Promise.all([
      ...(completed || []).map((item) => tx.store.delete(item.id)),
      tx.done,
    ]);
  }

  // App settings operations
  async getSettings(): Promise<AppSettings | undefined> {
    if (!this.db) await this.init();
    return this.db!.get("appSettings", "main");
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    if (!this.db) await this.init();

    const current = await this.getSettings();
    if (current) {
      const updated = { ...current, ...updates };
      await this.db!.put("appSettings", updated, "main");
    }
  }

  async setLastSync(timestamp: number): Promise<void> {
    await this.updateSettings({ lastSync: timestamp });
  }

  async setSyncInProgress(inProgress: boolean): Promise<void> {
    await this.updateSettings({ syncInProgress: inProgress });
  }

  async setOfflineMode(offline: boolean): Promise<void> {
    await this.updateSettings({ offlineMode: offline });
  }

  private async incrementPendingOperations(): Promise<void> {
    const settings = await this.getSettings();
    if (settings) {
      await this.updateSettings({
        pendingOperations: settings.pendingOperations + 1,
      });
    }
  }

  private async decrementPendingOperations(): Promise<void> {
    const settings = await this.getSettings();
    if (settings) {
      await this.updateSettings({
        pendingOperations: Math.max(0, settings.pendingOperations - 1),
      });
    }
  }

  // Utility methods
  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();

    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - CACHE_EXPIRY;

    // Clear expired profiles
    const profiles = await this.db!.getAll("profiles");
    const expiredProfiles = (profiles || []).filter(
      (p) => p._cacheTimestamp < cutoff
    );

    if (expiredProfiles.length > 0) {
      const tx = this.db!.transaction("profiles", "readwrite");
      await Promise.all([
        ...expiredProfiles.map((p) => tx.store.delete(p.id)),
        tx.done,
      ]);

      console.log(
        `🧹 Cleared ${expiredProfiles.length} expired profile cache entries`
      );
    }
  }

  async getStorageStats(): Promise<{
    tasks: number;
    profiles: number;
    teams: number;
    syncQueue: number;
    pendingOperations: number;
  }> {
    if (!this.db) await this.init();

    const [tasks, profiles, teams, syncQueue, settings] = await Promise.all([
      this.db!.count("tasks"),
      this.db!.count("profiles"),
      this.db!.count("teams"),
      this.db!.count("syncQueue"),
      this.getSettings(),
    ]);

    return {
      tasks,
      profiles,
      teams,
      syncQueue,
      pendingOperations: settings?.pendingOperations || 0,
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(
      ["tasks", "profiles", "teams", "syncQueue"],
      "readwrite"
    );
    await Promise.all([
      tx.objectStore("tasks").clear(),
      tx.objectStore("profiles").clear(),
      tx.objectStore("teams").clear(),
      tx.objectStore("syncQueue").clear(),
      tx.done,
    ]);

    await this.updateSettings({
      lastSync: 0,
      syncInProgress: false,
      pendingOperations: 0,
    });

    console.log("🗑️ Cleared all offline data");
  }
}

// Singleton instance
export const offlineDB = new OfflineDatabase();
