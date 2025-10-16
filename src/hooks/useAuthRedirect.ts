'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuthRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si la session est en cours de chargement, ne rien faire
    if (status === 'loading') return;

    // Si pas de session, rediriger vers login
    if (status === 'unauthenticated' || !session) {
      console.log('Session expired or not found, redirecting to login');
      router.push('/login');
      return;
    }

    // Vérifier si le token est expiré
    if (session.expires) {
      const expirationTime = new Date(session.expires).getTime();
      const currentTime = Date.now();
      
      if (currentTime >= expirationTime) {
        console.log('Session token expired, redirecting to login');
        router.push('/login');
        return;
      }

      // Programmer une redirection automatique quand le token expirera
      const timeUntilExpiry = expirationTime - currentTime;
      const timeout = setTimeout(() => {
        console.log('Session token expired, redirecting to login');
        router.push('/login');
      }, timeUntilExpiry);

      return () => clearTimeout(timeout);
    }
  }, [session, status, router]);

  return { session, status };
}

export default useAuthRedirect;