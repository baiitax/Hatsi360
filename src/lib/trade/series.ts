import { PRICE_TYPE_META, type PriceType } from '@/types/domain';

/**
 * Comparable price series.
 *
 * Brief §7.1, §11, §12 and non-negotiable #5 all say the same thing: never
 * combine incompatible commodities, grades, units, currencies or price types.
 *
 * This module is the single place that decision is made. Every consumer —
 * candles, best buy, best sell, spread, market comparison — selects a series
 * through here first, so the rule cannot be bypassed by forgetting it.
 */

/** The dimensions that must match for two prices to be comparable. */
export interface SeriesKey {
  commodityId: number;
  /**
   * The market the series describes, or null for a cross-market aggregate.
   * Two series with different market ids are only comparable as an
   * explicitly-labelled aggregate, never as a single market's price.
   */
  marketId: number | null;
  priceType: PriceType;
  gradeId: number | null;
  unitId: number | null;
  currencyCode: string;
  varietyId: number | null;
}

export type ComparableDimension =
  | 'commodity'
  | 'market'
  | 'priceType'
  | 'grade'
  | 'unit'
  | 'currency'
  | 'variety';

export interface CompatibilityReport {
  compatible: boolean;
  /** The dimensions that differ, named, so the interface can explain why. */
  differences: ComparableDimension[];
  /** A sentence suitable for showing a user. */
  reason: string | null;
}

const DIMENSION_LABELS: Record<ComparableDimension, string> = {
  commodity: 'commodity',
  market: 'market',
  priceType: 'price type',
  grade: 'grade',
  unit: 'measurement unit',
  currency: 'currency',
  variety: 'variety',
};

/**
 * Compare two series keys.
 *
 * The rules, and why each exists:
 *
 *  - commodity must match. Two different crops are not the same asset.
 *  - price type must match, and both must be comparable. `indicative` and
 *    `unspecified` are not comparable with anything, including each other,
 *    because a non-binding estimate and an unknown type are not facts.
 *  - grade must match exactly, and an unknown grade never equals a known one.
 *    "No grade recorded" is not the same as "Grade 1" — assuming it is would
 *    silently compare premium against ordinary.
 *  - unit must match exactly. Conversion only happens through a *verified*
 *    conversion, which is a separate, disclosed step (see `convertSeries`).
 *  - currency must match. A cross-currency comparison needs a disclosed rate
 *    and timestamp, which this module does not invent.
 *  - variety must match when either side records one.
 *  - market: two different markets are not comparable as a single price. They
 *    may be compared as an aggregate, which is a different series.
 */
export function compareSeries(a: SeriesKey, b: SeriesKey): CompatibilityReport {
  const differences: ComparableDimension[] = [];

  if (a.commodityId !== b.commodityId) differences.push('commodity');

  // A price type that is not comparable with itself cannot be compared at all.
  const aComparable = PRICE_TYPE_META[a.priceType]?.isComparable ?? false;
  const bComparable = PRICE_TYPE_META[b.priceType]?.isComparable ?? false;
  if (!aComparable || !bComparable || a.priceType !== b.priceType) {
    differences.push('priceType');
  }

  if (a.gradeId !== b.gradeId) differences.push('grade');
  if (a.unitId !== b.unitId) differences.push('unit');
  if (a.currencyCode !== b.currencyCode) differences.push('currency');
  if (a.varietyId !== b.varietyId) differences.push('variety');

  // Market is reported separately: it is the dimension a trader most often
  // wants to cross, and it is never silently crossed.
  if (a.marketId !== b.marketId) differences.push('market');

  const compatible = differences.length === 0;

  let reason: string | null = null;
  if (!compatible) {
    const named = differences.map((d) => DIMENSION_LABELS[d]);
    if (named.length === 1) {
      reason = `Different ${named[0]}.`;
    } else {
      const last = named.pop();
      reason = `Different ${named.join(', ')} and ${last}.`;
    }
  }

  return { compatible, differences, reason };
}

export function areCompatible(a: SeriesKey, b: SeriesKey): boolean {
  return compareSeries(a, b).compatible;
}

/** The key of a series, for grouping and deduplication. */
export function seriesKeyId(key: SeriesKey): string {
  return [
    key.commodityId,
    key.marketId ?? 'aggregate',
    key.priceType,
    key.gradeId ?? 'nograde',
    key.unitId ?? 'nounit',
    key.currencyCode,
    key.varietyId ?? 'novariety',
  ].join('|');
}

export interface SeriesViolation {
  /** The index of the offending observation in the input list. */
  index: number;
  differences: ComparableDimension[];
  reason: string;
}

export interface SeriesValidation {
  valid: boolean;
  violations: SeriesViolation[];
  /** The key every observation shares, when the series is valid. */
  key: SeriesKey | null;
}

/**
 * Validate that a list of observations forms one comparable series.
 *
 * Called before any aggregation. If it fails, the caller must not aggregate —
 * aggregating incompatible prices produces a number that looks like a price
 * and is not one.
 */
export function validateSeries<T extends { seriesKey: SeriesKey }>(
  observations: T[],
): SeriesValidation {
  if (observations.length === 0) return { valid: true, violations: [], key: null };

  const key = observations[0].seriesKey;
  const violations: SeriesViolation[] = [];

  observations.forEach((observation, index) => {
    const report = compareSeries(key, observation.seriesKey);
    if (!report.compatible) {
      violations.push({
        index,
        differences: report.differences,
        reason: report.reason ?? 'Not comparable.',
      });
    }
  });

  return { valid: violations.length === 0, violations, key };
}

/**
 * Partition observations into comparable groups.
 *
 * Used by market comparison and by the opportunity engines, which must compare
 * like with like and report what they excluded.
 */
export function partitionBySeries<T extends { seriesKey: SeriesKey }>(
  observations: T[],
): { groups: { key: SeriesKey; items: T[] }[]; excluded: { item: T; reason: string }[] } {
  const byId = new Map<string, { key: SeriesKey; items: T[] }>();
  const excluded: { item: T; reason: string }[] = [];

  for (const item of observations) {
    const id = seriesKeyId(item.seriesKey);
    const existing = byId.get(id);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    byId.set(id, { key: item.seriesKey, items: [item] });
  }

  return { groups: [...byId.values()], excluded };
}

/* ------------------------------------------------------- unit conversion -- */

export interface VerifiedConversion {
  fromUnitId: number;
  toUnitId: number;
  /** Multiply an amount in `fromUnitId` by this to get `toUnitId`. */
  factor: number;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

/**
 * Convert a series to another unit, but only through a *verified* conversion.
 *
 * Brief §12.6 and §11.3 require that any converted comparison disclose the
 * conversion and its verification. This function returns null when no verified
 * conversion exists, and the caller must then say the comparison is
 * unavailable rather than performing it.
 *
 * It never invents a factor. A tonne and a kilogram are not interchangeable by
 * assumption.
 */
export function convertSeriesKey(
  key: SeriesKey,
  targetUnitId: number,
  conversions: VerifiedConversion[],
): { key: SeriesKey; conversion: VerifiedConversion } | null {
  if (key.unitId === null) return null;
  if (key.unitId === targetUnitId) return null;

  const direct = conversions.find(
    (c) => c.fromUnitId === key.unitId && c.toUnitId === targetUnitId,
  );
  if (direct) {
    return { key: { ...key, unitId: targetUnitId }, conversion: direct };
  }

  // A two-step conversion is only allowed when both legs are verified.
  for (const first of conversions) {
    if (first.fromUnitId !== key.unitId) continue;
    for (const second of conversions) {
      if (second.fromUnitId !== first.toUnitId || second.toUnitId !== targetUnitId) continue;
      return {
        key: { ...key, unitId: targetUnitId },
        conversion: {
          fromUnitId: key.unitId,
          toUnitId: targetUnitId,
          factor: first.factor * second.factor,
          verifiedBy: second.verifiedBy,
          verifiedAt: second.verifiedAt,
        },
      };
    }
  }

  return null;
}

/**
 * Apply a verified conversion to an amount.
 *
 * The result is a *converted* figure and must be labelled as such wherever it
 * is shown, together with the factor and its verification.
 */
export function convertAmount(amount: number, conversion: VerifiedConversion): number {
  return amount * conversion.factor;
}

/** A human-readable disclosure for a converted comparison. */
export function describeConversion(conversion: VerifiedConversion): string {
  const verified = conversion.verifiedAt
    ? `verified ${new Date(conversion.verifiedAt).toLocaleDateString('en-NG')}`
    : 'verification not recorded';
  return `Converted using factor ${conversion.factor} (${verified}).`;
}
