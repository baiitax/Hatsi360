import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { PageHeader, Panel } from '@/components/ops/Primitives';
import { VerificationBadge } from '@/components/ui/data-display';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Profile — Control Centre',
  robots: { index: false, follow: false },
};

/**
 * The signed-in operator's own profile.
 *
 * It shows the account state the server enforces — role, account status and
 * the product surfaces this account may open. It never offers a way to change
 * a role from the browser.
 */
export default async function AdminProfilePage() {
  const profile = await requireStaff('/admin/profile');

  const details: { label: string; value: string }[] = [
    { label: 'Full name', value: profile.fullName ?? 'Not recorded' },
    { label: 'Email', value: profile.email },
    { label: 'Role', value: profile.role.replace(/_/g, ' ') },
    { label: 'Account status', value: profile.accountStatus.replace(/_/g, ' ') },
  ];

  return (
    <>
      <PageHeader
        title="Your profile"
        description={`The account you are signed in with, and the ${BRAND.name} surfaces it may open.`}
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Profile' },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account">
          <dl className="divide-y divide-ink-100">
            {details.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-sm text-ink-600">{detail.label}</dt>
                <dd className="text-sm font-medium text-ink-900">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="What this account can open">
          <ul className="space-y-2 text-sm text-ink-700">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="text-brand-700">✓</span>
              <span>
                {BRAND.surfaces.controlCentre} — every module your role permits.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="text-brand-700">✓</span>
              <span>
                {BRAND.surfaces.fieldApp} — only if your role also carries an agent assignment.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="text-brand-700">✓</span>
              <span>
                {BRAND.surfaces.customerWorkspace} — the public workspace for a signed-in account.
              </span>
            </li>
          </ul>
          <p className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-3 text-xs leading-relaxed text-ink-600">
            Your role is decided on the server and enforced again by the database. Nothing in this
            screen can change it, and hiding a menu item is never the mechanism that keeps you out
            of a module.
          </p>
        </Panel>
      </div>
    </>
  );
}
