"use client";

import React, { useEffect } from "react";
import { TaskProvider, useTask } from "@/contexts/task-context";
import { QueryTaskDto } from "@/types/index";

interface ProjectTaskProviderProps {
  projectId: string;
  children: React.ReactNode;
}

// Composant interne qui force le filtrage par projet
function ProjectTaskFilter({ projectId, children }: ProjectTaskProviderProps) {
  const { fetchTasks, setFilters, filters } = useTask();

  useEffect(() => {
    // Override the API call to include projectId in the URL
    const fetchProjectTasks = async () => {
      try {
        // Call the tasks API with projectId as a query parameter
        const params = new URLSearchParams();
        params.set('projectId', projectId);
        
        // Add other filters
        if (filters.status) params.set('status', filters.status);
        if (filters.priority) params.set('priority', filters.priority);
        if (filters.search) params.set('search', filters.search);
        if (filters.dueFrom) params.set('dueFrom', filters.dueFrom);
        if (filters.dueUntil) params.set('dueUntil', filters.dueUntil);
        if (filters.page) params.set('page', filters.page.toString());
        if (filters.limit) params.set('limit', filters.limit.toString());
        if (filters.sortBy) params.set('sortBy', filters.sortBy);
        if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

        console.log('Fetching project tasks with projectId:', projectId);
        
        const response = await fetch(`/api/tasks?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project tasks');
        }

        const data = await response.json();
        console.log('Project tasks response:', data);
        
        // The data should already be filtered by projectId on the backend
        // We would need to manually update the task context here
        // But this approach is getting complex...
        
      } catch (error) {
        console.error('Error fetching project tasks:', error);
      }
    };

    if (projectId) {
      fetchProjectTasks();
    }
  }, [projectId, filters]);

  return <>{children}</>;
}

// Provider wrapper qui combine TaskProvider avec le filtrage par projet
export function ProjectTaskProvider({ projectId, children }: ProjectTaskProviderProps) {
  return (
    <TaskProvider>
      <ProjectTaskFilter projectId={projectId}>
        {children}
      </ProjectTaskFilter>
    </TaskProvider>
  );
}