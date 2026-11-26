# Hatsi360 — Phase 2 Operational Readiness Report

| | |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Project | `umxzsdepbrenqysabtlt` (production) |
| Status | **SEC-01 remediated and verified in production.** Entitlement Stage 1 prepared and validated locally (31/31). **Staging provisioning BLOCKED** — free-tier project limit, approval requested. Anonymous privilege audit complete; Phase 1 proposed and validated, not applied. No production change this turn. |
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
prerequisite for reliable deploy or rollback (§16, blocker 4).

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
| Entitlement acceptance (new) | — | **pass on the local replica, 31/31** | `npm run verify:entitlements` — six contexts + negative control (§9.2). Staging equivalent still BLOCKED. |

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

## 8. Entitlement defect — the finding, and the staged proposal

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

`0052` and repaired `0042`–`0045` remain **unapplied**. Stage 1 (the `0052`
repair alone) has since been prepared and locally validated — status, evidence
and the staging blocker are in §9.

## 9. Stage 1 — entitlement repair: prepared, validated locally, staging blocked

Full detail in **`ENTITLEMENT_REMEDIATION_REVIEW.md`**. Stage 1 was authorised
for "preparation and staging validation only"; production application was
expressly not authorised, and nothing was applied.

### 9.1 What was prepared

`supabase/migrations/0052_fix_user_entitlements.sql` is the artifact: one
`create or replace function public.user_entitlements()` plus a comment. It
changes two identifiers (`e.k` → `e.key`, `e.v` → `e.value`) and removes the
alias list that made them unresolvable. Every predicate in the 0016 body is
preserved character for character, `create or replace` keeps the existing
`EXECUTE` grants, and no table, policy, subscription or row is touched. The file
was left byte-identical so the artifact under approval is the artifact reviewed.

Dependencies, the exact production payload, the proposed migration name
(`fix_user_entitlements`, version assigned at execution as SEC-01 was) and
rollback text are in the review, §2.4–§2.6.

### 9.2 What was validated, and where

A new acceptance matrix — `supabase/tests/entitlement-stage1-matrix.mjs`, wired
as `npm run verify:entitlements` — runs the six required contexts against the
throwaway PostgreSQL 17 replica with synthetic records only. **31 of 31 checks
pass.**

| Context | `user_entitlements()` | `has_entitlement('reports')` | reports visible |
|---|---|---|---|
| anonymous | `(empty)` | false | 1 |
| authenticated, no subscription | `(empty)` | false | 1 |
| active entitled | `alerts, exports, reports, watchlists` | true | 4 |
| expired subscription | `(empty)` | false | 1 |
| trial ended | `(empty)` | false | 1 |
| cancelled subscription | `(empty)` | false | 1 |
| staff (analyst) | `(empty)` | false | 4 |
| administrator | `(empty)` | false | 4 |

The run also proves `"api": false` is honoured over the key's presence, a key
absent from `entitlement_catalog` is excluded, and staff/admin do not inherit
entitlements (they see reports through the policy's `is_staff()` branch, which
is the intended design).

**Negative control:** in a rolled-back transaction the production body is
reinstated and the same calls are made — every one returns `42P01 missing
FROM-clause entry for table "k"`, including a premium report read **as
anonymous**. The defect and the fix are therefore both demonstrated on the same
data, rather than asserted.

### 9.3 Why this is not staging acceptance

No Hatsi360 staging project exists. `list_projects` returns eight projects, none
of them a Hatsi360 staging environment; the others belong to different products.
Provisioning one is a project-creation action on the stop-and-ask list, so the
request is made and the gate stays **BLOCKED** (review §3.1, §6).

The matrix does not substitute for staging: it cannot exercise real PostgREST
JWT claims, the React client shell, or production's actual grant state. That
last point is not academic — see §11, where the replica and production disagree
about what `anon` may read.

### 9.4 New finding raised by the reconciliation: `anon` holds `TRUNCATE` on 73 of 80 tables

Measured on production while reconciling the entitlement policies:

| Privilege held by `anon` | Tables |
|---|---|
| `TRUNCATE` | **73 of 80** |
| `INSERT` | 73 |
| `DELETE` | 73 |

All 80 tables have RLS, so `INSERT`/`DELETE` are policed — but **RLS is never
applied to `TRUNCATE`**, the exact caveat the SEC-01 authorisation insisted on.
`customer_subscriptions`, `entitlement_catalog` and `market_reports` are among
the 73. SEC-01 closed six tables; this is the same defect class at an order of
magnitude larger scale, sitting directly beneath the entitlement work: one
unguarded `TRUNCATE` of `customer_subscriptions` removes every entitlement in
the platform, policies notwithstanding.

Exposure is currently constrained by there being no `TRUNCATE` channel through
PostgREST, but the privilege is unnecessary and becomes directly exploitable
through any SQL injection, any `SECURITY DEFINER` function taking SQL, or any
credential exposure. The repository already revokes these grants, so production
again trails the repository.

Not fixed here: it needs its own authorisation, its own before/after evidence
and a staging verification. Filed for decision (review §7.1).

A related grant divergence: the repository leaves `anon` with no grant on
`market_reports` while production grants it, which is why the matrix's anonymous
row applies a temporary production-parity grant (labelled, and revoked in
teardown). The repository applied as written would give anonymous visitors an
empty reports surface.

### 9.5 Migration records after Stage 1

Unchanged from §4: CLI history 7, ledger 32 (last `0033`), repository 51. Stage
1 applied **no** migration, so nothing was added to any record, and per the
authorisation no attempt was made to reconcile them.

## 10. Workstream A — staging provisioning: BLOCKED on a capacity limit

`create_project` was called for `hatsi360-staging`: free plan, `us-east-1`
(matching production), PostgreSQL 17, independent credentials generated for the
purpose and not recorded anywhere.

**The platform rejected it:**

> The following organization members have reached their maximum limits for the
> number of active free projects … (2 project limit). To continue, these users
> will need to either delete, pause or upgrade one or more of these projects.

The two active free projects are `umxzsdepbrenqysabtlt` (production) and
`kwari-pos-manager-test` (a different product). The other six projects in the
organisation are already inactive.

The authorisation is explicit: "If provisioning requires an unexpected paid
upgrade or material additional cost, stop and request approval." Freeing a slot
means either upgrading the organisation to a paid plan or pausing/deleting one
of two active projects — one of which is production, and the other of which is
not this product. Both are decisions for the account owner, so **nothing was
changed and the workstream stops here.**

Consequences, stated plainly:

| Staging verification item | Status |
|---|---|
| 1. Migration reproducibility | **BLOCKED on hosted** — validated only on the local replica (89/89 RLS, 203 policies, both suites, `ALL MIGRATIONS APPLIED CLEANLY`). Not hosted evidence. |
| 2. RLS and grants | BLOCKED on hosted — measured on the replica and, for production, read-only |
| 3. Entitlement resolver behaviour | BLOCKED on hosted — 31/31 on the replica including the negative control |
| 4. PostgREST JWT authentication | BLOCKED twice: no project, and this environment has no network egress to `*.supabase.co` |
| 5. Six-context entitlement matrix | BLOCKED on hosted — done on the replica |
| 6. Public report access | BLOCKED — same two reasons |
| 7. React client-shell behaviour | BLOCKED — same two reasons |
| 8. Vercel staging integration | BLOCKED — needs both a project and a deployment decision |

Items 4, 6, 7 and 8 need something this environment cannot supply even once a
project exists: reachable network access to the staging API and a deployment.
They will need an operator-run pass or a networked environment.

## 11. Workstream B — anonymous privilege audit: complete, remediation proposed

Full report: **`ANONYMOUS_PRIVILEGE_AUDIT.md`**. Headline findings:

- **73 of 80 public tables grant `anon` SELECT, INSERT, UPDATE, DELETE,
  TRUNCATE, REFERENCES and TRIGGER.** The seven that do not are the six SEC-01
  tables plus `_hatsi_migrations`.
- The grants are **not** from any Hatsi360 migration. They are the platform's
  default privileges for schema `public`, granted independently by **both**
  `postgres` and `supabase_admin`, measured in `pg_default_acl`
  (`anon=arwdDxtm`). No migration in the repository changes default privileges,
  and only four tables were ever explicitly revoked.
- **No anonymous write is reachable through the API.** All eleven
  non-contact-form write policies that reach `anon` are predicated on
  `is_staff()` or `auth.role() = 'authenticated'`; where `WITH CHECK` is omitted
  on an `ALL` policy, PostgreSQL reuses `USING`. This was checked
  predicate by predicate rather than assumed.
- The risk is the **unpoliced privileges**: `TRUNCATE` (row security never
  applies), `REFERENCES`, `TRIGGER` and PostgreSQL 17's `MAINTAIN`. They convert
  any SQL-level foothold into platform-wide data loss, and they remove the
  defence-in-depth layer that makes a policy mistake survivable.
- The **repository is not the intended state either**: it grants `anon` SELECT
  on only 28 tables while 44 tables carry anon-reachable read policies, and it
  still leaves TRUNCATE on 8 and INSERT on 9.

Proposed in two phases, both unapplied to any hosted project:

| Phase | File | Content | Validation |
|---|---|---|---|
| 1 | `supabase/migrations/0053_least_privilege_anonymous_grants.sql` | revoke TRUNCATE/REFERENCES/TRIGGER/MAINTAIN from `anon` and `authenticated` on every public relation, plus the matching default-privilege revocation; self-checking | in the chain: `ALL MIGRATIONS APPLIED CLEANLY`, 89/89 RLS, 203 policies, 210-statement RLS suite, 346-statement workflow suite, no leftovers |
| 2 | `supabase/proposed/0054_anonymous_dml_revocation.sql` | revoke *all* anonymous privileges, then grant back the measured minimum (SELECT on 36 tables + 2 public views, INSERT on `contact_enquiries` only) | **not applied and not in the chain**; requires a reviewed test change first (§11.1) |

Phase 1 touches only privileges no policy or code path uses, so it is
behaviour-neutral by construction. Phase 2 changes how a denial is reported
(0 rows versus `42501`) and the RLS suite asserts the looser form in places, so
it is deliberately held out of the chain until that test update is reviewed —
which is the authorisation's "regression test plan" made concrete rather than
asserted.

Regression plan, executable now: `npm run verify:privileges` —
**14/14 invariants hold**, including "anon reads the public surface", "anon can
submit a contact enquiry", "anon is refused a write to `market_reports`
(42501)", and "authenticated lost TRUNCATE but kept its DML".

### 11.1 Policy hygiene finding

Ten write policies are *named* for authenticated users but *scoped* to
`{public}`, and four are `ALL` where write-only is intended. They deny `anon`
today only because their predicates carry the restriction. A future predicate
edit would re-open anonymous writes with the grant already in place. Proposed as
a separate Phase 3, no grant change.

## 12. Risk register (consolidated)

| # | Risk | Severity | Status / next step |
|---|---|---|---|
| 1 | Entitlement resolver raises in production; every client user silently receives zero entitlements | **High** (latent — 0 subscriptions) | Stage 1 prepared, 31/31 locally; **blocked on staging** |
| 2 | `anon` holds TRUNCATE on 73 public tables; RLS cannot mitigate | **High** | Phase 1 proposed and validated; awaiting production approval |
| 3 | `anon` holds INSERT/UPDATE/DELETE on 73 tables, denied only by policy | Medium | Phase 2 proposed; needs test change + staging |
| 4 | Ten `{public}`-scoped write policies | Medium | Phase 3 proposed |
| 5 | No staging project — blocks entitlement acceptance, Phase 2, and P2.2–P2.6 | **High** | free-tier limit; approval requested (§13, request 1) |
| 6 | Migration records disagree (CLI 7 / ledger 32 / repo 51+1) | Medium | not reconciled by design; needs a separate approved plan |
| 7 | Lint gate red (43 errors / 171 warnings) | Medium | CI cannot enforce the passing build |
| 8 | Publication integrity: all series rows are `imported`, nothing prevents unverified rendering | Medium | open |
| 9 | Staging HTTP/JWT/Vercel verification impossible from this environment | Medium | needs operator-run pass or networked environment |
| 10 | `supabase_admin` default privileges outside Phase 1's reach | Low | residual, documented |

## 13. Approval requests (separate, in priority order)

1. **Staging capacity.** Either (a) upgrade the organisation to a paid plan, or
   (b) nominate an active free project to pause. *(Pricing was not verified and
   is deliberately not quoted.)* Until one is chosen, §10 stays blocked.
2. **Phase 1 to production** — apply `0053` (unpoliced privileges only; no
   policy, no DML, no data). Before/after evidence would follow the SEC-01
   pattern.
3. **Phase 2 test change** — allow `assert_no_rows_affected` to accept `42501`,
   so `0054` can be prepared for review.
4. **Entitlement Stage 1 to production** — `fix_user_entitlements` (`0052`),
   *after* staging acceptance.
5. **Phase 2 / Phase 3 / `0042`–`0045`** — not requested yet; each needs staging
   and its own evidence.

## 14. Operational metrics — definitions, ready to run

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

## 15. The five outstanding Phase 2 documents

| Document | Blocked on | What can already be stated |
|---|---|---|
| `AGENT_WORKFLOW_VALIDATION.md` | staging + real agent account | Workflow SQL validated (346-statement suite); duplicate-submission and weak-network behaviour covered by unit tests, not end-to-end |
| `ADMIN_VERIFICATION_VALIDATION.md` | staging + verifier account | Self-verification prevented by policy and covered by the RLS suite; the entitlement half of admin gating raises in production (§8) |
| `SCHEDULED_JOBS_VALIDATION.md` | staging | Runner uses a `timingSafeEqual` bearer secret and is idempotent per `(job, slot)`; five jobs defined, never executed against a database |
| `OPERATIONAL_MONITORING_REPORT.md` | error-tracking decision | No error tracking, health endpoint or structured logging; §9 is the skeleton |
| `PHASE_2_OPERATIONAL_READINESS_REPORT.md` | — | this document |

## 16. Blockers, in priority order

1. ~~Six ungoverned tables with full DML for `authenticated`~~ — **closed**
   2026-11-26, migration `20261126224213_sec01_intelligence_table_rls`,
   verified §5.
2. **`has_entitlement()` raises in production** — total, silent denial of paid
   features. Stage 1 prepared and locally validated (31/31); **blocked on
   staging**, which is blocked on approval to provision (§9).
3. **No staging project, and provisioning is blocked on capacity** — the free
   tier allows 2 active projects and both slots are taken, so `hatsi360-staging`
   could not be created (§10). Blocks P2.2–P2.5, entitlement acceptance, and
   Phase 2 of the privilege remediation. Approval requested (§13, request 1).
4. **Migration records disagree** (7 / 32 / 51) — blocks reliable deploy and
   rollback.
5. **Lint gate red** (43 errors / 171 warnings) — CI cannot pass, so the passing
   build and test suite are not enforced on future commits.
6. **Publication integrity** — series are all `imported`; nothing prevents
   unverified series from being rendered as published.
7. **`anon` holds `TRUNCATE` on 73 of 80 public tables** (§11) — RLS cannot
   mitigate it; SEC-01's own lesson, unapplied at scale. Phase 1 remediation is
   written and locally validated, awaiting production approval (§13, request 2).
8. **`anon` holds INSERT/UPDATE/DELETE on 73 tables**, denied only by policy,
   and ten write policies are mis-scoped to `{public}` — Phase 2 (proposed,
   unapplied) and Phase 3 (proposed) address these.

## 17. Release recommendation

> **NOT_READY_FOR_PRODUCTION**

Unchanged, and it must stay unchanged. One production blocker has closed; the
rest have not, and closing one defect does not make the platform releasable:

- the entitlement resolver is still broken in production and its fix is
  deliberately **not** applied;
- the schema still cannot be reconciled with its own history;
- Phase 2's operational evidence — agent → verification → publication, jobs,
  monitoring — does not exist yet, because the environment to produce it does not;
- the lint gate is red, so CI is not protecting any of the above;
- a wider grant defect has been found and not yet fixed — `anon` holds
  `TRUNCATE` on 73 of 80 public tables, which RLS cannot mitigate (§11);
- the environment that would let these fixes be proven does not exist, and
  cannot be created without a decision on capacity (§10).

Three decisions would move this report forward, all recorded in §13: resolve the
staging capacity limit, approve Phase 1 of the privilege remediation, and approve
the Phase 2 test change. None of them is a release decision.

What changed materially today: SEC-01 is closed with before/after evidence rather
than a claim; the fix was shaped by two things that would have broken production
if assumed instead of measured (session-based ingestion, and a series that is
100% unverified); all 80 public tables now have RLS; and the entitlement defect
now has a reviewed, reversible, staged remediation waiting for a decision.
