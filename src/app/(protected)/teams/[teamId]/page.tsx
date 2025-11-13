import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { Team, Project } from "@/types/team";
import { Users, FolderOpen, Info, Plus } from "lucide-react";
import Link from "next/link";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { Tabs } from "@/components/teams/tabs";

interface TeamPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function getTeamDetails(teamId: string): Promise<Team | null> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect("/login");
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/mine`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error("Failed to fetch teams");
    }

    const teams: Team[] = await response.json();
    return teams.find((team) => team.id === teamId) || null;
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return null;
  }
}

async function getTeamProjects(teamId: string): Promise<Project[]> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return [];
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/by-team/${teamId}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { teamId } = await params;
  const [team, projects] = await Promise.all([
    getTeamDetails(teamId),
    getTeamProjects(teamId),
  ]);

  if (!team) {
    redirect("/teams");
  }

  // Get current user's session to find their role
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  const currentUserEmail = session?.user?.email;

  // Debug logging
  console.log("DEBUG PAGE - User session:", {
    currentUserId,
    userEmail: currentUserEmail,
    teamMembers: team.members?.map((m) => ({
      userId: m.userId,
      role: m.role,
      userEmail: m.user?.email,
      userDbId: m.user?.id,
    })),
  });

  // Find current user's role in the team - try multiple matching strategies
  let currentMember = team.members?.find(
    (member) => member.userId === currentUserId
  );

  // If not found by userId, try matching by member.id (direct ID match)
  if (!currentMember && currentUserId) {
    currentMember = team.members?.find((member) => member.id === currentUserId);
    console.log("DEBUG PAGE - Found member by member.id:", currentMember);
  }

  // If not found by ID, try matching by email (direct email match)
  if (!currentMember && currentUserEmail) {
    currentMember = team.members?.find(
      (member) => member.email === currentUserEmail
    );
    console.log("DEBUG PAGE - Found member by member.email:", currentMember);
  }

  // If not found by direct email, try matching by user.email
  if (!currentMember && currentUserEmail) {
    currentMember = team.members?.find(
      (member) => member.user?.email === currentUserEmail
    );
    console.log("DEBUG PAGE - Found member by user.email:", currentMember);
  }

  // If not found by email, try matching by user.id
  if (!currentMember && currentUserId) {
    currentMember = team.members?.find(
      (member) => member.user?.id === currentUserId
    );
    console.log("DEBUG PAGE - Found member by user.id:", currentMember);
  }

  let userRole = currentMember?.role;

  // Enhanced fallback logic for teams where user should have access
  if (!userRole && team.members && team.members.length > 0) {
    // Check if user is the creator/owner by checking if they're the first member
    // or if there's any indication they should be the owner
    const potentialOwner = team.members.find((m) => m.role === "OWNER");
    if (!potentialOwner && currentUserId) {
      console.log(
        "DEBUG PAGE - No owner found, assigning OWNER to current user"
      );
      userRole = "OWNER";
    } else if (team.members.length === 1 && currentUserId) {
      console.log("DEBUG PAGE - Single member team, assuming OWNER role");
      userRole = "OWNER";
    }
  }
  
  const canManageTeam = userRole === 'OWNER';
  
  console.log('DEBUG PAGE - Final role calculation:', {
    currentMember,
    userRole,
    canManageTeam,
    teamMembersCount: team.members?.length,
    foundByEmail:
      !team.members?.find((member) => member.userId === currentUserId) &&
      currentMember,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-2 truncate">
              {team.name}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {team.description || "Team dashboard"}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/debug-team/${teamId}`}
              className="text-xs text-muted-foreground hover:text-primary border border-border px-2 py-1 rounded whitespace-nowrap"
            >
              🐛 Debug Info
            </Link>
          </div>
        </div>
        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flow-card p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              Team Information
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {team.description || "No description provided"}
            </p>
            <p className="text-xs text-muted-foreground">
              Created on {new Date(team.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flow-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-card-foreground">
                Members
              </h3>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {team.members?.length || 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Active team members
            </p>
          </div>

          <div className="flow-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-card-foreground">
                Projects
              </h3>
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{projects.length}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Active projects
            </p>
          </div>
        </div>

        {/* Team Management */}
        <Tabs
          team={team}
          projects={projects}
          canManageTeam={canManageTeam}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
