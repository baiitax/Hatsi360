import Link from 'next/link';
import type { Metadata } from 'next';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { EmptyState } from '@/components/ui';
import { getDataSource } from '@/lib/data';
import { BRAND } from '@/lib/brand';
import { PRICE_TYPE_META, type PriceType } from '@/types/domain';
import { BreadcrumbJsonLd } from '@/components/marketing/StructuredData';

export const metadata: Metadata = {
  title: 'Business Solutions',
  description:
    'How farmers, aggregators, traders, processors, exporters, cooperatives, financial institutions, development organisations and government agencies use verified agricultural market prices from Hatsi360.',
  alternates: { canonical: '/solutions' },
};

/**
 * The customer segments the platform serves.
 *
 * Each entry names the price types that matter to that segment and the
 * commodities that carry them in the current dataset. The counts below are
 * computed from the published observations — a segment that has no recorded
 * prices in a price type says so rather than implying coverage.
 */
const SEGMENTS: {
  id: string;
  title: string;
  body: string;
  priceTypes: PriceType[];
  /** The commodities this segment trades, matched against the catalogue. */
  commodityNames: string[];
}[] = [
  {
    id: 'farmers',
    title: 'Farmers',
    body: 'See the price being asked for in your own market before you decide where to sell, and what that price was on the day you want to compare it with.',
    priceTypes: ['farmgate', 'wholesale_asking'],
    commodityNames: ['Paddy Rice', 'Maize', 'Soya Beans', 'Cowpeas', 'Millet'],
  },
  {
    id: 'aggregators',
    title: 'Aggregators',
    body: 'Plan procurement against recorded prices instead of last week’s rumour, and see how the farmgate and wholesale figures sit side by side for the same commodity.',
    priceTypes: ['farmgate', 'wholesale_asking', 'wholesale_transaction'],
    commodityNames: ['Paddy Rice', 'Maize', 'Soya Beans'],
  },
  {
    id: 'traders',
    title: 'Commodity traders',
    body: 'Know what is being asked for, and where, before you commit. Every figure carries its market, unit, price type and collection time.',
    priceTypes: ['wholesale_asking', 'wholesale_transaction'],
    commodityNames: ['Paddy Rice', 'Maize', 'Soya Beans', 'Groundnut'],
  },
  {
    id: 'processors',
    title: 'Processors',
    body: 'Track input costs across the markets that supply your plants, with the procurement prices you care about kept distinct from the retail market.',
    priceTypes: ['processor_procurement', 'farmgate'],
    commodityNames: ['Paddy Rice', 'Maize', 'Cassava'],
  },
  {
    id: 'exporters',
    title: 'Exporters',
    body: 'Follow the export offers and the wholesale prices behind them, so the two sides of an export position can be read against the same record.',
    priceTypes: ['export_buy', 'export_sell', 'wholesale_asking'],
    commodityNames: ['Soya Beans', 'Groundnut', 'Maize'],
  },
  {
    id: 'cooperatives',
    title: 'Agricultural cooperatives',
    body: 'Give members one shared view of the market they are selling into, with the same figures everyone is quoting.',
    priceTypes: ['farmgate', 'wholesale_asking'],
    commodityNames: ['Paddy Rice', 'Maize', 'Cowpeas'],
  },
  {
    id: 'financial-institutions',
    title: 'Financial institutions',
    body: 'Historic series with documented provenance for lending and risk review. Every figure carries its source, its collection time and its verification state.',
    priceTypes: ['wholesale_transaction', 'wholesale_asking'],
    commodityNames: ['Paddy Rice', 'Maize', 'Soya Beans'],
  },
  {
    id: 'development-organisations',
    title: 'Development organisations',
    body: 'Monitor how prices move in the markets your programmes touch, and separate what was observed from what is being inferred.',
    priceTypes: ['farmgate', 'wholesale_asking', 'indicative'],
    commodityNames: ['Paddy Rice', 'Maize', 'Cassava', 'Yam'],
  },
  {
    id: 'government-agencies',
    title: 'Government agencies',
    body: 'Evidence for food security planning and market surveillance, drawn from published records rather than from an estimate presented as a fact.',
    priceTypes: ['wholesale_transaction', 'wholesale_asking', 'retail'],
    commodityNames: ['Paddy Rice', 'Maize', 'Rice'],
  },
];

export default async function SolutionsPage() {
  const source = await getDataSource();
  const [commodities, observations] = await Promise.all([
    source.listCommodities(),
    source.listObservationsForAnalysis({}),
  ]);

  // The catalogue index, so a segment can name the commodities it trades in
  // only where those commodities really exist in the catalogue.
  const byName = new Map(commodities.map((c) => [c.name.toLowerCase(), c]));

  // Which price types actually carry a published observation right now.
  const observedPriceTypes = new Set(observations.map((o) => o.priceType));

  const segments = SEGMENTS.map((segment) => {
    const traded = segment.commodityNames
      .map((name) => byName.get(name.toLowerCase()))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({
        commodity: c,
        observationCount: observations.filter(
          (o) => o.commodityId === c.id && segment.priceTypes.includes(o.priceType),
        ).length,
      }));

    return {
      ...segment,
      traded,
      livePriceTypes: segment.priceTypes.filter((type) => observedPriceTypes.has(type)),
    };
  });

  const marketCount = new Set(observations.map((o) => o.marketId)).size;
  const commodityCount = new Set(observations.map((o) => o.commodityId)).size;

  return (
    <>
      <PageHero
        eyebrow="Business solutions"
        title="Intelligence for the people who act on a price"
        lede={`Hatsi360 publishes ${observations.length} price observations across ${commodityCount} commodities and ${marketCount} markets. Below is what each kind of customer does with them — and where the current dataset is thin, we say so.`}
        breadcrumbs={[{ label: 'Business solutions' }]}
        image={getPageImage('solutions.hero')}
      />

      <div className="section">
        <div className="container-page">
          <BreadcrumbJsonLd items={[{ name: 'Business solutions' }]} />

          {segments.length === 0 ? (
            <EmptyState
              title="No segments to show yet"
              description="Hatsi360 has not published enough data to describe how each customer segment uses the platform. This page will fill as coverage grows."
            />
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {segments.map((segment) => (
                <article key={segment.id} className="card flex flex-col p-6">
                  <h2 className="font-display text-xl font-bold text-ink-950">{segment.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{segment.body}</p>

                  <div className="mt-5">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                      Price types that matter
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {segment.priceTypes.map((type) => {
                        const live = segment.livePriceTypes.includes(type);
                        return (
                          <li
                            key={type}
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              live
                                ? 'bg-brand-50 text-brand-800'
                                : 'bg-ink-100 text-ink-500'
                            }`}
                            title={
                              live
                                ? 'This price type currently carries published observations.'
                                : 'No published observation currently carries this price type. It is listed so the vocabulary is complete.'
                            }
                          >
                            {PRICE_TYPE_META[type].label}
                            {live ? '' : ' — not yet recorded'}
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {segment.traded.length > 0 ? (
                    <div className="mt-5">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">
                        Commodities in this dataset
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {segment.traded.map(({ commodity, observationCount }) => (
                          <li key={commodity.id} className="text-sm text-ink-700">
                            <Link
                              href={`/commodities/${commodity.slug}`}
                              className="font-semibold text-brand-700 hover:text-brand-800"
                            >
                              {commodity.name}
                            </Link>
                            <span className="text-ink-500">
                              {' — '}
                              {observationCount} observation{observationCount === 1 ? '' : 's'}{' '}
                              in this segment&rsquo;s price types
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-ink-500">
                      None of this segment&rsquo;s commodities currently carry a published
                      observation. The catalogue still lists them, so the vocabulary is complete.
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-3 pt-6">
                    <Link
                      href="/prices"
                      className="rounded-full bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                    >
                      Browse the price directory
                    </Link>
                    <Link
                      href="/compare"
                      className="rounded-full border border-ink-300 px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-800"
                    >
                      Compare markets
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* ----------------------------------------------- final conversion -- */}
          <section className="mt-14 overflow-hidden rounded-2xl bg-brand-900 px-6 py-10 sm:px-10">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Need the market you trade in?
              </h2>
              <p className="mt-3 text-base leading-relaxed text-brand-100">
                Coverage is built market by market. If the market you need is not listed yet, tell
                us which one and which commodities matter there — that request goes straight into
                the collection plan. You can also reach {BRAND.name} through the{' '}
                <Link
                  href="/contact"
                  className="font-semibold text-white underline underline-offset-4"
                >
                  business enquiry form
                </Link>
                .
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-50"
                >
                  Make a business enquiry
                </Link>
                <Link
                  href="/api-docs"
                  className="rounded-full border border-brand-400 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800"
                >
                  Explore the API
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-brand-400 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800"
                >
                  See the access tiers
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
