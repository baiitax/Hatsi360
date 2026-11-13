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
 * Read `docs/HATSI360_TRADE_PHASE_0_AUDIT.md` for why three of the brief's
 * headline features are not built: there are no commercial offers, no cost
 * data and no sub-daily collection in this platform.
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
