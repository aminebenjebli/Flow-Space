import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, memberId } = await params;
    const body = await request.json();

    if (!teamId || !memberId) {
      return NextResponse.json({ error: 'Team ID and Member ID are required' }, { status: 400 });
    }

    if (!body.role || !['MEMBER'].includes(body.role)) {
      return NextResponse.json({ error: 'Valid role is required (MEMBER)' }, { status: 400 });
    }

    // Faire la requête au backend pour mettre à jour le rôle du membre
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams/${teamId}/members/${memberId}/role`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: body.role
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Member role update error:', response.status, errorText);
      
      let errorMessage = 'Failed to update member role';
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

    const result = await response.json();
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error updating member role:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}