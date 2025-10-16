import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

interface DebugPageProps {
  params: Promise<{
    teamId: string;
  }>;
}

async function getTeamDebugInfo(teamId: string) {
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

    const teams = await response.json();
    const team = teams.find((t: any) => t.id === teamId);
    
    return {
      session: {
        userId: session.user?.id,
        userEmail: session.user?.email,
        userName: session.user?.name
      },
      team,
      allTeams: teams
    };
  } catch (error) {
    console.error('Failed to fetch team:', error);
    return null;
  }
}

export default async function DebugTeamPage({ params }: DebugPageProps) {
  const { teamId } = await params;
  const debugInfo = await getTeamDebugInfo(teamId);

  if (!debugInfo) {
    return <div>Error loading debug info</div>;
  }

  const { session, team, allTeams } = debugInfo;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Team Debug Info</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flow-card p-6">
            <h2 className="text-lg font-semibold mb-4">Session Info</h2>
            <pre className="text-sm bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          <div className="flow-card p-6">
            <h2 className="text-lg font-semibold mb-4">Current Team</h2>
            <pre className="text-sm bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(team, null, 2)}
            </pre>
          </div>

          <div className="flow-card p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Team Members Analysis</h2>
            {team?.members?.map((member: any, index: number) => (
              <div key={index} className="mb-4 p-4 border border-border rounded">
                <h3 className="font-medium mb-2">Member {index + 1}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Role:</strong> {member.role}
                  </div>
                  <div>
                    <strong>Member ID:</strong> {member.id}
                  </div>
                  <div>
                    <strong>User ID (userId):</strong> {member.userId || 'N/A'}
                  </div>
                  <div>
                    <strong>Direct Email:</strong> {member.email || 'N/A'}
                  </div>
                  <div>
                    <strong>Direct Name:</strong> {member.name || 'N/A'}
                  </div>
                  <div>
                    <strong>User Email (nested):</strong> {member.user?.email || 'N/A'}
                  </div>
                  <div>
                    <strong>User Name (nested):</strong> {member.user?.name || 'N/A'}
                  </div>
                  <div>
                    <strong>Matches Session by member.id:</strong> {member.id === session.userId ? 'YES' : 'NO'}
                  </div>
                  <div>
                    <strong>Matches Session by userId:</strong> {member.userId === session.userId ? 'YES' : 'NO'}
                  </div>
                  <div>
                    <strong>Matches Session by email:</strong> {member.email === session.userEmail ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flow-card p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">All Teams</h2>
            <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(allTeams, null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="mt-6">
          <a 
            href={`/teams/${teamId}`} 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            ← Back to Team
          </a>
        </div>
      </div>
    </div>
  );
}