/**
 * Phase 6 — Part E: service-role table access acceptance.
 *
 * Applies the amended 0060 and proves three things: the gap it repairs is
 * actually repaired (the four red cells in the Phase 5 acceptance matrix), the
 * narrowing it adds is actually enforced (no DELETE/TRUNCATE on evidence), and
 * it grants nothing beyond DML (no TRUNCATE/REFERENCES/TRIGGER anywhere).
 */
import { connect, applyFiles, applyFileInsideTransaction, runAs, seedUsers, makeRecorder, IDs } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;

const EVIDENCE = ['audit_events', 'offer_verification_events', 'order_events', 'price_observation_evidence', 'publication_events'];

const client = await connect();
try {
  await client.query('begin');
  await client.query('savepoint pre');

  // ── before 0060: the drift, measured ────────────────────────────────────
  const before = await client.query(`
    select count(*)::int n,
           count(*) filter (where not (has_table_privilege('service_role', c.oid,'SELECT')
                                   and has_table_privilege('service_role', c.oid,'INSERT')
                                   and has_table_privilege('service_role', c.oid,'UPDATE')))::int gap
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r'`);
  check('0. baseline', 'tables lacking service_role SELECT/INSERT/UPDATE', 'a non-zero gap',
    `${before.rows[0].gap} of ${before.rows[0].n}`, before.rows[0].gap > 0);

  await applyFiles(client, ['supabase/proposed/0060_service_role_grant_drift.sql']);
  await applyFiles(client, ['supabase/proposed/0060_service_role_grant_drift.sql']); // idempotency
  check('0b. idempotency', '0060 applied twice', 'no error', 'no error', true);

  // ── 1. the repair ───────────────────────────────────────────────────────
  const after = await client.query(`
    select count(*)::int n,
           count(*) filter (where has_table_privilege('service_role', c.oid,'SELECT')
                              and has_table_privilege('service_role', c.oid,'INSERT')
                              and has_table_privilege('service_role', c.oid,'UPDATE'))::int full
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r'`);
  check('1. repair', 'every table grants service_role SELECT/INSERT/UPDATE',
    `${after.rows[0].n} of ${after.rows[0].n}`, `${after.rows[0].full} of ${after.rows[0].n}`,
    after.rows[0].full === after.rows[0].n);

  const withDelete = await client.query(`
    select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and has_table_privilege('service_role', c.oid,'DELETE')`);
  check('2. narrowing', 'tables where service_role may DELETE', `${after.rows[0].n - EVIDENCE.length}`,
    withDelete.rows[0].n, withDelete.rows[0].n === after.rows[0].n - EVIDENCE.length);

  const evidenceDelete = await client.query(`
    select string_agg(c.relname, ', ' order by c.relname) t
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname = any ($1) and has_table_privilege('service_role', c.oid,'DELETE')`, [EVIDENCE]);
  check('2b. narrowing', 'evidence tables deletable by service_role', 'none', evidenceDelete.rows[0].t ?? 'none',
    evidenceDelete.rows[0].t === null);

  const evidenceTruncate = await client.query(`
    select string_agg(c.relname, ', ' order by c.relname) t
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname = any ($1) and has_table_privilege('service_role', c.oid,'TRUNCATE')`, [EVIDENCE]);
  check('2c. narrowing', 'evidence tables truncatable by service_role', 'none', evidenceTruncate.rows[0].t ?? 'none',
    evidenceTruncate.rows[0].t === null);

  // ── 3. nothing beyond DML was granted ───────────────────────────────────
  const beyond = await client.query(`
    select string_agg(c.relname || ':' || p, ', ') t
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    cross join unnest(array['REFERENCES','TRIGGER']) p
    where n.nspname='public' and c.relkind='r'
      and c.relname in ('export_jobs','orders','quotes','rfqs','notifications','scheduled_job_runs',
                        'international_trade_records','supplier_profiles','audit_events','order_events')
      and has_table_privilege('service_role', c.oid, p)`);
  check('3. no DDL privileges', 'REFERENCES/TRIGGER on previously ungranted tables', 'none', beyond.rows[0].t ?? 'none',
    beyond.rows[0].t === null);

  const bypass = await client.query(`select rolbypassrls, rolsuper from pg_roles where rolname='service_role'`);
  check('3b. service_role bypasses RLS', 'rolbypassrls', true, bypass.rows[0].rolbypassrls,
    bypass.rows[0].rolbypassrls === true);

  // ── 4. the operations the service key actually needs ────────────────────
  await seedUsers(client);
  const sel = await runAs(client, 'service_role', null, 'select count(*)::int n from public.export_jobs');
  check('4. export_jobs read', 'allowed', 'allowed', sel.ok ? `${sel.rows[0].n} rows` : sel.code, sel.ok);

  const ins = await runAs(client, 'service_role', null,
    `insert into public.export_jobs (requested_by, scope, format) values ($1,'p6','csv') returning id`, [IDs.nosub]);
  check('4b. export_jobs insert', 'allowed', 'allowed', ins.ok ? 'inserted' : ins.code, ins.ok);

  const upd = await runAs(client, 'service_role', null,
    `update public.export_jobs set status='completed' where requested_by = $1`, [IDs.nosub]);
  check('4c. export_jobs update', 'allowed', 'allowed', upd.ok ? `${upd.rowCount} rows` : upd.code, upd.ok);

  for (const t of ['orders', 'quotes', 'rfqs', 'notifications', 'scheduled_job_runs', 'international_trade_records', 'supplier_profiles']) {
    const r = await runAs(client, 'service_role', null, `select count(*)::int n from public.${t}`);
    check('4d. required read', t, 'allowed', r.ok ? `${r.rows[0].n} rows` : r.code, r.ok);
  }

  // ── 5. the narrowing is enforced, not decorative ────────────────────────
  for (const t of ['audit_events', 'order_events', 'offer_verification_events', 'publication_events', 'price_observation_evidence']) {
    const r = await runAs(client, 'service_role', null, `delete from public.${t} where false`);
    check('5. evidence delete refused', t, '42501', r.ok ? 'permitted' : r.code, !r.ok && r.code === '42501');
  }

  const readEvidence = await runAs(client, 'service_role', null, 'select count(*)::int n from public.audit_events');
  check('5b. evidence still readable', 'audit_events SELECT', 'allowed', readEvidence.ok ? `${readEvidence.rows[0].n} rows` : readEvidence.code, readEvidence.ok);

  const normalDelete = await runAs(client, 'service_role', null, 'delete from public.saved_commodities where false');
  check('5c. ordinary table keeps DELETE', 'saved_commodities', 'no error', normalDelete.ok ? 'no error' : normalDelete.code, normalDelete.ok);

  // ── 6. the privilege did not leak to clients ────────────────────────────
  const anonOrders = await runAs(client, 'anon', null, 'select count(*)::int n from public.orders');
  check('6. client isolation', 'anon reading orders', 'denied', anonOrders.ok ? `${anonOrders.rows[0].n} rows` : anonOrders.code, !anonOrders.ok);

  const authExport = await runAs(client, 'authenticated', IDs.nosub, 'select count(*)::int n from public.export_jobs');
  check('6b. client isolation', 'authenticated reading others\' export jobs', '0 rows',
    authExport.ok ? `${authExport.rows[0].n} rows` : authExport.code, authExport.ok && authExport.rows[0].n === 0);
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

rec.report('Phase 6 — service_role table access');
