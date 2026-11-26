/**
 * Money formatting.
 *
 * Authoritative amounts are stored as PostgreSQL `numeric`. These helpers only
 * ever format numbers for display — they never do arithmetic on stored values.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
  EUR: '€',
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code] ?? code;
}

/**
 * Format an amount for display, e.g. `₦40,550.00`.
 *
 * `compact` renders large values as `₦1.2M`, which is used only where the exact
 * figure is available elsewhere on the page.
 */
export function formatMoney(
  amount: number | null | undefined,
  options: { currency?: string; compact?: boolean; decimals?: number } = {},
): string {
  if (amount == null || Number.isNaN(amount)) return '—';

  const { currency = 'NGN', compact = false, decimals = 2 } = options;
  const symbol = currencySymbol(currency);

  if (compact && Math.abs(amount) >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (compact && Math.abs(amount) >= 10_000) {
    return `${symbol}${(amount / 1_000).toFixed(0)}k`;
  }

  return `${symbol}${amount.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format a plain number with thousands separators. */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * The timezone every date on this site is read in.
 *
 * This is not cosmetic. A server renders in UTC and a browser renders in the
 * visitor's own zone, so a record collected at 23:30 Lagos time is "03 Jul" on
 * the server and "04 Jul" on the client — React sees two different trees and
 * throws the whole rendered subtree away to recover. Pinning the zone to the
 * market's own makes the server and the browser agree, and it is also the only
 * zone in which the dates are true.
 */
export const SITE_TIME_ZONE = 'Africa/Lagos';

/** Format a date for display, e.g. `14 Jul 2025`. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: SITE_TIME_ZONE,
  });
}

/** Format a day without the year, e.g. `14 Jul`. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: SITE_TIME_ZONE,
  });
}

/**
 * How long ago a record was collected: `just now`, `12m ago`, `3h ago`,
 * `5d ago`, and then the short date once a week has passed.
 *
 * A relative label is a clock reading, so it is never exactly reproducible
 * between the server render and the hydration a moment later. Callers that
 * render it into hydrated markup should carry `suppressHydrationWarning` on the
 * text, which lets the server's reading stand instead of rebuilding the tree.
 * `now` is injectable so a test can pin the clock.
 */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';

  const minutes = Math.floor((now - d.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatShortDate(iso);
}

/** Format a date and time, e.g. `14 Jul 2025, 09:20`. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(iso)}, ${d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SITE_TIME_ZONE,
  })}`;
}

/** ISO date (YYYY-MM-DD) in the Africa/Lagos timezone. */
export function isoDate(iso: string): string {
  return iso.slice(0, 10);
}
