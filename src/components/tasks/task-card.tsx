"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  AlertCircle,
  Flag,
  Eye,
} from "lucide-react";
import { Task, TaskStatus, TaskPriority } from "@/types/index";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTask } from "@/contexts/task-context";

interface TaskCardProps {
  readonly task: Task;
  readonly onEdit?: (task: Task) => void;
  readonly onSelect?: (taskId: string) => void;
  readonly isSelected?: boolean;
  readonly variant?: "default" | "kanban";
  readonly onView?: (task: Task) => void;
}

const statusConfig = {
  [TaskStatus.TODO]: {
    icon: Circle,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "To Do",
  },
  [TaskStatus.IN_PROGRESS]: {
    icon: PlayCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    label: "In Progress",
  },
  [TaskStatus.DONE]: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    label: "Done",
  },
  [TaskStatus.CANCELLED]: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    label: "Cancelled",
  },
};

const priorityConfig = {
  [TaskPriority.LOW]: {
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    label: "Low",
  },
  [TaskPriority.MEDIUM]: {
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    label: "Medium",
  },
  [TaskPriority.HIGH]: {
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/20",
    label: "High",
  },
  [TaskPriority.URGENT]: {
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/20",
    label: "Urgent",
  },
};

export function TaskCard({
  task,
  onEdit,
  onSelect,
  isSelected,
  variant = "default",
  onView,
}: TaskCardProps) {
  const { updateTask, deleteTask } = useTask();

  // Safety check for invalid task data
  if (!task?.id) {
    console.error("TaskCard received invalid task:", task);
    return null;
  }

  const statusInfo = statusConfig[task.status];
  const priorityInfo = priorityConfig[task.priority];
  const StatusIcon = statusInfo.icon;

  const handleStatusChange = async (newStatus: TaskStatus) => {
    await updateTask(task.id, { status: newStatus });
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await deleteTask(task.id);
    }
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(task.id);
    }
  };
  
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== TaskStatus.DONE;

  return (
    <button
      className={`flow-card p-4 cursor-pointer transition-all hover:shadow-md text-left w-full ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isOverdue ? "border-l-4 border-l-red-500" : ""} ${
        variant === "kanban" ? "hover:scale-105" : ""
      }`}
      onClick={handleCardClick}
      type="button"
      aria-label={`Task: ${task.title}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <StatusIcon className={`h-5 w-5 ${statusInfo.color} flex-shrink-0`} />
          <h3 className="font-semibold text-card-foreground truncate flex-1 min-w-0">
            {task.title}
          </h3>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            asChild
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onView && (
              <>
                <DropdownMenuItem onClick={() => onView(task)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {task.status !== TaskStatus.DONE && (
              <DropdownMenuItem
                onClick={() => handleStatusChange(TaskStatus.DONE)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Done
              </DropdownMenuItem>
            )}
            {task.status !== TaskStatus.IN_PROGRESS && (
              <DropdownMenuItem
                onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Mark in Progress
              </DropdownMenuItem>
            )}
            {task.status !== TaskStatus.TODO && (
              <DropdownMenuItem
                onClick={() => handleStatusChange(TaskStatus.TODO)}
              >
                <Circle className="h-4 w-4 mr-2" />
                Mark as Todo
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit?.(task)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Badges and Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge
            variant="secondary"
            className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}
          >
            {statusInfo.label}
          </Badge>

          <Badge
            variant="outline"
            className={`${priorityInfo.bgColor} ${priorityInfo.color} border-0`}
          >
            <Flag className="h-3 w-3 mr-1" />
            {priorityInfo.label}
          </Badge>
        </div>

        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {task.dueDate && (
            <div
              className={`flex items-center space-x-1 ${
                isOverdue ? "text-red-600" : ""
              }`}
            >
              {isOverdue && <AlertCircle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(task.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
