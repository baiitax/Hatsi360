import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime, formatRelative, formatShortDate } from '@/lib/money';

/**
 * Dates are formatted in the market's timezone, not the machine's.
 *
 * These assertions look pedantic until the server renders in UTC and the
 * visitor's browser renders in Africa/Lagos: a record collected at 23:30 UTC is
 * "03 Jul" to one and "04 Jul" to the other, and React treats the difference as
 * a hydration failure and rebuilds the subtree. Pinning the zone is what makes
 * the two agree, so the pinned behaviour is asserted directly.
 *
 * The instant below sits on a midnight boundary for exactly this reason:
 * 2025-07-03T23:30Z is 00:30 on 4 July in Lagos.
 */
const MIDNIGHT_CROSSING = '2025-07-03T23:30:00Z';

describe('date formatting', () => {
  it('reads dates in the market timezone, not the machine timezone', () => {
    expect(formatDate(MIDNIGHT_CROSSING)).toBe('04 Jul 2025');
    expect(formatShortDate(MIDNIGHT_CROSSING)).toBe('04 Jul');
  });

  it('pins the time of day to the market timezone too', () => {
    expect(formatDateTime(MIDNIGHT_CROSSING)).toBe('04 Jul 2025, 00:30');
  });

  it('falls back rather than printing an invalid date', () => {
    expect(formatDate('not a date')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatShortDate(undefined)).toBe('—');
    expect(formatRelative('not a date')).toBe('unknown');
  });
});

describe('relative ages', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');

  it('counts up from the moment of collection', () => {
    expect(formatRelative('2026-11-26T11:59:40Z', now)).toBe('just now');
    expect(formatRelative('2026-11-26T11:45:00Z', now)).toBe('15m ago');
    expect(formatRelative('2026-11-26T09:00:00Z', now)).toBe('3h ago');
    expect(formatRelative('2026-11-23T12:00:00Z', now)).toBe('3d ago');
  });

  it('becomes a date once a week has passed', () => {
    expect(formatRelative('2025-07-14T09:00:00Z', now)).toBe('14 Jul');
  });

  it('accepts an explicit clock so a render can be reproducible', () => {
    const iso = '2026-11-26T10:00:00Z';
    expect(formatRelative(iso, now)).toBe(formatRelative(iso, now));
  });
});
