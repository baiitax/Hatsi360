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
-- SCOPE  (revised in Phase 6 — see PHASE_6_SERVICE_ROLE_GRANT_MATRIX.md)
--
-- SELECT, INSERT and UPDATE on every public table.
-- DELETE everywhere EXCEPT the five append-only evidence tables below.
-- TRUNCATE, REFERENCES and TRIGGER are never granted here, matching 0053.
-- Sequence usage is included because inserts into serial/identity columns need it.
--
-- WHY DELETE IS WITHHELD ON FIVE TABLES
--
-- `service_role` is a trusted server key and it already bypasses RLS, so
-- per-table narrowing buys little confidentiality. What it does buy is
-- integrity against a *bug*, not an attacker: a mistaken or runaway server-side
-- delete of the audit trail is unrecoverable in a way that a wrong UPDATE is
-- not. These five tables are evidence — rows that exist to say what happened:
--
--   audit_events, order_events, offer_verification_events, publication_events,
--   price_observation_evidence
--
-- Deleting from them stays a deliberate act by `postgres`/`supabase_admin`.
-- Everything else keeps DELETE, because a retention or cleanup path that
-- silently fails with 42501 is the exact class of failure this file exists to
-- remove.
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
  evidence text[] := array[
    'audit_events',
    'order_events',
    'offer_verification_events',
    'publication_events',
    'price_observation_evidence'
  ];
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'grant select, insert, update on public.%I to service_role',
      r.relname
    );
    if not (r.relname = any (evidence)) then
      execute format(
        'grant delete on public.%I to service_role',
        r.relname
      );
    else
      -- an evidence table may hold DELETE or TRUNCATE from an earlier blanket
      -- grant (0009 granted `all`); remove both. TRUNCATE is the worse of the
      -- two: row security never applies to it.
      execute format(
        'revoke delete, truncate on public.%I from service_role',
        r.relname
      );
    end if;
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
  grant select, insert, update on tables to service_role;
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
    );

  if bad is not null then
    raise exception '0060 incomplete: service_role still lacks select/insert/update on %', bad;
  end if;

  -- evidence tables must not be deletable by the service key
  select string_agg(c.relname, ', ' order by c.relname)
  into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname = any (array['audit_events','order_events','offer_verification_events','publication_events','price_observation_evidence'])
    and has_table_privilege('service_role', c.oid, 'DELETE');

  if bad is not null then
    raise exception '0060: evidence tables still deletable by service_role: %', bad;
  end if;

  -- this file grants no TRUNCATE. The five evidence tables had no service_role
  -- privilege at all before it ran, so TRUNCATE there can only have come from here.
  select string_agg(c.relname, ', ' order by c.relname)
  into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and c.relname = any (array['audit_events','order_events','offer_verification_events','publication_events','price_observation_evidence'])
    and has_table_privilege('service_role', c.oid, 'TRUNCATE');

  if bad is not null then
    raise exception '0060 granted TRUNCATE on evidence tables: %', bad;
  end if;
end $$;
