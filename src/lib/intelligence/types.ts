/**
 * Phase 06: Commodity Intelligence Types
 *
 * Type definitions for the evidence-backed agricultural intelligence system.
 * All intelligence data carries provenance metadata — nothing enters the system
 * without traceable origin.
 */

// ── Evidence Sources ────────────────────────────────────────────────────────

export type EvidenceSourceType =
  | 'government'
  | 'international_org'
  | 'academic'
  | 'industry'
  | 'media'
  | 'other';

export type AccessMethod =
  | 'api'
  | 'web_scrape'
  | 'manual_download'
  | 'file_upload'
  | 'manual';

export interface EvidenceSource {
  id: number;
  code: string;
  name: string;
  organization: string;
  url: string | null;
  source_type: EvidenceSourceType;
  reliability: number;
  update_frequency: string | null;
  license_type: string | null;
  access_method: AccessMethod;
  api_base_url: string | null;
  api_key_env_var: string | null;
  country_codes: string[];
  commodity_scope: string[];
  last_sync_at: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Sync Events ─────────────────────────────────────────────────────────────

export type SyncType = 'api_fetch' | 'file_upload' | 'manual_entry' | 'scheduled';
export type SyncStatus = 'running' | 'completed' | 'failed' | 'partial';

export interface SourceSyncEvent {
  id: number;
  source_id: number;
  sync_type: SyncType;
  started_at: string;
  completed_at: string | null;
  status: SyncStatus;
  data_period_start: string | null;
  data_period_end: string | null;
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  error_message: string | null;
  raw_file_path: string | null;
  file_hash: string | null;
  triggered_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ── Commodity Production ────────────────────────────────────────────────────

export type VerificationStatus = 'imported' | 'verified' | 'questionable' | 'deprecated';

export interface CommodityProduction {
  id: number;
  commodity_id: number;
  country_code: string;
  year: number;
  production_quantity_mt: number | null;
  yield_mt_per_ha: number | null;
  harvested_area_ha: number | null;
  production_value_usd: number | null;
  source_id: number | null;
  sync_event_id: number | null;
  original_item_code: string | null;
  original_element_code: string | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

// ── Commodity Supply ────────────────────────────────────────────────────────

export interface CommoditySupply {
  id: number;
  commodity_id: number;
  country_code: string;
  year: number;
  domestic_production_mt: number | null;
  imports_mt: number | null;
  beginning_stocks_mt: number | null;
  other_supply_mt: number | null;
  total_supply_mt: number | null;
  source_id: number | null;
  sync_event_id: number | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

// ── Commodity Demand ────────────────────────────────────────────────────────

export interface CommodityDemand {
  id: number;
  commodity_id: number;
  country_code: string;
  year: number;
  food_consumption_mt: number | null;
  industrial_use_mt: number | null;
  feed_use_mt: number | null;
  seed_use_mt: number | null;
  waste_mt: number | null;
  exports_mt: number | null;
  ending_stocks_mt: number | null;
  total_domestic_mt: number | null;
  total_demand_mt: number | null;
  population_millions: number | null;
  per_capita_consumption_kg: number | null;
  source_id: number | null;
  sync_event_id: number | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

// ── Commodity Trade ─────────────────────────────────────────────────────────

export type TradeFlowType = 'export' | 'import';

export interface CommodityTrade {
  id: number;
  commodity_id: number;
  flow_type: TradeFlowType;
  reporter_country: string;
  partner_country: string;
  year: number;
  quantity_mt: number | null;
  value_usd: number | null;
  unit_value_usd_per_mt: number | null;
  hs_code: string | null;
  source_id: number | null;
  sync_event_id: number | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

// ── Ingestion Types ─────────────────────────────────────────────────────────

export interface IngestionResult {
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  errors: string[];
}

export interface IngestionContext {
  source_id: number;
  sync_event_id: number;
  triggered_by?: string;
  data_period_start?: string;
  data_period_end?: string;
}

// ── Intelligence Query Types ────────────────────────────────────────────────

export interface ProductionQuery {
  commodity_id?: number;
  commodity_slug?: string;
  country_code?: string;
  year?: number;
  year_from?: number;
  year_to?: number;
  verified_only?: boolean;
}

export interface SupplyQuery {
  commodity_id?: number;
  commodity_slug?: string;
  country_code?: string;
  year?: number;
  year_from?: number;
  year_to?: number;
  verified_only?: boolean;
}

export interface DemandQuery {
  commodity_id?: number;
  commodity_slug?: string;
  country_code?: string;
  year?: number;
  year_from?: number;
  year_to?: number;
  verified_only?: boolean;
}

export interface TradeQuery {
  commodity_id?: number;
  commodity_slug?: string;
  flow_type?: TradeFlowType;
  reporter_country?: string;
  partner_country?: string;
  year?: number;
  year_from?: number;
  year_to?: number;
  verified_only?: boolean;
}

// ── Intelligence Summary ────────────────────────────────────────────────────

export interface CommodityIntelligenceSummary {
  commodity_id: number;
  commodity_name: string;
  commodity_slug: string;
  country_code: string;
  latest_year: number;
  production?: {
    quantity_mt: number | null;
    yield_mt_per_ha: number | null;
    harvested_area_ha: number | null;
    trend: 'increasing' | 'decreasing' | 'stable' | null;
  };
  supply_demand?: {
    total_supply_mt: number | null;
    total_demand_mt: number | null;
    ending_stocks_mt: number | null;
    stock_to_use_ratio: number | null;
  };
  trade?: {
    exports_mt: number | null;
    imports_mt: number | null;
    net_trade_mt: number | null;
    top_export_partners: Array<{ country: string; quantity_mt: number }>;
    top_import_partners: Array<{ country: string; quantity_mt: number }>;
  };
  evidence_count: number;
  latest_source: string | null;
  last_updated: string | null;
}
