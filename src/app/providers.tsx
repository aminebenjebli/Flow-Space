"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { ProfileProvider } from "@/contexts/profile-context";
import { TaskProvider } from "@/contexts/task-context";
import { ProjectProvider } from "@/contexts/project-context";
import { TeamProvider } from "@/contexts/team-context";

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
            <TeamProvider>
              <ProjectProvider>
                <TaskProvider>
                  {children}
                  <ReactQueryDevtools initialIsOpen={false} />
                </TaskProvider>
              </ProjectProvider>
            </TeamProvider>
          </ProfileProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
