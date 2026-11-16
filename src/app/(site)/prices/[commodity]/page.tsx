import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { CommodityPriceView, PRICE_RANGES } from '@/components/data/CommodityPriceView';
import { IntelligenceOverviewPanel, FundamentalSignalsPanel } from '@/components/intelligence/IntelligencePanels';
import { MarketInsights } from '@/components/data/MarketInsights';
import { getDataSource } from '@/lib/data';
import { getCommodityIntelligenceOverview, getCommodityFundamentals } from '@/lib/intelligence/commodity-intelligence';

interface Params {
  params: Promise<{ commodity: string }>;
  searchParams: Promise<{ range?: string }>;
}

/**
 * The price view for one commodity, addressed from the price directory.
 *
 * This is the modern equivalent of the legacy `commodity-detail.php?id=N`
 * page. The dynamic segment accepts either the commodity slug or its legacy
 * numeric id, so old links keep resolving.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { commodity: key } = await params;
  const source = await getDataSource();

  const commodity =
    (await source.getCommodityBySlug(key)) ??
    (await source.getCommodityById(Number(key)));

  if (!commodity) return { title: 'Commodity not found' };

  return {
    title: `${commodity.name} Prices & Market Intelligence | Hatsi360 Markets`,
    description:
      commodity.description ??
      `Explore ${commodity.name} prices, available market observations, historical trends and related agricultural intelligence on Hatsi360 Markets.`,
    alternates: { canonical: `/prices/${commodity.slug}` },
    openGraph: {
      type: 'website',
      siteName: 'Hatsi360 Markets',
      locale: BRAND.locale,
      title: `${commodity.name} Prices & Market Intelligence | Hatsi360 Markets`,
      description:
        commodity.description ??
        `Explore ${commodity.name} prices, available market observations, historical trends and related agricultural intelligence on Hatsi360 Markets.`,
      url: `/prices/${commodity.slug}`,
      images: [
        {
          url: '/brand/hatsi360-social-preview.png',
          width: 1200,
          height: 630,
          alt: `${commodity.name} prices and market intelligence on Hatsi360 Markets.`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${commodity.name} Prices & Market Intelligence | Hatsi360 Markets`,
      description:
        commodity.description ??
        `Explore ${commodity.name} prices, market observations and agricultural intelligence on Hatsi360 Markets.`,
      images: ['/brand/hatsi360-social-preview.png'],
    },
  };
}

export default async function CommodityPricePage({ params, searchParams }: Params) {
  const { commodity: key } = await params;
  const query = await searchParams;
  const source = await getDataSource();

  const commodity =
    (await source.getCommodityBySlug(key)) ??
    (await source.getCommodityById(Number(key)));

  if (!commodity) notFound();

  const rangeKey = query.range ?? 'all';
  const range = PRICE_RANGES.find((r) => r.key === rangeKey) ?? PRICE_RANGES[PRICE_RANGES.length - 1]!;

  const [observations, intelligence, fundamentals] = await Promise.all([
    source.listObservationsForAnalysis({ commodityId: commodity.id }),
    getCommodityIntelligenceOverview(commodity.slug),
    getCommodityFundamentals(commodity.id, 10),
  ]);

  return (
    <>
      <CommodityPriceView
        commodity={commodity}
        observations={observations}
        range={range}
        basePath={`/prices/${commodity.slug}`}
        eyebrow="Price directory"
        breadcrumbs={[
          { href: '/prices', label: 'Prices' },
          { label: commodity.name },
        ]}
      />

      {/* Intelligence sections below the price view */}
      <div className="section">
        <div className="container-page space-y-6">
          <IntelligenceOverviewPanel
            intelligence={intelligence}
            commoditySlug={commodity.slug}
            commodityName={commodity.name}
          />

          <FundamentalSignalsPanel
            signals={fundamentals}
            commodityName={commodity.name}
          />

          {observations.length > 0 && (
            <MarketInsights observations={observations} />
          )}
        </div>
      </div>
    </>
  );
}
