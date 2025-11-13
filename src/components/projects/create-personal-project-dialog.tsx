"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface CreatePersonalProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

export default function CreatePersonalProjectDialog({
  isOpen,
  onClose,
  onProjectCreated,
}: CreatePersonalProjectDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC">("PRIVATE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          // teamId is omitted for personal projects
        }),
      });

      // Check if this is a queued response from service worker (offline mode)
      const responseData = await response.json();

      if (responseData.queued || responseData.success === false) {
        console.log("Project creation queued (offline mode):", responseData);

        // Reset form
        setName("");
        setDescription("");
        setVisibility("PRIVATE");

        // Show success message for offline
        toast.success(
          "Project created offline. It will sync when you're back online."
        );

        // Close dialog and refresh (even though project won't show until sync)
        onClose();
        // Don't call onProjectCreated() yet - wait for sync
        return;
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Session expirée, recharger la page pour déclencher la redirection
          window.location.reload();
          return;
        }
        throw new Error(responseData.message || "Failed to create project");
      }

      // Reset form
      setName("");
      setDescription("");
      setVisibility("PRIVATE");

      // Show success message
      toast.success("Project created successfully!");

      // Notify parent component
      onProjectCreated();
      onClose();
    } catch (error) {
      console.error("Error creating project:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create project"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName("");
      setDescription("");
      setVisibility("PRIVATE");
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-lg shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-card-foreground">
            Create Personal Project
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-card-foreground mb-2"
            >
              Project Name*
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={100}
              disabled={loading}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-card-foreground mb-2"
            >
              Description
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description (optional)"
              className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              maxLength={500}
              disabled={loading}
            />
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="PRIVATE"
                  checked={visibility === "PRIVATE"}
                  onChange={(e) =>
                    setVisibility(e.target.value as "PRIVATE" | "PUBLIC")
                  }
                  className="text-primary focus:ring-primary"
                  disabled={loading}
                />
                <span className="text-sm text-card-foreground">Private</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="PUBLIC"
                  checked={visibility === "PUBLIC"}
                  onChange={(e) =>
                    setVisibility(e.target.value as "PRIVATE" | "PUBLIC")
                  }
                  className="text-primary focus:ring-primary"
                  disabled={loading}
                />
                <span className="text-sm text-card-foreground">Public</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
