/**
 * Trade Flows Service
 * 
 * Phase 07 Stage 3: International Trade Data Engine
 * 
 * Queries international_trade_records for bilateral trade flows,
 * trade summaries, and analytics. All queries are provenance-aware.
 */

import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type {
  TradeQueryParams,
  TradeFlowSummary,
  TradeFlowAnalytics,
  TradeFlowType,
} from './ingestion/types';

// ── Trade Record Types ───────────────────────────────────────────────────────

export interface TradeRecord {
  id: number;
  reporting_country_id: number;
  partner_country_id: number;
  flow_type: TradeFlowType;
  commodity_id: number | null;
  hs_code_id: number | null;
  year: number;
  month: number | null;
  period_type: string;
  trade_value_usd: number | null;
  quantity_kg: number | null;
  net_weight_kg: number | null;
  valuation_method: string | null;
  is_provisional: boolean;
  validation_status: string;
  source_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TradeRecordWithRelations extends TradeRecord {
  reporting_country: { id: number; code: string; name: string; iso_alpha3: string };
  partner_country: { id: number; code: string; name: string; iso_alpha3: string };
  commodity: { id: number; name: string; slug: string } | null;
  hs_code: { id: number; code: string; description: string } | null;
  source: { id: number; code: string; name: string } | null;
}

// ── Query Functions ──────────────────────────────────────────────────────────

/**
 * Query trade records with flexible filtering
 */
export async function queryTradeRecords(
  params: TradeQueryParams,
): Promise<TradeRecordWithRelations[]> {
  const supabase = await createClient();

  let query = supabase.from('international_trade_records').select(`
    *,
    reporting_country:reporting_country_id!inner(id, code, name, iso_alpha3),
    partner_country:partner_country_id!inner(id, code, name, iso_alpha3),
    commodity:commodity_id(id, name, slug),
    hs_code:hs_code_id(id, code, description),
    source:source_id(id, code, name)
  `);

  // Apply filters
  if (params.reporting_country_id) {
    query = query.eq('reporting_country_id', params.reporting_country_id);
  }
  if (params.reporting_country_code) {
    query = query.eq('reporting_country.iso_alpha3', params.reporting_country_code);
  }
  if (params.partner_country_id) {
    query = query.eq('partner_country_id', params.partner_country_id);
  }
  if (params.partner_country_code) {
    query = query.eq('partner_country.iso_alpha3', params.partner_country_code);
  }
  if (params.commodity_id) {
    query = query.eq('commodity_id', params.commodity_id);
  }
  if (params.commodity_slug) {
    query = query.eq('commodity.slug', params.commodity_slug);
  }
  if (params.hs_code_id) {
    query = query.eq('hs_code_id', params.hs_code_id);
  }
  if (params.hs_code) {
    query = query.eq('hs_code.code', params.hs_code);
  }
  if (params.flow_type) {
    query = query.eq('flow_type', params.flow_type);
  }
  if (params.year) {
    query = query.eq('year', params.year);
  }
  if (params.year_from) {
    query = query.gte('year', params.year_from);
  }
  if (params.year_to) {
    query = query.lte('year', params.year_to);
  }
  if (params.validation_status) {
    query = query.eq('validation_status', params.validation_status);
  }
  if (params.min_value_usd) {
    query = query.gte('trade_value_usd', params.min_value_usd);
  }

  // Pagination
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  query = query.order('year', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query trade records: ${error.message}`);

  return (data ?? []) as unknown as TradeRecordWithRelations[];
}

/**
 * Get bilateral trade flows between two countries for a commodity
 */
export async function getBilateralTrade(params: {
  reporterCode: string;
  partnerCode: string;
  commoditySlug?: string;
  hsCode?: string;
  yearFrom?: number;
  yearTo?: number;
}): Promise<TradeRecordWithRelations[]> {
  return queryTradeRecords({
    reporting_country_code: params.reporterCode,
    partner_country_code: params.partnerCode,
    commodity_slug: params.commoditySlug,
    hs_code: params.hsCode,
    year_from: params.yearFrom,
    year_to: params.yearTo,
    limit: 1000,
  });
}

/**
 * Get a country's top trade partners for a given flow type and commodity
 */
export async function getTopTradePartners(params: {
  countryId: number;
  flowType: TradeFlowType;
  commodityId?: number;
  hsCodeId?: number;
  year?: number;
  limit?: number;
}): Promise<TradeFlowSummary[]> {
  const supabase = await createClient();
  const { countryId, flowType, commodityId, hsCodeId, year, limit = 20 } = params;

  // Determine the partner column based on flow type
  // For exports, the partner is the destination; for imports, the partner is the source
  const partnerColumn = 'partner_country_id';
  const reporterColumn = 'reporting_country_id';

  let query = supabase
    .from('international_trade_records')
    .select(`
      partner_country_id,
      partner_country:partner_country_id(id, code, name, iso_alpha3),
      commodity_id,
      commodity:commodity_id(id, name),
      hs_code_id,
      hs_code:hs_code_id(id, code, description),
      flow_type,
      year,
      trade_value_usd,
      quantity_kg,
      source_id,
      source:source_id(code, name)
    `)
    .eq(reporterColumn, countryId)
    .eq('flow_type', flowType)
    .eq('validation_status', 'validated')
    .order('trade_value_usd', { ascending: false });

  if (commodityId) query = query.eq('commodity_id', commodityId);
  if (hsCodeId) query = query.eq('hs_code_id', hsCodeId);
  if (year) query = query.eq('year', year);

  query = query.limit(500);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query top partners: ${error.message}`);

  // Aggregate by partner country
  const partnerMap = new Map<number, TradeFlowSummary>();

  for (const row of data as any[]) {
    const partnerId = row.partner_country_id;
    const partner = row.partner_country;
    const value = row.trade_value_usd ?? 0;
    const quantity = row.quantity_kg ?? 0;

    if (!partnerMap.has(partnerId)) {
      partnerMap.set(partnerId, {
        reporting_country_id: countryId,
        reporting_country_code: '',
        reporting_country_name: '',
        partner_country_id: partnerId,
        partner_country_code: partner.iso_alpha3,
        partner_country_name: partner.name,
        commodity_id: commodityId ?? undefined,
        commodity_name: row.commodity?.name,
        hs_code: row.hs_code?.code,
        hs_description: row.hs_code?.description,
        flow_type: flowType,
        year: year ?? 0,
        total_value_usd: 0,
        total_quantity_kg: 0,
        record_count: 0,
        avg_unit_value_usd_per_kg: null,
        min_year: row.year,
        max_year: row.year,
        sources: [],
      });
    }

    const summary = partnerMap.get(partnerId)!;
    summary.total_value_usd += value;
    summary.total_quantity_kg += quantity;
    summary.record_count += 1;
    summary.min_year = Math.min(summary.min_year, row.year);
    summary.max_year = Math.max(summary.max_year, row.year);

    const sourceName = row.source?.name;
    if (sourceName && !summary.sources.includes(sourceName)) {
      summary.sources.push(sourceName);
    }
  }

  // Calculate average unit values
  const summaries = Array.from(partnerMap.values()).slice(0, limit);
  for (const summary of summaries) {
    if (summary.total_quantity_kg > 0) {
      summary.avg_unit_value_usd_per_kg = summary.total_value_usd / summary.total_quantity_kg;
    }
  }

  // Sort by value descending
  summaries.sort((a, b) => b.total_value_usd - a.total_value_usd);

  return summaries;
}

/**
 * Get trade flow analytics for a country
 */
export async function getTradeFlowAnalytics(params: {
  countryId: number;
  commoditySlug?: string;
  yearFrom?: number;
  yearTo?: number;
}): Promise<TradeFlowAnalytics> {
  const supabase = await createClient();

  let query = supabase
    .from('international_trade_records')
    .select(`
      flow_type,
      year,
      trade_value_usd,
      quantity_kg,
      reporting_country:reporting_country_id(id, code, name),
      source:source_id(code, name)
    `)
    .eq('reporting_country_id', params.countryId)
    .eq('validation_status', 'validated');

  if (params.commoditySlug) {
    query = query.eq('commodity.slug', params.commoditySlug);
  }
  if (params.yearFrom) {
    query = query.gte('year', params.yearFrom);
  }
  if (params.yearTo) {
    query = query.lte('year', params.yearTo);
  }

  query = query.order('year');
  query = query.limit(10000);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query trade analytics: ${error.message}`);

  const records = data as any[];

  // Get country info
  const countryInfo = records[0]?.reporting_country;

  // Aggregate by year
  const yearlyMap = new Map<number, {
    import_value: number;
    export_value: number;
    import_quantity: number;
    export_quantity: number;
  }>();

  const sourceSet = new Set<string>();
  const yearSet = new Set<number>();

  for (const row of records) {
    const year = row.year;
    yearSet.add(year);

    if (!yearlyMap.has(year)) {
      yearlyMap.set(year, {
        import_value: 0,
        export_value: 0,
        import_quantity: 0,
        export_quantity: 0,
      });
    }

    const entry = yearlyMap.get(year)!;
    const value = row.trade_value_usd ?? 0;
    const quantity = row.quantity_kg ?? 0;

    if (row.flow_type === 'import') {
      entry.import_value += value;
      entry.import_quantity += quantity;
    } else {
      entry.export_value += value;
      entry.export_quantity += quantity;
    }

    const sourceName = row.source?.name;
    if (sourceName) sourceSet.add(sourceName);
  }

  // Build yearly totals array
  const yearly_totals = Array.from(yearlyMap.entries())
    .map(([year, data]) => ({
      year,
      import_value_usd: data.import_value,
      export_value_usd: data.export_value,
      import_quantity_kg: data.import_quantity,
      export_quantity_kg: data.export_quantity,
      trade_balance_usd: data.export_value - data.import_value,
    }))
    .sort((a, b) => a.year - b.year);

  // Calculate totals
  const total_imports_usd = yearly_totals.reduce((sum, y) => sum + y.import_value_usd, 0);
  const total_exports_usd = yearly_totals.reduce((sum, y) => sum + y.export_value_usd, 0);

  return {
    country_id: params.countryId,
    country_code: countryInfo?.code ?? '',
    country_name: countryInfo?.name ?? '',
    commodity_id: undefined,
    commodity_name: params.commoditySlug,
    yearly_totals,
    top_import_partners: [], // TODO: populate from partner aggregation
    top_export_partners: [], // TODO: populate from partner aggregation
    total_imports_usd,
    total_exports_usd,
    trade_balance_usd: total_exports_usd - total_imports_usd,
    data_years: Array.from(yearSet).sort(),
    data_sources: Array.from(sourceSet),
  };
}

/**
 * Get trade data statistics for a country
 */
export async function getTradeDataStats(params: {
  countryId?: number;
  countryCode?: string;
}): Promise<{
  total_records: number;
  year_range: { min: number; max: number };
  top_commodities: Array<{ name: string; count: number }>;
  top_partners: Array<{ name: string; count: number }>;
  sources: Array<{ name: string; count: number }>;
  validation_status: Record<string, number>;
}> {
  const supabase = await createClient();

  let query = supabase
    .from('international_trade_records')
    .select(`
      year,
      commodity:commodity_id(name),
      partner_country:partner_country_id(name),
      source:source_id(name),
      validation_status
    `);

  if (params.countryId) {
    query = query.eq('reporting_country_id', params.countryId);
  }
  if (params.countryCode) {
    query = query.eq('reporting_country.iso_alpha3', params.countryCode);
  }

  query = query.limit(50000);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query trade stats: ${error.message}`);

  const records = data as any[];

  // Calculate stats
  const years = records.map((r) => r.year).filter(Boolean);
  const commodityCounts = new Map<string, number>();
  const partnerCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  const validationCounts: Record<string, number> = {};

  for (const row of records) {
    if (row.commodity?.name) {
      commodityCounts.set(row.commodity.name, (commodityCounts.get(row.commodity.name) ?? 0) + 1);
    }
    if (row.partner_country?.name) {
      partnerCounts.set(row.partner_country.name, (partnerCounts.get(row.partner_country.name) ?? 0) + 1);
    }
    if (row.source?.name) {
      sourceCounts.set(row.source.name, (sourceCounts.get(row.source.name) ?? 0) + 1);
    }
    validationCounts[row.validation_status] = (validationCounts[row.validation_status] ?? 0) + 1;
  }

  return {
    total_records: records.length,
    year_range: {
      min: years.length > 0 ? Math.min(...years) : 0,
      max: years.length > 0 ? Math.max(...years) : 0,
    },
    top_commodities: Array.from(commodityCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    top_partners: Array.from(partnerCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    sources: Array.from(sourceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    validation_status: validationCounts,
  };
}
