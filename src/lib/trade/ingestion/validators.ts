/**
 * Trade Data Validators
 * 
 * Phase 07 Stage 3: International Trade Data Engine
 * 
 * Validates trade data records before ingestion. Ensures data quality,
 * consistency, and provenance tracking.
 */

import type { TradeDataRecord, ValidationResult } from './types';

// Known ISO 3166-1 alpha-3 codes (subset for validation)
const KNOWN_COUNTRIES = new Set([
  'NGA', 'GHA', 'KEN', 'ZAF', 'EGY', 'TZA', 'UGA', 'RWA', 'ETH', 'CMR',
  'CIV', 'SEN', 'MLI', 'BFA', 'NER', 'TGO', 'BEN', 'GIN', 'SLE', 'LBR',
  'GMB', 'GNB', 'GNQ', 'GAB', 'COG', 'COD', 'CAF', 'TCD', 'SDN', 'SSD',
  'ERI', 'DJI', 'SOM', 'LBY', 'TUN', 'DZA', 'MAR', 'MRT', 'USA', 'CAN',
  'MEX', 'BRA', 'ARG', 'CHL', 'COL', 'PER', 'VEN', 'ECU', 'BOL', 'PRY',
  'URY', 'GBR', 'FRA', 'DEU', 'ITA', 'ESP', 'NLD', 'BEL', 'POL', 'CHE',
  'AUT', 'SWE', 'NOR', 'DNK', 'FIN', 'PRT', 'IRL', 'CZE', 'ROU', 'HUN',
  'GRC', 'BGR', 'HRV', 'SVK', 'SVN', 'LTU', 'LVA', 'EST', 'LUX', 'MLT',
  'CYP', 'CHN', 'JPN', 'KOR', 'IND', 'IDN', 'THA', 'VNM', 'PHL', 'MYS',
  'SGP', 'AUS', 'NZL', 'RUS', 'UKR', 'TUR', 'SAU', 'ARE', 'ISR', 'IRN',
  'IRQ', 'PAK', 'BGD', 'LKA', 'MMR', 'KHM', 'LAO', 'NPL', 'MNG', 'KAZ',
  'AFG', 'BTN', 'MDV', 'BRN', 'TLS', 'PNG', 'FJI', 'SLB', 'VUT', 'WSM',
]);

/**
 * Validate a single trade data record.
 * 
 * Checks:
 * 1. Required fields are present
 * 2. Country codes are valid ISO alpha-3
 * 3. Year is reasonable (1990-2030)
 * 4. Trade values are non-negative
 * 5. At least one value metric is present (USD, quantity, or weight)
 * 6. Flow type is valid
 * 7. Source code is provided
 */
export function validateTradeRecord(record: TradeDataRecord): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!record.reporting_country_iso3) {
    errors.push('Missing reporting_country_iso3');
  } else if (!KNOWN_COUNTRIES.has(record.reporting_country_iso3)) {
    warnings.push(`Unknown reporting country code: ${record.reporting_country_iso3}`);
  }

  if (!record.partner_country_iso3) {
    errors.push('Missing partner_country_iso3');
  } else if (!KNOWN_COUNTRIES.has(record.partner_country_iso3)) {
    warnings.push(`Unknown partner country code: ${record.partner_country_iso3}`);
  }

  if (!record.flow_type) {
    errors.push('Missing flow_type');
  } else if (!['import', 'export'].includes(record.flow_type)) {
    errors.push(`Invalid flow_type: ${record.flow_type}`);
  }

  if (!record.year) {
    errors.push('Missing year');
  } else if (record.year < 1990 || record.year > 2030) {
    errors.push(`Year out of range: ${record.year}`);
  }

  // At least one value metric must be present
  const hasValue = record.trade_value_usd !== undefined ||
    record.quantity_kg !== undefined ||
    record.net_weight_kg !== undefined;
  
  if (!hasValue) {
    errors.push('At least one value metric required (trade_value_usd, quantity_kg, or net_weight_kg)');
  }

  // Non-negative values
  if (record.trade_value_usd !== undefined && record.trade_value_usd < 0) {
    errors.push('trade_value_usd must be non-negative');
  }

  if (record.quantity_kg !== undefined && record.quantity_kg < 0) {
    errors.push('quantity_kg must be non-negative');
  }

  if (record.net_weight_kg !== undefined && record.net_weight_kg < 0) {
    errors.push('net_weight_kg must be non-negative');
  }

  // Source tracking
  if (!record.source_code) {
    errors.push('Missing source_code');
  }

  // Month validation
  if (record.month !== undefined) {
    if (record.month < 1 || record.month > 12) {
      errors.push(`Invalid month: ${record.month}`);
    }
    if (record.period_type !== 'monthly') {
      warnings.push('Month specified but period_type is not monthly');
    }
  }

  // Commodity or HS code should be present
  if (!record.commodity_slug && !record.hs_code) {
    warnings.push('Neither commodity_slug nor hs_code specified');
  }

  // Trade value plausibility checks (warnings only)
  if (record.trade_value_usd !== undefined) {
    if (record.trade_value_usd > 1_000_000_000_000) {
      warnings.push(`Trade value exceeds $1 trillion — verify: $${record.trade_value_usd}`);
    }
    
    // Check unit value plausibility
    if (record.quantity_kg && record.quantity_kg > 0) {
      const unitValue = record.trade_value_usd / record.quantity_kg;
      if (unitValue > 1_000_000) {
        warnings.push(`Unit value exceeds $1M/kg — verify: $${unitValue.toFixed(2)}/kg`);
      }
      if (unitValue < 0.001) {
        warnings.push(`Unit value below $0.001/kg — verify: $${unitValue.toFixed(6)}/kg`);
      }
    }
  }

  return {
    record,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate multiple trade data records
 */
export function validateTradeRecords(records: TradeDataRecord[]): ValidationResult[] {
  return records.map(validateTradeRecord);
}

/**
 * Check for duplicate records within a batch.
 * Returns indices of records that are duplicates.
 */
export function findDuplicates(records: TradeDataRecord[]): Map<number, number> {
  const seen = new Map<string, number>();
  const duplicates = new Map<number, number>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const key = `${record.reporting_country_iso3}|${record.partner_country_iso3}|${record.flow_type}|${record.year}|${record.commodity_slug || record.hs_code}`;

    if (seen.has(key)) {
      duplicates.set(i, seen.get(key)!);
    } else {
      seen.set(key, i);
    }
  }

  return duplicates;
}

/**
 * Filter records to only valid ones
 */
export function filterValidRecords(records: TradeDataRecord[]): {
  valid: TradeDataRecord[];
  invalid: Array<{ record: TradeDataRecord; errors: string[] }>;
} {
  const valid: TradeDataRecord[] = [];
  const invalid: Array<{ record: TradeDataRecord; errors: string[] }> = [];

  for (const record of records) {
    const result = validateTradeRecord(record);
    if (result.valid) {
      valid.push(record);
    } else {
      invalid.push({ record, errors: result.errors });
    }
  }

  return { valid, invalid };
}

/**
 * Remove duplicates from a batch, keeping the first occurrence
 */
export function deduplicateRecords(records: TradeDataRecord[]): TradeDataRecord[] {
  const seen = new Set<string>();
  const deduplicated: TradeDataRecord[] = [];

  for (const record of records) {
    const key = `${record.reporting_country_iso3}|${record.partner_country_iso3}|${record.flow_type}|${record.year}|${record.commodity_slug || record.hs_code}|${record.month || 'annual'}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(record);
    }
  }

  return deduplicated;
}
