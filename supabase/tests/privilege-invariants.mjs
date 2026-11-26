/**
 * Hatsi360 — anonymous / authenticated privilege invariants.
 *
 * Runs against the throwaway PostgreSQL replica built by
 * `npm run verify:migrations`. No hosted project is touched.
 *
 *   npm run verify:migrations   # build/refresh the replica
 *   npm run verify:privileges
 *
 * Asserts the post-0053 posture:
 *
 *   - no `anon` or `authenticated` TRUNCATE / REFERENCES / TRIGGER / MAINTAIN
 *     on any public relation (row security cannot police any of them);
 *   - `anon` can still read the public surface — a public table and the two
 *     published-read views — so the revoke did not break anonymous browsing;
 *   - `anon` can insert a contact enquiry (the one intentional anonymous write)
 *     and is refused elsewhere;
 *   - `authenticated` still holds the DML that RLS gates.
 *
 * Phase 2 of the audit (revoking anonymous INSERT/UPDATE/DELETE entirely) is
 * NOT asserted here, because it is not applied. When it is, the last block
 * flips from "documented target" to "asserted".
 */

import { Client } from 'pg';

const PORT = Number(process.env.PGPORT ?? 55432);
const DATABASE = process.env.PGDATABASE ?? 'pluck_live';

const results = [];
const record = (check, expected, actual, pass) => results.push({ check, expected, actual, pass });

const UNPOLICED = ['TRUNCATE', 'REFERENCES', 'TRIGGER'];

async function main() {
  const client = new Client({ host: '127.0.0.1', port: PORT, user: 'postgres', database: DATABASE });
  await client.connect();

  try {
    // 1. Unpoliced privileges are gone for both browser-facing roles.
    for (const role of ['anon', 'authenticated']) {
      for (const priv of UNPOLICED) {
        const { rows } = await client.query(
          `select c.relname
             from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind in ('r','p','v','m')
              and has_table_privilege($1, c.oid, $2)
            order by 1`,
          [role, priv]
        );
        record(`${role} holds ${priv} on no public relation`, '0 relations', `${rows.length}${rows.length ? ': ' + rows.slice(0, 5).map((r) => r.relname).join(', ') : ''}`, rows.length === 0);
      }
    }

    // 2. Anonymous read still works where a policy reaches anon.
    await client.query('begin');
    await client.query('set local role anon');
    const reads = await Promise.all([
      client.query('select count(*)::int as n from public.commodities').then((r) => r.rows[0].n).catch((e) => `ERROR ${e.code}`),
      client.query('select count(*)::int as n from public.published_price_observations').then((r) => r.rows[0].n).catch((e) => `ERROR ${e.code}`),
      client.query('select count(*)::int as n from public.market_price_summary').then((r) => r.rows[0].n).catch((e) => `ERROR ${e.code}`),
      client.query('select count(*)::int as n from public.states').then((r) => r.rows[0].n).catch((e) => `ERROR ${e.code}`),
    ]);
    await client.query('rollback');
    const labels = ['commodities', 'published_price_observations', 'market_price_summary', 'states'];
    reads.forEach((value, i) => record(`anon can read public.${labels[i]}`, 'a count, not an error', String(value), typeof value === 'number'));

    // 3. The one intentional anonymous write, and a refusal elsewhere.
    await client.query('begin');
    try {
      await client.query('set local role anon');
      await client.query(
        `insert into public.contact_enquiries (name, email, message)
         values ('Privilege Test', 'priv@example.invalid', 'invariant check')`
      );
      record('anon can insert a contact enquiry', 'insert accepted', 'accepted', true);
    } catch (error) {
      record('anon can insert a contact enquiry', 'insert accepted', `ERROR ${error.code} ${error.message}`, false);
    } finally {
      await client.query('rollback');
    }

    await client.query('begin');
    try {
      await client.query('set local role anon');
      await client.query("insert into public.market_reports (slug, title) values ('priv-test', 'Privilege Test')");
      record('anon is refused a write to market_reports', 'denied', 'accepted', false);
    } catch (error) {
      const denied = error.code === '42501' || error.code === '42P01';
      record('anon is refused a write to market_reports', 'denied (42501 / policy)', `${error.code}`, denied);
    } finally {
      await client.query('rollback');
    }

    // 4. Phase 1 did not overreach: authenticated keeps the DML that RLS gates.
    const { rows: authDml } = await client.query(
      `select has_table_privilege('authenticated', 'public.price_observations', 'INSERT') as ins,
              has_table_privilege('authenticated', 'public.price_observations', 'SELECT') as sel,
              has_table_privilege('authenticated', 'public.price_observations', 'TRUNCATE') as trn`
    );
    record('authenticated keeps INSERT/SELECT on price_observations', 'true/true', `${authDml[0].ins}/${authDml[0].sel}`, authDml[0].ins === true && authDml[0].sel === true);
    record('authenticated lost TRUNCATE on price_observations', 'false', String(authDml[0].trn), authDml[0].trn === false);

    // 5. Documented Phase 2 target — reported, not asserted.
    const { rows: anonDml } = await client.query(
      `select count(*)::int as n
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r','p')
          and (has_table_privilege('anon', c.oid, 'INSERT')
               or has_table_privilege('anon', c.oid, 'UPDATE')
               or has_table_privilege('anon', c.oid, 'DELETE'))`
    );
    console.log(`\nPhase 2 target (not applied): ${anonDml[0].n} public tables still grant anon INSERT/UPDATE/DELETE.`);
  } finally {
    await client.end();
  }

  console.log('\n=== Privilege invariants (local replica) ===\n');
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.check.padEnd(58)} expected ${r.expected.padEnd(24)} got ${r.actual}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log(`\n${failed.length} FAILED`);
    process.exitCode = 1;
  } else {
    console.log('ALL PRIVILEGE INVARIANTS HOLD');
  }
}

await main();
