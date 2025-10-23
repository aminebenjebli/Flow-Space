import { cookies } from 'next/headers';

export async function getTokenFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    // Adapt this to your actual cookie name for storing the token
    const token = cookieStore.get('next-auth.session-token')?.value ||
                  cookieStore.get('__Secure-next-auth.session-token')?.value;
    
    if (token) {
      // This is a simplified approach - you might need to decode the session token
      // or get the actual JWT from your session
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting token from cookies:', error);
    return null;
  }
}

export function setTokenCookie(token: string) {
  // This would be implemented based on your cookie strategy
  // For NextAuth, this is usually handled automatically
}