import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getDataSource } from '@/lib/data';
import { MarketExplorer, type MarketExplorerData } from '@/components/data/MarketExplorer';
import { PageHero } from '@/components/ui/PageHero';
import { getPageImage } from '@/lib/images/registry';
import { BreadcrumbJsonLd, DatasetJsonLd } from '@/components/marketing/StructuredData';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Market Directory',
  description:
    'Interactive directory of Nigerian agricultural markets with live trading data, commodity coverage, and price observations.',
  alternates: { canonical: '/markets' },
};

export const dynamic = 'force-dynamic';

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ market_id?: string }>;
}) {
  const params = await searchParams;
  const source = await getDataSource();

  const [markets, commodities, observations, states] = await Promise.all([
    source.listMarkets(),
    source.listCommodities(),
    source.listObservationsForAnalysis({}),
    source.listStates(),
  ]);

  // Legacy id redirect
  if (params.market_id) {
    const legacyId = Number(params.market_id);
    const match = markets.find((m) => m.legacyId === legacyId);
    if (match) redirect(`/markets/${match.slug}`);
  }

  const data: MarketExplorerData = {
    markets,
    commodities,
    observations,
    states,
  };

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Markets' }]} />
      <DatasetJsonLd
        name="Hatsi360 market directory"
        description={`Interactive directory of ${markets.length} markets across ${states.length} states where Hatsi360 collects agricultural commodity prices.`}
        url="/markets"
        keywords={[
          'Nigerian commodity markets',
          'market directory',
          'agricultural markets Nigeria',
          'Dawanau market',
          'Mile 12 market',
        ]}
      />

      <PageHero
        eyebrow="Market Directory"
        title={`${markets.length} markets across ${states.length} states`}
        lede="Explore Nigerian agricultural markets with live trading data. Filter by state, search by name or commodity, and view real-time price observations."
        breadcrumbs={[{ label: 'Markets' }]}
        image={getPageImage('market-directory.hero')}
      />

      <div className="section">
        <div className="container-page">
          <MarketExplorer data={data} />
        </div>
      </div>
    </>
  );
}
