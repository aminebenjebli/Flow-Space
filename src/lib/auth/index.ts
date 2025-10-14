import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';

// Helper to get token from NextAuth session
export async function getTokenFromSession() {
  const session = await getServerSession(authOptions);
  return session?.accessToken || null;
}

// Wrapper for API calls with NextAuth integration
export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function apiGet(endpoint: string) {
  return apiCall(endpoint, { method: 'GET' });
}

export async function apiPost(endpoint: string, data: any) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiDelete(endpoint: string) {
  return apiCall(endpoint, { method: 'DELETE' });
}