#!/bin/bash

# Offline Mode Setup Script for Flow-Space PWA
# This script automates the installation of dependencies needed for offline mode

echo "🚀 Flow-Space Offline Mode Setup"
echo "=================================="
echo ""

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Detect package manager
if [ -f "pnpm-lock.yaml" ]; then
    PKG_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
    PKG_MANAGER="yarn"
else
    PKG_MANAGER="npm"
fi

echo "📦 Detected package manager: $PKG_MANAGER"
echo ""

# Install dexie
echo "📥 Installing Dexie.js for IndexedDB..."
if [ "$PKG_MANAGER" = "pnpm" ]; then
    pnpm add dexie
elif [ "$PKG_MANAGER" = "yarn" ]; then
    yarn add dexie
else
    npm install dexie
fi

if [ $? -eq 0 ]; then
    echo "✅ Dexie.js installed successfully!"
else
    echo "❌ Failed to install Dexie.js"
    exit 1
fi

echo ""
echo "✅ All dependencies installed!"
echo ""
echo "📋 Next Steps:"
echo "1. Add OfflineProvider to src/app/providers.tsx"
echo "2. Add OfflineStatusBanner to your UI"
echo "3. Choose integration option (see docs/OFFLINE_SETUP.md)"
echo "4. Test offline mode in Chrome DevTools"
echo ""
echo "📚 Documentation:"
echo "- Quick Start: docs/OFFLINE_SETUP.md"
echo "- Full Guide: docs/OFFLINE_MODE.md"
echo "- Example: examples/offline-integration.tsx"
echo ""
echo "🎉 Setup complete! Happy coding!"
