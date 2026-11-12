import Link from 'next/link';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { insights } from '@/lib/content/insights';
import { formatMoney, formatDate } from '@/lib/money';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import {
  BrandClaim,
  BusinessSolutions,
  CategoryGrid,
  ComparisonTable,
  CoverageMap,
  MarketPulse,
  SectionIntro,
  TrendPanel,
  WhyGonaPulse,
} from '@/components/marketing/sections';
import type { ComparisonRow, TrendPoint } from '@/components/marketing/sections';
import { HeroPanel } from '@/components/marketing/HeroPanel';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/marketing/StructuredData';

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.descriptor} in ${BRAND.operatingMarket}`,
  description:
    'Verified agricultural commodity prices collected in the field across Northern Nigeria. Compare markets, follow price movements, and see the provenance behind every figure.',
  alternates: { canonical: '/' },
};

const WINDOWS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: null },
];

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const params = await searchParams;
  const source = await getDataSource();

  const [observations, units, categories, commodities, markets] = await Promise.all([
    source.listObservations({ sort: 'recent', pageSize: 40 }),
    source.listUnits(),
    source.listCategories(),
    source.listCommodities(),
    source.listMarkets(),
  ]);

  const unitMap = new Map(units.map((unit) => [unit.id, unit.code]));

  /* --- the market pulse: the most recent eligible observations --------- */
  const pulse = observations.items.slice(0, 14);

  /* --- the commodity categories ---------------------------------------- */
  const commodityCounts = new Map<number, number>();
  for (const commodity of commodities) {
    commodityCounts.set(commodity.categoryId, (commodityCounts.get(commodity.categoryId) ?? 0) + 1);
  }

  /* --- the coverage ---------------------------------------------------- */
  const reportingMarketIds = new Set(observations.items.map((item) => item.marketId));
  const reportingMarketCount = markets.filter((market) => reportingMarketIds.has(market.id)).length;

  /* --- the comparison --------------------------------------------------- */
  const comparisonRows: ComparisonRow[] = [];
  const groups = new Map<string, typeof observations.items>();
  for (const observation of observations.items) {
    if (observation.reportedAmount === null) continue;
    const key = [
      observation.commodityId,
      observation.priceType,
      observation.reportedUnitId ?? 'none',
    ].join('|');
    const bucket = groups.get(key) ?? [];
    bucket.push(observation);
    groups.set(key, bucket);
  }
  for (const bucket of groups.values()) {
    const marketNames = new Set(bucket.map((observation) => observation.marketName));
    if (marketNames.size < 2) continue;
    const first = bucket[0];
    comparisonRows.push({
      commodityName: first.commodityName ?? 'Commodity',
      commoditySlug: first.commoditySlug ?? null,
      priceType: first.priceType,
      unitLabel: first.reportedUnitId ? unitMap.get(first.reportedUnitId) ?? 'unspecified' : 'unspecified',
      entries: bucket
        .filter((observation) => observation.reportedAmount !== null)
        .map((observation) => ({
          marketName: observation.marketName ?? 'Market',
          marketSlug: observation.marketSlug ?? null,
          stateName: observation.stateName ?? null,
          amount: observation.reportedAmount as number,
          currencyCode: observation.currencyCode,
          collectedAt: observation.collectedAt,
        })),
    });
  }
  comparisonRows.sort((a, b) => b.entries.length - a.entries.length);

  /* --- the historical movement ----------------------------------------- */
  const activeWindow = WINDOWS.some((window) => window.label === params.window)
    ? (params.window as string)
    : '90d';
  const windowDays = WINDOWS.find((window) => window.label === activeWindow)?.days ?? 90;

  const history = await source.listObservationsForAnalysis({});
  const historyByCommodity = new Map<number, typeof history>();
  for (const observation of history) {
    const bucket = historyByCommodity.get(observation.commodityId) ?? [];
    bucket.push(observation);
    historyByCommodity.set(observation.commodityId, bucket);
  }
  const trendCommodityId = [...historyByCommodity.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )[0]?.[0];
  const trendCommodity = commodities.find((commodity) => commodity.id === trendCommodityId) ?? null;

  const cutoff =
    windowDays === null
      ? null
      : new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  const trendPoints: TrendPoint[] = [];
  if (trendCommodityId !== undefined) {
    const rows = historyByCommodity.get(trendCommodityId) ?? [];
    const byDay = new Map<string, number[]>();
    for (const observation of rows) {
      if (cutoff && observation.collectedAt < cutoff) continue;
      const key = dayKey(observation.collectedAt);
      const amount = observation.reportedAmount ?? observation.normalizedAmount;
      if (amount === null || amount === undefined) continue;
      const bucket = byDay.get(key) ?? [];
      bucket.push(amount);
      byDay.set(key, bucket);
    }
    for (const day of [...byDay.keys()].sort()) {
      const values = byDay.get(day) as number[];
      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0
          ? (sorted[middle - 1] + sorted[middle]) / 2
          : sorted[middle];
      trendPoints.push({ day, value: median, observations: values.length });
    }
  }

  /* --- the latest insights --------------------------------------------- */
  const latestInsights = insights.slice(0, 3);

  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      {/* 2 — Hero */}
      <HeroPanel />

      {/* 3 — Market pulse */}
      <section className="section bg-white">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionIntro
              eyebrow="Market pulse"
              title="What markets are paying right now"
              body="The most recent published observations, with the market, the unit, the price type and the collection time behind each figure."
            />
            <Link
              href="/prices"
              className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              Open the price directory
            </Link>
          </div>

          <div className="mt-8">
            <DataCoverageNotice />
          </div>

          <div className="mt-6">
            <MarketPulse observations={pulse} units={unitMap} />
          </div>
        </div>
      </section>

      {/* 4 — Market intelligence search */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionIntro
            eyebrow="Market intelligence search"
            title="Find a commodity, a market, a state"
            body="Search the catalogue by commodity, market, state or category. Every result is a real record from the GonaPulse catalogue."
          />
          <form action="/prices" method="get" role="search" className="mt-6 max-w-2xl">
            <label htmlFor="home-search" className="sr-only">
              Search commodities, markets, states or categories
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="home-search"
                type="search"
                name="q"
                placeholder="Paddy rice, Dawanau, Kano, grains…"
                className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-base text-ink-900 shadow-soft placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-brand-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
              >
                Search
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.slice(0, 8).map((category) => (
              <Link
                key={category.id}
                href={`/commodities?category=${category.slug}`}
                className="rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Commodity categories */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionIntro
            eyebrow="Commodity discovery"
            title="Browse by category"
            body="Every category in the GonaPulse catalogue, with the number of commodities it holds."
          />
          <div className="mt-8">
            <CategoryGrid categories={categories} commodityCounts={commodityCounts} />
          </div>
        </div>
      </section>

      {/* 6 — Coverage */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionIntro
            eyebrow="Market coverage"
            title="Where GonaPulse collects"
            body={`${reportingMarketCount} of the ${markets.length} markets in the catalogue have published observations. The coverage is shown as it is — GonaPulse does not claim coverage it has not built.`}
          />
          <div className="mt-8">
            <CoverageMap markets={markets} reportingMarketIds={reportingMarketIds} />
          </div>
          <p className="mt-4 text-sm text-ink-500">
            <Link href="/coverage" className="font-semibold text-brand-700 hover:text-brand-800">
              Read the coverage statement
            </Link>{' '}
            for what is covered, what is not, and why.
          </p>
        </div>
      </section>

      {/* 7 — Price comparison */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionIntro
            eyebrow="Price comparison"
            title="Compare markets on like with like"
            body="Observations are only compared when the commodity, the price type and the unit are compatible. Incompatible figures are never merged."
          />
          <div className="mt-8">
            <ComparisonTable rows={comparisonRows.slice(0, 4)} />
          </div>
          <p className="mt-4 text-sm text-ink-500">
            <Link href="/compare" className="font-semibold text-brand-700 hover:text-brand-800">
              Open the full comparison tool
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 8 — Historical movement */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionIntro
            eyebrow="Historical intelligence"
            title="How the price moved"
            body="The median published figure per day, with the number of observations behind it. Days without a published observation are left as gaps."
          />
          <div className="mt-8">
            <TrendPanel
              commodity={trendCommodity}
              points={trendPoints}
              windows={WINDOWS.map((window) => ({ label: window.label, days: window.days }))}
              activeWindow={activeWindow}
            />
          </div>
        </div>
      </section>

      {/* 9 — Why GonaPulse */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionIntro
            eyebrow="Why GonaPulse"
            title="Market intelligence you can audit"
            body="A price on this platform is a record with a market, a unit, a price type and a time — not a number on a chart."
          />
          <div className="mt-8">
            <WhyGonaPulse />
          </div>
        </div>
      </section>

      {/* 10 — Insights */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionIntro
              eyebrow="Market insights"
              title="Analysis and briefings"
              body="Published research and market briefings from the GonaPulse editorial desk."
            />
            <Link
              href="/insights"
              className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
            >
              All insights
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latestInsights.map((insight) => (
              <Link key={insight.slug} href={`/insights/${insight.slug}`} className="card card-hover p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
                  {insight.category}
                </p>
                <h3 className="mt-2 font-display text-base font-bold leading-snug text-ink-900">
                  {insight.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm text-ink-600">{insight.excerpt}</p>
                <p className="mt-3 text-xs text-ink-400">
                  {insight.publishedAt ? (
                    formatDate(insight.publishedAt)
                  ) : (
                    <BrandClaim>Publication date not recorded</BrandClaim>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 11 — Business solutions */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionIntro
            eyebrow="Business solutions"
            title="Intelligence for commercial decisions"
            body="GonaPulse is built for the people who act on a price: traders, aggregators, processors, exporters and institutions."
          />
          <div className="mt-8">
            <BusinessSolutions />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="rounded-full bg-brand-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
            >
              Make a business enquiry
            </Link>
            <Link
              href="/api-docs"
              className="rounded-full border border-ink-300 px-6 py-3 text-sm font-bold text-ink-800 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              Explore the API
            </Link>
          </div>
        </div>
      </section>

      {/* 12 — Final call to action */}
      <section className="relative overflow-hidden bg-brand-900">
        <div className="container-page relative py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Better market information starts here.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-100">
              Explore the prices that have been verified, request intelligence access for your
              team, or talk to us about coverage in a market we do not yet cover.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/prices"
                className="rounded-full bg-white px-6 py-3 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-50"
              >
                Explore prices
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-brand-400 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
              >
                Contact GonaPulse
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-brand-400 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
              >
                Request intelligence access
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
