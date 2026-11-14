-- =============================================================================
-- Phase 01 — Stage 2: Market Data Activation
-- =============================================================================
-- This migration activates the operational pipeline:
-- 1. Add test_fixture to observation_source enum
-- 2. Populate verified coordinates for all 11 markets
-- 3. Create collection schedules for each market
-- 4. Define market-commodity scope (which commodities each market covers)
-- 5. Add publication withdrawal support
-- 6. Add batch publication function
-- =============================================================================

-- =============================================================================
-- 1. Add test_fixture to observation_source enum
-- =============================================================================
-- Test fixtures currently store 'test_fixture' as text, but the enum doesn't
-- include it. This causes a type mismatch. Adding it formally fixes the issue.

ALTER TYPE public.observation_source ADD VALUE IF NOT EXISTS 'test_fixture';

COMMENT ON TYPE public.observation_source IS
  'Source of the observation: legacy_import (migrated data), agent_app (field collection), manual_entry (admin input), test_fixture (demo data)';

-- =============================================================================
-- 2. Populate verified coordinates for all 11 markets
-- =============================================================================
-- Coordinates sourced from OpenStreetMap, Wikidata, and verified public sources.
-- All coordinates are in decimal degrees (WGS84).

UPDATE public.markets SET latitude = 12.086772, longitude = 8.441108 WHERE id = 1;  -- Dawanau, Kano
UPDATE public.markets SET latitude = 6.60896, longitude = 3.39326 WHERE id = 2;     -- Mile 12, Lagos
UPDATE public.markets SET latitude = 12.3633, longitude = 9.58222 WHERE id = 3;     -- Gujungu, Jigawa
UPDATE public.markets SET latitude = 10.962500, longitude = 8.392300 WHERE id = 4;  -- Anchau, Kaduna
UPDATE public.markets SET latitude = 11.52189, longitude = 7.33610 WHERE id = 5;    -- Funtua, Katsina
UPDATE public.markets SET latitude = 12.0355303, longitude = 6.7996261 WHERE id = 6; -- Gusau, Zamfara
UPDATE public.markets SET latitude = 11.836, longitude = 13.1534 WHERE id = 7;      -- Maiduguri Monday, Borno
UPDATE public.markets SET latitude = 13.05998, longitude = 5.22404 WHERE id = 8;    -- Sokoto Central, Sokoto
UPDATE public.markets SET latitude = 10.3204854, longitude = 9.8465957 WHERE id = 9; -- Wunti, Bauchi
UPDATE public.markets SET latitude = 7.5005691, longitude = 9.6063006 WHERE id = 10; -- Zaki Biam, Benue
UPDATE public.markets SET latitude = 8.4939, longitude = 8.51532 WHERE id = 11;     -- Lafia Modern, Nasarawa

COMMENT ON TABLE public.markets IS
  'Market register with verified GPS coordinates. Coordinates sourced from OpenStreetMap, Wikidata, and public geographical databases. All 11 markets now have verified coordinates.';

-- =============================================================================
-- 3. Create collection schedules for each market
-- =============================================================================
-- Define when and what should be collected at each market.
-- Schedules are based on typical market operating patterns and commodity focus.
-- Each schedule specifies: market, commodity (optional for all-commodity schedules),
-- frequency, days of week, deadline, priority, and assigned agent.

INSERT INTO public.market_collection_schedules (
  market_id, commodity_id, frequency, days_of_week, window_start, window_end,
  deadline_time, required_price_types, expected_observations, priority,
  evidence_required, assigned_agent_id, is_active, created_by
) VALUES
-- Dawanau (Kano) - Major grains market, daily collection
(1, NULL, 'daily', '{1,2,3,4,5,6}', '06:00', '14:00', '16:00',
 '{wholesale_transaction,wholesale_asking}', 8, 'high', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Mile 12 (Lagos) - Major food market, daily collection
(2, NULL, 'daily', '{1,2,3,4,5,6}', '07:00', '18:00', '19:00',
 '{wholesale_transaction,retail}', 10, 'high', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Gujungu (Jigawa) - Grains market, 3 days per week
(3, NULL, 'weekly', '{1,3,5}', '07:00', '14:00', '16:00',
 '{wholesale_transaction}', 5, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Anchau (Kaduna) - Grains market, 2 days per week
(4, NULL, 'weekly', '{2,4}', '07:00', '14:00', '16:00',
 '{wholesale_transaction}', 4, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Funtua (Katsina) - Grains market, 2 days per week
(5, NULL, 'weekly', '{1,4}', '07:00', '14:00', '16:00',
 '{wholesale_transaction}', 4, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Gusau (Zamfara) - Central market, 3 days per week
(6, NULL, 'weekly', '{1,3,5}', '07:00', '15:00', '17:00',
 '{wholesale_transaction,retail}', 5, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Maiduguri Monday (Borno) - Major market, weekly on Monday
(7, NULL, 'weekly', '{1}', '07:00', '15:00', '17:00',
 '{wholesale_transaction,retail}', 8, 'high', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Sokoto Central (Sokoto) - Central market, 3 days per week
(8, NULL, 'weekly', '{1,3,5}', '07:00', '14:00', '16:00',
 '{wholesale_transaction}', 5, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Wunti (Bauchi) - Central market, 3 days per week
(9, NULL, 'weekly', '{2,4,6}', '07:00', '15:00', '17:00',
 '{wholesale_transaction,retail}', 5, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Zaki Biam (Benue) - Yam market, 2 days per week
(10, NULL, 'weekly', '{1,4}', '07:00', '14:00', '16:00',
 '{wholesale_transaction}', 3, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15'),

-- Lafia Modern (Nasarawa) - Central market, 3 days per week
(11, NULL, 'weekly', '{2,4,6}', '07:00', '15:00', '17:00',
 '{wholesale_transaction,retail}', 5, 'normal', false,
 'f9b2d2f7-2147-4579-845d-17ec462e3f91', true,
 'dcc7c070-cca6-46e4-907f-3d811079be15');

COMMENT ON TABLE public.market_collection_schedules IS
  'Collection schedules define when, where, and what to collect. Each market has a schedule with appropriate frequency and commodity focus. All schedules are assigned to the demo agent for activation.';

-- =============================================================================
-- 4. Define market-commodity scope
-- =============================================================================
-- Define which commodities each market is expected to cover.
-- This enables coverage analytics: what was expected vs what was reported.

-- Dawanau (Kano) - Grains focus
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(1, 1, true),   -- Maize
(1, 3, true),   -- Sorghum
(1, 5, true),   -- Millet
(1, 9, false),  -- Rice
(1, 12, false); -- Wheat

-- Mile 12 (Lagos) - Food items focus
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(2, 1, true),   -- Maize
(2, 9, true),   -- Rice
(2, 21, false), -- Yam
(2, 18, false); -- Cassava

-- Gujungu (Jigawa) - Grains
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(3, 1, true),   -- Maize
(3, 3, true),   -- Sorghum
(3, 5, false);  -- Millet

-- Anchau (Kaduna) - Grains
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(4, 1, true),   -- Maize
(4, 3, true),   -- Sorghum
(4, 5, false);  -- Millet

-- Funtua (Katsina) - Grains
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(5, 1, true),   -- Maize
(5, 3, true),   -- Sorghum
(5, 5, false);  -- Millet

-- Gusau (Zamfara) - Mixed
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(6, 1, true),   -- Maize
(6, 3, false),  -- Sorghum
(6, 21, false); -- Yam

-- Maiduguri Monday (Borno) - Mixed
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(7, 1, true),   -- Maize
(7, 3, true),   -- Sorghum
(7, 5, true),   -- Millet
(7, 9, false),  -- Rice
(7, 12, false); -- Wheat

-- Sokoto Central (Sokoto) - Grains
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(8, 1, true),   -- Maize
(8, 3, true),   -- Sorghum
(8, 5, false);  -- Millet

-- Wunti (Bauchi) - Mixed
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(9, 1, true),   -- Maize
(9, 3, false),  -- Sorghum
(9, 21, false); -- Yam

-- Zaki Biam (Benue) - Yam focus
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(10, 21, true); -- Yam

-- Lafia Modern (Nasarawa) - Mixed
INSERT INTO public.market_commodity_scope (market_id, commodity_id, is_primary) VALUES
(11, 1, true),  -- Maize
(11, 9, false), -- Rice
(11, 21, false); -- Yam

COMMENT ON TABLE public.market_commodity_scope IS
  'Defines which commodities each market is expected to report. Primary commodities are the main focus; non-primary are secondary. Enables coverage analytics.';

-- =============================================================================
-- 5. Add publication withdrawal support
-- =============================================================================
-- Create publication_events table to track publication lifecycle including withdrawal.

CREATE TABLE IF NOT EXISTS public.publication_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  observation_id UUID NOT NULL REFERENCES public.price_observations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('published', 'withdrawn', 'republished')),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role public.user_role,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS publication_events_observation_idx
  ON public.publication_events (observation_id, created_at DESC);

COMMENT ON TABLE public.publication_events IS
  'Audit trail of publication lifecycle: published, withdrawn, republished. Every change is recorded with actor, timestamp, and reason.';

-- Enable RLS
ALTER TABLE public.publication_events ENABLE ROW LEVEL SECURITY;

-- Staff can read all publication events
DROP POLICY IF EXISTS publication_events_staff_read ON public.publication_events;
CREATE POLICY publication_events_staff_read ON public.publication_events
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- No direct writes; all changes go through functions
DROP POLICY IF EXISTS publication_events_no_direct_write ON public.publication_events;
CREATE POLICY publication_events_no_direct_write ON public.publication_events
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS publication_events_no_direct_update ON public.publication_events;
CREATE POLICY publication_events_no_direct_update ON public.publication_events
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS publication_events_no_direct_delete ON public.publication_events;
CREATE POLICY publication_events_no_direct_delete ON public.publication_events
  FOR DELETE TO authenticated
  USING (false);

-- =============================================================================
-- 6. Add batch publication and withdrawal functions
-- =============================================================================

-- Publish a single observation with full audit trail
CREATE OR REPLACE FUNCTION public.publish_observation_with_event(
  p_observation_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obs public.price_observations;
BEGIN
  -- Authorization checks
  IF NOT public.is_active_account() THEN
    RAISE EXCEPTION 'This account is not active.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only verification staff may publish prices.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Fetch the observation
  SELECT * INTO v_obs FROM public.price_observations WHERE id = p_observation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Observation % not found.', p_observation_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Check publication eligibility
  IF v_obs.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Observation is already published.' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF v_obs.verification_status NOT IN ('verified', 'legacy_unverified') THEN
    RAISE EXCEPTION 'Observation must be verified before publication.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Publish
  UPDATE public.price_observations
     SET published_at = NOW(),
         verified_at = COALESCE(verified_at, NOW()),
         verified_by = COALESCE(verified_by, auth.uid())
   WHERE id = p_observation_id;

  -- Record publication event
  INSERT INTO public.publication_events (observation_id, action, actor_id, actor_role, reason)
  VALUES (p_observation_id, 'published', auth.uid(), public.current_role(), p_reason);

  -- Record audit
  PERFORM public.write_audit(
    'observation.published', 'price_observation', p_observation_id::text,
    NULL,
    jsonb_build_object('published_at', NOW(), 'actor_id', auth.uid()),
    p_reason
  );

  -- Notify agent
  IF v_obs.agent_user_id IS NOT NULL THEN
    PERFORM public.notify(
      v_obs.agent_user_id, 'submission_approved',
      'Your price submission was published',
      format('Your submission for commodity %s at market %s has been published.',
             v_obs.commodity_id, v_obs.market_id),
      'price_observation', p_observation_id::text,
      '/agent/submissions', 'normal'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.publish_observation_with_event(UUID, TEXT) IS
  'Publish a single observation with full audit trail. Requires verified status and staff authorization.';

GRANT EXECUTE ON FUNCTION public.publish_observation_with_event(UUID, TEXT) TO authenticated;

-- Withdraw a published observation
CREATE OR REPLACE FUNCTION public.withdraw_observation(
  p_observation_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obs public.price_observations;
BEGIN
  -- Authorization checks
  IF NOT public.is_active_account() THEN
    RAISE EXCEPTION 'This account is not active.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only verification staff may withdraw published prices.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'A reason (minimum 5 characters) is required to withdraw a published price.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Fetch the observation
  SELECT * INTO v_obs FROM public.price_observations WHERE id = p_observation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Observation % not found.', p_observation_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Check if published
  IF v_obs.published_at IS NULL THEN
    RAISE EXCEPTION 'Observation is not published.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Withdraw: clear published_at, keep verification status
  UPDATE public.price_observations
     SET published_at = NULL
   WHERE id = p_observation_id;

  -- Record withdrawal event
  INSERT INTO public.publication_events (observation_id, action, actor_id, actor_role, reason)
  VALUES (p_observation_id, 'withdrawn', auth.uid(), public.current_role(), p_reason);

  -- Record audit
  PERFORM public.write_audit(
    'observation.withdrawn', 'price_observation', p_observation_id::text,
    jsonb_build_object('published_at', v_obs.published_at),
    jsonb_build_object('published_at', NULL),
    p_reason
  );

  -- Notify agent
  IF v_obs.agent_user_id IS NOT NULL THEN
    PERFORM public.notify(
      v_obs.agent_user_id, 'submission_rejected',
      'Your published price was withdrawn',
      format('Your published submission was withdrawn. Reason: %s', p_reason),
      'price_observation', p_observation_id::text,
      '/agent/submissions', 'high'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.withdraw_observation(UUID, TEXT) IS
  'Withdraw a published observation. Clears published_at but preserves verification status and audit trail. Requires staff authorization and a reason.';

GRANT EXECUTE ON FUNCTION public.withdraw_observation(UUID, TEXT) TO authenticated;

-- Batch publish multiple observations
CREATE OR REPLACE FUNCTION public.batch_publish_observations(
  p_observation_ids UUID[],
  p_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_count INTEGER := 0;
  v_errors TEXT[] := '{}';
BEGIN
  -- Authorization checks
  IF NOT public.is_active_account() THEN
    RAISE EXCEPTION 'This account is not active.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only verification staff may publish prices.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Publish each observation individually
  FOR v_id IN SELECT unnest FROM unnest(p_observation_ids)
  LOOP
    BEGIN
      PERFORM public.publish_observation_with_event(v_id, p_reason);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Record error but continue with remaining observations
      v_errors := array_append(v_errors, format('%s: %s', v_id, SQLERRM));
    END;
  END LOOP;

  -- If any errors occurred, raise them as a warning
  IF array_length(v_errors, 1) > 0 THEN
    RAISE WARNING 'Batch publication completed with % errors: %', array_length(v_errors, 1), array_to_string(v_errors, '; ');
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.batch_publish_observations(UUID[], TEXT) IS
  'Publish multiple observations in a single operation. Each observation is validated independently; failures are logged but do not block the batch.';

GRANT EXECUTE ON FUNCTION public.batch_publish_observations(UUID[], TEXT) TO authenticated;

-- =============================================================================
-- 7. Add publication events read function
-- =============================================================================

-- Read publication events for an observation
CREATE OR REPLACE FUNCTION public.publication_events(p_observation_id UUID)
RETURNS TABLE (
  id BIGINT,
  action TEXT,
  actor_email TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pe.id,
    pe.action,
    u.email AS actor_email,
    pe.reason,
    pe.created_at
  FROM public.publication_events pe
  LEFT JOIN auth.users u ON u.id = pe.actor_id
  WHERE pe.observation_id = p_observation_id
    AND (
      public.is_staff()
      OR EXISTS (
        SELECT 1 FROM public.price_observations o
        WHERE o.id = pe.observation_id AND o.agent_user_id = auth.uid()
      )
    )
  ORDER BY pe.created_at DESC;
$$;

COMMENT ON FUNCTION public.publication_events(UUID) IS
  'Read publication lifecycle events for an observation. Staff can see all; agents can see their own.';

GRANT EXECUTE ON FUNCTION public.publication_events(UUID) TO authenticated;

-- =============================================================================
-- 8. Record this migration
-- =============================================================================

INSERT INTO public._hatsi_migrations (name, applied_at)
VALUES ('0033_collection_activation.sql', NOW());

-- =============================================================================
-- End of migration
-- =============================================================================
