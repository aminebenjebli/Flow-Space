import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { ClientAcceptInvite } from '@/components/teams/client-accept-invite';

interface AcceptInvitePageProps {
  params: Promise<{
    token: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AcceptInvitePage({ params, searchParams }: AcceptInvitePageProps) {
  // Check if user is authenticated
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  const { token } = await params;
  const { error: urlError } = await searchParams;

  return (
    <ClientAcceptInvite token={token} urlError={urlError} />
  );
}