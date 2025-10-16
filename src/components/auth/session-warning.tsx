'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AlertTriangle, X } from 'lucide-react';

interface SessionWarningProps {
  warningTimeMinutes?: number; // Afficher l'alerte X minutes avant expiration
}

export default function SessionWarning({ 
  warningTimeMinutes = 5 
}: SessionWarningProps) {
  const { data: session } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.expires) return;

    const checkExpiration = () => {
      const expirationTime = new Date(session.expires).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      const warningThreshold = warningTimeMinutes * 60 * 1000; // Convert to milliseconds

      if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
        setShowWarning(true);
        setTimeLeft(Math.ceil(timeUntilExpiry / 1000 / 60)); // Minutes left
      } else {
        setShowWarning(false);
        setTimeLeft(null);
      }
    };

    // Check immediately
    checkExpiration();

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);

    return () => clearInterval(interval);
  }, [session?.expires, warningTimeMinutes]);

  if (!showWarning || timeLeft === null) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800">
              Session Expiring Soon
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Your session will expire in {timeLeft} minute{timeLeft !== 1 ? 's' : ''}. 
              Please save your work.
            </p>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="ml-3 text-yellow-600 hover:text-yellow-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}