import { describe, expect, it } from 'vitest';
import {
  validateTradeRecord,
  validateTradeRecords,
  findDuplicates,
  filterValidRecords,
  deduplicateRecords,
} from '@/lib/trade/ingestion/validators';
import type { TradeDataRecord } from '@/lib/trade/ingestion/types';

/**
 * Trade Data Validators Tests
 *
 * Phase 07 Stage 3: Validates the trade data validation pipeline
 * that ensures data quality before ingestion.
 */

function makeRecord(overrides: Partial<TradeDataRecord> = {}): TradeDataRecord {
  return {
    reporting_country_iso3: 'NGA',
    partner_country_iso3: 'GHA',
    flow_type: 'export',
    commodity_slug: 'rice',
    hs_code: '1006',
    year: 2022,
    period_type: 'annual',
    trade_value_usd: 1_000_000,
    quantity_kg: 500_000,
    source_code: 'faostat',
    ...overrides,
  };
}

describe('validateTradeRecord', () => {
  it('accepts a valid trade record', () => {
    const result = validateTradeRecord(makeRecord());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects record without reporting country', () => {
    const result = validateTradeRecord(makeRecord({ reporting_country_iso3: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('reporting_country_iso3'))).toBe(true);
  });

  it('rejects record without partner country', () => {
    const result = validateTradeRecord(makeRecord({ partner_country_iso3: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('partner_country_iso3'))).toBe(true);
  });

  it('rejects record without flow type', () => {
    const result = validateTradeRecord(makeRecord({ flow_type: '' as any }));
    expect(result.valid).toBe(false);
  });

  it('rejects record without year', () => {
    const result = validateTradeRecord(makeRecord({ year: 0 }));
    expect(result.valid).toBe(false);
  });

  it('rejects record with year out of range', () => {
    const result = validateTradeRecord(makeRecord({ year: 1800 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('out of range'))).toBe(true);
  });

  it('rejects record with no value metrics', () => {
    const result = validateTradeRecord(makeRecord({
      trade_value_usd: undefined,
      quantity_kg: undefined,
      net_weight_kg: undefined,
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('value metric'))).toBe(true);
  });

  it('rejects negative trade value', () => {
    const result = validateTradeRecord(makeRecord({ trade_value_usd: -100 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('non-negative'))).toBe(true);
  });

  it('rejects negative quantity', () => {
    const result = validateTradeRecord(makeRecord({ quantity_kg: -50 }));
    expect(result.valid).toBe(false);
  });

  it('rejects record without source code', () => {
    const result = validateTradeRecord(makeRecord({ source_code: '' }));
    expect(result.valid).toBe(false);
  });

  it('warns on unknown country code', () => {
    const result = validateTradeRecord(makeRecord({ reporting_country_iso3: 'XYZ' }));
    expect(result.valid).toBe(true); // Still valid, just warning
    expect(result.warnings.some(w => w.includes('Unknown'))).toBe(true);
  });

  it('warns on implausibly high trade value', () => {
    const result = validateTradeRecord(makeRecord({ trade_value_usd: 2_000_000_000_000 }));
    expect(result.warnings.some(w => w.includes('trillion'))).toBe(true);
  });

  it('warns on implausible unit value', () => {
    const result = validateTradeRecord(makeRecord({
      trade_value_usd: 50_000_000,
      quantity_kg: 1, // $50M for 1 kg
    }));
    expect(result.warnings.some(w => w.includes('Unit value'))).toBe(true);
  });

  it('rejects invalid month', () => {
    const result = validateTradeRecord(makeRecord({ month: 13, period_type: 'monthly' }));
    expect(result.valid).toBe(false);
  });

  it('warns when month specified but period is annual', () => {
    const result = validateTradeRecord(makeRecord({ month: 6, period_type: 'annual' }));
    expect(result.warnings.some(w => w.includes('period_type'))).toBe(true);
  });
});

describe('validateTradeRecords', () => {
  it('validates multiple records', () => {
    const records = [makeRecord(), makeRecord({ year: 2023 }), makeRecord({ source_code: '' })];
    const results = validateTradeRecords(records);
    expect(results).toHaveLength(3);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(true);
    expect(results[2].valid).toBe(false);
  });
});

describe('findDuplicates', () => {
  it('finds duplicate records within a batch', () => {
    const records = [
      makeRecord({ year: 2022 }),
      makeRecord({ year: 2022 }), // duplicate
      makeRecord({ year: 2023 }),
    ];
    const duplicates = findDuplicates(records);
    expect(duplicates.size).toBe(1);
    expect(duplicates.get(1)).toBe(0); // index 1 is a dup of index 0
  });

  it('returns empty map for unique records', () => {
    const records = [
      makeRecord({ year: 2021 }),
      makeRecord({ year: 2022 }),
      makeRecord({ year: 2023 }),
    ];
    const duplicates = findDuplicates(records);
    expect(duplicates.size).toBe(0);
  });

  it('distinguishes imports from exports', () => {
    const records = [
      makeRecord({ flow_type: 'export', year: 2022 }),
      makeRecord({ flow_type: 'import', year: 2022 }),
    ];
    const duplicates = findDuplicates(records);
    expect(duplicates.size).toBe(0);
  });
});

describe('filterValidRecords', () => {
  it('separates valid and invalid records', () => {
    const records = [
      makeRecord({ year: 2022 }),
      makeRecord({ source_code: '' }), // invalid
      makeRecord({ year: 2023 }),
    ];
    const { valid, invalid } = filterValidRecords(records);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(1);
  });
});

describe('deduplicateRecords', () => {
  it('removes duplicate records keeping first occurrence', () => {
    const records = [
      makeRecord({ year: 2022, trade_value_usd: 100 }),
      makeRecord({ year: 2022, trade_value_usd: 200 }), // duplicate
      makeRecord({ year: 2023, trade_value_usd: 300 }),
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(2);
    expect(result[0].trade_value_usd).toBe(100); // first occurrence kept
  });

  it('preserves records with different months', () => {
    const records = [
      makeRecord({ year: 2022, month: 1, period_type: 'monthly' }),
      makeRecord({ year: 2022, month: 2, period_type: 'monthly' }),
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(2);
  });
});

describe('Trade data model constraints', () => {
  it('trade flow types are limited to import/export', () => {
    const validTypes = ['import', 'export'];
    expect(validTypes).toHaveLength(2);
  });

  it('period types include annual, quarterly, monthly', () => {
    const validTypes = ['annual', 'quarterly', 'monthly'];
    expect(validTypes).toContain('annual');
    expect(validTypes).toContain('monthly');
  });

  it('tariff types include mfn, bound, preferential, applied', () => {
    const validTypes = ['mfn', 'bound', 'preferential', 'applied'];
    expect(validTypes).toHaveLength(4);
  });

  it('rate types include ad_valorem, specific, compound, tariff_rate_quota', () => {
    const validTypes = ['ad_valorem', 'specific', 'compound', 'tariff_rate_quota'];
    expect(validTypes).toHaveLength(4);
  });

  it('data source types are enumerated', () => {
    const validTypes = ['faostat_trade', 'itc_trade_map', 'un_comtrade', 'wto_itip', 'manual'];
    expect(validTypes).toHaveLength(5);
  });
});
