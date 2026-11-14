-- Migration 0037: Trade Blocs and Memberships
-- Phase 07 Stage 2: Add trade agreement and economic community data

-- Create trade_blocs table
CREATE TABLE IF NOT EXISTS trade_blocs (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  bloc_type VARCHAR(50), -- 'free_trade_area', 'customs_union', 'common_market', 'economic_union'
  established_date DATE,
  website TEXT,
  headquarters_country_code CHAR(3) REFERENCES countries(code),
  member_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create trade_bloc_memberships table
CREATE TABLE IF NOT EXISTS trade_bloc_memberships (
  id SERIAL PRIMARY KEY,
  trade_bloc_id INTEGER NOT NULL REFERENCES trade_blocs(id) ON DELETE CASCADE,
  country_id INTEGER NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  membership_type VARCHAR(50) DEFAULT 'full', -- 'full', 'associate', 'observer'
  join_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'suspended', 'withdrawn'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_bloc_id, country_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trade_blocs_code ON trade_blocs(code);
CREATE INDEX IF NOT EXISTS idx_trade_blocs_type ON trade_blocs(bloc_type);
CREATE INDEX IF NOT EXISTS idx_trade_bloc_memberships_bloc ON trade_bloc_memberships(trade_bloc_id);
CREATE INDEX IF NOT EXISTS idx_trade_bloc_memberships_country ON trade_bloc_memberships(country_id);
CREATE INDEX IF NOT EXISTS idx_trade_bloc_memberships_status ON trade_bloc_memberships(status);

-- Insert major trade blocs
INSERT INTO trade_blocs (code, name, description, bloc_type, established_date, website, member_count) VALUES
('AfCFTA', 'African Continental Free Trade Area', 'Free trade area spanning all African Union member states, aiming to create a single market for goods and services', 'free_trade_area', '2021-01-01', 'https://afcfta.org', 54),
('ECOWAS', 'Economic Community of West African States', 'Regional economic union of 15 West African countries', 'economic_union', '1975-05-28', 'https://ecowas.int', 15),
('SADC', 'Southern African Development Community', 'Intergovernmental organization of 16 Southern African states', 'economic_union', '1992-08-17', 'https://sadc.int', 16),
('EAC', 'East African Community', 'Intergovernmental organization of 7 East African states', 'economic_union', '2000-07-07', 'https://eac.int', 7),
('ECCAS', 'Economic Community of Central African States', 'Economic community of 11 Central African states', 'economic_union', '1983-10-18', 'https://ceeac-eccas.org', 11),
('AMU', 'Arab Maghreb Union', 'Economic and political union of 5 North African countries', 'economic_union', '1989-02-17', NULL, 5),
('COMESA', 'Common Market for Eastern and Southern Africa', 'Free trade area with 21 member states', 'common_market', '1994-12-08', 'https://comesa.int', 21),
('CEN-SAD', 'Community of Sahel-Saharan States', 'Economic community of 20+ African states', 'economic_union', '1998-02-04', NULL, 29),
('EU', 'European Union', 'Political and economic union of 27 European member states', 'economic_union', '1993-11-01', 'https://europa.eu', 27),
('EEA', 'European Economic Area', 'Extends EU single market to EFTA countries', 'common_market', '1994-01-01', NULL, 30),
('EFTA', 'European Free Trade Association', 'Inter-governmental organisation for free trade of 4 European states', 'free_trade_area', '1960-05-03', 'https://efta.int', 4),
('NAFTA', 'North American Free Trade Agreement', 'Trilateral trade bloc in North America (replaced by USMCA)', 'free_trade_area', '1994-01-01', NULL, 3),
('USMCA', 'United States-Mexico-Canada Agreement', 'Mutually beneficial trade agreement between the US, Mexico, and Canada', 'free_trade_area', '2020-07-01', NULL, 3),
('MERCOSUR', 'Southern Common Market', 'South American economic and political bloc', 'customs_union', '1991-03-26', 'https://mercosur.int', 5),
('CAN', 'Andean Community', 'South American trade bloc', 'customs_union', '1969-05-26', NULL, 4),
('ASEAN', 'Association of Southeast Asian Nations', 'Economic union of 10 Southeast Asian countries', 'economic_union', '1967-08-08', 'https://asean.org', 10),
('RCEP', 'Regional Comprehensive Economic Partnership', 'Free trade agreement among 15 Asia-Pacific countries', 'free_trade_area', '2022-01-01', NULL, 15),
('CPTPP', 'Comprehensive and Progressive Agreement for Trans-Pacific Partnership', 'Trade agreement among 11 Pacific Rim countries', 'free_trade_area', '2018-12-30', NULL, 11),
('GCC', 'Gulf Cooperation Council', 'Political and economic union of 6 Middle Eastern countries', 'economic_union', '1981-05-25', 'https://www.gcc-sg.org', 6),
('SAARC', 'South Asian Association for Regional Cooperation', 'Economic and geopolitical union of 8 South Asian countries', 'economic_union', '1985-12-08', 'https://saarc-sec.org', 8);

-- Insert AfCFTA members (all African countries)
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
SELECT 
  (SELECT id FROM trade_blocs WHERE code = 'AfCFTA'),
  id,
  'full',
  '2021-01-01',
  'active'
FROM countries
WHERE is_african = TRUE
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert ECOWAS members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
SELECT 
  (SELECT id FROM trade_blocs WHERE code = 'ECOWAS'),
  id,
  'full',
  '1975-05-28',
  'active'
FROM countries
WHERE is_ecowas_member = TRUE
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert SADC members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
VALUES
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'ZA'), 'full', '1994-01-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'BW'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'AO'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'CD'), 'full', '1997-01-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'SZ'), 'full', '1990-01-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'LS'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'MG'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'MW'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'MU'), 'full', '1995-01-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'MZ'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'NA'), 'full', '1990-03-21', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'SC'), 'full', '2008-01-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'TZ'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'ZM'), 'full', '1980-04-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'SADC'), (SELECT id FROM countries WHERE code = 'ZW'), 'full', '1980-04-01', 'active')
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert EAC members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
VALUES
((SELECT id FROM trade_blocs WHERE code = 'EAC'), (SELECT id FROM countries WHERE code = 'KE'), 'full', '2000-07-07', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'EAC'), (SELECT id FROM countries WHERE code = 'TZ'), 'full', '2000-07-07', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'EAC'), (SELECT id FROM countries WHERE code = 'UG'), 'full', '2000-07-07', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'EAC'), (SELECT id FROM countries WHERE code = 'RW'), 'full', '2007-07-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'EAC'), (SELECT id FROM countries WHERE code = 'BI'), 'full', '2007-07-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'EAC'), (SELECT id FROM countries WHERE code = 'SS'), 'full', '2016-04-15', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'EAC'), (SELECT id FROM countries WHERE code = 'CD'), 'full', '2022-03-01', 'active')
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert EU members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
SELECT 
  (SELECT id FROM trade_blocs WHERE code = 'EU'),
  id,
  'full',
  '1993-11-01',
  'active'
FROM countries
WHERE continent = 'Europe' AND code IN ('AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE')
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert MERCOSUR members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
VALUES
((SELECT id FROM trade_blocs WHERE code = 'MERCOSUR'), (SELECT id FROM countries WHERE code = 'AR'), 'full', '1991-03-26', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'MERCOSUR'), (SELECT id FROM countries WHERE code = 'BR'), 'full', '1991-03-26', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'MERCOSUR'), (SELECT id FROM countries WHERE code = 'PY'), 'full', '1991-03-26', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'MERCOSUR'), (SELECT id FROM countries WHERE code = 'UY'), 'full', '1991-03-26', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'MERCOSUR'), (SELECT id FROM countries WHERE code = 'BO'), 'full', '2015-12-07', 'active')
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert ASEAN members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
SELECT 
  (SELECT id FROM trade_blocs WHERE code = 'ASEAN'),
  id,
  'full',
  '1967-08-08',
  'active'
FROM countries
WHERE code IN ('BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'VN')
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert GCC members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
SELECT 
  (SELECT id FROM trade_blocs WHERE code = 'GCC'),
  id,
  'full',
  '1981-05-25',
  'active'
FROM countries
WHERE code IN ('BH', 'KW', 'OM', 'QA', 'SA', 'AE')
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Insert USMCA members
INSERT INTO trade_bloc_memberships (trade_bloc_id, country_id, membership_type, join_date, status)
VALUES
((SELECT id FROM trade_blocs WHERE code = 'USMCA'), (SELECT id FROM countries WHERE code = 'US'), 'full', '2020-07-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'USMCA'), (SELECT id FROM countries WHERE code = 'CA'), 'full', '2020-07-01', 'active'),
((SELECT id FROM trade_blocs WHERE code = 'USMCA'), (SELECT id FROM countries WHERE code = 'MX'), 'full', '2020-07-01', 'active')
ON CONFLICT (trade_bloc_id, country_id) DO NOTHING;

-- Update member counts
UPDATE trade_blocs 
SET member_count = (
  SELECT COUNT(*) 
  FROM trade_bloc_memberships 
  WHERE trade_bloc_id = trade_blocs.id 
  AND status = 'active'
);

-- Enable RLS
ALTER TABLE trade_blocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_bloc_memberships ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Trade blocs are viewable by everyone"
ON trade_blocs FOR SELECT
USING (true);

CREATE POLICY "Trade bloc memberships are viewable by everyone"
ON trade_bloc_memberships FOR SELECT
USING (true);

-- Add documentation comments
COMMENT ON TABLE trade_blocs IS 'Trade agreements and economic communities. Supports Phase 07 Global Trade Intelligence by tracking preferential trade arrangements.';
COMMENT ON TABLE trade_bloc_memberships IS 'Country memberships in trade blocs, including join dates and membership status.';
