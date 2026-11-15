import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { CoverageDashboard, type CoverageServerData } from '@/components/data/CoverageDashboard';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { BreadcrumbJsonLd } from '@/components/marketing/StructuredData';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Collection Coverage',
  description:
    'Interactive coverage dashboard showing where Hatsi360 collects prices, market reporting status, and data freshness across Nigerian states.',
  alternates: { canonical: '/coverage' },
};

export const dynamic = 'force-dynamic';

export default async function CoverageReportPage() {
  const source = await getDataSource();

  const [markets, commodities, observations] = await Promise.all([
    source.listMarkets(),
    source.listCommodities(),
    source.listObservationsForAnalysis({}),
  ]);

  const data: CoverageServerData = {
    markets,
    commodities,
    observations,
  };

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Coverage' }]} />
      <PageHero
        eyebrow="Coverage Dashboard"
        title="Where Hatsi360 collects — and where it does not"
        lede="Interactive coverage analytics showing market reporting status, commodity observation counts, and data freshness across all Nigerian states."
        breadcrumbs={[{ label: 'Coverage' }]}
        image={getPageImage('reports.coverage')}
      />

      <div className="section">
        <div className="container-page">
          <CoverageDashboard data={data} />
        </div>
      </div>
    </>
  );
}
