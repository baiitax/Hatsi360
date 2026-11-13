import type { ReactNode } from 'react';

/**
 * Hatsi360 — the KPI card.
 *
 * Every number shown in the admin console comes from the database. The card
 * always carries:
 *
 *  - the value,
 *  - the comparison with the previous period (or an honest "no comparison"),
 *  - the documented definition of the metric.
 *
 * A missing value is shown as a dash, never as a zero.
 */

export interface KpiCardProps {
  label: string;
  value: string;
  /** The change against the previous period, as a percentage. Null means unknown. */
  changePercent?: number | null;
  /** The text under the value, e.g. "12 of 40 expected". */
  detail?: string;
  /** The documented definition of the metric. */
  definition?: string;
  /** The surface the metric belongs to, for the analytics documentation. */
  source?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
  icon?: ReactNode;
  href?: string;
}

export function KpiCard({
  label,
  value,
  changePercent,
  detail,
  definition,
  source,
  tone = 'default',
  icon,
  href,
}: KpiCardProps) {
  const toneClasses = {
    default: 'text-ink-950',
    good: 'text-emerald-700',
    warn: 'text-amber-700',
    bad: 'text-red-700',
  }[tone];

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        {icon ? <span aria-hidden="true" className="text-lg text-brand-600">{icon}</span> : null}
      </div>

      <p className={`mt-2 text-3xl font-bold tabular-nums ${toneClasses}`}>{value}</p>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {changePercent === null || changePercent === undefined ? (
          <span className="text-ink-400">No prior period to compare</span>
        ) : (
          <span
            className={
              changePercent > 0
                ? 'font-semibold text-emerald-700'
                : changePercent < 0
                  ? 'font-semibold text-red-700'
                  : 'font-semibold text-ink-600'
            }
          >
            {changePercent > 0 ? '▲' : changePercent < 0 ? '▼' : '■'}{' '}
            {Math.abs(changePercent).toFixed(1)}% vs previous period
          </span>
        )}
      </div>

      {detail ? <p className="mt-1 text-xs text-ink-500">{detail}</p> : null}

      {definition ? (
        <p className="mt-3 border-t border-ink-100 pt-2 text-xs leading-relaxed text-ink-500">
          {definition}
        </p>
      ) : null}

      {source ? <p className="mt-1 text-[11px] text-ink-400">Source: {source}</p> : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="card card-hover block rounded-[var(--radius-card)] px-4 py-4 focus-visible:outline-2"
      >
        {body}
      </a>
    );
  }

  return <div className="card rounded-[var(--radius-card)] px-4 py-4">{body}</div>;
}
