/**
 * Phase 5 — Workstream A: independent, mechanical review of the proposed
 * migrations. Applies them on the local replica (in one rolled-back
 * transaction) and inspects what they actually produce: idempotency, function
 * security properties, grants, policy roles and transaction control.
 *
 * These are review assertions about the SQL as written. They are not a
 * statement that the SQL is correct for production data.
 */
import { readFile } from 'node:fs/promises';
import { connect, applyFiles, applyFileInsideTransaction, makeRecorder } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;

const P = {
  resolver: 'supabase/proposed/0056_entitlement_resolver_repair.sql',
  enforcement: 'supabase/proposed/0057_entitlement_rls_enforcement.sql',
  reports: 'supabase/proposed/0058_reports_access_policy.sql',
  b2b: 'supabase/proposed/0059_b2b_security_hardening.sql',
  grants: 'supabase/proposed/0060_service_role_grant_drift.sql',
};

// ── static: transaction control ──────────────────────────────────────────
for (const [name, path] of Object.entries(P)) {
  const sql = await readFile(path, 'utf8');
  const hasTopLevelTxn = /^\s*(begin|commit|rollback)\s*;/im.test(sql);
  check('static', `${name}: no embedded transaction control`, 'none', hasTopLevelTxn ? 'found' : 'none', !hasTopLevelTxn);
  check('static', `${name}: has a self-check block`, 'DO block present', /do \$\$/i.test(sql) ? 'present' : 'absent', /do \$\$/i.test(sql));
}

const client = await connect();
try {
  await client.query('begin');

  // ── idempotency ────────────────────────────────────────────────────────
  for (const [name, path] of [['0056', P.resolver], ['0057', P.enforcement], ['0058', P.reports], ['0060', P.grants]]) {
    let first = 'ok';
    let second = 'ok';
    try { await applyFiles(client, [path]); } catch (e) { first = e.message; }
    try { await applyFiles(client, [path]); } catch (e) { second = e.message; }
    check('idempotency', `${name} applied twice`, 'no error', `${first === 'ok' ? 'ok' : first} / ${second === 'ok' ? 'ok' : second}`, first === 'ok' && second === 'ok');
  }

  let b2b = 'ok';
  try {
    await applyFileInsideTransaction(client, 'supabase/migrations/0047_stage4_rfq_orders.sql');
    await applyFiles(client, [P.b2b]);
    await applyFiles(client, [P.b2b]);
  } catch (e) { b2b = e.message; }
  check('idempotency', '0047 + 0059 applied, then 0059 again', 'no error', b2b, b2b === 'ok');

  // ── function security properties ───────────────────────────────────────
  const fns = await client.query(`
    select p.proname,
           p.prosecdef as secdef,
           p.provolatile as volatility,
           p.proconfig as config,
           p.proargnames as argnames,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'user_entitlements','has_entitlement','has_entitlement_safe','can_perform_bulk_operations',
      'create_order_from_quote','expire_old_rfqs','generate_order_number',
      'guard_order_transition','guard_supplier_verification','record_order_transition')`);

  const byName = Object.fromEntries(fns.rows.map((r) => [r.proname, r]));

  const pathPinned = (r) => (r.config ?? []).some((c) => c.startsWith('search_path='));
  const unpinned = fns.rows.filter((r) => r.secdef && !pathPinned(r)).map((r) => r.proname);
  check('functions', 'every SECURITY DEFINER function pins search_path', 'none unpinned', unpinned.join(', ') || 'none', unpinned.length === 0);

  check('functions', 'has_entitlement argument name', 'p_key', JSON.stringify(byName.has_entitlement?.argnames), JSON.stringify(byName.has_entitlement?.argnames) === '["p_key"]');
  check('functions', 'one has_entitlement overload only', '1', fns.rows.filter((r) => r.proname === 'has_entitlement').length, fns.rows.filter((r) => r.proname === 'has_entitlement').length === 1);
  check('functions', 'user_entitlements volatility', 'stable', byName.user_entitlements?.volatility, byName.user_entitlements?.volatility === 's');

  const guards = ['guard_order_transition', 'guard_supplier_verification'];
  const guardSecdef = guards.filter((g) => byName[g]?.secdef);
  check('functions', 'guards are SECURITY INVOKER', 'neither is definer', guardSecdef.join(', ') || 'neither', guardSecdef.length === 0);

  const safeSrc = (await client.query(`select pg_get_functiondef('public.has_entitlement_safe(text)'::regprocedure) as d`)).rows[0].d;
  check('functions', 'safe wrapper has an exception handler', 'EXCEPTION present', /exception\s+when\s+others/i.test(safeSrc) ? 'present' : 'absent', /exception\s+when\s+others/i.test(safeSrc));
  check('functions', 'safe wrapper returns false on failure', 'return false present', /return false/i.test(safeSrc) ? 'present' : 'absent', /return false/i.test(safeSrc));

  // ── grants ─────────────────────────────────────────────────────────────
  const grants = async (fn, role) => (await client.query(
    `select has_function_privilege($1, $2, 'execute') as ok`, [role, fn])).rows[0].ok;

  check('grants', 'anon may execute has_entitlement_safe', true, await grants('has_entitlement_safe(text)', 'anon'), (await grants('has_entitlement_safe(text)', 'anon')) === true);
  check('grants', 'anon may execute user_entitlements', true, await grants('user_entitlements()', 'anon'), (await grants('user_entitlements()', 'anon')) === true);
  check('grants', 'anon may NOT execute can_perform_bulk_operations', false, await grants('can_perform_bulk_operations()', 'anon'), (await grants('can_perform_bulk_operations()', 'anon')) === false);
  check('grants', 'authenticated may NOT execute expire_old_rfqs', false, await grants('expire_old_rfqs()', 'authenticated'), (await grants('expire_old_rfqs()', 'authenticated')) === false);
  check('grants', 'authenticated may NOT execute generate_order_number', false, await grants('generate_order_number()', 'authenticated'), (await grants('generate_order_number()', 'authenticated')) === false);
  check('grants', 'service_role may execute expire_old_rfqs', true, await grants('expire_old_rfqs()', 'service_role'), (await grants('expire_old_rfqs()', 'service_role')) === true);

  // ── policy shape ───────────────────────────────────────────────────────
  const paid = ['saved_commodities', 'saved_markets', 'price_alerts', 'alert_delivery_logs', 'export_jobs'];
  const openRoles = (await client.query(`
    select tablename, policyname, roles::text as roles from pg_policies
    where schemaname='public' and tablename = any($1)`, [paid])).rows
    .filter((r) => !r.roles.includes('authenticated') || r.roles.includes('anon') || r.roles.includes('public'));
  check('policies', 'paid tables: no policy targets anon/public', 'none', openRoles.map((r) => `${r.tablename}.${r.policyname}`).join(', ') || 'none', openRoles.length === 0);

  const raising = (await client.query(`
    select tablename, policyname from pg_policies
    where schemaname='public'
      and (coalesce(qual,'') || coalesce(with_check,'')) ~ 'has_entitlement\\('`)).rows;
  check('policies', 'no policy calls the raising resolver', 'none', raising.map((r) => `${r.tablename}.${r.policyname}`).join(', ') || 'none', raising.length === 0);

  const policyCount = (await client.query(`select count(*)::int n from pg_policies where schemaname='public'`)).rows[0].n;
  check('policies', 'total policy count after 0057/0058', 'reported', policyCount, true);

  // ── B2B object shape ───────────────────────────────────────────────────
  const trig = (await client.query(`
    select tgname, tgenabled from pg_trigger
    where not tgisinternal and tgname in ('orders_guard_transition','orders_record_transition','supplier_profiles_guard_verification')`)).rows;
  check('b2b', 'three guards installed and enabled', '3 enabled', `${trig.length} (${trig.map((t) => t.tgenabled).join(',')})`, trig.length === 3 && trig.every((t) => t.tgenabled === 'O'));

  const eventIns = (await client.query(`select count(*)::int n from pg_policies where schemaname='public' and tablename='order_events' and cmd='INSERT'`)).rows[0].n;
  check('b2b', 'order_events accepts no direct INSERT', '0', eventIns, eventIns === 0);
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

rec.report('Phase 5 — independent review of the proposed migrations');
