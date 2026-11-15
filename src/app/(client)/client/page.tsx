import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBell, IconSave, IconResearch, IconTrendingUp, IconChart, IconArrowUp, IconArrowDown, IconAlert, IconArrowRight } from '@/components/ui/icons';
import Link from 'next/link';
import { DashboardPriceChart } from './DashboardPriceChart';
import { DashboardTopMovers } from './DashboardTopMovers';
import { DashboardMarketActivity } from './DashboardMarketActivity';

export const dynamic = 'force-dynamic';

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // Check if onboarding is needed
  if (profile && !profile.onboarding_completed_at) {
    redirect('/client/onboarding');
  }

  // Get counts for dashboard widgets
  const { count: watchlistsCount } = await supabase
    .from('saved_commodities')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  const { count: alertsCount } = await supabase
    .from('price_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('is_active', true);

  const { count: notificationsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .is('read_at', null);

  // Get active markets count
  const { count: activeMarketsCount } = await supabase
    .from('markets')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get recent market data
  const { data: recentPrices } = await supabase
    .from('latest_market_prices')
    .select('*')
    .limit(5);

  // Get user's saved commodities for personalized content
  const { data: savedCommodities } = await supabase
    .from('saved_commodities')
    .select(`
      commodity_id,
      commodities:commodity_id (id, name, slug, category)
    `)
    .eq('user_id', session.user.id)
    .limit(5);

  // Get recent price observations for chart data
  const { data: priceObservations } = await supabase
    .from('price_observations')
    .select('observed_on, median_price')
    .gte('observed_on', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('observed_on', { ascending: true })
    .limit(30);

  // Get alert trigger logs for recent activity
  const { data: recentAlertTriggers } = await supabase
    .from('alert_trigger_logs')
    .select(`
      *,
      commodities:commodity_id (name),
      markets:market_id (name)
    `)
    .eq('user_id', session.user.id)
    .order('triggered_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#1D805A] to-[#103C2D] rounded-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="text-white/90">
          Here&apos;s what&apos;s happening in your agricultural markets today.
        </p>
      </div>

      {/* Onboarding Banner (if not completed) */}
      {profile && !profile.onboarding_completed_at && (
        <div className="bg-[#C7A45A] rounded-lg p-6 flex items-center justify-between">
          <div className="flex items-center">
            <IconAlert className="w-6 h-6 text-white mr-3" />
            <div>
              <h3 className="font-semibold text-white">Complete your setup</h3>
              <p className="text-white/90 text-sm">Personalize your dashboard in just a few steps</p>
            </div>
          </div>
          <Link
            href="/client/onboarding"
            className="px-4 py-2 bg-white text-[#103C2D] rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center"
          >
            Start Setup
            <IconArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/client/watchlists" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#EAF4EE] rounded-lg">
                <IconSave className="w-6 h-6 text-[#1D805A]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{watchlistsCount || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">Saved Commodities</p>
          </div>
        </Link>

        <Link href="/client/alerts" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#EAF4EE] rounded-lg">
                <IconBell className="w-6 h-6 text-[#1D805A]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{alertsCount || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">Active Alerts</p>
          </div>
        </Link>

        <Link href="/client/notifications" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#EAF4EE] rounded-lg">
                <IconChart className="w-6 h-6 text-[#1D805A]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{notificationsCount || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">Unread Notifications</p>
          </div>
        </Link>

        <Link href="/markets" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#EAF4EE] rounded-lg">
                <IconTrendingUp className="w-6 h-6 text-[#1D805A]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{activeMarketsCount || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">Active Markets</p>
          </div>
        </Link>
      </div>

      {/* Price Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Market Price Trends</h2>
        <DashboardPriceChart observations={priceObservations || []} />
      </div>

      {/* Top Movers */}
      <DashboardTopMovers />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Market Prices */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Market Prices</h2>
            <Link href="/prices" className="text-sm font-medium text-[#1D805A] hover:text-[#103C2D]">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {recentPrices && recentPrices.length > 0 ? (
              recentPrices.map((price, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <h3 className="font-medium text-gray-900">{price.commodity_name}</h3>
                    <p className="text-sm text-gray-600">{price.market_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ₦{price.price?.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">per {price.unit}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600 text-center py-8">No recent market data available</p>
            )}
          </div>
        </div>

        {/* Market Activity */}
        <DashboardMarketActivity recentTriggers={recentAlertTriggers || []} />
      </div>

      {/* Your Watchlists */}
      {savedCommodities && savedCommodities.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Watchlist</h2>
            <Link href="/client/watchlists" className="text-sm font-medium text-[#1D805A] hover:text-[#103C2D]">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {savedCommodities.map((item) => (
              <Link
                key={item.commodity_id}
                href={`/commodities/${(item as any).commodities?.slug}`}
                className="p-4 border border-gray-200 rounded-lg hover:border-[#1D805A] transition-colors"
              >
                <h3 className="font-medium text-gray-900 text-sm mb-1">
                  {(item as any).commodities?.name}
                </h3>
                {(item as any).commodities?.category && (
                  <p className="text-xs text-gray-500 capitalize">
                    {(item as any).commodities?.category}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/client/watchlists"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-[#1D805A] hover:bg-[#EAF4EE] transition-colors"
          >
            <IconSave className="w-5 h-5 text-[#1D805A] mr-3" />
            <span className="text-sm font-medium text-gray-900">Manage Watchlists</span>
          </Link>
          <Link
            href="/client/alerts"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-[#1D805A] hover:bg-[#EAF4EE] transition-colors"
          >
            <IconBell className="w-5 h-5 text-[#1D805A] mr-3" />
            <span className="text-sm font-medium text-gray-900">Set Price Alerts</span>
          </Link>
          <Link
            href="/client/research"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-[#1D805A] hover:bg-[#EAF4EE] transition-colors"
          >
            <IconResearch className="w-5 h-5 text-[#1D805A] mr-3" />
            <span className="text-sm font-medium text-gray-900">View Research</span>
          </Link>
          <Link
            href="/trade/terminal"
            className="flex items-center p-4 rounded-lg border border-gray-200 hover:border-[#1D805A] hover:bg-[#EAF4EE] transition-colors"
          >
            <IconTrendingUp className="w-5 h-5 text-[#1D805A] mr-3" />
            <span className="text-sm font-medium text-gray-900">Price Terminal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
