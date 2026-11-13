import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/guards';
import { listEntitlementTiers, listSubscriptions } from '@/lib/operations/commercial';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DataTable, type Column } from '@/components/ops/DataTable';
import { PageHeader, Panel, Pill, InlineEmpty, type PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Subscriptions — Control Centre',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, PillTone> = {
  active: 'success',
  trialing: 'info',
  past_due: 'warning',
  cancelled: 'neutral',
  expired: 'danger',
};

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString('en-NG') : '—';
}

/**
 * Subscriptions and the entitlement catalogue.
 *
 * Two things this screen must never do: imply that a payment provider exists,
 * and imply that a paid tier can be bought today. The `is_available` flag on
 * each tier is shown verbatim for exactly that reason.
 */
export default async function AdminSubscriptionsPage() {
  await requireStaff('/admin/subscriptions');

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader
          title="Subscriptions"
          description="Active subscriptions and the entitlement catalogue behind them."
          breadcrumbs={[
            { label: 'Control Centre', href: '/admin/overview' },
            { label: 'Commercial' },
            { label: 'Subscriptions' },
          ]}
        />
        <InlineEmpty
          title="No database is configured"
          description="Subscriptions are read from PostgreSQL. Without a configured database there are none to list, and none are invented."
        />
      </>
    );
  }

  const [page, tiers] = await Promise.all([listSubscriptions({ pageSize: 50 }), listEntitlementTiers()]);

  const columns: Column<(typeof page.rows)[number]>[] = [
    {
      key: 'customer',
      header: 'Customer',
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{row.customerName}</p>
          {row.organizationName ? (
            <p className="text-xs text-ink-500">{row.organizationName}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      cell: (row) => <span className="text-xs font-semibold text-ink-900">{row.plan}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => (
        <Pill tone={STATUS_TONE[row.status] ?? 'neutral'}>{row.status.replace('_', ' ')}</Pill>
      ),
    },
    {
      key: 'starts',
      header: 'Started',
      cell: (row) => <span className="tabular-nums text-xs text-ink-600">{formatDate(row.startsAt)}</span>,
    },
    {
      key: 'renews',
      header: 'Renews',
      cell: (row) => <span className="tabular-nums text-xs text-ink-600">{formatDate(row.renewsAt)}</span>,
    },
    {
      key: 'ends',
      header: 'Ends',
      cell: (row) => <span className="tabular-nums text-xs text-ink-600">{formatDate(row.endsAt)}</span>,
    },
    {
      key: 'entitlements',
      header: 'Entitlements',
      cell: (row) => (
        <span className="tabular-nums text-xs text-ink-700">
          {row.entitlementCount === 0 ? 'None granted' : `${row.entitlementCount} granted`}
        </span>
      ),
    },
  ];

  const availableTiers = tiers.filter((tier) => tier.isAvailable);
  const proposedTiers = tiers.filter((tier) => !tier.isAvailable);

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Active subscriptions and the entitlement catalogue behind them."
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Commercial' },
          { label: 'Subscriptions' },
        ]}
      />

      {page.rows.length === 0 ? (
        <InlineEmpty
          title="No subscriptions on record"
          description="No account holds a subscription yet. Free public access does not create a subscription row, so an empty list is the truthful state."
        />
      ) : (
        <DataTable
          caption="Subscriptions"
          columns={columns}
          rows={page.rows}
          rowKey={(row) => String(row.id)}
          empty="No subscriptions match this filter."
        />
      )}

      <div className="mt-8">
        <Panel title="Entitlement catalogue">
          <p className="text-sm leading-relaxed text-ink-700">
            Every tier the schema defines, with its availability stated as recorded. A tier marked
            proposed has no payment provider behind it and cannot be purchased.
          </p>

          <ul className="mt-4 space-y-3">
            {tiers.map((tier) => (
              <li
                key={tier.id}
                className="rounded-lg border border-ink-200 bg-white p-3 sm:flex sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-ink-900">{tier.name}</p>
                    <Pill tone={tier.isAvailable ? 'success' : 'neutral'}>
                      {tier.isAvailable ? 'available' : 'proposed'}
                    </Pill>
                  </div>
                  {tier.summary ? (
                    <p className="mt-1 text-xs leading-relaxed text-ink-600">{tier.summary}</p>
                  ) : null}
                  <p className="mt-1.5 font-mono text-[11px] text-ink-500">
                    entitlements:{' '}
                    {tier.entitlements.length === 0
                      ? 'public read access only'
                      : tier.entitlements.join(', ')}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {proposedTiers.length > 0 ? (
            <p className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-xs leading-relaxed text-warning-700">
              {proposedTiers.length} tier{proposedTiers.length === 1 ? ' is' : 's are'} recorded as
              proposed. They exist in the schema so the entitlement checks can be written and tested,
              but no payment provider, price or commercial terms have been agreed, so they are not
              offered for sale. See{' '}
              <Link href="/pricing" className="font-semibold underline">
                the pricing page
              </Link>
              , which describes them the same way.
            </p>
          ) : null}

          {availableTiers.length > 0 ? (
            <p className="mt-2 text-xs text-ink-500">
              {availableTiers.length} tier{availableTiers.length === 1 ? '' : 's'} available today.
            </p>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
