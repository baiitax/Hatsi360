import Link from 'next/link';
import type {
  Commodity,
  CommodityCategory,
  Market,
  PriceObservation,
} from '@/types/domain';
import { PRICE_TYPE_META } from '@/types/domain';
import { formatMoney, formatDate, formatDateTime } from '@/lib/money';
import { BRAND } from '@/lib/brand';
import { CategoryGlyph } from './CategoryGlyph';
import { CHART_COLOURS, STATUS_COLOURS } from '@/lib/chart-colours';
import { VerificationBadge } from '@/components/ui/data-display';
import { getCategoryImage, getCommodityImage, getPageImage } from '@/lib/images/registry';
import { HatsiImage } from '@/components/media/HatsiImage';

/**
 * The marketing sections of the Hatsi360 website.
 *
 * Every figure rendered here comes from a record. Where a record does not
 * exist the section says so rather than showing a number.
 */

/* ------------------------------------------------------------- market pulse */

export function MarketPulse({
  observations,
  units,
}: {
  observations: PriceObservation[];
  units: Map<number, string>;
}) {
  if (observations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-8 text-center">
        <p className="font-display text-lg font-semibold text-ink-800">
          No eligible price observations yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          The market pulse shows the most recent published observations, with their market,
          unit, price type and collection time. Nothing has been published for the markets under
          coverage so far.
        </p>
        <Link
          href="/coverage"
          className="mt-4 inline-flex rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          See collection coverage
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-700">
          Latest eligible observations
        </p>
        <Link href="/prices" className="text-xs font-semibold text-brand-700 hover:text-brand-800">
          View all &rarr;
        </Link>
      </div>
      <ul className="divide-y divide-ink-100">
        {observations.map((observation) => (
          <li
            key={observation.id}
            className="grid grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">
                {observation.commodityName ?? 'Commodity'}
              </p>
              <p className="truncate text-xs text-ink-500">
                {observation.marketName ?? 'Market'}
                {observation.stateName ? ` · ${observation.stateName}` : ''}
                {' · '}
                {PRICE_TYPE_META[observation.priceType]?.shortLabel ?? observation.priceType}
              </p>
            </div>
            <div className="hidden text-xs text-ink-500 sm:block">
              <p>
                Collected {formatDate(observation.collectedAt)}
                {observation.collectedAtPrecision === 'date' ? ' (day only)' : ''}
              </p>
              <p className="text-ink-400">
                {observation.verificationStatus === 'legacy_unverified'
                  ? 'Published — legacy record, unverified'
                  : observation.verificationStatus === 'verified'
                    ? 'Published — verified'
                    : observation.verificationStatus}
              </p>
            </div>
            <p className="figure whitespace-nowrap text-right text-base text-ink-950">
              {formatMoney(observation.reportedAmount, { currency: observation.currencyCode })}
              <span className="ml-1 text-xs font-normal text-ink-500">
                {observation.reportedUnitId ? units.get(observation.reportedUnitId) ?? '' : ''}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- categories */

export function CategoryGrid({
  categories,
  commodityCounts,
}: {
  categories: CommodityCategory[];
  commodityCounts: Map<number, number>;
}) {
  const visible = categories.slice(0, 12);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {visible.map((category) => {
        const image = getCategoryImage(category.slug);
        return (
          <Link
            key={category.id}
            href={`/commodities?category=${category.slug}`}
            className="card card-hover group flex flex-col overflow-hidden"
          >
            <HatsiImage
              asset={image}
              sizes="(min-width: 1024px) 18rem, (min-width: 640px) 28vw, 45vw"
              ratio="landscape"
              className="rounded-t-[0.875rem]"
              imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
            <span className="flex flex-col gap-2 p-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100">
                <CategoryGlyph slug={category.slug} size={26} />
              </span>
              <span className="font-display text-sm font-bold text-ink-900 group-hover:text-brand-700">
                {category.name}
              </span>
              <span className="text-xs text-ink-500">
                {commodityCounts.get(category.id) ?? 0} commodit
                {(commodityCounts.get(category.id) ?? 0) === 1 ? 'y' : 'ies'}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------ featured commodities */

export interface LatestCommodityPrice {
  amount: number;
  currencyCode: string;
  unitLabel: string;
  marketName: string;
  marketSlug: string | null;
  collectedAt: string;
  status: PriceObservation['verificationStatus'];
}

/**
 * The commodities that currently have a published price.
 *
 * The card shows the latest figure, its unit, its market, the date it was
 * collected and the verification state. Nothing here is estimated: a
 * commodity without a published figure is not shown in this list.
 */
export function FeaturedCommodities({
  commodities,
  latestByCommodity,
}: {
  commodities: Commodity[];
  latestByCommodity: Map<number, LatestCommodityPrice>;
}) {
  if (commodities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 bg-ink-50 p-8 text-center">
        <p className="font-display text-lg font-semibold text-ink-800">
          No commodity has a published price yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          The catalogue is in place and collection is under way. Until an observation is verified
          and published, no price is shown.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {commodities.map((commodity) => {
        const latest = latestByCommodity.get(commodity.id);
        const image = getCommodityImage(commodity.slug);
        return (
          <article key={commodity.id} className="card card-hover group flex flex-col overflow-hidden">
            <HatsiImage
              asset={image}
              sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
              ratio="landscape"
              className="rounded-t-[0.875rem]"
              imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
            <div className="flex flex-1 flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  {commodity.categoryName}
                </p>
                <h3 className="mt-1 text-base font-bold leading-tight">
                  <Link
                    href={`/commodities/${commodity.slug}`}
                    className="transition-colors hover:text-brand-700"
                  >
                    {commodity.name}
                  </Link>
                </h3>
              </div>
              {latest ? <VerificationBadge status={latest.status} /> : null}
            </div>

            {latest ? (
              <>
                <p className="figure mt-3 text-2xl text-ink-950">
                  {formatMoney(latest.amount, { currency: latest.currencyCode })}
                  <span className="ml-1 text-xs font-normal text-ink-500">
                    {latest.unitLabel ? `/ ${latest.unitLabel}` : ''}
                  </span>
                </p>
                <p className="mt-1 truncate text-xs text-ink-500">
                  {latest.marketName} &middot; collected {formatDate(latest.collectedAt)}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm italic leading-relaxed text-ink-500">
                No published price for this commodity yet.
              </p>
            )}

            <Link
              href={`/commodities/${commodity.slug}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Price history and markets
              <span aria-hidden="true">→</span>
            </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- coverage */

/**
 * The coverage visualisation.
 *
 * A market is plotted only where its coordinates are verified. Where they are
 * not, the market appears in the list instead — the coverage is never
 * embellished to look complete.
 *
 * Four states are distinguished, so an inactive market is never presented as
 * an actively monitored one:
 *
 *   active    — published observations inside the freshness window
 *   stale     — published observations, but outside the freshness window
 *   registered— in the catalogue, no published observation yet
 *   awaiting  — scheduled for field coverage, not yet in the catalogue
 */
export type CoverageStatus = 'active' | 'stale' | 'registered';

export const COVERAGE_STATUS_META: Record<
  CoverageStatus,
  { label: string; detail: string; className: string }
> = {
  active: {
    label: 'Reporting',
    detail: 'Published observations inside the freshness window',
    className: 'bg-leaf-100 text-leaf-700',
  },
  stale: {
    label: 'Stale',
    detail: 'Published observations, but outside the freshness window',
    className: 'bg-harvest-100 text-harvest-700',
  },
  registered: {
    label: 'Not yet reporting',
    detail: 'In the catalogue, with no published observation yet',
    className: 'bg-ink-100 text-ink-500',
  },
};

export function CoverageMap({
  markets,
  reportingMarketIds,
  statusByMarket,
}: {
  markets: Market[];
  reportingMarketIds: Set<number>;
  statusByMarket?: Map<number, CoverageStatus>;
}) {
  const plotted = markets.filter(
    (market) =>
      typeof market.latitude === 'number' &&
      typeof market.longitude === 'number' &&
      market.latitude !== null &&
      market.longitude !== null,
  );
  const unplotted = markets.filter((market) => !plotted.includes(market));

  const statusFor = (market: Market): CoverageStatus =>
    statusByMarket?.get(market.id) ??
    (reportingMarketIds.has(market.id) ? 'active' : 'registered');

  const counts = markets.reduce(
    (accumulator, market) => {
      const status = statusFor(market);
      accumulator[status] += 1;
      return accumulator;
    },
    { active: 0, stale: 0, registered: 0 } as Record<CoverageStatus, number>,
  );

  const lats = plotted.map((market) => market.latitude as number);
  const lngs = plotted.map((market) => market.longitude as number);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.5);
  const spanLng = Math.max(maxLng - minLng, 0.5);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="card overflow-hidden p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-700">
          Coverage map
        </h3>
        {plotted.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink-300 p-5 text-sm text-ink-500">
            No market in the catalogue has verified coordinates yet, so no map is drawn. The
            directory below is the complete, honest picture.
          </p>
        ) : (
          <>
            <svg
              viewBox="0 0 100 100"
              className="mt-4 h-64 w-full"
              role="img"
              aria-label={`Map of ${plotted.length} markets with verified coordinates`}
            >
              <rect x="0" y="0" width="100" height="100" rx="3" fill={CHART_COLOURS.band} />
              {plotted.map((market) => {
                const x = 8 + ((market.longitude as number) - minLng) / spanLng * 84;
                const y = 92 - ((market.latitude as number) - minLat) / spanLat * 84;
                const status = statusFor(market);
                const fill =
                  status === 'active'
                      ? STATUS_COLOURS.active
                      : status === 'stale'
                        ? STATUS_COLOURS.stale
                        : STATUS_COLOURS.registered;
                return (
                  <g key={market.id}>
                    <circle cx={x} cy={y} r="4" fill={fill} stroke={CHART_COLOURS.surface} strokeWidth="1.2">
                      <title>
                        {market.name}
                        {market.stateName ? `, ${market.stateName}` : ''} —{' '}
                        {COVERAGE_STATUS_META[status].detail}
                      </title>
                    </circle>
                  </g>
                );
              })}
            </svg>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-brand-600" />
                Reporting
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-harvest-500" />
                Stale
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-earth-300" />
                Catalogue only — no published observations yet
              </span>
            </p>
          </>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4">
          {(['active', 'stale', 'registered'] as CoverageStatus[]).map((status) => (
            <div key={status}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {COVERAGE_STATUS_META[status].label}
              </dt>
              <dd className="figure mt-1 text-xl text-ink-900">{counts[status]}</dd>
              <dd className="mt-0.5 text-[0.7rem] leading-snug text-ink-500">
                {COVERAGE_STATUS_META[status].detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-700">
          Markets in the catalogue
        </h3>
        <ul className="mt-4 divide-y divide-ink-100">
          {markets.map((market) => {
            const status = statusFor(market);
            return (
              <li key={market.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/markets/${market.slug}`}
                    className="truncate text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {market.name}
                  </Link>
                  <p className="truncate text-xs text-ink-500">{market.stateName ?? 'Nigeria'}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${COVERAGE_STATUS_META[status].className}`}
                >
                  {COVERAGE_STATUS_META[status].label}
                </span>
              </li>
            );
          })}
        </ul>
        {unplotted.length > 0 ? (
          <p className="mt-3 text-xs text-ink-500">
            {unplotted.length} market{unplotted.length === 1 ? '' : 's'} have no verified
            coordinates, so {unplotted.length === 1 ? 'it is' : 'they are'} listed rather than
            plotted.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- comparison */

export interface ComparisonRow {
  commodityName: string;
  commoditySlug: string | null;
  priceType: string;
  unitLabel: string;
  entries: {
    marketName: string;
    marketSlug: string | null;
    stateName: string | null;
    amount: number;
    currencyCode: string;
    collectedAt: string;
  }[];
}

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-8 text-center">
        <p className="font-display text-lg font-semibold text-ink-800">
          No comparable observations yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          A comparison needs at least two markets reporting the same commodity, in the same unit
          and for the same price type. Nothing has met that condition yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((row) => {
        const amounts = row.entries.map((entry) => entry.amount);
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        return (
          <div key={`${row.commodityName}-${row.priceType}-${row.unitLabel}`} className="card overflow-hidden">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-100 px-5 py-3">
              <h3 className="font-display text-sm font-bold text-ink-900">{row.commodityName}</h3>
              <p className="text-xs text-ink-500">
                {PRICE_TYPE_META[row.priceType as keyof typeof PRICE_TYPE_META]?.label ??
                  row.priceType}
                {' · '}
                {row.unitLabel}
              </p>
            </div>
            <ul className="divide-y divide-ink-100">
              {row.entries.map((entry) => {
                const spread = max - min;
                const share = spread === 0 ? 0 : (entry.amount - min) / spread;
                return (
                  <li key={`${entry.marketName}-${entry.collectedAt}`} className="px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {entry.marketName}
                          {entry.stateName ? (
                            <span className="ml-1.5 font-normal text-ink-500">{entry.stateName}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-ink-500">
                          Collected {formatDate(entry.collectedAt)}
                        </p>
                      </div>
                      <p className="figure shrink-0 text-ink-950">
                        {formatMoney(entry.amount, { currency: entry.currencyCode })}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.max(6, share * 100)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-[0.7rem] text-ink-500">
                        {spread === 0
                          ? 'Only one figure'
                          : `${(((entry.amount - min) / spread) * 100).toFixed(0)}% of range`}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            {spread(max, min) > 0 ? (
              <p className="border-t border-ink-100 bg-ink-50 px-5 py-2.5 text-xs text-ink-600">
                Difference between the highest and lowest figure in this group:{' '}
                <span className="figure">{formatMoney(max - min, { currency: 'NGN' })}</span>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function spread(max: number, min: number): number {
  return max - min;
}

/* ----------------------------------------------------------------- trends */

export interface TrendPoint {
  day: string;
  value: number | null;
  observations: number;
}

export function TrendPanel({
  commodity,
  points,
  windows,
  activeWindow,
}: {
  commodity: Commodity | null;
  points: TrendPoint[];
  windows: { label: string; days: number | null }[];
  activeWindow: string;
}) {
  if (!commodity || points.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-300 bg-white p-8 text-center">
        <p className="font-display text-lg font-semibold text-ink-800">
          No historical series to draw yet
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
          A trend needs a commodity with more than one published observation on different days.
          Gaps are left as gaps; they are never filled in.
        </p>
      </div>
    );
  }

  const values = points.map((point) => point.value).filter((value): value is number => value !== null);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const range = max - min || 1;

  const width = 640;
  const height = 200;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const path = points
    .map((point, index) => {
      if (point.value === null) return null;
      const x = index * stepX;
      const y = height - ((point.value - min) / range) * (height - 24) - 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-700">
            Historical movement
          </h3>
          <p className="mt-1 text-sm text-ink-600">
            {commodity.name} — {points.length} day{points.length === 1 ? '' : 's'} with published
            observations
          </p>
        </div>
        <nav aria-label="Period" className="flex flex-wrap gap-1.5">
          {windows.map((window) => (
            <Link
              key={window.label}
              href={`?window=${encodeURIComponent(window.label)}`}
              aria-current={window.label === activeWindow ? 'page' : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                window.label === activeWindow
                  ? 'bg-brand-700 text-white'
                  : 'bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-800'
              }`}
            >
              {window.label}
            </Link>
          ))}
        </nav>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-5 h-48 w-full"
        role="img"
        aria-label={`${commodity.name} price history, ${points.length} days`}
      >
        <line x1="0" y1={height - 12} x2={width} y2={height - 12} stroke={CHART_COLOURS.grid} strokeWidth="1" />
        {points.map((point, index) =>
          point.value === null ? null : (
            <circle
              key={point.day}
              cx={index * stepX}
              cy={height - ((point.value - min) / range) * (height - 24) - 12}
              r="3"
              fill={CHART_COLOURS.primary}
            >
              <title>
                {point.day}: {point.value} ({point.observations} observation
                {point.observations === 1 ? '' : 's'})
              </title>
            </circle>
          ),
        )}
        {points.length > 1 ? (
          <polyline points={path} fill="none" stroke={CHART_COLOURS.primaryDeep} strokeWidth="2" strokeLinejoin="round" />
        ) : null}
      </svg>

      <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
        <span>{points[0]?.day}</span>
        <span>
          {values.length} day{values.length === 1 ? '' : 's'} of data. Days without a published
          observation are not interpolated.
        </span>
        <span>{points[points.length - 1]?.day}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- why us --- */

const DIFFERENTIATORS = [
  {
    title: 'Market-level price visibility',
    body: 'Prices are shown by market, not as a single national average, so a trader can see where the volume actually is.',
  },
  {
    title: 'Regional price comparison',
    body: 'Markets are compared only when the commodity, grade, unit and price type are compatible — never merged to look complete.',
  },
  {
    title: 'Verified price observations',
    body: 'Approval and publication are separate acts, each recorded. An unverified report is never shown as a market price.',
  },
  {
    title: 'Historical market intelligence',
    body: 'Every published figure stays in the record. A correction is appended with its reason; a published price is never silently overwritten.',
  },
  {
    title: 'Agricultural trade insights',
    body: 'Analysis is written for the trade, not for the chart: what moved, where it moved and what the record actually supports.',
  },
  {
    title: 'Business-focused reporting',
    body: 'Market reports and exports are produced from the same record the public sees, so a briefing and a screen never disagree.',
  },
  {
    title: 'Expanding market coverage',
    body: 'Coverage is stated as it is: which markets report, which are registered, and which are still being built.',
  },
  {
    title: 'Data provenance you can audit',
    body: 'Collection time, submission time, verification time and publication time travel with every figure.',
  },
];

export function WhyHatsi360() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {DIFFERENTIATORS.map((item) => (
        <div key={item.title} className="card p-5">
          <h3 className="font-display text-base font-bold text-ink-900">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- business audiences */

const AUDIENCES = [
  {
    title: 'Farmers',
    body: 'See the price being asked for in your market before you decide where to sell.',
  },
  {
    title: 'Aggregators',
    body: 'Plan procurement against recorded prices instead of last week’s rumour.',
  },
  {
    title: 'Commodity traders',
    body: 'Know what is being asked for, and where, before you commit.',
  },
  {
    title: 'Processors',
    body: 'Track input costs across the markets that supply your plants.',
  },
  {
    title: 'Exporters',
    body: 'Follow the export offers and the wholesale prices behind them.',
  },
  {
    title: 'Agricultural cooperatives',
    body: 'Give members one shared view of the market they are selling into.',
  },
  {
    title: 'Financial institutions',
    body: 'Historic series with documented provenance for lending and risk review.',
  },
  {
    title: 'Development organisations',
    body: 'Monitor how prices move in the markets your programmes touch.',
  },
  {
    title: 'Government agencies',
    body: 'Evidence for food security planning and market surveillance.',
  },
];

/**
 * The customer segments.
 *
 * The nine audiences are grouped into three panels, each led by a photograph
 * of the work that audience does. The panels carry the audience list; the
 * photograph carries the sense of place, and it is matched to the segment
 * rather than used as decoration.
 */
const SEGMENTS: {
  title: string;
  body: string;
  imageKey: string;
  audiences: string[];
}[] = [
  {
    title: 'Producers and traders',
    body: 'The people who move physical grain: they need the recorded price for their own market, and the recorded price in the neighbouring one.',
    imageKey: 'solutions.traders',
    audiences: ['Farmers', 'Aggregators', 'Commodity traders', 'Agricultural cooperatives'],
  },
  {
    title: 'Processors and exporters',
    body: 'The people who buy in bulk and ship out: they need input costs across the markets that supply their plants, and a defensible export basis.',
    imageKey: 'solutions.exporters',
    audiences: ['Processors', 'Exporters'],
  },
  {
    title: 'Institutions and policy',
    body: 'The people who need an evidence base: a documented series with provenance, a collection method they can audit, and coverage stated honestly.',
    imageKey: 'solutions.institutions',
    audiences: ['Financial institutions', 'Development organisations', 'Government agencies'],
  },
];

export function BusinessSolutions() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {SEGMENTS.map((segment) => {
        const image = getPageImage(segment.imageKey);
        const audiences = AUDIENCES.filter((audience) => segment.audiences.includes(audience.title));
        return (
          <article key={segment.title} className="card flex flex-col overflow-hidden">
            <HatsiImage
              asset={image}
              sizes="(min-width: 1024px) 24rem, 92vw"
              ratio="landscape"
              className="rounded-t-[0.875rem]"
            />
            <div className="flex flex-1 flex-col p-5">
              <h3 className="font-display text-base font-bold text-ink-900">{segment.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{segment.body}</p>
              <ul className="mt-4 space-y-2 border-t border-ink-100 pt-4">
                {audiences.map((audience) => (
                  <li key={audience.title} className="text-sm font-semibold text-ink-800">
                    {audience.title}
                    <span className="mt-0.5 block text-xs font-normal leading-relaxed text-ink-600">
                      {audience.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- utilities */

export function SectionIntro({
  eyebrow,
  title,
  body,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
        {title}
      </h2>
      {body ? <p className="mt-3 text-base leading-relaxed text-ink-600">{body}</p> : null}
    </div>
  );
}

/** A labelled timestamp, used wherever a figure needs its provenance visible. */
export function ProvenanceStamp({ observation }: { observation: PriceObservation }) {
  return (
    <p className="text-xs text-ink-500">
      Collected {formatDateTime(observation.collectedAt)}
      {observation.publishedAt ? ` · Published ${formatDate(observation.publishedAt)}` : ''}
      {observation.verificationStatus === 'legacy_unverified' ? ' · Legacy record, unverified' : ''}
    </p>
  );
}

export function BrandClaim({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-500">{children}</span>;
}

export const BRAND_NAME = BRAND.name;
