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
import { Task, TaskStatus, TaskPriority } from "@/types/index";
import { Badge } from "@/components/ui/badge";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api/axios";

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
    createTask,
  } = useTask();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>("grid");
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Fetch AI suggestions from the backend
  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      // This endpoint expects POST with a userId and optional maxSuggestions (see curl)
      const userId =
        (session as any)?.user?.id ||
        (session as any)?.userId ||
        (session as any)?.id;
      const body: any = { maxSuggestions: 3 };
      if (userId) body.userId = userId;

      const res = await api.post("/task-ai/propose-by-user", body);
      const payload = res?.data ?? res;
      const list = payload?.suggestions ?? [];
      setSuggestions(Array.isArray(list) ? list : []);
      setShowSuggestions(true);
      if (!list || list.length === 0) {
        toast("Aucune suggestion trouvée");
      }
    } catch (err: any) {
      console.error(
        "Failed to fetch suggestions:",
        err,
        err?.response?.data ?? err?.message
      );
      // If backend returns 404 for POST, inform the developer to check method/path
      if (err?.response?.status === 404) {
        toast.error(
          "Endpoint introuvable (404). Vérifie l'URL et la méthode (POST attendu)."
        );
      } else {
        toast.error("Impossible de récupérer les suggestions AI");
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const mapPriorityToEnum = (p?: string) => {
    if (!p) return TaskPriority.MEDIUM;
    const s = String(p).toLowerCase();
    if (s.includes("low") || s.includes("basse")) return TaskPriority.LOW;
    if (s.includes("high") || s.includes("haute")) return TaskPriority.HIGH;
    if (s.includes("urgent")) return TaskPriority.URGENT;
    if (s.includes("normal") || s.includes("normale") || s === "normal")
      return TaskPriority.MEDIUM;
    return TaskPriority.MEDIUM;
  };

  const createFromSuggestion = async (s: any) => {
    if (!s || !s.title) {
      toast.error("Suggestion invalide");
      return;
    }

    try {
      const payload: any = {
        title: s.title,
        description: s.description ?? "",
        priority: mapPriorityToEnum(s.priority),
      };

      const created = await createTask(payload);
      if (created) {
        toast.success("Tâche ajoutée depuis la suggestion");
        // refresh tasks and stats
        fetchTasks();
        fetchStats();
        // remove the suggestion from the list
        setSuggestions((prev) => prev.filter((item) => item !== s));
      } else {
        toast.error("La création de la tâche a échoué");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création depuis la suggestion");
    }
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
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground mb-2">
              Task Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Organize and track your tasks efficiently
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <ViewSwitcher
              currentView={currentView}
              onViewChange={setCurrentView}
            />
            <Button onClick={() => setShowCreateForm(true)} className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
            <Button
              variant="outline"
              onClick={fetchSuggestions}
              disabled={loadingSuggestions}
              className="whitespace-nowrap"
            >
              Suggestions AI
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className="flow-card p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-xl sm:text-2xl font-bold text-card-foreground">
                    {stats.total}
                  </p>
                </div>
                <CheckSquare className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
            </div>

            <div className="flow-card p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
                  <p className="text-xl sm:text-2xl font-bold text-card-foreground">
                    {stats.inProgress}
                  </p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </div>

            <div className="flow-card p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-card-foreground">
                    {stats.done}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </div>

            <div className="flow-card p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Overdue</p>
                  <p className="text-xl sm:text-2xl font-bold text-card-foreground">
                    {stats.overdue}
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <TaskFilters />

        {/* Suggestions Panel */}
        {showSuggestions && (
          <div className="flow-card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-medium">Suggestions AI</h3>
                <Badge>{suggestions.length}</Badge>
              </div>
              <div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSuggestions(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>

            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune suggestion pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="border rounded-md p-3 bg-muted">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{s.title}</h4>
                        {s.description && (
                          <p className="text-sm text-muted-foreground">
                            {s.description}
                          </p>
                        )}
                        {s.reason && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {s.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Button
                          size="sm"
                          onClick={() => createFromSuggestion(s)}
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
