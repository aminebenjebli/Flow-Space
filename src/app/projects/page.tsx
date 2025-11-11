import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
// Client component for interactive features
import ProjectsClient from '@/components/projects/projects-client';

interface Project {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  team?: {
    id: string;
    name: string;
  } | null;
  taskCount?: number;
  _count?: {
    tasks: number;
  };
}

// Fetch projects with parallel requests and caching
async function getMyProjects(accessToken: string): Promise<Project[]> {
  try {
    // Fetch personal projects and teams in parallel
    const [personalProjectsResponse, teamsResponse] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/personal`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/mine`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 30 },
      })
    ]);

    const allProjects: Project[] = [];

    // Add personal projects
    if (personalProjectsResponse.ok) {
      const personalProjects = await personalProjectsResponse.json();
      allProjects.push(...personalProjects);
    }

    // Fetch team projects in parallel
    if (teamsResponse.ok) {
      const teams = await teamsResponse.json();
      
      const teamProjectsPromises = teams.map(async (team: any) => {
        try {
          const projectsResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/projects/by-team/${team.id}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              next: { revalidate: 30 },
            }
          );

          if (projectsResponse.ok) {
            const teamProjects = await projectsResponse.json();
            return teamProjects.map((project: any) => ({
              ...project,
              team: { id: team.id, name: team.name }
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

    return allProjects;
  } catch (error) {
    console.error('Error fetching my projects:', error);
    return [];
  }
}

async function getPublicProjects(accessToken: string): Promise<Project[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/public`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error fetching public projects:', error);
  }
  return [];
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    redirect('/login');
  }

  // Fetch both in parallel
  const [myProjects, publicProjects] = await Promise.all([
    getMyProjects(session.accessToken),
    getPublicProjects(session.accessToken)
  ]);

  return (
    <Suspense fallback={<ProjectsLoadingSkeleton />}>
      <ProjectsClient 
        initialMyProjects={myProjects} 
        initialPublicProjects={publicProjects} 
      />
    </Suspense>
  );
}

// Loading skeleton component
function ProjectsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-12 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flow-card p-6">
                <div className="h-6 bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}