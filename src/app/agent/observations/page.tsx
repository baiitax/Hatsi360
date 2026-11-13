import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import {
  getFieldObservations,
  verificationLabel,
  priceTypeLabel,
  FIELD_VERIFICATION_LABEL,
} from '@/lib/operations/field';
import { formatDateTime } from '@/lib/money';
import { FieldCard, FieldEmpty, FieldStat, FieldStatusPill } from '@/components/agent/FieldUi';

export const metadata: Metadata = {
  title: 'My prices — Field collection',
  robots: { index: false, follow: false },
};

/**
 * The agent's own price records.
 *
 * The filters are applied on the server, so a long history never has to
 * travel to the device to be narrowed down. Every record shown belongs to
 * the signed-in agent — the database enforces that, not the query.
 */
export default async function AgentObservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    market?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await requireAgent('/agent/observations');

  const status = params.status && params.status in FIELD_VERIFICATION_LABEL ? params.status : '';
  const marketId = params.market ? Number(params.market) : undefined;

  const observations = await getFieldObservations(profile.id, {
    query: params.q,
    status,
    marketId: Number.isFinite(marketId) ? marketId : undefined,
    from: params.from,
    to: params.to,
    limit: 200,
  });

  const counts = {
    all: observations.length,
    draft: observations.filter((o) => o.verificationStatus === 'draft').length,
    pending: observations.filter((o) =>
      ['submitted', 'pending_verification'].includes(o.verificationStatus),
    ).length,
    verified: observations.filter((o) => o.verificationStatus === 'verified').length,
    correction: observations.filter((o) => o.verificationStatus === 'correction_requested')
      .length,
  };

  const filters: { label: string; value: string; href: string }[] = [
    { label: 'All', value: '', href: '/agent/observations' },
    { label: 'Draft', value: 'draft', href: '/agent/observations?status=draft' },
    { label: 'In review', value: 'pending_verification', href: '/agent/observations?status=pending_verification' },
    { label: 'Approved', value: 'verified', href: '/agent/observations?status=verified' },
    {
      label: 'Correction',
      value: 'correction_requested',
      href: '/agent/observations?status=correction_requested',
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-ink-950">My prices</h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Every price you have recorded, and where it is in the review process.
        </p>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <FieldStat value={counts.all} label="Shown" />
        <FieldStat value={counts.pending} label="In review" />
        <FieldStat value={counts.verified} label="Approved" tone={counts.verified > 0 ? 'good' : 'default'} />
        <FieldStat
          value={counts.correction}
          label="To correct"
          tone={counts.correction > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* --------------------------------------------------------- the filters */}
      <form method="get" action="/agent/observations" className="space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-ink-700">Search</span>
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Commodity or market"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((filter) => {
            const active = (params.status ?? '') === filter.value;
            return (
              <Link
                key={filter.label}
                href={filter.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[36px] items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                  active
                    ? 'border-brand-600 bg-brand-700 text-white'
                    : 'border-ink-200 bg-white text-ink-700'
                }`}
              >
                {filter.label}
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">From</span>
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ''}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-ink-700">To</span>
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ''}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>

        <button
          type="submit"
          className="min-h-[44px] w-full rounded-xl bg-ink-900 px-4 py-2 text-sm font-bold text-white"
        >
          Apply filters
        </button>
      </form>

      {/* ---------------------------------------------------------- the records */}
      {observations.length === 0 ? (
        <FieldEmpty
          title="No prices match"
          body="Nothing here matches your filters. Clear them, or record a price to get started."
          action={
            <Link
              href="/agent/collection/new"
              className="inline-flex min-h-[44px] items-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white"
            >
              Collect a price
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {observations.map((observation) => (
            <li key={observation.id}>
              <Link
                href={`/agent/observations/${observation.id}`}
                className="block rounded-xl border border-ink-200 bg-white p-3 transition-colors hover:border-brand-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">
                      {observation.commodityName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {observation.marketName} · {priceTypeLabel(observation.priceType)}
                    </p>
                  </div>
                  <FieldStatusPill
                    status={observation.verificationStatus}
                    label={verificationLabel(observation.verificationStatus)}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-base font-bold tabular-nums text-ink-950">
                    {observation.reportedAmount === null
                      ? 'No amount'
                      : `${observation.currencyCode} ${observation.reportedAmount.toLocaleString('en-NG')}`}
                    {observation.unitName ? (
                      <span className="ml-1 text-xs font-normal text-ink-500">
                        per {observation.unitName}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-ink-400">
                    {observation.submittedAt
                      ? `Submitted ${formatDateTime(observation.submittedAt)}`
                      : `Collected ${formatDateTime(observation.collectedAt)}`}
                  </p>
                </div>

                {observation.qualityFlags.length > 0 ? (
                  <p className="mt-1.5 text-[11px] font-semibold text-harvest-700">
                    Flagged: {observation.qualityFlags.join(', ').replace(/_/g, ' ')}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {observations.length >= 200 ? (
        <FieldCard>
          <p className="text-xs text-ink-500">
            Showing the most recent 200 records. Narrow the dates to see older ones.
          </p>
        </FieldCard>
      ) : null}
    </div>
  );
}
