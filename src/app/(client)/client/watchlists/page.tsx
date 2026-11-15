import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconSave, IconClose, IconArrowRight } from '@/components/ui/icons';
import Link from 'next/link';


export const dynamic = "force-dynamic";
export default async function WatchlistsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get saved commodities with commodity details
  const { data: savedCommodities } = await supabase
    .from('saved_commodities')
    .select(`
      *,
      commodities:commodity_id (
        id,
        name,
        slug,
        category
      )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  // Get saved markets with market details
  const { data: savedMarkets } = await supabase
    .from('saved_markets')
    .select(`
      *,
      markets:market_id (
        id,
        name,
        slug,
        state
      )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Watchlists</h1>
        <p className="text-gray-600">
          Track commodities and markets that matter to your business.
        </p>
      </div>

      {/* Saved Commodities */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
                <IconSave className="w-5 h-5 text-[#1D805A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Saved Commodities</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {savedCommodities?.length || 0} commodities in your watchlist
                </p>
              </div>
            </div>
            <Link
              href="/commodities"
              className="flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
            >
              Browse All
              <IconArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {savedCommodities && savedCommodities.length > 0 ? (
            savedCommodities.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/commodities/${item.commodities.slug}`}
                      className="text-lg font-semibold text-gray-900 hover:text-[#1D805A]"
                    >
                      {item.commodities.name}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      Category: {item.commodities.category}
                    </p>
                    {item.note && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        &ldquo;{item.note}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Saved on {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Link
                      href={`/commodities/${item.commodities.slug}`}
                      className="flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
                    >
                      View Details
                      <IconArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconSave className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No commodities saved yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start tracking commodities by browsing our directory and saving items to your watchlist.
              </p>
              <Link
                href="/commodities"
                className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
              >
                Browse Commodities
                <IconArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Saved Markets */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
                <IconSave className="w-5 h-5 text-[#1D805A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Saved Markets</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {savedMarkets?.length || 0} markets in your watchlist
                </p>
              </div>
            </div>
            <Link
              href="/markets"
              className="flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
            >
              Browse All
              <IconArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {savedMarkets && savedMarkets.length > 0 ? (
            savedMarkets.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/markets/${item.markets.slug}`}
                      className="text-lg font-semibold text-gray-900 hover:text-[#1D805A]"
                    >
                      {item.markets.name}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      State: {item.markets.state}
                    </p>
                    {item.note && (
                      <p className="text-sm text-gray-500 mt-2 italic">
                        &ldquo;{item.note}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Saved on {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Link
                      href={`/markets/${item.markets.slug}`}
                      className="flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
                    >
                      View Details
                      <IconArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconSave className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No markets saved yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start tracking markets by browsing our directory and saving items to your watchlist.
              </p>
              <Link
                href="/markets"
                className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
              >
                Browse Markets
                <IconArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
