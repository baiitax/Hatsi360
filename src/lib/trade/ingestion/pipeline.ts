/**
 * Trade Data Ingestion Pipeline
 * 
 * Phase 07 Stage 3: International Trade Data Engine
 * 
 * Orchestrates the ingestion of trade data from multiple sources.
 * Handles fetching, transformation, validation, deduplication, and
 * insertion with full provenance tracking.
 */

import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { TradeDataRecord, IngestionResult, TradeQueryParams, TradeDataSource, TradeDataSyncLog, TradeDataSourceType } from './types';
import { validateTradeRecord, findDuplicates, filterValidRecords } from './validators';

// ── Pipeline Core ────────────────────────────────────────────────────────────

/**
 * Main ingestion function. Fetches data from a source, validates, and inserts.
 */
export async function ingestTradeData(params: {
  sourceType: TradeDataSourceType;
  queryParams: TradeQueryParams;
  syncType?: 'full' | 'incremental' | 'retry';
}): Promise<IngestionResult> {
  const startedAt = new Date().toISOString();
  const supabase = await createClient();

  const result: IngestionResult = {
    source_id: 0,
    sync_log_id: 0,
    started_at: startedAt,
    completed_at: '',
    status: 'running',
    records_fetched: 0,
    records_inserted: 0,
    records_updated: 0,
    records_skipped_duplicate: 0,
    records_rejected_invalid: 0,
    errors: [],
  };

  try {
    // 1. Get the trade data source configuration
    const { data: source, error: sourceError } = await supabase
      .from('trade_data_sources')
      .select('*, evidence_sources(id, code, name)')
      .eq('source_type', params.sourceType)
      .eq('is_active', true)
      .single();

    if (sourceError || !source) {
      result.status = 'failed';
      result.errors.push({ message: `Source not found or inactive: ${params.sourceType}` });
      result.completed_at = new Date().toISOString();
      return result;
    }

    result.source_id = source.id;

    // 2. Create sync log entry
    const { data: syncLog, error: logError } = await supabase
      .from('trade_data_sync_log')
      .insert({
        trade_data_source_id: source.id,
        sync_type: params.syncType ?? 'full',
        started_at: startedAt,
        year_from: params.queryParams.year_from,
        year_to: params.queryParams.year_to,
      })
      .select()
      .single();

    if (logError || !syncLog) {
      result.status = 'failed';
      result.errors.push({ message: `Failed to create sync log: ${logError?.message}` });
      result.completed_at = new Date().toISOString();
      return result;
    }

    result.sync_log_id = syncLog.id;

    // 3. Fetch raw data (this is a placeholder — in production, this would
    //    call the appropriate adapter based on source type)
    let rawRecords: TradeDataRecord[] = [];
    
    // For now, return empty — adapters are ready for implementation
    // Each adapter would be called here based on params.sourceType
    switch (params.sourceType) {
      case 'faostat_trade':
        // const faostatAdapter = new FAOSTATTradeAdapter();
        // rawRecords = await faostatAdapter.fetchTradeData(params.queryParams);
        break;
      case 'itc_trade_map':
        // const itcAdapter = new ITC TradeMapAdapter();
        // rawRecords = await itcAdapter.fetchTradeData(params.queryParams);
        break;
      default:
        result.errors.push({ message: `No adapter implemented for source: ${params.sourceType}` });
    }

    result.records_fetched = rawRecords.length;

    // 4. Validate records
    const { valid, invalid } = filterValidRecords(rawRecords);
    result.records_rejected_invalid = invalid.length;
    for (const inv of invalid) {
      result.errors.push({ record: inv.record, message: inv.errors.join('; ') });
    }

    // 5. Check for duplicates within the batch
    const duplicates = findDuplicates(valid);
    const deduplicated = valid.filter((_, idx) => !duplicates.has(idx));
    result.records_skipped_duplicate += valid.length - deduplicated.length;

    // 6. Check for duplicates in the database (upsert key)
    // The database has a unique constraint on:
    // (reporting_country_id, partner_country_id, commodity_id, hs_code_id, flow_type, year, month)
    
    // 7. Resolve foreign keys (country IDs, commodity IDs, HS code IDs)
    const resolvedRecords = await resolveForeignKeys(deduplicated);

    // 8. Insert records
    if (resolvedRecords.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('international_trade_records')
        .insert(resolvedRecords.map((r) => r.dbRecord))
        .select('id');

      if (insertError) {
        result.errors.push({ message: `Insert error: ${insertError.message}` });
        result.status = 'partial';
      } else {
        result.records_inserted = inserted?.length ?? 0;
      }
    }

    // 9. Update sync log and source
    result.completed_at = new Date().toISOString();
    result.status = result.errors.length === 0 ? 'success' : 'partial';

    await supabase.from('trade_data_sync_log').update({
      completed_at: result.completed_at,
      status: result.status,
      records_fetched: result.records_fetched,
      records_inserted: result.records_inserted,
      records_updated: result.records_updated,
      records_skipped_duplicate: result.records_skipped_duplicate,
      records_rejected_invalid: result.records_rejected_invalid,
      error_message: result.errors.length > 0 ? result.errors[0]?.message : null,
    }).eq('id', syncLog.id);

    await supabase.from('trade_data_sources').update({
      last_sync_at: result.completed_at,
      last_sync_status: result.status,
      last_sync_records: result.records_inserted,
      last_sync_error: result.errors.length > 0 ? result.errors[0]?.message : null,
    }).eq('id', source.id);

    return result;
  } catch (error) {
    result.status = 'failed';
    result.completed_at = new Date().toISOString();
    result.errors.push({ message: error instanceof Error ? error.message : 'Unknown error' });
    return result;
  }
}

// ── Foreign Key Resolution ───────────────────────────────────────────────────

/**
 * Resolve country codes, commodity slugs, and HS codes to database IDs
 */
async function resolveForeignKeys(
  records: TradeDataRecord[],
): Promise<Array<{ dbRecord: Record<string, any>; original: TradeDataRecord }>> {
  const supabase = await createClient();
  const resolved: Array<{ dbRecord: Record<string, any>; original: TradeDataRecord }> = [];

  // Pre-fetch country IDs
  const iso3Codes = [
    ...new Set(records.flatMap((r) => [r.reporting_country_iso3, r.partner_country_iso3])),
  ].filter(Boolean);

  const { data: countries } = await supabase
    .from('countries')
    .select('id, iso_alpha3')
    .in('iso_alpha3', iso3Codes);

  const countryMap = new Map<string, number>();
  for (const c of countries ?? []) {
    countryMap.set(c.iso_alpha3, c.id);
  }

  // Pre-fetch commodity IDs
  const slugs = [...new Set(records.map((r) => r.commodity_slug).filter(Boolean))];
  const { data: commodities } = slugs.length > 0
    ? await supabase.from('commodities').select('id, slug').in('slug', slugs)
    : { data: [] };

  const commodityMap = new Map<string, number>();
  for (const c of commodities ?? []) {
    commodityMap.set(c.slug, c.id);
  }

  // Pre-fetch HS code IDs
  const hsCodes = [...new Set(records.map((r) => r.hs_code).filter(Boolean))];
  const { data: hsCodeRecords } = hsCodes.length > 0
    ? await supabase.from('hs_codes').select('id, code').in('code', hsCodes)
    : { data: [] };

  const hsCodeMap = new Map<string, number>();
  for (const h of hsCodeRecords ?? []) {
    hsCodeMap.set(h.code, h.id);
  }

  // Pre-fetch source IDs
  const sourceCodes = [...new Set(records.map((r) => r.source_code))];
  const { data: sources } = await supabase
    .from('evidence_sources')
    .select('id, code')
    .in('code', sourceCodes);

  const sourceMap = new Map<string, number>();
  for (const s of sources ?? []) {
    sourceMap.set(s.code, s.id);
  }

  // Resolve each record
  for (const record of records) {
    const reportingCountryId = countryMap.get(record.reporting_country_iso3);
    const partnerCountryId = countryMap.get(record.partner_country_iso3);

    if (!reportingCountryId || !partnerCountryId) {
      continue; // Skip records with unresolvable countries
    }

    const dbRecord: Record<string, any> = {
      reporting_country_id: reportingCountryId,
      partner_country_id: partnerCountryId,
      flow_type: record.flow_type,
      year: record.year,
      month: record.month ?? null,
      period_type: record.period_type,
      trade_value_usd: record.trade_value_usd ?? null,
      quantity_kg: record.quantity_kg ?? null,
      quantity_unit_description: record.quantity_unit_description ?? null,
      net_weight_kg: record.net_weight_kg ?? null,
      gross_weight_kg: record.gross_weight_kg ?? null,
      valuation_method: record.valuation_method ?? null,
      is_provisional: record.is_provisional ?? false,
      is_revised: record.is_revised ?? false,
      source_id: sourceMap.get(record.source_code) ?? null,
      source_dataset: record.source_dataset ?? null,
      source_record_id: record.source_record_id ?? null,
      source_url: record.source_url ?? null,
      retrieval_date: record.retrieval_date ?? null,
      publication_date: record.publication_date ?? null,
      validation_status: 'pending',
    };

    // Add optional foreign keys
    if (record.commodity_slug) {
      const commodityId = commodityMap.get(record.commodity_slug);
      if (commodityId) {
        dbRecord.commodity_id = commodityId;
      }
    }

    if (record.hs_code) {
      const hsCodeId = hsCodeMap.get(record.hs_code);
      if (hsCodeId) {
        dbRecord.hs_code_id = hsCodeId;
      }
    }

    resolved.push({ dbRecord, original: record });
  }

  return resolved;
}

// ── Data Source Management ───────────────────────────────────────────────────

/**
 * Get all configured trade data sources
 */
export async function getTradeDataSources(): Promise<TradeDataSource[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trade_data_sources')
    .select(`
      *,
      evidence_sources(id, code, name, organization, url)
    `)
    .order('source_type');

  if (error) throw new Error(`Failed to fetch trade data sources: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    evidence_source_id: row.evidence_source_id,
    source_type: row.source_type,
    api_base_url: row.api_base_url,
    api_rate_limit: row.api_rate_limit,
    supported_flow_types: row.supported_flow_types,
    min_year: row.min_year,
    max_year: row.max_year,
    supported_countries: row.supported_countries,
    auto_sync: row.auto_sync,
    sync_frequency_hours: row.sync_frequency_hours,
    last_sync_at: row.last_sync_at,
    last_sync_status: row.last_sync_status,
    last_sync_records: row.last_sync_records,
    last_sync_error: row.last_sync_error,
    is_active: row.is_active,
    requires_manual_validation: row.requires_manual_validation,
    created_at: row.created_at,
    updated_at: row.updated_at,
    evidence_source: row.evidence_sources,
  }));
}

/**
 * Get recent sync logs
 */
export async function getRecentSyncLogs(
  sourceId?: number,
  limit = 20,
): Promise<TradeDataSyncLog[]> {
  const supabase = await createClient();

  let query = supabase
    .from('trade_data_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (sourceId) {
    query = query.eq('trade_data_source_id', sourceId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch sync logs: ${error.message}`);

  return (data ?? []) as TradeDataSyncLog[];
}
