import { validateSeries, type SeriesKey } from './series';

/**
 * Candlestick aggregation.
 *
 * Brief §7 asks for OHLC candles calculated from actual eligible observations.
 * Brief §7.2, §7.6 and non-negotiables #3, #4 and #6 add the constraints that
 * matter most for agricultural data:
 *
 *   - Do not fabricate candles.
 *   - Do not generate intraday candles from daily observations.
 *   - Do not label observation counts as trading volume.
 *   - Gaps must remain visible.
 *
 * This module enforces all four. It will not produce an intraday candle at
 * all, it refuses to fill a gap, and it reports observation counts as
 * observation counts.
 */

export type Timeframe = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface TimeframeMeta {
  code: Timeframe;
  label: string;
  /** Shortest history, in periods, before the timeframe is meaningful. */
  minimumPeriods: number;
  /** Why this timeframe is or is not offered. */
  note: string;
}

/**
 * The timeframes that may be offered.
 *
 * There is deliberately no 15-minute, 30-minute, 1-hour or 4-hour entry. The
 * schema's `collection_frequency` is ('daily','weekly','adhoc') and its
 * `timestamp_precision` is ('minute','date'), so no intraday series exists to
 * aggregate. Offering the control would produce a convincing chart from daily
 * data, which is exactly what the brief forbids.
 */
export const SUPPORTED_TIMEFRAMES: Record<Timeframe, TimeframeMeta> = {
  daily: {
    code: 'daily',
    label: 'Daily',
    minimumPeriods: 2,
    note: 'One candle per calendar day, from that day’s eligible observations.',
  },
  weekly: {
    code: 'weekly',
    label: 'Weekly',
    minimumPeriods: 2,
    note: 'One candle per ISO week. Weeks with no observation are left as gaps.',
  },
  monthly: {
    code: 'monthly',
    label: 'Monthly',
    minimumPeriods: 2,
    note: 'One candle per calendar month. Months with no observation are left as gaps.',
  },
  quarterly: {
    code: 'quarterly',
    label: 'Quarterly',
    minimumPeriods: 4,
    note: 'One candle per calendar quarter. Needs at least four quarters of history to be meaningful.',
  },
};

/**
 * Timeframes that are explicitly not offered, with the reason.
 *
 * Kept as data rather than omitted so that the reason travels with the code
 * and nobody re-adds an intraday control by accident.
 */
export const UNSUPPORTED_TIMEFRAMES: { code: string; label: string; reason: string }[] = [
  { code: '15m', label: '15 minutes', reason: 'No sub-daily collection exists. Agents collect daily, weekly or ad hoc.' },
  { code: '30m', label: '30 minutes', reason: 'No sub-daily collection exists.' },
  { code: '1h', label: '1 hour', reason: 'No sub-daily collection exists.' },
  { code: '4h', label: '4 hours', reason: 'No sub-daily collection exists.' },
];

export interface ObservationInput {
  id: string;
  /** When the price was observed. */
  collectedAt: string;
  /** The comparable amount for this series. */
  amount: number;
  marketId: number | null;
  sourceSystem: string;
  seriesKey: SeriesKey;
}

export interface Candle {
  /** Start of the period, inclusive, ISO-8601. */
  periodStart: string;
  /** End of the period, exclusive, ISO-8601. */
  periodEnd: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** How many observations this candle aggregates. Never called volume. */
  observationCount: number;
  /** How many distinct markets contributed. */
  marketCount: number;
  /** How many distinct source systems contributed. */
  sourceCount: number;
  /**
   * True when a single observation produced the candle, so open, high, low and
   * close are the same number. The interface must say so — a one-observation
   * candle is a data point, not a price range.
   */
  isDegenerate: boolean;
  /** True when more than one observation was aggregated. */
  isCalculated: boolean;
  /** The ids of the observations behind this candle, for drill-down. */
  observationIds: string[];
}

export interface Gap {
  periodStart: string;
  periodEnd: string;
  /** Periods of silence immediately before this gap, for labelling. */
  consecutiveMissing: number;
}

export interface CandleSeries {
  timeframe: Timeframe;
  candles: Candle[];
  /**
   * Periods with no eligible observation. Never filled, never interpolated.
   * The interface renders these as visible breaks.
   */
  gaps: Gap[];
  /** The key every candle shares. Null when nothing was supplied. */
  seriesKey: SeriesKey | null;
  /** Total observations across all candles. */
  totalObservations: number;
  /** Distinct markets across the whole series. */
  marketCoverage: number;
  /** Distinct source systems across the whole series. */
  sourceCoverage: number;
  /** True when at least one candle came from a single observation. */
  hasDegenerateCandles: boolean;
  /** True when at least one observation came from the legacy import. */
  includesLegacyData: boolean;
}

export interface BuildCandlesResult {
  ok: boolean;
  series?: CandleSeries;
  /** Why the build was refused. The caller must surface this, not hide it. */
  error?: string;
  violations?: ReturnType<typeof validateSeries>['violations'];
}

/* ------------------------------------------------------------ period maths -- */

const DAY_MS = 86_400_000;

/** The start of the period containing `date`, in UTC. */
export function periodStart(date: Date, timeframe: Timeframe): Date {
  const d = new Date(date.getTime());
  switch (timeframe) {
    case 'daily':
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    case 'weekly': {
      // ISO week: weeks start Monday.
      const day = d.getUTCDay(); // 0 = Sunday
      const offset = day === 0 ? 6 : day - 1;
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset));
    }
    case 'monthly':
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    case 'quarterly': {
      const quarter = Math.floor(d.getUTCMonth() / 3) * 3;
      return new Date(Date.UTC(d.getUTCFullYear(), quarter, 1));
    }
  }
}

/** The start of the period after the one containing `date`. */
export function nextPeriodStart(date: Date, timeframe: Timeframe): Date {
  const start = periodStart(date, timeframe);
  switch (timeframe) {
    case 'daily':
      return new Date(start.getTime() + DAY_MS);
    case 'weekly':
      return new Date(start.getTime() + 7 * DAY_MS);
    case 'monthly':
      return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    case 'quarterly':
      return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1));
  }
}

/* -------------------------------------------------------------- the builder -- */

/**
 * Build candles from observations.
 *
 * The series must already be comparable. If it is not, the build is refused
 * with the specific dimensions that differ — the caller must show that rather
 * than a chart.
 */
export function buildCandles(
  observations: ObservationInput[],
  timeframe: Timeframe,
): BuildCandlesResult {
  const validation = validateSeries(observations);
  if (!validation.valid) {
    return {
      ok: false,
      error:
        'These observations are not comparable, so no candle can be calculated. ' +
        (validation.violations[0]?.reason ?? ''),
      violations: validation.violations,
    };
  }

  if (observations.length === 0) {
    return {
      ok: true,
      series: {
        timeframe,
        candles: [],
        gaps: [],
        seriesKey: null,
        totalObservations: 0,
        marketCoverage: 0,
        sourceCoverage: 0,
        hasDegenerateCandles: false,
        includesLegacyData: false,
      },
    };
  }

  // Sort by observation time. Ties keep a stable order so the "close" is the
  // last observation collected, not whichever row the database returned first.
  const sorted = [...observations].sort((a, b) => {
    const diff = new Date(a.collectedAt).getTime() - new Date(b.collectedAt).getTime();
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  const buckets = new Map<
    string,
    { start: Date; end: Date; items: ObservationInput[] }
  >();

  for (const observation of sorted) {
    const at = new Date(observation.collectedAt);
    if (Number.isNaN(at.getTime())) continue; // unparseable timestamps are dropped, never guessed
    const start = periodStart(at, timeframe);
    const id = start.toISOString();
    let bucket = buckets.get(id);
    if (!bucket) {
      bucket = { start, end: nextPeriodStart(start, timeframe), items: [] };
      buckets.set(id, bucket);
    }
    bucket.items.push(observation);
  }

  const ordered = [...buckets.values()].sort((a, b) => a.start.getTime() - b.start.getTime());

  const candles: Candle[] = ordered.map((bucket) => {
    const items = bucket.items;
    const amounts = items.map((i) => i.amount);
    return {
      periodStart: bucket.start.toISOString(),
      periodEnd: bucket.end.toISOString(),
      open: items[0].amount,
      close: items[items.length - 1].amount,
      high: Math.max(...amounts),
      low: Math.min(...amounts),
      observationCount: items.length,
      marketCount: new Set(items.map((i) => i.marketId)).size,
      sourceCount: new Set(items.map((i) => i.sourceSystem)).size,
      isDegenerate: items.length === 1,
      isCalculated: items.length > 1,
      observationIds: items.map((i) => i.id),
    };
  });

  // Gaps are the periods between the first and last candle that have no
  // observation. They are never filled.
  const gaps: Gap[] = [];
  for (let i = 1; i < ordered.length; i += 1) {
    const previous = ordered[i - 1];
    const current = ordered[i];
    let cursor = new Date(previous.end.getTime());
    let missing = 0;
    while (cursor.getTime() < current.start.getTime()) {
      const end = nextPeriodStart(cursor, timeframe);
      gaps.push({
        periodStart: cursor.toISOString(),
        periodEnd: end.toISOString(),
        consecutiveMissing: 0,
      });
      missing += 1;
      cursor = end;
    }
    // Label the run so the interface can say "3 months with no data" rather
    // than drawing three separate breaks.
    if (missing > 0) {
      const start = gaps.length - missing;
      for (let g = start; g < gaps.length; g += 1) gaps[g].consecutiveMissing = missing;
    }
  }

  const allItems = ordered.flatMap((b) => b.items);

  return {
    ok: true,
    series: {
      timeframe,
      candles,
      gaps,
      seriesKey: validation.key,
      totalObservations: allItems.length,
      marketCoverage: new Set(allItems.map((i) => i.marketId)).size,
      sourceCoverage: new Set(allItems.map((i) => i.sourceSystem)).size,
      hasDegenerateCandles: candles.some((c) => c.isDegenerate),
      includesLegacyData: allItems.some((i) => i.sourceSystem === 'legacy_import'),
    },
  };
}

/* ------------------------------------------------------------ describing it -- */

export interface SeriesProvenance {
  /** One sentence stating what the chart is made of. */
  summary: string;
  /** The disclosures the interface must show alongside the chart. */
  disclosures: string[];
}

/**
 * Describe a series honestly.
 *
 * Brief §7.5 requires every chart to communicate its data source, observation
 * count, market coverage, price type, grade, unit, currency, last update and
 * verification basis. This produces that text from the series itself, so it
 * cannot drift from the data.
 */
export function describeSeries(
  series: CandleSeries,
  context: {
    commodityName: string;
    marketName: string | null;
    priceTypeLabel: string;
    gradeName: string | null;
    unitName: string | null;
    currencyCode: string;
    verifiedOnly: boolean;
  },
): SeriesProvenance {
  const disclosures: string[] = [];

  const where = context.marketName
    ? context.marketName
    : `${series.marketCoverage} market${series.marketCoverage === 1 ? '' : 's'}`;

  disclosures.push(
    `${series.totalObservations} observation${series.totalObservations === 1 ? '' : 's'} ` +
      `across ${where}.`,
  );
  disclosures.push(`Price type: ${context.priceTypeLabel}.`);
  disclosures.push(`Grade: ${context.gradeName ?? 'not recorded'}.`);
  disclosures.push(
    `Unit: ${context.unitName ?? 'not recorded'}. Currency: ${context.currencyCode}.`,
  );
  disclosures.push(
    context.verifiedOnly
      ? 'Verified observations only.'
      : 'Includes unverified observations.',
  );

  if (series.sourceCoverage > 1) {
    disclosures.push(`${series.sourceCoverage} source systems contributed.`);
  }
  if (series.includesLegacyData) {
    disclosures.push(
      'Includes data migrated from the previous system, which carries no unit, price type or verification trail.',
    );
  }
  if (series.gaps.length > 0) {
    const longest = Math.max(...series.gaps.map((g) => g.consecutiveMissing));
    disclosures.push(
      `${series.gaps.length} period${series.gaps.length === 1 ? '' : 's'} with no observation` +
        (longest > 1 ? `, the longest run being ${longest} consecutive` : '') +
        '. Gaps are shown as breaks, not filled.',
    );
  }
  if (series.hasDegenerateCandles) {
    const count = series.candles.filter((c) => c.isDegenerate).length;
    disclosures.push(
      `${count} candle${count === 1 ? '' : 's'} ${count === 1 ? 'comes' : 'come'} from a single ` +
        'observation, so open, high, low and close are the same figure.',
    );
  }

  const summary =
    `${context.commodityName} · ${context.priceTypeLabel} · ` +
    `${context.gradeName ?? 'no grade recorded'} · ${where} · ` +
    `${SUPPORTED_TIMEFRAMES[series.timeframe].label.toLowerCase()} candles`;

  return { summary, disclosures };
}

/**
 * Whether a timeframe has enough history to be worth showing.
 *
 * A timeframe with fewer observations than its minimum is offered greyed out
 * with the reason, rather than rendering a single dot as a chart.
 */
export function timeframeReadiness(
  series: CandleSeries | null,
  timeframe: Timeframe,
): { ready: boolean; reason: string | null } {
  const meta = SUPPORTED_TIMEFRAMES[timeframe];
  if (!series) return { ready: false, reason: 'No series loaded.' };
  if (series.candles.length === 0) {
    return { ready: false, reason: 'No observations fall in this period.' };
  }
  if (series.candles.length < meta.minimumPeriods) {
    return {
      ready: false,
      reason: `Only ${series.candles.length} period${
        series.candles.length === 1 ? '' : 's'
      } of data. At least ${meta.minimumPeriods} are needed for a ${meta.label.toLowerCase()} view.`,
    };
  }
  return { ready: true, reason: null };
}
