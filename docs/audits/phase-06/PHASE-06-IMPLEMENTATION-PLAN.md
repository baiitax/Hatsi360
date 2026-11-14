# Phase 06 — Research, Intelligence & AI Analyst Implementation Plan

**Status:** DRAFT — Awaiting Owner Approval  
**Date:** 2026-11-14  
**Strategy:** Full Implementation (Option A)  
**Dependencies:** Phases 03, 04, 05 must be completed first

---

## Executive Summary

This implementation plan outlines a **full-featured Phase 06** that delivers all 34 sections specified in the brief. The implementation follows a dependency-first approach: Phases 03-05 must be completed before Phase 06 can proceed.

**Key Decisions:**
- **Implementation Strategy:** Option A (Full implementation after Phases 03-05)
- **Priority:** Full feature set (all 34 sections)
- **External Data Sources:** Free/open sources only (FAOSTAT, USDA, NBS, CBN)
- **LLM Budget:** Minimal ($100-200/month)
- **Timeline:** 9-12 months total

**Total Estimated Timeline:**
- Phase 03 (Commodity Intelligence): 4-6 weeks
- Phase 04 (Marketplace): 4-6 weeks
- Phase 05 (Workspace): 3-4 weeks
- Phase 06 (Research & AI): 4-6 months
- **Total: 9-12 months**

---

## Part 1: Pre-Implementation (Phases 03-05)

Phase 06 requires foundational data and infrastructure from Phases 03-05. These must be completed first.

### Phase 03: Commodity Intelligence (4-6 weeks)

**Objective:** Build commodity fundamentals database with production, supply, demand, and trade data.

#### Stage 3.1: Database Schema (Week 1-2)

**Migration: `0034_commodity_intelligence.sql`**

Create tables for commodity fundamentals:

```sql
-- Production data (from FAOSTAT, NBS)
CREATE TABLE commodity_production (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commodity_id BIGINT REFERENCES commodities(id),
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-3
  year INTEGER NOT NULL,
  production_quantity_tonnes NUMERIC(18,4),
  yield_tonnes_per_hectare NUMERIC(12,4),
  harvested_area_hectares NUMERIC(18,4),
  source_id BIGINT, -- references source_registry
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supply chain data
CREATE TABLE commodity_supply (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commodity_id BIGINT REFERENCES commodities(id),
  country_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  domestic_production_tonnes NUMERIC(18,4),
  imports_tonnes NUMERIC(18,4),
  beginning_stocks_tonnes NUMERIC(18,4),
  total_supply_tonnes NUMERIC(18,4),
  source_id BIGINT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Demand data
CREATE TABLE commodity_demand (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commodity_id BIGINT REFERENCES commodities(id),
  country_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  food_consumption_tonnes NUMERIC(18,4),
  industrial_use_tonnes NUMERIC(18,4),
  feed_use_tonnes NUMERIC(18,4),
  exports_tonnes NUMERIC(18,4),
  ending_stocks_tonnes NUMERIC(18,4),
  total_demand_tonnes NUMERIC(18,4),
  source_id BIGINT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade flow data (from USDA FAS, UN Comtrade)
CREATE TABLE commodity_trade (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commodity_id BIGINT REFERENCES commodities(id),
  reporter_country TEXT NOT NULL,
  partner_country TEXT NOT NULL,
  year INTEGER NOT NULL,
  export_quantity_tonnes NUMERIC(18,4),
  export_value_usd NUMERIC(18,2),
  import_quantity_tonnes NUMERIC(18,4),
  import_value_usd NUMERIC(18,2),
  hs_code TEXT, -- Harmonized System code
  source_id BIGINT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seasonality patterns
CREATE TABLE commodity_seasonality (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commodity_id BIGINT REFERENCES commodities(id),
  market_id BIGINT REFERENCES markets(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  typical_price_direction TEXT CHECK (typical_price_direction IN ('up', 'down', 'stable')),
  typical_price_change_percent NUMERIC(8,2),
  seasonal_factor NUMERIC(8,4), -- multiplier relative to annual average
  confidence_level NUMERIC(5,2) CHECK (confidence_level BETWEEN 0 AND 100),
  sample_size INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(commodity_id, market_id, month)
);

-- Evidence sources and registry
CREATE TABLE evidence_sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT,
  url TEXT,
  source_type TEXT CHECK (source_type IN ('government', 'international_org', 'academic', 'industry', 'media', 'other')),
  reliability_rating NUMERIC(3,2) CHECK (reliability_rating BETWEEN 0 AND 1),
  update_frequency TEXT,
  license_type TEXT,
  access_method TEXT CHECK (access_method IN ('api', 'web_scrape', 'manual_download', 'file_upload')),
  api_endpoint TEXT,
  api_key_env_var TEXT, -- environment variable name, not actual key
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE source_registry (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id BIGINT REFERENCES evidence_sources(id),
  dataset_name TEXT NOT NULL,
  dataset_url TEXT,
  retrieval_date TIMESTAMPTZ NOT NULL,
  data_period_start DATE,
  data_period_end DATE,
  record_count INTEGER,
  file_hash TEXT, -- SHA-256 hash of downloaded file
  raw_file_path TEXT, -- storage path for raw data
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'complete', 'failed')),
  processing_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Stage 3.2: Data Ingestion (Week 2-4)

**External Data Source Integration:**

1. **FAOSTAT Integration**
   - API: https://fenixservices.fao.org/faostat/api/en/
   - Data: Production, trade, consumption for Nigeria
   - License: CC BY-NC-SA 3.0 IGO
   - Implementation: Build ETL pipeline to fetch and ingest data
   - Files:
     - `src/lib/data/ingestion/faostat.ts` — FAOSTAT API client
     - `src/lib/data/ingestion/faostat-transforms.ts` — Data transformation
     - `supabase/functions/sync-faostat/index.ts` — Edge function for scheduled sync

2. **USDA Foreign Agricultural Service**
   - API: https://apps.fas.usda.gov/PSDOnlineDataServices/
   - Data: Production, supply, distribution for Nigeria
   - License: Public domain
   - Implementation: Build ETL pipeline
   - Files:
     - `src/lib/data/ingestion/usda-fas.ts` — USDA API client
     - `src/lib/data/ingestion/usda-transforms.ts` — Data transformation
     - `supabase/functions/sync-usda/index.ts` — Edge function

3. **Nigerian Bureau of Statistics (NBS)**
   - Data: Nigerian agricultural statistics, quarterly reports
   - License: Public domain
   - Implementation: Manual download + upload interface
   - Files:
     - `src/app/admin/data-ingestion/page.tsx` — Admin UI for manual uploads
     - `src/lib/data/ingestion/nbs-transforms.ts` — Data transformation

4. **Central Bank of Nigeria (CBN)**
   - API: https://www.cbn.gov.ng/out/2023/fxd/rates.aspx
   - Data: Exchange rates (NGN/USD, NGN/EUR)
   - License: Public domain
   - Implementation: Build ETL pipeline
   - Files:
     - `src/lib/data/ingestion/cbn.ts` — CBN API client
     - `supabase/functions/sync-exchange-rates/index.ts` — Edge function

#### Stage 3.3: Commodity Profile Pages (Week 4-5)

**Enhance commodity profiles with intelligence data:**

- File: `src/app/(site)/commodities/[slug]/page.tsx`
- Display: Production trends, supply/demand balance, trade flows, seasonality patterns
- Components:
  - `src/components/commodities/ProductionChart.tsx`
  - `src/components/commodities/SupplyDemandChart.tsx`
  - `src/components/commodities/TradeFlowChart.tsx`
  - `src/components/commodities/SeasonalityChart.tsx`
  - `src/components/commodities/EvidenceCitations.tsx`

#### Stage 3.4: Testing and Validation (Week 5-6)

- Unit tests for data transformation logic
- Integration tests for API clients
- End-to-end tests for data ingestion pipeline
- Manual validation against source data
- Performance testing for large datasets

**Deliverables:**
- Migration `0034_commodity_intelligence.sql`
- ETL pipelines for FAOSTAT, USDA, NBS, CBN
- Commodity profile pages with intelligence
- 100+ tests passing

---

### Phase 04: Marketplace Foundations (4-6 weeks)

**Objective:** Build marketplace infrastructure for organizations, offers, quotations, and opportunities.

#### Stage 4.1: Organization Management (Week 1-2)

**Migration: `0035_organization_management.sql`**

Enhance organization schema:

```sql
-- Extend organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS business_category TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state_id BIGINT REFERENCES states(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);

-- Organization roles
CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Extend organization_members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS role organization_role DEFAULT 'member';
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ;

-- Organization permissions
CREATE TABLE organization_permissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id),
  UNIQUE(organization_id, user_id, permission)
);
```

**Implementation:**
- Organization registration and verification workflow
- Organization profile management
- Member invitation and role management
- Permission system

**Files:**
- `src/app/(site)/workspace/organizations/new/page.tsx` — Create organization
- `src/app/(site)/workspace/organizations/[id]/page.tsx` — Organization profile
- `src/app/(site)/workspace/organizations/[id]/settings/page.tsx` — Settings
- `src/app/(site)/workspace/organizations/[id]/members/page.tsx` — Member management
- `src/lib/organizations/` — Organization service layer

#### Stage 4.2: Marketplace Listings (Week 2-3)

**Migration: `0036_marketplace_listings.sql`**

```sql
-- Product listings
CREATE TABLE product_listings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  listing_type TEXT CHECK (listing_type IN ('sale', 'purchase')) NOT NULL,
  commodity_id BIGINT REFERENCES commodities(id) NOT NULL,
  grade_id BIGINT REFERENCES commodity_grades(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_id BIGINT REFERENCES measurement_units(id) NOT NULL,
  unit_price NUMERIC(18,4),
  currency_code CHAR(3) DEFAULT 'NGN',
  location_market_id BIGINT REFERENCES markets(id),
  delivery_terms TEXT,
  description TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RFQs (Request for Quotation)
CREATE TABLE rfqs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  commodity_id BIGINT REFERENCES commodities(id) NOT NULL,
  grade_id BIGINT REFERENCES commodity_grades(id),
  quantity NUMERIC(18,4) NOT NULL,
  unit_id BIGINT REFERENCES measurement_units(id) NOT NULL,
  target_price NUMERIC(18,4),
  currency_code CHAR(3) DEFAULT 'NGN',
  delivery_location TEXT,
  delivery_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotations
CREATE TABLE quotations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rfq_id BIGINT REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  unit_price NUMERIC(18,4) NOT NULL,
  currency_code CHAR(3) DEFAULT 'NGN',
  quantity NUMERIC(18,4) NOT NULL,
  delivery_date DATE,
  delivery_terms TEXT,
  validity_days INTEGER DEFAULT 30,
  notes TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation:**
- Product listing creation and management
- RFQ creation and management
- Quotation submission and evaluation
- Listing search and filtering

**Files:**
- `src/app/(site)/workspace/marketplace/listings/page.tsx` — My listings
- `src/app/(site)/workspace/marketplace/listings/new/page.tsx` — Create listing
- `src/app/(site)/workspace/marketplace/rfqs/page.tsx` — RFQs
- `src/app/(site)/workspace/marketplace/rfqs/[id]/page.tsx` — RFQ detail
- `src/app/(site)/workspace/marketplace/browse/page.tsx` — Browse marketplace

#### Stage 4.3: Opportunity Intelligence (Week 3-4)

**Migration: `0037_opportunity_intelligence.sql`**

```sql
-- Market opportunities
CREATE TABLE market_opportunities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  opportunity_type TEXT CHECK (opportunity_type IN ('arbitrage', 'seasonal', 'supply_gap', 'demand_signal')) NOT NULL,
  commodity_id BIGINT REFERENCES commodities(id) NOT NULL,
  source_market_id BIGINT REFERENCES markets(id),
  target_market_id BIGINT REFERENCES markets(id),
  opportunity_score NUMERIC(5,2) CHECK (opportunity_score BETWEEN 0 AND 100),
  confidence_level NUMERIC(5,2) CHECK (confidence_level BETWEEN 0 AND 100),
  estimated_margin_percent NUMERIC(8,2),
  description TEXT,
  evidence_ids JSONB DEFAULT '[]'::jsonb, -- references to supporting evidence
  status TEXT DEFAULT 'discovered' CHECK (status IN ('discovered', 'analyzing', 'actionable', 'exploited', 'expired')),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade opportunities
CREATE TABLE trade_opportunities (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  commodity_id BIGINT REFERENCES commodities(id) NOT NULL,
  export_market TEXT NOT NULL,
  opportunity_score NUMERIC(5,2) CHECK (opportunity_score BETWEEN 0 AND 100),
  estimated_demand_tonnes NUMERIC(18,4),
  estimated_price_usd NUMERIC(18,2),
  regulatory_requirements TEXT,
  certification_requirements TEXT,
  description TEXT,
  evidence_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified', 'researching', 'viable', 'pursuing', 'closed')),
  identified_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Implementation:**
- Opportunity discovery engine (price arbitrage, seasonal patterns, supply gaps)
- Opportunity scoring and ranking
- Trade opportunity identification (export markets)
- Opportunity alerting and notifications

**Files:**
- `src/lib/opportunities/discovery.ts` — Opportunity discovery engine
- `src/lib/opportunities/scoring.ts` — Opportunity scoring algorithm
- `src/app/(site)/workspace/opportunities/page.tsx` — Opportunities dashboard
- `src/app/(site)/workspace/opportunities/[id]/page.tsx` — Opportunity detail

#### Stage 4.4: RLS Policies and Security (Week 4-5)

**Migration: `0038_marketplace_rls.sql`**

```sql
-- Enable RLS on all marketplace tables
ALTER TABLE product_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_opportunities ENABLE ROW LEVEL SECURITY;

-- Organization-scoped access policies
CREATE POLICY "Organization members can view own listings"
  ON product_listings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organization members can view own RFQs"
  ON rfqs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

-- Additional policies for quotations, opportunities, etc.
```

**Implementation:**
- Organization-scoped data isolation
- Role-based permission enforcement
- Audit logging for sensitive operations

**Files:**
- `src/lib/auth/organization-permissions.ts` — Permission checking
- `src/lib/audit/logging.ts` — Audit log service

#### Stage 4.5: Testing and Validation (Week 5-6)

- Unit tests for marketplace logic
- Integration tests for organization workflows
- End-to-end tests for listing/RFQ/quotation flows
- Security testing for RLS policies
- Performance testing for marketplace queries

**Deliverables:**
- Migrations `0035-0038_marketplace_*.sql`
- Organization management UI
- Marketplace listing and RFQ UI
- Opportunity intelligence engine
- 200+ tests passing

---

### Phase 05: Organization Workspace (3-4 weeks)

**Objective:** Build workspace-scoped dashboards and business intelligence for organizations.

#### Stage 5.1: Workspace Foundation (Week 1-2)

**Files:**
- `src/app/(site)/workspace/page.tsx` — Workspace dashboard
- `src/app/(site)/workspace/layout.tsx` — Workspace layout
- `src/lib/workspace/` — Workspace service layer

**Implementation:**
- Workspace dashboard with key metrics
- Navigation structure for workspace sections
- Organization context provider

#### Stage 5.2: Business Intelligence (Week 2-3)

**Migration: `0039_business_intelligence.sql`**

```sql
-- Business performance metrics
CREATE TABLE business_metrics (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_listings INTEGER,
  active_listings INTEGER,
  total_rfqs INTEGER,
  active_rfqs INTEGER,
  total_quotations_received INTEGER,
  total_quotations_sent INTEGER,
  opportunities_discovered INTEGER,
  opportunities_exploited INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_date)
);

-- Business analytics snapshots
CREATE TABLE business_analytics_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')) NOT NULL,
  metrics JSONB NOT NULL,
  insights JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, snapshot_date, snapshot_type)
);
```

**Implementation:**
- Business metrics calculation
- Analytics snapshot generation
- Business performance tracking

**Files:**
- `src/lib/workspace/analytics.ts` — Analytics service
- `src/app/(site)/workspace/analytics/page.tsx` — Analytics dashboard

#### Stage 5.3: Workspace Intelligence (Week 3)

**Implementation:**
- Organization-scoped market intelligence
- Custom watchlists for organization
- Business-specific alerts and notifications
- Opportunity alerts for organization's commodities

**Files:**
- `src/app/(site)/workspace/intelligence/page.tsx` — Intelligence dashboard
- `src/app/(site)/workspace/watchlists/page.tsx` — Organization watchlists
- `src/app/(site)/workspace/alerts/page.tsx` — Organization alerts

#### Stage 5.4: Testing and Validation (Week 4)

- Unit tests for workspace logic
- Integration tests for organization workflows
- End-to-end tests for workspace features
- Performance testing for dashboard queries

**Deliverables:**
- Migration `0039_business_intelligence.sql`
- Workspace dashboard and navigation
- Business intelligence features
- 100+ tests passing

---

## Part 2: Phase 06 Implementation (Research, Intelligence & AI Analyst)

### Stage 1: Evidence and Provenance Engine (Weeks 1-4)

**Objective:** Build the foundation for evidence-backed intelligence.

#### Migration: `0040_evidence_provenance.sql`

```sql
-- Evidence classification
CREATE TABLE evidence_classifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  methodological_requirements JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO evidence_classifications (name, description) VALUES
  ('primary_observation', 'Direct field observation or measurement'),
  ('official_statistics', 'Government or international organization data'),
  ('verified_transaction', 'Confirmed transaction with documentation'),
  ('documented_market_report', 'Published market report from known source'),
  ('structured_dataset', 'Structured dataset from authoritative source'),
  ('documented_research', 'Research publication with methodology'),
  ('calculation', 'Derived from other evidence through calculation'),
  ('expert_assessment', 'Expert judgment with disclosed methodology');

-- Evidence records
CREATE TABLE evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_type_id BIGINT REFERENCES evidence_classifications(id),
  source_id BIGINT REFERENCES evidence_sources(id),
  title TEXT NOT NULL,
  description TEXT,
  observation_date DATE,
  geographic_scope TEXT, -- country, region, market
  commodity_id BIGINT REFERENCES commodities(id),
  market_id BIGINT REFERENCES markets(id),
  methodological_notes TEXT,
  confidence_level NUMERIC(5,2) CHECK (confidence_level BETWEEN 0 AND 100),
  limitations TEXT,
  raw_data JSONB, -- original data before processing
  processed_data JSONB, -- transformed/normalized data
  retrieval_date TIMESTAMPTZ,
  verification_date TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'questionable', 'deprecated')),
  access_level TEXT DEFAULT 'public' CHECK (access_level IN ('public', 'authenticated', 'organization', 'restricted')),
  organization_id BIGINT REFERENCES organizations(id), -- for organization-scoped evidence
  license_type TEXT,
  citation_format TEXT, -- how to cite this evidence
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence lifecycle tracking
CREATE TABLE evidence_lifecycle_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_id UUID REFERENCES evidence_records(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date TIMESTAMPTZ DEFAULT NOW(),
  actor UUID REFERENCES profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence citations
CREATE TABLE evidence_citations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_id UUID REFERENCES evidence_records(id) ON DELETE CASCADE,
  citing_document_type TEXT NOT NULL, -- 'report', 'ai_response', 'analysis', etc.
  citing_document_id TEXT NOT NULL, -- ID of the document/response
  citation_context TEXT, -- how the evidence is used
  cited_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Confidence framework
CREATE TABLE confidence_framework (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evidence_type_id BIGINT REFERENCES evidence_classifications(id),
  base_confidence NUMERIC(5,2) CHECK (base_confidence BETWEEN 0 AND 100),
  source_reliability_weight NUMERIC(3,2) DEFAULT 1.0,
  verification_bonus NUMERIC(5,2) DEFAULT 0,
  recency_weight NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Implementation Files

**Evidence Provenance Service:**
- `src/lib/evidence/provenance.ts` — Core provenance tracking
- `src/lib/evidence/classification.ts` — Evidence classification
- `src/lib/evidence/confidence.ts` — Confidence scoring
- `src/lib/evidence/citations.ts` — Citation tracking

**Evidence Ingestion:**
- `src/lib/evidence/ingestion/price-observations.ts` — Import from Phase 01
- `src/lib/evidence/ingestion/external-sources.ts` — Import from Phase 03
- `src/lib/evidence/ingestion/marketplace.ts` — Import from Phase 04

**Evidence UI:**
- `src/app/(site)/evidence/page.tsx` — Evidence browser
- `src/app/(site)/evidence/[id]/page.tsx` — Evidence detail
- `src/app/admin/evidence/page.tsx` — Evidence management
- `src/components/evidence/EvidenceCard.tsx`
- `src/components/evidence/EvidenceTimeline.tsx`
- `src/components/evidence/ConfidenceBadge.tsx`

**Testing:**
- Unit tests for provenance tracking
- Integration tests for evidence ingestion
- End-to-end tests for evidence workflows
- Performance tests for evidence queries

**Deliverables:**
- Migration `0040_evidence_provenance.sql`
- Evidence provenance engine
- Evidence browser UI
- 100+ tests passing

---

### Stage 2: External Data Source Integration (Weeks 3-6)

**Objective:** Integrate free/open external data sources.

#### Implementation Files

**FAOSTAT Integration:**
- `src/lib/data/ingestion/faostat.ts` — FAOSTAT API client
- `src/lib/data/ingestion/faostat-transforms.ts` — Data transformation
- `supabase/functions/sync-faostat/index.ts` — Scheduled sync
- `src/lib/evidence/ingestion/faostat.ts` — Evidence creation

**USDA FAS Integration:**
- `src/lib/data/ingestion/usda-fas.ts` — USDA API client
- `src/lib/data/ingestion/usda-transforms.ts` — Data transformation
- `supabase/functions/sync-usda/index.ts` — Scheduled sync
- `src/lib/evidence/ingestion/usda.ts` — Evidence creation

**NBS Integration:**
- `src/lib/data/ingestion/nbs-transforms.ts` — Data transformation
- `src/app/admin/data-ingestion/nbs/page.tsx` — Manual upload UI
- `src/lib/evidence/ingestion/nbs.ts` — Evidence creation

**CBN Integration:**
- `src/lib/data/ingestion/cbn.ts` — CBN API client
- `supabase/functions/sync-exchange-rates/index.ts` — Scheduled sync
- `src/lib/evidence/ingestion/cbn.ts` — Evidence creation

**Data Ingestion Dashboard:**
- `src/app/admin/data-ingestion/page.tsx` — Overview
- `src/app/admin/data-ingestion/sources/page.tsx` — Source management
- `src/app/admin/data-ingestion/logs/page.tsx` — Sync logs

**Testing:**
- Unit tests for API clients
- Integration tests for data transformation
- End-to-end tests for sync workflows
- Mock API responses for testing

**Deliverables:**
- 4 external data source integrations
- Data ingestion dashboard
- Automated sync jobs
- 80+ tests passing

---

### Stage 3: Unified Analytical Data Layer (Weeks 5-8)

**Objective:** Build permission-aware analytical services.

#### Migration: `0041_analytical_layer.sql`

```sql
-- Market observation analytics
CREATE VIEW analytics_market_observations AS
SELECT
  po.market_id,
  po.commodity_id,
  po.price_type,
  DATE_TRUNC('week', po.published_at) AS observation_week,
  COUNT(*) AS observation_count,
  AVG(po.normalized_amount / NULLIF(po.package_weight_kg * po.package_count, 0)) AS avg_price_per_kg,
  MIN(po.normalized_amount / NULLIF(po.package_weight_kg * po.package_count, 0)) AS min_price_per_kg,
  MAX(po.normalized_amount / NULLIF(po.package_weight_kg * po.package_count, 0)) AS max_price_per_kg,
  STDDEV(po.normalized_amount / NULLIF(po.package_weight_kg * po.package_count, 0)) AS price_stddev
FROM price_observations po
WHERE po.published_at IS NOT NULL
  AND po.verification_status = 'verified'
GROUP BY market_id, commodity_id, price_type, observation_week;

-- Commodity fundamentals view
CREATE VIEW analytics_commodity_fundamentals AS
SELECT
  c.id AS commodity_id,
  c.name AS commodity_name,
  cp.year,
  cp.production_quantity_tonnes,
  cs.total_supply_tonnes,
  cd.total_demand_tonnes,
  cd.exports_tonnes,
  cd.ending_stocks_tonnes,
  CASE WHEN cs.total_supply_tonnes > 0
    THEN (cd.total_demand_tonnes / cs.total_supply_tonnes * 100)
    ELSE NULL
  END AS supply_utilization_percent
FROM commodities c
LEFT JOIN commodity_production cp ON c.id = cp.commodity_id
LEFT JOIN commodity_supply cs ON c.id = cs.commodity_id AND cp.year = cs.year
LEFT JOIN commodity_demand cd ON c.id = cd.commodity_id AND cp.year = cd.year;

-- Trade flow analytics
CREATE VIEW analytics_trade_flows AS
SELECT
  ct.commodity_id,
  ct.reporter_country,
  ct.partner_country,
  ct.year,
  ct.export_quantity_tonnes,
  ct.export_value_usd,
  ct.import_quantity_tonnes,
  ct.import_value_usd,
  CASE WHEN ct.export_quantity_tonnes > 0
    THEN (ct.export_value_usd / ct.export_quantity_tonnes)
    ELSE NULL
  END AS export_unit_value_usd_per_tonne
FROM commodity_trade ct;
```

#### Implementation Files

**Market Intelligence Service:**
- `src/lib/intelligence/market.ts` — Market-level intelligence
- `src/lib/intelligence/commodity.ts` — Commodity-level intelligence
- `src/lib/intelligence/regional.ts` — Regional intelligence
- `src/lib/intelligence/seasonal.ts` — Seasonal patterns

**Price Analysis Service:**
- `src/lib/analytics/price-analysis.ts` — Price trend analysis
- `src/lib/analytics/volatility.ts` — Price volatility analysis
- `src/lib/analytics/spreads.ts` — Market spread analysis
- `src/lib/analytics/seasonality.ts` — Seasonal decomposition

**Data Compatibility Layer:**
- `src/lib/analytics/compatibility.ts` — Ensure apples-to-apples comparisons
- `src/lib/analytics/normalization.ts` — Unit and currency normalization

**Permission-Aware Access:**
- `src/lib/analytics/permissions.ts` — Check data access before queries
- `src/lib/analytics/scoping.ts` — Scope queries to organization/user

**Testing:**
- Unit tests for analytical functions
- Integration tests for data views
- Performance tests for analytical queries
- Security tests for permission enforcement

**Deliverables:**
- Migration `0041_analytical_layer.sql`
- Market intelligence service
- Price analysis service
- Permission-aware access layer
- 120+ tests passing

---

### Stage 4: Commodity Fundamentals and Regional Intelligence (Weeks 7-10)

**Objective:** Build commodity profile and regional intelligence features.

#### Implementation Files

**Commodity Intelligence:**
- `src/lib/intelligence/commodity-fundamentals.ts` — Production, supply, demand
- `src/lib/intelligence/commodity-trade.ts` — Trade flow analysis
- `src/lib/intelligence/commodity-seasonal.ts` — Seasonal patterns
- `src/app/(site)/commodities/[slug]/intelligence/page.tsx` — Intelligence tab

**Regional Intelligence:**
- `src/lib/intelligence/regional-profiles.ts` — Regional market profiles
- `src/lib/intelligence/cross-regional.ts` — Cross-regional comparisons
- `src/app/(site)/regions/page.tsx` — Regional overview
- `src/app/(site)/regions/[slug]/page.tsx` — Regional profile

**Trade Intelligence:**
- `src/lib/intelligence/trade-flows.ts` — Export/import analysis
- `src/lib/intelligence/export-opportunities.ts` — Export market opportunities
- `src/lib/intelligence/regulatory.ts` — Regulatory requirements
- `src/app/(site)/trade/intelligence/page.tsx` — Trade intelligence

**Visualization Components:**
- `src/components/intelligence/ProductionChart.tsx`
- `src/components/intelligence/SupplyDemandChart.tsx`
- `src/components/intelligence/TradeFlowChart.tsx`
- `src/components/intelligence/SeasonalityChart.tsx`
- `src/components/intelligence/RegionalComparisonChart.tsx`

**Testing:**
- Unit tests for intelligence calculations
- Integration tests for data retrieval
- End-to-end tests for intelligence pages
- Visual regression tests for charts

**Deliverables:**
- Commodity intelligence features
- Regional intelligence features
- Trade intelligence features
- 15 visualization components
- 150+ tests passing

---

### Stage 5: Research Management System (Weeks 9-12)

**Objective:** Build research content management and workflow.

#### Migration: `0042_research_management.sql`

```sql
-- Research content types
CREATE TABLE research_content_types (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  typical_length_words INTEGER,
  requires_human_review BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO research_content_types (name, description, typical_length_words) VALUES
  ('daily_brief', 'Daily market summary', 500),
  ('weekly_report', 'Weekly market analysis', 2000),
  ('monthly_outlook', 'Monthly market outlook', 5000),
  ('commodity_profile', 'Commodity intelligence report', 3000),
  ('regional_analysis', 'Regional market analysis', 4000),
  ('trade_brief', 'Trade intelligence brief', 1500),
  ('opportunity_alert', 'Market opportunity alert', 300),
  ('custom_research', 'Custom research report', 5000);

-- Research reports
CREATE TABLE research_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id BIGINT REFERENCES research_content_types(id),
  title TEXT NOT NULL,
  summary TEXT,
  body JSONB, -- structured content with sections
  commodity_id BIGINT REFERENCES commodities(id),
  market_id BIGINT REFERENCES markets(id),
  organization_id BIGINT REFERENCES organizations(id), -- for organization-scoped reports
  period_start DATE,
  period_end DATE,
  generation_method TEXT CHECK (generation_method IN ('ai_generated', 'human_written', 'ai_assisted')) DEFAULT 'ai_generated',
  generation_prompt TEXT, -- prompt used for AI generation
  model_used TEXT, -- AI model used
  token_count INTEGER,
  cost_usd NUMERIC(10,4),
  evidence_ids UUID[] DEFAULT '{}', -- referenced evidence
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research workflow
CREATE TABLE research_workflow_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id UUID REFERENCES research_reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'submitted', 'approved', 'published', 'revised', 'archived'
  event_date TIMESTAMPTZ DEFAULT NOW(),
  actor UUID REFERENCES profiles(id),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report versions
CREATE TABLE research_report_versions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id UUID REFERENCES research_reports(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  body JSONB NOT NULL,
  change_summary TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, version_number)
);

-- Research subscriptions
CREATE TABLE research_subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  content_type_id BIGINT REFERENCES research_content_types(id),
  commodity_id BIGINT REFERENCES commodities(id),
  market_id BIGINT REFERENCES markets(id),
  delivery_method TEXT DEFAULT 'email' CHECK (delivery_method IN ('email', 'in_app', 'both')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Implementation Files

**Research Management Service:**
- `src/lib/research/management.ts` — Report CRUD operations
- `src/lib/research/workflow.ts` — Workflow state machine
- `src/lib/research/versioning.ts` — Version control
- `src/lib/research/subscriptions.ts` — Subscription management

**Research UI:**
- `src/app/(site)/research/page.tsx` — Research library
- `src/app/(site)/research/[id]/page.tsx` — Report detail
- `src/app/(site)/research/subscriptions/page.tsx` — My subscriptions
- `src/app/admin/research/page.tsx` — Research management
- `src/app/admin/research/create/page.tsx` — Create report
- `src/app/admin/research/[id]/review/page.tsx` — Review report

**Research Components:**
- `src/components/research/ReportCard.tsx`
- `src/components/research/ReportViewer.tsx`
- `src/components/research/EvidenceCitations.tsx`
- `src/components/research/WorkflowStatus.tsx`

**Testing:**
- Unit tests for research management
- Integration tests for workflow
- End-to-end tests for report lifecycle
- 100+ tests passing

**Deliverables:**
- Migration `0042_research_management.sql`
- Research management system
- Research UI and workflow
- 100+ tests passing

---

### Stage 6: AI Infrastructure Foundation (Weeks 11-14)

**Objective:** Build LLM provider abstraction and retrieval infrastructure.

#### Migration: `0043_ai_infrastructure.sql`

```sql
-- AI model registry
CREATE TABLE ai_models (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google', etc.
  model_name TEXT NOT NULL,
  display_name TEXT,
  capabilities JSONB, -- ['chat', 'embeddings', 'vision', etc.]
  max_context_tokens INTEGER,
  cost_per_1k_input_tokens NUMERIC(10,6),
  cost_per_1k_output_tokens NUMERIC(10,6),
  is_active BOOLEAN DEFAULT TRUE,
  configuration JSONB, -- provider-specific config
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id BIGINT REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT,
  context JSONB, -- conversation context (selected commodity, market, etc.)
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  model_id BIGINT REFERENCES ai_models(id),
  token_count INTEGER,
  cost_usd NUMERIC(10,6),
  evidence_ids UUID[] DEFAULT '{}', -- evidence retrieved for this message
  tool_calls JSONB, -- tools invoked
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage tracking
CREATE TABLE ai_usage_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  organization_id BIGINT REFERENCES organizations(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  message_id UUID REFERENCES ai_messages(id),
  model_id BIGINT REFERENCES ai_models(id),
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10,6),
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI usage limits
CREATE TABLE ai_usage_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entitlement_key TEXT NOT NULL,
  daily_message_limit INTEGER,
  monthly_message_limit INTEGER,
  daily_token_limit INTEGER,
  monthly_cost_limit_usd NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embeddings for document retrieval (not for structured data)
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL, -- 'report', 'article', 'evidence_summary'
  document_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_type, document_id, chunk_index)
);

-- AI tool registry
CREATE TABLE ai_tools (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  tool_type TEXT CHECK (tool_type IN ('read_query', 'read_analytics', 'read_evidence', 'read_document')) NOT NULL,
  input_schema JSONB NOT NULL,
  output_schema JSONB,
  requires_organization_scope BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Implementation Files

**LLM Provider Abstraction:**
- `src/lib/ai/providers/types.ts` — Provider interface
- `src/lib/ai/providers/openai.ts` — OpenAI implementation
- `src/lib/ai/providers/anthropic.ts` — Anthropic implementation (future)
- `src/lib/ai/providers/factory.ts` — Provider factory
- `src/lib/ai/providers/registry.ts` — Model registry

**Cost Management:**
- `src/lib/ai/cost/tracking.ts` — Token and cost tracking
- `src/lib/ai/cost/limits.ts` — Usage limit enforcement
- `src/lib/ai/cost/budget.ts` — Budget management

**Embedding Service:**
- `src/lib/ai/embeddings/generator.ts` — Generate embeddings
- `src/lib/ai/embeddings/store.ts` — Store/retrieve embeddings
- `src/lib/ai/embeddings/chunker.ts` — Text chunking for documents

**AI Conversation Service:**
- `src/lib/ai/conversations/service.ts` — Conversation CRUD
- `src/lib/ai/conversations/context.ts` — Context management
- `src/lib/ai/conversations/history.ts` — History management

**Testing:**
- Unit tests for provider abstraction
- Integration tests for conversation management
- Cost tracking tests
- 80+ tests passing

**Deliverables:**
- Migration `0043_ai_infrastructure.sql`
- LLM provider abstraction
- Cost management system
- Embedding service
- 80+ tests passing

---

### Stage 7: AI Retrieval and Knowledge Architecture (Weeks 13-16)

**Objective:** Build hybrid retrieval system combining structured queries and document search.

#### Implementation Files

**Structured Data Retrieval (SQL-based):**
- `src/lib/ai/retrieval/price-data.ts` — Query price observations
- `src/lib/ai/retrieval/market-data.ts` — Query market information
- `src/lib/ai/retrieval/commodity-data.ts` — Query commodity fundamentals
- `src/lib/ai/retrieval/trade-data.ts` — Query trade flows
- `src/lib/ai/retrieval/evidence-data.ts` — Query evidence records

**Document Retrieval (Embedding-based):**
- `src/lib/ai/retrieval/document-search.ts` — Semantic search
- `src/lib/ai/retrieval/report-search.ts` — Search research reports
- `src/lib/ai/retrieval/article-search.ts` — Search articles

**Hybrid Retrieal Orchestrator:**
- `src/lib/ai/retrieval/orchestrator.ts` — Combine structured + document retrieval
- `src/lib/ai/retrieval/query-classifier.ts` — Classify query type
- `src/lib/ai/retrieval/ranking.ts` — Rank and filter results

**Permission-Aware Retrieval:**
- `src/lib/ai/retrieval/permissions.ts` — Filter results by user/org access
- `src/lib/ai/retrieval/scoping.ts` — Scope retrieval to organization

**Prompt Injection Protection:**
- `src/lib/ai/security/input-validation.ts` — Sanitize inputs
- `src/lib/ai/security/output-validation.ts` — Validate outputs
- `src/lib/ai/security/prompt-guard.ts` — Detect injection attempts

**Testing:**
- Unit tests for retrieval functions
- Integration tests for hybrid retrieval
- Security tests for injection protection
- Permission tests for data scoping
- 100+ tests passing

**Deliverables:**
- Hybrid retrieval system
- Permission-aware retrieval
- Prompt injection protection
- 100+ tests passing

---

### Stage 8: AI Tool Functions (Weeks 15-18)

**Objective:** Build controlled, read-only tool functions for the AI analyst.

#### Implementation Files

**Market Data Tools:**
- `src/lib/ai/tools/get-market-prices.ts` — Get current prices for a market
- `src/lib/ai/tools/get-price-history.ts` — Get price time series
- `src/lib/ai/tools/get-market-metadata.ts` — Get market information

**Commodity Data Tools:**
- `src/lib/ai/tools/get-commodity-fundamentals.ts` — Get production/supply/demand
- `src/lib/ai/tools/get-commodity-seasonality.ts` — Get seasonal patterns
- `src/lib/ai/tools/get-commodity-grades.ts` — Get grade information

**Trade Data Tools:**
- `src/lib/ai/tools/get-trade-flows.ts` — Get import/export data
- `src/lib/ai/tools/get-exchange-rates.ts` — Get currency rates

**Evidence Tools:**
- `src/lib/ai/tools/get-evidence.ts` — Get evidence by ID
- `src/lib/ai/tools/search-evidence.ts` — Search evidence records
- `src/lib/ai/tools/get-source-info.ts` — Get source metadata

**Analytics Tools:**
- `src/lib/ai/tools/calculate-price-stats.ts` — Calculate price statistics
- `src/lib/ai/tools/calculate-market-spreads.ts` — Calculate market spreads
- `src/lib/ai/tools/calculate-seasonal-index.ts` — Calculate seasonal indices

**Tool Registry and Executor:**
- `src/lib/ai/tools/registry.ts` — Tool registration
- `src/lib/ai/tools/executor.ts` — Tool execution with validation
- `src/lib/ai/tools/schemas.ts` — Tool input/output schemas

**Testing:**
- Unit tests for each tool
- Integration tests for tool execution
- Security tests for read-only enforcement
- 100+ tests passing

**Deliverables:**
- 15+ read-only tool functions
- Tool registry and executor
- Tool schemas and validation
- 100+ tests passing

---

### Stage 9: AI Analyst Interface (Weeks 17-20)

**Objective:** Build the AI analyst chat interface with evidence-grounded responses.

#### Implementation Files

**AI Analyst Service:**
- `src/lib/ai/analyst/service.ts` — Core analyst service
- `src/lib/ai/analyst/prompt-builder.ts` — Build prompts with context
- `src/lib/ai/analyst/response-parser.ts` — Parse AI responses
- `src/lib/ai/analyst/evidence-linker.ts` — Link responses to evidence

**Conversation Flow:**
- `src/lib/ai/analyst/context-builder.ts` — Build conversation context
- `src/lib/ai/analyst/tool-orchestrator.ts` — Orchestrate tool calls
- `src/lib/ai/analyst/response-validator.ts` — Validate responses

**No-Evidence Handling:**
- `src/lib/ai/analyst/insufficient-evidence.ts` — Handle missing evidence
- `src/lib/ai/analyst/confidence-indicator.ts` — Show confidence levels

**UI Components:**
- `src/app/(site)/analyst/page.tsx` — AI analyst main page
- `src/app/(site)/analyst/[conversationId]/page.tsx` — Conversation view
- `src/components/analyst/ChatInterface.tsx` — Chat UI
- `src/components/analyst/MessageBubble.tsx` — Message display
- `src/components/analyst/EvidenceCitation.tsx` — Evidence citation display
- `src/components/analyst/ConfidenceIndicator.tsx` — Confidence display
- `src/components/analyst/ToolCallDisplay.tsx` — Show tool invocations
- `src/components/analyst/SuggestedQuestions.tsx` — Question suggestions

**Testing:**
- Unit tests for analyst service
- Integration tests for conversation flow
- End-to-end tests for analyst interface
- Evidence grounding tests
- 120+ tests passing

**Deliverables:**
- AI analyst service
- Chat interface with evidence citations
- No-evidence handling
- 120+ tests passing

---

### Stage 10: Report Generation and Export (Weeks 19-22)

**Objective:** Build automated report generation with human review workflow.

#### Implementation Files

**Report Generation Service:**
- `src/lib/ai/reports/generator.ts` — AI-powered report generation
- `src/lib/ai/reports/templates.ts` — Report templates
- `src/lib/ai/reports/evidence-collector.ts` — Collect evidence for reports
- `src/lib/ai/reports/section-builder.ts` — Build report sections

**Report Types:**
- `src/lib/ai/reports/types/daily-brief.ts` — Daily market brief
- `src/lib/ai/reports/types/weekly-report.ts` — Weekly analysis
- `src/lib/ai/reports/types/monthly-outlook.ts` — Monthly outlook
- `src/lib/ai/reports/types/commodity-profile.ts` — Commodity profile
- `src/lib/ai/reports/types/regional-analysis.ts` — Regional analysis

**Export Service:**
- `src/lib/reports/export/pdf.ts` — PDF generation
- `src/lib/reports/export/csv.ts` — CSV export
- `src/lib/reports/export/web.ts` — Web-friendly format

**Review Workflow:**
- `src/lib/reports/review/service.ts` — Review management
- `src/lib/reports/review/queue.ts` — Review queue
- `src/lib/reports/review/approval.ts` — Approval workflow

**UI Components:**
- `src/app/(site)/research/generate/page.tsx` — Generate report
- `src/app/admin/research/review/page.tsx` — Review queue
- `src/app/admin/research/review/[id]/page.tsx` — Review detail
- `src/components/reports/ReportPreview.tsx` — Report preview
- `src/components/reports/ExportButton.tsx` — Export options

**Testing:**
- Unit tests for report generation
- Integration tests for export
- End-to-end tests for review workflow
- 100+ tests passing

**Deliverables:**
- Report generation service
- 5 report types
- Export to PDF/CSV
- Review workflow
- 100+ tests passing

---

### Stage 11: Analyst Research Workbench (Weeks 21-24)

**Objective:** Build the advanced research workbench at `/admin/research`.

#### Implementation Files

**Workbench Service:**
- `src/lib/research/workbench.ts` — Workbench service
- `src/lib/research/data-explorer.ts` — Data exploration tools
- `src/lib/research/analysis-tools.ts` — Analysis utilities

**Workbench Pages:**
- `src/app/admin/research/workbench/page.tsx` — Workbench main
- `src/app/admin/research/workbench/explorer/page.tsx` — Data explorer
- `src/app/admin/research/workbench/analysis/page.tsx` — Analysis tools
- `src/app/admin/research/workbench/drafts/page.tsx` — Draft reports

**Workbench Components:**
- `src/components/workbench/DataExplorer.tsx` — Interactive data browser
- `src/components/workbench/AnalysisPanel.tsx` — Analysis tools
- `src/components/workbench/DraftEditor.tsx` — Report editor
- `src/components/workbench/EvidencePanel.tsx` — Evidence browser
- `src/components/workbench/ChartBuilder.tsx` — Chart creation tool

**Testing:**
- Unit tests for workbench service
- Integration tests for data explorer
- End-to-end tests for research workflow
- 80+ tests passing

**Deliverables:**
- Research workbench
- Data explorer
- Analysis tools
- Draft editor
- 80+ tests passing

---

### Stage 12: Automated Research Production (Weeks 23-25)

**Objective:** Build scheduled job infrastructure for automated intelligence.

#### Implementation Files

**Scheduled Job Infrastructure:**
- `supabase/functions/scheduled-jobs/index.ts` — Job scheduler
- `supabase/functions/scheduled-jobs/daily-brief.ts` — Daily brief generation
- `supabase/functions/scheduled-jobs/weekly-report.ts` — Weekly report generation
- `supabase/functions/scheduled-jobs/monthly-outlook.ts` — Monthly outlook generation
- `supabase/functions/scheduled-jobs/data-sync.ts` — External data sync

**Job Management:**
- `src/lib/jobs/scheduler.ts` — Job scheduling service
- `src/lib/jobs/execution.ts` — Job execution tracking
- `src/lib/jobs/retry.ts` — Retry and error handling

**Monitoring:**
- `src/app/admin/jobs/page.tsx` — Job monitoring dashboard
- `src/app/admin/jobs/[id]/page.tsx` — Job detail
- `src/components/jobs/JobStatusCard.tsx` — Job status display
- `src/components/jobs/JobLog.tsx` — Job log viewer

**Testing:**
- Unit tests for scheduler
- Integration tests for job execution
- End-to-end tests for automated reports
- 60+ tests passing

**Deliverables:**
- Scheduled job infrastructure
- 5 automated jobs
- Job monitoring dashboard
- 60+ tests passing

---

### Stage 13: Business Intelligence Layer (Weeks 24-26)

**Objective:** Build organization-scoped intelligence and private data protection.

#### Implementation Files

**Business Intelligence Service:**
- `src/lib/intelligence/business.ts` — Organization-scoped intelligence
- `src/lib/intelligence/private-data.ts` — Private data handling
- `src/lib/intelligence/tenant-isolation.ts` — Tenant isolation enforcement

**Data Isolation:**
- `src/lib/auth/tenant-scoping.ts` — Tenant-scoped queries
- `src/lib/ai/retrieval/tenant-filter.ts` — Filter retrieval by tenant
- `src/lib/ai/tools/tenant-guard.ts` — Guard tools against cross-tenant access

**Business Intelligence UI:**
- `src/app/(site)/workspace/intelligence/overview/page.tsx` — BI overview
- `src/app/(site)/workspace/intelligence/opportunities/page.tsx` — Opportunities
- `src/app/(site)/workspace/intelligence/benchmarks/page.tsx` — Benchmarks
- `src/components/intelligence/BusinessDashboard.tsx` — BI dashboard

**Testing:**
- Unit tests for tenant isolation
- Security tests for data isolation
- Integration tests for business intelligence
- 80+ tests passing

**Deliverables:**
- Business intelligence service
- Tenant isolation enforcement
- Business intelligence UI
- 80+ tests passing

---

### Stage 14: Data Quality and Intelligence Monitoring (Weeks 25-26)

**Objective:** Build monitoring and quality assurance for intelligence production.

#### Implementation Files

**Quality Monitoring:**
- `src/lib/quality/intelligence-monitor.ts` — Intelligence quality monitoring
- `src/lib/quality/evidence-freshness.ts` — Evidence freshness tracking
- `src/lib/quality/ai-accuracy.ts` — AI response accuracy tracking

**Monitoring Dashboard:**
- `src/app/admin/monitoring/page.tsx` — Monitoring overview
- `src/app/admin/monitoring/quality/page.tsx` — Quality metrics
- `src/app/admin/monitoring/freshness/page.tsx` — Data freshness
- `src/app/admin/monitoring/ai/page.tsx` — AI performance

**Alerting:**
- `src/lib/monitoring/alerts.ts` — Quality alert generation
- `src/lib/monitoring/notifications.ts` — Alert delivery

**Testing:**
- Unit tests for monitoring
- Integration tests for alerting
- 50+ tests passing

**Deliverables:**
- Quality monitoring service
- Monitoring dashboard
- Alerting system
- 50+ tests passing

---

## Part 3: Entitlement Integration and Cost Management

### Entitlement Extensions

**Migration: `0044_ai_entitlements.sql`**

```sql
-- Add AI entitlement keys
INSERT INTO entitlement_catalog (key, name, description) VALUES
  ('ai_analyst_basic', 'AI Analyst (Basic)', 'Basic AI analyst access with limited queries'),
  ('ai_analyst_pro', 'AI Analyst (Pro)', 'Advanced AI analyst with unlimited queries'),
  ('research_reports', 'Research Reports', 'Access to automated research reports'),
  ('custom_research', 'Custom Research', 'Access to custom research generation'),
  ('business_intelligence', 'Business Intelligence', 'Access to business intelligence layer');

-- AI usage limits per entitlement
INSERT INTO ai_usage_limits (entitlement_key, daily_message_limit, monthly_message_limit, monthly_cost_limit_usd) VALUES
  ('ai_analyst_basic', 20, 300, 5.00),
  ('ai_analyst_pro', -1, -1, 50.00), -- -1 = unlimited messages
  ('research_reports', NULL, NULL, 20.00),
  ('custom_research', 5, 50, 25.00);
```

### Cost Management Strategy

**Budget Allocation ($100-200/month):**
- OpenAI GPT-4o-mini: ~$0.15/1M input tokens, ~$0.60/1M output tokens
- OpenAI ada-002 embeddings: ~$0.10/1M tokens
- Estimated monthly usage:
  - 5000 analyst messages × ~1000 tokens = ~5M tokens input + ~2.5M tokens output
  - Cost: ~$0.75 + $1.50 = ~$2.25/month (well within budget)
  - Embeddings: ~10M tokens = ~$1/month
  - Total: ~$3.25/month (very conservative)

**Cost Controls:**
1. Per-user daily message limits
2. Per-organization monthly cost limits
3. Model selection (use GPT-4o-mini for most tasks, GPT-4o for complex analysis)
4. Response caching for repeated queries
5. Token budget enforcement at API layer

---

## Part 4: Timeline Summary

| Phase | Stage | Duration | Weeks | Deliverables |
|-------|-------|----------|-------|--------------|
| 03 | Database Schema | 2 weeks | 1-2 | Migration 0034 |
| 03 | Data Ingestion | 3 weeks | 2-4 | FAOSTAT, USDA, NBS, CBN |
| 03 | Commodity Profiles | 2 weeks | 4-5 | Profile pages |
| 03 | Testing | 1 week | 5-6 | 100+ tests |
| 04 | Organizations | 2 weeks | 1-2 | Migration 0035 |
| 04 | Marketplace | 2 weeks | 2-3 | Migration 0036 |
| 04 | Opportunities | 2 weeks | 3-4 | Migration 0037 |
| 04 | RLS & Security | 1 week | 4-5 | Migration 0038 |
| 04 | Testing | 1 week | 5-6 | 200+ tests |
| 05 | Workspace | 2 weeks | 1-2 | Workspace pages |
| 05 | Business Intel | 1 week | 2-3 | Migration 0039 |
| 05 | Workspace Intel | 1 week | 3 | Intelligence pages |
| 05 | Testing | 1 week | 4 | 100+ tests |
| 06 | Evidence Engine | 4 weeks | 1-4 | Migration 0040 |
| 06 | External Data | 4 weeks | 3-6 | 4 integrations |
| 06 | Analytical Layer | 4 weeks | 5-8 | Migration 0041 |
| 06 | Commodity Intel | 4 weeks | 7-10 | Intelligence features |
| 06 | Research Mgmt | 4 weeks | 9-12 | Migration 0042 |
| 06 | AI Foundation | 4 weeks | 11-14 | Migration 0043 |
| 06 | AI Retrieval | 4 weeks | 13-16 | Retrieval system |
| 06 | AI Tools | 4 weeks | 15-18 | 15+ tools |
| 06 | AI Analyst UI | 4 weeks | 17-20 | Chat interface |
| 06 | Report Gen | 4 weeks | 19-22 | 5 report types |
| 06 | Workbench | 4 weeks | 21-24 | Research workbench |
| 06 | Automated Prod | 3 weeks | 23-25 | 5 scheduled jobs |
| 06 | Business Intel | 3 weeks | 24-26 | BI layer |
| 06 | Quality Monitor | 2 weeks | 25-26 | Monitoring system |

**Total Duration: ~26 weeks (6 months) for Phase 06**
**With Phases 03-05: ~37 weeks (9 months) total**

---

## Part 5: Risk Mitigation

### Risk 1: LLM Provider Dependency
- **Mitigation:** Provider abstraction layer supports multiple providers
- **Fallback:** Switch providers without code changes

### Risk 2: Data Source Availability
- **Mitigation:** Store raw data locally, don't depend on real-time API access
- **Fallback:** Manual data upload for critical sources

### Risk 3: AI Cost Overrun
- **Mitigation:** Strict usage limits, cost tracking, budget alerts
- **Fallback:** Automatic service degradation when limits reached

### Risk 4: AI Hallucination
- **Mitigation:** Evidence-grounded responses only, no-evidence handling
- **Fallback:** Human review workflow for all published reports

### Risk 5: Privacy Breach
- **Mitigation:** RLS policies, tenant isolation, permission-aware retrieval
- **Fallback:** Regular security audits, penetration testing

### Risk 6: Performance Degradation
- **Mitigation:** Query optimization, caching, connection pooling
- **Fallback:** Scale Supabase infrastructure as needed

---

## Part 6: Definition of Done

### Phase 06 Complete When:

1. ✅ Evidence provenance engine tracks all data sources
2. ✅ 4 external data sources integrated (FAOSTAT, USDA, NBS, CBN)
3. ✅ Permission-aware analytical data layer operational
4. ✅ Commodity fundamentals analysis available
5. ✅ Regional intelligence with evidence-backed profiles
6. ✅ Trade intelligence with flow analysis
7. ✅ Research management system with workflow
8. ✅ Daily/weekly/monthly briefs generated automatically
9. ✅ AI analyst provides evidence-grounded responses
10. ✅ AI never fabricates data or citations
11. ✅ No-evidence responses clearly state insufficient data
12. ✅ Hybrid retrieval (structured + document) operational
13. ✅ 15+ read-only AI tools functional
14. ✅ Organization-scoped data isolation enforced
15. ✅ Report generation with human review workflow
16. ✅ PDF and CSV export functional
17. ✅ Analyst workbench operational at /admin/research
18. ✅ Scheduled jobs producing automated intelligence
19. ✅ Quality monitoring active
20. ✅ Entitlement engine controls AI access
21. ✅ Cost tracking and budget enforcement active
22. ✅ Prompt injection protection in place
23. ✅ No cross-tenant data leakage possible
24. ✅ All AI interactions logged and auditable
25. ✅ 1000+ tests passing across all phases
26. ✅ Build succeeds with zero errors
27. ✅ Documentation complete for all features
28. ✅ Security audit passed

---

## Part 7: Required Documents

| Document | Status | Location |
|----------|--------|----------|
| PHASE-06-BASELINE-AUDIT.md | ✅ Complete | `docs/audits/phase-06/` |
| PHASE-06-IMPLEMENTATION-PLAN.md | ✅ Complete | `docs/audits/phase-06/` |
| PHASE-06-ARCHITECTURE.md | Pending | `docs/audits/phase-06/` |
| PHASE-06-EVIDENCE-AND-PROVENANCE.md | Pending | `docs/audits/phase-06/` |
| PHASE-06-ANALYTICS-METHODOLOGY.md | Pending | `docs/audits/phase-06/` |
| PHASE-06-AI-RETRIEVAL-AND-GOVERNANCE.md | Pending | `docs/audits/phase-06/` |
| PHASE-06-SECURITY-AND-PRIVACY.md | Pending | `docs/audits/phase-06/` |
| PHASE-06-API-REFERENCE.md | Pending | `docs/audits/phase-06/` |
| PHASE-06-TEST-REPORT.md | Pending | `docs/audits/phase-06/` |
| PHASE-06-FINAL-REPORT.md | Pending | `docs/audits/phase-06/` |

---

**Document Version:** 1.0
**Last Updated:** 2026-11-14
**Next Review:** After owner approval to proceed with Phases 03-05