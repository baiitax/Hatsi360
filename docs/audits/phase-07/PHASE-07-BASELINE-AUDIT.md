# Phase 07 — Global Trade Intelligence Baseline Audit

**Phase:** 07 — Global Trade Intelligence  
**Date:** 2026-01-XX  
**Auditor:** AI Assistant  
**Status:** Stage 1 Complete (Audit Phase)

---

## Executive Summary

Phase 07 aims to transform Hatsi360 from a Nigerian agricultural market intelligence platform into a comprehensive African-to-global trade intelligence system. This audit establishes the current state of the repository, evaluates Phases 00-06 implementation status, identifies reusable infrastructure, and maps dependencies for Phase 07 implementation.

### Key Findings

1. **Phase 06 (Commodity Intelligence) is production-ready** with 130 FAOSTAT records, 5 analytical views, and a complete UI
2. **Database foundation is solid** with 35 migrations, comprehensive RLS policies, and proper provenance tracking
3. **Geographic data is limited** — only Nigeria exists in the countries table; Phase 07 requires significant geographic expansion
4. **International trade data infrastructure is minimal** — only basic commodity_trade table exists with 22 records
5. **HS classification system does not exist** — critical gap for international trade intelligence
6. **No external trade data integrations** beyond FAOSTAT production/supply/demand data
7. **Market access and regulatory intelligence infrastructure is absent** — must be built from scratch

### Critical Gaps for Phase 07

| Gap | Severity | Impact |
|-----|----------|--------|
| No HS classification system | **CRITICAL** | Cannot map commodities to international trade codes |
| Limited geographic coverage (1 country) | **CRITICAL** | Cannot analyze international trade flows |
| No international trade data sources | **HIGH** | No UN Comtrade, ITC Trade Map, or WTO data |
| No market access/regulatory infrastructure | **HIGH** | Cannot provide export readiness intelligence |
| No tariff schedule system | **HIGH** | Cannot provide duty/tariff intelligence |
| No trade agreement database | **MEDIUM** | Cannot analyze preferential trade arrangements |

### Recommendation

Phase 07 is feasible but requires significant foundational work before trade intelligence features can be delivered. The implementation must follow a staged approach:

1. **Stage 2:** Geographic and classification foundation (countries, HS codes, trade blocs)
2. **Stage 3:** International trade data engine (source adapters, ingestion, validation)
3. **Stage 4:** Trade intelligence analytics (country/commodity profiles, trade flows)
4. **Stage 5-12:** Market access, export readiness, AI integration, etc.

**Estimated Timeline:** 6-9 months for core trade intelligence capabilities

---

## 1. Repository State Assessment

### 1.1 Current Commit and Branch

```
Commit: 63c5d5e (Phase 06 Stage 2: Commodity Intelligence Foundation)
Branch: main
Status: Clean working tree
Last Modified: 2026-01-XX
```

### 1.2 Repository Structure

```
hatsi360/
├── src/
│   ├── app/                    # Next.js 16 App Router
│   │   ├── (portal)/           # Auth pages (login, register, etc.)
│   │   ├── (site)/             # Public site pages
│   │   │   ├── commodities/    # Commodity pages
│   │   │   ├── markets/        # Market pages
│   │   │   ├── trade/          # Trade terminal
│   │   │   └── intelligence/   # Phase 06 intelligence pages
│   │   ├── admin/              # Admin console (29 pages)
│   │   ├── agent/              # Field agent app
│   │   ├── api/                # API routes
│   │   └── intelligence/       # Phase 06 intelligence (2 pages)
│   ├── components/             # 71 components across 16 directories
│   │   ├── intelligence/       # Phase 06 UI components (5)
│   │   ├── terminal/           # Trade terminal components
│   │   ├── ops/                # Operations components
│   │   └── ui/                 # Shared UI components
│   ├── lib/                    # Business logic and services
│   │   ├── intelligence/       # Phase 06 intelligence services
│   │   │   ├── ingestion/      # FAOSTAT, USDA, CBN ingestion
│   │   │   ├── service.ts      # Core intelligence service
│   │   │   └── types.ts        # Type definitions
│   │   ├── trade/              # Trade engine
│   │   ├── analytics/          # Analytics services
│   │   ├── quality/            # Quality engine
│   │   ├── entitlements.ts     # Entitlement engine (188 lines)
│   │   └── auth/               # Authentication and authorization
│   └── types/                  # TypeScript type definitions
├── supabase/
│   ├── migrations/             # 35 migration files (0001-0035)
│   └── functions/              # Edge functions (FAOSTAT sync)
├── tests/                      # 38 test files, 848 tests
└── docs/audits/                # Phase audit documentation
```

### 1.3 Technology Stack

- **Framework:** Next.js 16.4.2 (App Router)
- **React:** 19.3.1
- **TypeScript:** Strict mode enabled
- **Database:** Supabase PostgreSQL 17
- **Styling:** Tailwind CSS
- **Testing:** Vitest 5.0.5
- **Deployment:** Vercel

---

## 2. Previous Phases Audit

### 2.1 Phase 00 — Production Safety and Technical Stabilisation

**Status:** ✅ COMPLETE  
**Commit:** 6a82bd6

**Implemented Capabilities:**
- Database schema foundation (core reference tables)
- Row-level security (RLS) policies
- Authentication and authorization
- Price observation schema with provenance
- Quality rules engine (9 rules)
- Test infrastructure (Vitest)

**Database Tables:**
- `commodities` (22 records)
- `markets` (11 records)
- `states` (11 records)
- `countries` (1 record — Nigeria only)
- `commodity_grades` (58 records)
- `measurement_units` (8 records)
- `profiles` (5 records)

**Key Findings:**
- Solid technical foundation
- Comprehensive RLS policies
- Quality engine operational
- **Limitation:** Only Nigeria in countries table

**Reusability for Phase 07:**
- ✅ Authentication/authorization can be reused
- ✅ RLS patterns can be extended
- ✅ Quality engine can be adapted for trade data
- ❌ Geographic data must be expanded significantly

---

### 2.2 Phase 01 — Market Data Activation

**Status:** ✅ COMPLETE  
**Commit:** c9fe6b2

**Implemented Capabilities:**
- Price observation pipeline (field collection → verification → publication)
- Market coverage tracking
- Agent assignment system
- Collection scheduling
- Quality verification workflow
- Analytics and reporting

**Database Tables:**
- `price_observations` (58 records, 0 published)
- `market_commodity_scope` (36 records)
- `market_collection_schedules` (11 records)
- `market_agent_assignments` (6 records)
- `collection_batches` (10 records)
- `collection_tasks` (4 records)

**Views:**
- `published_price_observations`
- `market_price_summary`

**Key Findings:**
- Complete data collection pipeline
- Quality verification workflow operational
- Analytics views functional
- **Limitation:** No published observations (all in draft/verified state)

**Reusability for Phase 07:**
- ✅ Data ingestion patterns can be adapted for trade data
- ✅ Quality verification workflow applicable to trade data
- ✅ Analytics view patterns reusable
- ❌ No international trade data collection capability

---

### 2.3 Phase 02 — Market Terminal and Visualization

**Status:** ✅ COMPLETE  
**Commit:** 190faeb, 68b2589

**Implemented Capabilities:**
- Terminal design system (tokens, components)
- 15 page prototypes
- Chart components (Recharts integration)
- Responsive layouts
- Premium visual identity

**Components:**
- 71 components across 16 directories
- Terminal-specific components
- Chart components
- Data visualization components

**Key Findings:**
- Professional design system established
- Chart infrastructure operational
- Responsive design patterns established
- **Limitation:** Terminal is Nigeria-focused

**Reusability for Phase 07:**
- ✅ Design system can be extended for trade intelligence UI
- ✅ Chart components reusable for trade flow visualization
- ✅ Responsive patterns applicable
- ❌ Terminal must be adapted for international trade analysis

---

### 2.4 Phase 03 — Commodity Intelligence

**Status:** ⚠️ AUDIT ONLY (No Implementation)  
**Commit:** 1d3707c

**Audit Findings:**
- Comprehensive audit completed
- No implementation performed
- Identified need for production, supply, demand, and trade data
- Recommended FAOSTAT, USDA, and national statistics integration

**Key Findings:**
- Clear requirements documented
- Data source opportunities identified
- **Limitation:** No code written

**Reusability for Phase 07:**
- ✅ Requirements and architecture can inform Phase 07 design
- ❌ No reusable code

---

### 2.5 Phase 04 — Trade Marketplace

**Status:** ⚠️ AUDIT ONLY (No Implementation)  
**Commit:** 1a6644d

**Audit Findings:**
- Marketplace infrastructure audited
- Buyer/seller offer schema exists but empty
- No marketplace UI or workflow implemented
- 11-stage implementation plan created

**Database Tables:**
- `buyer_offers` (15 records — test data)
- `seller_offers` (15 records — test data)
- `offer_verification_events` (69 records)

**Key Findings:**
- Basic offer schema exists
- Verification workflow partially implemented
- **Limitation:** No functional marketplace

**Reusability for Phase 07:**
- ✅ Offer schema can be extended for trade opportunities
- ⚠️ Marketplace must be implemented before trade intelligence integration
- ❌ No buyer/seller matching capability

---

### 2.6 Phase 05 — Business Workspace

**Status:** ⚠️ AUDIT ONLY (No Implementation)  
**Commit:** a6617e5

**Audit Findings:**
- Workspace requirements audited
- Two-track implementation plan created
- Depends on Phase 04 marketplace implementation
- No code written

**Database Tables:**
- `organizations` (0 records)
- `organization_members` (0 records)

**Key Findings:**
- Clear requirements documented
- **Limitation:** No workspace infrastructure

**Reusability for Phase 07:**
- ✅ Organization model can be used for trade workspace
- ❌ No reusable code

---

### 2.7 Phase 06 — Commodity Intelligence and AI Analyst

**Status:** ✅ STAGES 1-4 COMPLETE  
**Commit:** 8690573, 63c5d5e

**Implemented Capabilities:**

**Stage 1:** Baseline audit and implementation plan
**Stage 2:** FAOSTAT data population (130 records)
**Stage 3:** Analytical views (5 views)
**Stage 4:** Commodity intelligence UI (5 components, 2 pages)

**Database Tables:**
- `commodity_production` (48 records)
- `commodity_supply` (30 records)
- `commodity_demand` (30 records)
- `commodity_trade` (22 records)
- `evidence_sources` (4 records — FAOSTAT, USDA, NBS, CBN)
- `source_sync_events` (0 records)

**Views:**
- `analytics_production_trends`
- `analytics_supply_demand_balance`
- `analytics_trade_summary`
- `analytics_commodity_overview`
- `analytics_intelligence_dashboard`

**Components:**
- `IntelligencePage.tsx`
- `ProductionChart.tsx`
- `SupplyDemandChart.tsx`
- `TradeFlowChart.tsx`
- `EvidenceBadge.tsx`

**Pages:**
- `/intelligence` — Intelligence index
- `/intelligence/[slug]` — Commodity detail

**Services:**
- `src/lib/intelligence/service.ts` — Core intelligence service
- `src/lib/intelligence/ingestion/faostat.ts` — FAOSTAT ingestion
- `src/lib/intelligence/ingestion/usda-fas.ts` — USDA ingestion
- `src/lib/intelligence/ingestion/cbn.ts` — CBN ingestion
- `src/lib/intelligence/ingestion/orchestrator.ts` — Ingestion orchestrator

**Edge Functions:**
- `supabase/functions/sync-faostat/index.ts` — FAOSTAT sync

**Key Findings:**
- Production-ready commodity intelligence
- FAOSTAT data integration operational
- Analytical views providing pre-computed metrics
- Professional UI with charts and visualizations
- **Limitation:** Nigeria-only, no international trade data, no HS codes

**Reusability for Phase 07:**
- ✅ Intelligence service architecture can be extended
- ✅ Ingestion framework can be adapted for trade data sources
- ✅ Analytical view patterns reusable
- ✅ UI components and design patterns reusable
- ✅ Evidence provenance system applicable to trade data
- ❌ No international trade data (only domestic production/supply/demand)
- ❌ No HS classification system
- ❌ No multi-country support

---

## 3. Database Schema Audit

### 3.1 Migration Inventory

**Total Migrations:** 35 (0001-0035)

**Breakdown by Phase:**
- Phase 00: Migrations 0001-0009 (core schema, RLS, reference data)
- Phase 01: Migrations 0010-0013 (operations, quality, analytics)
- Phase 02: No migrations (UI only)
- Phase 03: No migrations (audit only)
- Phase 04: Migrations 0026-0031 (offers, workflow, RLS)
- Phase 05: No migrations (audit only)
- Phase 06: Migrations 0034-0035 (commodity intelligence, analytics views)

**Migration Quality:**
- ✅ All migrations use `IF NOT EXISTS` / `IF EXISTS` guards
- ✅ Proper foreign key constraints
- ✅ Comprehensive indexes
- ✅ RLS policies on sensitive tables
- ✅ Audit triggers on key tables
- ✅ Consistent naming conventions

### 3.2 Core Tables Inventory

**Total Tables:** 60+ tables  
**Tables with Data:** 30+ tables  
**Total Records:** 500+ records

**Key Tables for Phase 07:**

| Table | Records | Phase 07 Relevance |
|-------|---------|-------------------|
| `countries` | 1 | ❌ Must expand to 200+ countries |
| `commodities` | 22 | ✅ Can be extended with HS mappings |
| `commodity_trade` | 22 | ⚠️ Basic structure, needs enhancement |
| `evidence_sources` | 4 | ✅ Can be extended for trade data sources |
| `organizations` | 0 | ⚠️ Needed for trade workspace |

### 3.3 Geographic Data Assessment

**Current State:**
- `countries` table: 1 record (Nigeria)
- `states` table: 11 records (Nigerian states)
- `markets` table: 11 records (Nigerian markets)

**Phase 07 Requirements:**
- 200+ countries with ISO codes, currencies, regions
- Trade bloc memberships (AfCFTA, ECOWAS, EU, etc.)
- Geographic coordinates for visualization
- Regional hierarchies (continent → region → country)

**Gap Analysis:**
- ❌ No international country data
- ❌ No trade bloc data
- ❌ No geographic coordinate system for countries
- ❌ No regional classification system

**Estimated Effort:** 1-2 weeks to build comprehensive geographic foundation

### 3.4 Commodity Classification Assessment

**Current State:**
- `commodities` table: 22 commodities
- `commodity_grades` table: 58 grades
- `commodity_categories` table: 14 categories
- `commodity_synonyms` table: 42 synonyms

**Phase 07 Requirements:**
- Harmonized System (HS) classification codes
- HS nomenclature revisions (2017, 2022, etc.)
- Commodity-to-HS mapping (many-to-many)
- HS code hierarchy (chapter → heading → subheading)
- Classification mapping confidence and source tracking

**Gap Analysis:**
- ❌ No HS classification tables
- ❌ No HS revision management
- ❌ No commodity-to-HS mapping
- ❌ No classification hierarchy

**Estimated Effort:** 2-3 weeks to build HS classification system

### 3.5 Trade Data Assessment

**Current State:**
- `commodity_trade` table: 22 records
- Basic structure: commodity_id, flow_type (import/export), partner_country, year, quantity_mt, value_usd
- No HS codes
- No source tracking beyond evidence_sources reference
- No detailed provenance

**Phase 07 Requirements:**
- Comprehensive international trade records
- HS code classification
- Reporting country and partner country
- Trade value and quantity with units
- Currency and valuation basis
- Source dataset and original record ID
- Detailed provenance (retrieval date, publication date, methodology)
- Validation status and quality checks

**Gap Analysis:**
- ❌ No HS codes in trade records
- ❌ No detailed provenance
- ❌ No validation framework
- ❌ No source record identity
- ❌ Limited to 22 records

**Estimated Effort:** 3-4 weeks to build comprehensive trade data infrastructure

---

## 4. Data Source Assessment

### 4.1 Current Data Sources

**Phase 06 Sources:**
1. **FAOSTAT** — Production, supply, demand data
   - Status: ✅ Integrated (48 production, 30 supply, 30 demand records)
   - Coverage: Nigeria, 8 commodities, 2018-2023
   - License: CC BY-NC-SA 3.0 IGO
   - Access: API available

2. **USDA FAS** — Supply/demand balance sheets
   - Status: ⚠️ Ingestion code written, no data ingested
   - Coverage: Potential global coverage
   - License: Public domain (US government)
   - Access: API available

3. **NBS (Nigeria)** — Nigerian agricultural statistics
   - Status: ⚠️ Ingestion code written, no data ingested
   - Coverage: Nigeria only
   - License: Public domain
   - Access: Manual download

4. **CBN (Nigeria)** — Exchange rates
   - Status: ⚠️ Ingestion code written, no data ingested
   - Coverage: Nigeria only
   - License: Public domain
   - Access: API available

### 4.2 Phase 07 Data Source Requirements

**Priority 1 — International Trade Statistics:**

1. **UN Comtrade**
   - Coverage: 200+ countries, comprehensive trade data
   - Data: Import/export values and quantities by HS code
   - Access: API (subscription required for full access)
   - License: Commercial (requires subscription)
   - Status: ❌ Not integrated
   - Priority: **CRITICAL**

2. **ITC Trade Map**
   - Coverage: 220+ countries
   - Data: Trade statistics, market trends, competitor analysis
   - Access: Free registration, some paid features
   - License: Free for non-commercial, commercial requires agreement
   - Status: ❌ Not integrated
   - Priority: **CRITICAL**

3. **World Integrated Trade Solution (WITS)**
   - Coverage: Global
   - Data: Trade flows, tariffs, non-tariff measures
   - Access: Free (World Bank)
   - License: Public domain
   - Status: ❌ Not integrated
   - Priority: **HIGH**

**Priority 2 — Agricultural Production and Supply:**

4. **FAOSTAT (Extended)**
   - Coverage: Global agricultural production, trade
   - Data: Already integrated for production/supply/demand
   - Extension needed: Trade data by HS code
   - Status: ✅ Partially integrated
   - Priority: **HIGH**

5. **USDA PSD Online**
   - Coverage: Major commodities, key countries
   - Data: Production, supply, distribution
   - Access: Free API
   - License: Public domain
   - Status: ⚠️ Code written, not deployed
   - Priority: **MEDIUM**

**Priority 3 — Tariffs and Market Access:**

6. **WTO Tariff Database**
   - Coverage: WTO members
   - Data: Bound and applied tariffs
   - Access: Free
   - License: Public domain
   - Status: ❌ Not integrated
   - Priority: **HIGH**

7. **MAcMAP (Market Access Map)**
   - Coverage: Global
   - Data: Tariffs, quotas, trade regulations
   - Access: Free registration
   - License: Free for non-commercial
   - Status: ❌ Not integrated
   - Priority: **HIGH**

8. **UNCTAD TRAINS**
   - Coverage: Global
   - Data: Tariffs, non-tariff measures, trade flows
   - Access: Free
   - License: Public domain
   - Status: ❌ Not integrated
   - Priority: **MEDIUM**

**Priority 4 — Trade Agreements:**

9. **WTO RTA Database**
   - Coverage: Regional trade agreements
   - Data: Agreement text, rules of origin, commitments
   - Access: Free
   - License: Public domain
   - Status: ❌ Not integrated
   - Priority: **MEDIUM**

10. **AfCFTA Secretariat Data**
    - Coverage: African countries
    - Data: AfCFTA agreement, schedules, rules of origin
    - Access: Limited (requires agreement)
    - License: Varies
    - Status: ❌ Not integrated
    - Priority: **HIGH** (for African trade focus)

### 4.3 Data Source Licensing Assessment

**Critical Licensing Considerations:**

1. **UN Comtrade** — Commercial subscription required
   - Cost: $5,000-20,000/year depending on access level
   - Restrictions: Cannot redistribute raw data
   - Permitted: Can build analytical products on top
   - Recommendation: **Required for comprehensive trade intelligence**

2. **ITC Trade Map** — Free for non-commercial
   - Cost: Free with registration
   - Restrictions: Non-commercial use only
   - Permitted: Research, analysis, non-commercial products
   - Recommendation: **Excellent starting point**

3. **FAOSTAT** — CC BY-NC-SA 3.0 IGO
   - Cost: Free
   - Restrictions: Non-commercial, share-alike, attribution
   - Permitted: Analytical products with attribution
   - Recommendation: ✅ Already integrated, can extend

4. **WTO/WITS/UNCTAD** — Public domain
   - Cost: Free
   - Restrictions: Attribution required
   - Permitted: Full use with attribution
   - Recommendation: **Excellent free sources**

**Licensing Strategy:**
- Start with free sources (ITC Trade Map, FAOSTAT, WTO, WITS)
- Evaluate UN Comtrade subscription based on commercial requirements
- Ensure all data includes proper attribution
- Build abstraction layer to support multiple sources

### 4.4 Data Source Integration Priority

**Phase 1 (Months 1-3):**
1. Expand FAOSTAT to include trade data by HS code
2. Integrate ITC Trade Map (free, comprehensive)
3. Integrate WTO tariff data (free)

**Phase 2 (Months 4-6):**
4. Integrate WITS (free, comprehensive)
5. Integrate UNCTAD TRAINS (free)
6. Evaluate and integrate UN Comtrade (if budget allows)

**Phase 3 (Months 7-9):**
7. Integrate AfCFTA data
8. Integrate national customs data (where available)
9. Build automated sync and update pipelines

---

## 5. Architecture and Infrastructure Assessment

### 5.1 Authentication and Authorization

**Current State:**
- Supabase Auth operational
- Role-based access control (admin, agent, customer, etc.)
- RLS policies on sensitive tables
- Organization membership model (schema exists, not implemented)

**Phase 07 Requirements:**
- Same authentication system ✅
- Extended role model (trade analyst, researcher, etc.)
- Organization-scoped trade research
- Tenant isolation for private research

**Reusability:** ✅ Can be reused and extended

### 5.2 API Architecture

**Current State:**
- Next.js API routes
- Supabase client for database access
- RESTful patterns established
- Input validation patterns

**Phase 07 Requirements:**
- Trade data query APIs
- Country/commodity profile APIs
- Trade flow aggregation APIs
- HS code lookup APIs
- Tariff lookup APIs

**Reusability:** ✅ Patterns can be reused, new endpoints needed

### 5.3 Data Ingestion Infrastructure

**Current State:**
- Phase 06 ingestion framework operational
- Source adapter pattern established
- Provenance tracking implemented
- Sync event logging

**Phase 07 Requirements:**
- Extend ingestion framework for trade data
- Support for UN Comtrade, ITC, WTO, etc.
- HS code mapping during ingestion
- Validation and quality checks
- Incremental updates

**Reusability:** ✅ Framework can be extended, new adapters needed

### 5.4 Analytics and Reporting

**Current State:**
- Analytical views for Phase 06 data
- Chart components (Recharts)
- KPI cards and dashboards
- Export capabilities (basic)

**Phase 07 Requirements:**
- Trade flow analytics views
- Country/commodity comparison views
- Geographic visualization
- Advanced charting (trade flow diagrams, maps)
- Export to PDF/Excel

**Reusability:** ✅ Patterns and components reusable

### 5.5 Search Infrastructure

**Current State:**
- Basic search in admin console
- No full-text search
- No faceted search

**Phase 07 Requirements:**
- Unified search across trade data
- Search by commodity, HS code, country, partner
- Faceted filtering
- Search result ranking

**Reusability:** ⚠️ Basic patterns exist, significant enhancement needed

### 5.6 AI and Intelligence

**Current State:**
- Phase 06 AI analyst (planned, not implemented)
- Evidence-grounded response architecture
- Retrieval patterns defined

**Phase 07 Requirements:**
- Extend AI analyst for trade intelligence
- Trade data retrieval tools
- Market access question answering
- Export readiness guidance

**Reusability:** ✅ Architecture can be extended

---

## 6. Testing and Quality Assurance

### 6.1 Current Test Coverage

**Test Framework:** Vitest 5.0.5  
**Test Files:** 38  
**Total Tests:** 848  
**Pass Rate:** 99.8% (846 passed, 2 failed)

**Test Categories:**
- Unit tests: ✅ Comprehensive
- Integration tests: ✅ Operational
- Security tests: ✅ RLS and permissions
- Data integrity tests: ✅ Provenance and validation

**Failed Tests (Pre-existing):**
1. `tests/admin/admin-commercial.test.ts` — Missing /admin/coverage page
2. `tests/auth/demo-access.test.ts` — Demo authentication issue

**Note:** Both failures are pre-existing and unrelated to Phase 07

### 6.2 Phase 07 Testing Requirements

**New Test Categories Needed:**
1. HS classification mapping tests
2. Trade data ingestion tests
3. Trade flow aggregation tests
4. Country/commodity profile tests
5. Market access requirement tests
6. Tariff calculation tests
7. Geographic data tests
8. Trade agreement applicability tests

**Estimated Test Count:** 200-300 new tests

**Reusability:** ✅ Test patterns and infrastructure can be reused

---

## 7. Security and Compliance

### 7.1 Current Security Posture

**Authentication:** ✅ Supabase Auth operational  
**Authorization:** ✅ Role-based access control  
**RLS Policies:** ✅ Comprehensive policies  
**Data Validation:** ✅ Quality rules engine  
**Audit Logging:** ✅ Audit logs on key tables  
**Credential Management:** ✅ Environment variables, no hardcoded secrets

### 7.2 Phase 07 Security Requirements

**New Security Considerations:**
1. Trade data access control (public vs. restricted)
2. Organization-scoped research isolation
3. API rate limiting for trade data queries
4. Source credential protection (UN Comtrade API keys, etc.)
5. Data licensing compliance (attribution, redistribution restrictions)
6. Export control compliance (sanctions, restricted countries)

**Reusability:** ✅ Security patterns can be extended

---

## 8. Performance and Scalability

### 8.1 Current Performance

**Database:** PostgreSQL 17 (Supabase)  
**Query Performance:** ✅ Optimized with indexes  
**Page Load Times:** ✅ Next.js SSR/SSG  
**API Response Times:** ✅ Acceptable

### 8.2 Phase 07 Performance Considerations

**Potential Performance Challenges:**
1. Large trade datasets (millions of records)
2. Complex aggregations (trade flows by country/commodity/year)
3. Geographic queries (country lookups, coordinate calculations)
4. HS code hierarchy queries (recursive parent/child lookups)

**Mitigation Strategies:**
1. Materialized views for common aggregations
2. Strategic indexing (country, commodity, year, HS code)
3. Pagination for large result sets
4. Caching for frequently accessed data
5. Background processing for heavy computations

**Estimated Infrastructure Needs:**
- Database: May need to upgrade Supabase plan for large datasets
- Compute: Edge functions for heavy processing
- Storage: For raw trade data files (if licensing permits)

---

## 9. Implementation Readiness Assessment

### 9.1 What Can Be Reused

✅ **Can be reused:**
- Authentication and authorization system
- RLS policy patterns
- Data ingestion framework (extend for trade data)
- Evidence provenance system
- Quality rules engine (adapt for trade data)
- Analytical view patterns
- UI component library
- Chart components
- Design system
- Test infrastructure
- API patterns

⚠️ **Can be extended:**
- Commodity table (add HS mappings)
- Evidence sources table (add trade data sources)
- Intelligence service (extend for trade intelligence)
- Ingestion orchestrator (add trade data adapters)

❌ **Must be built from scratch:**
- HS classification system
- International trade data infrastructure
- Multi-country geographic data
- Market access/regulatory system
- Tariff schedule system
- Trade agreement database
- Export readiness workflow
- Trade flow visualization

### 9.2 Critical Dependencies

**Phase 07 depends on:**

1. **Phase 06 (Commodity Intelligence)** ✅ COMPLETE
   - Intelligence service architecture
   - Ingestion framework
   - Evidence provenance

2. **Geographic Data Expansion** ❌ NOT STARTED
   - Must build country database (200+ countries)
   - Must build trade bloc data
   - Must build geographic coordinates

3. **HS Classification System** ❌ NOT STARTED
   - Must build HS code database
   - Must build commodity-to-HS mapping
   - Must build revision management

4. **International Trade Data Sources** ❌ NOT STARTED
   - Must integrate at least one major source (UN Comtrade, ITC Trade Map)
   - Must build ingestion adapters
   - Must build validation framework

### 9.3 Risk Assessment

**High-Risk Areas:**

1. **Data Source Access**
   - Risk: UN Comtrade subscription cost ($5,000-20,000/year)
   - Mitigation: Start with free sources (ITC Trade Map, WTO, WITS)
   - Impact: May limit data comprehensiveness

2. **HS Classification Complexity**
   - Risk: HS codes are complex, many-to-many mappings
   - Mitigation: Start with major commodities, expand gradually
   - Impact: May delay full commodity coverage

3. **Data Volume and Performance**
   - Risk: Trade datasets can be very large (millions of records)
   - Mitigation: Use materialized views, strategic indexing
   - Impact: May require database scaling

4. **Licensing Compliance**
   - Risk: Different sources have different licensing terms
   - Mitigation: Build attribution system, track licensing per source
   - Impact: May limit data redistribution

**Medium-Risk Areas:**

5. **Multi-Country Support**
   - Risk: Current system is Nigeria-focused
   - Mitigation: Gradually expand country coverage
   - Impact: Initial coverage may be limited

6. **Market Access Data**
   - Risk: Regulatory data is complex and changes frequently
   - Mitigation: Start with major destinations, manual research
   - Impact: May not have comprehensive coverage initially

---

## 10. Implementation Recommendations

### 10.1 Recommended Implementation Sequence

**Stage 2 — Geographic and Classification Foundation (Weeks 1-4)**
- Expand countries table (200+ countries)
- Build HS classification system
- Build commodity-to-HS mapping
- Build trade bloc database
- Build geographic coordinate system

**Stage 3 — International Trade Data Engine (Weeks 5-10)**
- Integrate ITC Trade Map (free, comprehensive)
- Integrate FAOSTAT trade data (extend existing integration)
- Integrate WTO tariff data
- Build ingestion adapters
- Build validation framework
- Build provenance tracking

**Stage 4 — Trade Intelligence Analytics (Weeks 11-16)**
- Build country trade profiles
- Build commodity trade profiles
- Build trade flow explorer
- Build trade rankings and comparisons
- Build geographic visualization
- Build data coverage reporting

**Stage 5 — Market Discovery (Weeks 17-20)**
- Build destination market discovery
- Build country comparison engine
- Build commodity destination analysis
- Build African exporter positioning

**Stage 6 — Market Access Intelligence (Weeks 21-26)**
- Build regulatory source management
- Build market access requirements
- Build tariff research
- Build trade agreement intelligence
- Build review and publication workflows

**Stage 7 — Export Readiness (Weeks 27-30)**
- Build export readiness checklists
- Build supporting evidence system
- Build document attachment
- Build team assignment
- Build completion tracking

**Stage 8 — Trade Corridor Intelligence (Weeks 31-34)**
- Build corridor profiles
- Build logistics information
- Build landed-cost estimation (where data available)

**Stage 9 — Phase 04/05 Integration (Weeks 35-38)**
- Connect marketplace to trade intelligence
- Connect workspace to trade research
- Build trade opportunity connections

**Stage 10 — Phase 06 AI Integration (Weeks 39-42)**
- Extend AI analyst for trade intelligence
- Build trade data retrieval tools
- Build market assessment generation

**Stage 11 — Entitlements and Commercialization (Weeks 43-46)**
- Integrate with entitlement engine
- Build access control for trade features
- Build usage tracking

**Stage 12 — Production Readiness (Weeks 47-52)**
- Security review
- Performance testing
- Documentation
- Monitoring
- Deployment

### 10.2 Estimated Timeline

**Total Estimated Duration:** 12 months (52 weeks)

**Breakdown:**
- Months 1-2: Geographic and classification foundation
- Months 3-4: Trade data engine (Phase 1 sources)
- Months 5-6: Trade intelligence analytics
- Months 7-8: Market discovery and access
- Months 9-10: Export readiness and corridors
- Months 11-12: Integration, AI, commercialization, production readiness

### 10.3 Resource Requirements

**Development:**
- 1 senior full-stack developer (lead)
- 1 backend developer (data ingestion, APIs)
- 1 frontend developer (UI, visualization)
- 1 data engineer (trade data, HS classification)

**Data and Research:**
- 1 trade data researcher (source integration, validation)
- 1 market access researcher (regulatory data, tariffs)

**Infrastructure:**
- Supabase Pro plan ($25/month) or Team plan ($599/month) for scale
- UN Comtrade subscription ($5,000-20,000/year) — optional
- Vercel Pro plan ($20/month)

**Total Estimated Cost:**
- Development: $150,000-200,000 (contractor rates)
- Data/Research: $50,000-80,000
- Infrastructure: $10,000-30,000/year
- **Total: $210,000-310,000** (excluding UN Comtrade subscription)

---

## 11. Conclusion and Next Steps

### 11.1 Key Conclusions

1. **Phase 07 is feasible** — The repository has a solid foundation with Phase 06 commodity intelligence operational
2. **Significant foundational work required** — Must build geographic data, HS classification, and trade data infrastructure before trade intelligence features
3. **Phased approach recommended** — 12-stage implementation over 12 months
4. **Data source strategy critical** — Start with free sources (ITC Trade Map, WTO, WITS), evaluate UN Comtrade based on budget
5. **Estimated cost: $210,000-310,000** — Excluding optional UN Comtrade subscription

### 11.2 Immediate Next Steps

**Step 1:** Review and approve this baseline audit  
**Step 2:** Approve implementation plan and budget  
**Step 3:** Begin Stage 2 (Geographic and Classification Foundation)
- Expand countries table
- Build HS classification system
- Build commodity-to-HS mapping

**Step 4:** Begin data source integration
- Register for ITC Trade Map access
- Apply for UN Comtrade access (if budget approved)
- Begin FAOSTAT trade data extension

### 11.3 Decision Points

**Decision 1: UN Comtrade Subscription**
- Option A: Subscribe ($5,000-20,000/year) — comprehensive data
- Option B: Use free sources only — limited but functional
- Recommendation: Evaluate based on commercial requirements

**Decision 2: Implementation Timeline**
- Option A: Full 12-month implementation — comprehensive
- Option B: Accelerated 6-month implementation — core features only
- Recommendation: Full implementation for production-grade system

**Decision 3: Resource Allocation**
- Option A: Full team (4 developers + 2 researchers) — 12 months
- Option B: Lean team (2 developers + 1 researcher) — 18 months
- Recommendation: Full team for timely delivery

---

## Appendix A: Database Schema Summary

### A.1 Current Tables (60+ tables)

**Core Reference:**
- `countries` (1 record)
- `states` (11 records)
- `markets` (11 records)
- `commodities` (22 records)
- `commodity_grades` (58 records)
- `commodity_categories` (14 records)
- `commodity_synonyms` (42 records)
- `measurement_units` (8 records)

**Price Observations:**
- `price_observations` (58 records)
- `price_verification_events`
- `price_observation_evidence`

**Commodity Intelligence (Phase 06):**
- `commodity_production` (48 records)
- `commodity_supply` (30 records)
- `commodity_demand` (30 records)
- `commodity_trade` (22 records)
- `evidence_sources` (4 records)
- `source_sync_events`

**Operations:**
- `collection_batches` (10 records)
- `collection_tasks` (4 records)
- `market_agent_assignments` (6 records)
- `market_collection_schedules` (11 records)

**Marketplace (Phase 04):**
- `buyer_offers` (15 records)
- `seller_offers` (15 records)
- `offer_verification_events` (69 records)

**Organization (Phase 05):**
- `organizations` (0 records)
- `organization_members` (0 records)

### A.2 Current Views (7 views)

- `published_price_observations`
- `market_price_summary`
- `analytics_production_trends`
- `analytics_supply_demand_balance`
- `analytics_trade_summary`
- `analytics_commodity_overview`
- `analytics_intelligence_dashboard`

### A.3 Indexes and Constraints

- ✅ Comprehensive indexes on foreign keys
- ✅ Unique constraints on natural keys
- ✅ Check constraints for data validation
- ✅ RLS policies on sensitive tables

---

## Appendix B: API Routes Summary

### B.1 Current API Routes

**Authentication:**
- `/api/auth/*` — Supabase Auth callbacks

**Agent:**
- `/api/agent/*` — Field agent operations

**Jobs:**
- `/api/jobs/*` — Background job triggers

**Notifications:**
- `/api/notifications/*` — Notification delivery

**V1 API:**
- `/api/v1/*` — Public API endpoints

### B.2 Phase 07 API Requirements

**Trade Data APIs:**
- `/api/v1/trade/flows` — Trade flow queries
- `/api/v1/trade/countries/*` — Country profiles
- `/api/v1/trade/commodities/*` — Commodity profiles
- `/api/v1/trade/hs-codes/*` — HS code lookup

**Market Access APIs:**
- `/api/v1/market-access/requirements/*` — Regulatory requirements
- `/api/v1/market-access/tariffs/*` — Tariff lookup
- `/api/v1/market-access/agreements/*` — Trade agreements

**Export Readiness APIs:**
- `/api/v1/export-readiness/checklists/*` — Readiness assessments
- `/api/v1/export-readiness/documents/*` — Document management

---

## Appendix C: Component Inventory

### C.1 Current Components (71 components)

**Intelligence (Phase 06):**
- `IntelligencePage.tsx`
- `ProductionChart.tsx`
- `SupplyDemandChart.tsx`
- `TradeFlowChart.tsx`
- `EvidenceBadge.tsx`

**Terminal:**
- Terminal shell and layout components
- Chart components
- Data table components
- Filter and search components

**Operations:**
- Admin console components
- Agent app components
- Quality dashboard components

**Shared:**
- UI primitives (Button, Card, Input, etc.)
- Layout components (Header, Footer, Sidebar)
- Feedback components (Alert, Modal, Toast)

### C.2 Phase 07 Component Requirements

**Trade Intelligence:**
- Country profile components
- Commodity trade profile components
- Trade flow explorer components
- Geographic map components
- Trade comparison components

**Market Access:**
- Regulatory requirement components
- Tariff display components
- Trade agreement components
- Export readiness checklist components

**Search and Discovery:**
- Unified search components
- Faceted filter components
- Result ranking components

---

**End of Phase 07 Baseline Audit**

**Document Version:** 1.0  
**Last Updated:** 2026-01-XX  
**Next Review:** After Stage 1 approval
