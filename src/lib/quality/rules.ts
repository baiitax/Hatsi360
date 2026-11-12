/**
 * GonaPulse — data quality rule engine.
 *
 * Rules are pure functions. They take an observation, the context it was
 * collected in, and a configuration object; they return findings. Nothing here
 * touches the database, so every rule can be unit-tested against a known
 * record and every finding can be explained.
 *
 * A finding never rejects a price. It classifies the record:
 *
 *   info      — worth knowing, no action implied
 *   warning   — a reviewer should look
 *   review    — a reviewer must look before publication
 *   blocking  — the record cannot be submitted in this state
 *
 * The rule version is carried on every finding so a historical flag can be
 * explained after the thresholds change.
 */

export type QualitySeverity = 'info' | 'warning' | 'review' | 'blocking';

export interface QualityContext {
  /** The comparable prices for the same commodity, market, price type and unit. */
  comparables: number[];
  /** Whether the task for this collection required evidence. */
  evidenceRequired: boolean;
  /** The number of evidence records attached to the observation. */
  evidenceCount: number;
  /** Whether the observation was collected for a market the agent covers. */
  assignedToMarket: boolean;
  /** The freshness window of the commodity, in hours. */
  freshnessWindowHours: number;
  /** The current time, so the rules are deterministic in tests. */
  now: Date;
}

export interface QualityCandidate {
  id: string;
  marketId: number;
  commodityId: number;
  priceType: string;
  reportedAmount: number | null;
  reportedUnitId: number | null;
  collectedAt: string;
  agentUserId: string | null;
  notes: string | null;
}

export interface QualityFinding {
  ruleCode: string;
  version: number;
  severity: QualitySeverity;
  message: string;
  /** The observed value that triggered the rule, for the review screen. */
  evidence: Record<string, unknown>;
}

export interface QualityThresholds {
  /** The relative change that counts as an unusual move, e.g. 0.35 = 35%. */
  largeChangeRatio: number;
  /** The absolute change that counts as unusual even when the ratio is small. */
  largeChangeAbsolute: number;
  /** How many identical records count as a duplicate. */
  duplicateThreshold: number;
  /** How long after collection a record may still be submitted. */
  maxAgeHours: number;
  /** How far ahead of the clock a collection timestamp may be. */
  maxFutureSkewHours: number;
}

export const DEFAULT_THRESHOLDS: QualityThresholds = {
  largeChangeRatio: 0.35,
  largeChangeAbsolute: 5000,
  duplicateThreshold: 2,
  maxAgeHours: 72,
  maxFutureSkewHours: 6,
};

interface RuleDefinition {
  code: string;
  version: number;
  severity: QualitySeverity;
  description: string;
  evaluate: (
    candidate: QualityCandidate,
    context: QualityContext,
    thresholds: QualityThresholds,
  ) => QualityFinding | null;
}

const RULES: RuleDefinition[] = [
  {
    code: 'missing_mandatory_field',
    version: 1,
    severity: 'blocking',
    description: 'A price, a unit or a collection time is missing.',
    evaluate: (candidate) => {
      const missing: string[] = [];
      if (candidate.reportedAmount === null) missing.push('price');
      if (candidate.reportedUnitId === null) missing.push('unit');
      if (!candidate.collectedAt) missing.push('collection time');
      if (missing.length === 0) return null;
      return {
        ruleCode: 'missing_mandatory_field',
        version: 1,
        severity: 'blocking',
        message: `The record is missing: ${missing.join(', ')}.`,
        evidence: { missing: missing.join(', ') },
      };
    },
  },
  {
    code: 'invalid_price',
    version: 1,
    severity: 'blocking',
    description: 'The reported price is not a positive number.',
    evaluate: (candidate) => {
      if (candidate.reportedAmount === null) return null;
      if (candidate.reportedAmount > 0) return null;
      return {
        ruleCode: 'invalid_price',
        version: 1,
        severity: 'blocking',
        message: 'The reported price must be greater than zero.',
        evidence: { reportedAmount: candidate.reportedAmount },
      };
    },
  },
  {
    code: 'unrecognised_unit',
    version: 1,
    severity: 'review',
    description: 'The observation has no specific measurement unit.',
    evaluate: (candidate) => {
      if (candidate.reportedUnitId !== null) return null;
      return {
        ruleCode: 'unrecognised_unit',
        version: 1,
        severity: 'review',
        message:
          'No measurement unit was recorded, so this price cannot be compared with prices that do carry a unit.',
        evidence: { reportedUnitId: null },
      };
    },
  },
  {
    code: 'market_not_assigned',
    version: 1,
    severity: 'blocking',
    description: 'The observation was collected at a market the agent does not cover.',
    evaluate: (candidate, context) => {
      if (context.assignedToMarket) return null;
      return {
        ruleCode: 'market_not_assigned',
        version: 1,
        severity: 'blocking',
        message: 'The agent is not assigned to the market this price was collected at.',
        evidence: { marketId: candidate.marketId },
      };
    },
  },
  {
    code: 'collection_timestamp_out_of_range',
    version: 1,
    severity: 'review',
    description: 'The collection time is too old, or in the future.',
    evaluate: (candidate, context, thresholds) => {
      const collected = new Date(candidate.collectedAt).getTime();
      if (Number.isNaN(collected)) {
        return {
          ruleCode: 'collection_timestamp_out_of_range',
          version: 1,
          severity: 'review',
          message: 'The collection time could not be read.',
          evidence: { collectedAt: candidate.collectedAt },
        };
      }
      const hoursOld = (context.now.getTime() - collected) / 3_600_000;
      if (hoursOld > thresholds.maxAgeHours) {
        return {
          ruleCode: 'collection_timestamp_out_of_range',
          version: 1,
          severity: 'review',
          message: `The collection time is ${Math.round(hoursOld)} hours old.`,
          evidence: { hoursOld: Math.round(hoursOld), maxAgeHours: thresholds.maxAgeHours },
        };
      }
      const hoursAhead = -hoursOld;
      if (hoursAhead > thresholds.maxFutureSkewHours) {
        return {
          ruleCode: 'collection_timestamp_out_of_range',
          version: 1,
          severity: 'review',
          message: 'The collection time is in the future.',
          evidence: { hoursAhead: Math.round(hoursAhead) },
        };
      }
      return null;
    },
  },
  {
    code: 'large_price_change',
    version: 1,
    severity: 'warning',
    description:
      'The price differs sharply from the comparable prices for the same commodity, market, price type and unit.',
    evaluate: (candidate, context, thresholds) => {
      if (candidate.reportedAmount === null) return null;
      if (context.comparables.length === 0) return null;

      const median = medianOf(context.comparables);
      if (median <= 0) return null;

      const change = candidate.reportedAmount - median;
      const ratio = Math.abs(change) / median;

      if (ratio >= thresholds.largeChangeRatio && Math.abs(change) >= thresholds.largeChangeAbsolute) {
        return {
          ruleCode: 'large_price_change',
          version: 1,
          severity: 'warning',
          message: `The price is ${Math.round(ratio * 100)}% away from the recent comparable median of ${median.toLocaleString('en-NG')}.`,
          evidence: {
            reportedAmount: candidate.reportedAmount,
            comparableMedian: median,
            ratio: Math.round(ratio * 1000) / 1000,
            comparables: context.comparables.length,
          },
        };
      }
      return null;
    },
  },
  {
    code: 'duplicate_suspected',
    version: 1,
    severity: 'warning',
    description:
      'The same commodity, market, price type and amount already appears more than once in the window.',
    evaluate: (candidate, context, thresholds) => {
      if (candidate.reportedAmount === null) return null;
      const matches = context.comparables.filter(
        (amount) => Math.abs(amount - candidate.reportedAmount!) < 0.0001,
      ).length;
      if (matches + 1 < thresholds.duplicateThreshold) return null;
      return {
        ruleCode: 'duplicate_suspected',
        version: 1,
        severity: 'warning',
        message: 'An identical price has already been recorded for this commodity and market.',
        evidence: { matches, threshold: thresholds.duplicateThreshold },
      };
    },
  },
  {
    code: 'missing_evidence',
    version: 1,
    severity: 'review',
    description: 'The task required evidence and none was attached.',
    evaluate: (candidate, context) => {
      if (!context.evidenceRequired) return null;
      if (context.evidenceCount > 0) return null;
      return {
        ruleCode: 'missing_evidence',
        version: 1,
        severity: 'review',
        message: 'This collection required supporting evidence and none was attached.',
        evidence: { evidenceRequired: true, evidenceCount: context.evidenceCount },
      };
    },
  },
  {
    code: 'stale_observation',
    version: 1,
    severity: 'info',
    description: 'The observation is older than the freshness window of its commodity.',
    evaluate: (candidate, context) => {
      const collected = new Date(candidate.collectedAt).getTime();
      if (Number.isNaN(collected)) return null;
      const hoursOld = (context.now.getTime() - collected) / 3_600_000;
      if (hoursOld <= context.freshnessWindowHours) return null;
      return {
        ruleCode: 'stale_observation',
        version: 1,
        severity: 'info',
        message: `The price is ${Math.round(hoursOld)} hours old and outside its freshness window of ${context.freshnessWindowHours} hours.`,
        evidence: { hoursOld: Math.round(hoursOld), freshnessWindowHours: context.freshnessWindowHours },
      };
    },
  },
];

export function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }
  return sorted[middle]!;
}

/** Run every rule against one observation. */
export function evaluateObservation(
  candidate: QualityCandidate,
  context: QualityContext,
  thresholds: QualityThresholds = DEFAULT_THRESHOLDS,
): QualityFinding[] {
  const findings: QualityFinding[] = [];
  for (const rule of RULES) {
    const finding = rule.evaluate(candidate, context, thresholds);
    if (finding) findings.push(finding);
  }
  return findings;
}

/** The rule catalogue, for the settings screen. */
export function ruleCatalogue() {
  return RULES.map((rule) => ({
    code: rule.code,
    version: rule.version,
    severity: rule.severity,
    description: rule.description,
  }));
}

/** The most serious severity in a set of findings. */
export function worstSeverity(findings: QualityFinding[]): QualitySeverity | null {
  if (findings.length === 0) return null;
  const rank: Record<QualitySeverity, number> = {
    info: 0,
    warning: 1,
    review: 2,
    blocking: 3,
  };
  return findings.reduce<QualitySeverity>(
    (worst, finding) => (rank[finding.severity] > rank[worst] ? finding.severity : worst),
    'info',
  );
}

/** The quality flag code a finding maps onto in `data_quality_flags`. */
export function flagCodeForFinding(finding: QualityFinding): string {
  switch (finding.ruleCode) {
    case 'duplicate_suspected':
      return 'duplicate_suspected';
    case 'large_price_change':
      return 'price_outlier';
    case 'unrecognised_unit':
      return 'unit_conversion_unverified';
    case 'missing_evidence':
      return 'missing_evidence';
    case 'stale_observation':
      return 'stale';
    default:
      return 'price_outlier';
  }
}
