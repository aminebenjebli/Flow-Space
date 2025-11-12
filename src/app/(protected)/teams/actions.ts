'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

interface CreateTeamData {
  name: string;
  description?: string;
}

export async function createTeam(data: CreateTeamData) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to create team' };
    }

    const team = await response.json();
    
    revalidatePath('/teams');
    redirect(`/teams/${team.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw redirect errors
    }
    console.error('Create team error:', error);
    return { error: 'Failed to create team' };
  }
}

// New function to create team with initial members
interface CreateTeamWithMembersData {
  name: string;
  description?: string;
  initialMembers?: Array<{
    email: string;
    role: 'MEMBER';
  }>;
}

export async function createTeamWithMembers(data: CreateTeamWithMembersData) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    // First, create the team
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to create team' };
    }

    const team = await response.json();
    
    // Then, send invitations if there are initial members
    if (data.initialMembers && data.initialMembers.length > 0) {
      for (const member of data.initialMembers) {
        try {
          await inviteMember(team.id, member);
        } catch (error) {
          console.error(`Failed to invite ${member.email}:`, error);
          // Continue with other invitations even if one fails
        }
      }
    }
    
    revalidatePath('/teams');
    redirect(`/teams/${team.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw redirect errors
    }
    console.error('Create team error:', error);
    return { error: 'Failed to create team' };
  }
}

interface InviteMemberData {
  email: string;
  role: 'MEMBER';
}

export async function inviteMember(teamId: string, data: InviteMemberData) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to send invite' };
    }

    const invite = await response.json();
    revalidatePath(`/teams/${teamId}`);
    
    // Return token in dev mode for testing
    const isDev = process.env.NODE_ENV === 'development';
    return { 
      success: true,
      token: isDev ? invite.token : undefined
    };
  } catch (error) {
    console.error('Invite member error:', error);
    return { error: 'Failed to send invite' };
  }
}

export async function removeMember(teamId: string, userId: string) {
  console.log('DEBUG - removeMember action:', { teamId, userId });
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/remove/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to remove member' };
    }

    revalidatePath(`/teams/${teamId}`);
    return { success: true };
  } catch (error) {
    console.error('Remove member error:', error);
    return { error: 'Failed to remove member' };
  }
}

export async function acceptInvite(token: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/accept-invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to accept invite' };
    }

    const result = await response.json();
    
    // Revalidate paths but don't redirect here - let client handle it
    revalidatePath('/teams');
    revalidatePath(`/teams/${result.team.id}`);
    
    return { 
      success: true, 
      team: result.team,
      message: 'Successfully joined the team!'
    };
  } catch (error) {
    console.error('Accept invite error:', error);
    return { error: 'Failed to accept invite' };
  }
}

export async function deleteTeam(teamId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to delete team' };
    }

    revalidatePath('/teams');
    redirect('/teams');
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw redirect errors
    }
    console.error('Delete team error:', error);
    return { error: 'Failed to delete team' };
  }
}

// Regenerate expired invitation
export async function regenerateInvitation(teamId: string, email: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/invites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, role: 'MEMBER' }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to regenerate invitation' };
    }

    const invite = await response.json();
    revalidatePath(`/teams/${teamId}`);
    
    // Return token in dev mode for testing
    const isDev = process.env.NODE_ENV === 'development';
    return { 
      success: true,
      message: 'New invitation generated successfully',
      token: isDev ? invite.token : undefined
    };
  } catch (error) {
    console.error('Regenerate invitation error:', error);
    return { error: 'Failed to regenerate invitation' };
  }
}

export async function leaveTeam(teamId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return { error: 'Unauthorized' };
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { error: error.message || 'Failed to leave team' };
    }

    revalidatePath('/teams');
    redirect('/teams');
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw redirect errors
    }
    console.error('Leave team error:', error);
    return { error: 'Failed to leave team' };
  }
}