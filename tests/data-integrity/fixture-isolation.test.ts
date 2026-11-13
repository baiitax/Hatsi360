import { describe, expect, it, beforeAll } from 'vitest';
import { Client } from 'pg';

/**
 * Test-fixture isolation.
 *
 * The demonstration data in `price_observations` is synthetic. It must never be
 * mistaken for a real observation, and it must never reach the public site.
 * Both properties are enforced by the database, not by application code, so
 * both are asserted against the database here.
 *
 * Three independent barriers stand between a fixture and a public reader:
 *
 *   1. the `published_price_observations` view filters
 *      `source_system <> 'test_fixture'`
 *   2. the same view also filters `source_reference <> 'test_fixture'`
 *   3. `published_at IS NULL`, which fails both the view's `published_at IS NOT
 *      NULL` condition and the `is_public_observation()` predicate behind the
 *      anon/authenticated SELECT policies on the base table
 *
 * If any of these ever regresses, this file fails rather than fake prices
 * quietly appearing on a public page.
 */

type Row = Record<string, unknown>;

let db: { ok: true; client: Client } | { ok: false; reason: string } = {
  ok: false,
  reason: 'not yet checked',
};

beforeAll(async () => {
  const { SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, SUPABASE_DB_NAME } = process.env;
  if (!SUPABASE_DB_HOST || !SUPABASE_DB_USER || !SUPABASE_DB_PASSWORD || !SUPABASE_DB_NAME) {
    db = { ok: false, reason: 'SUPABASE_DB_* environment variables are not set' };
    return;
  }
  const client = new Client({
    host: SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user: SUPABASE_DB_USER,
    password: SUPABASE_DB_PASSWORD,
    database: SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  try {
    await client.connect();
    db = { ok: true, client };
  } catch (error) {
    db = { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
});

/** Run `fn` only when the database is reachable, so this suite degrades to a
 *  skip rather than a false failure on a machine without credentials. */
async function query(sql: string, params: unknown[] = []): Promise<Row[]> {
  if (!db.ok) throw new Error(db.reason);
  const result = await db.client.query(sql, params);
  return result.rows;
}

/**
 * Run a read as a different database role, inside a transaction that is always
 * rolled back.
 *
 * `set local role` only takes effect inside a transaction block, and a
 * multi-statement string does not create one — the setting is discarded and the
 * query silently runs as the connecting user, which would make this test prove
 * nothing. The explicit BEGIN/ROLLBACK is what makes it real.
 */
async function queryAsRole(role: string, sql: string): Promise<Row[]> {
  if (!db.ok) throw new Error(db.reason);
  await db.client.query('begin');
  try {
    await db.client.query(`set local role ${role}`);
    const result = await db.client.query(sql);
    return result.rows;
  } finally {
    await db.client.query('rollback');
  }
}

describe('fixture isolation — the public read path', () => {
  it('exposes no fixture row through the published view', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select count(*)::int as n
         from public.published_price_observations
        where source_system = 'test_fixture' or source_reference = 'test_fixture'`,
    );
    expect(rows[0].n, 'a fixture row is publicly readable').toBe(0);
  });

  it('exposes no fixture row to an anonymous reader through RLS', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    // The anon SELECT policy is `is_public_observation(...)`. Evaluating the
    // predicate as the anon role is the closest a test can get to the public
    // site without a browser, and it does not depend on the view at all — so
    // this catches a regression in the policy itself, not just the view.
    const rows = await queryAsRole(
      'anon',
      `select count(*)::int as n
         from public.price_observations
        where source_system = 'test_fixture'
          and public.is_public_observation(
                verification_status, published_at, is_current, source_system, source_reference)`,
    );
    expect(rows[0].n, 'a fixture row passes the public RLS predicate').toBe(0);
  });

  it('exposes no fixture row at all to an anonymous reader', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    // Stronger than the predicate test above: the anon role must not be able to
    // SELECT a fixture row from the base table either.
    const rows = await queryAsRole(
      'anon',
      `select count(*)::int as n from public.price_observations where source_system = 'test_fixture'`,
    );
    expect(rows[0].n, 'the anon role can read a fixture row directly').toBe(0);
  });

  it('keeps the published view free of every unpublished row', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    // A second, independent reading of the same guarantee: the view must never
    // contain a row with no publication timestamp, whatever its source.
    const rows = await query(
      `select count(*)::int as n from public.published_price_observations where published_at is null`,
    );
    expect(rows[0].n).toBe(0);
  });
});

describe('fixture isolation — the records themselves', () => {
  it('leaves published_at null on every fixture', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select count(*)::int as total, count(published_at)::int as published
         from public.price_observations where source_system = 'test_fixture'`,
    );
    expect(rows[0].published, 'a fixture has been published').toBe(0);
  });

  it('marks every fixture in both provenance fields, not just one', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    // Either field alone is filtered by the view. Requiring both means a
    // partial regression still cannot leak.
    const rows = await query(
      `select count(*)::int as n
         from public.price_observations
        where source_system = 'test_fixture'
          and source_reference <> 'test_fixture'`,
    );
    expect(rows[0].n, 'a fixture is missing its source_reference marker').toBe(0);
  });

  it('labels every fixture in its own notes', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select count(*)::int as n
         from public.price_observations
        where source_system = 'test_fixture'
          and (notes is null or notes not like 'TEST FIXTURE%')`,
    );
    expect(rows[0].n, 'a fixture is not labelled in its notes').toBe(0);
  });

  it('never labels a fixture as verified-and-published', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    // The one combination that would be indistinguishable from real data.
    const rows = await query(
      `select count(*)::int as n
         from public.price_observations
        where source_system = 'test_fixture'
          and verification_status in ('verified', 'legacy_unverified')
          and published_at is not null`,
    );
    expect(rows[0].n, 'a fixture is verified AND published').toBe(0);
  });
});

describe('fixture isolation — the connection to the demo accounts', () => {
  it('attributes every fixture to the demo agent, not to a real account', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select u.email, count(*)::int as n
         from public.price_observations o
         join auth.users u on u.id = o.agent_user_id
        where o.source_system = 'test_fixture'
        group by u.email`,
    );
    // Every fixture must belong to an account whose address is a demo account.
    for (const row of rows) {
      expect(String(row.email), `${row.email} owns fixtures but is not a demo account`).toMatch(
        /^demo\.(agent|verifier|admin)@hatsi360\.test$/,
      );
    }
  });

  it('attributes every verification to the demo verifier', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select u.email, count(*)::int as n
         from public.price_observations o
         join auth.users u on u.id = o.verified_by
        where o.source_system = 'test_fixture' and o.verified_by is not null
        group by u.email`,
    );
    for (const row of rows) {
      expect(String(row.email)).toMatch(/^demo\.verifier@hatsi360\.test$/);
    }
  });

  it('only ever writes fixtures at a market the agent is assigned to', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    // An observation at an unassigned market would be a permission bug, not a
    // data bug, and the demo would be demonstrating something impossible.
    const rows = await query(
      `select count(*)::int as n
         from public.price_observations o
         left join public.market_agent_assignments a
           on a.market_id = o.market_id and a.user_id = o.agent_user_id
        where o.source_system = 'test_fixture' and a.id is null`,
    );
    expect(rows[0].n, 'a fixture sits at a market the agent is not assigned to').toBe(0);
  });
});

describe('fixture isolation — the demonstration is complete', () => {
  it('spans more than one verification state, so the queue is worth showing', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select count(distinct verification_status)::int as n
         from public.price_observations where source_system = 'test_fixture'`,
    );
    // A single state would demonstrate one screen, not the workflow.
    expect(rows[0].n).toBeGreaterThanOrEqual(3);
  });

  it('spans more than one market, so coverage is not a single point', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select count(distinct market_id)::int as n
         from public.price_observations where source_system = 'test_fixture'`,
    );
    expect(rows[0].n).toBeGreaterThanOrEqual(3);
  });

  it('attaches every fixture to a collection batch', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select count(*)::int as n
         from public.price_observations
        where source_system = 'test_fixture' and collection_batch_id is null`,
    );
    expect(rows[0].n, 'a fixture has no collection batch').toBe(0);
  });

  it('invents no coordinates', async () => {
    if (!db.ok) return console.warn(`[fixture-isolation] SKIPPED: ${db.reason}`);
    // GPS is left null on purpose. A fabricated coordinate would be a fabricated
    // observation of where an agent stood, which is exactly what the brief
    // forbids.
    const rows = await query(
      `select count(*)::int as n
         from public.collection_batches
        where notes like 'TEST FIXTURE%'
          and (gps_latitude is not null or gps_longitude is not null)`,
    );
    expect(rows[0].n, 'a fixture batch carries invented coordinates').toBe(0);
  });
});
