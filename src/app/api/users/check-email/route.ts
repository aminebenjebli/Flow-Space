import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    console.log('Checking email:', email);

    // Faire la requête au backend pour vérifier si l'utilisateur existe
    const url = `${process.env.NEXT_PUBLIC_API_URL}/user/check-email?email=${encodeURIComponent(email)}`;
    console.log('Checking email with URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`Failed to check email: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Backend response data:', data);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json({ 
      exists: false,
      error: 'Failed to check email' 
    }, { status: 500 });
  }
}