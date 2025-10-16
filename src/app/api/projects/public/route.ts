import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch public projects from backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/public`, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Public projects error:', response.status, errorText);
      
      // If endpoint doesn't exist, return empty array
      if (response.status === 404) {
        return NextResponse.json([]);
      }
      
      return NextResponse.json({ error: 'Failed to fetch public projects' }, { status: 500 });
    }

    const publicProjects = await response.json();
    return NextResponse.json(publicProjects);
    
  } catch (error) {
    console.error('Error fetching public projects:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}