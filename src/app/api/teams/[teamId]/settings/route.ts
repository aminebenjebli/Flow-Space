import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = await params;
    const body = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Valider les données
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    if (body.name.trim().length > 100) {
      return NextResponse.json({ error: 'Team name cannot exceed 100 characters' }, { status: 400 });
    }

    if (body.description && typeof body.description === 'string' && body.description.length > 500) {
      return NextResponse.json({ error: 'Description cannot exceed 500 characters' }, { status: 400 });
    }

    // Faire la requête au backend pour mettre à jour l'équipe
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: body.name.trim(),
        description: body.description?.trim() || null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Team settings update error:', response.status, errorText);
      
      let errorMessage = 'Failed to update team settings';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // Keep default error message
      }

      return NextResponse.json(
        { error: errorMessage }, 
        { status: response.status }
      );
    }

    const updatedTeam = await response.json();
    return NextResponse.json(updatedTeam);
    
  } catch (error) {
    console.error('Error updating team settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}