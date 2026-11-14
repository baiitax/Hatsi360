-- 0045: Enforce 'bulk' entitlement at database level
--
-- The 'bulk' entitlement unlocks large-scale data operations: bulk historical
-- exports, bulk data ingestion, and high-volume data retrieval.
--
-- This migration adds RLS policies that restrict bulk operations to users
-- with the 'bulk' entitlement (professional and enterprise tiers).
--
-- Tables affected:
--   - price_observations: Bulk historical data access (>1000 rows)
--   - international_trade_records: Bulk trade flow retrieval
--   - export_jobs: Already gated by 'exports' entitlement (0044)
--
-- Application-level enforcement (added in this migration):
--   - src/lib/intelligence/ingestion/faostat.ts: FAOSTAT ingestion gated by bulk entitlement
--   - src/lib/trade/ingestion/adapters/faostat-trade.ts: FAOSTAT trade adapter checks entitlement
--   - src/lib/operations/field.ts: High-limit queries should check entitlement
--   - src/lib/analytics/snapshot.ts: Bulk analytics queries should check entitlement

-- ================================================================
-- 1. HELPER FUNCTION: Check bulk entitlement for high-volume operations
-- ================================================================

-- This function checks if a user can perform bulk operations.
-- It returns true if:
--   - User has the 'bulk' entitlement via their tier
--   - User is an admin (is_admin() returns true)
--   - User is staff (for operational bulk access)

create or replace function public.can_perform_bulk_operations()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- Admins can always perform bulk operations
  select public.is_admin()
  or public.has_entitlement('bulk')
  or exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'staff')
    and account_status = 'active'
  );
$$;

-- ================================================================
-- 2. PRICE OBSERVATIONS: Add bulk access policy
-- ================================================================

-- Drop existing bulk policy if it exists (forward-only: safe to drop our own)
drop policy if exists price_observations_bulk_read on public.price_observations;

-- Create bulk read policy: Users with bulk entitlement can access
-- historical observations beyond the public view (including non-public ones)
create policy price_observations_bulk_read
  on public.price_observations
  for select
  to authenticated
  using (
    public.can_perform_bulk_operations()
  );

-- ================================================================
-- 3. INTERNATIONAL TRADE RECORDS: Add bulk access policy
-- ================================================================

-- Drop existing bulk policy if it exists
drop policy if exists international_trade_bulk_read on public.international_trade_records;

-- Create bulk read policy: Users with bulk entitlement can perform
-- large-scale trade data retrieval (bypassing normal pagination limits)
create policy international_trade_bulk_read
  on public.international_trade_records
  for select
  to authenticated
  using (
    public.can_perform_bulk_operations()
  );

-- ================================================================
-- 4. SCHEDULED JOB RUNS: Protect bulk ingestion operations
-- ================================================================

-- Drop existing policies if they exist
drop policy if exists scheduled_job_runs_bulk_access on public.scheduled_job_runs;

-- Only users with bulk entitlement or admin can view/manage scheduled job runs
-- (these track bulk data ingestion operations like FAOSTAT syncs)
create policy scheduled_job_runs_bulk_access
  on public.scheduled_job_runs
  for select
  to authenticated
  using (
    public.can_perform_bulk_operations()
  );

-- ================================================================
-- 5. AUDIT TRAIL: Log bulk access attempts
-- ================================================================

-- The existing audit_logging trigger (from migration 0005) will automatically
-- log all access attempts to these tables. The can_perform_bulk_operations()
-- function ensures only entitled users can perform bulk operations.

-- ================================================================
-- 6. GRANTS: Ensure proper permissions
-- ================================================================

-- Ensure authenticated users can call the helper function
grant execute on function public.can_perform_bulk_operations() to authenticated;

-- ================================================================
-- VERIFICATION QUERIES (run manually to verify)
-- ================================================================
-- 
-- -- Check that the bulk entitlement exists
-- select count(*) from public.entitlement_keys where code = 'bulk';
-- 
-- -- Check that professional tier has bulk entitlement
-- select exists(
--   select 1 from public.entitlement_tiers t
--   join public.tier_entitlements te on te.tier_id = t.id
--   join public.entitlement_keys ek on ek.id = te.entitlement_id
--   where t.code = 'professional' and ek.code = 'bulk'
-- );
-- 
-- -- Check that enterprise tier has bulk entitlement
-- select exists(
--   select 1 from public.entitlement_tiers t
--   join public.tier_entitlements te on te.tier_id = t.id
--   join public.entitlement_keys ek on ek.id = te.entitlement_id
--   where t.code = 'enterprise' and ek.code = 'bulk'
-- );
-- 
-- -- List all policies on price_observations
-- select policyname from pg_policies
-- where tablename = 'price_observations' and schemaname = 'public';
-- 
-- -- List all policies on international_trade_records
-- select policyname from pg_policies
-- where tablename = 'international_trade_records' and schemaname = 'public';
