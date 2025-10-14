"use client";

import { useState } from "react";
import { UserPlus, Copy } from "lucide-react";
import { inviteMember } from "@/app/(protected)/teams/actions";
import { EmailStatusBanner } from "./email-status-banner";

interface InviteMemberFormProps {
  teamId: string;
}

export function InviteMemberForm({ teamId }: InviteMemberFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "MEMBER" as "ADMIN" | "MEMBER",
  });
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);
    setInviteToken(null);

    try {
      const result = await inviteMember(teamId, {
        email: formData.email.trim(),
        role: formData.role,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Invitation sent successfully!");
        setFormData({ email: "", role: "MEMBER" });
        
        // Show token in dev mode
        if (result.token) {
          setInviteToken(result.token);
        }
      }
    } catch (error) {
      setError("Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteToken) {
      const link = `${window.location.origin}/teams/invite/accept/${inviteToken}`;
      navigator.clipboard.writeText(link);
      setSuccess("Invite link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      <EmailStatusBanner />
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="member@example.com"
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select 
              id="role"
              value={formData.role} 
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as "ADMIN" | "MEMBER" }))}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading || !formData.email.trim()}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {isLoading ? "Sending..." : "Send Invitation"}
        </button>
      </form>

      {error && (
        <div className="text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-green-600 text-sm font-medium">
            {success}
          </div>
          <p className="text-green-600 text-xs mt-1">
            📧 An invitation email has been sent to the member's email address.
          </p>
        </div>
      )}

      {inviteToken && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Development Mode</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Invite token generated for testing</p>
            </div>
            <button
              onClick={copyInviteLink}
              className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-600 rounded hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}