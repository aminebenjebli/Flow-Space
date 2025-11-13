import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { Project } from "@/types/team";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectSettings } from "@/components/projects/project-settings";
import { ProjectTasksManager } from "@/components/projects/project-tasks-manager";
import { ArrowLeft, Settings, CheckSquare } from "lucide-react";
import Link from "next/link";

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

async function getProject(projectId: string): Promise<Project | null> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect("/login");
  }

  try {
    console.log("Fetching project:", projectId);

    // Try direct project endpoint first
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store", // Don't cache to ensure fresh data
      }
    );

    console.log("Direct project response status:", response.status);

    if (response.ok) {
      const project = await response.json();
      console.log("Direct project response:", project);
      return project;
    } else {
      console.log("Direct project failed, trying fallback through teams...");
    }

    // Fallback: Search through teams (for backward compatibility)
    const teamsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/teams/mine`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!teamsResponse.ok) {
      throw new Error("Failed to fetch teams");
    }

    const teams = await teamsResponse.json();

    // Parallelize team project fetches
    const projectPromises = teams.map(async (team: any) => {
      try {
        const projectsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/projects/by-team/${team.id}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
            cache: "no-store",
          }
        );

        if (projectsResponse.ok) {
          const projects: Project[] = await projectsResponse.json();
          const project = projects.find((p) => p.id === projectId);
          if (project) {
            return { ...project, team };
          }
        }
      } catch (error) {
        console.error(`Error fetching projects for team ${team.id}:`, error);
      }
      return null;
    });

    const results = await Promise.all(projectPromises);
    return results.find((p) => p !== null) || null;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
}

async function getCurrentUserTeams() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return [];
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/teams/mine`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
        cache: "no-store", // Don't cache to ensure fresh data
      }
    );

    if (!response.ok) {
      return [];
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return [];
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const [project, userTeams] = await Promise.all([
    getProject(projectId),
    getCurrentUserTeams(),
  ]);

  if (!project) {
    redirect("/teams");
  }

  // Get current user's session to check permissions
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;

  // Check if user can admin this project
  const isOwner = project.ownerId === currentUserId;

  // Check if user is team owner (if project is attached to a team)
  let isTeamOwner = false;
  if (project.teamId) {
    // Find the team in userTeams to check the user's role
    const team = userTeams.find((t: any) => t.id === project.teamId);
    console.log("Team lookup:", {
      projectTeamId: project.teamId,
      teamFound: !!team,
      teamMembers: team?.members,
      currentUserId,
    });
    if (team && team.members) {
      const userMembership = team.members.find(
        (m: any) => m.userId === currentUserId || m.id === currentUserId
      );
      console.log("User membership check:", {
        userMembership,
        userRole: userMembership?.role,
      });
      isTeamOwner = userMembership?.role === "OWNER";
    }
  }

  // User can admin ONLY if they are project owner OR team owner
  const canAdmin = isOwner || isTeamOwner;

  // Debug logging
  console.log("Project permissions check:", {
    projectId: project.id,
    projectName: project.name,
    currentUserId,
    projectOwnerId: project.ownerId,
    isOwner,
    projectTeamId: project.teamId,
    isTeamOwner,
    canAdmin,
    userTeamsCount: userTeams.length,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={project.team ? `/teams/${project.teamId}` : "/teams"}
            className="flex items-center text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {project.team ? "Back to Team" : "Back to Teams"}
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground mb-2">
              {project.name}
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                {project.description || `Project tasks and settings`}
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    project.visibility === "PUBLIC"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {project.visibility}
                </span>
                {project.team && (
                  <span className="text-sm text-muted-foreground">
                    Team: {project.team.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Project Info */}
        <div className="flow-card p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Project Details</h3>
              <p className="text-muted-foreground mb-2">
                {project.description || "No description provided"}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Owner: {project.owner?.name || "Unknown"}</span>
                <span>
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </span>
                {project.team && <span>Team: {project.team.name}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            {canAdmin && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            <ProjectTasksManager
              projectId={projectId}
              projectName={project.name}
              isProjectAdmin={canAdmin}
            />
          </TabsContent>

          {canAdmin && (
            <TabsContent value="settings" className="mt-6">
              <ProjectSettings
                project={project}
                userTeams={userTeams}
                canAdmin={canAdmin}
                currentUserId={currentUserId}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
