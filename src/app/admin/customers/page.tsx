import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { listCustomers, listEntitlementTiers } from '@/lib/operations/commercial';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill, InlineEmpty, type PillTone } from '@/components/ops/Primitives';
import { ACCOUNT_STATUS_LABELS } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Customers — Control Centre',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const SUBSCRIPTION_TONE: Record<string, PillTone> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  cancelled: 'neutral',
  expired: 'danger',
};

/**
 * Customers — the non-staff accounts on the platform.
 *
 * Staff accounts are deliberately excluded: they are operators, not customers,
 * and they already have the agent and user directories. A customer with no
 * subscription shows "No subscription" rather than a made-up plan, because a
 * free account is a real state and not a gap to be filled.
 */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireStaff('/admin/customers');
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader
          title="Customers"
          description="Non-staff accounts and the subscription each one holds."
          breadcrumbs={[
            { label: 'Control Centre', href: '/admin/overview' },
            { label: 'Commercial' },
            { label: 'Customers' },
          ]}
        />
        <InlineEmpty
          title="No database is configured"
          description="The customer directory reads from PostgreSQL. Without a configured database there are no customer records to show, and none are invented."
        />
      </>
    );
  }

  const [page, tiers] = await Promise.all([
    listCustomers({ page: Number(params.page ?? 1), q: params.q }),
    listEntitlementTiers(),
  ]);

  const availableTiers = tiers.filter((tier) => tier.isAvailable).length;

  const columns: Column<(typeof page.rows)[number]>[] = [
    {
      key: 'name',
      header: 'Customer',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{row.name}</p>
          <p className="text-xs text-ink-500">{row.email ?? 'No email on record'}</p>
        </div>
      ),
    },
    {
      key: 'organization',
      header: 'Organization',
      cell: (row) => (
        <span className="text-xs text-ink-700">{row.organizationName ?? 'Personal account'}</span>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (row) =>
        row.plan ? (
          <span className="text-xs font-semibold text-ink-900">{row.plan}</span>
        ) : (
          <span className="text-xs text-ink-500">No subscription</span>
        ),
    },
    {
      key: 'status',
      header: 'Subscription',
      cell: (row) =>
        row.subscriptionStatus ? (
          <Pill tone={SUBSCRIPTION_TONE[row.subscriptionStatus] ?? 'neutral'}>
            {row.subscriptionStatus.replace('_', ' ')}
          </Pill>
        ) : (
          <Pill tone="neutral">free</Pill>
        ),
    },
    {
      key: 'account',
      header: 'Account',
      cell: (row) => (
        <Pill tone={row.accountStatus === 'active' ? 'success' : 'warning'}>
          {ACCOUNT_STATUS_LABELS[row.accountStatus] ?? row.accountStatus}
        </Pill>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-600">
          {row.joinedOn ? new Date(row.joinedOn).toLocaleDateString('en-NG') : '—'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="Non-staff accounts on the platform and the subscription each one holds."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Commercial' },
          { label: 'Customers' },
        ]}
      />

      <Panel title="How to read this screen">
        <p className="text-sm leading-relaxed text-ink-700">
          A customer with no subscription row is a free account — that is a real state, not missing
          data. Of the {tiers.length} entitlement tiers in the catalogue,{' '}
          <strong className="tabular-nums">{availableTiers}</strong>{' '}
          {availableTiers === 1 ? 'is' : 'are'} currently available. The paid tiers are recorded in
          the schema but marked unavailable, because no payment provider or commercial terms exist
          yet;{' '}
          <Link href="/pricing" className="font-semibold text-brand-700 hover:underline">
            the public pricing page
          </Link>{' '}
          describes them as proposed rather than purchasable.
        </p>
      </Panel>

      <div className="mt-5">
        {page.rows.length === 0 ? (
          <InlineEmpty
            title="No customer accounts yet"
            description="Only non-staff accounts appear here. When a member of the public registers, they will be listed with their subscription state."
          />
        ) : (
          <DataTable
            caption="Customer accounts"
            columns={columns}
            rows={page.rows}
            rowKey={(row) => row.id}
            empty="No customer accounts match this filter."
          />
        )}
      </div>

      {page.pageCount > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="tabular-nums text-ink-600">
            Page {page.page} of {page.pageCount} · {page.total} accounts
          </span>
          <div className="flex gap-2">
            {page.page > 1 ? (
              <Link
                href={`/admin/customers?page=${page.page - 1}${params.q ? `&q=${encodeURIComponent(params.q)}` : ''}`}
                className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-semibold text-ink-800 hover:bg-ink-50"
              >
                Previous
              </Link>
            ) : null}
            {page.page < page.pageCount ? (
              <Link
                href={`/admin/customers?page=${page.page + 1}${params.q ? `&q=${encodeURIComponent(params.q)}` : ''}`}
                className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 font-semibold text-ink-800 hover:bg-ink-50"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}
