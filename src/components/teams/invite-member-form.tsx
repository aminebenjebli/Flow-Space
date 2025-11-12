"use client";

import { useState } from "react";
import { UserPlus, Copy, AlertCircle, CheckCircle } from "lucide-react";
import { inviteMember } from "@/app/(protected)/teams/actions";
import { EmailStatusBanner } from "./email-status-banner";

interface InviteMemberFormProps {
  teamId: string;
}

export function InviteMemberForm({ teamId }: InviteMemberFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
  });
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [emailStatus, setEmailStatus] = useState<{
    exists?: boolean;
    message?: string;
    type?: 'error' | 'warning' | 'success';
  }>({});

  // Vérifier si l'email existe dans la base de données
  const checkEmailExists = async (email: string) => {
    if (!email.trim() || !email.includes('@')) return;
    
    setIsCheckingEmail(true);
    setEmailStatus({});
    
    try {
      const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.exists) {
        setEmailStatus({
          exists: true,
          message: `✓ Utilisateur trouvé: ${data.user?.name || data.user?.email}`,
          type: 'success'
        });
      } else {
        setEmailStatus({
          exists: false,
          message: '⚠️ Cet email n\'est pas encore enregistré. L\'utilisateur devra créer un compte.',
          type: 'warning'
        });
      }
    } catch (error) {
      setEmailStatus({
        message: 'Erreur lors de la vérification de l\'email',
        type: 'error'
      });
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Gérer le changement d'email avec débounce
  let debounceTimeout: NodeJS.Timeout;
  
  const handleEmailChange = (email: string) => {
    setFormData(prev => ({ ...prev, email }));
    setEmailStatus({});
    
    // Clear previous timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // Débounce pour éviter trop de requêtes
    debounceTimeout = setTimeout(() => {
      if (email.trim() && email.includes('@')) {
        checkEmailExists(email);
      }
    }, 800); // Augmenté à 800ms pour éviter trop de requêtes
  };

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
        role: "MEMBER",
      });

      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess("Invitation sent successfully!");
        setFormData({ email: "" });
        
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
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address *
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="member@example.com"
              disabled={isLoading || isCheckingEmail}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                emailStatus.type === 'success' ? 'border-green-500' :
                emailStatus.type === 'warning' ? 'border-yellow-500' :
                emailStatus.type === 'error' ? 'border-red-500' :
                'border-gray-300 dark:border-gray-600'
              }`}
              required
            />
            {isCheckingEmail && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {emailStatus.message && (
            <p className={`text-sm mt-1 ${
              emailStatus.type === 'success' ? 'text-green-600' :
              emailStatus.type === 'warning' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {emailStatus.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            New members will be invited with the Member role
          </p>
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