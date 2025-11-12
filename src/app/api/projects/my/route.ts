import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headers = {
      'Authorization': `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    };

    // Fetch personal projects and teams in parallel
    const [personalProjectsResponse, teamsResponse] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/personal`, {
        headers,
        next: { revalidate: 30 }, // Cache for 30 seconds
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/mine`, {
        headers,
        next: { revalidate: 30 },
      })
    ]);

    const allProjects: any[] = [];

    // Add personal projects
    if (personalProjectsResponse.ok) {
      const personalProjects = await personalProjectsResponse.json();
      allProjects.push(...personalProjects);
    }

    // Fetch team projects in parallel
    if (teamsResponse.ok) {
      const teams = await teamsResponse.json();
      
      // Fetch all team projects in parallel
      const teamProjectsPromises = teams.map(async (team: any) => {
        try {
          const projectsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/by-team/${team.id}`,
            {
              headers,
              next: { revalidate: 30 },
            }
          );

          if (projectsResponse.ok) {
            const teamProjects = await projectsResponse.json();
            return teamProjects.map((project: any) => ({
              ...project,
              team: {
                id: team.id,
                name: team.name
              }
            }));
          }
        } catch (error) {
          console.error(`Error fetching projects for team ${team.id}:`, error);
        }
        return [];
      });

      const teamProjectsArrays = await Promise.all(teamProjectsPromises);
      teamProjectsArrays.forEach(projects => allProjects.push(...projects));
    }

    return NextResponse.json(allProjects, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    });
    
  } catch (error) {
    console.error('Error fetching my projects:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}