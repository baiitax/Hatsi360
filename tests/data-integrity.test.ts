import { describe, expect, it } from 'vitest';
import migrated from '@/data/legacy/production-observations.json';
import rawHistory from '../audit/source/legacy-price-history.json';
import rawCatalogue from '../audit/source/legacy-catalogue.json';
import { fixtureSource } from '@/lib/data/fixture';

/* ------------------------------------------------------------------ types */

interface RawGroup {
  market_id: number;
  commodity_id: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MigratedObservation {
  legacy_market_id: number;
  legacy_commodity_id: number;
  collection_date: string;
  sequence: number;
  reported_amount: number;
  /** The raw OHLC row this price was reconstructed from. */
  source_group: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  };
}

/**
 * The reconstruction rule.
 *
 * The live site published an OHLC row plus a volume. The volume tells us how
 * many distinct prices were behind that row, but not which price each one was.
 * The rule recovered from the capture is:
 *
 *   volume 1 → the single value (open = high = low = close)
 *   volume 2 → { open, close }
 *   volume 3 → the third value is whichever of high/low was not already attained
 *
 * Anything else is unreconstructable, and the builder refused to guess.
 */
function reconstruct(group: RawGroup): number[] {
  const { open, high, low, close, volume } = group;

  if (volume === 1) return [open];
  if (volume === 2) return [open, close];

  if (volume === 3) {
    // The third price is whichever of high/low was not already attained by
    // the open or the close.
    const { high: h, low: l, open: o, close: c } = group;
    const attained = new Set([o, c]);
    if (!attained.has(h)) return [o, c, h];
    if (!attained.has(l)) return [o, c, l];
    return [o, c];
  }

  throw new Error(`Unreconstructable volume: ${volume}`);
}

const observations = migrated.observations as unknown as MigratedObservation[];
const groups = rawHistory as unknown as RawGroup[];

/* ------------------------------------------------------------------ tests */

describe('legacy dataset shape', () => {
  it('contains every price point in the original capture', () => {
    const expected = groups.reduce((total, group) => total + group.volume, 0);
    expect(observations).toHaveLength(expected);
    expect(observations).toHaveLength(28);
  });

  it('contains every daily group in the original capture', () => {
    expect(groups).toHaveLength(15);
  });

  it('covers exactly the five market/commodity pairs that had history', () => {
    const expected = new Set(groups.map((g) => `${g.market_id}:${g.commodity_id}`));
    const actual = new Set(observations.map((o) => `${o.legacy_market_id}:${o.legacy_commodity_id}`));
    expect([...actual].sort()).toEqual([...expected].sort());
  });

  it('spans the collection date range of the capture', () => {
    const dates = observations.map((o) => o.collection_date).sort();
    expect(dates[0]).toBe('2023-07-20');
    expect(dates[dates.length - 1]).toBe('2025-07-14');
  });
});

describe('every migrated price traces back to the original capture', () => {
  it('reconstructs each daily group exactly', () => {
    for (const group of groups) {
      const expected = reconstruct(group).sort((a, b) => a - b);
      const actual = observations
        .filter(
          (o) =>
            o.legacy_market_id === group.market_id &&
            o.legacy_commodity_id === group.commodity_id &&
            o.collection_date === group.date,
        )
        .map((o) => o.reported_amount)
        .sort((a, b) => a - b);

      expect(actual).toEqual(expected);
    }
  });

  it('never invents a price that was not in the capture', () => {
    const rawValues = new Set<number>();
    for (const group of groups) {
      rawValues.add(group.open);
      rawValues.add(group.high);
      rawValues.add(group.low);
      rawValues.add(group.close);
    }

    for (const observation of observations) {
      expect(rawValues.has(observation.reported_amount)).toBe(true);
    }
  });

  it('assigns a stable sequence within each daily group', () => {
    for (const group of groups) {
      const matching = observations
        .filter(
          (o) =>
            o.legacy_market_id === group.market_id &&
            o.legacy_commodity_id === group.commodity_id &&
            o.collection_date === group.date,
        )
        .sort((a, b) => a.sequence - b.sequence);

      expect(matching).toHaveLength(group.volume);
      expect(matching.map((o) => o.sequence)).toEqual(
        matching.map((_, index) => index + 1),
      );
    }
  });
});

describe('migrated records carry honest provenance', () => {
  it('retains the raw source row behind every price', () => {
    for (const observation of observations) {
      expect(observation.source_group).toBeDefined();
      expect(observation.source_group.volume).toBeGreaterThanOrEqual(1);
      expect(observation.source_group.open).toBeGreaterThan(0);
    }
  });

  it('marks every legacy record as unverified when it is served', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    for (const observation of result.items) {
      expect(observation.verificationStatus).toBe('legacy_unverified');
    }
  });

  it('gives every legacy record the unspecified unit rather than a guess', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    for (const observation of result.items) {
      expect(observation.reportedUnitId).toBe(
        observation.unitCode === 'unspecified' ? observation.reportedUnitId : observation.reportedUnitId,
      );
      expect(observation.unitIsSpecific).toBe(false);
      expect(observation.unitCode).toBe('unspecified');
    }
  });

  it('flags every legacy record for the missing unit and missing time of day', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    for (const observation of result.items) {
      expect(observation.qualityFlags).toContain('unit_conversion_unverified');
      expect(observation.qualityFlags).toContain('timestamp_inconsistent');
      expect(observation.qualityFlags).toContain('legacy_unverified');
    }
  });

  it('records the collection time at date precision only', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    for (const observation of result.items) {
      expect(observation.collectedAtPrecision).toBe('date');
      expect(observation.collectedAt).toMatch(/T00:00:00/);
    }
  });

  it('records the legacy system as the source of every record', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    for (const observation of result.items) {
      expect(observation.sourceSystem).toBe('legacy_import');
    }
  });

  it('retains a source reference for every record', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    for (const observation of result.items) {
      expect(typeof observation.sourceReference).toBe('string');
      expect((observation.sourceReference as string).length).toBeGreaterThan(0);
    }
  });

  it('never claims a verification time that did not happen', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    for (const observation of result.items) {
      expect(observation.verifiedAt).toBeNull();
    }
  });
});

describe('the fixture data source serves the migrated dataset faithfully', () => {
  it('reports the migrated dataset as migrated', async () => {
    expect(fixtureSource.isMigrated).toBe(true);
  });

  it('exposes the same number of observations as the file', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    expect(result.total).toBe(observations.length);
  });

  it('lists every catalogue market and commodity', async () => {
    const markets = await fixtureSource.listMarkets();
    const commodities = await fixtureSource.listCommodities();
    expect(markets).toHaveLength(11);
    expect(commodities).toHaveLength(22);
  });

  it('matches the catalogue captured from the live site, by legacy id', async () => {
    const catalogue = rawCatalogue as unknown as {
      markets: { market_id: number; name: string }[];
      commodities: { commodity_id: number; name: string }[];
    };

    const markets = await fixtureSource.listMarkets();
    const commodities = await fixtureSource.listCommodities();

    expect(markets.map((m) => m.legacyId).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
      catalogue.markets.map((m) => m.market_id).sort((a, b) => a - b),
    );
    expect(commodities.map((c) => c.legacyId).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual(
      catalogue.commodities.map((c) => c.commodity_id).sort((a, b) => a - b),
    );
  });

  it('renames only the duplicate commodity, and says so in the name', async () => {
    const catalogue = rawCatalogue as unknown as {
      commodities: { commodity_id: number; name: string }[];
    };

    const commodities = await fixtureSource.listCommodities();
    const liveNames = catalogue.commodities.map((c) => c.name);

    for (const commodity of commodities) {
      const original = catalogue.commodities.find((c) => c.commodity_id === commodity.legacyId);
      if (!original) continue;
      if (original.name === commodity.name) continue;
      // The only permitted difference is the documented de-duplication suffix.
      expect(commodity.name).toBe(`${original.name} (duplicate record)`);
    }

    // The live site listed two commodities both called "Paddy Rice".
    expect(liveNames.filter((n) => n === 'Paddy Rice')).toHaveLength(2);
  });

  it('reports the provenance of the migration', async () => {
    const provenance = await fixtureSource.getProvenance();
    expect(provenance).not.toBeNull();
    expect(provenance!.observedCount).toBe(28);
    expect(provenance!.dateRange).toEqual(['2023-07-20', '2025-07-14']);
    expect(provenance!.validation.publishedLatestValuesChecked).toBeGreaterThan(0);
    expect(provenance!.validation.mismatches).toHaveLength(0);
  });

  it('lists no market as having a price it does not have', async () => {
    const markets = await fixtureSource.listMarkets();
    const withPrices = markets.filter((m) => (m.observationCount ?? 0) > 0);
    // Only Dawanau (7), Mile 12 (1) and Gujungu (9) had published prices.
    expect(withPrices.map((m) => m.legacyId).sort()).toEqual([1, 7, 9]);
  });

  it('lists no commodity as having a price it does not have', async () => {
    const commodities = await fixtureSource.listCommodities();
    const withPrices = commodities.filter((c) => (c.observationCount ?? 0) > 0);
    // Paddy Rice (1), Local Rice (21) and Groundnut (25).
    expect(withPrices.map((c) => c.legacyId).sort()).toEqual([1, 21, 25]);
  });
});

describe('the fixture data source applies the documented filters', () => {
  it('filters by commodity', async () => {
    const result = await fixtureSource.listObservations({ commodityId: 1, pageSize: 100 });
    expect(result.total).toBe(21);
    expect(result.items.every((o) => o.commodityId === 1)).toBe(true);
  });

  it('filters by market', async () => {
    const result = await fixtureSource.listObservations({ marketId: 1, pageSize: 100 });
    expect(result.total).toBe(17);
    expect(result.items.every((o) => o.marketId === 1)).toBe(true);
  });

  it('paginates', async () => {
    const first = await fixtureSource.listObservations({ page: 1, pageSize: 10 });
    const second = await fixtureSource.listObservations({ page: 2, pageSize: 10 });
    expect(first.items).toHaveLength(10);
    expect(second.items).toHaveLength(10);
    expect(first.items[0]!.id).not.toBe(second.items[0]!.id);
    expect(first.totalPages).toBe(3);
  });

  it('sorts by collection time, newest first, by default', async () => {
    const result = await fixtureSource.listObservations({ pageSize: 100 });
    const dates = result.items.map((o) => o.collectedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('filters by collection date range', async () => {
    const result = await fixtureSource.listObservations({
      collectedFrom: '2025-07-01T00:00:00.000Z',
      collectedTo: '2025-07-06T23:59:59.999Z',
      pageSize: 100,
    });
    // Dawanau Paddy Rice (13), Gujungu Paddy Rice (5), Dawanau Groundnut (4)
    // and Mile 12 Local Rice (1).
    expect(result.total).toBe(23);
  });
});
