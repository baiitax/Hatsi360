/**
 * Tariff Service
 * 
 * Phase 07 Stage 3: International Trade Data Engine
 * 
 * Queries tariff_schedules for tariff rates by country and HS code.
 * Supports MFN, bound, preferential, and applied tariff lookups.
 */

import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { TariffQueryParams, TariffType, TariffSchedule } from './ingestion/types';

// ── Query Functions ──────────────────────────────────────────────────────────

/**
 * Query tariff schedules with flexible filtering
 */
export async function queryTariffs(
  params: TariffQueryParams,
): Promise<TariffSchedule[]> {
  const supabase = await createClient();

  let query = supabase.from('tariff_schedules').select(`
    *,
    country:country_id!inner(id, code, name, iso_alpha3),
    hs_code:hs_code_id!inner(id, code, description, level),
    trade_bloc:trade_bloc_id(id, code, name)
  `);

  // Apply filters
  if (params.country_id) {
    query = query.eq('country_id', params.country_id);
  }
  if (params.country_code) {
    query = query.eq('country.iso_alpha3', params.country_code);
  }
  if (params.hs_code_id) {
    query = query.eq('hs_code_id', params.hs_code_id);
  }
  if (params.hs_code) {
    query = query.eq('hs_code.code', params.hs_code);
  }
  if (params.tariff_type) {
    query = query.eq('tariff_type', params.tariff_type);
  }
  if (params.is_current !== undefined) {
    query = query.eq('is_current', params.is_current);
  }
  if (params.trade_bloc_id) {
    query = query.eq('trade_bloc_id', params.trade_bloc_id);
  }

  // Pagination
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;
  query = query.order('hs_code.code').range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query tariffs: ${error.message}`);

  // Transform to TariffSchedule format
  return (data ?? []).map((row: any) => ({
    id: row.id,
    country_id: row.country.id,
    country_code: row.country.iso_alpha3,
    country_name: row.country.name,
    hs_code_id: row.hs_code.id,
    hs_code: row.hs_code.code,
    hs_description: row.hs_code.description,
    tariff_type: row.tariff_type,
    rate_type: row.rate_type,
    rate_value: row.rate_value,
    rate_unit: row.rate_unit,
    quota_quantity: row.quota_quantity,
    quota_unit: row.quota_unit,
    over_quota_rate: row.over_quota_rate,
    effective_date: row.effective_date,
    expiry_date: row.expiry_date,
    is_current: row.is_current,
    trade_bloc_id: row.trade_bloc?.id,
    trade_bloc_code: row.trade_bloc?.code,
    trade_bloc_name: row.trade_bloc?.name,
    source_name: row.source?.name,
    source_url: row.source_url,
    last_updated: row.last_updated,
  }));
}

/**
 * Get the current MFN tariff for a country and HS code
 */
export async function getMFNTariff(params: {
  countryCode: string;
  hsCode: string;
}): Promise<TariffSchedule | null> {
  const tariffs = await queryTariffs({
    country_code: params.countryCode,
    hs_code: params.hsCode,
    tariff_type: 'mfn',
    is_current: true,
    limit: 1,
  });

  return tariffs[0] ?? null;
}

/**
 * Get all tariff types for a country and HS code
 */
export async function getAllTariffsForCode(params: {
  countryCode: string;
  hsCode: string;
}): Promise<{
  mfn: TariffSchedule | null;
  bound: TariffSchedule | null;
  applied: TariffSchedule | null;
  preferential: TariffSchedule[];
}> {
  const tariffs = await queryTariffs({
    country_code: params.countryCode,
    hs_code: params.hsCode,
    is_current: true,
    limit: 100,
  });

  return {
    mfn: tariffs.find((t) => t.tariff_type === 'mfn') ?? null,
    bound: tariffs.find((t) => t.tariff_type === 'bound') ?? null,
    applied: tariffs.find((t) => t.tariff_type === 'applied') ?? null,
    preferential: tariffs.filter((t) => t.tariff_type === 'preferential'),
  };
}

/**
 * Get preferential tariff rates for a trade bloc
 */
export async function getPreferentialTariffs(params: {
  tradeBlocCode: string;
  countryCode?: string;
  hsCode?: string;
}): Promise<TariffSchedule[]> {
  const supabase = await createClient();

  let query = supabase.from('tariff_schedules').select(`
    *,
    country:country_id!inner(id, code, name, iso_alpha3),
    hs_code:hs_code_id!inner(id, code, description),
    trade_bloc:trade_bloc_id!inner(id, code, name)
  `)
    .eq('trade_bloc.code', params.tradeBlocCode)
    .eq('tariff_type', 'preferential')
    .eq('is_current', true);

  if (params.countryCode) {
    query = query.eq('country.iso_alpha3', params.countryCode);
  }
  if (params.hsCode) {
    query = query.eq('hs_code.code', params.hsCode);
  }

  query = query.order('hs_code.code').limit(500);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to query preferential tariffs: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    country_id: row.country.id,
    country_code: row.country.iso_alpha3,
    country_name: row.country.name,
    hs_code_id: row.hs_code.id,
    hs_code: row.hs_code.code,
    hs_description: row.hs_code.description,
    tariff_type: row.tariff_type,
    rate_type: row.rate_type,
    rate_value: row.rate_value,
    rate_unit: row.rate_unit,
    quota_quantity: row.quota_quantity,
    quota_unit: row.quota_unit,
    over_quota_rate: row.over_quota_rate,
    effective_date: row.effective_date,
    expiry_date: row.expiry_date,
    is_current: row.is_current,
    trade_bloc_id: row.trade_bloc?.id,
    trade_bloc_code: row.trade_bloc?.code,
    trade_bloc_name: row.trade_bloc?.name,
    source_name: row.source?.name,
    source_url: row.source_url,
    last_updated: row.last_updated,
  }));
}

/**
 * Get tariff statistics for a country
 */
export async function getTariffStats(params: {
  countryCode: string;
}): Promise<{
  total_tariff_lines: number;
  avg_mfn_rate: number;
  avg_bound_rate: number;
  max_mfn_rate: number;
  zero_tariff_lines: number;
  tariff_rate_quota_lines: number;
  preferential_agreements: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tariff_schedules')
    .select('tariff_type, rate_value, rate_type, trade_bloc_id')
    .eq('country.iso_alpha3', params.countryCode)
    .eq('is_current', true);

  if (error) throw new Error(`Failed to query tariff stats: ${error.message}`);

  const records = data ?? [];

  const mfnRecords = records.filter((r: any) => r.tariff_type === 'mfn' && r.rate_value !== null);
  const boundRecords = records.filter((r: any) => r.tariff_type === 'bound' && r.rate_value !== null);
  const trqRecords = records.filter((r: any) => r.rate_type === 'tariff_rate_quota');
  const preferentialBlocs = new Set(records.filter((r: any) => r.tariff_type === 'preferential' && r.trade_bloc_id).map((r: any) => r.trade_bloc_id));

  return {
    total_tariff_lines: records.length,
    avg_mfn_rate: mfnRecords.length > 0
      ? mfnRecords.reduce((sum: number, r: any) => sum + (r.rate_value ?? 0), 0) / mfnRecords.length
      : 0,
    avg_bound_rate: boundRecords.length > 0
      ? boundRecords.reduce((sum: number, r: any) => sum + (r.rate_value ?? 0), 0) / boundRecords.length
      : 0,
    max_mfn_rate: mfnRecords.length > 0
      ? Math.max(...mfnRecords.map((r: any) => r.rate_value ?? 0))
      : 0,
    zero_tariff_lines: mfnRecords.filter((r: any) => r.rate_value === 0).length,
    tariff_rate_quota_lines: trqRecords.length,
    preferential_agreements: preferentialBlocs.size,
  };
}

/**
 * Compare tariff rates across countries for a given HS code
 */
export async function compareTariffsByCountry(params: {
  hsCode: string;
  countryCodes: string[];
  tariffType?: TariffType;
}): Promise<Array<{
  country_code: string;
  country_name: string;
  tariff_type: TariffType;
  rate_value: number;
  rate_unit: string;
}>> {
  const supabase = await createClient();

  let query = supabase.from('tariff_schedules').select(`
    tariff_type,
    rate_value,
    rate_unit,
    country:country_id!inner(id, code, name, iso_alpha3)
  `)
    .eq('hs_code.code', params.hsCode)
    .eq('is_current', true);

  if (params.tariffType) {
    query = query.eq('tariff_type', params.tariffType);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to compare tariffs: ${error.message}`);

  const results = (data ?? [])
    .filter((row: any) => params.countryCodes.includes(row.country.iso_alpha3))
    .map((row: any) => ({
      country_code: row.country.iso_alpha3,
      country_name: row.country.name,
      tariff_type: row.tariff_type,
      rate_value: row.rate_value,
      rate_unit: row.rate_unit,
    }));

  return results;
}
