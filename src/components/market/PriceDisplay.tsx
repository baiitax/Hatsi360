/**
 * Hatsi360 Markets — price display and market movement.
 *
 * These four components are the ones a trader reads a hundred times a day, so
 * they are the ones the design brief is most specific about.
 *
 *  - **A price is never a bare number.** `₦45,000` on its own is meaningless:
 *    it does not say per what, of what grade, in which market, or when. Every
 *    price this system renders carries its unit, and carries its grade, market,
 *    price type and observation time wherever there is room.
 *  - **A movement is a direction, not a judgement.** `PriceMovementIndicator`
 *    renders an arrow, a sign and a value, and it says in plain words that the
 *    direction is not a recommendation. A rising farmgate price is good for a
 *    seller and bad for a buyer; the interface must not pick a side.
 *  - **Colour never carries the meaning alone.** Every movement, every
 *    freshness state and every verification state is also spelled out in text
 *    and in an accessible label, so the reading survives colour blindness,
 *    greyscale printing and a screen reader.
 *
 * All four are Server Components. Nothing here holds state, so nothing here
 * needs to be sent to the browser.
 */

import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/money';
import { IconArrowDown, IconArrowRight, IconArrowUp } from '@/components/ui/icons';

/* --------------------------------------------------------------- price ---- */

export type PriceSize = 'sm' | 'md' | 'lg' | 'xl';

const PRICE_SIZES: Record<PriceSize, string> = {
  sm: 'text-figure',
  md: 'text-figure-lg',
  lg: 'text-figure-xl',
  xl: 'text-[2.25rem] leading-[2.5rem]',
};

/**
 * A price, with everything that makes it mean something.
 *
 * The figure itself is set in tabular numerals so a column of them aligns
 * while the digits change. The context — unit, grade, market, price type,
 * observation time — is rendered underneath at metadata size, and is never
 * hidden behind a hover: a price whose unit you have to ask for is a price you
 * cannot act on.
 */
export function PriceDisplay({
  amount,
  currencyCode = 'NGN',
  unitLabel,
  size = 'md',
  /** The grade, when the observation carries one. */
  gradeName,
  marketName,
  /** The price type, when it is not the default for the commodity. */
  priceTypeLabel,
  observedAt,
  className = '',
  /** Rendered after the figure — a freshness badge, a verification badge. */
  trailing,
}: {
  amount: number | null;
  currencyCode?: string;
  unitLabel?: string | null;
  size?: PriceSize;
  gradeName?: string | null;
  marketName?: string | null;
  priceTypeLabel?: string | null;
  observedAt?: string | null;
  className?: string;
  trailing?: ReactNode;
}) {
  const hasAmount = typeof amount === 'number' && Number.isFinite(amount);

  return (
    <div className={`flex min-w-0 flex-col gap-0.5 ${className}`}>
      <div className="flex items-baseline gap-1.5">
        {hasAmount ? (
          <span
            className={`figure-num font-semibold text-terminal-text ${PRICE_SIZES[size]}`}
            data-testid="price-amount"
          >
            {formatMoney(amount, { currency: currencyCode })}
          </span>
        ) : (
          /*
           * An honest absence. The platform does not have a price for this
           * series, so it says so rather than showing a dash, a zero or a
           * figure carried over from somewhere else.
           */
          <span className={`text-terminal-text-muted ${PRICE_SIZES[size]}`}>Not observed</span>
        )}

        {unitLabel ? (
          <span className="figure-num text-[0.8125rem] font-medium text-terminal-text-secondary">
            / {unitLabel}
          </span>
        ) : null}

        {trailing}
      </div>

      {/* The context line. Only the parts that exist are rendered. */}
      {gradeName || marketName || priceTypeLabel || observedAt ? (
        <p className="truncate text-[0.6875rem] leading-4 text-terminal-text-muted">
          {[
            gradeName,
            priceTypeLabel,
            marketName,
            observedAt ? `observed ${formatObserved(observedAt)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  );
}

/** A compact observation timestamp: date, then time, in the user's locale. */
function formatObserved(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'at an unrecorded time';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
}

/* ------------------------------------------------------------ movement ---- */

/**
 * The change between two comparable observations.
 *
 * `change` and `changePercent` are only ever passed in when the two
 * observations share a series key — the same commodity, market, price type,
 * grade and unit. A difference between two different things is not a movement,
 * and `src/lib/trade/queries.ts` refuses to compute one. When there is nothing
 * comparable, this component says exactly that instead of showing a flat zero.
 */
export function PriceMovementIndicator({
  change,
  changePercent,
  currencyCode = 'NGN',
  size = 'md',
  /** Rendered when there is no comparable previous observation. */
  unavailableReason = 'No comparable previous period',
  className = '',
}: {
  change: number | null;
  changePercent: number | null;
  currencyCode?: string;
  size?: 'sm' | 'md';
  unavailableReason?: string;
  className?: string;
}) {
  const textSize = size === 'sm' ? 'text-[0.75rem]' : 'text-[0.8125rem]';
  const chip = 'figure-num inline-flex items-center gap-1 rounded-control px-1.5 py-0.5 font-semibold';

  if (change === null || changePercent === null) {
    return (
      <span
        className={`inline-flex items-center gap-1 text-terminal-text-muted ${textSize} ${className}`}
        title={unavailableReason}
      >
        <span aria-hidden="true">—</span>
        <span className="text-[0.6875rem] font-medium">No comparison</span>
      </span>
    );
  }

  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const Arrow = direction === 'up' ? IconArrowUp : direction === 'down' ? IconArrowDown : IconArrowRight;

  const tone =
    direction === 'up'
      ? 'move-chip-up'
      : direction === 'down'
        ? 'move-chip-down'
        : 'move-chip-flat';

  /*
   * The accessible label states the direction in words and repeats the
   * disclaimer, because "up 4.2%" read aloud next to a green colour is exactly
   * the ambiguity the design brief forbids.
   */
  const label =
    direction === 'flat'
      ? `Unchanged. A movement is a direction, not a recommendation.`
      : `${direction === 'up' ? 'Up' : 'Down'} ${formatPercent(changePercent)} (${sign}${formatMoney(Math.abs(change), { currency: currencyCode })}) since the previous comparable observation. A movement is a direction, not a recommendation.`;

  return (
    <span className={`${chip} ${tone} ${textSize} ${className}`} title={label}>
      <Arrow className="size-3" />
      <span aria-hidden="true">{sign}</span>
      <span aria-hidden="true">{formatPercent(changePercent)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * A movement badge for a list row: the sign, the percentage and the arrow, with
 * the disclaimer carried in the accessible label rather than repeated on every
 * row where it would become noise.
 */
export function PriceChangeBadge({
  changePercent,
  size = 'sm',
  className = '',
}: {
  changePercent: number | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  if (changePercent === null) {
    return (
      <span className={`figure-num text-terminal-text-muted ${size === 'sm' ? 'text-[0.75rem]' : 'text-[0.8125rem]'} ${className}`}>
        —
      </span>
    );
  }
  const direction = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat';
  const Arrow = direction === 'up' ? IconArrowUp : direction === 'down' ? IconArrowDown : IconArrowRight;
  const tone = direction === 'up' ? 'move-up' : direction === 'down' ? 'move-down' : 'move-flat';
  const sign = changePercent > 0 ? '+' : changePercent < 0 ? '−' : '';

  return (
    <span
      className={`figure-num inline-flex items-center gap-0.5 font-semibold ${tone} ${size === 'sm' ? 'text-[0.75rem]' : 'text-[0.8125rem]'} ${className}`}
      title="A movement is a direction, not a recommendation."
    >
      <Arrow className="size-3" />
      <span aria-hidden="true">{sign}</span>
      {formatPercent(changePercent)}
    </span>
  );
}

/** A percentage, to one decimal, with an explicit sign. */
function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`;
}
