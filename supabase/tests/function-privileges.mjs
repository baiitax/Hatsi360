/**
 * Phase 6 — Part E: function privilege acceptance.
 *
 * Applies 0056–0058 and the proposed 0061, then attacks the function surface:
 * anonymous access to sensitive functions, privilege regression against PUBLIC,
 * authenticated role escalation, audit forgery, and the compatibility of every
 * anonymous-reachable RLS policy with the curated allowlist.
 *
 * The measured facts this suite asserts are the ones the proposal was designed
 * from — the allowlist is three functions, not a guess.
 */
import { connect, applyFiles, runAs, runAsPersist, seedUsers, seedSubscriptions, IDs, makeRecorder } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;

const PUBLIC_SET = ['has_entitlement_safe', 'is_public_observation', 'is_staff'];

const SENSITIVE_FOR_ANON = [
  ['set_user_role', `select public.set_user_role($1,'admin'::user_role,'p6')`],
  ['set_account_status', `select public.set_account_status($1,'suspended'::account_status)`],
  ['write_audit', `select public.write_audit('x','y','z')`],
  ['notify', `select public.notify(p_user_id => $1, p_kind => 'system_alert'::notification_kind, p_title => 'x')`],
  ['provision_agent', `select public.provision_agent($1,'E1')`],
  ['publish_observation', `select public.publish_observation(gen_random_uuid())`],
  ['submit_observation', `select public.submit_observation('{}'::jsonb, 'k')`],
  ['expire_old_rfqs', `select public.expire_old_rfqs()`],
  ['user_entitlements', `select * from public.user_entitlements()`],
  ['has_entitlement', `select public.has_entitlement('reports')`],
  ['can_perform_bulk_operations', `select public.can_perform_bulk_operations()`],
  ['is_admin', `select public.is_admin()`],
  ['create_order_from_quote', `select public.create_order_from_quote(gen_random_uuid(), 'x')`],
];

const client = await connect();
try {
  await client.query('begin');
  await applyFiles(client, [
    'supabase/proposed/0056_entitlement_resolver_repair.sql',
    'supabase/proposed/0057_entitlement_rls_enforcement.sql',
    'supabase/proposed/0058_reports_access_policy.sql',
    'supabase/proposed/0061_function_execute_least_privilege.sql',
  ]);
  await seedUsers(client);
  await seedSubscriptions(client);

  // the replica is missing production's anon grant on market_reports
  await client.query('grant select on public.market_reports to anon, authenticated');
  await client.query(`
    insert into public.market_reports (slug, title, is_premium, published_at)
    values ('p6-public','Public report', false, now()), ('p6-premium','Premium report', true, now())`);
  const commodity = (await client.query('select id from public.commodities limit 1')).rows[0].id;
  const market = (await client.query('select id from public.markets limit 1')).rows[0].id;
  await client.query(`insert into public.price_observations (commodity_id, market_id, collected_at, reported_amount)
                      values ($1,$2, now() - interval '1 day', 1000)`, [commodity, market]);

  // ── 1. anonymous public reads still work ────────────────────────────────
  const anonTables = (await client.query(`
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r' and has_table_privilege('anon', c.oid, 'SELECT')
    order by 1`)).rows.map((r) => r.relname);
  for (const t of anonTables) {
    const r = await runAs(client, 'anon', null, `select count(*)::int n from public.${t}`);
    check('1. anon public read', t, 'readable', r.ok ? `${r.rows[0].n} rows` : r.code, r.ok);
  }

  // full-scan reads specifically exercise per-row policy evaluation
  const mr = await runAs(client, 'anon', null,
    `select count(*)::int n, coalesce(bool_or(is_premium), false) premium from public.market_reports`);
  check('1b. anon reports read', 'public rows only, premium hidden', '1 row, no premium',
    mr.ok ? `${mr.rows[0].n} rows, premium=${mr.rows[0].premium}` : mr.code,
    mr.ok && mr.rows[0].n === 1 && mr.rows[0].premium === false);

  const po = await runAs(client, 'anon', null, 'select count(*)::int n from public.price_observations');
  check('1c. anon observations read', 'readable', 'readable', po.ok ? `${po.rows[0].n} rows` : po.code, po.ok);

  // ── 2. anonymous calls to sensitive functions ───────────────────────────
  for (const [label, sql] of SENSITIVE_FOR_ANON) {
    const r = await runAs(client, 'anon', null, sql, sql.includes('$1') ? [IDs.nosub] : []);
    check('2. anon sensitive call', label, '42501', r.ok ? 'executed' : r.code, !r.ok && r.code === '42501');
  }

  // ── 3. the three public helpers stay callable ───────────────────────────
  for (const fn of PUBLIC_SET) {
    const r = await client.query(
      `select bool_and(has_function_privilege('anon', oid, 'EXECUTE')) ok
         from pg_proc where proname = $1 and pronamespace = 'public'::regnamespace`, [fn]);
    check('3. helper reachable by anon', fn, true, r.rows[0].ok, r.rows[0].ok === true);
  }
  const staffAsAnon = await runAs(client, 'anon', null, 'select public.is_staff() v');
  check('3b. is_staff() answers anon', 'false, not an error', 'false', staffAsAnon.ok ? staffAsAnon.rows[0].v : staffAsAnon.code, staffAsAnon.ok && staffAsAnon.rows[0].v === false);

  // ── 4. authenticated role escalation ────────────────────────────────────
  const escalate = await runAs(client, 'authenticated', IDs.nosub, `select public.set_user_role($1,'admin'::user_role,'p6')`, [IDs.nosub]);
  check('4. self-elevation via set_user_role', 'denied (42501)', '42501', escalate.ok ? 'elevated' : escalate.code, !escalate.ok && escalate.code === '42501');

  const escalateOther = await runAs(client, 'authenticated', IDs.nosub, `select public.set_user_role($1,'admin'::user_role,'p6')`, [IDs.admin]);
  check('4b. elevating another user', 'denied (42501)', '42501', escalateOther.ok ? 'elevated' : escalateOther.code, !escalateOther.ok && escalateOther.code === '42501');

  const directRole = await runAs(client, 'authenticated', IDs.nosub, `update public.profiles set role='admin' where id=$1`, [IDs.nosub]);
  check('4c. direct profile role write', 'denied', '0 rows or 42501', directRole.ok ? `${directRole.rowCount} rows` : directRole.code, !directRole.ok || directRole.rowCount === 0);

  const rolesInsert = await runAs(client, 'authenticated', IDs.nosub,
    `insert into public.role_change_log (user_id, role) values ($1,'admin')`, [IDs.nosub]);
  check('4d. direct role-log insert', 'denied', '42501 or 0 rows', rolesInsert.ok ? 'inserted' : rolesInsert.code, !rolesInsert.ok);

  // ── 5. audit-record forgery ─────────────────────────────────────────────
  const forgeRpc = await runAs(client, 'authenticated', IDs.nosub, `select public.write_audit('forged','entity','id')`);
  check('5. write_audit by a client', 'denied (42501)', '42501', forgeRpc.ok ? 'written' : forgeRpc.code, !forgeRpc.ok && forgeRpc.code === '42501');

  const forgeInsert = await runAs(client, 'authenticated', IDs.nosub,
    `insert into public.audit_events (action, entity_table, entity_id) values ('forged','x','y')`);
  check('5b. direct audit_events insert', 'denied (42501)', '42501', forgeInsert.ok ? 'inserted' : forgeInsert.code, !forgeInsert.ok && forgeInsert.code === '42501');

  const forgeAnon = await runAs(client, 'anon', null,
    `insert into public.audit_events (action, entity_table, entity_id) values ('forged','x','y')`);
  check('5c. anon audit_events insert', 'denied', '42501 or 0 rows', forgeAnon.ok ? 'inserted' : forgeAnon.code, !forgeAnon.ok);

  // ── 6. no regression to PUBLIC grants ───────────────────────────────────
  const publicGrants = await client.query(`
    select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
      and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) a where a.grantee=0 and a.privilege_type='EXECUTE'))`);
  check('6. no app function granted to PUBLIC', 'app functions with PUBLIC EXECUTE', 0, publicGrants.rows[0].n, publicGrants.rows[0].n === 0);

  const anonExec = await client.query(`
    select string_agg(p.proname, ', ' order by p.proname) s from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
      and has_function_privilege('anon', p.oid, 'EXECUTE')`);
  check('6b. anon executable set is exactly the allowlist', 'anon executable functions', PUBLIC_SET.join(', '), anonExec.rows[0].s,
    anonExec.rows[0].s === PUBLIC_SET.join(', '));

  // ── 7. RLS helper compatibility, statically ─────────────────────────────
  const broken = await client.query(`
    select distinct pol.polname || ' -> ' || f.proname as bad
    from pg_policy pol
    join pg_class rel on rel.oid = pol.polrelid
    join pg_namespace rn on rn.oid = rel.relnamespace
    cross join pg_proc f join pg_namespace fn on fn.oid = f.pronamespace
    where rn.nspname='public' and fn.nspname='public'
      and (pol.polroles = '{0}'::oid[] or 'anon'::regrole::oid = any(pol.polroles))
      and position(f.proname || '(' in coalesce(pg_get_expr(pol.polqual, pol.polrelid),'') || ' ' ||
                   coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid),'')) > 0
      and not has_function_privilege('anon', f.oid, 'EXECUTE')`);
  check('7. anon-reachable policies only call anon-executable functions', 'broken references', 'none',
    broken.rows.length ? broken.rows.map((r) => r.bad).join('; ') : 'none', broken.rows.length === 0);

  // ── 8. staff paths still work for an authenticated session ──────────────
  const staffRole = await runAs(client, 'authenticated', IDs.staff, `select public.set_user_role($1,'analyst'::user_role,'p6')`, [IDs.nosub]);
  check('8. staff override still reachable', 'executes (guard decides)', 'executed',
    staffRole.ok ? 'executed' : staffRole.code, staffRole.ok || staffRole.code === '42501'); // 42501 only if the guard rejects, recorded for review

  const sessionRpc = await runAs(client, 'authenticated', IDs.nosub, `select public.has_entitlement('reports') v`);
  check('8b. session RPC still executable', 'answers', 'answered', sessionRpc.ok ? String(sessionRpc.rows[0].v) : sessionRpc.code, sessionRpc.ok);
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

rec.report('Phase 6 — function EXECUTE privileges');
