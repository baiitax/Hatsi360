import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MarketsClient } from './MarketsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Markets — Hatsi360',
  description: 'Browse agricultural markets across Nigeria',
};

export default async function MarketsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?returnUrl=/client/markets');
  }

  // Fetch all active markets
  const { data: markets } = await supabase
    .from('markets')
    .select('id, name, slug, state, city, market_type, is_active')
    .eq('is_active', true)
    .order('name');

  // Get user's saved markets
  const { data: savedMarkets } = await supabase
    .from('saved_markets')
    .select('market_id')
    .eq('user_id', session.user.id);

  // Get latest prices per market
  const { data: latestPrices } = await supabase
    .from('latest_market_prices')
    .select('market_id, median_price, commodity_name, observed_on');

  const savedIds = new Set(savedMarkets?.map((s) => s.market_id) || []);

  // Enrich markets with price data
  const marketsWithData = (markets || []).map((m) => {
    const prices = latestPrices?.filter((p) => p.market_id === m.id) || [];
    const commodityCount = prices.length;
    const latestObservation = prices.sort((a, b) => 
      new Date(b.observed_on).getTime() - new Date(a.observed_on).getTime()
    )[0];
    
    return {
      ...m,
      is_saved: savedIds.has(m.id),
      commodity_count: commodityCount,
      latest_observation: latestObservation || null,
    };
  });

  return <MarketsClient markets={marketsWithData} userId={session.user.id} />;
}
