/**
 * Hatsi360 Markets — the market watch table.
 *
 * This is the single most important surface in the product. A trader opens the
 * terminal to answer one question — "what is the market doing" — and this table
 * is the answer. Everything about it is therefore a decision about reading:
 *
 *  - **A row is 2.25rem.** Tall enough that a finger lands on it, short enough
 *    that twenty fit above the fold on a laptop. The header is sticky, because
 *    a watch table is read while it scrolls.
 *  - **Every numeric column is right-aligned and tabular.** A column of prices
 *    that is not aligned is a column you have to read twice.
 *  - **A price is never a bare number.** The price column carries the unit in
 *    the same cell, and the observation time and the verification state sit in
 *    their own columns, because those are what make the figure defensible.
 *  - **Sorting is real or it is absent.** A column is only sortable when the
 *    caller passes a `sort` state; the arrow is a link to the sorted URL, not
 *    a decoration.
 *  - **The mobile form is a card, not a squashed table.** A ten-column table
 *    at 360px is unreadable, so below `md` each row renders as a card that
 *    keeps the price, the unit, the movement and the provenance and drops the
 *    columns that can be reached from the commodity page instead.
 *
 * The table is a Server Component. Nothing here holds state.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatMoney } from '@/lib/money';
import { VerificationBadge } from '@/components/ui/data-display';
import { PriceChangeBadge } from './PriceDisplay';
import { IconArrowDown, IconArrowUp, IconChevronLeft, IconChevronRight, IconMinus } from '@/components/ui/icons';

/* ------------------------------------------------------------------- types */

/** One row of the market watch. */
export interface MarketWatchRow {
  id: string;
  commodityName: string;
  commoditySlug: string;
  marketName: string | null;
  marketSlug: string | null;
  amount: number | null;
  currencyCode: string;
  unitLabel: string | null;
  priceTypeLabel: string | null;
  gradeName: string | null;
  changePercent: number | null;
  observedAt: string | null;
  verificationStatus: string;
  href?: string;
}

/** The sort state of the table, owned by the page that renders it. */
export interface WatchSort {
  column: string;
  direction: 'asc' | 'desc';
}

/* -------------------------------------------------------------- the table */

export function MarketWatchTable({
  rows,
  sort,
  onSort,
  caption,
  emptyState,
  footer,
}: {
  rows: MarketWatchRow[];
  /** When supplied with `onSort`, the sortable column heads become links. */
  sort?: WatchSort;
  onSort?: (column: string) => void;
  /** Describes the table for a screen reader. Always supplied. */
  caption: string;
  /** Rendered instead of the table when there is nothing to show. */
  emptyState?: ReactNode;
  footer?: ReactNode;
}) {
  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="terminal-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <SortableHead
              label="Commodity"
              column="commodity"
              sort={sort}
              onSort={onSort}
            />
            <SortableHead label="Market" column="market" sort={sort} onSort={onSort} />
            <SortableHead
              label="Price"
              column="price"
              align="right"
              sort={sort}
              onSort={onSort}
            />
            <SortableHead
              label="Movement"
              column="movement"
              align="right"
              sort={sort}
              onSort={onSort}
            />
            <SortableHead
              label="Last observed"
              column="observed"
              sort={sort}
              onSort={onSort}
            />
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className="font-medium text-terminal-text">
                <Link
                  href={row.href ?? `/commodities/${row.commoditySlug}`}
                  className="underline decoration-terminal-border decoration-1 underline-offset-2 transition-colors hover:text-harvest-300 hover:decoration-harvest-500"
                >
                  {row.commodityName}
                </Link>
                {row.gradeName ? (
                  <span className="ml-1.5 text-[0.6875rem] font-normal text-terminal-text-muted">
                    {row.gradeName}
                  </span>
                ) : null}
              </th>
              <td className="text-terminal-text-secondary">
                {row.marketSlug ? (
                  <Link
                    href={`/markets/${row.marketSlug}`}
                    className="underline decoration-terminal-border decoration-1 underline-offset-2 transition-colors hover:text-terminal-text"
                  >
                    {row.marketName}
                  </Link>
                ) : (
                  (row.marketName ?? '—')
                )}
              </td>
              <td className="num">
                {row.amount === null ? (
                  <span className="text-terminal-text-muted">Not observed</span>
                ) : (
                  <>
                    <span className="font-semibold text-terminal-text">
                      {formatMoney(row.amount, { currency: row.currencyCode })}
                    </span>
                    {row.unitLabel ? (
                      <span className="ml-1 font-normal text-terminal-text-muted">
                        / {row.unitLabel}
                      </span>
                    ) : null}
                  </>
                )}
              </td>
              <td className="num">
                <PriceChangeBadge changePercent={row.changePercent} />
              </td>
              <td className="figure-num whitespace-nowrap text-terminal-text-secondary">
                {row.observedAt ? formatObserved(row.observedAt) : '—'}
              </td>
              <td>
                <VerificationBadge
                  status={row.verificationStatus as never}
                  surface="terminal"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {footer ? (
        <div className="border-t border-terminal-border px-3 py-2 text-[0.6875rem] text-terminal-text-muted">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The mobile form of the same data.
 *
 * Not a compressed table — a different layout. Each row becomes a card that
 * keeps the four things a person on a phone needs (the price with its unit, the
 * movement, the market, and how fresh and how verified it is) and leaves the
 * rest to the commodity page. Rendered by the page rather than by a media
 * query, so it can be tested.
 */
export function MarketWatchCards({ rows }: { rows: MarketWatchRow[] }) {
  return (
    <ul className="divide-y divide-terminal-border">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={row.href ?? `/commodities/${row.commoditySlug}`}
            className="flex min-h-[3.5rem] items-center gap-3 px-3 py-2.5 transition-colors hover:bg-terminal-interactive/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-semibold text-terminal-text">
                {row.commodityName}
                {row.gradeName ? (
                  <span className="ml-1.5 font-normal text-terminal-text-muted">
                    {row.gradeName}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-[0.6875rem] text-terminal-text-muted">
                {row.marketName ?? 'Market not recorded'} ·{' '}
                {row.observedAt ? formatObserved(row.observedAt) : 'not observed'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="figure-num text-figure font-semibold text-terminal-text">
                {row.amount === null
                  ? '—'
                  : `${formatMoney(row.amount, { currency: row.currencyCode })}${
                      row.unitLabel ? ` / ${row.unitLabel}` : ''
                    }`}
              </p>
              <PriceChangeBadge changePercent={row.changePercent} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- sorting -- */

function SortableHead({
  label,
  column,
  align = 'left',
  sort,
  onSort,
}: {
  label: string;
  column: string;
  align?: 'left' | 'right';
  sort?: WatchSort;
  onSort?: (column: string) => void;
}) {
  const active = sort?.column === column;
  const nextDirection = active && sort?.direction === 'asc' ? 'desc' : 'asc';
  const Arrow = !active ? null : sort?.direction === 'asc' ? IconArrowUp : IconArrowDown;

  return (
    <th
      scope="col"
      className={align === 'right' ? 'text-right' : undefined}
      aria-sort={active ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {onSort ? (
        <button
          type="button"
          onClick={() => onSort(column)}
          className={`inline-flex items-center gap-1 uppercase transition-colors hover:text-terminal-text ${
            align === 'right' ? 'flex-row-reverse' : ''
          }`}
        >
          {label}
          {Arrow ? (
            <Arrow className="size-3" />
          ) : (
            <span aria-hidden="true" className="text-[0.5rem] opacity-40">
              ⇅
            </span>
          )}
          <span className="sr-only">
            {active
              ? `sorted ${sort?.direction === 'asc' ? 'ascending' : 'descending'}, activate to sort ${nextDirection}`
              : `activate to sort ${nextDirection}`}
          </span>
        </button>
      ) : (
        label
      )}
    </th>
  );
}

/* ------------------------------------------------------------- pagination */

/**
 * Pagination.
 *
 * A real `<nav>` with real links, because a watch table's pages must be
 * bookmarkable and must work without JavaScript. The current page is a
 * `<span aria-current="page">`, never a link to itself.
 */
export function WatchPagination({
  page,
  pageCount,
  hrefFor,
  className = '',
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const pages = pageWindow(page, pageCount);

  return (
    <nav
      aria-label="Market watch pages"
      className={`flex items-center justify-between gap-2 px-3 py-2 ${className}`}
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          rel="prev"
          className="terminal-control"
        >
          <IconChevronLeft className="size-3.5" />
          Previous
        </Link>
      ) : (
        <span className="terminal-control opacity-45" aria-disabled="true">
          <IconChevronLeft className="size-3.5" />
          Previous
        </span>
      )}

      <ol className="flex items-center gap-1">
        {pages.map((entry, index) =>
          entry === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-terminal-text-muted">
              …
            </li>
          ) : entry === page ? (
            <li key={entry}>
              <span
                aria-current="page"
                className="terminal-control data-[selected=true]:bg-terminal-interactive"
                data-selected="true"
              >
                {entry}
              </span>
            </li>
          ) : (
            <li key={entry}>
              <Link href={hrefFor(entry)} className="terminal-control">
                {entry}
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className="terminal-control">
          Next
          <IconChevronRight className="size-3.5" />
        </Link>
      ) : (
        <span className="terminal-control opacity-45" aria-disabled="true">
          Next
          <IconChevronRight className="size-3.5" />
        </span>
      )}
    </nav>
  );
}

/** The pages to show, with gaps collapsed so a long table stays one line. */
function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  const window: (number | 'gap')[] = [];
  const first = Math.max(1, Math.min(page - 2, pageCount - 4));
  const last = Math.min(pageCount, first + 4);
  if (first > 1) {
    window.push(1);
    if (first > 2) window.push('gap');
  }
  for (let value = first; value <= last; value += 1) window.push(value);
  if (last < pageCount) {
    if (last < pageCount - 1) window.push('gap');
    window.push(pageCount);
  }
  return window;
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

/** Re-exported so a page can build a sort link without importing two files. */
export { IconMinus };
