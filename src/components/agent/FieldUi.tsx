import type { ReactNode } from 'react';
import Link from 'next/link';

/**
 * The small vocabulary the Field App pages share.
 *
 * The field app is used on a phone, in the sun, often one-handed. So the
 * primitives are deliberately plain: cards with a visible border, text that
 * does not rely on colour alone, and touch targets that are large enough to
 * hit without looking. Nothing here is decorative.
 */

export function FieldSection({
  title,
  action,
  children,
  description,
}: {
  title: string;
  /** A link or button rendered on the right of the heading. */
  action?: ReactNode;
  children: ReactNode;
  description?: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        {action}
      </div>
      {description ? <p className="text-xs leading-relaxed text-ink-500">{description}</p> : null}
      {children}
    </section>
  );
}

export function FieldCard({
  children,
  className = '',
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li';
}) {
  const classes = `rounded-xl border border-ink-200 bg-white p-3 ${className}`;
  return as === 'li' ? <li className={classes}>{children}</li> : <div className={classes}>{children}</div>;
}

/** A figure with a label. The number is the first thing read. */
export function FieldStat({
  value,
  label,
  tone = 'default',
  href,
}: {
  value: number | string;
  label: string;
  tone?: 'default' | 'warning' | 'good';
  href?: string;
}) {
  const toneClass =
    tone === 'warning'
      ? 'text-amber-700'
      : tone === 'good'
        ? 'text-brand-700'
        : 'text-ink-950';

  const body = (
    <>
      <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-tight text-ink-500">{label}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-ink-200 bg-white px-3 py-3 text-center transition-colors hover:border-brand-300"
      >
        {body}
      </Link>
    );
  }

  return <div className="rounded-xl border border-ink-200 bg-white px-3 py-3 text-center">{body}</div>;
}

/**
 * The status pill.
 *
 * Every status carries its label in text as well as in colour, so the state
 * is readable in bright sunlight and to a screen reader.
 */
export function FieldStatusPill({
  status,
  label,
  tone,
}: {
  status: string;
  label: string;
  tone?: 'neutral' | 'good' | 'warning' | 'bad' | 'info';
}) {
  const resolved =
    tone ??
    (status === 'verified' || status === 'completed'
      ? 'good'
      : status === 'correction_requested' || status === 'rejected' || status === 'overdue'
        ? 'bad'
        : status === 'pending_verification' || status === 'submitted' || status === 'awaiting_review'
          ? 'info'
          : status === 'draft' || status === 'open' || status === 'in_progress'
            ? 'warning'
            : 'neutral');

  const classes: Record<string, string> = {
    good: 'bg-brand-50 text-brand-800',
    warning: 'bg-harvest-100 text-harvest-700',
    bad: 'bg-error-50 text-error-700',
    info: 'bg-info-50 text-info-700',
    neutral: 'bg-ink-100 text-ink-700',
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${classes[resolved]}`}
    >
      {label}
    </span>
  );
}

/** The empty state. It says what is missing and what to do about it. */
export function FieldEmpty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-white p-5 text-center">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-500">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** A prominent action button. Large enough to hit with a thumb. */
export function FieldPrimaryAction({
  href,
  children,
  tone = 'brand',
  className = '',
}: {
  href: string;
  children: ReactNode;
  tone?: 'brand' | 'dark' | 'quiet';
  className?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-700 text-white hover:bg-brand-800',
    dark: 'bg-ink-900 text-white hover:bg-ink-800',
    quiet: 'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
  };
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors ${tones[tone]} ${className}`}
    >
      {children}
    </Link>
  );
}

/** A definition row, used on the detail screens. */
export function FieldDetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-100 py-2 last:border-0">
      <dt className="shrink-0 text-xs font-medium text-ink-500">{label}</dt>
      <dd className="text-right text-xs font-semibold text-ink-900">{children}</dd>
    </div>
  );
}

/** A note or instruction block. */
export function FieldNote({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'good';
  title?: string;
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    info: 'border-info-200 bg-info-50 text-info-700',
    warning: 'border-warning-200 bg-warning-50 text-warning-700',
    good: 'border-brand-200 bg-brand-50 text-brand-800',
  };
  return (
    <div className={`rounded-xl border p-3 text-xs leading-relaxed ${tones[tone]}`}>
      {title ? <p className="font-bold">{title}</p> : null}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}
