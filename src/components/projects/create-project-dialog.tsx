"use client";

import { useState } from "react";
import { Plus, Globe, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProject } from "@/app/(protected)/projects/actions";
import { ProjectVisibility, Team } from "@/types/team";

interface CreateProjectDialogProps {
  teamId?: string;
  userTeams?: Team[];
}

export function CreateProjectDialog({ teamId, userTeams = [] }: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    visibility: "PRIVATE" as ProjectVisibility,
    teamId: teamId || "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createProject({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        visibility: formData.visibility,
        teamId: formData.teamId || undefined,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setIsOpen(false);
        setFormData({ 
          name: "", 
          description: "", 
          visibility: "PRIVATE",
          teamId: teamId || "",
        });
      }
    } catch (error) {
      // If it's a redirect error (success), don't show as error
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        // This is actually a success - the redirect will happen
        setIsOpen(false);
        setFormData({ 
          name: "", 
          description: "", 
          visibility: "PRIVATE",
          teamId: teamId || "",
        });
        return;
      }
      setError("Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create New Project"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter project name"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your project (optional)"
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground resize-none"
            />
          </div>

          {/* Visibility Selection */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Project Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, visibility: 'PRIVATE' }))}
                disabled={isLoading}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  formData.visibility === 'PRIVATE'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-gray-50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4" />
                  <span className="font-medium">Private</span>
                </div>
                <p className="text-xs">Only team members can view</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, visibility: 'PUBLIC' }))}
                disabled={isLoading}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  formData.visibility === 'PUBLIC'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:bg-gray-50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Public</span>
                </div>
                <p className="text-xs">Anyone can view</p>
              </button>
            </div>
          </div>

          {/* Team Selection */}
          {!teamId && userTeams.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Team Assignment (Optional)
              </label>
              <Select 
                value={formData.teamId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, teamId: value }))}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team or leave as personal project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <div className="flex items-center gap-2">
                      <span>Personal Project</span>
                    </div>
                  </SelectItem>
                  {userTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {team.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div className="text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}