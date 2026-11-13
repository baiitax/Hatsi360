import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAgent } from '@/lib/auth/guards';
import { getFieldMarkets } from '@/lib/operations/field';
import { formatDateTime } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Assigned markets — Hatsi360 Field',
  robots: { index: false, follow: false },
};

/**
 * The markets this agent covers.
 *
 * Only assigned markets appear here, and the collection form only offers
 * these markets — the restriction is enforced on the server and again by the
 * database, not by hiding a menu item.
 */
export default async function AgentMarketsPage() {
  const profile = await requireAgent('/agent/markets');
  const markets = await getFieldMarkets(profile.id);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold tracking-tight">Your markets</h1>
        <p className="mt-1 text-sm text-ink-600">
          The markets you are assigned to cover. Prices can only be submitted for these markets.
        </p>
      </header>

      {markets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 bg-white p-6 text-center">
          <p className="text-sm font-semibold text-ink-800">No market is assigned to you yet</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            Ask your supervisor to add you to a market. Until then there is nothing to collect.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {markets.map((market) => (
            <li key={market.id} className="rounded-xl border border-ink-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink-900">{market.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {market.address ?? market.stateName ?? 'Nigeria'}
                  </p>
                </div>
                {market.openTaskCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-harvest-100 px-2 py-0.5 text-[0.65rem] font-semibold text-harvest-700">
                    {market.openTaskCount} task{market.openTaskCount === 1 ? '' : 's'} today
                  </span>
                ) : null}
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-ink-50 px-2.5 py-2">
                  <dt className="text-ink-500">Collected today</dt>
                  <dd className="figure mt-0.5 text-sm text-ink-900">{market.collectedToday}</dd>
                </div>
                <div className="rounded-lg bg-ink-50 px-2.5 py-2">
                  <dt className="text-ink-500">Commodities in scope</dt>
                  <dd className="figure mt-0.5 text-sm text-ink-900">{market.commodityCount}</dd>
                </div>
              </dl>

              {market.commodityNames.length > 0 ? (
                <p className="mt-2 text-xs leading-relaxed text-ink-600">
                  {market.commodityNames.join(' · ')}
                </p>
              ) : (
                <p className="mt-2 text-xs italic text-ink-500">
                  No commodity scope recorded for this market yet.
                </p>
              )}

              <p className="mt-2 text-xs text-ink-500">
                {market.lastCollectionAt
                  ? `Last collection ${formatDateTime(market.lastCollectionAt)}`
                  : 'No collection recorded from you yet.'}
                {market.deadlineTime ? ` · Daily deadline ${market.deadlineTime}` : ''}
              </p>

              <Link
                href={`/agent/collection/new?market=${market.id}`}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brand-700 px-4 py-3 text-sm font-bold text-white"
              >
                Collect prices here
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
