import Link from 'next/link';
import type { Metadata } from 'next';
import { MarketComparisonTable } from '@/components/data/PriceTable';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { Breadcrumbs, EmptyState, SectionHeading } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { summariseByMarket } from '@/lib/pricing';
import { formatDate, formatMoney } from '@/lib/money';
import { PRICE_TYPE_META, type PriceType } from '@/types/domain';

export const metadata: Metadata = {
  title: 'Compare prices across markets',
  description:
    'Compare the same commodity, grade, price type and unit across Nigerian markets. Incompatible units and price types are never placed side by side.',
  alternates: { canonical: '/compare' },
};

interface Params {
  searchParams: Promise<{ commodity?: string; price_type?: string }>;
}

export default async function ComparePage({ searchParams }: Params) {
  const params = await searchParams;
  const source = await getDataSource();

  const [commodities, markets, allObservations] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    source.listObservationsForAnalysis({}),
  ]);

  const selected = params.commodity
    ? commodities.find((c) => c.slug === params.commodity)
    : commodities.find((c) => (c.observationCount ?? 0) > 0);

  const observations = selected
    ? allObservations.filter((o) => o.commodityId === selected.id)
    : [];

  // Price types actually present for this commodity.
  const availablePriceTypes = Array.from(new Set(observations.map((o) => o.priceType)));

  const requestedType = params.price_type as PriceType | undefined;
  const priceType =
    requestedType && availablePriceTypes.includes(requestedType)
      ? requestedType
      : availablePriceTypes[0];

  const typed = priceType ? observations.filter((o) => o.priceType === priceType) : [];

  // Only one unit bucket may be compared at a time, and only if the units are
  // actually compatible. If the records carry different units we say so rather
  // than placing them side by side.
  const unitBuckets = new Map<string, typeof typed>();
  for (const observation of typed) {
    const key = `${observation.reportedUnitId ?? 'none'}`;
    const list = unitBuckets.get(key) ?? [];
    list.push(observation);
    unitBuckets.set(key, list);
  }

  const bucketEntries = [...unitBuckets.entries()];
  const primaryBucket = bucketEntries.sort((a, b) => b[1].length - a[1].length)[0];
  const incompatibleBuckets = bucketEntries.filter(([key]) => key !== primaryBucket?.[0]);

  const summaries = primaryBucket ? summariseByMarket(primaryBucket[1]) : [];

  const unitIsSpecific = primaryBucket
    ? primaryBucket[1].every((o) => o.unitIsSpecific !== false)
    : false;

  const latestCollectedAt = observations.length
    ? observations.reduce<string | null>(
        (acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc),
        null,
      )
    : null;

  const fieldClass =
    'w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none';

  return (
    <div className="section">
      <div className="container-page">
        <Breadcrumbs items={[{ label: 'Compare' }]} />

        <SectionHeading
          align="left"
          eyebrow="Market comparison"
          title="Compare prices across markets"
          description="Pick one commodity and one price type. We only place figures side by side when they share a compatible measurement unit — prices quoted per bag and prices quoted per kilogram are never compared as if they were the same thing."
        />

        <form method="GET" action="/compare" className="card mt-8 grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <label htmlFor="commodity" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Commodity
            </label>
            <select id="commodity" name="commodity" defaultValue={selected?.slug ?? ''} className={fieldClass}>
              <option value="">Choose a commodity…</option>
              {commodities.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                  {(c.observationCount ?? 0) === 0 ? ' — no prices yet' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price_type" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-600">
              Price type
            </label>
            <select
              id="price_type"
              name="price_type"
              defaultValue={priceType ?? ''}
              disabled={availablePriceTypes.length === 0}
              className={`${fieldClass} disabled:bg-ink-100 disabled:text-ink-400`}
            >
              {availablePriceTypes.length === 0 ? (
                <option value="">No price types recorded</option>
              ) : (
                availablePriceTypes.map((type) => (
                  <option key={type} value={type}>
                    {PRICE_TYPE_META[type].label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
            >
              Compare
            </button>
          </div>
        </form>

        <div className="mt-6">
          <DataCoverageNotice
            latestCollectedAt={latestCollectedAt}
            observationCount={observations.length}
          />
        </div>

        {!selected || observations.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing to compare for this commodity"
              description="This commodity has no published price observations yet. Choose another commodity, or browse the price directory to see everything currently published."
              action={
                <Link
                  href="/prices"
                  className="mt-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                >
                  Browse the price directory
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {priceType ? (
              <p className="mt-8 rounded-xl border border-ink-200 bg-white px-5 py-4 text-sm text-ink-600">
                <span className="font-semibold text-ink-900">{PRICE_TYPE_META[priceType].label}</span> —{' '}
                {PRICE_TYPE_META[priceType].description}
              </p>
            ) : null}

            {!unitIsSpecific ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
                <span className="font-semibold">Unit not recorded in the source data.</span> The
                migrated records for {selected.name} do not state a measurement unit, so these
                figures may not be directly comparable with each other or with any unit-quoted
                price. They are shown exactly as they were published.
              </p>
            ) : null}

            {incompatibleBuckets.length > 0 ? (
              <p className="mt-4 rounded-xl border border-ink-200 bg-ink-100 px-5 py-4 text-sm leading-relaxed text-ink-700">
                <span className="font-semibold">Other units excluded.</span> This commodity also has{' '}
                {incompatibleBuckets.length} observation group
                {incompatibleBuckets.length === 1 ? '' : 's'} recorded in a different measurement
                unit. {incompatibleBuckets.reduce((total, [, list]) => total + list.length, 0)}{' '}
                observation
                {incompatibleBuckets.reduce((total, [, list]) => total + list.length, 0) === 1
                  ? ' is'
                  : 's are'}{' '}
                held back rather than compared across incompatible units.
              </p>
            ) : null}

            <div className="mt-6">
              {summaries.length > 0 ? (
                <MarketComparisonTable
                  rows={summaries}
                  caption={`${selected.name} compared across markets`}
                />
              ) : (
                <EmptyState
                  title="No comparable observations"
                  description="Observations exist for this commodity but not for the selected price type, so there is nothing that can legitimately be compared."
                />
              )}
            </div>

            {/* ------------------------------------------- raw per-market -- */}
            <section className="mt-12">
              <h2 className="text-2xl font-bold tracking-tight">Every observation</h2>
              <p className="mt-1 text-sm text-ink-600">
                The underlying records behind the summary, newest first. {observations.length}{' '}
                observation{observations.length === 1 ? '' : 's'} across{' '}
                {new Set(observations.map((o) => o.marketId)).size} market
                {new Set(observations.map((o) => o.marketId)).size === 1 ? '' : 's'}.
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ink-200 bg-white text-left">
                      <th scope="col" className="rounded-l-xl px-5 py-3 font-semibold text-ink-700">
                        Market
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                        Price
                      </th>
                      <th scope="col" className="px-5 py-3 font-semibold text-ink-700">
                        Collected
                      </th>
                      <th scope="col" className="rounded-r-xl px-5 py-3 font-semibold text-ink-700">
                        Verified
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {observations
                      .slice()
                      .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
                      .map((observation) => (
                        <tr key={observation.id}>
                          <td className="px-5 py-3">
                            <Link
                              href={`/markets/${observation.marketSlug}`}
                              className="font-medium text-ink-800 hover:text-brand-700"
                            >
                              {observation.marketName}
                            </Link>
                            <span className="block text-xs text-ink-500">{observation.stateName}</span>
                          </td>
                          <td className="px-5 py-3 font-semibold text-ink-900">
                            {formatMoney(observation.normalizedAmount ?? observation.reportedAmount, {
                              currency: observation.currencyCode,
                            })}
                          </td>
                          <td className="px-5 py-3 text-ink-700">{formatDate(observation.collectedAt)}</td>
                          <td className="px-5 py-3 text-ink-700">
                            {observation.verifiedAt ? formatDate(observation.verifiedAt) : 'Not verified'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mt-6 text-xs text-ink-500">
              Summary rule: the median of the underlying observations for each market, with the
              range and observation count shown. The summary is computed at{' '}
              {formatDate(new Date().toISOString())}. {markets.length} markets are listed in the
              directory; only those with published observations for {selected.name} appear above.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
