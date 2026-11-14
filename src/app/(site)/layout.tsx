import { SiteFooter } from '@/components/site/SiteFooter';
import { Navbar } from '@/components/homepage/Navbar';
import { getTerminalSummary } from '@/lib/terminal/summary';
import { getProfile } from '@/lib/auth';

/**
 * The layout of the public site.
 *
 * Uses the new professional Navbar component with light theme.
 * The navbar supports:
 * - Sticky positioning with scroll-aware background
 * - Desktop dropdown navigation with logo colors
 * - Mobile drawer with smooth animations
 * - Search integration
 * - Active route indicators
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [profile, summary] = await Promise.all([getProfile(), getTerminalSummary()]);

  const workspaceHref =
    profile?.role === 'agent'
      ? '/agent/home'
      : profile?.role === 'admin' ||
          profile?.role === 'verification_officer' ||
          profile?.role === 'super_admin'
        ? '/admin/overview'
        : '/dashboard';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        signedIn={Boolean(profile)}
        userEmail={profile?.email ?? null}
        workspaceHref={workspaceHref}
        freshness={summary.freshness}
      />
      <main className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
