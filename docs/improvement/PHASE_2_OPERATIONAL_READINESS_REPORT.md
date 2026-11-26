# Hatsi360 — Phase 2 Operational Readiness Report

| | |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Project | `umxzsdepbrenqysabtlt` (production) |
| Status | **SEC-01 remediated and verified in production.** P2.2–P2.6 remain blocked on a staging project and are **not** claimed as validated. Entitlement defect is **review only**, not applied. |
| Release recommendation | **NOT_READY_FOR_PRODUCTION** |

## 1. What this report is

Phase 2 asks for six documents and a stabilization gate. One Phase 2 document is
complete (`SUPABASE_RLS_VALIDATION.md`); the other five are blocked on a staging
project. This report now also carries the SEC-01 production remediation record:
what was changed, the permission state before and after, the migration history
actually observed, the verification that was run, and what remains open.

Every number below was measured against production or produced by a command
whose output is quoted. Where something could not be established, it says
UNKNOWN or BLOCKED rather than estimating.

## 2. SEC-01 — what was changed, and why this shape

SEC-01 was six tables carrying full `authenticated` DML — including `TRUNCATE` —
with row-level security switched off. With RLS off, the grant *is* the access
control, so any signed-in user could rewrite or empty the intelligence series.

Two design facts were established **before** writing the fix, and both changed
it:

1. **Ingestion writes through the user's own session.**
   `src/lib/intelligence/ingestion/*` calls `createClient()` from
   `@/lib/supabase/server`, and `POST /api/v1/intelligence/sync` requires an
   authenticated administrator before it calls `runIngestion(user.id)`. A policy
   that simply denied writes to `authenticated` would have broken the only
   legitimate writer. Revoking `INSERT`/`UPDATE`/`DELETE` would have done the
   same. The fix therefore keeps the grants and constrains them with an
   `is_staff()` policy.

2. **Nothing in the series is verified.** All 130 rows hold
   `verification_status = 'imported'` — 48 production, 30 supply, 30 demand,
   22 trade, none verified. An earlier draft of the migration restricted public
   read to `verification_status = 'verified'`. Applied to production, that would
   have emptied `/intelligence` and the v1 intelligence endpoints at the moment
   of "fixing" security — a functional regression dressed as a hardening. The
   published-visibility rule belongs with the publication work, and it needs
   verified data to exist first. It is recorded as an open item, not taken
   silently here.

So visibility is unchanged and writes are what changed:

| Table | Read (signed-in) | Write | TRUNCATE / TRIGGER / REFERENCES |
|---|---|---|---|
| `commodity_production` | any authenticated (unchanged) | **staff only** (was: any authenticated) | **revoked** |
| `commodity_supply` | any authenticated | **staff only** | **revoked** |
| `commodity_demand` | any authenticated | **staff only** | **revoked** |
| `commodity_trade` | any authenticated | **staff only** | **revoked** |
| `evidence_sources` | any authenticated | **staff only** | **revoked** |
| `source_sync_events` | **staff only** (was: any authenticated) | **staff only** | **revoked** |

`TRUNCATE` is the part RLS cannot fix: row security is never applied to it, so
it had to be revoked explicitly. `TRIGGER` and `REFERENCES` were removed at the
same time — neither is used by the application, and both let a grantee attach
behaviour to, or point a foreign key at, a table it does not own.

`source_sync_events` is read-restricted to staff because it describes how data
was fetched rather than what the data says; it has no rows and only the admin
intelligence pages read it, so the tightening costs nothing.

`service_role` is untouched: it keeps its grants and its `BYPASSRLS` attribute,
because it is the ETL and back-office role.

`anon` was not granted anything. It held no grants before this change and holds
none now, so anonymous visitors still receive no intelligence rows. That is
pre-existing behaviour, preserved rather than expanded — widening read access is
a product decision, not a security fix.

## 3. Before and after — production permission evidence

Measured on production with the same query before and after the migration
(`c.relrowsecurity`, `pg_policies`, `has_table_privilege`).

**Before**

| Table | RLS | Policies | `authenticated` TRUNCATE | `authenticated` INSERT | `anon` SELECT |
|---|---|---|---|---|---|
| `commodity_production` | **false** | 0 | **true** | true | false |
| `commodity_supply` | **false** | 0 | **true** | true | false |
| `commodity_demand` | **false** | 0 | **true** | true | false |
| `commodity_trade` | **false** | 0 | **true** | true | false |
| `evidence_sources` | **false** | 0 | **true** | true | false |
| `source_sync_events` | **false** | 0 | **true** | true | false |

**After**

| Table | RLS | Policies | `authenticated` TRUNCATE | `authenticated` INSERT | `anon` SELECT | `service_role` INSERT |
|---|---|---|---|---|---|---|
| `commodity_production` | **true** | 2 | **false** | true (staff-gated) | false | true |
| `commodity_supply` | **true** | 2 | **false** | true (staff-gated) | false | true |
| `commodity_demand` | **true** | 2 | **false** | true (staff-gated) | false | true |
| `commodity_trade` | **true** | 2 | **false** | true (staff-gated) | false | true |
| `evidence_sources` | **true** | 2 | **false** | true (staff-gated) | false | true |
| `source_sync_events` | **true** | 2 | **false** | true (staff-gated) | false | true |

Project-wide: **80 tables, 80 with RLS** (was 74 of 80) · **policies 162** (was
150) · views 7 (unchanged). The twelve new policies are:

| Policy | Table | Cmd | Using | Check |
|---|---|---|---|---|
| `commodity_production_read` | production | SELECT | `true` | — |
| `commodity_production_staff_write` | production | ALL | `is_staff()` | `is_staff()` |
| `commodity_supply_read` / `_staff_write` | supply | SELECT / ALL | `true` / `is_staff()` | — / `is_staff()` |
| `commodity_demand_read` / `_staff_write` | demand | SELECT / ALL | `true` / `is_staff()` | — / `is_staff()` |
| `commodity_trade_read` / `_staff_write` | trade | SELECT / ALL | `true` / `is_staff()` | — / `is_staff()` |
| `evidence_sources_read` / `_staff_write` | evidence_sources | SELECT / ALL | `true` / `is_staff()` | — / `is_staff()` |
| `source_sync_events_staff_read` / `_staff_write` | source_sync_events | SELECT / ALL | `is_staff()` | — / `is_staff()` |

`is_staff()` was read from production before being relied on:
`verification_officer, market_supervisor, analyst, admin, super_admin`, all
`STABLE SECURITY DEFINER` with `search_path = public`.

## 4. Production migration history observed

| Record | Entries | Contents |
|---|---|---|
| Supabase CLI history (`supabase_migrations.schema_migrations`) | **7** | `0001`, `0002`, `0003`, `0004`, `20261114152034 commodity_intelligence`, `20261114152829 intelligence_analytics_views`, **`20261126224213 sec01_intelligence_table_rls`** |
| Project ledger (`public._hatsi_migrations`) | **32** | last entry `0033_collection_activation.sql`, applied `2026-11-14 13:15:43 UTC` |
| Repository | **51** files | `0000`–`0052` |

The three records still disagree, and this remediation did **not** fix that: the
new migration is recorded in the CLI history and in the repository file
`0050_intelligence_table_rls.sql`, but not in `_hatsi_migrations`, which has no
row for anything after `0033`. Reconciling them is a separate task, and it is a
prerequisite for reliable deploy or rollback (§11, blocker 4).

**Exact identifier applied:** `20261126224213_sec01_intelligence_table_rls`
(name `sec01_intelligence_table_rls`), executed as one transaction and reported
successful; the connector's migration tool rolls back on failure, and expected a
`null` version in its response, which the history above resolves.

## 5. Verification results and remaining risks

### 5.1 Role-context verification (production, after the change)

Run with `set local role` inside transactions that were rolled back, with
`request.jwt.claims` set to real `profiles.id` values. Session user was
`postgres`.

| Context | Action | Result |
|---|---|---|
| `anon` | `select count(*) from commodity_production` | **`42501 permission denied`** |
| non-staff authenticated (`public_user`, verified `is_staff()` = **false**) | read production / evidence_sources | 48 rows / 7 rows — unchanged visibility |
| non-staff authenticated | `update … returning 1`, `delete … returning 1` | **0 updated, 0 deleted** |
| admin authenticated (`is_staff()` = **true**) | `update commodity_production … returning 1` | **48 updated** — ingestion path intact |
| admin authenticated | `truncate commodity_production` | **`42501 permission denied`** |
| non-staff authenticated | `truncate evidence_sources` | **`42501 permission denied`** |
| `service_role` | read production / evidence_sources | 48 / 7, `rolbypassrls` = true, TRUNCATE retained |

The TRUNCATE rows are the point of the exercise: an administrator session under
the `authenticated` role is refused, because no grant exists for it to exercise.
RLS would not have stopped it.

### 5.2 Data integrity

Row counts identical before and after: production 48, supply 30, demand 30,
trade 22, evidence_sources 7, source_sync_events 0. No row was read, written,
migrated or deleted. The migration contains no DML.

### 5.3 Local replica

`npm run verify:migrations` after the change: **ALL MIGRATIONS APPLIED CLEANLY**
— 89/89 tables with RLS, 203 policies, 210-statement RLS suite, 346-statement
workflow suite, no leftover rows. The five `using (true)` read policies appear
in the harness's informational "permissive policies" note, alongside the
project's existing public-read policies — consistent house style, not a finding.

### 5.4 Remaining risks

1. **`authenticated` still holds `INSERT`/`UPDATE`/`DELETE` on all six tables.**
   This is deliberate (the staff policy needs the grant to mean anything), but it
   means protection now rests entirely on the policies. A future permissive
   policy on any of these tables would re-open the hole silently. The RLS suite
   catches missing RLS, not a newly added permissive policy.
2. **`source_sync_events` staff read is verified by definition, not by data.**
   The table is empty, so a non-staff `select` returning 0 rows cannot
   distinguish "denied by policy" from "no rows". The policy expression is the
   evidence; an empirical test needs a non-empty table, i.e. a staging project.
3. **No end-to-end application request was made.** The previewed app cannot reach
   `*.supabase.co` from this environment, so "legitimate operations still work"
   is evidenced by the role-level write succeeding as an admin plus inspection of
   the ingestion call path — not by a browser session performing an ingest.
4. **Anonymous visitors receive no intelligence rows** (no `anon` grants). That
   is unchanged, but it means any public intelligence page is empty for logged-out
   visitors today. Worth confirming that this is the intended product state.
5. **Verification-only publication is still not enforced by RLS.** All series
   rows are `imported`; the app decides what to show. This remains an open
   publication-integrity item.

## 6. Part A gate status (the stabilization gate)

| Gate | Before this session | Now | Evidence |
|---|---|---|---|
| TypeScript | pass | **pass** | `npx tsc --noEmit`, exit 0 |
| ESLint | 45 errors / 171 warnings | **43 errors / 171 warnings** | see §7 — the only red gate |
| Unit/integration tests | 999 pass / 42 fail / 40 skip | **1018 pass / 23 fail / 40 skip** | 19 application failures fixed; all 23 remaining are environment-only |
| Migration verification | fail (7 defects) | **pass** | 89/89 RLS, 203 policies, 210-statement RLS suite, 346-statement workflow suite |
| Production build | **blocked** (Google Fonts) | **pass**, exit 0, 116 routes, offline | fonts vendored under `src/app/fonts/` (73 KB, OFL) |

Twenty-three tests still fail and none is an application defect: ten
`entitlements`, twelve `phase-08a`, one `auth` — each needs
`SUPABASE_SERVICE_ROLE_KEY` against a live project. No test was deleted, skipped
or weakened to reach these numbers.

## 7. Remaining lint debt (43 errors / 171 warnings)

| Category | Count | Nature |
|---|---|---|
| `react/no-unescaped-entities` | 16 | apostrophes in JSX copy — mechanical |
| React Compiler: `setState` synchronously in an effect | 12 | real performance/ordering smell |
| React Compiler: impure function during render | 10 | real |
| React Compiler: component created during render | 2 | real |
| `react-hooks/immutability`, `rules-of-hooks`, refs/declaration | 3 | two `rules-of-hooks` errors fixed in `d8f5999`; three remain |

CI runs `npm run lint -- --max-warnings 50`, so the 171 warnings fail the job on
their own. The gate cannot go green by fixing errors alone.

## 8. Entitlement remediation — separate proposal, not applied

Full review: **`ENTITLEMENT_REMEDIATION_REVIEW.md`**. Summary of the facts it
establishes:

- `user_entitlements()` on production is the broken body — `jsonb_each(…) as
  e(k, v)` then `e.k` — and raises `42P01` every time it is called;
  `has_entitlement()` raises with it.
- Only **one** production policy calls it (`market_reports.reports_public_read`).
  The `0042`–`0045` enforcement policies and `can_perform_bulk_operations()` are
  absent from production entirely.
- The application calls it from the client layout and four page/action files.
  The layout discards the error, so every client user silently receives **zero
  entitlements** rather than an error page.
- This is invisible today only because `customer_subscriptions` has **0 rows**.
  The first real subscriber would get nothing.
- Proposed: three independently reversible stages — repair the resolver
  (`0052`), verify with a six-context matrix, then install enforcement
  (`0042`–`0045`, `0051`) one surface at a time.

`0052` and repaired `0042`–`0045` remain **unapplied**. Applying them requires
the separate written approval the authorisation requires.

## 9. Operational metrics — definitions, ready to run

P2.5 asks for ten operational metrics from real records. Definitions are the
queries; ✅ marks those already run against production.

| # | Metric | Source | Hosted result |
|---|---|---|---|
| 1 | Active agents | `profiles where role='agent' and account_status='active'` | ✅ 11 profiles (5 agents), status breakdown pending |
| 2 | Collection assignments | `market_collection_schedules where is_active` | ✅ 32 ledger-era schedules exist |
| 3 | Completed tasks | `collection_tasks where status='completed'` | pending staging run |
| 4 | Overdue tasks | `collection_tasks where due_at < now() and status <> 'completed'` | pending |
| 5 | Submitted observations | `price_observations` status in (`submitted`,`pending_verification`) | ✅ **27** |
| 6 | Pending verification | `pending_verification` | ✅ **10** |
| 7 | Published observations | `published_price_observations` | ✅ **259** |
| 8 | Rejected observations | `verification_status='rejected'` | ✅ **9** |
| 9 | Stale market coverage | per market `max(collected_at)` vs commodity `freshness_window_hours` | query written, needs the freshness join |
| 10 | Data-quality findings | `observation_quality_findings`, `data_quality_flags` | pending |
| 11 | Failed scheduled jobs | `scheduled_job_runs where status='failed'` | pending — the runner has never been executed in production |

## 10. The five outstanding Phase 2 documents

| Document | Blocked on | What can already be stated |
|---|---|---|
| `AGENT_WORKFLOW_VALIDATION.md` | staging + real agent account | Workflow SQL validated (346-statement suite); duplicate-submission and weak-network behaviour covered by unit tests, not end-to-end |
| `ADMIN_VERIFICATION_VALIDATION.md` | staging + verifier account | Self-verification prevented by policy and covered by the RLS suite; the entitlement half of admin gating raises in production (§8) |
| `SCHEDULED_JOBS_VALIDATION.md` | staging | Runner uses a `timingSafeEqual` bearer secret and is idempotent per `(job, slot)`; five jobs defined, never executed against a database |
| `OPERATIONAL_MONITORING_REPORT.md` | error-tracking decision | No error tracking, health endpoint or structured logging; §9 is the skeleton |
| `PHASE_2_OPERATIONAL_READINESS_REPORT.md` | — | this document |

## 11. Blockers, in priority order

1. ~~Six ungoverned tables with full DML for `authenticated`~~ — **closed**
   2026-11-26, migration `20261126224213_sec01_intelligence_table_rls`,
   verified §5.
2. **`has_entitlement()` raises in production** — total, silent denial of paid
   features; review written, **awaiting separate approval** (§8).
3. **No staging project** — still blocks P2.2–P2.5 entirely. Creating one is a
   project-creation action on the stop-and-ask list.
4. **Migration records disagree** (7 / 32 / 51) — blocks reliable deploy and
   rollback.
5. **Lint gate red** (43 errors / 171 warnings) — CI cannot pass, so the passing
   build and test suite are not enforced on future commits.
6. **Publication integrity** — series are all `imported`; nothing prevents
   unverified series from being rendered as published.

## 12. Release recommendation

> **NOT_READY_FOR_PRODUCTION**

Unchanged, and it must stay unchanged. One production blocker has closed; the
rest have not, and closing one defect does not make the platform releasable:

- the entitlement resolver is still broken in production and its fix is
  deliberately **not** applied;
- the schema still cannot be reconciled with its own history;
- Phase 2's operational evidence — agent → verification → publication, jobs,
  monitoring — does not exist yet, because the environment to produce it does not;
- the lint gate is red, so CI is not protecting any of the above.

What changed materially today: SEC-01 is closed with before/after evidence rather
than a claim; the fix was shaped by two things that would have broken production
if assumed instead of measured (session-based ingestion, and a series that is
100% unverified); all 80 public tables now have RLS; and the entitlement defect
now has a reviewed, reversible, staged remediation waiting for a decision.
