"use client";

import { useState } from "react";
import { Plus, X, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeam, createTeamWithMembers, inviteMember } from "@/app/(protected)/teams/actions";
import { toast } from "react-hot-toast";

interface TeamMember {
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

export function CreateTeamDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [initialMembers, setInitialMembers] = useState<TeamMember[]>([]);
  const [currentMember, setCurrentMember] = useState<TeamMember>({
    email: "",
    role: "MEMBER"
  });
  const [error, setError] = useState("");

  const addMember = () => {
    if (!currentMember.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (initialMembers.some(member => member.email === currentMember.email)) {
      toast.error("Member already added");
      return;
    }

    setInitialMembers(prev => [...prev, currentMember]);
    setCurrentMember({ email: "", role: "MEMBER" });
    toast.success("Member added to invitation list");
  };

  const removeMember = (email: string) => {
    setInitialMembers(prev => prev.filter(member => member.email !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.name.trim()) {
      setError("Team name is required");
      return;
    }

    setIsLoading(true);

    try {
      // Use the appropriate function based on whether we have initial members
      const result = initialMembers.length > 0 
        ? await createTeamWithMembers({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            initialMembers: initialMembers,
          })
        : await createTeam({
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
          });

      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // If team was created successfully and we have initial members, invite them
      if (initialMembers.length > 0) {
        toast.success(`Team created! Sending invitations to ${initialMembers.length} members...`);
        
        // Note: The team creation will redirect, but we can show a message about invitations
        // In a real implementation, you might want to handle this on the server side
        // or in the success callback after redirect
      }

      // Reset form
      setIsOpen(false);
      setFormData({ name: "", description: "" });
      setInitialMembers([]);
      setCurrentMember({ email: "", role: "MEMBER" });

    } catch (error) {
      // If it's a redirect error (success), don't show as error
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        // This is actually a success - the redirect will happen
        setIsOpen(false);
        setFormData({ name: "", description: "" });
        setInitialMembers([]);
        setCurrentMember({ email: "", role: "MEMBER" });
        return;
      }
      setError("Failed to create team");
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Create Team
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create New Team"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">
              Team Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter team name"
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
              placeholder="Describe your team's purpose (optional)"
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground resize-none"
            />
          </div>

            {/* Initial Members Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Invite Initial Members (Optional)
              </label>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                📧 Email invitations will be sent
              </span>
            </div>            {/* Add Member Form */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <input
                    type="email"
                    value={currentMember.email}
                    onChange={(e) => setCurrentMember(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                  />
                </div>
                
                <Select 
                  value={currentMember.role} 
                  onValueChange={(value: 'ADMIN' | 'MEMBER') => setCurrentMember(prev => ({ ...prev, role: value }))}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={addMember}
                disabled={isLoading || !currentMember.email.trim()}
                className="w-full flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Add to Invitation List
              </Button>
            </div>

            {/* Members List */}
            {initialMembers.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {initialMembers.length} member(s) will be invited:
                </p>
                {initialMembers.map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{member.email}</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {member.role}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(member.email)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              {isLoading ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}