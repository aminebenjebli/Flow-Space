'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si la session est en cours de chargement, ne rien faire
    if (status === 'loading') return;

    // Si pas de session, rediriger
    if (status === 'unauthenticated' || !session) {
      console.log('No session found, redirecting to:', redirectTo);
      router.push(redirectTo);
      return;
    }

    // Vérifier si le token est expiré
    if (session.expires) {
      const expirationTime = new Date(session.expires).getTime();
      const currentTime = Date.now();
      
      if (currentTime >= expirationTime) {
        console.log('Session expired, redirecting to:', redirectTo);
        router.push(redirectTo);
      }
    }
  }, [session, status, router, redirectTo]);

  // Afficher un loader pendant la vérification
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Si pas de session, ne rien afficher (redirection en cours)
  if (status === 'unauthenticated' || !session) {
    return null;
  }

  // Si session valide, afficher le contenu
  return <>{children}</>;
}