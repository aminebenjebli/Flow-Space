/**
 * Example: Offline Project Integration
 *
 * This example shows how to use the OfflineProjectProvider and useOfflineProject hook
 * in your application to manage projects with offline support.
 */

"use client";

import React, { useEffect } from "react";
import {
  OfflineProjectProvider,
  useOfflineProject,
} from "@/contexts/offline-project-context";
import { CreateProjectData, ProjectVisibility } from "@/types/team";

// Example: Projects List Component
function ProjectsList() {
  const {
    projects,
    isLoading,
    isOffline,
    isSyncing,
    fetchProjects,
    deleteProject,
  } = useOfflineProject();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      await deleteProject(id);
    }
  };

  if (isLoading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div>
      {isOffline && (
        <div className="bg-yellow-100 p-2 mb-4">
          ⚠️ You're offline. Changes will sync when you're back online.
        </div>
      )}

      {isSyncing && (
        <div className="bg-blue-100 p-2 mb-4">🔄 Syncing projects...</div>
      )}

      <h2>Projects ({projects.length})</h2>

      <div className="space-y-2">
        {projects.map((project) => (
          <div key={project.id} className="border p-4 rounded">
            <h3 className="font-bold">{project.name}</h3>
            {project.description && (
              <p className="text-sm">{project.description}</p>
            )}
            <div className="mt-2 flex gap-2">
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                {project.visibility}
              </span>
              {project.team && (
                <span className="text-xs bg-blue-200 px-2 py-1 rounded">
                  Team: {project.team.name}
                </span>
              )}
            </div>
            <button
              onClick={() => handleDelete(project.id)}
              className="mt-2 text-red-600 text-sm"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example: Create Project Form
function CreateProjectForm() {
  const { createProject, isLoading } = useOfflineProject();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] =
    React.useState<ProjectVisibility>("PRIVATE");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const projectData: CreateProjectData = {
      name,
      description,
      visibility,
    };

    const newProject = await createProject(projectData);

    if (newProject) {
      // Reset form
      setName("");
      setDescription("");
      setVisibility("PRIVATE");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-bold">Create New Project</h3>

      <div>
        <label className="block text-sm font-medium">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded border p-2"
          placeholder="Project name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded border p-2"
          placeholder="Project description (optional)"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Visibility</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as ProjectVisibility)}
          className="mt-1 block w-full rounded border p-2"
        >
          <option value="PRIVATE">Private</option>
          <option value="PUBLIC">Public</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {isLoading ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
}

// Example: Main Page Component
export function OfflineProjectsPage() {
  return (
    <OfflineProjectProvider>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Projects (Offline-Enabled)</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CreateProjectForm />
          </div>

          <div>
            <ProjectsList />
          </div>
        </div>
      </div>
    </OfflineProjectProvider>
  );
}

// Example: Update Project
function UpdateProjectExample() {
  const { updateProject } = useOfflineProject();

  const handleUpdateVisibility = async (projectId: string) => {
    await updateProject(projectId, {
      visibility: "PUBLIC",
    });
  };

  const handleUpdateName = async (projectId: string, newName: string) => {
    await updateProject(projectId, {
      name: newName,
    });
  };

  return null; // This is just an example function
}

// Example: Using in App Layout
export function AppWithOfflineProjects() {
  return (
    <OfflineProjectProvider>
      {/* Your app content here */}
      <ProjectsList />
    </OfflineProjectProvider>
  );
}
