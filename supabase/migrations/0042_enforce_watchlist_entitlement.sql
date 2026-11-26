-- =============================================================================
-- Hatsi360 — 0042 enforce watchlist entitlement
-- =============================================================================
-- Phase 08A Stage 2: Enforce the 'watchlists' entitlement at the database level.
--
-- This migration adds entitlement checks to the RLS policies for saved_commodities
-- and saved_markets tables. Previously, these tables only enforced ownership
-- (user_id = auth.uid()), which meant any authenticated user could use watchlists
-- regardless of their subscription status.
--
-- After this migration:
-- - Users must have the 'watchlists' entitlement OR be staff to use watchlists
-- - Existing ownership isolation is preserved (users still cannot see others' data)
-- - Staff users always have access (for support and admin purposes)
--
-- Transition policy:
-- - Existing watchlists are NOT deleted or modified
-- - Users without the entitlement will see an empty watchlist (no data loss)
-- - Users can regain access by subscribing to a plan that includes watchlists
-- =============================================================================

-- ---------------------------------------------------------------- watchlists --

-- Drop the existing ownership-only policies
DROP POLICY IF EXISTS saved_commodities_owner ON public.saved_commodities;
DROP POLICY IF EXISTS saved_markets_owner ON public.saved_markets;

-- P1-A4 (MIG-05): PostgreSQL allows one policy per (name, table) pair, but this
-- file created `saved_commodities_entitlement` once per command. The second
-- CREATE POLICY failed with 42710, so the file could never apply - which is why
-- the watchlist entitlement was enforced only in application code. Each policy
-- now carries a command-specific name, the pattern 0043/0044/0045 already use,
-- and each is dropped first so the file is repeatable.
--
-- The predicate is unchanged: ownership AND (entitlement OR staff). Nothing is
-- weakened by the rename.

-- For SELECT: user must own the record AND have the entitlement (or be staff)
DROP POLICY IF EXISTS saved_commodities_entitlement_select ON public.saved_commodities;
CREATE POLICY saved_commodities_entitlement_select ON public.saved_commodities
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

-- For INSERT: user must be inserting their own record AND have the entitlement (or be staff)
DROP POLICY IF EXISTS saved_commodities_entitlement_insert ON public.saved_commodities;
CREATE POLICY saved_commodities_entitlement_insert ON public.saved_commodities
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

-- For UPDATE: user must own the record AND have the entitlement (or be staff)
DROP POLICY IF EXISTS saved_commodities_entitlement_update ON public.saved_commodities;
CREATE POLICY saved_commodities_entitlement_update ON public.saved_commodities
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

-- For DELETE: user must own the record AND have the entitlement (or be staff)
DROP POLICY IF EXISTS saved_commodities_entitlement_delete ON public.saved_commodities;
CREATE POLICY saved_commodities_entitlement_delete ON public.saved_commodities
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

-- Same policies for saved_markets
DROP POLICY IF EXISTS saved_markets_entitlement_select ON public.saved_markets;
CREATE POLICY saved_markets_entitlement_select ON public.saved_markets
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

DROP POLICY IF EXISTS saved_markets_entitlement_insert ON public.saved_markets;
CREATE POLICY saved_markets_entitlement_insert ON public.saved_markets
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

DROP POLICY IF EXISTS saved_markets_entitlement_update ON public.saved_markets;
CREATE POLICY saved_markets_entitlement_update ON public.saved_markets
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

DROP POLICY IF EXISTS saved_markets_entitlement_delete ON public.saved_markets;
CREATE POLICY saved_markets_entitlement_delete ON public.saved_markets
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('watchlists')
      OR public.is_staff()
    )
  );

-- ----------------------------------------------------------------- comments --

-- All four commodity policies share one predicate; the comment is attached to
-- each so a reader of pg_policies is never left guessing.
COMMENT ON POLICY saved_commodities_entitlement_select ON public.saved_commodities IS
  'Users can only access their own saved commodities if they have the watchlists entitlement or are staff.';
COMMENT ON POLICY saved_commodities_entitlement_insert ON public.saved_commodities IS
  'Users can only access their own saved commodities if they have the watchlists entitlement or are staff.';
COMMENT ON POLICY saved_commodities_entitlement_update ON public.saved_commodities IS
  'Users can only access their own saved commodities if they have the watchlists entitlement or are staff.';
COMMENT ON POLICY saved_commodities_entitlement_delete ON public.saved_commodities IS
  'Users can only access their own saved commodities if they have the watchlists entitlement or are staff.';

COMMENT ON POLICY saved_markets_entitlement_select ON public.saved_markets IS
  'Users can only access their own saved markets if they have the watchlists entitlement or are staff.';
COMMENT ON POLICY saved_markets_entitlement_insert ON public.saved_markets IS
  'Users can only access their own saved markets if they have the watchlists entitlement or are staff.';
COMMENT ON POLICY saved_markets_entitlement_update ON public.saved_markets IS
  'Users can only access their own saved markets if they have the watchlists entitlement or are staff.';
COMMENT ON POLICY saved_markets_entitlement_delete ON public.saved_markets IS
  'Users can only access their own saved markets if they have the watchlists entitlement or are staff.';

-- ------------------------------------------------------------------- grants --

-- No new grants needed — the existing grants on the tables remain valid
-- The policies now enforce entitlement checks on top of the existing ownership model
