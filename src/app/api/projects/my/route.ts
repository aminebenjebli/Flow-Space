import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's personal projects first
    const personalProjectsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/personal`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const allProjects = [];

    if (personalProjectsResponse.ok) {
      const personalProjects = await personalProjectsResponse.json();
      allProjects.push(...personalProjects);
    }

    // Fetch user's teams
    const teamsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/mine`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!teamsResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    const teams = await teamsResponse.json();

    // Fetch projects for each team
    for (const team of teams) {
      try {
        const projectsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/by-team/${team.id}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (projectsResponse.ok) {
          const teamProjects = await projectsResponse.json();
          // Add team info to each project
          const projectsWithTeam = teamProjects.map((project: any) => ({
            ...project,
            team: {
              id: team.id,
              name: team.name
            }
          }));
          allProjects.push(...projectsWithTeam);
        }
      } catch (error) {
        console.error(`Error fetching projects for team ${team.id}:`, error);
      }
    }

    return NextResponse.json(allProjects);
    
  } catch (error) {
    console.error('Error fetching my projects:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}