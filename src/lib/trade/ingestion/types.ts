/**
 * Trade Data Ingestion Types
 * 
 * Phase 07 Stage 3: International Trade Data Engine
 * 
 * Core type definitions for the trade data ingestion pipeline.
 */

export type TradeFlowType = 'import' | 'export';
export type PeriodType = 'annual' | 'quarterly' | 'monthly';
export type ValuationMethod = 'fob' | 'cif' | 'other';
export type ValidationStatus = 'pending' | 'validated' | 'flagged' | 'rejected';
export type TariffType = 'mfn' | 'bound' | 'preferential' | 'applied';
export type RateType = 'ad_valorem' | 'specific' | 'compound' | 'tariff_rate_quota';
export type TradeDataSourceType = 'faostat_trade' | 'itc_trade_map' | 'un_comtrade' | 'wto_itip' | 'manual';
export type SyncStatus = 'running' | 'success' | 'partial' | 'failed';

/**
 * Canonical trade record format used internally by the ingestion pipeline.
 * All adapters transform source-specific data into this format.
 */
export interface TradeDataRecord {
  reporting_country_iso3: string;
  partner_country_iso3: string;
  flow_type: TradeFlowType;
  commodity_slug?: string;
  hs_code?: string;
  year: number;
  month?: number;
  period_type: PeriodType;
  
  // Trade values
  trade_value_usd?: number;
  trade_value_local?: number;
  local_currency_code?: string;
  
  // Quantities
  quantity_kg?: number;
  quantity_units?: number;
  quantity_unit_description?: string;
  
  // Weights
  net_weight_kg?: number;
  gross_weight_kg?: number;
  
  // Valuation
  valuation_method?: ValuationMethod;
  
  // Data quality
  is_provisional?: boolean;
  is_revised?: boolean;
  
  // Source tracking
  source_code: string;
  source_dataset?: string;
  source_record_id?: string;
  source_url?: string;
  
  // Provenance
  retrieval_date?: string;
  publication_date?: string;
}

/**
 * Parameters for querying trade data
 */
export interface TradeQueryParams {
  reporting_country_id?: number;
  reporting_country_code?: string;
  partner_country_id?: number;
  partner_country_code?: string;
  commodity_id?: number;
  commodity_slug?: string;
  hs_code_id?: number;
  hs_code?: string;
  flow_type?: TradeFlowType;
  year?: number;
  year_from?: number;
  year_to?: number;
  period_type?: PeriodType;
  min_value_usd?: number;
  validation_status?: ValidationStatus;
  limit?: number;
  offset?: number;
}

/**
 * Trade flow summary for a country-commodity pair
 */
export interface TradeFlowSummary {
  reporting_country_id: number;
  reporting_country_code: string;
  reporting_country_name: string;
  partner_country_id: number;
  partner_country_code: string;
  partner_country_name: string;
  commodity_id?: number;
  commodity_name?: string;
  hs_code?: string;
  hs_description?: string;
  flow_type: TradeFlowType;
  year: number;
  
  // Aggregated values
  total_value_usd: number;
  total_quantity_kg: number;
  record_count: number;
  avg_unit_value_usd_per_kg: number | null;
  
  // Data quality
  min_year: number;
  max_year: number;
  sources: string[];
}

/**
 * Parameters for querying tariff data
 */
export interface TariffQueryParams {
  country_id?: number;
  country_code?: string;
  hs_code_id?: number;
  hs_code?: string;
  tariff_type?: TariffType;
  is_current?: boolean;
  trade_bloc_id?: number;
  limit?: number;
  offset?: number;
}

/**
 * Tariff schedule record
 */
export interface TariffSchedule {
  id: number;
  country_id: number;
  country_code: string;
  country_name: string;
  hs_code_id: number;
  hs_code: string;
  hs_description: string;
  tariff_type: TariffType;
  rate_type: RateType;
  rate_value: number;
  rate_unit: string;
  
  // For tariff rate quotas
  quota_quantity?: number;
  quota_unit?: string;
  over_quota_rate?: number;
  
  // Temporal
  effective_date?: string;
  expiry_date?: string;
  is_current: boolean;
  
  // Trade agreement (for preferential rates)
  trade_bloc_id?: number;
  trade_bloc_code?: string;
  trade_bloc_name?: string;
  
  // Source
  source_name?: string;
  source_url?: string;
  
  // Metadata
  last_updated?: string;
}

/**
 * Trade data source configuration
 */
export interface TradeDataSource {
  id: number;
  evidence_source_id: number;
  source_type: TradeDataSourceType;
  
  // API configuration
  api_base_url?: string;
  api_rate_limit: number;
  
  // Data scope
  supported_flow_types: TradeFlowType[];
  min_year?: number;
  max_year?: number;
  supported_countries?: string[];
  
  // Sync configuration
  auto_sync: boolean;
  sync_frequency_hours: number;
  last_sync_at?: string;
  last_sync_status?: SyncStatus;
  last_sync_records: number;
  last_sync_error?: string;
  
  // Flags
  is_active: boolean;
  requires_manual_validation: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Linked evidence source
  evidence_source?: {
    id: number;
    code: string;
    name: string;
    organization: string;
    url?: string;
  };
}

/**
 * Trade data sync log entry
 */
export interface TradeDataSyncLog {
  id: number;
  trade_data_source_id: number;
  
  sync_type: 'full' | 'incremental' | 'retry';
  started_at: string;
  completed_at?: string;
  status: SyncStatus;
  
  // Scope
  year_from?: number;
  year_to?: number;
  reporting_country_codes?: string[];
  
  // Results
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_skipped_duplicate: number;
  records_rejected_invalid: number;
  
  // Errors
  error_message?: string;
  error_details?: Record<string, any>;
  
  created_at: string;
}

/**
 * Result of ingesting trade data from a source
 */
export interface IngestionResult {
  source_id: number;
  sync_log_id: number;
  
  started_at: string;
  completed_at: string;
  status: SyncStatus;
  
  records_fetched: number;
  records_inserted: number;
  records_updated: number;
  records_skipped_duplicate: number;
  records_rejected_invalid: number;
  
  errors: Array<{
    record?: TradeDataRecord;
    message: string;
  }>;
}

/**
 * Adapter interface for trade data sources
 */
export interface TradeDataSourceAdapter {
  getSourceType(): TradeDataSourceType;
  
  /**
   * Fetch raw trade data from the source
   */
  fetchTradeData(params: TradeQueryParams): Promise<TradeDataRecord[]>;
  
  /**
   * Transform source-specific data to canonical format
   */
  transformData(raw: any[]): TradeDataRecord[];
  
  /**
   * Validate records before ingestion
   */
  validateData(records: TradeDataRecord[]): ValidationResult[];
}

/**
 * Result of validating a trade data record
 */
export interface ValidationResult {
  record: TradeDataRecord;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Trade flow analytics result
 */
export interface TradeFlowAnalytics {
  country_id: number;
  country_code: string;
  country_name: string;
  commodity_id?: number;
  commodity_name?: string;
  
  // Time series
  yearly_totals: Array<{
    year: number;
    import_value_usd: number;
    export_value_usd: number;
    import_quantity_kg: number;
    export_quantity_kg: number;
    trade_balance_usd: number;
  }>;
  
  // Top partners
  top_import_partners: Array<{
    country_code: string;
    country_name: string;
    total_value_usd: number;
    share_percent: number;
  }>;
  
  top_export_partners: Array<{
    country_code: string;
    country_name: string;
    total_value_usd: number;
    share_percent: number;
  }>;
  
  // Summary statistics
  total_imports_usd: number;
  total_exports_usd: number;
  trade_balance_usd: number;
  data_years: number[];
  data_sources: string[];
}
