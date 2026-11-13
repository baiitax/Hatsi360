#!/usr/bin/env node
/**
 * Create (or remove) the Hatsi360 demo accounts.
 *
 * These exist so the agent and admin portals can be signed into for testing.
 * They are deliberately, unmistakably labelled: every profile's `full_name`
 * begins with "DEMO — " and `organisation` says it is not a real user, so a
 * demo account can never be mistaken for a genuine operator in a list, an
 * audit trail or an assignment table.
 *
 *   node scripts/manage_demo_users.mjs            create or update
 *   node scripts/manage_demo_users.mjs --remove   delete every demo account
 *   node scripts/manage_demo_users.mjs --sweep    delete test-fixture accounts
 *
 * Credentials come from the environment, never from this file:
 *   NEXT_PUBLIC_SUPABASE_URL   the project URL
 *   SUPABASE_SERVICE_ROLE_KEY  the service-role key (Auth Admin API + writes)
 *   SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD  direct Postgres
 *
 * The Auth Admin API is used rather than a direct insert into `auth.users`
 * because the `postgres` role has no write access to that table. Using the API
 * also exercises the same `handle_new_user` trigger production sign-ups use, so
 * the profile row is created exactly as it would be for a real account.
 *
 * This script is idempotent: running it twice updates the existing accounts
 * rather than failing, so it is safe to re-run after a password change.
 */

import { Client } from 'pg';

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_HOST',
  'SUPABASE_DB_USER',
  'SUPABASE_DB_PASSWORD',
];

const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variable(s): ${missing.join(', ')}`);
  console.error('Set them from your Supabase project settings and re-run.');
  process.exit(2);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * The demo password.
 *
 * It is shown on the sign-in page, so it is deliberately obvious. It is a
 * throwaway credential for accounts that hold no real data — the platform has
 * no published observations and no commercial records — and it is documented as
 * an exposure in docs/HATSI360_DEMO_ACCOUNTS.md so it can be closed.
 */
const DEMO_PASSWORD = 'hatsi360-demo';

/** A market the demo agent is assigned to, so collection can be exercised. */
const DEMO_MARKET_ID = 1;

/**
 * The three accounts.
 *
 * `role` is the database role, which is what the server-side guards and the RLS
 * policies read. The browser never chooses a destination: `landingPathForRole`
 * derives it from this value after sign-in.
 */
const ACCOUNTS = [
  {
    email: 'demo.agent@hatsi360.test',
    role: 'agent',
    fullName: 'DEMO — Field Agent',
    note: 'Market agent. Lands in the Field app and can collect at the assigned market.',
  },
  {
    email: 'demo.verifier@hatsi360.test',
    role: 'verification_officer',
    fullName: 'DEMO — Verification Officer',
    note: 'Reviews and publishes submitted observations. Lands in the verification queue.',
  },
  {
    email: 'demo.admin@hatsi360.test',
    role: 'admin',
    fullName: 'DEMO — Administrator',
    note: 'Administrator. Lands in the Control Centre. This is the account the public sign-in page exposes, so it is the one to remove first.',
  },
];

const db = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME ?? 'postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function findUserByEmail(email) {
  // The admin list endpoint is paginated; a targeted lookup is not offered, so
  // page through until the address is found. The demo set is three accounts, so
  // this terminates quickly.
  for (let page = 1; page <= 20; page += 1) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    if (!res.ok) throw new Error(`admin API ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const users = body.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (users.length < 200) return null;
  }
  return null;
}

async function upsertUser(account) {
  let user = await findUserByEmail(account.email);

  if (user) {
    // Update the existing account so a re-run after a password change or a role
    // change converges rather than erroring.
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      }),
    });
    if (!res.ok) throw new Error(`admin API update ${res.status}: ${await res.text()}`);
    user = await res.json();
    console.log(`  updated  ${account.email}`);
  } else {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email: account.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: account.fullName },
      }),
    });
    if (!res.ok) throw new Error(`admin API create ${res.status}: ${await res.text()}`);
    user = await res.json();
    console.log(`  created  ${account.email}`);
  }

  // The handle_new_user trigger created the profile row. Set the role and the
  // unmistakable labelling here.
  await db.query(
    `update public.profiles
        set full_name = $2,
            role = $3,
            organisation = 'Hatsi360 demo account — not a real user',
            account_status = 'active',
            is_active = true,
            updated_at = now()
      where id = $1`,
    [user.id, account.fullName, account.role],
  );

  return user.id;
}

async function grantAgentWorkspace(userId) {
  // An agent can only write at markets they are assigned to — that is enforced
  // by RLS, not by the interface. Without an assignment the demo agent could
  // sign in but could not record anything, which would look like a broken app
  // rather than a missing grant.
  await db.query(
    `insert into public.agent_profiles (profile_id, employee_code, employment_status, joined_on)
     values ($1, 'DEMO-AGENT', 'active', current_date)
     on conflict (profile_id) do update
       set employment_status = 'active', updated_at = now()`,
    [userId],
  );

  await db.query(
    `insert into public.market_agent_assignments (user_id, market_id, status, starts_on)
     values ($1, $2, 'active', current_date)
     on conflict do nothing`,
    [userId, DEMO_MARKET_ID],
  );
}

/**
 * Addresses that are test fixtures rather than accounts.
 *
 * The offer-workflow test creates three accounts per run through the Auth Admin
 * API, and the Auth Admin API has no delete-by-query — so every run left three
 * login-capable rows behind. Twenty-nine of them had accumulated in the
 * production `auth.users` table by the time this was noticed.
 *
 * Anything matching these patterns is swept by `--sweep`, so a test run cannot
 * quietly leave credentials behind again.
 */
const TEST_FIXTURE_PATTERNS = [
  /^offer-owner(@|-\d+@)/i,
  /^offer-verifier(-\d+@)/i,
  /^offer-stranger(-\d+@)/i,
  /^rls-.*@hatsi360\.test$/i,
];

function isTestFixture(email) {
  return TEST_FIXTURE_PATTERNS.some((pattern) => pattern.test(email ?? ''));
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; page <= 50; page += 1) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    if (!res.ok) throw new Error(`admin API ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const batch = body.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
  }
  return users;
}

async function removeDemoAccounts() {
  const ids = [];
  for (const account of ACCOUNTS) {
    const user = await findUserByEmail(account.email);
    if (!user) {
      console.log(`  absent  ${account.email}`);
      continue;
    }
    ids.push({ id: user.id, email: account.email });
  }

  if (ids.length === 0) {
    console.log('No demo accounts to remove.');
    return;
  }

  const idList = ids.map((entry) => entry.id);

  // Remove the rows that reference the demo users first, so nothing is left
  // orphaned. Cascades handle most of it; these are the ones that do not.
  await db.query('begin');
  try {
    await db.query(
      `delete from public.market_agent_assignments where user_id = any($1::uuid[])`,
      [idList],
    );
    await db.query(`delete from public.agent_profiles where profile_id = any($1::uuid[])`, [
      idList,
    ]);
    await db.query(`delete from public.profiles where id = any($1::uuid[])`, [idList]);
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }

  for (const entry of ids) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${entry.id}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`admin API delete ${res.status}: ${await res.text()}`);
    }
    console.log(`  removed ${entry.email}`);
  }
}

async function main() {
  const removing = process.argv.includes('--remove');
  const sweeping = process.argv.includes('--sweep');
  await db.connect();

  if (sweeping) {
    console.log('Sweeping test-fixture accounts from auth.users…');
    const users = await listAllUsers();
    const fixtures = users.filter((user) => isTestFixture(user.email));
    if (fixtures.length === 0) {
      console.log('  none found');
    } else {
      const ids = fixtures.map((user) => user.id);
      await db.query('begin');
      try {
        await db.query(
          `delete from public.market_agent_assignments where user_id = any($1::uuid[])`,
          [ids],
        );
        await db.query(`delete from public.agent_profiles where profile_id = any($1::uuid[])`, [
          ids,
        ]);
        await db.query(`delete from public.profiles where id = any($1::uuid[])`, [ids]);
        await db.query('commit');
      } catch (error) {
        await db.query('rollback');
        throw error;
      }
      for (const user of fixtures) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
          method: 'DELETE',
          headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        });
        if (!res.ok && res.status !== 404) {
          throw new Error(`admin API delete ${res.status}: ${await res.text()}`);
        }
        console.log(`  removed ${user.email}`);
      }
    }
    await db.end();
    console.log(`Done. ${fixtures.length} test-fixture account(s) removed.`);
    return;
  }

  if (removing) {
    console.log('Removing the Hatsi360 demo accounts…');
    await removeDemoAccounts();
    await db.end();
    console.log('Done. The sign-in page will show a failed sign-in for these addresses.');
    return;
  }

  console.log('Creating the Hatsi360 demo accounts…');
  await db.query('begin');
  try {
    for (const account of ACCOUNTS) {
      const userId = await upsertUser(account);
      if (account.role === 'agent') await grantAgentWorkspace(userId);
      await db.query('commit');
      await db.query('begin');
    }
    await db.query('commit');
  } catch (error) {
    await db.query('rollback');
    throw error;
  }

  // Verify what was actually written, rather than assuming it.
  const rows = await db.query(
    `select p.email, pr.role, pr.full_name, pr.account_status
       from public.profiles pr
       join auth.users p on p.id = pr.id
      where p.email = any($1::text[])
      order by pr.role`,
    [ACCOUNTS.map((account) => account.email)],
  );

  await db.end();

  console.log('\nDemo accounts now in the database:');
  for (const row of rows.rows) {
    console.log(
      `  ${row.role.padEnd(22)} ${row.email.padEnd(34)} ${row.account_status}  ${row.full_name}`,
    );
  }

  console.log(`\nPassword for all three: ${DEMO_PASSWORD}`);
  console.log(
    'These credentials are printed on the public sign-in page. Remove the accounts with\n' +
      '`node scripts/manage_demo_users.mjs --remove` before any public launch.',
  );
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});
