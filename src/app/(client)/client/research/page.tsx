import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IconResearch, IconArrowRight } from '@/components/ui/icons';
import Link from 'next/link';


export const dynamic = "force-dynamic";
export default async function ResearchPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Get user's report subscriptions
  const { data: subscriptions } = await supabase
    .from('report_subscriptions')
    .select(`
      *,
      market_reports:report_id (
        id,
        title,
        slug,
        summary,
        commodity_id,
        market_id,
        is_premium,
        published_at
      )
    `)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  // Get all published reports
  const { data: allReports } = await supabase
    .from('market_reports')
    .select(`
      id,
      title,
      slug,
      summary,
      is_premium,
      published_at,
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
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(20);

  const subscribedCount = subscriptions?.length || 0;
  const availableCount = allReports?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Market Research</h1>
        <p className="text-gray-600">
          Access market reports, analysis, and research publications.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Your Subscriptions</h3>
          <p className="text-3xl font-bold text-[#1D805A]">{subscribedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Available Reports</h3>
          <p className="text-3xl font-bold text-gray-900">{availableCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Premium Reports</h3>
          <p className="text-3xl font-bold text-[#C7A45A]">
            {allReports?.filter(r => r.is_premium).length || 0}
          </p>
        </div>
      </div>

      {/* My Subscriptions */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
              <IconResearch className="w-5 h-5 text-[#1D805A]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">My Report Subscriptions</h2>
              <p className="text-sm text-gray-600 mt-1">
                Reports you are subscribed to receive
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {subscriptions && subscriptions.length > 0 ? (
            subscriptions.map((sub) => (
              <div key={sub.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {sub.market_reports && (
                      <>
                        <div className="flex items-center mb-2">
                          {sub.market_reports.is_premium && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C7A45A] text-white mr-2">
                              Premium
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            Subscribed {new Date(sub.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <Link
                          href={`/reports/${sub.market_reports.slug}`}
                          className="text-lg font-semibold text-gray-900 hover:text-[#1D805A] block mb-1"
                        >
                          {sub.market_reports.title}
                        </Link>

                        {sub.market_reports.summary && (
                          <p className="text-gray-600 text-sm mb-3">
                            {sub.market_reports.summary}
                          </p>
                        )}

                        {sub.market_reports.published_at && (
                          <p className="text-xs text-gray-400">
                            Published {new Date(sub.market_reports.published_at).toLocaleDateString()}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconResearch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No subscriptions yet
              </h3>
              <p className="text-gray-600 mb-4">
                Subscribe to market reports to receive updates when new research is published.
              </p>
              <Link
                href="/reports"
                className="inline-flex items-center text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
              >
                Browse Reports
                <IconArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Available Reports */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 bg-[#EAF4EE] rounded-lg mr-3">
                <IconResearch className="w-5 h-5 text-[#1D805A]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Latest Reports</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Recent market research publications
                </p>
              </div>
            </div>
            <Link
              href="/reports"
              className="text-sm font-medium text-[#1D805A] hover:text-[#103C2D]"
            >
              View all →
            </Link>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {allReports && allReports.length > 0 ? (
            allReports.slice(0, 10).map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {report.is_premium && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#C7A45A] text-white mr-2">
                          Premium
                        </span>
                      )}
                      {report.commodities && Array.isArray(report.commodities) && report.commodities.length > 0 && (
                        <Link
                          href={`/commodities/${report.commodities[0].slug}`}
                          className="text-xs font-medium text-[#1D805A] hover:text-[#103C2D] mr-3"
                        >
                          {report.commodities[0].name}
                        </Link>
                      )}
                      {report.markets && Array.isArray(report.markets) && report.markets.length > 0 && (
                        <Link
                          href={`/markets/${report.markets[0].slug}`}
                          className="text-xs text-gray-600 hover:text-[#1D805A]"
                        >
                          {report.markets[0].name}
                        </Link>
                      )}
                    </div>

                    <Link
                      href={`/reports/${report.slug}`}
                      className="text-lg font-semibold text-gray-900 hover:text-[#1D805A] block mb-1"
                    >
                      {report.title}
                    </Link>

                    {report.summary && (
                      <p className="text-gray-600 text-sm mb-3">
                        {report.summary}
                      </p>
                    )}

                    {report.published_at && (
                      <p className="text-xs text-gray-400">
                        Published {new Date(report.published_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <IconResearch className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No reports available
              </h3>
              <p className="text-gray-600">
                Market reports will appear here when published.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
