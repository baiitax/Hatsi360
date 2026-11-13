import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAgent } from '@/lib/auth/guards';
import { unreadCount } from '@/lib/notifications';
import { AgentShell, type AgentNavItem } from '@/components/agent/AgentShell';
import { getFieldHome } from '@/lib/operations/field';

export const metadata: Metadata = {
  title: 'Field collection — Hatsi360 Field',
  robots: { index: false, follow: false },
};

// The field app reads the session on every request, so it is never cached.
export const dynamic = 'force-dynamic';

/**
 * The five primary destinations.
 *
 * The brief asks for Home, Assignments, Collect, History and Profile. Markets,
 * tasks, prices, corrections and notifications are reached from the home
 * screen and from the header, so they never need a sixth bottom-navigation
 * slot that a thumb would have to find.
 */
const NAV: AgentNavItem[] = [
  { href: '/agent/home', label: 'Home', icon: '⌂' },
  { href: '/agent/assignments', label: 'Assignments', icon: '☑' },
  { href: '/agent/collection/new', label: 'Collect', icon: '＋' },
  { href: '/agent/history', label: 'History', icon: '≡' },
  { href: '/agent/profile', label: 'Profile', icon: '☺' },
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

  const [unread, home] = await Promise.all([unreadCount(profile.id), getFieldHome(profile.id)]);

  return (
    <AgentShell
      items={NAV}
      userName={profile.fullName ?? profile.email}
      unreadCount={unread}
      dueCount={home.pendingTasks}
    >
      {children}
    </AgentShell>
  );
}
