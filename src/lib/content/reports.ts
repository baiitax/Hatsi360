/**
 * Market intelligence reports.
 *
 * A report here is **authored analysis over real records**, not a document
 * with numbers typed into it. The prose is written by the editorial desk; every
 * figure in the body is computed at request time from published observations
 * through the data source. If there is no data, the report says so instead of
 * showing a placeholder.
 *
 * This is the distinction that matters: a report is allowed to have an
 * opinion, but it is not allowed to have an unsourced number.
 */

import type { PriceObservation } from '@/types/domain';

export interface ReportScope {
  /** The categories the report covers, or `null` for all categories. */
  categorySlugs?: string[];
  /** Restrict to a price type, or `null` for every comparable type. */
  priceType?: string | null;
  /** The window in days the report covers. `null` means the full record. */
  windowDays: number | null;
}

export interface ReportDefinition {
  slug: string;
  title: string;
  summary: string;
  /** The method note — always shown, so the reader knows what the numbers are. */
  method: string;
  /** The editorial body. `{figures}` placeholders are filled from the data. */
  body: string[];
  scope: ReportScope;
  /** The cadence the report is refreshed on, stated as an intention. */
  cadence: string;
  category: string;
  readingMinutes: number;
}

export const REPORTS: ReportDefinition[] = [
  {
    slug: 'northern-nigeria-grain-review',
    title: 'Northern Nigeria grain market review',
    summary:
      'What the recorded grain prices across the covered markets actually show, with the sample size behind every statement.',
    method:
      'Median of published observations per market and commodity, grouped by the market the observation was collected in. Only observations with a recorded price type are included. Markets with a single observation are shown with their sample size rather than smoothed into a trend.',
    body: [
      'This review is built from the price observations Hatsi360 has published for the grain commodities in its catalogue. It is written from the record, not from memory: every figure below is the median of the observations that were actually published for that market in the window stated, and the number of observations behind each figure is shown.',
      'A grain market does not trade at one price. The same commodity is asked at different prices in different markets, and within a market the asking price moves as the day\'s supply arrives. That is why the figures here are broken down by market rather than averaged into a single national number — a national average across markets with different transport costs and different volumes tells a trader very little.',
      'Where the record is thin, this review says so. A market that has published a handful of observations is shown with that handful beside it, because a median computed from two observations is a median of two observations and nothing more. Hatsi360 does not extend a series it does not have, and it does not interpolate across days with no published observation.',
      'The practical reading is a comparison, not a forecast. Where two markets differ materially for the same commodity and price type, the difference is where the question is — whether it is transport, timing, grade, or the state of supply on the day. The record tells you the difference is real. Deciding its cause is a job for someone standing in the market.',
    ],
    scope: { windowDays: 90 },
    cadence: 'Reviewed as new observations are published.',
    category: 'Market review',
    readingMinutes: 6,
  },
  {
    slug: 'price-movement-review',
    title: 'Where prices moved, and by how much',
    summary:
      'The commodities with the largest recorded movement in the window, the direction of each move, and how many observations support it.',
    method:
      'Percentage movement is computed between the earliest and the latest published observation in the window for each commodity, and only where at least two observations exist on different days. The movement is not annualised, not projected, and not smoothed.',
    body: [
      'Movement is the number commercial decisions actually turn on, and it is also the number most easily made to look more impressive than it is. This review therefore reports the smallest useful thing: the direction of the move, its size, and the number of observations that support it.',
      'Only commodities with published observations on at least two different days inside the window appear here. A commodity with a single observation has no movement to report, and it is not shown with a zero, because a zero would imply stability that the record does not support.',
      'The percentages are not annualised and are not a forecast. They describe what was recorded between the first and last observation in the window. Where the observations are spread across a long period, the movement is the accumulated change across that period, and the review says how many observations and how many days are behind it.',
    ],
    scope: { windowDays: 90 },
    cadence: 'Reviewed as new observations are published.',
    category: 'Movement',
    readingMinutes: 4,
  },
  {
    slug: 'collection-coverage-review',
    title: 'Collection coverage and data freshness',
    summary:
      'Which markets are actually reporting, how recently, and which commodities are thin — the honest picture of what the platform knows.',
    method:
      'Every market and commodity in the catalogue is counted, and each is marked by the recency of its most recent published observation. Coverage is reported as counts, never as a headline claim.',
    body: [
      'Coverage is the first question any serious user of a price platform should ask, and it is usually the last one answered. This review answers it directly: how many markets in the catalogue are publishing, how many are not, and how recent the newest observation is in each.',
      'Hatsi360 distinguishes three states. A market that is reporting has published observations. A market that is in the catalogue but not reporting is a gap that we state rather than hide. A commodity that has only one observation is thin, and a thin commodity does not support the kind of comparison that a well-covered one does.',
      'This report contains no aggregate claim about market size, ranking or accuracy. It contains counts of what has been published, and the freshness of what has been published.',
    ],
    scope: { windowDays: null },
    cadence: 'Reviewed as new observations are published.',
    category: 'Coverage',
    readingMinutes: 3,
  },
];

export function getReport(slug: string): ReportDefinition | null {
  return REPORTS.find((report) => report.slug === slug) ?? null;
}

/* ------------------------------------------------------------ computation -- */

export interface Figure {
  label: string;
  value: string;
  detail: string;
}

export interface ComputedReport {
  /** True when there is not enough data to say anything. */
  empty: boolean;
  emptyReason: string;
  figures: Figure[];
  /** Per-commodity movement rows. */
  movements: {
    commodityName: string;
    commoditySlug: string | null;
    firstAmount: number;
    lastAmount: number;
    changePercent: number | null;
    observations: number;
    firstDay: string;
    lastDay: string;
    currencyCode: string;
    priceType: string;
    unitLabel: string;
  }[];
  /** Per-market rows. */
  markets: {
    marketName: string;
    marketSlug: string | null;
    stateName: string | null;
    commodityName: string;
    median: number;
    observations: number;
    latestDay: string;
    currencyCode: string;
    priceType: string;
    unitLabel: string;
  }[];
  /** The commodities that have the thinnest coverage. */
  thin: { commodityName: string; commoditySlug: string | null; observations: number }[];
  windowLabel: string;
  observationCount: number;
  /** The most recent published observation the window is anchored to. */
  anchorCollectedAt: string | null;
  /** True when the window was anchored to the record rather than to today. */
  windowAnchoredToRecord: boolean;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

const dayLabel = (iso: string) => dayKey(iso);

/**
 * Compute the figures a report needs from the published observations.
 *
 * Every number the report shows comes from here, so the report cannot display
 * a figure the data does not support.
 */
export function computeReport(
  report: ReportDefinition,
  observations: PriceObservation[],
  options: {
    unitLabels: Map<number, string>;
    totalMarkets: number;
    totalCommodities: number;
  },
): ComputedReport {
  /**
   * The window is resolved against the record, not against the wall clock.
   *
   * A fixed window measured from "now" is empty whenever collection is paused
   * or the newest observation is old — which is exactly when a reader needs
   * the report most. So the window is anchored to the newest published
   * observation in the dataset, and the label says so. The window is never
   * widened silently and never filled with an estimate.
   */
  const newestCollectedAt = observations.reduce<string | null>((latest, observation) => {
    if (!latest || observation.collectedAt > latest) return observation.collectedAt;
    return latest;
  }, null);

  const anchor = newestCollectedAt ?? new Date().toISOString();
  const anchorTime = new Date(anchor).getTime();
  const cutoff =
    report.scope.windowDays === null
      ? null
      : new Date(anchorTime - report.scope.windowDays * 24 * 60 * 60 * 1000).toISOString();

  const inWindow = observations.filter((observation) => {
    if (cutoff && observation.collectedAt < cutoff) return false;
    if (report.scope.priceType && observation.priceType !== report.scope.priceType) return false;
    return true;
  });

  const windowLabel =
    report.scope.windowDays === null
      ? 'the full published record'
      : `the ${report.scope.windowDays} days up to the most recent published observation`;

  if (inWindow.length === 0) {
    return {
      empty: true,
      emptyReason: `No published observations fall inside ${windowLabel}.`,
      figures: [],
      movements: [],
      markets: [],
      thin: [],
      windowLabel,
      observationCount: 0,
      anchorCollectedAt: newestCollectedAt,
      windowAnchoredToRecord: newestCollectedAt !== null,
    };
  }

  /* --- market x commodity medians -------------------------------------- */
  const groups = new Map<
    string,
    { marketName: string; marketSlug: string | null; stateName: string | null; commodityName: string; commoditySlug: string | null; amounts: number[]; currencyCode: string; priceType: string; unitId: number | null; latestDay: string }
  >();

  for (const observation of inWindow) {
    if (observation.reportedAmount === null) continue;
    const key = `${observation.marketId}|${observation.commodityId}|${observation.priceType}|${observation.reportedUnitId ?? 'none'}`;
    const bucket = groups.get(key) ?? {
      marketName: observation.marketName ?? 'Market',
      marketSlug: observation.marketSlug ?? null,
      stateName: observation.stateName ?? null,
      commodityName: observation.commodityName ?? 'Commodity',
      commoditySlug: observation.commoditySlug ?? null,
      amounts: [],
      currencyCode: observation.currencyCode,
      priceType: observation.priceType,
      unitId: observation.reportedUnitId,
      latestDay: observation.collectedAt,
    };
    bucket.amounts.push(observation.reportedAmount);
    if (observation.collectedAt > bucket.latestDay) bucket.latestDay = observation.collectedAt;
    groups.set(key, bucket);
  }

  const markets = [...groups.values()]
    .map((group) => ({
      marketName: group.marketName,
      marketSlug: group.marketSlug,
      stateName: group.stateName,
      commodityName: group.commodityName,
      median: median(group.amounts),
      observations: group.amounts.length,
      latestDay: group.latestDay,
      currencyCode: group.currencyCode,
      priceType: group.priceType,
      unitLabel: group.unitId ? (options.unitLabels.get(group.unitId) ?? 'unspecified') : 'unspecified',
    }))
    .sort(
      (a, b) =>
        b.observations - a.observations || a.commodityName.localeCompare(b.commodityName),
    );

  /* --- movement --------------------------------------------------------- */
  const byCommodity = new Map<
    string,
    { name: string; slug: string | null; rows: PriceObservation[] }
  >();
  for (const observation of inWindow) {
    const key = `${observation.commodityId}|${observation.priceType}|${observation.reportedUnitId ?? 'none'}`;
    const bucket = byCommodity.get(key) ?? {
      name: observation.commodityName ?? 'Commodity',
      slug: observation.commoditySlug ?? null,
      rows: [],
    };
    bucket.rows.push(observation);
    byCommodity.set(key, bucket);
  }

  const movements = [...byCommodity.values()]
    .map((bucket) => {
      const rows = [...bucket.rows].sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
      const days = new Set(rows.map((row) => dayKey(row.collectedAt)));
      if (days.size < 2) return null;
      const withAmount = rows.filter((row) => row.reportedAmount !== null);
      if (withAmount.length < 2) return null;
      const first = withAmount[0];
      const last = withAmount[withAmount.length - 1];
      const changePercent =
        first.reportedAmount && last.reportedAmount
          ? ((last.reportedAmount - first.reportedAmount) / first.reportedAmount) * 100
          : null;
      return {
        commodityName: bucket.name,
        commoditySlug: bucket.slug,
        firstAmount: first.reportedAmount as number,
        lastAmount: last.reportedAmount as number,
        changePercent,
        observations: withAmount.length,
        firstDay: dayLabel(first.collectedAt),
        lastDay: dayLabel(last.collectedAt),
        currencyCode: last.currencyCode,
        priceType: last.priceType,
        unitLabel: last.reportedUnitId
          ? (options.unitLabels.get(last.reportedUnitId) ?? 'unspecified')
          : 'unspecified',
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0));

  /* --- thin coverage ---------------------------------------------------- */
  const perCommodity = new Map<string, { name: string; slug: string | null; count: number }>();
  for (const observation of inWindow) {
    const key = String(observation.commodityId);
    const bucket = perCommodity.get(key) ?? {
      name: observation.commodityName ?? 'Commodity',
      slug: observation.commoditySlug ?? null,
      count: 0,
    };
    bucket.count += 1;
    perCommodity.set(key, bucket);
  }
  const thin = [...perCommodity.values()]
    .filter((entry) => entry.count <= 2)
    .sort((a, b) => a.count - b.count)
    .map((entry) => ({
      commodityName: entry.name,
      commoditySlug: entry.slug,
      observations: entry.count,
    }));

  const reportingMarkets = new Set(inWindow.map((observation) => observation.marketId));

  const figures: Figure[] = [
    {
      label: 'Published observations',
      value: String(inWindow.length),
      detail: `in ${windowLabel}`,
    },
    {
      label: 'Markets reporting',
      value: String(reportingMarkets.size),
      detail: `of ${options.totalMarkets} in the catalogue`,
    },
    {
      label: 'Commodities observed',
      value: String(perCommodity.size),
      detail: `of ${options.totalCommodities} in the catalogue`,
    },
    {
      label: 'Commodities with movement',
      value: String(movements.length),
      detail: 'two or more days of published observations',
    },
  ];

  return {
    empty: false,
    emptyReason: '',
    figures,
    movements,
    markets,
    thin,
    windowLabel,
    observationCount: inWindow.length,
    anchorCollectedAt: newestCollectedAt,
    windowAnchoredToRecord: newestCollectedAt !== null,
  };
}
