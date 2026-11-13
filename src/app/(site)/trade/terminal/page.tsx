import { buildShareMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getCommodityOpportunities,
  getCommoditySeries,
  getCommoditySeriesOptions,
} from '@/lib/trade/queries';
import {
  PRICE_STATE_TONES,
  describePriceType,
  formatAge,
  requiresFreshnessWarning,
} from '@/lib/trade/freshness';
import {
  SUPPORTED_TIMEFRAMES,
  describeSeries,
  timeframeReadiness,
  UNSUPPORTED_TIMEFRAMES,
  type Timeframe,
} from '@/lib/trade/candles';
import { CandleChart, ObservationCountPanel } from '@/components/trade/CandleChart';
import {
  Change,
  EmptyState,
  OpportunityDisclosure,
  PageHeader,
  Panel,
  Pill,
  Price,
} from '@/components/trade/Primitives';

export const metadata = buildShareMetadata({
  title: 'Trading terminal',
  path: '/trade/terminal',
  description:
    'Commodity trading terminal: candlestick price charts, market comparison and the latest verified agricultural prices across Nigerian markets.',
});

export const dynamic = 'force-dynamic';

const TIMEFRAMES: Timeframe[] = ['daily', 'weekly', 'monthly', 'quarterly'];

function parseTimeframe(value: string | undefined): Timeframe {
  return TIMEFRAMES.includes(value as Timeframe) ? (value as Timeframe) : 'daily';
}

/**
 * The commodity trading terminal.
 *
 * Brief §5.1 asks for a five-region layout: market header, watchlist, chart,
 * intelligence panel and market data panel. This page implements those five
 * regions, adapted for a public page rather than a logged-in desktop
 * application — the watchlist becomes a commodity selector, because a public
 * visitor has no saved watchlist to show.
 *
 * What it will not do:
 *
 *   - offer an intraday timeframe. There is no sub-daily collection.
 *   - render a chart from data that does not exist.
 *   - label observation counts as volume.
 *   - present a recorded price as a commercial offer.
 */
export default async function TradeTerminalPage({
  searchParams,
}: {
  searchParams: Promise<{ commodity?: string; timeframe?: string; market?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  const commodities = configured ? await (await getDataSource()).listCommodities() : [];
  const markets = configured ? await (await getDataSource()).listMarkets() : [];

  const selected =
    commodities.find((c) => c.slug === params.commodity) ??
    commodities.find((c) => String(c.id) === params.commodity) ??
    commodities[0] ??
    null;

  const timeframe = parseTimeframe(params.timeframe);
  const marketId = params.market ? Number(params.market) : null;
  const market = markets.find((m) => m.id === marketId) ?? null;

  if (!configured || !selected) {
    return (
      <>
        <PageHeader
          title="Trading terminal"
          purpose="Candlestick price movement and market comparison for one commodity, from published observations only."
          breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Terminal' }]}
        />
        <EmptyState
          title={configured ? 'No commodities in the catalogue' : 'No market data is connected'}
          description={
            configured
              ? 'The terminal needs at least one commodity in the catalogue before it can show a price series.'
              : 'The terminal reads published price observations from the Hatsi360 database. Without a configured database there is nothing to chart, and nothing is invented.'
          }
        />
      </>
    );
  }

  const [series, opportunities, seriesOptions] = await Promise.all([
    getCommoditySeries({
      commodityId: selected.id,
      marketId,
      timeframe,
    }),
    getCommodityOpportunities(selected.id),
    getCommoditySeriesOptions(selected.id),
  ]);

  const readiness = series.candles
    ? timeframeReadiness(series.candles, timeframe)
    : { ready: false, reason: series.unavailableReason };

  const provenance = series.candles
    ? describeSeries(series.candles, {
        commodityName: selected.name,
        marketName: market?.name ?? null,
        priceTypeLabel: describePriceType(
          series.candles.seriesKey?.priceType ?? 'unspecified',
        ),
        gradeName: null,
        unitName: null,
        currencyCode: series.candles.seriesKey?.currencyCode ?? 'NGN',
        verifiedOnly: true,
      })
    : null;

  const symbol = series.candles?.seriesKey?.currencyCode === 'NGN' ? '₦' : '₦';

  return (
    <>
      <PageHeader
        title={selected.name}
        purpose="Latest verified price, candlestick movement and market comparison for this commodity."
        breadcrumbs={[
          { label: 'Trade Intelligence', href: '/trade' },
          { label: 'Terminal' },
          { label: selected.name },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_300px]">
        {/* ------------------------------------------------ left: selector */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <Panel title="Commodity" description="Select a commodity to chart.">
            <ul className="space-y-0.5">
              {commodities.map((commodity) => {
                const active = commodity.id === selected.id;
                return (
                  <li key={commodity.id}>
                    <Link
                      href={`/trade/terminal?commodity=${commodity.slug}&timeframe=${timeframe}`}
                      className={`block rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-ink-700 hover:bg-ink-50'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {commodity.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {seriesOptions.length > 1 ? (
            <div className="mt-4">
              <Panel
                title="Comparable series"
                description="Only prices sharing a price type, grade, unit and currency may be charted together."
              >
                <ul className="space-y-1.5">
                  {seriesOptions.slice(0, 6).map((option) => (
                    <li key={option.key} className="text-[11px] leading-snug text-ink-700">
                      <span className="font-semibold text-ink-900">
                        {option.priceType.replace(/_/g, ' ')}
                      </span>
                      <br />
                      {option.observationCount} price
                      {option.observationCount === 1 ? '' : 's'} ·{' '}
                      {option.marketCount} market
                      {option.marketCount === 1 ? '' : 's'} · {option.currencyCode}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------ centre: chart */}
        <div className="min-w-0 space-y-4">
          {/* market header */}
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Latest verified price
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <Price
                    amount={latestAmount(series)}
                    currencySymbol={symbol}
                    className="font-display text-3xl font-bold"
                  />
                  {series.freshness ? (
                    <Pill tone={PRICE_STATE_TONES[series.freshness.state]}>
                      {series.freshness.label}
                    </Pill>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-ink-600">
                  {series.freshness
                    ? `Recorded ${formatAge(series.freshness)} · ${
                        series.freshness.isDayPrecisionOnly
                          ? 'day precision only'
                          : 'minute precision'
                      }`
                    : 'No published observation for this selection'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Movement
                </p>
                <Change
                  amount={opportunities.spread.spread}
                  percent={opportunities.spread.spreadPercent}
                  currencySymbol={symbol}
                />
                <p className="mt-0.5 text-[11px] text-ink-500">
                  between the highest and lowest comparable market
                </p>
              </div>
            </div>

            {series.freshness && requiresFreshnessWarning(series.freshness.state) ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] leading-relaxed text-amber-900">
                <span className="font-bold">{series.freshness.label}. </span>
                {series.freshness.explanation}
              </p>
            ) : null}
          </div>

          {/* timeframe controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Timeframe">
              {TIMEFRAMES.map((option) => {
                const active = option === timeframe;
                const meta = SUPPORTED_TIMEFRAMES[option];
                return (
                  <Link
                    key={option}
                    href={`/trade/terminal?commodity=${selected.slug}&timeframe=${option}${
                      marketId ? `&market=${marketId}` : ''
                    }`}
                    title={meta.note}
                    aria-current={active ? 'true' : undefined}
                    className={`inline-flex min-h-[34px] items-center rounded-lg border px-3 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-brand-700 bg-brand-700 text-white'
                        : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50'
                    }`}
                  >
                    {meta.label}
                  </Link>
                );
              })}
            </div>

            {/* market filter */}
            <form method="get" className="flex items-center gap-2">
              <input type="hidden" name="commodity" value={selected.slug} />
              <input type="hidden" name="timeframe" value={timeframe} />
              <label htmlFor="market" className="text-xs font-semibold text-ink-600">
                Market
              </label>
              <select
                id="market"
                name="market"
                defaultValue={marketId ? String(marketId) : ''}
                className="min-h-[34px] rounded-lg border border-ink-200 bg-white px-2 text-xs text-ink-800"
              >
                <option value="">All comparable markets</option>
                {markets.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="min-h-[34px] rounded-lg border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-800 hover:bg-ink-50"
              >
                Apply
              </button>
            </form>
          </div>

          {/* the chart */}
          <Panel
            title={`${SUPPORTED_TIMEFRAMES[timeframe].label} candles`}
            description={SUPPORTED_TIMEFRAMES[timeframe].note}
          >
            {series.candles && series.candles.candles.length > 0 ? (
              <>
                <CandleChart
                  candles={series.candles.candles}
                  gaps={series.candles.gaps}
                  height={340}
                  caption={`${selected.name} ${SUPPORTED_TIMEFRAMES[
                    timeframe
                  ].label.toLowerCase()} candlestick chart, from ${
                    series.candles.totalObservations
                  } published observations`}
                />
                {readiness.ready ? null : (
                  <p className="mt-2 text-[11px] leading-relaxed text-amber-900">
                    {readiness.reason}
                  </p>
                )}
                {provenance ? (
                  <div className="mt-3 border-t border-ink-100 pt-3">
                    <p className="text-[11px] font-semibold text-ink-800">
                      {provenance.summary}
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {provenance.disclosures.map((line) => (
                        <li key={line} className="text-[11px] leading-snug text-ink-600">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="No candle can be drawn"
                description={
                  series.unavailableReason ??
                  'No published observation exists for this selection yet.'
                }
                action={{ label: 'See coverage', href: '/coverage' }}
              />
            )}
          </Panel>

          {/* observation counts */}
          {series.candles && series.candles.candles.length > 0 ? (
            <ObservationCountPanel
              candles={series.candles.candles}
              marketCoverage={series.candles.marketCoverage}
              sourceCoverage={series.candles.sourceCoverage}
            />
          ) : null}

          {/* bottom: market data */}
          <Panel
            title="Market comparison"
            description="The comparable markets for this commodity, priced from the same series."
          >
            {opportunities.spread.available && opportunities.spread.buyMarket ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-ink-200 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      Lowest recorded
                    </p>
                    <Price
                      amount={opportunities.spread.buyMarket.amount}
                      currencySymbol={symbol}
                      className="mt-1 block text-lg font-bold"
                    />
                    <p className="mt-0.5 text-xs text-ink-700">
                      {opportunities.spread.buyMarket.marketName}
                    </p>
                    <p className="text-[11px] tabular-nums text-ink-500">
                      {new Date(opportunities.spread.buyMarket.collectedAt).toLocaleDateString(
                        'en-NG',
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ink-200 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                      Highest recorded
                    </p>
                    <Price
                      amount={opportunities.spread.sellMarket?.amount ?? null}
                      currencySymbol={symbol}
                      className="mt-1 block text-lg font-bold"
                    />
                    <p className="mt-0.5 text-xs text-ink-700">
                      {opportunities.spread.sellMarket?.marketName}
                    </p>
                    <p className="text-[11px] tabular-nums text-ink-500">
                      {opportunities.spread.sellMarket
                        ? new Date(
                            opportunities.spread.sellMarket.collectedAt,
                          ).toLocaleDateString('en-NG')
                        : '—'}
                    </p>
                  </div>
                </div>

                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-ink-500">
                      Spread
                    </dt>
                    <dd className="text-sm font-bold tabular-nums text-ink-900">
                      {symbol}
                      {(opportunities.spread.spread ?? 0).toLocaleString('en-NG', {
                        maximumFractionDigits: 0,
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-ink-500">
                      As %
                    </dt>
                    <dd className="text-sm font-bold tabular-nums text-ink-900">
                      {opportunities.spread.spreadPercent != null
                        ? `${opportunities.spread.spreadPercent.toFixed(1)}%`
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-ink-500">
                      Markets
                    </dt>
                    <dd className="text-sm font-bold tabular-nums text-ink-900">
                      {opportunities.spread.comparableMarketCount}
                    </dd>
                  </div>
                </dl>

                {opportunities.spread.warnings.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-ink-100 pt-2">
                    {opportunities.spread.warnings.map((warning) => (
                      <li
                        key={warning}
                        className="text-[11px] leading-snug text-amber-900"
                      >
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="text-xs leading-relaxed text-ink-600">
                {opportunities.spread.reason ??
                  opportunities.unavailableReason ??
                  'No comparable market data is available for this commodity.'}
              </p>
            )}
          </Panel>
        </div>

        {/* --------------------------------------------- right: intelligence */}
        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Panel
            title="Opportunities"
            description="Extreme verified prices, not commercial offers."
          >
            <OpportunityDisclosure text={opportunities.bestBuy.disclosure} />
            <div className="mt-3 space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Lowest verified price
                </p>
                {opportunities.bestBuy.best ? (
                  <>
                    <Price
                      amount={opportunities.bestBuy.best.amount}
                      currencySymbol={symbol}
                      className="mt-0.5 block text-lg font-bold"
                    />
                    <p className="text-xs text-ink-700">
                      {opportunities.bestBuy.best.marketName}
                    </p>
                    <Link
                      href="/trade/best-buy"
                      className="mt-1 inline-block text-[11px] font-semibold text-brand-700 hover:underline"
                    >
                      See all comparable markets
                    </Link>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-ink-600">
                    No comparable published price.
                  </p>
                )}
              </div>
              <div className="border-t border-ink-100 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                  Highest verified price
                </p>
                {opportunities.bestSell.best ? (
                  <>
                    <Price
                      amount={opportunities.bestSell.best.amount}
                      currencySymbol={symbol}
                      className="mt-0.5 block text-lg font-bold"
                    />
                    <p className="text-xs text-ink-700">
                      {opportunities.bestSell.best.marketName}
                    </p>
                    <Link
                      href="/trade/best-sell"
                      className="mt-1 inline-block text-[11px] font-semibold text-brand-700 hover:underline"
                    >
                      See all comparable markets
                    </Link>
                  </>
                ) : (
                  <p className="mt-1 text-xs text-ink-600">
                    No comparable published price.
                  </p>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Costs" description="Why no landed cost is shown.">
            <p className="text-[11px] leading-relaxed text-ink-600">
              {opportunities.bestBuy.cost.reason}
            </p>
          </Panel>

          <Panel title="Intraday timeframes" description="Why they are absent.">
            <ul className="space-y-1.5">
              {UNSUPPORTED_TIMEFRAMES.map((option) => (
                <li key={option.code} className="text-[11px] leading-snug text-ink-600">
                  <span className="font-semibold text-ink-800">{option.label}</span> —{' '}
                  {option.reason}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

/** The most recent comparable amount in the series. */
function latestAmount(series: { candles: { candles: { close: number }[] } | null }): number | null {
  const candles = series.candles?.candles ?? [];
  return candles.length > 0 ? candles[candles.length - 1].close : null;
}
