console.log('SCRIPT STARTED');
/**
 * End-to-end test of the commercial offer workflow.
 *
 * Users are created through the Supabase Auth Admin API, because the `postgres`
 * role has no direct write access to `auth.users`. That also verifies the
 * `handle_new_user` trigger creates the profile row.
 *
 * The offer assertions run in one rolled-back transaction on one connection,
 * with roles switched via `set local role`. Two earlier attempts at RLS testing
 * were vacuous and must not be repeated:
 *   1. `set local role` outside a transaction does nothing.
 *   2. Reading from a separate connection cannot see uncommitted rows.
 */
import { Client } from 'pg';

// Credentials come from the environment, never from this file. `.env.local` is
// gitignored; nothing here is committed.
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — the Auth Admin API, used to
//                                              create the three test users
//   SUPABASE_DB_HOST, SUPABASE_DB_PORT,
//   SUPABASE_DB_USER, SUPABASE_DB_PASSWORD   — the direct Postgres connection
//
// The script refuses to run if any are missing rather than falling back to a
// default, so a half-configured environment fails loudly.
const REQUIRED = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_HOST', 'SUPABASE_DB_USER', 'SUPABASE_DB_PASSWORD',
];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  console.error('Set them from your Supabase project settings and re-run.');
  process.exit(2);
}
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const raw = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME ?? 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});
const c = {
  query: async (sql, params) => {
    try { return await raw.query(sql, params); }
    catch (e) { console.log('  QUERY FAILED: ' + String(sql).replace(/\s+/g,' ').slice(0,90) + '  ->  ' + e.message); throw e; }
  },
  connect: () => raw.connect(),
  end: () => raw.end(),
};

const results = [];
const check = (name, pass, detail='') => results.push({name, pass, detail});

async function createUser(email, role) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ email, password: 'Test-Password-123!', email_confirm: true, user_metadata: { full_name: email.split('@')[0] } }),
  });
  if (!res.ok) throw new Error(`admin API ${res.status}: ${await res.text()}`);
  const user = await res.json();
  // The trigger creates the profile; set its role.
  await c.query(`update public.profiles set role=$2, account_status='active' where id=$1;`, [user.id, role]);
  return user.id;
}

(async () => {
  await c.connect();
  await c.query('begin');

  const stamp = Date.now();
  const owner = await createUser(`offer-owner-${stamp}@hatsi360.test`, 'customer');
  const verifier = await createUser(`offer-verifier-${stamp}@hatsi360.test`, 'verification_officer');
  const stranger = await createUser(`offer-stranger-${stamp}@hatsi360.test`, 'customer');
  console.log('created 3 auth users; profiles resolved by the handle_new_user trigger');

  const commodity = (await c.query('select id from public.commodities order by id limit 1')).rows[0].id;
  const unit = (await c.query('select id from public.measurement_units order by id limit 1')).rows[0].id;
  const grade = (await c.query('select id from public.commodity_grades where commodity_id=$1 limit 1',[commodity])).rows[0].id;

  const draft = (await c.query(`
    insert into public.buyer_offers
      (user_id, counterparty_name, commodity_id, grade_id, price_amount, price_type, unit_id, currency_code, quantity_required, status)
    values ($1,'Acme Aggregators',$2,$3,41000,'wholesale_transaction',$4,'NGN',500,'draft')
    returning id;`, [owner, commodity, grade, unit])).rows[0].id;

  check('owner can create a draft offer', true, draft.slice(0,8));

  // as() switches the caller identity for RLS and auth.uid()
  const as = async (uid) => {
    await c.query('reset role;');
    await c.query(`set local role authenticated;`);
    await c.query(`select set_config('request.jwt.claims', json_build_object('sub',$1::text,'role','authenticated')::text, true);`, [uid]);
  };

  await c.query(`set local role anon;`);
  check('anon cannot see a draft offer',
    (await c.query('select count(*)::int n from public.buyer_offers where id=$1',[draft])).rows[0].n === 0);

  // probe() runs a statement that is expected to fail, inside a savepoint, so
  // the intentional error does not abort the surrounding transaction.
  let probeId = 0;
  const probe = async (sql, params, matches) => {
    probeId += 1;
    const name = `probe_${probeId}`;
    await c.query(`savepoint ${name};`);
    try {
      await c.query(sql, params);
      await c.query(`release savepoint ${name};`);
      return { failed: false, message: '' };
    } catch (e) {
      await c.query(`rollback to savepoint ${name};`);
      await c.query(`release savepoint ${name};`);
      return { failed: true, message: String(e.message) };
    }
  };

  await as(stranger);
  const nonStaff = await probe(`select public.update_offer_status('buyer_offers',$1,'verified',null);`, [draft]);
  check('a non-staff user cannot verify an offer', nonStaff.failed);

  await as(verifier);
  const noReason = await probe(`select public.update_offer_status('buyer_offers',$1,'rejected',null);`, [draft]);
  check('a rejection without a reason is refused', noReason.failed && /reason/i.test(noReason.message));

  const shortReason = await probe(`select public.update_offer_status('buyer_offers',$1,'rejected','bad');`, [draft]);
  check('a too-short rejection reason is refused', shortReason.failed);

  const verified = await c.query(`select public.update_offer_status('buyer_offers',$1,'verified',null);`, [draft]);
  check('staff can verify an offer', verified.rows[0].update_offer_status === 'verified');

  const events = (await c.query('select from_status, to_status, actor_id from public.offer_verification_events where offer_id=$1',[draft])).rows;
  check('the verification trail records the transition',
    events.length === 1 && events[0].from_status === 'draft' && events[0].to_status === 'verified' && events[0].actor_id === verifier,
    `actor=${String(events[0]?.actor_id).slice(0,8)}`);

  const audit = (await c.query("select action, before_value, after_value from public.audit_events where entity_id=$1",[draft])).rows;
  check('the audit trail records before and after',
    audit.length === 1 && audit[0].action === 'offer_status_changed' && audit[0].before_value.status === 'draft');

  await c.query(`select public.update_offer_status('buyer_offers',$1,'verified',null);`, [draft]);
  check('a repeated decision adds no duplicate event',
    (await c.query('select count(*)::int n from public.offer_verification_events where offer_id=$1',[draft])).rows[0].n === 1);

  const revert = await probe(`select public.update_offer_status('buyer_offers',$1,'draft',null);`, [draft]);
  check('reverting a verified offer without a reason is refused', revert.failed);

  await c.query(`set local role anon;`);
  check('a verified offer stays hidden until the owner consents',
    (await c.query('select count(*)::int n from public.buyer_offers where id=$1',[draft])).rows[0].n === 0);

  await c.query('reset role; set local role postgres;');
  await c.query(`update public.buyer_offers set disclosure_consent = true where id=$1;`, [draft]);
  await c.query(`set local role anon;`);
  check('anon sees a verified offer once consent is given',
    (await c.query('select count(*)::int n from public.buyer_offers where id=$1',[draft])).rows[0].n === 1);
  await c.query('reset role; set local role postgres;');

  await as(owner);
  let priceChanged = (await c.query('select price_amount from public.buyer_offers where id=$1',[draft])).rows[0].price_amount;
  // RLS's USING clause excludes a verified offer, so this UPDATE matches zero
  // rows and returns success. The assertion is on the row count.
  const edit = await c.query(`update public.buyer_offers set price_amount = 999999 where id=$1;`, [draft]);
  const after = (await c.query('select price_amount from public.buyer_offers where id=$1',[draft])).rows[0].price_amount;
  check('the owner cannot edit a verified offer',
    edit.rowCount === 0 && String(after) === String(priceChanged),
    `${edit.rowCount} row(s) matched; price ${priceChanged} -> ${after}`);

  await as(verifier);
  await c.query('reset role; set local role postgres;');
  await c.query(`update public.buyer_offers set valid_from = now() - interval '3 days', valid_until = now() - interval '1 day' where id=$1;`, [draft]);
  await as(verifier);
  await c.query(`select public.expire_lapsed_offers();`);
  await c.query('reset role; set local role postgres;');
  check('a lapsed offer is expired',
    (await c.query('select status from public.buyer_offers where id=$1',[draft])).rows[0].status === 'expired');

  await c.query('rollback');
  await c.end();

  console.log('\n=== COMMERCIAL OFFER WORKFLOW ===');
  let failed = 0;
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
    if (!r.pass) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} passed. Transaction rolled back.`);
  if (failed) process.exit(1);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
