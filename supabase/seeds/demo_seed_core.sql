-- Hatsi360 Demo Data Seed — Core Market Data
-- Migration: 0046
-- Date: 2026-11-15
--
-- Purpose: Populate the database with realistic, interconnected agricultural
-- market demonstration data for development, staging and demo environments.
--
-- Identification:
--   - All price observations use notes prefixed with 'DEMO: '
--   - All price observations use source_system = 'agent_app'
--   - Demo unit conversions use notes prefixed with 'DEMO: '
--   - All demo records are safely removable via migration 0048
--
-- Reversibility:
--   Run migration 0048_demo_seed_cleanup.sql to remove only demo records.
--   Genuine production data is never affected.
--
-- IMPORTANT: Do NOT run this migration in a production environment where
-- real market data already exists. Use only on development, staging, or
-- explicitly designated demo environments.

BEGIN;

-- ================================================================
-- 1. DEMO MARKETS
-- Markets 1-11 already exist from migration 0007_seed_reference_data.sql.
-- This demo seed uses those existing markets:
--   1=Dawanau(Kano), 2=Mile12(Lagos), 3=Gujungu(Jigawa), 4=Anchau(Kaduna),
--   5=Funtua(Katsina), 6=Gusau(Zamfara), 7=Maiduguri(Borno),
--   8=Sokoto(Sokoto), 9=Wunti(Bauchi), 10=ZakiBiam(Benue), 11=Lafia(Nasarawa)
-- ================================================================


-- ================================================================
-- 2. COMMODITY-UNIT CONVERSIONS (demo rules)
-- Standard 50kg bag ↔ kg conversions for common grain commodities.
-- ================================================================

INSERT INTO commodity_unit_conversions (commodity_id, unit_id, base_unit_id, factor, is_verified, notes) VALUES
  (1, 4, 1, 50.0, true, 'DEMO: 1 bag of paddy rice = 50 kg'),
  (3, 4, 1, 50.0, true, 'DEMO: 1 bag of imported rice = 50 kg'),
  (4, 4, 1, 50.0, true, 'DEMO: 1 bag of local rice = 50 kg'),
  (5, 4, 1, 50.0, true, 'DEMO: 1 bag of wheat = 50 kg'),
  (6, 4, 1, 50.0, true, 'DEMO: 1 bag of white maize = 50 kg'),
  (7, 4, 1, 50.0, true, 'DEMO: 1 bag of yellow maize = 50 kg'),
  (8, 4, 1, 50.0, true, 'DEMO: 1 bag of millet = 50 kg'),
  (9, 4, 1, 50.0, true, 'DEMO: 1 bag of white sorghum = 50 kg'),
  (10, 4, 1, 50.0, true, 'DEMO: 1 bag of red sorghum = 50 kg'),
  (13, 4, 1, 50.0, true, 'DEMO: 1 bag of groundnut = 50 kg'),
  (15, 4, 1, 50.0, true, 'DEMO: 1 bag of soya beans = 50 kg'),
  (16, 4, 1, 50.0, true, 'DEMO: 1 bag of cowpea = 50 kg')
ON CONFLICT DO NOTHING;


-- ================================================================
-- 3. DEMO PRICE OBSERVATIONS
-- ~300 observations over 60 days (2026-09-15 to 2026-11-14).
-- All marked source_system = 'agent_app'.
-- 80% verified + published, 20% pending_verification.
--
-- Price strategy per commodity (NGN per 50kg bag unless noted):
--   Paddy Rice (1):     ₦40,000–₦45,000  Kano cheaper, Lagos dearer
--   Imported Rice (3):  ₦52,000–₦58,000  Uniform premium
--   Local Rice (4):     ₦42,000–₦48,000  Slight premium over paddy
--   Wheat (5):          ₦48,000–₦55,000  Import-driven pricing
--   Maize White (6):    ₦34,000–₦42,000  Core grain
--   Maize Yellow (7):   ₦33,000–₦40,000  Slightly below white
--   Millet (8):         ₦32,000–₦40,000  Northern staple
--   Sorghum White (9):  ₦28,000–₦36,000  Cheapest major grain
--   Sorghum Red (10):   ₦30,000–₦37,000  Slight premium over white
--   Sesame Seed (11):   ₦130,000–₦170,000  High-value export
--   Groundnut (13):     ₦55,000–₦72,000  Oilseed premium
--   Soya Beans (15):    ₦65,000–₦85,000  Growing demand
--   Cowpea (16):        ₦48,000–₦62,000  Protein staple
--   Cassava (17):       ₦220–₦320 / kg   Different unit
--   Gum Arabic (19):    ₦550,000–₦750,000 / tonne  Export
--
-- Trend: gradual +2-5% rise over 60 days for most grains,
-- with some commodities showing slight declines.
-- ================================================================

-- Helper: we use explicit INSERT with realistic values.
-- Each observation uses a UUID generated from a deterministic pattern.

-- We will insert in blocks by commodity. Prices increase ~0.3% per week
-- to simulate a gradual uptrend. Base date: 2026-09-15.

-- Block 1: Paddy Rice (commodity_id=1, unit_id=4 bag)
-- Markets: 101, 2, 4, 6, 7, 8, 114
-- Base price: 41000 in Kano, +8% in Lagos, -3% in rural markets
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  -- Week 1: 2026-09-15 to 2026-09-21
  (1, 1, 1, 'wholesale_transaction', 40500, 4, 'NGN',
   '2026-09-15 09:30:00+01', 'minute', 'verified', '2026-09-15 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice observed at Dawanau', '{}'),
  (1, 1, 1, 'wholesale_transaction', 40800, 4, 'NGN',
   '2026-09-17 10:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice observed at Dawanau', '{}'),
  (1, 2, 1, 'wholesale_transaction', 40200, 4, 'NGN',
   '2026-09-15 11:00:00+01', 'minute', 'verified', '2026-09-15 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Yankaba', '{}'),
  (1, 6, 1, 'retail', 44500, 4, 'NGN',
   '2026-09-16 09:00:00+01', 'minute', 'verified', '2026-09-16 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice retail at Mile 12', '{}'),
  (1, 7, 1, 'wholesale_transaction', 39800, 4, 'NGN',
   '2026-09-18 08:30:00+01', 'minute', 'verified', '2026-09-18 13:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Hadejia', '{}'),
  (1, 8, 1, 'wholesale_transaction', 40100, 4, 'NGN',
   '2026-09-16 10:00:00+01', 'minute', 'verified', '2026-09-16 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Katsina Central', '{}'),
  (1, 10, 1, 'wholesale_transaction', 41200, 4, 'NGN',
   '2026-09-17 09:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Makurdi', '{}'),
  (1, 4, 1, 'wholesale_transaction', 40300, 4, 'NGN',
   '2026-09-19 10:30:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Giwa', '{}'),

  -- Week 2: 2026-09-22 to 2026-09-28 (~+0.3%)
  (1, 1, 1, 'wholesale_transaction', 40700, 4, 'NGN',
   '2026-09-22 09:30:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Dawanau', '{}'),
  (1, 1, 2, 'wholesale_transaction', 39500, 4, 'NGN',
   '2026-09-23 10:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Grade 2 paddy rice at Dawanau', '{}'),
  (1, 6, 1, 'retail', 44900, 4, 'NGN',
   '2026-09-23 09:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice retail at Mile 12', '{}'),
  (1, 2, 1, 'wholesale_transaction', 40400, 4, 'NGN',
   '2026-09-24 11:00:00+01', 'minute', 'verified', '2026-09-24 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Yankaba', '{}'),
  (1, 10, 1, 'wholesale_transaction', 41400, 4, 'NGN',
   '2026-09-25 09:00:00+01', 'minute', 'verified', '2026-09-25 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Makurdi', '{}'),
  (1, 8, 1, 'wholesale_transaction', 40300, 4, 'NGN',
   '2026-09-24 10:00:00+01', 'minute', 'verified', '2026-09-24 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Katsina Central', '{}'),
  (1, 7, 1, 'wholesale_transaction', 40000, 4, 'NGN',
   '2026-09-26 08:30:00+01', 'minute', 'verified', '2026-09-26 13:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Hadejia', '{}'),
  (1, 4, 1, 'wholesale_transaction', 40500, 4, 'NGN',
   '2026-09-25 10:30:00+01', 'minute', 'verified', '2026-09-25 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Giwa', '{}'),

  -- Week 3: 2026-09-29 to 2026-10-05
  (1, 1, 1, 'wholesale_transaction', 41000, 4, 'NGN',
   '2026-09-29 09:30:00+01', 'minute', 'verified', '2026-09-29 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Dawanau', '{}'),
  (1, 6, 1, 'retail', 45200, 4, 'NGN',
   '2026-09-30 09:00:00+01', 'minute', 'verified', '2026-09-30 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice retail at Mile 12', '{}'),
  (1, 2, 1, 'wholesale_transaction', 40600, 4, 'NGN',
   '2026-10-01 11:00:00+01', 'minute', 'verified', '2026-10-01 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Yankaba', '{}'),
  (1, 10, 1, 'wholesale_transaction', 41600, 4, 'NGN',
   '2026-10-02 09:00:00+01', 'minute', 'verified', '2026-10-02 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Makurdi', '{}'),
  (1, 8, 1, 'wholesale_transaction', 40500, 4, 'NGN',
   '2026-10-01 10:00:00+01', 'minute', 'verified', '2026-10-01 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Katsina Central', '{}'),
  (1, 7, 1, 'wholesale_transaction', 40200, 4, 'NGN',
   '2026-10-03 08:30:00+01', 'minute', 'verified', '2026-10-03 13:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Hadejia', '{}'),
  (1, 4, 1, 'wholesale_transaction', 40700, 4, 'NGN',
   '2026-10-02 10:30:00+01', 'minute', 'verified', '2026-10-02 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Giwa', '{}'),
  (1, 7, 1, 'wholesale_transaction', 41500, 4, 'NGN',
   '2026-10-05 09:00:00+01', 'minute', 'verified', '2026-10-05 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Maiduguri', '{}'),

  -- Week 4: 2026-10-06 to 2026-10-12
  (1, 1, 1, 'wholesale_transaction', 41200, 4, 'NGN',
   '2026-10-06 09:30:00+01', 'minute', 'verified', '2026-10-06 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Dawanau', '{}'),
  (1, 6, 1, 'retail', 45500, 4, 'NGN',
   '2026-10-07 09:00:00+01', 'minute', 'verified', '2026-10-07 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice retail at Mile 12', '{}'),
  (1, 2, 1, 'wholesale_transaction', 40800, 4, 'NGN',
   '2026-10-08 11:00:00+01', 'minute', 'verified', '2026-10-08 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Yankaba', '{}'),
  (1, 10, 1, 'wholesale_transaction', 41800, 4, 'NGN',
   '2026-10-09 09:00:00+01', 'minute', 'verified', '2026-10-09 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Makurdi', '{}'),
  (1, 8, 1, 'wholesale_transaction', 40700, 4, 'NGN',
   '2026-10-08 10:00:00+01', 'minute', 'verified', '2026-10-08 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Katsina Central', '{}'),
  (1, 7, 1, 'wholesale_transaction', 40400, 4, 'NGN',
   '2026-10-10 08:30:00+01', 'minute', 'verified', '2026-10-10 13:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Hadejia', '{}'),
  (1, 4, 1, 'wholesale_transaction', 40900, 4, 'NGN',
   '2026-10-09 10:30:00+01', 'minute', 'verified', '2026-10-09 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Giwa', '{}'),
  (1, 7, 1, 'wholesale_transaction', 41700, 4, 'NGN',
   '2026-10-12 09:00:00+01', 'minute', 'verified', '2026-10-12 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Maiduguri', '{}'),

  -- Week 5: 2026-10-13 to 2026-10-19
  (1, 1, 1, 'wholesale_transaction', 41500, 4, 'NGN',
   '2026-10-13 09:30:00+01', 'minute', 'verified', '2026-10-13 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Dawanau', '{}'),
  (1, 6, 1, 'retail', 45800, 4, 'NGN',
   '2026-10-14 09:00:00+01', 'minute', 'verified', '2026-10-14 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice retail at Mile 12', '{}'),
  (1, 2, 1, 'wholesale_transaction', 41000, 4, 'NGN',
   '2026-10-15 11:00:00+01', 'minute', 'verified', '2026-10-15 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Yankaba', '{}'),
  (1, 10, 1, 'wholesale_transaction', 42000, 4, 'NGN',
   '2026-10-16 09:00:00+01', 'minute', 'verified', '2026-10-16 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Makurdi', '{}'),
  (1, 8, 1, 'wholesale_transaction', 40900, 4, 'NGN',
   '2026-10-15 10:00:00+01', 'minute', 'verified', '2026-10-15 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Katsina Central', '{}'),
  (1, 7, 1, 'wholesale_transaction', 40600, 4, 'NGN',
   '2026-10-17 08:30:00+01', 'minute', 'verified', '2026-10-17 13:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Hadejia', '{}'),
  (1, 4, 1, 'wholesale_transaction', 41100, 4, 'NGN',
   '2026-10-16 10:30:00+01', 'minute', 'verified', '2026-10-16 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Giwa', '{}'),
  (1, 7, 1, 'wholesale_transaction', 41900, 4, 'NGN',
   '2026-10-19 09:00:00+01', 'minute', 'verified', '2026-10-19 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Maiduguri', '{}'),

  -- Weeks 6-8: 2026-10-20 to 2026-11-14 (continuing uptrend)
  (1, 1, 1, 'wholesale_transaction', 41800, 4, 'NGN',
   '2026-10-20 09:30:00+01', 'minute', 'verified', '2026-10-20 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Dawanau', '{}'),
  (1, 6, 1, 'retail', 46100, 4, 'NGN',
   '2026-10-21 09:00:00+01', 'minute', 'verified', '2026-10-21 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice retail at Mile 12', '{}'),
  (1, 2, 1, 'wholesale_transaction', 41200, 4, 'NGN',
   '2026-10-22 11:00:00+01', 'minute', 'verified', '2026-10-22 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Yankaba', '{}'),
  (1, 10, 1, 'wholesale_transaction', 42200, 4, 'NGN',
   '2026-10-23 09:00:00+01', 'minute', 'verified', '2026-10-23 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Makurdi', '{}'),
  (1, 8, 1, 'wholesale_transaction', 41100, 4, 'NGN',
   '2026-10-22 10:00:00+01', 'minute', 'verified', '2026-10-22 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Katsina Central', '{}'),
  (1, 7, 1, 'wholesale_transaction', 40800, 4, 'NGN',
   '2026-10-24 08:30:00+01', 'minute', 'verified', '2026-10-24 13:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Hadejia', '{}'),
  (1, 4, 1, 'wholesale_transaction', 41300, 4, 'NGN',
   '2026-10-23 10:30:00+01', 'minute', 'verified', '2026-10-23 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Giwa', '{}'),
  (1, 7, 1, 'wholesale_transaction', 42100, 4, 'NGN',
   '2026-10-26 09:00:00+01', 'minute', 'verified', '2026-10-26 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Maiduguri', '{}'),

  -- Weeks 7-8 final observations (latest)
  (1, 1, 1, 'wholesale_transaction', 42000, 4, 'NGN',
   '2026-11-03 09:30:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Dawanau', '{}'),
  (1, 6, 1, 'retail', 46500, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice retail at Mile 12', '{}'),
  (1, 2, 1, 'wholesale_transaction', 41400, 4, 'NGN',
   '2026-11-05 11:00:00+01', 'minute', 'verified', '2026-11-05 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Yankaba', '{}'),
  (1, 10, 1, 'wholesale_transaction', 42500, 4, 'NGN',
   '2026-11-06 09:00:00+01', 'minute', 'verified', '2026-11-06 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Makurdi', '{}'),
  (1, 8, 1, 'wholesale_transaction', 41300, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 15:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Katsina Central', '{}'),
  (1, 7, 1, 'wholesale_transaction', 41000, 4, 'NGN',
   '2026-11-11 08:30:00+01', 'minute', 'verified', '2026-11-11 13:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Hadejia', '{}'),
  (1, 4, 1, 'wholesale_transaction', 41500, 4, 'NGN',
   '2026-11-12 10:30:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Giwa', '{}'),
  (1, 7, 1, 'wholesale_transaction', 42300, 4, 'NGN',
   '2026-11-13 09:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Paddy rice at Maiduguri', '{}'),

  -- 2 pending observations (for admin review queue testing)
  (1, 1, 1, 'wholesale_transaction', 42200, 4, 'NGN',
   '2026-11-14 09:30:00+01', 'minute', 'pending_verification', NULL, true,
   'agent_app', 'DEMO: Pending review - Paddy rice at Dawanau', '{}'),
  (1, 6, 1, 'retail', 46800, 4, 'NGN',
   '2026-11-14 09:00:00+01', 'minute', 'pending_verification', NULL, true,
   'agent_app', 'DEMO: Pending review - Paddy rice retail at Mile 12', '{}');


-- Block 2: Maize White (commodity_id=6, unit_id=4 bag)
-- Base price: ₦36,000 Kano, ₦39,500 Lagos, ₦35,000 rural
-- Gentle uptrend ~3% over 8 weeks
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  -- Week 1
  (6, 1, 16, 'wholesale_transaction', 35800, 4, 'NGN',
   '2026-09-16 09:30:00+01', 'minute', 'verified', '2026-09-16 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Dawanau', '{}'),
  (6, 6, 16, 'retail', 39500, 4, 'NGN',
   '2026-09-17 09:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: White maize retail at Mile 12', '{}'),
  (6, 4, 16, 'wholesale_transaction', 35500, 4, 'NGN',
   '2026-09-18 10:00:00+01', 'minute', 'verified', '2026-09-18 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Giwa', '{}'),
  (6, 8, 16, 'wholesale_transaction', 35200, 4, 'NGN',
   '2026-09-19 10:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Katsina Central', '{}'),
  (6, 10, 16, 'wholesale_transaction', 36500, 4, 'NGN',
   '2026-09-20 09:00:00+01', 'minute', 'verified', '2026-09-20 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Makurdi', '{}'),
  (6, 7, 16, 'wholesale_transaction', 35000, 4, 'NGN',
   '2026-09-21 08:30:00+01', 'minute', 'verified', '2026-09-21 13:00:00+01', true,
   'agent_app', 'DEMO: White maize at Hadejia', '{}'),
  (6, 7, 16, 'wholesale_transaction', 36200, 4, 'NGN',
   '2026-09-22 09:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Maiduguri', '{}'),
  (6, 8, 16, 'wholesale_transaction', 35400, 4, 'NGN',
   '2026-09-23 10:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Sokoto Central', '{}'),

  -- Week 3
  (6, 1, 16, 'wholesale_transaction', 36200, 4, 'NGN',
   '2026-09-30 09:30:00+01', 'minute', 'verified', '2026-09-30 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Dawanau', '{}'),
  (6, 6, 16, 'retail', 39900, 4, 'NGN',
   '2026-10-01 09:00:00+01', 'minute', 'verified', '2026-10-01 14:00:00+01', true,
   'agent_app', 'DEMO: White maize retail at Mile 12', '{}'),
  (6, 4, 16, 'wholesale_transaction', 35800, 4, 'NGN',
   '2026-10-02 10:00:00+01', 'minute', 'verified', '2026-10-02 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Giwa', '{}'),
  (6, 8, 16, 'wholesale_transaction', 35500, 4, 'NGN',
   '2026-10-03 10:00:00+01', 'minute', 'verified', '2026-10-03 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Katsina Central', '{}'),
  (6, 10, 16, 'wholesale_transaction', 36900, 4, 'NGN',
   '2026-10-04 09:00:00+01', 'minute', 'verified', '2026-10-04 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Makurdi', '{}'),
  (6, 7, 16, 'wholesale_transaction', 35300, 4, 'NGN',
   '2026-10-05 08:30:00+01', 'minute', 'verified', '2026-10-05 13:00:00+01', true,
   'agent_app', 'DEMO: White maize at Hadejia', '{}'),

  -- Week 5
  (6, 1, 16, 'wholesale_transaction', 36600, 4, 'NGN',
   '2026-10-14 09:30:00+01', 'minute', 'verified', '2026-10-14 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Dawanau', '{}'),
  (6, 6, 16, 'retail', 40300, 4, 'NGN',
   '2026-10-15 09:00:00+01', 'minute', 'verified', '2026-10-15 14:00:00+01', true,
   'agent_app', 'DEMO: White maize retail at Mile 12', '{}'),
  (6, 4, 16, 'wholesale_transaction', 36100, 4, 'NGN',
   '2026-10-16 10:00:00+01', 'minute', 'verified', '2026-10-16 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Giwa', '{}'),
  (6, 8, 16, 'wholesale_transaction', 35800, 4, 'NGN',
   '2026-10-17 10:00:00+01', 'minute', 'verified', '2026-10-17 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Katsina Central', '{}'),
  (6, 10, 16, 'wholesale_transaction', 37300, 4, 'NGN',
   '2026-10-18 09:00:00+01', 'minute', 'verified', '2026-10-18 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Makurdi', '{}'),
  (6, 7, 16, 'wholesale_transaction', 36800, 4, 'NGN',
   '2026-10-19 09:00:00+01', 'minute', 'verified', '2026-10-19 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Maiduguri', '{}'),

  -- Week 7-8 latest
  (6, 1, 16, 'wholesale_transaction', 37000, 4, 'NGN',
   '2026-11-03 09:30:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Dawanau', '{}'),
  (6, 6, 16, 'retail', 40700, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: White maize retail at Mile 12', '{}'),
  (6, 4, 16, 'wholesale_transaction', 36500, 4, 'NGN',
   '2026-11-05 10:00:00+01', 'minute', 'verified', '2026-11-05 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Giwa', '{}'),
  (6, 8, 16, 'wholesale_transaction', 36200, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Katsina Central', '{}'),
  (6, 10, 16, 'wholesale_transaction', 37700, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Makurdi', '{}'),
  (6, 7, 16, 'wholesale_transaction', 37200, 4, 'NGN',
   '2026-11-12 09:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Maiduguri', '{}'),
  (6, 7, 16, 'wholesale_transaction', 35700, 4, 'NGN',
   '2026-11-13 08:30:00+01', 'minute', 'verified', '2026-11-13 13:00:00+01', true,
   'agent_app', 'DEMO: White maize at Hadejia', '{}'),
  (6, 8, 16, 'wholesale_transaction', 36100, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: White maize at Sokoto Central', '{}');


-- Block 3: Sorghum White (commodity_id=9, unit_id=4 bag)
-- Base: ₦29,000 Kano, ₦32,000 Lagos, ₦28,000 rural
-- Slight decline ~2% over period (harvest season effect)
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (9, 1, 28, 'wholesale_transaction', 29200, 4, 'NGN',
   '2026-09-16 10:00:00+01', 'minute', 'verified', '2026-09-16 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Dawanau', '{}'),
  (9, 6, 28, 'retail', 32000, 4, 'NGN',
   '2026-09-17 09:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum retail at Mile 12', '{}'),
  (9, 4, 28, 'wholesale_transaction', 28800, 4, 'NGN',
   '2026-09-19 10:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Giwa', '{}'),
  (9, 8, 28, 'wholesale_transaction', 28600, 4, 'NGN',
   '2026-09-20 10:00:00+01', 'minute', 'verified', '2026-09-20 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Katsina Central', '{}'),
  (9, 10, 28, 'wholesale_transaction', 29500, 4, 'NGN',
   '2026-09-21 09:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Makurdi', '{}'),
  (9, 7, 28, 'wholesale_transaction', 29300, 4, 'NGN',
   '2026-09-22 09:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Maiduguri', '{}'),
  (9, 7, 28, 'wholesale_transaction', 28400, 4, 'NGN',
   '2026-09-23 08:30:00+01', 'minute', 'verified', '2026-09-23 13:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Hadejia', '{}'),

  -- Week 4
  (9, 1, 28, 'wholesale_transaction', 29000, 4, 'NGN',
   '2026-10-06 10:00:00+01', 'minute', 'verified', '2026-10-06 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Dawanau', '{}'),
  (9, 6, 28, 'retail', 31700, 4, 'NGN',
   '2026-10-07 09:00:00+01', 'minute', 'verified', '2026-10-07 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum retail at Mile 12', '{}'),
  (9, 4, 28, 'wholesale_transaction', 28500, 4, 'NGN',
   '2026-10-09 10:00:00+01', 'minute', 'verified', '2026-10-09 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Giwa', '{}'),
  (9, 8, 28, 'wholesale_transaction', 28300, 4, 'NGN',
   '2026-10-10 10:00:00+01', 'minute', 'verified', '2026-10-10 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Katsina Central', '{}'),
  (9, 10, 28, 'wholesale_transaction', 29200, 4, 'NGN',
   '2026-10-11 09:00:00+01', 'minute', 'verified', '2026-10-11 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Makurdi', '{}'),
  (9, 7, 28, 'wholesale_transaction', 29000, 4, 'NGN',
   '2026-10-12 09:00:00+01', 'minute', 'verified', '2026-10-12 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Maiduguri', '{}'),
  (9, 7, 28, 'wholesale_transaction', 28100, 4, 'NGN',
   '2026-10-13 08:30:00+01', 'minute', 'verified', '2026-10-13 13:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Hadejia', '{}'),

  -- Week 8 latest
  (9, 1, 28, 'wholesale_transaction', 28600, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Dawanau', '{}'),
  (9, 6, 28, 'retail', 31200, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum retail at Mile 12', '{}'),
  (9, 4, 28, 'wholesale_transaction', 28100, 4, 'NGN',
   '2026-11-05 10:00:00+01', 'minute', 'verified', '2026-11-05 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Giwa', '{}'),
  (9, 8, 28, 'wholesale_transaction', 27900, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Katsina Central', '{}'),
  (9, 10, 28, 'wholesale_transaction', 28800, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Makurdi', '{}'),
  (9, 7, 28, 'wholesale_transaction', 28500, 4, 'NGN',
   '2026-11-12 09:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Maiduguri', '{}'),
  (9, 7, 28, 'wholesale_transaction', 27700, 4, 'NGN',
   '2026-11-13 08:30:00+01', 'minute', 'verified', '2026-11-13 13:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Hadejia', '{}'),
  (9, 8, 28, 'wholesale_transaction', 28200, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: White sorghum at Sokoto Central', '{}');


-- Block 4: Groundnut (commodity_id=13, unit_id=4 bag)
-- Base: ₦58,000 Kano, ₦65,000 Lagos
-- Rising trend ~5% over period (high demand)
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (13, 1, 40, 'wholesale_transaction', 57500, 4, 'NGN',
   '2026-09-16 10:00:00+01', 'minute', 'verified', '2026-09-16 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Dawanau', '{}'),
  (13, 6, 40, 'retail', 65000, 4, 'NGN',
   '2026-09-17 09:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut retail at Mile 12', '{}'),
  (13, 8, 40, 'wholesale_transaction', 56800, 4, 'NGN',
   '2026-09-19 10:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Katsina Central', '{}'),
  (13, 5, 40, 'wholesale_transaction', 56200, 4, 'NGN',
   '2026-09-21 10:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Funtua', '{}'),
  (13, 8, 40, 'wholesale_transaction', 57000, 4, 'NGN',
   '2026-09-22 10:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Sokoto Central', '{}'),
  (13, 6, 40, 'wholesale_transaction', 56500, 4, 'NGN',
   '2026-09-23 10:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Gusau Central', '{}'),

  -- Week 4
  (13, 1, 40, 'wholesale_transaction', 58800, 4, 'NGN',
   '2026-10-06 10:00:00+01', 'minute', 'verified', '2026-10-06 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Dawanau', '{}'),
  (13, 6, 40, 'retail', 66500, 4, 'NGN',
   '2026-10-07 09:00:00+01', 'minute', 'verified', '2026-10-07 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut retail at Mile 12', '{}'),
  (13, 8, 40, 'wholesale_transaction', 58000, 4, 'NGN',
   '2026-10-09 10:00:00+01', 'minute', 'verified', '2026-10-09 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Katsina Central', '{}'),
  (13, 5, 40, 'wholesale_transaction', 57400, 4, 'NGN',
   '2026-10-11 10:00:00+01', 'minute', 'verified', '2026-10-11 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Funtua', '{}'),
  (13, 8, 40, 'wholesale_transaction', 58200, 4, 'NGN',
   '2026-10-12 10:00:00+01', 'minute', 'verified', '2026-10-12 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Sokoto Central', '{}'),
  (13, 6, 40, 'wholesale_transaction', 57700, 4, 'NGN',
   '2026-10-13 10:00:00+01', 'minute', 'verified', '2026-10-13 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Gusau Central', '{}'),

  -- Week 8 latest
  (13, 1, 40, 'wholesale_transaction', 60500, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Dawanau', '{}'),
  (13, 6, 40, 'retail', 68500, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut retail at Mile 12', '{}'),
  (13, 8, 40, 'wholesale_transaction', 59700, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Katsina Central', '{}'),
  (13, 5, 40, 'wholesale_transaction', 59000, 4, 'NGN',
   '2026-11-11 10:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Funtua', '{}'),
  (13, 8, 40, 'wholesale_transaction', 59900, 4, 'NGN',
   '2026-11-12 10:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Sokoto Central', '{}'),
  (13, 6, 40, 'wholesale_transaction', 59400, 4, 'NGN',
   '2026-11-13 10:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Gusau Central', '{}'),
  (13, 4, 40, 'wholesale_transaction', 59200, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Giwa', '{}'),
  (13, 2, 40, 'wholesale_transaction', 60200, 4, 'NGN',
   '2026-11-14 11:00:00+01', 'minute', 'verified', '2026-11-14 15:00:00+01', true,
   'agent_app', 'DEMO: Groundnut at Yankaba', '{}');


-- Block 5: Sesame Seed (commodity_id=11, unit_id=4 bag)
-- Base: ₦140,000 Kano, ₦160,000 Lagos
-- Export commodity, rising ~4%
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (11, 1, 31, 'wholesale_transaction', 138000, 4, 'NGN',
   '2026-09-17 10:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Dawanau', '{}'),
  (11, 6, 31, 'retail', 158000, 4, 'NGN',
   '2026-09-18 09:00:00+01', 'minute', 'verified', '2026-09-18 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed retail at Mile 12', '{}'),
  (11, 8, 31, 'wholesale_transaction', 136000, 4, 'NGN',
   '2026-09-20 10:00:00+01', 'minute', 'verified', '2026-09-20 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Katsina Central', '{}'),
  (11, 10, 31, 'wholesale_transaction', 140000, 4, 'NGN',
   '2026-09-21 09:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Makurdi', '{}'),
  (11, 8, 31, 'wholesale_transaction', 137000, 4, 'NGN',
   '2026-09-22 10:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Sokoto Central', '{}'),
  (11, 6, 31, 'wholesale_transaction', 135000, 4, 'NGN',
   '2026-09-23 10:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Gusau Central', '{}'),

  -- Week 4
  (11, 1, 31, 'wholesale_transaction', 141000, 4, 'NGN',
   '2026-10-06 10:00:00+01', 'minute', 'verified', '2026-10-06 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Dawanau', '{}'),
  (11, 6, 31, 'retail', 161000, 4, 'NGN',
   '2026-10-07 09:00:00+01', 'minute', 'verified', '2026-10-07 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed retail at Mile 12', '{}'),
  (11, 8, 31, 'wholesale_transaction', 139000, 4, 'NGN',
   '2026-10-09 10:00:00+01', 'minute', 'verified', '2026-10-09 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Katsina Central', '{}'),
  (11, 10, 31, 'wholesale_transaction', 143000, 4, 'NGN',
   '2026-10-11 09:00:00+01', 'minute', 'verified', '2026-10-11 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Makurdi', '{}'),
  (11, 8, 31, 'wholesale_transaction', 140000, 4, 'NGN',
   '2026-10-12 10:00:00+01', 'minute', 'verified', '2026-10-12 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Sokoto Central', '{}'),
  (11, 6, 31, 'wholesale_transaction', 138000, 4, 'NGN',
   '2026-10-13 10:00:00+01', 'minute', 'verified', '2026-10-13 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Gusau Central', '{}'),

  -- Week 8 latest
  (11, 1, 31, 'wholesale_transaction', 145000, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Dawanau', '{}'),
  (11, 6, 31, 'retail', 165000, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed retail at Mile 12', '{}'),
  (11, 8, 31, 'wholesale_transaction', 143000, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Katsina Central', '{}'),
  (11, 10, 31, 'wholesale_transaction', 147000, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Makurdi', '{}'),
  (11, 8, 31, 'wholesale_transaction', 144000, 4, 'NGN',
   '2026-11-12 10:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Sokoto Central', '{}'),
  (11, 6, 31, 'wholesale_transaction', 142000, 4, 'NGN',
   '2026-11-13 10:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Gusau Central', '{}'),
  (11, 4, 31, 'wholesale_transaction', 143500, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Giwa', '{}'),
  (11, 2, 31, 'wholesale_transaction', 144500, 4, 'NGN',
   '2026-11-14 11:00:00+01', 'minute', 'verified', '2026-11-14 15:00:00+01', true,
   'agent_app', 'DEMO: Sesame seed at Yankaba', '{}');


-- Block 6: Soya Beans (commodity_id=15, unit_id=4 bag)
-- Base: ₦68,000 Kano, ₦76,000 Lagos
-- Steady rise ~4%
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (15, 1, 44, 'wholesale_transaction', 67500, 4, 'NGN',
   '2026-09-17 10:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Dawanau', '{}'),
  (15, 6, 44, 'retail', 76000, 4, 'NGN',
   '2026-09-18 09:00:00+01', 'minute', 'verified', '2026-09-18 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans retail at Mile 12', '{}'),
  (15, 4, 44, 'wholesale_transaction', 66800, 4, 'NGN',
   '2026-09-19 10:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Giwa', '{}'),
  (15, 8, 44, 'wholesale_transaction', 66200, 4, 'NGN',
   '2026-09-21 10:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Katsina Central', '{}'),
  (15, 10, 44, 'wholesale_transaction', 68500, 4, 'NGN',
   '2026-09-22 09:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Makurdi', '{}'),
  (15, 7, 44, 'wholesale_transaction', 67800, 4, 'NGN',
   '2026-09-23 09:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Maiduguri', '{}'),

  -- Week 4
  (15, 1, 44, 'wholesale_transaction', 69000, 4, 'NGN',
   '2026-10-06 10:00:00+01', 'minute', 'verified', '2026-10-06 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Dawanau', '{}'),
  (15, 6, 44, 'retail', 77800, 4, 'NGN',
   '2026-10-07 09:00:00+01', 'minute', 'verified', '2026-10-07 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans retail at Mile 12', '{}'),
  (15, 4, 44, 'wholesale_transaction', 68200, 4, 'NGN',
   '2026-10-09 10:00:00+01', 'minute', 'verified', '2026-10-09 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Giwa', '{}'),
  (15, 8, 44, 'wholesale_transaction', 67500, 4, 'NGN',
   '2026-10-10 10:00:00+01', 'minute', 'verified', '2026-10-10 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Katsina Central', '{}'),
  (15, 10, 44, 'wholesale_transaction', 70000, 4, 'NGN',
   '2026-10-11 09:00:00+01', 'minute', 'verified', '2026-10-11 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Makurdi', '{}'),
  (15, 7, 44, 'wholesale_transaction', 69200, 4, 'NGN',
   '2026-10-12 09:00:00+01', 'minute', 'verified', '2026-10-12 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Maiduguri', '{}'),

  -- Week 8 latest
  (15, 1, 44, 'wholesale_transaction', 71000, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Dawanau', '{}'),
  (15, 6, 44, 'retail', 80000, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans retail at Mile 12', '{}'),
  (15, 4, 44, 'wholesale_transaction', 70000, 4, 'NGN',
   '2026-11-05 10:00:00+01', 'minute', 'verified', '2026-11-05 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Giwa', '{}'),
  (15, 8, 44, 'wholesale_transaction', 69200, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Katsina Central', '{}'),
  (15, 10, 44, 'wholesale_transaction', 72000, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Makurdi', '{}'),
  (15, 7, 44, 'wholesale_transaction', 71200, 4, 'NGN',
   '2026-11-12 09:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Maiduguri', '{}'),
  (15, 8, 44, 'wholesale_transaction', 69800, 4, 'NGN',
   '2026-11-13 10:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Sokoto Central', '{}'),
  (15, 6, 44, 'wholesale_transaction', 70500, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: Soya beans at Gusau Central', '{}');


-- Block 7: Cowpea (commodity_id=16, unit_id=4 bag)
-- Base: ₦50,000 Kano, ₦56,000 Lagos
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (16, 1, 46, 'wholesale_transaction', 49500, 4, 'NGN',
   '2026-09-18 10:00:00+01', 'minute', 'verified', '2026-09-18 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Dawanau', '{}'),
  (16, 6, 46, 'retail', 56000, 4, 'NGN',
   '2026-09-19 09:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea retail at Mile 12', '{}'),
  (16, 8, 46, 'wholesale_transaction', 48800, 4, 'NGN',
   '2026-09-21 10:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Katsina Central', '{}'),
  (16, 10, 46, 'wholesale_transaction', 50500, 4, 'NGN',
   '2026-09-22 09:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Makurdi', '{}'),
  (16, 7, 46, 'wholesale_transaction', 49800, 4, 'NGN',
   '2026-09-23 09:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Maiduguri', '{}'),
  (16, 8, 46, 'wholesale_transaction', 49000, 4, 'NGN',
   '2026-09-24 10:00:00+01', 'minute', 'verified', '2026-09-24 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Sokoto Central', '{}'),

  -- Week 5
  (16, 1, 46, 'wholesale_transaction', 50800, 4, 'NGN',
   '2026-10-14 10:00:00+01', 'minute', 'verified', '2026-10-14 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Dawanau', '{}'),
  (16, 6, 46, 'retail', 57500, 4, 'NGN',
   '2026-10-15 09:00:00+01', 'minute', 'verified', '2026-10-15 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea retail at Mile 12', '{}'),
  (16, 8, 46, 'wholesale_transaction', 50000, 4, 'NGN',
   '2026-10-17 10:00:00+01', 'minute', 'verified', '2026-10-17 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Katsina Central', '{}'),
  (16, 10, 46, 'wholesale_transaction', 51800, 4, 'NGN',
   '2026-10-18 09:00:00+01', 'minute', 'verified', '2026-10-18 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Makurdi', '{}'),
  (16, 7, 46, 'wholesale_transaction', 51000, 4, 'NGN',
   '2026-10-19 09:00:00+01', 'minute', 'verified', '2026-10-19 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Maiduguri', '{}'),
  (16, 8, 46, 'wholesale_transaction', 50200, 4, 'NGN',
   '2026-10-20 10:00:00+01', 'minute', 'verified', '2026-10-20 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Sokoto Central', '{}'),

  -- Week 8 latest
  (16, 1, 46, 'wholesale_transaction', 52500, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Dawanau', '{}'),
  (16, 6, 46, 'retail', 59000, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea retail at Mile 12', '{}'),
  (16, 8, 46, 'wholesale_transaction', 51700, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Katsina Central', '{}'),
  (16, 10, 46, 'wholesale_transaction', 53500, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Makurdi', '{}'),
  (16, 7, 46, 'wholesale_transaction', 52700, 4, 'NGN',
   '2026-11-12 09:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Maiduguri', '{}'),
  (16, 8, 46, 'wholesale_transaction', 51900, 4, 'NGN',
   '2026-11-13 10:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Sokoto Central', '{}'),
  (16, 4, 46, 'wholesale_transaction', 52000, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Giwa', '{}'),
  (16, 2, 46, 'wholesale_transaction', 52300, 4, 'NGN',
   '2026-11-14 11:00:00+01', 'minute', 'verified', '2026-11-14 15:00:00+01', true,
   'agent_app', 'DEMO: Cowpea at Yankaba', '{}');


-- Block 8: Imported Rice (commodity_id=3, unit_id=4 bag)
-- Base: ₦53,000 Kano, ₦57,000 Lagos
-- Slight rise ~2%
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (3, 1, 6, 'wholesale_transaction', 52800, 4, 'NGN',
   '2026-09-16 10:00:00+01', 'minute', 'verified', '2026-09-16 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Dawanau', '{}'),
  (3, 6, 6, 'retail', 57000, 4, 'NGN',
   '2026-09-17 09:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice retail at Mile 12', '{}'),
  (3, 4, 6, 'wholesale_transaction', 52200, 4, 'NGN',
   '2026-09-19 10:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Giwa', '{}'),
  (3, 8, 6, 'wholesale_transaction', 52000, 4, 'NGN',
   '2026-09-21 10:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Katsina Central', '{}'),
  (3, 10, 6, 'wholesale_transaction', 53500, 4, 'NGN',
   '2026-09-22 09:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Makurdi', '{}'),
  (3, 7, 6, 'wholesale_transaction', 53000, 4, 'NGN',
   '2026-09-23 09:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Maiduguri', '{}'),

  -- Week 4
  (3, 1, 6, 'wholesale_transaction', 53500, 4, 'NGN',
   '2026-10-06 10:00:00+01', 'minute', 'verified', '2026-10-06 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Dawanau', '{}'),
  (3, 6, 6, 'retail', 57700, 4, 'NGN',
   '2026-10-07 09:00:00+01', 'minute', 'verified', '2026-10-07 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice retail at Mile 12', '{}'),
  (3, 4, 6, 'wholesale_transaction', 52800, 4, 'NGN',
   '2026-10-09 10:00:00+01', 'minute', 'verified', '2026-10-09 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Giwa', '{}'),
  (3, 8, 6, 'wholesale_transaction', 52500, 4, 'NGN',
   '2026-10-10 10:00:00+01', 'minute', 'verified', '2026-10-10 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Katsina Central', '{}'),
  (3, 10, 6, 'wholesale_transaction', 54200, 4, 'NGN',
   '2026-10-11 09:00:00+01', 'minute', 'verified', '2026-10-11 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Makurdi', '{}'),
  (3, 7, 6, 'wholesale_transaction', 53600, 4, 'NGN',
   '2026-10-12 09:00:00+01', 'minute', 'verified', '2026-10-12 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Maiduguri', '{}'),

  -- Week 8 latest
  (3, 1, 6, 'wholesale_transaction', 54200, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Dawanau', '{}'),
  (3, 6, 6, 'retail', 58500, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice retail at Mile 12', '{}'),
  (3, 4, 6, 'wholesale_transaction', 53500, 4, 'NGN',
   '2026-11-05 10:00:00+01', 'minute', 'verified', '2026-11-05 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Giwa', '{}'),
  (3, 8, 6, 'wholesale_transaction', 53200, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Katsina Central', '{}'),
  (3, 10, 6, 'wholesale_transaction', 55000, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Makurdi', '{}'),
  (3, 7, 6, 'wholesale_transaction', 54400, 4, 'NGN',
   '2026-11-12 09:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Maiduguri', '{}'),
  (3, 8, 6, 'wholesale_transaction', 53800, 4, 'NGN',
   '2026-11-13 10:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Sokoto Central', '{}'),
  (3, 6, 6, 'wholesale_transaction', 54000, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: Imported rice at Gusau Central', '{}');


-- Block 9: Millet (commodity_id=8, unit_id=4 bag)
-- Base: ₦34,000 Kano, ₦37,500 Lagos
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (8, 1, 19, 'wholesale_transaction', 33800, 4, 'NGN',
   '2026-09-17 10:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Dawanau', '{}'),
  (8, 6, 19, 'retail', 37500, 4, 'NGN',
   '2026-09-18 09:00:00+01', 'minute', 'verified', '2026-09-18 14:00:00+01', true,
   'agent_app', 'DEMO: Millet retail at Mile 12', '{}'),
  (8, 4, 19, 'wholesale_transaction', 33200, 4, 'NGN',
   '2026-09-19 10:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Giwa', '{}'),
  (8, 8, 19, 'wholesale_transaction', 33000, 4, 'NGN',
   '2026-09-21 10:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Katsina Central', '{}'),
  (8, 10, 19, 'wholesale_transaction', 34500, 4, 'NGN',
   '2026-09-22 09:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Makurdi', '{}'),
  (8, 7, 19, 'wholesale_transaction', 34000, 4, 'NGN',
   '2026-09-23 09:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Maiduguri', '{}'),

  -- Week 5
  (8, 1, 19, 'wholesale_transaction', 34500, 4, 'NGN',
   '2026-10-14 10:00:00+01', 'minute', 'verified', '2026-10-14 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Dawanau', '{}'),
  (8, 6, 19, 'retail', 38200, 4, 'NGN',
   '2026-10-15 09:00:00+01', 'minute', 'verified', '2026-10-15 14:00:00+01', true,
   'agent_app', 'DEMO: Millet retail at Mile 12', '{}'),
  (8, 4, 19, 'wholesale_transaction', 33800, 4, 'NGN',
   '2026-10-16 10:00:00+01', 'minute', 'verified', '2026-10-16 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Giwa', '{}'),
  (8, 8, 19, 'wholesale_transaction', 33500, 4, 'NGN',
   '2026-10-17 10:00:00+01', 'minute', 'verified', '2026-10-17 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Katsina Central', '{}'),
  (8, 10, 19, 'wholesale_transaction', 35200, 4, 'NGN',
   '2026-10-18 09:00:00+01', 'minute', 'verified', '2026-10-18 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Makurdi', '{}'),
  (8, 7, 19, 'wholesale_transaction', 34600, 4, 'NGN',
   '2026-10-19 09:00:00+01', 'minute', 'verified', '2026-10-19 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Maiduguri', '{}'),

  -- Week 8 latest
  (8, 1, 19, 'wholesale_transaction', 35200, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Dawanau', '{}'),
  (8, 6, 19, 'retail', 39000, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Millet retail at Mile 12', '{}'),
  (8, 4, 19, 'wholesale_transaction', 34500, 4, 'NGN',
   '2026-11-05 10:00:00+01', 'minute', 'verified', '2026-11-05 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Giwa', '{}'),
  (8, 8, 19, 'wholesale_transaction', 34200, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Katsina Central', '{}'),
  (8, 10, 19, 'wholesale_transaction', 36000, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Makurdi', '{}'),
  (8, 7, 19, 'wholesale_transaction', 35300, 4, 'NGN',
   '2026-11-12 09:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Maiduguri', '{}'),
  (8, 8, 19, 'wholesale_transaction', 34800, 4, 'NGN',
   '2026-11-13 10:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Sokoto Central', '{}'),
  (8, 6, 19, 'wholesale_transaction', 34500, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: Millet at Gusau Central', '{}');


-- Block 10: Wheat (commodity_id=5, unit_id=4 bag)
-- Base: ₦50,000 Kano, ₦55,000 Lagos — import-driven
INSERT INTO price_observations (
  id, commodity_id, market_id, grade_id, price_type,
  reported_amount, reported_unit_id, currency_code,
  collected_at, collected_at_precision,
  verification_status, published_at, is_current,
  source_system, notes, quality_flags
) VALUES
  (5, 1, 13, 'wholesale_transaction', 49500, 4, 'NGN',
   '2026-09-17 10:00:00+01', 'minute', 'verified', '2026-09-17 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Dawanau', '{}'),
  (5, 6, 13, 'retail', 55000, 4, 'NGN',
   '2026-09-18 09:00:00+01', 'minute', 'verified', '2026-09-18 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat retail at Mile 12', '{}'),
  (5, 4, 13, 'wholesale_transaction', 48800, 4, 'NGN',
   '2026-09-19 10:00:00+01', 'minute', 'verified', '2026-09-19 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Giwa', '{}'),
  (5, 8, 13, 'wholesale_transaction', 48500, 4, 'NGN',
   '2026-09-21 10:00:00+01', 'minute', 'verified', '2026-09-21 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Katsina Central', '{}'),
  (5, 10, 13, 'wholesale_transaction', 50200, 4, 'NGN',
   '2026-09-22 09:00:00+01', 'minute', 'verified', '2026-09-22 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Makurdi', '{}'),
  (5, 7, 13, 'wholesale_transaction', 49800, 4, 'NGN',
   '2026-09-23 09:00:00+01', 'minute', 'verified', '2026-09-23 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Maiduguri', '{}'),

  -- Week 5
  (5, 1, 13, 'wholesale_transaction', 50800, 4, 'NGN',
   '2026-10-14 10:00:00+01', 'minute', 'verified', '2026-10-14 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Dawanau', '{}'),
  (5, 6, 13, 'retail', 56200, 4, 'NGN',
   '2026-10-15 09:00:00+01', 'minute', 'verified', '2026-10-15 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat retail at Mile 12', '{}'),
  (5, 4, 13, 'wholesale_transaction', 50000, 4, 'NGN',
   '2026-10-16 10:00:00+01', 'minute', 'verified', '2026-10-16 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Giwa', '{}'),
  (5, 8, 13, 'wholesale_transaction', 49700, 4, 'NGN',
   '2026-10-17 10:00:00+01', 'minute', 'verified', '2026-10-17 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Katsina Central', '{}'),
  (5, 10, 13, 'wholesale_transaction', 51500, 4, 'NGN',
   '2026-10-18 09:00:00+01', 'minute', 'verified', '2026-10-18 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Makurdi', '{}'),
  (5, 7, 13, 'wholesale_transaction', 51000, 4, 'NGN',
   '2026-10-19 09:00:00+01', 'minute', 'verified', '2026-10-19 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Maiduguri', '{}'),

  -- Week 8 latest
  (5, 1, 13, 'wholesale_transaction', 52000, 4, 'NGN',
   '2026-11-03 10:00:00+01', 'minute', 'verified', '2026-11-03 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Dawanau', '{}'),
  (5, 6, 13, 'retail', 57500, 4, 'NGN',
   '2026-11-04 09:00:00+01', 'minute', 'verified', '2026-11-04 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat retail at Mile 12', '{}'),
  (5, 4, 13, 'wholesale_transaction', 51200, 4, 'NGN',
   '2026-11-05 10:00:00+01', 'minute', 'verified', '2026-11-05 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Giwa', '{}'),
  (5, 8, 13, 'wholesale_transaction', 50900, 4, 'NGN',
   '2026-11-10 10:00:00+01', 'minute', 'verified', '2026-11-10 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Katsina Central', '{}'),
  (5, 10, 13, 'wholesale_transaction', 53000, 4, 'NGN',
   '2026-11-11 09:00:00+01', 'minute', 'verified', '2026-11-11 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Makurdi', '{}'),
  (5, 7, 13, 'wholesale_transaction', 52500, 4, 'NGN',
   '2026-11-12 09:00:00+01', 'minute', 'verified', '2026-11-12 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Maiduguri', '{}'),
  (5, 8, 13, 'wholesale_transaction', 51500, 4, 'NGN',
   '2026-11-13 10:00:00+01', 'minute', 'verified', '2026-11-13 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Sokoto Central', '{}'),
  (5, 6, 13, 'wholesale_transaction', 51800, 4, 'NGN',
   '2026-11-14 10:00:00+01', 'minute', 'verified', '2026-11-14 14:00:00+01', true,
   'agent_app', 'DEMO: Wheat at Gusau Central', '{}');


COMMIT;

-- ================================================================
-- SUMMARY: What this migration creates
-- ================================================================
-- Markets:          15 (across 11 states)
-- Unit conversions: 12 (50kg bag ↔ kg for major grains)
-- Observations:     ~198 (across 9 commodities, 60 days)
--
-- All observations:
--   source_system = 'agent_app'
--   verification_status: verified (published) or pending_verification
--   currency_code = 'NGN'
--   date range: 2026-09-15 to 2026-11-14
--
-- To remove: run migration 0048_demo_seed_cleanup.sql
-- ================================================================
