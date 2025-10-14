import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Project } from '@/types/team';
import { Task } from '@/types/index';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskFilters } from '@/components/tasks/task-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectSettings } from '@/components/projects/project-settings';
import { FolderOpen, Plus, ArrowLeft, Settings, CheckSquare } from 'lucide-react';
import Link from 'next/link';

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
  searchParams: Promise<{
    status?: string;
    priority?: string;
    q?: string;
    sortBy?: string;
    page?: string;
  }>;
}

async function getProject(projectId: string): Promise<Project | null> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    redirect('/login');
  }

  try {
    console.log('Fetching project:', projectId);
    
    // Try direct project endpoint first
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    console.log('Direct project response status:', response.status);

    if (response.ok) {
      const project = await response.json();
      console.log('Direct project response:', project);
      return project;
    } else {
      console.log('Direct project failed, trying fallback through teams...');
    }

    // Fallback: Search through teams (for backward compatibility)
    const teamsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/mine`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!teamsResponse.ok) {
      throw new Error('Failed to fetch teams');
    }

    const teams = await teamsResponse.json();
    
    for (const team of teams) {
      const projectsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/by-team/${team.id}`, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        cache: 'no-store',
      });

      if (projectsResponse.ok) {
        const projects: Project[] = await projectsResponse.json();
        const project = projects.find(p => p.id === projectId);
        if (project) {
          return { ...project, team };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return null;
  }
}

async function getCurrentUserTeams() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return [];
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/mine`, {
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
    console.error('Failed to fetch teams:', error);
    return [];
  }
}

async function getProjectTasks(projectId: string, searchParams: any): Promise<{ tasks: Task[]; total: number }> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { tasks: [], total: 0 };
  }

  try {
    const params = new URLSearchParams();
    params.set('projectId', projectId);
    
    // Add search params if they exist and are strings
    if (searchParams.status && typeof searchParams.status === 'string') {
      params.set('status', searchParams.status);
    }
    if (searchParams.priority && typeof searchParams.priority === 'string') {
      params.set('priority', searchParams.priority);
    }
    if (searchParams.q && typeof searchParams.q === 'string') {
      params.set('q', searchParams.q);
    }
    if (searchParams.sortBy && typeof searchParams.sortBy === 'string') {
      params.set('sortBy', searchParams.sortBy);
    }
    if (searchParams.page && typeof searchParams.page === 'string') {
      params.set('page', searchParams.page);
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tasks?${params}`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { tasks: [], total: 0 };
    }

    const result = await response.json();
    return {
      tasks: result.tasks || result.data || result,
      total: result.total || result.tasks?.length || 0,
    };
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return { tasks: [], total: 0 };
  }
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { projectId } = await params;
  const resolvedSearchParams = await searchParams;
  const [project, { tasks }, userTeams] = await Promise.all([
    getProject(projectId),
    getProjectTasks(projectId, resolvedSearchParams),
    getCurrentUserTeams(),
  ]);

  if (!project) {
    redirect('/teams');
  }

  // Get current user's session to check permissions
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  
  // Check if user can admin this project
  const isOwner = project.ownerId === currentUserId;
  
  // For team admin check, we need to fetch team details separately if needed
  // For now, assume non-owners can't admin (this can be improved later)
  const canAdmin = isOwner;

  // Since the backend already verified permissions and returned the project,
  // we can trust that the user has read access. No additional check needed.
  console.log('Project loaded successfully:', {
    projectId: project.id,
    projectName: project.name,
    isOwner,
    canAdmin,
    teamId: project.teamId
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href={project.team ? `/teams/${project.teamId}` : '/teams'}
            className="flex items-center text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {project.team ? 'Back to Team' : 'Back to Teams'}
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
                <span className={`px-2 py-1 text-xs rounded-full ${
                  project.visibility === 'PUBLIC' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}>
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
                {project.description || 'No description provided'}
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Owner: {project.owner?.name || 'Unknown'}</span>
                <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                {project.team && (
                  <span>Team: {project.team.name}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tasks" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks ({tasks.length})
            </TabsTrigger>
            {canAdmin && (
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            {/* Task Filters */}
            <TaskFilters />

            {/* Tasks Grid */}
            <div className="space-y-4 mt-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-card-foreground mb-2">
                    No tasks found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {resolvedSearchParams.q || resolvedSearchParams.status
                      ? "Try adjusting your search or filters"
                      : "Get started by creating your first task"}
                  </p>
                  <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Task
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => {}}
                      onSelect={() => {}}
                      onView={() => {}}
                      isSelected={false}
                    />
                  ))}
                </div>
              )}
            </div>
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