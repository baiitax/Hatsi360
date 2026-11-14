import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { EvidenceBadge } from '@/components/intelligence/EvidenceBadge';

export const metadata = {
  title: 'Commodity Intelligence | Hatsi360',
  description: 'Production, supply, demand, and trade analysis for Nigerian agricultural commodities. Data sourced from FAOSTAT with full provenance tracking.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

export default async function IntelligenceIndexPage() {
  const supabase = await createClient();

  // Fetch all commodities with intelligence overview
  const { data: commodities, error } = await supabase
    .from('analytics_commodity_overview')
    .select('*')
    .order('commodity_name', { ascending: true });

  if (error) {
    console.error('Failed to load commodities:', error);
  }

  // Separate commodities with and without intelligence data
  const withData = (commodities || []).filter((c: any) => c.latest_production_mt !== null);
  const withoutData = (commodities || []).filter((c: any) => c.latest_production_mt === null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <EvidenceBadge
            sourceName="FAOSTAT"
            sourceType="international_org"
            date="2023"
            reliability={0.92}
          />
        </div>
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">
          Commodity Intelligence
        </h1>
        <p className="text-xl text-neutral-600 max-w-3xl">
          Production, supply, demand, and trade analysis for Nigerian agricultural commodities.
          All data is sourced from FAOSTAT with full provenance tracking and evidence attribution.
        </p>
      </div>

      {/* Introduction */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          Evidence-Backed Agricultural Intelligence
        </h2>
        <p className="text-blue-800 text-sm mb-4">
          This intelligence platform provides comprehensive analysis of Nigerian agricultural commodities.
          Every data point is traceable to its original source with full provenance metadata. The platform
          covers production trends, supply-demand balances, trade flows, and key market indicators.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-semibold text-blue-900">Production Data:</span>
            <span className="text-blue-700 ml-2">Historical yields, volumes, and trends</span>
          </div>
          <div>
            <span className="font-semibold text-blue-900">Supply-Demand:</span>
            <span className="text-blue-700 ml-2">Balance sheets with stock-to-use ratios</span>
          </div>
          <div>
            <span className="font-semibold text-blue-900">Trade Flows:</span>
            <span className="text-blue-700 ml-2">Import/export volumes with partner countries</span>
          </div>
        </div>
      </div>

      {/* Commodities with Intelligence Data */}
      {withData.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            Commodities with Intelligence Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {withData.map((commodity) => (
              <Link
                key={commodity.commodity_id}
                href={`/intelligence/${commodity.commodity_slug}`}
                className="block bg-white border border-neutral-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {commodity.commodity_name}
                  </h3>
                  <EvidenceBadge
                    sourceName="FAOSTAT"
                    sourceType="international_org"
                    date={commodity.latest_production_year?.toString() || '2023'}
                    reliability={0.92}
                  />
                </div>

                <div className="space-y-3">
                  {/* Production */}
                  {commodity.latest_production_mt && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Production</div>
                      <div className="text-xl font-bold text-neutral-900">
                        {(commodity.latest_production_mt / 1_000_000).toFixed(2)}M MT
                      </div>
                      <div className="text-xs text-neutral-500">
                        {commodity.latest_production_year}
                      </div>
                    </div>
                  )}

                  {/* Self-Sufficiency */}
                  {commodity.self_sufficiency_percent !== null && (
                    <div>
                      <div className="text-sm text-neutral-600 mb-1">Self-Sufficiency</div>
                      <div className="text-xl font-bold text-neutral-900">
                        {commodity.self_sufficiency_percent.toFixed(1)}%
                      </div>
                      <div className="text-xs text-neutral-500">
                        {commodity.self_sufficiency_percent >= 100 ? 'Net exporter' : 'Import dependent'}
                      </div>
                    </div>
                  )}

                  {/* Evidence Records */}
                  <div className="pt-3 border-t border-neutral-100">
                    <div className="text-xs text-neutral-500">
                      {commodity.total_evidence_records} evidence records
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-blue-600 text-sm font-medium flex items-center gap-1">
                  View full intelligence
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Commodities without Intelligence Data */}
      {withoutData.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-neutral-900 mb-6">
            Commodities Without Intelligence Data
          </h2>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-6">
            <p className="text-neutral-600 text-sm mb-4">
              The following commodities are tracked in the Hatsi360 platform but do not yet have
              intelligence data from external sources. Intelligence data will be populated as the
              ingestion pipeline processes more sources and maps them to these commodities.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {withoutData.map((commodity) => (
              <div
                key={commodity.commodity_id}
                className="bg-white border border-neutral-200 rounded-lg p-4 opacity-60"
              >
                <h3 className="text-base font-medium text-neutral-700">
                  {commodity.commodity_name}
                </h3>
                <p className="text-sm text-neutral-500 mt-1">
                  Intelligence data pending
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Data Sources */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Data Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">FAOSTAT</h3>
                <p className="text-sm text-neutral-600">
                  Food and Agriculture Organization of the United Nations
                </p>
              </div>
              <EvidenceBadge
                sourceName="FAOSTAT"
                sourceType="international_org"
                date="2023"
                reliability={0.92}
              />
            </div>
            <p className="text-sm text-neutral-700 mb-3">
              Primary source for global agricultural statistics. Provides production, supply, demand,
              and trade data for 200+ countries and territories.
            </p>
            <div className="text-xs text-neutral-500 space-y-1">
              <div><span className="font-semibold">Coverage:</span> Production, supply-demand, trade flows</div>
              <div><span className="font-semibold">Update Frequency:</span> Annual</div>
              <div><span className="font-semibold">License:</span> CC BY-NC-SA 3.0 IGO</div>
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">USDA FAS</h3>
                <p className="text-sm text-neutral-600">
                  United States Department of Agriculture — Foreign Agricultural Service
                </p>
              </div>
              <EvidenceBadge
                sourceName="USDA FAS"
                sourceType="government"
                date="2023"
                reliability={0.90}
              />
            </div>
            <p className="text-sm text-neutral-700 mb-3">
              Production, Supply, and Distribution (PSD) database. Provides comprehensive
              supply-demand balance sheets for major agricultural commodities.
            </p>
            <div className="text-xs text-neutral-500 space-y-1">
              <div><span className="font-semibold">Coverage:</span> Supply-demand balance sheets</div>
              <div><span className="font-semibold">Update Frequency:</span> Monthly</div>
              <div><span className="font-semibold">License:</span> Public domain (US government)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="mt-12 mb-8">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">Methodology</h2>
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <div className="prose prose-neutral max-w-none">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">
              Evidence-Backed Intelligence
            </h3>
            <p className="text-neutral-700 mb-4">
              All intelligence data is sourced from authoritative external databases with full provenance
              tracking. Each data point carries metadata about its source, collection date, and reliability
              score. The platform never fabricates data or presents estimates as verified facts.
            </p>

            <h3 className="text-lg font-semibold text-neutral-900 mb-3">
              Key Metrics
            </h3>
            <ul className="list-disc list-inside space-y-2 text-neutral-700 mb-4">
              <li>
                <span className="font-semibold">Self-Sufficiency Ratio:</span> Domestic production as a percentage
                of total demand. Values above 100% indicate net exports; below 100% indicate import dependency.
              </li>
              <li>
                <span className="font-semibold">Stock-to-Use Ratio:</span> Ending stocks as a percentage of total
                demand. This is a key food security indicator — values above 20% are considered comfortable,
                10-20% adequate, and below 10% tight.
              </li>
              <li>
                <span className="font-semibold">Supply-Demand Balance:</span> The difference between total supply
                and total demand, expressed as a percentage. Positive values indicate surplus; negative values
                indicate deficit.
              </li>
            </ul>

            <h3 className="text-lg font-semibold text-neutral-900 mb-3">
              Data Limitations
            </h3>
            <p className="text-neutral-700">
              Intelligence data is updated annually from external sources and may lag behind real-time market
              conditions. Production data represents official statistics and may not capture informal or
              unreported production. Trade data reflects reported customs declarations and may not include
              all cross-border flows, particularly informal trade.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
