# Phase 02 — Baseline Report

**Hatsi360 Markets · Live Agricultural Market Terminal**
Date: 2026-11-14
Status: **Discovery Stage — Stage 1 of 8**

---

## 1. Executive Summary

This report establishes the baseline state of the Hatsi360 Markets codebase at the start of Phase 02. The terminal design system, component library, data services and page prototypes were all delivered in the earlier "Phase 02" design-system stage (commits `190faeb` and `68b2589`), and are now being assessed as the starting point for the Live Agricultural Market Terminal implementation.

**Key finding:** The prototype infrastructure is extensive and well-designed. The terminal shell, chart system, series comparison engine, freshness classifier, opportunity calculator and 71 component files all exist. However, **zero price observations are published** in the live database, meaning every analytical surface currently renders its honest empty state. The work ahead is to transform prototypes into production surfaces that populate correctly once the data pipeline (Phase 01) feeds real observations.

### Baseline numbers

| Metric | Value |
|---|---|
| Terminal page prototypes | 15 pages (4,202 lines total) |
| Component files (.tsx) | 71 |
| Data service modules | 8 (`src/lib/trade/*`, `src/lib/data/*`) |
| Operations services | 7 (`src/lib/operations/*`) |
| Published observations | 0 |
| Total observations in DB | 58 |
| Markets with coordinates | 11 |
| Collection schedules | 11 (2 daily, 9 weekly) |
| Market-commodity scope entries | 36 |
| Tests passing | 787 / 816 (1 environmental failure, 28 skipped) |
| TypeScript | Clean |

---

## 2. What Exists — Pages

### 2.1 Terminal pages (site group)

All pages are under `src/app/(site)/` and use the terminal shell system.

| Route | File | Lines | Status | Purpose |
|---|---|---|---|---|
| `/markets` | `markets/page.tsx` | 170 | ✅ Working prototype | Market directory with server-side search, filter by state, pagination |
| `/markets/[slug]` | `markets/[slug]/page.tsx` | 263 | ✅ Working prototype | Market detail profile: commodities, observations, chart, coverage |
| `/commodities` | `commodities/page.tsx` | 306 | ✅ Working prototype | Commodity directory with category filter, search |
| `/commodities/[slug]` | `commodities/[slug]/page.tsx` | 439 | ✅ Working prototype | Commodity profile: series options, per-market table, movement indicator |
| `/prices` | `prices/page.tsx` | 326 | ✅ Working prototype | Price directory — all commodities with latest observation |
| `/prices/[commodity]` | `prices/[commodity]/page.tsx` | 71 | ✅ Working prototype | Thin wrapper around `CommodityPriceView` component |
| `/trade` | `trade/page.tsx` | 324 | ✅ Working prototype | Trade intelligence hub |
| `/trade/terminal` | `trade/terminal/page.tsx` | 560 | ✅ Working prototype | **Main terminal**: candlestick chart, market comparison, opportunities panel, freshness indicators, 3-region layout |
| `/trade/best-buy` | `trade/best-buy/page.tsx` | 170 | ✅ Working prototype | Lowest verified observation per commodity |
| `/trade/best-sell` | `trade/best-sell/page.tsx` | 154 | ✅ Working prototype | Highest verified observation per commodity |
| `/trade/watchlist` | `trade/watchlist/page.tsx` | 186 | ⚠️ Prototype only | Watchlist UI (no persistence layer) |
| `/trade/alerts` | `trade/alerts/page.tsx` | 222 | ⚠️ Prototype only | Alert UI (no persistence layer) |
| `/trade/fundamentals` | `trade/fundamentals/page.tsx` | 308 | ✅ Working prototype | Field-reported market intelligence display |
| `/charts` | `charts/page.tsx` | 416 | ✅ Working prototype | Chart workspace with timeframe, series and period selection |
| `/compare` | `compare/page.tsx` | 287 | ✅ Working prototype | Cross-market comparison for one commodity |

### 2.2 Navigation structure

The terminal's six-module navigation is defined in `src/lib/brand.ts` (`MARKET_NAV`):

1. **Markets** — `/markets`, `/prices`, `/compare`, `/coverage`
2. **Commodities** — `/commodities`, `/prices`
3. **Trade** — `/trade`, `/trade/best-buy`, `/trade/best-sell`
4. **Charts** — `/charts`, `/prices`, `/compare`
5. **Fundamentals** — `/trade/fundamentals`, `/coverage`
6. **Research** — `/insights`, `/reports`

Planned modules (not yet built): Market activity heatmap, Market operating hours, Grades and specifications detail, Variety directory, Market spread monitor, Export offers, Technical indicators, Model-generated projections, Supply/demand, Seasonal intelligence, Weather/rainfall, Production intelligence, Trade policy, FX/logistics, Daily market brief, Weekly reports, Monthly outlook, Export intelligence.

---

## 3. What Exists — Data Services

### 3.1 `src/lib/data/` — Data source abstraction

| File | Lines | Purpose |
|---|---|---|
| `source.ts` | 61 | `DataSource` interface: the contract every page uses. Two implementations: `supabase` (production) and `fixture` (migrated legacy). |
| `supabase.ts` | ~400 | Supabase-backed implementation. Reads through `published_price_observations` view (RLS-enforced). Snake_case → camelCase mapping. |
| `fixture.ts` | ~350 | Legacy migrated dataset implementation. Same shapes, `isMigrated: true`. |
| `index.ts` | 25 | `getDataSource()` — returns supabase or fixture based on `isSupabaseConfigured()`. |

**Key design:** All pages call `getDataSource()` and receive the same interface. The `published_price_observations` view is the single publication predicate — only rows where `published_at IS NOT NULL` are visible.

### 3.2 `src/lib/trade/` — Trade analysis engine

| File | Lines | Purpose | Tests |
|---|---|---|---|
| `series.ts` | 274 | **Series comparability engine.** `SeriesKey` type, `compareSeries()`, `validateSeries()`, `partitionBySeries()`, `convertSeriesKey()`. The single place that decides whether two prices can be compared. | ✅ `tests/trade/series.test.ts` |
| `candles.ts` | 433 | **OHLC candle aggregation.** Daily/weekly/monthly/quarterly only — no intraday. Gaps preserved. Observation counts never labelled as volume. | ✅ `tests/trade/candles.test.ts` |
| `opportunities.ts` | 482 | **Best buy / best sell / spread engine.** Finds extreme verified observations, calculates spread, carries mandatory disclosures. Deliberately does NOT read commercial offers. | ✅ `tests/trade/opportunities.test.ts` |
| `freshness.ts` | 294 | **Freshness classifier.** 7 price states (no_data, stale, delayed, indicative, latest_verified, recently_updated, live_feed). Cadence-aware thresholds. | ✅ `tests/trade/freshness.test.ts` |
| `queries.ts` | 565 | **Read layer.** `getCommoditySeries()`, `getCommodityOpportunities()`, `getMarketMovements()`, `getCommodityFreshness()`, `getCommoditySeriesOptions()`, `getFundamentalSignals()`. Bridges DataSource to trade engine. | — (integration) |
| `navigation.ts` | — | Trade navigation helpers | — |

### 3.3 `src/lib/operations/` — Operations pipeline (Phase 01)

| File | Lines | Purpose |
|---|---|---|
| `coverage.ts` | ~150 | Expected vs reported commodities per market |
| `freshness.ts` | ~100 | Freshness service (CURRENT/AGING/STALE/NO_DATA) |
| `quality-integration.ts` | ~130 | Quality engine bridge (9 rules) |
| `field-actions.ts` | ~800 | Agent submission server actions with quality engine |
| `navigation.ts` | ~200 | Operations navigation helpers |
| `admin.ts` | ~1000 | Admin operations |
| `field.ts` | ~1500 | Field operations |

### 3.4 Data flow

```
Agent/Manual → field-actions.ts → quality engine → price_observations (unpublished)
                                                          ↓
                                              verify (verification officer)
                                                          ↓
                                              publish (admin, sets published_at)
                                                          ↓
                                    published_price_observations view (RLS)
                                                          ↓
                                          src/lib/data/supabase.ts (DataSource)
                                                          ↓
                                           src/lib/trade/queries.ts (read layer)
                                                          ↓
                                           Pages and components (display)
```

---

## 4. What Exists — Component Library

### 4.1 Component inventory (71 .tsx files)

**Terminal shell (2 files):**
- `src/components/terminal/TerminalShell.tsx` — PageContainer, PageHeader, SectionHeader, terminal frame
- `src/components/terminal/MobileNavigation.tsx` — Mobile drawer navigation

**Market data (3 files):**
- `src/components/market/MarketOverview.tsx` — MarketOverviewCard, market statistics
- `src/components/market/MarketWatchTable.tsx` — 11-column sortable table with mobile card alternative
- `src/components/market/PriceDisplay.tsx` — PriceDisplay, PriceMovementIndicator, VerificationBadge

**Chart system (2 files):**
- `src/components/charts/ChartFrame.tsx` — ChartContainer, ChartContext, ChartSeriesKind (observed/aggregated/indicative/projected/range), ChartEmptyState. **419 lines** — the most important presentation component.
- `src/components/charts/PeriodRangeChart.tsx` — Range bar chart (Client Component). Deliberately NOT a candlestick.

**Trade primitives (2 files):**
- `src/components/trade/CandleChart.tsx` — Candlestick visual (Client Component). Labels itself as a range bar.
- `src/components/trade/Primitives.tsx` — EmptyState, OpportunityDisclosure, PageHeader, Panel, Price

**Data display (4 files):**
- `src/components/data/CommodityPriceView.tsx` — Full commodity price view with chart, table, range selector
- `src/components/data/PriceChart.tsx` — SVG price chart
- `src/components/data/PriceTable.tsx` — Observation table
- `src/components/data/DataCoverageNotice.tsx` — Coverage/recency notice

**Feedback (1 file):**
- `src/components/feedback/TerminalFeedback.tsx` — EmptyStatePanel, PanelSkeleton, ErrorPanel

**UI foundation (5 files):**
- `src/components/ui/index.tsx` — Breadcrumbs, EmptyState, etc.
- `src/components/ui/icons.tsx` — 45+ hand-drawn Lucide-geometry SVG icons
- `src/components/ui/primitives.tsx` — Button, Pill, Card base
- `src/components/ui/data-display.tsx` — VerificationBadge, StatusDot
- `src/components/ui/overlays.tsx` — Client-only overlays (dropdowns, modals)

**Site structure (5 files):**
- `src/components/site/SiteHeader.tsx` — Main site header with MARKET_NAV
- `src/components/site/navigation.tsx` — Navigation rendering
- `src/components/site/SiteFooter.tsx` — Site footer
- `src/components/site/BareFrame.tsx` / `PortalFrame.tsx` — Layout frames

**Operations (4 files):**
- `src/components/ops/Primitives.tsx` — PageHeader, Panel, Pill (admin variant)
- `src/components/ops/KpiCard.tsx` — Operations KPI card
- `src/components/ops/DataTable.tsx` — Operations data table
- `src/components/ops/Charts.tsx` — Operations chart components

---

## 5. What Exists — Design System

### 5.1 Token system (globals.css)

The terminal design tokens are defined in `src/app/globals.css` under `@theme`:

- **Colours:** Terminal background (`--terminal-bg`), panel, border, text, text-secondary, text-muted, rail, rule. Movement semantics (up/down/flat). Brand system.
- **Typography:** Inter + Manrope. Ten type roles via `TYPE_ROLES`. Tabular numerals on `.figure-num`.
- **Spacing/Layout:** Terminal panel classes (`.terminal-panel`, `.terminal-rail`, `.terminal-rule`, `.terminal-control`, `.terminal-action`, `.terminal-table`).
- **Editorial:** `.editorial*` classes for the light surface.
- **Motion:** `MOTION` config with reduced-motion respect.

### 5.2 Design documentation (10 files)

All under `docs/design-system/hatsi360-markets/`:
1. `BRAND_IDENTITY.md` — HATSI360 MARKETS identity system
2. `COLOR_SYSTEM.md` — Terminal + editorial + movement colour tokens
3. `COMPONENT_LIBRARY.md` — Component inventory and Client/Server split rules
4. `DESIGN_SYSTEM_USAGE.md` — How to use the design system
5. `INTERACTION_AND_FEEDBACK.md` — Interaction patterns, empty states, loading
6. `NAVIGATION_ARCHITECTURE.md` — MARKET_NAV structure, routing
7. `PAGE_DESIGN_SPECIFICATIONS.md` — Per-page design specs
8. `RESPONSIVE_DESIGN.md` — Responsive breakpoints and patterns
9. `SPACING_AND_LAYOUT.md` — Spacing system
10. `TYPOGRAPHY_SYSTEM.md` — Type scale and roles

---

## 6. What Exists — Database State

### 6.1 Schema (relevant tables and views)

| Object | Type | Purpose |
|---|---|---|
| `price_observations` | Table | Core observation record (all statuses) |
| `published_price_observations` | View | `published_at IS NOT NULL` filter, `security_invoker = true` |
| `commodities` | Table | Commodity catalogue |
| `markets` | Table | Market register |
| `grades` | Table | Grade definitions |
| `measurement_units` | Table | Unit definitions |
| `collection_schedules` | Table | Market collection cadence |
| `market_commodity_scope` | Table | Expected commodity coverage per market |
| `publication_events` | Table | Publish/withdraw audit trail |
| `observation_market_intelligence` | Table | Field-reported fundamentals |
| `buyer_offers` / `seller_offers` | Tables | Commercial offers (RLS-gated, not read by terminal) |
| `quality_findings` | Table | Quality engine findings |

### 6.2 Current data

- **58 observations** total in `price_observations`
- **0 published** (`published_at IS NOT NULL`)
- **11 markets** with verified GPS coordinates
- **11 collection schedules** (2 daily, 9 weekly)
- **36 market-commodity scope entries**
- **4 collection tasks generated** for 2026-11-14

The database is in the correct empty state: the pipeline is built but no real collection has happened yet.

### 6.3 RLS policies

- `published_price_observations` view grants SELECT to `anon, authenticated`
- Underlying tables have RLS with staff-only mutation policies
- Publication integrity enforced by trigger (`prevent_published_economic_mutation`)
- Corrections are append-only

---

## 7. Test Baseline

### 7.1 Test suite results

| Category | Pass | Fail | Skip |
|---|---|---|---|
| Full suite | 787 | 1 | 28 |

The one failure is environmental: `tests/auth/demo-access.test.ts` — "the demo agent can sign in". This requires Supabase credentials that are not present in the CI/test environment without explicit env var configuration. It is not a code defect.

### 7.2 Trade-specific tests

| Test file | Tests | Status |
|---|---|---|
| `tests/trade/series.test.ts` | ✅ All pass | Series comparability |
| `tests/trade/candles.test.ts` | ✅ All pass | Candle aggregation |
| `tests/trade/opportunities.test.ts` | ✅ All pass | Best buy/sell/spread |
| `tests/trade/freshness.test.ts` | ✅ All pass | Freshness classification |
| `tests/trade/share-metadata.test.ts` | ✅ All pass | Share metadata |
| `tests/quality/rules.test.ts` | ✅ All pass | 9 quality rules |

### 7.3 TypeScript

Clean — `npx tsc --noEmit` exits 0 with no output.

---

## 8. Gap Analysis — What Phase 02 Must Build

### 8.1 Classification of existing pages

**Production-ready (need enhancement, not replacement):**
- `/markets` — Market directory ✅
- `/markets/[slug]` — Market detail ✅
- `/commodities` — Commodity directory ✅
- `/commodities/[slug]` — Commodity profile ✅
- `/prices` — Price directory ✅
- `/prices/[commodity]` — Price detail ✅
- `/trade/terminal` — Trading terminal ✅
- `/trade/best-buy` — Best buy ✅
- `/trade/best-sell` — Best sell ✅
- `/trade/fundamentals` — Fundamentals ✅
- `/charts` — Chart workspace ✅
- `/compare` — Market comparison ✅

**Prototype-only (need persistence layer):**
- `/trade/watchlist` — No watchlist storage, no user preference persistence
- `/trade/alerts` — No alert storage, no notification delivery

**Missing (referenced in nav but not yet built):**
- `/coverage` — Regional Market Activity page (referenced in nav; admin version exists at `/admin/coverage`)
- Market activity heatmap
- Market operating hours display
- Grades and specifications detail
- Variety directory

### 8.2 Phase 02 work required

Based on the brief's 8 stages and the current state:

**Stage 1 — Discovery & Architecture (current)**
- [x] Codebase inspection
- [x] Component inventory
- [x] Data service mapping
- [x] Database state verification
- [ ] Baseline report (this document)
- [ ] Architecture document
- [ ] Data access contracts document

**Stage 2 — Central Market Data Services**
- [ ] Verify the central publication predicate is unambiguous
- [ ] Ensure all pages use `published_price_observations` view consistently
- [ ] No page reimplements publication visibility rules
- [ ] Add query performance instrumentation

**Stage 3 — Market Overview Terminal**
- [ ] Enhance `/markets` with live freshness indicators
- [ ] Add market movers to market directory
- [ ] Ensure market overview shows latest published prices
- [ ] Professional empty states for all data surfaces

**Stage 4 — Commodity and Market Profiles**
- [ ] Enhance commodity profiles with verified coordinate maps
- [ ] Add coverage indicators to market profiles
- [ ] Ensure series options are the primary navigation (not market + grade)
- [ ] Professional no-data states

**Stage 5 — Charts and Analytical Calculations**
- [ ] Verify chart system distinguishes observed/aggregated/indicative/projected
- [ ] Ensure empty charts explain why
- [ ] Verify candlestick is honestly labelled as range bar
- [ ] Add chart methodology documentation

**Stage 6 — Watchlists and Alert Foundation**
- [ ] Design watchlist persistence (user preferences table or client-side)
- [ ] Design alert schema (price movement thresholds)
- [ ] Implement watchlist page with real persistence
- [ ] Implement alerts page with real persistence

**Stage 7 — Public API and Performance**
- [ ] Query performance review
- [ ] API documentation
- [ ] Caching strategy
- [ ] SEO and structured data verification

**Stage 8 — Final Integration and Release Readiness**
- [ ] Full test suite verification
- [ ] Responsive review at all breakpoints
- [ ] Security review
- [ ] Completion report

---

## 9. File Ownership Map

### 9.1 Files Phase 02 may modify

| Category | Files | Notes |
|---|---|---|
| Terminal pages | `src/app/(site)/markets/**/*.tsx`, `src/app/(site)/commodities/**/*.tsx`, `src/app/(site)/prices/**/*.tsx`, `src/app/(site)/trade/**/*.tsx`, `src/app/(site)/charts/page.tsx`, `src/app/(site)/compare/page.tsx` | Primary enhancement targets |
| Market components | `src/components/market/*.tsx` | Enhance existing |
| Chart components | `src/components/charts/*.tsx` | Enhance existing |
| Trade components | `src/components/trade/*.tsx` | Enhance existing |
| Data components | `src/components/data/*.tsx` | Enhance existing |
| Feedback | `src/components/feedback/*.tsx` | May add new empty states |
| Trade services | `src/lib/trade/*.ts` | May add new query functions |
| Brand/nav | `src/lib/brand.ts` | May add new nav entries |
| New coverage page | `src/app/(site)/coverage/page.tsx` | New file needed |

### 9.2 Files Phase 02 must NOT modify

| Category | Files | Reason |
|---|---|---|
| Migration files | `supabase/migrations/*.sql` | Standing constraint: never edit applied migrations |
| Publication predicate | `published_price_observations` view | Core integrity — changes require separate migration |
| Quality rules | `src/lib/quality/rules.ts` | Phase 01 deliverable, not Phase 02 scope |
| Field actions | `src/lib/operations/field-actions.ts` | Phase 01 deliverable |
| Domain types | `src/types/domain.ts` | Shared contract |
| Auth system | `src/lib/auth/*` | Separate concern |
| Admin pages | `src/app/admin/**/*.tsx` | Separate concern (Phase 01) |

---

## 10. Data Access Contracts

### 10.1 Publication predicate (single authority)

The **one** publication rule:

```sql
-- In published_price_observations view:
WHERE published_at IS NOT NULL
```

Every page, API route and server action that displays price data MUST read through this view. No page may reimplement publication visibility. The `DataSource.listObservations()` and `DataSource.listObservationsForAnalysis()` methods are the only sanctioned paths to observation data.

### 10.2 Series comparability (single authority)

The **one** comparability rule lives in `src/lib/trade/series.ts`:

```typescript
export function compareSeries(a: SeriesKey, b: SeriesKey): CompatibilityReport
```

Two observations are comparable if and only if they share: commodity, price type (and both are comparable types), grade, unit, currency, and variety. Market is tracked separately (compared explicitly, never silently crossed).

### 10.3 No-data states

Every surface must render a professional empty state when no published data exists. The empty state must:
- Explain what would be shown
- Say why nothing is shown
- Offer a relevant navigation action
- Never fill the gap with fabricated data

The `EmptyStatePanel` component in `src/components/feedback/TerminalFeedback.tsx` handles this.

### 10.4 Freshness classification (single authority)

Freshness is classified by `src/lib/trade/freshness.ts` (`classifyFreshness()`). Seven states, cadence-aware thresholds. No page may compute its own freshness logic.

---

## 11. Risks and Constraints

### 11.1 Data availability

The primary risk is that zero observations are published. Every enhancement must work correctly with:
- Zero published observations (current state)
- Sparse observations (first collection cycle)
- Growing observations (mature operation)

### 11.2 Performance

With 0 observations, performance is not currently testable. Stage 7 must include performance review with synthetic (but labelled) load to verify query efficiency.

### 11.3 Prototype fidelity

The existing prototypes are visually polished. Phase 02 must enhance functionality without breaking the visual design. The design system tokens and component classes are the contract.

### 11.4 No fabrication

Every number on screen must trace to a real published observation. No synthetic data, no sample prices, no illustrative figures. This is the standing constraint.

---

## 12. Next Steps

1. Complete this baseline report (approval gate)
2. Write `phase-02-architecture.md` — target architecture for the live terminal
3. Write `phase-02-data-access-contracts.md` — formal data contracts
4. Begin Stage 2: verify and harden the central market data services
5. Progress through stages sequentially with gate approvals

---

*Report generated: 2026-11-14T13:40:00Z*
*Repository commit: c9fe6b2*
*Author: Hatsi360 Agent*
