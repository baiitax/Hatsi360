-- =============================================================================
-- Hatsi360 — 0043 enforce alert entitlement
-- =============================================================================
-- Phase 08A Stage 3: Enforce the 'alerts' entitlement at the database level.
--
-- This migration adds entitlement checks to the RLS policies for price_alerts
-- and alert_delivery_logs tables. Previously, these tables only enforced
-- ownership, which meant any authenticated user could create and manage alerts
-- regardless of their subscription status.
--
-- Transition Policy:
-- -----------------
-- When a user loses the 'alerts' entitlement (e.g., subscription expires):
--   - Existing alerts are NOT deleted (preserved for when they resubscribe)
--   - Users can still READ their existing alerts (SELECT allowed)
--   - Users CANNOT create new alerts (INSERT blocked)
--   - Users CANNOT modify existing alerts (UPDATE blocked)
--   - Users CANNOT delete alerts (DELETE blocked)
--   - Active alerts remain in the database but cannot be triggered by background
--     jobs (future implementation will check entitlement before triggering)
--
-- Staff users always have access for support and administrative purposes.
-- =============================================================================

-- ---------------------------------------------------------------- alerts --

-- Drop the existing ownership-only policies
DROP POLICY IF EXISTS price_alerts_owner ON public.price_alerts;
DROP POLICY IF EXISTS alert_logs_owner ON public.alert_delivery_logs;

-- CREATE NEW POLICIES FOR price_alerts
-- For SELECT: allow read access (users can see their alerts even without entitlement)
CREATE POLICY price_alerts_read ON public.price_alerts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- For INSERT: require entitlement
CREATE POLICY price_alerts_create ON public.price_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_entitlement('alerts')
      OR public.is_staff()
    )
  );

-- For UPDATE: require entitlement
CREATE POLICY price_alerts_update ON public.price_alerts
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('alerts')
      OR public.is_staff()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.has_entitlement('alerts')
      OR public.is_staff()
    )
  );

-- For DELETE: require entitlement
CREATE POLICY price_alerts_delete ON public.price_alerts
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      public.has_entitlement('alerts')
      OR public.is_staff()
    )
  );

-- CREATE NEW POLICIES FOR alert_delivery_logs
-- Users can read logs for their own alerts
CREATE POLICY alert_logs_read ON public.alert_delivery_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.price_alerts a
      WHERE a.id = alert_delivery_logs.alert_id
        AND a.user_id = auth.uid()
    )
    OR public.is_staff()
  );

-- Only staff can insert/update/delete logs (system-managed)
CREATE POLICY alert_logs_write ON public.alert_delivery_logs
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ----------------------------------------------------------------- comments --

COMMENT ON POLICY price_alerts_read ON public.price_alerts IS
  'Users can read their own alerts regardless of entitlement status (for viewing existing alerts).';

COMMENT ON POLICY price_alerts_create ON public.price_alerts IS
  'Users can only create alerts if they have the alerts entitlement or are staff.';

COMMENT ON POLICY price_alerts_update ON public.price_alerts IS
  'Users can only modify alerts if they have the alerts entitlement or are staff.';

COMMENT ON POLICY price_alerts_delete ON public.price_alerts IS
  'Users can only delete alerts if they have the alerts entitlement or are staff.';

COMMENT ON POLICY alert_logs_read ON public.alert_delivery_logs IS
  'Users can read logs for their own alerts. Staff can read all logs.';

COMMENT ON POLICY alert_logs_write ON public.alert_delivery_logs IS
  'Only staff can modify alert delivery logs (system-managed).';

-- ------------------------------------------------------------------- grants --

-- No new grants needed — the existing grants on the tables remain valid
-- The policies now enforce entitlement checks on top of the existing ownership model
