import Link from 'next/link';
import { PriceChart, ObservationCountChart } from '@/components/data/PriceChart';
import { MarketComparisonTable } from '@/components/data/PriceTable';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { Breadcrumbs, EmptyState, SectionHeading } from '@/components/ui';
import { buildSeries, summariseByMarket } from '@/lib/pricing';
import { formatDate, formatMoney } from '@/lib/money';
import { PRICE_TYPE_META } from '@/types/domain';
import type { Commodity, PriceObservation } from '@/types/domain';

export const PRICE_RANGES = [
  { key: '30', label: '30 days', days: 30 },
  { key: '90', label: '90 days', days: 90 },
  { key: '365', label: '12 months', days: 365 },
  { key: 'all', label: 'All time', days: null },
] as const;

export interface CommodityPriceViewProps {
  commodity: Commodity;
  /** Every published observation for the commodity, newest range included. */
  observations: PriceObservation[];
  /** The selected time range. */
  range: { key: string; label: string; days: number | null };
  /** Base path used for the range links, e.g. `/prices/paddy-rice`. */
  basePath: string;
  breadcrumbs: { href?: string; label: string }[];
  /** Eyebrow above the title, e.g. "Price directory" or "Commodity". */
  eyebrow?: string;
}

/**
 * The price view for a single commodity: summary, history chart, per-market
 * comparison and the units/price types that were recorded.
 *
 * It is shared by `/commodities/[slug]` (the catalogue entry) and
 * `/prices/[commodity]` (the price directory entry) so the two routes can
 * never drift apart. Everything shown here is derived from published
 * observations; there are no hand-written summaries and no forecast values.
 */
export function CommodityPriceView({
  commodity,
  observations: allObservations,
  range,
  basePath,
  breadcrumbs,
  eyebrow,
}: CommodityPriceViewProps) {
  const cutoff = range.days
    ? new Date(Date.now() - range.days * 86_400_000).toISOString()
    : null;

  const observations = cutoff
    ? allObservations.filter((o) => o.collectedAt >= cutoff)
    : allObservations;

  const series = buildSeries(observations);
  const summaries = summariseByMarket(observations);

  const priceTypes = Array.from(new Set(observations.map((o) => o.priceType)));
  const units = Array.from(
    new Set(observations.map((o) => `${o.unitCode ?? 'none'}:${o.unitIsSpecific}`)),
  ).map((pair) => {
    const [code, specific] = pair.split(':');
    return { code, specific: specific === 'true' };
  });

  const latestCollectedAt = allObservations.length
    ? allObservations.reduce<string | null>(
        (acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc),
        null,
      )
    : null;

  const hasData = observations.length > 0;

  return (
    <div className="section">
      <div className="container-page">
        <Breadcrumbs items={breadcrumbs} />

        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-700">
              {eyebrow ?? commodity.categoryName}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{commodity.name}</h1>
            {commodity.description ? (
              <p className="mt-3 text-base leading-relaxed text-ink-600">{commodity.description}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-ink-100 px-3 py-1 font-medium text-ink-700">
                {commodity.marketCount ?? 0} market{(commodity.marketCount ?? 0) === 1 ? '' : 's'}
              </span>
              <span className="rounded-full bg-ink-100 px-3 py-1 font-medium text-ink-700">
                {allObservations.length} observation{allObservations.length === 1 ? '' : 's'}
              </span>
              {commodity.synonyms && commodity.synonyms.length > 0 ? (
                <span className="rounded-full bg-ink-100 px-3 py-1 text-ink-600">
                  also known as {commodity.synonyms.slice(0, 3).join(', ')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="card shrink-0 p-5 lg:w-72">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">
              Published summary
            </h2>
            {summaries.length > 0 ? (
              <>
                <p className="mt-3 text-3xl font-black tracking-tight text-ink-950">
                  {formatMoney(summaries[0]!.medianAmount)}
                </p>
                <p className="mt-1 text-xs text-ink-500">
                  Median of {summaries[0]!.observationCount} observation
                  {summaries[0]!.observationCount === 1 ? '' : 's'} at{' '}
                  {summaries[0]!.marketName}
                </p>
                <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
                  {summaries.length} market{summaries.length === 1 ? '' : 's'} reporting ·{' '}
                  {priceTypes.length} price type{priceTypes.length === 1 ? '' : 's'}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-500">
                No published observations for this commodity yet.
              </p>
            )}
          </div>
        </header>

        <div className="mt-6">
          <DataCoverageNotice
            latestCollectedAt={latestCollectedAt}
            observationCount={allObservations.length}
          />
        </div>

        {!hasData ? (
          <div className="mt-8">
            <EmptyState
              title="No published price observations for this commodity"
              description={
                allObservations.length === 0
                  ? 'This commodity is in the catalogue, but no price observation has been collected and published for it yet. We do not publish placeholder prices.'
                  : 'No observations fall inside the selected time window. Widen the range to see the full history.'
              }
              action={
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {allObservations.length > 0 ? (
                    <Link
                      href={`${basePath}?range=all`}
                      className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                    >
                      Show all time
                    </Link>
                  ) : null}
                  <Link
                    href="/prices"
                    className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
                  >
                    Browse all prices
                  </Link>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* ------------------------------------------------- history -- */}
            <section className="mt-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Price history</h2>
                  <p className="mt-1 text-sm text-ink-600">
                    Median price per day. The shaded band is the observed minimum-to-maximum range,
                    so a day with a single report is visibly thinner than a settled market.
                  </p>
                </div>

                <nav aria-label="Time range" className="flex flex-wrap gap-2">
                  {PRICE_RANGES.map((r) => (
                    <Link
                      key={r.key}
                      href={`${basePath}?range=${r.key}`}
                      aria-current={r.key === range.key ? 'page' : undefined}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        r.key === range.key
                          ? 'border-brand-700 bg-brand-700 text-white'
                          : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-800'
                      }`}
                    >
                      {r.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="card mt-5 p-5">
                <PriceChart
                  series={[
                    {
                      key: 'commodity',
                      label: commodity.name,
                      points: series,
                      color: '#0C8430',
                    },
                  ]}
                />

                <details className="mt-4 border-t border-ink-100 pt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-ink-700">
                    Observations per day
                  </summary>
                  <div className="mt-3">
                    <ObservationCountChart
                      series={[
                        {
                          key: 'commodity',
                          label: commodity.name,
                          points: series,
                          color: '#00D084',
                        },
                      ]}
                    />
                  </div>
                </details>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    First observation
                  </dt>
                  <dd className="mt-1 font-bold text-ink-900">{formatDate(series[0]?.date)}</dd>
                </div>
                <div className="card p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Latest observation
                  </dt>
                  <dd className="mt-1 font-bold text-ink-900">
                    {formatDate(series[series.length - 1]?.date)}
                  </dd>
                </div>
                <div className="card p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Lowest observed
                  </dt>
                  <dd className="mt-1 font-bold text-ink-900">
                    {formatMoney(Math.min(...series.map((p) => p.min)))}
                  </dd>
                </div>
                <div className="card p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Highest observed
                  </dt>
                  <dd className="mt-1 font-bold text-ink-900">
                    {formatMoney(Math.max(...series.map((p) => p.max)))}
                  </dd>
                </div>
              </dl>
            </section>

            {/* ----------------------------------------------- comparison -- */}
            <section className="mt-14">
              <SectionHeading
                align="left"
                eyebrow="Cross-market view"
                title={`${commodity.name} by market`}
                description="The same commodity at the same price type, compared across the markets that reported it."
              />

              <div className="mt-5">
                <MarketComparisonTable
                  rows={summaries}
                  caption={`Published prices for ${commodity.name} by market`}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="card p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-ink-600">
                    Price types recorded
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {priceTypes.map((type) => (
                      <li key={type} className="text-sm text-ink-700">
                        <span className="font-semibold">{PRICE_TYPE_META[type].label}</span>
                        <span className="block text-xs text-ink-500">
                          {PRICE_TYPE_META[type].description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-ink-600">
                    Measurement units
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {units.map((unit) => (
                      <li key={unit.code} className="text-sm text-ink-700">
                        <span className="font-semibold">
                          {unit.code === 'none' ? 'not recorded' : unit.code}
                        </span>
                        {!unit.specific ? (
                          <span className="block text-xs text-amber-800">
                            The source record did not state a unit, so these figures may not be
                            directly comparable with figures that do.
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {units.some((u) => !u.specific) ? (
                    <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
                      Pluck Live never converts a price between units unless the conversion is
                      verified. Where the unit is missing, the original figure is shown as reported.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        )}

        <div className="mt-14 flex flex-wrap gap-3">
          <Link
            href={`/compare?commodity=${commodity.slug}`}
            className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Compare {commodity.name} across markets
          </Link>
          <Link
            href="/prices"
            className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
          >
            All prices
          </Link>
        </div>
      </div>
    </div>
  );
}
