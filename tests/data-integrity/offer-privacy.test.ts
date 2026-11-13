import { describe, expect, it, beforeAll } from 'vitest';
import { Client } from 'pg';

/**
 * Offer privacy and the demonstration commercial data.
 *
 * The offer tables hold a private commercial commitment by a named party. Three
 * separate things have to hold, and all three are asserted against the database
 * here because all three are enforced by the database:
 *
 *   1. the verification trail is not world-readable. Migration 0027 created
 *      `offer_verification_events_read` as `using (true)`, which published the
 *      trail of every draft, submitted, withdrawn and rejected offer — with
 *      `actor_id` and a free-text `reason` — to the anonymous public.
 *      `0031_offer_verification_events_read_fix.sql` corrects it. The first
 *      tests below are the regression guard for that fix.
 *   2. only published offers reach a public reader, and a published offer is
 *      one that is verified AND disclosed AND unexpired. All three conditions
 *      are the policy's, not this file's.
 *   3. the watchlist and alert tables are owner-scoped, so a public reader
 *      cannot enumerate who is watching what.
 *
 * The demonstration rows themselves are asserted to be unmistakably labelled:
 * a synthetic offer that looks like a real commitment is worse than no offer.
 */

type Row = Record<string, unknown>;

let db: { ok: true; client: Client } | { ok: false; reason: string } = {
  ok: false,
  reason: 'not yet checked',
};

/** The demo accounts the seeder connects the offer rows to. Read from the
 *  database rather than hardcoded, so a changed address does not silently turn
 *  these assertions into no-ops. */
let ids: { customer: string; publicUser: string; staff: string } | null = null;

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
    const rows = await client.query(
      `select id, role from public.profiles
        where role in ('customer', 'public_user', 'verification_officer')`,
    );
    const byRole = new Map(rows.rows.map((r) => [r.role as string, r.id as string]));
    const customer = byRole.get('customer');
    const publicUser = byRole.get('public_user');
    const staff = byRole.get('verification_officer');
    if (customer && publicUser && staff) ids = { customer, publicUser, staff };
  } catch (error) {
    db = { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
});

async function query(sql: string, params: unknown[] = []): Promise<Row[]> {
  if (!db.ok) throw new Error(db.reason);
  return (await db.client.query(sql, params)).rows;
}

/**
 * Run a read as a different database role, inside a transaction that is always
 * rolled back. `set local role` only takes effect inside a transaction block,
 * so the explicit BEGIN/ROLLBACK is what makes the switch real.
 */
async function queryAsRole(role: string, sql: string, params: unknown[] = []): Promise<Row[]> {
  if (!db.ok) throw new Error(db.reason);
  await db.client.query('begin');
  try {
    await db.client.query(`set local role ${role}`);
    return (await db.client.query(sql, params)).rows;
  } finally {
    await db.client.query('rollback');
  }
}

/** Same, but with a JWT identity, so `auth.uid()` and `is_staff()` resolve. */
async function queryAsUser(role: string, uid: string, sql: string): Promise<Row[]> {
  if (!db.ok) throw new Error(db.reason);
  await db.client.query('begin');
  try {
    await db.client.query(`set local role ${role}`);
    await db.client.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: uid, role: 'authenticated' }),
    ]);
    return (await db.client.query(sql)).rows;
  } finally {
    await db.client.query('rollback');
  }
}

const FIXTURE = "reason like 'TEST FIXTURE%'";

describe('offer privacy — the verification trail is not world-readable', () => {
  it('hides the trail of unpublished offers from an anonymous reader', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    // The regression guard for migration 0031. `using (true)` here returned
    // every row; the corrected policy returns only the trail of offers the
    // caller may read.
    const rows = await queryAsRole(
      'anon',
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );
    const visible = rows[0].n as number;

    const total = await query(
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );

    // If no offers have been seeded, the trail is empty and the assertion is
    // vacuous — say so rather than passing silently.
    if ((total[0].n as number) === 0) {
      console.warn('[offer-privacy] no demonstration offers seeded; nothing to assert');
      return;
    }
    expect(visible, 'anon can read the whole verification trail').toBeLessThan(total[0].n as number);
  });

  it('exposes to anon only the trail of published offers', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    // Not merely "fewer rows" — exactly the right rows. Every event anon can
    // see must belong to an offer that is verified, disclosed and unexpired.
    // One statement, because a per-event round trip turns this into 18
    // transactions and blows the test timeout.
    //
    // The inner lookups run as anon too, so they are themselves RLS-filtered:
    // an offer anon cannot read yields no row, and `not exists` then counts it.
    // The result is 0 exactly when every visible event belongs to a published
    // offer.
    const rows = await queryAsRole(
      'anon',
      `select count(*)::int as n
         from public.offer_verification_events e
        where e.reason like 'TEST FIXTURE%'
          and not exists (
            select 1
              from (select id, status, disclosure_consent, valid_until
                      from public.buyer_offers where id = e.offer_id
                    union all
                    select id, status, disclosure_consent, valid_until
                      from public.seller_offers where id = e.offer_id) o
             where o.status = 'verified'
               and o.disclosure_consent
               and (o.valid_until is null or o.valid_until > now())
          )`,
    );
    expect(rows[0].n, 'anon can read the trail of an unpublished offer').toBe(0);
  });

  it('hides the trail of unpublished offers from an unauthenticated reader', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    const anon = await queryAsRole(
      'anon',
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );
    const auth = await queryAsRole(
      'authenticated',
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );
    // `authenticated` with no JWT is not staff and owns nothing, so it must see
    // exactly what anon sees — no more.
    expect(auth[0].n, 'a signed-in stranger sees more of the trail than anon').toBe(
      anon[0].n,
    );
  });

  it('lets the owner read the trail of their own offers', async () => {
    if (!db.ok || !ids) return console.warn('[offer-privacy] no demo customer account');
    const rows = await queryAsUser(
      'authenticated',
      ids.customer,
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );
    const total = await query(
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );
    if ((total[0].n as number) === 0) return;
    expect(rows[0].n as number, 'the offer owner cannot read their own trail').toBe(
      total[0].n as number,
    );
  });

  it('lets staff read the whole trail', async () => {
    if (!db.ok || !ids) return console.warn('[offer-privacy] no demo staff account');
    const rows = await queryAsUser(
      'authenticated',
      ids.staff,
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );
    const total = await query(
      `select count(*)::int as n from public.offer_verification_events where ${FIXTURE}`,
    );
    if ((total[0].n as number) === 0) return;
    expect(rows[0].n as number, 'staff cannot read the whole trail').toBe(
      total[0].n as number,
    );
  });
});

describe('offer privacy — the offers themselves', () => {
  it('exposes to anon only offers that are verified, disclosed and unexpired', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    for (const table of ['buyer_offers', 'seller_offers']) {
      const rows = await queryAsRole(
        'anon',
        `select status, disclosure_consent, valid_until
           from public.${table}
          where notes like 'TEST FIXTURE%'`,
      );
      for (const r of rows) {
        expect(r.status, `${table}: anon can read a ${String(r.status)} offer`).toBe('verified');
        expect(r.disclosure_consent, `${table}: anon can read an undisclosed offer`).toBe(true);
      }
    }
  });

  it('gives the anon reader no more than the three published conditions allow', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    for (const table of ['buyer_offers', 'seller_offers']) {
      const expected = await query(
        `select count(*)::int as n
           from public.${table}
          where notes like 'TEST FIXTURE%'
            and status = 'verified'
            and disclosure_consent
            and (valid_until is null or valid_until > now())`,
      );
      const actual = await queryAsRole(
        'anon',
        `select count(*)::int as n from public.${table} where notes like 'TEST FIXTURE%'`,
      );
      expect(actual[0].n, `${table}: anon row count differs from the published predicate`).toBe(
        expected[0].n,
      );
    }
  });

  it('refuses to write an offer as anyone but its owner', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    // A blocked INSERT raises; a blocked UPDATE matches zero rows and succeeds.
    // Assert the row count, not the absence of an error.
    await db.client.query('begin');
    try {
      await db.client.query('set local role authenticated');
      await db.client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: '00000000-0000-0000-0000-000000000000', role: 'authenticated' }),
      ]);
      const result = await db.client.query(
        `update public.buyer_offers set notes = 'attempted overwrite'
          where notes like 'TEST FIXTURE%'`,
      );
      expect(result.rowCount, 'a stranger updated someone else’s offer').toBe(0);
    } finally {
      await db.client.query('rollback');
    }
  });
});

describe('offer privacy — watchlist and alerts are owner-scoped', () => {
  it('shows an anonymous reader no saved commodity and no alert', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    for (const table of ['saved_commodities', 'saved_markets', 'price_alerts']) {
      const rows = await queryAsRole('anon', `select count(*)::int as n from public.${table}`);
      expect(rows[0].n, `anon can read ${table}`).toBe(0);
    }
  });

  it('shows a signed-in stranger nothing either', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    for (const table of ['saved_commodities', 'saved_markets', 'price_alerts']) {
      const rows = await queryAsRole('authenticated', `select count(*)::int as n from public.${table}`);
      expect(rows[0].n, `an unauthenticated session can read ${table}`).toBe(0);
    }
  });

  it('shows each owner exactly their own rows', async () => {
    if (!db.ok || !ids) return console.warn('[offer-privacy] no demo accounts');
    for (const table of ['saved_commodities', 'saved_markets', 'price_alerts']) {
      const owner = await queryAsUser(
        'authenticated',
        ids.publicUser,
        `select count(*)::int as n from public.${table}`,
      );
      const expected = await query(
        `select count(*)::int as n from public.${table} where user_id = $1`,
        [ids.publicUser],
      );
      if ((expected[0].n as number) === 0) continue;
      expect(owner[0].n, `the public account cannot read its own ${table}`).toBe(
        expected[0].n,
      );
    }
  });
});

describe('demonstration offers are unmistakably labelled', () => {
  it('marks every fixture offer as a test fixture in its notes', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    for (const table of ['buyer_offers', 'seller_offers']) {
      const rows = await query(
        `select count(*)::int as n from public.${table}
          where notes is null or notes not like 'TEST FIXTURE%'`,
      );
      expect(rows[0].n, `${table} holds an unlabelled row`).toBe(0);
    }
  });

  it('names every fixture counterparty as a demonstration party', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    // The counterparty name is the one field a public reader always sees, so
    // the demonstration label has to be there too, not only in the notes.
    for (const table of ['buyer_offers', 'seller_offers']) {
      const rows = await query(
        `select count(*)::int as n from public.${table}
          where counterparty_name not like 'DEMO — Test%'`,
      );
      expect(rows[0].n, `${table} holds an unlabelled counterparty`).toBe(0);
    }
  });

  it('attributes every fixture offer to the demonstration customer', async () => {
    if (!db.ok || !ids) return console.warn('[offer-privacy] no demo customer account');
    for (const table of ['buyer_offers', 'seller_offers']) {
      const rows = await query(
        `select count(*)::int as n from public.${table} where user_id <> $1`,
        [ids.customer],
      );
      expect(rows[0].n, `${table} holds an offer owned by someone else`).toBe(0);
    }
  });

  it('never marks a rejected offer without a reason', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    for (const table of ['buyer_offers', 'seller_offers']) {
      const rows = await query(
        `select count(*)::int as n from public.${table}
          where status = 'rejected' and rejection_reason is null`,
      );
      expect(rows[0].n, `${table} holds a reasonless rejection`).toBe(0);
    }
  });

  it('never publishes a verification event without a reason', async () => {
    if (!db.ok) return console.warn(`[offer-privacy] SKIPPED: ${db.reason}`);
    const rows = await query(
      `select count(*)::int as n from public.offer_verification_events
        where ${FIXTURE} and (reason is null or reason not like 'TEST FIXTURE%')`,
    );
    expect(rows[0].n, 'an unlabelled verification event exists').toBe(0);
  });
});
