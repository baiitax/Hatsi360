import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth/guards';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import { calculateCoverageSummary, calculateMarketCoverage, type MarketCoverage } from '@/lib/operations/coverage';
import { calculateMarketCommodityFreshness, type FreshnessResult } from '@/lib/operations/freshness';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Market Data Operations — Control Centre',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface MarketRow extends MarketCoverage {
  freshness: FreshnessResult;
}

export default async function CoverageDashboardPage() {
  await requireStaff('/admin/coverage');

  const supabase = await createClient();

  // Fetch coverage summary
  const summary = await calculateCoverageSummary();

  // Fetch all active markets
  const { data: markets } = await supabase
    .from('markets')
    .select('id, name, freshness_window_hours')
    .eq('is_active', true)
    .order('name');

  // Calculate detailed coverage and freshness for each market
  const marketRows: MarketRow[] = [];
  for (const market of markets ?? []) {
    const coverage = await calculateMarketCoverage(market.id);
    
    // Fetch latest observation for freshness calculation
    const { data: latestObs } = await supabase
      .from('price_observations')
      .select('collected_at')
      .eq('market_id', market.id)
      .in('verification_status', ['submitted', 'verified', 'pending_verification'])
      .order('collected_at', { ascending: false })
      .limit(1)
      .single();

    const freshness = calculateMarketCommodityFreshness(
      latestObs?.collected_at ?? null,
      market.freshness_window_hours ?? 72,
    );

    marketRows.push({ ...coverage, freshness });
  }

  // Operational metrics
  const { count: totalObservations } = await supabase
    .from('price_observations')
    .select('*', { count: 'exact', head: true });

  const { count: publishedObservations } = await supabase
    .from('price_observations')
    .select('*', { count: 'exact', head: true })
    .not('published_at', 'is', null);

  const { count: pendingVerification } = await supabase
    .from('price_observations')
    .select('*', { count: 'exact', head: true })
    .in('verification_status', ['submitted', 'pending_verification']);

  const { count: openTasks } = await supabase
    .from('collection_tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'in_progress']);

  const { count: overdueTasks } = await supabase
    .from('collection_tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'in_progress'])
    .lt('deadline_at', new Date().toISOString());

  return (
    <>
      <PageHeader
        title="Market Data Operations"
        description="Real-time view of collection health, coverage, and data freshness. This dashboard answers: Is Hatsi360 collecting the data it should be?"
        breadcrumbs={[
          { label: 'Control Centre', href: '/admin/overview' },
          { label: 'Market Data Operations' },
        ]}
      />

      {/* Operational Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Coverage</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{summary.averageCoverage}%</p>
          <p className="mt-1 text-xs text-ink-500">
            {summary.marketsWithCoverage} of {summary.totalMarkets} markets reporting
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Observations</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{totalObservations ?? 0}</p>
          <p className="mt-1 text-xs text-ink-500">
            {publishedObservations ?? 0} published
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{pendingVerification ?? 0}</p>
          <p className="mt-1 text-xs text-ink-500">
            Awaiting verification
          </p>
        </Panel>

        <Panel className="p-4">
          <p className="text-xs font-medium text-ink-500 uppercase tracking-wide">Tasks</p>
          <p className="mt-1 text-2xl font-bold text-ink-900">{openTasks ?? 0}</p>
          <p className="mt-1 text-xs text-ink-500">
            {overdueTasks ?? 0} overdue
          </p>
        </Panel>
      </div>

      {/* Markets Needing Attention */}
      {summary.marketsNeedingAttention.length > 0 && (
        <Panel className="mb-6" title="Markets Needing Attention">
          <p className="text-sm text-ink-700 mb-3">
            These markets have less than 50% coverage and need immediate attention:
          </p>
          <ul className="space-y-2">
            {summary.marketsNeedingAttention.map((name) => (
              <li key={name} className="flex items-center gap-2">
                <Pill tone="warning">{name}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* Market Coverage Table */}
      <Panel title="Market Coverage Matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left">
                <th className="pb-2 font-semibold text-ink-700">Market</th>
                <th className="pb-2 font-semibold text-ink-700 text-right">Coverage</th>
                <th className="pb-2 font-semibold text-ink-700 text-right">Expected</th>
                <th className="pb-2 font-semibold text-ink-700 text-right">Reported</th>
                <th className="pb-2 font-semibold text-ink-700">Freshness</th>
                <th className="pb-2 font-semibold text-ink-700 text-right">Tasks</th>
                <th className="pb-2 font-semibold text-ink-700">Last Observation</th>
              </tr>
            </thead>
            <tbody>
              {marketRows.map((row) => (
                <tr key={row.marketId} className="border-b border-ink-100 hover:bg-ink-50">
                  <td className="py-3">
                    <Link
                      href={`/admin/markets?id=${row.marketId}`}
                      className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      {row.marketName}
                    </Link>
                    {row.missingCommodities.length > 0 && (
                      <p className="text-xs text-ink-500 mt-0.5">
                        Missing: {row.missingCommodities.slice(0, 2).join(', ')}
                        {row.missingCommodities.length > 2 && ` +${row.missingCommodities.length - 2} more`}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-semibold ${
                      row.coveragePercent >= 80 ? 'text-success-700' :
                      row.coveragePercent >= 50 ? 'text-warning-700' :
                      'text-error-700'
                    }`}>
                      {row.coveragePercent}%
                    </span>
                  </td>
                  <td className="py-3 text-right text-ink-700">{row.expectedCommodities}</td>
                  <td className="py-3 text-right text-ink-700">{row.reportedCommodities}</td>
                  <td className="py-3">
                    <Pill tone={
                      row.freshness.state === 'current' ? 'success' :
                      row.freshness.state === 'aging' ? 'warning' :
                      row.freshness.state === 'stale' ? 'danger' :
                      'neutral'
                    }>
                      {row.freshness.label}
                    </Pill>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {row.freshness.hoursOld > 0 ? `${row.freshness.hoursOld}h ago` : 'No data'}
                    </p>
                  </td>
                  <td className="py-3 text-right">
                    <span className="text-ink-700">
                      {row.tasksCompleted}/{row.tasksDue}
                    </span>
                  </td>
                  <td className="py-3 text-ink-500">
                    {row.lastObservationAt ? (
                      <span className="text-xs">
                        {row.lastObservationAt.toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-400">Never</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {marketRows.length === 0 && (
          <p className="text-sm text-ink-500 text-center py-8">
            No active markets found. Configure markets to begin tracking coverage.
          </p>
        )}
      </Panel>
    </>
  );
}
