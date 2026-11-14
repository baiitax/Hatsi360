-- Migration 0039: International Trade Records
-- Phase 07 Stage 3: International Trade Data Engine
-- 
-- Stores bilateral trade flows (imports/exports) between countries for specific
-- commodities/HS codes. Supports historical trade data from sources like FAOSTAT,
-- ITC Trade Map, and UN Comtrade.

CREATE TABLE international_trade_records (
  id SERIAL PRIMARY KEY,
  
  -- Trade flow
  reporting_country_id INTEGER REFERENCES countries(id),
  partner_country_id INTEGER REFERENCES countries(id),
  flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('import', 'export')),
  
  -- Commodity classification
  commodity_id INTEGER REFERENCES commodities(id),
  hs_code_id INTEGER REFERENCES hs_codes(id),
  
  -- Reporting period
  year INTEGER NOT NULL,
  month INTEGER,  -- NULL for annual data
  period_type VARCHAR(20) DEFAULT 'annual',  -- 'annual', 'quarterly', 'monthly'
  
  -- Trade values
  trade_value_usd DECIMAL(18,2),
  trade_value_local DECIMAL(18,2),
  local_currency_code CHAR(3),
  
  -- Trade quantities
  quantity_kg DECIMAL(18,2),
  quantity_units DECIMAL(18,2),
  quantity_unit_description TEXT,
  
  -- Net weight (if different from quantity)
  net_weight_kg DECIMAL(18,2),
  gross_weight_kg DECIMAL(18,2),
  
  -- Valuation
  valuation_method VARCHAR(50),  -- 'fob', 'cif', 'other'
  
  -- Data quality
  is_provisional BOOLEAN DEFAULT FALSE,
  is_revised BOOLEAN DEFAULT FALSE,
  revision_count INTEGER DEFAULT 0,
  
  -- Source tracking
  source_id INTEGER REFERENCES evidence_sources(id),
  source_dataset TEXT,
  source_record_id TEXT,
  source_url TEXT,
  
  -- Provenance
  retrieval_date TIMESTAMPTZ,
  publication_date TIMESTAMPTZ,
  last_updated TIMESTAMPTZ,
  
  -- Validation
  validation_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'validated', 'flagged', 'rejected'
  validation_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_trade_reporting_country ON international_trade_records(reporting_country_id);
CREATE INDEX idx_trade_partner_country ON international_trade_records(partner_country_id);
CREATE INDEX idx_trade_commodity ON international_trade_records(commodity_id);
CREATE INDEX idx_trade_hs_code ON international_trade_records(hs_code_id);
CREATE INDEX idx_trade_year ON international_trade_records(year);
CREATE INDEX idx_trade_flow_type ON international_trade_records(flow_type);
CREATE INDEX idx_trade_period ON international_trade_records(reporting_country_id, partner_country_id, commodity_id, year);

-- Composite index for trade flow queries
CREATE INDEX idx_trade_flow_lookup ON international_trade_records(
  reporting_country_id,
  partner_country_id,
  flow_type,
  year
);

-- Index for source tracking
CREATE INDEX idx_trade_source ON international_trade_records(source_id);

-- Index for validation status
CREATE INDEX idx_trade_validation ON international_trade_records(validation_status);

-- Enable RLS
ALTER TABLE international_trade_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Trade records are viewable by everyone"
ON international_trade_records FOR SELECT
USING (true);

CREATE POLICY "Trade records are insertable by authenticated users"
ON international_trade_records FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Trade records are updatable by authenticated users"
ON international_trade_records FOR UPDATE
USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE international_trade_records IS
'Bilateral trade flows (imports/exports) between countries for specific commodities/HS codes. Stores historical trade data from sources like FAOSTAT, ITC Trade Map, and UN Comtrade.';

COMMENT ON COLUMN international_trade_records.reporting_country_id IS
'Country reporting the trade data (exporter for exports, importer for imports)';

COMMENT ON COLUMN international_trade_records.partner_country_id IS
'Partner country in the trade flow (importer for exports, exporter for imports)';

COMMENT ON COLUMN international_trade_records.flow_type IS
'Trade flow direction: import or export from the perspective of reporting_country';

COMMENT ON COLUMN international_trade_records.trade_value_usd IS
'Trade value in USD. For exports, this is typically FOB. For imports, this is typically CIF.';

COMMENT ON COLUMN international_trade_records.valuation_method IS
'Valuation method: fob (free on board), cif (cost, insurance, freight), or other';
