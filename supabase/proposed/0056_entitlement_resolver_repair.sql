-- ============================================================================
-- Hatsi360 — 0056 repair the entitlement resolver (PROPOSED, UNAPPLIED)
-- ============================================================================
-- Kept outside supabase/migrations/ until separately approved. No production
-- execution is authorised for this file.
--
-- Addresses Phase 3 findings E-1 (resolver raises), E-3's database side, the
-- missing bulk helper, malformed stored values, and the "fail open by error"
-- behaviour of a raising predicate inside a policy.
--
-- Supersedes 0052's content rather than repeating it: 0052 is unapplied in
-- production, and this file is the version that should be applied.
--
-- WHAT CHANGES, AND WHY
--   1. user_entitlements() drops the jsonb_each alias list. `as e` keeps the
--      real column names (`key`, `value`); the 0016 form renamed them to
--      (k, v) and then referenced e.k, which the planner rejects with 42P01.
--   2. The stored-value test becomes a jsonb comparison instead of a cast.
--      `coalesce(e.value,'false')::boolean` raised 22P02 when an operator
--      stored a non-boolean value, taking every entitlement check down with
--      it. `e.value = 'true'::jsonb` cannot raise: a malformed value simply
--      does not grant the key.
--   3. has_entitlement() keeps the `p_key` signature and gains a null guard.
--      THE APPLICATION MUST SEND `p_key`. See the note below.
--   4. has_entitlement_safe() wraps the resolver and returns false on any
--      error, with a WARNING. Policies call this, so a resolver regression
--      denies a premium feature instead of failing the page.
--   5. can_perform_bulk_operations() is created (0045 is unapplied). 0045's
--      staff branch tested role in ('admin','staff'); 'staff' is not a value
--      of public.user_role, so that condition could never match. is_staff()
--      is the correct predicate and is used here.
--
-- DO NOT ADD A has_entitlement(entitlement_key text) OVERLOAD.
--   Two single-text-argument overloads would make the positional call
--   has_entitlement('watchlists') ambiguous (42725) and PostgREST resolves
--   RPCs by argument name, so the overload would mask the application defect
--   instead of fixing it. The application is corrected separately; the
--   database keeps one unambiguous signature.
--
-- ORDERING: apply before any policy migration that references these helpers.
-- Reversal: re-apply the 0052 body (or the 0016 body) with create or replace;
-- no object, grant or row is removed by this file.
-- ============================================================================

create or replace function public.user_entitlements()
returns setof text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct e.key
  from public.customer_subscriptions s
  cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e
  join public.entitlement_catalog c on c.key = e.key
  where s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (s.trial_ends_at is null or s.trial_ends_at > now())
    and e.value = 'true'::jsonb;
$$;

comment on function public.user_entitlements() is
  'The entitlement keys held by the calling user. Active or trialing only, not ended, not past trial end, catalogue key required, stored value exactly true. Repaired in 0056; a malformed stored value no longer raises.';

create or replace function public.has_entitlement(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_key is not null
     and exists (select 1 from public.user_entitlements() e where e = p_key);
$$;

comment on function public.has_entitlement(text) is
  'True when the calling user holds the named entitlement. Argument name is p_key — callers must use it (PostgREST resolves RPC arguments by name). Raises if the resolver raises; use has_entitlement_safe() inside policies.';

create or replace function public.has_entitlement_safe(p_key text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return public.has_entitlement(p_key);
exception
  when others then
    raise warning 'has_entitlement_safe(%): entitlement resolver failed: % (%)',
      p_key, sqlerrm, sqlstate;
    return false;
end;
$$;

comment on function public.has_entitlement_safe(text) is
  'Fail-closed entitlement test for RLS policies. Returns false, and warns, when the resolver raises, so one broken function cannot take a whole surface down.';

create or replace function public.can_perform_bulk_operations()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_staff() or public.has_entitlement_safe('bulk');
$$;

comment on function public.can_perform_bulk_operations() is
  'Bulk-access gate: staff, or the bulk entitlement. 0056 replaces 0045''s dead role check (''staff'' is not a user_role value) with is_staff().';

grant execute on function public.user_entitlements() to anon, authenticated;
grant execute on function public.has_entitlement(text) to anon, authenticated;
grant execute on function public.has_entitlement_safe(text) to anon, authenticated;
grant execute on function public.can_perform_bulk_operations() to authenticated;

-- ---------------------------------------------------------------- self-check --
do $$
declare
  v text;
begin
  begin
    perform public.user_entitlements();
  exception when others then
    raise exception '0056 self-check failed: user_entitlements() still raises: % (%)', sqlerrm, sqlstate;
  end;

  begin
    perform public.has_entitlement_safe('reports');
  exception when others then
    raise exception '0056 self-check failed: has_entitlement_safe() raises: %', sqlerrm;
  end;

  select pg_get_functiondef(p.oid) into v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'user_entitlements';
  if position('as e(k, v)' in v) > 0 then
    raise exception '0056 self-check failed: resolver still aliases jsonb_each as (k, v)';
  end if;
end $$;
