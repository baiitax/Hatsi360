# Hatsi360 — Demo Data Baseline Audit

**Date:** 2026-11-15
**Project ref:** `umxzsdepbrenqysabtlt` (supabase-cobalt-park)
**Region:** us-east-1
**Postgres:** 17.11.0.019

---

## 1. Database Overview

| Metric | Value |
|--------|-------|
| Total tables (public schema) | 87 |
| Migrations applied | 45 |
| Commodities | 22 (seeded via 0007) |
| Commodity categories | 14 |
| Commodity grades | 58 |
| Measurement units | 8 |
| States | 11 |
| Markets | **0** |
| Price observations | **0** |
| Agent profiles | 0 |
| Organizations | 0 |
| Published price observations (view) | 0 |

The database has its full schema (migrations 0001–0045 applied) but contains only seed reference data. There are no markets, no observations, no agents, and no organisations.

---

## 2. Schema Summary

### Reference Data Tables (populated)
- `commodity_categories` — 14 rows (Grains, Pulses, Oilseeds, Roots, Fruits, Spices, Tree Crops, Livestock, Animal Products, Processed, Export, By-Products, Cash Crops, Other)
- `commodities` — 22 rows (Paddy Rice, Imported Rice, Local Rice, Wheat, Maize White/Yellow, Millet, Sorghum White/Red, Sesame Seed, Gum Arabic varieties, Groundnut, Bambara Nuts, Soya Beans, Cowpea, Cassava)
- `commodity_grades` — 58 rows (Grade 1–3, Off-grade, Milling/Baking/Feed, Export grade, Food/Crush grade, Acacia varieties for gum arabic)
- `measurement_units` — 8 rows (kg, g, tonne, bag, crate, litre, piece, unspecified)
- `states` — 11 rows (Lagos, Kano, Jigawa, Kaduna, Katsina, Zamfara, Nasarawa, Borno, Bauchi, Benue, Sokoto)

### Transactional Tables (empty)
- `markets` — 0 rows (schema supports legacy_id, market_zone_id, state_id, coordinates, market_type, priority, coverage_target)
- `price_observations` — 0 rows
- `agent_profiles` — 0 rows
- `organizations` — 0 rows
- `profiles` — 0 rows (Supabase auth.users may exist but no linked profiles)
- `collection_tasks` — 0 rows
- `market_agent_assignments` — 0 rows

### Enum Types (27 total)
| Enum | Values |
|------|--------|
| `price_type` | farmgate, wholesale_asking, wholesale_transaction, retail, processor_procurement, export_buy, export_sell, indicative, unspecified |
| `verification_status` | draft, pending_verification, verified, rejected, correction_requested, legacy_unverified, submitted |
| `observation_source` | legacy_import, **agent_app**, manual_entry, **test_fixture** |
| `user_role` | public_user, customer, agent, verification_officer, market_supervisor, analyst, admin, super_admin |
| `account_status` | active, suspended, deactivated |
| `market_sentiment` | positive, neutral, negative |
| `collection_task_status` | open, in_progress, submitted, awaiting_review, correction_required, completed, cancelled |

---

## 3. Demo Data Marker Strategy

The `observation_source` enum includes `test_fixture` — this is the designated marker for non-production data. All demo price observations will use `source_system = 'test_fixture'`.

For markets, agents, organizations and profiles, a `notes` or `description` field will include a `DEMO:` prefix for safe identification during cleanup.

---

## 4. Logo Asset Inventory

All brand assets are present in `public/brand/`:

| File | Purpose |
|------|---------|
| `hatsi360-lockup-full.png` | Full lockup (mark + wordmark + descriptor + endorsement) — **currently used in navbar and preloader** |
| `hatsi360-lockup-compact.png` | Compact lockup |
| `hatsi360-lockup-compact-mono.png` | Monochrome compact |
| `hatsi360-lockup-compact-light.png` | Light-background compact |
| `hatsi360-logo-horizontal.png` | Horizontal logo |
| `hatsi360-logo-horizontal-light.png` | Light variant |
| `hatsi360-logo-horizontal-mono.png` | Monochrome |
| `hatsi360-mark.png` | Icon-only mark |
| `hatsi360-mark-light.png` | Light mark |
| `hatsi360-mark-mono.png` | Monochrome mark |
| `hatsi360-wordmark.png` | Wordmark only |
| `hatsi360-favicon-16.png` / `32.png` | Favicons |
| `hatsi360-icon-192.png` / `512.png` | PWA icons |
| `hatsi360-apple-touch-icon.png` | Apple touch icon |
| `hatsi360-social-1200x630.png` | Open Graph / social card |
| `hatsi360-hero.png` | Homepage hero photograph |

---

## 5. Existing Seed System

- Migration `0007_seed_reference_data.sql` inserts the 22 commodities, 14 categories, 58 grades, 11 states, 8 units
- This migration is **idempotent** (uses INSERT ... ON CONFLICT)
- The local reference data in `src/data/seed/reference-data.ts` mirrors the migration
- No demo/test seed migration exists yet

---

## 6. Risks and Constraints

- **RLS is active** on all tables. Demo inserts must either use service role or be inserted by a super_admin user.
- **Foreign key constraints** are strict. Markets need valid state_ids, observations need valid commodity_id + market_id + unit_id.
- **Published view** (`published_price_observations`) requires `verification_status = 'verified'` and `published_at IS NOT NULL` and `is_current = true`.
- **Auth users** cannot be created via plain SQL — they require the Supabase Auth Admin API. Demo users will be documented as a separate provisioning step.
