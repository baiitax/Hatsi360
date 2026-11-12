import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth/guards';
import { unreadCount } from '@/lib/notifications';
import { AgentShell } from '@/components/agent/AgentShell';

export const metadata: Metadata = {
  title: 'Field collection — GonaPulse',
  robots: { index: false, follow: false },
};

// The field app reads the session on every request, so it is never cached.
export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/agent/home', label: 'Home', icon: '⌂' },
  { href: '/agent/collect', label: 'Collect', icon: '＋' },
  { href: '/agent/tasks', label: 'Tasks', icon: '☑' },
  { href: '/agent/submissions', label: 'Prices', icon: '≡' },
];

/**
 * The agent workspace.
 *
 * Only an agent (or a market supervisor) may open it. The guard runs on the
 * server before anything renders, and the database refuses an agent's writes
 * at any market they are not assigned to.
 */
export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAgent('/agent/home');

  if (profile.role !== 'agent' && profile.role !== 'market_supervisor') {
    redirect('/dashboard?error=forbidden');
  }

  const unread = await unreadCount(profile.id);

  return (
    <AgentShell items={NAV} userName={profile.fullName ?? profile.email} unreadCount={unread} pendingCount={0}>
      {children}
    </AgentShell>
  );
}
