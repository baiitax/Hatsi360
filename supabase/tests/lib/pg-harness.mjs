/**
 * Shared harness for the Phase 4 integration suites.
 *
 * Everything runs on the throwaway PostgreSQL replica built by
 * `npm run verify:migrations`. Two safety properties matter:
 *
 *   1. The suite refuses to run against anything that is not the local
 *      replica, so a proposal can never be applied to a hosted project by
 *      running a test.
 *   2. The whole suite runs inside ONE transaction that is rolled back at the
 *      end, so proposals, seeded users and fixture rows leave no residue.
 */
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

export const REPLICA_HOST = '127.0.0.1';
export const REPLICA_PORT = Number(process.env.PGPORT ?? 55432);
export const REPLICA_DB = process.env.PGDATABASE ?? 'pluck_live';

export async function connect() {
  if (REPLICA_HOST !== '127.0.0.1' || REPLICA_PORT !== 55432) {
    throw new Error('Refusing to run: this suite only targets the local replica on 127.0.0.1:55432.');
  }
  const client = new Client({
    host: REPLICA_HOST,
    port: REPLICA_PORT,
    database: REPLICA_DB,
    user: 'postgres',
  });
  await client.connect();
  return client;
}

export async function applyFiles(client, paths) {
  for (const path of paths) {
    const sql = await readFile(path, 'utf8');
    try {
      await client.query(sql);
    } catch (error) {
      throw new Error(`failed applying ${path}: ${error.code} ${error.message}`);
    }
  }
}

/**
 * Apply a file that manages its own transaction (`begin; … commit;`, as 0047
 * does), inside the caller's transaction. The file's own control statements
 * are neutralised so the suite's rollback still owns the outcome — otherwise
 * applying 0047 would commit the harness and the rollback would do nothing.
 */
export async function applyFileInsideTransaction(client, path) {
  let sql = await readFile(path, 'utf8');
  const before = sql;
  sql = sql.replace(/^\s*begin;\s*$/gim, '-- [harness] begin removed: the suite owns the transaction')
           .replace(/^\s*commit;\s*$/gim, '-- [harness] commit removed: the suite owns the transaction');
  if (sql === before) {
    throw new Error(`${path} has no transaction control, use applyFiles() instead`);
  }
  try {
    await client.query(sql);
  } catch (error) {
    throw new Error(`failed applying ${path}: ${error.code} ${error.message}`);
  }
}

/**
 * Run one statement as `role` with the given subject, inside a savepoint that
 * is always rolled back — so a check can write and still leave nothing behind.
 */
export async function runAs(client, role, userId, sql, params = []) {
  const label = `sp_${Math.random().toString(36).slice(2, 10)}`;
  await client.query(`savepoint ${label}`);
  try {
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query(
        `select set_config('request.jwt.claim.sub', $1, true),
                set_config('request.jwt.claim.role', $2, true),
                set_config('request.jwt.claims', $3, true)`,
        [userId, role, JSON.stringify({ sub: userId, role })],
      );
    }
    const result = await client.query(sql, params);
    return { ok: true, rows: result.rows, rowCount: result.rowCount };
  } catch (error) {
    return { ok: false, code: error.code, message: error.message };
  } finally {
    await client.query(`rollback to savepoint ${label}`);
    await client.query(`release savepoint ${label}`);
  }
}

/**
 * Like runAs, but keeps the effect when the statement succeeds — for fixture
 * writes that later checks must observe. Still inside the suite's transaction,
 * and the session role is restored afterwards.
 */
export async function runAsPersist(client, role, userId, sql, params = []) {
  const label = `sp_${Math.random().toString(36).slice(2, 10)}`;
  await client.query(`savepoint ${label}`);
  try {
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query(
        `select set_config('request.jwt.claim.sub', $1, true),
                set_config('request.jwt.claim.role', $2, true),
                set_config('request.jwt.claims', $3, true)`,
        [userId, role, JSON.stringify({ sub: userId, role })],
      );
    }
    const result = await client.query(sql, params);
    await client.query(`release savepoint ${label}`);
    return { ok: true, rows: result.rows, rowCount: result.rowCount };
  } catch (error) {
    await client.query(`rollback to savepoint ${label}`);
    await client.query(`release savepoint ${label}`);
    return { ok: false, code: error.code, message: error.message };
  } finally {
    await client.query('reset role');
  }
}

export const IDs = {
  nosub: 'b0000001-0000-4000-8000-000000000001',
  entitled: 'b0000002-0000-4000-8000-000000000002',
  expired: 'b0000003-0000-4000-8000-000000000003',
  trialEnded: 'b0000004-0000-4000-8000-000000000004',
  cancelled: 'b0000005-0000-4000-8000-000000000005',
  pastDue: 'b0000006-0000-4000-8000-000000000006',
  trialing: 'b0000007-0000-4000-8000-000000000007',
  malformed: 'b0000008-0000-4000-8000-000000000008',
  ghost: 'b0000009-0000-4000-8000-000000000009',
  staff: 'b000000a-0000-4000-8000-00000000000a',
  admin: 'b000000b-0000-4000-8000-00000000000b',
  buyer: 'b000000c-0000-4000-8000-00000000000c',
  supplier: 'b000000d-0000-4000-8000-00000000000d',
  stranger: 'b000000e-0000-4000-8000-00000000000e',
};

const ROLES = {
  nosub: 'customer',
  entitled: 'customer',
  expired: 'customer',
  trialEnded: 'customer',
  cancelled: 'customer',
  pastDue: 'customer',
  trialing: 'customer',
  malformed: 'customer',
  ghost: 'customer',
  staff: 'analyst',
  admin: 'admin',
  buyer: 'customer',
  supplier: 'customer',
  stranger: 'customer',
};

const ALL_KEYS = { watchlists: true, alerts: true, exports: true, reports: true, api: true, bulk: true };

export async function seedUsers(client) {
  for (const [label, id] of Object.entries(IDs)) {
    await client.query(
      `insert into auth.users (id, email, raw_user_meta_data, created_at)
       values ($1, $2, '{}'::jsonb, now())
       on conflict (id) do nothing`,
      [id, `${label}@phase4.invalid`],
    );
    await client.query(
      `insert into public.profiles (id, full_name, role) values ($1, $2, $3::user_role)
       on conflict (id) do update set full_name = excluded.full_name, role = excluded.role`,
      [id, `Phase4 ${label}`, ROLES[label]],
    );
  }
}

export async function seedSubscriptions(client) {
  const rows = [
    // label, status, entitlements, ends_at, trial_ends_at, starts_at
    ['entitled', 'active', ALL_KEYS, null, null, null],
    ['expired', 'active', ALL_KEYS, "-1 day", null, null],
    ['trialEnded', 'trialing', ALL_KEYS, null, "-1 day", null],
    ['cancelled', 'cancelled', ALL_KEYS, null, null, null],
    ['pastDue', 'past_due', ALL_KEYS, null, null, null],
    ['trialing', 'trialing', ALL_KEYS, null, "+14 days", null],
    ['malformed', 'active', { reports: 'yes', watchlists: true }, null, null, null],
    ['ghost', 'active', { not_in_catalog: true, reports: true }, null, null, null],
  ];

  for (const [label, status, entitlements, endsAt, trialEndsAt] of rows) {
    await client.query(
      `insert into public.customer_subscriptions (user_id, plan, status, entitlements, ends_at, trial_ends_at)
       values ($1, 'professional', $2::text, $3::jsonb,
               ${endsAt ? `now() + interval '${endsAt}'` : 'null'},
               ${trialEndsAt ? `now() + interval '${trialEndsAt}'` : 'null'})`,
      [IDs[label], status, JSON.stringify(entitlements)],
    );
  }
}

/** The 0016 body, reproduced verbatim, to prove the defect and its containment. */
export const BROKEN_RESOLVER = `
create or replace function public.user_entitlements()
returns setof text language sql stable security definer set search_path = public
as $fn$
  select distinct k.key
  from public.customer_subscriptions s
  cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e(k, v)
  join public.entitlement_catalog c on c.key = e.k
  where s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (s.trial_ends_at is null or s.trial_ends_at > now())
    and coalesce(e.v, 'false')::boolean;
$fn$;
`;

export function makeRecorder() {
  const results = [];
  return {
    results,
    check(context, check, expected, actual, pass) {
      results.push({ context, check, expected, actual: actual === undefined ? '-' : String(actual), pass });
    },
    report(title) {
      console.log(`\n=== ${title} (local replica, single rolled-back transaction) ===\n`);
      let last = null;
      for (const r of results) {
        if (r.context !== last) {
          console.log(`[${r.context}]`);
          last = r.context;
        }
        console.log(
          `  ${r.pass ? 'PASS' : 'FAIL'}  ${r.check.padEnd(56)} expected ${String(r.expected).padEnd(26)} got ${r.actual}`,
        );
      }
      const failed = results.filter((r) => !r.pass);
      console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
      if (failed.length) {
        console.log(`\n${failed.length} FAILED`);
        process.exitCode = 1;
      } else {
        console.log('ALL CHECKS PASSED');
      }
    },
  };
}

export const keysOf = (rows) => rows.map((r) => r.user_entitlements).sort().join(',');
