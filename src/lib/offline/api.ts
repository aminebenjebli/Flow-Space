/**
 * Offline-Aware API Wrapper
 *
 * This module wraps the existing API client to provide offline-first functionality.
 * When offline, it:
 * - Returns cached data from IndexedDB
 * - Queues mutating requests (POST/PUT/DELETE) for later sync
 * - Provides optimistic UI updates
 *
 * When online, it:
 * - Makes normal API calls
 * - Caches responses in IndexedDB
 * - Processes queued requests
 */

import { api } from "@/lib/api/axios";
import {
  db,
  generateLocalId,
  type OfflineTask,
  type OfflineProject,
  type OfflineTeam,
  type QueuedRequest,
} from "./db";
import {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskDto,
  UpdateTaskDto,
  QueryTaskDto,
  BulkUpdateStatusDto,
} from "@/types/index";
import { CreateProjectData, Project } from "@/types/team";

// ==================== OFFLINE DETECTION ====================

/**
 * Check if user is currently online
 */
export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Wait for online connection with timeout
 */
export async function waitForOnline(
  timeoutMs: number = 5000
): Promise<boolean> {
  if (isOnline()) return true;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      globalThis.window.removeEventListener("online", onlineHandler);
      resolve(false);
    }, timeoutMs);

    const onlineHandler = () => {
      clearTimeout(timeout);
      globalThis.window.removeEventListener("online", onlineHandler);
      resolve(true);
    };

    globalThis.window.addEventListener("online", onlineHandler);
  });
}

// ==================== REQUEST QUEUE MANAGEMENT ====================

/**
 * Add a request to the offline queue
 */
async function queueRequest(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: any,
  resourceType: "task" | "project" | "team" = "task",
  resourceId?: string,
  localId?: string
): Promise<number> {
  const request: QueuedRequest = {
    url,
    method,
    body,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    status: "pending",
    resourceType,
    resourceId,
    localId,
  };

  const id = await db.requestQueue.add(request);
  console.log("[OfflineAPI] Request queued:", {
    id,
    method,
    url,
    resourceType,
  });
  return id;
}

/**
 * Get all pending queued requests
 */
export async function getPendingRequests(): Promise<QueuedRequest[]> {
  return db.requestQueue.where("status").equals("pending").sortBy("timestamp");
}

/**
 * Clear completed requests from queue
 */
export async function clearCompletedRequests(): Promise<void> {
  await db.requestQueue.where("status").equals("completed").delete();
}

// ==================== TASKS API (OFFLINE-AWARE) ====================

export const offlineTasksApi = {
  /**
   * Get all tasks - returns cached data if offline
   */
  async getAll(params?: QueryTaskDto) {
    if (isOnline()) {
      try {
        const response = await api.tasks.getAll(params);

        // Cache tasks in IndexedDB
        if (response.data?.tasks || (response as any).tasks) {
          const tasks = response.data?.tasks || (response as any).tasks;

          // Update cache with synced tasks
          for (const task of tasks) {
            const offlineTask: OfflineTask = {
              ...task,
              _syncStatus: "synced",
              _lastModified: Date.now(),
            };
            await db.tasks.put(offlineTask);
          }
        }

        // Update last sync time
        await db.syncMetadata.update("tasks", {
          lastSyncTime: Date.now(),
          syncInProgress: false,
        });

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to fetch tasks online, falling back to cache:",
          error
        );
        // Fall through to offline logic
      }
    }

    // Offline: return cached tasks
    console.log("[OfflineAPI] Returning cached tasks (offline mode)");
    let query = db.tasks.toCollection();

    // Apply filters
    if (params?.status) {
      query = db.tasks.where("status").equals(params.status);
    }
    if (params?.priority) {
      query = db.tasks.where("priority").equals(params.priority);
    }

    const tasks = (await query.toArray()) as Task[];

    // Apply search filter in memory if needed
    let filteredTasks = tasks;
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredTasks = tasks.filter(
        (task: Task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedTasks = filteredTasks.slice(start, end);

    return {
      data: {
        tasks: paginatedTasks,
        total: filteredTasks.length,
        page,
        limit,
        totalPages: Math.ceil(filteredTasks.length / limit),
      },
    };
  },

  /**
   * Get task by ID - returns cached data if offline
   */
  async getById(id: string) {
    if (isOnline()) {
      try {
        const response = await api.tasks.getById(id);

        // Cache task
        const task = response.data;
        const offlineTask: OfflineTask = {
          ...task,
          _syncStatus: "synced",
          _lastModified: Date.now(),
        };
        await db.tasks.put(offlineTask);

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to fetch task online, falling back to cache:",
          error
        );
      }
    }

    // Offline: return cached task
    const task = await db.tasks.get(id);
    if (!task) {
      throw new Error("Task not found in offline cache");
    }

    return {
      data: task,
    };
  },

  /**
   * Create task - works offline with optimistic updates
   */
  async create(taskData: CreateTaskDto): Promise<{ data: Task }> {
    const localId = generateLocalId("task");
    const now = new Date().toISOString();

    // Create optimistic task
    const optimisticTask: Task = {
      id: localId,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status || TaskStatus.TODO,
      priority: taskData.priority || TaskPriority.MEDIUM,
      dueDate: taskData.dueDate,
      createdAt: now,
      updatedAt: now,
      userId: "current-user", // Will be replaced by server
      user: {
        id: "current-user",
        name: "You",
        email: "",
      },
    };

    // Create offline version with sync metadata
    const offlineTask: OfflineTask = {
      ...optimisticTask,
      _localId: localId,
      _syncStatus: "pending" as const,
      _lastModified: Date.now(),
    };

    if (isOnline()) {
      try {
        const response = await api.tasks.create(taskData);
        const serverTask = response.data || response;

        // Replace optimistic task with server task
        await db.tasks.delete(localId);
        const syncedTask: OfflineTask = {
          ...(serverTask as Task),
          _syncStatus: "synced",
          _lastModified: Date.now(),
        };
        await db.tasks.put(syncedTask);

        return { data: serverTask as Task };
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to create task online, saving for later sync:",
          error
        );
        // Fall through to offline logic
      }
    }

    // Offline: save optimistic task and queue request
    await db.tasks.put(offlineTask);
    await queueRequest("/tasks", "POST", taskData, "task", undefined, localId);

    console.log("[OfflineAPI] Task created offline:", localId);
    return { data: optimisticTask };
  },

  /**
   * Update task - works offline with optimistic updates
   */
  async update(id: string, taskData: UpdateTaskDto): Promise<{ data: Task }> {
    // Get existing task
    const existingTask = (await db.tasks.get(id)) as Task | undefined;
    if (!existingTask) {
      throw new Error("Task not found");
    }

    // Create optimistic update
    const optimisticTask: Task = {
      ...existingTask,
      ...taskData,
      updatedAt: new Date().toISOString(),
    };

    // Create offline version with sync metadata
    const offlineTask: OfflineTask = {
      ...optimisticTask,
      _syncStatus: "pending",
      _lastModified: Date.now(),
    };

    if (isOnline()) {
      try {
        const response = await api.tasks.update(id, taskData);
        const serverTask = response.data || response;

        // Update with server version
        const syncedTask: OfflineTask = {
          ...(serverTask as Task),
          _syncStatus: "synced",
          _lastModified: Date.now(),
        };
        await db.tasks.put(syncedTask);

        return { data: serverTask as Task };
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to update task online, saving for later sync:",
          error
        );
        // Fall through to offline logic
      }
    }

    // Offline: save optimistic update and queue request
    await db.tasks.put(offlineTask);
    await queueRequest(`/tasks/${id}`, "PATCH", taskData, "task", id);

    console.log("[OfflineAPI] Task updated offline:", id);
    return { data: optimisticTask };
  },

  /**
   * Delete task - works offline
   */
  async delete(id: string): Promise<void> {
    if (isOnline()) {
      try {
        await api.tasks.delete(id);
        await db.tasks.delete(id);
        return;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to delete task online, queuing for later:",
          error
        );
        // Fall through to offline logic
      }
    }

    // Offline: mark for deletion and queue request
    const task = await db.tasks.get(id);
    if (task) {
      // Mark as pending deletion
      const updatedTask: OfflineTask = {
        ...(task as Task),
        _syncStatus: "pending",
        _lastModified: Date.now(),
      };
      await db.tasks.put(updatedTask);
      await queueRequest(`/tasks/${id}`, "DELETE", undefined, "task", id);

      // Remove from local cache (optimistic delete)
      await db.tasks.delete(id);
    }

    console.log("[OfflineAPI] Task deleted offline:", id);
  },

  /**
   * Bulk update task status - works offline
   */
  async bulkUpdateStatus(
    data: BulkUpdateStatusDto
  ): Promise<{ data: { count: number } }> {
    if (isOnline()) {
      try {
        const response = await api.tasks.bulkUpdateStatus(data);

        // Update cache
        for (const taskId of data.taskIds) {
          const task = await db.tasks.get(taskId);
          if (task) {
            await db.tasks.update(taskId, {
              status: data.status,
              _syncStatus: "synced",
              _lastModified: Date.now(),
            });
          }
        }

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to bulk update online, saving for later:",
          error
        );
        // Fall through to offline logic
      }
    }

    // Offline: update locally and queue
    let count = 0;
    for (const taskId of data.taskIds) {
      const task = (await db.tasks.get(taskId)) as Task | undefined;
      if (task) {
        const updatedTask: OfflineTask = {
          ...task,
          status: data.status,
          _syncStatus: "pending",
          _lastModified: Date.now(),
        };
        await db.tasks.put(updatedTask);
        count++;
      }
    }

    await queueRequest("/tasks/bulk/status", "PATCH", data, "task");
    console.log("[OfflineAPI] Bulk update queued offline:", count, "tasks");

    return { data: { count } };
  },

  /**
   * Get task stats - returns cached calculation if offline
   */
  async getStats() {
    if (isOnline()) {
      try {
        return await api.tasks.getStats();
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to fetch stats online, calculating from cache:",
          error
        );
      }
    }

    // Offline: calculate from cached tasks
    const tasks = (await db.tasks.toArray()) as Task[];
    const now = new Date();

    const stats = {
      total: tasks.length,
      todo: tasks.filter((t: Task) => t.status === TaskStatus.TODO).length,
      inProgress: tasks.filter((t: Task) => t.status === TaskStatus.IN_PROGRESS)
        .length,
      done: tasks.filter((t: Task) => t.status === TaskStatus.DONE).length,
      cancelled: tasks.filter((t: Task) => t.status === TaskStatus.CANCELLED)
        .length,
      overdue: tasks.filter((t: Task) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < now && t.status !== TaskStatus.DONE;
      }).length,
    };

    return { data: stats };
  },
};

// ==================== PROJECTS API (OFFLINE-AWARE) ====================

export const offlineProjectsApi = {
  /**
   * Get all projects - returns cached data if offline
   */
  async getAll() {
    if (isOnline()) {
      try {
        // Note: Implement actual projects API endpoint
        const response = await api.get("/projects");

        // Cache projects
        if (response.data) {
          const projects = Array.isArray(response.data)
            ? response.data
            : [response.data];
          for (const project of projects) {
            const offlineProject: OfflineProject = {
              ...project,
              createdAt:
                project.createdAt?.toString() || new Date().toISOString(),
              updatedAt:
                project.updatedAt?.toString() || new Date().toISOString(),
              _syncStatus: "synced",
              _lastModified: Date.now(),
            };
            await db.projects.put(offlineProject);
          }
        }

        await db.syncMetadata.update("projects", {
          lastSyncTime: Date.now(),
          syncInProgress: false,
        });

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to fetch projects online, falling back to cache:",
          error
        );
      }
    }

    // Offline: return cached projects
    const projects = await db.projects.toArray();
    return { data: projects };
  },

  /**
   * Get project by ID
   */
  async getById(id: string) {
    if (isOnline()) {
      try {
        const response = await api.get(`/projects/${id}`);

        // Cache project
        if (response.data) {
          const offlineProject: OfflineProject = {
            ...response.data,
            createdAt:
              response.data.createdAt?.toString() || new Date().toISOString(),
            updatedAt:
              response.data.updatedAt?.toString() || new Date().toISOString(),
            _syncStatus: "synced",
            _lastModified: Date.now(),
          };
          await db.projects.put(offlineProject);
        }

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to fetch project online, falling back to cache:",
          error
        );
      }
    }

    const project = await db.projects.get(id);
    if (!project) {
      throw new Error("Project not found in offline cache");
    }

    return { data: project };
  },

  /**
   * Create project - works offline
   */
  async create(projectData: CreateProjectData) {
    const localId = generateLocalId("project");
    const now = new Date().toISOString();

    const optimisticProject: OfflineProject = {
      id: localId,
      name: projectData.name,
      description: projectData.description,
      visibility: projectData.visibility || "PRIVATE",
      ownerId: "current-user",
      teamId: projectData.teamId || null,
      createdAt: now,
      updatedAt: now,
      _localId: localId,
      _syncStatus: "pending",
      _lastModified: Date.now(),
    };

    if (isOnline()) {
      try {
        const response = await api.post("/projects", projectData);
        const serverProject = response.data;

        await db.projects.delete(localId);
        const syncedProject: OfflineProject = {
          ...serverProject,
          createdAt: serverProject.createdAt?.toString() || now,
          updatedAt: serverProject.updatedAt?.toString() || now,
          _syncStatus: "synced",
          _lastModified: Date.now(),
        };
        await db.projects.put(syncedProject);

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to create project online, saving for later sync:",
          error
        );
      }
    }

    await db.projects.put(optimisticProject);
    await queueRequest(
      "/projects",
      "POST",
      projectData,
      "project",
      undefined,
      localId
    );

    console.log("[OfflineAPI] Project created offline:", localId);
    return { data: optimisticProject };
  },

  /**
   * Update project - works offline with optimistic updates
   */
  async update(id: string, projectData: Partial<Project>) {
    // Get existing project from IndexedDB
    let existingProject = (await db.projects.get(id)) as Project | undefined;
    
    // If project doesn't exist in IndexedDB but we're online, fetch it first
    if (!existingProject && isOnline()) {
      try {
        console.log("[OfflineAPI] Project not in IndexedDB, fetching from server:", id);
        const response = await api.get(`/projects/${id}`);
        existingProject = response.data || response;
        
        // Store it in IndexedDB for future use
        if (existingProject) {
          const offlineProject: OfflineProject = {
            ...existingProject,
            createdAt: existingProject.createdAt?.toString() || new Date().toISOString(),
            updatedAt: existingProject.updatedAt?.toString() || new Date().toISOString(),
            _syncStatus: "synced",
            _lastModified: Date.now(),
          };
          await db.projects.put(offlineProject);
        }
      } catch (error) {
        console.error("[OfflineAPI] Failed to fetch project from server:", error);
        throw new Error("Project not found");
      }
    }
    
    if (!existingProject) {
      throw new Error("Project not found in IndexedDB and unable to fetch from server");
    }

    // Create optimistic update
    const optimisticProject: Project = {
      ...existingProject,
      ...projectData,
      updatedAt: new Date(),
    };

    // Create offline version with sync metadata
    const offlineProject: OfflineProject = {
      ...optimisticProject,
      createdAt:
        optimisticProject.createdAt?.toString() || new Date().toISOString(),
      updatedAt:
        optimisticProject.updatedAt?.toString() || new Date().toISOString(),
      _syncStatus: "pending",
      _lastModified: Date.now(),
    };

    if (isOnline()) {
      try {
        const response = await api.patch(`/projects/${id}`, projectData);
        const serverProject = response.data || response;

        // Update with server version
        const syncedProject: OfflineProject = {
          ...(serverProject as Project),
          createdAt:
            serverProject.createdAt?.toString() || new Date().toISOString(),
          updatedAt:
            serverProject.updatedAt?.toString() || new Date().toISOString(),
          _syncStatus: "synced",
          _lastModified: Date.now(),
        };
        await db.projects.put(syncedProject);

        return { data: serverProject as Project };
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to update project online, saving for later sync:",
          error
        );
        // Fall through to offline logic
      }
    }

    // Offline: save optimistic update and queue request
    await db.projects.put(offlineProject);
    await queueRequest(`/projects/${id}`, "PATCH", projectData, "project", id);

    console.log("[OfflineAPI] Project updated offline:", id);
    return { data: optimisticProject };
  },

  /**
   * Delete project - works offline
   */
  async delete(id: string) {
    if (isOnline()) {
      try {
        await api.delete(`/projects/${id}`);
        await db.projects.delete(id);
        return;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to delete project online, queuing for later:",
          error
        );
        // Fall through to offline logic
      }
    }

    // Offline: mark for deletion and queue request
    const project = await db.projects.get(id);
    if (project) {
      // Mark as pending deletion
      const updatedProject: OfflineProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        _syncStatus: "pending",
        _lastModified: Date.now(),
      };
      await db.projects.put(updatedProject);
      await queueRequest(`/projects/${id}`, "DELETE", undefined, "project", id);

      // Remove from local cache (optimistic delete)
      await db.projects.delete(id);
    }

    console.log("[OfflineAPI] Project deleted offline:", id);
  },
};

// ==================== TEAMS API (OFFLINE-AWARE) ====================

export const offlineTeamsApi = {
  /**
   * Get all teams - returns cached data if offline
   */
  async getAll() {
    if (isOnline()) {
      try {
        const response = await api.get("/teams");

        // Cache teams
        if (response.data) {
          const teams = Array.isArray(response.data)
            ? response.data
            : [response.data];
          for (const team of teams) {
            const offlineTeam: OfflineTeam = {
              ...team,
              createdAt: team.createdAt?.toString() || new Date().toISOString(),
              updatedAt: team.updatedAt?.toString() || new Date().toISOString(),
              _syncStatus: "synced",
              _lastModified: Date.now(),
            };
            await db.teams.put(offlineTeam);
          }
        }

        await db.syncMetadata.update("teams", {
          lastSyncTime: Date.now(),
          syncInProgress: false,
        });

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to fetch teams online, falling back to cache:",
          error
        );
      }
    }

    // Offline: return cached teams
    const teams = await db.teams.toArray();
    return { data: teams };
  },

  /**
   * Get team by ID
   */
  async getById(id: string) {
    if (isOnline()) {
      try {
        const response = await api.get(`/teams/${id}`);

        // Cache team
        if (response.data) {
          const offlineTeam: OfflineTeam = {
            ...response.data,
            createdAt:
              response.data.createdAt?.toString() || new Date().toISOString(),
            updatedAt:
              response.data.updatedAt?.toString() || new Date().toISOString(),
            _syncStatus: "synced",
            _lastModified: Date.now(),
          };
          await db.teams.put(offlineTeam);
        }

        return response;
      } catch (error) {
        console.warn(
          "[OfflineAPI] Failed to fetch team online, falling back to cache:",
          error
        );
      }
    }

    const team = await db.teams.get(id);
    if (!team) {
      throw new Error("Team not found in offline cache");
    }

    return { data: team };
  },
};

// Export unified offline API
export const offlineApi = {
  tasks: offlineTasksApi,
  projects: offlineProjectsApi,
  teams: offlineTeamsApi,
  isOnline,
  waitForOnline,
  getPendingRequests,
  clearCompletedRequests,
};
