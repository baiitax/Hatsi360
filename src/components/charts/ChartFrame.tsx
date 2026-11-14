/**
 * Hatsi360 Markets — the chart presentation system.
 *
 * A chart in a market terminal is not a picture of a number; it is an argument,
 * and it has to be checkable. Every chart this platform draws therefore carries
 * its own context on its face: what commodity, which market, which grade,
 * which price type, which unit, which currency, and over what period. A chart
 * whose axes a reader has to guess at is a chart that cannot be audited.
 *
 * Three rules run through the whole system.
 *
 *  1. **The chart distinguishes what it is showing.** An observed price, a
 *     derived aggregation, an indicative range and a model-generated projection
 *     are four different epistemic objects and they never share a line style
 *     without a legend saying so. `ChartSeriesKind` is the vocabulary.
 *  2. **An empty chart says why.** `ChartEmptyState` is fed a reason, not a
 *     shrug: "two published observations are needed to draw a line" is a reason.
 *  3. **A candlestick is prototyped, never implied.** The visual component
 *     exists and is honest that the platform's aggregation is a median, not an
 *     OHLC, so it renders as a *range* bar and labels itself as one. It does
 *     not pretend to be a trading candle.
 *
 * These are presentation components. The data comes from `src/lib/trade/*`,
 * which is where every calculation lives and is tested.
 */

import type { ReactNode } from 'react';
import { IconArrowDown, IconArrowRight, IconArrowUp, IconInfo } from '../ui/icons';

/* ------------------------------------------------------------------- kinds */

/**
 * What a series *is*.
 *
 * This is the single most important distinction in the chart system. The trade
 * brief forbids presenting derived analysis as observed fact, and this enum is
 * how the interface keeps that promise at the pixel level.
 */
export type ChartSeriesKind = 'observed' | 'aggregated' | 'indicative' | 'projected' | 'range';

export const SERIES_KIND_LABELS: Record<ChartSeriesKind, string> = {
  observed: 'Observed price',
  aggregated: 'Derived aggregation',
  indicative: 'Indicative range',
  projected: 'Model-generated projection',
  range: 'Observed range',
};

export const SERIES_KIND_EXPLANATIONS: Record<ChartSeriesKind, string> = {
  observed:
    'A single price recorded by a field agent and verified before publication. Each point is one observation.',
  aggregated:
    'A statistic computed over several observations — a median, a minimum or a maximum. It is not itself a price that was quoted.',
  indicative:
    'A range within which observations fall. It is not a quoted price and it is not a bid or an offer.',
  projected:
    'A value produced by a model. It is not an observation, and it carries the method and the limitations of that model.',
  range:
    'The spread between the lowest and highest observation in a period. It shows dispersion, not a trading range.',
};

/* --------------------------------------------------------------- the frame */

/** The context a chart must declare before it can be read. */
export interface ChartContext {
  commodity: string;
  market?: string | null;
  grade?: string | null;
  priceType?: string | null;
  unit?: string | null;
  currency: string;
  period?: string | null;
}

/**
 * The chart container.
 *
 * A titled panel with a toolbar, a context line, a legend, the chart itself and
 * a source line. The context line is rendered by the container rather than by
 * each chart, so it can never be forgotten.
 */
export function ChartContainer({
  title,
  subtitle,
  context,
  toolbar,
  legend,
  source,
  children,
  footnote,
  className = '',
  height = '16rem',
}: {
  title: string;
  subtitle?: string;
  context: ChartContext;
  toolbar?: ReactNode;
  legend?: ReactNode;
  source?: string;
  children: ReactNode;
  footnote?: ReactNode;
  className?: string;
  height?: string;
}) {
  return (
    <section className={`terminal-panel flex flex-col ${className}`} aria-labelledby="chart-title">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-terminal-border px-3.5 py-2.5">
        <div className="min-w-0">
          <h3 id="chart-title" className="font-display text-[0.875rem] font-bold text-terminal-text">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-[0.6875rem] leading-4 text-terminal-text-secondary">{subtitle}</p>
          ) : null}
        </div>
        {toolbar ? <div className="flex shrink-0 items-center gap-1.5">{toolbar}</div> : null}
      </header>

      <dl className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-terminal-border px-3.5 py-2">
        <ContextItem label="Commodity" value={context.commodity} />
        {context.market ? <ContextItem label="Market" value={context.market} /> : null}
        {context.grade ? <ContextItem label="Grade" value={context.grade} /> : null}
        {context.priceType ? <ContextItem label="Price type" value={context.priceType} /> : null}
        {context.unit ? <ContextItem label="Unit" value={context.unit} /> : null}
        <ContextItem label="Currency" value={context.currency} />
        {context.period ? <ContextItem label="Period" value={context.period} /> : null}
      </dl>

      {legend ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3.5 pt-2.5">{legend}</div>
      ) : null}

      <div className="min-w-0 flex-1 px-2 pb-2 pt-1" style={{ minHeight: height }}>
        {children}
      </div>

      {source || footnote ? (
        <footer className="border-t border-terminal-border px-3.5 py-2">
          {source ? (
            <p className="text-[0.625rem] leading-4 text-terminal-text-muted">{source}</p>
          ) : null}
          {footnote ? (
            <p className="mt-1 text-[0.625rem] leading-4 text-terminal-text-muted">{footnote}</p>
          ) : null}
        </footer>
      ) : null}
    </section>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="figure-label">{label}</dt>
      <dd className="text-[0.6875rem] font-medium text-terminal-text-secondary">{value}</dd>
    </div>
  );
}

/* --------------------------------------------------------------- toolbar -- */

export interface ChartOption {
  id: string;
  label: string;
  short?: string;
}

/**
 * A segmented control for the chart's period or type.
 *
 * It is a `radiogroup` rather than a `tablist`, because the choices configure
 * one chart rather than switching between panels — and getting that wrong is
 * what makes a screen reader announce the wrong thing.
 */
export function ChartSegment({
  label,
  options,
  selected,
  onSelect,
  className = '',
}: {
  label: string;
  options: ChartOption[];
  selected: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex items-center gap-0.5 rounded-control border border-terminal-border bg-terminal-surface p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.id === selected;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(option.id)}
            className={`figure-num h-[1.5rem] rounded-[0.1875rem] px-1.5 text-[0.6875rem] font-semibold transition-colors duration-150 ${
              active
                ? 'bg-terminal-interactive text-terminal-text'
                : 'text-terminal-text-muted hover:text-terminal-text'
            }`}
          >
            {option.short ?? option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- legend -- */

/** A legend entry, declaring what kind of series it is. */
export function ChartLegendEntry({
  label,
  swatch = 'line',
}: {
  label: string;
  swatch?: 'line' | 'area' | 'band' | 'bar';
}) {
  const swatchClass =
    swatch === 'area'
      ? 'h-2.5 w-3.5 rounded-sm bg-current opacity-30'
      : swatch === 'band'
        ? 'h-2.5 w-3.5 rounded-sm bg-current opacity-20 ring-1 ring-current'
        : swatch === 'bar'
          ? 'h-3 w-1.5 rounded-sm bg-current'
          : 'h-0.5 w-3.5 rounded-pill bg-current';

  return (
    <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-terminal-text-secondary">
      <span aria-hidden="true" className={`inline-block ${swatchClass} text-harvest-500`} />
      <span className="font-medium text-terminal-text">{label}</span>
    </span>
  );
}

/** A legend that also explains each kind, for a methodology-minded reader. */
export function ChartLegend({ kinds }: { kinds: ChartSeriesKind[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {kinds.map((kind) => (
        <li key={kind} className="group/kind relative inline-flex items-center gap-1.5 text-[0.625rem] text-terminal-text-muted">
          <span aria-hidden="true" className="inline-block h-0.5 w-3.5 rounded-pill bg-harvest-500" />
          <button
            type="button"
            className="underline decoration-dotted decoration-1 underline-offset-2"
            aria-describedby={`kind-${kind}`}
          >
            {SERIES_KIND_LABELS[kind]}
          </button>
          <span
            role="tooltip"
            id={`kind-${kind}`}
            className="pointer-events-none absolute bottom-full left-1/2 z-[var(--z-tooltip)] mb-1.5 w-max max-w-[15rem] -translate-x-1/2 rounded-control border border-terminal-border bg-terminal-elevated px-2 py-1 text-[0.625rem] leading-4 text-terminal-text opacity-0 shadow-terminal transition-opacity duration-150 group-hover/kind:opacity-100 group-focus-within/kind:opacity-100"
          >
            {SERIES_KIND_EXPLANATIONS[kind]}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------- chart states -- */

/**
 * The empty state of a chart.
 *
 * It states the reason inside the chart's own frame, so the panel does not
 * collapse to nothing and the reader can see exactly what is missing.
 */
export function ChartEmptyState({
  reason,
  suggestion,
  action,
}: {
  reason: string;
  suggestion?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 px-4 text-center">
      <span aria-hidden="true" className="text-terminal-text-muted">
        <IconInfo className="size-5" />
      </span>
      <p className="max-w-sm text-[0.8125rem] font-semibold text-terminal-text">{reason}</p>
      {suggestion ? (
        <p className="max-w-sm text-[0.6875rem] leading-4 text-terminal-text-secondary">{suggestion}</p>
      ) : null}
      {action ? (
        <a href={action.href} className="terminal-action mt-1">
          {action.label}
        </a>
      ) : null}
    </div>
  );
}

/** The loading state of a chart: the axes and a single line, nothing more. */
export function ChartLoadingState({ height = '16rem' }: { height?: string }) {
  return (
    <div className="relative" style={{ height }} aria-hidden="true">
      <span className="absolute inset-x-0 top-0 h-px bg-terminal-border" />
      <span className="absolute inset-x-0 top-1/3 h-px bg-terminal-border" />
      <span className="absolute inset-x-0 top-2/3 h-px bg-terminal-border" />
      <span className="absolute inset-x-0 bottom-6 h-px bg-terminal-border" />
      <span className="skeleton absolute bottom-6 left-0 top-4 h-0.5 w-[68%] rounded-pill" />
    </div>
  );
}

/**
 * The error state of a chart.
 *
 * A chart that fails to render is not a reason to hide the numbers, so this
 * state always accompanies a table.
 */
export function ChartErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 text-center">
      <span aria-hidden="true" className="text-move-down">
        <IconArrowRight className="size-5" />
      </span>
      <p className="text-[0.8125rem] font-semibold text-terminal-text">This chart could not be drawn</p>
      <p className="max-w-sm text-[0.6875rem] leading-4 text-terminal-text-secondary">
        The series is present. The figures are listed in the table below.
      </p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="terminal-control mt-1">
          Try again
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- movement */

/**
 * A one-number movement read-out for a chart header: the latest value, the
 * change, and the direction as an arrow *and* a word.
 */
export function ChartMetricSummary({
  latest,
  previous,
  currency,
  unitLabel,
  observationCount,
  className = '',
}: {
  latest: number | null;
  previous: number | null;
  currency: string;
  unitLabel?: string | null;
  observationCount: number;
  className?: string;
}) {
  if (latest === null) {
    return (
      <p className={`figure-num text-[0.75rem] text-terminal-text-muted ${className}`}>
        No published observation
      </p>
    );
  }

  const change = previous === null ? null : latest - previous;
  const direction = change === null ? null : change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const Arrow = direction === 'up' ? IconArrowUp : direction === 'down' ? IconArrowDown : IconArrowRight;

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="figure-num text-figure-lg font-bold text-terminal-text">
        {formatValue(latest, currency)}
      </span>
      {unitLabel ? <span className="text-[0.75rem] text-terminal-text-secondary">/ {unitLabel}</span> : null}
      {direction ? (
        <span
          className={`figure-num inline-flex items-center gap-0.5 text-[0.75rem] font-semibold ${
            direction === 'up' ? 'move-up' : direction === 'down' ? 'move-down' : 'move-flat'
          }`}
        >
          <Arrow className="size-3" aria-hidden="true" />
          {formatValue(Math.abs(change as number), currency)}
        </span>
      ) : null}
      <span className="figure-num text-[0.625rem] text-terminal-text-muted">{observationCount} obs.</span>
    </div>
  );
}

function formatValue(value: number, currency: string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}


/* ------------------------------------------------------------- re-exports -- */

/**
 * The interactive chart — the period range bar, which tracks a hovered period —
 * lives in `./PeriodRangeChart` and is marked `'use client'`. It is re-exported
 * here so the chart system has one import surface, while the presentational
 * half of this file stays a Server Component and ships nothing to the browser.
 *
 * A chart is read far more often than it is hovered, so the frame, the legend,
 * the context line and the states must not be paid for by the hover.
 */
export { PeriodRangeChart, type RangeBarDatum } from './PeriodRangeChart';
