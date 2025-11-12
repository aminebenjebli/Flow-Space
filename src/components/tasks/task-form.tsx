"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api/axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X } from "lucide-react";

import {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskDto,
  UpdateTaskDto,
} from "@/types/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTask } from "@/contexts/task-context";
import { toast } from "react-hot-toast";
import WhisperTester from "../speechtotext/whisper-tester";

const taskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title cannot exceed 200 characters"),
  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),
  status: z
    .enum([
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.DONE,
      TaskStatus.CANCELLED,
    ])
    .optional(),
  priority: z
    .enum([
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
      TaskPriority.URGENT,
    ])
    .optional(),
  dueDate: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  readonly task?: Task;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const { createTask, updateTask, isLoading } = useTask();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [prompt, setPrompt] = useState("");
  // debug preview removed

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || TaskStatus.TODO,
      priority: task?.priority || TaskPriority.MEDIUM,
      dueDate: task?.dueDate ? task.dueDate.split("T")[0] : "",
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      });
    }
  }, [task, reset]);

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const taskData = {
        ...data,
        dueDate: data.dueDate
          ? new Date(data.dueDate).toISOString()
          : undefined,
      };

      let success = false;
      if (task) {
        // Update existing task
        const updatedTask = await updateTask(
          task.id,
          taskData as UpdateTaskDto
        );
        success = !!updatedTask;
      } else {
        // Create new task
        const newTask = await createTask(taskData as CreateTaskDto);
        success = !!newTask;
      }

      if (success) {
        onSuccess?.();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Call backend parser and fill form
  const handleParse = async () => {
    if (!prompt || prompt.trim().length === 0) {
      toast.error("Please enter some text to parse");
      return;
    }

    setIsParsing(true);
    try {
      // Use project api wrapper so auth and baseURL are handled
      // Increase timeout for this endpoint as parsing (LLM) can be slow
      const res = await api.post("/tasks/parse", { input: prompt }, { timeout: 30000 });

      // api.post may return wrapped { data, message, ... } or the raw payload depending on backend
      // Normalize to payload
      // @ts-ignore
      const payload = res?.data ?? res;

      if (!payload) throw new Error("Empty parse response");

      // Support title/titre (français) et description
      if (payload.title || payload.titre)
        setValue("title", payload.title ?? payload.titre ?? "");
      if (payload.description)
        setValue("description", payload.description || "");

      if (payload.dueDate) {
        const date = new Date(payload.dueDate);
        if (!isNaN(date.getTime())) {
          const isoDate = date.toISOString().split("T")[0];
          setValue("dueDate", isoDate);
        }
      }

      // Normalize priority/priorite (backend may return lowercase or française)
      const prio = payload.priority ?? payload.priorite;
      if (prio) {
        const p = String(prio).toUpperCase();
        const priorityMap: Record<string, any> = {
          LOW: TaskPriority.LOW,
          MEDIUM: TaskPriority.MEDIUM,
          HIGH: TaskPriority.HIGH,
          URGENT: TaskPriority.URGENT,
          NORMALE: TaskPriority.MEDIUM, // mapping "normale" à "medium"
          NORMAL: TaskPriority.MEDIUM, // mapping "normal" to "medium"
        };
        if (priorityMap[p]) {
          setValue("priority", priorityMap[p]);
        } else {
          // If not found in map, default to MEDIUM
          console.warn(`Unknown priority value: ${prio}, defaulting to MEDIUM`);
          setValue("priority", TaskPriority.MEDIUM);
        }
      }

      // Normalize status if provided
      if (payload.status) {
        const s = String(payload.status).toUpperCase();
        // Map to TaskStatus enum values if they match
        try {
          // @ts-ignore
          const enumVal = s as keyof typeof TaskStatus;
          // @ts-ignore
          if (TaskStatus[enumVal]) setValue("status", TaskStatus[enumVal]);
        } catch (e) {
          // ignore
        }
      }

      toast.success("Form filled from parsed text");
      setPrompt("");
    } catch (error) {
      // Extract better details from axios error
      const err = error as any;
      console.error("Parsing error:", err);
      
      // Check if it's a timeout
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        toast.error("Le parsing a pris trop de temps (timeout). Essaie avec un texte plus court ou réessaye.");
        return;
      }
      
      if (err?.response) {
        console.error(
          "Parser response status:",
          err.response.status,
          err.response.data
        );
        const serverMessage =
          err.response.data?.message ?? JSON.stringify(err.response.data);
        toast.error(`Parse failed (${err.response.status}): ${serverMessage}`);
      } else {
        toast.error(String(err?.message ?? "Failed to parse text"));
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Format text for display in prompt: single-line, collapse spaces
  const formatForDisplay = (s: string) => {
    if (!s) return '';
    return s.replace(/\r\n|\n+/g, ' ').replace(/ {2,}/g, ' ').trim();
  };

  const statusOptions = [
    { value: TaskStatus.TODO, label: "To Do" },
    { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
    { value: TaskStatus.DONE, label: "Done" },
    { value: TaskStatus.CANCELLED, label: "Cancelled" },
  ];

  const priorityOptions = [
    { value: TaskPriority.LOW, label: "Low" },
    { value: TaskPriority.MEDIUM, label: "Medium" },
    { value: TaskPriority.HIGH, label: "High" },
    { value: TaskPriority.URGENT, label: "Urgent" },
  ];

  return (
    <div className="flow-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-card-foreground">
          {task ? "Edit Task" : "Create New Task"}
        </h2>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Parser prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Quick Add</Label>
          {/* Whisper live tester placed above the quick add textarea */}
          <div className="mb-2">
            <WhisperTester
              autoInsert="replace"
              onTranscription={(text: string, opts?: { replace?: boolean }) => {
                // WhisperTester will call this when autoInsert is enabled; ensure we set the prompt accordingly
                const formatted = formatForDisplay(text);
                if (opts?.replace) setPrompt(formatted);
                else
                  setPrompt((p) => (p && p.length > 0 ? `${p} ${formatted}` : formatted));
              }}
            />
          </div>
          <div className="flex items-start space-x-2">
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the task in natural language (e.g. 'Call John tomorrow at 3pm about marketing')."
              rows={2}
            />
            <div className="flex-shrink-0">
              <Button
                type="button"
                onClick={handleParse}
                disabled={isParsing}
                className="whitespace-nowrap"
              >
                {isParsing ? "Parsing..." : "Parse"}
              </Button>
            </div>
          </div>
          {/* Parsed preview / error (debug) */}
          {/* parsed preview removed */}
        </div>
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...register("title")}
            placeholder="Enter task title..."
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Enter task description..."
            rows={3}
            className={errors.description ? "border-destructive" : ""}
          />
          {errors.description && (
            <p className="text-sm text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Status and Priority Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              {...register("status")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              {...register("priority")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            {...register("dueDate")}
            className={errors.dueDate ? "border-destructive" : ""}
          />
          {errors.dueDate && (
            <p className="text-sm text-destructive">{errors.dueDate.message}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="min-w-[100px]"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{task ? "Update" : "Create"}</span>
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
