"use client";

import { X, Calendar, Clock, User, Tag } from "lucide-react";
import { Task, TaskStatus, TaskPriority } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";

interface TaskDetailsModalProps {
  readonly task: Task;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onEdit?: (task: Task) => void;
}

const statusConfig = {
  [TaskStatus.TODO]: {
    label: "To Do",
    color: "bg-muted text-muted-foreground",
    icon: "⏳",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "In Progress",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    icon: "🔄",
  },
  [TaskStatus.DONE]: {
    label: "Done",
    color: "bg-green-500/10 text-green-700 dark:text-green-300",
    icon: "✅",
  },
  [TaskStatus.CANCELLED]: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-700 dark:text-red-300",
    icon: "❌",
  },
};

const priorityConfig = {
  [TaskPriority.LOW]: {
    label: "Low",
    color: "bg-muted text-muted-foreground",
    icon: "🔹",
  },
  [TaskPriority.MEDIUM]: {
    label: "Medium",
    color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
    icon: "🔸",
  },
  [TaskPriority.HIGH]: {
    label: "High",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    icon: "🔶",
  },
  [TaskPriority.URGENT]: {
    label: "Urgent",
    color: "bg-red-500/10 text-red-700 dark:text-red-300",
    icon: "🔴",
  },
};

export function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  onEdit,
}: TaskDetailsModalProps) {
  if (!isOpen) return null;

  const statusInfo = statusConfig[task.status];
  const priorityInfo = priorityConfig[task.priority];
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== TaskStatus.DONE;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="flow-card shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flow-border">
          <h2 className="text-xl font-semibold text-foreground">
            Task Details
          </h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
                Edit Task
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {task.title}
            </h3>
            {isOverdue && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Overdue
              </div>
            )}
          </div>

          {/* Status and Priority */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Status:
              </span>
              <Badge className={statusInfo.color}>
                <span className="mr-1">{statusInfo.icon}</span>
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Priority:
              </span>
              <Badge className={priorityInfo.color}>
                <span className="mr-1">{priorityInfo.icon}</span>
                {priorityInfo.label}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Description
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            </div>
          )}

          {/* Due Date */}
          {task.dueDate && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Due Date
              </h4>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-foreground">
                  {format(new Date(task.dueDate), "PPP")}
                </span>
                <span
                  className={`text-sm ${
                    isOverdue
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  (
                  {formatDistanceToNow(new Date(task.dueDate), {
                    addSuffix: true,
                  })}
                  )
                </span>
              </div>
            </div>
          )}

          {/* Creator */}
          {task.user && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Created by
              </h4>
              <div className="text-sm text-foreground">
                {task.user.name} ({task.user.email})
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t flow-border">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Created
              </h4>
              <div className="text-sm text-foreground">
                {format(new Date(task.createdAt), "PPp")}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                Last Updated
              </h4>
              <div className="text-sm text-foreground">
                {format(new Date(task.updatedAt), "PPp")}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t flow-border bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onEdit && <Button onClick={() => onEdit(task)}>Edit Task</Button>}
        </div>
      </div>
    </div>
  );
}
