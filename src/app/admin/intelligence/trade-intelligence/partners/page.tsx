/**
 * Partner Country Trade Profiles
 *
 * Phase 07 Stage 4: Country-level trade analysis
 *
 * Shows all partner countries with their trade values,
 * commodity breakdowns, and flow types.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Partner Country Trade Profiles — Nigeria',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PartnerCountriesPage() {
  const supabase = await createClient();

  // Fetch all trade records with country and commodity info
  const { data: records } = await supabase
    .from('international_trade_records')
    .select(`
      flow_type,
      trade_value_usd,
      quantity_kg,
      year,
      commodity:commodity_id(id, name),
      hs_code:hs_code_id(code),
      partner_country:partner_country_id(id, name, iso_alpha3),
      source:source_id(name)
    `)
    .eq('reporting_country_id', 1)
    .eq('validation_status', 'validated')
    .order('trade_value_usd', { ascending: false });

  // Aggregate by partner country
  const partnerMap = new Map<number, {
    country_name: string;
    country_code: string;
    export_value: number;
    import_value: number;
    export_records: number;
    import_records: number;
    commodities: Set<string>;
    years: Set<number>;
    top_commodity: string;
    top_commodity_value: number;
  }>();

  for (const record of records ?? []) {
    const partner = (record as any).partner_country;
    const commodity = (record as any).commodity;
    const partnerId = partner.id as number;
    const value = record.trade_value_usd ?? 0;
    const flowType = record.flow_type;
    const commodityName = commodity?.name ?? 'Unknown';
    const year = record.year;

    if (!partnerMap.has(partnerId)) {
      partnerMap.set(partnerId, {
        country_name: partner.name,
        country_code: partner.iso_alpha3,
        export_value: 0,
        import_value: 0,
        export_records: 0,
        import_records: 0,
        commodities: new Set(),
        years: new Set(),
        top_commodity: '',
        top_commodity_value: 0,
      });
    }

    const entry = partnerMap.get(partnerId)!;
    entry.years.add(year);
    entry.commodities.add(commodityName);

    if (flowType === 'export') {
      entry.export_value += value;
      entry.export_records += 1;
    } else {
      entry.import_value += value;
      entry.import_records += 1;
    }

    // Track top commodity
    if (value > entry.top_commodity_value) {
      entry.top_commodity_value = value;
      entry.top_commodity = commodityName;
    }
  }

  // Convert to array and sort
  const partners = Array.from(partnerMap.entries())
    .map(([country_id, data]) => ({
      country_id,
      country_name: data.country_name,
      country_code: data.country_code,
      export_value: data.export_value,
      import_value: data.import_value,
      total_value: data.export_value + data.import_value,
      export_records: data.export_records,
      import_records: data.import_records,
      total_records: data.export_records + data.import_records,
      commodities: Array.from(data.commodities),
      years: Array.from(data.years).sort(),
      top_commodity: data.top_commodity,
    }))
    .sort((a, b) => b.total_value - a.total_value);

  const totalExports = partners.reduce((sum, p) => sum + p.export_value, 0);
  const totalImports = partners.reduce((sum, p) => sum + p.import_value, 0);

  return (
    <>
      <PageHeader
        title="Partner Country Trade Profiles"
        description="Detailed trade analysis by partner country. Shows export destinations and import sources for Nigeria."
      />

      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-neutral-500">
        <Link href="/admin/intelligence/trade-intelligence" className="text-blue-600 hover:underline">
          ← Back to Trade Intelligence
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Partner Countries</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">{partners.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Exports</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">${formatCurrency(totalExports)}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Total Imports</p>
          <p className="mt-1 text-2xl font-semibold text-blue-700">${formatCurrency(totalImports)}</p>
        </div>
      </div>

      {/* Export Destinations */}
      <Panel title="Export Destinations">
        <p className="mb-3 text-xs text-neutral-500">Countries that Nigeria exports to</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-4 py-2 text-right">Export Value</th>
                <th className="px-4 py-2 text-right">% of Total</th>
                <th className="px-4 py-2 text-left">Top Commodity</th>
                <th className="px-4 py-2 text-center">Years</th>
                <th className="px-4 py-2 text-right">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {partners
                .filter((p) => p.export_value > 0)
                .sort((a, b) => b.export_value - a.export_value)
                .map((partner, index) => {
                  const sharePercent = totalExports > 0 ? (partner.export_value / totalExports) * 100 : 0;
                  
                  return (
                    <tr key={partner.country_id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2 text-neutral-500">{index + 1}</td>
                      <td className="px-4 py-2">
                        <span className="font-medium text-neutral-900">{partner.country_name}</span>
                        <span className="ml-1 text-xs text-neutral-400">{partner.country_code}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-700">
                        ${formatCurrency(partner.export_value)}
                      </td>
                      <td className="px-4 py-2 text-right text-neutral-700">
                        {sharePercent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2 text-neutral-700">{partner.top_commodity || '—'}</td>
                      <td className="px-4 py-2 text-center text-xs text-neutral-500">
                        {partner.years.join(', ')}
                      </td>
                      <td className="px-4 py-2 text-right text-neutral-500">{partner.export_records}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Import Sources */}
      <div className="mt-6">
        <Panel title="Import Sources">
          <p className="mb-3 text-xs text-neutral-500">Countries that Nigeria imports from</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Country</th>
                  <th className="px-4 py-2 text-right">Import Value</th>
                  <th className="px-4 py-2 text-right">% of Total</th>
                  <th className="px-4 py-2 text-left">Top Commodity</th>
                  <th className="px-4 py-2 text-center">Years</th>
                  <th className="px-4 py-2 text-right">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {partners
                  .filter((p) => p.import_value > 0)
                  .sort((a, b) => b.import_value - a.import_value)
                  .map((partner, index) => {
                    const sharePercent = totalImports > 0 ? (partner.import_value / totalImports) * 100 : 0;
                    
                    return (
                      <tr key={partner.country_id} className="hover:bg-neutral-50">
                        <td className="px-4 py-2 text-neutral-500">{index + 1}</td>
                        <td className="px-4 py-2">
                          <span className="font-medium text-neutral-900">{partner.country_name}</span>
                          <span className="ml-1 text-xs text-neutral-400">{partner.country_code}</span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-blue-700">
                          ${formatCurrency(partner.import_value)}
                        </td>
                        <td className="px-4 py-2 text-right text-neutral-700">
                          {sharePercent.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2 text-neutral-700">{partner.top_commodity || '—'}</td>
                        <td className="px-4 py-2 text-center text-xs text-neutral-500">
                          {partner.years.join(', ')}
                        </td>
                        <td className="px-4 py-2 text-right text-neutral-500">{partner.import_records}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Attribution */}
      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <p>
          Data source: UN Comtrade Database (CC-BY-4.0). Showing {partners.length} partner countries with real bilateral trade data.
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
