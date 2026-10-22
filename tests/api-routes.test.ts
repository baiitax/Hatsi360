import { describe, expect, it } from 'vitest';
import { GET as getCommodities } from '@/app/api/v1/commodities/route';
import { GET as getMarkets } from '@/app/api/v1/markets/route';
import { GET as getLatest } from '@/app/api/v1/prices/latest/route';
import { GET as getHistory } from '@/app/api/v1/prices/history/route';
import { GET as getCompare } from '@/app/api/v1/prices/compare/route';
import { GET as getInsights } from '@/app/api/v1/insights/route';

const EMPTY_PARAMS = Promise.resolve({});

async function call(
  handler: (request: Request, context: { params: Promise<Record<string, never>> }) => Promise<Response>,
  path: string,
): Promise<{ status: number; body: any; headers: Headers }> {
  const request = new Request(`https://api.pluckagro.test${path}`);
  const response = await handler(request, { params: EMPTY_PARAMS as never });
  const body = await response.json();
  return { status: response.status, body, headers: response.headers };
}

describe('GET /api/v1/commodities', () => {
  it('returns the catalogue with pagination metadata', async () => {
    const { status, body } = await call(getCommodities, '/api/v1/commodities?limit=2');
    expect(status).toBe(200);
    expect(body.data.commodities).toHaveLength(2);
    expect(body.data.pagination.limit).toBe(2);
    expect(body.data.pagination.total).toBe(22);
    expect(body.meta.requestId).toBeTruthy();
    expect(body.meta.generatedAt).toBeTruthy();
  });

  it('filters by category', async () => {
    const { body } = await call(
      getCommodities,
      '/api/v1/commodities?category=grains-cereals&limit=100',
    );
    expect(body.data.commodities.length).toBeGreaterThan(0);
    for (const commodity of body.data.commodities) {
      expect(commodity.category.slug).toBe('grains-cereals');
    }
  });

  it('rejects an out-of-range limit', async () => {
    const { status, body } = await call(getCommodities, '/api/v1/commodities?limit=9999');
    expect(status).toBe(400);
    expect(body.error.code).toBe('bad_request');
  });

  it('rejects a non-numeric limit', async () => {
    const { status } = await call(getCommodities, '/api/v1/commodities?limit=abc');
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/markets', () => {
  it('returns the market directory', async () => {
    const { status, body } = await call(getMarkets, '/api/v1/markets?limit=100');
    expect(status).toBe(200);
    expect(body.data.markets).toHaveLength(11);
    expect(body.data.markets[0].state).toHaveProperty('slug');
  });

  it('filters by state', async () => {
    const { body } = await call(getMarkets, '/api/v1/markets?state=kano');
    expect(body.data.markets).toHaveLength(1);
    expect(body.data.markets[0].name).toBe('Dawanau International Grains Market');
  });

  it('reports the observation count for a market', async () => {
    const { body } = await call(getMarkets, '/api/v1/markets?state=kano');
    expect(body.data.markets[0].observationCount).toBe(17);
  });
});

describe('GET /api/v1/prices/latest', () => {
  it('returns one summary per market for a commodity', async () => {
    const { status, body } = await call(getLatest, '/api/v1/prices/latest?commodity=paddy-rice');
    expect(status).toBe(200);
    expect(body.data.prices).toHaveLength(3);
  });

  it('includes the observation count, the window and the staleness flag', async () => {
    const { body } = await call(getLatest, '/api/v1/prices/latest?commodity=paddy-rice');
    const dawanau = body.data.prices.find(
      (p: any) => p.market.slug === 'dawanau-international-grains-market',
    );
    expect(dawanau.observationCount).toBe(13);
    expect(dawanau.windowStart).toBeTruthy();
    expect(dawanau.windowEnd).toBeTruthy();
    expect(dawanau.isStale).toBe(true);
  });

  it('marks a legacy record as unit-ambiguous', async () => {
    const { body } = await call(getLatest, '/api/v1/prices/latest?commodity=paddy-rice');
    for (const price of body.data.prices) {
      expect(price.unit.recorded).toBe(false);
      expect(price.unitAmbiguous).toBe(true);
    }
  });

  it('returns 404 for an unknown commodity', async () => {
    const { status, body } = await call(getLatest, '/api/v1/prices/latest?commodity=nope');
    expect(status).toBe(404);
    expect(body.error.code).toBe('not_found');
  });
});

describe('GET /api/v1/prices/history', () => {
  it('returns a daily series with observation counts', async () => {
    const { status, body } = await call(
      getHistory,
      '/api/v1/prices/history?commodity=paddy-rice&market=dawanau-international-grains-market',
    );
    expect(status).toBe(200);
    expect(body.data.series).toHaveLength(6);
    expect(body.data.series[0]).toMatchObject({
      date: '2025-07-01',
      medianAmount: 41100,
      minAmount: 41000,
      maxAmount: 41200,
      observations: 2,
    });
    expect(body.data.observationCount).toBe(13);
  });

  it('honours the date range', async () => {
    const { body } = await call(
      getHistory,
      '/api/v1/prices/history?commodity=paddy-rice&market=dawanau-international-grains-market&start_date=2025-07-01&end_date=2025-07-02',
    );
    expect(body.data.series).toHaveLength(2);
  });

  it('requires both commodity and market', async () => {
    const { status, body } = await call(getHistory, '/api/v1/prices/history?commodity=paddy-rice');
    expect(status).toBe(400);
    expect(body.error.code).toBe('bad_request');
  });

  it('rejects a malformed date', async () => {
    const { status } = await call(
      getHistory,
      '/api/v1/prices/history?commodity=paddy-rice&market=dawanau-international-grains-market&start_date=01-07-2025',
    );
    expect(status).toBe(400);
  });

  it('rejects a start date after the end date', async () => {
    const { status } = await call(
      getHistory,
      '/api/v1/prices/history?commodity=paddy-rice&market=dawanau-international-grains-market&start_date=2025-07-06&end_date=2025-07-01',
    );
    expect(status).toBe(400);
  });

  it('returns 404 for an unknown market', async () => {
    const { status } = await call(
      getHistory,
      '/api/v1/prices/history?commodity=paddy-rice&market=nope',
    );
    expect(status).toBe(404);
  });
});

describe('GET /api/v1/prices/compare', () => {
  it('compares the same commodity across markets', async () => {
    const { status, body } = await call(getCompare, '/api/v1/prices/compare?commodity=paddy-rice');
    expect(status).toBe(200);
    expect(body.data.prices).toHaveLength(3);
    expect(body.data.spread).toBeTruthy();
  });

  it('computes the spread from the lowest and highest median, not the row order', async () => {
    const { body } = await call(getCompare, '/api/v1/prices/compare?commodity=paddy-rice');
    const medians = body.data.prices.map((p: any) => p.medianAmount);
    expect(body.data.spread.lowestAmount).toBe(Math.min(...medians));
    expect(body.data.spread.highestAmount).toBe(Math.max(...medians));
    expect(body.data.spread.spreadAmount).toBeCloseTo(
      Math.max(...medians) - Math.min(...medians),
      2,
    );
  });

  it('never mixes price types', async () => {
    const { body } = await call(
      getCompare,
      '/api/v1/prices/compare?commodity=paddy-rice&price_type=retail',
    );
    expect(body.data.prices).toHaveLength(0);
    expect(body.data.priceType).toBe('retail');
  });

  it('reports the unit the comparison was made in', async () => {
    const { body } = await call(getCompare, '/api/v1/prices/compare?commodity=paddy-rice');
    expect(body.data.unit.recorded).toBe(false);
    expect(body.data.excludedForUnitMismatch).toEqual([]);
  });

  it('returns 404 for an unknown commodity', async () => {
    const { status } = await call(getCompare, '/api/v1/prices/compare?commodity=nope');
    expect(status).toBe(404);
  });

  it('returns 404 for an unknown market in the list', async () => {
    const { status, body } = await call(
      getCompare,
      '/api/v1/prices/compare?commodity=paddy-rice&markets=nope',
    );
    expect(status).toBe(404);
    expect(body.error.message).toMatch(/nope/);
  });
});

describe('GET /api/v1/insights', () => {
  it('returns the published articles', async () => {
    const { status, body } = await call(getInsights, '/api/v1/insights');
    expect(status).toBe(200);
    expect(body.data.insights.length).toBe(4);
  });

  it('paginates', async () => {
    const { body } = await call(getInsights, '/api/v1/insights?limit=2');
    expect(body.data.insights).toHaveLength(2);
    expect(body.data.pagination.total).toBe(4);
    expect(body.data.pagination.totalPages).toBe(2);
  });
});

describe('the API response envelope', () => {
  it('always includes a request id and a generation timestamp', async () => {
    const { body } = await call(getMarkets, '/api/v1/markets');
    expect(body.meta.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(body.meta.generatedAt).getTime()).not.toBeNaN();
  });

  it('always includes the rate limit headers', async () => {
    const { headers } = await call(getMarkets, '/api/v1/markets');
    expect(headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(headers.get('X-RateLimit-Remaining')).toBeTruthy();
  });

  it('uses the same error envelope for every failure', async () => {
    const { body } = await call(getLatest, '/api/v1/prices/latest?commodity=nope');
    expect(body.error).toHaveProperty('code');
    expect(body.error).toHaveProperty('message');
    expect(body.meta).toHaveProperty('requestId');
  });
});
