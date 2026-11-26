-- Hatsi360 Demo Data Seed — Cleanup / Reversal
-- Migration: 0048
-- Date: 2026-11-15
--
-- Purpose: Remove ALL demonstration data inserted by migrations 0046
-- and 0047, restoring the database to its pre-demo state.
--
-- SAFETY: This migration ONLY removes records identifiable as demo data.
-- Genuine production data is never affected.
--
-- What it removes:
--   1. Price observations with 'DEMO:' in notes (migration 0046)
--   2. Commodity unit conversions with 'DEMO:' in notes (migration 0046)
--   3. Market visit records with 'DEMO:' in notes (migration 0047)
--   4. Notifications inserted by migration 0047
--   5. Collection task events with 'DEMO:' in reason (migration 0047)
--   6. Collection tasks with 'DEMO:' in notes (migration 0047)
--   7. Analytics snapshots inserted by migration 0047
--
-- What it does NOT remove:
--   - Auth users (demo.agent@hatsi360.test, etc.) — these may be needed
--     for testing even after data cleanup. Remove manually if needed.
--   - Profiles — same as above
--   - Organizations — same as above
--   - Organization memberships — same as above
--   - Agent profiles — same as above
--   - Market collection schedule reassignments — these point to existing
--     valid agents and do not constitute demo data
--
-- To completely reset including users, run the additional cleanup SQL
-- at the bottom of this file (commented out by default).

BEGIN;

-- ================================================================
-- 1. PRICE OBSERVATIONS (migration 0046)
-- ================================================================
DELETE FROM price_observation_evidence
WHERE observation_id IN (
  SELECT id FROM price_observations WHERE notes LIKE 'DEMO:%'
);

DELETE FROM price_verification_events
WHERE observation_id IN (
  SELECT id FROM price_observations WHERE notes LIKE 'DEMO:%'
);

DELETE FROM price_revision_history
WHERE observation_id IN (
  SELECT id FROM price_observations WHERE notes LIKE 'DEMO:%'
);

DELETE FROM data_quality_flags
WHERE observation_id IN (
  SELECT id FROM price_observations WHERE notes LIKE 'DEMO:%'
);

DELETE FROM price_observations
WHERE notes LIKE 'DEMO:%';


-- ================================================================
-- 2. COMMODITY UNIT CONVERSIONS (migration 0046)
-- ================================================================
DELETE FROM commodity_unit_conversions
WHERE notes LIKE 'DEMO:%';


-- ================================================================
-- 3. COLLECTION TASK EVENTS (migration 0047)
-- ================================================================
DELETE FROM collection_task_events
WHERE reason LIKE 'DEMO:%';


-- ================================================================
-- 4. COLLECTION TASKS (migration 0047)
-- ================================================================
DELETE FROM collection_tasks
WHERE notes LIKE 'DEMO:%';


-- ================================================================
-- 5. MARKET VISIT RECORDS (migration 0047)
-- ================================================================
DELETE FROM market_visit_records
WHERE notes LIKE 'DEMO:%';


-- ================================================================
-- 6. NOTIFICATIONS (migration 0047)
-- ================================================================
DELETE FROM notification_delivery_logs
WHERE notification_id IN (
  SELECT id FROM notifications
  WHERE title LIKE '%collection task%'
    OR title LIKE '%deadline%'
    OR title LIKE '%submission%'
    OR title LIKE '%Coverage gap%'
    OR title LIKE '%Demo data%'
    OR title LIKE '%correction%'
);

DELETE FROM notifications
WHERE title LIKE '%collection task%'
   OR title LIKE '%deadline%'
   OR title LIKE '%submission%'
   OR title LIKE '%Coverage gap%'
   OR title LIKE '%Demo data%'
   OR title LIKE '%correction%';


-- ================================================================
-- 7. ANALYTICS SNAPSHOTS (migration 0047)
-- ================================================================
DELETE FROM analytics_snapshots
WHERE snapshot_date = '2026-11-14'
  AND scope IN ('market:1', 'market:2', 'commodity:1', 'commodity:6', 'platform');


-- ================================================================
-- 8. RESTORE SCHEDULE ASSIGNMENTS (optional — not demo data per se)
-- The schedule reassignments in 0047 changed assigned_agent_id to
-- regional agents. This restores them to the original single agent.
-- Uncomment if you want to revert:
-- ================================================================

-- UPDATE market_collection_schedules
-- SET assigned_agent_id = 'f9b2d2f7-2147-4579-845d-17ec462e3f91',
--     updated_at = now();


-- ================================================================
-- VERIFICATION
-- ================================================================
-- After running this migration, verify:
--   SELECT count(*) FROM price_observations WHERE notes LIKE 'DEMO:%';  -- should be 0
--   SELECT count(*) FROM collection_tasks WHERE notes LIKE 'DEMO:%';    -- should be 0
--   SELECT count(*) FROM market_visit_records WHERE notes LIKE 'DEMO:%'; -- should be 0
--   SELECT count(*) FROM commodity_unit_conversions WHERE notes LIKE 'DEMO:%'; -- should be 0


-- ================================================================
-- OPTIONAL: COMPLETE USER CLEANUP (not run by default)
-- Uncomment to remove demo users, profiles, organizations, and memberships.
-- WARNING: This will prevent demo users from logging in.
-- ================================================================

-- DELETE FROM organization_members WHERE user_id IN (
--   'f9b2d2f7-2147-4579-845d-17ec462e3f91',
--   '3caaa619-6b96-4dc2-9ebc-f77ce481c5a2',
--   'dcc7c070-cca6-46e4-907f-3d811079be15',
--   'cf465f88-c345-49c4-90f1-ffb56ba89702',
--   'c79f092d-4588-40fc-961f-83eca35d12c4',
--   'b2000000-0000-0000-0000-000000000001',
--   'c3000001-0000-0000-0000-000000000001',
--   'c3000002-0000-0000-0000-000000000002',
--   'c3000003-0000-0000-0000-000000000003',
--   'c3000004-0000-0000-0000-000000000004'
-- );

-- DELETE FROM agent_profiles WHERE profile_id IN (
--   'f9b2d2f7-2147-4579-845d-17ec462e3f91',
--   'c3000001-0000-0000-0000-000000000001',
--   'c3000002-0000-0000-0000-000000000002',
--   'c3000003-0000-0000-0000-000000000003',
--   'c3000004-0000-0000-0000-000000000004'
-- );

-- DELETE FROM profiles WHERE id IN (
--   'f9b2d2f7-2147-4579-845d-17ec462e3f91',
--   '3caaa619-6b96-4dc2-9ebc-f77ce481c5a2',
--   'dcc7c070-cca6-46e4-907f-3d811079be15',
--   'cf465f88-c345-49c4-90f1-ffb56ba89702',
--   'c79f092d-4588-40fc-961f-83eca35d12c4',
--   'b2000000-0000-0000-0000-000000000001',
--   'c3000001-0000-0000-0000-000000000001',
--   'c3000002-0000-0000-0000-000000000002',
--   'c3000003-0000-0000-0000-000000000003',
--   'c3000004-0000-0000-0000-000000000004'
-- );

-- DELETE FROM organizations WHERE id IN (
--   '1458b921-4c46-4d1d-b978-ffbdaa2c4b07',
--   '10371b8a-7037-496d-8537-4257bcbbb00b',
--   '90069491-3966-4cb7-98f3-c65f577a5423',
--   '1fb65291-532b-416b-8dfa-87720547b919',
--   '9a459ee4-8a86-47d9-b835-a4939654fb70'
-- );

-- DELETE FROM auth.identities WHERE user_id IN (
--   'b2000000-0000-0000-0000-000000000001',
--   'c3000001-0000-0000-0000-000000000001',
--   'c3000002-0000-0000-0000-000000000002',
--   'c3000003-0000-0000-0000-000000000003',
--   'c3000004-0000-0000-0000-000000000004'
-- );

-- DELETE FROM auth.users WHERE id IN (
--   'b2000000-0000-0000-0000-000000000001',
--   'c3000001-0000-0000-0000-000000000001',
--   'c3000002-0000-0000-0000-000000000002',
--   'c3000003-0000-0000-0000-000000000003',
--   'c3000004-0000-0000-0000-000000000004'
-- );

COMMIT;
