import 'server-only';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
import { getFundamentalSignals, type FundamentalSignal } from '@/lib/trade/queries';

/**
 * Intelligence data for a single commodity.
 *
 * This is FAOSTAT/USDA-sourced intelligence, aggregated and traceable to its
 * original source. It is never fabricated.
 */
export interface CommodityIntelligenceOverview {
  commodityId: number;
  commodityName: string;
  commoditySlug: string;
  latestProductionYear: number | null;
  latestProductionMt: number | null;
  latestYieldMtPerHa: number | null;
  selfSufficiencyPercent: number | null;
  stockToUsePercent: number | null;
  latestExportsMt: number | null;
  latestImportsMt: number | null;
  totalEvidenceRecords: number;
}

/**
 * Fetch the intelligence overview for a commodity by its slug.
 *
 * Reads from `analytics_commodity_overview`, which is populated by the FAOSTAT
 * ingestion pipeline. Returns `null` when no intelligence data exists yet.
 */
export async function getCommodityIntelligenceOverview(
  commoditySlug: string,
): Promise<CommodityIntelligenceOverview | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analytics_commodity_overview')
    .select('*')
    .eq('commodity_slug', commoditySlug)
    .single();

  if (error || !data) return null;

  return {
    commodityId: data.commodity_id,
    commodityName: data.commodity_name,
    commoditySlug: data.commodity_slug,
    latestProductionYear: data.latest_production_year ?? null,
    latestProductionMt: data.latest_production_mt ?? null,
    latestYieldMtPerHa: data.latest_yield_mt_per_ha ?? null,
    selfSufficiencyPercent: data.self_sufficiency_percent ?? null,
    stockToUsePercent: data.stock_to_use_percent ?? null,
    latestExportsMt: data.latest_exports_mt ?? null,
    latestImportsMt: data.latest_imports_mt ?? null,
    totalEvidenceRecords: data.total_evidence_records ?? 0,
  };
}

/**
 * Fetch all intelligence overviews, indexed by commodity slug.
 *
 * Used by the commodity directory to annotate each card with intelligence
 * availability without an N+1 query.
 */
export async function getIntelligenceOverviewsBySlug(): Promise<
  Map<string, CommodityIntelligenceOverview>
> {
  if (!isSupabaseConfigured()) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('analytics_commodity_overview')
    .select('*');

  if (error || !data) return new Map();

  const map = new Map<string, CommodityIntelligenceOverview>();
  for (const row of data) {
    map.set(row.commodity_slug, {
      commodityId: row.commodity_id,
      commodityName: row.commodity_name,
      commoditySlug: row.commodity_slug,
      latestProductionYear: row.latest_production_year ?? null,
      latestProductionMt: row.latest_production_mt ?? null,
      latestYieldMtPerHa: row.latest_yield_mt_per_ha ?? null,
      selfSufficiencyPercent: row.self_sufficiency_percent ?? null,
      stockToUsePercent: row.stock_to_use_percent ?? null,
      latestExportsMt: row.latest_exports_mt ?? null,
      latestImportsMt: row.latest_imports_mt ?? null,
      totalEvidenceRecords: row.total_evidence_records ?? 0,
    });
  }
  return map;
}

/**
 * Field-reported fundamental signals for a commodity.
 *
 * These come from `observation_market_intelligence`, written by the Field app.
 * They are the platform's own fundamental data — supply levels, demand levels,
 * price direction, sentiment — and are filtered to one commodity.
 */
export async function getCommodityFundamentals(
  commodityId: number,
  limit = 20,
): Promise<FundamentalSignal[]> {
  if (!isSupabaseConfigured()) return [];
  return getFundamentalSignals(commodityId, limit);
}

/**
 * Format a metric tonnes value for display.
 */
export function formatMt(value: number | null): string {
  if (value === null) return '—';
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M MT`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K MT`;
  }
  return `${value.toFixed(0)} MT`;
}

/**
 * Describe the self-sufficiency level in words.
 */
export function describeSelfSufficiency(percent: number | null): {
  label: string;
  tone: 'surplus' | 'balanced' | 'deficit' | 'unknown';
} {
  if (percent === null) return { label: 'Unknown', tone: 'unknown' };
  if (percent >= 100) return { label: 'Net exporter', tone: 'surplus' };
  if (percent >= 80) return { label: 'Near self-sufficient', tone: 'balanced' };
  if (percent >= 50) return { label: 'Import dependent', tone: 'deficit' };
  return { label: 'Heavily import dependent', tone: 'deficit' };
}

/**
 * Describe the stock-to-use level in words.
 */
export function describeStockToUse(percent: number | null): {
  label: string;
  tone: 'comfortable' | 'adequate' | 'tight' | 'unknown';
} {
  if (percent === null) return { label: 'Unknown', tone: 'unknown' };
  if (percent >= 20) return { label: 'Comfortable', tone: 'comfortable' };
  if (percent >= 10) return { label: 'Adequate', tone: 'adequate' };
  return { label: 'Tight', tone: 'tight' };
}
