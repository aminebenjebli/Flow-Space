/**
 * Offline-Aware Project Context
 *
 * Wraps project management with offline capabilities.
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
  Project,
  CreateProjectData,
  UpdateProjectSettingsData,
} from "@/types/team";
import { offlineProjectsApi } from "@/lib/offline/api";
import { useOffline } from "@/hooks/useOffline";
import toast from "react-hot-toast";

interface ProjectListResponse {
  projects: Project[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

interface OfflineProjectContextType {
  // State
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  isOffline: boolean;
  isSyncing: boolean;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProjectById: (id: string) => Promise<Project | null>;
  createProject: (data: CreateProjectData) => Promise<Project | null>;
  updateProject: (
    id: string,
    data: Partial<Project>
  ) => Promise<Project | null>;
  updateProjectSettings: (
    id: string,
    data: UpdateProjectSettingsData
  ) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  setCurrentProject: (project: Project | null) => void;
  clearCurrentProject: () => void;
}

const OfflineProjectContext = createContext<
  OfflineProjectContextType | undefined
>(undefined);

export function OfflineProjectProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { isOnline, isSyncing } = useOffline();
  const wasSyncingRef = useRef(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("[OfflineProjectContext] Fetching projects...");
      const response = await offlineProjectsApi.getAll();

      let data: Project[] = [];
      if (response.data) {
        data = Array.isArray(response.data) ? response.data : [response.data];
      } else if (Array.isArray(response)) {
        data = response;
      }

      const validProjects = data.filter((project: Project) => project?.id);
      if (validProjects.length !== data.length) {
        console.warn("[OfflineProjectContext] Filtered out invalid projects");
      }

      setProjects(validProjects);
    } catch (error: any) {
      console.error("[OfflineProjectContext] Error fetching projects:", error);
      const errorMessage = error.message || "Failed to fetch projects";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProjectById = useCallback(
    async (id: string): Promise<Project | null> => {
      try {
        const response = await offlineProjectsApi.getById(id);
        const project: Project = response.data;
        setCurrentProject(project);
        return project;
      } catch (error: any) {
        console.error("[OfflineProjectContext] Error fetching project:", error);
        toast.error("Failed to fetch project");
        return null;
      }
    },
    []
  );

  const createProject = useCallback(
    async (data: CreateProjectData): Promise<Project | null> => {
      setIsLoading(true);
      try {
        console.log("[OfflineProjectContext] Creating project:", data);
        const response = await offlineProjectsApi.create(data);

        // Handle offline queued response vs actual project response
        const newProject = response.data;

        // Check if this is a queued response (from service worker)
        if ((response as any).queued || (response as any).success === false) {
          console.log(
            "[OfflineProjectContext] Project queued for sync:",
            response
          );
          toast.success("Project created offline. Will sync when online.");
          // Don't add to projects list yet - wait for sync
          return null;
        }

        // Validate actual project response
        if (!newProject?.id) {
          console.error(
            "[OfflineProjectContext] Invalid project response:",
            newProject
          );
          throw new Error("Invalid project returned from server");
        }

        setProjects((prev) => [newProject, ...prev]);

        const message = isOnline
          ? "Project created successfully!"
          : "Project created offline. Will sync when online.";
        toast.success(message);

        return newProject;
      } catch (error: any) {
        console.error("[OfflineProjectContext] Error creating project:", error);
        const errorMessage = error.message || "Failed to create project";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline]
  );

  const updateProject = useCallback(
    async (id: string, data: Partial<Project>): Promise<Project | null> => {
      setIsLoading(true);
      try {
        console.log("[OfflineProjectContext] Updating project:", id, data);
        const response = await offlineProjectsApi.update(id, data);

        // Handle offline queued response vs actual project response
        const updatedProject = response.data;

        // Check if this is a queued response (from service worker)
        if ((response as any).queued || (response as any).success === false) {
          console.log(
            "[OfflineProjectContext] Update queued for sync:",
            response
          );

          // Optimistically update the project in the UI
          setProjects((prev) =>
            prev.map((project) =>
              project.id === id ? { ...project, ...data } : project
            )
          );

          if (currentProject?.id === id) {
            setCurrentProject({ ...currentProject, ...data });
          }

          toast.success("Project updated offline. Will sync when online.");
          return currentProject;
        }

        // Validate actual project response
        if (!updatedProject?.id) {
          console.error(
            "[OfflineProjectContext] Invalid update response:",
            updatedProject
          );
          throw new Error("Invalid project returned from server");
        }

        setProjects((prev) =>
          prev.map((project) => (project.id === id ? updatedProject : project))
        );

        if (currentProject?.id === id) {
          setCurrentProject(updatedProject);
        }

        const message = isOnline
          ? "Project updated successfully!"
          : "Project updated offline. Will sync when online.";
        toast.success(message);

        return updatedProject;
      } catch (error: any) {
        console.error("[OfflineProjectContext] Error updating project:", error);
        const errorMessage = error.message || "Failed to update project";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentProject, isOnline]
  );

  const updateProjectSettings = useCallback(
    async (
      id: string,
      data: UpdateProjectSettingsData
    ): Promise<Project | null> => {
      return updateProject(id, data);
    },
    [updateProject]
  );

  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const response = await offlineProjectsApi.delete(id);

        // Check if this is a queued response (from service worker)
        if ((response as any)?.queued || (response as any)?.success === false) {
          console.log(
            "[OfflineProjectContext] Delete queued for sync:",
            response
          );
        }

        // Optimistically remove from UI regardless
        setProjects((prev) => prev.filter((project) => project.id !== id));
        if (currentProject?.id === id) {
          setCurrentProject(null);
        }

        const message = isOnline
          ? "Project deleted successfully!"
          : "Project deleted offline. Will sync when online.";
        toast.success(message);

        return true;
      } catch (error: any) {
        console.error("[OfflineProjectContext] Error deleting project:", error);
        toast.error("Failed to delete project");
        return false;
      }
    },
    [currentProject, isOnline]
  );

  const clearCurrentProject = useCallback(() => {
    setCurrentProject(null);
  }, []);

  // Refresh data when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      console.log("[OfflineProjectContext] Back online, refreshing data...");
      fetchProjects();
    }
  }, [isOnline, isSyncing, fetchProjects]);

  // Refresh when sync completes
  useEffect(() => {
    if (isSyncing) {
      wasSyncingRef.current = true;
    } else if (wasSyncingRef.current && !isSyncing && isOnline) {
      // Sync just completed
      console.log(
        "[OfflineProjectContext] Sync completed, refreshing projects..."
      );
      wasSyncingRef.current = false;
      fetchProjects();
    }
  }, [isSyncing, isOnline, fetchProjects]);

  const value: OfflineProjectContextType = useMemo(
    () => ({
      projects,
      currentProject,
      isLoading,
      isOffline: !isOnline,
      isSyncing,
      fetchProjects,
      fetchProjectById,
      createProject,
      updateProject,
      updateProjectSettings,
      deleteProject,
      setCurrentProject,
      clearCurrentProject,
    }),
    [
      projects,
      currentProject,
      isLoading,
      isOnline,
      isSyncing,
      fetchProjects,
      fetchProjectById,
      createProject,
      updateProject,
      updateProjectSettings,
      deleteProject,
      clearCurrentProject,
    ]
  );

  return (
    <OfflineProjectContext.Provider value={value}>
      {children}
    </OfflineProjectContext.Provider>
  );
}

export function useOfflineProject() {
  const context = useContext(OfflineProjectContext);
  if (context === undefined) {
    throw new Error(
      "useOfflineProject must be used within an OfflineProjectProvider"
    );
  }
  return context;
}
