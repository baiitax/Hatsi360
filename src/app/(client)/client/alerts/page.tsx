import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconBell, IconArrowRight } from '@/components/ui/icons';
import Link from 'next/link';


export const dynamic = "force-dynamic";
export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get active alerts with related data
  const { data: alerts } = await supabase
    .from('price_alerts')
    .select(`
      *,
      commodities:commodity_id (
        id,
        name,
        slug
      ),
      markets:market_id (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', session.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // Get all alerts (including inactive)
  const { data: allAlerts } = await supabase
    .from('price_alerts')
    .select('id, is_active')
    .eq('user_id', session.user.id);

  const activeCount = alerts?.length || 0;
  const totalCount = allAlerts?.length || 0;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Price Alerts</h1>
        <p className="text-gray-600">
          Get notified when prices reach your target thresholds.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Alerts</h3>
          <p className="text-3xl font-bold text-[#1D805A]">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Inactive Alerts</h3>
          <p className="text-3xl font-bold text-gray-400">{inactiveCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Alerts</h3>
          <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
                <IconBell className="w-5 h-5 text-[#1D805A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Active Alerts</h2>
                <p className="text-sm text-gray-600 mt-1">
                  You will be notified when these conditions are met
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {alerts && alerts.length > 0 ? (
            alerts.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                        alert.direction === 'above' 
                          ? 'bg-green-100 text-green-800' 
                          : alert.direction === 'below'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.direction === 'above' ? '↑ Above' : alert.direction === 'below' ? '↓ Below' : 'Any'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {alert.channel}
                      </span>
                    </div>

                    {alert.commodities && (
                      <Link
                        href={`/commodities/${alert.commodities.slug}`}
                        className="text-lg font-semibold text-gray-900 hover:text-[#1D805A] block mb-1"
                      >
                        {alert.commodities.name}
                      </Link>
                    )}

                    {alert.markets && (
                      <Link
                        href={`/markets/${alert.markets.slug}`}
                        className="text-sm text-gray-600 hover:text-[#1D805A] block mb-2"
                      >
                        {alert.markets.name}
                      </Link>
                    )}

                    <div className="flex items-center space-x-4 mt-3">
                      {alert.threshold_amount && (
                        <div>
                          <p className="text-xs text-gray-500">Threshold Amount</p>
                          <p className="text-sm font-medium text-gray-900">
                            ₦{parseFloat(alert.threshold_amount).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {alert.threshold_percent && (
                        <div>
                          <p className="text-xs text-gray-500">Threshold Percent</p>
                          <p className="text-sm font-medium text-gray-900">
                            {alert.threshold_percent}%
                          </p>
                        </div>
                      )}
                      {alert.price_type && (
                        <div>
                          <p className="text-xs text-gray-500">Price Type</p>
                          <p className="text-sm font-medium text-gray-900">
                            {alert.price_type}
                          </p>
                        </div>
                      )}
                    </div>

                    {alert.last_triggered_at && (
                      <p className="text-xs text-gray-400 mt-3">
                        Last triggered: {new Date(alert.last_triggered_at).toLocaleString()}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      Created on {new Date(alert.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconBell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No active alerts
              </h3>
              <p className="text-gray-600 mb-4">
                Create price alerts to get notified when commodities or markets reach your target thresholds.
              </p>
              <Link
                href="/trade/alerts"
                className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
              >
                Create New Alert
                <IconArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
