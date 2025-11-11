"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { offlineAPI } from "@/lib/offline-api";
import { api } from "@/lib/api/axios";
import {
  Project,
  CreateProjectData,
  UpdateProjectSettingsData,
} from "@/types/team";
import { toast } from "react-hot-toast";

interface ProjectContextType {
  // State
  myProjects: Project[];
  publicProjects: Project[];
  currentProject: Project | null;
  isLoading: boolean;

  // Actions
  fetchMyProjects: () => Promise<void>;
  fetchPublicProjects: () => Promise<void>;
  fetchProjectById: (id: string) => Promise<Project | null>;
  createProject: (data: CreateProjectData) => Promise<Project | null>;
  updateProject: (
    id: string,
    data: UpdateProjectSettingsData
  ) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  setCurrentProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMyProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching my projects...");

      // Use offline-aware API for fetching personal projects
      const personalResponse = await offlineAPI.request(
        "GET",
        "/projects/personal",
        undefined,
        {
          cacheStrategy: "network-first",
        }
      );

      // Use offline-aware API for fetching teams
      const teamsResponse = await offlineAPI.request(
        "GET",
        "/teams/mine",
        undefined,
        {
          cacheStrategy: "network-first",
        }
      );

      const allProjects: Project[] = [];

      // Add personal projects
      // offlineAPI.request already returns the data (response.data)
      // So we don't need to access .data again
      if (Array.isArray(personalResponse)) {
        allProjects.push(...personalResponse);
      } else if (personalResponse && typeof personalResponse === "object") {
        // Handle case where it might be wrapped in another structure
        const responseObj = personalResponse as Record<string, unknown>;
        const projects = responseObj.projects || responseObj.data || [];
        if (Array.isArray(projects)) {
          allProjects.push(...projects);
        }
      }

      // Add team projects
      // teamsResponse is already the data from response.data
      let teams: any[] = [];
      if (Array.isArray(teamsResponse)) {
        teams = teamsResponse;
      } else if (teamsResponse && typeof teamsResponse === "object") {
        // Handle case where teams might be wrapped
        const teamsObj = teamsResponse as Record<string, unknown>;
        const teamsData = teamsObj.teams || teamsObj.data || teamsObj;
        teams = Array.isArray(teamsData) ? teamsData : [];
      }

      for (const team of teams) {
        // Skip invalid team objects
        if (!team || !team.id) {
          console.warn("Skipping invalid team:", team);
          continue;
        }
        try {
          const teamProjectsResponse = await offlineAPI.request(
            "GET",
            `/projects/by-team/${team.id}`,
            undefined,
            {
              cacheStrategy: "network-first",
            }
          );

          // teamProjectsResponse is already the data from response.data
          const teamProjects = Array.isArray(teamProjectsResponse)
            ? teamProjectsResponse
            : [];
          const projectsWithTeam = teamProjects.map((project: any) => ({
            ...project,
            team: {
              id: team.id,
              name: team.name,
            },
          }));
          allProjects.push(...projectsWithTeam);
        } catch (error) {
          console.warn(`Failed to fetch projects for team ${team.id}:`, error);
        }
      }

      console.log("Processed my projects data:", allProjects);
      setMyProjects(allProjects);
    } catch (error: any) {
      console.error("Error fetching my projects:", error);

      // Check if we're offline
      if (!offlineAPI.isOnline()) {
        if (myProjects.length > 0) {
          console.log("Offline mode: Using existing projects");
          toast("Working offline - showing cached projects", {
            icon: "📁",
            duration: 3000,
          });
          return;
        } else {
          // No cached projects available
          toast("No cached projects available offline", {
            icon: "📁",
            duration: 3000,
          });
          return;
        }
      }

      // Check if this is a server error (5xx) and we have cached data
      const isServerError = error.response?.status >= 500;
      if (isServerError && myProjects.length > 0) {
        toast("Server unavailable - showing cached projects", {
          icon: "⚠️",
          duration: 3000,
        });
        return;
      }

      // Only show error for real failures
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch projects";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [myProjects.length]);

  const fetchPublicProjects = useCallback(async () => {
    try {
      console.log("Fetching public projects...");

      // Use offline-aware API for fetching public projects
      const response = await offlineAPI.request(
        "GET",
        "/projects/public",
        undefined,
        {
          cacheStrategy: "network-first",
        }
      );
      console.log("Public projects response:", response);

      // response is already the data from response.data
      const projectsData = Array.isArray(response) ? response : [];
      console.log("Processed public projects data:", projectsData);

      setPublicProjects(projectsData);
    } catch (error: any) {
      console.error("Error fetching public projects:", error);

      // Check if we're offline
      if (!offlineAPI.isOnline()) {
        if (publicProjects.length > 0) {
          console.log("Offline mode: Using existing public projects");
          toast("Working offline - showing cached public projects", {
            icon: "🌐",
            duration: 2000,
          });
          return;
        } else {
          // No cached public projects available
          toast("No cached public projects available offline", {
            icon: "🌐",
            duration: 2000,
          });
          return;
        }
      }

      // Check if this is a server error (5xx) and we have cached data
      const isServerError = error.response?.status >= 500;
      if (isServerError && publicProjects.length > 0) {
        toast("Server unavailable - showing cached public projects", {
          icon: "⚠️",
          duration: 2000,
        });
        return;
      }

      // For 404 errors (endpoint doesn't exist), just set empty array
      if (error.response?.status === 404) {
        setPublicProjects([]);
        return;
      }

      // Only show error for real failures
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch public projects";
      toast.error(errorMessage);
    }
  }, [publicProjects.length]);

  const fetchProjectById = useCallback(
    async (id: string): Promise<Project | null> => {
      try {
        // Try to find in existing projects first
        const existingProject =
          myProjects.find((p) => p.id === id) ||
          publicProjects.find((p) => p.id === id);
        if (existingProject) {
          setCurrentProject(existingProject);
          return existingProject;
        }

        // Use offline-aware API for fetching individual project
        const response = await offlineAPI.request(
          "GET",
          `/projects/${id}`,
          undefined,
          {
            cacheStrategy: "network-first",
          }
        );
        // response is already the data from response.data
        const project: Project = response;
        setCurrentProject(project);

        // Update projects arrays if not already present
        setMyProjects((prev) => {
          const exists = prev.find((p) => p.id === id);
          return exists ? prev : [...prev, project];
        });

        return project;
      } catch (error: any) {
        console.error("Error fetching project:", error);

        // Check if we're offline and can find the project in existing projects
        if (!offlineAPI.isOnline()) {
          const existingProject =
            myProjects.find((p) => p.id === id) ||
            publicProjects.find((p) => p.id === id);
          if (existingProject) {
            console.log("Offline mode: Using cached project");
            setCurrentProject(existingProject);
            toast("Working offline - showing cached project", {
              icon: "📁",
              duration: 2000,
            });
            return existingProject;
          }
        }

        toast.error("Failed to fetch project");
        return null;
      }
    },
    [myProjects, publicProjects]
  );

  const createProject = useCallback(
    async (data: CreateProjectData): Promise<Project | null> => {
      setIsLoading(true);
      try {
        console.log("Creating project with data:", data);

        // Check if we're online or offline
        const isOnline = offlineAPI.isOnline();
        let newProject: Project;

        if (!isOnline) {
          // OFFLINE MODE: Queue for sync
          console.log("📴 Offline mode: Queuing project creation");

          const response = await offlineAPI.request("POST", "/projects", data);
          newProject = response;
        } else {
          // ONLINE MODE: Make direct API call
          console.log("🌐 Online mode: Making direct API call");

          const response = await api.post("/projects", data);
          console.log("Create project response:", response);

          // api.post returns ApiResponse<T> which has a .data property
          newProject = response.data;
        }

        console.log("Processed new project:", newProject);

        if (!newProject?.id) {
          console.error("Invalid new project data:", newProject);
          toast.error("Invalid response from server");
          return null;
        }

        // Update the appropriate projects list based on visibility
        if (newProject.visibility === "PUBLIC") {
          setPublicProjects((prev) => [newProject, ...prev]);
        } else {
          setMyProjects((prev) => [newProject, ...prev]);
        }

        toast.success("Project created successfully!");
        return newProject;
      } catch (error: any) {
        console.error("Error creating project:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to create project";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateProject = useCallback(
    async (
      id: string,
      data: UpdateProjectSettingsData
    ): Promise<Project | null> => {
      setIsLoading(true);
      try {
        console.log("Updating project:", id, "with data:", data);
        console.log(
          "Current myProjects:",
          myProjects.map((p) => ({
            id: p.id,
            name: p.name,
            visibility: p.visibility,
          }))
        );
        console.log(
          "Current publicProjects:",
          publicProjects.map((p) => ({
            id: p.id,
            name: p.name,
            visibility: p.visibility,
          }))
        );

        // Check if we're online or offline
        const isOnline = offlineAPI.isOnline();
        console.log("Network status:", isOnline ? "🌐 ONLINE" : "📴 OFFLINE");

        // Find the project in local state (for offline mode and fallback)
        const existingProject =
          myProjects.find((p) => p.id === id) ||
          publicProjects.find((p) => p.id === id);

        if (!isOnline) {
          // OFFLINE MODE: Update optimistically and queue for sync
          console.log("📴 Offline mode: Updating project optimistically");

          if (!existingProject) {
            toast.error("Project not found in local cache");
            return null;
          }

          const updatedProject: Project = {
            ...existingProject,
            ...data,
          };

          // Remove from both lists first
          setMyProjects((prev) => prev.filter((p) => p.id !== id));
          setPublicProjects((prev) => prev.filter((p) => p.id !== id));

          // Add to the correct list based on new visibility
          if (updatedProject.visibility === "PUBLIC") {
            setPublicProjects((prev) => [updatedProject, ...prev]);
          } else {
            setMyProjects((prev) => [updatedProject, ...prev]);
          }

          if (currentProject?.id === id) {
            setCurrentProject(updatedProject);
          }

          // Queue the request for sync
          await offlineAPI.request("PATCH", `/projects/${id}/settings`, data);

          toast.success("Project updated (will sync when online)", {
            icon: "📥",
            duration: 3000,
          });

          return updatedProject;
        }

        // ONLINE MODE: Make direct API call
        console.log(
          "🌐 Online mode: Making direct API call to /projects/" +
            id +
            "/settings"
        );
        console.log("Request payload:", data);

        const response = await api.patch(`/projects/${id}/settings`, data);
        console.log("✅ Update project response:", response);
        console.log("Response type:", typeof response);
        console.log(
          "Response keys:",
          response ? Object.keys(response) : "null"
        );
        console.log("Response.data:", response?.data);

        // api.patch returns ApiResponse<T> with structure { data: T, message: string, success: boolean }
        // The actual project data is in response.data
        let updatedProject: Project | null = null;

        if (response && typeof response === "object" && "data" in response) {
          // Standard ApiResponse format
          updatedProject = response.data as Project;
          console.log("Using response.data:", updatedProject);
        } else if (
          response &&
          typeof response === "object" &&
          "id" in response
        ) {
          // Direct project object (fallback)
          updatedProject = response as any as Project;
          console.log("Using direct response:", updatedProject);
        } else {
          console.error("❌ Unexpected response structure:", response);
          console.log(
            "Response indicates success but no project data returned"
          );

          // If response indicates success but no project data, refetch the project
          const anyResponse = response as any;
          if (anyResponse?.success) {
            console.log(
              "Success response without project data, refetching project..."
            );

            // Fetch the updated project from the server
            try {
              const refetchResponse = await api.get(`/projects/${id}`);
              console.log("Refetch response:", refetchResponse);

              if (refetchResponse?.data) {
                updatedProject = refetchResponse.data as Project;
                console.log("Successfully refetched project:", updatedProject);
              }
            } catch (refetchError) {
              console.error("Failed to refetch project:", refetchError);
            }
          }
        }

        if (!updatedProject?.id) {
          console.error("❌ Could not get updated project data");

          // Even if we don't have the updated project, the update might have succeeded
          // So let's optimistically update based on what we sent
          if (existingProject) {
            updatedProject = {
              ...existingProject,
              ...data,
            };
            console.log("Using optimistic update:", updatedProject);
          } else {
            toast.error("Invalid response from server");
            return null;
          }
        }

        // Only update local state after successful API response
        // Remove from both lists first
        setMyProjects((prev) => prev.filter((p) => p.id !== id));
        setPublicProjects((prev) => prev.filter((p) => p.id !== id));

        // Determine the visibility to use (prefer server response, fallback to data or existing)
        const finalVisibility =
          updatedProject.visibility ||
          data.visibility ||
          existingProject?.visibility ||
          "PRIVATE";

        console.log("Final visibility:", finalVisibility);

        // Add to the correct list based on visibility
        if (finalVisibility === "PUBLIC") {
          setPublicProjects((prev) => [updatedProject, ...prev]);
        } else {
          setMyProjects((prev) => [updatedProject, ...prev]);
        }

        if (currentProject?.id === id) {
          setCurrentProject(updatedProject);
        }

        toast.success("Project updated successfully!");
        return updatedProject;
      } catch (error: any) {
        console.error("❌ Error updating project:", error);
        console.error("Error response:", error.response);
        console.error("Error message:", error.message);

        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to update project";
        toast.error(errorMessage);

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentProject, myProjects, publicProjects]
  );

  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        // Check if we're online or offline
        const isOnline = offlineAPI.isOnline();

        if (!isOnline) {
          // OFFLINE MODE: Queue for sync
          console.log("📴 Offline mode: Queuing project deletion");
          await offlineAPI.request("DELETE", `/projects/${id}`);
        } else {
          // ONLINE MODE: Make direct API call
          console.log("🌐 Online mode: Making direct API call");
          await api.delete(`/projects/${id}`);
        }

        // Remove from both lists
        setMyProjects((prev) => prev.filter((p) => p.id !== id));
        setPublicProjects((prev) => prev.filter((p) => p.id !== id));

        if (currentProject?.id === id) {
          setCurrentProject(null);
        }

        toast.success("Project deleted successfully!");
        return true;
      } catch (error: any) {
        console.error("Error deleting project:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to delete project";
        toast.error(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [currentProject]
  );

  // Initialize projects on mount
  useEffect(() => {
    fetchMyProjects();
    fetchPublicProjects();
  }, []);

  const value: ProjectContextType = useMemo(
    () => ({
      myProjects,
      publicProjects,
      currentProject,
      isLoading,
      fetchMyProjects,
      fetchPublicProjects,
      fetchProjectById,
      createProject,
      updateProject,
      deleteProject,
      setCurrentProject,
    }),
    [
      myProjects,
      publicProjects,
      currentProject,
      isLoading,
      fetchMyProjects,
      fetchPublicProjects,
      fetchProjectById,
      createProject,
      updateProject,
      deleteProject,
    ]
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
