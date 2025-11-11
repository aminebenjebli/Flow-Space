"use client";

import { useState } from "react";
import { UserMinus, Crown, Shield, User } from "lucide-react";
import { TeamMember } from "@/types/team";
import { removeMember } from "@/app/(protected)/teams/actions";

interface MemberListProps {
  members: TeamMember[];
  teamId: string;
  canManage: boolean;
}

export function MemberList({ members, teamId, canManage }: MemberListProps) {
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    console.log('DEBUG - handleRemoveMember:', { memberId, memberName, teamId });
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
      return;
    }

    setError("");
    setSuccess("");
    setRemovingMember(memberId);

    try {
      const result = await removeMember(teamId, memberId);

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(`${memberName} removed from team`);
      }
    } catch (error) {
      setError("Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-4">
        No members found
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="text-green-600 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {members.map((member) => (
        <div key={member.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {(member.user?.name || member.name)?.charAt(0).toUpperCase() || (member.user?.email || member.email)?.charAt(0).toUpperCase() || '?'}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-card-foreground">
                  {member.user?.name || member.name || 'Unknown User'}
                </p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(member.role)}`}>
                  {getRoleIcon(member.role)}
                  {member.role.toLowerCase()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{member.user?.email || member.email || 'No email'}</p>
              <p className="text-xs text-muted-foreground">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {canManage && member.role !== 'OWNER' && (
            <button
              onClick={() => handleRemoveMember(member.userId || member.id, member.user?.name || member.name || member.user?.email || member.email || 'Unknown')}
              disabled={removingMember === (member.userId || member.id)}
              className="inline-flex items-center px-3 py-1 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              {removingMember === (member.userId || member.id) ? (
                "Removing..."
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-1" />
                  Remove
                </>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}