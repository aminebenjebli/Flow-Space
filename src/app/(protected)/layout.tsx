import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { Sidebar } from '@/components/layout/sidebar';

async function getUser() {
  const session = await getServerSession(authOptions);
  
  // Simple check: if there's no session, redirect to login
  if (!session) {
    redirect('/login');
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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}