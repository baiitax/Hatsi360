/**
 * Hatsi360 Trade Intelligence — the analysis engine.
 *
 * Everything in this folder is pure logic with no database or network access,
 * so every rule the brief states as a non-negotiable can be tested directly.
 *
 * The four modules, in dependency order:
 *
 *   series.ts       — which prices may be compared at all.
 *   freshness.ts    — how current a price is, and what to call it.
 *   candles.ts      — OHLC aggregation that refuses to fabricate.
 *   opportunities.ts — best buy, best sell and spread, reframed honestly.
 *
 * Read `docs/HATSI360_TRADE_PHASE_0_AUDIT.md` for why the brief's headline
 * features are not built as described: there is no cost data and no sub-daily
 * collection in this platform, and commercial offers — which the schema does
 * hold, in `buyer_offers` and `seller_offers` — are private by default, so
 * they are never ranked or alerted on as if they were market facts.
 */

export {
  classifyFreshness,
  formatAge,
  isPresentableAsCurrent,
  requiresFreshnessWarning,
  describePriceType,
  PRICE_STATE_LABELS,
  PRICE_STATE_EXPLANATIONS,
  PRICE_STATE_TONES,
  CADENCE_THRESHOLDS,
  LEGACY_THRESHOLDS,
} from './freshness';
export type {
  PriceState,
  FreshnessInput,
  FreshnessAssessment,
  CollectionCadence,
  FreshnessThresholds,
} from './freshness';

export {
  compareSeries,
  areCompatible,
  seriesKeyId,
  validateSeries,
  partitionBySeries,
  convertSeriesKey,
  convertAmount,
  describeConversion,
} from './series';
export type {
  SeriesKey,
  ComparableDimension,
  CompatibilityReport,
  SeriesValidation,
  SeriesViolation,
  VerifiedConversion,
} from './series';

export {
  buildCandles,
  periodStart,
  nextPeriodStart,
  describeSeries,
  timeframeReadiness,
  SUPPORTED_TIMEFRAMES,
  UNSUPPORTED_TIMEFRAMES,
} from './candles';
export type {
  Timeframe,
  TimeframeMeta,
  Candle,
  CandleSeries,
  Gap,
  ObservationInput,
  BuildCandlesResult,
  SeriesProvenance,
} from './candles';

export {
  findOpportunity,
  findBestBuy,
  findBestSell,
  calculateSpread,
  groupBySeries,
  OPPORTUNITY_BASIS_LABELS,
  OPPORTUNITY_DISCLOSURE,
  COST_ASSESSMENT,
} from './opportunities';
export type {
  OpportunityBasis,
  OpportunityObservation,
  OpportunityCandidate,
  OpportunityResult,
  OpportunityOptions,
  SpreadResult,
  CostAssessment,
} from './opportunities';

/* ------------------------------------------------------------- queries -- */

/**
 * The database-backed trade queries.
 *
 * These are the only functions in this folder that touch the database, and they
 * live apart from the pure logic above so the rules can be tested without one.
 * Every public surface — the terminal header, the market watch, the movers, the
 * chart workspace — reads through them rather than writing its own query, so
 * the comparability rules are applied in exactly one place.
 */
export {
  getCommoditySeries,
  getCommodityOpportunities,
  getMarketMovements,
  getCommodityFreshness,
  getCommoditySeriesOptions,
  getFundamentalSignals,
} from './queries';
export type {
  CommoditySeriesRequest,
  CommoditySeriesResult,
  MarketComparisonResult,
  MovementRow,
  CommodityFreshness,
  SeriesOption,
  FundamentalSignal,
} from './queries';
