import { IconBell, IconArrowRight } from '@/components/ui/icons';
import Link from 'next/link';

interface AlertTrigger {
  id: number;
  trigger_type: string;
  trigger_value: number | null;
  trigger_message: string | null;
  price_at_trigger: number | null;
  triggered_at: string;
  delivery_status: string;
  commodities: { name: string } | null;
  markets: { name: string } | null;
}

interface DashboardMarketActivityProps {
  recentTriggers: AlertTrigger[];
}

export function DashboardMarketActivity({ recentTriggers }: DashboardMarketActivityProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Market Activity</h2>
        <Link href="/client/alerts" className="text-sm font-medium text-[#1D805A] hover:text-[#103C2D]">
          View all →
        </Link>
      </div>
      
      <div className="space-y-4">
        {recentTriggers && recentTriggers.length > 0 ? (
          recentTriggers.map((trigger) => (
            <div key={trigger.id} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3 flex-shrink-0">
                <IconBell className="w-4 h-4 text-[#1D805A]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {trigger.trigger_message || 'Price alert triggered'}
                </p>
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  {trigger.commodities && (
                    <span className="font-medium">{trigger.commodities.name}</span>
                  )}
                  {trigger.markets && (
                    <>
                      <span>•</span>
                      <span>{trigger.markets.name}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <span>{new Date(trigger.triggered_at).toLocaleDateString()}</span>
                  <span className="mx-2">•</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    trigger.delivery_status === 'sent' 
                      ? 'bg-green-100 text-green-800'
                      : trigger.delivery_status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trigger.delivery_status}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <IconBell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-sm mb-4">No recent market activity</p>
            <Link
              href="/client/alerts"
              className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
            >
              Set up alerts
              <IconArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
