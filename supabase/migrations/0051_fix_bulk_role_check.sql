-- ============================================================================
-- Hatsi360 — 0051 repair the bulk-operation role check
-- ============================================================================
-- Phase 1. Found by the RLS permission suite, which only became reachable once
-- migration 0042 was repaired (before that the harness stopped at the
-- "tables without RLS" assertion and never executed the suite).
--
-- 0045_enforce_bulk_entitlement.sql defines:
--
--   create or replace function public.can_perform_bulk_operations() ...
--     or exists (
--       select 1 from public.profiles
--       where id = auth.uid()
--       and role in ('admin', 'staff')      -- <-- 'staff' is not a role
--       and account_status = 'active'
--     );
--
--   ERROR: invalid input value for enum user_role: "staff"   (22P02)
--
-- `profiles.role` is the enum `public.user_role`, whose members are
-- public_user, customer, agent, verification_officer, market_supervisor,
-- analyst, admin, super_admin. There is no 'staff' member, so PostgreSQL casts
-- the literal at run time and raises. Because the expression sits inside a
-- SECURITY DEFINER SQL function, the failure surfaces whenever the function is
-- evaluated - that is, for every caller who is not already an admin - and the
-- bulk-data feature answers with an error rather than a permission decision.
--
-- 0045 has already been applied to production, so it is not edited. This
-- migration replaces the function in place (create or replace keeps the
-- signature, the grants and the dependants).
--
-- The intended semantics are preserved and made explicit:
--   admin  OR  holds the 'bulk' entitlement  OR  (staff role AND active account)
--
-- `public.is_staff()` is the repository's own definition of "staff" and is
-- evaluated against the same profile row, so the check no longer names roles
-- that do not exist. The `account_status = 'active'` condition is kept: a
-- suspended or closed staff account must not retain bulk access, and
-- current_role() alone does not check account status.
-- ============================================================================

create or replace function public.can_perform_bulk_operations()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
  or public.has_entitlement('bulk')
  or (
    public.is_staff()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and account_status = 'active'
    )
  );
$$;

comment on function public.can_perform_bulk_operations() is
  'Bulk data access: admin, or holder of the bulk entitlement, or an active staff member. Repaired in 0051 - the previous body compared an enum column against the non-existent role ''staff'' and raised 22P02 at run time.';
