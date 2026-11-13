import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatDateTime, formatMoney } from '@/lib/money';
import { relativeTime, isStale, DEFAULT_FRESHNESS_HOURS } from '@/lib/pricing';
import {
  PRICE_TYPE_META,
  VERIFICATION_STATUS_META,
  type PriceObservation,
  type VerificationStatus,
} from '@/types/domain';

/**
 * The shared analytical display components.
 *
 * These are used by the public site, the customer workspace, the Field App and
 * the Control Centre. They exist once so the same figure is never rendered two
 * different ways in two different products.
 */

/* ------------------------------------------------------ movement indicator */

/**
 * A price movement.
 *
 * The direction is carried by an arrow as well as by colour, so the meaning
 * does not depend on colour perception alone. Movement is only ever shown when
 * a previous comparable figure actually exists — no invented percentages.
 */
export function PriceMovementIndicator({
  changePercent,
  className = '',
  label,
}: {
  /** The change against a comparable previous period. Null when unknown. */
  changePercent: number | null | undefined;
  className?: string;
  /** What the change is measured against, e.g. "vs previous 7 days". */
  label?: string;
}) {
  if (changePercent == null || Number.isNaN(changePercent)) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-ink-400 ${className}`}>
        <span aria-hidden="true">—</span>
        <span>No comparable previous period</span>
      </span>
    );
  }

  const rising = changePercent > 0;
  const flat = changePercent === 0;
  const tone = flat
    ? 'bg-ink-100 text-ink-600 border-ink-200'
    : rising
      ? 'bg-leaf-100 text-leaf-700 border-leaf-200'
      : 'bg-red-50 text-error-700 border-red-200';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${tone} ${className}`}
    >
      <span aria-hidden="true">{flat ? '→' : rising ? '▲' : '▼'}</span>
      <span>
        {flat ? 'Unchanged' : `${rising ? '+' : ''}${changePercent.toFixed(1)}%`}
      </span>
      {label ? <span className="font-normal opacity-80">{label}</span> : null}
    </span>
  );
}

/* ------------------------------------------------------- freshness indicator */

/**
 * How fresh an observation is.
 *
 * "Stale" is a fact about the record, not a failure: the commodity's
 * freshness window is configurable, and the UI says when a figure passed it.
 */
export function DataFreshnessIndicator({
  collectedAt,
  freshnessHours = DEFAULT_FRESHNESS_HOURS,
  precision = 'minute',
  className = '',
}: {
  collectedAt: string;
  freshnessHours?: number;
  precision?: 'minute' | 'date';
  className?: string;
}) {
  const stale = isStale(collectedAt, freshnessHours);
  const label =
    precision === 'date'
      ? formatDateTime(collectedAt).split(',')[0]
      : relativeTime(collectedAt);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${stale ? 'text-warning-700' : 'text-ink-500'} ${className}`}
      title={
        stale
          ? `Collected ${formatDateTime(collectedAt)} — outside the ${freshnessHours}-hour freshness window for this commodity.`
          : `Collected ${formatDateTime(collectedAt)}`
      }
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${stale ? 'bg-warning-500' : 'bg-success-500'}`}
      />
      <span>
        Collected {label}
        {stale ? ' — outside the freshness window' : ''}
      </span>
    </span>
  );
}

/* --------------------------------------------------------- verification badge */

/**
 * The verification state of a record.
 *
 * Only a record that passed verification is labelled "Verified". Submitted but
 * unreviewed records are labelled as pending, and migrated legacy records stay
 * labelled as unverified.
 */
export function VerificationBadge({
  status,
  className = '',
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const meta = VERIFICATION_STATUS_META[status];
  const tone =
    status === 'verified'
      ? 'bg-leaf-100 text-leaf-700 border-leaf-200'
      : status === 'pending_verification'
        ? 'bg-info-50 text-info-700 border-info-200'
        : status === 'rejected'
          ? 'bg-red-50 text-error-700 border-red-200'
          : status === 'correction_requested'
            ? 'bg-harvest-100 text-harvest-700 border-harvest-200'
            : 'bg-ink-100 text-ink-600 border-ink-200';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tone} ${className}`}
      title={meta.description}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}

/* -------------------------------------------------------- source attribution */

/** Where a figure came from, and what state it is in. */
export function SourceAttribution({
  observation,
  className = '',
}: {
  observation: Pick<
    PriceObservation,
    'sourceSystem' | 'sourceReference' | 'collectedAt' | 'publishedAt' | 'collectedAtPrecision'
  >;
  className?: string;
}) {
  const sourceLabel =
    observation.sourceSystem === 'legacy_import'
      ? 'Migrated from the previous Pluck Live site'
      : observation.sourceSystem === 'agent_app'
        ? 'Collected by a field agent'
        : 'Entered manually';
  return (
    <p className={`text-xs text-ink-500 ${className}`}>
      Source: <span className="text-ink-700">{sourceLabel}</span>
      {observation.sourceReference ? ` (${observation.sourceReference})` : ''}
      {' · '}
      Collected {formatDateTime(observation.collectedAt)}
      {observation.collectedAtPrecision === 'date' ? ' (day only)' : ''}
      {observation.publishedAt ? ` · Published ${formatDateTime(observation.publishedAt)}` : ''}
    </p>
  );
}

/* ------------------------------------------------------- intelligence metric */

/**
 * The analytical card used across the public site and the Control Centre.
 *
 * Every card can link to the records behind it, so a figure is never a dead
 * end. The `source` line states where the number came from.
 */
export function IntelligenceMetricCard({
  label,
  value,
  detail,
  changePercent,
  href,
  source,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  detail?: ReactNode;
  changePercent?: number | null;
  /** A link to the filtered records behind the figure. */
  href?: string;
  source?: string;
  tone?: 'default' | 'brand' | 'sand';
}) {
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p
        className={`figure mt-2 text-3xl ${
          tone === 'brand' ? 'text-brand-800' : tone === 'sand' ? 'text-earth-700' : 'text-ink-950'
        }`}
      >
        {value}
      </p>
      {detail ? <div className="mt-1 text-sm text-ink-600">{detail}</div> : null}
      {changePercent !== undefined ? (
        <div className="mt-2">
          <PriceMovementIndicator changePercent={changePercent} />
        </div>
      ) : null}
      {source ? <p className="mt-2 text-[0.7rem] text-ink-400">{source}</p> : null}
    </>
  );

  const surface =
    tone === 'brand'
      ? 'bg-brand-800 border-brand-800 text-white'
      : tone === 'sand'
        ? 'bg-sand-100 border-sand-200'
        : 'bg-white border-ink-200';

  if (href) {
    return (
      <Link
        href={href}
        className={`card card-hover flex flex-col justify-between p-5 ${surface} ${
          tone === 'brand' ? 'text-white' : ''
        }`}
      >
        <div
          className={
            tone === 'brand'
              ? '[&_p]:text-white/80 [&_.figure]:text-white'
              : ''
          }
        >
          {body}
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
          Open the records
          <span aria-hidden="true">→</span>
        </span>
      </Link>
    );
  }

  return <div className={`card flex flex-col justify-between p-5 ${surface}`}>{body}</div>;
}

/* ---------------------------------------------------------------- price card */

/** A single published price, with everything that makes it auditable. */
export function PriceCard({
  observation,
  unitLabel,
  freshnessHours,
  href,
}: {
  observation: PriceObservation;
  unitLabel?: string | null;
  freshnessHours?: number;
  href?: string;
}) {
  const priceType = PRICE_TYPE_META[observation.priceType];
  const heading = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">
            {observation.commodityName ?? 'Commodity'}
          </p>
          <p className="truncate text-xs text-ink-500">
            {observation.marketName ?? 'Market'}
            {observation.stateName ? ` · ${observation.stateName}` : ''}
          </p>
        </div>
        <VerificationBadge status={observation.verificationStatus} />
      </div>

      <p className="figure mt-3 text-2xl text-ink-950">
        {formatMoney(observation.reportedAmount, { currency: observation.currencyCode })}
        <span className="ml-1 text-xs font-normal text-ink-500">
          {unitLabel ?? observation.unitCode ?? ''}
        </span>
      </p>

      <p className="mt-1 text-xs text-ink-500">
        {priceType?.label ?? observation.priceType}
        {observation.gradeName ? ` · ${observation.gradeName}` : ''}
      </p>

      <div className="mt-3">
        <DataFreshnessIndicator
          collectedAt={observation.collectedAt}
          freshnessHours={freshnessHours ?? DEFAULT_FRESHNESS_HOURS}
        />
      </div>
    </>
  );

  const className = 'card card-hover flex flex-col p-5';

  if (href) {
    return (
      <Link href={href} className={className}>
        {heading}
      </Link>
    );
  }

  return <article className={className}>{heading}</article>;
}

/* --------------------------------------------------------------- error state */

/** The shared error state. It never swallows the error detail. */
export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="card border-red-200 bg-red-50 p-6">
      <h3 className="font-display text-base font-bold text-error-700">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------- filter panel */

/**
 * A panel of filters.
 *
 * Filters are a plain GET form so they work without JavaScript, can be
 * bookmarked and can be shared.
 */
export function FilterPanel({
  children,
  action,
  title,
  className = '',
}: {
  children: ReactNode;
  action: string;
  title?: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className={`card p-4 ${className}`}
      aria-label={title ?? 'Filters'}
    >
      {title ? (
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-500">{title}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
        >
          Apply filters
        </button>
        <Link
          href={action}
          className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-ink-300"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}

/** A labelled select inside a filter panel. */
export function FilterSelect({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-600">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ''}
        className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* -------------------------------------------------------- date range selector */

/**
 * The period selector.
 *
 * The windows are the ones the product promises: 7 days, 30 days, 90 days,
 * one year and all time.
 */
export function DateRangeSelector({
  windows,
  active,
  paramName = 'window',
  className = '',
}: {
  windows: { label: string; days: number | null; title?: string }[];
  active: string;
  paramName?: string;
  className?: string;
}) {
  return (
    <nav aria-label="Period" className={`flex flex-wrap gap-1.5 ${className}`}>
      {windows.map((window) => (
        <Link
          key={window.label}
          href={`?${paramName}=${encodeURIComponent(window.label)}`}
          aria-current={window.label === active ? 'page' : undefined}
          title={window.title}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            window.label === active
              ? 'bg-brand-700 text-white'
              : 'bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-800'
          }`}
        >
          {window.label}
        </Link>
      ))}
    </nav>
  );
}
