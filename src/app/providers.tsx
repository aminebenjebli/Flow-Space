"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { ProfileProvider } from "@/contexts/profile-context";
import { TaskProvider } from "@/contexts/task-context";
import SocketBridge from "@/components/realtime/SocketBridge";

interface ProvidersProps {
  readonly children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="flowspace-theme"
        >
          <ProfileProvider>
            {/* ✅ SocketBridge MUST mount BEFORE TaskProvider */}
            <SocketBridge />
            <TaskProvider>
              {children}
              <ReactQueryDevtools initialIsOpen={false} />
            </TaskProvider>
          </ProfileProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
