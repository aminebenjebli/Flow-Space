"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Task, TaskStatus } from "@/types/index";
import { TaskCard } from "./task-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface KanbanBoardProps {
  readonly tasks: Task[];
  readonly onTaskEdit: (task: Task) => void;
  readonly onTaskSelect: (taskId: string) => void;
  readonly onTaskView: (task: Task) => void;
  readonly selectedTasks: string[];
  readonly onTaskDrop: (taskId: string, newStatus: TaskStatus) => void;
  readonly onCreateTask: () => void;
}

const statusColumns = [
  {
    id: TaskStatus.TODO,
    title: "To Do",
    color: "bg-gray-50 border-gray-200",
    headerColor: "text-gray-700",
    badgeVariant: "secondary" as const,
  },
  {
    id: TaskStatus.IN_PROGRESS,
    title: "In Progress",
    color: "bg-blue-50 border-blue-200",
    headerColor: "text-blue-700",
    badgeVariant: "default" as const,
  },
  {
    id: TaskStatus.DONE,
    title: "Done",
    color: "bg-green-50 border-green-200",
    headerColor: "text-green-700",
    badgeVariant: "default" as const,
  },
  {
    id: TaskStatus.CANCELLED,
    title: "Cancelled",
    color: "bg-red-50 border-red-200",
    headerColor: "text-red-700",
    badgeVariant: "destructive" as const,
  },
];

const KanbanColumn = ({
  column,
  tasks,
  onTaskEdit,
  onTaskSelect,
  onTaskView,
  selectedTasks,
  onCreateTask,
  draggedTask,
}: {
  readonly column: (typeof statusColumns)[0];
  readonly tasks: Task[];
  readonly onTaskEdit: (task: Task) => void;
  readonly onTaskSelect: (taskId: string) => void;
  readonly onTaskView: (task: Task) => void;
  readonly selectedTasks: string[];
  readonly onCreateTask: () => void;
  readonly draggedTask: string | null;
}) => (
  <div className="flex flex-col h-full">
    {/* Column Header */}
    <div className={`flow-card p-4 mb-4 ${column.color}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className={`font-semibold ${column.headerColor}`}>
            {column.title}
          </h3>
          <Badge variant={column.badgeVariant} className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateTask}
          className={`${column.headerColor} hover:bg-white/50`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>

    {/* Column Content */}
    <Droppable droppableId={column.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`flex-1 space-y-3 p-2 rounded-lg transition-colors min-h-[200px] ${
            snapshot.isDraggingOver
              ? "bg-blue-50 border-2 border-blue-300 border-dashed"
              : "bg-gray-50/50"
          }`}
        >
          {tasks.map((task, index) => (
            <Draggable key={task.id} draggableId={task.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`transition-transform ${
                    snapshot.isDragging ? "rotate-3 scale-105 shadow-lg" : ""
                  } ${draggedTask === task.id ? "opacity-50" : ""}`}
                >
                  <TaskCard
                    task={task}
                    onEdit={onTaskEdit}
                    onSelect={onTaskSelect}
                    onView={onTaskView}
                    isSelected={selectedTasks.includes(task.id)}
                    variant="kanban"
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}

          {/* Empty State */}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-sm">No tasks</div>
              <div className="text-xs mt-1">
                Drag tasks here or click + to add
              </div>
            </div>
          )}
        </div>
      )}
    </Droppable>
  </div>
);

export function KanbanBoard({
  tasks,
  onTaskEdit,
  onTaskSelect,
  onTaskView,
  selectedTasks,
  onTaskDrop,
  onCreateTask,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (result: any) => {
    setDraggedTask(result.draggableId);
  };

  const handleDragEnd = (result: DropResult) => {
    setDraggedTask(null);

    if (!result.destination) {
      return;
    }

    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId as TaskStatus;

    // Find the task to get its current status
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) {
      return;
    }

    onTaskDrop(taskId, newStatus);
  };

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
        {statusColumns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              onTaskEdit={onTaskEdit}
              onTaskSelect={onTaskSelect}
              onTaskView={onTaskView}
              selectedTasks={selectedTasks}
              onCreateTask={onCreateTask}
              draggedTask={draggedTask}
            />
          );
        })}
      </div>
    </DragDropContext>
  );
}
