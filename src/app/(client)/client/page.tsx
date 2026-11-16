import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardOverview } from './DashboardOverview';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard — Hatsi360 Premium Client Portal',
  description: 'Your agricultural market intelligence workspace',
};

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?returnUrl=/client');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, onboarding_completed_at')
    .eq('id', session.user.id)
    .single();

  // If onboarding not completed, redirect
  if (!profile?.onboarding_completed_at) {
    redirect('/client/onboarding');
  }

  // Fetch all dashboard data in parallel
  const [
    savedCommoditiesResult,
    activeAlertsResult,
    unreadNotificationsResult,
    activeMarketsResult,
    savedMarketsResult,
    recentPricesResult,
    priceObservationsResult,
    alertActivityResult,
    watchlistResult,
    reportsResult,
  ] = await Promise.all([
    // Saved commodities count
    supabase
      .from('saved_commodities')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id),
    // Active alerts count
    supabase
      .from('price_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_active', true),
    // Unread notifications count
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .is('read_at', null),
    // Active markets count
    supabase
      .from('markets')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    // Saved markets
    supabase
      .from('saved_markets')
      .select('id, markets:market_id(id, name, slug, state, country)')
      .eq('user_id', session.user.id)
      .limit(5),
    // Recent market prices (latest per commodity)
    supabase
      .from('latest_market_prices')
      .select('commodity_id, commodity_name, commodity_slug, market_name, market_slug, median_price, price_unit, price_currency, observed_on')
      .order('observed_on', { ascending: false })
      .limit(6),
    // Price observations for chart (last 30 days)
    supabase
      .from('price_observations')
      .select('observed_on, median_price')
      .gte('observed_on', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .not('median_price', 'is', null)
      .order('observed_on', { ascending: true }),
    // Recent alert activity
    supabase
      .from('alert_trigger_logs')
      .select(`
        id,
        triggered_at,
        trigger_type,
        observation_value,
        commodities:commodity_id(id, name, slug),
        markets:market_id(id, name, slug)
      `)
      .eq('user_id', session.user.id)
      .order('triggered_at', { ascending: false })
      .limit(5),
    // User's saved commodities with details
    supabase
      .from('saved_commodities')
      .select(`
        id,
        note,
        commodities:commodity_id(id, name, slug, image_url, category)
      `)
      .eq('user_id', session.user.id)
      .limit(6),
    // Latest reports
    supabase
      .from('market_reports')
      .select('id, title, slug, summary, is_premium, published_at, commodity_id, commodities:commodity_id(name, slug)')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(4),
  ]);

  const dashboardData = {
    savedCommoditiesCount: savedCommoditiesResult.count || 0,
    activeAlertsCount: activeAlertsResult.count || 0,
    unreadNotificationsCount: unreadNotificationsResult.count || 0,
    activeMarketsCount: activeMarketsResult.count || 0,
    savedMarkets: savedMarketsResult.data || [],
    recentPrices: recentPricesResult.data || [],
    priceObservations: priceObservationsResult.data || [],
    alertActivity: alertActivityResult.data || [],
    watchlist: watchlistResult.data || [],
    reports: reportsResult.data || [],
    userName: profile?.full_name || session.user.email?.split('@')[0] || 'User',
  };

  return <DashboardOverview data={dashboardData} />;
}
