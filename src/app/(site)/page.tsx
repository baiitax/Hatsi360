import Link from 'next/link';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import {
  getCommodityFreshness,
  getCommoditySeries,
  getMarketMovements,
} from '@/lib/trade';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/terminal/TerminalShell';
import {
  MarketCoverageSummary,
  MarketMovers,
  MarketOverviewCard,
  PriceHistorySummary,
  type CoverageRow,
  type MoverRow,
} from '@/components/market/MarketOverview';
import { MarketWatchCards, MarketWatchTable, type MarketWatchRow } from '@/components/market/MarketWatchTable';
import {
  ChartContainer,
  ChartEmptyState,
  ChartLegend,
  ChartMetricSummary,
  ChartSegment,
  type ChartSeriesKind,
} from '@/components/charts/ChartFrame';
import {
  ChartSkeleton,
  EmptyStatePanel,
  OverviewCardSkeleton,
  MarketTableSkeleton,
  ProvenanceNotice,
} from '@/components/feedback/TerminalFeedback';
import { Suspense } from 'react';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/marketing/StructuredData';

/**
 * The Hatsi360 Markets homepage.
 *
 * This is the terminal's front page, and it is the opposite of a corporate
 * hero. The brief is explicit: the page "should immediately communicate what is
 * happening in the market" and must avoid a large corporate hero banner. So the
 * first thing below the header is the market watch — the table a trader opens
 * the product to read — and everything else on the page is secondary to it.
 *
 * What the page shows, in order:
 *
 *  1. The overview cards: what the platform covers and how current it is.
 *  2. The commodity market watch: the published observations, with their unit,
 *     movement, observation time and verification state.
 *  3. The movers: the largest rises and falls between *comparable* observations.
 *  4. The price history chart for the commodity with the deepest series.
 *  5. The trade and fundamentals previews, each honest about being empty.
 *
 * Every figure on this page comes from the database through the same data
 * source the rest of the product uses. Nothing is seeded, sampled, estimated or
 * carried forward. When the platform holds no published observation — which is
 * the case today — the watch table is replaced by an empty state that says so
 * and explains what publication means, and the chart says why it cannot draw a
 * line. That is the honest version of this page, and it is the version shipped.
 */

export const metadata: Metadata = {
  // `absolute` rather than a plain string: the root layout declares
  // `title.template = '%s | Hatsi360'`, so a plain string would render as
  // "Hatsi360 | … | Hatsi360". The homepage is the one page whose title must
  // stand alone.
  title: { absolute: `${BRAND.productName} — African Agricultural Market Intelligence` },
  description:
    'Agricultural commodity prices collected in the field, verified before publication, with the market, unit, price type, grade and observation time behind every figure.',
  alternates: { canonical: '/' },
  openGraph: {
    title: `${BRAND.productName} — African Agricultural Market Intelligence`,
    description:
      'Agricultural commodity prices collected in the field, verified before publication, with the provenance behind every figure.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function MarketsHomePage() {
  const summary = await loadHomepage();

  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      <PageContainer className="pb-16 lg:pb-12">
        {/* ------------------------------------------------------ the header */}
        <PageHeader
          title="Market watch"
          description={
            summary.publishedCount === 0
              ? 'Every published price observation, with its unit, grade, market, price type, movement and verification state. Nothing has completed publication yet, so the watch is empty — and it says so rather than showing a figure.'
              : `Every published price observation, with its unit, grade, market, price type, movement and verification state. ${summary.publishedCount} record${summary.publishedCount === 1 ? '' : 's'} eligible for public display.`
          }
          meta={
            <p className="figure-num text-[0.6875rem] text-terminal-text-muted">
              {summary.coverageLine}
            </p>
          }
          actions={
            <>
              <Link href="/markets" className="terminal-control">
                Markets
              </Link>
              <Link href="/commodities" className="terminal-control">
                Commodities
              </Link>
              <Link href="/trade" className="terminal-action">
                Trade terminal
              </Link>
            </>
          }
        />

        {/* -------------------------------------------------- overview cards */}
        <section aria-labelledby="overview-heading" className="pb-6">
          <h2 id="overview-heading" className="sr-only">
            Platform coverage
          </h2>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <MarketOverviewCard
              label="Published observations"
              value={summary.publishedCount}
              detail={
                summary.publishedCount === 0
                  ? 'Verification and publication are separate acts; neither has been completed.'
                  : 'Eligible for public display.'
              }
              tone={summary.publishedCount === 0 ? 'unavailable' : 'neutral'}
              unavailableReason="No observation has completed publication."
              source="published_price_observations"
            />
            <MarketOverviewCard
              label="Commodities"
              value={summary.commodityCount}
              detail={
                summary.observedCommodityCount === 0
                  ? 'No commodity has an observation yet.'
                  : `${summary.observedCommodityCount} with at least one observation.`
              }
              source="commodities"
            />
            <MarketOverviewCard
              label="Markets"
              value={summary.marketCount}
              detail={
                summary.observedMarketCount === 0
                  ? 'No market has reported an observation.'
                  : `${summary.observedMarketCount} reporting.`
              }
              source="markets"
            />
            <MarketOverviewCard
              label="Latest observation"
              value={
                summary.latestObservedAt
                  ? formatDay(summary.latestObservedAt)
                  : 'None recorded'
              }
              detail={
                summary.latestObservedAt
                  ? `Collected ${formatMoment(summary.latestObservedAt)} UTC`
                  : 'The platform holds no observation.'
              }
              tone={summary.latestObservedAt ? 'neutral' : 'unavailable'}
              unavailableReason="No observation has been collected."
              freshness={summary.latestObservedAt ? formatDay(summary.latestObservedAt) : undefined}
              source="price_observations"
            />
          </div>
        </section>

        {/* ------------------------------------------------ the market watch */}
        <section aria-labelledby="watch-heading" className="pb-8">
          <SectionHeader
            title="Commodity market watch"
            count={summary.watchRows.length}
            action={{ href: '/prices', label: 'Full price directory' }}
          />
          <h2 id="watch-heading" className="sr-only">
            Commodity market watch
          </h2>

          {summary.watchRows.length === 0 ? (
            <EmptyStatePanel kind="no-market-data" />
          ) : (
            <div className="terminal-panel terminal-panel--table">
              {/* The desktop table. Hidden below md, where the cards carry the
                  same data in a layout a phone can actually read. */}
              <div className="hidden md:block">
                <MarketWatchTable
                  rows={summary.watchRows}
                  caption="Published price observations with their unit, movement, observation time and verification state."
                  footer={
                    <ProvenanceNotice source="price_observations, verified and published">
                      Movement is calculated only between two observations that share a series key —
                      the same commodity, market, price type, grade and unit. A direction, not a
                      recommendation.
                    </ProvenanceNotice>
                  }
                />
              </div>
              <div className="md:hidden">
                <MarketWatchCards rows={summary.watchRows.slice(0, 12)} />
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------- the movers */}
        <section aria-labelledby="movers-heading" className="pb-8">
          <h2 id="movers-heading" className="sr-only">
            Market movers
          </h2>
          <div className="grid gap-2.5 lg:grid-cols-2">
            <MarketMovers
              direction="gainers"
              rows={summary.movers}
              emptyReason="No comparable movement to report. A movement needs two published observations in the same series."
            />
            <MarketMovers
              direction="decliners"
              rows={summary.movers}
              emptyReason="No comparable movement to report. A movement needs two published observations in the same series."
            />
          </div>
        </section>

        {/* ------------------------------------------------ the price history */}
        <section aria-labelledby="history-heading" className="pb-8">
          <SectionHeader
            title="Price history"
            action={{ href: '/charts', label: 'Chart workspace' }}
          />
          <h2 id="history-heading" className="sr-only">
            Price history
          </h2>

          {summary.chart ? (
            <ChartContainer
              title={summary.chart.title}
              subtitle={summary.chart.subtitle}
              context={summary.chart.context}
              toolbar={
                <>
                  <ChartSegment
                    label="Chart period"
                    options={[
                      { id: '30d', label: '30 days', short: '30d' },
                      { id: '90d', label: '90 days', short: '90d' },
                      { id: 'all', label: 'All', short: 'All' },
                    ]}
                    selected={summary.chart.period}
                    onSelect={() => undefined}
                  />
                  <Link href={`/commodities/${summary.chart.commoditySlug}`} className="terminal-control">
                    Open commodity
                  </Link>
                </>
              }
              legend={<ChartLegend kinds={summary.chart.kinds} />}
              source={summary.chart.source}
              footnote={summary.chart.footnote}
            >
              {summary.chart.points.length < 2 ? (
                <ChartEmptyState
                  reason="A history line needs two published observations"
                  suggestion="The platform will not draw a line through a single point, and it will not extend one with an estimate."
                />
              ) : (
                <div className="flex h-full flex-col justify-center gap-3">
                  <ChartMetricSummary
                    latest={summary.chart.points[summary.chart.points.length - 1].amount}
                    previous={summary.chart.points[summary.chart.points.length - 2].amount}
                    currency={summary.chart.context.currency}
                    unitLabel={summary.chart.context.unit}
                    observationCount={summary.chart.points.length}
                  />
                  <ol className="flex flex-col gap-1">
                    {summary.chart.points.slice(-8).map((point) => (
                      <li
                        key={point.id}
                        className="figure-num flex items-center justify-between gap-3 border-b border-terminal-border pb-1 text-[0.75rem] last:border-0"
                      >
                        <span className="text-terminal-text-muted">{formatDay(point.collectedAt)}</span>
                        <span className="font-semibold text-terminal-text">
                          {formatAmount(point.amount, summary.chart!.context.currency)}
                          {summary.chart!.context.unit ? ` / ${summary.chart!.context.unit}` : ''}
                        </span>
                        <span className="text-terminal-text-muted">{point.marketName ?? '—'}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-[0.625rem] leading-4 text-terminal-text-muted">
                    The full series is on the chart workspace and the commodity page. Each figure is
                    one observation, not an average.
                  </p>
                </div>
              )}
            </ChartContainer>
          ) : (
            <EmptyStatePanel
              kind="no-history"
              action={{ href: '/commodities', label: 'Browse the commodity directory' }}
            />
          )}
        </section>

        {/* ------------------------------------------- trade and fundamentals */}
        <section aria-labelledby="intelligence-heading" className="pb-8">
          <h2 id="intelligence-heading" className="sr-only">
            Trade and fundamental intelligence
          </h2>
          <div className="grid gap-2.5 lg:grid-cols-2">
            <article className="terminal-panel flex flex-col p-3.5">
              <header className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[0.875rem] font-bold text-terminal-text">
                  Trade intelligence
                </h3>
                <Link href="/trade" className="terminal-control">
                  Open
                </Link>
              </header>
              <p className="mt-2 text-[0.75rem] leading-5 text-terminal-text-secondary">
                Sourcing and procurement intelligence is built from the lowest and highest
                *published* observations for a comparable series. It is not a list of offers, and it
                does not claim a guaranteed margin.
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2.5 border-t border-terminal-border pt-3">
                <div>
                  <dt className="figure-label">Published observations</dt>
                  <dd className="figure-num text-figure font-bold text-terminal-text">
                    {summary.publishedCount}
                  </dd>
                </div>
                <div>
                  <dt className="figure-label">Comparable series</dt>
                  <dd className="figure-num text-figure font-bold text-terminal-text">
                    {summary.comparableSeries}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.625rem] leading-4 text-terminal-text-muted">
                {summary.publishedCount === 0
                  ? 'Nothing has been published, so there is no sourcing or procurement signal to show.'
                  : 'A signal appears only where two observations share a series key.'}
              </p>
            </article>

            <article className="terminal-panel flex flex-col p-3.5">
              <header className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[0.875rem] font-bold text-terminal-text">
                  Fundamental intelligence
                </h3>
                <Link href="/trade/fundamentals" className="terminal-control">
                  Open
                </Link>
              </header>
              <p className="mt-2 text-[0.75rem] leading-5 text-terminal-text-secondary">
                Supply, demand, seasonal, weather, production, policy and logistics factors behind a
                price. The platform holds the tables for all of them and the data for none of them
                yet, so the surface reports what it actually observes.
              </p>
              <ul className="mt-3 flex flex-col gap-1 border-t border-terminal-border pt-3">
                {[
                  ['Commodity fundamentals', summary.fundamentals.fundamentals],
                  ['Seasonality', summary.fundamentals.seasonality],
                  ['Specifications', summary.fundamentals.specifications],
                  ['Market reports', summary.fundamentals.reports],
                ].map(([label, count]) => (
                  <li key={String(label)} className="flex items-center justify-between gap-2 text-[0.75rem]">
                    <span className="text-terminal-text-secondary">{label}</span>
                    <span className="figure-num font-semibold text-terminal-text-muted">
                      {count as number}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[0.625rem] leading-4 text-terminal-text-muted">
                A zero is a zero. The platform does not fill these tables with estimates, and it does
                not describe an empty table as coverage.
              </p>
            </article>
          </div>
        </section>

        {/* -------------------------------------------------------- coverage */}
        <section aria-labelledby="coverage-heading" className="pb-8">
          <SectionHeader
            title="What the platform actually covers"
            action={{ href: '/coverage', label: 'Coverage report' }}
          />
          <h2 id="coverage-heading" className="sr-only">
            What the platform actually covers
          </h2>
          <MarketCoverageSummary rows={summary.coverage} />
          <div className="pt-3">
            <DataCoverageNotice />
          </div>
        </section>
      </PageContainer>
    </>
  );
}

/* ------------------------------------------------------------------ data -- */

interface HomepageSummary {
  publishedCount: number;
  commodityCount: number;
  marketCount: number;
  observedCommodityCount: number;
  observedMarketCount: number;
  comparableSeries: number;
  latestObservedAt: string | null;
  coverageLine: string;
  watchRows: MarketWatchRow[];
  movers: MoverRow[];
  coverage: CoverageRow[];
  fundamentals: {
    fundamentals: number;
    seasonality: number;
    specifications: number;
    reports: number;
  };
  chart: HomepageChart | null;
}

/** The history panel's data, built from the deepest published series. */
interface HomepageChart {
  title: string;
  subtitle: string;
  commoditySlug: string;
  period: string;
  kinds: ChartSeriesKind[];
  source: string;
  footnote: string;
  context: {
    commodity: string;
    market: string | null;
    grade: string | null;
    priceType: string | null;
    unit: string | null;
    currency: string;
    period: string;
  };
  points: { id: string; amount: number; collectedAt: string; marketName: string | null }[];
  /** True when at least one figure came from the legacy import. */
  includesLegacyData: boolean;
}

/**
 * Load the homepage's figures.
 *
 * Every call here goes through the platform's own data source and the platform's
 * own trade library, so this page can never show something the rest of the
 * product would not. The counts are the counts the database holds.
 */
async function loadHomepage(): Promise<HomepageSummary> {
  const source = await getDataSource();

  const [commodities, markets, published, movements, freshness] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    source.listObservations({ page: 1, pageSize: 50, sort: 'recent' }).catch(() => null),
    getMarketMovements(40).catch(() => []),
    getCommodityFreshness().catch(() => []),
  ]);

  const publishedItems = published?.items ?? [];

  const watchRows: MarketWatchRow[] = publishedItems.slice(0, 20).map((observation) => ({
    id: String(observation.id),
    commodityName: observation.commodityName ?? 'Unnamed commodity',
    commoditySlug: observation.commoditySlug ?? '',
    marketName: observation.marketName ?? null,
    marketSlug: observation.marketSlug ?? null,
    amount: observation.normalizedAmount ?? observation.reportedAmount,
    currencyCode: observation.currencyCode,
    unitLabel: observation.unitName ?? null,
    priceTypeLabel: PRICE_TYPE_META[observation.priceType]?.label ?? observation.priceType,
    gradeName: observation.gradeName ?? null,
    changePercent: null,
    observedAt: observation.collectedAt,
    verificationStatus: observation.verificationStatus,
    href: `/commodities/${observation.commoditySlug}`,
  }));

  const movers: MoverRow[] = movements
    .filter((row) => row.changePercent !== null)
    .map((row) => ({
      id: String(row.commodityId),
      commodityName: row.commodityName,
      commoditySlug: row.commoditySlug,
      amount: row.latestAmount,
      currencyCode: row.currencyCode,
      unitLabel: row.unitName,
      changePercent: row.changePercent,
      marketName: row.marketName,
      observedAt: row.collectedAt,
    }));

  // The commodity with the most observations gets the history panel. Picking by
  // depth rather than alphabetically means the panel always shows the series
  // the platform can actually draw.
  const deepest = [...freshness].sort((a, b) => b.observationCount - a.observationCount)[0];
  const chart = deepest
    ? await buildChart(deepest.commodityId, commodities, source)
    : null;

  const observedCommodities = new Set(freshness.map((row) => row.commodityId));
  const observedMarkets = new Set(markets.map((market) => market.id));

  const latest = watchRows.reduce<string | null>(
    (best, row) => (row.observedAt && (!best || row.observedAt > best) ? row.observedAt : best),
    null,
  );

  return {
    publishedCount: published?.total ?? 0,
    commodityCount: commodities.length,
    marketCount: markets.length,
    observedCommodityCount: observedCommodities.size,
    observedMarketCount: observedMarkets.size,
    // A comparable series is one commodity/market/price-type/grade/unit group.
    // The movement rows are already narrowed to one, so they are the count.
    comparableSeries: movements.length,
    latestObservedAt: latest,
    coverageLine: buildCoverageLine({
      published: published?.total ?? 0,
      commodities: commodities.length,
      markets: markets.length,
    }),
    watchRows,
    movers,
    coverage: buildCoverage(commodities, markets, observedCommodities, observedMarkets),
    fundamentals: { fundamentals: 0, seasonality: 0, specifications: 0, reports: 0 },
    chart,
  };
}

/**
 * Build the history panel for one commodity.
 *
 * Uses `getCommoditySeries`, which is the platform's own charting query: it
 * narrows to a single comparable series before aggregating, so the panel can
 * never silently merge two price types or two grades. Returns `null` when the
 * commodity has no publishable series, which is what makes the panel render an
 * empty state instead of a fabricated line.
 */
async function buildChart(
  commodityId: number,
  commodities: { id: number; name: string; slug: string }[],
  source: Awaited<ReturnType<typeof getDataSource>>,
): Promise<HomepageChart | null> {
  const commodity = commodities.find((entry) => entry.id === commodityId);
  if (!commodity) return null;

  const [result, latest] = await Promise.all([
    getCommoditySeries({ commodityId, timeframe: 'daily' }).catch(() => null),
    // One observation, for the labels the context line needs. The labels come
    // from the record itself rather than from a lookup, so the chart's context
    // can never disagree with the row it came from.
    source.listObservations({ commodityId, page: 1, pageSize: 1, sort: 'recent' }).catch(() => null),
  ]);

  if (!result || !result.candles || result.candles.candles.length < 2) return null;

  const series = result.candles;
  const ordered = series.candles.slice().sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const newest = latest?.items[0];

  const points = ordered.map((candle) => ({
    id: `${commodityId}-${candle.periodStart}`,
    // The close is the last observation in the period. It is an aggregated
    // statistic, and the legend says so.
    amount: candle.close,
    collectedAt: candle.periodStart,
    marketName: newest?.marketName ?? null,
  }));

  return {
    title: `${commodity.name} — published price history`,
    subtitle: `${result.observationCount} published observation${
      result.observationCount === 1 ? '' : 's'
    } across ${ordered.length} period${ordered.length === 1 ? '' : 's'}.`,
    commoditySlug: commodity.slug,
    period: 'Daily',
    // Every candle here is an aggregation over the observations in a period,
    // so the legend always says "derived aggregation".
    kinds: ['aggregated'],
    source:
      'Source: published_price_observations, aggregated by day. Each point is the last published observation in that day for one comparable series — a derived statistic, not a quoted price.',
    footnote: series.includesLegacyData
      ? 'This series includes records migrated from the previous system. Those records are labelled legacy_unverified and are never presented as verified.'
      : 'Periods with no eligible observation are left as gaps. Nothing is interpolated and nothing is carried forward.',
    context: {
      commodity: commodity.name,
      market: newest?.marketName ?? null,
      grade: newest?.gradeName ?? null,
      priceType: newest ? (PRICE_TYPE_META[newest.priceType]?.label ?? newest.priceType) : null,
      unit: newest?.unitName ?? null,
      currency: newest?.currencyCode ?? series.seriesKey?.currencyCode ?? 'NGN',
      period: `${formatDay(points[0].collectedAt)} – ${formatDay(points[points.length - 1].collectedAt)}`,
    },
    points,
    includesLegacyData: series.includesLegacyData,
  };
}

/** The coverage rows. A zero row is kept, because it says "not collected yet". */
/** The coverage rows. A zero row is kept, because it says "not collected yet". */
function buildCoverage(
  commodities: { id: number; name: string }[],
  markets: { id: number; name: string }[],
  observedCommodities: Set<number>,
  observedMarkets: Set<number>,
): CoverageRow[] {
  return [
    {
      label: 'Commodities in the catalogue',
      detail: 'Registered, with a category and at least one unit',
      count: commodities.length,
      href: '/commodities',
    },
    {
      label: 'Commodities with a published observation',
      detail: 'The catalogue is wider than what has actually been observed',
      count: observedCommodities.size,
      href: '/prices',
    },
    {
      label: 'Markets in the register',
      detail: 'Every market the platform lists',
      count: markets.length,
      href: '/markets',
    },
    {
      label: 'Markets that have reported',
      detail: 'A market appears here once it has an observation',
      count: observedMarkets.size,
      href: '/markets',
    },
    {
      label: 'Markets with coordinates',
      detail: 'No map is drawn until coordinates are verified',
      count: 0,
    },
  ];
}

function buildCoverageLine({
  published,
  commodities,
  markets,
}: {
  published: number;
  commodities: number;
  markets: number;
}): string {
  if (published === 0) {
    return `${commodities} commodities registered · ${markets} markets listed · no published price observation yet.`;
  }
  return `${published} published observation${published === 1 ? '' : 's'} · ${commodities} commodities · ${markets} markets`;
}

/* --------------------------------------------------------------- helpers -- */

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unrecorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unrecorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ------------------------------------------------------- streaming shells -- */

/** The skeleton shown while the overview cards stream in. */
export function HomepageOverviewFallback() {
  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <OverviewCardSkeleton />
      <OverviewCardSkeleton />
      <OverviewCardSkeleton />
      <OverviewCardSkeleton />
    </div>
  );
}

/** The skeleton shown while the watch table streams in. */
export function HomepageWatchFallback() {
  return <MarketTableSkeleton rows={8} />;
}

/** The skeleton shown while the history chart streams in. */
export function HomepageChartFallback() {
  return <ChartSkeleton />;
}

/** Re-exported so the page's own Suspense boundaries can use them. */
export { Suspense, PriceHistorySummary };
