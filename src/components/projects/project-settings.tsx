"use client";

import { useState } from 'react';
import { Project, ProjectVisibility, Team, ProjectInviteData, UpdateProjectSettingsData } from '@/types/team';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  Globe, 
  Lock, 
  Unlink, 
  Link, 
  UserPlus, 
  Trash2,
  AlertTriangle 
} from 'lucide-react';
import { updateProjectSettings, deleteProject, inviteProjectMember } from '@/app/(protected)/projects/actions';
import { deleteTeam } from '@/app/(protected)/teams/actions';
import { toast } from 'react-hot-toast';

interface ProjectSettingsProps {
  project: Project;
  userTeams: Team[];
  canAdmin: boolean;
  currentUserId?: string;
}

export function ProjectSettings({ project, userTeams, canAdmin, currentUserId }: ProjectSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);
  const [inviteData, setInviteData] = useState<ProjectInviteData>({
    email: '',
    role: 'MEMBER',
  });

  const handleVisibilityChange = async (visibility: ProjectVisibility) => {
    setIsUpdating(true);
    try {
      const result = await updateProjectSettings(project.id, { visibility });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Project visibility updated!');
      }
    } catch (error) {
      toast.error('Failed to update visibility');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTeamAttachment = async (teamId: string | null) => {
    setIsUpdating(true);
    try {
      const result = await updateProjectSettings(project.id, { teamId });
      if (result.error) {
        toast.error(result.error);
      } else {
        if (teamId) {
          toast.success('Project attached to team!');
        } else {
          toast.success('Project detached from team!');
        }
      }
    } catch (error) {
      toast.error('Failed to update team attachment');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsInviting(true);
    try {
      const result = await inviteProjectMember(project.id, inviteData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Invitation sent successfully!');
        setInviteData({ email: '', role: 'MEMBER' });
        
        if (result.token) {
          toast.success('Dev mode: Invite token generated!');
        }
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteProject(project.id);
      if (result?.error) {
        toast.error(result.error);
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      } else {
        toast.success('Project deleted successfully!');
        // Redirect will happen from the action
      }
    } catch (error) {
      toast.error('Failed to delete project');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!project.team) return;

    if (!showDeleteTeamConfirm) {
      setShowDeleteTeamConfirm(true);
      return;
    }

    setIsDeletingTeam(true);
    try {
      const result = await deleteTeam(project.team.id);
      if (result?.error) {
        toast.error(result.error);
        setIsDeletingTeam(false);
        setShowDeleteTeamConfirm(false);
      } else {
        toast.success('Team deleted successfully!');
        // Redirect will happen from the action
      }
    } catch (error) {
      toast.error('Failed to delete team');
      setIsDeletingTeam(false);
      setShowDeleteTeamConfirm(false);
    }
  };

  if (!canAdmin) {
    return (
      <div className="text-center py-8">
        <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">
          You don't have permission to manage this project's settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Project Visibility */}
      <div className="flow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Project Visibility</h3>
            <p className="text-sm text-muted-foreground">
              Control who can view this project and its tasks
            </p>
          </div>
          <Badge 
            variant={project.visibility === 'PUBLIC' ? 'default' : 'secondary'}
            className="flex items-center gap-1"
          >
            {project.visibility === 'PUBLIC' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {project.visibility}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              project.visibility === 'PUBLIC' ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
            }`}
            onClick={() => handleVisibilityChange('PUBLIC')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4" />
              <span className="font-medium">Public</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Anyone can view this project and its tasks
            </p>
          </div>

          <div 
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              project.visibility === 'PRIVATE' ? 'border-primary bg-primary/5' : 'hover:bg-gray-50'
            }`}
            onClick={() => handleVisibilityChange('PRIVATE')}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Private</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Only team members can view this project
            </p>
          </div>
        </div>
      </div>

      {/* Team Management */}
      <div className="flow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Team Management</h3>
            <p className="text-sm text-muted-foreground">
              Attach or detach this project from a team
            </p>
          </div>
          {project.team && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {project.team.name}
            </Badge>
          )}
        </div>

        {project.team ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">Attached to: {project.team.name}</p>
                <p className="text-sm text-muted-foreground">
                  Team members can access this project
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTeamAttachment(null)}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <Unlink className="h-4 w-4" />
                {isUpdating ? 'Detaching...' : 'Detach Team'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                This is a personal project. Attach it to a team to enable collaboration.
              </p>
              <Select 
                onValueChange={(value) => handleTeamAttachment(value)}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team to attach" />
                </SelectTrigger>
                <SelectContent>
                  {userTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Member Invitation (only if team is attached) */}
      {project.team && (
        <div className="flow-card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-1">Invite Members</h3>
            <p className="text-sm text-muted-foreground">
              Invite new members to the {project.team.name} team
            </p>
          </div>

          <form onSubmit={handleInviteMember} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="member@example.com"
                  disabled={isInviting}
                  required
                />
              </div>

              <div>
                <Label htmlFor="invite-role">Role</Label>
                <div className="px-3 py-2 border border-border rounded-lg bg-muted/50 text-card-foreground">
                  Member
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  New members will be invited with the Member role
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isInviting || !inviteData.email.trim()}>
              <UserPlus className="h-4 w-4 mr-2" />
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </div>
      )}

      {/* Danger Zone */}
      <div className="flow-card p-6 border-red-200">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-red-700 mb-1">Danger Zone</h3>
          <p className="text-sm text-muted-foreground">
            Irreversible and destructive actions
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium text-red-700">Delete Project</span>
              </div>
              <p className="text-sm text-red-600">
                This will permanently delete the project. Tasks will be preserved but unlinked.
              </p>
            </div>
            
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Project
              </Button>
            )}
          </div>

          {/* Team Deletion - Only for team owners */}
          {project.team && project.team.members?.some(member => 
            member.userId === currentUserId && member.role === 'OWNER'
          ) && (
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-700">Delete Team</span>
                </div>
                <p className="text-sm text-red-600">
                  This will permanently delete the team "{project.team.name}" and all associated projects will become personal projects.
                </p>
              </div>
              
              {showDeleteTeamConfirm ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteTeamConfirm(false)}
                    disabled={isDeletingTeam}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteTeam}
                    disabled={isDeletingTeam}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeletingTeam ? 'Deleting...' : 'Confirm Delete Team'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteTeam}
                  disabled={isDeletingTeam}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Team
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}