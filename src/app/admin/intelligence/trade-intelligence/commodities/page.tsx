/**
 * Commodity Trade Profiles
 *
 * Phase 07 Stage 4: Commodity-level trade analysis
 *
 * Shows trade patterns by commodity with partner breakdowns,
 * flow types, and yearly trends.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Commodity Trade Profiles — Nigeria',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function CommodityTradeProfilesPage() {
  const supabase = await createClient();

  // Fetch all trade records
  const { data: records } = await supabase
    .from('international_trade_records')
    .select(`
      flow_type,
      trade_value_usd,
      quantity_kg,
      year,
      commodity:commodity_id(id, name, slug),
      hs_code:hs_code_id(code, description),
      partner_country:partner_country_id(id, name, iso_alpha3)
    `)
    .eq('reporting_country_id', 1)
    .eq('validation_status', 'validated')
    .order('trade_value_usd', { ascending: false });

  // Aggregate by commodity
  const commodityMap = new Map<number, {
    commodity_name: string;
    hs_code: string;
    export_value: number;
    import_value: number;
    export_quantity: number;
    import_quantity: number;
    export_records: number;
    import_records: number;
    export_partners: Map<number, { name: string; code: string; value: number }>;
    import_partners: Map<number, { name: string; code: string; value: number }>;
    years: Set<number>;
  }>();

  for (const record of records ?? []) {
    const commodity = (record as any).commodity;
    const hsCode = (record as any).hs_code;
    const partner = (record as any).partner_country;
    const commodityId = commodity.id as number;
    const value = record.trade_value_usd ?? 0;
    const quantity = record.quantity_kg ?? 0;
    const flowType = record.flow_type;
    const year = record.year;

    if (!commodityMap.has(commodityId)) {
      commodityMap.set(commodityId, {
        commodity_name: commodity.name,
        hs_code: hsCode.code,
        export_value: 0,
        import_value: 0,
        export_quantity: 0,
        import_quantity: 0,
        export_records: 0,
        import_records: 0,
        export_partners: new Map(),
        import_partners: new Map(),
        years: new Set(),
      });
    }

    const entry = commodityMap.get(commodityId)!;
    entry.years.add(year);

    if (flowType === 'export') {
      entry.export_value += value;
      entry.export_quantity += quantity;
      entry.export_records += 1;

      // Track partner
      const existing = entry.export_partners.get(partner.id);
      if (existing) {
        existing.value += value;
      } else {
        entry.export_partners.set(partner.id, {
          name: partner.name,
          code: partner.iso_alpha3,
          value,
        });
      }
    } else {
      entry.import_value += value;
      entry.import_quantity += quantity;
      entry.import_records += 1;

      // Track partner
      const existing = entry.import_partners.get(partner.id);
      if (existing) {
        existing.value += value;
      } else {
        entry.import_partners.set(partner.id, {
          name: partner.name,
          code: partner.iso_alpha3,
          value,
        });
      }
    }
  }

  // Convert to array
  const commodities = Array.from(commodityMap.entries()).map(([id, data]) => {
    const balance = data.export_value - data.import_value;
    const totalValue = data.export_value + data.import_value;

    const topExportPartners = Array.from(data.export_partners.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topImportPartners = Array.from(data.import_partners.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return {
      commodity_id: id,
      commodity_name: data.commodity_name,
      hs_code: data.hs_code,
      export_value: data.export_value,
      import_value: data.import_value,
      total_value: totalValue,
      balance,
      export_quantity: data.export_quantity,
      import_quantity: data.import_quantity,
      export_records: data.export_records,
      import_records: data.import_records,
      total_records: data.export_records + data.import_records,
      export_partners: topExportPartners,
      import_partners: topImportPartners,
      years: Array.from(data.years).sort(),
    };
  }).sort((a, b) => b.total_value - a.total_value);

  return (
    <>
      <PageHeader
        title="Commodity Trade Profiles"
        description="Trade patterns by commodity with partner breakdowns and flow analysis."
      />

      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-neutral-500">
        <Link href="/admin/intelligence/trade-intelligence" className="text-blue-600 hover:underline">
          ← Back to Trade Intelligence
        </Link>
      </div>

      {/* Commodity Cards */}
      <div className="space-y-6">
        {commodities.map((commodity) => {
          const balanceTone: PillTone = commodity.balance > 0 ? 'success' : commodity.balance < 0 ? 'danger' : 'neutral';
          
          return (
            <Panel key={commodity.commodity_id} title={`${commodity.commodity_name} (HS ${commodity.hs_code})`}>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-5">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Value</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">${formatCurrency(commodity.total_value)}</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Exports</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-700">${formatCurrency(commodity.export_value)}</p>
                  <p className="text-xs text-emerald-600">{commodity.export_records} records</p>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Imports</p>
                  <p className="mt-1 text-lg font-semibold text-blue-700">${formatCurrency(commodity.import_value)}</p>
                  <p className="text-xs text-blue-600">{commodity.import_records} records</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Trade Balance</p>
                  <p className="mt-1">
                    <Pill tone={balanceTone}>
                      {commodity.balance > 0 ? '+' : ''}${formatCurrency(Math.abs(commodity.balance))}
                    </Pill>
                  </p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Years</p>
                  <p className="mt-1 text-sm font-medium text-neutral-900">{commodity.years.join(', ')}</p>
                </div>
              </div>

              {/* Partners Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Export Partners */}
                {commodity.export_partners.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-neutral-700">Top Export Destinations</h4>
                    <div className="space-y-2">
                      {commodity.export_partners.map((partner, index) => {
                        const share = commodity.export_value > 0 
                          ? (partner.value / commodity.export_value) * 100 
                          : 0;
                        
                        return (
                          <div key={partner.code} className="flex items-center justify-between rounded border border-neutral-100 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-neutral-900">{partner.name}</p>
                                <p className="text-xs text-neutral-500">{partner.code}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono text-emerald-700">${formatCurrency(partner.value)}</p>
                              <p className="text-xs text-neutral-500">{share.toFixed(1)}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Import Partners */}
                {commodity.import_partners.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-neutral-700">Top Import Sources</h4>
                    <div className="space-y-2">
                      {commodity.import_partners.map((partner, index) => {
                        const share = commodity.import_value > 0 
                          ? (partner.value / commodity.import_value) * 100 
                          : 0;
                        
                        return (
                          <div key={partner.code} className="flex items-center justify-between rounded border border-neutral-100 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-neutral-900">{partner.name}</p>
                                <p className="text-xs text-neutral-500">{partner.code}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono text-blue-700">${formatCurrency(partner.value)}</p>
                              <p className="text-xs text-neutral-500">{share.toFixed(1)}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Info */}
              {(commodity.export_quantity > 0 || commodity.import_quantity > 0) && (
                <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Trade Volumes</p>
                  <div className="mt-2 flex gap-6 text-sm">
                    {commodity.export_quantity > 0 && (
                      <div>
                        <span className="text-neutral-600">Export quantity: </span>
                        <span className="font-mono text-neutral-900">
                          {commodity.export_quantity.toLocaleString()} kg
                        </span>
                      </div>
                    )}
                    {commodity.import_quantity > 0 && (
                      <div>
                        <span className="text-neutral-600">Import quantity: </span>
                        <span className="font-mono text-neutral-900">
                          {commodity.import_quantity.toLocaleString()} kg
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Attribution */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <p>
          Data source: UN Comtrade Database (CC-BY-4.0). Showing {commodities.length} commodities with real bilateral trade data.
        </p>
      </div>
    </>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}
