"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Avatar, AvatarFallback } from '@/components/ui';
import { 
  Users, 
  FolderOpen, 
  CheckSquare, 
  Clock, 
  TrendingUp,
  Activity,
  AlertCircle
} from 'lucide-react';

interface TeamActivity {
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    project?: {
      id: string;
      name: string;
    };
  }>;
  memberStats: Array<{
    userId: string;
    name: string;
    email: string;
    role: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    completionRate: number;
  }>;
  projectStats: Array<{
    id: string;
    name: string;
    taskCount: number;
  }>;
  teamSummary: {
    totalMembers: number;
    totalProjects: number;
    totalTasks: number;
    completedTasks: number;
  };
}

interface TeamDashboardProps {
  teamId: string;
}

export function TeamDashboard({ teamId }: TeamDashboardProps) {
  const [activity, setActivity] = useState<TeamActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const response = await fetch(`/api/teams/${teamId}/activity`);
        if (!response.ok) {
          throw new Error('Failed to fetch team activity');
        }
        const data = await response.json();
        setActivity(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [teamId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !activity) {
    return (
      <Card className="mb-8">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-muted-foreground">{error || 'Failed to load team activity'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-gray-500';
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'DONE': return 'bg-green-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const completionRate = activity.teamSummary.totalTasks > 0 
    ? Math.round((activity.teamSummary.completedTasks / activity.teamSummary.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Team Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activity.teamSummary.totalMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activity.teamSummary.totalProjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activity.teamSummary.totalTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {activity.teamSummary.completedTasks} of {activity.teamSummary.totalTasks} tasks
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest task updates from team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.recentTasks.length > 0 ? (
                activity.recentTasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="flex items-center space-x-3 py-2 border-b border-border last:border-b-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {task.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(task.status)}`}></div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.user.name}</span>
                        {task.project && (
                          <>
                            <span>•</span>
                            <span>{task.project.name}</span>
                          </>
                        )}
                        <span>•</span>
                        <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Member Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Performance
            </CardTitle>
            <CardDescription>
              Task completion statistics by team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity.memberStats.map((member) => (
                <div key={member.userId} className="flex items-center space-x-3 py-3 border-b border-border last:border-b-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{member.name}</p>
                      <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'} className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Total: {member.totalTasks}</span>
                      <span>Done: {member.completedTasks}</span>
                      <span>In Progress: {member.inProgressTasks}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{member.completionRate}%</div>
                    <div className="text-xs text-muted-foreground">completion</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Statistics */}
      {activity.projectStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Project Overview
            </CardTitle>
            <CardDescription>
              Task distribution across projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activity.projectStats.map((project) => (
                <div key={project.id} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2 truncate">{project.name}</h4>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Tasks</span>
                    <span className="font-medium">{project.taskCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}