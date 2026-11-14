/**
 * Commodity Intelligence Service
 *
 * Core service for querying commodity fundamentals data: production,
 * supply, demand, and trade flows. All queries enforce provenance
 * awareness — callers receive source attribution with every data point.
 */

import { createClient } from '@/lib/supabase/server';
import type {
  CommodityProduction,
  CommoditySupply,
  CommodityDemand,
  CommodityTrade,
  EvidenceSource,
  SourceSyncEvent,
  ProductionQuery,
  SupplyQuery,
  DemandQuery,
  TradeQuery,
  CommodityIntelligenceSummary,
  VerificationStatus,
} from './types';

// ── Source Management ───────────────────────────────────────────────────────

export async function getActiveSources(): Promise<EvidenceSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('evidence_sources')
    .select('*')
    .eq('is_active', true)
    .order('code');

  if (error) throw new Error(`Failed to fetch evidence sources: ${error.message}`);
  return data ?? [];
}

export async function getSourceByCode(code: string): Promise<EvidenceSource | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('evidence_sources')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`Failed to fetch source '${code}': ${error.message}`);
  }
  return data;
}

export async function getAllSources(): Promise<EvidenceSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('evidence_sources')
    .select('*')
    .order('code');

  if (error) throw new Error(`Failed to fetch sources: ${error.message}`);
  return data ?? [];
}

// ── Sync Events ─────────────────────────────────────────────────────────────

export async function createSyncEvent(
  sourceId: number,
  syncType: SourceSyncEvent['sync_type'],
  triggeredBy?: string
): Promise<SourceSyncEvent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('source_sync_events')
    .insert({
      source_id: sourceId,
      sync_type: syncType,
      status: 'running',
      triggered_by: triggeredBy ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create sync event: ${error.message}`);
  return data;
}

export async function completeSyncEvent(
  syncEventId: number,
  result: {
    status: SourceSyncEvent['status'];
    records_fetched: number;
    records_inserted: number;
    records_updated: number;
    records_skipped: number;
    error_message?: string;
    data_period_start?: string;
    data_period_end?: string;
  }
): Promise<void> {
  const supabase = await createClient();

  const { error: syncError } = await supabase
    .from('source_sync_events')
    .update({
      completed_at: new Date().toISOString(),
      status: result.status,
      records_fetched: result.records_fetched,
      records_inserted: result.records_inserted,
      records_updated: result.records_updated,
      records_skipped: result.records_skipped,
      error_message: result.error_message ?? null,
      data_period_start: result.data_period_start ?? null,
      data_period_end: result.data_period_end ?? null,
    })
    .eq('id', syncEventId);

  if (syncError) throw new Error(`Failed to complete sync event: ${syncError.message}`);

  // Update source last_sync_at
  const { error: sourceError } = await supabase
    .from('evidence_sources')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', (await supabase
      .from('source_sync_events')
      .select('source_id')
      .eq('id', syncEventId)
      .single()).data?.source_id);

  if (sourceError) {
    console.warn(`Failed to update source last_sync_at: ${sourceError.message}`);
  }
}

export async function getRecentSyncEvents(
  sourceId?: number,
  limit = 20
): Promise<SourceSyncEvent[]> {
  const supabase = await createClient();
  let query = supabase
    .from('source_sync_events')
    .select('*, evidence_sources(code, name)')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (sourceId) {
    query = query.eq('source_id', sourceId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch sync events: ${error.message}`);
  return data ?? [];
}

// ── Production Queries ──────────────────────────────────────────────────────

export async function getProductionData(
  query: ProductionQuery
): Promise<CommodityProduction[]> {
  const supabase = await createClient();
  let q = supabase.from('commodity_production').select('*');

  if (query.commodity_id) q = q.eq('commodity_id', query.commodity_id);
  if (query.country_code) q = q.eq('country_code', query.country_code);
  if (query.year) q = q.eq('year', query.year);
  if (query.year_from) q = q.gte('year', query.year_from);
  if (query.year_to) q = q.lte('year', query.year_to);
  if (query.verified_only) q = q.eq('verification_status', 'verified');

  q = q.order('year', { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(`Failed to fetch production data: ${error.message}`);
  return data ?? [];
}

// ── Supply Queries ──────────────────────────────────────────────────────────

export async function getSupplyData(query: SupplyQuery): Promise<CommoditySupply[]> {
  const supabase = await createClient();
  let q = supabase.from('commodity_supply').select('*');

  if (query.commodity_id) q = q.eq('commodity_id', query.commodity_id);
  if (query.country_code) q = q.eq('country_code', query.country_code);
  if (query.year) q = q.eq('year', query.year);
  if (query.year_from) q = q.gte('year', query.year_from);
  if (query.year_to) q = q.lte('year', query.year_to);
  if (query.verified_only) q = q.eq('verification_status', 'verified');

  q = q.order('year', { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(`Failed to fetch supply data: ${error.message}`);
  return data ?? [];
}

// ── Demand Queries ──────────────────────────────────────────────────────────

export async function getDemandData(query: DemandQuery): Promise<CommodityDemand[]> {
  const supabase = await createClient();
  let q = supabase.from('commodity_demand').select('*');

  if (query.commodity_id) q = q.eq('commodity_id', query.commodity_id);
  if (query.country_code) q = q.eq('country_code', query.country_code);
  if (query.year) q = q.eq('year', query.year);
  if (query.year_from) q = q.gte('year', query.year_from);
  if (query.year_to) q = q.lte('year', query.year_to);
  if (query.verified_only) q = q.eq('verification_status', 'verified');

  q = q.order('year', { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(`Failed to fetch demand data: ${error.message}`);
  return data ?? [];
}

// ── Trade Queries ───────────────────────────────────────────────────────────

export async function getTradeData(query: TradeQuery): Promise<CommodityTrade[]> {
  const supabase = await createClient();
  let q = supabase.from('commodity_trade').select('*');

  if (query.commodity_id) q = q.eq('commodity_id', query.commodity_id);
  if (query.flow_type) q = q.eq('flow_type', query.flow_type);
  if (query.reporter_country) q = q.eq('reporter_country', query.reporter_country);
  if (query.partner_country) q = q.eq('partner_country', query.partner_country);
  if (query.year) q = q.eq('year', query.year);
  if (query.year_from) q = q.gte('year', query.year_from);
  if (query.year_to) q = q.lte('year', query.year_to);
  if (query.verified_only) q = q.eq('verification_status', 'verified');

  q = q.order('year', { ascending: false });

  const { data, error } = await q;
  if (error) throw new Error(`Failed to fetch trade data: ${error.message}`);
  return data ?? [];
}

// ── Intelligence Summary ────────────────────────────────────────────────────

/**
 * Build a comprehensive intelligence summary for a commodity in a country.
 * Combines production, supply, demand, and trade data into a single view.
 *
 * Returns null only if the commodity itself is not found. If intelligence
 * data is simply not yet available, returns a summary with null fields
 * and evidence_count = 0 — this is a valid "no data yet" state, not an error.
 */
export async function getCommodityIntelligenceSummary(
  commoditySlug: string,
  countryCode: string = 'NGA'
): Promise<CommodityIntelligenceSummary | null> {
  const supabase = await createClient();

  // Resolve commodity by slug
  const { data: commodity, error: commodityError } = await supabase
    .from('commodities')
    .select('id, name, slug')
    .eq('slug', commoditySlug)
    .single();

  if (commodityError || !commodity) return null;

  // Fetch latest data for each dimension
  const [production, supply, demand, exports, imports] = await Promise.all([
    getProductionData({
      commodity_id: commodity.id,
      country_code: countryCode,
      year_to: new Date().getFullYear(),
    }),
    getSupplyData({
      commodity_id: commodity.id,
      country_code: countryCode,
      year_to: new Date().getFullYear(),
    }),
    getDemandData({
      commodity_id: commodity.id,
      country_code: countryCode,
      year_to: new Date().getFullYear(),
    }),
    getTradeData({
      commodity_id: commodity.id,
      flow_type: 'export',
      reporter_country: countryCode,
      year_to: new Date().getFullYear(),
    }),
    getTradeData({
      commodity_id: commodity.id,
      flow_type: 'import',
      reporter_country: countryCode,
      year_to: new Date().getFullYear(),
    }),
  ]);

  // Find latest year with any data
  const allRecords = [...production, ...supply, ...demand, ...exports, ...imports];
  const latestYear = allRecords.length > 0
    ? Math.max(...allRecords.map((r) => r.year))
    : 0;

  const latestProduction = production.find((r) => r.year === latestYear);
  const latestSupply = supply.find((r) => r.year === latestYear);
  const latestDemand = demand.find((r) => r.year === latestYear);

  // Calculate production trend (last 3 years)
  let trend: 'increasing' | 'decreasing' | 'stable' | null = null;
  if (production.length >= 3) {
    const recentYears = production
      .filter((r) => r.year >= latestYear - 2 && r.production_quantity_mt !== null)
      .sort((a, b) => a.year - b.year);

    if (recentYears.length >= 3) {
      const first = recentYears[0].production_quantity_mt!;
      const last = recentYears[recentYears.length - 1].production_quantity_mt!;
      const changePercent = ((last - first) / first) * 100;
      if (changePercent > 5) trend = 'increasing';
      else if (changePercent < -5) trend = 'decreasing';
      else trend = 'stable';
    }
  }

  // Calculate stock-to-use ratio
  let stockToUse: number | null = null;
  if (latestDemand?.ending_stocks_mt && latestDemand?.total_demand_mt) {
    stockToUse = (latestDemand.ending_stocks_mt / latestDemand.total_demand_mt) * 100;
  }

  // Top trade partners
  const topExportPartners = exports
    .filter((t) => t.year === latestYear && t.quantity_mt !== null)
    .sort((a, b) => (b.quantity_mt ?? 0) - (a.quantity_mt ?? 0))
    .slice(0, 5)
    .map((t) => ({ country: t.partner_country, quantity_mt: t.quantity_mt! }));

  const topImportPartners = imports
    .filter((t) => t.year === latestYear && t.quantity_mt !== null)
    .sort((a, b) => (b.quantity_mt ?? 0) - (a.quantity_mt ?? 0))
    .slice(0, 5)
    .map((t) => ({ country: t.partner_country, quantity_mt: t.quantity_mt! }));

  // Total evidence count
  const evidenceCount = allRecords.filter((r) => r.source_id !== null).length;

  // Latest source name
  const sourceIds = [...new Set(allRecords.map((r) => r.source_id).filter(Boolean))];
  let latestSource: string | null = null;
  if (sourceIds.length > 0) {
    const { data: sources } = await supabase
      .from('evidence_sources')
      .select('name')
      .in('id', sourceIds as number[])
      .order('id', { ascending: false })
      .limit(1);
    latestSource = sources?.[0]?.name ?? null;
  }

  return {
    commodity_id: commodity.id,
    commodity_name: commodity.name,
    commodity_slug: commodity.slug,
    country_code: countryCode,
    latest_year: latestYear || 0,
    production: latestProduction
      ? {
          quantity_mt: latestProduction.production_quantity_mt,
          yield_mt_per_ha: latestProduction.yield_mt_per_ha,
          harvested_area_ha: latestProduction.harvested_area_ha,
          trend,
        }
      : undefined,
    supply_demand:
      latestSupply || latestDemand
        ? {
            total_supply_mt: latestSupply?.total_supply_mt ?? null,
            total_demand_mt: latestDemand?.total_demand_mt ?? null,
            ending_stocks_mt: latestDemand?.ending_stocks_mt ?? null,
            stock_to_use_ratio: stockToUse,
          }
        : undefined,
    trade:
      topExportPartners.length > 0 || topImportPartners.length > 0
        ? {
            exports_mt: exports
              .filter((t) => t.year === latestYear)
              .reduce((sum, t) => sum + (t.quantity_mt ?? 0), 0),
            imports_mt: imports
              .filter((t) => t.year === latestYear)
              .reduce((sum, t) => sum + (t.quantity_mt ?? 0), 0),
            net_trade_mt:
              exports
                .filter((t) => t.year === latestYear)
                .reduce((sum, t) => sum + (t.quantity_mt ?? 0), 0) -
              imports
                .filter((t) => t.year === latestYear)
                .reduce((sum, t) => sum + (t.quantity_mt ?? 0), 0),
            top_export_partners: topExportPartners,
            top_import_partners: topImportPartners,
          }
        : undefined,
    evidence_count: evidenceCount,
    latest_source: latestSource,
    last_updated: allRecords.length > 0
      ? allRecords.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0].updated_at
      : null,
  };
}

// ── Data Statistics ─────────────────────────────────────────────────────────

export interface IntelligenceStats {
  sources: { total: number; active: number };
  production: { records: number; commodities: number; countries: number; year_range: [number, number] | null };
  supply: { records: number; commodities: number; countries: number };
  demand: { records: number; commodities: number; countries: number };
  trade: { records: number; commodities: number; country_pairs: number };
  sync_events: { total: number; failed: number; last_24h: number };
}

export async function getIntelligenceStats(): Promise<IntelligenceStats> {
  const supabase = await createClient();

  const [sources, production, supply, demand, trade, syncEvents] = await Promise.all([
    supabase.from('evidence_sources').select('id, is_active'),
    supabase.from('commodity_production').select('commodity_id, country_code, year'),
    supabase.from('commodity_supply').select('commodity_id, country_code'),
    supabase.from('commodity_demand').select('commodity_id, country_code'),
    supabase.from('commodity_trade').select('commodity_id, reporter_country, partner_country'),
    supabase.from('source_sync_events').select('id, status, started_at'),
  ]);

  const prodYears = production.data?.map((r) => r.year) ?? [];
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return {
    sources: {
      total: sources.data?.length ?? 0,
      active: sources.data?.filter((s) => s.is_active).length ?? 0,
    },
    production: {
      records: production.data?.length ?? 0,
      commodities: new Set(production.data?.map((r) => r.commodity_id) ?? []).size,
      countries: new Set(production.data?.map((r) => r.country_code) ?? []).size,
      year_range: prodYears.length > 0 ? [Math.min(...prodYears), Math.max(...prodYears)] : null,
    },
    supply: {
      records: supply.data?.length ?? 0,
      commodities: new Set(supply.data?.map((r) => r.commodity_id) ?? []).size,
      countries: new Set(supply.data?.map((r) => r.country_code) ?? []).size,
    },
    demand: {
      records: demand.data?.length ?? 0,
      commodities: new Set(demand.data?.map((r) => r.commodity_id) ?? []).size,
      countries: new Set(demand.data?.map((r) => r.country_code) ?? []).size,
    },
    trade: {
      records: trade.data?.length ?? 0,
      commodities: new Set(trade.data?.map((r) => r.commodity_id) ?? []).size,
      country_pairs: new Set(
        trade.data?.map((r) => `${r.reporter_country}-${r.partner_country}`) ?? []
      ).size,
    },
    sync_events: {
      total: syncEvents.data?.length ?? 0,
      failed: syncEvents.data?.filter((e) => e.status === 'failed').length ?? 0,
      last_24h: syncEvents.data?.filter((e) => e.started_at > last24h).length ?? 0,
    },
  };
}
