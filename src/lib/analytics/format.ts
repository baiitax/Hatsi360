/**
 * GonaPulse — analytics formatting helpers.
 *
 * Pure functions. No database, no React. These are the rules that keep a
 * dashboard honest:
 *
 *   * A percentage against a zero denominator is `null`, never `0` and never
 *     `Infinity`. "No data" is not "0%".
 *   * A comparison is only made when both periods have a meaningful value.
 *   * Date boundaries are computed in the operational timezone (Africa/Lagos)
 *     and handed to the database as UTC instants.
 */

import { OPERATIONAL_TIMEZONE } from './definitions';

export interface PeriodComparison {
  current: number | null;
  previous: number | null;
  /** Absolute difference. Null when either period is null. */
  change: number | null;
  /** Percentage difference. Null when the previous value is 0 or null. */
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat' | 'unknown';
}

/**
 * Compare a current period against the equivalent previous period.
 *
 * When the previous period was zero the percentage change is undefined, and
 * saying "100% increase" would be false: it could equally be 1 record or
 * 10,000. The absolute change is still reported.
 */
export function comparePeriods(
  current: number | null,
  previous: number | null,
): PeriodComparison {
  if (current === null || previous === null) {
    return { current, previous, change: null, changePercent: null, direction: 'unknown' };
  }

  const change = current - previous;

  if (previous === 0) {
    return {
      current,
      previous,
      change,
      changePercent: null,
      direction: change === 0 ? 'flat' : 'unknown',
    };
  }

  const changePercent = (change / previous) * 100;

  return {
    current,
    previous,
    change,
    changePercent: round(changePercent, 1),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  };
}

/** A percentage, or null when the denominator is zero. */
export function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return round((numerator / denominator) * 100, 1);
}

/** A safe division: null rather than NaN or Infinity. */
export function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  // The epsilon nudge avoids the classic binary floating point surprise where
  // 1.005 * 100 is 100.49999999999999 and rounds down to 1.
  return Math.round((value + Number.EPSILON * Math.sign(value || 1)) * factor) / factor;
}

/** A signed percentage for display, or an em dash when it is undefined. */
export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/* --------------------------------------------------------------- dates -- */

/** Today in the operational timezone, as `YYYY-MM-DD`. */
export function operationalToday(now: Date = new Date()): string {
  // Africa/Lagos is UTC+1 all year. Using Intl keeps the rule in one place
  // and does not depend on the server's own timezone.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OPERATIONAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The UTC instant of local midnight for an operational day. */
export function startOfOperationalDay(day: string): string {
  // Africa/Lagos is UTC+1 with no daylight saving, so local midnight is
  // 23:00 UTC on the previous calendar day.
  const [year, month, date] = day.split('-').map(Number);
  const utc = Date.UTC(year!, month! - 1, date!, 0, 0, 0) - 60 * 60 * 1000;
  return new Date(utc).toISOString();
}

/** The UTC instant of the end of an operational day. */
export function endOfOperationalDay(day: string): string {
  const start = new Date(startOfOperationalDay(day)).getTime();
  return new Date(start + 24 * 60 * 60 * 1000 - 1).toISOString();
}

/** Shift an operational day by a number of days. */
export function shiftOperationalDay(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const utc = Date.UTC(year!, month! - 1, date!) + days * 24 * 60 * 60 * 1000;
  const shifted = new Date(utc);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted);
}

/** The operational days in a range, oldest first. */
export function operationalDayRange(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;
  // Guard against a runaway loop if the inputs are nonsense.
  for (let i = 0; i < 400 && cursor <= to; i += 1) {
    days.push(cursor);
    cursor = shiftOperationalDay(cursor, 1);
  }
  return days;
}

/** The current time of day in the operational timezone, as `HH:MM:SS`. */
export function operationalTimeOfDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: OPERATIONAL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
}

/** The period windows for a dashboard: the last `days` days and the one before. */
export function periodWindows(days: number, now: Date = new Date()) {
  const today = operationalToday(now);
  const currentFrom = shiftOperationalDay(today, -(days - 1));
  const previousTo = shiftOperationalDay(currentFrom, -1);
  const previousFrom = shiftOperationalDay(previousTo, -(days - 1));
  return {
    today,
    currentFrom,
    currentTo: today,
    previousFrom,
    previousTo,
    days,
  };
}

/** A readable label for a period, e.g. "Last 7 days". */
export function periodLabel(days: number): string {
  if (days === 1) return 'Today';
  if (days === 7) return 'Last 7 days';
  if (days === 30) return 'Last 30 days';
  if (days === 90) return 'Last 90 days';
  return `Last ${days} days`;
}
