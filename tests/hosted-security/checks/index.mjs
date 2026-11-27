/**
 * The ten hosted acceptance checks, transcribed from the definitions that
 * already exist in the repository — PHASE_4_INTEGRATION_TEST_REPORT.md §6 and
 * PHASE_5_HOSTED_TEST_STRATEGY.md §3. Nothing here redefines what a test means;
 * this file only makes each one executable.
 *
 * Contract per check:
 *   id, title, tier ('read-only' | 'write' | 'service' | 'manual' | 'destructive')
 *   layer: which of postgrest | jwt | rls | execute | sql | application it probes
 *   requires: proposal versions the test presumes applied
 *   identity: the JWT context it runs as
 *   run(ctx) -> { status, expected, actual, request?, response?, notes?, dbEvidence? }
 */
import { STATUS } from '../lib/report.mjs';

const PGRST_FN_NOT_FOUND = 'PGRST202';

/** Sign a user in and return a bearer token. Never logged. */
async function signIn(http, email, password) {
  if (!email || !password) return { error: 'no credentials configured' };
  const r = await http.request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  if (!r.ok || !r.json?.access_token) return { error: `sign-in failed (${r.status ?? r.transportError})` };
  return { token: r.json.access_token };
}

const blocked = (notes) => ({ status: STATUS.BLOCKED, expected: '-', actual: '-', notes });
const notExecuted = (notes) => ({ status: STATUS.NOT_EXECUTED, expected: '-', actual: '-', notes });

export const CHECKS = [
  {
    id: 'H-1',
    title: 'Entitlement resolver answers through PostgREST',
    tier: 'read-only',
    layer: ['postgrest', 'jwt', 'sql'],
    identity: 'authenticated (unentitled)',
    requires: ['0056'],
    async run(ctx) {
      const auth = await signIn(ctx.http, ctx.env.userEmail, ctx.env.userPassword);
      if (auth.error) return notExecuted(auth.error);
      const r = await ctx.http.request('/rest/v1/rpc/user_entitlements', {
        method: 'POST', token: auth.token, body: {},
      });
      const pass = r.status === 200 && Array.isArray(r.json);
      return {
        status: pass ? STATUS.PASSED : STATUS.FAILED,
        expected: '200 with a JSON array (production today: 400 / 42P01)',
        actual: `${r.status ?? r.transportError} ${Array.isArray(r.json) ? `${r.json.length} rows` : JSON.stringify(r.response?.body ?? '').slice(0, 120)}`,
        request: r.request, response: r.response,
        notes: 'Negative control: POST /rest/v1/rpc/does_not_exist must return PGRST202, proving the harness distinguishes "function missing" from "function erroring".',
      };
    },
  },

  {
    id: 'H-2',
    title: 'has_entitlement accepts p_key',
    tier: 'read-only',
    layer: ['postgrest', 'jwt', 'execute'],
    identity: 'authenticated (unentitled)',
    requires: ['0056'],
    async run(ctx) {
      const auth = await signIn(ctx.http, ctx.env.userEmail, ctx.env.userPassword);
      if (auth.error) return notExecuted(auth.error);
      const r = await ctx.http.request('/rest/v1/rpc/has_entitlement', {
        method: 'POST', token: auth.token, body: { p_key: 'reports' },
      });
      const pass = r.status === 200 && r.json === false;
      return {
        status: pass ? STATUS.PASSED : STATUS.FAILED,
        expected: '200 and literal false for an unentitled user',
        actual: `${r.status ?? r.transportError} ${JSON.stringify(r.json)}`,
        request: r.request, response: r.response,
      };
    },
  },

  {
    id: 'H-3',
    title: 'The old argument name is rejected (no compatibility shim)',
    tier: 'read-only',
    layer: ['postgrest', 'execute'],
    identity: 'authenticated (unentitled)',
    requires: ['0056'],
    async run(ctx) {
      const auth = await signIn(ctx.http, ctx.env.userEmail, ctx.env.userPassword);
      if (auth.error) return notExecuted(auth.error);
      const r = await ctx.http.request('/rest/v1/rpc/has_entitlement', {
        method: 'POST', token: auth.token, body: { entitlement_key: 'reports' },
      });
      const pass = r.status >= 400 && r.code === PGRST_FN_NOT_FOUND;
      return {
        status: pass ? STATUS.PASSED : STATUS.FAILED,
        expected: `4xx with code ${PGRST_FN_NOT_FOUND}`,
        actual: `${r.status ?? r.transportError} ${r.code ?? ''}`,
        request: r.request, response: r.response,
        notes: 'If this returns 200 the fix lives in a database shim rather than in the callers, which is not the reviewed design.',
      };
    },
  },

  {
    id: 'H-4',
    title: 'Watchlist write through the application (entitled vs not)',
    tier: 'manual',
    layer: ['application', 'rls'],
    identity: 'authenticated, entitled and unentitled',
    requires: ['0057'],
    async run() {
      return notExecuted(
        'Requires a browser session against the app; not automatable from this harness. Procedure: sign in as an entitled user, save a commodity (expect saved); sign in as an unentitled user, save the same commodity (expect a plan message, not a service error). Capture screenshots and the network response.',
      );
    },
  },

  {
    id: 'H-5',
    title: 'Direct PostgREST write bypass is refused for an unentitled session',
    tier: 'write',
    layer: ['postgrest', 'jwt', 'rls'],
    identity: 'authenticated (unentitled), control: authenticated (entitled)',
    requires: ['0057'],
    async run(ctx) {
      if (!ctx.env.serviceKey) return blocked('H-5 needs the service key to seed and clean its fixture');
      const commodityId = await ctx.fixtures.firstCommodityId();
      if (!commodityId) return blocked('no commodity row available to reference');

      const auth = await signIn(ctx.http, ctx.env.userEmail, ctx.env.userPassword);
      if (auth.error) return notExecuted(auth.error);
      const r = await ctx.http.request('/rest/v1/saved_commodities', {
        method: 'POST', token: auth.token, body: { user_id: ctx.userId, commodity_id: commodityId },
        headers: { prefer: 'return=representation' },
      });
      // A refusal must not be a malformed request: 400/401 would be inconclusive.
      const refused = r.status === 403 || r.code === '42501';
      const created = Array.isArray(r.json) ? r.json.map((x) => x.id) : [];
      if (created.length) ctx.fixtures.track('saved_commodities', created);
      return {
        status: refused ? STATUS.PASSED : STATUS.FAILED,
        expected: '403 (or 42501) — never 201',
        actual: `${r.status ?? r.transportError} ${refused ? 'refused' : 'NOT refused'}`,
        request: r.request, response: r.response,
        dbEvidence: created.length ? { created_rows: created } : null,
        notes: 'Negative control: the same insert with an entitled session must succeed, proving the refusal is authorisation and not a malformed payload.',
      };
    },
  },

  {
    id: 'H-6',
    title: 'Anonymous report read returns public rows only, without error',
    tier: 'write',
    layer: ['postgrest', 'jwt', 'rls', 'execute'],
    identity: 'anon',
    requires: ['0056', '0058'],
    async run(ctx) {
      let seeded = null;
      if (ctx.env.serviceKey) {
        seeded = await ctx.fixtures.ensureReportPair();
      }
      const r = await ctx.http.request('/rest/v1/market_reports?select=id,title,is_premium&limit=100');
      const rows = Array.isArray(r.json) ? r.json : [];
      const premiumLeak = rows.some((x) => x.is_premium === true);
      const pass = r.status === 200 && !premiumLeak;
      return {
        status: pass ? STATUS.PASSED : STATUS.FAILED,
        expected: '200, public rows only, no premium row, no 42P01',
        actual: `${r.status ?? r.transportError} ${rows.length} rows, premium=${premiumLeak}`,
        request: r.request, response: r.response,
        dbEvidence: seeded ? { seeded } : null,
        notes: 'Negative control: a GET filtered to the premium fixture id must return zero rows for anon (or 42501), never the row.',
      };
    },
  },

  {
    id: 'H-7',
    title: 'History window is enforced beyond 90 days',
    tier: 'manual',
    layer: ['application', 'execute'],
    identity: 'authenticated, with and without the bulk entitlement',
    requires: ['0042-0045 or 0057'],
    async run(ctx) {
      if (!ctx.env.appUrl || !ctx.env.sessionCookie) {
        return notExecuted(
          'Needs HATSI360_APP_URL and HATSI360_SESSION_COOKIE. Procedure: GET /api/v1/prices/history?commodity_id=<id>&start_date=2000-01-01 — expect 403 naming the 90-day limit; repeat with a session holding the bulk entitlement — expect 200.',
        );
      }
      const r = await ctx.http.request('/api/v1/prices/history?commodity_id=1&start_date=2000-01-01', {
        headers: { cookie: ctx.env.sessionCookie }, key: ctx.env.anonKey,
      });
      return {
        status: r.status === 403 ? STATUS.PASSED : STATUS.FAILED,
        expected: '403 naming the limit',
        actual: `${r.status ?? r.transportError}`,
        request: r.request, response: r.response,
      };
    },
  },

  {
    id: 'H-8',
    title: 'Degraded resolver fails open for public reports only',
    tier: 'destructive',
    layer: ['rls', 'execute', 'application'],
    identity: 'anon and authenticated',
    requires: ['0056', '0058'],
    async run(ctx) {
      if (ctx.env.allowDisruptive !== true) {
        return blocked('destructive: requires HATSI360_ALLOW_DISRUPTIVE=1 and a staging-only window');
      }
      return notExecuted(
        'Operator procedure: break the resolver in staging (rename it, or revoke EXECUTE), then confirm anon report reads still return 200 with public rows, premium shows the outage message, and logs carry [entitlements]. Restore the resolver before any other test. Never on production.',
      );
    },
  },

  {
    id: 'H-9',
    title: 'B2B apply and its negative cases behave over HTTP',
    tier: 'write',
    layer: ['postgrest', 'jwt', 'rls', 'execute'],
    identity: 'authenticated (buyer and supplier)',
    requires: ['0047', '0059'],
    async run(ctx) {
      if (!ctx.prereqs?.applied?.length) {
        return blocked('H-9 needs a prereq manifest (--prereqs) naming the applied proposals; the harness never applies migrations itself');
      }
      if (!['0047', '0059'].every((v) => ctx.prereqs.applied.includes(v))) {
        return blocked('0047 + 0059 are not recorded as applied in the prereq manifest');
      }
      return notExecuted(
        'Requires B2B fixtures (two buyers, two suppliers, an accepted quote). Procedure: POST /rest/v1/rpc/create_order_from_quote with another buyer\'s quote id — expect 403/42501; a direct order insert with a forged unit_price — expect 403/42501; a forged order_events insert — expect 403/42501. Fixtures and cleanup are described in fixtures/README.md.',
      );
    },
  },

  {
    id: 'H-10',
    title: 'Service role reaches the backend tables it needs (after 0060)',
    tier: 'service',
    layer: ['postgrest', 'execute', 'rls'],
    identity: 'service_role',
    requires: ['0060'],
    async run(ctx) {
      if (!ctx.env.serviceKey) return blocked('H-10 requires HATSI360_SERVICE_KEY');
      const svc = await ctx.http.request('/rest/v1/export_jobs?select=id&limit=1', {
        key: ctx.env.serviceKey, token: ctx.env.serviceKey,
      });
      const anon = await ctx.http.request('/rest/v1/export_jobs?select=id&limit=1');
      const pass = svc.status === 200 && (anon.status >= 400 || (Array.isArray(anon.json) && anon.json.length === 0));
      return {
        status: pass ? STATUS.PASSED : STATUS.FAILED,
        expected: 'service key 200; anon key refused or empty',
        actual: `service ${svc.status ?? svc.transportError}, anon ${anon.status ?? anon.transportError}`,
        request: svc.request, response: svc.response,
        notes: 'Before 0060 this fails 42501 for the service key — a privilege gap that looks like an RLS defect.',
      };
    },
  },
];

export const byId = (id) => CHECKS.find((c) => c.id === id.toUpperCase());

export function select({ ids = [], mode = 'read-only', includeDestructive = false } = {}) {
  let chosen = ids.length ? ids.map((id) => byId(id)).filter(Boolean) : CHECKS;
  const skipped = [];
  for (const c of [...chosen]) {
    const destructive = c.tier === 'destructive';
    const needsWrite = c.tier === 'write' || c.tier === 'service';
    if (destructive && !includeDestructive) { skipped.push(c.id); chosen = chosen.filter((x) => x !== c); }
    else if (needsWrite && mode !== 'write') { skipped.push(c.id); chosen = chosen.filter((x) => x !== c); }
  }
  return { chosen, skipped };
}
