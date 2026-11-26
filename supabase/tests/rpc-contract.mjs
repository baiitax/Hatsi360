/**
 * Phase 4 — the application/database contract.
 *
 * This suite exists because the 31-check entitlement matrix was green while
 * the product was broken: it called SQL directly, never through the argument
 * names the application actually sends. This test reads the application
 * source, extracts every `supabase.rpc(...)` call and its argument object, and
 * compares those names with pg_proc's real parameter names on the replica.
 *
 * It is a static contract test. It does not replace a PostgREST acceptance
 * run; it prevents the specific class of defect that a PostgREST run caught
 * in production (PGRST202) from shipping again.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { connect, makeRecorder } from './lib/pg-harness.mjs';

const rec = makeRecorder();
const { check } = rec;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = await walk('src');
const client = await connect();

// Real signatures, from the database rather than from documentation.
const signatures = new Map();
for (const row of (await client.query(`
  select p.proname, p.proargnames
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'`)).rows) {
  // A no-argument function has proargnames = NULL; it still exists and is
  // callable with an empty body.
  signatures.set(row.proname, row.proargnames ?? []);
}
await client.end();

/**
 * Extract top-level keys of the argument object handed to .rpc(name, {...}).
 * A regex over `[^}]*` would read nested object literals as arguments, so the
 * object is scanned with brace depth and only depth-1 keys count.
 */
function topLevelKeys(source, openAt) {
  const keys = [];
  let depth = 0;
  let i = openAt;
  let current = '';
  let expectingKey = true;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{' || ch === '(' || ch === '[') { depth += 1; current = ''; continue; }
    if (ch === '}' || ch === ')' || ch === ']') {
      depth -= 1;
      if (depth === 0) break;
      continue;
    }
    if (depth === 1 && ch === ',') { expectingKey = true; current = ''; continue; }
    if (depth === 1 && ch === ':') {
      const key = current.trim().match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
      if (key) keys.push(key[1]);
      expectingKey = false;
      current = '';
      continue;
    }
    if (depth === 1 && expectingKey) current += ch;
  }
  return keys;
}

const calls = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  const re = /\.rpc\(\s*['"]([a-zA-Z0-9_]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const fn = m[1];
    const after = source.indexOf('{', m.index + m[0].length);
    const comma = source.indexOf(',', m.index + m[0].length);
    const args = after !== -1 && comma !== -1 && after === source.indexOf('{', comma)
      ? topLevelKeys(source, after)
      : [];
    calls.push({ file, fn, args });
  }
}

check('contract', 'rpc call sites found', '> 0', calls.length, calls.length > 0);

let mismatched = 0;
for (const call of calls) {
  const declared = signatures.get(call.fn);
  if (!declared) {
    mismatched += 1;
    check('contract', `${path.relative('.', call.file)} → ${call.fn}()`, 'function exists', 'not found in pg_proc', false);
    continue;
  }
  const unknown = call.args.filter((a) => !declared.includes(a));
  if (unknown.length) mismatched += 1;
  check(
    'contract',
    `${path.basename(call.file)} → ${call.fn}(${call.args.join(', ') || 'no args'})`,
    `subset of {${declared.join(', ')}}`,
    unknown.length ? `unknown: ${unknown.join(', ')}` : 'matches',
    unknown.length === 0,
  );
}

// The specific regression: the application used to send `entitlement_key`.
const offenders = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (source.includes("entitlement_key:")) offenders.push(path.relative('.', file));
}
check('contract', 'no call site sends entitlement_key', 'none', offenders.join(', ') || 'none', offenders.length === 0);

// ── API route governance ──────────────────────────────────────────────────
/**
 * Every /api/v1 route must be a deliberate decision. A route either declares
 * an entitlement, or it appears in this allowlist with the reason it is
 * public. Adding a route without one of those fails the suite.
 */
const PUBLIC_ROUTES = new Set([
  'api/v1/[...path]/route.ts',            // 404 envelope, nothing to authorise
  'api/agent/submit/route.ts',            // agent field submission, session + role checked in-route
  'api/auth/signout/route.ts',            // session teardown
  'api/jobs/run/route.ts',                // cron entry, shared-secret checked in-route
  'api/notifications/read/route.ts',      // own-row mutation, session scoped
  'api/v1/charts/commodity/route.ts',     // public price chart
  'api/v1/commodities/route.ts',
  'api/v1/countries/[code]/route.ts',
  'api/v1/countries/route.ts',
  'api/v1/hs-codes/[code]/route.ts',
  'api/v1/hs-codes/route.ts',
  'api/v1/insights/route.ts',
  'api/v1/intelligence/production/route.ts',
  'api/v1/intelligence/sync/route.ts',    // admin-only, checked in-route
  'api/v1/intelligence/trade/route.ts',
  'api/v1/markets/route.ts',
  'api/v1/prices/compare/route.ts',
  'api/v1/prices/history/route.ts',       // public, window-capped (bulk extends)
  'api/v1/prices/latest/route.ts',
  'api/v1/reports/route.ts',              // computed public reports
  'api/v1/tariffs/[code]/route.ts',
  'api/v1/trade-blocs/[code]/route.ts',
  'api/v1/trade-blocs/route.ts',
  'api/v1/trade/analytics/[code]/route.ts',
  'api/v1/trade/flows/route.ts',
  'api/v1/trade/intelligence/commodities/route.ts',
  'api/v1/trade/intelligence/overview/route.ts',
  'api/v1/trade/intelligence/partners/route.ts',
  'api/v1/trade/sources/route.ts',
]);

const routeFiles = (await walk('src/app/api')).filter((f) => f.endsWith('route.ts'));
const undeclared = [];
let withEntitlement = 0;
for (const file of routeFiles) {
  const rel = path.relative('src/app', file);
  const source = await readFile(file, 'utf8');
  if (/entitlement\s*:/.test(source)) withEntitlement += 1;
  if (!PUBLIC_ROUTES.has(rel) && !/entitlement\s*:/.test(source)) undeclared.push(rel);
}

check('api', 'routes declaring an entitlement', 'reported, not required', `${withEntitlement} of ${routeFiles.length}`, true);
check('api', 'every route is gated or allowlisted', 'none undeclared', undeclared.join(', ') || 'none', undeclared.length === 0);

// The historical-price window must exist in the route, not only in a document.
const history = await readFile('src/app/api/v1/prices/history/route.ts', 'utf8');
check('api', 'history window enforced in code', 'FREE_WINDOW_DAYS present', /FREE_WINDOW_DAYS/.test(history) ? 'present' : 'absent', /FREE_WINDOW_DAYS/.test(history));
check('api', 'history window extends for bulk', 'ENTITLED_WINDOW_DAYS present', /ENTITLED_WINDOW_DAYS/.test(history) ? 'present' : 'absent', /ENTITLED_WINDOW_DAYS/.test(history));

// The internal sync endpoint must stay admin-only.
const sync = await readFile('src/app/api/v1/intelligence/sync/route.ts', 'utf8');
const syncGuarded = /role\s*!==\s*'admin'|role\s*===\s*'admin'|is_admin|requireAdmin/.test(sync);
check('api', 'intelligence/sync is admin-only', 'admin role check present', syncGuarded ? 'present' : 'absent', syncGuarded);

rec.report('Phase 4 — application/database contract');
