/**
 * Hatsi360 — Market Coverage Calculation Service
 *
 * Computes coverage metrics by comparing what was expected (schedules + scope)
 * against what was actually reported (observations).
 *
 * Coverage answers: "Is Hatsi360 collecting the data it should be?"
 */

import { createClient } from '@/lib/supabase/server';

export interface MarketCoverage {
  marketId: number;
  marketName: string;
  expectedCommodities: number;
  reportedCommodities: number;
  coveragePercent: number;
  missingCommodities: string[];
  lastObservationAt: Date | null;
  tasksDue: number;
  tasksCompleted: number;
}

export interface CoverageSummary {
  totalMarkets: number;
  marketsWithCoverage: number;
  averageCoverage: number;
  marketsNeedingAttention: string[];
}

/**
 * Calculate coverage for a single market.
 *
 * Compares the commodities in market_commodity_scope against actual observations.
 */
export async function calculateMarketCoverage(
  marketId: number,
  date: Date = new Date(),
): Promise<MarketCoverage> {
  const supabase = await createClient();

  // 1. Fetch the market
  const { data: market } = await supabase
    .from('markets')
    .select('id, name')
    .eq('id', marketId)
    .single();

  if (!market) {
    throw new Error(`Market ${marketId} not found`);
  }

  // 2. Fetch expected commodities
  const { data: scope } = await supabase
    .from('market_commodity_scope')
    .select('commodity_id, commodities(name)')
    .eq('market_id', marketId);

  const expectedCommodities = scope?.length ?? 0;
  const expectedCommodityNames = (scope ?? []).map(
    (s: { commodities: { name: string }[] | null }) => s.commodities?.[0]?.name ?? 'Unknown',
  );

  // 3. Fetch reported commodities (observations from the last 7 days)
  const sevenDaysAgo = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { data: observations } = await supabase
    .from('price_observations')
    .select('commodity_id')
    .eq('market_id', marketId)
    .gte('collected_at', sevenDaysAgo.toISOString())
    .in('verification_status', ['submitted', 'verified', 'pending_verification']);

  const reportedCommodityIds = new Set(
    (observations ?? []).map((o: { commodity_id: number }) => o.commodity_id),
  );
  const reportedCommodities = reportedCommodityIds.size;

  // 4. Calculate missing commodities
  const expectedCommodityIds = (scope ?? []).map(
    (s: { commodity_id: number }) => s.commodity_id,
  );
  const missingCommodityIds = expectedCommodityIds.filter(
    (id: number) => !reportedCommodityIds.has(id),
  );
  const missingCommodities = (scope ?? [])
    .filter((s: { commodity_id: number }) => missingCommodityIds.includes(s.commodity_id))
    .map((s: { commodities: { name: string }[] | null }) => s.commodities?.[0]?.name ?? 'Unknown');

  // 5. Fetch last observation
  const { data: lastObs } = await supabase
    .from('price_observations')
    .select('collected_at')
    .eq('market_id', marketId)
    .order('collected_at', { ascending: false })
    .limit(1)
    .single();

  // 6. Fetch tasks due today
  const today = date.toISOString().split('T')[0];
  const { count: tasksDue } = await supabase
    .from('collection_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('market_id', marketId)
    .eq('due_on', today);

  // 7. Fetch tasks completed today
  const { count: tasksCompleted } = await supabase
    .from('collection_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('market_id', marketId)
    .eq('due_on', today)
    .in('status', ['completed', 'submitted']);

  const coveragePercent =
    expectedCommodities > 0 ? (reportedCommodities / expectedCommodities) * 100 : 0;

  return {
    marketId,
    marketName: market.name,
    expectedCommodities,
    reportedCommodities,
    coveragePercent: Math.round(coveragePercent),
    missingCommodities,
    lastObservationAt: lastObs?.collected_at ? new Date(lastObs.collected_at) : null,
    tasksDue: tasksDue ?? 0,
    tasksCompleted: tasksCompleted ?? 0,
  };
}

/**
 * Calculate coverage summary across all active markets.
 */
export async function calculateCoverageSummary(): Promise<CoverageSummary> {
  const supabase = await createClient();

  // Fetch all active markets
  const { data: markets } = await supabase
    .from('markets')
    .select('id')
    .eq('is_active', true);

  const totalMarkets = markets?.length ?? 0;

  // Calculate coverage for each market
  const coverages: MarketCoverage[] = [];
  for (const market of markets ?? []) {
    const coverage = await calculateMarketCoverage(market.id);
    coverages.push(coverage);
  }

  // Count markets with any coverage
  const marketsWithCoverage = coverages.filter((c) => c.coveragePercent > 0).length;

  // Calculate average coverage
  const averageCoverage =
    coverages.length > 0
      ? coverages.reduce((sum, c) => sum + c.coveragePercent, 0) / coverages.length
      : 0;

  // Identify markets needing attention (< 50% coverage)
  const marketsNeedingAttention = coverages
    .filter((c) => c.coveragePercent < 50)
    .map((c) => c.marketName);

  return {
    totalMarkets,
    marketsWithCoverage,
    averageCoverage: Math.round(averageCoverage),
    marketsNeedingAttention,
  };
}
