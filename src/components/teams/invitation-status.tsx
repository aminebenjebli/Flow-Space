"use client";

import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

interface InvitationStatusProps {
  invitations: Array<{
    email: string;
    role: string;
    token: string;
    expiresAt: string;
    acceptedAt?: string;
  }>;
  teamId: string;
}

export function InvitationStatus({ invitations, teamId }: InvitationStatusProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyInviteLink = (token: string, email: string) => {
    const link = `${window.location.origin}/teams/invite/accept/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    toast.success(`Invite link copied for ${email}!`);
    
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const isPending = (invitation: any) => !invitation.acceptedAt && new Date(invitation.expiresAt) > new Date();
  const isExpired = (invitation: any) => !invitation.acceptedAt && new Date(invitation.expiresAt) <= new Date();
  const isAccepted = (invitation: any) => !!invitation.acceptedAt;

  const pendingInvitations = invitations.filter(isPending);
  const acceptedInvitations = invitations.filter(isAccepted);
  const expiredInvitations = invitations.filter(isExpired);

  if (invitations.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-card-foreground mb-3">
            Pending Invitations ({pendingInvitations.length})
          </h4>
          <div className="space-y-2">
            {pendingInvitations.map((invitation, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invitation.email}</span>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                      {invitation.role}
                    </span>
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                      Pending
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invitation.token, invitation.email)}
                    className="flex items-center gap-1"
                  >
                    {copiedToken === invitation.token ? (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = `${window.location.origin}/teams/invite/accept/${invitation.token}`;
                      window.open(link, '_blank');
                    }}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accepted Invitations */}
      {acceptedInvitations.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-card-foreground mb-3">
            Accepted Invitations ({acceptedInvitations.length})
          </h4>
          <div className="space-y-2">
            {acceptedInvitations.map((invitation, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invitation.email}</span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      {invitation.role}
                    </span>
                    <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded">
                      ✓ Accepted
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(invitation.acceptedAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expired Invitations */}
      {expiredInvitations.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-card-foreground mb-3">
            Expired Invitations ({expiredInvitations.length})
          </h4>
          <div className="space-y-2">
            {expiredInvitations.map((invitation, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">{invitation.email}</span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {invitation.role}
                    </span>
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                      Expired
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Expired: {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Here you could trigger a "resend invitation" action
                    toast('Resend invitation feature coming soon', { icon: 'ℹ️' });
                  }}
                  className="text-xs"
                >
                  Resend
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Development Mode Notice */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">🔧 Development Mode</p>
          <p className="text-xs text-blue-600 mt-1">
            In development, you can copy and share invitation links directly. 
            In production, email notifications will be sent automatically.
          </p>
        </div>
      )}
    </div>
  );
}