"use client";

import { useState } from 'react';
import { LogOut, AlertTriangle } from 'lucide-react';
import { leaveTeam } from '@/app/(protected)/teams/actions';

interface LeaveTeamModalProps {
  teamId: string;
  teamName: string;
  userRole?: string;
}

export function LeaveTeamModal({ teamId, teamName, userRole }: LeaveTeamModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  // Les propriétaires ne peuvent pas quitter leur équipe
  if (userRole === 'OWNER') {
    return null;
  }

  const handleLeaveTeam = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await leaveTeam(teamId);
      
      if (result?.error) {
        setError(result.error);
      }
      // Si pas d'erreur, l'action fait automatiquement le redirect
      
    } catch (err) {
      console.error('Error leaving team:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave team');
    } finally {
      setIsLoading(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flow-card p-6 border-destructive bg-red-50 dark:bg-red-900/10">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Confirm Leave Team
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm mb-4">
              Are you sure you want to leave <strong>{teamName}</strong>? 
              You will lose access to all team projects and tasks. 
              This action cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4 p-2 bg-red-100 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleLeaveTeam}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoading ? 'Leaving...' : 'Yes, Leave Team'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-border bg-background hover:bg-muted text-card-foreground rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-card p-4 border-destructive">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-destructive mb-1">
            Leave Team
          </h3>
          <p className="text-xs text-muted-foreground">
            Leave this team and lose access to all projects and tasks
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center px-3 py-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Leave Team
        </button>
      </div>
    </div>
  );
}