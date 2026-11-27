/**
 * Phase 5 — Workstream B: RLS acceptance matrix.
 *
 * Executes a role × operation × entitlement matrix for the four
 * entitlement-gated tables that carry an ownership model, plus explicit
 * cross-ownership checks. Every cell runs with real roles and JWT claims inside
 * a rolled-back savepoint on the replica, so the run is repeatable.
 *
 * The expected map is the design intent taken from 0057. A mismatch is a defect
 * in the policies or in the intent, and either one fails the run.
 *
 * Set MATRIX_OUT to control where the rendered markdown table is written.
 */
import { writeFile } from 'node:fs/promises';
import { connect, applyFiles, runAs, seedUsers, seedSubscriptions, IDs, makeRecorder } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;

const ZERO = '00000000-0000-0000-0000-000000000000';

const CONTEXTS = [
  ['anon', 'anon', null],
  ['customer', 'authenticated', IDs.nosub],
  ['entitled', 'authenticated', IDs.entitled],
  ['supplier', 'authenticated', IDs.supplier],
  ['staff', 'authenticated', IDs.staff],
  ['admin', 'authenticated', IDs.admin],
  ['service_role', 'service_role', null],
];

const OPS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

/** gate = entitlement that unlocks writes; readGate = entitlement needed to read. */
const TABLES = {
  saved_commodities: { owner: 'user_id',      gate: 'watchlists', readGate: 'watchlists', setCol: 'note' },
  saved_markets:     { owner: 'user_id',      gate: 'watchlists', readGate: 'watchlists', setCol: 'note' },
  price_alerts:      { owner: 'user_id',      gate: 'alerts',     readGate: null,         setCol: 'direction' },
  export_jobs:       { owner: 'requested_by', gate: 'exports',    readGate: null,         setCol: 'format' },
};

/** Who may act on their OWN row. */
function expected(table, op, ctx) {
  if (ctx === 'anon') return 'deny';
  if (ctx === 'service_role') return 'allow';
  // export_jobs has no DELETE policy at all — nobody reaches it without BYPASSRLS.
  if (table === 'export_jobs' && op === 'DELETE') return 'deny';
  if (ctx === 'admin') return 'allow';
  const privileged = ctx === 'staff' || ctx === 'admin';
  const t = TABLES[table];
  if (op === 'SELECT') {
    if (t.readGate && !privileged) return ctx === 'entitled' ? 'allow' : 'deny';
    return 'allow';
  }
  if (table === 'export_jobs') {
    if (op === 'INSERT') return ctx === 'entitled' ? 'allow' : 'deny';
    return 'deny';
  }
  if (privileged) return 'allow';
  return ctx === 'entitled' ? 'allow' : 'deny';
}

/** Values chosen so a cell never collides with the fixtures created below. */
const insertFor = (table, uid, tag) => {
  switch (table) {
    case 'saved_commodities': return `insert into public.saved_commodities (user_id, commodity_id) select '${uid}', id from public.commodities order by id offset 5 limit 1 returning id`;
    case 'saved_markets':     return `insert into public.saved_markets (user_id, market_id) select '${uid}', id from public.markets order by id offset 5 limit 1 returning id`;
    case 'price_alerts':      return `insert into public.price_alerts (user_id, commodity_id) select '${uid}', id from public.commodities order by id offset 5 limit 1 returning id`;
    default:                  return `insert into public.export_jobs (requested_by, scope) values ('${uid}', 'p5-${tag}') returning id`;
  }
};

const client = await connect();
const rows = [];
try {
  await client.query('begin');
  const files = [
    'supabase/proposed/0056_entitlement_resolver_repair.sql',
    'supabase/proposed/0057_entitlement_rls_enforcement.sql',
    'supabase/proposed/0058_reports_access_policy.sql',
  ];
  // WITH_PROPOSED_0060=1 proves the S-5 remedy repairs the four red cells
  // without changing any expectation in this file.
  if (process.env.WITH_PROPOSED_0060 === '1') files.push('supabase/proposed/0060_service_role_grant_drift.sql');
  await applyFiles(client, files);
  await seedUsers(client);
  await seedSubscriptions(client);

  const commodityIds = (await client.query('select id from public.commodities order by id limit 2')).rows.map((r) => r.id);
  const marketIds = (await client.query('select id from public.markets order by id limit 2')).rows.map((r) => r.id);

  for (const table of Object.keys(TABLES)) {
    for (const [, , uid] of CONTEXTS) {
      if (!uid) continue;
      if (table === 'saved_commodities') {
        await client.query('insert into public.saved_commodities (user_id, commodity_id) values ($1,$2) on conflict do nothing', [uid, commodityIds[0]]);
      } else if (table === 'saved_markets') {
        await client.query('insert into public.saved_markets (user_id, market_id) values ($1,$2) on conflict do nothing', [uid, marketIds[0]]);
      } else if (table === 'price_alerts') {
        await client.query('insert into public.price_alerts (user_id, commodity_id) values ($1,$2)', [uid, commodityIds[0]]);
      } else if (table === 'export_jobs') {
        await client.query(`insert into public.export_jobs (requested_by, scope) values ($1,'p5-fixture')`, [uid]);
      }
    }
  }

  const plan = (table, op, ctx, uid) => {
    const t = TABLES[table];
    if (ctx === 'service_role') {
      if (op === 'SELECT') return `select count(*)::int n from public.${table}`;
      if (op === 'INSERT') return insertFor(table, IDs.nosub, 'svc');
      const verb = op === 'UPDATE' ? `update public.${table} set ${t.setCol} = ${t.setCol}` : `delete from public.${table}`;
      return `${verb} where ${t.owner} = '${IDs.staff}'`;
    }
    const who = ctx === 'anon' ? ZERO : uid;
    if (op === 'INSERT') return insertFor(table, who, ctx);
    const filter = `${t.owner} = '${who}'`;
    if (op === 'SELECT') return `select count(*)::int n from public.${table} where ${filter}`;
    if (op === 'UPDATE') return `update public.${table} set ${t.setCol} = ${t.setCol} where ${filter}`;
    return `delete from public.${table} where ${filter}`;
  };

  for (const table of Object.keys(TABLES)) {
    for (const op of OPS) {
      const cells = [];
      for (const [ctx, role, uid] of CONTEXTS) {
        const want = expected(table, op, ctx);
        const r = await runAs(client, role, uid, plan(table, op, ctx, uid));
        let got;
        if (!r.ok) got = r.code === '42501' ? 'deny' : `error ${r.code}`;
        else if (op === 'SELECT') got = r.rows[0].n > 0 ? 'allow' : 'deny';
        else if (op === 'INSERT') got = 'allow';
        else got = (r.rowCount ?? 0) > 0 ? 'allow' : 'deny';
        const pass = got === want;
        check(`${table}.${op}`, ctx, want, got, pass);
        cells.push({ ctx, want, got, pass });
      }
      rows.push({ table, op, cells });
    }
  }

  // ── ownership must not be widened by entitlement ────────────────────────
  const others = (uid) => [`select count(*)::int n from public.saved_commodities where user_id <> $1`, [uid]];
  for (const [label, uid] of [['entitled user', IDs.entitled], ['staff', IDs.staff]]) {
    const [sql, params] = others(uid);
    const r = await runAs(client, 'authenticated', uid, sql, params);
    check('cross-ownership', `${label} reading others' watchlists`, 0, r.ok ? r.rows[0].n : r.code, r.ok && r.rows[0].n === 0);
  }
  const crossUser = await runAs(client, 'authenticated', IDs.entitled,
    `select count(*)::int n from public.price_alerts where user_id <> $1`, [IDs.entitled]);
  check('cross-ownership', 'entitled user reading others\' alerts', 0, crossUser.ok ? crossUser.rows[0].n : crossUser.code, crossUser.ok && crossUser.rows[0].n === 0);

  const adminExports = await runAs(client, 'authenticated', IDs.admin,
    `select count(*)::int n from public.export_jobs where requested_by <> $1`, [IDs.admin]);
  check('cross-ownership', 'admin reads all export jobs (documented exception)', '> 0',
    adminExports.ok ? adminExports.rows[0].n : adminExports.code, adminExports.ok && adminExports.rows[0].n > 0);

  const staffExports = await runAs(client, 'authenticated', IDs.staff,
    `select count(*)::int n from public.export_jobs where requested_by <> $1`, [IDs.staff]);
  check('cross-ownership', 'staff does NOT read others\' export jobs', 0,
    staffExports.ok ? staffExports.rows[0].n : staffExports.code, staffExports.ok && staffExports.rows[0].n === 0);

  const svcAll = await runAs(client, 'service_role', null, 'select count(*)::int n from public.saved_commodities');
  check('cross-ownership', 'service_role reads every row', '> 0', svcAll.ok ? svcAll.rows[0].n : svcAll.code, svcAll.ok && svcAll.rows[0].n > 0);

  // ── reference data: anon holds DML grants, so prove the policy denies ────
  // These four tables carry an ALL-permissive policy whose predicate is
  // is_staff() and whose WITH CHECK is the same, so anon may reach the policy
  // but must never pass it. 0053 left the DML grants in place by design.
  for (const table of ['commodity_fundamentals', 'commodity_seasonality', 'commodity_specifications', 'price_source_registry']) {
    const up = await runAs(client, 'anon', null, `update public.${table} set created_at = created_at`);
    check('anon-reference-write', `${table} UPDATE refused`, 'deny',
      up.ok ? `rows=${up.rowCount}` : up.code,
      !up.ok ? up.code === '42501' : up.rowCount === 0);
    const del = await runAs(client, 'anon', null, `delete from public.${table}`);
    check('anon-reference-write', `${table} DELETE refused`, 'deny',
      del.ok ? `rows=${del.rowCount}` : del.code,
      !del.ok ? del.code === '42501' : del.rowCount === 0);
  }
} finally {
  await client.query('rollback').catch(() => {});
  await client.end();
}

const mark = (c) => (c.got === 'allow' ? (c.want === 'allow' ? '✅' : '❗') : c.got === 'deny' ? '⛔' : `⚠️${c.got}`);
const lines = [
  `| Table · operation | ${CONTEXTS.map(([c]) => c).join(' | ')} |`,
  `|---|${CONTEXTS.map(() => '---').join('|')}|`,
];
for (const row of rows) {
  lines.push(`| \`${row.table}\` · ${row.op} | ${row.cells.map((c) => mark(c)).join(' | ')} |`);
}
await writeFile(process.env.MATRIX_OUT ?? '/tmp/rls-matrix.md', lines.join('\n') + '\n');

rec.report('Phase 5 — RLS acceptance matrix');
