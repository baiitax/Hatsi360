-- ============================================================================
-- Phase 7B — pre-execution manifest for the hosted-security harness
-- ============================================================================
-- READ-ONLY. Run this in the staging project's SQL editor and save the single
-- JSON row it returns to a file, then pass it with --prereqs.
--
-- The harness never applies migrations and never queries the catalogue itself
-- (PostgREST does not expose it), so it must be told what is applied. Write mode
-- refuses to run without this manifest; read-only mode warns.
--
-- Nothing here writes, and nothing here should be pointed at production.
-- ============================================================================

with
  tables as (
    select 'orders' as t, to_regclass('public.orders') is not null as present
    union all select 'quotes',  to_regclass('public.quotes')  is not null
    union all select 'rfqs',    to_regclass('public.rfqs')    is not null
    union all select 'order_events', to_regclass('public.order_events') is not null
  ),
  fns as (
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           p.prosecdef as security_definer,
           p.proconfig as config
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('has_entitlement','has_entitlement_safe','user_entitlements',
                        'can_perform_bulk_operations','write_audit','create_order_from_quote',
                        'pin_order_quote_economics','guard_order_transition')
  ),
  report_policy as (
    select pg_get_expr(polqual, polrelid) as qual
    from pg_policy
    where polrelid = 'public.market_reports'::regclass and polname = 'reports_public_read'
  )
select json_build_object(
  'generatedAt', now(),
  'probe', 'phase7b-prereqs',
  -- edit this list to the proposals actually applied before running write tests
  'applied', json_build_array('0047'),
  'observations', json_build_object(
    'tables', (select json_object_agg(t, present) from tables),
    'functions', (select json_agg(fns) from fns),
    'has_entitlement_argnames', (
      select p.proargnames from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'has_entitlement'),
    'reports_policy_uses_safe_resolver', (
      select coalesce(position('has_entitlement_safe' in qual) > 0, false) from report_policy),
    'anon_executable_functions', (
      select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
        and has_function_privilege('anon', p.oid, 'EXECUTE')),
    'service_role_missing_dml', (
      select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not (has_table_privilege('service_role', c.oid, 'SELECT')
             and has_table_privilege('service_role', c.oid, 'INSERT')
             and has_table_privilege('service_role', c.oid, 'UPDATE')))
  )
) as manifest;
