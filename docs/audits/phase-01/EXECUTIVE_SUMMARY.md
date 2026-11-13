# Phase 01 — Executive Summary

**Audit date:** 2026-11-13
**Commit audited:** `26b6514` — *Seed the commercial offers and fix a public-read hole in the verification trail*
**Mode:** Audit-first, evidence-driven, non-destructive. No schema, data, branding, auth or deployment changes were made.

---

## Overall platform condition

**MATURE INFRASTRUCTURE, THIN DATA.** The database and application architecture are considerably further
along than the data inside them. Of 64 tables, **35 are empty**. The schema anticipates research
reports, commodity fundamentals, seasonality, specifications, collection tasks, market zones,
organisations, API applications, export jobs and market intelligence — none of which hold a single row.

This is the single most important fact for Phase 02 planning. The platform is not a
"conventional agricultural pricing website with a database bolted on". It is a **market-intelligence
data model with almost nothing in it**, wrapped in a mostly-complete Next.js application.

## Existing capabilities — VERIFIED

| Area | Evidence |
|---|---|
| Reference catalogue | 22 commodities, 14 categories, 58 grades, 8 units, 11 states, 1 country, 42 synonyms — populated |
| Price observation model | 33 columns, versioning, idempotency, unit normalisation, provenance — see `PRICE_DATA_INTEGRITY_AUDIT.md` |
| Verification + publication separation | `price_observations_publication_guard` CHECK + `prevent_published_economic_mutation` trigger |
| RLS | 134 policies across all 64 tables; ownership, staff and public reads correctly scoped |
| Public API | 12 routes, API-key auth, entitlement checks, per-minute rate limiting |
| Auth | Invitation-only operational roles; `signUp` hard-codes `public_user` |
| Agent → verification → publication | Functions exist and are RLS-guarded; see `DATA_FLOW_AND_INTEGRATION_MAP.md` |
| Commercial offers | `buyer_offers`/`seller_offers` with a verification workflow and RLS (30 rows seeded as demo data) |
| Watchlists and alerts | `saved_commodities`/`saved_markets`/`price_alerts`, owner-scoped, rendering on `/trade/watchlist` and `/trade/alerts` |
| Brand centralisation | `src/lib/brand.ts` is the single source of truth for every user-facing name |
| Image system | 52-asset central registry, 52 served, 0 duplicate SHA-256 |

## Critical architectural issues

1. **P0 — Published demo admin credentials mutated the live production database during this audit.**
   See `SECURITY_AND_RLS_AUDIT.md` §1. This is the audit's most serious finding.
2. **P0/P1 — `_hatsi_migrations` has RLS disabled and `anon` holds TRUNCATE/DELETE/INSERT/UPDATE.**
   Verified: `anon` reads 29 rows. See `SECURITY_AND_RLS_AUDIT.md` §2.
3. **P1 — The test suite has a failing test** caused by finding 1. See `REMEDIATION_BACKLOG.md` R-03.
4. **P2 — `npm run lint` is broken** (`next lint` was removed in Next 16).
5. **P2 — 35 of 64 tables are empty**, so seven of the ten target capabilities have no data to render.

## Database condition

64 tables · 2 views · 25 enums · 134 RLS policies · 179 indexes · 7 extensions · 1 private storage bucket
(0 objects). `published_price_observations` = **0 rows**. All 29 migrations applied; `_hatsi_migrations`
records 29 files while `supabase/migrations/` holds 30 — see `DATABASE_AUDIT.md` §9.

## Data integrity condition

**Sound where it exists.** `price_observations` carries `supersedes_id`/`superseded_by`/`is_current`
(lineage), a `submission_key` unique index (idempotency), a `duplicate_guard` unique index,
`normalized_amount`/`normalized_unit_id` (unit normalisation), `currency_code`, `price_type`,
`collected_at_precision`, and `source_system`/`source_reference` (provenance). Corrections are
append-only via `append_correction()`. Nothing is silently overwritten.

But the volume is 58 rows across 16 commodities and 5 markets, spanning 2026-10-28 → 2026-11-10, and
**0 are published**. See `PRICE_DATA_INTEGRITY_AUDIT.md`.

## Security condition

**Structurally strong, operationally exposed.** The policy design is correct — ownership checks,
staff gates, a publication guard, and the offer-trail fix from migration 0031. The exposure is that
**the demo administrator's credentials are printed on a public web page and are live against this
database.** Finding 1 proves an interactive actor used them. `ip_hash` is `null` on every audit row,
so the audit trail cannot say where from.

## Major functional gaps

- **Nothing is published.** `published_price_observations` is empty, so every public price surface
  renders an empty state. This is *correct behaviour*, not a defect.
- **No coordinates.** 0 of 11 markets carry lat/lng, so no map is possible.
- **No research or fundamentals.** `articles`, `market_reports`, `commodity_fundamentals`,
  `commodity_seasonality`, `commodity_specifications` are all empty.
- **No collection tasks, zones, or organisations.** Those tables are empty, so the collection planner
  and zone administration have nothing to operate on.
- **No API applications.** `api_applications` is empty, so no API key has ever been issued.
- **No analytics snapshots, export jobs, or market intelligence.**

## Reusable infrastructure — Category A (preserve)

`price_observations` and its lifecycle · the RLS policy set · `src/lib/brand.ts` ·
`src/lib/trade/*` (149 tests) · `src/lib/api/handler.ts` (auth, entitlements, rate limiting) ·
`src/lib/data/` source abstraction · `src/lib/images/registry.ts` · `src/lib/operations/*` ·
`src/lib/auth/*` · the migration chain.

## Critical risks

| Risk | Severity |
|---|---|
| Demo admin credentials are live and mutable against production data | **P0** |
| `_hatsi_migrations` writable by `anon` | **P0/P1** |
| Unused 3-arg `is_public_observation` overload does not filter `test_fixture` | **P1** |
| Public price surfaces have zero published rows | **P1** (blocks the product's core promise) |
| `npm run lint` broken — no lint gate in CI | **P2** |
| `engines.node >=22` vs Node 20.20.2 in this environment | **P2** |
| Local git object store rolled back 3× during this audit | **P2** (mitigated: remote is authoritative) |

## Recommended next steps

1. **Rotate and remove the demo accounts** before any further shared-database work (R-01).
2. **Enable RLS on `_hatsi_migrations`** and revoke the `anon`/`authenticated` DML grants (R-02).
3. **Drop the unused 3-arg `is_public_observation` overload** (R-04).
4. **Repair `npm run lint`** (R-06).
5. **Decide the publication policy** — the platform cannot show a single price until something is
   verified *and* published, and nothing currently is (R-08).
6. Then, and only then, begin Phase 02 against `PHASE_02_READINESS.md`.

## Phase 02 readiness

**CONDITIONALLY APPROVED** — blocking items are R-01, R-02 and R-04. See `PHASE_02_READINESS.md`
for the full reasoning and the complete gate list.
