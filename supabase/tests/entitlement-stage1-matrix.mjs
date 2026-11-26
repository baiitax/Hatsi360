/**
 * Hatsi360 — Stage 1 entitlement acceptance matrix (six contexts).
 *
 * Runs against the throwaway PostgreSQL replica that `npm run verify:migrations`
 * builds (127.0.0.1:55432, database `pluck_live`), NOT against any hosted
 * project. Synthetic records only; every fixture is inserted and removed by
 * this script, and it never connects to production.
 *
 *   npm run verify:migrations        # build/refresh the replica first
 *   node supabase/tests/entitlement-stage1-matrix.mjs
 *
 * What it establishes, in the order the authorisation asked for:
 *
 *   anonymous · authenticated without subscription · active entitled customer ·
 *   expired subscription · staff · administrator
 *
 * per context: what `user_entitlements()` returns, what `has_entitlement()`
 * answers, what `market_reports.reports_public_read` actually reveals, and
 * whether the client-shell RPC path answers or raises.
 *
 * A negative control runs the same checks against the 0016 body (the live
 * production defect) before the repaired body is exercised, so "it was broken"
 * and "it is fixed" are both demonstrated rather than asserted.
 *
 * Exit code 1 if any post-repair expectation fails.
 */

import { Client } from 'pg';

const PORT = Number(process.env.PGPORT ?? 55432);
const DATABASE = process.env.PGDATABASE ?? 'pluck_live';

const U = {
  nosub: 'a0000001-0000-4000-8000-000000000001',
  entitled: 'a0000002-0000-4000-8000-000000000002',
  expired: 'a0000003-0000-4000-8000-000000000003',
  trialEnded: 'a0000004-0000-4000-8000-000000000004',
  cancelled: 'a0000005-0000-4000-8000-000000000005',
  staff: 'a0000006-0000-4000-8000-000000000006',
  admin: 'a0000007-0000-4000-8000-000000000007',
};

const REPORT_IDS = [990001, 990002, 990003, 990004];

const BROKEN_BODY = `
create or replace function public.user_entitlements()
returns setof text language sql stable security definer set search_path = public
as $fn$
  select distinct k.key
  from public.customer_subscriptions s
  cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e(k, v)
  join public.entitlement_catalog c on c.key = e.k
  where s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (s.trial_ends_at is null or s.trial_ends_at > now())
    and coalesce(e.v, 'false')::boolean;
$fn$;
`;

const results = [];
function record(context, check, expected, actual, pass) {
  results.push({ context, check, expected, actual, pass });
}

/** Run one statement as `role` with the given user's JWT claims, always rolled back. */
async function runAs(client, role, userId, sql, params = []) {
  await client.query('begin');
  try {
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query(
        `select set_config('request.jwt.claim.sub', $1, true),
                set_config('request.jwt.claims', $2, true)`,
        [userId, JSON.stringify({ sub: userId, role })]
      );
    }
    const res = await client.query(sql, params);
    return { ok: true, rows: res.rows };
  } catch (error) {
    return { ok: false, code: error.code, message: error.message };
  } finally {
    await client.query('rollback');
  }
}

const fmt = (value) => (value === undefined ? '-' : String(value));

async function setup(client) {
  await teardown(client);

  for (const [label, id] of Object.entries(U)) {
    await client.query(
      `insert into auth.users (id, email, raw_user_meta_data, created_at)
       values ($1, $2, '{}'::jsonb, now())`,
      [id, `${label}@stage1.invalid`]
    );
  }

  // `on_auth_user_created` already created a profile row for each identity, so
  // the role is assigned by upsert rather than insert.
  const roles = { nosub: 'customer', entitled: 'customer', expired: 'customer', trialEnded: 'customer', cancelled: 'customer', staff: 'analyst', admin: 'admin' };
  for (const [label, id] of Object.entries(U)) {
    await client.query(
      `insert into public.profiles (id, full_name, role) values ($1, $2, $3::user_role)
       on conflict (id) do update set full_name = excluded.full_name, role = excluded.role`,
      [id, `Stage1 ${label}`, roles[label]]
    );
  }

  // Active, entitled. `api` is present but false; `not_in_catalog` is absent
  // from the catalogue — both must be excluded, for different reasons.
  await client.query(
    `insert into public.customer_subscriptions
       (user_id, plan, status, starts_at, ends_at, entitlements)
     values ($1, 'professional', 'active', now() - interval '10 days', now() + interval '20 days',
             '{"watchlists":true,"alerts":true,"exports":true,"reports":true,"api":false,"not_in_catalog":true}'::jsonb)`,
    [U.entitled]
  );

  await client.query(
    `insert into public.customer_subscriptions
       (user_id, plan, status, starts_at, ends_at, entitlements)
     values ($1, 'professional', 'active', now() - interval '40 days', now() - interval '1 day',
             '{"reports":true}'::jsonb)`,
    [U.expired]
  );

  await client.query(
    `insert into public.customer_subscriptions
       (user_id, plan, status, starts_at, trial_ends_at, entitlements)
     values ($1, 'trial', 'trialing', now() - interval '30 days', now() - interval '1 day',
             '{"reports":true}'::jsonb)`,
    [U.trialEnded]
  );

  await client.query(
    `insert into public.customer_subscriptions
       (user_id, plan, status, starts_at, ends_at, entitlements)
     values ($1, 'professional', 'cancelled', now() - interval '10 days', now() + interval '20 days',
             '{"reports":true}'::jsonb)`,
    [U.cancelled]
  );

  // market_reports: free+published, premium+published, premium+unpublished, free+unpublished.
  const reports = [
    [REPORT_IDS[0], 'stage1-free-published', 'Stage 1 free published', false, 'now() - interval \'2 days\''],
    [REPORT_IDS[1], 'stage1-premium-published', 'Stage 1 premium published', true, 'now() - interval \'2 days\''],
    [REPORT_IDS[2], 'stage1-premium-unpublished', 'Stage 1 premium unpublished', true, 'null'],
    [REPORT_IDS[3], 'stage1-free-unpublished', 'Stage 1 free unpublished', false, 'null'],
  ];
  for (const [id, slug, title, premium, published] of reports) {
    await client.query(
      `insert into public.market_reports (id, slug, title, is_premium, published_at)
       overriding system value
       values ($1, $2, $3, $4, ${published})`,
      [id, slug, title, premium]
    );
  }

  // Production grants SELECT on market_reports to `anon`; this repository's
  // migrations do not. The anon row of the matrix is meaningless without the
  // production grant, so it is applied here for the duration of the run and
  // removed in teardown. Recorded as a divergence finding, not silently patched.
  await client.query('grant select on public.market_reports to anon');
}

async function teardown(client) {
  await client.query('revoke select on public.market_reports from anon').catch(() => {});
  await client.query('delete from public.market_reports where id = any($1::bigint[])', [REPORT_IDS]).catch(() => {});
  const ids = Object.values(U);
  await client.query('delete from public.customer_subscriptions where user_id = any($1::uuid[])', [ids]).catch(() => {});
  await client.query('delete from public.profiles where id = any($1::uuid[])', [ids]).catch(() => {});
  await client.query('delete from auth.users where id = any($1::uuid[])', [ids]).catch(() => {});
}

const ENTITLEMENTS_SQL = 'select key from public.user_entitlements() key order by 1';
const HAS_REPORTS_SQL = "select public.has_entitlement('reports') as v";
const VISIBLE_SQL = 'select count(*)::int as n from public.market_reports';

async function checkContext(client, context, role, userId, expectations) {
  const ent = await runAs(client, role, userId, ENTITLEMENTS_SQL);
  const actualKeys = ent.ok ? ent.rows.map((r) => r.key) : `ERROR ${ent.code} ${ent.message}`;
  record(context, 'user_entitlements()', expectations.keys.join(',') || '(empty)', Array.isArray(actualKeys) ? actualKeys.join(',') || '(empty)' : actualKeys, ent.ok && actualKeys.join(',') === expectations.keys.join(','));

  const has = await runAs(client, role, userId, HAS_REPORTS_SQL);
  const hasActual = has.ok ? String(has.rows[0].v) : `ERROR ${has.code}`;
  record(context, "has_entitlement('reports')", String(expectations.hasReports), hasActual, has.ok && String(has.rows[0].v) === String(expectations.hasReports));

  const vis = await runAs(client, role, userId, VISIBLE_SQL);
  const visActual = vis.ok ? vis.rows[0].n : `ERROR ${vis.code} ${vis.message}`;
  record(context, 'market_reports rows visible', String(expectations.visible), fmt(visActual), vis.ok && vis.rows[0].n === expectations.visible);
}

async function brokenFunctionControl(client, context, role, userId) {
  // Reproduce the live production body inside a rolled-back transaction.
  await client.query('begin');
  try {
    await client.query(BROKEN_BODY);
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query(
        `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`,
        [userId, JSON.stringify({ sub: userId, role })]
      );
    }
    await client.query(ENTITLEMENTS_SQL);
    record(context, 'PRE-FIX user_entitlements()', 'ERROR 42P01', 'no error', false);
  } catch (error) {
    const pass = error.code === '42P01';
    record(context, 'PRE-FIX user_entitlements()', 'ERROR 42P01', `${error.code} ${error.message}`, pass);
  } finally {
    await client.query('rollback');
  }

  await client.query('begin');
  try {
    await client.query(BROKEN_BODY);
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query(
        `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`,
        [userId, JSON.stringify({ sub: userId, role })]
      );
    }
    // Reading reports forces has_entitlement() to be evaluated for premium rows.
    await client.query("select count(*) from public.market_reports where is_premium");
    record(context, 'PRE-FIX premium report read', 'ERROR 42P01', 'no error', false);
  } catch (error) {
    const pass = error.code === '42P01';
    record(context, 'PRE-FIX premium report read', 'ERROR 42P01', `${error.code} ${error.message}`, pass);
  } finally {
    await client.query('rollback');
  }
}

async function main() {
  const client = new Client({ host: '127.0.0.1', port: PORT, user: 'postgres', database: DATABASE });
  await client.connect();

  try {
    const probe = await client.query("select to_regprocedure('public.user_entitlements()') as fn");
    if (!probe.rows[0].fn) {
      throw new Error('public.user_entitlements() not found — run `npm run verify:migrations` first');
    }

    await setup(client);

    // 1. Negative control: the definition currently live in production.
    await brokenFunctionControl(client, 'anonymous', 'anon', null);
    await brokenFunctionControl(client, 'active entitled', 'authenticated', U.entitled);

    // 2. The repaired definition, across all six contexts.
    await checkContext(client, 'anonymous', 'anon', null, { keys: [], hasReports: false, visible: 1 });
    await checkContext(client, 'authenticated, no subscription', 'authenticated', U.nosub, { keys: [], hasReports: false, visible: 1 });
    await checkContext(client, 'active entitled', 'authenticated', U.entitled, { keys: ['alerts', 'exports', 'reports', 'watchlists'], hasReports: true, visible: 4 });
    await checkContext(client, 'expired subscription', 'authenticated', U.expired, { keys: [], hasReports: false, visible: 1 });
    await checkContext(client, 'trial ended', 'authenticated', U.trialEnded, { keys: [], hasReports: false, visible: 1 });
    await checkContext(client, 'cancelled subscription', 'authenticated', U.cancelled, { keys: [], hasReports: false, visible: 1 });
    await checkContext(client, 'staff (analyst)', 'authenticated', U.staff, { keys: [], hasReports: false, visible: 4 });
    await checkContext(client, 'administrator', 'authenticated', U.admin, { keys: [], hasReports: false, visible: 4 });

    // 3. Client-shell emulation: the layout calls rpc('user_entitlements') and
    //    discards the error, so "answers with an empty set" is the fix it needs.
    const shell = await runAs(client, 'authenticated', U.nosub, 'select count(*)::int as n from public.user_entitlements()');
    record('authenticated, no subscription', 'client-shell rpc user_entitlements', 'answers, 0 rows', shell.ok ? `${shell.rows[0].n} rows` : `ERROR ${shell.code}`, shell.ok && shell.rows[0].n === 0);

    // 4. Boolean/join filtering, stated explicitly.
    const api = await runAs(client, 'authenticated', U.entitled, "select public.has_entitlement('api') as v");
    record('active entitled', "has_entitlement('api') — stored false", 'false', api.ok ? String(api.rows[0].v) : `ERROR ${api.code}`, api.ok && api.rows[0].v === false);
    const ghost = await runAs(client, 'authenticated', U.entitled, "select public.has_entitlement('not_in_catalog') as v");
    record('active entitled', "has_entitlement('not_in_catalog') — catalogue join", 'false', ghost.ok ? String(ghost.rows[0].v) : `ERROR ${ghost.code}`, ghost.ok && ghost.rows[0].v === false);

    await teardown(client);
  } finally {
    await client.end();
  }

  // Report
  const width = { context: 30, check: 42, expected: 40 };
  console.log('\n=== Stage 1 entitlement acceptance matrix (local replica, synthetic data) ===\n');
  let current = '';
  for (const r of results) {
    if (r.context !== current) {
      current = r.context;
      console.log(`\n[${r.context}]`);
    }
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.check.padEnd(width.check)} expected ${r.expected.padEnd(width.expected)} got ${r.actual}`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log(`\n${failed.length} FAILED`);
    process.exitCode = 1;
  } else {
    console.log('ALL STAGE 1 EXPECTATIONS MET');
  }
}

await main();
