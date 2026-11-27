-- ============================================================================
-- Hatsi360 — 0060 repair `service_role` grant drift (PROPOSED; NOT APPLIED)
-- ============================================================================
-- Prepared under the Phase 5 security-acceptance authorisation of 2026-11-26.
-- **Not applied to production or staging** and not part of the numbered chain.
--
-- FINDING (Phase 5, S-5)
--
-- `0009_grants.sql:92` states the intent: `grant all on all tables in schema
-- public to service_role`. That statement only covers tables that existed when
-- it ran. Every table created afterwards depends on default privileges for
-- `service_role`, and no migration ever created them — `0053` only removes
-- privileges from `anon`/`authenticated`.
--
-- Measured on the migration-chain replica (89 public tables):
--   60 tables grant `service_role` nothing at all
--   29 tables grant it SELECT/INSERT/UPDATE/DELETE
--
-- Affected tables include `export_jobs`, `orders`, `quotes`, `rfqs`,
-- `notifications`, `notification_delivery_logs`, `scheduled_job_runs`,
-- `international_trade_records`, `supplier_profiles`, `order_events`.
--
-- `service_role` bypasses RLS but not table privileges: a server-side worker
-- using the service key against any of those 60 tables receives
-- `42501 permission denied`, not an empty result. That makes the failure a
-- hard error on paths that today have no integration coverage.
--
-- WHY IT IS SEPARATE FROM 0057
--
-- 0057 changes policies only and states that explicitly. Grant changes belong
-- in their own file so that a policy regression and a privilege regression can
-- never be confused during review or rollback.
--
-- SCOPE
--
-- DML only: SELECT, INSERT, UPDATE, DELETE. TRUNCATE, REFERENCES and TRIGGER
-- stay with `postgres`/`supabase_admin`, matching 0053's narrowing. Sequence
-- usage is included because inserts into serial/identity columns need it.
--
-- RISK
--
-- Widening, not narrowing: nothing that works today stops working. The only
-- new capability is server-side access to tables that a holder of the service
-- key already reaches through other means — it is a consistency repair, not a
-- new access path. It must still be replayed on staging first, because it can
-- turn a silently-empty read into a real one in code that never expected rows.
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'grant select, insert, update, delete on public.%I to service_role',
      r.relname
    );
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
  loop
    execute format('grant usage, select on sequence public.%I to service_role', r.relname);
  end loop;
end $$;

-- Stop the drift recurring for tables created by the migration role. As with
-- 0053, `supabase_admin`'s own defaults are outside this file's reach.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;

-- Self-check: fail loudly rather than half-deliver.
do $$
declare
  bad text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not (
      has_table_privilege('service_role', c.oid, 'SELECT')
      and has_table_privilege('service_role', c.oid, 'INSERT')
      and has_table_privilege('service_role', c.oid, 'UPDATE')
      and has_table_privilege('service_role', c.oid, 'DELETE')
    );

  if bad is not null then
    raise exception '0060 incomplete: service_role still lacks DML on %', bad;
  end if;
end $$;
