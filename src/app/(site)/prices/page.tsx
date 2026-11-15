import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { PriceExplorer, type PriceExplorerServerData } from '@/components/data/PriceExplorer';
import { MarketInsights } from '@/components/data/MarketInsights';
import { DataCoverageNotice } from '@/components/data/DataCoverageNotice';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { BreadcrumbJsonLd, DatasetJsonLd } from '@/components/marketing/StructuredData';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: { absolute: `${BRAND.productName} — Price Directory` },
  description:
    'Interactive price directory for Nigerian agricultural commodities. Filter by commodity, market, state, and date with live charts, heatmaps and market insights.',
  alternates: { canonical: '/prices' },
};

export const dynamic = 'force-dynamic';

export default async function PricesPage() {
  const source = await getDataSource();

  const [commodities, categories, states, markets, allObservations] = await Promise.all([
    source.listCommodities(),
    source.listCategories(),
    source.listStates(),
    source.listMarkets(),
    source.listObservations({ page: 1, pageSize: 10000, sort: 'recent' }).catch(() => null),
  ]);

  const observations = allObservations?.items ?? [];

  const latestCollectedAt = observations.length
    ? observations.reduce<string | null>((acc, o) => (acc == null || o.collectedAt > acc ? o.collectedAt : acc), null)
    : null;
  const oldestCollectedAt = observations.length
    ? observations.reduce<string | null>((acc, o) => (acc == null || o.collectedAt < acc ? o.collectedAt : acc), null)
    : null;

  const data: PriceExplorerServerData = {
    observations,
    commodities,
    categories,
    markets,
    states,
    totalPublished: observations.length,
    totalCommodities: commodities.length,
    totalMarkets: markets.length,
    latestCollectedAt,
    oldestCollectedAt,
  };

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Price directory' }]} />
      <DatasetJsonLd
        name="Published agricultural commodity price observations"
        description="Every published price observation in Northern Nigeria, with the market, unit, price type, collection time and verification status of each figure."
        url="/prices"
        keywords={[
          'agricultural prices Nigeria',
          'commodity prices',
          'market prices',
          'grain prices',
          'Northern Nigeria',
        ]}
        temporalCoverage={
          oldestCollectedAt && latestCollectedAt
            ? `${oldestCollectedAt.slice(0, 10)}/${latestCollectedAt.slice(0, 10)}`
            : undefined
        }
      />

      <PageHero
        eyebrow="Price directory"
        title="Every published price observation"
        lede="Search, filter and explore agricultural commodity prices with interactive charts, heatmaps and market insights. All data is field-verified and traceable."
        breadcrumbs={[{ label: 'Prices' }]}
        image={getPageImage('commodity-directory.hero')}
      />

      <div className="section">
        <div className="container-page space-y-6">
          <DataCoverageNotice
            latestCollectedAt={latestCollectedAt}
            observationCount={observations.length}
          />

          <PriceExplorer data={data} />

          {observations.length > 0 && (
            <MarketInsights observations={observations} />
          )}
        </div>
      </div>
    </>
  );
}
