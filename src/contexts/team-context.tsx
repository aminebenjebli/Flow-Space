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
import { Team, Project, CreateProjectData } from "@/types/team";
import { toast } from "react-hot-toast";

interface CreateTeamData {
  name: string;
  description?: string;
}

interface UpdateTeamData {
  name: string;
  description?: string | null;
}

interface TeamContextType {
  // State
  teams: Team[];
  currentTeam: Team | null;
  teamProjects: Record<string, Project[]>;
  isLoading: boolean;

  // Actions
  fetchTeams: () => Promise<void>;
  fetchTeamById: (id: string) => Promise<Team | null>;
  fetchTeamProjects: (teamId: string) => Promise<Project[]>;
  createTeam: (data: CreateTeamData) => Promise<Team | null>;
  updateTeam: (teamId: string, data: UpdateTeamData) => Promise<Team | null>;
  createProject: (data: CreateProjectData) => Promise<Project | null>;
  setCurrentTeam: (team: Team | null) => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamProjects, setTeamProjects] = useState<Record<string, Project[]>>(
    {}
  );
  const [isLoading, setIsLoading] = useState(false);

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching teams...");

      // Use offline-aware API for fetching teams
      const response = await offlineAPI.request(
        "GET",
        "/teams/mine",
        undefined,
        {
          cacheStrategy: "network-first",
        }
      );
      console.log("Teams response:", response);

      const teamsData = Array.isArray(response)
        ? response
        : response.data || [];
      console.log("Processed teams data:", teamsData);

      setTeams(teamsData);
    } catch (error: any) {
      console.error("Error fetching teams:", error);

      // Check if we're offline
      if (!offlineAPI.isOnline()) {
        if (teams.length > 0) {
          console.log("Offline mode: Using existing teams");
          toast("Working offline - showing cached teams", {
            icon: "👥",
            duration: 3000,
          });
          return;
        } else {
          // No cached teams available
          toast("No cached teams available offline", {
            icon: "👥",
            duration: 3000,
          });
          return;
        }
      }

      // Check if this is a server error (5xx) and we have cached data
      const isServerError = error.response?.status >= 500;
      if (isServerError && teams.length > 0) {
        toast("Server unavailable - showing cached teams", {
          icon: "⚠️",
          duration: 3000,
        });
        return;
      }

      // Only show error for real failures
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch teams";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [teams.length]);

  const fetchTeamById = useCallback(
    async (id: string): Promise<Team | null> => {
      try {
        // Try to find in existing teams first
        const existingTeam = teams.find((t) => t.id === id);
        if (existingTeam) {
          setCurrentTeam(existingTeam);
          return existingTeam;
        }

        // Use offline-aware API for fetching individual team
        const response = await offlineAPI.request(
          "GET",
          `/teams/${id}`,
          undefined,
          {
            cacheStrategy: "network-first",
          }
        );
        const team: Team = response.data || response;
        setCurrentTeam(team);

        // Update teams array if not already present
        setTeams((prev) => {
          const exists = prev.find((t) => t.id === id);
          return exists ? prev : [...prev, team];
        });

        return team;
      } catch (error: any) {
        console.error("Error fetching team:", error);

        // Check if we're offline and can find the team in existing teams
        if (!offlineAPI.isOnline()) {
          const existingTeam = teams.find((t) => t.id === id);
          if (existingTeam) {
            console.log("Offline mode: Using cached team");
            setCurrentTeam(existingTeam);
            toast("Working offline - showing cached team", {
              icon: "👥",
              duration: 2000,
            });
            return existingTeam;
          }
        }

        toast.error("Failed to fetch team");
        return null;
      }
    },
    [teams]
  );

  const fetchTeamProjects = useCallback(
    async (teamId: string): Promise<Project[]> => {
      try {
        console.log("Fetching projects for team:", teamId);

        // Use offline-aware API for fetching team projects
        const response = await offlineAPI.request(
          "GET",
          `/projects/by-team/${teamId}`,
          undefined,
          {
            cacheStrategy: "network-first",
          }
        );
        console.log("Team projects response:", response);

        const projectsData = Array.isArray(response)
          ? response
          : response.data || [];
        console.log("Processed team projects data:", projectsData);

        setTeamProjects((prev) => ({
          ...prev,
          [teamId]: projectsData,
        }));

        return projectsData;
      } catch (error: any) {
        console.error("Error fetching team projects:", error);

        // Check if we're offline
        if (!offlineAPI.isOnline()) {
          if (teamProjects[teamId]) {
            console.log("Offline mode: Using cached team projects");
            toast("Working offline - showing cached projects", {
              icon: "📁",
              duration: 2000,
            });
            return teamProjects[teamId];
          } else {
            // No cached projects available for this team
            toast("No cached projects available offline", {
              icon: "📁",
              duration: 2000,
            });
            return [];
          }
        }

        // Check if this is a server error (5xx) and we have cached data
        const isServerError = error.response?.status >= 500;
        if (isServerError && teamProjects[teamId]) {
          toast("Server unavailable - showing cached projects", {
            icon: "⚠️",
            duration: 2000,
          });
          return teamProjects[teamId];
        }

        // Only show error for real failures
        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to fetch team projects";
        toast.error(errorMessage);
        return [];
      }
    },
    [teamProjects]
  );

  const createTeam = useCallback(
    async (data: CreateTeamData): Promise<Team | null> => {
      setIsLoading(true);
      try {
        console.log("Creating team with data:", data);

        // Check BOTH offlineAPI and navigator.onLine for accurate offline detection
        const offlineAPIStatus = offlineAPI.isOnline();
        const navigatorStatus = navigator.onLine;

        console.log("=== OFFLINE STATUS CHECK ===");
        console.log("offlineAPI.isOnline():", offlineAPIStatus);
        console.log("navigator.onLine:", navigatorStatus);
        console.log("===========================");

        // Use navigator.onLine as the source of truth (more reliable)
        const isOnline = navigatorStatus;

        console.log("Network status:", isOnline ? "🌐 ONLINE" : "📴 OFFLINE");
        console.log(
          "Will use:",
          isOnline ? "api.post (direct axios)" : "offlineAPI.request (queue)"
        );

        if (!isOnline) {
          // OFFLINE MODE: Create optimistic team and queue for sync
          console.log("📴 Offline mode: Creating optimistic team");

          // Create optimistic team object with temporary ID
          const tempId = `temp-${Date.now()}`;
          const now = new Date();
          const optimisticTeam: Team = {
            id: tempId,
            name: data.name,
            description: data.description || "",
            createdAt: now,
            updatedAt: now,
            members: [],
          };

          console.log("✅ Created optimistic team:", optimisticTeam);

          // Queue the request for background sync using offlineAPI
          try {
            console.log("📥 About to queue request with offlineAPI.request...");
            const queueResult = await offlineAPI.request(
              "POST",
              "/teams",
              data
            );
            console.log(
              "📥 Team creation queued for sync. Result:",
              queueResult
            );
          } catch (queueError) {
            console.error("❌ Failed to queue team creation:", queueError);
            // Still continue with optimistic update
          }

          // Add to state immediately (optimistic update)
          setTeams((prev) => [optimisticTeam, ...prev]);

          toast.success("Team created offline — will sync when you're online", {
            icon: "📥",
            duration: 3000,
          });

          return optimisticTeam;
        }

        // ONLINE MODE: Direct API call (not server action)
        console.log("🌐 Online mode: Making direct API call");
        const response = await api.post("/teams", data);
        console.log("✅ Create team response:", response);

        let newTeam: Team | null = null;

        // api.post returns ApiResponse<T> with structure { data: T, message: string, success: boolean }
        if (response && typeof response === "object" && "data" in response) {
          // Standard ApiResponse format
          newTeam = response.data as Team;
          console.log("Using response.data:", newTeam);
        } else if (
          response &&
          typeof response === "object" &&
          "id" in response
        ) {
          // Direct team object (fallback)
          newTeam = response as any as Team;
          console.log("Using direct response:", newTeam);
        } else {
          console.error("❌ Unexpected response structure:", response);
        }

        console.log("Processed new team:", newTeam);

        if (!newTeam?.id) {
          console.error("❌ Invalid new team data:", newTeam);
          toast.error("Invalid response from server");
          return null;
        }

        setTeams((prev) => [newTeam, ...prev]);
        toast.success("Team created successfully!");
        return newTeam;
      } catch (error: any) {
        console.error("❌ Error creating team:", error);
        console.error("Error response:", error.response);
        console.error("Error message:", error.message);

        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to create team";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updateTeam = useCallback(
    async (teamId: string, data: UpdateTeamData): Promise<Team | null> => {
      setIsLoading(true);
      try {
        console.log("Updating team with data:", { teamId, data });

        // Check BOTH offlineAPI and navigator.onLine for accurate offline detection
        const offlineAPIStatus = offlineAPI.isOnline();
        const navigatorStatus = navigator.onLine;

        console.log("=== OFFLINE STATUS CHECK ===");
        console.log("offlineAPI.isOnline():", offlineAPIStatus);
        console.log("navigator.onLine:", navigatorStatus);
        console.log("===========================");

        // Use navigator.onLine as the source of truth (more reliable)
        const isOnline = navigatorStatus;

        console.log("Network status:", isOnline ? "🌐 ONLINE" : "📴 OFFLINE");
        console.log(
          "Will use:",
          isOnline ? "api.put (direct axios)" : "offlineAPI.request (queue)"
        );

        if (!isOnline) {
          // OFFLINE MODE: Update optimistically and queue for sync
          console.log("📴 Offline mode: Updating team optimistically");

          // Find the team in current state
          const existingTeam = teams.find((t) => t.id === teamId);
          if (!existingTeam) {
            toast.error("Team not found");
            return null;
          }

          // Create optimistically updated team
          const updatedTeam: Team = {
            ...existingTeam,
            name: data.name,
            description: data.description || "",
            updatedAt: new Date(),
          };

          console.log("✅ Created optimistic team update:", updatedTeam);

          // Queue the request for background sync using offlineAPI
          try {
            console.log(
              "📥 About to queue update request with offlineAPI.request..."
            );
            const queueResult = await offlineAPI.request(
              "PUT",
              `/teams/${teamId}/settings`,
              data
            );
            console.log("📥 Team update queued for sync. Result:", queueResult);
          } catch (queueError) {
            console.error("❌ Failed to queue team update:", queueError);
            // Still continue with optimistic update
          }

          // Update state immediately (optimistic update)
          setTeams((prev) =>
            prev.map((t) => (t.id === teamId ? updatedTeam : t))
          );

          // Update currentTeam if it's the one being updated
          if (currentTeam?.id === teamId) {
            setCurrentTeam(updatedTeam);
          }

          toast.success("Team updated offline — will sync when you're online", {
            icon: "📥",
            duration: 3000,
          });

          return updatedTeam;
        }

        // ONLINE MODE: Direct API call
        console.log("🌐 Online mode: Making direct API call");
        const response = await api.put(`/teams/${teamId}/settings`, data);
        console.log("✅ Update team response:", response);

        let updatedTeam: Team | null = null;

        // api.put returns ApiResponse<T> with structure { data: T, message: string, success: boolean }
        if (response && typeof response === "object" && "data" in response) {
          // Standard ApiResponse format
          updatedTeam = response.data as Team;
          console.log("Using response.data:", updatedTeam);
        } else if (
          response &&
          typeof response === "object" &&
          "id" in response
        ) {
          // Direct team object (fallback)
          updatedTeam = response as any as Team;
          console.log("Using direct response:", updatedTeam);
        } else {
          console.error("❌ Unexpected response structure:", response);
        }

        console.log("Processed updated team:", updatedTeam);

        if (!updatedTeam?.id) {
          console.error("❌ Invalid updated team data:", updatedTeam);
          toast.error("Invalid response from server");
          return null;
        }

        // Update teams list
        setTeams((prev) =>
          prev.map((t) => (t.id === teamId ? updatedTeam : t))
        );

        // Update currentTeam if it's the one being updated
        if (currentTeam?.id === teamId) {
          setCurrentTeam(updatedTeam);
        }

        toast.success("Team updated successfully!");
        return updatedTeam;
      } catch (error: any) {
        console.error("❌ Error updating team:", error);
        console.error("Error response:", error.response);
        console.error("Error message:", error.message);

        const errorMessage =
          error.response?.data?.message ||
          error.message ||
          "Failed to update team";
        toast.error(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [teams, currentTeam]
  );

  const createProject = useCallback(
    async (data: CreateProjectData): Promise<Project | null> => {
      setIsLoading(true);
      try {
        console.log("Creating project with data:", data);

        // Check if we're online or offline
        const isOnline = offlineAPI.isOnline();
        console.log("Network status:", isOnline ? "🌐 ONLINE" : "📴 OFFLINE");
        console.log("navigator.onLine:", navigator.onLine);
        console.log(
          "Will use:",
          isOnline ? "api.post (direct axios)" : "offlineAPI.request (queue)"
        );

        if (!isOnline) {
          // OFFLINE MODE: Create optimistic project and queue for sync
          console.log("📴 Offline mode: Creating optimistic project");

          // Create optimistic project object with temporary ID
          const tempId = `temp-${Date.now()}`;
          const now = new Date();
          const optimisticProject: Project = {
            id: tempId,
            name: data.name,
            description: data.description || "",
            visibility: data.visibility || "PRIVATE",
            ownerId: "", // Will be set by server
            teamId: data.teamId || null,
            createdAt: now,
            updatedAt: now,
          };

          console.log("✅ Created optimistic project:", optimisticProject);

          // Queue the request for background sync
          try {
            await offlineAPI.request("POST", "/projects", data);
            console.log("📥 Project creation queued for sync");
          } catch (queueError) {
            console.warn(
              "⚠️ Failed to queue project creation, but continuing with optimistic update:",
              queueError
            );
          }

          // Update team projects if this project belongs to a team
          if (data.teamId) {
            setTeamProjects((prev) => ({
              ...prev,
              [data.teamId!]: [
                optimisticProject,
                ...(prev[data.teamId!] || []),
              ],
            }));
          }

          toast.success(
            "Project created offline — will sync when you're online",
            {
              icon: "📥",
              duration: 3000,
            }
          );

          return optimisticProject;
        }

        // ONLINE MODE: Direct API call
        console.log("🌐 Online mode: Making direct API call");
        const response = await api.post("/projects", data);
        console.log("✅ Create project response:", response);

        let newProject: Project | null = null;

        // api.post returns ApiResponse<T> with structure { data: T, message: string, success: boolean }
        if (response && typeof response === "object" && "data" in response) {
          // Standard ApiResponse format
          newProject = response.data as Project;
          console.log("Using response.data:", newProject);
        } else if (
          response &&
          typeof response === "object" &&
          "id" in response
        ) {
          // Direct project object (fallback)
          newProject = response as any as Project;
          console.log("Using direct response:", newProject);
        } else {
          console.error("❌ Unexpected response structure:", response);
        }

        console.log("Processed new project:", newProject);

        if (!newProject?.id) {
          console.error("❌ Invalid new project data:", newProject);
          toast.error("Invalid response from server");
          return null;
        }

        // Update team projects if this project belongs to a team
        if (data.teamId) {
          setTeamProjects((prev) => ({
            ...prev,
            [data.teamId!]: [newProject, ...(prev[data.teamId!] || [])],
          }));
        }

        toast.success("Project created successfully!");
        return newProject;
      } catch (error: any) {
        console.error("❌ Error creating project:", error);
        console.error("Error response:", error.response);
        console.error("Error message:", error.message);

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

  // Initialize teams on mount
  useEffect(() => {
    fetchTeams();
  }, []);

  const value: TeamContextType = useMemo(
    () => ({
      teams,
      currentTeam,
      teamProjects,
      isLoading,
      fetchTeams,
      fetchTeamById,
      fetchTeamProjects,
      createTeam,
      updateTeam,
      createProject,
      setCurrentTeam,
    }),
    [
      teams,
      currentTeam,
      teamProjects,
      isLoading,
      fetchTeams,
      fetchTeamById,
      fetchTeamProjects,
      createTeam,
      updateTeam,
      createProject,
    ]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
