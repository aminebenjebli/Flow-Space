"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskFilters } from "@/components/tasks/task-filters";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { ViewSwitcher } from "@/components/tasks/view-switcher";
import { TaskDetailsModal } from "@/components/tasks/task-details-modal";
import { Modal } from "@/components/ui/modal";
import { useTask } from "@/contexts/task-context";
import { Task, TaskStatus } from "@/types/index";

type ViewType = "grid" | "kanban";

interface ProjectTasksManagerProps {
  projectId: string;
  projectName: string;
  isProjectAdmin?: boolean;
}

export function ProjectTasksManager({ 
  projectId, 
  projectName, 
  isProjectAdmin = false 
}: ProjectTasksManagerProps) {
  const { data: session } = useSession();
  const {
    tasks,
    stats,
    isLoading,
    pagination,
    filters,
    fetchTasks,
    fetchStats,
    setFilters,
    bulkUpdateStatus,
  } = useTask();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>("grid");
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Fetch tasks for this specific project
  useEffect(() => {
    if (session && projectId) {
      // The projectId will be handled by the TaskContext when fetching
      // We just need to trigger the fetch
      fetchTasks();
      fetchStats();
    }
  }, [session, projectId]);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleBulkStatusUpdate = async (status: TaskStatus) => {
    if (selectedTasks.length === 0) return;

    const success = await bulkUpdateStatus({
      taskIds: selectedTasks,
      status,
    });

    if (success) {
      setSelectedTasks([]);
      fetchStats();
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map((task) => task.id));
    }
  };

  const handleTaskDrop = async (taskId: string, newStatus: TaskStatus) => {
    await bulkUpdateStatus({
      taskIds: [taskId],
      status: newStatus,
    });
    fetchStats();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingTask(null);
  };

  const handleTaskCreated = () => {
    fetchTasks();
    fetchStats();
    handleCloseForm();
  };

  const handleViewTask = (task: Task) => {
    setViewingTask(task);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
    fetchStats();
    setViewingTask(null);
  };

  const handleTaskDeleted = () => {
    fetchTasks();
    fetchStats();
    setViewingTask(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Manage tasks for {projectName}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <ViewSwitcher currentView={currentView} onViewChange={setCurrentView} />
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>
      </div>


      {/* Filters */}
      <TaskFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        hideProjectFilter={true} // Hide project filter since we're already in a project context
      />

      {/* Bulk Actions */}
      {selectedTasks.length > 0 && (
        <div className="flow-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusUpdate("TODO" as TaskStatus)}
              >
                Mark Todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusUpdate("DONE" as TaskStatus)}
              >
                Mark Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTasks([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Display */}
      {currentView === "grid" ? (
        <div className="space-y-4">
          {/* Select All */}
          {tasks.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center space-x-2"
              >
                <CheckSquare className="h-4 w-4" />
                <span>
                  {selectedTasks.length === tasks.length ? 'Deselect All' : 'Select All'}
                </span>
              </Button>
            </div>
          )}

          {/* Task Grid */}
          {tasks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isSelected={selectedTasks.includes(task.id)}
                  onSelect={handleTaskSelect}
                  onEdit={handleEditTask}
                  onView={handleViewTask}
                />
              ))}
            </div>
          ) : (
            <div className="flow-card p-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first task to get started with this project.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          )}
        </div>
      ) : (
        <KanbanBoard
          tasks={tasks}
          onTaskDrop={handleTaskDrop}
          onTaskEdit={handleEditTask}
          onTaskView={handleViewTask}
          onTaskSelect={handleTaskSelect}
          selectedTasks={selectedTasks}
          onCreateTask={() => setShowCreateForm(true)}
        />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ ...filters, page: Math.max(1, (filters.page || 1) - 1) })}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ ...filters, page: Math.min(pagination.totalPages, (filters.page || 1) + 1) })}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Task Form Modal */}
      <Modal isOpen={showCreateForm} onClose={handleCloseForm} title={editingTask ? "Edit Task" : "Create Task"}>
        <TaskForm
          task={editingTask || undefined}
          onSuccess={handleTaskCreated}
          onCancel={handleCloseForm}
        />
      </Modal>

      {/* Task Details Modal */}
      {viewingTask && (
        <TaskDetailsModal
          task={viewingTask}
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
        />
      )}
    </div>
  );
}