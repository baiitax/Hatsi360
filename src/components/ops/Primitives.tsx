import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Pluck Live — small shared pieces used by both consoles.
 */

export type PillTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

const PILL_TONES: Record<PillTone, string> = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  brand: 'bg-brand-50 text-brand-800 border-brand-200',
};

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PILL_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** The label for a collection task status. */
export const TASK_STATUS_LABELS: Record<string, string> = {
  open: 'To do',
  in_progress: 'In progress',
  submitted: 'Submitted',
  awaiting_review: 'Awaiting review',
  correction_required: 'Correction required',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function taskStatusTone(status: string): PillTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'neutral';
    case 'correction_required':
      return 'warning';
    case 'awaiting_review':
    case 'submitted':
      return 'info';
    case 'in_progress':
      return 'brand';
    default:
      return 'neutral';
  }
}

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspended',
  deactivated: 'Deactivated',
};

export const VERIFICATION_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_verification: 'Pending verification',
  verified: 'Approved',
  rejected: 'Rejected',
  correction_requested: 'Correction required',
  legacy_unverified: 'Legacy — unverified',
};

export function verificationTone(status: string): PillTone {
  switch (status) {
    case 'verified':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'correction_requested':
      return 'warning';
    case 'submitted':
    case 'pending_verification':
      return 'info';
    case 'legacy_unverified':
      return 'warning';
    default:
      return 'neutral';
  }
}

/** The page header with breadcrumbs. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? (
                  <span aria-hidden="true" className="text-ink-300">
                    /
                  </span>
                ) : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="font-medium hover:text-brand-700 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-ink-700" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description ? (
            <div className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-600">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** A labelled section inside a page. */
export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card rounded-[var(--radius-card)] ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
          <div>
            {title ? <h2 className="text-sm font-bold text-ink-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-ink-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** A quiet, honest empty state. */
export function InlineEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
