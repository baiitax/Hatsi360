# Hatsi360 — Phase 2 Operational Readiness Report

| | |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Status | **Partial.** P2.1 is complete with hosted evidence; P2.2–P2.6 are blocked on a staging project and are **not** claimed as validated. |
| Release recommendation | **NOT_READY_FOR_PRODUCTION** (unchanged, and now for measured reasons) |

## 1. What this report is

Phase 2 asks for six documents. One is complete and evidence-rich (`SUPABASE_RLS_VALIDATION.md`). The other five are scheduled behind a blocker that only the account owner can clear: **there is no staging environment**, and every remaining Phase 2 test needs one, because they all require a database where an agent, a verifier and an anonymous reader can be driven through real requests without touching production data.

Writing those five documents from assumptions would produce exactly the kind of paper the programme exists to prevent. They are listed in §6 with the precise prerequisite for each.

## 2. Part A gate status (the stabilization gate)

| Gate | Before this session | Now | Evidence |
|---|---|---|---|
| TypeScript | pass | **pass** | `npx tsc --noEmit`, exit 0 |
| ESLint | 45 errors / 171 warnings | **43 errors / 171 warnings** | remaining debt, see §3 |
| Unit/integration tests | 999 pass / 42 fail / 40 skip | **1018 pass / 23 fail / 40 skip** | 19 application failures fixed; all 23 remaining are environment-only |
| Migration verification | fail (7 defects) | **pass** | 89/89 tables with RLS, 202 policies, 210-statement RLS suite, 346-statement workflow suite |
| Production build | **blocked** (Google Fonts) | **pass**, exit 0, 116 routes, offline | fonts vendored under `src/app/fonts/` (73 KB, OFL) |

Twenty-three tests still fail and none of them is an application defect: ten `entitlements`, twelve `phase-08a`, one `auth` — every one needs `SUPABASE_SERVICE_ROLE_KEY` against a live project. No test was deleted, skipped or weakened to reach these numbers.

## 3. Remaining lint debt (43 errors)

| Category | Count | Nature |
|---|---|---|
| `react/no-unescaped-entities` | 16 | apostrophes in JSX copy — mechanical |
| React Compiler: `setState` synchronously in an effect | 12 | real performance/ordering smell |
| React Compiler: impure function during render | 10 | real |
| React Compiler: component created during render | 2 | real |
| `react-hooks/immutability`, `rules-of-hooks`, refs/declaration | 3 | the two `rules-of-hooks` errors were fixed in `d8f5999`; three remain in other files |

CI runs `npm run lint -- --max-warnings 50`, so 171 warnings also fail the job. The gate cannot be made green by fixing errors alone; the warning baseline has to come down as well. This is the one Part A item still open.

## 4. What the hosted project established (P2.1)

Full detail in `SUPABASE_RLS_VALIDATION.md`. In one paragraph: the hosted schema is **not** the repository's schema (80 tables / 74 with RLS / 150 policies, versus 89 / 89 / 202); the CLI history records 6 migrations while the project's own ledger records 32 and the repository ships 51; six tables carry **no RLS** while `authenticated` holds `DELETE, INSERT, UPDATE, TRUNCATE` on all of them; `has_entitlement()` **raises `42P01`** in production; `whatsapp_subscribers`, `rfqs`, `orders` and `supplier_profiles` do not exist; and the data itself is real and clean — **321 observations, 271 verified, 259 published, zero demo rows**.

## 5. Operational metrics — definitions, ready to run

P2.5 asks for ten operational metrics from real records. The definitions below are the queries; each has been run against the hosted project where it is marked ✅, and the rest are written and ready for the staging run.

| # | Metric | Source | Hosted result |
|---|---|---|---|
| 1 | Active agents | `profiles where role='agent' and account_status='active'` | ✅ 11 profiles total; agent subset to be counted per status |
| 2 | Collection assignments | `market_collection_schedules where is_active` | ✅ 32 ledger-era schedules exist |
| 3 | Completed tasks | `collection_tasks where status='completed'` | pending staging run |
| 4 | Overdue tasks | `collection_tasks where due_at < now() and status <> 'completed'` | pending |
| 5 | Submitted observations | `price_observations` where status in ('submitted','pending_verification') | ✅ **27** (17 + 10) |
| 6 | Pending verification | same, `pending_verification` | ✅ **10** |
| 7 | Published observations | `published_price_observations` | ✅ **259** |
| 8 | Rejected observations | `verification_status='rejected'` | ✅ **9** |
| 9 | Stale market coverage | per market, `max(collected_at)` vs commodity `freshness_window_hours` | query written, needs the freshness join |
| 10 | Data-quality findings | `observation_quality_findings`, `data_quality_flags` | pending |
| 11 | Failed scheduled jobs | `scheduled_job_runs where status='failed'` | pending — the runner has never been executed in production |

The service code for these already exists (`src/lib/analytics/metrics.ts`, `src/lib/operations/freshness.ts`); what is missing is an **operator surface** that renders them, and a scheduler that would ever make row 11 non-empty.

## 6. The five outstanding Phase 2 documents

| Document | Blocked on | What can already be stated |
|---|---|---|
| `AGENT_WORKFLOW_VALIDATION.md` | staging project + a real agent account | The workflow SQL is validated: the 346-statement operations suite (task generation, assignment, submission, verification, publication, correction) passes against a clean database. Duplicate-submission and weak-network behaviour are covered by unit tests (`tests/field` 80/80, `tests/ux` 32/32) but **not** end-to-end against a database. |
| `ADMIN_VERIFICATION_VALIDATION.md` | staging project + verifier account | Self-verification is prevented by policy and covered by the RLS suite. In production the *entitlement* half of admin gating raises (§4), so an admin verification run today would fail for a reason unrelated to verification. |
| `SCHEDULED_JOBS_VALIDATION.md` | staging project | The runner authenticates with a bearer secret compared by `timingSafeEqual` and is idempotent per `(job, slot)`; five jobs are defined. It has **never been executed against any database** in this programme. |
| `OPERATIONAL_MONITORING_REPORT.md` | error-tracking decision (product choice) | No error tracking, no health endpoint, no structured logging today. The metrics in §5 are the skeleton of the report. |
| `PHASE_2_OPERATIONAL_READINESS_REPORT.md` | — | this document |

## 7. Blockers, in priority order

1. **Six ungoverned tables with full DML for `authenticated`** — a live unauthorised-write path in production. Fix committed (`0050`), needs approval to apply.
2. **`has_entitlement()` raises in production** — every entitlement-gated surface errors. Fix committed (`0052` + repaired `0042`–`0045`), needs approval.
3. **No staging project** — blocks P2.2–P2.5 entirely. Creating one is a project-creation action on the stop-and-ask list.
4. **Migration records disagree** (6 / 32 / 51) — blocks any reliable deploy or rollback.
5. **Lint gate red** (43 errors / 171 warnings) — blocks a green CI run, which in turn means the passing build and test suite are not enforced on future commits.

## 8. Release recommendation

> **NOT_READY_FOR_PRODUCTION**

The reasons have changed since Phase 0 — they are now specific and actionable rather than structural:

- two production security defects are **confirmed present**, not suspected;
- the schema cannot be reconciled with its own history;
- a table the homepage writes to does not exist;
- Phase 2's operational evidence (agent → verification → publication, jobs, monitoring) has not been produced because the environment to produce it does not exist yet.

What has improved materially: the build works offline, the migration chain applies from scratch with zero workarounds, 19 application regressions are fixed, the test suite is at 1018 passing, and the hosted database is now measurable — which is what made the two production defects findable at all.
