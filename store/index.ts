import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import {
  User,
  Task,
  Project,
  Notification,
  TaskStatus,
  BulkUpdateStatusDto,
} from "@/types/index";

// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        setUser: (user) =>
          set({
            user,
            isAuthenticated: !!user,
          }),
        setLoading: (loading) => set({ isLoading: loading }),
        logout: () =>
          set({
            user: null,
            isAuthenticated: false,
          }),
      }),
      {
        name: "auth-storage",
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "auth-store" }
  )
);

// Tasks Store
interface TasksState {
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  filters: {
    status: Task["status"][];
    priority: Task["priority"][];
    assigneeId: string[];
    search: string;
  };
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTaskInStore: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setSelectedTask: (task: Task | null) => void;
  setLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<TasksState["filters"]>) => void;
  clearFilters: () => void;
  // updateBulkStatusInStore: (updatedTasks: BulkUpdateStatus[]) => void;
}

export const useTasksStore = create<TasksState>()(
  devtools(
    (set, get) => ({
      tasks: [],
      selectedTask: null,
      isLoading: false,
      filters: {
        status: [],
        priority: [],
        assigneeId: [],
        search: "",
      },
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) =>
        set((state) => ({
          tasks: [...state.tasks, task],
        })),
      updateTaskInStore: (id: string, updates: Partial<Task>) =>
        set((state) => {
          console.log("Updating task in store:", id, updates); // Ajoutez ce log pour voir les changements
          return {
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...updates } : task
            ),
          };
        }),
      deleteTask: (id) =>
        set((state) => {
          // Log before task deletion
          console.log("Deleting task with ID:", id);
          console.log("Current tasks before deletion:", state.tasks);

          // Perform the deletion
          const updatedTasks = state.tasks.filter((task) => task.id !== id);

          // Log after task deletion
          console.log("Tasks after deletion:", updatedTasks);

          return {
            tasks: updatedTasks,
            selectedTask:
              state.selectedTask?.id === id ? null : state.selectedTask,
          };
        }),
      setSelectedTask: (task) => set({ selectedTask: task }),
      setLoading: (loading) => set({ isLoading: loading }),
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      clearFilters: () =>
        set({
          filters: {
            status: [],
            priority: [],
            assigneeId: [],
            search: "",
          },
        }),

      // index.ts (Store)
    }),
    { name: "tasks-store" }
  )
);

// Projects Store
interface ProjectsState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setSelectedProject: (project: Project | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useProjectsStore = create<ProjectsState>()(
  devtools(
    (set) => ({
      projects: [],
      selectedProject: null,
      isLoading: false,
      setProjects: (projects) => set({ projects }),
      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
        })),
      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...updates } : project
          ),
          selectedProject:
            state.selectedProject?.id === id
              ? { ...state.selectedProject, ...updates }
              : state.selectedProject,
        })),
      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          selectedProject:
            state.selectedProject?.id === id ? null : state.selectedProject,
        })),
      setSelectedProject: (project) => set({ selectedProject: project }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    { name: "projects-store" }
  )
);

// Notifications Store
interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      setNotifications: (notifications) =>
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.read).length,
        }),
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.read
            ? state.unreadCount
            : state.unreadCount + 1,
        })),
      markAsRead: (id) =>
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          );
          return {
            notifications,
            unreadCount: notifications.filter((n) => !n.read).length,
          };
        }),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      deleteNotification: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const notifications = state.notifications.filter((n) => n.id !== id);
          return {
            notifications,
            unreadCount:
              notification && !notification.read
                ? state.unreadCount - 1
                : state.unreadCount,
          };
        }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    { name: "notifications-store" }
  )
);

// UI Store
interface UIState {
  sidebarOpen: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: "system",
        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
      }),
      {
        name: "ui-storage",
        partialize: (state) => ({ theme: state.theme }),
      }
    ),
    { name: "ui-store" }
  )
);
