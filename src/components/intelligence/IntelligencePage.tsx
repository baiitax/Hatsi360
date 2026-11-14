'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProductionChart } from './ProductionChart';
import { SupplyDemandChart } from './SupplyDemandChart';
import { TradeFlowChart } from './TradeFlowChart';
import { EvidenceBadge } from './EvidenceBadge';
import { KpiCard } from '@/components/ops/KpiCard';

interface CommodityIntelligence {
  commodity_id: number;
  commodity_name: string;
  commodity_slug: string;
  latest_production_year: number | null;
  latest_production_mt: number | null;
  latest_yield_mt_per_ha: number | null;
  self_sufficiency_percent: number | null;
  stock_to_use_percent: number | null;
  latest_exports_mt: number | null;
  latest_imports_mt: number | null;
  total_evidence_records: number;
}

interface Props {
  slug: string;
}

export function IntelligencePage({ slug }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [intelligence, setIntelligence] = useState<CommodityIntelligence | null>(null);
  const [productionTrends, setProductionTrends] = useState<any[]>([]);
  const [supplyDemand, setSupplyDemand] = useState<any[]>([]);
  const [tradeData, setTradeData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch commodity overview
        const { data: overviewData, error: overviewError } = await supabase
          .from('analytics_commodity_overview')
          .select('*')
          .eq('commodity_slug', slug)
          .single();

        if (overviewError || !overviewData) {
          console.error('Failed to load commodity overview:', overviewError);
          return;
        }

        setIntelligence(overviewData);

        // Fetch production trends
        const { data: productionData } = await supabase
          .from('analytics_production_trends')
          .select('*')
          .eq('commodity_slug', slug)
          .eq('country_code', 'NGA')
          .order('year', { ascending: true });

        if (productionData) {
          setProductionTrends(productionData);
        }

        // Fetch supply-demand balance
        const { data: supplyDemandData } = await supabase
          .from('analytics_supply_demand_balance')
          .select('*')
          .eq('commodity_slug', slug)
          .eq('country_code', 'NGA')
          .order('year', { ascending: true });

        if (supplyDemandData) {
          setSupplyDemand(supplyDemandData);
        }

        // Fetch trade summary
        const { data: tradeSummaryData } = await supabase
          .from('analytics_trade_summary')
          .select('*')
          .eq('commodity_slug', slug)
          .eq('reporter_country', 'NGA')
          .order('year', { ascending: true });

        if (tradeSummaryData) {
          setTradeData(tradeSummaryData);
        }
      } catch (error) {
        console.error('Error loading intelligence data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading intelligence data...</p>
        </div>
      </div>
    );
  }

  if (!intelligence) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
        <h3 className="text-lg font-semibold text-amber-900 mb-2">No Intelligence Data Available</h3>
        <p className="text-amber-700">
          No commodity intelligence data is available for this commodity yet.
          Data will be populated once the FAOSTAT ingestion pipeline runs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Evidence Badge */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">
            {intelligence.commodity_name} Intelligence
          </h2>
          <p className="text-neutral-600">
            Production, supply, demand, and trade analysis for {intelligence.commodity_name} in Nigeria.
            All data is sourced from FAOSTAT with full provenance tracking.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <EvidenceBadge
            sourceName="FAOSTAT"
            sourceType="international_org"
            date={intelligence.latest_production_year?.toString() || '2023'}
            reliability={0.92}
          />
          <span className="text-xs text-neutral-500">
            {intelligence.total_evidence_records} evidence records
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Latest Production"
          value={
            intelligence.latest_production_mt
              ? `${(intelligence.latest_production_mt / 1_000_000).toFixed(2)}M MT`
              : '—'
          }
          detail={intelligence.latest_production_year ? `Year ${intelligence.latest_production_year}` : undefined}
        />
        <KpiCard
          label="Self-Sufficiency"
          value={
            intelligence.self_sufficiency_percent !== null
              ? `${intelligence.self_sufficiency_percent.toFixed(1)}%`
              : '—'
          }
          detail={
            intelligence.self_sufficiency_percent !== null
              ? intelligence.self_sufficiency_percent >= 100
                ? 'Net exporter'
                : 'Import dependent'
              : undefined
          }
        />
        <KpiCard
          label="Stock-to-Use"
          value={
            intelligence.stock_to_use_percent !== null
              ? `${intelligence.stock_to_use_percent.toFixed(1)}%`
              : '—'
          }
          detail={
            intelligence.stock_to_use_percent !== null
              ? intelligence.stock_to_use_percent >= 20
                ? 'Comfortable'
                : intelligence.stock_to_use_percent >= 10
                ? 'Adequate'
                : 'Tight'
              : undefined
          }
        />
        <KpiCard
          label="Yield"
          value={
            intelligence.latest_yield_mt_per_ha
              ? `${intelligence.latest_yield_mt_per_ha.toFixed(2)} MT/ha`
              : '—'
          }
          detail={intelligence.latest_production_year ? `Year ${intelligence.latest_production_year}` : undefined}
        />
      </div>

      {/* Production Trends */}
      {productionTrends.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold text-neutral-900 mb-4">Production Trends</h3>
          <ProductionChart data={productionTrends} />
        </section>
      )}

      {/* Supply-Demand Balance */}
      {supplyDemand.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold text-neutral-900 mb-4">Supply & Demand Balance</h3>
          <SupplyDemandChart data={supplyDemand} />
        </section>
      )}

      {/* Trade Flows */}
      {tradeData.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold text-neutral-900 mb-4">Trade Flows</h3>
          <TradeFlowChart data={tradeData} commodityName={intelligence.commodity_name} />
        </section>
      )}

      {/* Data Quality Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-blue-900 mb-2">Data Quality & Provenance</h4>
        <p className="text-blue-800 text-sm mb-4">
          All intelligence data displayed on this page is sourced from{' '}
          <span className="font-semibold">FAOSTAT</span> (Food and Agriculture Organization of the United Nations),
          the most authoritative source for global agricultural statistics. Data is updated annually and
          represents verified official statistics. Each data point is traceable to its original source
          with full provenance metadata.
        </p>
        <div className="flex items-center gap-4 text-sm text-blue-700">
          <div>
            <span className="font-semibold">Source:</span> FAOSTAT
          </div>
          <div>
            <span className="font-semibold">Reliability:</span> 92/100
          </div>
          <div>
            <span className="font-semibold">Evidence Records:</span> {intelligence.total_evidence_records}
          </div>
        </div>
      </div>

      {/* Empty State for Missing Data */}
      {productionTrends.length === 0 && supplyDemand.length === 0 && tradeData.length === 0 && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Limited Intelligence Data
          </h3>
          <p className="text-neutral-600">
            While basic commodity overview data is available, detailed production trends,
            supply-demand analysis, and trade flow data are not yet available for this commodity.
            This data will be populated as the intelligence ingestion pipeline processes more sources.
          </p>
        </div>
      )}
    </div>
  );
}
