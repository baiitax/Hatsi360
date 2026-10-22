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

/** Format a date for display, e.g. `14 Jul 2025`. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
    timeZone: 'Africa/Lagos',
  })}`;
}

/** ISO date (YYYY-MM-DD) in the Africa/Lagos timezone. */
export function isoDate(iso: string): string {
  return iso.slice(0, 10);
}
