import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CommoditiesClient } from './CommoditiesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Commodities — Hatsi360',
  description: 'Browse and explore agricultural commodities tracked by Hatsi360',
};

export default async function CommoditiesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?returnUrl=/client/commodities');
  }

  // Fetch all commodities with latest price
  const { data: commodities } = await supabase
    .from('commodities')
    .select(`
      id,
      name,
      slug,
      category,
      image_url,
      description
    `)
    .order('name');

  // Get user's saved commodities
  const { data: savedCommodities } = await supabase
    .from('saved_commodities')
    .select('commodity_id')
    .eq('user_id', session.user.id);

  // Get latest prices for all commodities
  const { data: latestPrices } = await supabase
    .from('latest_market_prices')
    .select('commodity_id, median_price, price_unit, price_currency, market_name, observed_on');

  const savedIds = new Set(savedCommodities?.map((s) => s.commodity_id) || []);

  // Map prices to commodities
  const commoditiesWithPrices = (commodities || []).map((c) => {
    const price = latestPrices?.find((p) => p.commodity_id === c.id);
    return {
      ...c,
      latest_price: price?.median_price || null,
      price_unit: price?.price_unit || null,
      price_currency: price?.price_currency || null,
      market_name: price?.market_name || null,
      price_date: price?.observed_on || null,
      is_saved: savedIds.has(c.id),
    };
  });

  return <CommoditiesClient commodities={commoditiesWithPrices} userId={session.user.id} />;
}
