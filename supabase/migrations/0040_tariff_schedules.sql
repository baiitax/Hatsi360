-- Migration 0040: Tariff Schedules
-- Phase 07 Stage 3: International Trade Data Engine
--
-- Stores tariff rates (MFN, bound, preferential, applied) by country and HS code.
-- Sources: WTO I-TIP, MAcMAP, ITC Trade Map, national customs authorities.

-- Create tariff_type enum
DO $$ BEGIN
  CREATE TYPE tariff_type_enum AS ENUM ('mfn', 'bound', 'preferential', 'applied');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create rate_type enum
DO $$ BEGIN
  CREATE TYPE tariff_rate_type_enum AS ENUM ('ad_valorem', 'specific', 'compound', 'tariff_rate_quota');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE tariff_schedules (
  id SERIAL PRIMARY KEY,
  
  -- Classification
  country_id INTEGER NOT NULL REFERENCES countries(id),
  hs_code_id INTEGER NOT NULL REFERENCES hs_codes(id),
  
  -- Tariff details
  tariff_type tariff_type_enum NOT NULL,  -- 'mfn', 'bound', 'preferential', 'applied'
  rate_type tariff_rate_type_enum NOT NULL,  -- 'ad_valorem', 'specific', 'compound', 'tariff_rate_quota'
  rate_value DECIMAL(10,4),  -- Percentage or specific rate
  rate_unit VARCHAR(20),  -- '%', 'USD/kg', 'EUR/tonne', etc.
  
  -- For tariff rate quotas
  quota_quantity DECIMAL(18,2),  -- In-quota quantity limit
  quota_unit VARCHAR(20),  -- kg, tonnes, units, etc.
  over_quota_rate DECIMAL(10,4),  -- Rate applied above quota
  
  -- Temporal
  effective_date DATE,
  expiry_date DATE,
  is_current BOOLEAN DEFAULT TRUE,
  
  -- Trade agreement (for preferential rates)
  trade_bloc_id INTEGER REFERENCES trade_blocs(id),
  
  -- Source tracking
  source_id INTEGER REFERENCES evidence_sources(id),
  source_dataset TEXT,
  source_url TEXT,
  
  -- Provenance
  retrieval_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tariff_country ON tariff_schedules(country_id);
CREATE INDEX idx_tariff_hs_code ON tariff_schedules(hs_code_id);
CREATE INDEX idx_tariff_type ON tariff_schedules(tariff_type);
CREATE INDEX idx_tariff_current ON tariff_schedules(is_current);
CREATE INDEX idx_tariff_country_hs ON tariff_schedules(country_id, hs_code_id);
CREATE INDEX idx_tariff_lookup ON tariff_schedules(
  country_id,
  hs_code_id,
  tariff_type,
  is_current
);
CREATE INDEX idx_tariff_bloc ON tariff_schedules(trade_bloc_id);

-- Enable RLS
ALTER TABLE tariff_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tariff schedules are viewable by everyone"
ON tariff_schedules FOR SELECT
USING (true);

CREATE POLICY "Tariff schedules are insertable by authenticated users"
ON tariff_schedules FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tariff schedules are updatable by authenticated users"
ON tariff_schedules FOR UPDATE
USING (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE tariff_schedules IS
'Tariff rates by country and HS code. Stores MFN, bound, preferential, and applied tariff rates from sources like WTO I-TIP, MAcMAP, and ITC Trade Map.';

COMMENT ON COLUMN tariff_schedules.tariff_type IS
'mfn: Most-Favored-Nation (WTO baseline); bound: maximum bound rate commitment; preferential: FTA/preferential rate; applied: actually applied rate';

COMMENT ON COLUMN tariff_schedules.rate_type IS
'ad_valorem: percentage of value; specific: fixed amount per unit; compound: combination; tariff_rate_quota: different rates for in-quota vs over-quota';

COMMENT ON COLUMN tariff_schedules.trade_bloc_id IS
'Trade bloc this preferential rate applies to (NULL for non-preferential rates)';
