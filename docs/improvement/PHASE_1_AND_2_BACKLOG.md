# Hatsi360 — Phase 1 & Phase 2 Backlog

| | |
|---|---|
| Date | 2026-11-26 |
| Derived from | `PHASE_0_BASELINE_AUDIT.md`, `DATABASE_AND_MIGRATION_AUDIT.md`, `SECURITY_BASELINE.md`, `PRODUCTION_READINESS_BASELINE.md`, `FEATURE_IMPLEMENTATION_MATRIX.md` |
| Rule | Every item is reversible and executes without approval, **except** those flagged `STOP` (stop-and-ask list). |

## Session 2 status (stabilization + Phase 2.1)

| Item | State |
|---|---|
| `P2-7` eight/nineteen application regressions | **done** — tests 42 failing → 23, all remaining environment-only |
| `P2-8` chart conditional hooks | **done** (`d8f5999`) |
| `P0-2` build gate | **done, build strategy fixed** — fonts vendored, `next build` exit 0 offline |
| `P2-10` CI green | **not done** — lint 43 errors / 171 warnings; tests and build now pass, so lint is the only blocker |
| `P1` hosted schema (P2.1) | **done** — measured on the hosted project; see `SUPABASE_RLS_VALIDATION.md` |
| `P1-A6` apply `0050` to production | **awaiting approval** (live unauthorised-write path) |
| `0052` + `0042`–`0045` to production | **awaiting approval** (`has_entitlement` raises) |
| `P2-2` … `P2-6` | **blocked** — no staging project |

## Status at the end of this session

| Item | State | Commit |
|---|---|---|
| `P0-1` chain applies from scratch | **done** — `verify:migrations` green, 89/89 tables with RLS, 210-statement RLS suite and 346-statement workflow suite passing | `5b83d65` |
| `P1-A1` `0000_migration_ledger.sql` | **done** | `5b83d65` |
| `P1-A2` `0034` array cast | **done** | `5b83d65` |
| `P1-A3` `0038` null lookups filtered | **done** (content gap remains: 1 of 25 mappings survives) | `5b83d65` |
| `P1-A4` `0042` policies renamed per command | **done** | `5b83d65` |
| `P1-A5` `0047_stage4` enums + `price_type` | **done** | `5b83d65` |
| `P1-A6` RLS on the six intelligence tables | **done** (`0050`) | `5b83d65` |
| `P1-A7` demo seeds out of the chain | **done** (moved to `supabase/seeds/`, needs repair before use) | `5b83d65` |
| `P1-A8` duplicate numbering | **done** for `0046`/`0047`; `0025` absence documented | `5b83d65` |
| `P1-A9` harness workarounds removed | **done** except account provisioning (`MIG-02`) | `5b83d65` |
| `P1-A10` harness runs the RLS suite | **done** — the suite now executes and has already caught two runtime defects | `5b83d65` |
| new: `0051` bulk role check, `0052` entitlement resolver | **done** — both were raising at run time | `5b83d65` |
| `P1-B1`, `P1-B3`, `P1-B4` | **done** (`PHASE_1_DATA_INTEGRITY_REPORT.md`, `COMMODITY_UNIT_GRADE_STANDARD.md`, `DATA_PUBLICATION_RULES.md`) | `2b179b5` |
| `P1-B2` reconciliation | **written, production column blocked** — twelve queries listed in the report | `2b179b5` |
| `P2-8` chart conditional hooks | **done** (lint errors 45 → 43) | see log |
| `P2-7`, `P2-9`, `P2-10` | not started | — |
| `P2-2` … `P2-6` (Phase 2 evidence) | not started | — |
| `P1-B5` … `P1-B7` (pricing review, data-source guards, regression tests) | not started | — |
| `MIG-02` account provisioning | open, documented, environment step | — |

## Execution model

- **Phase 1** removes the reasons the system cannot be rebuilt, and establishes what the data actually is. Exit criterion: `npm run verify:migrations` applies the whole chain to an empty database with **zero** workarounds, and every published figure has a documented, reproducible source.
- **Phase 2** proves the operational workflows (agent → verification → publication → alert; admin verification; RLS; scheduled jobs) and installs the monitoring that would detect their failure. Exit criterion: each workflow validated end-to-end against a real database, with job runs and RLS enforcement observed.
- Phase 2 items that depend on Phase 1 are marked `← P1`.

---

## P0 — blocks everything

| ID | Item | Why | Evidence today |
|---|---|---|---|
| `P0-1` | Make the chain apply from scratch (`P1-A1`…`P1-A6`) | Without it there is no staging environment, no rollback story and no way to compare production to the repository | 7 defects, 3 unparseable files |
| `P0-2` | Make CI green through `build` | The build has **never** run in CI; every run stops at ESLint | run `45772656337` |
| `P0-3` | Answer `S-1`…`S-6` with hosted access | Production state is `UNKNOWN`; releasing on `UNKNOWN` is a guess | `SECURITY_BASELINE.md` §5 |

---

## Phase 1 — A. Migrations and schema (`fix(data):` / `fix(security):`)

Order matters; each item is independently committable and testable with `npm run verify:migrations`.

| ID | Task | Detail | Definition of done |
|---|---|---|---|
| `P1-A1` | Add `0000_migration_ledger.sql` | `create table if not exists public._hatsi_migrations (id bigint generated always as identity primary key, name text not null unique, applied_at timestamptz not null default now())`. Runs **before** `0032`, so a fresh database has the table that `0032` hardens and `0033` writes to; the hosted project already has it, so the file is a no-op there. Fixes `MIG-01`. | harness ledger stub deleted, chain still passes |
| `P1-A2` | Repair `0034` empty array | `array[]` → `array[]::text[]` on the single line 253. Value-preserving. Safe because the file cannot have applied anywhere (`42P18` is parse-time). Fixes `MIG-03`. | statement applies; six intelligence tables exist |
| `P1-A3` | Repair `0038` HS mapping | Wrap the `VALUES` list so lookups that resolve to `NULL` are filtered (`… SELECT * FROM (VALUES …) v(...) WHERE commodity_id IS NOT NULL AND hs_code_id IS NOT NULL`). Do **not** invent commodity names. Record in `COMMODITY_UNIT_GRADE_STANDARD.md` that HS coverage for the 22 real commodities is a Phase 1 data gap requiring trade-domain review. Fixes `MIG-04` structurally; the *content* gap stays open and visible. | applies; mapping count logged (expected: 1, Wheat) |
| `P1-A4` | Repair `0042` policies | Four distinct names (`saved_commodities_entitlement_select/_insert/_update/_delete`, same for `saved_markets`), each preceded by `drop policy if exists`, preserving the entitlement predicate exactly. Fixes `MIG-05` + `SEC-02`. | applies; `pg_policies` shows 8 entitlement policies with `has_entitlement('watchlists')` |
| `P1-A5` | Repair `0047_stage4` types | Replace each `create type if not exists … as enum (…)` with a `do $$ begin create type …; exception when duplicate_object then null; end $$;` block. Changes syntax only, not the enum members. Fixes `MIG-07`. | applies; `rfqs`, `quotes`, `orders`, `supplier_profiles` exist |
| `P1-A6` | **New** `005X_intelligence_rls.sql` | `alter table … enable row level security` for the six tables, plus explicit policies: `select` to `authenticated` **only** for non-sensitive columns' tables as the product decides, or staff-only if not; writes to `service_role`; `revoke` nothing that is currently needed. Never `using (true)` for a table carrying third-party evidence. Fixes `SEC-01`. **Product decision needed:** whether intelligence series are public or staff-only — default to staff-only until answered. | `npm run verify:migrations` passes the "tables without RLS" assertion and proceeds to the RLS permission suite |
| `P1-A7` | Resolve `0046`–`0048` demo seeds | They target a dead schema and would put 299 "DEMO" observations plus destructive cleanup into the production chain. Recommend removing them from `supabase/migrations/` and keeping the demo corpus as an out-of-band script run only against staging (`scripts/seed-demo.mjs`), documented in `DATA_PUBLICATION_RULES.md`. Not silent deletion: the data and its intent are preserved, the *guarantee* that it can never touch production is added. | chain applies without them; `docs/` explains how to load demo data into staging |
| `P1-A8` | Renumber duplicates | `0046`/`0047` collide. Either rename the ledger rows explicitly in a documented mapping, or (preferred, once A7 lands) keep only one file per number and record the historical mapping in the audit. | unique numbers across the chain |
| `P1-A9` | Delete harness workarounds | Every `MIG-nn` stub in `scripts/validate-migrations.mjs` is removed; the harness must also drop the placeholder-commodity hook so the seed assertion (`22 commodities`) is meaningful again. | harness runs unmodified |
| `P1-A10` | Harness: run the RLS suite **first** | Move `tests/rls/permission-tests.sql` and `tests/operations/workflow-tests.sql` execution before the shape assertions, so a schema-count regression cannot mask an RLS regression. Related: `QA-03`. | order changed, both suites execute and report |

**Stop-and-ask note.** `P1-A1`…`P1-A5` edit migration files. That is normally forbidden, and it is allowed here only because each of those files is *provably* unappliable (`42P18`, `42703`, `42710`, `42601`) and therefore cannot hold applied state in any database. This reasoning must be repeated in each commit body. Nothing that has ever applied is edited.

---

## Phase 1 — B. Data integrity (`fix(data):`)

| ID | Deliverable | Content |
|---|---|---|
| `P1-B1` | `PHASE_1_DATA_INTEGRITY_REPORT.md` | What the reference data actually is: 22 commodities, 11 markets, 11 states, 8 units, grades and varieties; the vocabulary mismatches found (`MIG-04`); what has no source at all. Every claim labelled by evidence class. |
| `P1-B2` | `DATA_RECONCILIATION_REPORT.md` | Repository seed vs hosted production vs historical documentation, with a per-table row-count table. Blocked cells marked `UNKNOWN` until `S-1`/`S-4` are answered; the report is still useful because it names exactly what must be counted. |
| `P1-B3` | `COMMODITY_UNIT_GRADE_STANDARD.md` | The canonical vocabulary: 22 commodity slugs, their grades and varieties, the 8 units, and **which package conversions are field-verified vs assumed**. The demo seeds assert "1 bag = 50 kg, verified" — that claim must be replaced by a sourced one or dropped. No conversion factor is invented. |
| `P1-B4` | `DATA_PUBLICATION_RULES.md` | The rules the code already enforces (published+verified+current, `test_fixture` exclusion, freshness classes) written down as policy, plus the rules that are implied but unenforced (demo rows, historical backfill, corrections that change a median). |
| `P1-B5` | Pricing correctness review | `src/lib/pricing.ts` median/comparable grouping and `market_price_summary` must agree; check the unit/grade/variety dimensions are part of the grouping key on both sides, and that `display_unit` conversion cannot compare unlike units. Add regression tests for: mixed-unit obs, single-observation median, stale window boundary (`×1`, `×2`), `no_data`. |
| `P1-B6` | Data-source fixes | The `DataSource` contract already distinguishes `supabase` from `fixture` and exposes `getProvenance()`. Ensure no route can render fixture rows without the provenance banner, and that `isMigrated` is honoured on every list page. Add a test that fails if a fixture-backed page omits the banner. |
| `P1-B7` | Regression tests for every Phase 1 fix | One test per repaired migration (parse test via the harness assertions) and per pricing rule. `test:` commits, additive only. |

---

## Phase 1 — C. Security (already listed as A4/A6, plus)

| ID | Task |
|---|---|
| `P1-C1` | Confirm `0043`/`0044`/`0045` policies match the application's entitlement keys exactly (no orphan key, no policy referring to a key the app never grants). |
| `P1-C2` | CSP in report-only mode, then enforced — start with `default-src 'self'`, explicit `img-src`, `script-src` without `unsafe-inline` only once the reports HTML path is sanitised. |
| `P1-C3` | Durable rate limiting for `v1` if the API is promoted beyond friction-level protection. |

---

## Phase 2 — Operational readiness (`fix(ops):` / `feat(ops):`)

| ID | Deliverable | Depends on |
|---|---|---|
| `P2-1` | `PHASE_2_OPERATIONAL_READINESS_REPORT.md` | P1 |
| `P2-2` | `AGENT_WORKFLOW_VALIDATION.md` — collection session → draft → submit (`/api/agent/submit`) → verification → publication, exercised against a real database: duplicate submission, offline retry, evidence-required schedules, self-verification refusal | `← P1-A2` (observations tables), `← P1-A6` |
| `P2-3` | `ADMIN_VERIFICATION_VALIDATION.md` — verify/reject/correct with audit trail; the `/admin/coverage` dead link (`FEAT-01`) resolved by building the page or removing the link (`feat(ops):`); the `CandlestickChart` conditional-hook fix (P1 in effect: it can crash a market page) | `← P1-A1` |
| `P2-4` | `SUPABASE_RLS_VALIDATION.md` — run `tests/rls/permission-tests.sql` and record results per policy family; extend it to the six newly governed tables; assert `anon` cannot read any of them | `← P1-A6` |
| `P2-5` | `SCHEDULED_JOBS_VALIDATION.md` — run each of the 5 jobs twice for the same slot (idempotency), with a failing job in the batch (isolation), with the wrong bearer (401), and with no secret configured (fail-closed). **Do not enable a production schedule** — `STOP` | `← P1-A1` |
| `P2-6` | `OPERATIONAL_MONITORING_REPORT.md` — error tracking decision, `/api/health`, structured logging, job-run dashboard, alerting on `stale`/`no_data` coverage | `← P1` |
| `P2-7` | Fix the 8 application test failures (`QA-02`): brand artwork registry, loading mark path, design tokens, share-metadata wording | none |
| `P2-8` | Fix the 2 `rules-of-hooks` errors in `CandlestickChart` | none |
| `P2-9` | Reconcile `.env.example` with the 17 variables the code reads (`OPS-02`) | none |
| `P2-10` | Make CI green: lint errors to zero, warnings under the `--max-warnings 50` gate, then let `test` and `build` actually run (`P0-2`) | P2-7, P2-8 |

---

## Quarantine policy for the 34 environment-blocked tests

They are **not** deleted, skipped or weakened. Each remains red until a project with a service-role key is reachable. Two options, both requiring the owner's decision (`STOP` for the second):

1. Keep them red and record 34 as a known environmental count in every report (current approach).
2. Gate them behind an explicit `INTEGRATION=1` flag so `npm test` is green locally without lying — the tests still run in the environment that has credentials.

---

## Stop-and-ask items (explicit approval required — never executed autonomously)

| Action | Backlog item |
|---|---|
| Deleting or rotating real accounts, including demo accounts | `S-3` |
| Changing production credentials or env vars (incl. `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS`) | `S-3`, `P2-9` |
| Applying unreviewed or destructive migrations to production | `P1-A*`, `P1-A6` |
| Publishing historical or unpublished observations | `P1-B4` |
| Enabling production cron / job schedules | `P2-5` |
| Deploying to production, or altering domain/DNS | `P0-2`, all of Phase 2 |

Everything else above is additive, reversible and runs without asking.

---

## Sequenced first week

| Day | Work | Gate after |
|---|---|---|
| 1 | `P1-A1`, `P1-A2`, `P1-A3`, `P1-A9` (partial) | chain passes 0034 and 0038 |
| 2 | `P1-A4`, `P1-A5`, `P1-A6` | chain reaches the end; RLS suite runs |
| 3 | `P1-A7`, `P1-A8`, `P1-A9`, `P1-A10` | harness clean; **`verify:migrations` green** |
| 4 | `P1-B1`, `P1-B3`, `P1-B5` | data standard + pricing regression tests |
| 5 | `P1-B2`, `P1-B4`, `P1-B6`, `P1-B7` | Phase 1 exit |
| 6-8 | `P2-2` … `P2-6` | Phase 2 evidence |
| 9 | `P2-7` … `P2-10` | CI green through build |
| 10 | Final report A–G + release recommendation | one of the three verdicts |
