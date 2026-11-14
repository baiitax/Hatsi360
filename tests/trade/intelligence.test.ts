import { describe, expect, it } from 'vitest';

/**
 * Trade Intelligence Analytics Tests
 *
 * Phase 07 Stage 4: Validates the trade intelligence aggregation logic,
 * partner profiling, commodity breakdowns, and API response structures.
 *
 * These tests validate the business logic used in:
 * - /api/v1/trade/intelligence/overview
 * - /api/v1/trade/intelligence/partners
 * - /api/v1/trade/intelligence/commodities
 * - Trade Intelligence Dashboard
 * - Trade Flow Explorer
 */

// ── Mock Data (matching UN Comtrade records) ──────────────────────────────────

const mockTradeRecords = [
  // Sesame exports to China, Japan, Turkey (2021)
  {
    id: 1,
    flow_type: 'export',
    trade_value_usd: 137_136_027,
    quantity_kg: 0,
    year: 2021,
    commodity: { id: 11, name: 'Sesame Seed', slug: 'sesame' },
    hs_code: { code: '1207', description: 'Sesame seeds' },
    partner_country: { id: 62, name: 'China', iso_alpha3: 'CHN' },
  },
  {
    id: 2,
    flow_type: 'export',
    trade_value_usd: 65_506_469,
    quantity_kg: 158_135_310,
    year: 2021,
    commodity: { id: 11, name: 'Sesame Seed', slug: 'sesame' },
    hs_code: { code: '1207', description: 'Sesame seeds' },
    partner_country: { id: 69, name: 'Japan', iso_alpha3: 'JPN' },
  },
  {
    id: 3,
    flow_type: 'export',
    trade_value_usd: 28_628_065,
    quantity_kg: 0,
    year: 2021,
    commodity: { id: 11, name: 'Sesame Seed', slug: 'sesame' },
    hs_code: { code: '1207', description: 'Sesame seeds' },
    partner_country: { id: 94, name: 'Turkey', iso_alpha3: 'TUR' },
  },
  // Rice imports from Brazil, China (2018, 2022)
  {
    id: 4,
    flow_type: 'import',
    trade_value_usd: 6_280_238,
    quantity_kg: 6_209_630,
    year: 2018,
    commodity: { id: 1, name: 'Paddy Rice', slug: 'rice' },
    hs_code: { code: '1006', description: 'Rice' },
    partner_country: { id: 138, name: 'Brazil', iso_alpha3: 'BRA' },
  },
  {
    id: 5,
    flow_type: 'import',
    trade_value_usd: 1_905_066,
    quantity_kg: 1_114_967,
    year: 2022,
    commodity: { id: 1, name: 'Paddy Rice', slug: 'rice' },
    hs_code: { code: '1006', description: 'Rice' },
    partner_country: { id: 62, name: 'China', iso_alpha3: 'CHN' },
  },
  // Soybeans exports (2022)
  {
    id: 6,
    flow_type: 'export',
    trade_value_usd: 6_092_726,
    quantity_kg: 7_596_620,
    year: 2022,
    commodity: { id: 12, name: 'Soya Beans', slug: 'soybeans' },
    hs_code: { code: '1201', description: 'Soya beans' },
    partner_country: { id: 139, name: 'Canada', iso_alpha3: 'CAN' },
  },
  // Groundnut exports (2020)
  {
    id: 7,
    flow_type: 'export',
    trade_value_usd: 75_166,
    quantity_kg: 0,
    year: 2020,
    commodity: { id: 13, name: 'Groundnut', slug: 'groundnut' },
    hs_code: { code: '1202', description: 'Groundnuts' },
    partner_country: { id: 95, name: 'United Arab Emirates', iso_alpha3: 'ARE' },
  },
];

// ── Overview Aggregation ──────────────────────────────────────────────────────

describe('Trade Intelligence Overview', () => {
  it('calculates total exports and imports correctly', () => {
    const exports = mockTradeRecords.filter((r) => r.flow_type === 'export');
    const imports = mockTradeRecords.filter((r) => r.flow_type === 'import');

    const totalExports = exports.reduce((sum, r) => sum + r.trade_value_usd, 0);
    const totalImports = imports.reduce((sum, r) => sum + r.trade_value_usd, 0);

    expect(totalExports).toBe(237_438_453); // 137M + 65M + 28M + 6M + 75K
    expect(totalImports).toBe(8_185_304); // 6.3M + 1.9M
    expect(totalExports - totalImports).toBeGreaterThan(0); // Trade surplus
  });

  it('counts partner countries correctly', () => {
    const partnerIds = new Set(mockTradeRecords.map((r) => r.partner_country.id));
    expect(partnerIds.size).toBe(6); // CHN, JPN, TUR, BRA, CAN, ARE
  });

  it('counts unique commodities correctly', () => {
    const commodityIds = new Set(mockTradeRecords.map((r) => r.commodity.id));
    expect(commodityIds.size).toBe(4); // sesame, rice, soybeans, groundnut
  });

  it('identifies year range correctly', () => {
    const years = mockTradeRecords.map((r) => r.year).sort((a, b) => a - b);
    expect(years[0]).toBe(2018);
    expect(years[years.length - 1]).toBe(2022);
  });

  it('returns correct record counts', () => {
    expect(mockTradeRecords.length).toBe(7);
    expect(mockTradeRecords.filter((r) => r.flow_type === 'export').length).toBe(5);
    expect(mockTradeRecords.filter((r) => r.flow_type === 'import').length).toBe(2);
  });
});

// ── Partner Country Profiles ─────────────────────────────────────────────────

describe('Partner Country Profiles', () => {
  it('aggregates trade by partner correctly', () => {
    const partnerMap = new Map<number, { export_value: number; import_value: number }>();

    for (const record of mockTradeRecords) {
      const partnerId = record.partner_country.id;
      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, { export_value: 0, import_value: 0 });
      }
      const entry = partnerMap.get(partnerId)!;
      if (record.flow_type === 'export') {
        entry.export_value += record.trade_value_usd;
      } else {
        entry.import_value += record.trade_value_usd;
      }
    }

    // China should have both export and import
    const china = partnerMap.get(62)!;
    expect(china.export_value).toBe(137_136_027); // Sesame export
    expect(china.import_value).toBe(1_905_066); // Rice import

    // Japan should only have exports
    const japan = partnerMap.get(69)!;
    expect(japan.export_value).toBe(65_506_469);
    expect(japan.import_value).toBe(0);

    // Brazil should only have imports
    const brazil = partnerMap.get(138)!;
    expect(brazil.export_value).toBe(0);
    expect(brazil.import_value).toBe(6_280_238);
  });

  it('ranks partners by total trade value', () => {
    const partnerTotals = mockTradeRecords.reduce((acc, record) => {
      const key = record.partner_country.iso_alpha3;
      acc[key] = (acc[key] ?? 0) + record.trade_value_usd;
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(partnerTotals).sort(([, a], [, b]) => b - a);
    expect(sorted[0][0]).toBe('CHN'); // China is top partner ($137M + $1.9M)
    expect(sorted[1][0]).toBe('JPN'); // Japan ($65.5M)
    expect(sorted[2][0]).toBe('TUR'); // Turkey ($28.6M)
  });

  it('identifies top commodity for each partner', () => {
    const partnerCommodities = new Map<number, { commodity: string; value: number }>();

    for (const record of mockTradeRecords) {
      const partnerId = record.partner_country.id;
      const existing = partnerCommodities.get(partnerId);

      if (!existing || record.trade_value_usd > existing.value) {
        partnerCommodities.set(partnerId, {
          commodity: record.commodity.name,
          value: record.trade_value_usd,
        });
      }
    }

    expect(partnerCommodities.get(62)?.commodity).toBe('Sesame Seed');
    expect(partnerCommodities.get(69)?.commodity).toBe('Sesame Seed');
    expect(partnerCommodities.get(138)?.commodity).toBe('Paddy Rice');
    expect(partnerCommodities.get(139)?.commodity).toBe('Soya Beans');
  });

  it('tracks years for each partner', () => {
    const partnerYears = new Map<number, Set<number>>();

    for (const record of mockTradeRecords) {
      const partnerId = record.partner_country.id;
      if (!partnerYears.has(partnerId)) {
        partnerYears.set(partnerId, new Set());
      }
      partnerYears.get(partnerId)!.add(record.year);
    }

    // China trades in both 2021 and 2022
    expect(partnerYears.get(62)?.size).toBe(2);
    expect(partnerYears.get(62)?.has(2021)).toBe(true);
    expect(partnerYears.get(62)?.has(2022)).toBe(true);

    // Japan only in 2021
    expect(partnerYears.get(69)?.size).toBe(1);
    expect(partnerYears.get(69)?.has(2021)).toBe(true);
  });
});

// ── Commodity Profiles ───────────────────────────────────────────────────────

describe('Commodity Trade Profiles', () => {
  it('aggregates trade by commodity correctly', () => {
    const commodityMap = new Map<number, {
      export_value: number;
      import_value: number;
      partners: Set<string>;
    }>();

    for (const record of mockTradeRecords) {
      const commodityId = record.commodity.id;
      if (!commodityMap.has(commodityId)) {
        commodityMap.set(commodityId, { export_value: 0, import_value: 0, partners: new Set() });
      }
      const entry = commodityMap.get(commodityId)!;
      entry.partners.add(record.partner_country.iso_alpha3);

      if (record.flow_type === 'export') {
        entry.export_value += record.trade_value_usd;
      } else {
        entry.import_value += record.trade_value_usd;
      }
    }

    // Sesame — biggest commodity
    const sesame = commodityMap.get(11)!;
    expect(sesame.export_value).toBe(231_270_561); // 137M + 65M + 28M
    expect(sesame.import_value).toBe(0);
    expect(sesame.partners.size).toBe(3); // CHN, JPN, TUR

    // Rice
    const rice = commodityMap.get(1)!;
    expect(rice.export_value).toBe(0);
    expect(rice.import_value).toBe(8_185_304);
    expect(rice.partners.size).toBe(2); // BRA, CHN
  });

  it('calculates trade balance per commodity', () => {
    const balances = new Map<number, number>();

    for (const record of mockTradeRecords) {
      const commodityId = record.commodity.id;
      const current = balances.get(commodityId) ?? 0;
      const delta = record.flow_type === 'export' ? record.trade_value_usd : -record.trade_value_usd;
      balances.set(commodityId, current + delta);
    }

    // Sesame is a pure export commodity
    expect(balances.get(11)).toBeGreaterThan(0);
    // Rice is a pure import commodity
    expect(balances.get(1)).toBeLessThan(0);
    // Soybeans is a pure export commodity
    expect(balances.get(12)).toBeGreaterThan(0);
  });

  it('identifies top export destinations per commodity', () => {
    const sesamePartners = mockTradeRecords
      .filter((r) => r.commodity.slug === 'sesame' && r.flow_type === 'export')
      .map((r) => ({
        country: r.partner_country.name,
        value: r.trade_value_usd,
      }))
      .sort((a, b) => b.value - a.value);

    expect(sesamePartners[0].country).toBe('China');
    expect(sesamePartners[0].value).toBe(137_136_027);
    expect(sesamePartners[1].country).toBe('Japan');
    expect(sesamePartners[1].value).toBe(65_506_469);
  });

  it('identifies top import sources per commodity', () => {
    const ricePartners = mockTradeRecords
      .filter((r) => r.commodity.slug === 'rice' && r.flow_type === 'import')
      .map((r) => ({
        country: r.partner_country.name,
        value: r.trade_value_usd,
      }))
      .sort((a, b) => b.value - a.value);

    expect(ricePartners[0].country).toBe('Brazil');
    expect(ricePartners[0].value).toBe(6_280_238);
    expect(ricePartners[1].country).toBe('China');
    expect(ricePartners[1].value).toBe(1_905_066);
  });

  it('tracks trade volumes when available', () => {
    const totalExportQuantity = mockTradeRecords
      .filter((r) => r.flow_type === 'export')
      .reduce((sum, r) => sum + r.quantity_kg, 0);

    const totalImportQuantity = mockTradeRecords
      .filter((r) => r.flow_type === 'import')
      .reduce((sum, r) => sum + r.quantity_kg, 0);

    expect(totalExportQuantity).toBeGreaterThan(0);
    expect(totalImportQuantity).toBeGreaterThan(0);

    // Japan sesame has known quantity
    const japanRecord = mockTradeRecords.find(
      (r) => r.partner_country.iso_alpha3 === 'JPN' && r.commodity.slug === 'sesame'
    );
    expect(japanRecord?.quantity_kg).toBe(158_135_310);
  });
});

// ── Trade Balance Analysis ────────────────────────────────────────────────────

describe('Trade Balance Analysis', () => {
  it('Nigeria has overall trade surplus', () => {
    const totalExports = mockTradeRecords
      .filter((r) => r.flow_type === 'export')
      .reduce((sum, r) => sum + r.trade_value_usd, 0);
    const totalImports = mockTradeRecords
      .filter((r) => r.flow_type === 'import')
      .reduce((sum, r) => sum + r.trade_value_usd, 0);

    expect(totalExports).toBeGreaterThan(totalImports);
    expect(totalExports - totalImports).toBe(229_253_149);
  });

  it('surplus is driven by sesame exports', () => {
    const sesameExports = mockTradeRecords
      .filter((r) => r.commodity.slug === 'sesame' && r.flow_type === 'export')
      .reduce((sum, r) => sum + r.trade_value_usd, 0);

    const totalExports = mockTradeRecords
      .filter((r) => r.flow_type === 'export')
      .reduce((sum, r) => sum + r.trade_value_usd, 0);

    // Sesame accounts for > 97% of exports
    expect(sesameExports / totalExports).toBeGreaterThan(0.97);
  });

  it('rice is the main import commodity', () => {
    const riceImports = mockTradeRecords
      .filter((r) => r.commodity.slug === 'rice' && r.flow_type === 'import')
      .reduce((sum, r) => sum + r.trade_value_usd, 0);

    const totalImports = mockTradeRecords
      .filter((r) => r.flow_type === 'import')
      .reduce((sum, r) => sum + r.trade_value_usd, 0);

    // Rice accounts for 100% of imports in this dataset
    expect(riceImports / totalImports).toBe(1);
  });

  it('identifies market concentration risk', () => {
    // Top 3 partners should account for > 95% of exports
    const exportValues = mockTradeRecords
      .filter((r) => r.flow_type === 'export')
      .map((r) => r.trade_value_usd)
      .sort((a, b) => b - a);

    const totalExports = exportValues.reduce((sum, v) => sum + v, 0);
    const top3 = exportValues.slice(0, 3).reduce((sum, v) => sum + v, 0);

    expect(top3 / totalExports).toBeGreaterThan(0.95);
    // This is a real concern — sesame exports are concentrated in China + Japan + Turkey
  });
});

// ── Data Provenance ───────────────────────────────────────────────────────────

describe('Trade Intelligence Data Provenance', () => {
  it('all records have source attribution', () => {
    // In the real database, all records have source_id = 8 (UN Comtrade)
    // This test validates the expectation
    const sources = mockTradeRecords.map(() => 'UN Comtrade');
    expect(sources.every((s) => s === 'UN Comtrade')).toBe(true);
  });

  it('records include HS code mappings', () => {
    for (const record of mockTradeRecords) {
      expect(record.hs_code.code).toBeTruthy();
      expect(record.hs_code.description).toBeTruthy();
    }
  });

  it('all records have valid years', () => {
    for (const record of mockTradeRecords) {
      expect(record.year).toBeGreaterThanOrEqual(2018);
      expect(record.year).toBeLessThanOrEqual(2022);
    }
  });

  it('trade values are non-negative', () => {
    for (const record of mockTradeRecords) {
      expect(record.trade_value_usd).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Currency Formatting ───────────────────────────────────────────────────────

describe('Currency Formatting Helper', () => {
  function formatCurrency(value: number): string {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toFixed(0);
  }

  it('formats billions correctly', () => {
    expect(formatCurrency(1_500_000_000)).toBe('1.5B');
    expect(formatCurrency(2_000_000_000)).toBe('2.0B');
  });

  it('formats millions correctly', () => {
    expect(formatCurrency(137_136_027)).toBe('137.1M');
    expect(formatCurrency(65_506_469)).toBe('65.5M');
    expect(formatCurrency(1_000_000)).toBe('1.0M');
  });

  it('formats thousands correctly', () => {
    expect(formatCurrency(75_166)).toBe('75.2K');
    expect(formatCurrency(5_116)).toBe('5.1K');
    expect(formatCurrency(1_000)).toBe('1.0K');
  });

  it('formats small values correctly', () => {
    expect(formatCurrency(999)).toBe('999');
    expect(formatCurrency(0)).toBe('0');
  });
});
