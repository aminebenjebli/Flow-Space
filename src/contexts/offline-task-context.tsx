"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { offlineAPI } from "@/lib/offline-api";
import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
  QueryTaskDto,
  TaskListResponse,
  TaskStatsResponse,
  BulkUpdateStatusDto,
} from "@/types/index";
import { toast } from "react-hot-toast";

interface OfflineTaskContextType {
  // State
  tasks: Task[];
  stats: TaskStatsResponse | null;
  currentTask: Task | null;
  isLoading: boolean;
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

  // Offline specific
  isOnline: boolean;
  syncPendingChanges: () => Promise<void>;
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStatsResponse | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => offlineAPI.isOnline());
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

  // Listen to network status changes
  React.useEffect(() => {
    const unsubscribe = offlineAPI.onNetworkChange((online) => {
      setIsOnline(online);
    });
    return unsubscribe;
  }, []);

  const fetchTasks = useCallback(
    async (params?: QueryTaskDto) => {
      setIsLoading(true);
      try {
        const queryParams = { ...filtersState, ...params };
        console.log("Fetching tasks with params (offline-aware):", queryParams);

        // Build URL with query parameters
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
        const queryString = searchParams.toString();
        const url = queryString ? `/tasks?${queryString}` : "/tasks";

        // Use offlineAPI for offline-aware request
        const response = await offlineAPI.request("GET", url, undefined, {
          cacheStrategy: "network-first",
        });

        console.log("Raw offline API response:", response);

        // Handle the response structure
        let data: TaskListResponse;

        if (response?.tasks && Array.isArray(response.tasks)) {
          // Direct TaskListResponse structure
          data = response as TaskListResponse;
        } else if (Array.isArray(response)) {
          // Direct array of tasks, convert to paginated structure
          data = {
            tasks: response,
            page: 1,
            limit: response.length,
            total: response.length,
            totalPages: 1,
          };
        } else {
          console.error("Unexpected response structure:", response);

          // Handle offline scenario gracefully
          if (!offlineAPI.isOnline()) {
            if (tasks.length > 0) {
              toast("Working offline - showing cached tasks", {
                icon: "📁",
                duration: 3000,
              });
              return;
            } else {
              toast("No cached tasks available offline", {
                icon: "📁",
                duration: 3000,
              });
              return;
            }
          }

          toast.error("Unexpected response format from server");
          return;
        }

        console.log("Processed task data:", data);

        // Filter out invalid tasks
        const validTasks = (data.tasks || []).filter((task) => task?.id);
        if (validTasks.length !== (data.tasks || []).length) {
          console.warn("Some tasks were filtered out due to missing id");
        }

        setTasks(validTasks);
        setPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total: data.total || 0,
          totalPages: data.totalPages || 1,
        });
      } catch (error: any) {
        console.error("Error fetching tasks:", error);

        // Handle offline scenarios gracefully
        if (!offlineAPI.isOnline()) {
          if (tasks.length > 0) {
            console.log("Offline mode: Using existing tasks");
            toast("Working offline - showing cached tasks", {
              icon: "📁",
              duration: 3000,
            });
            return;
          } else {
            toast("No cached tasks available offline", {
              icon: "📁",
              duration: 3000,
            });
            return;
          }
        }

        // Check if this is a server error (5xx) and we have cached data
        const isServerError = error.response?.status >= 500;
        if (isServerError && tasks.length > 0) {
          toast("Server unavailable - showing cached tasks", {
            icon: "⚠️",
            duration: 3000,
          });
          return;
        }

        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch tasks";
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [filtersState, tasks.length]
  );

  const fetchTaskById = useCallback(
    async (id: string): Promise<Task | null> => {
      try {
        console.log("Fetching task by ID (offline-aware):", id);

        const response = await offlineAPI.request(
          "GET",
          `/tasks/${id}`,
          undefined,
          {
            cacheStrategy: "network-first",
          }
        );

        console.log("Fetch task by ID response:", response);

        // Handle response - offlineAPI returns the data directly
        const task: Task = response;

        if (task?.id) {
          setCurrentTask(task);
          return task;
        } else {
          console.warn("Invalid task data received:", task);
          return null;
        }
      } catch (error: any) {
        console.error("Error fetching task:", error);

        // Handle offline scenarios
        if (!offlineAPI.isOnline()) {
          toast("Unable to fetch task details offline", {
            icon: "📁",
            duration: 3000,
          });
        } else {
          toast.error("Failed to fetch task");
        }
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
        console.log("Creating task with data (offline-aware):", taskData);

        const response = await offlineAPI.request("POST", "/tasks", taskData, {
          cacheStrategy: "network-first",
        });

        console.log("Create response:", response);

        // Handle response - offlineAPI returns the data directly
        const newTask: Task = response;

        if (!newTask?.id) {
          console.error("Invalid new task data:", newTask);

          // Don't show error if offline - the task might still be queued successfully
          if (offlineAPI.isOnline()) {
            toast.error("Invalid response from server");
          }
          return null;
        }

        // Optimistically update the UI
        setTasks((prev) => [newTask, ...prev]);

        // Show appropriate success message based on network status
        if (offlineAPI.isOnline()) {
          toast.success("Task created successfully!");
        } else {
          toast.success("Task saved offline - will sync when online!", {
            icon: "📥",
            duration: 3000,
          });
        }

        return newTask;
      } catch (error: any) {
        console.error("Error creating task:", error);

        // Handle offline scenarios gracefully
        if (!offlineAPI.isOnline()) {
          // If we're offline and got an error, it means queuing failed
          toast.error("Failed to save task offline. Please try again.");
          return null;
        }

        // Handle online errors
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to create task";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId]
  );

  const updateTask = useCallback(
    async (id: string, data: UpdateTaskDto): Promise<Task | null> => {
      setIsLoading(true);
      try {
        console.log("Updating task (offline-aware):", id, "with data:", data);

        const response = await offlineAPI.request("PUT", `/tasks/${id}`, data, {
          cacheStrategy: "network-first",
        });

        console.log("Update response:", response);

        // Handle response - offlineAPI returns the data directly
        const updatedTask: Task = response;

        if (!updatedTask?.id) {
          console.error("Invalid updated task data:", updatedTask);

          // Don't show error if offline - the task might still be queued successfully
          if (offlineAPI.isOnline()) {
            toast.error("Invalid response from server");
          }
          return null;
        }

        // Optimistically update the UI
        setTasks((prev) =>
          prev.map((task) => {
            if (!task?.id) {
              console.warn("Found invalid task in tasks array:", task);
              return task;
            }
            return task.id === id ? updatedTask : task;
          })
        );

        if (currentTask?.id === id) {
          setCurrentTask(updatedTask);
        }

        // Show appropriate success message based on network status
        if (offlineAPI.isOnline()) {
          toast.success("Task updated successfully!");
        } else {
          toast.success("Task updated offline - will sync when online!", {
            icon: "📥",
            duration: 3000,
          });
        }

        return updatedTask;
      } catch (error: any) {
        console.error("Error updating task:", error);

        // Handle offline scenarios gracefully
        if (!offlineAPI.isOnline()) {
          // If we're offline and got an error, it means queuing failed
          toast.error("Failed to save task changes offline. Please try again.");
          return null;
        }

        // Handle online errors
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to update task";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTask]
  );

  const deleteTask = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        console.log("Deleting task (offline-aware):", id);

        await offlineAPI.request("DELETE", `/tasks/${id}`, undefined, {
          cacheStrategy: "network-first",
        });

        // Optimistically update the UI
        setTasks((prev) => prev.filter((task) => task.id !== id));

        if (currentTask?.id === id) {
          setCurrentTask(null);
        }

        // Show appropriate success message based on network status
        if (offlineAPI.isOnline()) {
          toast.success("Task deleted successfully!");
        } else {
          toast.success("Task deletion queued - will sync when online!", {
            icon: "📥",
            duration: 3000,
          });
        }

        return true;
      } catch (error: any) {
        console.error("Error deleting task:", error);

        // Handle offline scenarios gracefully
        if (!offlineAPI.isOnline()) {
          // If we're offline and got an error, it means queuing failed
          toast.error("Failed to queue task deletion. Please try again.");
          return false;
        }

        // Handle online errors
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to delete task";
        toast.error(errorMessage);
        return false;
      }
    },
    [currentTask]
  );

  const bulkUpdateStatus = useCallback(
    async (data: BulkUpdateStatusDto): Promise<boolean> => {
      setIsLoading(true);
      try {
        console.log("Bulk updating tasks (offline-aware):", data);

        const response = await offlineAPI.request(
          "PATCH",
          "/tasks/bulk-status",
          data,
          {
            cacheStrategy: "network-first",
          }
        );

        console.log("Bulk update response:", response);

        // For bulk update, consider it successful if we get any response
        const count = response?.count || data.taskIds.length;

        // Optimistically update tasks in state
        setTasks((prev) =>
          prev.map((task) =>
            data.taskIds.includes(task.id)
              ? {
                  ...task,
                  status: data.status,
                  updatedAt: new Date().toISOString(),
                }
              : task
          )
        );

        const message = `${count} task${
          count === 1 ? "" : "s"
        } updated successfully!`;

        if (offlineAPI.isOnline()) {
          toast.success(message);
        } else {
          toast.success(
            `${count} task${count === 1 ? "" : "s"} queued for sync!`
          );
        }

        return true;
      } catch (error: any) {
        console.error("Error bulk updating tasks:", error);

        // Handle offline scenarios
        if (!offlineAPI.isOnline()) {
          toast("Bulk update queued for sync when online", {
            icon: "📥",
            duration: 3000,
          });
          return true; // Still return true for optimistic UI
        }

        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to update tasks";
        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const fetchStats = useCallback(async () => {
    try {
      console.log("Fetching task stats (offline-aware)...");

      const response = await offlineAPI.request(
        "GET",
        "/tasks/stats",
        undefined,
        {
          cacheStrategy: "network-first",
        }
      );

      console.log("Stats response:", response);

      // Handle response - offlineAPI returns the actual stats data directly
      // since makeNetworkRequest returns response.data from the ApiResponse
      const statsData: TaskStatsResponse = response;

      if (statsData && typeof statsData === "object") {
        console.log("Processed stats data:", statsData);
        setStats(statsData);
      } else {
        console.warn("Invalid stats data received:", statsData);
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);

      // Handle offline scenarios gracefully
      if (!offlineAPI.isOnline()) {
        if (stats) {
          toast("Using cached statistics", {
            icon: "📊",
            duration: 2000,
          });
        } else {
          toast("Statistics unavailable offline", {
            icon: "📊",
            duration: 3000,
          });
        }
      } else {
        // Check for specific 503 error
        if (error.response?.status === 503) {
          toast.error("Task statistics service temporarily unavailable");
        } else {
          toast.error("Failed to fetch task statistics");
        }
      }
    }
  }, [stats]);

  const setFilters = useCallback((newFilters: QueryTaskDto) => {
    setFiltersState((prev: QueryTaskDto) => ({ ...prev, ...newFilters }));
  }, []);

  const clearCurrentTask = useCallback(() => {
    setCurrentTask(null);
  }, []);

  const syncPendingChanges = useCallback(async () => {
    try {
      console.log("Manually syncing pending changes...");
      await offlineAPI.sync();
      toast.success("Sync completed successfully!");
    } catch (error) {
      console.error("Manual sync failed:", error);
      toast.error("Sync failed - will retry automatically");
    }
  }, []);

  const value: OfflineTaskContextType = useMemo(
    () => ({
      tasks,
      stats,
      currentTask,
      isLoading,
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
      isOnline,
      syncPendingChanges,
    }),
    [
      tasks,
      stats,
      currentTask,
      isLoading,
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
      isOnline,
      syncPendingChanges,
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
