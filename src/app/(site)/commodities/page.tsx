import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import {
  getCommodityFreshness,
  type CommodityFreshness,
} from '@/lib/trade/queries';
import { CommodityExplorer, type CommodityExplorerData } from '@/components/data/CommodityExplorer';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { BreadcrumbJsonLd } from '@/components/marketing/StructuredData';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Agricultural Commodity Intelligence | Hatsi360 Markets',
  description:
    'Discover agricultural commodities, their market prices, quality information, historical trends and available intelligence across African agricultural markets.',
  alternates: { canonical: '/commodities' },
  openGraph: {
    type: 'website',
    siteName: 'Hatsi360 Markets',
    locale: BRAND.locale,
    title: 'Agricultural Commodity Intelligence | Hatsi360 Markets',
    description:
      'Discover agricultural commodities, their market prices, quality information, historical trends and available intelligence across African agricultural markets.',
    url: '/commodities',
    images: [{ url: '/brand/hatsi360-social-preview.png', width: 1200, height: 630, type: 'image/png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agricultural Commodity Intelligence | Hatsi360 Markets',
    description:
      'Discover agricultural commodities, their market prices, quality information, historical trends and available intelligence across African agricultural markets.',
    images: ['/brand/hatsi360-social-preview.png'],
  },
};

export const dynamic = 'force-dynamic';

export default async function CommodityDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const source = configured ? await getDataSource() : null;

  const [commodities, categories, freshness]: [
    any[],
    any[],
    CommodityFreshness[],
  ] = source
    ? await Promise.all([
        source.listCommodities(),
        source.listCategories(),
        getCommodityFreshness(),
      ])
    : [[], [], []];

  // Legacy id redirect
  if (params.id) {
    const legacyId = Number(params.id);
    const match = commodities.find((c: any) => c.legacyId === legacyId);
    if (match) redirect(`/prices/${match.slug}`);
  }

  const data: CommodityExplorerData = {
    commodities,
    categories,
    freshness,
  };

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Commodity directory' }]} />
      <PageHero
        eyebrow="Commodity Directory"
        title={`Every commodity we track — ${commodities.length} in the catalogue`}
        lede="Search, filter and explore the complete catalogue of agricultural commodities. Each entry shows how many markets report it and how current the data is."
        breadcrumbs={[{ label: 'Commodities' }]}
        image={getPageImage('commodity-directory.hero')}
      />

      <div className="section">
        <div className="container-page">
          {!configured ? (
            <div className="card p-12 text-center">
              <h3 className="text-lg font-semibold text-ink-900">Database not configured</h3>
              <p className="mt-2 text-sm text-ink-500">
                Connect Supabase to see the commodity catalogue.
              </p>
            </div>
          ) : (
            <CommodityExplorer data={data} />
          )}
        </div>
      </div>
    </>
  );
}
