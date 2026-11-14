import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getCommodityFreshness,
  getMarketMovements,
} from '@/lib/trade/queries';
import { PRICE_STATE_TONES, requiresFreshnessWarning } from '@/lib/trade/freshness';
import { buildShareMetadata } from '@/lib/metadata';
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from '@/components/terminal/TerminalShell';
import {
  MarketOverviewCard,
  MarketMovers,
  type MoverRow,
} from '@/components/market/MarketOverview';
import { MarketWatchTable, type MarketWatchRow } from '@/components/market/MarketWatchTable';
import { EmptyStatePanel, MarketTableSkeleton } from '@/components/feedback/TerminalFeedback';
import { IconArrowRight, IconScale, IconTrade } from '@/components/ui/icons';

export const metadata = buildShareMetadata({
  title: 'Trade Intelligence',
  path: '/trade',
  description:
    'Which Nigerian agricultural commodities are moving, where the best verified prices were recorded, and how current the data is.',
});

export const dynamic = 'force-dynamic';

/**
 * Trade Intelligence overview.
 *
 * The terminal's trade surface answers four questions immediately, in this
 * order, and keeps the metric row deliberately short:
 *
 *   1. What is covered, and how current is it?
 *   2. Which commodities are moving?
 *   3. Where were the best prices recorded?
 *   4. How fresh is the data?
 *
 * Every figure comes from published observations. When there are none, the page
 * says so rather than showing a zero that reads as a measured fact.
 */
export default async function TradeOverviewPage() {
  const configured = isSupabaseConfigured();

  const [movements, freshness, commodities, markets] = configured
    ? await Promise.all([
        getMarketMovements(40),
        getCommodityFreshness(),
        (await getDataSource()).listCommodities(),
        (await getDataSource()).listMarkets(),
      ])
    : [[], [], [], []];

  const rising = movements.filter((m) => (m.change ?? 0) > 0).length;
  const falling = movements.filter((m) => (m.change ?? 0) < 0).length;
  const withChange = movements.filter((m) => m.change != null).length;

  const stale = freshness.filter((f) => requiresFreshnessWarning(f.state));
  const usable = freshness.filter(
    (f) => f.state === 'recently_updated' || f.state === 'latest_verified',
  );

  /**
   * The watch rows. Every column the brief's market table system names is
   * present — commodity, market, price, currency, unit, price type, grade,
   * movement, last observed, verification — and a price is never rendered
   * without its unit beside it.
   */
  const watchRows: MarketWatchRow[] = movements.map((row) => ({
    id: String(row.commodityId),
    commodityName: row.commodityName,
    commoditySlug: row.commoditySlug,
    marketName: row.marketName,
    marketSlug: null,
    amount: row.latestAmount,
    currencyCode: row.currencyCode,
    unitLabel: row.unitName,
    priceTypeLabel: row.priceType.replace(/_/g, ' '),
    gradeName: row.gradeName,
    changePercent: row.changePercent,
    observedAt: row.collectedAt,
    verificationStatus: row.verificationStatus,
    href: `/commodities/${row.commoditySlug}`,
  }));

  const movers: MoverRow[] = movements.map((row) => ({
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

  const publishedObservations = movements.reduce((sum, m) => sum + m.observationCount, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Trade intelligence"
        description="Latest verified agricultural commodity prices across Nigerian markets, how they are moving, and where the best prices were recorded."
        actions={
          <>
            <Link href="/trade/best-buy" className="terminal-action">
              <IconScale className="size-3.5" />
              Sourcing
            </Link>
            <Link href="/trade/best-sell" className="terminal-action">
              <IconScale className="size-3.5" />
              Procurement
            </Link>
            <Link href="/trade/terminal" className="terminal-action">
              <IconTrade className="size-3.5" />
              Terminal
            </Link>
          </>
        }
      />

      {!configured ? (
        <EmptyStatePanel
          kind="no-market-data"
          action={{ label: 'See collection coverage', href: '/coverage' }}
        />
      ) : (
        <>
          {/* ------------------------------------------------ what is covered */}
          <section aria-label="Coverage">
            <dl className="grid gap-2 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <MarketOverviewCard
                label="Commodities"
                value={String(commodities.length)}
                detail="in the catalogue"
                href="/commodities"
              />
              <MarketOverviewCard
                label="Markets"
                value={String(markets.length)}
                detail="under coverage"
                href="/markets"
              />
              <MarketOverviewCard
                label="Published prices"
                value={String(publishedObservations)}
                detail="across the commodities listed below"
              />
              <MarketOverviewCard
                label="Rising"
                value={String(rising)}
                detail={
                  withChange > 0
                    ? `of ${withChange} with a comparable previous price`
                    : 'no comparable previous price yet'
                }
              />
              <MarketOverviewCard
                label="Falling"
                value={String(falling)}
                detail={
                  withChange > 0
                    ? `of ${withChange} with a comparable previous price`
                    : 'no comparable previous price yet'
                }
              />
              <MarketOverviewCard
                label="Current"
                value={String(usable.length)}
                detail="commodities with usable data"
                unavailableReason={
                  stale.length > 0
                    ? `${stale.length} commodity${stale.length === 1 ? '' : 's'} past the freshness threshold`
                    : undefined
                }
              />
            </dl>
          </section>

          {/* ------------------------------------------------------ movers -- */}
          <div className="grid gap-2 lg:grid-cols-2">
            <MarketMovers
              direction="gainers"
              rows={movers}
              emptyReason="No commodity has two comparable published observations, so no rise can be calculated. A change is only shown when both prices come from the same price type, grade, unit and currency."
            />
            <MarketMovers
              direction="decliners"
              rows={movers}
              emptyReason="No commodity has two comparable published observations, so no fall can be calculated. A change is only shown when both prices come from the same price type, grade, unit and currency."
            />
          </div>

          {/* -------------------------------------------------- movers table -- */}
          <section aria-label="Market movement">
            <SectionHeader
              title="Market movement"
              count={movements.length}
              action={{ href: '/trade/best-buy', label: 'Sourcing intelligence' }}
            />
            {movements.length === 0 ? (
              <EmptyStatePanel
                kind="no-market-data"
                action={{
                  label: 'How a price becomes a published price',
                  href: '/methodology',
                }}
              />
            ) : (
              <>
                <MarketWatchTable
                  rows={watchRows}
                  caption={`Each commodity's latest published observation against the previous one in the same price series, ${movements.length} commodities listed.`}
                />
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  A movement is calculated only where both observations share a series key —
                  the same price type, grade, unit and currency. A change in price type is
                  never shown as a change in price.
                </p>
              </>
            )}
          </section>

          {/* --------------------------------------------------- freshness -- */}
          <section aria-label="Data freshness">
            <SectionHeader
              title="Data freshness"
              count={freshness.length}
              action={{ href: '/methodology', label: 'How freshness is classified' }}
            />
            {freshness.length === 0 ? (
              <EmptyStatePanel kind="no-observations" />
            ) : (
              <>
                <div className="terminal-panel overflow-x-auto">
                  <table className="terminal-table">
                    <caption className="sr-only">
                      How current each commodity&rsquo;s newest published observation is. The
                      state is calculated from the collection time and the commodity&rsquo;s
                      configured cadence.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Commodity</th>
                        <th scope="col">State</th>
                        <th scope="col">Observations</th>
                        <th scope="col">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {freshness.slice(0, 12).map((row) => {
                        return (
                          <tr key={row.commodityId}>
                            <th scope="row" className="font-medium text-terminal-text">
                              {row.commodityName}
                            </th>
                            <td>
                              <span
                                className={`inline-flex items-center rounded-pill border px-2 py-0.5 text-[0.6875rem] font-semibold ${PRICE_STATE_TONES[row.state]}`}
                              >
                                {row.label}
                              </span>
                            </td>
                            <td className="num text-terminal-text-secondary">
                              {row.observationCount}
                            </td>
                            <td className="num text-terminal-text-secondary">
                              {row.collectedAt
                                ? new Date(row.collectedAt).toLocaleDateString('en-NG')
                                : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-terminal-text-muted">
                  A price is <span className="font-semibold">latest verified</span> when it
                  has been checked but is no longer current — it is still the best available
                  answer. It is <span className="font-semibold">stale</span> only when it is
                  past the point of being useful. Freshness describes when the data was
                  collected, never when this page loaded.
                </p>
              </>
            )}
          </section>

          <p className="text-[0.6875rem] leading-relaxed text-terminal-text-muted">
            Every figure on this page is read from published observations and recomputed on
            each request. Nothing here is cached, estimated or carried over from a previous
            period.{' '}
            <Link
              href="/methodology"
              className="inline-flex items-center gap-1 font-semibold text-harvest-300 underline decoration-terminal-border underline-offset-2"
            >
              How a price becomes a published price
              <IconArrowRight className="size-3" aria-hidden="true" />
            </Link>
          </p>
        </>
      )}
    </PageContainer>
  );
}

/** Trade intelligence while its data loads. */
export function TradeLoading() {
  return (
    <PageContainer>
      <PageHeader
        title="Trade intelligence"
        description="Reading the published observations, the movements and the freshness of each commodity."
      />
      <MarketTableSkeleton rows={8} />
    </PageContainer>
  );
}
