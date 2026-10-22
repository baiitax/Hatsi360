import { describe, expect, it } from 'vitest';
import {
  amountForComparison,
  areUnitsCompatible,
  buildSeries,
  buildUnitIndex,
  deriveQualityFlags,
  findDuplicates,
  findOutliers,
  isStale,
  median,
  relativeTime,
  summariseByMarket,
} from '@/lib/pricing';
import type { MeasurementUnit, PriceObservation } from '@/types/domain';

function observation(overrides: Partial<PriceObservation> = {}): PriceObservation {
  return {
    id: 'obs-1',
    commodityId: 1,
    marketId: 1,
    varietyId: null,
    gradeId: null,
    priceType: 'wholesale_transaction',
    reportedAmount: 40_000,
    reportedUnitId: 2,
    packageWeightKg: null,
    normalizedAmount: null,
    normalizedUnitId: null,
    currencyCode: 'NGN',
    currencySymbol: '₦',
    collectedAt: '2025-07-06T09:00:00.000Z',
    collectedAtPrecision: 'minute',
    submittedAt: '2025-07-06T09:05:00.000Z',
    verifiedAt: '2025-07-06T10:00:00.000Z',
    publishedAt: '2025-07-06T10:00:00.000Z',
    agentUserId: 'agent-1',
    verificationStatus: 'verified',
    notes: null,
    qualityFlags: [],
    sourceSystem: 'agent_app',
    sourceReference: null,
    commodityName: 'Paddy Rice',
    commoditySlug: 'paddy-rice',
    marketName: 'Dawanau',
    marketSlug: 'dawanau',
    stateName: 'Kano',
    stateSlug: 'kano',
    countryCode: 'NG',
    gradeName: null,
    varietyName: null,
    unitCode: 'kg',
    unitName: 'kilogram',
    unitDimension: 'mass',
    unitIsSpecific: true,
    ...overrides,
  };
}

const UNITS: MeasurementUnit[] = [
  {
    id: 1,
    code: 'kg',
    name: 'kilogram',
    pluralName: 'kilograms',
    dimension: 'mass',
    baseUnitId: null,
    baseFactor: 1,
    isSpecific: true,
  },
  {
    id: 2,
    code: 'tonne',
    name: 'tonne',
    pluralName: 'tonnes',
    dimension: 'mass',
    baseUnitId: 1,
    baseFactor: 1000,
    isSpecific: true,
  },
  {
    id: 9,
    code: 'unspecified',
    name: 'unit not recorded',
    pluralName: null,
    dimension: 'unknown',
    baseUnitId: null,
    baseFactor: null,
    isSpecific: false,
  },
];

describe('median', () => {
  it('returns the middle value for an odd-length list', () => {
    expect(median([30_000, 40_000, 50_000])).toBe(40_000);
  });

  it('averages the two middle values for an even-length list', () => {
    expect(median([30_000, 40_000, 50_000, 60_000])).toBe(45_000);
  });

  it('ignores nulls and non-numbers', () => {
    expect(median([10, null, 20, Number.NaN, 30] as unknown as number[])).toBe(20);
  });

  it('returns null for an empty list', () => {
    expect(median([])).toBeNull();
  });

  it('does not mutate its input', () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('amountForComparison', () => {
  it('prefers the normalized amount when one exists with a known unit', () => {
    expect(
      amountForComparison(
        observation({ reportedAmount: 40_000, normalizedAmount: 800, normalizedUnitId: 1 }),
      ),
    ).toBe(800);
  });

  it('never returns a normalized amount whose unit is unknown', () => {
    // Without a normalized unit the value would be in an unknown unit, so the
    // amount exactly as reported is used instead.
    expect(amountForComparison(observation({ reportedAmount: 40_000, normalizedAmount: 800 }))).toBe(
      40_000,
    );
  });

  it('falls back to the reported amount when nothing is normalized', () => {
    expect(amountForComparison(observation({ reportedAmount: 40_000 }))).toBe(40_000);
  });

  it('returns null when there is no amount at all', () => {
    expect(amountForComparison(observation({ reportedAmount: null }))).toBeNull();
  });
});

describe('unit comparability', () => {
  const kg = UNITS.find((u) => u.code === 'kg')!;
  const tonne = UNITS.find((u) => u.code === 'tonne')!;
  const unspecified = UNITS.find((u) => u.code === 'unspecified')!;
  const litre: MeasurementUnit = {
    id: 5,
    code: 'litre',
    name: 'litre',
    pluralName: 'litres',
    dimension: 'volume',
    baseUnitId: null,
    baseFactor: 1,
    isSpecific: true,
  };

  it('treats an unspecified unit as not comparable with a specific one', () => {
    const result = areUnitsCompatible(unspecified, kg);
    expect(result.compatible).toBe(false);
    expect(result.ambiguous).toBe(true);
    expect(result.reason).toMatch(/no recorded unit/i);
  });

  it('treats two unspecified units as compatible with each other, but ambiguous', () => {
    const result = areUnitsCompatible(unspecified, unspecified);
    expect(result.compatible).toBe(true);
    expect(result.ambiguous).toBe(true);
  });

  it('treats two identical specific units as compatible and unambiguous', () => {
    const result = areUnitsCompatible(kg, kg);
    expect(result.compatible).toBe(true);
    expect(result.ambiguous).toBe(false);
  });

  it('allows two units of the same dimension when the conversion is known', () => {
    const result = areUnitsCompatible(kg, tonne);
    expect(result.compatible).toBe(true);
    expect(result.ambiguous).toBe(false);
  });

  it('refuses to compare units of different dimensions', () => {
    const result = areUnitsCompatible(kg, litre);
    expect(result.compatible).toBe(false);
    expect(result.reason).toMatch(/dimension/i);
  });

  it('refuses to compare when a unit is missing entirely', () => {
    const result = areUnitsCompatible(undefined, kg);
    expect(result.compatible).toBe(false);
    expect(result.ambiguous).toBe(true);
  });
});

describe('buildUnitIndex', () => {
  it('indexes units by id', () => {
    const index = buildUnitIndex(UNITS);
    expect(index.byId.get(1)?.code).toBe('kg');
    expect(index.byId.get(99)).toBeUndefined();
  });
});

describe('staleness', () => {
  it('marks an observation inside the freshness window as fresh', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000).toISOString();
    expect(isStale(twoHoursAgo, 24)).toBe(false);
  });

  it('marks an observation outside the freshness window as stale', () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 3600_000).toISOString();
    expect(isStale(threeDaysAgo, 24)).toBe(true);
  });

  it('treats the migrated 2025 records as stale', () => {
    expect(isStale('2025-07-06T00:00:00.000Z', 24)).toBe(true);
  });
});

describe('buildSeries', () => {
  it('groups observations by day and reports the median, range and count', () => {
    const series = buildSeries([
      observation({ id: 'a', collectedAt: '2025-07-01T09:00:00.000Z', reportedAmount: 41_000 }),
      observation({ id: 'b', collectedAt: '2025-07-01T13:00:00.000Z', reportedAmount: 41_200 }),
      observation({ id: 'c', collectedAt: '2025-07-02T09:00:00.000Z', reportedAmount: 40_500 }),
    ]);

    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({
      date: '2025-07-01',
      median: 41_100,
      min: 41_000,
      max: 41_200,
      observations: 2,
    });
    expect(series[1]).toMatchObject({
      date: '2025-07-02',
      median: 40_500,
      observations: 1,
    });
  });

  it('returns an empty series for no observations', () => {
    expect(buildSeries([])).toEqual([]);
  });
});

describe('summariseByMarket', () => {
  const observations = [
    observation({
      id: 'a',
      marketId: 1,
      marketName: 'Dawanau',
      collectedAt: '2025-07-01T09:00:00.000Z',
      reportedAmount: 41_000,
    }),
    observation({
      id: 'b',
      marketId: 1,
      marketName: 'Dawanau',
      collectedAt: '2025-07-06T09:00:00.000Z',
      reportedAmount: 40_550,
    }),
    observation({
      id: 'c',
      marketId: 2,
      marketName: 'Mile 12',
      collectedAt: '2023-07-20T09:00:00.000Z',
      reportedAmount: 41_550,
    }),
  ];

  it('produces one summary per market', () => {
    const summaries = summariseByMarket(observations);
    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.marketId).sort()).toEqual([1, 2]);
  });

  it('records the observation count and the window covered', () => {
    const dawanau = summariseByMarket(observations).find((s) => s.marketId === 1)!;
    expect(dawanau.observationCount).toBe(2);
    expect(dawanau.windowStart).toBe('2025-07-01T09:00:00.000Z');
    expect(dawanau.windowEnd).toBe('2025-07-06T09:00:00.000Z');
  });

  it('reports the median, minimum and maximum', () => {
    const dawanau = summariseByMarket(observations).find((s) => s.marketId === 1)!;
    expect(dawanau.medianAmount).toBe(40_775);
    expect(dawanau.minAmount).toBe(40_550);
    expect(dawanau.maxAmount).toBe(41_000);
  });

  it('reports the latest observation separately from the median', () => {
    const dawanau = summariseByMarket(observations).find((s) => s.marketId === 1)!;
    expect(dawanau.latestAmount).toBe(40_550);
    expect(dawanau.latestCollectedAt).toBe('2025-07-06T09:00:00.000Z');
  });

  it('flags a market whose observations use an unspecified unit', () => {
    const summaries = summariseByMarket([
      observation({
        unitCode: 'unspecified',
        unitIsSpecific: false,
        unitName: 'unit not recorded',
        reportedUnitId: 9,
      }),
    ]);
    expect(summaries[0]!.unitAmbiguous).toBe(true);
  });

  it('does not compute a change percentage without a previous window', () => {
    const summaries = summariseByMarket(observations);
    expect(summaries.every((s) => s.changePercent === null)).toBe(true);
  });

  it('computes a change percentage when a previous window is supplied', () => {
    const previous = [
      observation({
        id: 'p',
        marketId: 1,
        collectedAt: '2025-06-01T09:00:00.000Z',
        reportedAmount: 40_000,
      }),
    ];
    const summaries = summariseByMarket(observations, { previousWindow: previous });
    const dawanau = summaries.find((s) => s.marketId === 1)!;
    // Median rose from 40,000 to 40,775 — a rise of 1.9375%.
    expect(dawanau.changePercent).toBeCloseTo(1.94, 2);
  });

  it('marks a market whose latest observation is outside the freshness window as stale', () => {
    const summaries = summariseByMarket(observations);
    expect(summaries.every((s) => s.isStale)).toBe(true);
  });
});

describe('duplicate detection', () => {
  it('flags a repeated observation for the same market and time', () => {
    const duplicates = findDuplicates([observation({ id: 'a' }), observation({ id: 'b' })]);
    expect(duplicates).toEqual(['b']);
  });

  it('does not flag observations from different markets', () => {
    const duplicates = findDuplicates([
      observation({ id: 'a', marketId: 1 }),
      observation({ id: 'b', marketId: 2 }),
    ]);
    expect(duplicates).toHaveLength(0);
  });

  it('does not flag observations with different amounts', () => {
    const duplicates = findDuplicates([
      observation({ id: 'a', reportedAmount: 40_000 }),
      observation({ id: 'b', reportedAmount: 45_000 }),
    ]);
    expect(duplicates).toHaveLength(0);
  });

  it('does not flag observations with different price types', () => {
    const duplicates = findDuplicates([
      observation({ id: 'a', priceType: 'wholesale_asking' }),
      observation({ id: 'b', priceType: 'retail' }),
    ]);
    expect(duplicates).toHaveLength(0);
  });

  it('does not flag observations collected minutes apart', () => {
    const duplicates = findDuplicates([
      observation({ id: 'a', collectedAt: '2025-07-06T09:00:00.000Z' }),
      observation({ id: 'b', collectedAt: '2025-07-06T09:40:00.000Z' }),
    ]);
    expect(duplicates).toHaveLength(0);
  });
});

describe('outlier detection', () => {
  it('flags an extreme value but keeps it', () => {
    const observations = [
      observation({ id: 'a', reportedAmount: 40_000 }),
      observation({ id: 'b', reportedAmount: 40_100 }),
      observation({ id: 'c', reportedAmount: 40_200 }),
      observation({ id: 'd', reportedAmount: 40_300 }),
      observation({ id: 'e', reportedAmount: 900_000 }),
    ];
    const outliers = findOutliers(observations);
    expect([...outliers.keys()]).toEqual(['e']);
    // The record is flagged, never dropped.
    expect(observations).toHaveLength(5);
  });

  it('flags nothing in a tight cluster', () => {
    const observations = [
      observation({ id: 'a', reportedAmount: 40_000 }),
      observation({ id: 'b', reportedAmount: 40_200 }),
      observation({ id: 'c', reportedAmount: 39_900 }),
      observation({ id: 'd', reportedAmount: 40_100 }),
    ];
    expect(findOutliers(observations).size).toBe(0);
  });

  it('needs a minimum sample before flagging anything', () => {
    const observations = [
      observation({ id: 'a', reportedAmount: 40_000 }),
      observation({ id: 'b', reportedAmount: 900_000 }),
    ];
    expect(findOutliers(observations).size).toBe(0);
  });
});

describe('deriveQualityFlags', () => {
  const context = { duplicates: [] as string[], outliers: new Map() };

  it('flags an observation whose amount was never normalised', () => {
    const flags = deriveQualityFlags(observation(), context);
    expect(flags).toContain('unit_conversion_unverified');
  });

  it('flags an observation with a date-precision timestamp', () => {
    const flags = deriveQualityFlags(observation({ collectedAtPrecision: 'date' }), context);
    expect(flags).toContain('timestamp_inconsistent');
  });

  it('flags a legacy, unverified observation', () => {
    const flags = deriveQualityFlags(
      observation({ verificationStatus: 'legacy_unverified' }),
      context,
    );
    expect(flags).toContain('legacy_unverified');
  });

  it('flags an observation with an unspecified unit', () => {
    const flags = deriveQualityFlags(observation({ unitIsSpecific: false }), context);
    expect(flags).toContain('unit_ambiguous');
  });

  it('flags a duplicated observation', () => {
    const flags = deriveQualityFlags(observation({ id: 'dupe' }), {
      ...context,
      duplicates: ['dupe'],
    });
    expect(flags).toContain('duplicate_suspected');
  });

  it('flags a stale observation', () => {
    const flags = deriveQualityFlags(
      observation({ collectedAt: '2020-01-01T00:00:00.000Z' }),
      context,
    );
    expect(flags).toContain('stale');
  });

  it('returns no duplicate flag for an observation that is not duplicated', () => {
    const flags = deriveQualityFlags(observation({ id: 'unique' }), context);
    expect(flags).not.toContain('duplicate_suspected');
  });
});

describe('relativeTime', () => {
  it('describes a recent timestamp in minutes', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(relativeTime(tenMinutesAgo)).toMatch(/minute/);
  });

  it('describes an old timestamp in days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(relativeTime(tenDaysAgo)).toMatch(/day/);
  });
});
