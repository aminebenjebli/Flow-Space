import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Team } from '@/types/team';
import { CreateTeamDialog } from '@/components/teams/create-team-dialog';
import Link from 'next/link';
import { Users, FolderOpen } from 'lucide-react';

async function getMyTeams(): Promise<Team[]> {
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

    return response.json();
  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return [];
  }
}

export default async function TeamsPage() {
  const teams = await getMyTeams();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground mb-2">
              Team Management
            </h1>
            <p className="text-muted-foreground">
              Manage your teams and collaborate with others
            </p>
          </div>
          <CreateTeamDialog />
        </div>

        {teams.length === 0 ? (
          <div className="text-center py-12">
            <div className="flow-card p-8 max-w-md mx-auto">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                No teams yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first team to start collaborating with others
              </p>
              <CreateTeamDialog />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link key={team.id} href={`/teams/${team.id}`}>
                <div className="flow-card flow-card-hover p-6 cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {team.description}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{team._count?.members || team.members?.length || 0} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>{team._count?.projects || 0} projects</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}