// PWA Installation Requirements Checker
// Run this in the browser console to check PWA installation criteria

function checkPWARequirements() {
  const results = {
    https: false,
    manifest: false,
    serviceWorker: false,
    manifestValid: false,
    iconsValid: false,
    serviceWorkerRegistered: false,
  };

  // Check HTTPS (localhost is considered secure)
  results.https =
    location.protocol === "https:" || location.hostname === "localhost";

  // Check for manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  results.manifest = !!manifestLink;

  // Check service worker support
  results.serviceWorker = "serviceWorker" in navigator;

  // Check if service worker is registered
  if (results.serviceWorker) {
    navigator.serviceWorker.ready.then((registration) => {
      results.serviceWorkerRegistered = !!registration;
      console.log("Service Worker Registration:", registration);
    });
  }

  // Check manifest validity
  if (results.manifest) {
    fetch("/manifest.json")
      .then((response) => response.json())
      .then((manifest) => {
        results.manifestValid = !!(
          manifest.name &&
          manifest.short_name &&
          manifest.start_url &&
          manifest.display &&
          manifest.icons &&
          manifest.icons.length > 0
        );

        // Check icons
        results.iconsValid = manifest.icons.some((icon) => {
          const size = parseInt(icon.sizes.split("x")[0]);
          return size >= 192;
        });

        console.log("PWA Requirements Check:", results);
        console.log("Manifest:", manifest);

        // Summary
        const allRequirementsMet = Object.values(results).every(Boolean);
        console.log(
          `PWA Installation Ready: ${allRequirementsMet ? "✅" : "❌"}`
        );

        if (!allRequirementsMet) {
          console.log(
            "Missing requirements:",
            Object.entries(results)
              .filter(([key, value]) => !value)
              .map(([key]) => key)
          );
        }
      })
      .catch((error) => {
        console.error("Error checking manifest:", error);
        results.manifestValid = false;
      });
  }

  return results;
}

// Run the check
console.log("🔍 Checking PWA Installation Requirements...");
checkPWARequirements();

// Also check if beforeinstallprompt event is supported
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("✅ beforeinstallprompt event fired!", e);
});

console.log("💡 If the install button doesn't appear, try:");
console.log("1. Open in Chrome/Edge");
console.log(
  '2. Enable "Bypass user engagement checks" in chrome://flags/#bypass-app-banner-engagement-checks'
);
console.log("3. Visit the site a few times");
console.log("4. Check DevTools > Application > Manifest for issues");
