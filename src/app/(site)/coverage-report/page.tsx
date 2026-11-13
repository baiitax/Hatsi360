import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { getDataSource } from '@/lib/data';
import { formatDate } from '@/lib/money';
import { hoursSince } from '@/lib/pricing';
import { BRAND } from '@/lib/brand';
import { CoverageMap } from '@/components/marketing/sections';

/**
 * The coverage statement.
 *
 * This route implements the public URL `/coverage`; see `src/lib/route-map.ts`
 * for why the directory is named differently. The canonical URL stays
 * `/coverage` and the rewrite in `next.config.ts` keeps the browser there.
 */
export const metadata: Metadata = {
  title: 'Collection Coverage',
  description:
    'Where Hatsi360 collects agricultural commodity prices, which markets are reporting, how fresh the data is, and what is not yet covered.',
  alternates: { canonical: '/coverage' },
};

export default async function CoverageReportPage() {
  const source = await getDataSource();
  const [markets, commodities, observations] = await Promise.all([
    source.listMarkets(),
    source.listCommodities(),
    source.listObservationsForAnalysis({}),
  ]);

  const reportingMarketIds = new Set(observations.map((observation) => observation.marketId));

  const newest = observations.reduce<string | null>((latest, observation) => {
    if (!latest || observation.collectedAt > latest) return observation.collectedAt;
    return latest;
  }, null);

  const oldest = observations.reduce<string | null>((earliest, observation) => {
    if (!earliest || observation.collectedAt < earliest) return observation.collectedAt;
    return earliest;
  }, null);

  const commodityMarketPairs = new Set(
    observations.map((observation) => `${observation.commodityId}|${observation.marketId}`),
  );

  const states = new Map<string, { name: string; markets: number; reporting: number }>();
  for (const market of markets) {
    const key = market.stateName ?? 'Nigeria';
    const bucket = states.get(key) ?? { name: key, markets: 0, reporting: 0 };
    bucket.markets += 1;
    if (reportingMarketIds.has(market.id)) bucket.reporting += 1;
    states.set(key, bucket);
  }

  const priceTypes = new Map<string, number>();
  for (const observation of observations) {
    priceTypes.set(observation.priceType, (priceTypes.get(observation.priceType) ?? 0) + 1);
  }

  return (
    <>
      <PageHero
        eyebrow="Coverage"
        title="Where Hatsi360 collects — and where it does not"
        lede={`Coverage is the first question any serious user of a price platform should ask. ${BRAND.name} answers it with counts, not claims.`}
        breadcrumbs={[{ label: 'Coverage' }]}
        image={getPageImage('reports.coverage')}
      />

      <div className="section bg-ink-50">
        <div className="container-page space-y-10">
          {/* The numbers */}
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Markets reporting
              </dt>
              <dd className="mt-2 font-display text-3xl font-bold text-ink-950">
                {reportingMarketIds.size}
              </dd>
              <p className="mt-1 text-xs text-ink-500">of {markets.length} in the catalogue</p>
            </div>
            <div className="card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Commodities observed
              </dt>
              <dd className="mt-2 font-display text-3xl font-bold text-ink-950">
                {new Set(observations.map((observation) => observation.commodityId)).size}
              </dd>
              <p className="mt-1 text-xs text-ink-500">of {commodities.length} in the catalogue</p>
            </div>
            <div className="card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Commodity&ndash;market pairs
              </dt>
              <dd className="mt-2 font-display text-3xl font-bold text-ink-950">
                {commodityMarketPairs.size}
              </dd>
              <p className="mt-1 text-xs text-ink-500">
                combinations with at least one published observation
              </p>
            </div>
            <div className="card p-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Published observations
              </dt>
              <dd className="mt-2 font-display text-3xl font-bold text-ink-950">
                {observations.length}
              </dd>
              <p className="mt-1 text-xs text-ink-500">eligible for public display</p>
            </div>
          </dl>

          {/* The record period */}
          <div className="card p-6">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink-950">
              The period the record covers
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Earliest observation
                </p>
                <p className="mt-1 font-display text-lg font-bold text-ink-900">
                  {oldest ? formatDate(oldest) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Most recent observation
                </p>
                <p className="mt-1 font-display text-lg font-bold text-ink-900">
                  {newest ? formatDate(newest) : '—'}
                </p>
                {newest ? (
                  <p className="mt-0.5 text-xs text-ink-500">
                    {Math.floor(hoursSince(newest))} hours ago
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Price types recorded
                </p>
                <p className="mt-1 font-display text-lg font-bold text-ink-900">
                  {priceTypes.size}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">distinct kinds of price in the record</p>
              </div>
            </div>
          </div>

          {/* The map */}
          <section>
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
              The coverage map
            </h2>
            <p className="mt-2 max-w-3xl leading-relaxed text-ink-600">
              A market is plotted only where its coordinates are verified. A market in the
              catalogue with no published observations is listed rather than hidden, because a gap
              that is visible is a gap that can be planned around.
            </p>
            <div className="mt-6">
              <CoverageMap markets={markets} reportingMarketIds={reportingMarketIds} />
            </div>
          </section>

          {/* By state */}
          <section className="card p-6">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink-950">
              By state
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-xs uppercase tracking-wide text-ink-500">
                    <th scope="col" className="py-2 pr-4">State</th>
                    <th scope="col" className="py-2 pr-4">Markets</th>
                    <th scope="col" className="py-2 pr-4">Reporting</th>
                    <th scope="col" className="py-2">Not yet reporting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {[...states.values()]
                    .sort((a, b) => b.markets - a.markets)
                    .map((state) => (
                      <tr key={state.name}>
                        <th scope="row" className="py-2.5 pr-4 font-semibold text-ink-900">
                          {state.name}
                        </th>
                        <td className="py-2.5 pr-4 text-ink-700">{state.markets}</td>
                        <td className="py-2.5 pr-4 text-ink-700">{state.reporting}</td>
                        <td className="py-2.5 text-ink-500">{state.markets - state.reporting}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* What is not covered */}
          <section className="rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-950">
              What is not covered — stated plainly
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink-600">
              <li>
                <strong className="text-ink-900">Markets outside {BRAND.operatingMarket}.</strong>{' '}
                The collection network is currently built in {BRAND.operatingMarket}. {BRAND.expansion}{' '}
                That is a plan, not a current coverage, and nothing on this site should be read as
                claiming coverage elsewhere.
              </li>
              <li>
                <strong className="text-ink-900">Every commodity on every day.</strong> A
                commodity appears in price results only once it actually has published
                observations. A commodity that has never been collected for is absent from price
                results and appears in the catalogue as a catalogue entry.
              </li>
              <li>
                <strong className="text-ink-900">Continuous, gap-free series.</strong> Days with no
                published observation are gaps. They are shown as gaps in history charts and are
                never interpolated or filled.
              </li>
              <li>
                <strong className="text-ink-900">Provincial and rural collection points.</strong>{' '}
                The current network reports from established wholesale markets. Sub-market and
                farmgate collection at scale is not yet built.
              </li>
              <li>
                <strong className="text-ink-900">Quality grades for every commodity.</strong> Grade
                and variety are recorded when the market distinguishes them. Where they are not
                distinguished, they are not invented.
              </li>
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-ink-600">
              If you need coverage in a market we do not report from,{' '}
              <Link href="/contact" className="font-semibold text-brand-700 hover:text-brand-800">
                tell us which one
              </Link>{' '}
              — coverage is built from demand, and a named market is a request we can act on.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
