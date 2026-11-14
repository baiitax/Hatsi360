/**
 * Hatsi360 Markets — the period range chart.
 *
 * The one chart component that holds state: it tracks which period the pointer
 * or the keyboard is on, so the accessible description can name it. Everything
 * else about the chart system — the frame, the context line, the legend, the
 * toolbar, the empty, loading and error states — is in `./ChartFrame` and stays
 * a Server Component.
 *
 * The component is a range bar and it says so. A candlestick needs an open, a
 * high, a low and a close for the same period from the same series; this
 * platform aggregates a minimum, a maximum and a median over published
 * observations, which is a description of dispersion rather than of a trading
 * session. Drawing a candle from it would be inventing data.
 */

'use client';

import { useState } from 'react';
import { ChartEmptyState } from './ChartFrame';

/* ----------------------------------------------------------- range bars -- */

export interface RangeBarDatum {
  label: string;
  low: number;
  high: number;
  /** The median, when the platform computed one. Never a quoted price. */
  median?: number | null;
  observationCount: number;
}

/**
 * A period range bar — the honest stand-in for a candlestick.
 *
 * A candlestick needs an open, a high, a low and a close *for the same period
 * from the same series*. The platform aggregates a median, a minimum and a
 * maximum over published observations, which is a different object: it describes
 * dispersion, not a trading session. So this component draws a range bar and
 * labels itself as one, and `SERIES_KIND_LABELS.range` says so in the legend.
 *
 * The design brief permits a candlestick to be prototyped visually. This is
 * that prototype, and it refuses to wear the name.
 */
export function PeriodRangeChart({
  data,
  currency,
  unitLabel,
  height = '14rem',
}: {
  data: RangeBarDatum[];
  currency: string;
  unitLabel?: string | null;
  height?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <ChartEmptyState
        reason="No published observations in this period"
        suggestion="A range bar needs at least one published observation per period."
      />
    );
  }

  const values = data.flatMap((datum) => [datum.low, datum.high]);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;

  return (
    <figure className="m-0">
      <div className="relative" style={{ height }}>
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <span
            key={fraction}
            aria-hidden="true"
            className="absolute inset-x-0 h-px bg-terminal-border"
            style={{ bottom: `calc(${fraction * 100}% + 1.25rem)` }}
          />
        ))}

        <ul className="absolute inset-0 flex items-end gap-1.5">
          {data.map((datum) => {
            const lowPercent = ((datum.low - min) / span) * 100;
            const highPercent = ((datum.high - min) / span) * 100;
            const active = hovered === datum.label;
            return (
              <li
                key={datum.label}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHovered(datum.label)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(datum.label)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
              >
                <span className="sr-only">
                  {datum.label}: {formatValue(datum.low, currency)} to {formatValue(datum.high, currency)}
                  {datum.median !== null && datum.median !== undefined
                    ? `, median ${formatValue(datum.median, currency)}`
                    : ''}
                  {`, from ${datum.observationCount} observation${datum.observationCount === 1 ? '' : 's'}`}
                </span>
                <span
                  aria-hidden="true"
                  className={`relative w-full max-w-[2.5rem] rounded-sm transition-colors duration-150 ${
                    active ? 'bg-harvest-500/45' : 'bg-harvest-500/25'
                  }`}
                  style={{
                    height: `${Math.max(2, highPercent - lowPercent)}%`,
                    marginBottom: `${(lowPercent / 100) * (100 - 8)}%`,
                  }}
                >
                  {datum.median !== null && datum.median !== undefined ? (
                    <span
                      className="absolute inset-x-0 h-0.5 rounded-pill bg-harvest-300"
                      style={{
                        bottom: `${((datum.median - datum.low) / (datum.high - datum.low || 1)) * 100}%`,
                      }}
                    />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>

        <ul className="absolute inset-x-0 bottom-0 flex gap-1.5">
          {data.map((datum) => (
            <li
              key={datum.label}
              className="figure-num flex-1 truncate text-center text-[0.5625rem] text-terminal-text-muted"
            >
              {datum.label}
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="mt-2 text-[0.625rem] leading-4 text-terminal-text-muted">
        Each bar spans the lowest and highest published observation in the period; the line inside it
        is the median. This is dispersion, not a trading range.
        {unitLabel ? ` Figures are per ${unitLabel}.` : ''}
      </figcaption>
    </figure>
  );
}

/** Format a figure in the series' own currency, with no decimals. */
function formatValue(value: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
