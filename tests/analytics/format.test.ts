import { describe, expect, it } from 'vitest';
import {
  comparePeriods,
  endOfOperationalDay,
  formatPercent,
  operationalDayRange,
  operationalTimeOfDay,
  operationalToday,
  percentage,
  periodLabel,
  periodWindows,
  ratio,
  round,
  shiftOperationalDay,
  startOfOperationalDay,
} from '@/lib/analytics/format';

/**
 * The formatting rules are what keep the console honest.
 *
 * Every one of these tests pins a behaviour that, if it changed, would make
 * the interface say something untrue: a zero denominator must not become a
 * percentage, an unknown comparison must not become "0%", and the operating
 * day must be the Lagos day whatever the server's own timezone is.
 */

describe('comparePeriods', () => {
  it('reports the percentage change when both periods have a value', () => {
    const result = comparePeriods(120, 100);
    expect(result.change).toBe(20);
    expect(result.changePercent).toBe(20);
    expect(result.direction).toBe('up');
  });

  it('does not divide by a zero denominator', () => {
    const result = comparePeriods(10, 0);
    expect(result.change).toBe(10);
    expect(result.changePercent).toBeNull();
    expect(result.direction).toBe('unknown');
  });

  it('treats a missing value as unknown, not as zero', () => {
    const result = comparePeriods(null, 100);
    expect(result.change).toBeNull();
    expect(result.changePercent).toBeNull();
    expect(result.direction).toBe('unknown');
  });

  it('reports a flat period as flat', () => {
    const result = comparePeriods(50, 50);
    expect(result.change).toBe(0);
    expect(result.changePercent).toBe(0);
    expect(result.direction).toBe('flat');
  });

  it('reports a decline as down', () => {
    const result = comparePeriods(80, 100);
    expect(result.changePercent).toBe(-20);
    expect(result.direction).toBe('down');
  });
});

describe('percentage and ratio', () => {
  it('returns null for a zero denominator', () => {
    expect(percentage(0, 0)).toBeNull();
    expect(percentage(5, 0)).toBeNull();
  });

  it('returns null for a zero ratio denominator', () => {
    expect(ratio(5, 0)).toBeNull();
  });

  it('computes a percentage to one decimal place', () => {
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(2, 4)).toBe(50);
  });
});

describe('round', () => {
  it('rounds to the requested precision', () => {
    expect(round(1.005, 2)).toBe(1.01);
    expect(round(1.2345, 1)).toBe(1.2);
    expect(round(10, 2)).toBe(10);
  });
});

describe('formatPercent', () => {
  it('shows an em dash for an undefined percentage', () => {
    expect(formatPercent(null)).toBe('—');
  });

  it('signs a positive percentage', () => {
    expect(formatPercent(12.34)).toBe('+12.3%');
  });

  it('keeps a negative percentage negative', () => {
    expect(formatPercent(-4)).toBe('-4.0%');
  });
});

describe('the operational day', () => {
  it('is the Lagos day, whatever the server timezone is', () => {
    // 23:30 UTC on 21 October is already 00:30 on 22 October in Lagos.
    expect(operationalToday(new Date('2026-10-21T23:30:00Z'))).toBe('2026-10-22');
  });

  it('is still the previous day in Lagos before midnight local time', () => {
    // 22:00 UTC on 21 October is 23:00 on 21 October in Lagos.
    expect(operationalToday(new Date('2026-10-21T22:00:00Z'))).toBe('2026-10-21');
  });

  it('starts the Lagos day at 23:00 UTC the previous day', () => {
    expect(startOfOperationalDay('2026-10-22')).toBe('2026-10-21T23:00:00.000Z');
  });

  it('ends the Lagos day at 22:59:59 UTC', () => {
    expect(endOfOperationalDay('2026-10-22')).toBe('2026-10-22T22:59:59.999Z');
  });

  it('shifts across a month boundary', () => {
    expect(shiftOperationalDay('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('shifts across a year boundary', () => {
    expect(shiftOperationalDay('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('reports the local time of day', () => {
    expect(operationalTimeOfDay(new Date('2026-10-21T23:30:00Z'))).toBe('00:30:00');
  });

  it('lists the operational days in a range', () => {
    const days = operationalDayRange('2026-10-20', '2026-10-22');
    expect(days).toEqual(['2026-10-20', '2026-10-21', '2026-10-22']);
  });

  it('does not loop forever on a nonsensical range', () => {
    expect(operationalDayRange('2026-10-22', '2020-01-01')).toHaveLength(0);
  });
});

describe('periodWindows', () => {
  it('produces a current window and the equivalent window before it', () => {
    const windows = periodWindows(7, new Date('2026-10-22T12:00:00Z'));
    expect(windows.currentFrom).toBe('2026-10-16');
    expect(windows.currentTo).toBe('2026-10-22');
    expect(windows.previousFrom).toBe('2026-10-09');
    expect(windows.previousTo).toBe('2026-10-15');
  });

  it('labels the period', () => {
    expect(periodLabel(1)).toBe('Today');
    expect(periodLabel(7)).toBe('Last 7 days');
    expect(periodLabel(30)).toBe('Last 30 days');
    expect(periodLabel(45)).toBe('Last 45 days');
  });
});
