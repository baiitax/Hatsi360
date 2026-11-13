'use client';

import { useId, useMemo, useState } from 'react';
import type { Candle, Gap } from '@/lib/trade/candles';

/**
 * Candlestick chart.
 *
 * Hand-rolled SVG rather than a charting library, for three reasons:
 *
 *   1. A candlestick is a very specific shape — a body and two wicks — and a
 *      generic chart library has to be bent into drawing it.
 *   2. Gaps must be visible. A library that interpolates a continuous x-axis
 *      would hide the missing periods this platform is required to show.
 *   3. It is a few kilobytes, which matters for a chart that renders on a
 *      public page.
 *
 * The honest features, all of which the brief requires:
 *
 *   - Periods with no observation are drawn as a visible break, not skipped.
 *   - A single-observation candle is drawn with a dashed body and is labelled,
 *     because open, high, low and close are then the same number.
 *   - The y-axis is not truncated, so a small movement is not exaggerated.
 *   - The tooltip states the observation count, never a "volume".
 */

export interface CandleChartProps {
  candles: Candle[];
  gaps: Gap[];
  currencySymbol?: string;
  unitLabel?: string | null;
  height?: number;
  /** Accessible description of what the chart shows. */
  caption: string;
}

const PADDING = { top: 16, right: 56, bottom: 28, left: 8 };

interface Scale {
  x: (index: number) => number;
  y: (value: number) => number;
  width: number;
  height: number;
  plotWidth: number;
  plotHeight: number;
  min: number;
  max: number;
}

function buildScale(
  candles: Candle[],
  width: number,
  height: number,
  gaps: Gap[],
): Scale {
  const plotWidth = Math.max(10, width - PADDING.left - PADDING.right);
  const plotHeight = Math.max(10, height - PADDING.top - PADDING.bottom);

  const values = candles.flatMap((c) => [c.high, c.low]);
  const rawMin = values.length ? Math.min(...values) : 0;
  const rawMax = values.length ? Math.max(...values) : 1;

  // Never truncate the axis. A zero-based or padded axis is the honest one.
  const span = rawMax - rawMin || Math.max(1, Math.abs(rawMax));
  const min = rawMin - span * 0.08;
  const max = rawMax + span * 0.08;

  // Gaps occupy a slot too, so a missing period is as wide as a real one.
  const slots = candles.length + gaps.length;

  const x = (index: number) =>
    PADDING.left + (slots <= 1 ? plotWidth / 2 : (index / (slots - 1)) * plotWidth);
  const y = (value: number) =>
    PADDING.top + plotHeight - ((value - min) / (max - min)) * plotHeight;

  return { x, y, width, height, plotWidth, plotHeight, min, max };
}

function formatValue(value: number, currencySymbol: string): string {
  const rounded = Math.abs(value) >= 1000 ? Math.round(value) : Math.round(value * 100) / 100;
  return `${currencySymbol}${rounded.toLocaleString('en-NG')}`;
}

function formatPeriod(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

export function CandleChart({
  candles,
  gaps,
  currencySymbol = '₦',
  unitLabel,
  height = 320,
  caption,
}: CandleChartProps) {
  const gradientId = useId();
  const [hovered, setHovered] = useState<number | null>(null);
  const [width, setWidth] = useState(720);

  // Measure the container so the chart is responsive without a library.
  const containerRef = (node: HTMLDivElement | null) => {
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured && measured > 0) setWidth(measured);
    });
    observer.observe(node);
  };

  const scale = useMemo(
    () => buildScale(candles, width, height, gaps),
    [candles, width, height, gaps],
  );

  if (candles.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-ink-200 bg-ink-50 p-8 text-center"
        style={{ minHeight: height }}
      >
        <p className="max-w-sm text-sm text-ink-600">
          No candle can be drawn for this selection. The chart is not rendered
          rather than drawn from data that does not exist.
        </p>
      </div>
    );
  }

  const slotWidth = scale.plotWidth / Math.max(1, candles.length + gaps.length);
  const bodyWidth = Math.max(2, Math.min(14, slotWidth * 0.6));

  // Interleave candles and gaps so a gap occupies its own slot on the axis.
  type Slot =
    | { kind: 'candle'; candle: Candle; index: number }
    | { kind: 'gap'; gap: Gap; index: number };

  const slots: Slot[] = [];
  let candleCursor = 0;
  let gapCursor = 0;
  const candleStarts = new Set(candles.map((c) => c.periodStart));
  const gapStarts = new Set(gaps.map((g) => g.periodStart));
  const allStarts = [...candleStarts, ...gapStarts].sort();

  for (const start of allStarts) {
    if (gapStarts.has(start) && gapCursor < gaps.length) {
      slots.push({ kind: 'gap', gap: gaps[gapCursor], index: slots.length });
      gapCursor += 1;
    } else if (candleCursor < candles.length) {
      slots.push({ kind: 'candle', candle: candles[candleCursor], index: slots.length });
      candleCursor += 1;
    }
  }

  // Gridlines: four horizontal, labelled on the right.
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map(
    (t) => scale.min + t * (scale.max - scale.min),
  );

  const active = hovered != null ? slots[hovered] : null;

  return (
    <div ref={containerRef} className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={caption}
        className="block touch-none select-none"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-700, #174D35)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--brand-700, #174D35)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid */}
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={scale.y(value)}
              y2={scale.y(value)}
              stroke="var(--border, #E3E9E2)"
              strokeWidth="1"
            />
            <text
              x={width - PADDING.right + 6}
              y={scale.y(value) + 3}
              fontSize="10"
              fill="var(--muted, #718078)"
              className="tabular-nums"
            >
              {formatValue(value, currencySymbol)}
            </text>
          </g>
        ))}

        {/* the series */}
        {slots.map((slot) => {
          const cx = scale.x(slot.index);

          if (slot.kind === 'gap') {
            // A missing period is drawn as a visible break.
            return (
              <g key={`gap-${slot.gap.periodStart}`}>
                <rect
                  x={cx - slotWidth / 2}
                  y={PADDING.top}
                  width={Math.max(2, slotWidth)}
                  height={scale.plotHeight}
                  fill="var(--ink-100, #EEF1EC)"
                  opacity="0.7"
                />
                <line
                  x1={cx}
                  x2={cx}
                  y1={PADDING.top}
                  y2={PADDING.top + scale.plotHeight}
                  stroke="var(--muted, #718078)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              </g>
            );
          }

          const { candle } = slot;
          const rising = candle.close >= candle.open;
          const colour = rising ? 'var(--success, #2F7D4F)' : 'var(--error, #B42318)';
          const bodyTop = scale.y(Math.max(candle.open, candle.close));
          const bodyBottom = scale.y(Math.min(candle.open, candle.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);

          return (
            <g
              key={candle.periodStart}
              onMouseEnter={() => setHovered(slot.index)}
              onFocus={() => setHovered(slot.index)}
              tabIndex={0}
              role="graphics-symbol"
              aria-label={`${formatPeriod(candle.periodStart)}: open ${formatValue(
                candle.open,
                currencySymbol,
              )}, high ${formatValue(candle.high, currencySymbol)}, low ${formatValue(
                candle.low,
                currencySymbol,
              )}, close ${formatValue(candle.close, currencySymbol)}, ${
                candle.observationCount
              } observation${candle.observationCount === 1 ? '' : 's'}`}
            >
              {/* a wider invisible hit area so the tooltip is easy to reach */}
              <rect
                x={cx - slotWidth / 2}
                y={PADDING.top}
                width={Math.max(6, slotWidth)}
                height={scale.plotHeight}
                fill="transparent"
              />
              {/* wick */}
              <line
                x1={cx}
                x2={cx}
                y1={scale.y(candle.high)}
                y2={scale.y(candle.low)}
                stroke={colour}
                strokeWidth="1.5"
              />
              {/* body. Dashed when a single observation produced it, so a
                  degenerate candle does not read as a settled range. */}
              <rect
                x={cx - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={candle.isDegenerate ? 'transparent' : colour}
                stroke={colour}
                strokeWidth={candle.isDegenerate ? '1.5' : '1'}
                strokeDasharray={candle.isDegenerate ? '2 2' : undefined}
                opacity={candle.isDegenerate ? 0.85 : 1}
              />
            </g>
          );
        })}

        {/* x axis */}
        <line
          x1={PADDING.left}
          x2={width - PADDING.right}
          y1={PADDING.top + scale.plotHeight}
          y2={PADDING.top + scale.plotHeight}
          stroke="var(--border, #E3E9E2)"
        />
        {slots
          .filter((_, i) => i % Math.ceil(slots.length / 6) === 0)
          .map((slot) => {
            const label =
              slot.kind === 'candle' ? slot.candle.periodStart : slot.gap.periodStart;
            return (
              <text
                key={`label-${label}`}
                x={scale.x(slot.index)}
                y={height - 8}
                fontSize="10"
                fill="var(--muted, #718078)"
                textAnchor="middle"
                className="tabular-nums"
              >
                {formatPeriod(label)}
              </text>
            );
          })}
      </svg>

      {/* tooltip / detail */}
      <div className="mt-2 min-h-[52px] rounded-lg border border-ink-100 bg-white px-3 py-2">
        {active && active.kind === 'candle' ? (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
            <span className="font-semibold text-ink-900">
              {formatPeriod(active.candle.periodStart)}
            </span>
            <span className="text-ink-600">
              Open <span className="tabular-nums">{formatValue(active.candle.open, currencySymbol)}</span>
            </span>
            <span className="text-ink-600">
              High <span className="tabular-nums">{formatValue(active.candle.high, currencySymbol)}</span>
            </span>
            <span className="text-ink-600">
              Low <span className="tabular-nums">{formatValue(active.candle.low, currencySymbol)}</span>
            </span>
            <span className="text-ink-600">
              Close <span className="tabular-nums">{formatValue(active.candle.close, currencySymbol)}</span>
            </span>
            <span className="text-ink-500">
              {active.candle.observationCount} observation
              {active.candle.observationCount === 1 ? '' : 's'}
              {active.candle.marketCount > 1
                ? ` from ${active.candle.marketCount} markets`
                : ''}
            </span>
            {active.candle.isDegenerate ? (
              <span className="font-semibold text-warning-700">
                Single observation — open, high, low and close are the same figure.
              </span>
            ) : null}
          </div>
        ) : active && active.kind === 'gap' ? (
          <p className="text-xs text-ink-600">
            <span className="font-semibold text-ink-900">
              {formatPeriod(active.gap.periodStart)}
            </span>{' '}
            — no observation was recorded
            {active.gap.consecutiveMissing > 1
              ? ` for ${active.gap.consecutiveMissing} consecutive periods`
              : ''}
            . The gap is shown rather than filled.
          </p>
        ) : (
          <p className="text-xs text-ink-500">
            Hover or focus a candle for its figures
            {unitLabel ? `, priced per ${unitLabel}` : ''}. Gaps are periods with
            no observation and are drawn as breaks.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Observation-count panel.
 *
 * Brief §7.4 forbids labelling observation counts as trading volume. This
 * panel exists precisely so the terminal can show activity honestly.
 */
export function ObservationCountPanel({
  candles,
  marketCoverage,
  sourceCoverage,
}: {
  candles: Candle[];
  marketCoverage: number;
  sourceCoverage: number;
}) {
  const total = candles.reduce((sum, c) => sum + c.observationCount, 0);
  const max = Math.max(1, ...candles.map((c) => c.observationCount));

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-3">
      <p className="text-xs font-semibold text-ink-800">
        Observations per period
      </p>
      <p className="mt-0.5 text-[11px] leading-snug text-ink-500">
        The number of prices recorded. This is not trading volume — agricultural
        physical markets do not report exchange volume.
      </p>
      <div className="mt-2 flex h-12 items-end gap-px" aria-hidden="true">
        {candles.map((candle) => (
          <div
            key={candle.periodStart}
            className="flex-1 rounded-sm bg-brand-700/25"
            style={{
              height: `${Math.max(2, (candle.observationCount / max) * 100)}%`,
            }}
            title={`${candle.observationCount} observation${
              candle.observationCount === 1 ? '' : 's'
            }`}
          />
        ))}
      </div>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-ink-500">Prices</dt>
          <dd className="text-sm font-bold tabular-nums text-ink-900">{total}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-ink-500">Markets</dt>
          <dd className="text-sm font-bold tabular-nums text-ink-900">{marketCoverage}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-ink-500">Sources</dt>
          <dd className="text-sm font-bold tabular-nums text-ink-900">{sourceCoverage}</dd>
        </div>
      </dl>
    </div>
  );
}
