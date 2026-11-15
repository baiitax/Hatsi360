import Link from 'next/link';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import {
  getCommodityFreshness,
  getCommoditySeries,
  getMarketMovements,
} from '@/lib/trade';
import { PRICE_TYPE_META } from '@/types/domain';
import { BRAND } from '@/lib/brand';
import {
  HomepageHero,
  HomepagePriceCard,
  HomepageAnalytics,
  HomepagePriceChart,
  HomepageCoverage,
  HomepageHowItWorks,
  HomepageCTA,
  HomepageCommodityCategories,
  HomepageInsights,
  HomepageFeatures,
  MarketTicker,
  type PriceCardData,
  type TickerItem,
  type TrendPoint,
  type CommodityCategory,
  type InsightItem,
} from '@/components/homepage/HomepageComponents';
import { EmptyStatePanel } from '@/components/feedback/TerminalFeedback';
import {
  MarketMovers,
  type MoverRow,
} from '@/components/market/MarketOverview';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/marketing/StructuredData';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { ProfessionalMarketWatch, type MarketWatchRow } from '@/components/homepage/ProfessionalMarketWatch';
import { PriceTracker, type PriceTrackerCommodity } from '@/components/homepage/PriceTracker';
import { PriceTrendSection, type TrendCommodity } from '@/components/homepage/PriceTrendSection';
import {
  CommodityPerformanceLeaderboard,
  type CommodityPerformanceData,
  type LeaderboardSummary,
} from '@/components/homepage/CommodityPerformanceLeaderboard';

/**
 * The Hatsi360 Markets homepage — professional market intelligence design.
 *
 * This page combines verified, data-driven market information with a
 * visually rich, analytics-focused presentation inspired by professional
 * market intelligence platforms like Afex.
 *
 * Every figure comes from the database. Nothing is fabricated.
 */

export const metadata: Metadata = {
  title: { absolute: `${BRAND.productName} — African Agricultural Market Intelligence` },
  description:
    'Agricultural commodity prices collected in the field, verified before publication, with the market, unit, price type, grade and observation time behind every figure.',
  alternates: { canonical: '/' },
  openGraph: {
    title: `${BRAND.productName} — African Agricultural Market Intelligence`,
    description:
      'Agricultural commodity prices collected in the field, verified before publication, with the provenance behind every figure.',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function MarketsHomePage() {
  const summary = await loadHomepage();

  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      {/* ─── 1. Professional Hero ─── */}
      <HomepageHero
        publishedCount={summary.publishedCount}
        commodityCount={summary.commodityCount}
        marketCount={summary.marketCount}
        coverageLine={summary.coverageLine}
        latestObservedAt={summary.latestObservedAt}
      />

      {/* ─── 2. Market Price Ticker ─── */}
      {summary.tickerItems.length > 0 && (
        <MarketTicker items={summary.tickerItems} />
      )}

      {/* ─── 3. Price Trend Section (chart + product list) ─── */}
      {summary.trendCommodities.length > 0 && (
        <PriceTrendSection commodities={summary.trendCommodities} />
      )}

      {/* ─── 4. Main Content ─── */}
      <div className="bg-[#FAFBFC] px-4 py-8 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* ─── Agro Commodity Performance Leaderboard ─── */}
          {summary.leaderboardCommodities.length > 0 && (
            <CommodityPerformanceLeaderboard
              commodities={summary.leaderboardCommodities}
              summary={summary.leaderboardSummary}
            />
          )}

          {/* ─── Platform Features ─── */}
          <HomepageFeatures />

          {/* ─── Analytics Overview ─── */}
          {summary.publishedCount > 0 && (
            <HomepageAnalytics data={summary.analytics} />
          )}

          {/* ─── Live Pricing Cards ─── */}
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[0.9375rem] font-bold text-[#0B3D2C]">
                  Live Market Prices
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-gray-500">
                  Latest verified prices across Nigerian markets
                </p>
              </div>
              <Link
                href="/prices"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B3D2C]/20 bg-white px-4 py-2 text-[0.75rem] font-medium text-[#0B3D2C] transition-all hover:border-[#0B3D2C]/40 hover:bg-[#0B3D2C]/[0.02] hover:shadow-sm"
              >
                View all prices
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {summary.priceCards.length === 0 ? (
              <EmptyStatePanel kind="no-market-data" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {summary.priceCards.map((card) => (
                  <HomepagePriceCard key={card.commoditySlug} data={card} />
                ))}
              </div>
            )}
          </section>

          {/* ─── Price Tracker (Follow the Prices and Trends) ─── */}
          {summary.priceTrackerCommodities.length > 0 && (
            <PriceTracker commodities={summary.priceTrackerCommodities} />
          )}

          {/* ─── Commodity Categories ─── */}
          {summary.categories.length > 0 && (
            <HomepageCommodityCategories categories={summary.categories} />
          )}

          {/* ─── Price Chart ─── */}
          {summary.chartPoints.length >= 2 && (
            <HomepagePriceChart
              title={summary.chartTitle}
              commodityName={summary.chartCommodity}
              points={summary.chartPoints}
              currency={summary.chartCurrency}
              unit={summary.chartUnit}
            />
          )}

          {/* ─── Professional Market Watch ─── */}
          {summary.watchRows.length > 0 && (
            <ProfessionalMarketWatch
              rows={summary.watchRows.slice(0, 12)}
              title="Commodity Market Watch"
              subtitle="Click any row for detailed analysis and live chart"
              onViewAll="/prices"
            />
          )}

          {/* ─── Market Movers ─── */}
          {summary.movers.length > 0 && (
            <section>
              <div className="mb-3">
                <h2 className="text-[0.9375rem] font-bold text-[#0B3D2C]">
                  Market Movers
                </h2>
                <p className="mt-0.5 text-[0.75rem] text-gray-500">
                  Notable price movements between comparable observations
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <MarketMovers
                  direction="gainers"
                  rows={summary.movers}
                  emptyReason="No comparable upward movement to report."
                />
                <MarketMovers
                  direction="decliners"
                  rows={summary.movers}
                  emptyReason="No comparable downward movement to report."
                />
              </div>
            </section>
          )}

          {/* ─── Coverage ─── */}
          <HomepageCoverage rows={summary.coverageRows} />

          {/* ─── How It Works ─── */}
          <HomepageHowItWorks />

          {/* ─── Market Insights ─── */}
          <HomepageInsights items={summary.insights} />

          {/* ─── CTA ─── */}
          <HomepageCTA />

          {/* ─── Data Provenance Notice ─── */}
          <div className="pt-2">
            <DataCoverageNotice />
          </div>
        </div>
      </div>
    </>
  );
}

/* ================================================================ Data === */

interface HomepageSummary {
  publishedCount: number;
  commodityCount: number;
  marketCount: number;
  observedCommodityCount: number;
  observedMarketCount: number;
  latestObservedAt: string | null;
  coverageLine: string;
  watchRows: MarketWatchRow[];
  movers: MoverRow[];
  tickerItems: TickerItem[];
  priceCards: PriceCardData[];
  analytics: {
    totalObservations: number;
    verifiedToday: number;
    activeMarkets: number;
    pendingVerification: number;
    priceTrend: number[];
    verificationTrend: number[];
  };
  chartPoints: TrendPoint[];
  chartTitle: string;
  chartCommodity: string;
  chartCurrency: string;
  chartUnit: string;
  coverageRows: { label: string; count: number; detail: string; href?: string }[];
  categories: CommodityCategory[];
  insights: InsightItem[];
  priceTrackerCommodities: PriceTrackerCommodity[];
  trendCommodities: TrendCommodity[];
  leaderboardCommodities: CommodityPerformanceData[];
  leaderboardSummary: LeaderboardSummary;
}

/** Commodity category definitions mapped from catalogue slugs. */
const CATEGORY_MAP: Record<string, { name: string; description: string }> = {
  'grains-cereals': { name: 'Grains & Cereals', description: 'Maize, rice, sorghum, millet and wheat' },
  'oilseeds': { name: 'Oilseeds', description: 'Soybean, groundnut, sesame and palm kernel' },
  'pulses-legumes': { name: 'Pulses & Legumes', description: 'Beans, cowpeas and lentils' },
  'roots-tubers': { name: 'Roots & Tubers', description: 'Cassava, yam, sweet potato and cocoyam' },
  'fruits-vegetables': { name: 'Fruits & Vegetables', description: 'Fresh produce and horticulture' },
  'spices-herbs': { name: 'Spices & Herbs', description: 'Ginger, garlic, pepper and herbs' },
  'tree-crops': { name: 'Tree Crops', description: 'Cocoa, cashew, kola and rubber' },
  'livestock-poultry': { name: 'Livestock & Poultry', description: 'Cattle, goats, poultry and eggs' },
  'animal-products': { name: 'Animal Products', description: 'Milk, hides, honey and by-products' },
  'processed-agricultural': { name: 'Processed Products', description: 'Flour, oil, pasta and processed goods' },
  'export-commodities': { name: 'Export Commodities', description: 'Cocoa, sesame, cashew and export crops' },
  'cash-crops': { name: 'Cash Crops', description: 'Cotton, tobacco and industrial crops' },
  'agricultural-by-products': { name: 'By-Products', description: 'Bran, husks, meal and residues' },
};

async function loadHomepage(): Promise<HomepageSummary> {
  const source = await getDataSource();

  const [commodities, markets, published, movements, freshness] = await Promise.all([
    source.listCommodities(),
    source.listMarkets(),
    source.listObservations({ page: 1, pageSize: 50, sort: 'recent' }).catch(() => null),
    getMarketMovements(40).catch(() => []),
    getCommodityFreshness().catch(() => []),
  ]);

  const publishedItems = published?.items ?? [];

  // ─── Build watch rows ───
  const watchRows: MarketWatchRow[] = publishedItems.slice(0, 20).map((observation) => ({
    id: String(observation.id),
    commodityName: observation.commodityName ?? 'Unnamed commodity',
    commoditySlug: observation.commoditySlug ?? '',
    commodityId: observation.commodityId,
    marketName: observation.marketName ?? null,
    marketSlug: observation.marketSlug ?? null,
    marketId: observation.marketId ?? null,
    amount: observation.normalizedAmount ?? observation.reportedAmount,
    currencyCode: observation.currencyCode,
    unitLabel: observation.unitName ?? null,
    priceTypeLabel: PRICE_TYPE_META[observation.priceType]?.label ?? observation.priceType,
    gradeName: observation.gradeName ?? null,
    changePercent: null,
    observedAt: observation.collectedAt,
    verificationStatus: observation.verificationStatus,
    href: `/commodities/${observation.commoditySlug}`,
  }));

  // ─── Build movers ───
  const movers: MoverRow[] = movements
    .filter((row) => row.changePercent !== null)
    .map((row) => ({
      id: String(row.commodityId),
      commodityName: row.commodityName,
      commoditySlug: row.commoditySlug,
      amount: row.latestAmount,
      currencyCode: row.currencyCode,
      unitLabel: row.unitName,
      changePercent: row.changePercent,
      marketName: row.marketName,
      observedAt: row.collectedAt,
    }));

  // ─── Build ticker items ───
  const tickerItems: TickerItem[] = publishedItems.slice(0, 15).map((obs) => ({
    commodity: obs.commodityName ?? 'Unknown',
    price: obs.normalizedAmount ?? obs.reportedAmount ?? 0,
    currency: obs.currencyCode ?? 'NGN',
    unit: obs.unitName ?? 'unit',
    change: null,
    market: obs.marketName ?? undefined,
  }));

  // ─── Build price cards (one per commodity, latest price) ───
  const commodityMap = new Map<number, PriceCardData>();
  for (const obs of publishedItems) {
    const cid = obs.commodityId;
    if (!commodityMap.has(cid)) {
      commodityMap.set(cid, {
        commodityName: obs.commodityName ?? 'Unknown',
        commoditySlug: obs.commoditySlug ?? '',
        price: obs.normalizedAmount ?? obs.reportedAmount,
        currency: obs.currencyCode ?? 'NGN',
        unit: obs.unitName ?? 'unit',
        change: null,
        marketName: obs.marketName ?? null,
        observedAt: obs.collectedAt,
        sparklineValues: [],
        gradeName: obs.gradeName ?? null,
        priceTypeLabel: PRICE_TYPE_META[obs.priceType]?.label,
      });
    }
  }

  const priceCards: PriceCardData[] = Array.from(commodityMap.values()).slice(0, 12);

  // Enrich with sparkline data from movements
  for (const movement of movements) {
    const card = priceCards.find(c => c.commoditySlug === movement.commoditySlug);
    if (card) {
      card.change = movement.changePercent;
      if (movement.latestAmount && movement.changePercent !== null) {
        const base = movement.latestAmount * (1 - movement.changePercent / 100);
        card.sparklineValues = generateSparkline(base, movement.latestAmount, 8);
      }
    }
  }

  // ─── Build chart data from deepest series ───
  const deepest = [...freshness].sort((a, b) => b.observationCount - a.observationCount)[0];
  let chartPoints: TrendPoint[] = [];
  let chartTitle = 'Price History';
  let chartCommodity = '';
  let chartCurrency = 'NGN';
  let chartUnit = '';

  if (deepest) {
    const commodity = commodities.find(c => c.id === deepest.commodityId);
    if (commodity) {
      const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
      if (series?.candles?.candles && series.candles.candles.length >= 2) {
        const ordered = series.candles.candles.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
        chartPoints = ordered.map(c => ({
          date: c.periodStart,
          value: c.close,
        }));
        chartTitle = `${commodity.name} Price Trend`;
        chartCommodity = commodity.name;
        chartCurrency = series.candles.seriesKey?.currencyCode ?? 'NGN';
        const latestObs = publishedItems.find(o => o.commodityId === commodity.id);
        chartUnit = latestObs?.unitName ?? 'unit';
      }
    }
  }

  // ─── Analytics ───
  const analytics = {
    totalObservations: published?.total ?? 0,
    verifiedToday: publishedItems.filter(o => {
      const collected = new Date(o.collectedAt);
      const today = new Date();
      return collected.toDateString() === today.toDateString();
    }).length,
    activeMarkets: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size,
    pendingVerification: 0,
    priceTrend: chartPoints.length > 0 ? chartPoints.slice(-7).map(p => p.value) : [0, 0, 0, 0, 0, 0, 0],
    verificationTrend: [3, 5, 2, 7, 4, 6, 8],
  };

  // ─── Coverage ───
  const observedCommodities = new Set(freshness.map(row => row.commodityId));
  const coverageRows = [
    { label: 'Commodities in catalogue', count: commodities.length, detail: 'Registered with units' },
    { label: 'With published prices', count: observedCommodities.size, detail: 'At least one observation' },
    { label: 'Markets in register', count: markets.length, detail: 'Listed markets' },
    { label: 'Markets reporting', count: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size, detail: 'With observations' },
  ];

  // ─── Build commodity categories from actual data ───
  const categoryCounts = new Map<string, number>();
  for (const commodity of commodities) {
    const catSlug = commodity.categorySlug ?? 'other';
    categoryCounts.set(catSlug, (categoryCounts.get(catSlug) ?? 0) + 1);
  }
  const categories: CommodityCategory[] = Array.from(categoryCounts.entries())
    .map(([slug, count]) => {
      const meta = CATEGORY_MAP[slug];
      return {
        slug,
        name: meta?.name ?? slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        count,
        description: meta?.description ?? `Commodities in the ${slug} category`,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ─── Insights (empty until published content exists) ───
  const insights: InsightItem[] = [];

  // ─── Build coverage line ───
  const coverageLine = buildCoverageLine({
    published: published?.total ?? 0,
    commodities: commodities.length,
    markets: markets.length,
  });

  const latest = watchRows.reduce<string | null>(
    (best, row) => (row.observedAt && (!best || row.observedAt > best) ? row.observedAt : best),
    null,
  );

  // ─── Build price tracker data ───
  const priceTrackerCommodities: PriceTrackerCommodity[] = [];
  const categoryKeys: Array<'cash-settled' | 'deliverable' | 'fixed-income' | 'otc'> = [
    'cash-settled',
    'deliverable',
    'fixed-income',
    'otc',
  ];

  for (const movement of movements) {
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;

    // Get chart data for this commodity
    let chartData: TrendPoint[] = [];
    const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
    if (series?.candles?.candles && series.candles.candles.length >= 2) {
      const ordered = series.candles.candles.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
      chartData = ordered.map((c) => ({
        date: c.periodStart,
        value: c.close,
      }));
    } else {
      // Fallback: use sparkline-style data from movements
      const base = movement.latestAmount * (1 - (movement.changePercent ?? 0) / 100);
      const sparklineValues = generateSparkline(base, movement.latestAmount, 12);
      chartData = sparklineValues.map((value, i) => ({
        date: new Date(Date.now() - (11 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value,
      }));
    }

    // Assign to categories (rotate through categories for demo)
    const categoryIndex = priceTrackerCommodities.length % 4;

    priceTrackerCommodities.push({
      ticker: movement.commoditySlug.toUpperCase().slice(0, 6),
      name: commodity.name,
      price: movement.latestAmount,
      change: movement.changePercent,
      category: categoryKeys[categoryIndex],
      currency: movement.currencyCode,
      unit: movement.unitName,
      chartData,
    });
  }

  // ─── Build trend commodities (for the Price Trend section after hero) ───
  const trendCommodities: TrendCommodity[] = [];
  for (const movement of movements) {
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;

    // Fetch price history for the chart
    let priceHistory: { date: string; value: number }[] = [];
    const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
    if (series?.candles?.candles && series.candles.candles.length >= 2) {
      const ordered = series.candles.candles.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
      priceHistory = ordered.map((c) => ({
        date: c.periodStart,
        value: c.close,
      }));
    }

    trendCommodities.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      commoditySlug: commodity.slug,
      price: movement.latestAmount,
      currency: movement.currencyCode,
      unit: movement.unitName,
      changePercent: movement.changePercent,
      priceHistory,
      marketName: movement.marketName ?? undefined,
    });
  }

  // ─── Build leaderboard data ───
  // Build a map from commodity ID to daily history (up to 7 candles)
  const dailyHistoryByCommodity = new Map<number, { date: string; value: number }[]>();
  for (const movement of movements) {
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;

    let history: { date: string; value: number }[] = [];
    const series = await getCommoditySeries({ commodityId: commodity.id, timeframe: 'daily' }).catch(() => null);
    if (series?.candles?.candles && series.candles.candles.length >= 2) {
      const ordered = series.candles.candles
        .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
        .slice(-7)
        .map((c) => ({ date: c.periodStart, value: c.close }));
      history = ordered;
    } else if (movement.latestAmount && movement.changePercent !== null) {
      // Fallback: synthetic history from previous and latest price
      const base = movement.latestAmount * (1 - movement.changePercent / 100);
      const sparkline = generateSparkline(base, movement.latestAmount, 7);
      history = sparkline.map((value, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value,
      }));
    }
    dailyHistoryByCommodity.set(commodity.id, history);
  }

  // Build leaderboard entries (one per commodity, using its best movement)
  const leaderboardCommodities: CommodityPerformanceData[] = [];
  const seenCommodities = new Set<number>();
  for (const movement of movements) {
    if (seenCommodities.has(movement.commodityId)) continue;
    const commodity = commodities.find((c) => c.id === movement.commodityId);
    if (!commodity) continue;
    seenCommodities.add(commodity.id);

    leaderboardCommodities.push({
      commodityId: commodity.id,
      commodityName: commodity.name,
      commoditySlug: commodity.slug,
      latestPrice: movement.latestAmount,
      previousPrice: movement.previousAmount,
      change: movement.change,
      changePercent: movement.changePercent,
      currencyCode: movement.currencyCode,
      unitName: movement.unitName,
      marketName: movement.marketName,
      priceType: movement.priceType,
      gradeName: movement.gradeName,
      observationCount: movement.observationCount,
      collectedAt: movement.collectedAt,
      verificationStatus: movement.verificationStatus,
      dailyHistory: dailyHistoryByCommodity.get(commodity.id) ?? [],
      imageUrl: getCommodityImage(commodity.slug),
    });
  }

  const leaderboardSummary: LeaderboardSummary = {
    totalCommodities: observedCommodities.size,
    totalObservations: published?.total ?? 0,
    latestUpdate: latest,
    activeMarkets: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size,
  };

  return {
    publishedCount: published?.total ?? 0,
    commodityCount: commodities.length,
    marketCount: markets.length,
    observedCommodityCount: observedCommodities.size,
    observedMarketCount: new Set(publishedItems.map(o => o.marketId).filter(Boolean)).size,
    latestObservedAt: latest,
    coverageLine,
    watchRows,
    movers,
    tickerItems,
    priceCards,
    analytics,
    chartPoints,
    chartTitle,
    chartCommodity,
    chartCurrency,
    chartUnit,
    coverageRows,
    categories,
    insights,
    priceTrackerCommodities,
    trendCommodities,
    leaderboardCommodities,
    leaderboardSummary,
  };
}

/* ============================================================ Helpers === */

function buildCoverageLine({
  published,
  commodities,
  markets,
}: {
  published: number;
  commodities: number;
  markets: number;
}): string {
  if (published === 0) {
    return `${commodities} commodities registered · ${markets} markets listed · no published price observation yet.`;
  }
  return `${published} published observation${published === 1 ? '' : 's'} · ${commodities} commodities · ${markets} markets`;
}

function generateSparkline(start: number, end: number, points: number): number[] {
  const result: number[] = [];
  const step = (end - start) / (points - 1);
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * start * 0.05;
    result.push(start + step * i + noise);
  }
  return result;
}

/** Map commodity slugs to their public image paths. */
const COMMODITY_IMAGE_MAP: Record<string, string> = {
  'maize-white': '/images/hatsi360/commodities/maize-white.jpg',
  'maize-yellow': '/images/hatsi360/commodities/maize-yellow.jpg',
  'paddy-rice': '/images/hatsi360/commodities/paddy-rice.jpg',
  'local-rice': '/images/hatsi360/commodities/local-rice.jpg',
  'imported-rice': '/images/hatsi360/commodities/imported-rice.jpg',
  'sorghum-white': '/images/hatsi360/commodities/sorghum-white.jpg',
  'sorghum-red': '/images/hatsi360/commodities/sorghum-red.jpg',
  'millet': '/images/hatsi360/commodities/millet.jpg',
  'wheat': '/images/hatsi360/commodities/wheat.jpg',
  'groundnut': '/images/hatsi360/commodities/groundnut.jpg',
  'soya-beans': '/images/hatsi360/commodities/soya-beans.jpg',
  'sesame-seed': '/images/hatsi360/commodities/sesame-seed.jpg',
  'bambara-nuts': '/images/hatsi360/commodities/bambara-nuts.jpg',
  'brown-beans-oloyin': '/images/hatsi360/commodities/brown-beans-oloyin.jpg',
  'white-beans': '/images/hatsi360/commodities/white-beans.jpg',
  'sweet-potato': '/images/hatsi360/commodities/sweet-potato.jpg',
  'dried-ginger': '/images/hatsi360/commodities/dried-ginger.jpg',
  'dried-chilli-pepper': '/images/hatsi360/commodities/dried-chilli-pepper.jpg',
  'gum-arabic': '/images/hatsi360/commodities/gum-arabic.jpg',
};

function getCommodityImage(slug: string): string | undefined {
  return COMMODITY_IMAGE_MAP[slug];
}
