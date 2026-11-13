import { buildShareMetadata } from '@/lib/metadata';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getCommoditySeries } from '@/lib/trade/queries';
import { PRICE_STATE_TONES, formatAge } from '@/lib/trade/freshness';
import { EmptyState, PageHeader, Panel, Pill, Price } from '@/components/trade/Primitives';

export const metadata = buildShareMetadata({
  title: 'Watchlist',
  path: '/trade/watchlist',
  indexable: false,
  description:
    'The agricultural commodities and markets you follow, with their latest verified price and data freshness.',
});

export const dynamic = 'force-dynamic';

/**
 * Watchlist.
 *
 * Brief §19 asks for followed commodities, followed markets, saved comparisons
 * and saved research. The schema already has `saved_commodities` and
 * `saved_markets`, both owner-scoped by RLS, so this page reads a real table
 * rather than inventing a new one.
 *
 * It requires an account, because a watchlist is personal data. A visitor is
 * sent to sign-in with a return path, not shown an empty state that looks like
 * a bug.
 */
export default async function TradeWatchlistPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?next=/trade/watchlist');
  }

  if (!isSupabaseConfigured()) {
    return (
      <>
        <PageHeader
          title="Watchlist"
          purpose="The commodities and markets you follow, with their latest verified price."
          breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Watchlist' }]}
        />
        <EmptyState
          title="No market data is connected"
          description="A watchlist needs the Hatsi360 database. Without it there are no prices to follow."
        />
      </>
    );
  }

  const supabase = await createClient();

  const [savedCommodities, savedMarkets] = await Promise.all([
    supabase
      .from('saved_commodities')
      .select('commodity_id, note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_markets')
      .select('market_id, note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const commodityIds = (savedCommodities.data ?? []).map(
    (row) => row.commodity_id as number,
  );
  const marketIds = (savedMarkets.data ?? []).map((row) => row.market_id as number);

  const source = await getDataSource();
  const [allCommodities, allMarkets] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
  ]);

  const followedCommodities = allCommodities.filter((c) => commodityIds.includes(c.id));
  const followedMarkets = allMarkets.filter((m) => marketIds.includes(m.id));

  // One series per followed commodity: the daily candles give the latest close
  // and the freshness assessment in a single read.
  const series = await Promise.all(
    followedCommodities.map(async (commodity) => ({
      commodity,
      result: await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }),
    })),
  );

  return (
    <>
      <PageHeader
        title="Watchlist"
        purpose="The commodities and markets you follow, with the latest verified price and how current it is."
        breadcrumbs={[{ label: 'Trade Intelligence', href: '/trade' }, { label: 'Watchlist' }]}
        actions={
          <Link
            href="/trade/alerts"
            className="inline-flex min-h-[40px] items-center rounded-lg border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
          >
            Manage alerts
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Commodities you follow"
          description="Latest verified price for each, from published observations only."
        >
          {series.length === 0 ? (
            <EmptyState
              title="No commodities followed yet"
              description="Follow a commodity from its terminal page to see its latest verified price here."
              action={{ label: 'Browse commodities', href: '/commodities' }}
            />
          ) : (
            <ul className="space-y-2.5">
              {series.map(({ commodity, result }) => (
                <li
                  key={commodity.id}
                  className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2.5 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/trade/terminal?commodity=${commodity.slug}`}
                      className="text-sm font-semibold text-ink-900 hover:text-brand-700 hover:underline"
                    >
                      {commodity.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {result.freshness
                        ? `Recorded ${formatAge(result.freshness)}`
                        : 'No published observation yet'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Price
                      amount={result.candles?.candles.at(-1)?.close ?? null}
                      className="text-sm font-bold"
                    />
                    {result.freshness ? (
                      <Pill tone={PRICE_STATE_TONES[result.freshness.state]}>
                        {result.freshness.label}
                      </Pill>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Markets you follow"
          description="Markets under coverage that you have saved."
        >
          {followedMarkets.length === 0 ? (
            <EmptyState
              title="No markets followed yet"
              description="Save a market from its detail page to track it here."
              action={{ label: 'Browse markets', href: '/markets' }}
            />
          ) : (
            <ul className="space-y-2">
              {followedMarkets.map((market) => (
                <li key={market.id}>
                  <Link
                    href={`/markets/${market.slug}`}
                    className="text-sm font-medium text-ink-900 hover:text-brand-700 hover:underline"
                  >
                    {market.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
