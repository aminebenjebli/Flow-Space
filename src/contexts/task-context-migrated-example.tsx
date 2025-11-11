/**
 * Example: Migrated Task Context using dataClient
 *
 * This shows how to migrate from direct api.tasks.* calls
 * to the new offline-aware dataClient pattern
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { dataClient } from "@/lib/data-client";
import type { TaskEntity } from "@/lib/db/dexie-db";
import { db } from "@/lib/db/dexie-db";
import { toast } from "react-hot-toast";

interface TaskContextType {
  // State
  tasks: TaskEntity[];
  currentTask: TaskEntity | null;
  isLoading: boolean;
  isOnline: boolean;

  // Actions
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  fetchTaskById: (clientId: string) => Promise<TaskEntity | null>;
  createTask: (data: Partial<TaskEntity>) => Promise<TaskEntity | null>;
  updateTask: (
    clientId: string,
    data: Partial<TaskEntity>
  ) => Promise<TaskEntity | null>;
  deleteTask: (clientId: string) => Promise<boolean>;
  syncNow: () => Promise<void>;
  clearCurrentTask: () => void;
}

interface TaskFilters {
  projectId?: string;
  teamId?: string;
  status?: string;
  priority?: string;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({
  children,
  projectId,
}: {
  readonly children: React.ReactNode;
  readonly projectId?: string;
}) {
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [currentTask, setCurrentTask] = useState<TaskEntity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => dataClient.isOnline());

  // Listen to network changes
  useEffect(() => {
    const unsubscribe = dataClient.onNetworkChange((online) => {
      setIsOnline(online);
    });
    return unsubscribe;
  }, []);

  // Auto-refresh from IndexedDB on changes
  useEffect(() => {
    const refreshFromDB = async () => {
      const filters: TaskFilters = {};
      if (projectId) filters.projectId = projectId;

      const dbTasks = await dataClient.getTasks(filters);
      setTasks(dbTasks);
    };

    // Refresh every 2 seconds to catch sync updates
    const interval = setInterval(refreshFromDB, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  const fetchTasks = useCallback(
    async (filters?: TaskFilters) => {
      setIsLoading(true);
      try {
        const params = {
          ...filters,
          ...(projectId && { projectId }),
        };

        console.log("[task-context] Fetching tasks with filters:", params);
        const fetchedTasks = await dataClient.getTasks(params);

        setTasks(fetchedTasks);
        console.log(`[task-context] Loaded ${fetchedTasks.length} tasks`);

        // Show offline notification if needed
        if (!isOnline && fetchedTasks.length > 0) {
          toast("Showing cached tasks", {
            icon: "📁",
            duration: 2000,
          });
        }
      } catch (error: any) {
        console.error("[task-context] Error fetching tasks:", error);
        toast.error("Failed to fetch tasks");
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, isOnline]
  );

  const fetchTaskById = useCallback(
    async (clientId: string): Promise<TaskEntity | null> => {
      try {
        console.log("[task-context] Fetching task by clientId:", clientId);

        // Get from local DB
        const task = await db.tasks.get(clientId);
        if (task) {
          setCurrentTask(task);
          return task;
        }

        console.warn("[task-context] Task not found:", clientId);
        return null;
      } catch (error: any) {
        console.error("[task-context] Error fetching task:", error);
        toast.error("Failed to fetch task");
        return null;
      }
    },
    []
  );

  const createTask = useCallback(
    async (data: Partial<TaskEntity>): Promise<TaskEntity | null> => {
      setIsLoading(true);
      try {
        const taskData = {
          ...data,
          ...(projectId && { projectId }),
        };

        console.log("[task-context] Creating task:", taskData);
        const newTask = await dataClient.createTask(taskData);

        // Optimistic UI update
        setTasks((prev) => [newTask, ...prev]);

        if (isOnline) {
          toast.success("Task created!");
        } else {
          toast.success("Task queued for sync!", { icon: "📥" });
        }

        return newTask;
      } catch (error: any) {
        console.error("[task-context] Error creating task:", error);
        toast.error("Failed to create task");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, isOnline]
  );

  const updateTask = useCallback(
    async (
      clientId: string,
      data: Partial<TaskEntity>
    ): Promise<TaskEntity | null> => {
      setIsLoading(true);
      try {
        console.log("[task-context] Updating task:", clientId, data);
        const updatedTask = await dataClient.updateTask(clientId, data);

        // Optimistic UI update
        setTasks((prev) =>
          prev.map((task) => (task.clientId === clientId ? updatedTask : task))
        );

        if (currentTask?.clientId === clientId) {
          setCurrentTask(updatedTask);
        }

        if (isOnline) {
          toast.success("Task updated!");
        } else {
          toast.success("Task changes queued!", { icon: "📥" });
        }

        return updatedTask;
      } catch (error: any) {
        console.error("[task-context] Error updating task:", error);
        toast.error("Failed to update task");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTask, isOnline]
  );

  const deleteTask = useCallback(
    async (clientId: string): Promise<boolean> => {
      try {
        console.log("[task-context] Deleting task:", clientId);
        await dataClient.deleteTask(clientId);

        // Optimistic UI update
        setTasks((prev) => prev.filter((task) => task.clientId !== clientId));

        if (currentTask?.clientId === clientId) {
          setCurrentTask(null);
        }

        if (isOnline) {
          toast.success("Task deleted!");
        } else {
          toast.success("Task deletion queued!", { icon: "📥" });
        }

        return true;
      } catch (error: any) {
        console.error("[task-context] Error deleting task:", error);
        toast.error("Failed to delete task");
        return false;
      }
    },
    [currentTask, isOnline]
  );

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline");
      return;
    }

    try {
      console.log("[task-context] Manual sync triggered");
      const result = await dataClient.sync();

      if (result.success > 0) {
        toast.success(`Synced ${result.success} items`);
        // Refresh tasks after sync
        await fetchTasks();
      } else if (result.failed > 0) {
        toast.error(`${result.failed} items failed to sync`);
      } else {
        toast("Nothing to sync", { icon: "ℹ️" });
      }
    } catch (error) {
      console.error("[task-context] Sync failed:", error);
      toast.error("Sync failed");
    }
  }, [isOnline, fetchTasks]);

  const clearCurrentTask = useCallback(() => {
    setCurrentTask(null);
  }, []);

  // Initial load
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const value: TaskContextType = useMemo(
    () => ({
      tasks,
      currentTask,
      isLoading,
      isOnline,
      fetchTasks,
      fetchTaskById,
      createTask,
      updateTask,
      deleteTask,
      syncNow,
      clearCurrentTask,
    }),
    [
      tasks,
      currentTask,
      isLoading,
      isOnline,
      fetchTasks,
      fetchTaskById,
      createTask,
      updateTask,
      deleteTask,
      syncNow,
      clearCurrentTask,
    ]
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTask() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTask must be used within a TaskProvider");
  }
  return context;
}
