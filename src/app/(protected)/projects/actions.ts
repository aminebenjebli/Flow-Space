'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { CreateProjectData, UpdateProjectSettingsData, ProjectInviteData } from '@/types/team';

export async function createProject(data: CreateProjectData) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to create project' };
    }

    const project = await response.json();
    
    // Revalidate appropriate paths
    if (data.teamId) {
      revalidatePath(`/teams/${data.teamId}`);
    }
    revalidatePath('/teams');
    
    redirect(`/projects/${project.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw redirect errors
    }
    console.error('Create project error:', error);
    return { error: 'Failed to create project' };
  }
}

export async function updateProjectSettings(projectId: string, data: UpdateProjectSettingsData) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/settings`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to update project settings' };
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/teams');
    
    return { success: true };
  } catch (error) {
    console.error('Update project settings error:', error);
    return { error: 'Failed to update project settings' };
  }
}

export async function deleteProject(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to delete project' };
    }

    revalidatePath('/teams');
    redirect('/teams');
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw redirect errors
    }
    console.error('Delete project error:', error);
    return { error: 'Failed to delete project' };
  }
}

export async function inviteProjectMember(projectId: string, data: ProjectInviteData) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to invite member' };
    }

    const invite = await response.json();
    revalidatePath(`/projects/${projectId}`);
    
    // Return token in dev mode for testing
    const isDev = process.env.NODE_ENV === 'development';
    return { 
      success: true,
      token: isDev ? invite.token : undefined
    };
  } catch (error) {
    console.error('Invite project member error:', error);
    return { error: 'Failed to invite member' };
  }
}