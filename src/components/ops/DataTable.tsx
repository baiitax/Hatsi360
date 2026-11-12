import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * GonaPulse — the shared data table.
 *
 * One table for every directory in the admin console: the same header,
 * the same empty state, the same pagination, so an administrator learns one
 * interface instead of twelve.
 */

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Renders the cell. Keep it pure: this runs on the server. */
  cell: (row: T) => ReactNode;
  /** Column classes. Defaults to left-aligned text. */
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
  /** Right-align numeric columns. */
  numeric?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  empty?: ReactNode;
  /** The current query string, used to build pagination links. */
  queryBase?: string;
  page?: number;
  pageCount?: number;
  total?: number;
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  empty,
  queryBase = '',
  page = 1,
  pageCount = 1,
  total = 0,
  pageSize = 25,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="text-sm font-semibold text-ink-700">Nothing to show</p>
        <p className="mt-1 text-sm text-ink-500">
          {empty ?? 'No records match the current filters.'}
        </p>
      </div>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-600 ${
                    column.numeric ? 'text-right' : ''
                  } ${column.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/70">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-middle text-ink-700 ${
                      column.numeric ? 'text-right tabular-nums' : ''
                    } ${column.hideOnMobile ? 'hidden md:table-cell' : ''} ${column.className ?? ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200 bg-ink-50 px-4 py-3 text-xs text-ink-600">
          <span>
            Showing {from}–{to} of {total}
          </span>
          <nav aria-label="Pagination" className="flex items-center gap-1">
            {page > 1 ? (
              <Link
                href={`${queryBase}${queryBase ? '&' : '?'}page=${page - 1}`}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 font-semibold hover:bg-ink-100"
              >
                Previous
              </Link>
            ) : null}
            <span className="px-2">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link
                href={`${queryBase}${queryBase ? '&' : '?'}page=${page + 1}`}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 font-semibold hover:bg-ink-100"
              >
                Next
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
