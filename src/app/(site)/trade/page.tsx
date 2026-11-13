import { buildShareMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getCommodityFreshness,
  getMarketMovements,
} from '@/lib/trade/queries';
import {
  PRICE_STATE_TONES,
  requiresFreshnessWarning,
} from '@/lib/trade/freshness';
import {
  Change,
  EmptyState,
  Metric,
  PageHeader,
  Panel,
  Pill,
  Price,
} from '@/components/trade/Primitives';

export const metadata = buildShareMetadata({
  title: 'Market overview',
  path: '/trade',
  description:
    'Which Nigerian agricultural commodities are moving, where the best verified prices were recorded, and how current the data is.',
});

export const dynamic = 'force-dynamic';

/**
 * Trade Intelligence overview.
 *
 * Brief §4 asks this page to answer five questions immediately. It answers
 * them in this order, with the metric row kept deliberately short:
 *
 *   1. What is covered, and how current is it?
 *   2. Which commodities are moving?
 *   3. Where were the best prices recorded?
 *   4. How fresh is the data?
 *
 * Every figure comes from published observations. When there are none, the
 * page says so rather than showing a zero that looks like a measured fact.
 */
export default async function TradeOverviewPage() {
  const configured = isSupabaseConfigured();

  const [movements, freshness, commodities] = configured
    ? await Promise.all([
        getMarketMovements(40),
        getCommodityFreshness(),
        (await getDataSource()).listCommodities(),
      ])
    : [[], [], []];

  const markets = configured ? await (await getDataSource()).listMarkets() : [];

  const rising = movements.filter((m) => (m.change ?? 0) > 0).length;
  const falling = movements.filter((m) => (m.change ?? 0) < 0).length;
  const withChange = movements.filter((m) => m.change != null).length;

  const stale = freshness.filter((f) => requiresFreshnessWarning(f.state));
  const recent = freshness.filter((f) => f.state === 'recently_updated');
  const latestVerified = freshness.filter((f) => f.state === 'latest_verified');

  const largestRise = [...movements]
    .filter((m) => m.change != null)
    .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))[0];
  const largestFall = [...movements]
    .filter((m) => m.change != null)
    .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))[0];

  return (
    <>
      <PageHeader
        title="Trade Intelligence"
        purpose="Latest verified agricultural commodity prices across Nigerian markets, how they are moving, and where the best prices were recorded."
        breadcrumbs={[{ label: 'Trade Intelligence' }]}
        actions={
          <Link
            href="/trade/terminal"
            className="inline-flex min-h-[40px] items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Open terminal
          </Link>
        }
      />

      {/* ------------------------------------------------- how current is it */}
      {!configured ? (
        <EmptyState
          title="No market data is connected"
          description="Trade Intelligence reads published price observations from the Hatsi360 database. Without a configured database there are no prices to show, and none are invented."
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric
              label="Commodities"
              value={String(commodities.length)}
              period="in the catalogue"
              href="/commodities"
            />
            <Metric
              label="Markets"
              value={String(markets.length)}
              period="under coverage"
              href="/markets"
            />
            <Metric
              label="Published prices"
              value={String(
                movements.reduce((sum, m) => sum + m.observationCount, 0),
              )}
              period="across the commodities listed below"
            />
            <Metric
              label="Rising"
              value={String(rising)}
              period={
                withChange > 0
                  ? `of ${withChange} with a comparable previous price`
                  : 'no comparable previous price yet'
              }
            />
            <Metric
              label="Falling"
              value={String(falling)}
              period={
                withChange > 0
                  ? `of ${withChange} with a comparable previous price`
                  : 'no comparable previous price yet'
              }
            />
            <Metric
              label="Current"
              value={`${recent.length + latestVerified.length}`}
              period="commodities with usable data"
              note={
                stale.length > 0
                  ? `${stale.length} commodity${
                      stale.length === 1 ? '' : 's'
                    } past the freshness threshold`
                  : undefined
              }
            />
          </dl>

          {/* ---------------------------------------------------- highlights */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Panel
              title="Largest verified movement"
              description="Compared with the previous observation in the same price series."
            >
              {largestRise || largestFall ? (
                <ul className="space-y-3">
                  {[largestRise, largestFall]
                    .filter(Boolean)
                    .map((row, index) => (
                      <li
                        key={`${row!.commodityId}-${index}`}
                        className="flex items-start justify-between gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/trade/terminal?commodity=${row!.commoditySlug}`}
                            className="text-sm font-semibold text-ink-900 hover:text-brand-700 hover:underline"
                          >
                            {row!.commodityName}
                          </Link>
                          <p className="mt-0.5 text-xs text-ink-600">
                            {row!.marketName ?? 'Market not recorded'} ·{' '}
                            {row!.priceType.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Price
                            amount={row!.latestAmount}
                            currencySymbol={currencySymbolFor(row!.currencyCode)}
                          />
                          <Change
                            amount={row!.change}
                            percent={row!.changePercent}
                            currencySymbol={currencySymbolFor(row!.currencyCode)}
                          />
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-ink-600">
                  No commodity has two comparable published observations yet, so
                  no movement can be calculated. A change is only shown when both
                  prices come from the same price type, grade, unit and currency.
                </p>
              )}
            </Panel>

            <Panel
              title="Data freshness"
              description="How current each commodity's newest published price is."
            >
              {freshness.length === 0 ? (
                <p className="text-xs leading-relaxed text-ink-600">
                  No published observation exists yet, so there is no freshness to
                  report.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {freshness.slice(0, 8).map((row) => (
                    <li
                      key={row.commodityId}
                      className="flex items-center justify-between gap-3"
                    >
                      <Link
                        href={`/trade/terminal?commodity=${row.commodityId}`}
                        className="min-w-0 truncate text-xs font-medium text-ink-800 hover:text-brand-700 hover:underline"
                      >
                        {row.commodityName}
                      </Link>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] tabular-nums text-ink-500">
                          {row.collectedAt
                            ? new Date(row.collectedAt).toLocaleDateString('en-NG')
                            : '—'}
                        </span>
                        <Pill tone={PRICE_STATE_TONES[row.state]}>{row.label}</Pill>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 border-t border-ink-100 pt-2 text-[11px] leading-relaxed text-ink-500">
                A price is <span className="font-semibold">latest verified</span>{' '}
                when it has been checked but is no longer current — it is still
                the best available answer. It is{' '}
                <span className="font-semibold">stale</span> only when it is past
                the point of being useful.
              </p>
            </Panel>
          </div>

          {/* ------------------------------------------------ movement table */}
          <div className="mt-6">
            <Panel
              title="Market movement"
              description="Each commodity's latest published observation against the previous one in the same price series."
              actions={
                <Link
                  href="/trade/best-buy"
                  className="text-xs font-semibold text-brand-700 hover:underline"
                >
                  Buying opportunities
                </Link>
              }
            >
              {movements.length === 0 ? (
                <EmptyState
                  title="No published prices yet"
                  description="Movements are calculated from published observations. Once a commodity has two comparable published prices, its movement appears here."
                  action={{ label: 'See how prices are verified', href: '/methodology' }}
                />
              ) : (
                <div className="-mx-4 overflow-x-auto px-4">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-[11px] uppercase tracking-wide text-ink-500">
                        <th scope="col" className="py-2 pr-3 font-semibold">
                          Commodity
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">
                          Latest
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">
                          Previous
                        </th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">
                          Change
                        </th>
                        <th scope="col" className="py-2 pr-3 font-semibold">
                          Market
                        </th>
                        <th scope="col" className="py-2 pr-3 font-semibold">
                          Price type
                        </th>
                        <th scope="col" className="py-2 text-right font-semibold">
                          Recorded
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((row) => (
                        <tr
                          key={row.commodityId}
                          className="border-b border-ink-100 last:border-0"
                        >
                          <td className="py-2 pr-3">
                            <Link
                              href={`/trade/terminal?commodity=${row.commoditySlug}`}
                              className="font-medium text-ink-900 hover:text-brand-700 hover:underline"
                            >
                              {row.commodityName}
                            </Link>
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <Price
                              amount={row.latestAmount}
                              currencySymbol={currencySymbolFor(row.currencyCode)}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <Price
                              amount={row.previousAmount}
                              currencySymbol={currencySymbolFor(row.currencyCode)}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <Change
                              amount={row.change}
                              percent={row.changePercent}
                              currencySymbol={currencySymbolFor(row.currencyCode)}
                            />
                          </td>
                          <td className="py-2 pr-3 text-xs text-ink-700">
                            {row.marketName ?? '—'}
                          </td>
                          <td className="py-2 pr-3 text-xs text-ink-600">
                            {row.priceType.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2 text-right text-[11px] tabular-nums text-ink-500">
                            {new Date(row.collectedAt).toLocaleDateString('en-NG')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

/** The symbol for a currency code. Only NGN is used today. */
function currencySymbolFor(code: string): string {
  return code === 'NGN' ? '₦' : `${code} `;
}
