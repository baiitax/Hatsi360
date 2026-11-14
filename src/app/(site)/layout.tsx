import { SiteFooter } from '@/components/site/SiteFooter';
import { TerminalHeader, TerminalShell } from '@/components/terminal/TerminalShell';
import { getTerminalSummary } from '@/lib/terminal/summary';
import { getProfile } from '@/lib/auth';

/**
 * The layout of the public market terminal.
 *
 * Everything a visitor, trader, analyst or customer reads shares this shell:
 * the markets homepage, the commodity catalogue, the market directory, the
 * price directory, the comparison, the trade terminal, the charts workspace,
 * the fundamentals, the insights, the reports, the legal pages and the customer
 * workspace.
 *
 * The shell is the dark market terminal — Environment A. The editorial
 * surfaces inside it (research, market briefs, the institutional pages) declare
 * their own light canvas with the `.editorial` class, so a reader moves between
 * the two environments without ever leaving the product.
 *
 * The access portal and the two operator applications deliberately do not
 * appear here. They are in their own route groups, because a person signing in
 * or collecting prices should not be looking at the public navigation.
 *
 * The header's summary is resolved here rather than in the header, so it is
 * fetched once per render rather than once per component.
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
    <TerminalShell
      header={
        <TerminalHeader
          signedIn={Boolean(profile)}
          userEmail={profile?.email ?? null}
          workspaceHref={workspaceHref}
          freshness={summary.freshness}
          coverageLine={summary.coverageLine}
        />
      }
      footer={<SiteFooter />}
    >
      {children}
    </TerminalShell>
  );
}
