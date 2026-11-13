import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * Trade Intelligence interface primitives.
 *
 * The design rules from brief §22, applied:
 *
 *   - restrained green and gold accents, no gradients, no decorative motion;
 *   - tabular numerals for every price, count, percentage and date;
 *   - compact panels rather than a wall of cards;
 *   - no icons in every cell, no repeated status badges.
 *
 * The admin console has its own primitives in `components/ops`. These are the
 * public equivalents — the same restraint, a lighter frame.
 */

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-ink-200 bg-ink-50 text-ink-700',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
  brand: 'border-brand-200 bg-brand-50 text-brand-800',
};

export function Pill({
  tone = 'neutral',
  children,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-ink-200 bg-white p-4 ${className}`}
    >
      {(title || actions) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-bold text-ink-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-snug text-ink-600">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  purpose,
  actions,
  breadcrumbs,
}: {
  title: string;
  /** One sentence, immediately under the title. Never repeats the title. */
  purpose: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <header className="mb-5">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-brand-700 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink-700">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">{purpose}</p>
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/**
 * An honest empty state.
 *
 * Brief §18 and non-negotiable #27 require real empty states rather than
 * placeholder pages. This states what is missing, why, and what would fill it.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-8 text-center">
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-600">
        {description}
      </p>
      {action ? (
        <Link
          href={action.href}
          className="mt-3 inline-flex min-h-[36px] items-center rounded-lg border border-ink-200 bg-white px-3.5 text-xs font-semibold text-ink-800 transition-colors hover:bg-ink-50"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/** A single metric. Value, period, and the previous period where it exists. */
export function Metric({
  label,
  value,
  period,
  previous,
  href,
  note,
}: {
  label: string;
  value: string;
  period?: string;
  previous?: string | null;
  href?: string;
  note?: string;
}) {
  const body = (
    <>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-ink-900">
        {value}
      </dd>
      {period ? <p className="mt-0.5 text-[11px] text-ink-500">{period}</p> : null}
      {previous ? (
        <p className="mt-0.5 text-[11px] tabular-nums text-ink-600">{previous}</p>
      ) : null}
      {note ? <p className="mt-1 text-[11px] leading-snug text-ink-500">{note}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-ink-200 bg-white p-3.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
      >
        {body}
      </Link>
    );
  }
  return <div className="rounded-xl border border-ink-200 bg-white p-3.5">{body}</div>;
}

/**
 * The standing disclosure that accompanies every opportunity figure.
 *
 * Brief §9.3 and §10 forbid presenting a recorded price as a commercial
 * opportunity. This is rendered wherever such a figure appears.
 */
export function OpportunityDisclosure({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-[11px] leading-relaxed text-amber-900">
      <span className="font-bold">Read this first. </span>
      {text}
    </p>
  );
}

/** A price, formatted with tabular numerals and its unit. */
export function Price({
  amount,
  currencySymbol = '₦',
  unitLabel,
  className = '',
}: {
  amount: number | null;
  currencySymbol?: string;
  unitLabel?: string | null;
  className?: string;
}) {
  if (amount == null) {
    return <span className={`text-ink-400 ${className}`}>—</span>;
  }
  const formatted =
    Math.abs(amount) >= 1000
      ? amount.toLocaleString('en-NG', { maximumFractionDigits: 0 })
      : amount.toLocaleString('en-NG', { maximumFractionDigits: 2 });
  return (
    <span className={`tabular-nums ${className}`}>
      {currencySymbol}
      {formatted}
      {unitLabel ? <span className="text-ink-500"> / {unitLabel}</span> : null}
    </span>
  );
}

/** A signed change, coloured only when it is meaningful. */
export function Change({
  amount,
  percent,
  currencySymbol = '₦',
}: {
  amount: number | null;
  percent: number | null;
  currencySymbol?: string;
}) {
  if (amount == null || percent == null) {
    return <span className="text-xs text-ink-400">No comparable previous price</span>;
  }
  const up = amount > 0;
  const flat = amount === 0;
  const tone = flat ? 'text-ink-600' : up ? 'text-emerald-700' : 'text-rose-700';
  const sign = flat ? '' : up ? '+' : '−';
  return (
    <span className={`text-xs font-semibold tabular-nums ${tone}`}>
      {sign}
      {currencySymbol}
      {Math.abs(amount).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
      <span className="ml-1 font-normal">
        ({sign}
        {Math.abs(percent).toFixed(1)}%)
      </span>
    </span>
  );
}
