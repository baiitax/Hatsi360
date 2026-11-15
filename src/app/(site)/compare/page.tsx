import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { CompareExplorer, type CompareServerData } from '@/components/data/CompareExplorer';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { BreadcrumbJsonLd } from '@/components/marketing/StructuredData';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Compare prices across markets',
  description:
    'Interactive comparison of agricultural commodity prices across Nigerian markets. Visual charts and detailed data tables.',
  alternates: { canonical: '/compare' },
};

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const source = await getDataSource();

  const [commodities, observations] = await Promise.all([
    source.listCommodities(),
    source.listObservationsForAnalysis({}),
  ]);

  const data: CompareServerData = {
    commodities,
    observations,
  };

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Compare' }]} />
      <PageHero
        eyebrow="Market Comparison"
        title="Compare prices across markets"
        lede="Select a commodity and see how prices vary across Nigerian markets. We only compare figures with compatible measurement units."
        breadcrumbs={[{ label: 'Compare' }]}
        image={getPageImage('market-directory.hero')}
      />

      <div className="section">
        <div className="container-page">
          <CompareExplorer data={data} />
        </div>
      </div>
    </>
  );
}
