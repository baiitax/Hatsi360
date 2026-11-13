import type { PriceType, VerificationStatus } from '@/types/domain';
import { PRICE_TYPE_META } from '@/types/domain';

/**
 * Price freshness.
 *
 * Brief §6.2 lists seven price states and insists that a latest observation
 * is never simply labelled "live". This module implements them.
 *
 * Two thresholds, because freshness and verification are different questions:
 *
 *   freshWindow       — how current the data is for its own collection cadence.
 *   verifiedHorizon   — how long a *verified* observation stays the best
 *                       available answer once it is no longer current.
 *
 * The distinction matters. A price that is three weeks old is not "stale" if
 * it is the most recent verified observation for a weekly-collected market —
 * it is the best checked answer available, and calling it stale would tell a
 * trader to ignore data they should use with care.
 */

export type PriceState =
  | 'no_data'
  | 'stale'
  | 'delayed'
  | 'indicative'
  | 'latest_verified'
  | 'recently_updated'
  | 'live_feed';

export const PRICE_STATE_LABELS: Record<PriceState, string> = {
  no_data: 'No data',
  stale: 'Stale',
  delayed: 'Delayed',
  indicative: 'Indicative',
  latest_verified: 'Latest verified',
  recently_updated: 'Recently updated',
  live_feed: 'Live feed',
};

/**
 * What each state means, in the words the interface should use. A state label
 * alone is not an explanation; a trader needs to know what to do with it.
 */
export const PRICE_STATE_EXPLANATIONS: Record<PriceState, string> = {
  no_data: 'No verified observation is available for this selection.',
  stale: 'The newest observation is older than the platform considers usable. Treat any figure shown as historical, not current.',
  delayed: 'Data exists but is not current, and it has not been verified.',
  indicative: 'Non-binding or estimated market information. Not a confirmed transaction price.',
  latest_verified: 'Verified, but no longer current. This is the most recent checked price available.',
  recently_updated: 'Within the expected update window for this source.',
  live_feed: 'Connected to a genuine real-time source.',
};

/** How a state should be coloured. Restrained: only problems are loud. */
export const PRICE_STATE_TONES: Record<PriceState, 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  no_data: 'neutral',
  stale: 'danger',
  delayed: 'warning',
  indicative: 'warning',
  latest_verified: 'info',
  recently_updated: 'success',
  live_feed: 'success',
};

/**
 * Collection cadence, as the schema defines it.
 *
 * `public.collection_frequency` is ('daily','weekly','adhoc'). There is no
 * intraday cadence, which is why no intraday candle is ever offered.
 */
export type CollectionCadence = 'daily' | 'weekly' | 'adhoc';

export interface FreshnessThresholds {
  /** Minutes within which the data counts as current for this cadence. */
  freshWindowMinutes: number;
  /** Minutes after which a verified observation stops being the answer. */
  verifiedHorizonMinutes: number;
}

/**
 * Thresholds derived from the real collection cadence.
 *
 * A daily cadence gets a 36-hour window so a single missed day does not turn
 * yesterday's good price into "stale". Weekly gets 8 days. Ad hoc has no
 * promised cadence, so it gets a fortnight and a long horizon.
 */
export const CADENCE_THRESHOLDS: Record<CollectionCadence, FreshnessThresholds> = {
  daily: { freshWindowMinutes: 36 * 60, verifiedHorizonMinutes: 30 * 24 * 60 },
  weekly: { freshWindowMinutes: 8 * 24 * 60, verifiedHorizonMinutes: 90 * 24 * 60 },
  adhoc: { freshWindowMinutes: 14 * 24 * 60, verifiedHorizonMinutes: 180 * 24 * 60 },
};

/** Legacy imports carry no cadence at all; treat them as the loosest case. */
export const LEGACY_THRESHOLDS: FreshnessThresholds = {
  freshWindowMinutes: 30 * 24 * 60,
  verifiedHorizonMinutes: 730 * 24 * 60,
};

export interface FreshnessInput {
  /** When the price was actually observed, not when it was submitted. */
  collectedAt: string | null;
  /** 'minute' when the clock time is real; 'date' when only the day is known. */
  collectedAtPrecision?: 'minute' | 'date';
  verificationStatus?: VerificationStatus;
  priceType?: PriceType;
  cadence?: CollectionCadence;
  /** True only when a genuine realtime source is connected. Never assumed. */
  hasLiveFeed?: boolean;
  /** The moment to measure against. Injected so tests are deterministic. */
  now?: Date;
}

export interface FreshnessAssessment {
  state: PriceState;
  label: string;
  explanation: string;
  tone: FreshnessTone;
  /** Age in minutes, or null when there is no observation. */
  ageMinutes: number | null;
  /** True when the price is non-binding, independent of its age. */
  isIndicative: boolean;
  isVerified: boolean;
  /** True when only the calendar day is known, so the age is approximate. */
  isDayPrecisionOnly: boolean;
  thresholds: FreshnessThresholds;
}

type FreshnessTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const MINUTE = 60_000;

function isVerified(status: VerificationStatus | undefined): boolean {
  return status === 'verified';
}

/**
 * Classify one observation's freshness.
 *
 * The rules are applied in order and the first match wins, so the precedence
 * is explicit and testable:
 *
 *   1. no observation at all        -> no_data
 *   2. older than the horizon       -> stale
 *   3. non-binding price type       -> indicative
 *   4. past the fresh window        -> latest_verified (verified)
 *                                     delayed (not verified)
 *   5. within the fresh window      -> live_feed (realtime source)
 *                                     recently_updated
 *
 * Stale outranks indicative: an old indicative price must not be presented as
 * merely non-binding when it is also out of date.
 */
export function classifyFreshness(input: FreshnessInput): FreshnessAssessment {
  const now = input.now ?? new Date();
  const thresholds =
    input.cadence === undefined
      ? LEGACY_THRESHOLDS
      : CADENCE_THRESHOLDS[input.cadence] ?? LEGACY_THRESHOLDS;

  const priceType = input.priceType ?? 'unspecified';
  const isIndicative = priceType === 'indicative';
  const verified = isVerified(input.verificationStatus);
  const isDayPrecisionOnly = input.collectedAtPrecision === 'date';

  const base = {
    isIndicative,
    isVerified: verified,
    isDayPrecisionOnly,
    thresholds,
  };

  if (!input.collectedAt) {
    return {
      ...base,
      state: 'no_data',
      label: PRICE_STATE_LABELS.no_data,
      explanation: PRICE_STATE_EXPLANATIONS.no_data,
      tone: PRICE_STATE_TONES.no_data,
      ageMinutes: null,
    };
  }

  const observed = new Date(input.collectedAt);
  if (Number.isNaN(observed.getTime())) {
    // A timestamp that cannot be parsed is not data. It is an error.
    return {
      ...base,
      state: 'no_data',
      label: PRICE_STATE_LABELS.no_data,
      explanation:
        'The observation carries a timestamp that cannot be read, so its age is unknown.',
      tone: PRICE_STATE_TONES.no_data,
      ageMinutes: null,
    };
  }

  const ageMinutes = Math.max(0, Math.round((now.getTime() - observed.getTime()) / MINUTE));

  if (ageMinutes > thresholds.verifiedHorizonMinutes) {
    return {
      ...base,
      state: 'stale',
      label: PRICE_STATE_LABELS.stale,
      explanation: PRICE_STATE_EXPLANATIONS.stale,
      tone: PRICE_STATE_TONES.stale,
      ageMinutes,
    };
  }

  if (isIndicative) {
    return {
      ...base,
      state: 'indicative',
      label: PRICE_STATE_LABELS.indicative,
      explanation: PRICE_STATE_EXPLANATIONS.indicative,
      tone: PRICE_STATE_TONES.indicative,
      ageMinutes,
    };
  }

  if (ageMinutes > thresholds.freshWindowMinutes) {
    const state: PriceState = verified ? 'latest_verified' : 'delayed';
    return {
      ...base,
      state,
      label: PRICE_STATE_LABELS[state],
      explanation: PRICE_STATE_EXPLANATIONS[state],
      tone: PRICE_STATE_TONES[state],
      ageMinutes,
    };
  }

  const state: PriceState = input.hasLiveFeed ? 'live_feed' : 'recently_updated';
  return {
    ...base,
    state,
    label: PRICE_STATE_LABELS[state],
    explanation: PRICE_STATE_EXPLANATIONS[state],
    tone: PRICE_STATE_TONES[state],
    ageMinutes,
  };
}

/**
 * Format an age for display.
 *
 * Day-precision observations cannot honestly be described as "4 hours old" —
 * only the calendar day was recorded. The string says so.
 */
export function formatAge(assessment: FreshnessAssessment): string {
  if (assessment.ageMinutes === null) return 'no observation';
  const minutes = assessment.ageMinutes;
  if (assessment.isDayPrecisionOnly) {
    const days = Math.floor(minutes / (24 * 60));
    if (days <= 0) return 'today';
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Whether a price state is safe to present as current market information.
 *
 * Used by every consumer so the rule lives in one place. `latest_verified` is
 * deliberately included: it is the best checked answer available, and hiding
 * it would leave the screen empty rather than informative.
 */
export function isPresentableAsCurrent(state: PriceState): boolean {
  return state === 'live_feed' || state === 'recently_updated' || state === 'latest_verified';
}

/** Whether the state must be accompanied by a visible warning. */
export function requiresFreshnessWarning(state: PriceState): boolean {
  return state === 'stale' || state === 'delayed' || state === 'indicative';
}

/**
 * The label for a price type, including the comparability rule.
 *
 * `indicative` and `unspecified` are not comparable with anything, including
 * each other. The label carries that so a caller cannot forget it.
 */
export function describePriceType(type: PriceType): string {
  const meta = PRICE_TYPE_META[type];
  if (!meta) return type;
  return meta.isComparable ? meta.label : `${meta.label} (not comparable)`;
}
