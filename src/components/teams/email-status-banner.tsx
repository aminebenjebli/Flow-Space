"use client";

import { Info, Mail, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface EmailStatusBannerProps {
  isEmailConfigured?: boolean;
  showInDev?: boolean;
}

export function EmailStatusBanner({ isEmailConfigured = false, showInDev = true }: EmailStatusBannerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev && !showInDev) return null;

  const copyConfigExample = () => {
    const config = `# Add to your backend .env file:
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587  
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com
FRONTEND_URL=http://localhost:3000`;

    navigator.clipboard.writeText(config);
    toast.success('Configuration copied to clipboard!');
  };

  return (
    <div className="mb-4">
      {!isEmailConfigured ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-yellow-800">
                  📧 Email Configuration Required
                </h4>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-yellow-700 hover:text-yellow-800 text-sm underline"
                >
                  {showDetails ? 'Hide Details' : 'Show Setup'}
                </button>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Invitations are working but emails are not automatically sent. Members receive shareable links instead.
              </p>

              {showDetails && (
                <div className="mt-3 space-y-3">
                  <div className="bg-yellow-100 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-yellow-800 mb-2">
                      Current Behavior:
                    </h5>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• ✅ Invitations create secure tokens</li>
                      <li>• ✅ Links are copyable for manual sharing</li>
                      <li>• ⚠️ No automatic email delivery</li>
                      <li>• ✅ All invitation features work normally</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">
                      To Enable Automatic Emails:
                    </h5>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Configure SMTP settings in backend environment</li>
                      <li>Set up email templates (already included)</li>
                      <li>Restart the backend service</li>
                    </ol>
                    
                    <button
                      onClick={copyConfigExample}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy Config Example
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-yellow-600" />
                    <a
                      href="/EMAIL_SETUP.md"
                      target="_blank"
                      className="text-sm text-yellow-700 hover:text-yellow-800 underline"
                    >
                      View Complete Setup Guide
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="text-sm font-medium text-green-800">
                📧 Email Configuration Active
              </h4>
              <p className="text-sm text-green-700">
                Invitation emails are being sent automatically to new members.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}