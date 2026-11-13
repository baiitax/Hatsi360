import Link from 'next/link';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { insights } from '@/lib/content/insights';
import { formatMoney, formatDate, formatDateTime } from '@/lib/money';
import { isStale } from '@/lib/pricing';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import {
  BrandClaim,
  BusinessSolutions,
  CategoryGrid,
  ComparisonTable,
  CoverageMap,
  FeaturedCommodities,
  MarketPulse,
  SectionIntro,
  TrendPanel,
  WhyHatsi360,
} from '@/components/marketing/sections';
import {
  Audiences,
  CoverageHonesty,
  DataTrust,
  HowItWorks,
  TradeIntelligence,
} from '@/components/marketing/home-sections';
import type { ComparisonRow, TrendPoint } from '@/components/marketing/sections';
import type { CoverageStatus } from '@/components/marketing/sections';
import { HeroPanel } from '@/components/marketing/HeroPanel';
import { IntelligenceMetricCard } from '@/components/ui/data-display';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/marketing/StructuredData';
import { getInsightImage, getPageImage } from '@/lib/images/registry';
import { HatsiFigure, HatsiImage } from '@/components/media/HatsiImage';

/**
 * The homepage metadata.
 *
 * The title follows the brand brief's recommendation. The description does not
 * follow its wording exactly: the brief suggests "across Nigerian and African
 * agricultural markets", but every market in the catalogue is in Northern
 * Nigeria, and claiming African coverage would be a coverage claim the platform
 * has not built. The description therefore names the operating market, states
 * the provenance that makes a figure defensible, and frames wider coverage as
 * the stated ambition in `BRAND.expansion` rather than as a fact.
 */
export const metadata: Metadata = {
  // `absolute` rather than a plain string: the root layout declares
  // `title.template = '%s | Hatsi360'`, so a plain string would render as
  // "Hatsi360 | Agricultural Market Prices & Intelligence | Hatsi360". The
  // homepage is the one page whose title must stand alone.
  title: { absolute: `${BRAND.name} | Agricultural Market Prices & Intelligence` },
  description:
    'Explore agricultural commodity prices, market trends and trade intelligence across the markets of Northern Nigeria. Every published figure carries its market, unit, price type, grade and collection time.',
  alternates: { canonical: '/' },
  openGraph: {
    title: `${BRAND.name} | Agricultural Market Prices & Intelligence`,
    description:
      'Agricultural commodity prices collected in the field, verified before publication, with the provenance behind every figure.',
    type: 'website',
  },
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

  const [units, categories, commodities, markets] = await Promise.all([
    source.listUnits(),
    source.listCategories(),
    source.listCommodities(),
    source.listMarkets(),
  ]);

  /**
   * The complete set of eligible published observations.
   *
   * The homepage aggregates over everything that is publicly readable rather
   * than over a sample, so the figures it states are the figures the database
   * holds.
   */
  const observations = await source.listObservationsForAnalysis({});

  const unitMap = new Map(units.map((unit) => [unit.id, unit.code]));

  /* --- the market pulse: the most recent eligible observations --------- */
  const recent = [...observations]
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))
    .filter((observation) => observation.reportedAmount !== null);
  const pulse = recent.slice(0, 14);

  /* --- the pulse metrics ------------------------------------------------ */
  const commodityIds = new Set(observations.map((observation) => observation.commodityId));
  const marketIds = new Set(observations.map((observation) => observation.marketId));
  const commoditiesWithPrices = commodities.filter((commodity) => commodityIds.has(commodity.id));
  const marketsWithPrices = markets.filter((market) => marketIds.has(market.id));

  const today = new Date().toISOString().slice(0, 10);
  const updatesToday = observations.filter((observation) =>
    (observation.publishedAt ?? observation.collectedAt).slice(0, 10) === today,
  ).length;

  const verifiedCount = observations.filter(
    (observation) => observation.verificationStatus === 'verified',
  ).length;
  const legacyCount = observations.filter(
    (observation) => observation.verificationStatus === 'legacy_unverified',
  ).length;

  const latestObservationAt = recent[0]?.collectedAt ?? null;

  /* --- the commodity categories ---------------------------------------- */
  const commodityCounts = new Map<number, number>();
  for (const commodity of commodities) {
    commodityCounts.set(commodity.categoryId, (commodityCounts.get(commodity.categoryId) ?? 0) + 1);
  }

  /* --- the latest price per commodity ----------------------------------- */
  const latestByCommodity = new Map<
    number,
    {
      amount: number;
      currencyCode: string;
      unitLabel: string;
      marketName: string;
      marketSlug: string | null;
      collectedAt: string;
      status: (typeof observations)[number]['verificationStatus'];
    }
  >();
  for (const observation of recent) {
    if (observation.reportedAmount === null) continue;
    if (latestByCommodity.has(observation.commodityId)) continue;
    latestByCommodity.set(observation.commodityId, {
      amount: observation.reportedAmount,
      currencyCode: observation.currencyCode,
      unitLabel: observation.reportedUnitId ? unitMap.get(observation.reportedUnitId) ?? '' : '',
      marketName: observation.marketName ?? 'Market',
      marketSlug: observation.marketSlug ?? null,
      collectedAt: observation.collectedAt,
      status: observation.verificationStatus,
    });
  }

  /* --- the coverage ---------------------------------------------------- */
  const reportingMarketIds = new Set(marketIds);

  /**
   * The coverage state of every market in the catalogue.
   *
   * A market is only "reporting" when its newest observation is still inside
   * the freshness window of the commodity it covers. Where it has published
   * before but the data is old, it is marked stale rather than active.
   */
  const freshnessByCommodity = new Map(
    commodities.map((commodity) => [commodity.id, commodity.freshnessWindowHours ?? 72]),
  );
  const latestByMarket = new Map<number, { at: string; fresh: boolean }>();
  for (const observation of observations) {
    const window = freshnessByCommodity.get(observation.commodityId) ?? 72;
    const fresh = !isStale(observation.collectedAt, window);
    const current = latestByMarket.get(observation.marketId);
    if (!current || observation.collectedAt > current.at) {
      latestByMarket.set(observation.marketId, { at: observation.collectedAt, fresh });
    } else if (current.fresh === false && fresh) {
      current.fresh = true;
    }
  }
  const statusByMarket = new Map<number, CoverageStatus>();
  for (const market of markets) {
    const entry = latestByMarket.get(market.id);
    if (!entry) statusByMarket.set(market.id, 'registered');
    else statusByMarket.set(market.id, entry.fresh ? 'active' : 'stale');
  }

  /* --- the comparison --------------------------------------------------- */
  const comparisonRows: ComparisonRow[] = [];
  const groups = new Map<string, typeof observations>();
  for (const observation of observations) {
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
    const first = bucket[0]!;
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

  const history = observations;
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
        sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!;
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
      <HeroPanel observations={recent.slice(0, 8)} units={unitMap} />

      {/* 3 — The market pulse */}
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
            <CoverageHonesty
              marketCount={markets.length}
              commodityCount={commodities.length}
              observationCount={observations.length}
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <IntelligenceMetricCard
              label="Commodities tracked"
              value={commoditiesWithPrices.length}
              detail={`${commodities.length} in the catalogue`}
              href="/commodities"
              source="Commodity catalogue with published observations"
            />
            <IntelligenceMetricCard
              label="Markets covered"
              value={marketsWithPrices.length}
              detail={`${markets.length} registered in the catalogue`}
              href="/markets"
              source="Market catalogue with published observations"
            />
            <IntelligenceMetricCard
              label="Published observations"
              value={observations.length}
              detail={
                latestObservationAt
                  ? `Latest collection ${formatDate(latestObservationAt)}`
                  : 'Nothing published yet'
              }
              href="/prices"
              source="Every eligible published record"
            />
            <IntelligenceMetricCard
              label="Updates today"
              value={updatesToday}
              detail={
                updatesToday === 0
                  ? 'No new publication today'
                  : `Publication or collection dated ${today}`
              }
              href="/prices"
              source="Published records dated today"
            />
          </div>

          <p className="mt-4 text-sm text-ink-600">
            Verification state of the published set:{' '}
            <span className="font-semibold text-leaf-700">{verifiedCount} verified</span>,{' '}
            <span className="font-semibold text-ink-700">{legacyCount} migrated legacy records</span>{' '}
            without a verification trail, and{' '}
            <span className="font-semibold text-ink-700">
              {observations.length - verifiedCount - legacyCount} awaiting review
            </span>
            . Only the first group carries a field verification.
          </p>

          <div className="mt-6">
            <MarketPulse observations={pulse} units={unitMap} />
          </div>
        </div>
      </section>

      {/* 4 — Market intelligence search */}
      <section className="section bg-ink-50">
        <div className="container-page grid gap-10 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
          <SectionIntro
            eyebrow="Market intelligence search"
            title="Find a commodity, a market, a state or a grade"
            body="Search the catalogue by commodity, market, state, category or grade. Every result is a real record from the Hatsi360 catalogue."
          />
          <form action="/prices" method="get" role="search" className="mt-6 max-w-2xl">
            <label htmlFor="home-search" className="sr-only">
              Search commodities, markets, states, categories or grades
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
          <HatsiImage
            asset={getPageImage('home.categories')}
            sizes="(min-width: 1024px) 22rem, 92vw"
            ratio="portrait"
            className="hidden rounded-2xl lg:block"
          />
        </div>
      </section>

      {/* 5 — Commodity discovery */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionIntro
            eyebrow="Commodity discovery"
            title="Browse by category"
            body="Every category in the Hatsi360 catalogue, with the number of commodities it holds."
          />
          <div className="mt-8">
            <CategoryGrid categories={categories} commodityCounts={commodityCounts} />
          </div>

          <div className="mt-10">
            <FeaturedCommodities
              commodities={commoditiesWithPrices.slice(0, 6)}
              latestByCommodity={latestByCommodity}
            />
          </div>
        </div>
      </section>

      {/* 6 — Coverage */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionIntro
            eyebrow="Market coverage"
            title="Where Hatsi360 collects"
            body={`${reportingMarketIds.size} of the ${markets.length} markets in the catalogue have published observations. The coverage is shown as it is — Hatsi360 does not claim coverage it has not built.`}
          />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-start">
            <CoverageMap
              markets={markets}
              reportingMarketIds={reportingMarketIds}
              statusByMarket={statusByMarket}
            />
            <HatsiFigure
              asset={getPageImage('home.coverage')}
              sizes="(min-width: 1024px) 20rem, 92vw"
              ratio="portrait"
              caption="Collection is built market by market. Hatsi360 does not claim coverage it has not built."
            />
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

      {/* 9 — Trade intelligence */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionIntro
            eyebrow="Trade intelligence"
            title="More than market prices. Intelligence for better agricultural trade."
            body="Understand how agricultural markets move, compare sourcing opportunities, and see the factors that sit behind a price. The two capabilities marked below need data the platform is still collecting, and they say so rather than showing an empty panel."
          />
          <div className="mt-8">
            <TradeIntelligence />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/trade"
              className="rounded-full bg-brand-700 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
            >
              Explore trade intelligence
            </Link>
            <Link
              href="/trade/terminal"
              className="rounded-full border border-ink-300 px-6 py-3 text-sm font-bold text-ink-800 transition-colors hover:border-ink-400 hover:text-brand-700"
            >
              Open the market terminal
            </Link>
          </div>
        </div>
      </section>

      {/* 10 — How Hatsi360 works */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionIntro
            eyebrow="How Hatsi360 works"
            title="From agricultural markets to better-informed decisions"
            body="Four stages, each one a separate act with its own record. Collection, verification, publication and analysis are never collapsed into one step, because that is what makes a published figure defensible."
          />
          <div className="mt-8">
            <HowItWorks />
          </div>
        </div>
      </section>

      {/* 11 — Data trust */}
      <section className="section bg-white">
        <div className="container-page">
          <SectionIntro
            eyebrow="Data trust and transparency"
            title="Market intelligence you can understand and evaluate"
            body="A price is only useful if you can see what kind of price it is. These are the labels the platform attaches, and what each one means. A market estimate is never presented as a confirmed transaction."
          />
          <div className="mt-8">
            <DataTrust />
          </div>
          <div className="mt-8 border-t border-ink-100 pt-8">
            <h3 className="font-display text-base font-bold text-ink-900">
              And the principles behind them
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
              A price on this platform is a record with a market, a unit, a price type
              and a time — not a number on a chart.
            </p>
            <div className="mt-5">
              <WhyHatsi360 />
            </div>
          </div>
        </div>
      </section>

      {/* 12 — Who Hatsi360 serves */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <SectionIntro
            eyebrow="Who Hatsi360 serves"
            title="Built for the people who move agricultural markets"
            body="Six audiences, each making a different decision with the same record."
          />
          <div className="mt-8">
            <Audiences />
          </div>
        </div>
      </section>

      {/* 10 — Insights and reports */}
      <section className="section bg-ink-50">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionIntro
              eyebrow="Market insights and reports"
              title="Analysis, briefings and market reporting"
              body="Published research and market briefings from the Hatsi360 editorial desk, and the reports the platform can produce on demand."
            />
            <div className="flex flex-wrap gap-2">
              <Link
                href="/insights"
                className="rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-50"
              >
                All insights
              </Link>
              <Link
                href="/reports"
                className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300"
              >
                All reports
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latestInsights.map((insight) => (
              <Link
                key={insight.slug}
                href={`/insights/${insight.slug}`}
                className="card card-hover group flex flex-col overflow-hidden"
              >
                <HatsiImage
                  asset={getInsightImage(insight.slug)}
                  sizes="(min-width: 768px) 20rem, 92vw"
                  ratio="landscape"
                  className="rounded-t-[0.875rem]"
                  imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
                    {insight.category}
                  </p>
                  <h3 className="mt-2 font-display text-base font-bold leading-snug text-ink-900">
                    {insight.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-600">{insight.excerpt}</p>
                  <p className="mt-3 text-xs text-ink-500">
                    {insight.publishedAt ? (
                      formatDate(insight.publishedAt)
                    ) : (
                      <BrandClaim>Publication date not recorded</BrandClaim>
                    )}
                  </p>
                </div>
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
            body="Hatsi360 is built for the people who act on a price: traders, aggregators, processors, exporters and institutions."
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
              className="rounded-full border border-ink-300 px-6 py-3 text-sm font-bold text-ink-800 transition-colors hover:border-ink-400 hover:text-brand-700"
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
              Know the harvest. Understand the market. Trade with confidence.
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
                Contact Hatsi360
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-brand-400 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-800"
              >
                Request intelligence access
              </Link>
            </div>
            <p className="mt-8 text-xs text-brand-300">
              {BRAND.ownershipStatement} Last data update:{' '}
              {latestObservationAt ? formatDateTime(latestObservationAt) : 'no data published yet'}.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
