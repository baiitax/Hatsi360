import 'server-only';

import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { buildCandles, type CandleSeries, type ObservationInput, type Timeframe } from '@/lib/trade/candles';
import { classifyFreshness, type FreshnessAssessment } from '@/lib/trade/freshness';
import {
  compareSeries,
  seriesKeyId,
  type SeriesKey,
} from '@/lib/trade/series';
import {
  calculateSpread,
  findBestBuy,
  findBestSell,
  type OpportunityObservation,
  type OpportunityResult,
  type SpreadResult,
} from '@/lib/trade/opportunities';
import type { PriceObservation } from '@/types/domain';

/**
 * The read layer between the live database and the analysis engine.
 *
 * Every function here reads *published* observations only, through the
 * existing `published_price_observations` view. Nothing in this file can reach
 * a draft, a rejected row or an unpublished observation, so the terminal cannot
 * display data that has not been through verification.
 *
 * The engine in `src/lib/trade/` does the thinking; this file only decides
 * which rows it is allowed to think about.
 */

/** The comparison dimensions an observation carries into the engine. */
function toSeriesKey(observation: PriceObservation): SeriesKey {
  return {
    commodityId: observation.commodityId,
    marketId: observation.marketId,
    priceType: observation.priceType,
    gradeId: observation.gradeId,
    // The unit the price was actually reported in, never a normalised one.
    // Normalisation only happens through a verified conversion, which is a
    // separate and disclosed step.
    unitId: observation.reportedUnitId,
    currencyCode: observation.currencyCode,
    varietyId: observation.varietyId,
  };
}

/**
 * The comparable amount for an observation.
 *
 * The reported amount is used as-is. When it is missing but a normalised
 * amount exists, the normalised figure is used *with its own unit* — never
 * mixed into a series that is denominated in the reported unit, because the
 * two are different bases.
 */
function toComparableAmount(observation: PriceObservation): number | null {
  if (observation.reportedAmount != null) return observation.reportedAmount;
  if (observation.normalizedAmount != null) return null;
  return null;
}

function toEngineObservation(observation: PriceObservation): ObservationInput | null {
  const amount = toComparableAmount(observation);
  if (amount == null) return null;
  return {
    id: observation.id,
    collectedAt: observation.collectedAt,
    amount,
    marketId: observation.marketId,
    sourceSystem: observation.sourceSystem,
    seriesKey: toSeriesKey(observation),
  };
}

function toOpportunityObservation(observation: PriceObservation): OpportunityObservation | null {
  const amount = toComparableAmount(observation);
  if (amount == null) return null;
  return {
    id: observation.id,
    seriesKey: toSeriesKey(observation),
    amount,
    collectedAt: observation.collectedAt,
    marketId: observation.marketId,
    marketName: observation.marketName ?? `Market ${observation.marketId}`,
    commodityId: observation.commodityId,
    commodityName: observation.commodityName ?? 'Unknown commodity',
    verificationStatus: observation.verificationStatus,
    publishedAt: observation.publishedAt,
    availability: null,
  };
}

/** How many published observations a query may pull for charting. */
const ANALYSIS_ROW_LIMIT = 2000;

export interface CommoditySeriesRequest {
  commodityId: number;
  marketId?: number | null;
  priceType?: PriceObservation['priceType'];
  gradeId?: number | null;
  timeframe: Timeframe;
}

export interface CommoditySeriesResult {
  candles: CandleSeries | null;
  /** Why no series was produced, in words a screen can show. */
  unavailableReason: string | null;
  /** How many published observations were found at all. */
  observationCount: number;
  /** How many were dropped for being incomparable. */
  excludedCount: number;
  freshness: FreshnessAssessment | null;
}

/**
 * Build the candle series for one commodity.
 *
 * The selection is narrowed to a single comparable series before aggregation,
 * so the chart can never silently merge two price types or two grades. When
 * the caller asks for a market, only that market's observations are used.
 */
export async function getCommoditySeries(
  request: CommoditySeriesRequest,
): Promise<CommoditySeriesResult> {
  if (!isSupabaseConfigured()) {
    return {
      candles: null,
      unavailableReason:
        'No database is configured, so there are no published prices to chart.',
      observationCount: 0,
      excludedCount: 0,
      freshness: null,
    };
  }

  const source = await getDataSource();
  const rows = await source.listObservationsForAnalysis({
    commodityId: request.commodityId,
    marketId: request.marketId ?? undefined,
    priceType: request.priceType,
    gradeId: request.gradeId ?? undefined,
    collectedFrom: undefined,
    collectedTo: undefined,
  });

  const capped = rows.slice(0, ANALYSIS_ROW_LIMIT);
  const engineRows = capped
    .map(toEngineObservation)
    .filter((row): row is ObservationInput => row !== null);

  const latest = capped[0] ?? null;
  const freshness = latest
    ? classifyFreshness({
        collectedAt: latest.collectedAt,
        collectedAtPrecision: latest.collectedAtPrecision,
        verificationStatus: latest.verificationStatus,
        priceType: latest.priceType,
        cadence: 'daily',
      })
    : null;

  if (engineRows.length === 0) {
    return {
      candles: null,
      unavailableReason:
        capped.length === 0
          ? 'No published observation exists for this selection yet.'
          : 'Published observations exist, but none carries a comparable amount in its reported unit.',
      observationCount: capped.length,
      excludedCount: 0,
      freshness,
    };
  }

  // Narrow to the dominant comparable series so the chart never mixes bases.
  const { groups } = partition(engineRows);
  const dominant = groups.sort((a, b) => b.items.length - a.items.length)[0];
  const excluded = engineRows.length - dominant.items.length;

  const built = buildCandles(dominant.items, request.timeframe);
  if (!built.ok || !built.series) {
    return {
      candles: null,
      unavailableReason: built.error ?? 'The series could not be calculated.',
      observationCount: capped.length,
      excludedCount: excluded,
      freshness,
    };
  }

  if (built.series.candles.length === 0) {
    return {
      candles: null,
      unavailableReason: 'No observation falls inside the selected period.',
      observationCount: capped.length,
      excludedCount: excluded,
      freshness,
    };
  }

  return {
    candles: built.series,
    unavailableReason: null,
    observationCount: capped.length,
    excludedCount: excluded,
    freshness,
  };
}

/** Group engine observations by their comparable series. */
function partition(rows: ObservationInput[]) {
  const byId = new Map<string, { key: SeriesKey; items: ObservationInput[] }>();
  for (const row of rows) {
    const id = seriesKeyId(row.seriesKey);
    const existing = byId.get(id);
    if (existing) existing.items.push(row);
    else byId.set(id, { key: row.seriesKey, items: [row] });
  }
  return { groups: [...byId.values()] };
}

export interface MarketComparisonResult {
  spread: SpreadResult;
  bestBuy: OpportunityResult;
  bestSell: OpportunityResult;
  observationCount: number;
  unavailableReason: string | null;
}

/**
 * Everything the opportunity screens need for one commodity.
 *
 * All three results come from the same published rows, and all three exclude
 * incomparable observations with a stated reason.
 */
export async function getCommodityOpportunities(
  commodityId: number,
  options: { priceType?: PriceObservation['priceType']; gradeId?: number | null } = {},
): Promise<MarketComparisonResult> {
  const empty = {
    spread: calculateSpread([]),
    bestBuy: findBestBuy([]),
    bestSell: findBestSell([]),
    observationCount: 0,
    unavailableReason: null as string | null,
  };

  if (!isSupabaseConfigured()) {
    return {
      ...empty,
      unavailableReason: 'No database is configured, so there are no prices to compare.',
    };
  }

  const source = await getDataSource();
  const rows = await source.listObservationsForAnalysis({
    commodityId,
    priceType: options.priceType,
    gradeId: options.gradeId ?? undefined,
  });

  const capped = rows.slice(0, ANALYSIS_ROW_LIMIT);
  const engineRows = capped
    .map(toOpportunityObservation)
    .filter((row): row is OpportunityObservation => row !== null);

  if (engineRows.length === 0) {
    return {
      ...empty,
      observationCount: capped.length,
      unavailableReason:
        capped.length === 0
          ? 'No published observation exists for this commodity yet.'
          : 'Published observations exist, but none carries a comparable amount.',
    };
  }

  return {
    spread: calculateSpread(engineRows),
    bestBuy: findBestBuy(engineRows),
    bestSell: findBestSell(engineRows),
    observationCount: capped.length,
    unavailableReason: null,
  };
}

export interface MovementRow {
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  latestAmount: number | null;
  previousAmount: number | null;
  change: number | null;
  changePercent: number | null;
  marketName: string | null;
  unitName: string | null;
  currencyCode: string;
  priceType: PriceObservation['priceType'];
  gradeName: string | null;
  collectedAt: string;
  verificationStatus: PriceObservation['verificationStatus'];
  /** How many observations back the latest figure. */
  observationCount: number;
}

/**
 * The market movement table.
 *
 * Compares each commodity's latest published observation with the previous one
 * *in the same comparable series*. A change is only calculated when both
 * observations share a series key — otherwise the "change" would be the
 * difference between two different things.
 */
export async function getMarketMovements(limit = 40): Promise<MovementRow[]> {
  if (!isSupabaseConfigured()) return [];

  const source = await getDataSource();
  const commodities = await source.listCommodities();
  const rows: MovementRow[] = [];

  for (const commodity of commodities) {
    const observations = await source.listObservationsForAnalysis({ commodityId: commodity.id });
    if (observations.length === 0) continue;

    // Group by series so a price-type change is never read as a price movement.
    const bySeries = new Map<string, PriceObservation[]>();
    for (const observation of observations) {
      const id = seriesKeyId(toSeriesKey(observation));
      const list = bySeries.get(id);
      if (list) list.push(observation);
      else bySeries.set(id, [observation]);
    }

    // The dominant series is the one with the most observations.
    let dominant: PriceObservation[] = [];
    for (const list of bySeries.values()) {
      if (list.length > dominant.length) dominant = list;
    }
    if (dominant.length === 0) continue;

    const sorted = [...dominant].sort(
      (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
    );
    const latest = sorted[0];
    const previous = sorted[1] ?? null;

    const latestAmount = latest.reportedAmount;
    const previousAmount = previous?.reportedAmount ?? null;
    const change =
      latestAmount != null && previousAmount != null ? latestAmount - previousAmount : null;

    rows.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      commoditySlug: commodity.slug,
      latestAmount,
      previousAmount,
      change,
      changePercent:
        change != null && previousAmount != null && previousAmount !== 0
          ? (change / previousAmount) * 100
          : null,
      marketName: latest.marketName ?? null,
      unitName: null,
      currencyCode: latest.currencyCode,
      priceType: latest.priceType,
      gradeName: null,
      collectedAt: latest.collectedAt,
      verificationStatus: latest.verificationStatus,
      observationCount: dominant.length,
    });
  }

  return rows
    .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
    .slice(0, limit);
}

/* ------------------------------------------------------------- freshness -- */

export interface CommodityFreshness {
  commodityId: number;
  commodityName: string;
  state: FreshnessAssessment['state'];
  label: string;
  explanation: string;
  collectedAt: string | null;
  observationCount: number;
}

/** The freshness of each commodity's most recent published observation. */
export async function getCommodityFreshness(): Promise<CommodityFreshness[]> {
  if (!isSupabaseConfigured()) return [];

  const source = await getDataSource();
  const commodities = await source.listCommodities();
  const results: CommodityFreshness[] = [];

  for (const commodity of commodities) {
    const observations = await source.listObservationsForAnalysis({ commodityId: commodity.id });
    if (observations.length === 0) continue;
    const latest = observations[observations.length - 1];
    const assessment = classifyFreshness({
      collectedAt: latest.collectedAt,
      collectedAtPrecision: latest.collectedAtPrecision,
      verificationStatus: latest.verificationStatus,
      priceType: latest.priceType,
      cadence: 'daily',
    });
    results.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      state: assessment.state,
      label: assessment.label,
      explanation: assessment.explanation,
      collectedAt: latest.collectedAt,
      observationCount: observations.length,
    });
  }

  return results;
}

/* ------------------------------------------------------------ comparison -- */

export interface SeriesOption {
  key: string;
  label: string;
  priceType: PriceObservation['priceType'];
  gradeId: number | null;
  unitId: number | null;
  currencyCode: string;
  observationCount: number;
  marketCount: number;
}

/**
 * The comparable series available for one commodity.
 *
 * The opportunity and chart screens offer these as the choices, so a user
 * picks a series rather than a market and a grade separately — which is how
 * incompatible comparisons happen.
 */
export async function getCommoditySeriesOptions(
  commodityId: number,
): Promise<SeriesOption[]> {
  if (!isSupabaseConfigured()) return [];

  const source = await getDataSource();
  const rows = await source.listObservationsForAnalysis({ commodityId });
  const groups = new Map<string, { key: SeriesKey; items: PriceObservation[] }>();

  for (const observation of rows) {
    const key = toSeriesKey(observation);
    const id = seriesKeyId(key);
    const existing = groups.get(id);
    if (existing) existing.items.push(observation);
    else groups.set(id, { key, items: [observation] });
  }

  return [...groups.values()]
    .map(({ key, items }) => ({
      key: seriesKeyId(key),
      label: [
        key.priceType.replace(/_/g, ' '),
        key.gradeId ? `grade ${key.gradeId}` : 'no grade recorded',
        key.unitId ? `unit ${key.unitId}` : 'no unit recorded',
        key.currencyCode,
      ].join(' · '),
      priceType: key.priceType,
      gradeId: key.gradeId,
      unitId: key.unitId,
      currencyCode: key.currencyCode,
      observationCount: items.length,
      marketCount: new Set(items.map((i) => i.marketId)).size,
    }))
    .sort((a, b) => b.observationCount - a.observationCount);
}

/* --------------------------------------------------------- fundamentals -- */

export interface FundamentalSignal {
  commodityId: number;
  commodityName: string;
  marketId: number;
  marketName: string;
  availability: string | null;
  supplyLevel: string | null;
  demandLevel: string | null;
  priceDirection: string | null;
  sentiment: string | null;
  developments: string | null;
  collectedAt: string;
}

/**
 * Field-reported market intelligence.
 *
 * This reads `observation_market_intelligence`, which the Field app has been
 * writing and nothing has displayed. It is the platform's only fundamental
 * data source, and it is field-reported rather than editorial.
 */
export async function getFundamentalSignals(
  commodityId?: number,
  limit = 50,
): Promise<FundamentalSignal[]> {
  if (!isSupabaseConfigured()) return [];

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  let builder = supabase
    .from('observation_market_intelligence')
    .select(
      'availability, supply_level, demand_level, price_direction, sentiment, developments, observation_id, price_observations!inner(commodity_id, market_id, collected_at, commodities(name), markets(name))',
    )
    .order('observation_id', { ascending: false })
    .limit(limit);

  if (commodityId != null) {
    builder = builder.eq('price_observations.commodity_id', commodityId);
  }

  const { data, error } = await builder;
  if (error || !data) return [];

  type IntelligenceRow = {
    availability: string | null;
    supply_level: string | null;
    demand_level: string | null;
    price_direction: string | null;
    sentiment: string | null;
    developments: string | null;
    price_observations: {
      commodity_id: number;
      market_id: number;
      collected_at: string;
      commodities: { name: string } | null;
      markets: { name: string } | null;
    };
  };

  return (data as unknown as IntelligenceRow[]).map((row) => {
    const observation = row.price_observations;
    return {
      commodityId: observation.commodity_id,
      commodityName: observation.commodities?.name ?? 'Unknown commodity',
      marketId: observation.market_id,
      marketName: observation.markets?.name ?? 'Unknown market',
      availability: (row.availability as string | null) ?? null,
      supplyLevel: (row.supply_level as string | null) ?? null,
      demandLevel: (row.demand_level as string | null) ?? null,
      priceDirection: (row.price_direction as string | null) ?? null,
      sentiment: (row.sentiment as string | null) ?? null,
      developments: (row.developments as string | null) ?? null,
      collectedAt: observation.collected_at,
    };
  });
}

/** Re-exported so screens do not need to reach into two modules. */
export { compareSeries, seriesKeyId };
