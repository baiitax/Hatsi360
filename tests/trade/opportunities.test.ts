import { describe, expect, it } from 'vitest';
import {
  COST_ASSESSMENT,
  OPPORTUNITY_DISCLOSURE,
  calculateSpread,
  findBestBuy,
  findBestSell,
  findOpportunity,
  groupBySeries,
  type OpportunityObservation,
} from '@/lib/trade/opportunities';
import type { SeriesKey } from '@/lib/trade/series';

/**
 * Trading opportunities.
 *
 * The brief asks for a best-buy engine and a best-sell engine built around
 * commercial offers. No offers exist in the schema. These tests hold the
 * reframing in place: the results are the most extreme *verified recorded
 * price*, never a commercial opportunity, and no cost or margin figure is ever
 * invented.
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
  marketId: number,
  amount: number,
  overrides: Partial<OpportunityObservation> = {},
): OpportunityObservation => {
  counter += 1;
  return {
    id: `obs-${counter}`,
    seriesKey: KEY,
    amount,
    collectedAt: '2026-10-20T09:00:00.000Z',
    marketId,
    marketName: `Market ${marketId}`,
    commodityId: 1,
    commodityName: 'Paddy Rice',
    verificationStatus: 'verified',
    publishedAt: '2026-10-20T10:00:00.000Z',
    availability: null,
    ...overrides,
  };
};

describe('the reframing itself', () => {
  it('labels the basis as an observation, not an opportunity', () => {
    const result = findBestBuy([observation(7, 40000), observation(9, 42000)]);
    expect(result.basis).toBe('lowest_verified_observation');
    expect(result.basisLabel).toBe('Lowest verified observation');
    expect(result.basisLabel.toLowerCase()).not.toContain('opportunity');
    expect(result.basisLabel.toLowerCase()).not.toContain('offer');
  });

  it('carries the disclosure on every result', () => {
    const result = findBestBuy([observation(7, 40000)]);
    expect(result.disclosure).toBe(OPPORTUNITY_DISCLOSURE);
    expect(result.disclosure).toContain('not a commercial offer');
    expect(result.disclosure).toContain('No seller has agreed to sell at this price');
  });

  it('never reports a cost or a margin', () => {
    // Non-negotiable #10. There is no cost data, so the assessment is always
    // the blocked one and it says why.
    const result = findBestBuy([observation(7, 40000), observation(9, 42000)]);
    expect(result.cost).toEqual(COST_ASSESSMENT);
    expect(result.cost.available).toBe(false);
    expect(result.cost.reason).toContain('No transport, handling, packaging or transaction cost');
    expect(Object.keys(result)).not.toContain('landedCost');
    expect(Object.keys(result)).not.toContain('netSellingValue');
    expect(Object.keys(result)).not.toContain('margin');
  });

  it('never claims a quantity is available', () => {
    const result = findBestBuy([observation(7, 40000)]);
    const serialised = JSON.stringify(result);
    expect(serialised.toLowerCase()).not.toContain('quantityavailable');
    expect(serialised.toLowerCase()).not.toContain('instock');
  });
});

describe('findBestBuy', () => {
  it('finds the lowest comparable price', () => {
    const result = findBestBuy([
      observation(7, 42000),
      observation(9, 40000),
      observation(11, 43500),
    ]);
    expect(result.best?.amount).toBe(40000);
    expect(result.best?.marketId).toBe(9);
    expect(result.candidates).toHaveLength(3);
  });

  it('orders candidates from cheapest upward', () => {
    const result = findBestBuy([
      observation(7, 43500),
      observation(9, 40000),
      observation(11, 42000),
    ]);
    expect(result.candidates.map((c) => c.amount)).toEqual([40000, 42000, 43500]);
  });

  it('reports how far each candidate sits from the best', () => {
    const result = findBestBuy([observation(9, 40000), observation(7, 44000)]);
    expect(result.candidates[0].differenceFromBest).toBe(0);
    expect(result.candidates[1].differenceFromBest).toBe(4000);
    expect(result.candidates[1].differenceFromBestPercent).toBeCloseTo(10);
  });

  it('returns null when nothing is comparable', () => {
    const result = findBestBuy([]);
    expect(result.best).toBeNull();
    expect(result.candidates).toHaveLength(0);
  });

  it('flags a single observation so it is not read as a comparison', () => {
    const result = findBestBuy([observation(7, 40000)]);
    expect(result.isSingleObservation).toBe(true);
  });
});

describe('findBestSell', () => {
  it('finds the highest comparable price', () => {
    const result = findBestSell([
      observation(7, 42000),
      observation(9, 40000),
      observation(11, 43500),
    ]);
    expect(result.basis).toBe('highest_verified_observation');
    expect(result.best?.amount).toBe(43500);
    expect(result.best?.marketId).toBe(11);
  });

  it('orders candidates from dearest downward', () => {
    const result = findBestSell([observation(7, 43500), observation(9, 40000)]);
    expect(result.candidates.map((c) => c.amount)).toEqual([43500, 40000]);
  });

  it('does not call a published observation a buyer commitment', () => {
    // Brief §10.1 states this rule directly.
    const result = findBestSell([observation(7, 43500), observation(9, 40000)]);
    expect(result.disclosure).toContain('No seller has agreed');
    expect(result.basisLabel).not.toContain('buyer');
  });
});

describe('publication filtering', () => {
  it('excludes an unpublished observation by default', () => {
    // An unpublished observation has not been through verification and must
    // not be presented as a market opportunity.
    const result = findBestBuy([
      observation(7, 39000, { verificationStatus: 'submitted', publishedAt: null }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(42000);
    expect(result.excludedCount).toBe(1);
    expect(result.exclusionReasons).toEqual([{ dimension: 'not published', count: 1 }]);
  });

  it('accepts a legacy import as published', () => {
    // The publication guard permits legacy_unverified. It is labelled, not hidden.
    const result = findBestBuy([
      observation(7, 39000, { verificationStatus: 'legacy_unverified' }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(39000);
  });

  it('excludes a rejected observation', () => {
    const result = findBestBuy([
      observation(7, 39000, { verificationStatus: 'rejected', publishedAt: null }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(42000);
  });

  it('can be asked to include unpublished data, and then reports it', () => {
    const result = findBestBuy([observation(7, 39000, { verificationStatus: 'draft' })], {
      publishedOnly: false,
    });
    expect(result.candidates).toHaveLength(1);
  });
});

describe('comparability filtering', () => {
  it('excludes an observation in a different unit', () => {
    const result = findBestBuy([
      observation(7, 39000, { seriesKey: { ...KEY, unitId: 9 } }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(42000);
    expect(result.exclusionReasons.some((r) => r.dimension === 'unit')).toBe(true);
  });

  it('excludes an observation with no grade recorded', () => {
    const result = findBestBuy([
      observation(7, 39000, { seriesKey: { ...KEY, gradeId: null } }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(42000);
    expect(result.exclusionReasons.some((r) => r.dimension === 'grade')).toBe(true);
  });

  it('excludes an indicative price', () => {
    const result = findBestBuy([
      observation(7, 39000, { seriesKey: { ...KEY, priceType: 'indicative' } }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(42000);
    expect(result.exclusionReasons.some((r) => r.dimension === 'priceType')).toBe(true);
  });

  it('excludes an observation in another currency', () => {
    const result = findBestBuy([
      observation(7, 39000, { seriesKey: { ...KEY, currencyCode: 'USD' } }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(42000);
    expect(result.exclusionReasons.some((r) => r.dimension === 'currency')).toBe(true);
  });

  it('reports the exclusion count', () => {
    const result = findBestBuy([
      observation(7, 39000, { seriesKey: { ...KEY, unitId: 9 } }),
      observation(9, 42000),
      observation(11, 41500),
    ]);
    expect(result.excludedCount).toBe(1);
  });
});

describe('calculateSpread', () => {
  it('calculates the spread between two comparable markets', () => {
    const result = calculateSpread([observation(7, 40000), observation(9, 42500)]);
    expect(result.available).toBe(true);
    expect(result.buyMarket?.marketId).toBe(7);
    expect(result.sellMarket?.marketId).toBe(9);
    expect(result.spread).toBe(2500);
    expect(result.spreadPercent).toBeCloseTo(6.25);
  });

  it('refuses a spread from one market', () => {
    const result = calculateSpread([observation(7, 40000)]);
    expect(result.available).toBe(false);
    expect(result.reason).toContain('at least two markets');
    expect(result.spread).toBeNull();
  });

  it('refuses a spread with no comparable data', () => {
    const result = calculateSpread([]);
    expect(result.available).toBe(false);
    expect(result.spread).toBeNull();
  });

  it('uses the most recent observation per market', () => {
    // A stale price must not outrank a fresh one.
    const result = calculateSpread([
      observation(7, 50000, { collectedAt: '2026-01-01T09:00:00.000Z' }),
      observation(7, 40000, { collectedAt: '2026-10-20T09:00:00.000Z' }),
      observation(9, 42500),
    ]);
    expect(result.buyMarket?.amount).toBe(40000);
  });

  it('never reports a margin', () => {
    // Non-negotiable #10. Brief §11.2 asks for net margin; the costs do not exist.
    const result = calculateSpread([observation(7, 40000), observation(9, 42500)]);
    expect(result.margin.available).toBe(false);
    expect(result.margin.reason).toContain('would be invented');
    expect(Object.keys(result)).not.toContain('grossMargin');
    expect(Object.keys(result)).not.toContain('netMargin');
  });

  it('warns that the figure is a price gap, not a profit', () => {
    const result = calculateSpread([observation(7, 40000), observation(9, 42500)]);
    expect(result.warnings.join(' ')).toContain('not a profit');
  });

  it('warns when the two prices were recorded on different days', () => {
    const result = calculateSpread([
      observation(7, 40000, { collectedAt: '2026-10-01T09:00:00.000Z' }),
      observation(9, 42500, { collectedAt: '2026-10-20T09:00:00.000Z' }),
    ]);
    expect(result.warnings.join(' ')).toContain('different days');
  });

  it('warns when a price is more than a week old', () => {
    const result = calculateSpread([
      observation(7, 40000, { collectedAt: '2026-09-01T09:00:00.000Z' }),
      observation(9, 42500),
    ]);
    expect(result.warnings.join(' ')).toContain('more than a week old');
  });

  it('warns when supply was reported scarce', () => {
    const result = calculateSpread([
      observation(7, 40000, { availability: 'scarce' }),
      observation(9, 42500),
    ]);
    expect(result.warnings.join(' ')).toContain('scarce');
  });

  it('warns when no grade was recorded', () => {
    const result = calculateSpread([
      observation(7, 40000, { seriesKey: { ...KEY, gradeId: null } }),
      observation(9, 42500, { seriesKey: { ...KEY, gradeId: null } }),
    ]);
    expect(result.warnings.join(' ')).toContain('No grade was recorded');
  });

  it('excludes incomparable observations from the spread', () => {
    const result = calculateSpread([
      observation(7, 40000),
      observation(9, 42500),
      observation(11, 20000, { seriesKey: { ...KEY, unitId: 9 } }),
    ]);
    expect(result.spread).toBe(2500);
    expect(result.excludedCount).toBe(1);
  });

  it('reports how many markets were comparable', () => {
    const result = calculateSpread([
      observation(7, 40000),
      observation(9, 42500),
      observation(11, 41000),
    ]);
    expect(result.comparableMarketCount).toBe(3);
  });
});

describe('groupBySeries', () => {
  it('separates incompatible series', () => {
    const { groups } = groupBySeries([
      observation(7, 40000),
      observation(9, 42500),
      observation(11, 20000, { seriesKey: { ...KEY, unitId: 9 } }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it('keeps one group when everything is comparable', () => {
    const { groups } = groupBySeries([observation(7, 40000), observation(9, 42500)]);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });
});

describe('findOpportunity', () => {
  it('agrees with the convenience wrappers', () => {
    const observations = [observation(7, 42000), observation(9, 40000)];
    expect(findOpportunity(observations, 'low').best).toEqual(findBestBuy(observations).best);
    expect(findOpportunity(observations, 'high').best).toEqual(findBestSell(observations).best);
  });

  it('does not let row order decide which series is the reference', () => {
    // The reference series must be chosen deliberately. If it were simply the
    // first row, the database's return order would decide which price is
    // "comparable" and which is an outlier — the same input would give
    // different answers on different runs.
    const cheap = observation(7, 39000, { seriesKey: { ...KEY, unitId: 9 } });
    const fair = observation(9, 42000);

    const forward = findBestBuy([cheap, fair]);
    const reversed = findBestBuy([fair, cheap]);

    expect(forward.best?.amount).toBe(42000);
    expect(reversed.best?.amount).toBe(42000);
    expect(forward.excludedCount).toBe(1);
    expect(reversed.excludedCount).toBe(1);
  });

  it('anchors on the series with the most observations', () => {
    // Three observations in the base series against one in another: the base
    // is the selection, and the lone row is the outlier.
    const result = findBestBuy([
      observation(7, 42000),
      observation(9, 41500),
      observation(11, 43000),
      observation(13, 10000, { seriesKey: { ...KEY, unitId: 9 } }),
    ]);
    expect(result.candidates).toHaveLength(3);
    expect(result.best?.amount).toBe(41500);
    expect(result.excludedCount).toBe(1);
  });

  it('prefers a comparable price type when the counts tie', () => {
    // An indicative price cannot be compared with anything, including itself,
    // so it must not become the reference.
    const result = findBestBuy([
      observation(7, 39000, { seriesKey: { ...KEY, priceType: 'indicative' } }),
      observation(9, 42000),
    ]);
    expect(result.best?.amount).toBe(42000);
    expect(result.exclusionReasons.some((r) => r.dimension === 'priceType')).toBe(true);
  });
});
