import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBell, IconSave, IconResearch, IconTrendingUp, IconChart } from '@/components/ui/icons';
import Link from 'next/link';


export const dynamic = "force-dynamic";
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

  // Get recent market data
  const { data: recentPrices } = await supabase
    .from('latest_market_prices')
    .select('*')
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

        <Link href="/client/trade" className="block">
          <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-[#EAF4EE] rounded-lg">
                <IconTrendingUp className="w-6 h-6 text-[#1D805A]" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">12</h3>
            <p className="text-sm text-gray-600 mt-1">Active Markets</p>
          </div>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Market Prices */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Market Prices</h2>
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

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/client/watchlists"
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconSave className="w-5 h-5 text-[#1D805A] mr-3" />
              <span className="text-sm font-medium text-gray-900">Manage Watchlists</span>
            </Link>
            <Link
              href="/client/alerts"
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconBell className="w-5 h-5 text-[#1D805A] mr-3" />
              <span className="text-sm font-medium text-gray-900">Set Price Alerts</span>
            </Link>
            <Link
              href="/client/research"
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconResearch className="w-5 h-5 text-[#1D805A] mr-3" />
              <span className="text-sm font-medium text-gray-900">View Research</span>
            </Link>
            <Link
              href="/client/trade"
              className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <IconTrendingUp className="w-5 h-5 text-[#1D805A] mr-3" />
              <span className="text-sm font-medium text-gray-900">Explore Markets</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
