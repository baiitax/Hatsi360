-- ============================================================================
-- Hatsi360 — 0052 repair the entitlement resolver
-- ============================================================================
-- Phase 1. Found by the RLS permission suite once it became reachable.
--
-- 0016_commercial_entitlements.sql defines:
--
--   cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e(k, v)
--   join public.entitlement_catalog c on c.key = e.k
--
--   ERROR: missing FROM-clause entry for table "k"   (42P01, errorMissingRTE)
--
-- `jsonb_each` already returns two columns named `key` and `value`. Writing
-- `as e(k, v)` renames them to `k` and `v` in the result, but the qualified
-- form `e.k` is then invalid - the row type of `e` has no field `k`. The
-- planner rejects the statement, so `public.user_entitlements()` raises every
-- time it is called, and `public.has_entitlement()` (which is `select exists
-- (select 1 from public.user_entitlements() ...)`) raises with it.
--
-- Every entitlement check in the database goes through those two functions:
-- the watchlist, alert, export and bulk policies plus `can_perform_bulk_operations()`
-- all call `has_entitlement()`. A raising function inside an RLS policy does not
-- deny a row, it fails the query, so the affected surfaces error rather than
-- answering.
--
-- 0016 is applied, so it is not edited. This migration replaces the resolver in
-- place, without the column alias list, using the fields `jsonb_each` actually
-- exposes. The predicate is unchanged: active or trialing, not expired, and the
-- catalogue entry must exist.
-- ============================================================================

create or replace function public.user_entitlements()
returns setof text
language sql
stable
security definer
set search_path = public
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
    and coalesce(e.value, 'false')::boolean;
$$;

comment on function public.user_entitlements() is
  'The entitlement keys held by the calling user. Expired or unpaid subscriptions grant nothing. Repaired in 0052: the 0016 body aliased jsonb_each as e(k, v) and then referenced e.k, which the planner rejects, so every entitlement check raised instead of answering.';
