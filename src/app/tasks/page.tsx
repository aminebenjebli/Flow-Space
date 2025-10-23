"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  TrendingUp,
  Menu,
  X,
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

export default function TasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      fetchTasks();
      fetchStats();
    }
  }, [status, router, fetchTasks, fetchStats]);

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
      fetchStats(); // Refresh stats
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
    fetchStats(); // Refresh stats
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowCreateForm(true);
  };

  const handleViewTask = (task: Task) => {
    setViewingTask(task);
  };

  const handleFormSuccess = () => {
    setShowCreateForm(false);
    setEditingTask(null);
    fetchTasks();
    fetchStats();
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
    setEditingTask(null);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-1">
                Task Management
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Organize and track your tasks efficiently
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="sm:hidden">
                <button
                  aria-label="Toggle menu"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="p-2 rounded-md"
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-4">
                <ViewSwitcher
                  currentView={currentView}
                  onViewChange={setCurrentView}
                />
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="mt-4 flex flex-col gap-2 sm:hidden">
              <ViewSwitcher
                currentView={currentView}
                onViewChange={setCurrentView}
              />
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="flow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {stats.total}
                  </p>
                </div>
                <CheckSquare className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="flow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {stats.inProgress}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="flow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {stats.done}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="flow-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {stats.overdue}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <TaskFilters />

        {/* Bulk Actions Toolbar */}
        {selectedTasks.length > 0 && (
          <div className="flow-card p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedTasks.length} task
                  {selectedTasks.length === 1 ? "" : "s"} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  {selectedTasks.length === tasks.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-700">Update Status:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(TaskStatus.TODO)}
                  className="text-gray-700 border-gray-300 hover:bg-gray-100"
                >
                  To Do
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(TaskStatus.IN_PROGRESS)}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  In Progress
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(TaskStatus.DONE)}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  Done
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate(TaskStatus.CANCELLED)}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  Cancelled
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTasks([])}
                  className="text-gray-500 border-gray-300 hover:bg-gray-100"
                >
                  ✕ Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Grid */}
        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading tasks...
              </p>
            </div>
          )}

          {!isLoading && tasks.length === 0 && (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                No tasks found
              </h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.status
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first task"}
              </p>
              {!filters.search && !filters.status && (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Task
                </Button>
              )}
            </div>
          )}

          {!isLoading && tasks.length > 0 && (
            <>
              {currentView === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks
                    .filter((task) => task?.id)
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={handleEditTask}
                        onSelect={handleTaskSelect}
                        onView={handleViewTask}
                        isSelected={selectedTasks.includes(task.id)}
                      />
                    ))}
                </div>
              ) : (
                <KanbanBoard
                  tasks={tasks.filter((task) => task?.id)}
                  onTaskEdit={handleEditTask}
                  onTaskSelect={handleTaskSelect}
                  onTaskView={handleViewTask}
                  selectedTasks={selectedTasks}
                  onTaskDrop={handleTaskDrop}
                  onCreateTask={() => setShowCreateForm(true)}
                />
              )}
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && currentView === "grid" && (
          <div className="flex items-center justify-center mt-8 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => {
                const newFilters = { ...filters, page: pagination.page - 1 };
                setFilters(newFilters);
                fetchTasks(newFilters);
              }}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => {
                const newFilters = { ...filters, page: pagination.page + 1 };
                setFilters(newFilters);
                fetchTasks(newFilters);
              }}
            >
              Next
            </Button>
          </div>
        )}

        {/* Task Creation/Edit Modal */}
        <Modal
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          title={editingTask ? "Edit Task" : "Create New Task"}
          size="lg"
        >
          <TaskForm
            task={editingTask || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </Modal>

        {/* Task Details Modal */}
        <TaskDetailsModal
          isOpen={!!viewingTask}
          task={viewingTask!}
          onClose={() => setViewingTask(null)}
          onEdit={(task) => {
            setViewingTask(null);
            setEditingTask(task);
            setShowCreateForm(true);
          }}
        />
      </div>
    </div>
  );
}
