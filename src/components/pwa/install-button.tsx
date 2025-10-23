"use client";

import { useState, useEffect } from "react";

export default function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = globalThis.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    setIsInstalled(standalone);

    if (!standalone) {
      // Show install option after a short delay
      const timer = setTimeout(() => {
        setCanInstall(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstall = () => {
    // Trigger the install prompt component
    const event = new CustomEvent("pwa-install-requested");
    globalThis.dispatchEvent(event);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <span className="w-2 h-2 bg-green-600 rounded-full" /> App Installed
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 transition-colors"
    >
      📱 Install App
    </button>
  );
}
