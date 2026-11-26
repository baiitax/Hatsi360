-- Hatsi360 Demo Data Seed — Operational Data
-- Migration: 0047
-- Date: 2026-11-15
--
-- Purpose: Populate the database with operational demonstration data —
-- agents, collection tasks, schedules, notifications, visit records —
-- so that the admin dashboard, verification queue, and agent management
-- pages all have realistic data to render.
--
-- Identification:
--   - All records created by this migration use 'DEMO:' prefix in notes
--   - All demo records are safely removable via migration 0048
--
-- Dependencies:
--   - Migration 0046 (core price observations)
--   - Existing reference data (commodities, markets, states)
--   - Existing operational tables (0010, 0002, 0011)
--
-- Reversibility:
--   Run migration 0048_demo_seed_cleanup.sql to remove only demo records.
--   Genuine production data is never affected.

BEGIN;

-- ================================================================
-- 1. AGENT PROFILES
-- Four field agents across key northern markets.
-- These profiles were created via Supabase auth and are updated here
-- for completeness of the migration record.
-- ================================================================

INSERT INTO agent_profiles (profile_id, employee_code, employment_status, region, joined_on)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'AGT-KANO-001', 'active', 'Kano', '2026-09-01'),
  ('c3000002-0000-0000-0000-000000000002', 'AGT-LAGOS-002', 'active', 'Lagos', '2026-09-01'),
  ('c3000003-0000-0000-0000-000000000003', 'AGT-KADUNA-003', 'active', 'Kaduna', '2026-09-15'),
  ('c3000004-0000-0000-0000-000000000004', 'AGT-SOKOTO-004', 'active', 'Sokoto', '2026-10-01')
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO agent_profiles (profile_id, employee_code, employment_status, region, joined_on)
VALUES
  ('f9b2d2f7-2147-4579-845d-17ec462e3f91', 'AGT-FIELD-000', 'active', 'Multi-region', '2026-08-01')
ON CONFLICT (profile_id) DO NOTHING;


-- ================================================================
-- 2. MARKET COLLECTION SCHEDULE UPDATES
-- Reassign schedules from the single demo agent to regional agents.
-- ================================================================

-- Kano region: Dawanau (1) and Gujungu (3) → Yusuf Danladi
UPDATE market_collection_schedules
SET assigned_agent_id = 'c3000001-0000-0000-0000-000000000001',
    updated_at = now()
WHERE market_id IN (1, 3);

-- Lagos region: Mile 12 (2) → Adeola Bankole
UPDATE market_collection_schedules
SET assigned_agent_id = 'c3000002-0000-0000-0000-000000000002',
    updated_at = now()
WHERE market_id = 2;

-- Kaduna region: Anchau (4) and Funtua (5) → Halima Suleiman
UPDATE market_collection_schedules
SET assigned_agent_id = 'c3000003-0000-0000-0000-000000000003',
    updated_at = now()
WHERE market_id IN (4, 5);

-- Borno/Sokoto region → Abubakar Mohammed
UPDATE market_collection_schedules
SET assigned_agent_id = 'c3000004-0000-0000-0000-000000000004',
    updated_at = now()
WHERE market_id IN (7, 8);


-- ================================================================
-- 3. COLLECTION TASKS
-- Create tasks for the past 30 days across key markets.
-- collection_tasks.status uses collection_task_status enum:
--   open, in_progress, submitted, awaiting_review, correction_required, completed, cancelled
-- ================================================================

INSERT INTO collection_tasks (market_id, assigned_to, due_on, status, notes, completed_at)
SELECT
  m.market_id,
  m.agent_id,
  m.due_date,
  m.status::collection_task_status,
  CASE
    WHEN m.status = 'submitted' THEN 'DEMO: Submitted observation awaiting verification'
    WHEN m.status = 'in_progress' THEN 'DEMO: Agent currently collecting data'
    WHEN m.status = 'open' THEN 'DEMO: Pending collection for demo purposes'
  END,
  CASE
    WHEN m.status = 'submitted' THEN m.due_date + interval '8 hours'
    ELSE NULL
  END
FROM (
  SELECT
    ms.market_id,
    ms.assigned_agent_id AS agent_id,
    d::date AS due_date,
    CASE
      -- Past dates: 50% submitted (awaiting review), 30% skipped
      WHEN d::date < '2026-11-10'::date THEN
        CASE WHEN random() < 0.63 THEN 'submitted' ELSE 'skipped' END
      -- Recent dates: in_progress
      WHEN d::date BETWEEN '2026-11-10'::date AND '2026-11-13'::date THEN 'in_progress'
      -- Today and future: open
      ELSE 'open'
    END AS status
  FROM market_collection_schedules ms
  CROSS JOIN generate_series('2026-10-16'::date, '2026-11-14'::date, '3 days') AS d
  WHERE ms.is_active = true
    AND ms.assigned_agent_id IS NOT NULL
    AND ms.market_id IN (1, 2, 4, 7, 8)  -- Key markets only
) m;


-- ================================================================
-- 4. MARKET VISIT RECORDS
-- Agent visits to markets with conditions and observation counts.
-- ================================================================

INSERT INTO market_visit_records (market_id, agent_user_id, visited_at, observations_count, market_conditions, notes)
VALUES
  -- Dawanau — Kano's main grains market
  (1, 'c3000001-0000-0000-0000-000000000001', '2026-11-14 08:30:00+01', 12, 'Normal trading, good attendance', 'DEMO: Regular Tuesday collection at Dawanau'),
  (1, 'c3000001-0000-0000-0000-000000000001', '2026-11-11 08:15:00+01', 10, 'Slightly lower turnout than usual', 'DEMO: Friday collection'),
  (1, 'c3000001-0000-0000-0000-000000000001', '2026-11-07 08:00:00+01', 14, 'High activity, harvest season peak', 'DEMO: Tuesday collection — good volume'),
  (1, 'c3000001-0000-0000-0000-000000000001', '2026-11-04 08:45:00+01', 8, 'Rain disrupted some traders', 'DEMO: Friday collection — weather impact'),
  -- Mile 12 — Lagos
  (2, 'c3000002-0000-0000-0000-000000000002', '2026-11-13 09:00:00+01', 8, 'Normal trading conditions', 'DEMO: Weekly collection at Mile 12'),
  (2, 'c3000002-0000-0000-0000-000000000002', '2026-11-06 09:30:00+01', 6, 'Moderate activity', 'DEMO: Weekly collection'),
  (2, 'c3000002-0000-0000-0000-000000000002', '2026-10-30 09:15:00+01', 9, 'Good supply from northern routes', 'DEMO: Weekly collection — strong supply'),
  -- Anchau — Kaduna
  (4, 'c3000003-0000-0000-0000-000000000003', '2026-11-12 08:00:00+01', 5, 'Small market day, typical Wednesday', 'DEMO: Weekly Wednesday collection'),
  (4, 'c3000003-0000-0000-0000-000000000003', '2026-11-05 08:30:00+01', 7, 'Normal activity', 'DEMO: Weekly Wednesday collection'),
  -- Maiduguri — Borno
  (7, 'c3000004-0000-0000-0000-000000000004', '2026-11-10 07:45:00+01', 11, 'Monday market — strong turnout', 'DEMO: Monday collection — high activity'),
  (7, 'c3000004-0000-0000-0000-000000000004', '2026-11-03 07:30:00+01', 9, 'Normal Monday trading', 'DEMO: Monday collection'),
  -- Sokoto
  (8, 'c3000004-0000-0000-0000-000000000004', '2026-11-11 08:00:00+01', 6, 'Regular market day', 'DEMO: Friday collection at Sokoto Central'),
  (8, 'c3000004-0000-0000-0000-000000000004', '2026-11-04 08:15:00+01', 7, 'Good attendance', 'DEMO: Friday collection');


-- ================================================================
-- 5. NOTIFICATIONS
-- Realistic notifications for agents and admin users.
-- ================================================================

-- Task assignment notifications for agents
INSERT INTO notifications (user_id, kind, severity, title, body, entity_type, entity_id, metadata)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'task_assigned', 'normal',
   'New collection task assigned',
   'You have been assigned a collection task for Dawanau International Grains Market due today.',
   'collection_task', '1', '{"market_id": 1, "market_name": "Dawanau International Grains Market"}'::jsonb),
  ('c3000002-0000-0000-0000-000000000002', 'task_assigned', 'normal',
   'New collection task assigned',
   'You have been assigned a collection task for Mile 12 Market due today.',
   'collection_task', '2', '{"market_id": 2, "market_name": "Mile 12 Market"}'::jsonb),
  ('c3000003-0000-0000-0000-000000000003', 'task_assigned', 'normal',
   'New collection task assigned',
   'You have been assigned a collection task for Anchau Grains Market due today.',
   'collection_task', '5', '{"market_id": 4, "market_name": "Anchau Grains Market"}'::jsonb),
  ('c3000004-0000-0000-0000-000000000004', 'task_assigned', 'normal',
   'New collection task assigned',
   'You have been assigned collection tasks for Maiduguri and Sokoto markets.',
   'collection_task', '7', '{"market_id": 7, "market_name": "Maiduguri Monday Market"}'::jsonb);

-- Deadline reminders
INSERT INTO notifications (user_id, kind, severity, title, body, entity_type, metadata)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'deadline_reminder', 'high',
   'Collection deadline approaching',
   'Your Dawanau collection task is due by 16:00 today. Please submit your observations before the deadline.',
   'collection_task', '{"market_id": 1, "deadline": "16:00"}'::jsonb),
  ('c3000002-0000-0000-0000-000000000002', 'deadline_reminder', 'high',
   'Collection deadline approaching',
   'Your Mile 12 collection task is due by 16:00 today. Please submit your observations.',
   'collection_task', '{"market_id": 2, "deadline": "16:00"}'::jsonb);

-- Submission received notifications for admin/verifier
INSERT INTO notifications (user_id, kind, severity, title, body, entity_type, metadata)
VALUES
  ('dcc7c070-cca6-46e4-907f-3d811079be15', 'submission_received', 'normal',
   'New submission received',
   'Yusuf Danladi submitted 12 price observations from Dawanau International Grains Market.',
   'price_observation', '{"agent_name": "Yusuf Danladi", "market_name": "Dawanau", "count": 12}'::jsonb),
  ('3caaa619-6b96-4dc2-9ebc-f77ce481c5a2', 'submission_received', 'normal',
   'New submission received',
   'Adeola Bankole submitted 8 price observations from Mile 12 Market.',
   'price_observation', '{"agent_name": "Adeola Bankole", "market_name": "Mile 12", "count": 8}'::jsonb),
  ('3caaa619-6b96-4dc2-9ebc-f77ce481c5a2', 'review_required', 'high',
   'Submission requires verification',
   '5 observations from Maiduguri Monday Market are pending your verification review.',
   'price_observation', '{"market_name": "Maiduguri Monday Market", "count": 5}'::jsonb);

-- Approval notifications back to agents
INSERT INTO notifications (user_id, kind, severity, title, body, entity_type, metadata)
VALUES
  ('c3000001-0000-0000-0000-000000000001', 'submission_approved', 'normal',
   'Submission approved',
   'Your Dawanau observations from Nov 11 have been verified and published.',
   'collection_task', '{"market_name": "Dawanau", "date": "2026-11-11"}'::jsonb),
  ('c3000002-0000-0000-0000-000000000002', 'correction_requested', 'high',
   'Correction requested',
   'A verifier has requested correction on one observation from your Mile 12 submission. Please review the notes.',
   'price_observation', '{"market_name": "Mile 12"}'::jsonb);

-- System alerts for admin
INSERT INTO notifications (user_id, kind, severity, title, body, metadata)
VALUES
  ('dcc7c070-cca6-46e4-907f-3d811079be15', 'coverage_gap', 'high',
   'Coverage gap detected',
   'Wunti Market (Bauchi) and Lafia Modern Market (Nasarawa) have no active collection assigned to a dedicated agent.',
   '{"markets": ["Wunti", "Lafia Modern Market"]}'::jsonb),
  ('dcc7c070-cca6-46e4-907f-3d811079be15', 'system_alert', 'normal',
   'Demo data populated',
   '299 demonstration price observations have been inserted across 16 commodities and 9 markets.',
   '{"observation_count": 299, "commodity_count": 16, "market_count": 9}'::jsonb);


-- ================================================================
-- 6. COLLECTION TASK EVENTS (audit trail)
-- Lifecycle events for completed tasks.
-- Uses collection_task_status enum: open, in_progress, submitted,
-- awaiting_review, correction_required, completed, cancelled
-- ================================================================

INSERT INTO collection_task_events (task_id, event_type, from_status, to_status, actor_id, reason)
SELECT
  ct.id,
  'created',
  NULL,
  'open',
  'dcc7c070-cca6-46e4-907f-3d811079be15',
  'DEMO: Auto-generated task from demo schedule'
FROM collection_tasks ct
WHERE ct.notes LIKE 'DEMO:%'
LIMIT 20;

INSERT INTO collection_task_events (task_id, event_type, from_status, to_status, actor_id, reason)
SELECT
  ct.id,
  'assigned',
  'open',
  'open',
  'dcc7c070-cca6-46e4-907f-3d811079be15',
  'DEMO: Assigned to regional agent'
FROM collection_tasks ct
WHERE ct.notes LIKE 'DEMO:%'
  AND ct.assigned_to IS NOT NULL
LIMIT 20;

INSERT INTO collection_task_events (task_id, event_type, from_status, to_status, actor_id, reason)
SELECT
  ct.id,
  'started',
  'open',
  'in_progress',
  ct.assigned_to,
  'DEMO: Agent started field collection'
FROM collection_tasks ct
WHERE ct.notes LIKE 'DEMO:%'
  AND ct.status IN ('submitted', 'in_progress')
LIMIT 15;

INSERT INTO collection_task_events (task_id, event_type, from_status, to_status, actor_id, reason)
SELECT
  ct.id,
  'submitted',
  'in_progress',
  'submitted',
  ct.assigned_to,
  'DEMO: Agent submitted observations'
FROM collection_tasks ct
WHERE ct.notes LIKE 'DEMO:%'
  AND ct.status = 'submitted'
LIMIT 15;


-- ================================================================
-- 7. ORGANIZATION MEMBERSHIPS
-- Link demo users to their organizations.
-- Uses user_role enum for role_in_org.
-- ================================================================

INSERT INTO organization_members (organization_id, user_id, role_in_org)
VALUES
  -- Hatsi360 Agro Ltd — all staff
  ('1458b921-4c46-4d1d-b978-ffbdaa2c4b07', 'c3000001-0000-0000-0000-000000000001', 'agent'),
  ('1458b921-4c46-4d1d-b978-ffbdaa2c4b07', 'c3000002-0000-0000-0000-000000000002', 'agent'),
  ('1458b921-4c46-4d1d-b978-ffbdaa2c4b07', 'c3000003-0000-0000-0000-000000000003', 'agent'),
  ('1458b921-4c46-4d1d-b978-ffbdaa2c4b07', 'c3000004-0000-0000-0000-000000000004', 'agent'),
  ('1458b921-4c46-4d1d-b978-ffbdaa2c4b07', 'b2000000-0000-0000-0000-000000000001', 'analyst')
ON CONFLICT DO NOTHING;


-- ================================================================
-- 8. ANALYTICS SNAPSHOTS
-- Pre-computed analytics for the dashboard.
-- Schema: id, snapshot_date, scope (text), metrics (jsonb), generated_at
-- ================================================================

INSERT INTO analytics_snapshots (snapshot_date, scope, metrics, generated_at)
VALUES
  ('2026-11-14', 'market:1', '{"observations_count": 12, "commodities_covered": 5, "price_range_min": 27700, "price_range_max": 165000, "avg_change_pct": 1.8, "top_commodity": "Paddy Rice", "market_name": "Dawanau International Grains Market"}'::jsonb, now()),
  ('2026-11-14', 'market:2', '{"observations_count": 8, "commodities_covered": 4, "price_range_min": 35200, "price_range_max": 58500, "avg_change_pct": 0.9, "top_commodity": "Imported Rice", "market_name": "Mile 12 Market"}'::jsonb, now()),
  ('2026-11-14', 'commodity:1', '{"observations_count": 28, "markets_covered": 6, "price_change_pct": 3.7, "trend": "rising", "volatility": "low", "commodity_name": "Paddy Rice"}'::jsonb, now()),
  ('2026-11-14', 'commodity:6', '{"observations_count": 18, "markets_covered": 5, "price_change_pct": 3.1, "trend": "rising", "volatility": "low", "commodity_name": "Maize (White)"}'::jsonb, now()),
  ('2026-11-14', 'platform', '{"total_observations_today": 45, "active_markets": 9, "active_agents": 5, "pending_verifications": 3, "published_today": 42}'::jsonb, now());


COMMIT;
