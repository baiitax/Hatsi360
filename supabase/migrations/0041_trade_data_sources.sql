-- Migration 0041: Trade Data Source Configuration
-- Phase 07 Stage 3: International Trade Data Engine
--
-- Tracks configuration and sync status for trade data sources (FAOSTAT Trade,
-- ITC Trade Map, UN Comtrade, WTO I-TIP). Extends evidence_sources with
-- trade-specific configuration.

-- Trade data source configuration
CREATE TABLE trade_data_sources (
  id SERIAL PRIMARY KEY,
  
  -- Link to evidence source
  evidence_source_id INTEGER NOT NULL REFERENCES evidence_sources(id) ON DELETE CASCADE,
  
  -- Source type
  source_type VARCHAR(50) NOT NULL,  -- 'faostat_trade', 'itc_trade_map', 'un_comtrade', 'wto_itip', 'manual'
  
  -- API configuration
  api_base_url TEXT,
  api_key_encrypted TEXT,  -- For sources requiring API keys
  api_rate_limit INTEGER DEFAULT 60,  -- Requests per minute
  
  -- Data scope
  supported_flow_types TEXT[] DEFAULT '{import,export}',  -- Which flows this source provides
  min_year INTEGER,
  max_year INTEGER,
  supported_countries TEXT[],  -- ISO alpha3 codes (NULL = all countries)
  
  -- Sync configuration
  auto_sync BOOLEAN DEFAULT FALSE,
  sync_frequency_hours INTEGER DEFAULT 168,  -- Default: weekly
  last_sync_at TIMESTAMPTZ,
  last_sync_status VARCHAR(20),  -- 'success', 'partial', 'failed'
  last_sync_records INTEGER DEFAULT 0,
  last_sync_error TEXT,
  
  -- Flags
  is_active BOOLEAN DEFAULT TRUE,
  requires_manual_validation BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(evidence_source_id)
);

-- Trade data sync log (detailed tracking of each sync operation)
CREATE TABLE trade_data_sync_log (
  id SERIAL PRIMARY KEY,
  
  trade_data_source_id INTEGER NOT NULL REFERENCES trade_data_sources(id) ON DELETE CASCADE,
  
  -- Sync operation
  sync_type VARCHAR(20) NOT NULL,  -- 'full', 'incremental', 'retry'
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'running',  -- 'running', 'success', 'partial', 'failed'
  
  -- Scope
  year_from INTEGER,
  year_to INTEGER,
  reporting_country_codes TEXT[],
  
  -- Results
  records_fetched INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped_duplicate INTEGER DEFAULT 0,
  records_rejected_invalid INTEGER DEFAULT 0,
  
  -- Errors
  error_message TEXT,
  error_details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_trade_data_source_type ON trade_data_sources(source_type);
CREATE INDEX idx_trade_data_source_active ON trade_data_sources(is_active);
CREATE INDEX idx_trade_sync_log_source ON trade_data_sync_log(trade_data_source_id);
CREATE INDEX idx_trade_sync_log_status ON trade_data_sync_log(status);
CREATE INDEX idx_trade_sync_log_started ON trade_data_sync_log(started_at);

-- Enable RLS
ALTER TABLE trade_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_data_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Trade data sources are viewable by everyone"
ON trade_data_sources FOR SELECT
USING (true);

CREATE POLICY "Trade data sources are manageable by authenticated users"
ON trade_data_sources FOR ALL
USING (auth.role() = 'authenticated');

CREATE POLICY "Trade sync log is viewable by everyone"
ON trade_data_sync_log FOR SELECT
USING (true);

CREATE POLICY "Trade sync log is insertable by authenticated users"
ON trade_data_sync_log FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Trade sync log is updatable by authenticated users"
ON trade_data_sync_log FOR UPDATE
USING (auth.role() = 'authenticated');

-- Seed initial trade data sources from existing evidence_sources
INSERT INTO trade_data_sources (evidence_source_id, source_type, api_base_url, supported_flow_types, is_active)
SELECT
  es.id,
  CASE es.code
    WHEN 'FAOSTAT' THEN 'faostat_trade'
    WHEN 'ITC_TRADE_MAP' THEN 'itc_trade_map'
    WHEN 'WTO' THEN 'wto_itip'
    ELSE 'manual'
  END,
  CASE es.code
    WHEN 'FAOSTAT' THEN 'https://fenixservices.fao.org/faostat/api/v1/en/data/T'
    WHEN 'ITC_TRADE_MAP' THEN 'https://www.trademap.org'
    WHEN 'WTO' THEN 'https://i-tip.wto.org'
    ELSE NULL
  END,
  '{import,export}',
  es.is_active
FROM evidence_sources es
WHERE es.code IN ('FAOSTAT', 'ITC_TRADE_MAP', 'WTO')
ON CONFLICT (evidence_source_id) DO NOTHING;

-- Comments
COMMENT ON TABLE trade_data_sources IS
'Configuration for trade data sources. Links evidence_sources to trade-specific API configuration, sync settings, and data scope.';

COMMENT ON TABLE trade_data_sync_log IS
'Detailed log of each trade data sync operation. Tracks records fetched, inserted, updated, skipped, and rejected.';
