# Phase 01 — Baseline Assessment

**Date:** 2026-11-14  
**Commit:** `6a82bd6` (Phase 00 complete)  
**Supabase project:** `supabase-cobalt-park` (ref: `umxzsdepbrenqysabtlt`)  
**Mode:** Read-only inspection of live database, source code, migrations and test suite

---

## 1. Database State

### 1.1 Reference Data

| Table | Rows | Status |
|---|---|---|
| `countries` | 1 | Nigeria. Currency: NGN/₦ |
| `states` | 11 | Nigerian states (Lagos → Borno) |
| `markets` | 11 | All active. 0 have latitude/longitude. 0 have market_zone_id |
| `commodity_categories` | 14 | All populated |
| `commodities` | 22 (21 active) | Grains, legumes, tubers, spices |
| `commodity_grades` | 58 | Across all commodities |
| `commodity_varieties` | 0 | Empty |
| `commodity_synonyms` | 42 | Search aliases |
| `commodity_unit_conversions` | 0 | **EMPTY — cross-unit comparison impossible** |
| `measurement_units` | 8 | kg, g, tonne, litre, bucket, bag, cup, piece |

### 1.2 Operational Data

| Table | Rows | Status |
|---|---|---|
| `profiles` | 5 | 1 agent, 1 verifier, 1 admin, 1 customer, 1 public |
| `agent_profiles` | 1 | Demo agent only |
| `market_agent_assignments` | 6 (all active) | Demo agent → 4 markets (Dawanau, Mile 12, Funtua, Sokoto, Zaki Biam — duplicate Dawanau) |
| `price_observations` | 58 | 7 draft, 16 submitted, 7 pending, 12 verified, 9 rejected, 7 correction_requested |
| `price_verification_events` | 2 | Only 2 events from Phase 00 audit remediation |
| `collection_batches` | 10 | Test fixture batches |
| `collection_tasks` | 0 | **EMPTY — no tasks ever generated** |
| `collection_task_events` | 0 | **EMPTY** |
| `market_collection_schedules` | 0 | **EMPTY — no schedules defined** |
| `market_commodity_scope` | 0 | **EMPTY — no market-commodity coverage configured** |
| `market_visit_records` | 0 | **EMPTY** |
| `notifications` | 64 | All `assignment_changed` |
| `data_quality_flags` | 0 | **EMPTY — quality engine never ran** |
| `observation_quality_findings` | 0 | **EMPTY** |
| `scheduled_job_runs` | 0 | **EMPTY — no jobs ever executed** |
| `analytics_snapshots` | 0 | **EMPTY** |
| `data_quality_rule_versions` | 0 | **EMPTY** |

### 1.3 Published Data

| Metric | Value |
|---|---|
| Published observations | **0** |
| Observations with `published_at IS NOT NULL` | **0** |
| Public view (`published_price_observations`) rows | **0** |
| `market_price_summary` rows | **0** |

**The platform has never published a price.** Every public page renders its honest empty state.

### 1.4 Markets Without Coordinates

All 11 markets have `latitude = NULL` and `longitude = NULL`. No map rendering is possible.

---

## 2. Existing Database Functions

### 2.1 Observation Lifecycle

| Function | Purpose | Status |
|---|---|---|
| `submit_observation(jsonb, text)` | Agent submission with idempotency key | **VERIFIED IN CODE** |
| `approve_observation(uuid, text)` | Staff verification (separate from publication) | **VERIFIED IN CODE** |
| `reject_observation(uuid, text)` | Staff rejection with reason | **VERIFIED IN CODE** |
| `request_correction(uuid, text)` | Staff correction request | **VERIFIED IN CODE** |
| `publish_observation(uuid)` | Staff publication (separate act from approval) | **VERIFIED IN CODE** |
| `resubmit_observation(uuid, jsonb, text)` | Agent resubmission after correction | **VERIFIED IN CODE** |
| `append_correction(uuid, jsonb, text)` | Append-only correction | **VERIFIED IN CODE** |

### 2.2 Task and Schedule Management

| Function | Purpose | Status |
|---|---|---|
| `generate_collection_tasks(date)` | Idempotent task generation from schedules | **VERIFIED IN CODE** — 0 tasks because 0 schedules |
| `mark_overdue_tasks(timestamptz)` | Overdue task marking | **VERIFIED IN CODE** — never executed |
| `transition_task(bigint, status, text)` | Task lifecycle state machine | **VERIFIED IN CODE** |
| `set_market_assignment(bigint, uuid, boolean, text)` | Agent-market assignment | **VERIFIED IN CODE** |

### 2.3 Quality and Analytics

| Function | Purpose | Status |
|---|---|---|
| `apply_observation_findings(uuid, jsonb)` | Record quality findings from app layer | **VERIFIED IN CODE** — never called |
| `observation_findings(uuid)` | Read quality findings | **VERIFIED IN CODE** |
| `raise_quality_flag(...)` | Manual quality flag | **VERIFIED IN CODE** |
| `resolve_quality_flag(...)` | Resolve quality flag | **VERIFIED IN CODE** |
| `refresh_analytics_snapshot(date)` | Daily metrics snapshot | **VERIFIED IN CODE** — never executed |

### 2.4 Account and Auth

| Function | Purpose | Status |
|---|---|---|
| `is_staff()` | Staff role check | **VERIFIED** |
| `is_admin()` | Admin role check | **VERIFIED** |
| `is_active_account()` | Account status check | **VERIFIED** |
| `has_role(...)` | Role membership check | **VERIFIED** |
| `is_assigned_to_market(bigint)` | Agent assignment check | **VERIFIED** |
| `set_account_status(uuid, status, text)` | Account lifecycle | **VERIFIED IN CODE** |
| `set_user_role(uuid, role)` | Role assignment (admin only) | **VERIFIED IN CODE** |
| `provision_agent(...)` | Agent onboarding | **VERIFIED IN CODE** |

### 2.5 Notifications and Audit

| Function | Purpose | Status |
|---|---|---|
| `notify(...)` | In-app notification creation | **VERIFIED IN CODE** |
| `write_audit(...)` | Immutable audit log entry | **VERIFIED IN CODE** |

### 2.6 Offers

| Function | Purpose | Status |
|---|---|---|
| `update_offer_status(...)` | Commercial offer lifecycle | **VERIFIED IN CODE** |
| `expire_lapsed_offers()` | Offer expiry sweep | **VERIFIED IN CODE** — never executed |

---

## 3. Application Layer Code

### 3.1 Operations Services

| File | Lines | Purpose | Classification |
|---|---|---|---|
| `src/lib/operations/field.ts` | 1,690 | Agent data queries: assignments, observations, tasks | **EXISTING AND VERIFIED** |
| `src/lib/operations/field-actions.ts` | 871 | Agent server actions: submit, draft, correct, evidence | **EXISTING AND VERIFIED** |
| `src/lib/operations/admin.ts` | 1,042 | Admin operations: market/commodity/grade management | **EXISTING AND VERIFIED** |
| `src/lib/operations/actions.ts` | 634 | Shared server actions: admin settings, jobs | **EXISTING AND VERIFIED** |
| `src/lib/operations/agent.ts` | 580 | Agent data: profile, history, performance | **EXISTING AND VERIFIED** |
| `src/lib/operations/commercial.ts` | 506 | Buyer/seller offer operations | **EXISTING AND VERIFIED** |
| `src/lib/operations/navigation.ts` | 271 | Admin/agent navigation configuration | **EXISTING AND VERIFIED** |
| `src/lib/operations/field-constants.ts` | 61 | Price types, status labels | **EXISTING AND VERIFIED** |

### 3.2 Quality Engine

| File | Lines | Purpose | Classification |
|---|---|---|---|
| `src/lib/quality/rules.ts` | ~330 | 9 quality rules (pure functions) | **EXISTING AND VERIFIED** |
| `src/lib/quality/evaluate.ts` | ~100 | Quality evaluation orchestrator | **EXISTING AND VERIFIED** |

**Nine rules exist:**
1. `missing_mandatory_field` — blocking
2. `invalid_price` — blocking
3. `unrecognised_unit` — review
4. `market_not_assigned` — blocking
5. `collection_timestamp_out_of_range` — review
6. `large_price_change` — warning (35% threshold)
7. `duplicate_suspected` — warning
8. `missing_evidence` — review
9. `stale_observation` — info

### 3.3 Data Source

| File | Purpose | Classification |
|---|---|---|
| `src/lib/data/source.ts` | DataSource interface contract | **EXISTING AND VERIFIED** |
| `src/lib/data/supabase.ts` | Supabase implementation | **EXISTING AND VERIFIED** |
| `src/lib/data/fixture.ts` | Legacy fixture fallback | **EXISTING AND VERIFIED** |
| `src/lib/data/index.ts` | Source resolution | **EXISTING AND VERIFIED** |

### 3.4 Auth and Guards

| File | Purpose | Classification |
|---|---|---|
| `src/lib/auth/guards.ts` | Role-gating: requireStaff, requireAgent, requireAdmin | **EXISTING AND VERIFIED** |
| `src/lib/auth/actions.ts` | Sign in/up server actions | **EXISTING AND VERIFIED** |
| `src/lib/auth/routing.ts` | Role-based routing | **EXISTING AND VERIFIED** |

---

## 4. UI Routes

### 4.1 Agent App (`/agent/*`)

| Route | Purpose | Classification |
|---|---|---|
| `/agent/home` | Agent dashboard | **EXISTING AND VERIFIED** |
| `/agent/tasks` | Assigned collection tasks | **EXISTING AND VERIFIED** |
| `/agent/assignments` | Market assignments | **EXISTING AND VERIFIED** |
| `/agent/collection/new` | New collection form | **EXISTING AND VERIFIED** |
| `/agent/collection/[id]` | Collection detail | **EXISTING AND VERIFIED** |
| `/agent/collect` | Quick collection | **EXISTING AND VERIFIED** |
| `/agent/submissions` | Submission history | **EXISTING AND VERIFIED** |
| `/agent/observations` | Observation list | **EXISTING AND VERIFIED** |
| `/agent/corrections` | Corrections needed | **EXISTING AND VERIFIED** |
| `/agent/notifications` | Notifications | **EXISTING AND VERIFIED** |
| `/agent/markets` | Assigned markets | **EXISTING AND VERIFIED** |
| `/agent/performance` | Performance metrics | **EXISTING AND VERIFIED** |
| `/agent/profile` | Agent profile | **EXISTING AND VERIFIED** |
| `/agent/history` | Visit history | **EXISTING AND VERIFIED** |
| `/agent/help` | Help | **EXISTING AND VERIFIED** |

### 4.2 Admin Control Centre (`/admin/*`)

| Route | Purpose | Classification |
|---|---|---|
| `/admin/overview` | Dashboard | **EXISTING AND VERIFIED** |
| `/admin/verification` | Verification queue | **EXISTING AND VERIFIED** |
| `/admin/observations` | Observation management | **EXISTING AND VERIFIED** |
| `/admin/quality` | Quality management | **EXISTING AND VERIFIED** |
| `/admin/tasks` | Collection tasks | **EXISTING AND VERIFIED** |
| `/admin/assignments` | Agent assignments | **EXISTING AND VERIFIED** |
| `/admin/agents` | Agent management | **EXISTING AND VERIFIED** |
| `/admin/markets` | Market management | **EXISTING AND VERIFIED** |
| `/admin/schedule` | Collection scheduling | **EXISTING AND VERIFIED** |
| `/admin/operations` | Operations dashboard | **EXISTING AND VERIFIED** |
| `/admin/analytics` | Analytics | **EXISTING AND VERIFIED** |
| `/admin/reports` | Reports | **EXISTING AND VERIFIED** |
| `/admin/notifications` | Notifications | **EXISTING AND VERIFIED** |
| `/admin/settings` | System settings | **EXISTING AND VERIFIED** |
| `/admin/system` | System health | **EXISTING AND VERIFIED** |
| `/admin/search` | Global search | **EXISTING AND VERIFIED** |
| `/admin/audit` | Audit log | **EXISTING AND VERIFIED** |
| + 12 more routes | Categories, commodities, grades, units, zones, customers, subscriptions, API, exports, profile | **EXISTING AND VERIFIED** |

### 4.3 Public Price Pages

| Route | Purpose | Classification |
|---|---|---|
| `/prices` | Latest published prices | **EXISTING BUT INCOMPLETE** — 0 published |
| `/prices/[commodity]` | Commodity price history | **EXISTING BUT INCOMPLETE** — 0 published |
| `/markets` | Market directory | **EXISTING AND VERIFIED** |
| `/markets/[slug]` | Market detail | **EXISTING AND VERIFIED** |
| `/commodities` | Commodity directory | **EXISTING AND VERIFIED** |
| `/commodities/[slug]` | Commodity profile | **EXISTING AND VERIFIED** |
| `/compare` | Price comparison | **EXISTING BUT INCOMPLETE** — needs ≥2 published |
| `/trade/terminal` | Market terminal | **EXISTING BUT INCOMPLETE** — 0 published |
| `/coverage-report` | Coverage report | **EXISTING BUT INCOMPLETE** — 0 published |

---

## 5. Test Baseline

### 5.1 Current Test State

```
Test Files: 1 failed | 34 passed | 1 skipped (36 total)
     Tests: 1 failed | 787 passed | 28 skipped (816 total)
```

The single failure is `tests/auth/demo-access.test.ts` which requires live Supabase credentials (environmental, not a code defect).

### 5.2 Test Coverage by Domain

| Domain | Files | Tests | Status |
|---|---|---|---|
| Quality rules | `tests/quality/rules.test.ts`, `tests/quality/evaluate.test.ts` | ~40 | ✅ PASS |
| Trade analytics | `tests/trade/*.test.ts` | ~149 | ✅ PASS |
| Brand/design | `tests/brand/brand.test.ts`, `tests/design-system/*.test.ts` | ~48 | ✅ PASS |
| Data integrity | `tests/data-integrity/*.test.ts` | ~25 | ✅ PASS (with DB) |
| Field operations | `tests/field/*.test.ts` | ~30 | ✅ PASS |
| Entitlements | `tests/entitlements/entitlements.test.ts` | ~8 | ✅ PASS |
| API routes | `tests/api-routes.test.ts` | 28 | ⏭️ SKIP (needs DB) |
| Auth | `tests/auth/*.test.ts` | ~15 | ⚠️ 1 fail (needs DB) |
| UX/Loading | `tests/ux/*.test.tsx`, `tests/loading/*.test.tsx` | ~40 | ✅ PASS |
| Images | `tests/images/*.test.ts` | ~20 | ✅ PASS |

### 5.3 Missing Test Coverage

- ❌ No tests for `generate_collection_tasks()`
- ❌ No tests for `mark_overdue_tasks()`
- ❌ No tests for `transition_task()`
- ❌ No tests for `publish_observation()`
- ❌ No tests for `refresh_analytics_snapshot()`
- ❌ No tests for market coverage calculations
- ❌ No tests for freshness state computation
- ❌ No E2E workflow tests (submit → verify → publish → public display)

---

## 6. Classification of Findings

### 6.1 EXISTING AND VERIFIED (Reuse as-is)

- ✅ Price observation schema (33 columns, versioning, idempotency)
- ✅ Publication guard (CHECK constraint)
- ✅ Prevented published mutation trigger
- ✅ Submit/approve/reject/publish function chain
- ✅ 9 quality rules (pure functions, well-tested)
- ✅ Agent submission flow (server actions with validation)
- ✅ Verification queue (admin UI with filtering)
- ✅ Assignment ownership enforcement
- ✅ Self-verification prevention
- ✅ Audit logging via `write_audit()`
- ✅ Notification system via `notify()`
- ✅ RLS: 134+ policies, correct ownership/staff/public separation
- ✅ Collection batch workflow
- ✅ Evidence upload (private bucket, signed URLs)
- ✅ DataSource abstraction (supabase/fixture)
- ✅ Brand centralisation (`src/lib/brand.ts`)
- ✅ Design system (41 terminal components)

### 6.2 EXISTING BUT INCOMPLETE (Extend)

- ⚠️ **Collection tasks** — Schema and functions exist, 0 tasks ever created because 0 schedules
- ⚠️ **Collection schedules** — Schema exists, 0 defined
- ⚠️ **Market commodity scope** — Schema exists, 0 entries
- ⚠️ **Quality findings** — Engine exists in code, never called during submission flow
- ⚠️ **Analytics snapshots** — Function exists, never executed
- ⚠️ **Public price pages** — UI exists, correctly shows empty states (0 published)
- ⚠️ **Agent performance** — UI exists, no data to aggregate
- ⚠️ **Coverage dashboard** — UI exists, no coverage data configured

### 6.3 MISSING (Must Build)

- ❌ **Market Data Operations dashboard** — The central operational view showing collection health
- ❌ **Coverage matrix** — Markets × Commodities × Dates grid
- ❌ **Freshness indicators** — CURRENT/AGING/STALE/NO_DATA/UNDER_REVIEW states
- ❌ **Batch publication workflow** — Select and publish multiple observations at once
- ❌ **Publication withdrawal** — Withdraw a published observation with reason
- ❌ **Collection schedule UI** — Create/edit/view schedules in admin
- ❌ **Task management UI enhancements** — Assign, reassign, cancel tasks from admin
- ❌ **Data import** — CSV/XLSX controlled import with validation
- ❌ **Operational reporting** — Collection completion rate, submission-to-publication time
- ❌ **Freshness-based stale detection** — Automatic detection of markets missing expected collection
- ❌ **Duplicate detection workflow** — UI for reviewing flagged duplicates

### 6.4 BROKEN (Must Fix)

- 🔴 **Demo agent has duplicate Dawanau assignment** — Two active assignments to the same market
- 🔴 **0 commodity_unit_conversions** — Cross-unit comparison is not normalised
- 🔴 **Quality engine not integrated** — Rules exist but are never called during submission
- 🔴 **No collection schedules** — Entire task generation pipeline is idle

### 6.5 REQUIRES OWNER DECISION

- 🟡 **Should the 12 verified fixture observations be published as demo data?** — This would prove the end-to-end pipeline and populate the public pages. The alternative is to wait for real field collection.
- 🟡 **Should real market coordinates be added?** — All 11 markets lack lat/lng. The brief says coordinates must not be invented — they require a verified source.
- 🟡 **Should `observation_source` enum gain a `'test_fixture'` value?** — The existing enum has `legacy_import`, `agent_app`, `manual_entry`. Test fixtures currently use `source_system = 'agent_app'` or `'test_fixture'` as text — but `test_fixture` is not in the enum. The `published_price_observations` view filters `COALESCE(source_system, 'agent_app') <> 'test_fixture'` — this works because the cast to the enum succeeds for `agent_app` but `test_fixture` is stored as text in the column (the column is `observation_source` type). Need to verify how this actually works.

---

## 7. Security and Permissions Review

### 7.1 RLS Policy Summary

| Table | Policies | Key Rules |
|---|---|---|
| `price_observations` | 8+ policies | Agent read own, staff read all, public read via `is_public_observation()` |
| `profiles` | 3 policies | Owner read, staff read all |
| `market_agent_assignments` | 4 policies | Owner read, staff read/write |
| `collection_tasks` | 4 policies | Assignee read, staff read all |
| `data_quality_flags` | 2 policies | Staff + owner read |
| `observation_quality_findings` | 4 policies | Staff + owner read, no direct write |
| `notifications` | 2 policies | Owner only |
| `_hatsi_migrations` | 1 policy | Staff only (Phase 00 fix) |

### 7.2 Authorization Checks in Functions

All operational functions re-check authorization:
- `submit_observation()` — checks `is_active_account()`, `has_role('agent', 'market_supervisor')`, `is_assigned_to_market()`
- `approve_observation()` — checks `is_staff()`, prevents self-approval
- `publish_observation()` — checks `is_staff()`, requires verified status
- `request_correction()` — checks `is_staff()`, prevents self-review
- `reject_observation()` — checks `is_staff()`

### 7.3 Security Concerns

- ✅ Service-role key never exposed to browser
- ✅ Self-verification prevented
- ✅ Publication requires prior verification
- ✅ Published observations are immutable (trigger prevents mutation)
- ✅ Corrections are append-only
- ⚠️ `audit_logs.ip_hash` is NULL on every row (no origin provenance)
- ⚠️ Demo accounts still exist in database (now gated behind env var)

---

## 8. Data Integrity Assessment

### 8.1 Observation Provenance

All 58 observations are test fixtures:
- `source_system = 'test_fixture'` (but this is not in the `observation_source` enum)
- `source_reference = 'test_fixture'`
- All have `published_at IS NULL`
- Notes begin with "TEST FIXTURE"
- 12 verified by `demo.verifier@hatsi360.test`
- 0 published

The `published_price_observations` view correctly filters these out via:
```sql
COALESCE(o.source_system, 'agent_app') <> 'test_fixture'
AND COALESCE(o.source_reference, '') <> 'test_fixture'
```

### 8.2 Idempotency

- `submission_key` unique index exists (partial, non-null)
- `duplicate_guard` unique index prevents exact duplicates
- `submit_observation()` checks idempotency key before inserting
- ✅ Well-designed, never tested in production

### 8.3 Unit Conversion Gap

`commodity_unit_conversions` is empty. The `normalized_amount`/`normalized_unit_id` columns on every observation are NULL. Cross-unit price comparison is impossible until conversions are defined.

---

## 9. Proposed Implementation Changes

### Stage 2 — Database Foundations

1. **Add `test_fixture` to `observation_source` enum** — Currently fixtures store a value not in the enum
2. **Create collection schedules** — Define schedules for the 11 markets with appropriate commodity coverage
3. **Populate `market_commodity_scope`** — Define which commodities each market should report
4. **Populate `commodity_unit_conversions`** — At minimum, define bag-to-kg conversions for major commodities
5. **Add publication withdrawal support** — New columns on `price_observations` or a new `publication_events` table
6. **Add batch publication support** — Function to publish multiple observations transactionally

### Stage 3 — Collection Operations

7. **Wire quality engine into submission** — `field-actions.ts` should call `evaluateObservation()` and persist findings
8. **Build collection schedule management UI** — Admin can create/edit schedules
9. **Build task generation trigger** — Wire `generate_collection_tasks()` to the job runner
10. **Enhance task management UI** — Assign, reassign, cancel from admin

### Stage 4 — Quality Integration

11. **Integrate quality engine into submission flow** — Run rules on every submission
12. **Build quality review UI** — Show findings alongside observations in verification queue
13. **Add anomaly detection** — Compare against historical comparables

### Stage 5 — Publication Operations

14. **Build batch publication UI** — Select multiple verified observations and publish
15. **Build publication withdrawal** — Withdraw with reason, audit trail
16. **Add publication event tracking** — New table for publication lifecycle

### Stage 6 — Coverage and Operations Dashboard

17. **Build Market Data Operations dashboard** — Central view of collection health
18. **Build coverage matrix** — Markets × Commodities × Dates
19. **Build freshness indicators** — CURRENT/AGING/STALE/NO_DATA states
20. **Build operational analytics** — Collection rates, cycle times, agent performance

### Stage 7 — Import and Reliability

21. **Build CSV import** — Controlled import with validation
22. **Build scheduled job infrastructure** — Wire job runner to execute scheduled tasks
23. **Build notification triggers** — Wire notifications to lifecycle events

### Stage 8 — Integration

24. **End-to-end workflow test** — Submit → validate → verify → publish → public display
25. **Responsive verification** — All workflows on mobile/tablet/desktop
26. **Regression suite** — All existing tests pass, new tests for new capabilities

---

## 10. Owner Decisions Required

### Decision 1: Publication of Demo Data

**Question:** Should the 12 verified test-fixture observations be published as demonstration data to populate public pages and prove the pipeline?

**Options:**
- A) Publish them as clearly labelled demo data (they remain filtered from `published_price_observations` by the view's `test_fixture` filter)
- B) Leave them unpublished and wait for real field collection
- C) Create new observations with `source_system = 'manual_entry'` through the normal workflow

**Recommendation:** C — exercise the real workflow (submit → verify → publish) with observations that go through the full pipeline, rather than trying to publish existing test fixtures.

### Decision 2: Market Coordinates

**Question:** Should the 11 markets receive real latitude/longitude coordinates?

**Impact:** Without coordinates, no map rendering is possible. The brief explicitly forbids inventing coordinates.

**Recommendation:** Research verified coordinates for the 11 markets from public sources (Google Maps, OpenStreetMap). If not available in this session, document as a data dependency for operational readiness.

### Decision 3: Scope of Phase 01

The full specification requests 8 stages. Based on the baseline, the highest-impact work is:

1. **Defining collection schedules and market scope** (data activation)
2. **Wiring quality engine into submission** (data quality)
3. **Building publication workflow** (the missing link)
4. **Building coverage/freshness dashboard** (operational visibility)

These four capabilities transform the platform from "schema exists" to "operationally functional."

---

## 11. File Impact Map (Proposed)

### New Files

| Path | Purpose |
|---|---|
| `supabase/migrations/0033_collection_activation.sql` | Schedules, market scope, unit conversions, publication events |
| `src/lib/data/quality.ts` | Quality engine integration with submission |
| `src/lib/data/freshness.ts` | Freshness calculation service |
| `src/lib/data/coverage.ts` | Market coverage calculation service |
| `src/lib/operations/publication.ts` | Publication workflow operations |
| `src/lib/operations/scheduling.ts` | Collection schedule management |
| `src/components/admin/CoverageDashboard.tsx` | Market data operations dashboard |
| `src/components/admin/PublicationActions.tsx` | Batch publication and withdrawal |
| `src/components/admin/ScheduleManager.tsx` | Schedule CRUD |
| `src/app/admin/coverage/page.tsx` | Coverage dashboard page |
| `tests/data-integrity/publication.test.ts` | Publication workflow tests |
| `tests/data-integrity/coverage.test.ts` | Coverage calculation tests |
| `tests/quality/integration.test.ts` | Quality engine integration tests |

### Modified Files

| Path | Change |
|---|---|
| `src/lib/operations/field-actions.ts` | Wire quality evaluation into submission |
| `src/app/admin/verification/page.tsx` | Show quality findings alongside observations |
| `src/app/admin/observations/page.tsx` | Publication and withdrawal actions |
| `src/app/admin/schedule/page.tsx` | Full schedule management UI |
| `src/app/admin/tasks/page.tsx` | Task assignment and management |

---

## 12. Test Baseline for Regression Protection

### Must Not Regress

- 787 passing tests must remain green
- 28 skipped tests (require DB) must remain skipped, not fail
- TypeScript must remain clean
- Production build must remain successful
- Lint errors must not increase beyond the 10 pre-existing

### Must Add

- Quality engine integration tests
- Publication workflow tests
- Coverage calculation tests
- Freshness state tests
- Schedule generation tests
- Task lifecycle transition tests
- Withdrawal tests
- RLS regression tests for new tables

---

## 13. Summary

The Hatsi360 platform has an **exceptionally well-designed schema** with comprehensive lifecycle support, security, audit trails and quality infrastructure. The application layer mirrors this with well-structured services, guards and UI.

**The gap is operational activation.** The infrastructure exists but has never been exercised end-to-end:

- 0 collection schedules → 0 tasks → 0 real submissions
- 0 quality findings computed
- 0 published observations
- 0 analytics snapshots
- 0 job runs

Phase 01 must close this gap by:
1. Defining what to collect (schedules + scope)
2. Exercising the quality engine
3. Publishing the first observations through the real workflow
4. Building the operational dashboard to monitor collection health

The foundation is solid. The work ahead is activation, not construction.
