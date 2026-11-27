-- ============================================================================
-- Hatsi360 — 0061 curated EXECUTE privileges on application functions
-- ============================================================================
-- PROPOSED. NOT APPLIED to production or staging, and deliberately outside
-- supabase/migrations/ so nothing applies it by accident.
--
-- FINDING (Phase 5 S-1 / Phase 6 B)
--
-- PostgreSQL grants EXECUTE on every new function to PUBLIC. No migration ever
-- revoked it, so all 184 public functions — 69 application functions and 115
-- extension functions — are callable by `anon`. `grant execute … to
-- authenticated` in 0056 changed nothing: the grantee already had the privilege
-- through PUBLIC.
--
-- WHY THIS IS NOT A BLANKET REVOKE
--
-- RLS policies are evaluated with the *caller's* privileges. A blanket
-- `revoke … from public, anon` was measured in Phase 5 and it breaks anonymous
-- reads: with only is_public_observation and is_staff granted, an anonymous
-- read of market_reports fails 42501, because the policy's premium branch calls
-- has_entitlement_safe(). The allowlist below is the *measured* minimum, not a
-- guess:
--
--   is_public_observation   price_observations, price_observation_evidence
--   is_staff                offer_verification_events, and OR-branch of
--                           reports_public_read
--   has_entitlement_safe    market_reports premium branch (returns false for
--                           anon; must not raise)
--
-- Three functions. Everything else anon can reach today, it does not need.
--
-- HARD DEPENDENCY: 0056 + 0058 must already be applied. Before 0058 the
-- market_reports policy calls has_entitlement() instead of
-- has_entitlement_safe(); revoking has_entitlement from anon without 0058 turns
-- every anonymous report read into a 42501. The self-check at the end of this
-- file fails rather than allowing that state.
--
-- WHAT IS NOT EXPRESSIBLE HERE
--
-- "Staff" and "admin" are not database roles. Every signed-in user connects as
-- `authenticated`; staff-ness lives in the JWT/profile and is enforced inside
-- each function by is_staff()/is_admin(). Staff-only functions therefore keep
-- `authenticated` EXECUTE and rely on their internal guard — which is why the
-- Phase 6 test suite attacks them as a non-staff authenticated user rather than
-- pretending a grant can separate them.
--
-- EXTENSION FUNCTIONS ARE NOT TOUCHED
--
-- 115 functions in public belong to citext, pgcrypto and pg_trgm. Operator
-- invocation requires EXECUTE on the underlying function, so revoking them
-- would break ordinary comparisons, uniqueness checks and text search for anon
-- and authenticated alike. They are left to the extension, and are recorded as
-- a separate residual (see PHASE_6_FUNCTION_PRIVILEGE_AUDIT.md §6).
--
-- RECOVERY: `grant execute on function … to public` restores the previous state
-- for any function; the pre-migration state is captured by pre_functions.csv in
-- the release preflight.
-- ============================================================================

-- ---------------------------------------------------------------- classify --
create temporary table if not exists p6_fn_class (
  fn text primary key,
  class text not null check (class in ('public', 'authenticated', 'service')),
  reason text not null
) on commit drop;

insert into p6_fn_class (fn, class, reason) values
  -- 1. public: needed by anonymous RLS policies and public market reads -- measured
  ('is_public_observation',           'public', 'anon read policy on price_observations / evidence'),
  ('is_staff',                        'public', 'anon read policy OR-branch on offer_verification_events, market_reports'),
  ('has_entitlement_safe',            'public', 'anon premium branch of reports_public_read; returns false, never raises'),

  -- 4. service only: no internal guard, no application call site
  ('write_audit',                     'service', 'no authorization check at all — any caller could forge audit rows'),
  ('handle_new_user',                 'service', 'auth hook trigger function; never invoked by a client'),

  -- trigger functions: fire regardless of EXECUTE, so no client needs them
  ('audit_observation_change',        'service', 'trigger function'),
  ('log_entitlement_change',          'service', 'trigger function'),
  ('notify_assignment_change',        'service', 'trigger function'),
  ('prevent_published_economic_mutation','service','trigger function'),
  ('prevent_role_escalation',         'service', 'trigger function'),
  ('set_updated_at',                  'service', 'trigger function'),
  ('sync_account_status',             'service', 'trigger function'),
  ('update_commodity_intelligence_timestamp','service','trigger function'),
  ('update_notification_preferences_updated_at','service','trigger function'),
  ('update_rfq_quote_count',          'service', 'trigger function'),
  ('update_supplier_average_rating',  'service', 'trigger function'),
  ('update_supplier_profile_completeness','service','trigger function'),

  -- 2. authenticated: everything a signed-in session calls, including the
  --    staff-guarded functions (guard is internal, see header)
  ('agent_evidence_url',              'authenticated', 'field app RPC'),
  ('api_application_entitlements',    'authenticated', 'API application entitlement lookup'),
  ('append_correction',               'authenticated', 'observation workflow, is_staff guarded'),
  ('apply_observation_findings',      'authenticated', 'observation workflow, is_staff guarded'),
  ('approve_observation',             'authenticated', 'observation workflow, is_staff guarded'),
  ('assigned_market_ids',             'authenticated', 'RLS helper for agent rows'),
  ('batch_publish_observations',      'authenticated', 'observation workflow, is_staff guarded'),
  ('can_perform_bulk_operations',     'authenticated', 'bulk entitlement helper'),
  ('clear_login_attempts',            'authenticated', 'sign-in rate limiter (session client)'),
  ('close_collection_batch',          'authenticated', 'operations workflow, is_staff guarded'),
  ('complete_export_job',             'authenticated', 'export workflow'),
  ('complete_onboarding',             'authenticated', 'onboarding wizard'),
  ('count_login_attempts',            'authenticated', 'sign-in rate limiter (session client)'),
  ('create_export_job',               'authenticated', 'export workflow'),
  ('create_order_from_quote',         'authenticated', 'B2B order creation, caller checked'),
  ('current_account_status',          'authenticated', 'account status helper'),
  ('current_role',                    'authenticated', 'role helper'),
  ('expire_lapsed_offers',            'authenticated', 'offer expiry, definer path'),
  ('expire_old_rfqs',                 'authenticated', 'RFQ expiry, guarded by 0059'),
  ('generate_collection_tasks',       'authenticated', 'jobs runner (session client)'),
  ('generate_order_number',           'authenticated', 'order number generator'),
  ('has_entitlement',                 'authenticated', 'entitlement resolver for signed-in callers'),
  ('has_role',                        'authenticated', 'RLS helper'),
  ('is_active_account',               'authenticated', 'RLS helper'),
  ('is_admin',                        'authenticated', 'RLS helper'),
  ('is_assigned_to_market',           'authenticated', 'field app RPC'),
  ('mark_overdue_tasks',              'authenticated', 'jobs runner (session client)'),
  ('notify',                          'authenticated', 'notification insert helper'),
  ('observation_findings',            'authenticated', 'observation workflow'),
  ('open_collection_batch',           'authenticated', 'operations workflow, is_staff guarded'),
  ('provision_agent',                 'authenticated', 'operations workflow, is_admin guarded'),
  ('publication_events',              'authenticated', 'publication history read'),
  ('publish_observation',             'authenticated', 'observation workflow, is_staff guarded'),
  ('publish_observation_with_event',  'authenticated', 'observation workflow, is_staff guarded'),
  ('raise_quality_flag',              'authenticated', 'observation workflow, is_staff guarded'),
  ('record_login_attempt',            'authenticated', 'sign-in rate limiter (session client)'),
  ('refresh_analytics_snapshot',      'authenticated', 'jobs runner (session client)'),
  ('reject_observation',              'authenticated', 'observation workflow, is_staff guarded'),
  ('request_correction',              'authenticated', 'observation workflow, is_staff guarded'),
  ('resolve_quality_flag',            'authenticated', 'observation workflow, is_staff guarded'),
  ('resubmit_observation',            'authenticated', 'observation workflow, is_staff guarded'),
  ('set_account_status',              'authenticated', 'operations workflow, is_admin guarded'),
  ('set_market_assignment',           'authenticated', 'operations workflow, is_admin guarded'),
  ('set_user_role',                   'authenticated', 'role management, is_admin guarded'),
  ('submit_observation',              'authenticated', 'observation workflow, is_staff guarded'),
  ('transition_task',                 'authenticated', 'operations workflow, is_staff guarded'),
  ('update_agent_contact',            'authenticated', 'field app self-service, auth.uid guarded'),
  ('update_offer_status',             'authenticated', 'offer workflow, is_staff guarded'),
  ('update_onboarding_step',          'authenticated', 'onboarding wizard'),
  ('user_entitlements',               'authenticated', 'entitlement resolver'),
  ('withdraw_observation',            'authenticated', 'observation workflow, is_staff guarded');

-- ------------------------------------------------------------- self-checks --
do $$
declare
  missing text;
  unknown_fns text;
begin
  -- every listed function must exist, or the file is silently under-delivering
  select string_agg(c.fn, ', ') into missing
  from p6_fn_class c
  where not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = c.fn
  );
  if missing is not null then
    raise exception '0061: classified functions do not exist: %', missing;
  end if;

  -- any application function (non-extension) that is not classified is a hole
  select string_agg(p.proname, ', ' order by p.proname) into unknown_fns
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and not exists (select 1 from p6_fn_class c where c.fn = p.proname);
  if unknown_fns is not null then
    raise exception '0061: unclassified application functions: %', unknown_fns;
  end if;
end $$;

-- ------------------------------------------------------------------- apply --
do $$
declare
  r record;
  c record;
begin
  for c in select fn, class from p6_fn_class loop
    for r in
      select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = c.fn
    loop
      execute format('revoke execute on function %s from public, anon, authenticated, service_role', r.sig);
      if c.class = 'public' then
        execute format('grant execute on function %s to anon, authenticated, service_role', r.sig);
      elsif c.class = 'authenticated' then
        execute format('grant execute on function %s to authenticated, service_role', r.sig);
      else
        execute format('grant execute on function %s to service_role', r.sig);
      end if;
    end loop;
  end loop;
end $$;

-- ------------------------------------------------------------ verify state --
do $$
declare
  bad text;
  anon_set text;
begin
  -- 1. nothing application-owned is executable by PUBLIC
  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) a where a.grantee = 0 and a.privilege_type = 'EXECUTE'));
  if bad is not null then
    raise exception '0061: still executable by PUBLIC: %', bad;
  end if;

  -- 2. anon reaches exactly the three public helpers
  select string_agg(p.proname, ', ' order by p.proname) into anon_set
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  if coalesce(anon_set, '') <> 'has_entitlement_safe, is_public_observation, is_staff' then
    raise exception '0061: anon executable set is [%], expected the three public helpers', anon_set;
  end if;

  -- 3. every function referenced by an anon-reachable policy must be executable
  --    by anon, or anonymous reads fail at runtime with 42501
  select string_agg(distinct pol.polname || ' -> ' || f.proname, ', ') into bad
  from pg_policy pol
  join pg_class rel on rel.oid = pol.polrelid
  join pg_namespace rn on rn.oid = rel.relnamespace
  cross join pg_proc f
  join pg_namespace fn on fn.oid = f.pronamespace
  where rn.nspname = 'public'
    and fn.nspname = 'public'
    and (pol.polroles = '{0}'::oid[] or 'anon'::regrole::oid = any(pol.polroles))
    and position(f.proname || '(' in coalesce(pg_get_expr(pol.polqual, pol.polrelid), '')
                 || ' ' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')) > 0
    and not has_function_privilege('anon', f.oid, 'EXECUTE');
  if bad is not null then
    raise exception '0061: anon-reachable policies call functions anon cannot execute: %', bad;
  end if;

  -- 4. the audit writer and the auth hook stay out of client reach
  select string_agg(p.proname, ', ') into bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname in ('write_audit', 'handle_new_user')
    and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if bad is not null then
    raise exception '0061: service-only functions still reachable by clients: %', bad;
  end if;
end $$;
