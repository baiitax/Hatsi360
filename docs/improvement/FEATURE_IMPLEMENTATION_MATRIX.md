# Hatsi360 — Feature Implementation Matrix (Phase 0)

| | |
|---|---|
| Date | 2026-11-26 |
| Branch / commit | `arena/990d7ace-hatsi360` @ `6cc044d` (base) |
| Evidence | `source code`, `automated tests`, `local DB`; anything on the hosted project is `UNKNOWN` |

## How to read this

Each feature gets **exactly one** implementation status from the fixed vocabulary:

`IMPLEMENTED_AND_TESTED` · `IMPLEMENTED_NOT_FULLY_TESTED` · `PARTIALLY_IMPLEMENTED` · `UI_ONLY` · `BACKEND_ONLY` · `NOT_IMPLEMENTED` · `BLOCKED_BY_EXTERNAL_CONFIGURATION` · `PRODUCTION_STATUS_UNKNOWN`

Because the hosted database and the deployment are unreachable from this environment, a second column records production evidence separately. A feature can be `IMPLEMENTED_AND_TESTED` in code and still be `UNKNOWN` in production — collapsing those two facts into one status would be dishonest, so they are kept apart.

*About the list itself:* the 24 areas below are the product surfaces that exist in the repository. Each row names its routes and modules, so a differently-worded feature list can be mapped onto it without re-deriving anything.

### Status distribution

| Status | Count | Features |
|---|---|---|
| `IMPLEMENTED_AND_TESTED` | 6 | 5, 7, 8, 20, 21, 22 |
| `IMPLEMENTED_NOT_FULLY_TESTED` | 9 | 1, 2, 3, 4, 9, 11, 17, 18, 23 |
| `PARTIALLY_IMPLEMENTED` | 8 | 6, 12, 13, 14, 15, 16, 19, 24 |
| `UI_ONLY` | 0 | — |
| `BACKEND_ONLY` | 0 | — |
| `NOT_IMPLEMENTED` | 0 | — |
| `BLOCKED_BY_EXTERNAL_CONFIGURATION` | 1 | 10 |
| `PRODUCTION_STATUS_UNKNOWN` | 0 as a code status | every data-backed feature carries `UNKNOWN` in the production column |

*(Totals: 6 + 9 + 8 + 1 = 24.)*

## The matrix

| # | Feature | Status | Primary routes | Modules | DB dependencies | Tests | Production evidence |
|---|---|---|---|---|---|---|---|
| 1 | Homepage market intelligence | `IMPLEMENTED_NOT_FULLY_TESTED` | `/` | `components/homepage/*`, `lib/data/*` | `published_price_observations`, `commodities`, `markets` | `tests/ux` 25/32, `tests/routing` 7/7 | `UNKNOWN` |
| 2 | Price explorer (commodities, markets, compare, history) | `IMPLEMENTED_NOT_FULLY_TESTED` | `/prices`, `/commodities`, `/markets`, `/compare` | `components/data/*`, `lib/pricing.ts` | publication view, `market_price_summary` | `tests/data-integrity` 61/61, `tests/pricing` pass | `UNKNOWN` |
| 3 | Commodity reference pages & grades | `IMPLEMENTED_NOT_FULLY_TESTED` | `/commodities/[slug]` | `components/data/CommodityExplorer.tsx` | `commodities`, `commodity_grades`, `commodity_varieties` | no page-level test | `UNKNOWN` |
| 4 | Market pages & coverage reporting | `IMPLEMENTED_NOT_FULLY_TESTED` | `/markets/[slug]`, `/coverage` | `components/data/CoverageDashboard.tsx` | `markets`, `market_coverage`, `freshness` view | no page-level test | `UNKNOWN` |
| 5 | Intelligence hub | `IMPLEMENTED_AND_TESTED` | `/intelligence`, `/admin/intelligence/*` | `lib/intelligence/*` | `commodity_production|supply|demand|trade`, `evidence_sources` | `tests/intelligence` 32/32, `tests/analytics` 48/48 | `UNKNOWN` |
| 6 | Trade intelligence (HS codes, tariffs, blocs, flows) | `PARTIALLY_IMPLEMENTED` | `/trade`, `/admin/intelligence/{hs-codes,tariffs,trade-data,categories}` | `app/api/v1/trade/*` | `hs_codes`, `hs_revisions`, `commodity_hs_mappings`, `tariff_schedules`, `trade_blocs` | `tests/trade` 232/233 | `UNKNOWN` |
| 7 | Reports & research library | `IMPLEMENTED_AND_TESTED` | `/reports`, `/reports/[slug]`, `/research` | `lib/reports/*` | `reports`, `report_versions` | `tests/reports` 9/9, `tests/quality` 39/39 | `UNKNOWN` |
| 8 | Methodology & provenance | `IMPLEMENTED_AND_TESTED` | `/methodology`, `/about` | `lib/data/source.ts` (`getProvenance`) | `data_sources`, `observation_sources` | `tests/data-integrity` 61/61 | `UNKNOWN` |
| 9 | WhatsApp market-alerts waitlist | `IMPLEMENTED_NOT_FULLY_TESTED` | `/` (hero segment) | `lib/forms/actions.ts` (server action) | `whatsapp_subscribers` (migration `0049`) | none dedicated | `UNKNOWN` — table may not exist |
| 10 | Demo accounts | `BLOCKED_BY_EXTERNAL_CONFIGURATION` | `/login` | `app/(portal)/login/page.tsx` | `profiles`, auth users | `tests/auth` 49/50 | `UNKNOWN` — env flag unverified |
| 11 | Client dashboard | `IMPLEMENTED_NOT_FULLY_TESTED` | `/client` | `app/(client)/client/*` | `profiles`, `saved_*`, `entitlements` | `tests/ux` partial | `UNKNOWN` |
| 12 | Watchlists | `PARTIALLY_IMPLEMENTED` | `/client/watchlists` | `lib/entitlements/*` | `saved_commodities`, `saved_markets` | `tests/entitlements` 8/18 | `UNKNOWN` |
| 13 | Alerts & notification centre | `PARTIALLY_IMPLEMENTED` | `/client/alerts`, `/notifications` | `lib/notifications/*`, `app/api/notifications/read` | `alerts`, `notifications`, `notification_deliveries` | `tests/phase-08a` 78/102 | `UNKNOWN` |
| 14 | Data exports | `PARTIALLY_IMPLEMENTED` | `/client/exports` | `lib/exports/*` | `export_jobs`, storage bucket | `tests/phase-08a/exports-entitlement` fails | `UNKNOWN` |
| 15 | Bulk data access & API keys | `PARTIALLY_IMPLEMENTED` | `/client/bulk`, `/api-docs` | `lib/api/*` | `api_keys`, `api_usage` | `tests/api` 26/54 (28 skipped) | `UNKNOWN` |
| 16 | Subscriptions & entitlements | `PARTIALLY_IMPLEMENTED` | `/client/subscription`, `/admin/subscriptions` | `lib/entitlements/*` | `plans`, `subscriptions`, `entitlements` | `tests/phase-08a` partial | `UNKNOWN` |
| 17 | Onboarding | `IMPLEMENTED_NOT_FULLY_TESTED` | `/client/onboarding` | `OnboardingWizard.tsx` | `profiles`, `businesses` | none dedicated; 7 lint errors | `UNKNOWN` |
| 18 | Commercial offers | `IMPLEMENTED_NOT_FULLY_TESTED` | `/client/offers`, `/admin/offers` | `lib/operations/*` | `commercial_offers`, `offer_status_events` | `tests/admin` 27/28 | `UNKNOWN` |
| 19 | RFQ, quotes & orders (stage 4) | `PARTIALLY_IMPLEMENTED` | `/client/trade/rfqs`, `/client/trade/orders` | `app/(client)/client/trade/*` | `rfqs`, `quotes`, `orders`, `supplier_profiles` — **no applicable migration** | `tests/trade` partial | `UNKNOWN` |
| 20 | Agent field collection | `IMPLEMENTED_AND_TESTED` | `/agent/*` (19 pages) | `lib/agent/*`, `app/api/agent/submit` | `price_observations`, `collection_sessions`, `observation_evidence` | `tests/field` 80/80 | `UNKNOWN` |
| 21 | Agent queue & assignments | `IMPLEMENTED_AND_TESTED` | `/agent/home`, `/agent/tasks`, `/admin/assignments` | `lib/agent/use-field-queue.ts` | `collection_tasks`, `market_collection_schedules` | `tests/operations` 12/12 | `UNKNOWN` |
| 22 | Verification & publication workflow | `IMPLEMENTED_AND_TESTED` | `/admin/verification`, `/admin/quality` | `lib/operations/*` | `price_observations`, publication view, `verification_events` | `tests/data-integrity` 61/61, `tests/observations-validation` pass | `UNKNOWN` |
| 23 | Corrections & audit trail | `IMPLEMENTED_NOT_FULLY_TESTED` | `/admin/observations`, `/agent/correct` | `components/agent/CorrectionForm.tsx` | append-only triggers, `audit_log` | `tests/quality` 39/39 | `UNKNOWN` |
| 24 | Admin console & operations | `PARTIALLY_IMPLEMENTED` | `/admin/*` (40 pages) | `lib/operations/*`, `app/api/jobs/run` | 70+ tables, `scheduled_job_runs` | `tests/admin` 27/28 | `UNKNOWN` |

## Features that need explanation

### 6 — Trade intelligence: `PARTIALLY_IMPLEMENTED`

The UI and the API exist (`/admin/intelligence/{hs-codes,tariffs,trade-data,categories,trade-intelligence/explorer}`, `app/api/v1/{hs-codes,tariffs,trade-blocs,trade/flows,trade/analytics}`). What does not hold is the data: `0038_hs_classification.sql` maps HS codes onto commodities **by name**, using a generic trade vocabulary (`Cattle`, `Beef`, `Sugar`, `Salt`, `Iron and Steel`, `Machinery`…) of which exactly **one** name (`Wheat`) exists in the reference data created by `0007_seed_reference_data.sql`. Every other lookup resolves to `NULL` and violates `commodity_id NOT NULL`, so the migration cannot apply (`MIG-04`, `local DB`). Whatever HS mappings exist in production did not come from this file.

Consequence: the trade-intelligence screens are wired to tables whose contents cannot be rebuilt, and no HS mapping for the 22 real commodities is version-controlled.

### 10 — Demo accounts: `BLOCKED_BY_EXTERNAL_CONFIGURATION`

The listing is correctly gated: `src/app/(portal)/login/page.tsx` renders demo credentials only when `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true'`, and `tests/auth/demo-access.test.ts` asserts the accounts are *reachable* rather than hidden. That test fails here — `the demo agent could not authenticate` — because there is no reachable Supabase project and no service-role key in this environment (`automated tests`). The Vercel value of the flag is `UNKNOWN`. Neither fact is an application defect; both block any statement about demo access in production.

### 12 / 16 — Watchlists & entitlements: `PARTIALLY_IMPLEMENTED`

Entitlement checks exist in three places: application helpers (`src/lib/entitlements/*`), RLS policies from `0043`/`0044`/`0045` (which apply), and `0042_enforce_watchlist_entitlement.sql` for watchlists — which **cannot apply**, because it creates the policy `saved_commodities_entitlement` four times (once per command) on one table, and PostgreSQL permits one policy per name per table. The file also drops the previous `saved_commodities_owner` policy first, so its partial execution would leave the table with no policy at all.

Net effect: watchlist entitlement is enforced only in application code, and the database-level guarantee its own header comment promises does not exist (`SEC-02`).

### 19 — RFQ / quotes / orders: `PARTIALLY_IMPLEMENTED`

`src/app/(client)/client/trade/rfqs/page.tsx` queries `rfqs` and `quotes` directly through the server Supabase client; `/client/trade/orders/page.tsx` queries orders. The only migration that creates those tables, `0047_stage4_rfq_orders.sql`, cannot parse: it uses `CREATE TYPE IF NOT EXISTS` five times, which PostgreSQL does not support (`MIG-07`, `local DB`). If the hosted project has these tables, they were created outside the migration chain; if it does not, those two client routes query tables that do not exist. Either way the schema is not reproducible, and this is `UNKNOWN`/broken rather than "done".

### 23 — Corrections & audit trail: `IMPLEMENTED_NOT_FULLY_TESTED`

The database side is strong and was verified on a local instance: published economic values cannot be edited in place; a correction is a new row that supersedes the old one, and the original remains in the trail (`local DB`). The UI side carries lint errors in `components/agent/CorrectionForm.tsx` and no dedicated test file.

### 24 — Admin console & operations: `PARTIALLY_IMPLEMENTED`

40 pages, and the navigation is data-driven (`src/lib/operations/navigation.ts`). One navigation entry points at a route that does not exist: `/admin/coverage` is listed in the sidebar and allowed in `src/lib/auth/routing.ts`, but there is no `src/app/admin/coverage/page.tsx` — clicking it 404s (`FEAT-01`, `source code`, and `tests/admin` asserts exactly this). The jobs runner (`app/api/jobs/run` + `src/lib/jobs/index.ts`) is implemented and idempotent but has never been observed running in production.

## Cross-cutting surfaces (not scored as features)

| Surface | State | Evidence |
|---|---|---|
| Public API `v1` (24 of 28 route handlers) | Read-only JSON surface with a shared error envelope; `app/api/v1/[...path]/route.ts` answers unmatched paths with a JSON 404. Optional API-key auth (`sha256` hash, `Authorization: Bearer` or `X-API-Key`), per-application scopes and `rateLimitPerMinute`, anonymous fallback at 120/min. Rate limiting is **in-process** (`checkRateLimit`), so it is per-instance on serverless. | `source code` |
| Jobs runner (5 jobs) | Idempotent per scheduled slot; bearer secret with `timingSafeEqual`; writes `scheduled_job_runs`. Production schedule `UNKNOWN`. | `source code` |
| Image/brand registry | `bright` manifest + `tests/images` guard every rendered asset. Currently 1 failing assertion (`QA-02`). | `automated tests` |
| Design system | Token-driven; 4 failing assertions for raw colour literals introduced by the light-theme rewrite. | `automated tests` |

## Summary

Six features are implemented and tested at the level this environment can prove. Nine are implemented but not fully tested. Eight are partially implemented, and in every case the partial part is either a migration that cannot apply or a data set that cannot be rebuilt. One is blocked by configuration outside the repository. None of the 24 can be described as production-validated, because production was not observable from here.
