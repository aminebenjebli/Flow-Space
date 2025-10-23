"use client";

import { useState, useEffect } from "react";

export default function PWADebugPanel() {
  const [showDebug, setShowDebug] = useState(false);
  const [pwaDiagnostics, setPWADiagnostics] = useState<any>({});

  useEffect(() => {
    if (showDebug) {
      runPWADiagnostics();
    }
  }, [showDebug]);

  const runPWADiagnostics = async () => {
    const diagnostics: any = {};

    // Check if service worker is registered
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      diagnostics.serviceWorker = {
        supported: true,
        registered: !!registration,
        scope: registration?.scope || "N/A",
      };
    } else {
      diagnostics.serviceWorker = { supported: false };
    }

    // Check manifest
    try {
      const manifestResponse = await fetch("/manifest.json");
      diagnostics.manifest = {
        accessible: manifestResponse.ok,
        status: manifestResponse.status,
      };
    } catch (error) {
      diagnostics.manifest = { accessible: false, error: error };
    }

    // Check if app is installable
    diagnostics.installability = {
      isStandalone: globalThis.matchMedia("(display-mode: standalone)").matches,
      hasBeforeInstallPrompt: "onbeforeinstallprompt" in globalThis,
      userAgent: navigator.userAgent,
    };

    // Check HTTPS
    diagnostics.security = {
      isHTTPS:
        location.protocol === "https:" || location.hostname === "localhost",
    };

    setPWADiagnostics(diagnostics);
  };

  const triggerInstallPrompt = () => {
    const event = new CustomEvent("pwa-install-requested");
    globalThis.dispatchEvent(event);
  };

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-16 right-4 bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700 transition-colors z-40"
      >
        PWA Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900 text-white p-4 rounded-lg max-w-sm text-xs z-50 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">PWA Diagnostics</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-blue-400">Service Worker</h4>
          <p>
            Supported: {pwaDiagnostics.serviceWorker?.supported ? "✅" : "❌"}
          </p>
          <p>
            Registered: {pwaDiagnostics.serviceWorker?.registered ? "✅" : "❌"}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-blue-400">Manifest</h4>
          <p>Accessible: {pwaDiagnostics.manifest?.accessible ? "✅" : "❌"}</p>
        </div>

        <div>
          <h4 className="font-semibold text-blue-400">Installability</h4>
          <p>
            Is Standalone:{" "}
            {pwaDiagnostics.installability?.isStandalone ? "✅" : "❌"}
          </p>
          <p>
            Install Event:{" "}
            {pwaDiagnostics.installability?.hasBeforeInstallPrompt
              ? "✅"
              : "❌"}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-blue-400">Security</h4>
          <p>
            HTTPS/Localhost: {pwaDiagnostics.security?.isHTTPS ? "✅" : "❌"}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-700">
          <button
            onClick={triggerInstallPrompt}
            className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-center transition-colors"
          >
            Try Install
          </button>

          <div className="mt-2 text-gray-300">
            <p className="font-semibold">Manual Install:</p>
            <p>Chrome: Menu → Install App</p>
            <p>Edge: Menu → Apps → Install</p>
            <p>Safari: Share → Add to Home Screen</p>
          </div>
        </div>
      </div>
    </div>
  );
}
