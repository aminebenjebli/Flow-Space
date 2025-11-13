/**
 * Offline-Aware Task Context
 *
 * Wraps the existing TaskContext with offline capabilities.
 * Automatically uses offline API when disconnected and syncs when reconnected.
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  QueryTaskDto,
  BulkUpdateStatusDto,
  TaskListResponse,
  TaskStatsResponse,
} from "@/types/index";
import { offlineTasksApi } from "@/lib/offline/api";
import { useOffline } from "@/hooks/useOffline";
import toast from "react-hot-toast";

interface OfflineTaskContextType {
  // State
  tasks: Task[];
  stats: TaskStatsResponse | null;
  currentTask: Task | null;
  isLoading: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: QueryTaskDto;

  // Actions
  fetchTasks: (params?: QueryTaskDto) => Promise<void>;
  fetchTaskById: (id: string) => Promise<Task | null>;
  createTask: (data: CreateTaskDto) => Promise<Task | null>;
  updateTask: (id: string, data: UpdateTaskDto) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  bulkUpdateStatus: (data: BulkUpdateStatusDto) => Promise<boolean>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: QueryTaskDto) => void;
  clearCurrentTask: () => void;
}

const OfflineTaskContext = createContext<OfflineTaskContextType | undefined>(
  undefined
);

export function OfflineTaskProvider({
  children,
  projectId,
}: {
  readonly children: React.ReactNode;
  readonly projectId?: string;
}) {
  const { isOnline, isSyncing } = useOffline();
  const wasSyncingRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStatsResponse | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filtersState, setFiltersState] = useState<QueryTaskDto>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...(projectId && { projectId }),
  });

  const fetchTasks = useCallback(
    async (params?: QueryTaskDto) => {
      setIsLoading(true);
      try {
        const queryParams = { ...filtersState, ...params };
        console.log(
          "[OfflineTaskContext] Fetching tasks with params:",
          queryParams
        );

        const response = await offlineTasksApi.getAll(queryParams);

        let data: TaskListResponse;
        if (response.data?.tasks) {
          data = response.data;
        } else if ((response as any).tasks) {
          data = response as any;
        } else {
          console.error(
            "[OfflineTaskContext] Unexpected response format:",
            response
          );
          data = { tasks: [], total: 0, page: 1, limit: 10, totalPages: 0 };
        }

        const validTasks = (data.tasks || []).filter((task: Task) => task?.id);
        if (validTasks.length !== (data.tasks || []).length) {
          console.warn("[OfflineTaskContext] Filtered out invalid tasks");
        }

        setTasks(validTasks);
        setPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        });
      } catch (error: any) {
        console.error("[OfflineTaskContext] Error fetching tasks:", error);
        const errorMessage = error.message || "Failed to fetch tasks";
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [filtersState]
  );

  const fetchTaskById = useCallback(
    async (id: string): Promise<Task | null> => {
      try {
        const response = await offlineTasksApi.getById(id);
        const task: Task = response.data;
        setCurrentTask(task);
        return task;
      } catch (error: any) {
        console.error("[OfflineTaskContext] Error fetching task:", error);
        toast.error("Failed to fetch task");
        return null;
      }
    },
    []
  );

  const createTask = useCallback(
    async (data: CreateTaskDto): Promise<Task | null> => {
      setIsLoading(true);
      try {
        const taskData = {
          ...data,
          ...(projectId && { projectId }),
        };

        console.log("[OfflineTaskContext] Creating task:", taskData);
        const response = await offlineTasksApi.create(taskData);

        // Handle offline queued response vs actual task response
        const newTask = response.data;

        // Check if this is a queued response (from service worker)
        if ((response as any).queued || (response as any).success === false) {
          console.log("[OfflineTaskContext] Task queued for sync:", response);
          toast.success("Task created offline. Will sync when online.");
          // Don't add to tasks list yet - wait for sync
          return null;
        }

        // Validate actual task response
        if (!newTask?.id) {
          console.error("[OfflineTaskContext] Invalid task response:", newTask);
          throw new Error("Invalid task returned from server");
        }

        setTasks((prev) => [newTask, ...prev]);

        const message = isOnline
          ? "Task created successfully!"
          : "Task created offline. Will sync when online.";
        toast.success(message);

        return newTask;
      } catch (error: any) {
        console.error("[OfflineTaskContext] Error creating task:", error);
        const errorMessage = error.message || "Failed to create task";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, isOnline]
  );

  const updateTask = useCallback(
    async (id: string, data: UpdateTaskDto): Promise<Task | null> => {
      setIsLoading(true);
      try {
        console.log("[OfflineTaskContext] Updating task:", id, data);
        const response = await offlineTasksApi.update(id, data);

        // Handle offline queued response vs actual task response
        const updatedTask = response.data;

        // Check if this is a queued response (from service worker)
        if ((response as any).queued || (response as any).success === false) {
          console.log("[OfflineTaskContext] Update queued for sync:", response);

          // Optimistically update the task in the UI
          setTasks((prev) =>
            prev.map((task) => (task.id === id ? { ...task, ...data } : task))
          );

          if (currentTask?.id === id) {
            setCurrentTask({ ...currentTask, ...data });
          }

          toast.success("Task updated offline. Will sync when online.");
          return currentTask;
        }

        // Validate actual task response
        if (!updatedTask?.id) {
          console.error(
            "[OfflineTaskContext] Invalid update response:",
            updatedTask
          );
          throw new Error("Invalid task returned from server");
        }

        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updatedTask : task))
        );

        if (currentTask?.id === id) {
          setCurrentTask(updatedTask);
        }

        const message = isOnline
          ? "Task updated successfully!"
          : "Task updated offline. Will sync when online.";
        toast.success(message);

        return updatedTask;
      } catch (error: any) {
        console.error("[OfflineTaskContext] Error updating task:", error);
        const errorMessage = error.message || "Failed to update task";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTask, isOnline]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await offlineTasksApi.delete(id);

        // Check if this is a queued response (from service worker)
        if ((response as any)?.queued || (response as any)?.success === false) {
          console.log("[OfflineTaskContext] Delete queued for sync:", response);
        }

        // Optimistically remove from UI regardless
        setTasks((prev) => prev.filter((task) => task.id !== id));
        if (currentTask?.id === id) {
          setCurrentTask(null);
        }

        const message = isOnline
          ? "Task deleted successfully!"
          : "Task deleted offline. Will sync when online.";
        toast.success(message);

        return true;
      } catch (error: any) {
        console.error("[OfflineTaskContext] Error deleting task:", error);
        toast.error("Failed to delete task");
        return false;
      }
    },
    [currentTask, isOnline]
  );

  const bulkUpdateStatus = useCallback(
    async (data: BulkUpdateStatusDto): Promise<boolean> => {
      setIsLoading(true);
      try {
        const response = await offlineTasksApi.bulkUpdateStatus(data);

        // Update local state
        setTasks((prev) =>
          prev.map((task) =>
            data.taskIds.includes(task.id)
              ? { ...task, status: data.status }
              : task
          )
        );

        const message = isOnline
          ? `Updated ${response.data.count} tasks successfully!`
          : `Updated ${response.data.count} tasks offline. Will sync when online.`;
        toast.success(message);

        return true;
      } catch (error: any) {
        console.error("[OfflineTaskContext] Error bulk updating:", error);
        toast.error("Failed to update tasks");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response = await offlineTasksApi.getStats();
      setStats(response.data);
    } catch (error: any) {
      console.error("[OfflineTaskContext] Error fetching stats:", error);
    }
  }, []);

  const setFilters = useCallback((newFilters: QueryTaskDto) => {
    setFiltersState((prev: QueryTaskDto) => ({ ...prev, ...newFilters }));
  }, []);

  const clearCurrentTask = useCallback(() => {
    setCurrentTask(null);
  }, []);

  // Refresh data when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      console.log("[OfflineTaskContext] Back online, refreshing data...");
      fetchTasks();
      fetchStats();
    }
  }, [isOnline, isSyncing]); // Only refresh when these change

  // Refresh when sync completes
  useEffect(() => {
    if (isSyncing) {
      wasSyncingRef.current = true;
    } else if (wasSyncingRef.current && !isSyncing && isOnline) {
      // Sync just completed
      console.log("[OfflineTaskContext] Sync completed, refreshing tasks...");
      wasSyncingRef.current = false;
      fetchTasks();
      fetchStats();
    }
  }, [isSyncing, isOnline, fetchTasks, fetchStats]);

  const value: OfflineTaskContextType = useMemo(
    () => ({
      tasks,
      stats,
      currentTask,
      isLoading,
      isOffline: !isOnline,
      isSyncing,
      pagination,
      filters: filtersState,
      fetchTasks,
      fetchTaskById,
      createTask,
      updateTask,
      deleteTask,
      bulkUpdateStatus,
      fetchStats,
      setFilters,
      clearCurrentTask,
    }),
    [
      tasks,
      stats,
      currentTask,
      isLoading,
      isOnline,
      isSyncing,
      pagination,
      filtersState,
      fetchTasks,
      fetchTaskById,
      createTask,
      updateTask,
      deleteTask,
      bulkUpdateStatus,
      fetchStats,
      setFilters,
      clearCurrentTask,
    ]
  );

  return (
    <OfflineTaskContext.Provider value={value}>
      {children}
    </OfflineTaskContext.Provider>
  );
}

export function useOfflineTask() {
  const context = useContext(OfflineTaskContext);
  if (context === undefined) {
    throw new Error(
      "useOfflineTask must be used within an OfflineTaskProvider"
    );
  }
  return context;
}
