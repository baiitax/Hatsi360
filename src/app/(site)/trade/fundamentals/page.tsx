import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getFundamentalSignals } from '@/lib/trade/queries';
import { buildShareMetadata } from '@/lib/metadata';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/terminal/TerminalShell';
import { EmptyStatePanel, PanelSkeleton } from '@/components/feedback/TerminalFeedback';
import { ProvenanceNotice } from '@/components/feedback/TerminalFeedback';
import { IconBook, IconFundamentals } from '@/components/ui/icons';

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
 * The brief describes the platform's differentiator as deep commodity research
 * into supply, demand, seasonality, weather, logistics, currency and
 * regulation. Of those, exactly one has a data source: the Field app records
 * `observation_market_intelligence` for every observation — availability,
 * supply level, demand level, price direction, sentiment, and a free-text note
 * in the agent's own words.
 *
 * **This page displays it, and only it.** Weather, logistics, currency and
 * regulatory intelligence have no verified source and are not shown. The panels
 * that would hold them are absent rather than empty, because a panel that says
 * "unavailable" on every page is noise.
 *
 * Everything here is field-reported, not editorial. Where an agent wrote
 * something, it is quoted verbatim and attributed to the market and date it came
 * from — never summarised into a claim the agent did not make.
 */

const AVAILABILITY_TONE: Record<string, string> = {
  scarce: 'move-down',
  limited: 'text-warning-700',
  adequate: 'text-terminal-text-secondary',
  abundant: 'move-up',
  surplus: 'move-up',
};

const LEVEL_TONE: Record<string, string> = {
  very_low: 'move-down',
  low: 'text-warning-700',
  moderate: 'text-terminal-text-secondary',
  high: 'text-terminal-text',
  very_high: 'move-up',
};

const DIRECTION_TONE: Record<string, string> = {
  rising: 'move-up',
  stable: 'text-terminal-text-secondary',
  falling: 'move-down',
  volatile: 'text-warning-700',
};

const SENTIMENT_TONE: Record<string, string> = {
  positive: 'move-up',
  neutral: 'text-terminal-text-secondary',
  negative: 'move-down',
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

  const totalReports = signals.length;
  const totalMarkets = new Set(signals.map((s) => s.marketId)).size;
  const withNotes = signals.filter((s) => s.developments).length;

  return (
    <PageContainer>
      <PageHeader
        title="Fundamental intelligence"
        description="Field-reported supply, demand and market conditions, recorded by Hatsi360 collection agents alongside each price observation."
        actions={
          <Link href="/coverage" className="terminal-action">
            <IconFundamentals className="size-3.5" />
            Collection coverage
          </Link>
        }
      />

      {!configured ? (
        <EmptyStatePanel
          kind="no-market-data"
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : signals.length === 0 ? (
        <EmptyStatePanel
          kind="no-fundamentals"
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : (
        <>
          <div className="terminal-panel p-3.5">
            <h2 className="figure-label">What this is</h2>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-terminal-text-secondary">
              Every figure on this page was reported by a named collection agent at a
              specific market on a specific date, alongside the price they recorded. It is
              field observation, not editorial analysis, and it is not a forecast. Weather,
              logistics, currency and regulatory intelligence are not shown because the
              platform has no verified source for them.
            </p>
            <ProvenanceNotice
              source="observation_market_intelligence, written by the Field app"
              className="mt-2 border-t border-terminal-border pt-2"
            />
          </div>

          <section aria-label="Field intelligence coverage">
            <dl className="grid gap-2 grid-cols-2 lg:grid-cols-4">
              <div className="terminal-panel p-3">
                <dt className="figure-label">Field reports</dt>
                <dd className="figure-num mt-1 text-figure-lg font-semibold text-terminal-text">
                  {totalReports}
                </dd>
              </div>
              <div className="terminal-panel p-3">
                <dt className="figure-label">Commodities covered</dt>
                <dd className="figure-num mt-1 text-figure-lg font-semibold text-terminal-text">
                  {byCommodity.size}
                </dd>
              </div>
              <div className="terminal-panel p-3">
                <dt className="figure-label">Markets covered</dt>
                <dd className="figure-num mt-1 text-figure-lg font-semibold text-terminal-text">
                  {totalMarkets}
                </dd>
              </div>
              <div className="terminal-panel p-3">
                <dt className="figure-label">With a written note</dt>
                <dd className="figure-num mt-1 text-figure-lg font-semibold text-terminal-text">
                  {withNotes}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-label="By commodity">
            <SectionHeader
              title="By commodity"
              count={byCommodity.size}
              action={{ href: '/commodities', label: 'The commodity directory' }}
            />
            <div className="space-y-2">
              {[...byCommodity.entries()].map(([commodityId, rows]) => {
                const commodity = commodities.find((c) => c.id === commodityId);
                const latest = rows[0]!;
                const marketCount = new Set(rows.map((r) => r.marketId)).size;
                return (
                  <article key={commodityId} className="terminal-panel">
                    <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-terminal-border px-3.5 py-2.5">
                      <h3 className="font-display text-[0.9375rem] font-bold text-terminal-text">
                        {commodity ? (
                          <Link
                            href={`/commodities/${commodity.slug}`}
                            className="hover:text-harvest-300"
                          >
                            {commodity.name}
                          </Link>
                        ) : (
                          `Commodity ${commodityId}`
                        )}
                      </h3>
                      <p className="figure-label">
                        {rows.length} report{rows.length === 1 ? '' : 's'} · {marketCount} market
                        {marketCount === 1 ? '' : 's'}
                      </p>
                    </header>

                    <dl className="grid grid-cols-2 gap-3 px-3.5 py-3 sm:grid-cols-3 lg:grid-cols-5">
                      <div>
                        <dt className="figure-label">Availability</dt>
                        <dd
                          className={`mt-1 text-[0.8125rem] font-semibold ${AVAILABILITY_TONE[latest.availability ?? ''] ?? 'text-terminal-text-secondary'}`}
                        >
                          {prettify(latest.availability)}
                        </dd>
                      </div>
                      <div>
                        <dt className="figure-label">Supply</dt>
                        <dd
                          className={`mt-1 text-[0.8125rem] font-semibold ${LEVEL_TONE[latest.supplyLevel ?? ''] ?? 'text-terminal-text-secondary'}`}
                        >
                          {prettify(latest.supplyLevel)}
                        </dd>
                      </div>
                      <div>
                        <dt className="figure-label">Demand</dt>
                        <dd
                          className={`mt-1 text-[0.8125rem] font-semibold ${LEVEL_TONE[latest.demandLevel ?? ''] ?? 'text-terminal-text-secondary'}`}
                        >
                          {prettify(latest.demandLevel)}
                        </dd>
                      </div>
                      <div>
                        <dt className="figure-label">Price direction</dt>
                        <dd
                          className={`mt-1 text-[0.8125rem] font-semibold ${DIRECTION_TONE[latest.priceDirection ?? ''] ?? 'text-terminal-text-secondary'}`}
                        >
                          {prettify(latest.priceDirection)}
                        </dd>
                      </div>
                      <div>
                        <dt className="figure-label">Sentiment</dt>
                        <dd
                          className={`mt-1 text-[0.8125rem] font-semibold ${SENTIMENT_TONE[latest.sentiment ?? ''] ?? 'text-terminal-text-secondary'}`}
                        >
                          {prettify(latest.sentiment)}
                        </dd>
                      </div>
                    </dl>

                    {latest.developments ? (
                      <blockquote className="mx-3.5 mb-3 border-l-2 border-harvest-500/40 pl-3 text-[0.8125rem] italic leading-relaxed text-terminal-text-secondary">
                        {latest.developments}
                        <footer className="mt-1 text-[0.6875rem] not-italic text-terminal-text-muted">
                          — reported at {latest.marketName} on{' '}
                          {new Date(latest.collectedAt).toLocaleDateString('en-NG')}
                        </footer>
                      </blockquote>
                    ) : null}

                    {rows.length > 1 ? (
                      <details className="border-t border-terminal-border px-3.5 py-2">
                        <summary className="cursor-pointer text-[0.75rem] font-semibold text-terminal-text-secondary hover:text-harvest-300">
                          All {rows.length} reports
                        </summary>
                        <ul className="mt-2 space-y-1.5">
                          {rows.map((row, index) => (
                            <li
                              key={`${row.marketId}-${row.collectedAt}-${index}`}
                              className="rounded-control border border-terminal-border p-2.5 text-[0.75rem] leading-relaxed text-terminal-text-secondary"
                            >
                              <span className="font-semibold text-terminal-text">
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
                  </article>
                );
              })}
            </div>
          </section>

          <section aria-label="What is not shown">
            <SectionHeader title="What is not shown" />
            <div className="terminal-panel p-4">
              <p className="text-[0.8125rem] leading-relaxed text-terminal-text-secondary">
                <IconBook
                  className="mr-1.5 inline size-3.5 align-text-top text-terminal-text-muted"
                  aria-hidden="true"
                />
                Seasonal calendars, weather and rainfall, production estimates, trade policy,
                currency and logistics factors, and any model-generated projection are
                absent from this page. The platform has no verified source for them, and an
                empty panel would imply that a source exists and simply failed to load.
                Where a source is added, it will appear here with its own provenance stated.
              </p>
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}

/** Fundamental intelligence while its data loads. */
export function FundamentalsLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Fundamental intelligence"
        description="Reading the field reports recorded alongside each price observation."
      />
      <PanelSkeleton lines={8} />
    </PageContainer>
  );
}
