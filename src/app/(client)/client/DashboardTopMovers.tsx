import { createClient } from '@/lib/supabase/server';
import { IconArrowUp, IconArrowDown } from '@/components/ui/icons';
import Link from 'next/link';

export async function DashboardTopMovers() {
  const supabase = await createClient();
  
  // Get commodities with price changes over the last 7 days
  // This is a simplified version - in production you'd want a more optimized query
  const { data: recentPrices } = await supabase
    .from('latest_market_prices')
    .select('*')
    .limit(50);

  if (!recentPrices || recentPrices.length === 0) {
    return null;
  }

  // Group by commodity and calculate average price
  const commodityPrices = recentPrices.reduce((acc: Record<string, { name: string; slug: string; prices: number[] }>, price) => {
    if (!acc[price.commodity_name]) {
      acc[price.commodity_name] = {
        name: price.commodity_name,
        slug: price.commodity_slug,
        prices: [],
      };
    }
    if (price.price) {
      acc[price.commodity_name].prices.push(price.price);
    }
    return acc;
  }, {});

  // Calculate top movers (simplified - just showing highest/lowest priced)
  const movers = Object.values(commodityPrices)
    .map((c: { name: string; slug: string; prices: number[] }) => ({
      ...c,
      avgPrice: c.prices.length > 0 
        ? c.prices.reduce((a: number, b: number) => a + b, 0) / c.prices.length 
        : 0,
    }))
    .sort((a, b) => b.avgPrice - a.avgPrice)
    .slice(0, 5);

  if (movers.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Top Commodities by Price</h2>
        <Link href="/commodities" className="text-sm font-medium text-[#1D805A] hover:text-[#103C2D]">
          View all →
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {movers.map((commodity, index) => (
          <Link
            key={commodity.name}
            href={`/commodities/${commodity.slug}`}
            className="p-4 border border-gray-200 rounded-lg hover:border-[#1D805A] hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
              <div className={`flex items-center ${index < 3 ? 'text-[#1D805A]' : 'text-gray-400'}`}>
                <IconArrowUp className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
              {commodity.name}
            </h3>
            <p className="text-lg font-bold text-gray-900">
              ₦{Math.round(commodity.avgPrice).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">avg price</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
