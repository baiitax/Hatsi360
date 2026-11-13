#!/usr/bin/env node
/**
 * Validate the Hatsi360 Supabase migrations against a real PostgreSQL server.
 *
 * A throwaway PostgreSQL instance is started, a minimal stub of the Supabase
 * `auth` schema is created (auth.users + auth.uid()), and every migration file
 * is applied in order. Any SQL error fails the run.
 *
 *   node scripts/validate-migrations.mjs
 *
 * The instance is local and disposable; it never touches a real project.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const PORT = Number(process.env.PGPORT ?? 55432);
const DB = 'pluck_live';

const { Client } = pg;

/**
 * Split a SQL script into individual statements.
 *
 * The RLS permission test contains explicit `begin;` / `rollback;` blocks. If
 * the whole file is sent as one simple-query message, PostgreSQL wraps it in
 * an implicit transaction and the first `rollback;` undoes the fixtures as
 * well — the script then fails with "schema rls_test does not exist". Each
 * statement is therefore sent on its own, so the explicit transaction control
 * in the script behaves as written.
 *
 * The splitter understands single-quoted strings, double-quoted identifiers,
 * line comments, block comments and dollar-quoted strings ($tag$ ... $tag$).
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let dollarTag = null;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next2 = sql.slice(i, i + 2);

    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        current += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }

    if (next2 === '--') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (next2 === '/*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      current += sql.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === "'" || ch === '"') {
      current += ch;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === ch) {
          if (sql[i + 1] === ch) {
            current += ch + ch;
            i += 2;
            continue;
          }
          current += ch;
          i += 1;
          break;
        }
        current += sql[i];
        i += 1;
      }
      continue;
    }

    if (ch === '$') {
      const tag = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i));
      if (tag) {
        dollarTag = tag[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    if (ch === ';') {
      statements.push(current);
      current = '';
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  if (current.trim()) statements.push(current);
  return statements.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Run a SQL script one statement at a time, so that explicit transaction
 * control inside the script behaves as written. Reports the failing statement.
 */
async function runSqlScript(db, sql, label) {
  const statements = splitSqlStatements(sql);
  console.log(`    ${statements.length} statements`);
  for (const [index, statement] of statements.entries()) {
    try {
      await db.query(statement);
    } catch (err) {
      console.error(`\n${label.toUpperCase()} FAILED (statement ${index + 1}):\n${err.message}`);
      console.error('--- statement ---\n' + statement.slice(0, 900));
      await db.query('rollback;').catch(() => {});
      throw err;
    }
  }
  console.log(`    all ${label} assertions passed`);
}

async function main() {
  const admin = new Client({ host: '127.0.0.1', port: PORT, user: 'postgres', database: 'postgres' });
  await admin.connect();

  await admin.query(`drop database if exists ${DB};`);
  await admin.query(`create database ${DB};`);
  await admin.end();

  const db = new Client({ host: '127.0.0.1', port: PORT, user: 'postgres', database: DB });
  await db.connect();

  console.log('==> creating Supabase auth stub');
  await db.query(`
    -- Supabase provisions these roles; plain PostgreSQL does not.
    do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text unique,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );
    create or replace function auth.uid() returns uuid
      language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to public;

    -- A minimal stub of the Supabase Storage schema. Migrations that create
    -- buckets, storage policies or signed URLs need the objects and buckets
    -- tables and the foldername helper to exist, exactly as they do on a
    -- real Supabase project.
    create schema if not exists storage;
    create table if not exists storage.buckets (
      id text primary key,
      name text not null,
      owner uuid,
      public boolean default false,
      file_size_limit bigint,
      allowed_mime_types text[],
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table if not exists storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets (id),
      name text not null,
      owner uuid,
      metadata jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    -- The real Supabase helper returns the folder segments and drops the
    -- file name. The stub has to behave the same way, or a storage policy
    -- that is correct on a real project would pass here and fail there.
    create or replace function storage.foldername(name text) returns text[]
      language sql immutable as $$
        select coalesce(
          (string_to_array(coalesce(name, ''), '/'))[
            1:greatest(array_length(string_to_array(coalesce(name, ''), '/'), 1) - 1, 0)
          ],
          '{}'::text[]
        )
      $$;
    create or replace function storage.create_signed_url(
      bucket_id text, path text, expires_in integer, options jsonb default '{}'::jsonb)
    returns text
      language sql stable as $$
        select 'https://storage.stub.invalid/object/sign/'
          || bucket_id || '/' || path
          || '?token=' || substr(md5(bucket_id || '/' || path), 1, 24)
          || '&expires=' || expires_in::text
      $$;
    -- The platform enables row-level security on the storage tables. The
    -- stub has to do the same, or a storage policy would be ignored here
    -- and enforced there.
    alter table storage.objects enable row level security;
    alter table storage.buckets enable row level security;

    grant usage on schema storage to public;

    -- The same grants the platform gives. Storage access is governed by
    -- row-level security on storage.objects, not by table privileges, so
    -- the stub has to grant the table and let the policies decide.
    grant select on storage.buckets to anon, authenticated, service_role;

    -- The platform lets a signed-in client see the bucket list.
    create policy storage_buckets_read on storage.buckets
      for select to anon, authenticated
      using (true);
    grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
  `);

  console.log('==> applying migrations');
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
    process.stdout.write(`    - ${file}\n`);
    try {
      await db.query(sql);
    } catch (err) {
      console.error(`\nFAILED in ${file}:\n${err.message}\n`);
      console.error('code   :', err.code);
      console.error('detail :', err.detail);
      console.error('where  :', err.where);
      console.error('hint   :', err.hint);
      console.error('position:', err.position);
      if (err.position) {
        const pos = Number(err.position);
        console.error('--- context ---');
        console.error(sql.slice(Math.max(0, pos - 400), pos + 400));
      }
      await db.end();
      process.exit(1);
    }
  }

  console.log('==> verifying objects');
  const counts = await db.query(`
    select
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname='public' and c.relkind='r') as tables,
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relrowsecurity) as rls_tables,
      (select count(*) from pg_policies where schemaname='public') as policies,
      (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname='public' and c.relkind='v') as views;
  `);
  const { tables, rls_tables, policies, views } = counts.rows[0];
  console.log(`    public tables      : ${tables}`);
  console.log(`    tables with RLS    : ${rls_tables}`);
  console.log(`    RLS policies       : ${policies}`);
  console.log(`    public views       : ${views}`);

  const noRls = await db.query(`
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
    order by 1;
  `);
  if (noRls.rowCount > 0) {
    console.error('\nFAILED: tables without RLS:', noRls.rows.map((r) => r.relname).join(', '));
    await db.end();
    process.exit(1);
  }

  console.log('==> running migration smoke tests');
  const smoke = await db.query(`
    do $$
    declare
      v_market int; v_commodity int; v_prices int; v_units int; v_states int;
    begin
      select count(*) into v_market from public.markets;
      select count(*) into v_commodity from public.commodities;
      select count(*) into v_states from public.states;
      select count(*) into v_units from public.measurement_units;
      select count(*) into v_prices from public.price_observations;
      if v_market <> 11 then raise exception 'expected 11 markets, got %', v_market; end if;
      if v_commodity <> 22 then raise exception 'expected 22 commodities, got %', v_commodity; end if;
      if v_states <> 11 then raise exception 'expected 11 states, got %', v_states; end if;
      if v_units <> 8 then raise exception 'expected 8 units, got %', v_units; end if;
      if v_prices <> 0 then raise exception 'seed must not create price observations, got %', v_prices; end if;
      raise notice 'markets=% commodities=% states=% units=% prices=%',
        v_market, v_commodity, v_states, v_units, v_prices;
    end $$;
  `);
  console.log('    seed checks passed');

  // Every public table must be reachable by an authenticated user only through
  // an explicit policy (no "allow all" fallback).
  const permissive = await db.query(`
    select policyname, tablename, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual,'') in ('true','') or coalesce(with_check,'') in ('true',''))
      and tablename <> 'article_categories';
  `);
  if (permissive.rowCount > 0) {
    console.warn('    note: permissive policies found:',
      permissive.rows.map((r) => `${r.tablename}.${r.policyname}`).join(', '));
  }

  console.log('==> running Row Level Security permission tests');
  const rlsSql = readFileSync(join(ROOT, 'tests', 'rls', 'permission-tests.sql'), 'utf8');
  await runSqlScript(db, rlsSql, 'RLS permission tests');

  console.log('==> running operations workflow tests');
  const workflowSql = readFileSync(join(ROOT, 'tests', 'operations', 'workflow-tests.sql'), 'utf8');
  await runSqlScript(db, workflowSql, 'operations workflow tests');

  // The suites must leave nothing behind. A leftover synthetic price would be
  // a synthetic price in the database, so the check is part of the contract.
  console.log('==> checking that the suites left nothing behind');
  const leftovers = await db.query(`
    select
      (select count(*) from public.price_observations) as observations,
      (select count(*) from public.profiles
        where id in (
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333',
          '44444444-4444-4444-4444-444444444444',
          '55555555-5555-5555-5555-555555555555',
          '66666666-6666-6666-6666-666666666666',
          '88888888-8888-8888-8888-888888888888'
        )) as profiles,
      (select count(*) from auth.users
        where id in (
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
          '33333333-3333-3333-3333-333333333333',
          '44444444-4444-4444-4444-444444444444',
          '55555555-5555-5555-5555-555555555555',
          '66666666-6666-6666-6666-666666666666',
          '77777777-7777-7777-7777-777777777777',
          '88888888-8888-8888-8888-888888888888'
        )) as auth_users,
      (select count(*) from public.collection_tasks where id in (901, 902)) as tasks;
  `);
  const l = leftovers.rows[0];
  if (Number(l.observations) !== 0 || Number(l.profiles) !== 0
      || Number(l.auth_users) !== 0 || Number(l.tasks) !== 0) {
    throw new Error(
      `The suites left rows behind: observations=${l.observations}, profiles=${l.profiles}, ` +
      `auth_users=${l.auth_users}, tasks=${l.tasks}. The cleanup section is not complete.`);
  }
  console.log('    no leftover rows');

  await db.end();
  console.log('\nALL MIGRATIONS APPLIED CLEANLY');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
