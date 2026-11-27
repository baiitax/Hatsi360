/**
 * Phase 5 — hosted validation runner for H-1 … H-10.
 *
 * WRITTEN, NEVER EXECUTED. No hosted project was available during Phase 5, so
 * this file is a checklist with a runner attached, not tested tooling. Expect to
 * correct a URL or a payload the first time it runs.
 *
 * Usage:
 *   HOSTED_URL=https://<ref>.supabase.co \
 *   ANON_KEY=... SERVICE_KEY=... \
 *   USER_EMAIL=... USER_PASSWORD=... \
 *   ENTITLED_EMAIL=... ENTITLED_PASSWORD=... \
 *   ALLOW_REMOTE=1 node supabase/tests/hosted/phase5-hosted.mjs
 *
 * Safety: refuses to run against a *.supabase.co host unless ALLOW_REMOTE=1, so
 * it cannot be pointed at production by a stray environment variable.
 */
const env = process.env;
const url = (env.HOSTED_URL ?? '').replace(/\/$/, '');

if (!url) {
  console.error('HOSTED_URL is required.');
  process.exit(2);
}
if (/supabase\.co/.test(url) && env.ALLOW_REMOTE !== '1') {
  console.error(`Refusing to run against ${url} without ALLOW_REMOTE=1.`);
  process.exit(2);
}

const results = [];
const record = (id, label, pass, detail) => {
  results.push({ id, pass });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${id.padEnd(5)} ${label}${detail ? ` — ${detail}` : ''}`);
};

const req = async (path, { method = 'GET', token, key, body, raw } = {}) => {
  const headers = {
    apikey: key ?? env.ANON_KEY,
    authorization: `Bearer ${token ?? key ?? env.ANON_KEY}`,
    'content-type': 'application/json',
  };
  if (raw) headers.prefer = raw;
  const res = await fetch(`${url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, body: json, text };
};

const signIn = async (email, password) => {
  const r = await req('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
    key: env.ANON_KEY,
  });
  if (r.status !== 200) throw new Error(`sign-in failed for ${email}: ${r.status} ${r.text.slice(0, 200)}`);
  return r.body.access_token;
};

const run = async () => {
  console.log(`\nPhase 5 hosted validation — ${url}\n`);

  // H-2 / H-3 — RPC argument resolution. Cheapest and most diagnostic.
  const userToken = await signIn(env.USER_EMAIL, env.USER_PASSWORD);
  const h2 = await req('/rest/v1/rpc/has_entitlement', { method: 'POST', token: userToken, body: { p_key: 'reports' } });
  record('H-2', 'rpc/has_entitlement accepts p_key', h2.status === 200 && typeof h2.body === 'boolean',
    `${h2.status} ${JSON.stringify(h2.body).slice(0, 80)}`);

  const h3 = await req('/rest/v1/rpc/has_entitlement', { method: 'POST', token: userToken, body: { entitlement_key: 'reports' } });
  const h3code = h3.body?.code ?? '';
  record('H-3', 'old argument name is rejected', h3.status >= 400 && String(h3code).includes('PGRST202'),
    `${h3.status} ${h3code}`);

  // H-1 — resolver through PostgREST.
  const h1 = await req('/rest/v1/rpc/user_entitlements', { method: 'POST', token: userToken, body: {} });
  record('H-1', 'rpc/user_entitlements returns rows', h1.status === 200 && Array.isArray(h1.body),
    `${h1.status} ${Array.isArray(h1.body) ? `${h1.body.length} rows` : JSON.stringify(h1.body).slice(0, 80)}`);

  // H-6 — anonymous public report read.
  const h6 = await req('/rest/v1/market_reports?select=id,is_premium&limit=5');
  const premiumLeak = Array.isArray(h6.body) && h6.body.some((r) => r.is_premium === true);
  record('H-6', 'anon sees public reports only', h6.status === 200 && !premiumLeak,
    `${h6.status} ${Array.isArray(h6.body) ? `${h6.body.length} rows` : h6.text.slice(0, 80)}`);

  // H-5 — direct write bypass must be refused, not silently ignored.
  const h5 = await req('/rest/v1/saved_commodities', {
    method: 'POST', token: userToken, body: { user_id: 'me', commodity_id: 1 },
  });
  record('H-5', 'unentitled direct insert refused', h5.status === 403 || h5.status === 401, `${h5.status}`);

  // H-10 — service role bypass, including export_jobs (needs 0060).
  const h10 = await req('/rest/v1/export_jobs?select=id&limit=1', { key: env.SERVICE_KEY, token: env.SERVICE_KEY });
  record('H-10', 'service role reads export_jobs', h10.status === 200,
    `${h10.status} ${h10.text.slice(0, 80)}`);

  // H-7 — history window, needs the app origin, so it is opt-in.
  if (env.APP_URL) {
    const over = await fetch(`${env.APP_URL}/api/v1/prices/history?commodity_id=1&start_date=2000-01-01`, {
      headers: { cookie: env.SESSION_COOKIE ?? '' },
    });
    record('H-7', 'history window refused beyond the plan limit', over.status === 403, `${over.status}`);
  } else {
    console.log('  SKIP  H-7    history window (APP_URL / SESSION_COOKIE not set)');
  }

  // The remaining checks are interactive by nature and are listed, not run.
  for (const [id, label] of [
    ['H-4', 'watchlist write through the UI (manual: two accounts, one entitled)'],
    ['H-8', 'degraded resolver (manual: break it in staging, never in production)'],
    ['H-9', 'B2B atomic apply + negative cases (run b2b-acceptance against the staging DB)'],
  ]) {
    console.log(`  SKIP  ${id.padEnd(5)} ${label}`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} hosted checks passed`);
  if (failed.length) {
    console.log(`Failed: ${failed.map((f) => f.id).join(', ')}`);
    process.exit(1);
  }
};

run().catch((err) => {
  console.error(`\nRunner aborted: ${err.message}`);
  process.exit(2);
});
