/**
 * Hatsi360 Markets — market overview, movers, coverage and freshness.
 *
 * The cards that answer "what is happening in the market right now".
 *
 * Every one of them obeys the same rule: **a card that has no data says so.**
 * The design brief is explicit that a visually complete but misleading
 * terminal is unacceptable, so `MarketOverviewCard` takes a `value` that may
 * be `null` and renders an honest unavailable state rather than a zero, and
 * `MarketCoverageSummary` counts only what the database actually holds.
 *
 * Nothing here computes a figure the platform does not have. There are no
 * sample prices, no invented coverage counts and no decorative percentages.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/money';
import { IconArrowDown, IconArrowRight, IconArrowUp, IconClock, IconMinus, IconSource } from '@/components/ui/icons';
import { PriceChangeBadge } from './PriceDisplay';

/* --------------------------------------------------------- overview card -- */

export type OverviewTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'unavailable';

/**
 * The market overview card — the KPI of the terminal.
 *
 * A label, a value, and the context that makes the value defensible: what it
 * counts, over what period, and how fresh it is. When the platform has no
 * figure, the card says so in the value slot rather than showing a zero, and
 * explains what would fill it.
 */
export function MarketOverviewCard({
  label,
  value,
  detail,
  changePercent,
  tone = 'neutral',
  href,
  source,
  freshness,
  unavailableReason,
  className = '',
}: {
  label: string;
  /** `null` means the platform has no figure. It renders as unavailable. */
  value: ReactNode;
  detail?: string;
  /** Only supplied when the change is between two comparable observations. */
  changePercent?: number | null;
  tone?: OverviewTone;
  href?: string;
  /** Where the number came from. Always stated. */
  source?: string;
  freshness?: string;
  /** Why the value is unavailable, when it is. */
  unavailableReason?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="figure-label">{label}</p>
        {typeof changePercent === 'number' ? (
          <PriceChangeBadge changePercent={changePercent} />
        ) : null}
      </div>

      {tone === 'unavailable' ? (
        <>
          <p className="mt-1.5 text-[0.9375rem] font-semibold text-terminal-text-muted">
            Not available
          </p>
          {unavailableReason ? (
            <p className="mt-1 text-[0.6875rem] leading-4 text-terminal-text-muted">
              {unavailableReason}
            </p>
          ) : null}
        </>
      ) : (
        <p className="figure-num mt-1.5 text-figure-xl font-bold leading-8 text-terminal-text">
          {value}
        </p>
      )}

      {detail ? (
        <p className="mt-1 text-[0.6875rem] leading-4 text-terminal-text-secondary">{detail}</p>
      ) : null}

      {source || freshness ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-terminal-border pt-2 text-[0.625rem] leading-4 text-terminal-text-muted">
          {source ? (
            <span className="inline-flex items-center gap-1">
              <IconSource className="size-3" />
              {source}
            </span>
          ) : null}
          {freshness ? (
            <span className="inline-flex items-center gap-1">
              <IconClock className="size-3" />
              {freshness}
            </span>
          ) : null}
        </p>
      ) : null}
    </>
  );

  const shell = `terminal-panel flex flex-col p-3.5 ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${shell} transition-colors hover:border-harvest-500/45`}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

/* --------------------------------------------------------------- movers --- */

export interface MoverRow {
  id: string;
  commodityName: string;
  commoditySlug: string;
  amount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  changePercent: number | null;
  marketName: string | null;
  observedAt: string | null;
}

/**
 * The gainers and decliners list.
 *
 * Ordered by the magnitude of the movement, and it says which direction it is
 * listing. A mover list is the one place a terminal could most easily imply a
 * recommendation, so the heading names the direction and the footer repeats
 * that a movement is a direction, not advice.
 */
export function MarketMovers({
  direction,
  rows,
  limit = 6,
  emptyReason,
}: {
  direction: 'gainers' | 'decliners';
  rows: MoverRow[];
  limit?: number;
  emptyReason: string;
}) {
  const ordered = [...rows]
    .filter((row) => typeof row.changePercent === 'number')
    .sort((a, b) =>
      direction === 'gainers'
        ? (b.changePercent ?? 0) - (a.changePercent ?? 0)
        : (a.changePercent ?? 0) - (b.changePercent ?? 0),
    )
    .slice(0, limit);

  return (
    <section className="terminal-panel flex flex-col" aria-labelledby={`movers-${direction}`}>
      <header className="flex items-center justify-between gap-2 border-b border-terminal-border px-3.5 py-2.5">
        <h3 id={`movers-${direction}`} className="font-display text-[0.8125rem] font-bold text-terminal-text">
          {direction === 'gainers' ? 'Price gainers' : 'Price decliners'}
        </h3>
        <span className="figure-label">
          {direction === 'gainers' ? 'Largest rises' : 'Largest falls'}
        </span>
      </header>

      {ordered.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-[0.75rem] leading-4 text-terminal-text-muted">
          {emptyReason}
        </p>
      ) : (
        <ol className="divide-y divide-terminal-border">
          {ordered.map((row) => (
            <li key={row.id}>
              <Link
                href={`/commodities/${row.commoditySlug}`}
                className="flex items-center gap-3 px-3.5 py-2 transition-colors hover:bg-terminal-interactive/50"
              >
                <span
                  aria-hidden="true"
                  className={
                    direction === 'gainers'
                      ? 'text-move-up'
                      : 'text-move-down'
                  }
                >
                  {direction === 'gainers' ? (
                    <IconArrowUp className="size-3.5" />
                  ) : (
                    <IconArrowDown className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-terminal-text">
                    {row.commodityName}
                  </span>
                  <span className="block truncate text-[0.625rem] text-terminal-text-muted">
                    {row.marketName ?? 'Market not recorded'} ·{' '}
                    {row.amount !== null
                      ? `${formatMoney(row.amount, { currency: row.currencyCode })}${row.unitLabel ? ` / ${row.unitLabel}` : ''}`
                      : 'not observed'}
                  </span>
                </span>
                <PriceChangeBadge changePercent={row.changePercent} />
              </Link>
            </li>
          ))}
        </ol>
      )}

      <footer className="border-t border-terminal-border px-3.5 py-2 text-[0.625rem] leading-4 text-terminal-text-muted">
        Movement between two comparable observations. A direction, not a
        recommendation.
      </footer>
    </section>
  );
}

/* ------------------------------------------------------------ coverage --- */

export interface CoverageRow {
  label: string;
  detail: string;
  count: number;
  href?: string;
}

/**
 * The market coverage summary.
 *
 * The counts are the counts the database holds. When a count is zero the panel
 * says the category is empty rather than omitting the row, because an absent
 * row reads as "nothing to see here" while a zero row reads as "we have not
 * collected this yet" — and only the second one is true.
 */
export function MarketCoverageSummary({
  rows,
  title = 'Market coverage',
}: {
  rows: CoverageRow[];
  title?: string;
}) {
  return (
    <section className="terminal-panel" aria-labelledby="coverage-summary">
      <header className="border-b border-terminal-border px-3.5 py-2.5">
        <h3 id="coverage-summary" className="font-display text-[0.8125rem] font-bold text-terminal-text">
          {title}
        </h3>
      </header>
      <dl className="divide-y divide-terminal-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 px-3.5 py-2">
            <dt className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-medium text-terminal-text">
                {row.href ? (
                  <Link href={row.href} className="underline decoration-terminal-border underline-offset-2 hover:text-harvest-300">
                    {row.label}
                  </Link>
                ) : (
                  row.label
                )}
              </span>
              <span className="block truncate text-[0.625rem] text-terminal-text-muted">
                {row.detail}
              </span>
            </dt>
            <dd
              className={`figure-num shrink-0 text-figure font-bold ${
                row.count === 0 ? 'text-terminal-text-muted' : 'text-terminal-text'
              }`}
            >
              {row.count}
              <span className="sr-only">
                {row.count === 1 ? ' record' : ' records'}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------ freshness --- */

export type FreshnessState = 'fresh' | 'today' | 'delayed' | 'stale' | 'unavailable';

const FRESHNESS_COPY: Record<FreshnessState, { label: string; explanation: string }> = {
  fresh: {
    label: 'Recently observed',
    explanation: 'The most recent observation is inside the configured freshness window.',
  },
  today: {
    label: 'Updated today',
    explanation: 'An observation was recorded today.',
  },
  delayed: {
    label: 'Delayed',
    explanation:
      'The most recent observation is older than the configured window but not yet stale.',
  },
  stale: {
    label: 'Stale',
    explanation:
      'The most recent observation is older than the freshness window configured for the commodity. Treat it as an indication, not a current price.',
  },
  unavailable: {
    label: 'No observation',
    explanation: 'The platform holds no observation for this series.',
  },
};

/**
 * A data freshness indicator.
 *
 * The label is the state in words, the colour is a reinforcement, and the
 * timestamp is the actual collection time. A freshly *loaded page* is never
 * presented as freshly *collected data* — the two are different facts, and
 * conflating them is the single most common way a price platform misleads.
 */
export function DataFreshnessIndicator({
  state,
  observedAt,
  className = '',
}: {
  state: FreshnessState;
  observedAt: string | null;
  className?: string;
}) {
  const copy = FRESHNESS_COPY[state];
  const tone =
    state === 'fresh' || state === 'today'
      ? 'border-success-700/40 bg-success-700/15 text-success-700'
      : state === 'delayed'
        ? 'border-warning-700/40 bg-warning-700/15 text-warning-700'
        : state === 'stale'
          ? 'border-warning-700/45 bg-warning-700/20 text-warning-700'
          : 'border-terminal-border bg-terminal-elevated text-terminal-text-muted';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[0.6875rem] font-semibold leading-4 ${tone} ${className}`}
      title={copy.explanation}
    >
      <IconClock className="size-3" aria-hidden="true" />
      {copy.label}
      {observedAt ? (
        <span className="figure-num font-normal opacity-80">{formatObserved(observedAt)}</span>
      ) : null}
    </span>
  );
}

/** The explanation behind a freshness state, for a methodology panel. */
export function FreshnessExplanation({ state }: { state: FreshnessState }) {
  return <>{FRESHNESS_COPY[state].explanation}</>;
}

/* ------------------------------------------------------- price summary ---- */

/**
 * A one-line summary of a price series: latest, previous, and how many
 * observations the figure rests on.
 *
 * The observation count is always shown. A single observation presented as a
 * "price" is a fact about one market on one day, and the reader deserves to
 * know that.
 */
export function PriceHistorySummary({
  latestAmount,
  previousAmount,
  currencyCode,
  unitLabel,
  observationCount,
  firstObservedAt,
  lastObservedAt,
  className = '',
}: {
  latestAmount: number | null;
  previousAmount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  observationCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  className?: string;
}) {
  const Arrow =
    latestAmount !== null && previousAmount !== null && latestAmount > previousAmount
      ? IconArrowUp
      : latestAmount !== null && previousAmount !== null && latestAmount < previousAmount
        ? IconArrowDown
        : latestAmount !== null && previousAmount !== null
          ? IconMinus
          : IconArrowRight;

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      <span className="flex items-baseline gap-1.5">
        <span className="figure-label">Latest</span>
        <span className="figure-num text-figure-lg font-bold text-terminal-text">
          {latestAmount === null ? '—' : formatMoney(latestAmount, { currency: currencyCode })}
        </span>
        {unitLabel ? (
          <span className="text-[0.75rem] text-terminal-text-secondary">/ {unitLabel}</span>
        ) : null}
      </span>

      {previousAmount !== null ? (
        <span className="flex items-baseline gap-1.5">
          <span className="figure-label">Previous</span>
          <span className="figure-num text-[0.8125rem] text-terminal-text-secondary">
            {formatMoney(previousAmount, { currency: currencyCode })}
          </span>
          <Arrow
            aria-hidden="true"
            className={
              latestAmount !== null && previousAmount !== null && latestAmount > previousAmount
                ? 'size-3 text-move-up'
                : latestAmount !== null && previousAmount !== null && latestAmount < previousAmount
                  ? 'size-3 text-move-down'
                  : 'size-3 text-move-flat'
            }
          />
        </span>
      ) : null}

      <span className="figure-num text-[0.6875rem] text-terminal-text-muted">
        {observationCount === 0
          ? 'No observations recorded'
          : `${observationCount} observation${observationCount === 1 ? '' : 's'}`}
        {firstObservedAt && lastObservedAt
          ? ` · ${formatDay(firstObservedAt)} – ${formatDay(lastObservedAt)}`
          : ''}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- helpers */

function formatObserved(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unrecorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date);
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unrecorded';
  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
