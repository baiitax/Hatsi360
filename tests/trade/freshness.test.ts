import { describe, expect, it } from 'vitest';
import {
  CADENCE_THRESHOLDS,
  classifyFreshness,
  formatAge,
  isPresentableAsCurrent,
  requiresFreshnessWarning,
  describePriceType,
} from '@/lib/trade/freshness';

/**
 * Price freshness.
 *
 * Brief §6.2 lists seven states and forbids labelling a latest observation as
 * live. Non-negotiable #19 requires data freshness to be visible. These tests
 * pin the precedence and the thresholds.
 */

const NOW = new Date('2026-10-22T12:00:00.000Z');

const minutesAgo = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000).toISOString();

describe('classifyFreshness', () => {
  it('reports no data when there is no observation', () => {
    const result = classifyFreshness({ collectedAt: null, now: NOW });
    expect(result.state).toBe('no_data');
    expect(result.ageMinutes).toBeNull();
    expect(isPresentableAsCurrent(result.state)).toBe(false);
  });

  it('reports no data when the timestamp cannot be parsed', () => {
    // An unreadable timestamp is an error, not a fresh price.
    const result = classifyFreshness({ collectedAt: 'not-a-date', now: NOW });
    expect(result.state).toBe('no_data');
    expect(result.explanation).toContain('cannot be read');
  });

  it('calls a price within the daily window recently updated', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(60),
      cadence: 'daily',
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(result.state).toBe('recently_updated');
    expect(result.ageMinutes).toBe(60);
  });

  it('never reports live feed without a realtime source', () => {
    // The brief forbids simulating real-time movement. hasLiveFeed is the only
    // path to this state and it is never set implicitly.
    const result = classifyFreshness({
      collectedAt: minutesAgo(5),
      cadence: 'daily',
      hasLiveFeed: false,
      now: NOW,
    });
    expect(result.state).toBe('recently_updated');
  });

  it('reports live feed only when a genuine realtime source is connected', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(5),
      cadence: 'daily',
      hasLiveFeed: true,
      now: NOW,
    });
    expect(result.state).toBe('live_feed');
  });

  it('keeps a verified price as the latest verified answer once it is no longer current', () => {
    // Three weeks old, daily cadence: past the 36-hour fresh window but inside
    // the 30-day horizon. This is the best checked answer available, so it is
    // not called stale.
    const result = classifyFreshness({
      collectedAt: minutesAgo(21 * 24 * 60),
      cadence: 'daily',
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(result.state).toBe('latest_verified');
    expect(result.isVerified).toBe(true);
    expect(isPresentableAsCurrent(result.state)).toBe(true);
  });

  it('calls an unverified, out-of-window price delayed', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(5 * 24 * 60),
      cadence: 'daily',
      verificationStatus: 'pending_verification',
      now: NOW,
    });
    expect(result.state).toBe('delayed');
    expect(requiresFreshnessWarning(result.state)).toBe(true);
  });

  it('calls anything past the verification horizon stale', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(60 * 24 * 60),
      cadence: 'daily',
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(result.state).toBe('stale');
    expect(isPresentableAsCurrent(result.state)).toBe(false);
    expect(requiresFreshnessWarning(result.state)).toBe(true);
  });

  it('labels an indicative price indicative even when it is fresh', () => {
    // Non-binding is the more important disclosure than current.
    const result = classifyFreshness({
      collectedAt: minutesAgo(10),
      cadence: 'daily',
      priceType: 'indicative',
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(result.state).toBe('indicative');
    expect(result.isIndicative).toBe(true);
    expect(result.explanation).toContain('Non-binding');
  });

  it('lets stale outrank indicative', () => {
    // An old indicative price must not be presented as merely non-binding.
    const result = classifyFreshness({
      collectedAt: minutesAgo(400 * 24 * 60),
      cadence: 'daily',
      priceType: 'indicative',
      now: NOW,
    });
    expect(result.state).toBe('stale');
    expect(result.isIndicative).toBe(true);
  });

  it('honours the weekly cadence', () => {
    // Six days old is inside the 8-day weekly window.
    const result = classifyFreshness({
      collectedAt: minutesAgo(6 * 24 * 60),
      cadence: 'weekly',
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(result.state).toBe('recently_updated');
  });

  it('honours the ad hoc cadence', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(20 * 24 * 60),
      cadence: 'adhoc',
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(result.state).toBe('latest_verified');
  });

  it('uses the loosest thresholds when no cadence is declared', () => {
    // A missing cadence must not be assumed to be daily. Sixty days old is
    // past the daily 30-day horizon (which would call it stale) but inside the
    // legacy 730-day horizon, so it stays the latest verified answer.
    const result = classifyFreshness({
      collectedAt: minutesAgo(60 * 24 * 60),
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(result.state).toBe('latest_verified');

    const asDaily = classifyFreshness({
      collectedAt: minutesAgo(60 * 24 * 60),
      cadence: 'daily',
      verificationStatus: 'verified',
      now: NOW,
    });
    expect(asDaily.state).toBe('stale');
  });

  it('marks day-precision observations so the age is not overstated', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(90),
      cadence: 'daily',
      collectedAtPrecision: 'date',
      now: NOW,
    });
    expect(result.isDayPrecisionOnly).toBe(true);
  });

  it('never reports a negative age for a future timestamp', () => {
    const result = classifyFreshness({
      collectedAt: new Date(NOW.getTime() + 60 * 60_000).toISOString(),
      cadence: 'daily',
      now: NOW,
    });
    expect(result.ageMinutes).toBe(0);
  });
});

describe('formatAge', () => {
  it('describes a day-precision age in whole days', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(3 * 24 * 60 + 120),
      cadence: 'daily',
      collectedAtPrecision: 'date',
      now: NOW,
    });
    expect(formatAge(result)).toBe('3 days ago');
  });

  it('describes a minute-precision age in hours', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(150),
      cadence: 'daily',
      collectedAtPrecision: 'minute',
      now: NOW,
    });
    expect(formatAge(result)).toBe('2 h ago');
  });

  it('says today rather than zero days', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(120),
      cadence: 'daily',
      collectedAtPrecision: 'date',
      now: NOW,
    });
    expect(formatAge(result)).toBe('today');
  });

  it('handles the singular', () => {
    const result = classifyFreshness({
      collectedAt: minutesAgo(25 * 60),
      cadence: 'daily',
      collectedAtPrecision: 'minute',
      now: NOW,
    });
    expect(formatAge(result)).toBe('1 day ago');
  });
});

describe('describePriceType', () => {
  it('marks a comparable price type plainly', () => {
    expect(describePriceType('farmgate')).toBe('Farmgate purchase price');
  });

  it('marks an indicative price type as not comparable', () => {
    expect(describePriceType('indicative')).toContain('not comparable');
  });

  it('marks an unspecified price type as not comparable', () => {
    expect(describePriceType('unspecified')).toContain('not comparable');
  });
});

describe('the freshness thresholds', () => {
  it('gives a daily cadence a window longer than one day', () => {
    // A single missed day must not turn a good price stale.
    expect(CADENCE_THRESHOLDS.daily.freshWindowMinutes).toBeGreaterThan(24 * 60);
  });

  it('keeps the verified horizon longer than the fresh window for every cadence', () => {
    for (const thresholds of Object.values(CADENCE_THRESHOLDS)) {
      expect(thresholds.verifiedHorizonMinutes).toBeGreaterThan(thresholds.freshWindowMinutes);
    }
  });
});
