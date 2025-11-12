"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Team, Project } from '@/types/team';
import { Users, FolderOpen, Info, Plus, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { MemberList } from '@/components/teams/member-list';
import { InviteMemberForm } from '@/components/teams/invite-member-form';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { TeamDashboard } from '@/components/teams/team-dashboard';
import { TeamSettings } from '@/components/teams/team-settings';
import { LeaveTeamModal } from '@/components/teams/leave-team-modal';

interface TabsProps {
  team: Team;
  projects: Project[];
  canManageTeam: boolean;
  userRole?: string;
}

export function Tabs({ team, projects, canManageTeam, userRole }: TabsProps) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Debug logs (can be removed in production)
  console.log('Tabs Debug:', {
    canManageTeam,
    userRole,
    teamMembersLength: team.members?.length,
    activeTab,
    showInviteButton: canManageTeam,
    showSettingsTab: canManageTeam && userRole === 'OWNER'
  });

  // Handle URL parameters
  useEffect(() => {
    const tab = searchParams.get('tab');
    const invite = searchParams.get('invite');
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (invite === 'true' && canManageTeam) {
      setActiveTab('members');
      setShowInviteForm(true);
    }
  }, [searchParams, canManageTeam]);

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
              }`}
            >
              <Users className="h-4 w-4" />
              Members ({team.members?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'projects'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Projects ({projects.length})
            </button>
            {(canManageTeam && (userRole === 'OWNER' || userRole === 'ADMIN')) && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flow-card p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">Team Information</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {team.description || 'No description provided'}
            </p>
            <p className="text-xs text-muted-foreground">
              Created on {new Date(team.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flow-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-card-foreground">Members</h3>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {team.members?.length || 0}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Active team members
              </p>
              {canManageTeam && (
                <button
                  onClick={() => {
                    setActiveTab('members');
                    setShowInviteForm(true);
                  }}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  + Add Member
                </button>
              )}
            </div>
          </div>

          <div className="flow-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-card-foreground">Projects</h3>
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">
              {projects.length}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Active projects
            </p>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div>
          <TeamDashboard teamId={team.id} />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Members</h3>
            {canManageTeam && (
              <button 
                onClick={() => setShowInviteForm(!showInviteForm)}
                className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                {userRole === 'OWNER' ? 'Invite Member' : 'Add Member'}
              </button>
            )}
          </div>

          {canManageTeam && showInviteForm && (
            <div className="flow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-card-foreground">Invite Member</h3>
                <button 
                  onClick={() => setShowInviteForm(false)}
                  className="text-muted-foreground hover:text-card-foreground"
                >
                  ✕
                </button>
              </div>
              <InviteMemberForm teamId={team.id} />
            </div>
          )}

          <div className="flow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Team Members</h3>
            </div>
            <MemberList 
              members={team.members || []} 
              teamId={team.id}
              canManage={canManageTeam}
            />
          </div>

          {/* Leave Team Section - for non-owners */}
          {userRole !== 'OWNER' && (
            <LeaveTeamModal 
              teamId={team.id} 
              teamName={team.name}
              userRole={userRole}
            />
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-card-foreground">Projects</h3>
            <CreateProjectDialog teamId={team.id} />
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="flow-card p-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  No projects yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create your first project to start organizing tasks
                </p>
                <CreateProjectDialog teamId={team.id} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flow-card flow-card-hover p-6 cursor-pointer group">
                    <h4 className="text-lg font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                      {project.name}
                    </h4>
                    {project.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                      <span>{project.taskCount ?? project._count?.tasks ?? 0} tasks</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (canManageTeam && userRole === 'OWNER') && (
        <div>
          <TeamSettings team={team} userRole={userRole} canManageTeam={canManageTeam} />
        </div>
      )}
    </div>
  );
}