# Phase 03 — Baseline Report

**Hatsi360 Markets · Commodity Intelligence**  
Date: 2026-11-14  
Status: **Stage 1 — Discovery and Data Audit (COMPLETE)**  
Repository commit: `c9fe6b2`  
Supabase project: `supabase-cobalt-park` (ref: `umxzsdepbrenqysabtlt`)

---

## 1. Executive Summary

Phase 03 — Commodity Intelligence — aims to transform Hatsi360 from a market price terminal into a comprehensive agricultural commodity intelligence platform. This baseline report documents the starting state of the codebase, database schema, existing commodity information, and available data sources.

**Key finding:** The platform has a well-structured commodity catalogue (22 commodities, 14 categories, 58 grades, 42 synonyms) with a working profile page, but the intelligence dimensions Phase 03 must deliver — production, supply, demand, seasonality, trade, evidence/provenance — are almost entirely empty. Schema tables exist for seasonality, varieties, specifications, and fundamentals, but contain zero rows. No production, supply, demand, trade, evidence registry, or source registry tables exist yet. The commodity profile page works but shows only price data.

The platform is architecturally ready for Phase 03 but data-empty. The work is to: (1) build the intelligence data model, (2) establish the evidence and provenance engine, (3) ingest or curate real commodity intelligence data, and (4) enhance the commodity profiles to display it.

---

## 2. Prior Phase Verification

### 2.1 Phase 00 — Production Safety ✅ VERIFIED

- Commit `6a82bd6` — "Production Safety and Technical Stabilisation"
- P0 security findings resolved (RLS on `_hatsi_migrations`, demo credentials gated)
- Migration 0032 applied (security hardening)
- ESLint restored, TypeScript clean, production build verified
- CI/CD established
- All 787 tests passing (1 environmental failure)

### 2.2 Phase 01 — Market Data Activation ✅ VERIFIED

- Commit `c9fe6b2` — "Market Data Activation — operational pipeline complete"
- Migration 0033 applied (collection schedules, coordinates, publication events)
- 11 markets with verified GPS coordinates
- 11 collection schedules (2 daily, 9 weekly)
- 36 market-commodity scope entries
- Quality engine integrated (9 rules)
- Freshness and coverage services operational
- Publication workflow: approve → publish → withdraw
- Market Data Operations Dashboard at `/admin/coverage`

### 2.3 Phase 02 — Market Terminal Design System ✅ VERIFIED

- Commits `190faeb` and `68b2589`
- 15 terminal page prototypes (4,202 lines)
- 71 component files
- Full design system: tokens, typography, colour, navigation
- Trade analysis engine: series comparability, OHLC candles, opportunities, freshness
- Data source abstraction: `DataSource` interface with Supabase and fixture implementations
- Central publication predicate: `published_price_observations` view

**All prior phases confirmed operational. No regression issues detected.**

---

## 3. Existing Commodity Schema

### 3.1 Commodity catalogue

| Table | Rows | Status |
|---|---|---|
| `commodities` | 22 (21 active, 1 inactive duplicate) | **VERIFIED AND OPERATIONAL** |
| `commodity_categories` | 14 | **VERIFIED AND OPERATIONAL** |
| `commodity_synonyms` | 42 across 16 commodities | **VERIFIED AND OPERATIONAL** |
| `commodity_grades` | 58 across 18 commodities | **VERIFIED AND OPERATIONAL** |
| `commodity_varieties` | 0 | **MISSING DATA** (schema exists) |
| `commodity_specifications` | 0 | **MISSING DATA** (schema exists) |
| `commodity_seasonality` | 0 | **MISSING DATA** (schema exists) |
| `commodity_fundamentals` | 0 | **MISSING DATA** (schema exists) |
| `commodity_unit_conversions` | 0 | **MISSING DATA** (schema exists) |

### 3.2 Commodity records

22 commodities across 8 categories:

| Category | Commodities | Count |
|---|---|---|
| Grains & Cereals | Paddy Rice, Local Rice, Imported Rice, Maize (White), Maize (Yellow), Millet, Sorghum (White), Sorghum (Red), Wheat | 9 |
| Pulses & Legumes | Soya Beans, Groundnut, Bambara Nuts, Brown Beans (Oloyin), White Beans | 5 |
| Oilseeds | Sesame Seed | 1 |
| Roots & Tubers | Sweet Potato | 1 |
| Spices & Herbs | Dried Chilli Pepper, Dried Ginger | 2 |
| Cash Crops | Gum Arabic GR-I, GR-II, GR-III | 3 |
| Other | Paddy Rice (duplicate, inactive) | 1 |

Each commodity has: `id`, `legacy_id`, `category_id`, `name`, `slug`, `description`, `default_variety_id`, `default_grade_id`, `is_active`, `freshness_window_hours` (all 72h).

**Classification:** VERIFIED AND OPERATIONAL

### 3.3 Commodity categories

14 categories with hierarchical sort order:

1. Grains & Cereals (sort 10)
2. Pulses & Legumes (sort 20)
3. Oilseeds (sort 30)
4. Roots & Tubers (sort 40)
5. Fruits & Vegetables (sort 50)
6. Spices & Herbs (sort 60)
7. Tree Crops (sort 70)
8. Livestock & Poultry (sort 80)
9. Animal Products (sort 90)
10. Processed Agricultural Products (sort 100)
11. Export Commodities (sort 110)
12. Agricultural By-Products (sort 120)
13. Cash Crops (sort 130)
14. Other Agricultural Products (sort 140)

**Classification:** VERIFIED AND OPERATIONAL

### 3.4 Commodity synonyms

42 synonym entries across 16 commodities. Examples:
- Paddy Rice: "paddy", "unmilled rice", "rice paddy", "paddy rice"
- Maize (White): "white maize", "maize", "corn"
- Groundnut: "peanut", "ground nut", "groundnut"
- Soya Beans: "soybean", "soya bean", "soy beans"
- Sesame Seed: "benne", "sesame", "simsim"
- Gum Arabic GR-I: "gum arabic", "acacia", "hashab"

**Classification:** VERIFIED AND OPERATIONAL

### 3.5 Commodity grades

58 grade definitions across 18 commodities with quality specifications:

**Cereals (rice, maize, sorghum, millet, wheat):**
- Grade 1/2/3 with moisture, foreign matter, broken kernel thresholds
- Off-grade tiers for below-standard product
- Wheat: Milling grade (protein ≥12%), Baking grade (11-12%), Feed grade (<11%)

**Legumes (soya, groundnut, beans):**
- Food grade, Crush grade, Feed grade (soya beans)
- Grade 1/2 with aflatoxin limits (groundnut)
- Grade 1/2 with moisture and damaged seed limits (beans)

**Spices (chilli, ginger):**
- Grade 1/2 with colour and moisture specs
- Broken tier for damaged product

**Cash crops (gum arabic):**
- Species-based: Acacia senegal (Hashab), Acacia seyal (Talha)

**Classification:** VERIFIED AND OPERATIONAL

---

## 4. Existing Intelligence Capabilities

### 4.1 Commodity profile page (`/commodities/[slug]`)

**File:** `src/app/(site)/commodities/[slug]/page.tsx` (439 lines)

Currently displays:
- Commodity name, description
- Observation count and reporting market count
- Units quoted, grades recorded
- Movement indicator (latest vs previous comparable observation)
- Comparable series options table
- Per-market latest price table with verification status
- Time range selector (7d, 30d, 90d, 1y, all)
- Synonyms list
- Links to full price history and chart workspace

**What it does NOT display:**
- Grade specifications or quality attributes
- Production information
- Supply/availability data
- Demand/consumption data
- Seasonal calendar
- Regional intelligence
- Trade/export information
- Evidence or source citations
- Intelligence completeness indicators
- Scientific names or classification identifiers

**Classification:** EXISTING BUT INCOMPLETE — needs intelligence sections added

### 4.2 Commodity directory (`/commodities`)

**File:** `src/app/(site)/commodities/page.tsx` (306 lines)

Currently displays:
- Commodity list with category filter
- Observation count per commodity
- Latest observation date
- Market coverage count

**Classification:** VERIFIED AND OPERATIONAL — functional directory

### 4.3 Price views

- `/prices` — Price directory (326 lines) ✅
- `/prices/[commodity]` — CommodityPriceView wrapper (71 lines) ✅
- `CommodityPriceView` component — Full price view with chart, table, range selector ✅

**Classification:** VERIFIED AND OPERATIONAL

### 4.4 Trade analysis services

- `src/lib/trade/series.ts` — Series comparability engine ✅
- `src/lib/trade/candles.ts` — OHLC candle aggregation ✅
- `src/lib/trade/opportunities.ts` — Best buy/sell/spread ✅
- `src/lib/trade/freshness.ts` — Freshness classifier ✅
- `src/lib/trade/queries.ts` — Read layer bridging DataSource to engine ✅

**Classification:** VERIFIED AND OPERATIONAL — reusable for Phase 03

### 4.5 Field-reported market intelligence

**Table:** `observation_market_intelligence` — **0 records**

Schema supports: availability, supply_level, demand_level, price_direction, sentiment, developments. Linked to price observations.

The `/trade/fundamentals` page (308 lines) exists and is wired to read this table, but no data exists.

**Classification:** SCHEMA READY, DATA MISSING

### 4.6 Commodity fundamentals (editorial)

**Table:** `commodity_fundamentals` — **0 records**

Schema supports: title, slug, sourced_facts, interpretation, outlook, forecast_method, forecast_basis_period, forecast_horizon, period_start, period_end, review_status, reviewed_by, reviewed_at, is_published, published_at.

This is the editorial intelligence table — analyst-curated commodity summaries with structured evidence and forecasts. The schema is well-designed for Phase 03 but has no content.

**Classification:** SCHEMA READY, DATA MISSING

---

## 5. Available Data Sources

### 5.1 Existing data in the database

| Data domain | Table(s) | Records | Status |
|---|---|---|---|
| Price observations | `price_observations` | 58 total, 0 published | EXISTING BUT INCOMPLETE (pipeline active, no real data) |
| Market coverage | `market_commodity_scope` | 36 entries (6 commodities) | EXISTING BUT INCOMPLETE |
| Collection schedules | `market_collection_schedules` | 11 | VERIFIED AND OPERATIONAL |
| Commodity grades | `commodity_grades` | 58 | VERIFIED AND OPERATIONAL |
| Commodity synonyms | `commodity_synonyms` | 42 | VERIFIED AND OPERATIONAL |
| Measurement units | `measurement_units` | 8 | VERIFIED AND OPERATIONAL |
| States | `states` | 11 Nigerian states | VERIFIED AND OPERATIONAL |
| Markets | `markets` | 11 active | VERIFIED AND OPERATIONAL |
| Market zones | `market_zones` | exists | VERIFIED AND OPERATIONAL |
| Articles/research | `articles` | 0 | MISSING DATA |

### 5.2 Schema-ready but empty (Phase 03 domains)

| Table | Purpose | Columns |
|---|---|---|
| `commodity_seasonality` | Seasonal calendar | commodity_id, state_id, phase, start_month, end_month, supply_effect, price_effect, basis, source_name |
| `commodity_varieties` | Variety definitions | commodity_id, name, slug |
| `commodity_specifications` | Quality parameters | commodity_id, grade_id, parameter, requirement, basis, source_name, source_url |
| `commodity_fundamentals` | Editorial intelligence | commodity_id, title, slug, sourced_facts, interpretation, outlook, forecast_method, etc. |
| `commodity_unit_conversions` | Verified conversion factors | exists, not fully inspected |
| `observation_market_intelligence` | Field-reported intelligence | availability, supply_level, demand_level, price_direction, sentiment, developments |

### 5.3 Missing tables (must be created in Phase 03)

| Data domain | Required table(s) | Notes |
|---|---|---|
| Production statistics | `commodity_production` or similar | No production table exists |
| Supply observations | `commodity_supply` or similar | No supply table exists |
| Demand observations | `commodity_demand` or similar | No demand table exists |
| Trade records | `commodity_trade_flows` or similar | No trade table exists |
| Export requirements | `export_requirements` or similar | No export requirements table |
| Evidence/provenance | `intelligence_evidence` or similar | No evidence registry |
| Source registry | `data_sources` or similar | No central source registry |
| Ingestion batches | `ingestion_batches` or similar | No ingestion tracking |

### 5.4 External data sources (candidate, not yet integrated)

**Nigerian sources:**
- National Bureau of Statistics (NBS) — production statistics, trade data
- Federal Ministry of Agriculture and Food Security
- Nigerian Agricultural Extension and Research Liaison Services (NAERLS)
- Nigerian Customs Service — trade data
- Commodity associations

**International sources:**
- FAOSTAT — production, trade, supply/demand balances
- UN Comtrade — bilateral trade flows
- USDA FAS — production estimates, supply/demand
- World Bank Open Data — development indicators
- International Trade Centre — trade statistics

**Classification:** EXTERNAL DEPENDENCY — not yet integrated, licensing/access to be assessed

---

## 6. Existing Analytical Calculations

### 6.1 Price analysis (Phase 02)

| Calculation | Module | Status |
|---|---|---|
| Series comparability | `src/lib/trade/series.ts` | ✅ VERIFIED IN CODE |
| OHLC candle aggregation | `src/lib/trade/candles.ts` | ✅ VERIFIED IN CODE |
| Best buy / best sell | `src/lib/trade/opportunities.ts` | ✅ VERIFIED IN CODE |
| Market spread | `src/lib/trade/opportunities.ts` | ✅ VERIFIED IN CODE |
| Freshness classification | `src/lib/trade/freshness.ts` | ✅ VERIFIED IN CODE |
| Market movements | `src/lib/trade/queries.ts` | ✅ VERIFIED IN CODE |
| Series options per commodity | `src/lib/trade/queries.ts` | ✅ VERIFIED IN CODE |

### 6.2 Quality analysis (Phase 01)

| Calculation | Module | Status |
|---|---|---|
| 9 quality rules | `src/lib/quality/rules.ts` | ✅ VERIFIED IN CODE |
| Quality integration | `src/lib/operations/quality-integration.ts` | ✅ VERIFIED IN CODE |
| Coverage calculation | `src/lib/operations/coverage.ts` | ✅ VERIFIED IN CODE |
| Freshness service | `src/lib/operations/freshness.ts` | ✅ VERIFIED IN CODE |

### 6.3 Agricultural intelligence analytics

| Calculation | Status |
|---|---|
| Production trend analysis | **MISSING** — no production data |
| Yield calculations | **MISSING** — no area/yield data |
| Regional production shares | **MISSING** — no production data |
| Supply-demand balance | **MISSING** — no supply/demand data |
| Seasonal price analysis | **MISSING** — insufficient price history |
| Trade flow analysis | **MISSING** — no trade data |
| Import dependency ratio | **MISSING** — no trade/consumption data |
| Commodity intelligence completeness | **MISSING** — no completeness model |

---

## 7. Existing Price History

### 7.1 Observation distribution by commodity

| Commodity | Observations | Markets | Date range |
|---|---|---|---|
| Paddy Rice | 4 | 2 | 2026-11-10 |
| Imported Rice | 4 | 2 | 2026-11-10 |
| Local Rice | 4 | 2 | 2026-11-10 |
| Wheat | 2 | 1 | 2026-10-28 |
| Maize (White) | 6 | 3 | 2026-11-10 |
| Maize (Yellow) | 6 | 3 | 2026-11-10 |
| Millet | 6 | 3 | 2026-11-10 |
| Sorghum (White) | 4 | 2 | 2026-10-28 |
| Sorghum (Red) | 4 | 2 | 2026-10-28 |
| Sesame Seed | 2 | 1 | 2026-10-28 |
| Soya Beans | 4 | 2 | 2026-10-28 |
| Groundnut | 4 | 2 | 2026-10-28 |
| Brown Beans (Oloyin) | 2 | 1 | 2026-10-28 |
| White Beans | 2 | 1 | 2026-10-28 |
| Gum Arabic GR-I | 2 | 1 | 2026-10-28 |
| Sweet Potato | 2 | 1 | 2026-10-28 |

**Commodities with zero observations (6):** Bambara Nuts, Dried Chilli Pepper, Dried Ginger, Gum Arabic GR-II, Gum Arabic GR-III, Paddy Rice (duplicate)

**Critical finding:** All 58 observations have `published_at IS NULL`. Zero published prices exist. The fixture data is in the database but the publication workflow has not been exercised for real data.

### 7.2 Historical data (legacy fixture)

The fixture data source (`src/lib/data/fixture.ts`) contains migrated legacy observations from `liveprice.pluckagro.com`. These are marked `legacy_unverified` and carry date-precision timestamps. The fixture data is only served when Supabase is not configured; in production, the database takes priority.

---

## 8. Existing Regional Information

### 8.1 Geographic hierarchy

**Country:** Nigeria (1 record)

**States (11):** Bauchi, Benue, Borno, Jigawa, Kaduna, Kano, Katsina, Lagos, Nasarawa, Sokoto, Zamfara

**Markets (11):** Each with verified GPS coordinates, linked to a state.

**Market zones:** Table exists, linked to states.

### 8.2 Regional data availability

- Each market has: name, slug, description, address, latitude, longitude, state
- No regional production data exists
- No regional supply/demand data exists
- No agroecological zone data exists
- No LGA (Local Government Area) data exists

**Classification:** EXISTING BUT INCOMPLETE — basic geography exists, agricultural regional intelligence is missing

---

## 9. Existing Trade Information

### 9.1 Trade tables

| Table | Purpose | Records |
|---|---|---|
| `buyer_offers` | Buyer procurement offers | exists, RLS-gated |
| `seller_offers` | Seller offers | exists, RLS-gated |
| `offer_verification_events` | Offer verification audit | exists |

### 9.2 Trade data availability

- **No trade flow records** (imports/exports by commodity, country, year)
- **No export requirement records** (phytosanitary, quality, documentation)
- **No trade route/logistics data**
- **No HS code or product classification mapping**
- Buyer/seller offers exist but are private commercial data, not market intelligence

**Classification:** MISSING — all trade intelligence tables need to be created

---

## 10. Commodity Images

### 10.1 Image registry

**File:** `src/lib/images/registry.ts` (349 lines)  
**Catalogue:** `src/lib/images/catalogue.json` (766 lines)

Commodity images are registered by slug with representative/exact classification:
- Each commodity has a representative AI-generated editorial illustration
- Licensed as "Hatsi360 original asset — generated editorial illustration"
- Images served through optimised derivatives

**Classification:** VERIFIED AND OPERATIONAL — 16+ commodity images exist

---

## 11. Missing Data Domains

### 11.1 Completely missing (no schema, no data)

| Domain | Priority | Notes |
|---|---|---|
| **Production statistics** | HIGH | No table, no data. Need state-level production, area, yield by year |
| **Supply observations** | HIGH | No table. Need market arrivals, warehouse stock, availability reports |
| **Demand/consumption** | HIGH | No table. Need domestic consumption, industrial demand, import demand |
| **Trade flow records** | MEDIUM | No table. Need import/export by commodity, country, year, value, volume |
| **Export requirements** | MEDIUM | No table. Need phytosanitary, quality, documentation requirements |
| **Evidence/provenance registry** | HIGH | No central evidence table. Every intelligence claim needs traceability |
| **Data source registry** | HIGH | No central source table. External datasets need licensing, metadata |
| **Ingestion batch tracking** | MEDIUM | No ingestion table. External data imports need audit trail |
| **Intelligence publication versions** | MEDIUM | No versioning for intelligence content |

### 11.2 Schema exists, data missing

| Domain | Table | Notes |
|---|---|---|
| Seasonality | `commodity_seasonality` | Schema well-designed, 0 rows |
| Varieties | `commodity_varieties` | Schema minimal (name, slug), 0 rows |
| Quality specifications | `commodity_specifications` | Schema has parameter/requirement/basis/source, 0 rows |
| Fundamentals | `commodity_fundamentals` | Schema comprehensive, 0 rows |
| Unit conversions | `commodity_unit_conversions` | 0 rows |
| Market intelligence | `observation_market_intelligence` | 0 rows |
| Articles/research | `articles` | 0 rows |

### 11.3 Data gaps requiring owner decision

| Gap | Question |
|---|---|
| Scientific names | Commodity table has no `scientific_name` column. Add? |
| HS codes | No trade classification mapping. Use UN Comtrade HS codes? |
| Agroecological zones | No zone table. Required for seasonal variation? |
| Production source priority | Which external sources to integrate first? |
| Nigerian state production data | Does reliable state-level data exist for any commodity? |
| Historical price data | Only 2 dates of observations. Seasonal price analysis needs years of data |

---

## 12. Data Quality Limitations

### 12.1 Price data

- **58 observations, 0 published** — the publication pipeline works but no real data has been published
- **Only 2 collection dates represented** — 2026-10-28 and 2026-11-10
- **16 of 22 commodities have observations** — 6 have none
- **Maximum 6 observations per commodity** across 3 markets
- **No intraday data** — all observations are date-precision
- Seasonal price analysis is impossible with current data depth

### 12.2 Commodity catalogue

- Descriptions are brief (1-2 sentences)
- No scientific names
- No production region attribution
- No usage/application classification (food/feed/industrial)
- No HS code or international classification mapping
- One duplicate record (Paddy Rice, inactive)

### 12.3 Grade information

- 58 grades defined with textual quality specifications
- Specifications embedded in grade descriptions (not structured as separate parameters)
- No link to an external standard body (NIS, Codex, ISO)
- No structured quality attribute table (moisture, foreign matter as separate rows)

---

## 13. External Data Dependencies

### 13.1 Required for Phase 03

| Source | Data needed | Access status |
|---|---|---|
| FAOSTAT | Production, trade, supply/demand | PUBLIC (requires registration for API) |
| NBS Nigeria | State-level production, trade | PUBLIC (website, PDF reports) |
| UN Comtrade | Bilateral trade flows | PUBLIC (API available, rate-limited) |
| USDA FAS | Production estimates | PUBLIC |
| NAERLS | Nigerian agricultural research | PUBLIC (institutional) |

### 13.2 Licensing considerations

- FAOSTAT data is generally available for non-commercial use with attribution
- NBS data is public domain (Nigerian government statistics)
- UN Comtrade has specific terms of use
- Any curated/interpreted data must be clearly distinguished from raw statistics
- Redistribution permissions must be verified before ingestion

**Classification:** EXTERNAL DEPENDENCY — must verify licensing before data ingestion

---

## 14. Proposed Architecture

### 14.1 Intelligence data model

```
┌─────────────────────────────────────────────────────────────────┐
│                    COMMODITY INTELLIGENCE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────┐  │
│  │  Commodity    │    │   Evidence    │    │   Data Sources   │  │
│  │  Catalogue    │────│   Registry    │────│   Registry       │  │
│  │  (existing)   │    │   (new)       │    │   (new)          │  │
│  └──────┬───────┘    └───────┬───────┘    └────────┬─────────┘  │
│         │                    │                      │            │
│  ┌──────┴───────────────────┴──────────────────────┴──────────┐ │
│  │              INTELLIGENCE DOMAINS                           │ │
│  ├──────────┬──────────┬──────────┬──────────┬────────────────┤ │
│  │ Grades & │Produc-   │ Supply & │Season-   │ Trade &        │ │
│  │ Quality  │ tion     │ Demand   │ ality    │ Export         │ │
│  │(existing)│(new)     │(new)     │(schema)  │(new)           │ │
│  └──────────┴──────────┴──────────┴──────────┴────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           INTELLIGENCE PUBLICATION WORKFLOW               │   │
│  │  DRAFT → REVIEW → APPROVED → PUBLISHED → EXPIRED         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 14.2 Key design decisions

1. **Evidence-first:** Every intelligence record links to an evidence record, which links to a source
2. **Confidence levels:** HIGH/MEDIUM/LOW/UNKNOWN with documented criteria
3. **Classification types:** OFFICIAL_STATISTIC, VERIFIED_FIELD_OBSERVATION, INSTITUTIONAL_RESEARCH, THIRD_PARTY_ESTIMATE, MODELLED_ESTIMATE, FORECAST, ANALYST_INTERPRETATION
4. **Separation of concerns:** Raw data (production records) vs editorial intelligence (commodity summaries) vs derived analysis (trends, shares)
5. **Period-aware:** All records carry reporting period, not just timestamps
6. **Unit-preserving:** Original units preserved alongside normalised values

---

## 15. File Ownership Map

### 15.1 Existing files Phase 03 will extend

| Path | Responsibility | Phase 03 changes |
|---|---|---|
| `src/app/(site)/commodities/[slug]/page.tsx` | Commodity profile | Add intelligence sections |
| `src/app/(site)/commodities/page.tsx` | Commodity directory | Add intelligence indicators |
| `src/app/(site)/trade/fundamentals/page.tsx` | Fundamentals page | Connect to new data |
| `src/components/data/CommodityPriceView.tsx` | Price view component | May add intelligence panels |
| `src/types/domain.ts` | Domain types | Add intelligence types |
| `src/lib/brand.ts` | Navigation | Add intelligence nav entries |
| `src/lib/data/supabase.ts` | Data source | Add intelligence queries |

### 15.2 New files Phase 03 must create

| Path | Responsibility |
|---|---|
| `src/lib/intelligence/evidence.ts` | Evidence and provenance service |
| `src/lib/intelligence/sources.ts` | Source registry service |
| `src/lib/intelligence/production.ts` | Production data service |
| `src/lib/intelligence/supply-demand.ts` | Supply and demand service |
| `src/lib/intelligence/seasonality.ts` | Seasonal calendar service |
| `src/lib/intelligence/trade.ts` | Trade intelligence service |
| `src/lib/intelligence/completeness.ts` | Intelligence completeness calculator |
| `src/lib/intelligence/classification.ts` | Intelligence type and confidence rules |
| `src/components/intelligence/` | Intelligence display components |
| `src/app/admin/intelligence/` | Intelligence administration |
| `supabase/migrations/0034_*.sql` | Phase 03 migrations |
| `tests/intelligence/` | Intelligence tests |

---

## 16. Implementation Priorities

### 16.1 Stage 2 — Intelligence Foundations (Priority 1)

Before any intelligence can be displayed, the infrastructure must exist:
1. Evidence/provenance model
2. Data source registry
3. Intelligence publication workflow
4. Confidence and classification rules

### 16.2 Stage 3 — Commodity and Grade Intelligence (Priority 2)

Enhance what exists:
1. Enrich commodity descriptions
2. Add scientific names
3. Structure grade quality parameters
4. Link grades to standards bodies

### 16.3 Stage 4-7 — Intelligence Domains (Priority 3)

Build in order of data availability:
1. Seasonality (schema exists, data can be curated from agricultural knowledge)
2. Production (external data available from FAOSTAT/NBS)
3. Supply/demand (limited, depends on source availability)
4. Trade (external data available from UN Comtrade)

### 16.4 Stage 8 — Commodity Intelligence Profiles (Priority 4)

Integrate all intelligence into enhanced commodity profiles.

---

## 17. Test Baseline

| Category | Pass | Fail | Skip |
|---|---|---|---|
| Full suite | 787 | 1 (environmental) | 28 |
| Trade-specific | All pass | — | — |
| Quality rules | All pass | — | — |
| TypeScript | Clean | — | — |
| Build | Successful | — | — |

The 1 failure is `tests/auth/demo-access.test.ts` — requires Supabase credentials not available in test environment. Not a code defect.

---

## 18. Summary Classification

| Domain | Classification |
|---|---|
| Commodity catalogue | **VERIFIED AND OPERATIONAL** |
| Commodity categories | **VERIFIED AND OPERATIONAL** |
| Commodity synonyms | **VERIFIED AND OPERATIONAL** |
| Commodity grades | **VERIFIED AND OPERATIONAL** |
| Commodity descriptions | **EXISTING BUT INCOMPLETE** (brief, no scientific names) |
| Commodity varieties | **MISSING** (schema exists, 0 data) |
| Quality specifications | **MISSING** (schema exists, 0 data, specs embedded in grade text) |
| Seasonality | **MISSING** (schema exists, 0 data) |
| Commodity fundamentals | **MISSING** (schema exists, 0 data) |
| Production statistics | **MISSING** (no schema, no data) |
| Supply observations | **MISSING** (no schema, no data) |
| Demand observations | **MISSING** (no schema, no data) |
| Trade intelligence | **MISSING** (no schema, no data) |
| Export requirements | **MISSING** (no schema, no data) |
| Evidence registry | **MISSING** (no schema, no data) |
| Source registry | **MISSING** (no schema, no data) |
| Ingestion tracking | **MISSING** (no schema, no data) |
| Intelligence completeness | **MISSING** (no model, no calculator) |
| Commodity images | **VERIFIED AND OPERATIONAL** |
| Price analysis | **VERIFIED AND OPERATIONAL** (but shallow data) |
| Market geography | **VERIFIED AND OPERATIONAL** |
| Regional intelligence | **MISSING** (basic geography exists, agricultural intelligence missing) |
| External data sources | **EXTERNAL DEPENDENCY** (not yet integrated) |
| Commodity profile page | **EXISTING BUT INCOMPLETE** (prices only, no intelligence sections) |
| Publication workflow | **VERIFIED AND OPERATIONAL** (for prices; needs extension for intelligence) |

---

*Report generated: 2026-11-14*  
*Repository commit: c9fe6b2*  
*Author: Hatsi360 Agent*
