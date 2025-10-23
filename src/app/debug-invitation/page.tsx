"use client";

import { useState, useEffect } from 'react';

export default function InvitationDebugPage() {
  const [debugInfo, setDebugInfo] = useState({
    currentUrl: '',
    expectedRoute: '/teams/invite/accept/[token]',
    testToken: 'bb3d5e4313939fe2fd7dc7c8f7d6695cf106e8f943297027f1b38efe8ccf6fb5'
  });

  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      currentUrl: window.location.href
    }));
  }, []);

  const generateTestUrls = () => {
    const baseUrl = window.location.origin;
    return {
      correct: `${baseUrl}/teams/invite/accept/${debugInfo.testToken}`,
      incorrect: `${baseUrl}/dashboard/teams/invite/accept/${debugInfo.testToken}`,
      reported: 'http://localhost:3000/dashboard/teams/invite/accept/bb3d5e4313939fe2fd7dc7c8f7d6695cf106e8f943297027f1b38efe8ccf6fb5'
    };
  };

  const testUrls = generateTestUrls();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔍 Invitation URL Debug Page
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              📍 Current Status
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Current URL:</label>
                <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded mt-1 break-all">
                  {debugInfo.currentUrl}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Expected Route:</label>
                <p className="text-sm text-gray-800 bg-gray-100 p-2 rounded mt-1">
                  {debugInfo.expectedRoute}
                </p>
              </div>
            </div>
          </div>

          {/* URL Tests */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🧪 URL Tests
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-green-600">✅ Correct URL:</label>
                <p className="text-xs text-gray-800 bg-green-50 border border-green-200 p-2 rounded mt-1 break-all">
                  {testUrls.correct}
                </p>
                <a 
                  href={testUrls.correct}
                  className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-800 rounded text-xs hover:bg-green-200"
                >
                  Test This URL
                </a>
              </div>
              
              <div>
                <label className="text-sm font-medium text-red-600">❌ Incorrect URL (with /dashboard):</label>
                <p className="text-xs text-gray-800 bg-red-50 border border-red-200 p-2 rounded mt-1 break-all">
                  {testUrls.incorrect}
                </p>
                <a 
                  href={testUrls.incorrect}
                  className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-xs hover:bg-red-200"
                >
                  Test This URL (Will 404)
                </a>
              </div>

              <div>
                <label className="text-sm font-medium text-yellow-600">⚠️ Reported Problematic URL:</label>
                <p className="text-xs text-gray-800 bg-yellow-50 border border-yellow-200 p-2 rounded mt-1 break-all">
                  {testUrls.reported}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixes Applied */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            🛠️ Fixes Applied
          </h2>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>✅ <strong>team.service.ts:</strong> Changed FRONTEND_URL default from 'http://localhost:3000/dashboard' to 'http://localhost:3000'</li>
            <li>✅ <strong>.env.example:</strong> Added FRONTEND_URL=http://localhost:3000</li>
            <li>✅ <strong>team.controller.ts:</strong> Verified correct URL usage (no /dashboard prefix)</li>
            <li>✅ <strong>Frontend route:</strong> Confirmed /teams/invite/accept/[token]/page.tsx exists</li>
          </ul>
        </div>

        {/* Instructions */}
        <div className="bg-gray-100 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📋 Testing Instructions
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Restart the backend server to apply configuration changes</li>
            <li>Create a new team invitation</li>
            <li>Check the email for the invitation link</li>
            <li>Verify the URL does NOT contain "/dashboard"</li>
            <li>Test clicking the invitation link</li>
            <li>Should redirect to /teams/[team-id] on success</li>
          </ol>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a 
            href="/teams"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ← Back to Teams
          </a>
        </div>
      </div>
    </div>
  );
}