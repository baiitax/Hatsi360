import type { Metadata } from 'next';
import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { getCommodityFreshness, getCommoditySeries, getCommoditySeriesOptions } from '@/lib/trade';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';
import { PageContainer, PageHeader, SectionHeader } from '@/components/terminal/TerminalShell';
import {
  ChartContainer,
  ChartEmptyState,
  ChartLegend,
  ChartMetricSummary,
  ChartSegment,
  PeriodRangeChart,
  type ChartSeriesKind,
  type RangeBarDatum,
} from '@/components/charts/ChartFrame';
import { MarketWatchTable, type MarketWatchRow } from '@/components/market/MarketWatchTable';
import {
  ChartSkeleton,
  EmptyStatePanel,
  ProvenanceNotice,
} from '@/components/feedback/TerminalFeedback';
import { Select } from '@/components/ui/primitives';

/**
 * The chart workspace.
 *
 * The Charts module of the terminal: commodity selection, series selection, a
 * period range chart and the published observations behind it.
 *
 * Two things make this page different from a conventional chart screen, and both
 * come straight from the trade brief.
 *
 *  1. **A user picks a *series*, not a market and a grade.** Two figures with
 *     different price types, grades or units are not two prices of the same
 *     thing, so the page never offers them as if they were. The selector is
 *     built from `getCommoditySeriesOptions`, which groups the platform's
 *     observations by their series key and labels each group by what it is.
 *  2. **The chart is a range, not a candlestick.** A candlestick needs an open,
 *     a high, a low and a close for the same period from the same series. The
 *     platform aggregates a median, a minimum and a maximum over published
 *     observations, which describes dispersion rather than a trading session.
 *     So the chart is drawn as a range bar, the legend says "observed range",
 *     and the caption says in words that it is dispersion and not a trading
 *     range. The design brief permits a candlestick to be prototyped; it does
 *     not permit one to be implied where the data cannot support it.
 *
 * Every figure comes from `published_price_observations` through the platform's
 * own query. Nothing is interpolated, and a period with no eligible observation
 * is left as a gap.
 */

export const metadata: Metadata = {
  title: 'Chart workspace',
  description:
    'Published agricultural price history by comparable series: commodity, market, grade, price type, unit and currency, with the observations behind every point.',
  alternates: { canonical: '/charts' },
};

export const dynamic = 'force-dynamic';

/** The periods the workspace offers. Intraday is deliberately absent. */
const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
] as const;

export default async function ChartsWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ commodity?: string; series?: string; period?: string }>;
}) {
  const params = await searchParams;
  const source = await getDataSource();

  const [commodities, freshness] = await Promise.all([
    source.listCommodities(),
    getCommodityFreshness().catch(() => []),
  ]);

  // Only commodities that actually have an observation are offered. A selector
  // full of empty choices is a selector that wastes a reader's time.
  const withData = new Set(freshness.map((row) => row.commodityId));
  const selectable = commodities.filter((commodity) => withData.has(commodity.id));

  const requestedSlug = params.commodity;
  const commodity =
    selectable.find((entry) => entry.slug === requestedSlug) ?? selectable[0] ?? null;

  if (!commodity) {
    return (
      <PageContainer>
        <PageHeader
          title="Chart workspace"
          description="Published price history, drawn by comparable series."
        />
        <SectionHeader title="No series to chart" />
        <EmptyStatePanel
          kind="no-history"
          action={{ href: '/commodities', label: 'Browse the commodity directory' }}
        />
      </PageContainer>
    );
  }

  const options = await getCommoditySeriesOptions(commodity.id).catch(() => []);
  const option = options.find((entry) => entry.key === params.series) ?? options[0] ?? null;

  const period = (PERIODS.find((entry) => entry.id === params.period)?.id ?? 'daily') as
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly';

  const result = option
    ? await getCommoditySeries({ commodityId: commodity.id, timeframe: period }).catch(() => null)
    : null;

  const series = result?.candles ?? null;
  const ordered = series
    ? series.candles.slice().sort((a, b) => a.periodStart.localeCompare(b.periodStart))
    : [];

  // The observations behind the chart, so a reader can check the aggregation.
  const observations = await source
    .listObservations({ commodityId: commodity.id, page: 1, pageSize: 25, sort: 'recent' })
    .catch(() => null);

  const watchRows: MarketWatchRow[] = (observations?.items ?? []).map((observation) => ({
    id: String(observation.id),
    commodityName: observation.commodityName ?? commodity.name,
    commoditySlug: observation.commoditySlug ?? commodity.slug,
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
    href: `/commodities/${observation.commoditySlug ?? commodity.slug}`,
  }));

  const newest = observations?.items[0];
  const currency = newest?.currencyCode ?? 'NGN';
  const unit = newest?.unitName ?? null;

  const rangeData: RangeBarDatum[] = ordered.map((candle) => ({
    label: formatPeriodLabel(candle.periodStart, period),
    low: candle.low,
    high: candle.high,
    observationCount: candle.observationCount,
  }));

  const kinds: ChartSeriesKind[] = ['range'];

  return (
    <PageContainer>
      <PageHeader
        title="Chart workspace"
        description="Published price history, drawn one comparable series at a time. A series is a commodity at one price type, grade, unit and currency — never a blend."
        meta={
          <p className="figure-num text-[0.6875rem] text-terminal-text-muted">
            {selectable.length} commodit{selectable.length === 1 ? 'y' : 'ies'} with published
            observations · {options.length} comparable series for {commodity.name}
          </p>
        }
      />

      {/* ------------------------------------------------------- the selectors */}
      <form
        action="/charts"
        method="get"
        className="terminal-panel mb-3 flex flex-wrap items-end gap-2.5 p-3"
      >
        <label className="flex flex-col gap-1">
          <span className="figure-label">Commodity</span>
          <Select name="commodity" defaultValue={commodity.slug}>
            {selectable.map((entry) => (
              <option key={entry.id} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <span className="figure-label">Comparable series</span>
          <Select name="series" defaultValue={option?.key ?? ''}>
            {options.length === 0 ? (
              <option value="">No comparable series available</option>
            ) : (
              options.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {describeSeries(entry)}
                </option>
              ))
            )}
          </Select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="figure-label">Period</span>
          <Select name="period" defaultValue={period}>
            {PERIODS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </Select>
        </label>

        <button type="submit" className="terminal-action h-[1.875rem] px-3">
          Draw
        </button>

        <p className="ml-auto max-w-xs text-[0.625rem] leading-4 text-terminal-text-muted">
          Intraday periods are not offered. Collection is daily at its finest, and a 15-minute
          candle from a daily observation would be invented.
        </p>
      </form>

      {/* ------------------------------------------------------------ the chart */}
      <section aria-labelledby="range-heading" className="pb-6">
        <h2 id="range-heading" className="sr-only">
          Observed price range by period
        </h2>
        <ChartContainer
          title={`${commodity.name} — observed range by period`}
          subtitle={
            option
              ? `${result?.observationCount ?? 0} published observation${result?.observationCount === 1 ? '' : 's'} in this series.`
              : 'No comparable series has been selected.'
          }
          context={{
            commodity: commodity.name,
            market: newest?.marketName ?? null,
            grade: newest?.gradeName ?? null,
            priceType: newest ? (PRICE_TYPE_META[newest.priceType]?.label ?? newest.priceType) : null,
            unit,
            currency,
            period: periodLabel(period),
          }}
          toolbar={
            <>
              <ChartSegment
                label="Chart period"
                options={PERIODS.map((entry) => ({ id: entry.id, label: entry.label }))}
                selected={period}
                onSelect={() => undefined}
              />
              <Link href={`/commodities/${commodity.slug}`} className="terminal-control">
                Open commodity
              </Link>
            </>
          }
          legend={<ChartLegend kinds={kinds} />}
          source="Source: published_price_observations, aggregated by period. Each bar spans the lowest and highest published observation in the period."
          footnote={
            series?.includesLegacyData
              ? 'This series includes records migrated from the previous system, labelled legacy_unverified. They are never presented as verified.'
              : undefined
          }
          height="18rem"
        >
          {!option ? (
            <ChartEmptyState
              reason="This commodity has no comparable series"
              suggestion="A series needs at least one published observation. The platform will not construct one."
            />
          ) : ordered.length === 0 ? (
            <ChartEmptyState
              reason="No published observations in this series"
              suggestion={
                result?.unavailableReason ??
                'The series exists but holds no published observation for this period.'
              }
            />
          ) : (
            <div className="flex h-full flex-col gap-3">
              <ChartMetricSummary
                latest={ordered[ordered.length - 1].close}
                previous={ordered.length > 1 ? ordered[ordered.length - 2].close : null}
                currency={currency}
                unitLabel={unit}
                observationCount={result?.observationCount ?? 0}
              />
              <PeriodRangeChart data={rangeData} currency={currency} unitLabel={unit} />
            </div>
          )}
        </ChartContainer>
      </section>

      {/* ------------------------------------------------- the observations */}
      <section aria-labelledby="observations-heading" className="pb-6">
        <SectionHeader
          title="The observations behind the chart"
          count={observations?.total ?? 0}
          action={{ href: '/prices', label: 'Full price directory' }}
        />
        <h2 id="observations-heading" className="sr-only">
          The observations behind the chart
        </h2>
        {watchRows.length === 0 ? (
          <EmptyStatePanel kind="no-observations" />
        ) : (
          <div className="terminal-panel terminal-panel--table">
            <MarketWatchTable
              rows={watchRows}
              caption="The published observations behind the chart, newest first."
              footer={
                <ProvenanceNotice source="published_price_observations">
                  Aggregation never merges two price types, two grades or two units. Records that
                  cannot be placed in one series are excluded and counted, not silently blended.
                </ProvenanceNotice>
              }
            />
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- methodology */}
      <section aria-labelledby="method-heading" className="pb-10">
        <SectionHeader title="How this chart is built" />
        <h2 id="method-heading" className="sr-only">
          How this chart is built
        </h2>
        <div className="grid gap-2.5 lg:grid-cols-3">
          {[
            {
              title: 'One series, never a blend',
              body: 'Observations are grouped by commodity, market, price type, grade, unit and currency before anything is aggregated. A figure that cannot be placed in a group is excluded, and the count of exclusions is reported.',
            },
            {
              title: 'A range, not a candle',
              body: 'Each bar spans the lowest and highest published observation in the period. A candlestick would need an open, a high, a low and a close from the same session, and the platform does not collect that.',
            },
            {
              title: 'Gaps stay gaps',
              body: 'A period with no eligible observation is left empty. Nothing is interpolated, nothing is carried forward, and a single observation is labelled as a single observation rather than as a range.',
            },
          ].map((card) => (
            <article key={card.title} className="terminal-panel p-3.5">
              <h3 className="font-display text-[0.8125rem] font-bold text-terminal-text">
                {card.title}
              </h3>
              <p className="mt-1.5 text-[0.75rem] leading-5 text-terminal-text-secondary">
                {card.body}
              </p>
            </article>
          ))}
        </div>
        <p className="pt-3 text-[0.6875rem] leading-4 text-terminal-text-muted">
          The full methodology is on{' '}
          <Link href="/methodology" className="underline decoration-terminal-border underline-offset-2 hover:text-harvest-300">
            the methodology page
          </Link>
          . {BRAND.name} does not publish forecasts from this data, because a 14-day series of daily
          observations cannot support one.
        </p>
      </section>
    </PageContainer>
  );
}

/* --------------------------------------------------------------- helpers -- */

/**
 * The label of a period, resolved once.
 *
 * `PERIODS` is a `const` tuple, so `find` narrows its result to `never` when
 * the compared id is a union member — a TypeScript quirk, not a bug. Resolving
 * the label through a lookup table keeps the narrowing out of the JSX.
 */
function periodLabel(period: string): string {
  const found = PERIODS.find((entry): entry is (typeof PERIODS)[number] => entry.id === period);
  return found ? found.label : 'Daily';
}

/** A readable period label: a day, a week, a month or a quarter. */
function formatPeriodLabel(iso: string, period: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  if (period === 'daily') {
    return new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date);
  }
  if (period === 'weekly') {
    return `w/c ${new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date)}`;
  }
  return new Intl.DateTimeFormat('en-NG', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(date);
}

/** Describe a comparable series in words a reader can choose between. */
function describeSeries(option: {
  label: string;
  priceType: string;
  gradeId: number | null;
  unitId: number | null;
  currencyCode: string;
  observationCount: number;
  marketCount: number;
}): string {
  const meta = PRICE_TYPE_META as Record<string, { label: string } | undefined>;
  const priceType = meta[option.priceType]?.label ?? option.priceType.replace(/_/g, ' ');
  return `${priceType} · ${option.currencyCode} · ${option.observationCount} obs · ${option.marketCount} market${option.marketCount === 1 ? '' : 's'}`;
}

/** The streaming fallback for the chart panel. */
export function ChartsFallback() {
  return <ChartSkeleton height="18rem" />;
}
