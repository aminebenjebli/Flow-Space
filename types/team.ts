export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  name: string;
  avatar?: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: Date;
  // Support both nested user object and flat properties
  user?: User;
  name?: string;
  email?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  members: TeamMember[];
  projectCount?: number;
  _count?: {
    members: number;
    projects: number;
  };
}

export interface TeamInvite {
  id: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  token: string;
  expiresAt: Date;
  teamId: string;
  team: Team;
}

export type ProjectVisibility = 'PUBLIC' | 'PRIVATE';

export interface Project {
  id: string;
  name: string;
  description?: string;
  visibility: ProjectVisibility;
  ownerId: string;
  teamId?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  owner?: User;
  team?: Team | null;
  taskCount?: number;
  _count?: {
    tasks: number;
  };
}

export interface CreateProjectData {
  name: string;
  description?: string;
  visibility?: ProjectVisibility;
  teamId?: string;
}

export interface UpdateProjectSettingsData {
  visibility?: ProjectVisibility;
  teamId?: string | null;
}

export interface ProjectInviteData {
  email: string;
  role?: 'ADMIN' | 'MEMBER';
}