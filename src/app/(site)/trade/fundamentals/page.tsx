import { buildShareMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getFundamentalSignals } from '@/lib/trade/queries';
import { EmptyState, PageHeader, Panel, Pill, type Tone } from '@/components/trade/Primitives';

export const metadata = buildShareMetadata({
  title: 'Fundamental intelligence',
  path: '/trade/fundamentals',
  description:
    'Field-reported supply, demand, availability and market conditions for Nigerian agricultural commodities, recorded by Hatsi360 collection agents.',
});

export const dynamic = 'force-dynamic';

/**
 * Fundamental intelligence.
 *
 * Brief §12 describes the platform's major differentiator: deep
 * commodity-specific research into supply, demand, seasonality, weather,
 * logistics, currency and regulation.
 *
 * Of those, only supply and demand have a data source: the Field app records
 * `observation_market_intelligence` for every observation — availability,
 * supply level, demand level, price direction, sentiment, and a free-text
 * note in the agent's own words. **This page is the first thing in the
 * platform that displays it.**
 *
 * Weather, logistics, currency and regulatory intelligence have no source and
 * are not shown. The panels that would hold them are absent rather than empty,
 * because a panel that says "unavailable" on every page is noise.
 *
 * Everything here is field-reported, not editorial. Where an agent wrote
 * something, it is quoted verbatim and attributed to the market and date it
 * came from.
 */

const AVAILABILITY_TONE: Record<string, Tone> = {
  scarce: 'danger',
  limited: 'warning',
  adequate: 'info',
  abundant: 'success',
  surplus: 'success',
};

const LEVEL_TONE: Record<string, Tone> = {
  very_low: 'danger',
  low: 'warning',
  moderate: 'neutral',
  high: 'info',
  very_high: 'success',
};

const DIRECTION_TONE: Record<string, Tone> = {
  rising: 'danger',
  stable: 'neutral',
  falling: 'success',
  volatile: 'warning',
};

const SENTIMENT_TONE: Record<string, Tone> = {
  positive: 'success',
  neutral: 'neutral',
  negative: 'danger',
};

const prettify = (value: string | null) =>
  value ? value.replace(/_/g, ' ') : 'not recorded';

export default async function TradeFundamentalsPage() {
  const configured = isSupabaseConfigured();
  const signals = configured ? await getFundamentalSignals(undefined, 60) : [];
  const commodities = configured ? await (await getDataSource()).listCommodities() : [];

  const byCommodity = new Map<number, typeof signals>();
  for (const signal of signals) {
    const list = byCommodity.get(signal.commodityId);
    if (list) list.push(signal);
    else byCommodity.set(signal.commodityId, [signal]);
  }

  return (
    <>
      <PageHeader
        title="Fundamental intelligence"
        purpose="Field-reported supply, demand and market conditions, recorded by Hatsi360 collection agents alongside each price observation."
        breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Fundamentals' }]}
      />

      {!configured ? (
        <EmptyState
          title="No market data is connected"
          description="Fundamental intelligence is read from the Hatsi360 database. Without a configured database there are no field reports to show."
        />
      ) : signals.length === 0 ? (
        <EmptyState
          title="No field intelligence recorded yet"
          description="Hatsi360 agents record supply, demand and availability alongside every price they collect. None has been recorded yet, so there is nothing to report — and none is estimated."
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-[11px] leading-relaxed text-sky-900">
            <span className="font-bold">What this is. </span>
            Every figure on this page was reported by a named collection agent at
            a specific market on a specific date, alongside the price they
            recorded. It is field observation, not editorial analysis, and it is
            not a forecast. Weather, logistics, currency and regulatory
            intelligence are not shown because the platform has no verified
            source for them.
          </div>

          <div className="space-y-4">
            {[...byCommodity.entries()].map(([commodityId, rows]) => {
              const commodity = commodities.find((c) => c.id === commodityId);
              const latest = rows[0];
              return (
                <Panel
                  key={commodityId}
                  title={commodity?.name ?? `Commodity ${commodityId}`}
                  description={`${rows.length} field report${
                    rows.length === 1 ? '' : 's'
                  } across ${new Set(rows.map((r) => r.marketId)).size} market${
                    new Set(rows.map((r) => r.marketId)).size === 1 ? '' : 's'
                  }`}
                  actions={
                    commodity ? (
                      <Link
                        href={`/trade/terminal?commodity=${commodity.slug}`}
                        className="text-xs font-semibold text-brand-700 hover:underline"
                      >
                        View prices
                      </Link>
                    ) : null
                  }
                >
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                        Availability
                      </dt>
                      <dd className="mt-1">
                        <Pill tone={AVAILABILITY_TONE[latest.availability ?? ''] ?? 'neutral'}>
                          {prettify(latest.availability)}
                        </Pill>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                        Supply
                      </dt>
                      <dd className="mt-1">
                        <Pill tone={LEVEL_TONE[latest.supplyLevel ?? ''] ?? 'neutral'}>
                          {prettify(latest.supplyLevel)}
                        </Pill>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                        Demand
                      </dt>
                      <dd className="mt-1">
                        <Pill tone={LEVEL_TONE[latest.demandLevel ?? ''] ?? 'neutral'}>
                          {prettify(latest.demandLevel)}
                        </Pill>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                        Price direction
                      </dt>
                      <dd className="mt-1">
                        <Pill tone={DIRECTION_TONE[latest.priceDirection ?? ''] ?? 'neutral'}>
                          {prettify(latest.priceDirection)}
                        </Pill>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                        Sentiment
                      </dt>
                      <dd className="mt-1">
                        <Pill tone={SENTIMENT_TONE[latest.sentiment ?? ''] ?? 'neutral'}>
                          {prettify(latest.sentiment)}
                        </Pill>
                      </dd>
                    </div>
                  </dl>

                  {latest.developments ? (
                    <blockquote className="mt-3 border-l-2 border-brand-300 pl-3 text-xs italic leading-relaxed text-ink-700">
                      {latest.developments}
                      <footer className="mt-1 not-italic text-ink-500">
                        — reported at {latest.marketName} on{' '}
                        {new Date(latest.collectedAt).toLocaleDateString('en-NG')}
                      </footer>
                    </blockquote>
                  ) : null}

                  {rows.length > 1 ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[11px] font-semibold text-ink-600 hover:text-brand-700">
                        All {rows.length} reports
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {rows.map((row, index) => (
                          <li
                            key={`${row.marketId}-${row.collectedAt}-${index}`}
                            className="rounded-lg border border-ink-100 p-2.5 text-[11px] leading-relaxed text-ink-700"
                          >
                            <span className="font-semibold text-ink-900">
                              {row.marketName}
                            </span>{' '}
                            · {new Date(row.collectedAt).toLocaleDateString('en-NG')} ·
                            availability {prettify(row.availability)}, supply{' '}
                            {prettify(row.supplyLevel)}, demand {prettify(row.demandLevel)}
                            {row.developments ? ` — “${row.developments}”` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
