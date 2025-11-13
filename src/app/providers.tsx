"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { ProfileProvider } from "@/contexts/profile-context";
import { TaskProvider } from "@/contexts/task-context";
import SocketBridge from "@/components/realtime/SocketBridge";
import { authOptions } from "@/lib/auth/auth";
import { getServerSession } from "next-auth";

interface ProvidersProps {
  readonly children: React.ReactNode;
 
 
  readonly session: any;
  readonly userId: string;
}


export  function Providers({ children, userId  }: ProvidersProps) {
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
  //  const session = await getServerSession(authOptions);
  // const userId = session?.user?.id ?? ""; // assure-toi que l'ID utilisateur est bien récupéré

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
            {userId && <SocketBridge/>} {/* Connecte-toi au WebSocket seulement si l'utilisateur est connecté */}
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
