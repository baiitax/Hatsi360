/**
 * Hatsi360 — guard validation for the proposed supabase_admin default-privilege
 * migration (supabase/proposed/0055_supabase_admin_default_privileges.sql).
 *
 * Runs against the throwaway PostgreSQL replica built by
 * `npm run verify:migrations`. No hosted project is touched, and nothing is
 * applied anywhere: every branch runs inside a transaction that is rolled back.
 *
 * Three branches are exercised, because the proposal's behaviour depends on
 * both the presence of the `supabase_admin` role and the caller's authority:
 *
 *   1. role absent          -> no-op, no error (the replica's normal state)
 *   2. role present + right -> revokes exactly the four unpoliced privileges,
 *                              leaving INSERT/SELECT/UPDATE/DELETE intact
 *   3. role present + wrong -> raises 42501 instead of silently skipping
 *
 * Branch 2 is the one that matters: it proves the remediation does what it
 * claims on a faithful default ACL. It is still not production evidence — the
 * production credential lacks the authority branch 2 requires.
 */

import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

const PORT = Number(process.env.PGPORT ?? 55432);
const DATABASE = process.env.PGDATABASE ?? 'pluck_live';
const PROPOSAL = new URL('../proposed/0055_supabase_admin_default_privileges.sql', import.meta.url);

const results = [];
const record = (check, expected, actual, pass) => results.push({ check, expected, actual, pass });

const ACL_EXPANSION = `
  select a.grantee::regrole::text as grantee, a.privilege_type
  from pg_default_acl d
  cross join lateral aclexplode(d.defaclacl) a
  where d.defaclrole = (select oid from pg_roles where rolname = 'supabase_admin')
    and d.defaclnamespace = 'public'::regnamespace
    and d.defaclobjtype = 'r'
  order by 1, 2`;

async function main() {
  const sql = await readFile(PROPOSAL, 'utf8');
  const client = new Client({ host: '127.0.0.1', port: PORT, user: 'postgres', database: DATABASE });
  await client.connect();

  try {
    // ---- branch 1: role absent -> no-op --------------------------------
    await client.query('begin');
    let branch1;
    try {
      await client.query(sql);
      branch1 = 'no error';
    } catch (error) {
      branch1 = `ERROR ${error.code} ${error.message}`;
    } finally {
      await client.query('rollback');
    }
    record('role absent: proposal is a no-op', 'no error', branch1, branch1 === 'no error');

    const absent = await client.query("select count(*)::int as n from pg_default_acl where defaclrole = (select oid from pg_roles where rolname='supabase_admin')");
    record('role absent: no default ACL created', '0', String(absent.rows[0].n), absent.rows[0].n === 0);

    // ---- branch 2: role present + authority -> revokes ------------------
    await client.query('begin');
    try {
      await client.query('create role supabase_admin superuser login');
      // Reproduce production's default ACL faithfully: all four grantees carry
      // an explicit `arwdDxtm` entry for this grantor, including postgres and
      // service_role.
      await client.query(
        "alter default privileges for role supabase_admin in schema public grant all on tables to anon, authenticated, postgres, service_role"
      );
      const before = await client.query(ACL_EXPANSION);
      const beforeAnon = before.rows.filter((r) => r.grantee === 'anon').map((r) => r.privilege_type);
      record(
        'reproduced production default ACL for anon',
        '8 privileges',
        `${beforeAnon.length} (${beforeAnon.join(',')})`,
        beforeAnon.length === 8
      );

      await client.query(sql);
      const after = await client.query(ACL_EXPANSION);
      const anon = after.rows.filter((r) => r.grantee === 'anon').map((r) => r.privilege_type).sort();
      const auth = after.rows.filter((r) => r.grantee === 'authenticated').map((r) => r.privilege_type).sort();
      const expected = 'DELETE,INSERT,SELECT,UPDATE';

      record('authorised: anon default limited to DML', expected, anon.join(','), anon.join(',') === expected);
      record('authorised: authenticated default limited to DML', expected, auth.join(','), auth.join(',') === expected);

      const unpoliced = after.rows.filter(
        (r) => ['anon', 'authenticated'].includes(r.grantee) && ['TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'].includes(r.privilege_type)
      );
      record('authorised: no unpoliced privilege left for browser roles', '0 rows', `${unpoliced.length} rows`, unpoliced.length === 0);

      const owner = after.rows.filter((r) => r.grantee === 'postgres').map((r) => r.privilege_type);
      record('authorised: postgres keeps TRUNCATE (legitimate)', 'present', owner.includes('TRUNCATE') ? 'present' : 'missing', owner.includes('TRUNCATE'));

      const svc = after.rows.filter((r) => r.grantee === 'service_role').map((r) => r.privilege_type);
      record('authorised: service_role keeps TRUNCATE (maintenance)', 'present', svc.includes('TRUNCATE') ? 'present' : 'missing', svc.includes('TRUNCATE'));
    } finally {
      await client.query('rollback');
    }

    // ---- branch 3: role present + no authority -> loud failure ----------
    await client.query('begin');
    try {
      await client.query('create role supabase_admin superuser login');
      await client.query('set local role anon');
      let outcome;
      try {
        await client.query(sql);
        outcome = 'no error';
      } catch (error) {
        outcome = error.code;
      }
      record('no authority: proposal raises 42501 instead of skipping', '42501', String(outcome), outcome === '42501');
    } finally {
      await client.query('rollback');
    }
  } finally {
    await client.end();
  }

  console.log('\n=== Proposed 0055 guard validation (local replica, rolled back) ===\n');
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.check.padEnd(58)} expected ${r.expected.padEnd(28)} got ${r.actual}`);
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log(`\n${failed.length} FAILED`);
    process.exitCode = 1;
  } else {
    console.log('ALL BRANCHES BEHAVE AS DESIGNED');
  }
}

await main();
