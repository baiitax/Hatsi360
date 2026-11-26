/**
 * Phase 4 — Workstream A (resolver) and Workstream D (report access).
 *
 * Local PostgreSQL integration test: real functions, real RLS, real roles.
 * It is NOT a hosted acceptance test and does not establish PostgREST
 * behaviour — see PHASE_4_INTEGRATION_TEST_REPORT.md.
 */
import { connect, applyFiles, runAs, seedUsers, seedSubscriptions, IDs, BROKEN_RESOLVER, makeRecorder } from './lib/pg-harness.mjs';

const PROPOSALS = [
  'supabase/proposed/0056_entitlement_resolver_repair.sql',
  'supabase/proposed/0058_reports_access_policy.sql',
];

const rec = makeRecorder();
const { check } = rec;

const client = await connect();

try {
  await client.query('begin');
  await applyFiles(client, PROPOSALS);
  await seedUsers(client);
  await seedSubscriptions(client);

  // Production grants anon SELECT on market_reports (verified: an anonymous
  // read returns 0 rows rather than 42501). The replica's 0009 grant file does
  // not, so the grant is reproduced here — the subject under test is the
  // policy, not the grant.
  await client.query('grant select on public.market_reports to anon, authenticated');

  // Fixture reports: one public, one premium, both published.
  await client.query(
    `insert into public.market_reports (title, slug, summary, body, is_premium, published_at)
     values ('Phase4 public report', 'phase4-public', 'summary', 'body', false, now()),
            ('Phase4 premium report', 'phase4-premium', 'summary', 'body', true, now())`,
  ).catch(async () => {
    // Fall back to the minimum columns if the table shape differs.
    await client.query(
      `insert into public.market_reports (title, slug, is_premium, published_at)
       values ('Phase4 public report', 'phase4-public', false, now()),
              ('Phase4 premium report', 'phase4-premium', true, now())`,
    );
  });

  // ── resolver per subscription context ───────────────────────────────────
  const contexts = [
    ['anonymous', 'anon', null, ''],
    ['authenticated, no subscription', 'authenticated', IDs.nosub, ''],
    ['active, all keys', 'authenticated', IDs.entitled, 'alerts,api,bulk,exports,reports,watchlists'],
    ['expired by ends_at', 'authenticated', IDs.expired, ''],
    ['trial ended', 'authenticated', IDs.trialEnded, ''],
    ['cancelled', 'authenticated', IDs.cancelled, ''],
    ['past_due', 'authenticated', IDs.pastDue, ''],
    ['trialing, in window', 'authenticated', IDs.trialing, 'alerts,api,bulk,exports,reports,watchlists'],
  ];

  for (const [label, role, userId, expected] of contexts) {
    const r = await runAs(client, role, userId, 'select * from public.user_entitlements()');
    check(label, 'keys', expected || '(none)', r.ok ? r.rows.map((x) => x.user_entitlements).sort().join(',') : `${r.code} ${r.message}`, r.ok && r.rows.map((x) => x.user_entitlements).sort().join(',') === expected);
  }

  // ── the two robustness cases 0016 could not survive ─────────────────────
  const malformed = await runAs(client, 'authenticated', IDs.malformed, "select public.has_entitlement('reports') as v");
  check('malformed stored value', "has_entitlement('reports') does not raise", 'false', malformed.ok ? malformed.rows[0].v : `${malformed.code} ${malformed.message}`, malformed.ok && malformed.rows[0].v === false);
  const ghost = await runAs(client, 'authenticated', IDs.ghost, "select public.has_entitlement('not_in_catalog') as v");
  check('key absent from catalogue', 'ignored, reports still granted', 'false only for the unknown key', ghost.ok ? `${ghost.rows[0].v}` : `${ghost.code}`, ghost.ok && ghost.rows[0].v === false);

  const nullKey = await runAs(client, 'authenticated', IDs.entitled, 'select public.has_entitlement(null) as v');
  check('null key', 'false, no raise', 'false', nullKey.ok ? nullKey.rows[0].v : `${nullKey.code}`, nullKey.ok && nullKey.rows[0].v === false);

  // ── staff/admin truth (they bypass policies, they do not hold keys) ─────
  const staff = await runAs(client, 'authenticated', IDs.staff, "select public.is_staff() as s, public.has_entitlement('reports') as h");
  check('staff', 'is_staff true, holds no key', 'true/false', staff.ok ? `${staff.rows[0].s}/${staff.rows[0].h}` : staff.code, staff.ok && staff.rows[0].s === true && staff.rows[0].h === false);

  const admin = await runAs(client, 'authenticated', IDs.admin, "select public.is_admin() as a, public.has_entitlement('reports') as h");
  check('admin', 'is_admin true, holds no key', 'true/false', admin.ok ? `${admin.rows[0].a}/${admin.rows[0].h}` : admin.code, admin.ok && admin.rows[0].a === true && admin.rows[0].h === false);

  // ── report access matrix (Workstream D) ─────────────────────────────────
  const visible = async (role, userId) => {
    const r = await runAs(client, role, userId, "select count(*)::int as n from public.market_reports");
    return r.ok ? r.rows[0].n : `${r.code} ${r.message}`;
  };

  check('reports: anonymous', 'sees public only', 1, await visible('anon', null), (await visible('anon', null)) === 1);
  check('reports: authenticated, no entitlement', 'sees public only', 1, await visible('authenticated', IDs.nosub), (await visible('authenticated', IDs.nosub)) === 1);
  check('reports: authenticated, entitled', 'sees both', 2, await visible('authenticated', IDs.entitled), (await visible('authenticated', IDs.entitled)) === 2);
  check('reports: staff', 'sees both', 2, await visible('authenticated', IDs.staff), (await visible('authenticated', IDs.staff)) === 2);
  check('reports: service_role', 'bypasses RLS, sees both', 2, await visible('service_role', null), (await visible('service_role', null)) === 2);

  // ── the outage test: resolver broken, reports must still serve ──────────
  await client.query(`savepoint broken`);
  // A LANGUAGE sql body is validated at creation, so the broken body can only
  // be installed with function-body checking off — which is how 0016 reached
  // production in the first place.
  await client.query('set local check_function_bodies = off');
  await client.query(BROKEN_RESOLVER);

  const brokenAnon = await runAs(client, 'anon', null, 'select count(*)::int as n from public.market_reports');
  check('reports: anonymous, resolver BROKEN', 'still 1 — no public outage', 1, brokenAnon.ok ? brokenAnon.rows[0].n : `${brokenAnon.code} ${brokenAnon.message}`, brokenAnon.ok && brokenAnon.rows[0].n === 1);

  const brokenEntitled = await runAs(client, 'authenticated', IDs.entitled, 'select count(*)::int as n from public.market_reports');
  check('reports: entitled, resolver BROKEN', 'fail-closed to 1', 1, brokenEntitled.ok ? brokenEntitled.rows[0].n : `${brokenEntitled.code}`, brokenEntitled.ok && brokenEntitled.rows[0].n === 1);

  const safe = await runAs(client, 'authenticated', IDs.entitled, "select public.has_entitlement_safe('reports') as v");
  check('has_entitlement_safe under failure', 'false, no raise', 'false', safe.ok ? safe.rows[0].v : `${safe.code}`, safe.ok && safe.rows[0].v === false);

  const strict = await runAs(client, 'authenticated', IDs.entitled, "select public.has_entitlement('reports') as v");
  check('has_entitlement under failure', 'still raises — the defect stays visible', '42P01', strict.ok ? 'no error' : strict.code, !strict.ok && strict.code === '42P01');

  await client.query(`rollback to savepoint broken`);
  await client.query(`release savepoint broken`);

  // ── the repaired resolver is restored and unchanged ─────────────────────
  const restored = await runAs(client, 'authenticated', IDs.entitled, 'select count(*)::int as n from public.user_entitlements()');
  check('after rollback', 'resolver repaired again', 6, restored.ok ? restored.rows[0].n : `${restored.code}`, restored.ok && restored.rows[0].n === 6);
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

rec.report('Phase 4 integration — entitlement resolver and report access');
