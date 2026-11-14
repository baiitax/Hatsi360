import { describe, expect, it } from 'vitest';
import type {
  EvidenceSource,
  EvidenceSourceType,
  AccessMethod,
  CommodityProduction,
  CommoditySupply,
  CommodityDemand,
  CommodityTrade,
  TradeFlowType,
  VerificationStatus,
  IngestionResult,
  ProductionQuery,
  TradeQuery,
  CommodityIntelligenceSummary,
} from '@/lib/intelligence/types';

/**
 * Intelligence Types — Validation Tests
 *
 * These tests ensure the type system correctly enforces the data model
 * constraints for commodity intelligence. While TypeScript types are
 * compile-time only, these tests verify that the runtime shapes we
 * construct match what the types expect.
 *
 * This is critical for Phase 06: evidence provenance must be enforced
 * at every layer, including the type system.
 */

describe('EvidenceSourceType', () => {
  it('accepts valid source types', () => {
    const validTypes: EvidenceSourceType[] = [
      'government',
      'international_org',
      'academic',
      'industry',
      'media',
      'other',
    ];
    expect(validTypes.length).toBe(6);
  });
});

describe('AccessMethod', () => {
  it('accepts valid access methods', () => {
    const validMethods: AccessMethod[] = [
      'api',
      'web_scrape',
      'manual_download',
      'file_upload',
      'manual',
    ];
    expect(validMethods.length).toBe(5);
  });
});

describe('VerificationStatus', () => {
  it('accepts valid verification statuses', () => {
    const validStatuses: VerificationStatus[] = [
      'imported',
      'verified',
      'questionable',
      'deprecated',
    ];
    expect(validStatuses.length).toBe(4);
  });
});

describe('TradeFlowType', () => {
  it('accepts export and import', () => {
    const validFlows: TradeFlowType[] = ['export', 'import'];
    expect(validFlows.length).toBe(2);
  });
});

describe('IngestionResult', () => {
  it('has the required fields', () => {
    const result: IngestionResult = {
      records_fetched: 100,
      records_inserted: 95,
      records_updated: 3,
      records_skipped: 2,
      errors: [],
    };

    expect(result.records_fetched).toBe(100);
    expect(result.records_inserted + result.records_updated + result.records_skipped).toBe(100);
    expect(result.errors).toEqual([]);
  });

  it('tracks errors', () => {
    const result: IngestionResult = {
      records_fetched: 100,
      records_inserted: 90,
      records_updated: 0,
      records_skipped: 10,
      errors: ['Error 1', 'Error 2'],
    };

    expect(result.errors.length).toBe(2);
    expect(result.records_skipped).toBeGreaterThan(0);
  });
});

describe('ProductionQuery', () => {
  it('accepts commodity_id filter', () => {
    const query: ProductionQuery = {
      commodity_id: 1,
      country_code: 'NGA',
      year: 2023,
    };
    expect(query.commodity_id).toBe(1);
  });

  it('accepts year range filter', () => {
    const query: ProductionQuery = {
      commodity_slug: 'rice',
      year_from: 2020,
      year_to: 2023,
      verified_only: true,
    };
    expect(query.year_from).toBe(2020);
    expect(query.year_to).toBe(2023);
    expect(query.verified_only).toBe(true);
  });
});

describe('TradeQuery', () => {
  it('accepts flow_type filter', () => {
    const query: TradeQuery = {
      commodity_slug: 'rice',
      flow_type: 'export',
      reporter_country: 'NGA',
    };
    expect(query.flow_type).toBe('export');
  });

  it('accepts partner_country filter', () => {
    const query: TradeQuery = {
      commodity_id: 5,
      flow_type: 'import',
      reporter_country: 'NGA',
      partner_country: 'USA',
    };
    expect(query.partner_country).toBe('USA');
  });
});

describe('CommodityIntelligenceSummary', () => {
  it('has the required fields', () => {
    const summary: CommodityIntelligenceSummary = {
      commodity_id: 1,
      commodity_name: 'Rice',
      commodity_slug: 'rice',
      country_code: 'NGA',
      latest_year: 2023,
      evidence_count: 150,
      latest_source: 'FAOSTAT',
      last_updated: '2024-01-15T10:00:00Z',
    };

    expect(summary.commodity_id).toBe(1);
    expect(summary.evidence_count).toBe(150);
    expect(summary.latest_source).toBe('FAOSTAT');
  });

  it('allows optional production data', () => {
    const summary: CommodityIntelligenceSummary = {
      commodity_id: 1,
      commodity_name: 'Rice',
      commodity_slug: 'rice',
      country_code: 'NGA',
      latest_year: 2023,
      production: {
        quantity_mt: 5000000,
        yield_mt_per_ha: 2.5,
        harvested_area_ha: 2000000,
        trend: 'increasing',
      },
      evidence_count: 150,
      latest_source: 'FAOSTAT',
      last_updated: '2024-01-15T10:00:00Z',
    };

    expect(summary.production).toBeDefined();
    expect(summary.production?.quantity_mt).toBe(5000000);
    expect(summary.production?.trend).toBe('increasing');
  });

  it('allows optional supply_demand data', () => {
    const summary: CommodityIntelligenceSummary = {
      commodity_id: 1,
      commodity_name: 'Rice',
      commodity_slug: 'rice',
      country_code: 'NGA',
      latest_year: 2023,
      supply_demand: {
        total_supply_mt: 6000000,
        total_demand_mt: 5500000,
        ending_stocks_mt: 500000,
        stock_to_use_ratio: 9.09,
      },
      evidence_count: 150,
      latest_source: 'FAOSTAT',
      last_updated: '2024-01-15T10:00:00Z',
    };

    expect(summary.supply_demand).toBeDefined();
    expect(summary.supply_demand?.stock_to_use_ratio).toBeCloseTo(9.09);
  });

  it('allows optional trade data', () => {
    const summary: CommodityIntelligenceSummary = {
      commodity_id: 1,
      commodity_name: 'Rice',
      commodity_slug: 'rice',
      country_code: 'NGA',
      latest_year: 2023,
      trade: {
        exports_mt: 100000,
        imports_mt: 2000000,
        net_trade_mt: -1900000,
        top_export_partners: [],
        top_import_partners: [
          { country: 'IND', quantity_mt: 1500000 },
          { country: 'VNM', quantity_mt: 500000 },
        ],
      },
      evidence_count: 150,
      latest_source: 'FAOSTAT',
      last_updated: '2024-01-15T10:00:00Z',
    };

    expect(summary.trade).toBeDefined();
    expect(summary.trade?.net_trade_mt).toBe(-1900000);
    expect(summary.trade?.top_import_partners.length).toBe(2);
  });
});
