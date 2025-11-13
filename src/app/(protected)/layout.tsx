import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { AppBar } from "@/components/layout/app-bar";
import AuthGuard from "@/components/auth/auth-guard";

async function getUser() {
  const session = await getServerSession(authOptions);

  // Simple check: if there's no session, redirect to login
  if (!session) {
    redirect("/login");
  }

  // For now, we'll trust the NextAuth session
  // Later you can add API validation if needed
  return session.user;
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getUser();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        <AppBar />
        <main className="flex-1 w-full">{children}</main>
      </div>
    </AuthGuard>
  );
}
