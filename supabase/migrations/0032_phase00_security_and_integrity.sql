-- ============================================================================
-- Migration 0032 — Phase 00: Security Hardening and Database Integrity
-- ============================================================================
--
-- This migration addresses the Phase 01 audit's critical security findings
-- and database integrity issues:
--
--   R-02 (P0): Enable RLS on `_hatsi_migrations` and revoke anon/authenticated DML
--   R-04 (P1): Drop the unsafe 3-arg `is_public_observation` overload
--   R-05 (P2): Record migration 0031 in `_hatsi_migrations`
--   R-16 (P2): Add explicit roles to four role-less RLS policies
--
-- All changes are additive and non-destructive. No data is modified.
-- ============================================================================

-- ============================================================================
-- 1. R-02 (P0): Secure the migration bookkeeping table
-- ============================================================================
-- The `_hatsi_migrations` table records which migrations have been applied.
-- It had RLS disabled and `anon` held TRUNCATE/DELETE/INSERT/UPDATE.
-- An anonymous visitor could forge or destroy the migration record.
-- Fix: enable RLS, revoke all grants from anon/authenticated, and add a
-- staff-only read policy.

ALTER TABLE public._hatsi_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public._hatsi_migrations FROM anon;
REVOKE ALL ON TABLE public._hatsi_migrations FROM authenticated;

-- Staff can read the migration history; nobody else can read it.
-- This matches the pattern used by `audit_events` and other staff-visible tables.
CREATE POLICY "_hatsi_migrations_staff_read"
  ON public._hatsi_migrations
  FOR SELECT
  TO authenticated
  USING (is_staff());

-- ============================================================================
-- 2. R-04 (P1): Drop the unsafe 3-arg is_public_observation overload
-- ============================================================================
-- Two overloads exist:
--   3-arg: is_public_observation(status, published_at, is_current)
--          — does NOT filter test_fixture sources
--   5-arg: is_public_observation(status, published_at, is_current, source, source_reference)
--          — filters test_fixture sources (the safe one)
--
-- Every live policy and view calls the 5-arg form. But the 3-arg overload
-- is still callable, and a future policy written with the short signature
-- would silently publish test fixtures. Drop it.

DROP FUNCTION IF EXISTS public.is_public_observation(
  p_status verification_status,
  p_published_at timestamp with time zone,
  p_is_current boolean
);

-- ============================================================================
-- 3. R-05 (P2): Record migration 0031 in _hatsi_migrations
-- ============================================================================
-- Migration 0031 (offer_verification_events_read_fix) was applied but not
-- recorded. The bookkeeping table held 29 entries for 30 migration files.

INSERT INTO public._hatsi_migrations (name, applied_at)
VALUES ('0031_offer_verification_events_read_fix.sql', NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. R-16 (P2): Add explicit roles to role-less RLS policies
-- ============================================================================
-- Four policies declare no `TO` role, defaulting to `PUBLIC`. While the
-- effect is similar, the explicit form matches the rest of the policy set
-- and makes the intended audience visible in pg_policies.
--
-- Note: PostgreSQL does not allow ALTER POLICY ... TO on existing policies.
-- We must drop and recreate them.

-- 4a. commodity_fundamentals_read
DROP POLICY IF EXISTS "commodity_fundamentals_read" ON public.commodity_fundamentals;
CREATE POLICY "commodity_fundamentals_read"
  ON public.commodity_fundamentals
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4b. commodity_seasonality_read
DROP POLICY IF EXISTS "commodity_seasonality_read" ON public.commodity_seasonality;
CREATE POLICY "commodity_seasonality_read"
  ON public.commodity_seasonality
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4c. commodity_specifications_read
DROP POLICY IF EXISTS "commodity_specifications_read" ON public.commodity_specifications;
CREATE POLICY "commodity_specifications_read"
  ON public.commodity_specifications
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4d. price_source_registry_read
DROP POLICY IF EXISTS "price_source_registry_read" ON public.price_source_registry;
CREATE POLICY "price_source_registry_read"
  ON public.price_source_registry
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- 5. Record this migration
-- ============================================================================

INSERT INTO public._hatsi_migrations (name, applied_at)
VALUES ('0032_phase00_security_and_integrity.sql', NOW());
