/**
 * Phase 4 — Workstream B: the database enforcement matrix.
 *
 * Runs 0057 against the local replica inside one rolled-back transaction and
 * checks every role/context combination that the audit said was unguarded.
 * Local PostgreSQL integration test; not hosted acceptance.
 */
import { connect, applyFiles, runAs, seedUsers, seedSubscriptions, IDs, makeRecorder } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;

const client = await connect();

try {
  await client.query('begin');
  await applyFiles(client, ['supabase/proposed/0056_entitlement_resolver_repair.sql']);
  await applyFiles(client, ['supabase/proposed/0057_entitlement_rls_enforcement.sql']);
  await seedUsers(client);
  await seedSubscriptions(client);

  const commodityRows = (await client.query('select id from public.commodities order by id limit 2')).rows;
  const commodity = commodityRows[0].id;      // owned by fixture users
  const freeCommodity = commodityRows[1].id;  // spare, for inserts that must succeed

  // Existing rows owned by other users: the isolation fixtures.
  await client.query(
    `insert into public.saved_commodities (user_id, commodity_id) values ($1, $2)`,
    [IDs.entitled, commodity],
  );
  await client.query(
    `insert into public.price_alerts (user_id, commodity_id) values ($1, $2)`,
    [IDs.nosub, commodity],
  );
  await client.query(
    `insert into public.scheduled_job_runs (job_name, scheduled_for) values ('phase4_fixture', now())`,
  );

  const denied = (r) => !r.ok || r.rows.length === 0;

  // ── watchlists ──────────────────────────────────────────────────────────
  const wlInsert = async (role, userId, owner, commodityId = freeCommodity) =>
    runAs(client, role, userId,
      `insert into public.saved_commodities (user_id, commodity_id) values ($1, $2) returning id`,
      [owner, commodityId]);

  check('watchlists: anon insert', 'denied', 'denied', denied(await wlInsert('anon', null, IDs.nosub)), denied(await wlInsert('anon', null, IDs.nosub)));

  const wlNoEnt = await wlInsert('authenticated', IDs.nosub, IDs.nosub);
  check('watchlists: authenticated, no entitlement', 'denied (42501)', '42501', wlNoEnt.code ?? 'inserted', !wlNoEnt.ok && wlNoEnt.code === '42501');

  // The entitled user already owns a (user, commodity) fixture row, so this
  // insert uses the spare commodity.
  const wlEnt = await wlInsert('authenticated', IDs.entitled, IDs.entitled);
  check('watchlists: entitled insert', 'accepted', 'accepted', wlEnt.ok ? 'accepted' : wlEnt.code, wlEnt.ok);

  const wlStaff = await wlInsert('authenticated', IDs.staff, IDs.staff);
  check('watchlists: staff insert', 'accepted', 'accepted', wlStaff.ok ? 'accepted' : wlStaff.code, wlStaff.ok);

  const wlSvc = await wlInsert('service_role', null, IDs.nosub);
  check('watchlists: service_role insert', 'accepted (bypasses RLS)', 'accepted', wlSvc.ok ? 'accepted' : wlSvc.code, wlSvc.ok);

  const wlNoEntSelect = await runAs(client, 'authenticated', IDs.nosub, 'select count(*)::int n from public.saved_commodities');
  check('watchlists: non-entitled select', '0 rows — no plan, no read', 0, wlNoEntSelect.ok ? wlNoEntSelect.rows[0].n : wlNoEntSelect.code, wlNoEntSelect.ok && wlNoEntSelect.rows[0].n === 0);

  // The entitled user owns one row; a second user's row must stay invisible.
  await client.query(`insert into public.saved_commodities (user_id, commodity_id) values ($1, $2) on conflict do nothing`, [IDs.staff, commodity]);
  const wlOther = await runAs(client, 'authenticated', IDs.entitled, 'select count(*)::int n from public.saved_commodities');
  check('watchlists: ownership isolation', 'sees only own row', 1, wlOther.ok ? wlOther.rows[0].n : wlOther.code, wlOther.ok && wlOther.rows[0].n === 1);

  // ── alerts ──────────────────────────────────────────────────────────────
  const alertInsert = (role, userId, owner) =>
    runAs(client, role, userId, `insert into public.price_alerts (user_id, commodity_id) values ($1, $2) returning id`, [owner, freeCommodity]);

  const alNoEnt = await alertInsert('authenticated', IDs.nosub, IDs.nosub);
  check('alerts: authenticated, no entitlement', 'denied (42501)', '42501', alNoEnt.code ?? 'inserted', !alNoEnt.ok && alNoEnt.code === '42501');

  const alEnt = await alertInsert('authenticated', IDs.entitled, IDs.entitled);
  check('alerts: entitled insert', 'accepted', 'accepted', alEnt.ok ? 'accepted' : alEnt.code, alEnt.ok);

  const alRead = await runAs(client, 'authenticated', IDs.nosub, 'select count(*)::int n from public.price_alerts');
  check('alerts: lapsed user still reads own history', '1 row (read is ownership-only)', 1, alRead.ok ? alRead.rows[0].n : alRead.code, alRead.ok && alRead.rows[0].n === 1);

  const alDelete = await runAs(client, 'authenticated', IDs.nosub, 'delete from public.price_alerts where user_id = $1', [IDs.nosub]);
  check('alerts: lapsed user cannot delete', 'denied', 'denied (0 rows or 42501)', alDelete.ok ? `${alDelete.rowCount ?? 0} rows` : alDelete.code, denied(alDelete));

  // ── exports ─────────────────────────────────────────────────────────────
  const exInsert = (role, userId) =>
    runAs(client, role, userId,
      `insert into public.export_jobs (requested_by, scope) values ($1, 'phase4') returning id`, [userId]);

  const exNoEnt = await exInsert('authenticated', IDs.nosub);
  check('exports: authenticated, no entitlement', 'denied (42501)', '42501', exNoEnt.code ?? 'inserted', !exNoEnt.ok && exNoEnt.code === '42501');

  const exEnt = await exInsert('authenticated', IDs.entitled);
  check('exports: entitled insert', 'accepted', 'accepted', exEnt.ok ? 'accepted' : exEnt.code, exEnt.ok);

  const exAdmin = await exInsert('authenticated', IDs.admin);
  check('exports: admin insert', 'accepted', 'accepted', exAdmin.ok ? 'accepted' : exAdmin.code, exAdmin.ok);

  // ── bulk ────────────────────────────────────────────────────────────────
  const bulk = async (role, userId) => {
    const r = await runAs(client, role, userId, 'select public.can_perform_bulk_operations() as v');
    return r.ok ? r.rows[0].v : `${r.code}`;
  };

  check('bulk: anonymous', 'false', 'false', await bulk('anon', null), (await bulk('anon', null)) === false);
  check('bulk: customer, no entitlement', 'false', 'false', await bulk('authenticated', IDs.nosub), (await bulk('authenticated', IDs.nosub)) === false);
  check('bulk: enterprise entitlement', 'true', 'true', await bulk('authenticated', IDs.entitled), (await bulk('authenticated', IDs.entitled)) === true);
  check('bulk: staff', 'true', 'true', await bulk('authenticated', IDs.staff), (await bulk('authenticated', IDs.staff)) === true);

  const jobsNoEnt = await runAs(client, 'authenticated', IDs.nosub, 'select count(*)::int n from public.scheduled_job_runs');
  check('bulk: job runs hidden from non-bulk customer', '0 rows', 0, jobsNoEnt.ok ? jobsNoEnt.rows[0].n : jobsNoEnt.code, jobsNoEnt.ok && jobsNoEnt.rows[0].n === 0);

  const jobsBulk = await runAs(client, 'authenticated', IDs.entitled, 'select count(*)::int n from public.scheduled_job_runs');
  check('bulk: job runs visible with bulk', '> 0 rows', '>0', jobsBulk.ok ? jobsBulk.rows[0].n : jobsBulk.code, jobsBulk.ok && jobsBulk.rows[0].n > 0);

  // ── structural guarantees the suite itself depends on ───────────────────
  const pre0042 = await client.query(`
    select count(*)::int n from pg_policies
    where schemaname='public' and policyname in
      ('saved_commodities_owner','saved_markets_owner','price_alerts_owner','alert_logs_owner',
       'export_jobs_insert','export_jobs_owner_read','export_jobs_update')`);
  check('structure: permissive ownership policies removed', '0', 0, pre0042.rows[0].n, pre0042.rows[0].n === 0);

  const anonPolicies = await client.query(`
    select count(*)::int n from pg_policies
    where schemaname='public' and 'anon' = any(roles)
      and tablename in ('saved_commodities','saved_markets','price_alerts','alert_delivery_logs','export_jobs')`);
  check('structure: no policy targets anon on paid tables', '0', 0, anonPolicies.rows[0].n, anonPolicies.rows[0].n === 0);
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

rec.report('Phase 4 integration — RLS entitlement enforcement');
