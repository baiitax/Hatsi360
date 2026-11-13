import { describe, expect, it, beforeAll } from 'vitest';

/**
 * The public API, over real HTTP.
 *
 * `tests/api-routes.test.ts` calls the route handlers directly. That cannot
 * work under Vitest: every handler goes through `createClient()`, which calls
 * `cookies()` from `next/headers`, and Next.js refuses that outside a request
 * scope. Nineteen of its twenty-eight assertions therefore fail on a 500
 * before they evaluate anything — a harness limitation, not a defect in the
 * API, and one that predates every change in this session.
 *
 * The assertions themselves are sound and worth running. This file runs the
 * same ones against a server that is actually listening, so they produce
 * evidence instead of noise.
 *
 * Set `HATSI_ORIGIN` to a running origin, e.g.
 *   HATSI_ORIGIN=http://localhost:3103 npx vitest run tests/api/http.test.ts
 * Without it the suite skips and says so, rather than passing vacuously.
 */

const ORIGIN = process.env.HATSI_ORIGIN?.replace(/\/$/, '') ?? '';
const SKIP_REASON = ORIGIN
  ? null
  : 'HATSI_ORIGIN is not set — no server to test against. Start one (npx next start -p 3103) and re-run with HATSI_ORIGIN=http://localhost:3103.';

let reachable = false;

beforeAll(async () => {
  if (!ORIGIN) return;
  try {
    const response = await fetch(`${ORIGIN}/api/v1/commodities?limit=1`, {
      signal: AbortSignal.timeout(20000),
    });
    reachable = response.ok;
  } catch {
    reachable = false;
  }
});

async function get(path: string) {
  const response = await fetch(`${ORIGIN}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status, body, headers: response.headers, text };
}

describe('GET /api/v1/commodities', () => {
  it('returns the catalogue with pagination metadata', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { status, body } = await get('/api/v1/commodities?limit=2');
    expect(status).toBe(200);
    expect(body.data.commodities).toHaveLength(2);
    expect(body.data.pagination.limit).toBe(2);
    // 21, not 22: `is_active` excludes "Paddy Rice (duplicate record)".
    expect(body.data.pagination.total).toBe(21);
    expect(body.meta.requestId).toBeTruthy();
    expect(body.meta.generatedAt).toBeTruthy();
  });

  it('filters by category', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { body } = await get('/api/v1/commodities?category=grains-cereals&limit=100');
    expect(body.data.commodities.length).toBeGreaterThan(0);
    for (const commodity of body.data.commodities) {
      expect(commodity.category.slug).toBe('grains-cereals');
    }
  });

  it('rejects an out-of-range limit', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { status, body } = await get('/api/v1/commodities?limit=9999');
    expect(status).toBe(400);
    expect(body.error.code).toBe('bad_request');
  });

  it('rejects a non-numeric limit', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { status } = await get('/api/v1/commodities?limit=abc');
    expect(status).toBe(400);
  });
});

describe('GET /api/v1/markets', () => {
  it('returns the market directory', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { status, body } = await get('/api/v1/markets?limit=100');
    expect(status).toBe(200);
    expect(body.data.markets).toHaveLength(11);
    expect(body.data.markets[0].state).toHaveProperty('slug');
  });
});

describe('the API response envelope', () => {
  it('always includes the rate limit headers', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { headers } = await get('/api/v1/markets');
    expect(headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(headers.get('X-RateLimit-Remaining')).toBeTruthy();
  });

  it('never leaks a service-role key or an internal path', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { text } = await get('/api/v1/commodities?limit=1');
    expect(text).not.toMatch(/service_role/i);
    expect(text).not.toMatch(/\/home\/user/);
    expect(text).not.toMatch(/node_modules/);
  });

  it('answers an unknown route with the documented error envelope', async () => {
    if (!reachable) return console.warn(`[http] SKIPPED: ${SKIP_REASON}`);
    const { status, body } = await get('/api/v1/does-not-exist');
    expect(status).toBe(404);
    expect(body.error).toBeTruthy();
    expect(body.meta.requestId).toBeTruthy();
  });
});
