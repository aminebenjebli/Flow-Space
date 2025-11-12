"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvite } from '@/app/(protected)/teams/actions';

interface ClientAcceptInviteProps {
  token: string;
  urlError?: string;
}

export function ClientAcceptInvite({ token, urlError }: ClientAcceptInviteProps) {
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading');
  const [error, setError] = useState('');
  const router = useRouter();
  const hasAttempted = useRef(false); // Flag to prevent double execution

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasAttempted.current) {
      return;
    }

    if (urlError) {
      setStatus('error');
      setError(decodeURIComponent(urlError));
      return;
    }

    hasAttempted.current = true; // Mark as attempted

    async function handleAcceptInvite() {
      try {
        setStatus('loading');
        const result = await acceptInvite(token);
        
        if (result?.error) {
          setStatus('error');
          setError(result.error);
        } else if (result?.success) {
          setStatus('success');
          // Redirect to the specific team or teams page after success
          setTimeout(() => {
            if (result.team?.id) {
              router.push(`/teams/${result.team.id}`);
            } else {
              router.push('/teams');
            }
          }, 1500);
        } else {
          // Fallback - if no explicit success but no error either
          setStatus('success');
          setTimeout(() => {
            router.push('/teams');
          }, 1500);
        }
      } catch (error) {
        setStatus('error');
        setError('Failed to accept invitation');
      }
    }

    handleAcceptInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, urlError]); // Removed 'router' from dependencies

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Joining Team...
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we add you to the team.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Successfully Joined!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You have been added to the team successfully.
            </p>
            <button
              onClick={() => router.push('/teams')}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Go to Teams
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Invite Failed
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error}
          </p>
          
          {/* Help for already accepted invitations */}
          {(error.toLowerCase().includes('already been accepted') || error.toLowerCase().includes('already a member')) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <h3 className="text-green-800 font-medium mb-2">✅ Already a Member</h3>
              <p className="text-green-700 text-sm mb-3">
                Good news! You have already accepted this invitation and are a member of this team.
              </p>
              <p className="text-green-600 text-xs mb-2">
                No further action is needed. Click below to view your teams.
              </p>
            </div>
          )}
          
          {/* Additional help for expired invitations */}
          {error.toLowerCase().includes('expired') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="text-yellow-800 font-medium mb-2">💡 Invitation Expired</h3>
              <p className="text-yellow-700 text-sm mb-3">
                This invitation link has expired. Please ask the team administrator to send you a new invitation.
              </p>
              <p className="text-yellow-600 text-xs">
                <strong>Token:</strong> {token.substring(0, 16)}...
              </p>
            </div>
          )}
          
          {error.toLowerCase().includes('invalid') && !error.toLowerCase().includes('already') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="text-red-800 font-medium mb-2">🚫 Invalid Invitation</h3>
              <p className="text-red-700 text-sm mb-3">
                This invitation link is not valid. It may have been used by someone else or the link might be corrupted.
              </p>
              <p className="text-red-600 text-xs">
                <strong>Token:</strong> {token.substring(0, 16)}...
              </p>
            </div>
          )}

          <button
            onClick={() => router.push('/teams')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Teams
          </button>
        </div>
      </div>
    </div>
  );
}