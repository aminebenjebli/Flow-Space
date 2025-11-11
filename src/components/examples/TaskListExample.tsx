/**
 * Example: Task List Component with Sync Status
 *
 * Shows how to display tasks with sync status indicators
 * and handle offline scenarios in the UI
 */

"use client";

import React from "react";
import { useTask } from "@/contexts/task-context-migrated-example";
import {
  SyncStatusBadge,
  SyncIndicator,
} from "@/components/ui/SyncStatusBadge";
import type { TaskEntity } from "@/lib/db/dexie-db";
import { Button } from "@/components/ui/button";

export function TaskListExample() {
  const {
    tasks,
    isOnline,
    createTask,
    updateTask,
    deleteTask,
    syncNow,
    isLoading,
  } = useTask();

  const [newTaskTitle, setNewTaskTitle] = React.useState("");

  const handleCreate = async () => {
    if (!newTaskTitle.trim()) return;

    await createTask({
      title: newTaskTitle,
      priority: "MEDIUM",
      status: "TODO",
    });

    setNewTaskTitle("");
  };

  const handleToggleStatus = async (task: TaskEntity) => {
    const newStatus = task.status === "TODO" ? "DONE" : "TODO";
    await updateTask(task.clientId, { status: newStatus });
  };

  const handleDelete = async (task: TaskEntity) => {
    // Warn if not synced yet
    if (task.syncStatus !== "synced") {
      const confirmed = globalThis.confirm(
        "This task hasn't synced to the server yet. Delete anyway?"
      );
      if (!confirmed) return;
    }

    await deleteTask(task.clientId);
  };

  // Group tasks by sync status
  const pendingTasks = tasks.filter((t) => t.syncStatus === "pending");
  const errorTasks = tasks.filter((t) => t.syncStatus === "error");
  const conflictTasks = tasks.filter((t) => t.syncStatus === "conflict");

  const getTaskBorderColor = (task: TaskEntity): string => {
    if (task.status === "DONE") return "border-green-500";
    if (task.syncStatus === "error") return "border-red-500";
    if (task.syncStatus === "conflict") return "border-orange-500";
    if (task.syncStatus === "pending") return "border-yellow-500";
    return "border-blue-500";
  };

  const getPriorityClass = (priority: string): string => {
    if (priority === "HIGH") return "bg-red-100 text-red-800";
    if (priority === "MEDIUM") return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header with Network Status */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>

        <div className="flex items-center gap-3">
          {/* Online/Offline Indicator */}
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isOnline
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {isOnline ? "🟢 Online" : "🔴 Offline"}
          </div>

          {/* Manual Sync Button */}
          {isOnline && pendingTasks.length > 0 && (
            <Button onClick={syncNow} variant="outline" size="sm">
              🔄 Sync ({pendingTasks.length})
            </Button>
          )}
        </div>
      </div>

      {/* Sync Status Alerts */}
      {errorTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">
            ⚠️ {errorTasks.length} task{errorTasks.length > 1 ? "s" : ""} failed
            to sync
          </p>
          <p className="text-red-600 text-sm mt-1">
            Check your connection and try syncing again
          </p>
        </div>
      )}

      {conflictTasks.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-orange-800 font-medium">
            ⚠️ {conflictTasks.length} task
            {conflictTasks.length > 1 ? "s have" : " has"} conflicts
          </p>
          <p className="text-orange-600 text-sm mt-1">
            Server data is newer than your local changes
          </p>
        </div>
      )}

      {!isOnline && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">📴 Working offline</p>
          <p className="text-blue-600 text-sm mt-1">
            Changes will sync automatically when you're back online
          </p>
        </div>
      )}

      {/* Create Task Form */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="What needs to be done?"
            className="flex-1 px-3 py-2 border rounded"
          />
          <Button onClick={handleCreate} disabled={isLoading}>
            Add Task
          </Button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No tasks yet</p>
            <p className="text-sm">Create one to get started!</p>
          </div>
        ) : (
          tasks.map((task) => {
            const borderColor = getTaskBorderColor(task);

            return (
              <div
                key={task.clientId}
                className={`bg-white rounded-lg shadow p-4 border-l-4 ${borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Task Title with Sync Indicator */}
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-lg font-medium ${
                          task.status === "DONE"
                            ? "line-through text-gray-500"
                            : ""
                        }`}
                      >
                        {task.title}
                      </h3>
                      <SyncIndicator status={task.syncStatus} />
                    </div>

                    {/* Task Metadata */}
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                      <span className={getPriorityClass(task.priority)}>
                        {task.priority}
                      </span>

                      <span className="text-xs text-gray-500">
                        {task.id
                          ? `ID: ${task.id}`
                          : `Client: ${task.clientId.slice(0, 8)}...`}
                      </span>

                      {/* Sync Status Badge */}
                      <SyncStatusBadge status={task.syncStatus} size="sm" />
                    </div>

                    {/* Conflict Details */}
                    {task.conflictData && (
                      <div className="mt-2 p-2 bg-orange-50 rounded text-sm">
                        <p className="text-orange-800 font-medium">
                          Conflict Details:
                        </p>
                        <p className="text-orange-700 text-xs mt-1">
                          Local: Updated{" "}
                          {new Date(task.updatedAt).toLocaleString()}
                        </p>
                        <p className="text-orange-700 text-xs">
                          Server: Updated{" "}
                          {new Date(
                            task.conflictData.server.updatedAt
                          ).toLocaleString()}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            className="px-2 py-1 bg-orange-600 text-white rounded text-xs"
                            onClick={() => {
                              // Future: Keep local changes
                              alert("Keep Local - Not implemented yet");
                            }}
                          >
                            Keep Local
                          </button>
                          <button
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                            onClick={() => {
                              // Future: Accept server version
                              alert("Accept Server - Not implemented yet");
                            }}
                          >
                            Accept Server
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error Details */}
                    {task.syncStatus === "error" && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                        <p className="font-medium">Sync Error</p>
                        <p className="text-xs">
                          This task couldn't be synced to the server
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleToggleStatus(task)}
                      variant="outline"
                      size="sm"
                    >
                      {task.status === "TODO" ? "✓" : "↩"}
                    </Button>
                    <Button
                      onClick={() => handleDelete(task)}
                      variant="destructive"
                      size="sm"
                    >
                      🗑
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{tasks.length}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">
              {pendingTasks.length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {errorTasks.length}
            </p>
            <p className="text-sm text-gray-600">Errors</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {conflictTasks.length}
            </p>
            <p className="text-sm text-gray-600">Conflicts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskListExample;
