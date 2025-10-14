"use client";

import { useState } from 'react';
import { Users, Mail, Copy, Settings, Shield, UserPlus } from 'lucide-react';

interface OwnerActionsProps {
  teamId: string;
  onInviteClick: () => void;
}

export function OwnerActions({ teamId, onInviteClick }: OwnerActionsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={onInviteClick}
          className="flex flex-col items-center p-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
        >
          <Mail className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Email Invite</span>
        </button>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex flex-col items-center p-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground border rounded-lg transition-colors"
        >
          <Settings className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Advanced</span>
        </button>
        
        <button className="flex flex-col items-center p-3 bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg transition-colors">
          <Shield className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Permissions</span>
        </button>
        
        <button className="flex flex-col items-center p-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg transition-colors">
          <UserPlus className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Bulk Add</span>
        </button>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="p-4 bg-card border rounded-lg">
          <h4 className="text-sm font-semibold mb-3">Advanced Member Management</h4>
          <div className="space-y-2">
            <button className="w-full text-left px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
              📧 Generate Invitation Links
            </button>
            <button className="w-full text-left px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
              📋 Import from CSV
            </button>
            <button className="w-full text-left px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
              🔗 Create Join Link
            </button>
            <button className="w-full text-left px-3 py-2 text-sm bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
              👥 Member Templates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}