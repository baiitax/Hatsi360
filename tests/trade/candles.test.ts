import { describe, expect, it } from 'vitest';
import {
  buildCandles,
  describeSeries,
  nextPeriodStart,
  periodStart,
  timeframeReadiness,
  SUPPORTED_TIMEFRAMES,
  UNSUPPORTED_TIMEFRAMES,
  type ObservationInput,
} from '@/lib/trade/candles';
import type { SeriesKey } from '@/lib/trade/series';

/**
 * Candlestick aggregation.
 *
 * The four non-negotiables this file enforces:
 *
 *   #3  Do not fabricate candlestick data.
 *   #4  Do not generate 15-minute candles from daily observations.
 *   #6  Do not label observation counts as exchange trading volume.
 *   §7.6 Preserve actual observation dates; gaps must remain visible.
 */

const KEY: SeriesKey = {
  commodityId: 1,
  marketId: 7,
  priceType: 'wholesale_transaction',
  gradeId: 3,
  unitId: 2,
  currencyCode: 'NGN',
  varietyId: null,
};

let counter = 0;
const observation = (
  collectedAt: string,
  amount: number,
  overrides: Partial<ObservationInput> = {},
): ObservationInput => {
  counter += 1;
  return {
    id: `obs-${counter}`,
    collectedAt,
    amount,
    marketId: 7,
    sourceSystem: 'agent_app',
    seriesKey: KEY,
    ...overrides,
  };
};

const at = (iso: string) => new Date(iso);

describe('period maths', () => {
  it('starts a daily period at UTC midnight', () => {
    expect(periodStart(at('2026-07-14T18:45:00Z'), 'daily').toISOString()).toBe(
      '2026-07-14T00:00:00.000Z',
    );
  });

  it('starts a weekly period on Monday', () => {
    // 2026-07-14 is a Tuesday, so the week starts Monday the 13th.
    expect(periodStart(at('2026-07-14T18:45:00Z'), 'weekly').toISOString()).toBe(
      '2026-07-13T00:00:00.000Z',
    );
  });

  it('starts a weekly period on Monday for a Sunday', () => {
    // ISO weeks put Sunday at the end, so 2026-07-19 belongs to the week
    // beginning Monday the 13th.
    expect(periodStart(at('2026-07-19T06:00:00Z'), 'weekly').toISOString()).toBe(
      '2026-07-13T00:00:00.000Z',
    );
  });

  it('starts a monthly period on the first', () => {
    expect(periodStart(at('2026-07-14T18:45:00Z'), 'monthly').toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    );
  });

  it('starts a quarterly period on the quarter boundary', () => {
    expect(periodStart(at('2026-08-14T18:45:00Z'), 'quarterly').toISOString()).toBe(
      '2026-07-01T00:00:00.000Z',
    );
    expect(periodStart(at('2026-02-14T18:45:00Z'), 'quarterly').toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('advances a period correctly', () => {
    expect(nextPeriodStart(at('2026-07-14T00:00:00Z'), 'daily').toISOString()).toBe(
      '2026-07-15T00:00:00.000Z',
    );
    expect(nextPeriodStart(at('2026-07-14T00:00:00Z'), 'weekly').toISOString()).toBe(
      '2026-07-20T00:00:00.000Z',
    );
    expect(nextPeriodStart(at('2026-07-14T00:00:00Z'), 'monthly').toISOString()).toBe(
      '2026-08-01T00:00:00.000Z',
    );
    expect(nextPeriodStart(at('2026-07-14T00:00:00Z'), 'quarterly').toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });

  it('crosses a year boundary', () => {
    expect(nextPeriodStart(at('2026-12-14T00:00:00Z'), 'monthly').toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});

describe('buildCandles', () => {
  it('returns an empty series for no observations', () => {
    const result = buildCandles([], 'daily');
    expect(result.ok).toBe(true);
    expect(result.series?.candles).toHaveLength(0);
    expect(result.series?.totalObservations).toBe(0);
  });

  it('refuses to build an incomparable series', () => {
    // Non-negotiable #5. Aggregating incompatible prices produces a number
    // that looks like a price and is not one.
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000),
        observation('2026-07-01T10:00:00Z', 41000, {
          seriesKey: { ...KEY, unitId: 9 },
        }),
      ],
      'daily',
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not comparable');
    expect(result.violations?.[0].differences).toContain('unit');
  });

  it('calculates open from the first and close from the last observation', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000),
        observation('2026-07-01T11:00:00Z', 42000),
        observation('2026-07-01T15:00:00Z', 40500),
      ],
      'daily',
    );
    const candle = result.series!.candles[0];
    expect(candle.open).toBe(40000);
    expect(candle.close).toBe(40500);
    expect(candle.high).toBe(42000);
    expect(candle.low).toBe(40000);
  });

  it('sorts by observation time, not by input order', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T15:00:00Z', 40500),
        observation('2026-07-01T09:00:00Z', 40000),
      ],
      'daily',
    );
    const candle = result.series!.candles[0];
    expect(candle.open).toBe(40000);
    expect(candle.close).toBe(40500);
  });

  it('breaks the close tie deterministically', () => {
    // Two observations in the same minute: the order must not depend on the
    // order the database happened to return rows in.
    const a = observation('2026-07-01T09:00:00Z', 40000);
    const b = observation('2026-07-01T09:00:00Z', 41000);
    const forward = buildCandles([a, b], 'daily').series!.candles[0];
    const backward = buildCandles([b, a], 'daily').series!.candles[0];
    expect(forward.close).toBe(backward.close);
  });

  it('flags a single-observation candle as degenerate', () => {
    // A one-observation day is a data point, not a price range. The interface
    // must say so.
    const result = buildCandles([observation('2026-07-01T09:00:00Z', 41550)], 'daily');
    const candle = result.series!.candles[0];
    expect(candle.isDegenerate).toBe(true);
    expect(candle.isCalculated).toBe(false);
    expect(candle.open).toBe(candle.high);
    expect(candle.high).toBe(candle.low);
    expect(candle.low).toBe(candle.close);
    expect(result.series!.hasDegenerateCandles).toBe(true);
  });

  it('flags a multi-observation candle as calculated', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000),
        observation('2026-07-01T10:00:00Z', 41000),
      ],
      'daily',
    );
    expect(result.series!.candles[0].isCalculated).toBe(true);
    expect(result.series!.candles[0].isDegenerate).toBe(false);
  });

  it('counts observations, and never calls them volume', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000),
        observation('2026-07-01T10:00:00Z', 41000),
        observation('2026-07-01T11:00:00Z', 40500),
      ],
      'daily',
    );
    const candle = result.series!.candles[0];
    expect(candle.observationCount).toBe(3);
    // The field is named observationCount. There is no volume field at all.
    expect(Object.keys(candle)).not.toContain('volume');
    expect(Object.keys(candle)).not.toContain('tradeVolume');
  });

  it('counts the markets that contributed', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000),
        observation('2026-07-01T10:00:00Z', 41000, { marketId: 9 }),
      ],
      'daily',
    );
    expect(result.series!.candles[0].marketCount).toBe(2);
    expect(result.series!.marketCoverage).toBe(2);
  });

  it('keeps a gap visible instead of filling it', () => {
    // Non-negotiable #3 and brief §7.6. The legacy data has a two-year hole;
    // it must show as a hole.
    const result = buildCandles(
      [
        observation('2023-07-20T09:00:00Z', 40450),
        observation('2023-07-21T09:00:00Z', 41550),
        observation('2025-07-01T09:00:00Z', 41000),
      ],
      'daily',
    );
    expect(result.series!.candles).toHaveLength(3);
    // Every missing day between 2023-07-22 and 2025-06-30 is reported.
    expect(result.series!.gaps.length).toBeGreaterThan(700);
    expect(result.series!.gaps[0].periodStart).toBe('2023-07-22T00:00:00.000Z');
  });

  it('labels a run of missing periods', () => {
    const result = buildCandles(
      [
        observation('2026-01-01T09:00:00Z', 40000),
        observation('2026-04-01T09:00:00Z', 41000),
      ],
      'monthly',
    );
    const gaps = result.series!.gaps;
    expect(gaps).toHaveLength(2); // February and March
    expect(gaps[0].consecutiveMissing).toBe(2);
    expect(gaps[1].consecutiveMissing).toBe(2);
  });

  it('reports no gaps when the series is continuous', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000),
        observation('2026-07-02T09:00:00Z', 41000),
        observation('2026-07-03T09:00:00Z', 40500),
      ],
      'daily',
    );
    expect(result.series!.gaps).toHaveLength(0);
  });

  it('drops an unparseable timestamp rather than guessing it', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000),
        { ...observation('2026-07-02T09:00:00Z', 41000), collectedAt: 'garbage' },
      ],
      'daily',
    );
    expect(result.series!.totalObservations).toBe(1);
  });

  it('records that legacy data is present', () => {
    const result = buildCandles(
      [observation('2026-07-01T09:00:00Z', 40000, { sourceSystem: 'legacy_import' })],
      'daily',
    );
    expect(result.series!.includesLegacyData).toBe(true);
  });

  it('records the contributing source systems', () => {
    const result = buildCandles(
      [
        observation('2026-07-01T09:00:00Z', 40000, { sourceSystem: 'agent_app' }),
        observation('2026-07-01T10:00:00Z', 41000, { sourceSystem: 'manual_entry' }),
      ],
      'daily',
    );
    expect(result.series!.sourceCoverage).toBe(2);
  });

  it('aggregates a weekly candle from several days', () => {
    const result = buildCandles(
      [
        observation('2026-07-13T09:00:00Z', 40000),
        observation('2026-07-15T09:00:00Z', 42000),
        observation('2026-07-17T09:00:00Z', 40500),
      ],
      'weekly',
    );
    expect(result.series!.candles).toHaveLength(1);
    const candle = result.series!.candles[0];
    expect(candle.open).toBe(40000);
    expect(candle.close).toBe(40500);
    expect(candle.high).toBe(42000);
    expect(candle.low).toBe(40000);
    expect(candle.observationCount).toBe(3);
  });

  it('exposes the observation ids behind a candle for drill-down', () => {
    const a = observation('2026-07-01T09:00:00Z', 40000);
    const b = observation('2026-07-01T10:00:00Z', 41000);
    const result = buildCandles([a, b], 'daily');
    expect(result.series!.candles[0].observationIds).toEqual([a.id, b.id]);
  });
});

describe('the timeframe catalogue', () => {
  it('offers no intraday timeframe', () => {
    // Non-negotiable #4 and brief §7.2. There is no sub-daily collection, so
    // no intraday control may exist.
    const codes = Object.keys(SUPPORTED_TIMEFRAMES);
    for (const forbidden of ['15m', '30m', '1h', '4h', 'hourly', 'intraday']) {
      expect(codes).not.toContain(forbidden);
    }
  });

  it('records why intraday is unavailable, so the reason travels with the code', () => {
    const codes = UNSUPPORTED_TIMEFRAMES.map((t) => t.code);
    expect(codes).toEqual(expect.arrayContaining(['15m', '30m', '1h', '4h']));
    for (const timeframe of UNSUPPORTED_TIMEFRAMES) {
      expect(timeframe.reason).toContain('sub-daily');
    }
  });

  it('offers daily, weekly, monthly and quarterly', () => {
    expect(Object.keys(SUPPORTED_TIMEFRAMES).sort()).toEqual([
      'daily',
      'monthly',
      'quarterly',
      'weekly',
    ]);
  });
});

describe('timeframeReadiness', () => {
  const series = (candleCount: number) =>
    buildCandles(
      Array.from({ length: candleCount }, (_, i) =>
        observation(`2026-07-${String(i + 1).padStart(2, '0')}T09:00:00Z`, 40000 + i),
      ),
      'daily',
    ).series!;

  it('refuses a timeframe with too little history', () => {
    const readiness = timeframeReadiness(series(1), 'daily');
    expect(readiness.ready).toBe(false);
    expect(readiness.reason).toContain('At least 2');
  });

  it('accepts a timeframe with enough history', () => {
    expect(timeframeReadiness(series(5), 'daily').ready).toBe(true);
  });

  it('requires four quarters before offering a quarterly view', () => {
    const quarterly = buildCandles(
      [
        observation('2026-01-05T09:00:00Z', 40000),
        observation('2026-04-05T09:00:00Z', 41000),
      ],
      'quarterly',
    ).series!;
    const readiness = timeframeReadiness(quarterly, 'quarterly');
    expect(readiness.ready).toBe(false);
    expect(readiness.reason).toContain('4');
  });

  it('handles no series at all', () => {
    expect(timeframeReadiness(null, 'daily').ready).toBe(false);
  });
});

describe('describeSeries', () => {
  const result = buildCandles(
    [
      observation('2026-07-01T09:00:00Z', 40000),
      observation('2026-07-01T10:00:00Z', 41000, { sourceSystem: 'legacy_import' }),
      observation('2026-07-05T09:00:00Z', 40500),
    ],
    'daily',
  );

  it('states the observation count', () => {
    const provenance = describeSeries(result.series!, {
      commodityName: 'Paddy Rice',
      marketName: 'Dawanau',
      priceTypeLabel: 'Wholesale transaction',
      gradeName: 'Grade 1',
      unitName: '50 kg bag',
      currencyCode: 'NGN',
      verifiedOnly: true,
    });
    expect(provenance.disclosures.join(' ')).toContain('3 observations');
  });

  it('states the price type, grade, unit and currency', () => {
    const provenance = describeSeries(result.series!, {
      commodityName: 'Paddy Rice',
      marketName: 'Dawanau',
      priceTypeLabel: 'Wholesale transaction',
      gradeName: 'Grade 1',
      unitName: '50 kg bag',
      currencyCode: 'NGN',
      verifiedOnly: true,
    });
    const text = provenance.disclosures.join(' ');
    expect(text).toContain('Wholesale transaction');
    expect(text).toContain('Grade 1');
    expect(text).toContain('50 kg bag');
    expect(text).toContain('NGN');
  });

  it('discloses the gap rather than hiding it', () => {
    const provenance = describeSeries(result.series!, {
      commodityName: 'Paddy Rice',
      marketName: 'Dawanau',
      priceTypeLabel: 'Wholesale transaction',
      gradeName: 'Grade 1',
      unitName: '50 kg bag',
      currencyCode: 'NGN',
      verifiedOnly: true,
    });
    expect(provenance.disclosures.join(' ')).toContain('no observation');
    expect(provenance.disclosures.join(' ')).toContain('not filled');
  });

  it('discloses a degenerate candle', () => {
    const single = buildCandles([observation('2026-07-01T09:00:00Z', 40000)], 'daily');
    const provenance = describeSeries(single.series!, {
      commodityName: 'Paddy Rice',
      marketName: 'Dawanau',
      priceTypeLabel: 'Wholesale transaction',
      gradeName: 'Grade 1',
      unitName: '50 kg bag',
      currencyCode: 'NGN',
      verifiedOnly: true,
    });
    expect(provenance.disclosures.join(' ')).toContain('single observation');
  });

  it('discloses legacy provenance', () => {
    const provenance = describeSeries(result.series!, {
      commodityName: 'Paddy Rice',
      marketName: 'Dawanau',
      priceTypeLabel: 'Wholesale transaction',
      gradeName: 'Grade 1',
      unitName: '50 kg bag',
      currencyCode: 'NGN',
      verifiedOnly: true,
    });
    expect(provenance.disclosures.join(' ')).toContain('no unit, price type or verification trail');
  });

  it('says when unverified observations are included', () => {
    const provenance = describeSeries(result.series!, {
      commodityName: 'Paddy Rice',
      marketName: 'Dawanau',
      priceTypeLabel: 'Wholesale transaction',
      gradeName: 'Grade 1',
      unitName: '50 kg bag',
      currencyCode: 'NGN',
      verifiedOnly: false,
    });
    expect(provenance.disclosures.join(' ')).toContain('Includes unverified observations');
  });
});
