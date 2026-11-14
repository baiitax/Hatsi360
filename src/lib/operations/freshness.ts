/**
 * Hatsi360 — Freshness Calculation Service
 *
 * Computes the freshness state of a price observation based on:
 *   - The observation's collected_at timestamp
 *   - The commodity's freshness_window_hours
 *   - The current time
 *
 * Freshness states:
 *   CURRENT — Within the freshness window
 *   AGING   — Beyond the freshness window but within 2x the window
 *   STALE   — Beyond 2x the freshness window
 *   NO_DATA — No observation exists
 */

export type FreshnessState = 'current' | 'aging' | 'stale' | 'no_data';

export interface FreshnessResult {
  state: FreshnessState;
  hoursOld: number;
  freshnessWindowHours: number;
  label: string;
  description: string;
}

/**
 * Calculate the freshness state of an observation.
 *
 * @param collectedAt - When the observation was collected
 * @param freshnessWindowHours - The commodity's freshness window
 * @param now - Current time (defaults to Date.now())
 */
export function calculateFreshness(
  collectedAt: Date | string,
  freshnessWindowHours: number,
  now: Date = new Date(),
): FreshnessResult {
  const collected = typeof collectedAt === 'string' ? new Date(collectedAt) : collectedAt;
  const hoursOld = (now.getTime() - collected.getTime()) / (1000 * 60 * 60);

  if (hoursOld < 0) {
    // Future observation — treat as current (will be flagged by quality engine)
    return {
      state: 'current',
      hoursOld: 0,
      freshnessWindowHours,
      label: 'Current',
      description: 'Collected at or near the present time.',
    };
  }

  if (hoursOld <= freshnessWindowHours) {
    return {
      state: 'current',
      hoursOld: Math.round(hoursOld * 10) / 10,
      freshnessWindowHours,
      label: 'Current',
      description: `Within the ${freshnessWindowHours}-hour freshness window.`,
    };
  }

  if (hoursOld <= freshnessWindowHours * 2) {
    return {
      state: 'aging',
      hoursOld: Math.round(hoursOld * 10) / 10,
      freshnessWindowHours,
      label: 'Aging',
      description: `Beyond the ${freshnessWindowHours}-hour window but within 2x. Consider collecting a fresh price.`,
    };
  }

  return {
    state: 'stale',
    hoursOld: Math.round(hoursOld * 10) / 10,
    freshnessWindowHours,
    label: 'Stale',
    description: `Beyond 2x the ${freshnessWindowHours}-hour window. This price is outdated.`,
  };
}

/**
 * Calculate the freshness state for a market-commodity pair.
 *
 * Returns NO_DATA if no observation exists.
 */
export function calculateMarketCommodityFreshness(
  latestCollectedAt: Date | string | null,
  freshnessWindowHours: number,
  now: Date = new Date(),
): FreshnessResult {
  if (!latestCollectedAt) {
    return {
      state: 'no_data',
      hoursOld: 0,
      freshnessWindowHours,
      label: 'No Data',
      description: 'No observation has been collected yet.',
    };
  }

  return calculateFreshness(latestCollectedAt, freshnessWindowHours, now);
}

/**
 * Aggregate freshness across multiple observations.
 *
 * Returns the worst (oldest) freshness state.
 */
export function aggregateFreshness(results: FreshnessResult[]): FreshnessResult {
  if (results.length === 0) {
    return {
      state: 'no_data',
      hoursOld: 0,
      freshnessWindowHours: 0,
      label: 'No Data',
      description: 'No observations to evaluate.',
    };
  }

  const stateRank: Record<FreshnessState, number> = {
    no_data: 0,
    current: 1,
    aging: 2,
    stale: 3,
  };

  // Find the worst state
  const worst = results.reduce((prev, curr) => {
    return stateRank[curr.state] > stateRank[prev.state] ? curr : prev;
  });

  return worst;
}
