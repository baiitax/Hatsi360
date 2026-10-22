import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatDateTime, formatMoney } from '@/lib/money';
import { relativeTime, isStale, DEFAULT_FRESHNESS_HOURS } from '@/lib/pricing';
import { VERIFICATION_STATUS_META, type VerificationStatus } from '@/types/domain';

/* --------------------------------------------------------------- headings */

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  action?: ReactNode;
}) {
  const centred = align === 'center';
  return (
    <div
      className={
        centred
          ? 'mx-auto max-w-2xl text-center'
          : 'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'
      }
    >
      <div className={centred ? '' : 'max-w-2xl'}>
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">{eyebrow}</p>
        ) : null}
        <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        {description ? (
          <div className="mt-3 text-base leading-relaxed text-ink-600">{description}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------ empty state */

export function EmptyState({
  title,
  description,
  action,
  icon = '◍',
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span aria-hidden="true" className="text-4xl text-brand-300">
        {icon}
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-ink-600">{description}</p>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- badges */

const TONE_CLASSES: Record<string, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
};

export function StatusBadge({
  status,
  className = '',
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const meta = VERIFICATION_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASSES[meta.tone]} ${className}`}
      title={meta.description}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}

export function StaleBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ${className}`}
      title="This observation is older than the freshness window configured for the commodity."
    >
      <span aria-hidden="true">⚠</span>
      Stale
    </span>
  );
}

export function UnitUnknownBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700 ${className}`}
      title="The source record did not state a measurement unit, so this figure may not be comparable with others."
    >
      <span aria-hidden="true">?</span>
      Unit not recorded
    </span>
  );
}

/* --------------------------------------------------------- price figure */

export function PriceFigure({
  amount,
  currency = 'NGN',
  unitLabel,
  size = 'md',
  className = '',
}: {
  amount: number | null | undefined;
  currency?: string;
  unitLabel?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-4xl',
  } as const;

  return (
    <span className={`figure inline-flex items-baseline gap-1.5 ${sizes[size]} ${className}`}>
      <span>{formatMoney(amount, { currency })}</span>
      {unitLabel ? (
        <span className="text-xs font-medium text-ink-500">/ {unitLabel}</span>
      ) : null}
    </span>
  );
}

/**
 * The timestamp + provenance line that must accompany every published price.
 *
 * It states when the price was collected, how long ago that was, and whether the
 * observation is still inside its freshness window.
 */
export function ProvenanceLine({
  collectedAt,
  verifiedAt,
  status,
  precision = 'minute',
  freshnessHours = DEFAULT_FRESHNESS_HOURS,
  className = '',
}: {
  collectedAt: string;
  verifiedAt?: string | null;
  status: VerificationStatus;
  precision?: 'minute' | 'date';
  freshnessHours?: number;
  className?: string;
}) {
  const stale = isStale(collectedAt, freshnessHours);
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 ${className}`}>
      <span title={formatDateTime(collectedAt)}>
        Collected{' '}
        <span className="font-medium text-ink-700">
          {precision === 'date' ? formatDateTime(collectedAt).split(',')[0] : relativeTime(collectedAt)}
        </span>
        {precision === 'date' ? ' (date only)' : null}
      </span>
      {verifiedAt ? (
        <span title={formatDateTime(verifiedAt)}>Verified {relativeTime(verifiedAt)}</span>
      ) : null}
      <StatusBadge status={status} />
      {stale ? <StaleBadge /> : null}
    </div>
  );
}

/* ---------------------------------------------------------- breadcrumbs */

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="transition-colors hover:text-brand-700">
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="text-ink-300">
              /
            </span>
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-brand-700">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-ink-800" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------ pagination */

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let i = windowStart; i <= windowEnd; i += 1) pages.push(i);

  const linkClass =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors';

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      <a
        href={buildHref(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`${linkClass} ${
          page === 1
            ? 'pointer-events-none border-ink-200 bg-ink-100 text-ink-400'
            : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-800'
        }`}
      >
        <span aria-hidden="true">←</span>
        <span className="sr-only">Previous page</span>
      </a>

      {windowStart > 1 ? (
        <>
          <a href={buildHref(1)} className={`${linkClass} border-ink-200 bg-white text-ink-700 hover:border-brand-400`}>
            1
          </a>
          <span aria-hidden="true" className="px-1 text-ink-400">
            …
          </span>
        </>
      ) : null}

      {pages.map((p) => (
        <a
          key={p}
          href={buildHref(p)}
          aria-current={p === page ? 'page' : undefined}
          className={`${linkClass} ${
            p === page
              ? 'border-brand-700 bg-brand-700 text-white'
              : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-800'
          }`}
        >
          {p}
        </a>
      ))}

      {windowEnd < totalPages ? (
        <>
          <span aria-hidden="true" className="px-1 text-ink-400">
            …
          </span>
          <a
            href={buildHref(totalPages)}
            className={`${linkClass} border-ink-200 bg-white text-ink-700 hover:border-brand-400`}
          >
            {totalPages}
          </a>
        </>
      ) : null}

      <a
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-disabled={page === totalPages}
        className={`${linkClass} ${
          page === totalPages
            ? 'pointer-events-none border-ink-200 bg-ink-100 text-ink-400'
            : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-800'
        }`}
      >
        <span aria-hidden="true">→</span>
        <span className="sr-only">Next page</span>
      </a>
    </nav>
  );
}

/* ------------------------------------------------------------- skeleton */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />;
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card overflow-hidden" role="status" aria-label="Loading prices">
      <div className="border-b border-ink-200 bg-ink-50 px-5 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="divide-y divide-ink-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className={`h-4 ${columnIndex === 0 ? 'w-1/4' : 'w-1/6'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
