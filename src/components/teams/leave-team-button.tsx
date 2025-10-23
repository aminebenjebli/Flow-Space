"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui';

interface LeaveTeamButtonProps {
  teamId: string;
  teamName: string;
  userRole?: string;
}

export function LeaveTeamButton({ teamId, teamName, userRole }: LeaveTeamButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  // Les propriétaires ne peuvent pas quitter leur équipe
  if (userRole === 'OWNER') {
    return null;
  }

  const handleLeaveTeam = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${teamId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave team');
      }

      // Rediriger vers la page des équipes après avoir quitté
      router.push('/teams');
      router.refresh();
      
    } catch (error) {
      console.error('Error leaving team:', error);
      alert(error instanceof Error ? error.message : 'Failed to leave team');
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flow-card p-6 border-destructive">
        <h3 className="text-lg font-semibold text-destructive mb-4">
          Confirm Leave Team
        </h3>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to leave <strong>{teamName}</strong>? 
          You will lose access to all team projects and tasks. 
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="destructive"
            onClick={handleLeaveTeam}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {isLoading ? 'Leaving...' : 'Yes, Leave Team'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-card p-6 border-destructive">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Leave Team
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Leave this team and lose access to all projects and tasks.
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Leave Team
        </Button>
      </div>
    </div>
  );
}