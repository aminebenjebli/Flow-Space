'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { signOut } from 'next-auth/react';

interface FetchOptions extends RequestInit {
  skipAuthRedirect?: boolean;
}

export function useApiClient() {
  const router = useRouter();

  const apiCall = useCallback(async (
    url: string, 
    options: FetchOptions = {}
  ) => {
    try {
      const response = await fetch(url, options);

      // Si erreur 401 et pas de skip, déconnecter et rediriger
      if (response.status === 401 && !options.skipAuthRedirect) {
        console.log('API returned 401, session expired. Signing out...');
        await signOut({ 
          redirect: false,
          callbackUrl: '/login' 
        });
        router.push('/login');
        throw new Error('Session expired');
      }

      return response;
    } catch (error) {
      // Si erreur réseau et que c'est pas un skip, on peut aussi vérifier
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('Network error during API call:', error);
      }
      throw error;
    }
  }, [router]);

  return { apiCall };
}

// Helper pour remplacer fetch dans les composants
export function createAuthenticatedFetch(router: any) {
  return async (url: string, options: FetchOptions = {}) => {
    try {
      const response = await fetch(url, options);

      if (response.status === 401 && !options.skipAuthRedirect) {
        console.log('API returned 401, redirecting to login');
        await signOut({ redirect: false });
        router.push('/login');
        return null;
      }

      return response;
    } catch (error) {
      throw error;
    }
  };
}