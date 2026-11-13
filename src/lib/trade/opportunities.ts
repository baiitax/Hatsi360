import { PRICE_TYPE_META } from '@/types/domain';
import {
  compareSeries,
  seriesKeyId,
  type SeriesKey,
} from './series';

/**
 * Trading opportunities.
 *
 * Brief §9 asks for a best-buy engine and §10 for a best-sell engine. Both are
 * written around commercial offers — buyer procurement prices and seller
 * offers — and neither exists in the schema. There is no `buyer_offers` or
 * `seller_offers` table, and nothing in the platform records a commercial
 * offer.
 *
 * So this module does not build what the brief describes. It builds what the
 * data supports, and it is explicit about the difference:
 *
 *   What the data holds:  the price an agent recorded at a market, verified
 *                         and published.
 *   What the brief wants: a buyer's commitment to purchase at that price.
 *
 * Those are different facts. A published observation is evidence of a market
 * price; it is not an offer, and it is not a transaction. The results below
 * are therefore labelled "lowest verified observation" and "highest verified
 * observation", never "best buy" or "best sell" in the commercial sense, and
 * every result carries a disclosure saying so.
 *
 * Brief §10.1 states the rule this implements: "Do not confuse a published
 * wholesale observation with a confirmed buyer commitment."
 */

/** What an opportunity result actually is. */
export type OpportunityBasis =
  | 'lowest_verified_observation'
  | 'highest_verified_observation';

export const OPPORTUNITY_BASIS_LABELS: Record<OpportunityBasis, string> = {
  lowest_verified_observation: 'Lowest verified observation',
  highest_verified_observation: 'Highest verified observation',
};

/**
 * The disclosure every opportunity result must carry.
 *
 * Stated once, here, so no screen can present a result without it.
 */
export const OPPORTUNITY_DISCLOSURE =
  'This is the most extreme verified price recorded for a comparable selection. ' +
  'It is not a commercial offer, a buyer commitment or an available quantity. ' +
  'No seller has agreed to sell at this price.';

export interface OpportunityObservation {
  id: string;
  seriesKey: SeriesKey;
  amount: number;
  collectedAt: string;
  marketId: number;
  marketName: string;
  commodityId: number;
  commodityName: string;
  verificationStatus: string;
  publishedAt: string | null;
  /** Populated when the observation carries field-reported availability. */
  availability: string | null;
}

export interface OpportunityCandidate {
  observationId: string;
  marketId: number;
  marketName: string;
  amount: number;
  collectedAt: string;
  availability: string | null;
  /** How far this price sits from the best one, in the same unit. */
  differenceFromBest: number;
  differenceFromBestPercent: number;
}

export interface CostAssessment {
  /** Always false. There is no cost data in the schema. */
  available: false;
  reason: string;
}

/**
 * The cost assessment every opportunity result carries.
 *
 * Brief §9.2 asks for an estimated landed cost and §10.2 for an estimated net
 * selling value. Both need transport, handling, packaging and transaction
 * costs. None are recorded anywhere in the schema, and non-negotiable #10
 * forbids inventing them. So the field exists, is always false, and says why.
 */
export const COST_ASSESSMENT: CostAssessment = {
  available: false,
  reason:
    'No transport, handling, packaging or transaction cost is recorded in the ' +
    'platform, so no landed cost or net selling value can be calculated. ' +
    'Any figure would be invented.',
};

export interface OpportunityResult {
  basis: OpportunityBasis;
  basisLabel: string;
  disclosure: string;
  /** The best candidate, or null when nothing comparable was found. */
  best: OpportunityCandidate | null;
  /** Every comparable candidate, best first. */
  candidates: OpportunityCandidate[];
  /** How many observations were excluded for being incomparable. */
  excludedCount: number;
  /** Why each exclusion happened, by dimension. */
  exclusionReasons: { dimension: string; count: number }[];
  /** The key the candidates share. */
  seriesKey: SeriesKey | null;
  /** Always false, with the reason. */
  cost: CostAssessment;
  /** True when only one comparable observation exists. */
  isSingleObservation: boolean;
}

export interface OpportunityOptions {
  /**
   * Only consider published observations. Defaults to true: an unpublished
   * observation has not been through verification and must not be presented
   * as a market opportunity.
   */
  publishedOnly?: boolean;
  /** The statuses that count as published. Defaults to verified + legacy. */
  publishedStatuses?: string[];
}

const DEFAULT_PUBLISHED_STATUSES = ['verified', 'legacy_unverified'];

/**
 * Choose the series everything else is compared against.
 *
 * This must not be "whichever observation came first" — the order rows arrive
 * in from the database is not meaningful, and letting it decide would make the
 * result depend on query order.
 *
 * The reference is the series that best represents the selection:
 *
 *   1. the most observations, so the dominant series wins;
 *   2. among ties, the series whose price type is comparable, because a
 *      non-comparable type cannot be compared with anything, including itself;
 *   3. among remaining ties, the lowest key id, so the choice is stable.
 */
function selectReferenceSeries(observations: OpportunityObservation[]): SeriesKey | null {
  if (observations.length === 0) return null;

  const groups = new Map<string, { key: SeriesKey; items: OpportunityObservation[] }>();
  for (const observation of observations) {
    const id = seriesKeyId(observation.seriesKey);
    const existing = groups.get(id);
    if (existing) existing.items.push(observation);
    else groups.set(id, { key: observation.seriesKey, items: [observation] });
  }

  let best: { key: SeriesKey; score: number; id: string } | null = null;
  for (const [id, group] of groups) {
    const comparableMembers = group.items.filter(
      (item) => PRICE_TYPE_META[item.seriesKey.priceType]?.isComparable ?? false,
    ).length;
    const score = comparableMembers * 1_000_000 + group.items.length;
    if (!best || score > best.score || (score === best.score && id < best.id)) {
      best = { key: group.key, score, id };
    }
  }

  return best?.key ?? null;
}

/**
 * Find the extreme verified observation across markets for one comparable
 * series.
 *
 * `direction` is 'low' for a buying signal and 'high' for a selling signal, but
 * the labels stay honest: this is the lowest or highest *recorded price*, not
 * a negotiated opportunity.
 */
export function findOpportunity(
  observations: OpportunityObservation[],
  direction: 'low' | 'high',
  options: OpportunityOptions = {},
): OpportunityResult {
  const publishedOnly = options.publishedOnly ?? true;
  const publishedStatuses = options.publishedStatuses ?? DEFAULT_PUBLISHED_STATUSES;

  const basis: OpportunityBasis =
    direction === 'low' ? 'lowest_verified_observation' : 'highest_verified_observation';

  // The reference series is chosen deliberately, not taken from row order.
  const reference = selectReferenceSeries(observations);

  const eligible: OpportunityObservation[] = [];
  const exclusionCounts = new Map<string, number>();

  for (const observation of observations) {
    if (publishedOnly && !publishedStatuses.includes(observation.verificationStatus)) {
      exclusionCounts.set(
        'not published',
        (exclusionCounts.get('not published') ?? 0) + 1,
      );
      continue;
    }
    if (reference) {
      const report = compareSeries(reference, observation.seriesKey);
      if (!report.compatible) {
        for (const dimension of report.differences) {
          exclusionCounts.set(dimension, (exclusionCounts.get(dimension) ?? 0) + 1);
        }
        continue;
      }
    }
    eligible.push(observation);
  }

  const sorted = [...eligible].sort((a, b) =>
    direction === 'low' ? a.amount - b.amount : b.amount - a.amount,
  );

  const bestAmount = sorted[0]?.amount ?? null;

  const candidates: OpportunityCandidate[] = sorted.map((observation) => {
    const difference =
      bestAmount === null ? 0 : direction === 'low'
        ? observation.amount - bestAmount
        : bestAmount - observation.amount;
    return {
      observationId: observation.id,
      marketId: observation.marketId,
      marketName: observation.marketName,
      amount: observation.amount,
      collectedAt: observation.collectedAt,
      availability: observation.availability,
      differenceFromBest: difference,
      differenceFromBestPercent:
        bestAmount && bestAmount !== 0 ? (difference / bestAmount) * 100 : 0,
    };
  });

  const exclusionReasons = [...exclusionCounts.entries()]
    .map(([dimension, count]) => ({ dimension, count }))
    .sort((a, b) => b.count - a.count);

  return {
    basis,
    basisLabel: OPPORTUNITY_BASIS_LABELS[basis],
    disclosure: OPPORTUNITY_DISCLOSURE,
    best: candidates[0] ?? null,
    candidates,
    excludedCount: observations.length - eligible.length,
    exclusionReasons,
    seriesKey: reference,
    cost: COST_ASSESSMENT,
    isSingleObservation: candidates.length === 1,
  };
}

/** Convenience wrapper for the buying direction. */
export function findBestBuy(
  observations: OpportunityObservation[],
  options?: OpportunityOptions,
): OpportunityResult {
  return findOpportunity(observations, 'low', options);
}

/** Convenience wrapper for the selling direction. */
export function findBestSell(
  observations: OpportunityObservation[],
  options?: OpportunityOptions,
): OpportunityResult {
  return findOpportunity(observations, 'high', options);
}

/* ----------------------------------------------------------------- spread -- */

export interface SpreadResult {
  /** Null when there is no comparable pair. */
  available: boolean;
  reason: string | null;
  /** The market with the lower price. */
  buyMarket: { marketId: number; marketName: string; amount: number; collectedAt: string } | null;
  /** The market with the higher price. */
  sellMarket: { marketId: number; marketName: string; amount: number; collectedAt: string } | null;
  /** sell − buy, in the shared unit and currency. */
  spread: number | null;
  /** The spread as a percentage of the buying price. */
  spreadPercent: number | null;
  /** How many markets were comparable. */
  comparableMarketCount: number;
  /** How many were excluded, and why. */
  excludedCount: number;
  exclusionReasons: { dimension: string; count: number }[];
  /** Margin is never calculated. This says so. */
  margin: CostAssessment;
  /** Warnings the interface must show with the figure. */
  warnings: string[];
}

/**
 * Calculate the price spread between markets for one comparable series.
 *
 * Brief §11.1 defines spread as `comparable selling price − comparable buying
 * price`, which is arithmetic on real data and is feasible. Brief §11.2 also
 * asks for gross and net trading margin, which needs costs that do not exist —
 * so `margin` is always the blocked assessment.
 *
 * The warnings are not decoration. Each one is a condition under which the
 * spread figure would mislead a trader, and brief §11.2 requires them.
 */
export function calculateSpread(
  observations: OpportunityObservation[],
  options: OpportunityOptions = {},
): SpreadResult {
  const publishedOnly = options.publishedOnly ?? true;
  const publishedStatuses = options.publishedStatuses ?? DEFAULT_PUBLISHED_STATUSES;

  const reference = selectReferenceSeries(observations);
  const eligible: OpportunityObservation[] = [];
  const exclusionCounts = new Map<string, number>();

  for (const observation of observations) {
    if (publishedOnly && !publishedStatuses.includes(observation.verificationStatus)) {
      exclusionCounts.set('not published', (exclusionCounts.get('not published') ?? 0) + 1);
      continue;
    }
    if (reference) {
      const report = compareSeries(reference, observation.seriesKey);
      if (!report.compatible) {
        for (const dimension of report.differences) {
          exclusionCounts.set(dimension, (exclusionCounts.get(dimension) ?? 0) + 1);
        }
        continue;
      }
    }
    eligible.push(observation);
  }

  const exclusionReasons = [...exclusionCounts.entries()]
    .map(([dimension, count]) => ({ dimension, count }))
    .sort((a, b) => b.count - a.count);

  if (eligible.length < 2) {
    return {
      available: false,
      reason:
        eligible.length === 0
          ? 'No comparable published observations were found, so no spread can be calculated.'
          : 'Only one comparable observation exists. A spread needs at least two markets.',
      buyMarket: null,
      sellMarket: null,
      spread: null,
      spreadPercent: null,
      comparableMarketCount: eligible.length,
      excludedCount: observations.length - eligible.length,
      exclusionReasons,
      margin: COST_ASSESSMENT,
      warnings: [],
    };
  }

  // One observation per market: the most recent, so the comparison is between
  // current prices rather than a stale one outranking a fresh one.
  const byMarket = new Map<number, OpportunityObservation>();
  for (const observation of eligible) {
    const existing = byMarket.get(observation.marketId);
    if (!existing || new Date(observation.collectedAt) > new Date(existing.collectedAt)) {
      byMarket.set(observation.marketId, observation);
    }
  }

  const latest = [...byMarket.values()];
  if (latest.length < 2) {
    return {
      available: false,
      reason: 'Only one market has a comparable published observation, so there is no spread to show.',
      buyMarket: null,
      sellMarket: null,
      spread: null,
      spreadPercent: null,
      comparableMarketCount: latest.length,
      excludedCount: observations.length - eligible.length,
      exclusionReasons,
      margin: COST_ASSESSMENT,
      warnings: [],
    };
  }

  const sorted = [...latest].sort((a, b) => a.amount - b.amount);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const spread = high.amount - low.amount;

  // Warnings required by brief §11.2. Each is a condition that would make the
  // spread figure misleading.
  const warnings: string[] = [];

  const ageDays = (at: string) =>
    Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000);
  if (ageDays(low.collectedAt) > 7 || ageDays(high.collectedAt) > 7) {
    warnings.push(
      'One or both prices is more than a week old. The spread reflects when each was recorded, not today.',
    );
  }
  if (Math.abs(ageDays(low.collectedAt) - ageDays(high.collectedAt)) > 1) {
    warnings.push(
      'The two prices were recorded on different days, so part of the spread is the passage of time.',
    );
  }
  if (low.availability === 'scarce' || high.availability === 'scarce') {
    warnings.push(
      'Supply was reported as scarce at one of these markets, so the price may not be obtainable in quantity.',
    );
  }
  if (reference && reference.gradeId === null) {
    warnings.push(
      'No grade was recorded for these observations, so the spread may reflect quality differences.',
    );
  }

  warnings.push(
    'Transport, handling and transaction costs are not recorded, so this is a price gap, not a profit.',
  );

  return {
    available: true,
    reason: null,
    buyMarket: {
      marketId: low.marketId,
      marketName: low.marketName,
      amount: low.amount,
      collectedAt: low.collectedAt,
    },
    sellMarket: {
      marketId: high.marketId,
      marketName: high.marketName,
      amount: high.amount,
      collectedAt: high.collectedAt,
    },
    spread,
    spreadPercent: low.amount !== 0 ? (spread / low.amount) * 100 : null,
    comparableMarketCount: latest.length,
    excludedCount: observations.length - eligible.length,
    exclusionReasons,
    margin: COST_ASSESSMENT,
    warnings,
  };
}

/**
 * Group observations by their comparable series, for the comparison screen.
 *
 * Returns one group per distinct series key, so the interface can show which
 * selections are comparable and which are not, rather than silently merging
 * them.
 */
export function groupBySeries(observations: OpportunityObservation[]): {
  groups: { key: SeriesKey; id: string; items: OpportunityObservation[] }[];
} {
  const byId = new Map<string, { key: SeriesKey; id: string; items: OpportunityObservation[] }>();
  for (const observation of observations) {
    const id = seriesKeyId(observation.seriesKey);
    const existing = byId.get(id);
    if (existing) existing.items.push(observation);
    else byId.set(id, { key: observation.seriesKey, id, items: [observation] });
  }
  return { groups: [...byId.values()] };
}
