"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!globalThis?.window) return;
    if (!("serviceWorker" in globalThis.navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.log("✅ Service worker registered:", reg.scope);

        // Check for updates
        reg.addEventListener("updatefound", () => {
          console.log("🔄 Service Worker update found");
        });

        // Check if we're in standalone mode (already installed)
        if (globalThis.matchMedia("(display-mode: standalone)").matches) {
          console.log("📱 App is running in standalone mode (installed)");
        }
      } catch (err) {
        console.warn("❌ Service worker registration failed:", err);
      }
    };

    register();
  }, []);

  return null;
}
