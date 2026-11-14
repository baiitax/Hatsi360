/**
 * Trade Flow Explorer
 *
 * Phase 07 Stage 4: Interactive trade flow filtering
 *
 * Allows users to filter trade records by flow type, commodity,
 * partner country, year, and value range. Displays results in
 * sortable tables with export functionality.
 */

import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Panel, Pill } from '@/components/ops/Primitives';
import type { PillTone } from '@/components/ops/Primitives';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Trade Flow Explorer — Nigeria',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface SearchParams {
  flow_type?: string;
  commodity_id?: string;
  partner_country_id?: string;
  year?: string;
  min_value?: string;
  sort_by?: string;
  sort_order?: string;
}

export default async function TradeFlowExplorerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Fetch filter options
  const [commodities, partnerCountries, years] = await Promise.all([
    getFilterCommodities(supabase),
    getFilterPartnerCountries(supabase),
    getFilterYears(supabase),
  ]);

  // Fetch filtered records
  const records = await getFilteredRecords(supabase, params);

  // Build URL for filter changes
  const buildFilterUrl = (key: string, value: string | undefined) => {
    const newParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v && k !== key) newParams.set(k as string, v as string);
    });
    if (value) newParams.set(key, value);
    return `/admin/intelligence/trade-intelligence/explorer?${newParams.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Trade Flow Explorer"
        description="Filter and explore bilateral trade flows. All data from UN Comtrade with provenance tracking."
      />

      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-neutral-500">
        <Link href="/admin/intelligence/trade-intelligence" className="text-blue-600 hover:underline">
          ← Back to Trade Intelligence
        </Link>
      </div>

      {/* Filters */}
      <Panel title="Filters">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {/* Flow Type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Flow Type</label>
            <select
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
              defaultValue={params.flow_type ?? ''}
              onChange={(e) => {
                window.location.href = buildFilterUrl('flow_type', e.target.value || undefined);
              }}
            >
              <option value="">All</option>
              <option value="export">Exports</option>
              <option value="import">Imports</option>
            </select>
          </div>

          {/* Commodity */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Commodity</label>
            <select
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
              defaultValue={params.commodity_id ?? ''}
              onChange={(e) => {
                window.location.href = buildFilterUrl('commodity_id', e.target.value || undefined);
              }}
            >
              <option value="">All</option>
              {commodities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Partner Country */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Partner</label>
            <select
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
              defaultValue={params.partner_country_id ?? ''}
              onChange={(e) => {
                window.location.href = buildFilterUrl('partner_country_id', e.target.value || undefined);
              }}
            >
              <option value="">All</option>
              {partnerCountries.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.iso_alpha3})</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Year</label>
            <select
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
              defaultValue={params.year ?? ''}
              onChange={(e) => {
                window.location.href = buildFilterUrl('year', e.target.value || undefined);
              }}
            >
              <option value="">All</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Reset */}
          <div className="flex items-end">
            <Link
              href="/admin/intelligence/trade-intelligence/explorer"
              className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-center text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Reset
            </Link>
          </div>
        </div>
      </Panel>

      {/* Results */}
      <div className="mt-4">
        <Panel title={`Results — ${records.length} records`}>
          {records.length === 0 ? (
            <p className="text-sm text-neutral-500">No records match the current filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Year</th>
                    <th className="px-3 py-2 text-left">Flow</th>
                    <th className="px-3 py-2 text-left">Partner</th>
                    <th className="px-3 py-2 text-left">Commodity</th>
                    <th className="px-3 py-2 text-right">Value (USD)</th>
                    <th className="px-3 py-2 text-right">Qty (kg)</th>
                    <th className="px-3 py-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {records.map((record: any) => {
                    const flowTone: PillTone = record.flow_type === 'export' ? 'success' : 'info';
                    
                    return (
                      <tr key={record.id} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 text-neutral-900">{record.year}</td>
                        <td className="px-3 py-2">
                          <Pill tone={flowTone}>
                            {record.flow_type === 'export' ? '↑ Export' : '↓ Import'}
                          </Pill>
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-neutral-900">
                            {record.partner_country?.name ?? '—'}
                          </span>
                          <span className="ml-1 text-xs text-neutral-500">
                            {record.partner_country?.iso_alpha3}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-neutral-900">{record.commodity?.name ?? '—'}</span>
                          <span className="ml-1 text-xs text-neutral-400">
                            HS {record.hs_code?.code}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-900">
                          {record.trade_value_usd != null
                            ? `$${record.trade_value_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-700">
                          {record.quantity_kg != null && record.quantity_kg > 0
                            ? record.quantity_kg.toLocaleString('en-US', { maximumFractionDigits: 0 })
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-neutral-500">
                          {record.source?.name ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Summary */}
      <div className="mt-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
          <p>
            Showing {records.length} records from UN Comtrade.
            {params.flow_type && <> Filter: <strong>{params.flow_type}</strong>.</>}
            {params.commodity_id && <> Commodity ID: <strong>{params.commodity_id}</strong>.</>}
            {params.year && <> Year: <strong>{params.year}</strong>.</>}
          </p>
          <p className="mt-1">
            <a href="https://comtrade.un.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Source: UN Comtrade Database (CC-BY-4.0)
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

// ── Data Fetching ───────────────────────────────────────────────────────────

async function getFilterCommodities(supabase: any): Promise<Array<{ id: number; name: string }>> {
  const tradeRecordIds = await supabase
    .from('international_trade_records')
    .select('commodity_id');
  
  const ids = (tradeRecordIds.data ?? []).map((r: { commodity_id: number }) => r.commodity_id);
  
  const { data } = await supabase
    .from('commodities')
    .select('id, name')
    .in('id', ids)
    .order('name');
  return (data ?? []) as Array<{ id: number; name: string }>;
}

async function getFilterPartnerCountries(supabase: any): Promise<Array<{ id: number; name: string; iso_alpha3: string }>> {
  const tradeRecords = await supabase
    .from('international_trade_records')
    .select('partner_country_id');
  
  const ids = (tradeRecords.data ?? []).map((r: { partner_country_id: number }) => r.partner_country_id);
  
  const { data } = await supabase
    .from('countries')
    .select('id, name, iso_alpha3')
    .in('id', ids)
    .order('name');
  return (data ?? []) as Array<{ id: number; name: string; iso_alpha3: string }>;
}

async function getFilterYears(supabase: any): Promise<number[]> {
  const { data } = await supabase
    .from('international_trade_records')
    .select('year')
    .order('year');
  const years = new Set<number>((data ?? []).map((r: { year: number }) => r.year));
  return Array.from(years).sort((a, b) => a - b);
}

async function getFilteredRecords(supabase: any, params: SearchParams) {
  let query = supabase
    .from('international_trade_records')
    .select(`
      *,
      reporting_country:reporting_country_id(id, name, iso_alpha3),
      partner_country:partner_country_id(id, name, iso_alpha3),
      commodity:commodity_id(id, name, slug),
      hs_code:hs_code_id(id, code, description),
      source:source_id(id, code, name)
    `)
    .eq('reporting_country_id', 1) // Nigeria
    .eq('validation_status', 'validated');

  if (params.flow_type) {
    query = query.eq('flow_type', params.flow_type);
  }
  if (params.commodity_id) {
    query = query.eq('commodity_id', parseInt(params.commodity_id));
  }
  if (params.partner_country_id) {
    query = query.eq('partner_country_id', parseInt(params.partner_country_id));
  }
  if (params.year) {
    query = query.eq('year', parseInt(params.year));
  }
  if (params.min_value) {
    query = query.gte('trade_value_usd', parseFloat(params.min_value));
  }

  // Sort
  const sortBy = params.sort_by ?? 'trade_value_usd';
  const sortOrder = params.sort_order === 'asc' ? true : false;
  query = query.order(sortBy, { ascending: sortOrder });

  query = query.limit(200);

  const { data, error } = await query;
  if (error) {
    console.error('Trade Flow Explorer query error:', error);
    return [];
  }
  return data ?? [];
}
