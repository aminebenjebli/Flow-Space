"use client";

import { useState, useEffect } from 'react';

declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed';
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = globalThis.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    if (standalone) {
      console.log('📱 App is already installed');
      return;
    }

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('🚀 PWA install prompt available');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    const handleInstallRequest = () => {
      setShowInstallButton(true);
      if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowManualInstructions(true);
      }
    };

    globalThis.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    globalThis.addEventListener('pwa-install-requested', handleInstallRequest);

    // Show manual install option after 3 seconds if no prompt
    const timer = setTimeout(() => {
      if (!deferredPrompt && !standalone) {
        setShowInstallButton(true);
        console.log('💡 Showing manual install option');
      }
    }, 3000);

    return () => {
      globalThis.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      globalThis.removeEventListener('pwa-install-requested', handleInstallRequest);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Use browser's native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Install prompt result: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallButton(false);
    } else {
      // Show manual instructions
      setShowManualInstructions(true);
    }
  };

  const getManualInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      return {
        browser: 'Chrome',
        steps: [
          'Click the menu (⋮) in the top-right corner',
          'Select "Install FlowSpace" or "Add to Home Screen"',
          'Click "Install" when prompted'
        ]
      };
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return {
        browser: 'Safari',
        steps: [
          'Tap the Share button (⬆️) at the bottom',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to confirm'
        ]
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Click the menu (☰) in the top-right corner',
          'Select "Install this site as an app"',
          'Click "Install" when prompted'
        ]
      };
    } else if (userAgent.includes('edg')) {
      return {
        browser: 'Edge',
        steps: [
          'Click the menu (⋯) in the top-right corner',
          'Select "Apps" → "Install this site as an app"',
          'Click "Install" when prompted'
        ]
      };
    }
    
    return {
      browser: 'Your browser',
      steps: [
        'Look for an install icon in the address bar',
        'Check browser menu for "Install app" option',
        'Try adding to home screen on mobile'
      ]
    };
  };

  if (isStandalone) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
        ✅ App Installed
      </div>
    );
  }

  if (!showInstallButton) {
    return null;
  }

  if (showManualInstructions) {
    const instructions = getManualInstructions();
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-4">Install FlowSpace App</h3>
          <p className="text-sm text-gray-600 mb-4">
            To install FlowSpace as an app on your device using {instructions.browser}:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            {instructions.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowManualInstructions(false)}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowManualInstructions(false);
                setShowInstallButton(false);
              }}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50 flex items-center gap-2"
    >
      📱 Install App
    </button>
  );
}