"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { api } from "@/lib/api/axios";
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

interface TaskContextType {
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
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({
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
        console.log("Fetching tasks with params:", queryParams);

        const response = await api.tasks.getAll(queryParams);
        console.log("Raw API response:", response);

        // The response might be wrapped in our ApiResponse structure
        // or it might be the direct task list response
        let data: TaskListResponse;

        if (response.data?.tasks) {
          // If the response is wrapped in ApiResponse structure
          data = response.data as TaskListResponse;
        } else if ((response as any).tasks) {
          // If the response is the direct TaskListResponse
          data = response as unknown as TaskListResponse;
        } else {
          // If response structure is different, log it and handle gracefully
          console.error("Unexpected response structure:", response);
          toast.error("Unexpected response format from server");
          return;
        }

        console.log("Processed task data:", data);

        // Filter out any invalid tasks before setting state
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

        // Only show toast for non-timeout errors
        if (!error.message?.includes("timeout")) {
          console.error("Error response:", error.response);
          console.error("Error status:", error.response?.status);
          console.error("Error data:", error.response?.data);

          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Failed to fetch tasks";
          toast.error(errorMessage);
        } else {
          console.warn("Tasks fetch timeout - retrying in background");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [filtersState]
  );

  const fetchTaskById = useCallback(
    async (id: string): Promise<Task | null> => {
      try {
        const response = await api.tasks.getById(id);
        const task: Task = response.data;
        setCurrentTask(task);
        return task;
      } catch (error: any) {
        console.error("Error fetching task:", error);
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
        console.log("Creating task with data:", taskData);
        const response = await api.tasks.create(taskData);
        console.log("Create response:", response);

        // Check if this is a queued response from service worker (offline mode)
        if ((response as any).queued || (response as any).success === false) {
          console.log("Task queued for sync (offline mode):", response);
          toast.success("Task created offline. Will sync when online.");
          return null; // Don't add invalid data to state
        }

        let newTask: Task;
        if (response.data) {
          newTask = response.data as Task;
        } else {
          newTask = response as unknown as Task;
        }

        console.log("Processed new task:", newTask);

        if (!newTask?.id) {
          console.error("Invalid new task data:", newTask);
          toast.error("Invalid response from server");
          return null;
        }

        setTasks((prev) => [newTask, ...prev]);
        toast.success("Task created successfully!");
        return newTask;
      } catch (error: any) {
        console.error("Error creating task:", error);
        console.error("Create error response:", error.response);
        const errorMessage =
          error.response?.data?.message || "Failed to create task";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateTask = useCallback(
    async (id: string, data: UpdateTaskDto): Promise<Task | null> => {
      setIsLoading(true);
      try {
        console.log("Updating task:", id, "with data:", data);
        const response = await api.tasks.update(id, data);
        console.log("Update response:", response);

        // Check if this is a queued response from service worker (offline mode)
        if ((response as any).queued || (response as any).success === false) {
          console.log("Update queued for sync (offline mode):", response);

          // Optimistically update in UI
          setTasks((prev) =>
            prev.map((task) => {
              if (!task?.id) return task;
              return task.id === id ? { ...task, ...data } : task;
            })
          );

          if (currentTask?.id === id) {
            setCurrentTask({ ...currentTask, ...data });
          }

          toast.success("Task updated offline. Will sync when online.");
          return currentTask;
        }

        let updatedTask: Task;
        if (response.data) {
          updatedTask = response.data as Task;
        } else {
          updatedTask = response as unknown as Task;
        }

        console.log("Processed updated task:", updatedTask);

        if (!updatedTask?.id) {
          console.error("Invalid updated task data:", updatedTask);
          toast.error("Invalid response from server");
          return null;
        }

        setTasks((prev) =>
          prev.map((task) => {
            if (!task?.id) {
              console.warn("Found invalid task in tasks array:", task);
              return task; // Keep invalid tasks as is for now
            }
            return task.id === id ? updatedTask : task;
          })
        );

        if (currentTask?.id === id) {
          setCurrentTask(updatedTask);
        }

        toast.success("Task updated successfully!");
        return updatedTask;
      } catch (error: any) {
        console.error("Error updating task:", error);
        console.error("Update error response:", error.response);
        const errorMessage =
          error.response?.data?.message || "Failed to update task";
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
        const response = await api.tasks.delete(id);

        // Check if this is a queued response from service worker (offline mode)
        if ((response as any)?.queued || (response as any)?.success === false) {
          console.log("Delete queued for sync (offline mode):", response);
        }

        // Optimistically remove from UI
        setTasks((prev) => prev.filter((task) => task.id !== id));

        if (currentTask?.id === id) {
          setCurrentTask(null);
        }

        const message = (response as any)?.queued
          ? "Task deleted offline. Will sync when online."
          : "Task deleted successfully!";
        toast.success(message);
        return true;
      } catch (error: any) {
        console.error("Error deleting task:", error);
        const errorMessage =
          error.response?.data?.message || "Failed to delete task";
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
        console.log("Bulk updating tasks:", data);
        const response = await api.tasks.bulkUpdateStatus(data);
        console.log("Bulk update response:", response);
        console.log("Response data:", response.data);

        // For bulk update, consider it successful if we get any response
        // Some APIs return empty response for successful updates
        const count = response.data?.count || data.taskIds.length;

        // Update tasks in state
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

        toast.success(
          `${count} task${count === 1 ? "" : "s"} updated successfully!`
        );
        return true;
      } catch (error: any) {
        console.error("Error bulk updating tasks:", error);
        console.error("Error response:", error.response);

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
      console.log("Fetching task stats...");
      const response = await api.tasks.getStats();
      console.log("Stats response:", response);

      let statsData: TaskStatsResponse;
      if (response.data) {
        statsData = response.data as TaskStatsResponse;
      } else {
        statsData = response as unknown as TaskStatsResponse;
      }

      console.log("Processed stats data:", statsData);
      setStats(statsData);
    } catch (error: any) {
      // Only show toast for non-timeout errors
      if (!error.message?.includes("timeout")) {
        console.error("Error fetching stats:", error);
        console.error("Stats error response:", error.response);
        toast.error("Failed to fetch task statistics");
      } else {
        console.warn(
          "Stats fetch timeout - this is expected if backend is slow"
        );
      }
    }
  }, []);

  const setFilters = useCallback((newFilters: QueryTaskDto) => {
    setFiltersState((prev: QueryTaskDto) => ({ ...prev, ...newFilters }));
  }, []);

  const clearCurrentTask = useCallback(() => {
    setCurrentTask(null);
  }, []);

  const value: TaskContextType = useMemo(
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
