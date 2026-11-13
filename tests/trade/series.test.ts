import { describe, expect, it } from 'vitest';
import {
  areCompatible,
  compareSeries,
  convertAmount,
  convertSeriesKey,
  describeConversion,
  partitionBySeries,
  seriesKeyId,
  validateSeries,
  type SeriesKey,
} from '@/lib/trade/series';

/**
 * Comparable price series.
 *
 * Non-negotiable #5: never combine incompatible commodities, grades, units,
 * currencies or price types. Brief §7.1, §11 and §12 restate it. This is the
 * single place the rule lives, so these tests are the platform's guarantee.
 */

const base: SeriesKey = {
  commodityId: 1,
  marketId: 7,
  priceType: 'wholesale_transaction',
  gradeId: 3,
  unitId: 2,
  currencyCode: 'NGN',
  varietyId: null,
};

const key = (overrides: Partial<SeriesKey> = {}): SeriesKey => ({ ...base, ...overrides });

describe('compareSeries', () => {
  it('accepts an identical series', () => {
    expect(compareSeries(base, base).compatible).toBe(true);
    expect(compareSeries(base, base).reason).toBeNull();
  });

  it('rejects a different commodity', () => {
    const report = compareSeries(base, key({ commodityId: 2 }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('commodity');
    expect(report.reason).toBe('Different commodity.');
  });

  it('rejects a different market', () => {
    // Two markets are never silently comparable as a single price.
    const report = compareSeries(base, key({ marketId: 9 }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('market');
  });

  it('rejects a different price type', () => {
    const report = compareSeries(base, key({ priceType: 'farmgate' }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('priceType');
  });

  it('never treats an asking price as a transaction price', () => {
    // wholesale_asking and wholesale_transaction are distinct facts.
    const report = compareSeries(
      key({ priceType: 'wholesale_asking' }),
      key({ priceType: 'wholesale_transaction' }),
    );
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('priceType');
  });

  it('never treats export buy as export sell', () => {
    const report = compareSeries(key({ priceType: 'export_buy' }), key({ priceType: 'export_sell' }));
    expect(report.compatible).toBe(false);
  });

  it('never compares an indicative price with anything', () => {
    // The schema marks indicative as not comparable, including with itself.
    const report = compareSeries(key({ priceType: 'indicative' }), key({ priceType: 'indicative' }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('priceType');
  });

  it('never compares an unspecified price type with anything', () => {
    const report = compareSeries(key({ priceType: 'unspecified' }), key({ priceType: 'unspecified' }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('priceType');
  });

  it('never treats a missing grade as a known grade', () => {
    // "No grade recorded" is not "Grade 1". Assuming so would compare premium
    // against ordinary produce without saying so.
    const report = compareSeries(base, key({ gradeId: null }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('grade');
  });

  it('accepts two series that both record no grade', () => {
    expect(compareSeries(key({ gradeId: null }), key({ gradeId: null })).compatible).toBe(true);
  });

  it('rejects a different unit without a disclosed conversion', () => {
    const report = compareSeries(base, key({ unitId: 5 }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('unit');
  });

  it('rejects a different currency', () => {
    const report = compareSeries(base, key({ currencyCode: 'USD' }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('currency');
  });

  it('rejects a different variety', () => {
    const report = compareSeries(base, key({ varietyId: 4 }));
    expect(report.compatible).toBe(false);
    expect(report.differences).toContain('variety');
  });

  it('names every differing dimension', () => {
    const report = compareSeries(base, key({ commodityId: 2, gradeId: null, unitId: 9 }));
    expect(report.differences).toEqual(
      expect.arrayContaining(['commodity', 'grade', 'unit']),
    );
    expect(report.reason).toContain('commodity');
    expect(report.reason).toContain('grade');
    expect(report.reason).toContain('unit');
  });

  it('allows a cross-market aggregate as its own series', () => {
    // marketId null is an aggregate, which is a different series from any
    // single market — but it is a legitimate one.
    const aggregate = key({ marketId: null });
    expect(seriesKeyId(aggregate)).toContain('aggregate');
    expect(compareSeries(aggregate, aggregate).compatible).toBe(true);
  });
});

describe('areCompatible', () => {
  it('agrees with compareSeries', () => {
    expect(areCompatible(base, base)).toBe(true);
    expect(areCompatible(base, key({ unitId: 99 }))).toBe(false);
  });
});

describe('seriesKeyId', () => {
  it('is stable for the same key', () => {
    expect(seriesKeyId(base)).toBe(seriesKeyId(key()));
  });

  it('separates different keys', () => {
    expect(seriesKeyId(base)).not.toBe(seriesKeyId(key({ gradeId: 4 })));
  });

  it('distinguishes a missing grade from a recorded one', () => {
    expect(seriesKeyId(base)).not.toBe(seriesKeyId(key({ gradeId: null })));
  });
});

describe('validateSeries', () => {
  const item = (overrides: Partial<SeriesKey> = {}) => ({ seriesKey: key(overrides) });

  it('accepts an empty list', () => {
    expect(validateSeries([]).valid).toBe(true);
  });

  it('accepts a homogeneous list', () => {
    expect(validateSeries([item(), item(), item()]).valid).toBe(true);
  });

  it('refuses a list with one incompatible member', () => {
    const result = validateSeries([item(), item({ unitId: 9 }), item()]);
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].index).toBe(1);
    expect(result.violations[0].differences).toContain('unit');
  });

  it('reports every incompatible member, not just the first', () => {
    const result = validateSeries([item(), item({ unitId: 9 }), item({ gradeId: 4 })]);
    expect(result.violations).toHaveLength(2);
  });
});

describe('partitionBySeries', () => {
  it('groups by series key', () => {
    const { groups } = partitionBySeries([item(), item(), item({ unitId: 9 })]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  function item(overrides: Partial<SeriesKey> = {}) {
    return { seriesKey: key(overrides) };
  }
});

describe('unit conversion', () => {
  const verified = {
    fromUnitId: 2,
    toUnitId: 5,
    factor: 1000,
    verifiedBy: 'analyst-1',
    verifiedAt: '2026-01-15T00:00:00.000Z',
  };

  it('converts through a verified factor', () => {
    const result = convertSeriesKey(base, 5, [verified]);
    expect(result).not.toBeNull();
    expect(result?.key.unitId).toBe(5);
    expect(convertAmount(2, verified)).toBe(2000);
  });

  it('refuses to convert without a verified factor', () => {
    // Non-negotiable #10 and brief §11.3: never invent a conversion.
    expect(convertSeriesKey(base, 5, [])).toBeNull();
  });

  it('refuses to convert when the unit is unknown', () => {
    expect(convertSeriesKey(key({ unitId: null }), 5, [verified])).toBeNull();
  });

  it('returns null when the target is the source unit', () => {
    expect(convertSeriesKey(base, 2, [verified])).toBeNull();
  });

  it('allows a two-step conversion only when both legs are verified', () => {
    const leg1 = { fromUnitId: 2, toUnitId: 3, factor: 10, verifiedBy: null, verifiedAt: null };
    const leg2 = { fromUnitId: 3, toUnitId: 5, factor: 100, verifiedBy: null, verifiedAt: null };
    const result = convertSeriesKey(base, 5, [leg1, leg2]);
    expect(result?.conversion.factor).toBe(1000);
  });

  it('refuses a two-step conversion when one leg is missing', () => {
    const leg1 = { fromUnitId: 2, toUnitId: 3, factor: 10, verifiedBy: null, verifiedAt: null };
    expect(convertSeriesKey(base, 5, [leg1])).toBeNull();
  });

  it('discloses the conversion and its verification', () => {
    const text = describeConversion(verified);
    expect(text).toContain('1000');
    expect(text).toContain('verified');
  });
});
