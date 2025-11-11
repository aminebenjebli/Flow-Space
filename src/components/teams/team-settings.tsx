"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@/components/ui';
import { 
  Settings, 
  Save, 
  AlertTriangle, 
  Trash2,
  Users,
  Crown,
  Shield,
  User
} from 'lucide-react';
import { Team } from '@/types/team';
import { LeaveTeamButton } from '@/components/teams/leave-team-button';

interface TeamSettingsProps {
  team: Team;
  userRole?: string;
  canManageTeam: boolean;
}

export function TeamSettings({ team, userRole, canManageTeam }: TeamSettingsProps) {
  const [formData, setFormData] = useState({
    name: team.name,
    description: team.description || ''
  });
  const [loading, setLoading] = useState(false);
  const [roleLoading, setRoleLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Reset form when team changes
  useEffect(() => {
    setFormData({
      name: team.name,
      description: team.description || ''
    });
  }, [team.name, team.description]);

  const handleRoleChange = async (memberId: string, newRole: 'MEMBER') => {
    console.log('DEBUG - handleRoleChange:', { memberId, newRole, teamId: team.id });
    setRoleLoading(memberId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/teams/${team.id}/members/${memberId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update member role');
      }

      setSuccess(`Member role updated successfully!`);
      
      // Refresh the page after a delay to show the updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role');
    } finally {
      setRoleLoading(null);
    }
  };

  if (!canManageTeam) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">You don't have permission to view team settings</p>
              <p className="text-sm text-muted-foreground mt-1">Only team owners can access this section</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/teams/${team.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update team settings');
      }

      setSuccess('Team settings updated successfully!');
      
      // Refresh the page after a delay to show the updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team settings');
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return <Crown className="h-4 w-4" />;
      case 'ADMIN': return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default';
      case 'ADMIN': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Update your team's basic information and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-card-foreground mb-2">
                Team Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter team name"
                disabled={loading}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-card-foreground"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-card-foreground mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your team's purpose and goals"
                disabled={loading}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-card-foreground resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <Save className="h-4 w-4" />
                {success}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || (formData.name === team.name && formData.description === (team.description || ''))}
              className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Team Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Information
          </CardTitle>
          <CardDescription>
            Basic information about your team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Created
              </label>
              <p className="text-sm text-muted-foreground">
                {new Date(team.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Your Role
              </label>
              <Badge variant={getRoleBadgeVariant(userRole || 'MEMBER')} className="text-xs">
                {getRoleIcon(userRole || 'MEMBER')}
                <span className="ml-1">{userRole || 'MEMBER'}</span>
              </Badge>
            </div>
          </div>

          {/* Team Members Section */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-3">
              Team Members ({team.members?.length || 0})
            </label>
            <div className="space-y-2">
              {team.members?.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {member.name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {member.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                      {getRoleIcon(member.role)}
                      <span className="ml-1">{member.role}</span>
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone - Only show to owners */}
      {userRole === 'OWNER' && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that will permanently affect your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                      Delete Team
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Permanently delete this team and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={true} // Disable for now - would need implementation
                    className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white text-sm rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Team
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Team Section - for non-owners */}
      {userRole !== 'OWNER' && (
        <LeaveTeamButton 
          teamId={team.id} 
          teamName={team.name}
          userRole={userRole}
        />
      )}
    </div>
  );
}