import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AnalyticsClient } from './AnalyticsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Price Analytics — Hatsi360',
  description: 'Advanced price analytics and historical data analysis',
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?returnUrl=/client/analytics');
  }

  // Fetch commodities for the selector
  const { data: commodities } = await supabase
    .from('commodities')
    .select('id, name, slug, category')
    .order('name');

  // Fetch active markets for the selector
  const { data: markets } = await supabase
    .from('markets')
    .select('id, name, slug, state')
    .eq('is_active', true)
    .order('name');

  // Fetch recent price observations (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: observations } = await supabase
    .from('price_observations')
    .select(`
      observed_on,
      median_price,
      min_price,
      max_price,
      observation_count,
      commodity_id,
      market_id,
      commodities:commodity_id(name, slug),
      markets:market_id(name, slug)
    `)
    .gte('observed_on', ninetyDaysAgo)
    .not('median_price', 'is', null)
    .order('observed_on', { ascending: true });

  return (
    <AnalyticsClient
      commodities={commodities || []}
      markets={markets || []}
      observations={(observations || []) as any}
    />
  );
}
