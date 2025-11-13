"use client";

import { useState, useMemo } from "react";
import {
  FolderOpen,
  Users,
  Lock,
  Globe,
  Plus,
  Search,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import CreatePersonalProjectDialog from "@/components/projects/create-personal-project-dialog";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  team?: {
    id: string;
    name: string;
  } | null;
  taskCount?: number;
  _count?: {
    tasks: number;
  };
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ProjectsClientProps {
  initialMyProjects: Project[];
  initialPublicProjects: Project[];
  initialPublicMeta?: PaginationMeta;
}

export default function ProjectsClient({
  initialMyProjects,
  initialPublicProjects,
  initialPublicMeta,
}: ProjectsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"my" | "public">("my");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Pagination state for public projects
  const [publicProjects, setPublicProjects] = useState(initialPublicProjects);
  const [publicMeta, setPublicMeta] = useState(initialPublicMeta);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Memoize filtered projects for better performance
  const filteredMyProjects = useMemo(() => {
    if (!searchTerm) return initialMyProjects;
    const search = searchTerm.toLowerCase();
    return initialMyProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(search) ||
        project.description?.toLowerCase().includes(search) ||
        project.team?.name.toLowerCase().includes(search)
    );
  }, [initialMyProjects, searchTerm]);

  const filteredPublicProjects = useMemo(() => {
    if (!searchTerm) return publicProjects;
    const search = searchTerm.toLowerCase();
    return publicProjects.filter(
      (project) =>
        project.name.toLowerCase().includes(search) ||
        project.description?.toLowerCase().includes(search) ||
        project.team?.name.toLowerCase().includes(search)
    );
  }, [publicProjects, searchTerm]);

  const handleProjectCreated = () => {
    // Refresh the page data
    router.refresh();
  };

  const handleProjectHover = (projectId: string) => {
    // Prefetch the project page on hover for instant navigation
    router.prefetch(`/projects/${projectId}`);
  };

  const loadMorePublicProjects = async () => {
    if (!publicMeta?.hasNextPage || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = publicMeta.page + 1;
      const response = await fetch(
        `/api/projects/public?page=${nextPage}&limit=${publicMeta.limit}`
      );

      if (response.ok) {
        const data = await response.json();
        setPublicProjects((prev) => [...prev, ...data.data]);
        setPublicMeta(data.meta);
      }
    } catch (error) {
      console.error("Failed to load more public projects:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const renderProject = (project: Project) => (
    <Link
      key={project.id}
      href={`/projects/${project.id}`}
      onMouseEnter={() => handleProjectHover(project.id)}
    >
      <div className="flow-card flow-card-hover p-6 cursor-pointer group transition-all duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {project.team?.name || "Personal Project"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.visibility === "PUBLIC" ? (
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
          <span>{project.taskCount ?? project._count?.tasks ?? 0} tasks</span>
          <span>{new Date(project.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-2">
              Projects
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage and discover projects across teams
            </p>
          </div>
          <button
            onClick={() => setIsCreateDialogOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-card-foreground transition-all"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 sm:mb-8">
          <div className="border-b border-border overflow-x-auto">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max sm:min-w-0">
              <button
                onClick={() => setActiveTab("my")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === "my"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-card-foreground hover:border-border"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                My Projects ({filteredMyProjects.length})
              </button>
              <button
                onClick={() => setActiveTab("public")}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === "public"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-card-foreground hover:border-border"
                }`}
              >
                <Globe className="h-4 w-4" />
                Public Projects (
                {publicMeta
                  ? `${filteredPublicProjects.length} of ${publicMeta.total}`
                  : filteredPublicProjects.length}
                )
              </button>
            </nav>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {activeTab === "my" && (
            <>
              {filteredMyProjects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="flow-card p-8">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      {searchTerm ? "No projects found" : "No projects yet"}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "Create your first personal project or join a team to get started"}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Personal Project
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                filteredMyProjects.map(renderProject)
              )}
            </>
          )}

          {activeTab === "public" && (
            <>
              {filteredPublicProjects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <div className="flow-card p-8">
                    <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      {searchTerm
                        ? "No public projects found"
                        : "No public projects available"}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? "Try different search terms to find public projects"
                        : "No teams have made their projects public yet"}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {filteredPublicProjects.map(renderProject)}
                  {/* Load More Button */}
                  {publicMeta && publicMeta.hasNextPage && !searchTerm && (
                    <div className="col-span-full flex justify-center mt-4">
                      <button
                        onClick={loadMorePublicProjects}
                        disabled={isLoadingMore}
                        className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load More (
                            {publicMeta.total - filteredPublicProjects.length}{" "}
                            remaining)
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <CreatePersonalProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
