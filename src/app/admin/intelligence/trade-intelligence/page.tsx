/**
 * Global Trade Intelligence Dashboard
 *
 * Phase 07 Stage 4: Trade Intelligence Analytics
 *
 * Overview of Nigeria's international trade flows, partner countries,
 * commodity breakdowns, and trade balance analysis. Uses real UN Comtrade data.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { KpiCard } from '@/components/ops/KpiCard';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';

export const metadata: Metadata = {
  title: 'Global Trade Intelligence — Nigeria',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function TradeIntelligenceDashboardPage() {
  const supabase = await createClient();

  // Fetch aggregated trade data
  const [
    overviewStats,
    topExportPartners,
    topImportSources,
    commodityBreakdown,
    yearlyTrends,
  ] = await Promise.all([
    getOverviewStats(supabase),
    getTopPartners(supabase, 'export'),
    getTopPartners(supabase, 'import'),
    getCommodityBreakdown(supabase),
    getYearlyTrends(supabase),
  ]);

  const tradeBalance = overviewStats.total_exports - overviewStats.total_imports;
  const tradeBalanceTone: 'good' | 'bad' | 'default' = tradeBalance > 0 ? 'good' : tradeBalance < 0 ? 'bad' : 'default';

  return (
    <>
      <PageHeader
        title="Global Trade Intelligence"
        description="Nigeria's international trade flows, partner countries, and commodity breakdowns. All data sourced from UN Comtrade with full provenance tracking."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Total Trade Records"
          value={overviewStats.total_records.toLocaleString()}
          detail={`${overviewStats.partner_countries} partner countries`}
        />
        <KpiCard
          label="Total Exports"
          value={`$${formatCurrency(overviewStats.total_exports)}`}
          detail={`${overviewStats.export_commodities} commodities`}
          tone="good"
        />
        <KpiCard
          label="Total Imports"
          value={`$${formatCurrency(overviewStats.total_imports)}`}
          detail={`${overviewStats.import_commodities} commodities`}
        />
        <KpiCard
          label="Trade Balance"
          value={`${tradeBalance > 0 ? '+' : ''}$${formatCurrency(Math.abs(tradeBalance))}`}
          detail={tradeBalance > 0 ? 'Trade surplus' : 'Trade deficit'}
          tone={tradeBalanceTone}
        />
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Top Export Destinations */}
        <Panel title="Top Export Destinations (2021-2022)">
          <div className="space-y-3">
            {topExportPartners.length === 0 && (
              <p className="text-sm text-neutral-500">No export data available.</p>
            )}
            {topExportPartners.slice(0, 10).map((partner, index) => (
              <div
                key={partner.country_id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{partner.country_name}</p>
                    <p className="text-xs text-neutral-500">{partner.country_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900">
                    ${formatCurrency(partner.value_usd)}
                  </p>
                  <p className="text-xs text-neutral-500">{partner.records} records</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <Link href="/admin/intelligence/trade-intelligence/partners" className="text-sm text-blue-600 hover:text-blue-800">
              View all partners →
            </Link>
          </div>
        </Panel>

        {/* Top Import Sources */}
        <Panel title="Top Import Sources (2018-2022)">
          <div className="space-y-3">
            {topImportSources.length === 0 && (
              <p className="text-sm text-neutral-500">No import data available.</p>
            )}
            {topImportSources.slice(0, 10).map((partner, index) => (
              <div
                key={partner.country_id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{partner.country_name}</p>
                    <p className="text-xs text-neutral-500">{partner.country_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900">
                    ${formatCurrency(partner.value_usd)}
                  </p>
                  <p className="text-xs text-neutral-500">{partner.records} records</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <Link href="/admin/intelligence/trade-intelligence/partners" className="text-sm text-blue-600 hover:text-blue-800">
              View all sources →
            </Link>
          </div>
        </Panel>
      </div>

      {/* Commodity Breakdown */}
      <div className="mt-6">
        <Panel title="Trade by Commodity">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-left">Commodity</th>
                  <th className="px-4 py-3 text-left">HS Code</th>
                  <th className="px-4 py-3 text-right">Export Value</th>
                  <th className="px-4 py-3 text-right">Import Value</th>
                  <th className="px-4 py-3 text-right">Net Balance</th>
                  <th className="px-4 py-3 text-center">Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {commodityBreakdown.map((row) => {
                  const balance = row.export_value - row.import_value;
                  const balanceTone: PillTone = balance > 0 ? 'success' : balance < 0 ? 'danger' : 'neutral';
                  
                  return (
                    <tr key={row.commodity_id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{row.commodity_name}</td>
                      <td className="px-4 py-3 text-neutral-500">{row.hs_code}</td>
                      <td className="px-4 py-3 text-right text-neutral-900">
                        ${formatCurrency(row.export_value)}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-900">
                        ${formatCurrency(row.import_value)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Pill tone={balanceTone}>
                          {balance > 0 ? '+' : ''}${formatCurrency(Math.abs(balance))}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.flow_type === 'export' && <Pill tone="success">Export</Pill>}
                        {row.flow_type === 'import' && <Pill tone="info">Import</Pill>}
                        {row.flow_type === 'both' && <Pill tone="neutral">Both</Pill>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right">
            <Link href="/admin/intelligence/trade-intelligence/commodities" className="text-sm text-blue-600 hover:text-blue-800">
              View commodity details →
            </Link>
          </div>
        </Panel>
      </div>

      {/* Yearly Trends */}
      <div className="mt-6">
        <Panel title="Trade Trends by Year">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-right">Export Value</th>
                  <th className="px-4 py-3 text-right">Import Value</th>
                  <th className="px-4 py-3 text-right">Trade Balance</th>
                  <th className="px-4 py-3 text-right">Total Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {yearlyTrends.map((row) => {
                  const balance = row.export_value - row.import_value;
                  const balanceTone: PillTone = balance > 0 ? 'success' : balance < 0 ? 'danger' : 'neutral';
                  
                  return (
                    <tr key={row.year} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 font-medium text-neutral-900">{row.year}</td>
                      <td className="px-4 py-3 text-right text-neutral-900">
                        ${formatCurrency(row.export_value)}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-900">
                        ${formatCurrency(row.import_value)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Pill tone={balanceTone}>
                          {balance > 0 ? '+' : ''}${formatCurrency(Math.abs(balance))}
                        </Pill>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-500">
                        {row.record_count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      {/* Data Source Attribution */}
      <div className="mt-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-medium">Data Source: UN Comtrade Database</p>
          <p className="mt-1 text-xs text-blue-700">
            All trade data sourced from United Nations Comtrade Database (CC-BY-4.0 license). 
            Last sync: {overviewStats.last_sync_date}. Total records: {overviewStats.total_records}.
          </p>
          <p className="mt-2 text-xs text-blue-600">
            <a href="https://comtrade.un.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
              View source →
            </a>
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/intelligence/trade-intelligence/explorer"
          className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-sm font-medium text-neutral-900">Trade Flow Explorer</p>
          <p className="mt-1 text-xs text-neutral-500">Filter and explore bilateral trade flows</p>
        </Link>
        <Link
          href="/admin/intelligence/trade-intelligence/partners"
          className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-sm font-medium text-neutral-900">Partner Country Profiles</p>
          <p className="mt-1 text-xs text-neutral-500">Detailed trade analysis by country</p>
        </Link>
        <Link
          href="/admin/intelligence/trade-intelligence/commodities"
          className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
        >
          <p className="text-sm font-medium text-neutral-900">Commodity Trade Profiles</p>
          <p className="mt-1 text-xs text-neutral-500">Export/import patterns by commodity</p>
        </Link>
      </div>
    </>
  );
}

// ── Helper Functions ────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// ── Data Fetching Functions ─────────────────────────────────────────────────

async function getOverviewStats(supabase: any) {
  // Total records
  const { count: total_records } = await supabase
    .from('international_trade_records')
    .select('*', { count: 'exact', head: true });

  // Partner countries
  const { data: partners } = await supabase
    .from('international_trade_records')
    .select('partner_country_id');
  const partner_countries = new Set(partners?.map((p: any) => p.partner_country_id)).size;

  // Total exports
  const { data: exports } = await supabase
    .from('international_trade_records')
    .select('trade_value_usd')
    .eq('flow_type', 'export');
  const total_exports = exports?.reduce((sum: number, r: any) => sum + (r.trade_value_usd ?? 0), 0) ?? 0;

  // Total imports
  const { data: imports } = await supabase
    .from('international_trade_records')
    .select('trade_value_usd')
    .eq('flow_type', 'import');
  const total_imports = imports?.reduce((sum: number, r: any) => sum + (r.trade_value_usd ?? 0), 0) ?? 0;

  // Export commodities
  const { data: export_commodities } = await supabase
    .from('international_trade_records')
    .select('commodity_id')
    .eq('flow_type', 'export');
  const export_commodity_count = new Set(export_commodities?.map((c: any) => c.commodity_id)).size;

  // Import commodities
  const { data: import_commodities } = await supabase
    .from('international_trade_records')
    .select('commodity_id')
    .eq('flow_type', 'import');
  const import_commodity_count = new Set(import_commodities?.map((c: any) => c.commodity_id)).size;

  // Last sync date
  const { data: sync } = await supabase
    .from('trade_data_sync_log')
    .select('completed_at')
    .eq('status', 'success')
    .order('completed_at', { ascending: false })
    .limit(1);

  return {
    total_records: total_records ?? 0,
    partner_countries,
    total_exports,
    total_imports,
    export_commodities: export_commodity_count,
    import_commodities: import_commodity_count,
    last_sync_date: sync?.[0]?.completed_at ? new Date(sync[0].completed_at).toLocaleDateString() : 'Never',
  };
}

async function getTopPartners(supabase: any, flowType: 'export' | 'import') {
  const { data } = await supabase
    .from('international_trade_records')
    .select(`
      partner_country_id,
      trade_value_usd,
      partner_country:partner_country_id(id, code, name, iso_alpha3)
    `)
    .eq('flow_type', flowType)
    .eq('validation_status', 'validated');

  // Aggregate by partner
  const partnerMap = new Map<number, { value_usd: number; records: number; country_name: string; country_code: string }>();
  
  for (const row of data ?? []) {
    const partnerId = row.partner_country_id;
    const partner = row.partner_country;
    const value = row.trade_value_usd ?? 0;

    if (!partnerMap.has(partnerId)) {
      partnerMap.set(partnerId, {
        value_usd: 0,
        records: 0,
        country_name: partner.name,
        country_code: partner.iso_alpha3,
      });
    }

    const entry = partnerMap.get(partnerId)!;
    entry.value_usd += value;
    entry.records += 1;
  }

  // Convert to array and sort
  const partners = Array.from(partnerMap.entries())
    .map(([country_id, data]) => ({
      country_id,
      country_name: data.country_name,
      country_code: data.country_code,
      value_usd: data.value_usd,
      records: data.records,
    }))
    .sort((a, b) => b.value_usd - a.value_usd);

  return partners;
}

async function getCommodityBreakdown(supabase: any) {
  const { data } = await supabase
    .from('international_trade_records')
    .select(`
      commodity_id,
      flow_type,
      trade_value_usd,
      commodity:commodity_id(name),
      hs_code:hs_code_id(code)
    `)
    .eq('validation_status', 'validated');

  // Aggregate by commodity
  const commodityMap = new Map<number, {
    commodity_name: string;
    hs_code: string;
    export_value: number;
    import_value: number;
    flow_type: string;
  }>();

  for (const row of data ?? []) {
    const commodityId = row.commodity_id;
    const value = row.trade_value_usd ?? 0;
    const flowType = row.flow_type;

    if (!commodityMap.has(commodityId)) {
      commodityMap.set(commodityId, {
        commodity_name: row.commodity.name,
        hs_code: row.hs_code.code,
        export_value: 0,
        import_value: 0,
        flow_type: 'none',
      });
    }

    const entry = commodityMap.get(commodityId)!;
    if (flowType === 'export') {
      entry.export_value += value;
      entry.flow_type = entry.flow_type === 'import' ? 'both' : 'export';
    } else {
      entry.import_value += value;
      entry.flow_type = entry.flow_type === 'export' ? 'both' : 'import';
    }
  }

  return Array.from(commodityMap.entries())
    .map(([commodity_id, data]) => ({
      commodity_id,
      commodity_name: data.commodity_name,
      hs_code: data.hs_code,
      export_value: data.export_value,
      import_value: data.import_value,
      flow_type: data.flow_type,
    }))
    .sort((a, b) => (b.export_value + b.import_value) - (a.export_value + a.import_value));
}

async function getYearlyTrends(supabase: any) {
  const { data } = await supabase
    .from('international_trade_records')
    .select('year, flow_type, trade_value_usd')
    .eq('validation_status', 'validated');

  // Aggregate by year
  const yearMap = new Map<number, { export_value: number; import_value: number; record_count: number }>();

  for (const row of data ?? []) {
    const year = row.year;
    const value = row.trade_value_usd ?? 0;

    if (!yearMap.has(year)) {
      yearMap.set(year, { export_value: 0, import_value: 0, record_count: 0 });
    }

    const entry = yearMap.get(year)!;
    entry.record_count += 1;
    if (row.flow_type === 'export') {
      entry.export_value += value;
    } else {
      entry.import_value += value;
    }
  }

  return Array.from(yearMap.entries())
    .map(([year, data]) => ({
      year,
      export_value: data.export_value,
      import_value: data.import_value,
      record_count: data.record_count,
    }))
    .sort((a, b) => a.year - b.year);
}
