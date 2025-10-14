import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Team, Project } from '@/types/team';
import { Users, FolderOpen, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { Tabs } from '@/components/teams/tabs';
import { MemberActions } from '@/components/teams/member-actions';

interface TeamPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function getTeamDetails(teamId: string): Promise<Team | null> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect('/login');
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/mine`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }

    const teams: Team[] = await response.json();
    return teams.find(team => team.id === teamId) || null;
  } catch (error) {
    console.error('Failed to fetch team:', error);
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
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  } catch (error) {
    console.error('Failed to fetch projects:', error);
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
    redirect('/teams');
  }

  // Get current user's session to find their role
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  
  // Debug logging
  console.log('DEBUG PAGE - User session:', {
    currentUserId,
    userEmail: session?.user?.email,
    teamMembers: team.members?.map(m => ({ 
      userId: m.userId, 
      role: m.role,
      userEmail: m.user?.email 
    }))
  });
  
  // Find current user's role in the team
  const currentMember = team.members?.find(member => member.userId === currentUserId);
  let userRole = currentMember?.role;
  
  // FIXME: Temporary fix - if user is the only member, assume OWNER role
  if (!userRole && team.members?.length === 1 && currentUserId) {
    console.log('TEMP FIX: Assuming OWNER role for single member team');
    userRole = 'OWNER';
  }
  
  const canManageTeam = userRole === 'OWNER' || userRole === 'ADMIN';
  
  console.log('DEBUG PAGE - Role calculation:', {
    currentMember,
    userRole,
    canManageTeam,
    isTemporaryFix: !currentMember && team.members?.length === 1
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground mb-2">
              {team.name}
            </h1>
            <p className="text-muted-foreground">
              {team.description || 'Team dashboard'}
            </p>
          </div>
        </div>
        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flow-card p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Team Information</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {team.description || 'No description provided'}
            </p>
            <p className="text-xs text-muted-foreground">
              Created on {new Date(team.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flow-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-card-foreground">Members</h3>
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
              <h3 className="text-lg font-semibold text-card-foreground">Projects</h3>
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {projects.length}
            </p>
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