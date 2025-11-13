/**
 * Example: Integrating Offline Mode with Existing Task Context
 *
 * This file shows how to update your existing TaskContext to use offline capabilities.
 * Copy the relevant parts to your src/contexts/task-context.tsx
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { Task, CreateTaskDto, UpdateTaskDto, QueryTaskDto } from "@/types";
import { toast } from "sonner";

// ✅ Import offline API instead of regular API
import { offlineTasksApi, isOnline } from "@/lib/offline/api";

export function TaskProvider({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId?: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Use offlineTasksApi instead of api.tasks
  const createTask = useCallback(
    async (data: CreateTaskDto): Promise<Task | null> => {
      setIsLoading(true);
      try {
        const taskData = {
          ...data,
          ...(projectId && { projectId }),
        };

        // ✅ This now works offline!
        const response = await offlineTasksApi.create(taskData);
        const newTask = response.data;

        setTasks((prev) => [newTask, ...prev]);

        // ✅ Show different message based on online status
        const message = isOnline()
          ? "Task created successfully!"
          : "Task created offline. Will sync when online.";
        toast.success(message);

        return newTask;
      } catch (error: any) {
        console.error("Error creating task:", error);
        toast.error(error.message || "Failed to create task");
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
        // ✅ Works offline with optimistic updates
        const response = await offlineTasksApi.update(id, data);
        const updatedTask = response.data;

        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updatedTask : task))
        );

        const message = isOnline()
          ? "Task updated successfully!"
          : "Task updated offline. Will sync when online.";
        toast.success(message);

        return updatedTask;
      } catch (error: any) {
        console.error("Error updating task:", error);
        toast.error("Failed to update task");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      // ✅ Queued when offline
      await offlineTasksApi.delete(id);

      setTasks((prev) => prev.filter((task) => task.id !== id));

      const message = isOnline()
        ? "Task deleted successfully!"
        : "Task deleted offline. Will sync when online.";
      toast.success(message);

      return true;
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
      return false;
    }
  }, []);

  const fetchTasks = useCallback(async (params?: QueryTaskDto) => {
    setIsLoading(true);
    try {
      // ✅ Returns cached data when offline
      const response = await offlineTasksApi.getAll(params);

      let data;
      if (response.data?.tasks) {
        data = response.data;
      } else if ((response as any).tasks) {
        data = response as any;
      } else {
        data = { tasks: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      }

      const validTasks = (data.tasks || []).filter((task: Task) => task?.id);
      setTasks(validTasks);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ... rest of your context implementation

  return (
    <TaskContext.Provider
      value={{
        tasks,
        isLoading,
        createTask,
        updateTask,
        deleteTask,
        fetchTasks,
        // ... other values
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

/**
 * USAGE IN COMPONENTS:
 *
 * import { useTask } from '@/contexts/task-context';
 * import { useOffline } from '@/hooks/useOffline';
 *
 * function MyComponent() {
 *   const { tasks, createTask } = useTask();
 *   const { isOnline, isSyncing, pendingCount } = useOffline();
 *
 *   return (
 *     <div>
 *       {!isOnline && <p>Working offline</p>}
 *       {isSyncing && <p>Syncing {pendingCount} changes...</p>}
 *       <button onClick={() => createTask({ title: 'New Task' })}>
 *         Create Task
 *       </button>
 *     </div>
 *   );
 * }
 */
