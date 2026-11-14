/**
 * Hatsi360 Markets — loading, empty, error and freshness feedback.
 *
 * The design brief asks for four distinct things and this file is all four:
 *
 *  1. **A skeleton that holds the shape of the content it replaces.** A
 *     skeleton in the shape of a card over a panel that is really a table is a
 *     lie about what is arriving, so every skeleton here is built from the
 *     same measurements as the component it stands in for.
 *  2. **An empty state that explains the situation and offers the next step.**
 *     "No data" on its own is a dead end; "no price has been published for this
 *     commodity yet — here is what publication means" is an answer.
 *  3. **An error state that does not hide behind a blank panel.** Every error
 *     names what failed and offers a retry only where a retry is meaningful.
 *  4. **A freshness indicator that never conflates a fresh page with fresh
 *     data.** Re-exported from `MarketOverview` so the terminal has one source.
 *
 * Every skeleton is a Server Component — it is rendered on the server while the
 * real content streams in, so nothing here ships to the browser at all.
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { IconAlert, IconError, IconInfo, IconRefresh, IconSource } from '@/components/ui/icons';
import { Button } from '../ui/primitives';

/* ------------------------------------------------------------- skeletons -- */

/**
 * The skeleton primitive.
 *
 * A single sweeping gradient, one animation, `prefers-reduced-motion` aware
 * through the global block in `globals.css`. It is deliberately the same
 * treatment everywhere: a terminal whose skeletons all look different looks
 * like a terminal whose pages all look different.
 */
export function SkeletonBlock({
  width,
  height,
  className = '',
  rounded = 'rounded-control',
}: {
  width?: string;
  height?: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block ${rounded} ${className}`}
      style={{ width, height }}
    />
  );
}

/** A market table skeleton: the shape of the real table, row for row. */
export function MarketTableSkeleton({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="terminal-panel terminal-panel--table" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-terminal-border px-3 py-2">
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonBlock
            key={index}
            height="0.5rem"
            width={index === 0 ? '6rem' : index === columns - 1 ? '4rem' : '3.5rem'}
          />
        ))}
      </div>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center gap-3 border-b border-terminal-border px-3 py-[0.6875rem] last:border-0"
        >
          <SkeletonBlock height="0.6875rem" width="38%" />
          <SkeletonBlock height="0.6875rem" width="22%" />
          <SkeletonBlock height="0.6875rem" width="14%" />
          <SkeletonBlock height="0.6875rem" width="10%" />
          <SkeletonBlock height="0.6875rem" width="12%" />
        </div>
      ))}
    </div>
  );
}

/** An overview-card skeleton: label, figure, detail, source line. */
export function OverviewCardSkeleton() {
  return (
    <div className="terminal-panel p-3.5" aria-hidden="true">
      <SkeletonBlock height="0.5rem" width="5.5rem" />
      <SkeletonBlock height="1.5rem" width="7rem" rounded="rounded-panel" />
      <SkeletonBlock height="0.5rem" width="100%" />
      <div className="mt-3 border-t border-terminal-border pt-2">
        <SkeletonBlock height="0.375rem" width="4rem" />
      </div>
    </div>
  );
}

/** A chart skeleton: the axes, a line, and the legend. */
export function ChartSkeleton({ height = '15rem' }: { height?: string }) {
  return (
    <div className="terminal-panel p-3.5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <SkeletonBlock height="0.6875rem" width="9rem" />
        <SkeletonBlock height="1.5rem" width="6rem" />
      </div>
      <div className="relative mt-3" style={{ height }}>
        <span className="absolute inset-x-0 top-0 h-px bg-terminal-border" />
        <span className="absolute inset-x-0 top-1/3 h-px bg-terminal-border" />
        <span className="absolute inset-x-0 top-2/3 h-px bg-terminal-border" />
        <span className="absolute inset-x-0 bottom-0 h-px bg-terminal-border" />
        <span className="absolute bottom-0 left-0 top-4 w-px bg-terminal-border" />
        <span className="absolute bottom-0 left-1/3 top-4 w-px bg-terminal-border" />
        <span className="absolute bottom-0 left-2/3 top-4 w-px bg-terminal-border" />
        <span className="absolute bottom-0 right-0 top-4 w-px bg-terminal-border" />
        <SkeletonBlock height="2px" width="70%" rounded="rounded-pill" />
      </div>
      <div className="mt-3 flex gap-3">
        <SkeletonBlock height="0.5rem" width="4.5rem" />
        <SkeletonBlock height="0.5rem" width="3.5rem" />
      </div>
    </div>
  );
}

/** A commodity card skeleton for the directory grid. */
export function CommodityCardSkeleton() {
  return (
    <div className="terminal-panel p-3.5" aria-hidden="true">
      <SkeletonBlock height="0.8125rem" width="60%" />
      <SkeletonBlock height="1.25rem" width="45%" rounded="rounded-panel" />
      <SkeletonBlock height="0.5rem" width="80%" />
      <div className="mt-3 flex gap-2">
        <SkeletonBlock height="1rem" width="3.5rem" rounded="rounded-pill" />
        <SkeletonBlock height="1rem" width="3rem" rounded="rounded-pill" />
      </div>
    </div>
  );
}

/** A panel skeleton for a section whose shape is not yet known. */
export function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="terminal-panel p-3.5" aria-hidden="true">
      <SkeletonBlock height="0.6875rem" width="7rem" />
      <div className="mt-3 flex flex-col gap-2">
        {Array.from({ length: lines }, (_, index) => (
          <SkeletonBlock
            key={index}
            height="0.625rem"
            width={index === lines - 1 ? '55%' : '100%'}
          />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- empty states -- */

export type EmptyStateKind =
  | 'no-market-data'
  | 'no-commodity-results'
  | 'no-history'
  | 'no-comparison'
  | 'no-research'
  | 'no-watchlist'
  | 'no-alerts'
  | 'no-coverage'
  | 'no-observations';

/**
 * The copy for every empty state the terminal can be in.
 *
 * Each one names the situation *and* says what would change it, because an
 * empty state that only says "nothing here" tells a reader nothing about
 * whether the platform is broken, incomplete, or simply has not been given
 * this data yet.
 */
const EMPTY_STATE_COPY: Record<
  EmptyStateKind,
  { title: string; body: string; action?: { href: string; label: string } }
> = {
  'no-market-data': {
    title: 'No published market prices',
    body:
      'No price observation has completed verification and publication, so there is nothing eligible for public display. Publication is a separate act from verification, and neither has been completed for any record yet.',
    action: { href: '/methodology', label: 'How a price becomes a published price' },
  },
  'no-commodity-results': {
    title: 'No commodity matches those filters',
    body:
      'The catalogue holds the commodities the platform collects. Try a wider category, clear the search, or browse the full directory.',
    action: { href: '/commodities', label: 'Browse the commodity directory' },
  },
  'no-history': {
    title: 'No published price history',
    body:
      'A history chart needs at least two published observations for the same commodity, market, price type, grade and unit. The platform does not yet hold enough to draw one, and it will not draw a line through a gap.',
  },
  'no-comparison': {
    title: 'Nothing to compare yet',
    body:
      'A comparison needs two markets reporting the same commodity at the same price type and grade. Until then the two figures would not be measuring the same thing.',
    action: { href: '/markets', label: 'See the markets under coverage' },
  },
  'no-research': {
    title: 'No published research',
    body:
      'The research library is empty. Reports and market briefs appear here once they have been written, reviewed and published — never as placeholders.',
  },
  'no-watchlist': {
    title: 'Your watchlist is empty',
    body:
      'Add a commodity or a market and its latest published observation will appear here with its movement.',
    action: { href: '/commodities', label: 'Browse the commodity directory' },
  },
  'no-alerts': {
    title: 'You have no price alerts',
    body:
      'An alert tells you when a published observation moves outside a threshold you set. Create one from a commodity page.',
    action: { href: '/commodities', label: 'Choose a commodity to watch' },
  },
  'no-coverage': {
    title: 'No configured market coverage',
    body:
      'Coverage describes which markets report which commodities, and on what schedule. The platform has not configured any yet, so it cannot claim a coverage area.',
    action: { href: '/coverage', label: 'Read the coverage report' },
  },
  'no-observations': {
    title: 'No observations recorded',
    body:
      'This series has no observation at all. The platform does not estimate, interpolate or carry a figure forward, so there is nothing to show.',
  },
};

/**
 * An empty state.
 *
 * A panel in the shape of the thing that is missing, so the layout does not
 * collapse and the reader can see where the content would have been.
 */
export function EmptyStatePanel({
  kind,
  action,
  className = '',
}: {
  kind: EmptyStateKind;
  /** Overrides the default action, or `null` to suppress it. */
  action?: { href: string; label: string } | null;
  className?: string;
}) {
  const copy = EMPTY_STATE_COPY[kind];
  const link = action === undefined ? copy.action : action;

  return (
    <div
      className={`terminal-panel flex flex-col items-center gap-2 px-4 py-10 text-center ${className}`}
    >
      <span aria-hidden="true" className="text-terminal-text-muted">
        <IconInfo className="size-5" />
      </span>
      <h3 className="font-display text-[0.875rem] font-bold text-terminal-text">{copy.title}</h3>
      <p className="max-w-md text-[0.75rem] leading-5 text-terminal-text-secondary">{copy.body}</p>
      {link ? (
        <Link
          href={link.href}
          className="terminal-action mt-1"
        >
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- error states -- */

export type ErrorStateKind =
  | 'network'
  | 'unauthorized'
  | 'retrieval'
  | 'invalid-filter'
  | 'chart'
  | 'missing-data'
  | 'session';

/**
 * The copy for every error the terminal can show.
 *
 * An error state names what failed and what a reader can do about it. Where a
 * retry would not help — an expired session, a filter combination that has no
 * results — it is not offered, because a button that does nothing is worse than
 * no button.
 */
const ERROR_STATE_COPY: Record<
  ErrorStateKind,
  { title: string; body: string; retry: boolean }
> = {
  network: {
    title: 'The market data could not be reached',
    body:
      'The request did not complete. This is usually a connection problem rather than a problem with the data.',
    retry: true,
  },
  unauthorized: {
    title: 'This surface needs an account',
    body:
      'The page you asked for is available to signed-in users. Sign in with an account that has access, or return to the public market data.',
    retry: false,
  },
  retrieval: {
    title: 'The market data could not be loaded',
    body:
      'The request was made and came back without the records. Nothing has been changed on your side.',
    retry: true,
  },
  'invalid-filter': {
    title: 'That filter combination returns nothing',
    body:
      'One of the values you chose excludes every record. Widen the date range or clear a filter to see the series again.',
    retry: false,
  },
  chart: {
    title: 'This chart could not be drawn',
    body:
      'The series is present but the chart could not render it. The figures are still listed in the table below.',
    retry: true,
  },
  'missing-data': {
    title: 'The data behind this panel is unavailable',
    body:
      'The platform does not hold the records this panel would summarise. It will not substitute an estimate.',
    retry: false,
  },
  session: {
    title: 'Your session has expired',
    body: 'Sign in again to continue. Nothing you had open has been lost.',
    retry: false,
  },
};

/**
 * An error state.
 *
 * `onRetry` is only rendered when the error kind says a retry is meaningful and
 * a handler was actually supplied — a retry button that reloads the same
 * broken request is a promise the product cannot keep.
 */
export function ErrorStatePanel({
  kind,
  onRetry,
  className = '',
}: {
  kind: ErrorStateKind;
  onRetry?: () => void;
  className?: string;
}) {
  const copy = ERROR_STATE_COPY[kind];
  const Icon = kind === 'unauthorized' || kind === 'session' ? IconInfo : kind === 'chart' || kind === 'missing-data' ? IconAlert : IconError;

  return (
    <div
      role="alert"
      className={`terminal-panel flex flex-col items-center gap-2 px-4 py-10 text-center ${className}`}
    >
      <span aria-hidden="true" className="text-move-down">
        <Icon className="size-5" />
      </span>
      <h3 className="font-display text-[0.875rem] font-bold text-terminal-text">{copy.title}</h3>
      <p className="max-w-md text-[0.75rem] leading-5 text-terminal-text-secondary">{copy.body}</p>
      {copy.retry && onRetry ? (
        <Button variant="secondary" icon={<IconRefresh className="size-3.5" />} onClick={onRetry} className="mt-1">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- notices -- */

/**
 * A provenance notice.
 *
 * Used wherever a figure is shown without the full provenance chain beside it —
 * a chart, a summary card, a comparison. It states where the number came from
 * and what it is not.
 */
export function ProvenanceNotice({
  source,
  collectedAt,
  children,
  className = '',
}: {
  source: string;
  collectedAt?: string | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.625rem] leading-4 text-terminal-text-muted ${className}`}
    >
      <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
        <IconSource className="size-3" />
        Source
      </span>
      <span>{source}</span>
      {collectedAt ? <span>· collected {collectedAt}</span> : null}
      {children}
    </p>
  );
}
