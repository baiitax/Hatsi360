import 'server-only';

import { loadOperationalSnapshot } from './snapshot';
import {
  agentPerformance,
  collectionTrends,
  commodityCoverage,
  liveOperationsFeed,
  marketCoverage,
  overviewMetrics,
} from './metrics';
import type { OperationalSnapshot } from './types';

export interface OverviewResult {
  snapshot: OperationalSnapshot;
  metrics: ReturnType<typeof overviewMetrics>;
  feed: ReturnType<typeof liveOperationsFeed>;
  trends: ReturnType<typeof collectionTrends>;
  coverage: ReturnType<typeof marketCoverage>;
}

/** The data behind the admin overview. */
export async function getOverview(days = 7): Promise<OverviewResult> {
  const snapshot = await loadOperationalSnapshot(days);
  return {
    snapshot,
    metrics: overviewMetrics(snapshot),
    feed: liveOperationsFeed(snapshot),
    trends: collectionTrends(snapshot),
    coverage: marketCoverage(snapshot),
  };
}

/** The data behind the analytics centre. */
export async function getAnalytics(days = 30) {
  const snapshot = await loadOperationalSnapshot(days);
  return {
    snapshot,
    agents: agentPerformance(snapshot),
    markets: marketCoverage(snapshot),
    commodities: commodityCoverage(snapshot),
    trends: collectionTrends(snapshot),
  };
}

/** The data behind the agent performance report. */
export async function getAgentPerformance(days = 30, agentId?: string) {
  const snapshot = await loadOperationalSnapshot(days);
  return {
    snapshot,
    agents: agentPerformance(snapshot, agentId),
    trends: collectionTrends(snapshot),
  };
}

export { loadOperationalSnapshot };
export * from './types';
export * from './definitions';
export {
  comparePeriods,
  formatPercent,
  operationalDayRange,
  operationalToday,
  percentage,
  periodLabel,
  periodWindows,
  ratio,
  round,
  shiftOperationalDay,
} from './format';
