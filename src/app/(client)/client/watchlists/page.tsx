import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WatchlistsClient } from './WatchlistsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Watchlists — Hatsi360',
  description: 'Manage your saved commodities and markets',
};

export default async function WatchlistsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?returnUrl=/client/watchlists');
  }

  // Fetch user's saved commodities and markets in parallel
  const [savedCommoditiesResult, savedMarketsResult, allCommoditiesResult, allMarketsResult] = await Promise.all([
    supabase
      .from('saved_commodities')
      .select(`
        id,
        note,
        created_at,
        commodities:commodity_id(id, name, slug, category, image_url)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('saved_markets')
      .select(`
        id,
        note,
        created_at,
        markets:market_id(id, name, slug, state, city)
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    // All commodities for the "add" modal
    supabase
      .from('commodities')
      .select('id, name, slug, category, image_url')
      .order('name'),
    // All active markets for the "add" modal
    supabase
      .from('markets')
      .select('id, name, slug, state, city')
      .eq('is_active', true)
      .order('name'),
  ]);

  // Normalize array relations
  const savedCommodities = (savedCommoditiesResult.data || []).map((sc: any) => ({
    ...sc,
    commodity: Array.isArray(sc.commodities) ? sc.commodities[0] : sc.commodities,
  }));

  const savedMarkets = (savedMarketsResult.data || []).map((sm: any) => ({
    ...sm,
    market: Array.isArray(sm.markets) ? sm.markets[0] : sm.markets,
  }));

  // Check entitlement
  const { data: hasWatchlistEntitlement } = await supabase.rpc('has_entitlement', {
    entitlement_key: 'watchlists',
  });

  return (
    <WatchlistsClient
      savedCommodities={savedCommodities}
      savedMarkets={savedMarkets}
      allCommodities={allCommoditiesResult.data || []}
      allMarkets={allMarketsResult.data || []}
      hasEntitlement={!!hasWatchlistEntitlement}
    />
  );
}
