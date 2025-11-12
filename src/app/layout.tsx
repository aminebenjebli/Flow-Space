import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import SessionWarning from "@/components/auth/session-warning";
import RegisterServiceWorker from "@/components/pwa/register-sw";
import PWAInstallPrompt from "@/components/pwa/install-prompt";
import PWADebugPanel from "@/components/pwa/debug-panel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import SocketBridge from "@/components/realtime/SocketBridge";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FlowSpace - Smart Task Manager",
  description:
    "Collaborative productivity app with intelligent task management and real-time features",
  keywords: [
    "task management",
    "productivity",
    "collaboration",
    "project management",
  ],
  authors: [{ name: "FlowSpace Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default  async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
   const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? ""; // assure-toi que l'ID utilisateur est bien récupéré

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="apple-touch-icon" href="/icons/icon192.png" />
        <link rel="icon" href="/icons/icon192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FlowSpace" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
            {userId && <SocketBridge />} {/* Connecte-toi au WebSocket seulement si l'utilisateur est connecté */}
          {children}
          <SessionWarning warningTimeMinutes={5} />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
              success: {
                style: {
                  background: "#22c55e",
                },
              },
              error: {
                style: {
                  background: "#ef4444",
                },
              },
            }}
          />
          {/* Register service worker on the client */}
          <RegisterServiceWorker />
          {/* PWA Install prompt */}
          <PWAInstallPrompt />
          {/* PWA Debug panel for development */}
          <PWADebugPanel />
        </Providers>
      </body>
    </html>
  );
}
