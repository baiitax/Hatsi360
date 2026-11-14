# Phase 07 — Global Trade Intelligence Implementation Plan

**Phase:** 07 — Global Trade Intelligence  
**Date:** 2026-01-XX  
**Status:** Stage 1 Complete (Audit Phase)

---

## Executive Summary

Phase 07 will transform Hatsi360 into an African-to-global agricultural trade intelligence platform. This document outlines the 12-stage implementation plan, estimated timeline of 12 months, and resource requirements.

**Key Decisions Made:**
- ✅ Start with free data sources (ITC Trade Map, WITS, FAOSTAT, WTO)
- ⏳ Evaluate UN Comtrade subscription based on budget
- ✅ Build HS classification system from scratch
- ✅ Extend Phase 06 commodity intelligence for international trade
- ⏳ Integrate with Phases 04/05 when they are implemented

---

## Implementation Stages

### Stage 1 — Audit and Architecture ✅ COMPLETE

**Duration:** 1 week  
**Status:** ✅ Complete

**Deliverables:**
- ✅ PHASE-07-BASELINE-AUDIT.md
- ✅ PHASE-07-DEPENDENCY-MAP.md
- ✅ PHASE-07-DATA-SOURCE-REGISTER.md
- ✅ PHASE-07-IMPLEMENTATION-PLAN.md (this document)

**Outcomes:**
- Comprehensive audit of Phases 00-06
- Database schema assessment
- Data source evaluation
- Dependency mapping
- Risk assessment
- Implementation roadmap

---

### Stage 2 — Geographic and Classification Foundation

**Duration:** 4 weeks (Weeks 1-4)  
**Priority:** **CRITICAL**

**Objective:** Build the geographic and classification foundation required for all trade intelligence features.

**Deliverables:**

#### 2.1 Geographic Data Expansion (Week 1-2)

**Database Migration: `0036_geographic_expansion.sql`**

```sql
-- Expand countries table
ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso_alpha2 CHAR(2);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso_alpha3 CHAR(3);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS iso_numeric CHAR(3);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS subregion TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS continent TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency_code CHAR(3);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS currency_name TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS calling_code TEXT;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_african BOOLEAN DEFAULT FALSE;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_afcfta_member BOOLEAN DEFAULT FALSE;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS is_ecowas_member BOOLEAN DEFAULT FALSE;

-- Import 200+ countries from World Bank/ISO data
```

**Seed Data:**
- Import 200+ countries with ISO codes
- Populate regions, subregions, continents
- Add currency codes and names
- Add geographic coordinates
- Mark African countries and trade bloc members

**API Endpoints:**
- `GET /api/v1/countries` — List all countries
- `GET /api/v1/countries/:id` — Get country details
- `GET /api/v1/countries/african` — List African countries
- `GET /api/v1/countries/by-region/:region` — Filter by region

**Tests:**
- Country data validation tests
- ISO code uniqueness tests
- Geographic query tests

#### 2.2 Trade Blocs and Memberships (Week 2-3)

**Database Migration: `0037_trade_blocs.sql`**

```sql
CREATE TABLE trade_blocs (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  established_date DATE,
  website TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_bloc_memberships (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  trade_bloc_id INTEGER REFERENCES trade_blocs(id),
  joined_date DATE,
  status VARCHAR(50) DEFAULT 'active',
  UNIQUE(country_id, trade_bloc_id)
);

-- Seed major trade blocs
INSERT INTO trade_blocs (code, name, description, established_date) VALUES
  ('AfCFTA', 'African Continental Free Trade Area', '...', '2021-01-01'),
  ('ECOWAS', 'Economic Community of West African States', '...', '1975-05-28'),
  ('EU', 'European Union', '...', '1993-11-01'),
  ('ASEAN', 'Association of Southeast Asian Nations', '...', '1967-08-08'),
  ('MERCOSUR', 'Southern Common Market', '...', '1991-03-26'),
  ('USMCA', 'United States-Mexico-Canada Agreement', '...', '2020-07-01');

-- Populate memberships
```

**API Endpoints:**
- `GET /api/v1/trade-blocs` — List all trade blocs
- `GET /api/v1/trade-blocs/:id/members` — List members
- `GET /api/v1/countries/:id/trade-blocs` — Get country's trade blocs

#### 2.3 HS Classification System (Week 3-4)

**Database Migration: `0038_hs_classification.sql`**

```sql
CREATE TABLE hs_revisions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,  -- 'HS2017', 'HS2022'
  name TEXT NOT NULL,
  effective_date DATE,
  is_current BOOLEAN DEFAULT FALSE
);

CREATE TABLE hs_codes (
  id SERIAL PRIMARY KEY,
  revision_id INTEGER REFERENCES hs_revisions(id),
  code VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  level INTEGER NOT NULL,  -- 2=chapter, 4=heading, 6=subheading
  parent_id INTEGER REFERENCES hs_codes(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(revision_id, code)
);

CREATE TABLE commodity_hs_mappings (
  id SERIAL PRIMARY KEY,
  commodity_id INTEGER REFERENCES commodities(id),
  hs_code_id INTEGER REFERENCES hs_codes(id),
  confidence DECIMAL(3,2),  -- 0.00 to 1.00
  mapping_source TEXT,  -- 'manual', 'automated', 'validated'
  notes TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  UNIQUE(commodity_id, hs_code_id)
);

-- Seed HS revisions
INSERT INTO hs_revisions (code, name, effective_date, is_current) VALUES
  ('HS2017', 'Harmonized System 2017', '2017-01-01', FALSE),
  ('HS2022', 'Harmonized System 2022', '2022-01-01', TRUE);

-- Import HS 2022 codes (5,000+ codes)
-- Map priority commodities (maize, sorghum, sesame, etc.)
```

**Admin Interface:**
- HS code browser (hierarchical view)
- Commodity-to-HS mapping tool
- Mapping confidence editor
- Bulk import/export

**API Endpoints:**
- `GET /api/v1/hs-codes` — List HS codes
- `GET /api/v1/hs-codes/:id` — Get HS code details
- `GET /api/v1/hs-codes/search?q=maize` — Search HS codes
- `GET /api/v1/commodities/:id/hs-codes` — Get commodity HS mappings

**Tests:**
- HS hierarchy validation tests
- Commodity mapping tests
- Code lookup tests

---

### Stage 3 — International Trade Data Engine

**Duration:** 6 weeks (Weeks 5-10)  
**Priority:** **CRITICAL**

**Objective:** Build the trade data ingestion infrastructure and integrate priority data sources.

**Deliverables:**

#### 3.1 Trade Data Schema (Week 5)

**Database Migration: `0039_international_trade_data.sql`**

```sql
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
```

#### 3.2 Trade Data Ingestion Framework (Week 5-6)

**Service Layer:**

```typescript
// src/lib/trade/ingestion/types.ts
interface TradeDataRecord {
  reporting_country: string;
  partner_country: string;
  flow_type: 'import' | 'export';
  commodity_slug?: string;
  hs_code?: string;
  year: number;
  month?: number;
  trade_value_usd?: number;
  quantity_kg?: number;
  // ... other fields
}

interface TradeDataSourceAdapter {
  getSourceInfo(): SourceInfo;
  fetchTradeData(params: QueryParams): Promise<TradeDataRecord[]>;
  transformData(raw: any[]): Promise<TradeDataRecord[]>;
  validateData(records: TradeDataRecord[]): Promise<ValidationResult>;
}

// src/lib/trade/ingestion/validators.ts
function validateTradeRecord(record: TradeDataRecord): ValidationResult {
  // Validate country codes
  // Validate HS codes
  // Validate trade values (non-negative)
  // Validate quantities (non-negative)
  // Check for duplicates
  // Flag anomalies
}
```

**Ingestion Pipeline:**
1. Fetch raw data from source
2. Transform to canonical format
3. Validate records
4. Check for duplicates
5. Insert into database
6. Log provenance metadata
7. Update source sync status

#### 3.3 FAOSTAT Trade Data Integration (Week 6-7)

**Adapter Implementation:**

```typescript
// src/lib/trade/ingestion/adapters/faostat-trade.ts
export class FAOSTATTradeAdapter implements TradeDataSourceAdapter {
  async fetchTradeData(params: QueryParams): Promise<TradeDataRecord[]> {
    // Extend existing FAOSTAT integration
    // Fetch trade data (imports/exports by commodity)
    // Transform to canonical format
  }
}
```

**Expected Data Volume:**
- 10,000-50,000 records (agricultural trade)
- Coverage: 200+ countries, 22 commodities, 2018-2023

#### 3.4 ITC Trade Map Integration (Week 7-9)

**Adapter Implementation:**

```typescript
// src/lib/trade/ingestion/adapters/itc-trade-map.ts
export class ITC TradeMapAdapter implements TradeDataSourceAdapter {
  async fetchTradeData(params: QueryParams): Promise<TradeDataRecord[]> {
    // Web scraper or API integration
    // Fetch bilateral trade flows
    // Transform to canonical format
  }
}
```

**Expected Data Volume:**
- 100,000-500,000 records (comprehensive trade data)
- Coverage: 220+ countries, all commodities, 2001-present

**Note:** May require web scraping if API access is limited.

#### 3.5 WTO Tariff Data Integration (Week 9-10)

**Database Migration: `0040_tariff_schedules.sql`**

```sql
CREATE TABLE tariff_schedules (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id),
  hs_code_id INTEGER REFERENCES hs_codes(id),
  tariff_type VARCHAR(50),  -- 'mfn', 'bound', 'preferential', 'applied'
  rate_type VARCHAR(50),  -- 'ad_valorem', 'specific', 'compound', 'tariff_rate_quota'
  rate_value DECIMAL(10,4),  -- Percentage or specific rate
  rate_unit VARCHAR(20),  -- '%', 'USD/kg', etc.
  effective_date DATE,
  expiry_date DATE,
  trade_agreement_id INTEGER REFERENCES trade_agreements(id),
  source_id INTEGER REFERENCES evidence_sources(id),
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tariff_country ON tariff_schedules(country_id);
CREATE INDEX idx_tariff_hs_code ON tariff_schedules(hs_code_id);
CREATE INDEX idx_tariff_type ON tariff_schedules(tariff_type);
CREATE INDEX idx_tariff_current ON tariff_schedules(country_id, hs_code_id, is_current);
```

**Adapter Implementation:**

```typescript
// src/lib/trade/ingestion/adapters/wto-tariffs.ts
export class WTOTariffAdapter implements TradeDataSourceAdapter {
  async fetchTariffData(params: QueryParams): Promise<TariffRecord[]> {
    // Fetch WTO tariff data
    // Transform to canonical format
  }
}
```

**Expected Data Volume:**
- 50,000-200,000 records (tariff lines)
- Coverage: 164 WTO members, all HS codes

#### 3.6 Data Quality Framework (Week 10)

**Validation Rules:**
1. Country code validation (must be valid ISO code)
2. HS code validation (must exist in hs_codes table)
3. Trade value validation (non-negative, reasonable range)
4. Quantity validation (non-negative, reasonable range)
5. Duplicate detection (same country × partner × commodity × year)
6. Anomaly detection (unusual values, outliers)
7. Mirror statistics validation (compare reporter vs partner data)

**Quality Dashboard:**
- Data volume by source
- Validation status distribution
- Anomaly detection results
- Data freshness indicators

---

### Stage 4 — Trade Intelligence Analytics

**Duration:** 6 weeks (Weeks 11-16)  
**Priority:** **HIGH**

**Objective:** Build country and commodity trade profiles, trade flow explorer, and analytics dashboards.

**Deliverables:**

#### 4.1 Analytical Views (Week 11-12)

**Database Migration: `0041_trade_analytics_views.sql`**

```sql
-- Country trade profile view
CREATE VIEW analytics_country_trade_profile AS
SELECT
  c.id as country_id,
  c.name as country_name,
  c.iso_alpha3,
  tr.year,
  tr.flow_type,
  COUNT(DISTINCT tr.partner_country_id) as partner_count,
  COUNT(DISTINCT tr.commodity_id) as commodity_count,
  SUM(tr.trade_value_usd) as total_trade_value_usd,
  SUM(tr.quantity_kg) as total_quantity_kg
FROM countries c
JOIN international_trade_records tr ON
  (tr.reporting_country_id = c.id OR tr.partner_country_id = c.id)
GROUP BY c.id, c.name, c.iso_alpha3, tr.year, tr.flow_type;

-- Commodity trade profile view
CREATE VIEW analytics_commodity_trade_profile AS
SELECT
  com.id as commodity_id,
  com.name as commodity_name,
  com.slug as commodity_slug,
  tr.year,
  tr.flow_type,
  COUNT(DISTINCT tr.reporting_country_id) as reporting_country_count,
  COUNT(DISTINCT tr.partner_country_id) as partner_count,
  SUM(tr.trade_value_usd) as total_trade_value_usd,
  SUM(tr.quantity_kg) as total_quantity_kg
FROM commodities com
JOIN international_trade_records tr ON tr.commodity_id = com.id
GROUP BY com.id, com.name, com.slug, tr.year, tr.flow_type;

-- Top trading partners view
CREATE VIEW analytics_top_trading_partners AS
SELECT
  tr.reporting_country_id,
  tr.partner_country_id,
  tr.flow_type,
  tr.year,
  SUM(tr.trade_value_usd) as total_value_usd,
  SUM(tr.quantity_kg) as total_quantity_kg,
  RANK() OVER (
    PARTITION BY tr.reporting_country_id, tr.flow_type, tr.year
    ORDER BY SUM(tr.trade_value_usd) DESC
  ) as partner_rank
FROM international_trade_records tr
GROUP BY tr.reporting_country_id, tr.partner_country_id, tr.flow_type, tr.year;

-- Trade flow summary view
CREATE VIEW analytics_trade_flow_summary AS
SELECT
  rc.iso_alpha3 as reporter_code,
  rc.name as reporter_name,
  pc.iso_alpha3 as partner_code,
  pc.name as partner_name,
  tr.flow_type,
  tr.year,
  COUNT(DISTINCT tr.commodity_id) as commodity_count,
  SUM(tr.trade_value_usd) as total_value_usd,
  SUM(tr.quantity_kg) as total_quantity_kg
FROM international_trade_records tr
JOIN countries rc ON tr.reporting_country_id = rc.id
JOIN countries pc ON tr.partner_country_id = pc.id
GROUP BY rc.iso_alpha3, rc.name, pc.iso_alpha3, pc.name, tr.flow_type, tr.year;
```

#### 4.2 Country Trade Profiles (Week 12-13)

**Pages:**
- `/trade/countries` — Country directory
- `/trade/countries/[slug]` — Country trade profile

**Components:**
- `CountryTradeProfile.tsx` — Main profile component
- `CountryTradeSummary.tsx` — Summary cards (total trade, partners, commodities)
- `CountryTradePartners.tsx` — Top trading partners chart
- `CountryCommodityComposition.tsx` — Commodity breakdown chart
- `CountryTradeTrends.tsx` — Trade value/quantity trends

**Features:**
- Country overview (region, trade blocs, currency)
- Agricultural trade summary (exports, imports, balance)
- Top trading partners (chart + table)
- Commodity composition (chart + table)
- Trade trends (line charts)
- Data coverage and source attribution

#### 4.3 Commodity Trade Profiles (Week 13-14)

**Pages:**
- `/trade/commodities` — Commodity trade directory
- `/trade/commodities/[slug]` — Commodity trade profile

**Components:**
- `CommodityTradeProfile.tsx` — Main profile component
- `CommodityTradeSummary.tsx` — Summary cards
- `CommodityExporters.tsx` — Top exporting countries
- `CommodityImporters.tsx` — Top importing countries
- `CommodityTradeTrends.tsx` — Trade trends
- `CommodityHSInfo.tsx` — HS classification info

**Features:**
- Commodity overview (HS codes, categories)
- Global trade summary (total trade, growth)
- Top exporters (chart + table)
- Top importers (chart + table)
- Trade trends (line charts)
- African exporter positioning
- HS classification details

#### 4.4 Trade Flow Explorer (Week 14-15)

**Pages:**
- `/trade/flows` — Trade flow explorer

**Components:**
- `TradeFlowExplorer.tsx` — Main explorer component
- `TradeFlowFilters.tsx` — Filter controls
- `TradeFlowResults.tsx` — Results table
- `TradeFlowChart.tsx` — Visualization

**Features:**
- Select reporting country
- Select partner country
- Select commodity or HS code
- Select trade direction (import/export)
- Select year range
- View trade values and quantities
- Compare partners
- Export results

#### 4.5 Global Trade Dashboard (Week 15-16)

**Pages:**
- `/trade/overview` — Global trade overview

**Components:**
- `GlobalTradeDashboard.tsx` — Main dashboard
- `TradeRankings.tsx` — Top countries/commodities
- `TradeTrends.tsx` — Global trends
- `AfricanTradeOverview.tsx` — African focus

**Features:**
- Global trade overview (total trade, growth)
- Top trading countries (chart + table)
- Top traded commodities (chart + table)
- African trade overview (exports, imports, partners)
- Trade trends (line charts)
- Data coverage indicators

---

### Stage 5 — Market Discovery

**Duration:** 4 weeks (Weeks 17-20)  
**Priority:** **HIGH**

**Objective:** Build destination market discovery and comparison tools.

**Deliverables:**

#### 5.1 Destination Market Discovery (Week 17-18)

**Pages:**
- `/trade/market-discovery` — Market discovery tool

**Components:**
- `MarketDiscovery.tsx` — Main discovery component
- `MarketFilters.tsx` — Filter controls
- `MarketResults.tsx` — Results list
- `MarketComparison.tsx` — Comparison tool

**Features:**
- Select commodity
- Select origin country
- View potential destination markets
- Filter by region, trade value, growth
- Compare destinations
- View market requirements (if available)

#### 5.2 Market Comparison Engine (Week 18-19)

**Features:**
- Compare multiple destinations
- Compare by trade value, quantity, growth
- Compare by tariff rates (if available)
- Compare by market access requirements (if available)
- Data completeness indicators

#### 5.3 African Exporter Positioning (Week 19-20)

**Features:**
- View African countries' export positions
- Compare African exporters
- Identify destination markets for African products
- Highlight regional trade relationships

---

### Stage 6 — Market Access Intelligence

**Duration:** 6 weeks (Weeks 21-26)  
**Priority:** **HIGH**

**Objective:** Build market access requirements, tariff intelligence, and trade agreement database.

**Deliverables:**

#### 6.1 Market Access Requirements Schema (Week 21)

**Database Migration: `0042_market_access.sql`**

```sql
CREATE TABLE market_access_requirements (
  id SERIAL PRIMARY KEY,
  origin_country_id INTEGER REFERENCES countries(id),
  destination_country_id INTEGER REFERENCES countries(id),
  commodity_id INTEGER REFERENCES commodities(id),
  hs_code_id INTEGER REFERENCES hs_codes(id),
  
  requirement_category VARCHAR(50),  -- 'phytosanitary', 'quality', 'labeling', 'certification'
  requirement_type VARCHAR(50),  -- 'mandatory', 'voluntary', 'conditional'
  title TEXT NOT NULL,
  description TEXT,
  
  regulatory_authority TEXT,
  source_document TEXT,
  source_url TEXT,
  
  publication_date DATE,
  effective_date DATE,
  expiry_date DATE,
  last_verified_date DATE,
  
  verification_status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'review', 'approved', 'published', 'expired'
  confidence_level DECIMAL(3,2),  -- 0.00 to 1.00
  
  created_by INTEGER REFERENCES profiles(id),
  reviewed_by INTEGER REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_agreements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  agreement_type VARCHAR(50),  -- 'bilateral', 'regional', 'multilateral'
  established_date DATE,
  effective_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  website TEXT,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_agreement_memberships (
  id SERIAL PRIMARY KEY,
  trade_agreement_id INTEGER REFERENCES trade_agreements(id),
  country_id INTEGER REFERENCES countries(id),
  membership_type VARCHAR(50),  -- 'full', 'associate', 'observer'
  joined_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  UNIQUE(trade_agreement_id, country_id)
);
```

#### 6.2 Tariff Intelligence UI (Week 22-23)

**Pages:**
- `/trade/tariffs` — Tariff lookup tool
- `/trade/tariffs/country/[slug]` — Country tariff schedule

**Components:**
- `TariffLookup.tsx` — Tariff search tool
- `TariffSchedule.tsx` — Tariff schedule display
- `TariffComparison.tsx` — Compare tariffs across countries

**Features:**
- Search tariffs by HS code
- View country tariff schedules
- Compare MFN vs preferential rates
- View tariff history
- Data source attribution

#### 6.3 Trade Agreement Database (Week 23-24)

**Pages:**
- `/trade/agreements` — Trade agreement directory
- `/trade/agreements/[slug]` — Agreement details

**Components:**
- `TradeAgreementList.tsx` — Agreement directory
- `TradeAgreementDetails.tsx` — Agreement details
- `TradeAgreementMembers.tsx` — Member countries

**Features:**
- Browse trade agreements
- View member countries
- View agreement provisions
- Check country eligibility

#### 6.4 Market Access Requirements UI (Week 24-26)

**Pages:**
- `/trade/market-access` — Market access lookup
- `/trade/market-access/[origin]/[destination]/[commodity]` — Specific requirements

**Components:**
- `MarketAccessLookup.tsx` — Lookup tool
- `MarketAccessRequirements.tsx` — Requirements list
- `RequirementDetails.tsx` — Requirement details

**Features:**
- Select origin, destination, commodity
- View applicable requirements
- Filter by category (phytosanitary, quality, etc.)
- View requirement details and sources
- Verification status indicators

---

### Stage 7 — Export Readiness

**Duration:** 4 weeks (Weeks 27-30)  
**Priority:** **MEDIUM**

**Objective:** Build export readiness assessment workflows.

**Deliverables:**

#### 7.1 Export Readiness Schema (Week 27)

**Database Migration: `0043_export_readiness.sql`**

```sql
CREATE TABLE export_readiness_assessments (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  
  origin_country_id INTEGER REFERENCES countries(id),
  destination_country_id INTEGER REFERENCES countries(id),
  commodity_id INTEGER REFERENCES commodities(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'in_progress', 'completed', 'archived'
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  
  created_by INTEGER REFERENCES profiles(id),
  assigned_to INTEGER REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE export_readiness_checklist_items (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER REFERENCES export_readiness_assessments(id),
  requirement_id INTEGER REFERENCES market_access_requirements(id),
  
  title TEXT NOT NULL,
  description TEXT,
  
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'not_applicable'
  completion_notes TEXT,
  
  completed_by INTEGER REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE export_readiness_documents (
  id SERIAL PRIMARY KEY,
  checklist_item_id INTEGER REFERENCES export_readiness_checklist_items(id),
  
  document_type VARCHAR(50),  -- 'certificate', 'license', 'test_report', 'other'
  document_name TEXT NOT NULL,
  document_url TEXT,
  
  uploaded_by INTEGER REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7.2 Export Readiness UI (Week 28-30)

**Pages:**
- `/trade/export-readiness` — Readiness dashboard
- `/trade/export-readiness/new` — Create new assessment
- `/trade/export-readiness/[id]` — Assessment details

**Components:**
- `ExportReadinessDashboard.tsx` — Dashboard
- `ExportReadinessAssessment.tsx` — Assessment form
- `ExportReadinessChecklist.tsx` — Checklist component
- `ExportReadinessProgress.tsx` — Progress tracking

**Features:**
- Create export readiness assessment
- Select origin, destination, commodity
- Auto-generate checklist from requirements
- Track completion status
- Upload supporting documents
- Assign team members
- Export readiness report

---

### Stage 8 — Trade Corridor Intelligence

**Duration:** 4 weeks (Weeks 31-34)  
**Priority:** **MEDIUM**

**Objective:** Build trade corridor and logistics intelligence.

**Deliverables:**

#### 8.1 Trade Corridor Schema (Week 31)

**Database Migration: `0044_trade_corridors.sql`**

```sql
CREATE TABLE trade_corridors (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  origin_country_id INTEGER REFERENCES countries(id),
  destination_country_id INTEGER REFERENCES countries(id),
  corridor_type VARCHAR(50),  -- 'road', 'rail', 'sea', 'air', 'multimodal'
  distance_km DECIMAL(10,2),
  transit_time_days INTEGER,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trade_corridor_waypoints (
  id SERIAL PRIMARY KEY,
  corridor_id INTEGER REFERENCES trade_corridors(id),
  waypoint_type VARCHAR(50),  -- 'port', 'border', 'city', 'hub'
  name TEXT NOT NULL,
  country_id INTEGER REFERENCES countries(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  sequence_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8.2 Trade Corridor UI (Week 32-34)

**Pages:**
- `/trade/corridors` — Corridor directory
- `/trade/corridors/[id]` — Corridor details

**Components:**
- `TradeCorridorList.tsx` — Corridor directory
- `TradeCorridorMap.tsx` — Geographic visualization
- `TradeCorridorDetails.tsx` — Corridor details

**Features:**
- Browse trade corridors
- View corridor on map
- View waypoints (ports, borders, cities)
- View transit time and distance
- View logistics information

---

### Stage 9 — Phase 04/05 Integration

**Duration:** 4 weeks (Weeks 35-38)  
**Priority:** **HIGH** (depends on Phase 04/05 completion)  
**Dependency:** Requires Phases 04 and 05 to be implemented

**Objective:** Connect trade intelligence with marketplace and business workspace.

**Deliverables:**

#### 9.1 Marketplace Integration (Week 35-36)

**Features:**
- Link trade opportunities to marketplace listings
- Show trade intelligence in seller/buyer profiles
- Suggest trade opportunities based on market data
- Connect export readiness to supplier capabilities

#### 9.2 Workspace Integration (Week 36-37)

**Features:**
- Organization-scoped trade research
- Team collaboration on export readiness
- Private market assessments
- Saved trade intelligence queries

#### 9.3 Trade Opportunity Connections (Week 37-38)

**Features:**
- Connect trade flows to business opportunities
- Suggest potential partners based on trade data
- Highlight market gaps and opportunities
- Integrate with AI analyst for opportunity analysis

---

### Stage 10 — Phase 06 AI Integration

**Duration:** 4 weeks (Weeks 39-42)  
**Priority:** **HIGH**

**Objective:** Extend AI analyst for trade intelligence.

**Deliverables:**

#### 10.1 AI Retrieval Tools (Week 39-40)

**Tools:**
- `getTradeFlows` — Retrieve trade flow data
- `getCountryTradeProfile` — Get country trade summary
- `getCommodityTradeProfile` — Get commodity trade summary
- `getTariffRates` — Get tariff information
- `getMarketAccessRequirements` — Get regulatory requirements
- `getTradeAgreements` — Get trade agreement info

#### 10.2 AI Market Assessment (Week 40-41)

**Features:**
- Generate market assessment reports
- Analyze trade opportunities
- Identify market gaps
- Suggest export strategies

#### 10.3 AI Integration Testing (Week 41-42)

**Tests:**
- Trade data retrieval accuracy
- Source citation accuracy
- No-evidence responses
- Prompt injection resistance
- Tenant isolation

---

### Stage 11 — Entitlements and Commercialization

**Duration:** 4 weeks (Weeks 43-46)  
**Priority:** **MEDIUM**

**Objective:** Integrate trade intelligence with entitlement engine.

**Deliverables:**

#### 11.1 Entitlement Keys (Week 43)

**Database Migration: `0045_trade_entitlements.sql`**

```sql
INSERT INTO entitlement_catalog (key, name, description) VALUES
  ('trade_intelligence_basic', 'Basic Trade Intelligence', 'Access to basic trade data and country profiles'),
  ('trade_intelligence_pro', 'Professional Trade Intelligence', 'Advanced trade analytics and market discovery'),
  ('trade_intelligence_enterprise', 'Enterprise Trade Intelligence', 'Full access including market access and export readiness'),
  ('market_access_research', 'Market Access Research', 'Access to regulatory requirements and tariff data'),
  ('export_readiness_workspace', 'Export Readiness Workspace', 'Access to export readiness assessment tools');
```

#### 11.2 Access Control (Week 44-45)

**Features:**
- Tier-based access to trade features
- Organization-level permissions
- Usage tracking and limits
- API rate limiting

#### 11.3 Commercial Integration (Week 45-46)

**Features:**
- Subscription plans for trade intelligence
- Pay-per-use for premium features
- Enterprise licensing options

---

### Stage 12 — Production Readiness

**Duration:** 6 weeks (Weeks 47-52)  
**Priority:** **CRITICAL**

**Objective:** Complete security review, performance testing, documentation, and deployment.

**Deliverables:**

#### 12.1 Security Review (Week 47-48)

**Tasks:**
- RLS policy audit
- API security review
- Data source credential protection
- Tenant isolation testing
- Penetration testing

#### 12.2 Performance Testing (Week 48-49)

**Tasks:**
- Load testing for trade data queries
- Query optimization
- Index tuning
- Caching strategy
- Database scaling evaluation

#### 12.3 Documentation (Week 49-50)

**Documents:**
- User guides
- API documentation
- Admin guides
- Data source attribution guide
- Deployment guide

#### 12.4 Monitoring and Observability (Week 50-51)

**Tasks:**
- Set up monitoring dashboards
- Configure alerts
- Log aggregation
- Performance monitoring
- Error tracking

#### 12.5 Deployment (Week 51-52)

**Tasks:**
- Staging environment testing
- Production deployment
- Data migration
- User training
- Go-live support

---

## Timeline Summary

| Stage | Duration | Weeks | Priority | Dependencies |
|-------|----------|-------|----------|--------------|
| 1. Audit | 1 week | 1 | **CRITICAL** | None |
| 2. Geographic/Classification | 4 weeks | 2-5 | **CRITICAL** | Stage 1 |
| 3. Trade Data Engine | 6 weeks | 6-11 | **CRITICAL** | Stage 2 |
| 4. Trade Analytics | 6 weeks | 12-17 | **HIGH** | Stage 3 |
| 5. Market Discovery | 4 weeks | 18-21 | **HIGH** | Stage 4 |
| 6. Market Access | 6 weeks | 22-27 | **HIGH** | Stage 4 |
| 7. Export Readiness | 4 weeks | 28-31 | **MEDIUM** | Stage 6 |
| 8. Trade Corridors | 4 weeks | 32-35 | **MEDIUM** | Stage 4 |
| 9. Phase 04/05 Integration | 4 weeks | 36-39 | **HIGH** | Stage 4, Phase 04/05 |
| 10. AI Integration | 4 weeks | 40-43 | **HIGH** | Stage 4 |
| 11. Entitlements | 4 weeks | 44-47 | **MEDIUM** | Stage 4 |
| 12. Production Readiness | 6 weeks | 48-53 | **CRITICAL** | All stages |

**Total Duration:** 53 weeks (~12 months)

---

## Resource Requirements

### Development Team

| Role | FTE | Duration | Responsibilities |
|------|-----|----------|------------------|
| Senior Full-Stack Developer | 1 | 12 months | Architecture, core features, integration |
| Backend Developer | 1 | 12 months | Data ingestion, APIs, database |
| Frontend Developer | 1 | 10 months | UI components, visualizations |
| Data Engineer | 1 | 8 months | Trade data, HS classification, analytics |

### Data and Research

| Role | FTE | Duration | Responsibilities |
|------|-----|----------|------------------|
| Trade Data Researcher | 1 | 12 months | Source integration, validation |
| Market Access Researcher | 1 | 8 months | Regulatory data, tariffs, agreements |

### Infrastructure

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Pro/Team | $25-599/month | Database, auth, storage |
| Vercel Pro | $20/month | Hosting, deployment |
| UN Comtrade (optional) | $5,000-20,000/year | Comprehensive trade data |
| ITC Trade Map | Free | Comprehensive trade data |
| Other data sources | Free | WITS, FAOSTAT, WTO, World Bank |

### Budget Summary

| Category | Conservative | Comprehensive |
|----------|--------------|---------------|
| Development | $150,000 | $200,000 |
| Data/Research | $50,000 | $80,000 |
| Infrastructure | $5,000 | $25,000 |
| **Total** | **$205,000** | **$305,000** |

---

## Risk Mitigation

### High-Risk Items

1. **UN Comtrade Access**
   - Risk: Budget may not allow subscription
   - Mitigation: Use free alternatives (ITC Trade Map, WITS)

2. **HS Classification Complexity**
   - Risk: Many-to-many mappings are complex
   - Mitigation: Start with priority commodities, expand gradually

3. **Phase 04/05 Delay**
   - Risk: Integration delayed if Phases 04/05 not ready
   - Mitigation: Build Stage 9 as optional, proceed with other stages

4. **Data Volume and Performance**
   - Risk: Large trade datasets may cause performance issues
   - Mitigation: Use materialized views, strategic indexing, pagination

### Medium-Risk Items

5. **ITC Trade Map API Access**
   - Risk: Limited API may require web scraping
   - Mitigation: Build robust scraper, negotiate API access

6. **AfCFTA Data Access**
   - Risk: May require formal partnership
   - Mitigation: Begin outreach early, use alternative sources if needed

7. **Market Access Data Quality**
   - Risk: Regulatory data is complex and changes frequently
   - Mitigation: Manual curation for priority markets, clear data freshness indicators

---

## Success Criteria

Phase 07 is complete when:

1. ✅ 200+ countries with full metadata
2. ✅ 5,000+ HS codes with commodity mappings
3. ✅ 100,000+ trade records from 3+ sources
4. ✅ Country trade profiles for 50+ countries
5. ✅ Commodity trade profiles for 10+ commodities
6. ✅ Trade flow explorer operational
7. ✅ Tariff data for 50+ countries
8. ✅ Market access requirements for 20+ country pairs
9. ✅ Export readiness workflows functional
10. ✅ AI analyst can answer trade intelligence questions
11. ✅ Entitlement engine controls access
12. ✅ All tests pass (unit, integration, security)
13. ✅ Production deployment successful
14. ✅ Documentation complete

---

## Next Steps

### Immediate (Week 1)

1. ✅ Complete Stage 1 audit
2. ⏳ Get approval for implementation plan
3. ⏳ Begin Stage 2 (Geographic and Classification Foundation)
4. ⏳ Register for ITC Trade Map access
5. ⏳ Evaluate UN Comtrade subscription

### Short-Term (Weeks 2-8)

1. ⏳ Expand countries table
2. ⏳ Build HS classification system
3. ⏳ Integrate FAOSTAT trade data
4. ⏳ Integrate ITC Trade Map data
5. ⏳ Build trade data ingestion framework

### Medium-Term (Weeks 9-26)

1. ⏳ Build trade intelligence analytics
2. ⏳ Build market discovery tools
3. ⏳ Build market access intelligence
4. ⏳ Integrate WTO tariff data

### Long-Term (Weeks 27-52)

1. ⏳ Build export readiness workflows
2. ⏳ Integrate with Phases 04/05
3. ⏳ Extend AI analyst
4. ⏳ Production readiness and deployment

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-XX  
**Next Review:** Weekly during implementation
