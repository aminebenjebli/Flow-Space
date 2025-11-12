import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '5';

    // Fetch public projects from backend with pagination and caching
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/projects/public?page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Public projects error:', response.status, errorText);
      
      // If endpoint doesn't exist, return empty paginated response
      if (response.status === 404) {
        return NextResponse.json({
          data: [],
          meta: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          }
        }, {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          }
        });
      }
      
      return NextResponse.json({ error: 'Failed to fetch public projects' }, { status: 500 });
    }

    const paginatedResponse = await response.json();
    return NextResponse.json(paginatedResponse, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      }
    });
    
  } catch (error) {
    console.error('Error fetching public projects:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}