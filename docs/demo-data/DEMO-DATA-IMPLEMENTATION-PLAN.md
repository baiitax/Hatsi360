# Hatsi360 — Demo Data Implementation Plan

**Version:** 1.0
**Date:** 2026-11-15

---

## 1. Objectives

1. Populate the Supabase database with realistic, interconnected agricultural market data.
2. Enable end-to-end testing of all major modules (homepage, markets, commodities, charts, agent app, admin console).
3. Ensure all demo records are identifiable and safely removable.
4. Never mark synthetic records as real verified market intelligence.

---

## 2. Implementation Phases

### Phase 1: Core Market Data (Migration 0046)

**File:** `supabase/migrations/0046_demo_seed_core.sql`

Populates:
- **15 markets** across 11 states (Kano, Kaduna, Lagos, Jigawa, Katsina, Sokoto, Borno, Niger, Plateau, Benue, Zamfara)
- **~300 price observations** over 60 days
  - 15 commodities × 12 markets × ~2 observations/day
  - Mix of `verified` (published) and `pending_verification` (awaiting review)
  - All marked `source_system = 'test_fixture'`
  - Realistic NGN prices with plausible variation
  - Historical trend data supporting charts and market movers
- **8 commodity-unit conversion rules** (50kg bag ↔ kg for key commodities)

**Data quality:**
- Prices are positive and vary realistically across markets
- No identical prices for the same commodity across all markets
- Gradual price trends with occasional jumps
- Mix of wholesale_transaction and retail price types
- All records use existing commodity_ids (1–22), existing grades, existing units

### Phase 2: Operational Data (Migration 0047)

**File:** `supabase/migrations/0047_demo_seed_operations.sql`

Populates:
- **8 agent profiles** with realistic names, regions, employment status
- **8 demo organizations** (fictional agricultural businesses)
- **12 collection tasks** in various states (open, in_progress, submitted, completed)
- **8 market-agent assignments**
- **Demo notifications** linked to agent activities

### Phase 3: Cleanup Migration (Migration 0048)

**File:** `supabase/migrations/0048_demo_seed_cleanup.sql`

Reversible cleanup that:
- Deletes all `test_fixture` observations
- Deletes demo organizations (by `DEMO:` prefix in name)
- Deletes demo agent profiles (by `DEMO:` prefix)
- Deletes demo collection tasks and assignments
- Deletes demo notifications
- Preserves all genuine data

---

## 3. Price Data Design

### Commodities covered (15 of 22)
1. Paddy Rice (id=1)
2. Imported Rice (id=3)
3. Local Rice (id=4)
4. Wheat (id=5)
5. Maize White (id=6)
6. Maize Yellow (id=7)
7. Millet (id=8)
8. Sorghum White (id=9)
9. Sorghum Red (id=10)
10. Sesame Seed (id=11)
11. Groundnut (id=13)
12. Soya Beans (id=15)
13. Cowpea (id=16)
14. Cassava (id=17)
15. Gum Arabic (id=19)

### Markets (15)
| # | Market | State |
|---|--------|-------|
| 101 | Dawanau International Grains Market | Kano |
| 102 | Yankaba Grain Market | Kano |
| 103 | Singer Market | Kano |
| 104 | Giwa Grain Market | Kaduna |
| 105 | Hadejia Central Market | Jigawa |
| 106 | Katsina Central Market | Katsina |
| 107 | Funtua Market | Katsina |
| 108 | Sokoto Central Market | Sokoto |
| 109 | Maiduguri Monday Market | Borno |
| 110 | Minna Central Market | Niger |
| 111 | Mile 12 Market | Lagos |
| 112 | Dei-Dei Market | Abuja (FCT) |
| 113 | Jos Main Market | Plateau |
| 114 | Makurdi Main Market | Benue |
| 115 | Gusau Central Market | Zamfara |

### Price realism
- NGN currency for all observations
- Unit: bag (50kg equivalent) for grains, kg for cassava
- Price types: wholesale_transaction (70%), retail (20%), farmgate (10%)
- Verification status: verified (80%), pending_verification (20%)
- Date range: 2026-09-15 to 2026-11-14 (60 days)
- Reporting frequency: 3–5 observations per market per commodity per week

---

## 4. Documentation Deliverables

| File | Purpose |
|------|---------|
| `docs/demo-data/DEMO-DATA-BASELINE-AUDIT.md` | Current state of database (this document) |
| `docs/demo-data/DEMO-DATA-IMPLEMENTATION-PLAN.md` | This plan |
| `docs/demo-data/DEMO-DATA-SEED-GUIDE.md` | How to run the seed |
| `docs/demo-data/DEMO-DATA-CLEANUP-GUIDE.md` | How to remove demo data safely |
| `docs/demo-data/DEMO-DATA-VALIDATION-REPORT.md` | Post-seed validation results |
| `docs/branding/HATSI360-LOGO-ASSET-AUDIT.md` | Brand asset inventory |
| `docs/branding/HATSI360-LOGO-IMPLEMENTATION.md` | Logo usage across app |

---

## 5. Acceptance Criteria

1. ✅ Homepage shows market prices, movers, coverage stats
2. ✅ Markets directory shows 15 markets with latest prices
3. ✅ Commodity profiles show 60-day price history charts
4. ✅ Market comparison page has data to compare
5. ✅ Charts page has candlestick data
6. ✅ Admin observation review queue has pending items
7. ✅ All demo records identifiable by `test_fixture` source or `DEMO:` prefix
8. ✅ Cleanup migration removes only demo records
9. ✅ No genuine data affected by seed or cleanup
