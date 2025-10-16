'use client';

import { useState, useEffect } from 'react';
import { getServerSession } from 'next-auth';
import { FolderOpen, Users, Lock, Globe, Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  team: {
    id: string;
    name: string;
  };
  _count?: {
    tasks: number;
  };
}

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [publicProjects, setPublicProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      // Fetch my projects (from user's teams)
      const myProjectsResponse = await fetch('/api/projects/my');
      if (myProjectsResponse.ok) {
        const myData = await myProjectsResponse.json();
        setMyProjects(myData);
      }

      // Fetch public projects
      const publicProjectsResponse = await fetch('/api/projects/public');
      if (publicProjectsResponse.ok) {
        const publicData = await publicProjectsResponse.json();
        setPublicProjects(publicData);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = (projects: Project[]) => {
    if (!searchTerm) return projects;
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.team.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderProject = (project: Project) => (
    <Link key={project.id} href={`/projects/${project.id}`}>
      <div className="flow-card flow-card-hover p-6 cursor-pointer group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {project.team.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.visibility === 'PUBLIC' ? (
              <div title="Public Project">
                <Globe className="h-4 w-4 text-green-500" />
              </div>
            ) : (
              <div title="Private Project">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
          <span>{project._count?.tasks || 0} tasks</span>
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-12 bg-muted rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flow-card p-6">
                  <div className="h-6 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-card-foreground mb-2">
              Projects
            </h1>
            <p className="text-muted-foreground">
              Manage and discover projects across teams
            </p>
          </div>
          <Link
            href="/teams"
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-card-foreground"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('my')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'my'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                My Projects ({myProjects.length})
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'public'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-card-foreground hover:border-border'
                }`}
              >
                <Globe className="h-4 w-4" />
                Public Projects ({publicProjects.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'my' && (
            <>
              {filteredProjects(myProjects).length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="flow-card p-8">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      {searchTerm ? 'No projects found' : 'No projects yet'}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm
                        ? 'Try adjusting your search terms'
                        : 'Create your first project through a team to get started'
                      }
                    </p>
                    <Link
                      href="/teams"
                      className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Link>
                  </div>
                </div>
              ) : (
                filteredProjects(myProjects).map(renderProject)
              )}
            </>
          )}

          {activeTab === 'public' && (
            <>
              {filteredProjects(publicProjects).length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="flow-card p-8">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      {searchTerm ? 'No public projects found' : 'No public projects available'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? 'Try different search terms to find public projects'
                        : 'No teams have made their projects public yet'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                filteredProjects(publicProjects).map(renderProject)
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}