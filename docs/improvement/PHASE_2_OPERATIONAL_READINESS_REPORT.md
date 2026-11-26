# Hatsi360 — Phase 2 Operational Readiness Report

| | |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Project | `umxzsdepbrenqysabtlt` (production) |
| Status | Phase 3 entitlement audit complete (`PHASE_3_*.md`); **`NOT_READY_FOR_PRODUCTION` maintained**. SEC-01 remediated. Privilege Phase 1 **applied and re-verified** (`20261126225938`; preflight review §13 — one condition fails: `supabase_admin` defaults, blocked §14). Entitlement Stage 1 prepared (31/31 locally). Staging **BLOCKED** on plan cost (§10). Phase 2 (`0054`) ready, unapplied. |
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
| Supabase CLI history (`supabase_migrations.schema_migrations`) | **8** | `0001`, `0002`, `0003`, `0004`, `20261114152034 commodity_intelligence`, `20261114152829 intelligence_analytics_views`, `20261126224213 sec01_intelligence_table_rls`, **`20261126225938 least_privilege_anonymous_grants`** |
| Project ledger (`public._hatsi_migrations`) | **32** | last entry `0033_collection_activation.sql`, applied `2026-11-14 13:15:43 UTC` |
| Repository | **52** files | `0000`–`0053`, plus `supabase/proposed/0054` (not in the chain) |

The three records still disagree, and this remediation did **not** fix that: the
new migration is recorded in the CLI history and in the repository file
`0050_intelligence_table_rls.sql`, but not in `_hatsi_migrations`, which has no
row for anything after `0033`. Reconciling them is a separate task, and it is a
prerequisite for reliable deploy or rollback (§17, blocker 4).

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
| Migration verification | fail (7 defects) | **pass** | 89/89 RLS, 203 policies, **222**-statement RLS suite (210 + 12 helper self-tests), 346-statement workflow suite |
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

## 10. Workstream A — staging: blocked, with options and costs

`create_project` for `hatsi360-staging` was rejected: the organisation is at its
**2 active free projects** limit, already used by production and
`kwari-pos-manager-test`. No plan was upgraded and no other product's project was
touched — both were ruled out by the authorisation.

### 10.1 Plan options and list prices

Prices below are published list prices gathered from Supabase pricing summaries in
October–November 2026, **not a quote**. Confirm on the pricing page before
committing; the annual figures are 12 × the monthly list price, and at least one
source states Supabase publishes no annual billing option on these self-serve
tiers.

| Plan | Monthly | Annual (12×) | What it changes for us |
|---|---|---|---|
| Free | $0 | $0 | the current limit: 2 active projects, pauses after a week idle. Cannot hold production + staging. |
| **Pro** | **$25** organisation fee + compute per project, minus a $10 credit | **≈ $300** + compute | removes the 2-project limit, no pausing, daily backups 7 days |
| Team | $599 | ≈ $7,188 | Pro plus SOC 2 / ISO 27001, SSO, 14-day backups — not needed for staging |
| Enterprise | custom | custom | not applicable |

**Realistic Pro cost for this estate:** production and staging are both Micro
instances, $10 each, less the $10 credit → **$25 + $10 = $35/month ≈ $420/year**.
That is the figure to weigh, not $25.

### 10.2 Can an existing project be repurposed?

**No.** The organisation has eight projects; one is production and the other
seven belong to other products (`kwari-pos-manager-test`, `koriepay_app`,
`pluck-erp-dev`, `pluck-erp-v2-dev`, `lumi-phase1-dev`,
`supabase-almond-magnet`). The five inactive ones are paused: restoring one would
consume the same free slots we are short of, and repurposing one as Hatsi360
staging would require discarding another product's data. Neither is acceptable
without that product's owner agreeing, which is outside this authorisation.

### 10.3 Alternative staging arrangements

| Option | Covers | Cost | Blocker |
|---|---|---|---|
| **Local Supabase stack** (`supabase start`: Postgres + PostgREST + GoTrue + Studio in Docker) | migration chain, RLS, **real PostgREST JWT path**, and the Next.js client shell pointed at `localhost` | $0 | needs Docker in the environment; not verified available here |
| Local replica (`npm run verify:migrations`) — **already in use** | migrations, RLS, grants, entitlement SQL | $0 | no HTTP layer, no Auth, no UI |
| Supabase database branch | isolated schema copy of production | requires **Pro** — same cost as 10.1 | still paid |
| Second free organisation under a different owner account | full hosted staging | $0 | the free-project limit is per *member* across organisations, so the same person cannot hold a third; needs another owner |
| Defer HTTP/UI acceptance to pre-release | — | $0 | leaves the PostgREST and client-shell paths unproven |

**Recommendation:** if Docker is available, the local Supabase stack is the
zero-cost way to clear items 4, 6 and 7; Pro at ≈ $35/month is the only way to
get a genuinely hosted staging environment. Neither is actioned here — the
authorisation says to wait for approval.

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
| 1 | `supabase/migrations/0053_least_privilege_anonymous_grants.sql` | revoke TRUNCATE/REFERENCES/TRIGGER/MAINTAIN from `anon` and `authenticated` on every public relation, plus the matching default-privilege revocation; self-checking | in the chain: `ALL MIGRATIONS APPLIED CLEANLY`, 89/89 RLS, 203 policies, RLS + workflow suites green, no leftovers; then **applied to production** and verified (§11.3) |
| 2 | `supabase/proposed/0054_anonymous_dml_revocation.sql` | revoke *all* anonymous privileges, then grant back the measured minimum (SELECT on 36 tables + 2 public views, INSERT on `contact_enquiries` only) | **not applied and not in the chain**; the test prerequisite is now done (§12); ready for independent review |

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

### 11.3 Phase 1 applied to production (2026-11-26)

Migration **`20261126225938_least_privilege_anonymous_grants`** — the committed
`0053` payload, transactional, no DML. Full evidence in
`ANONYMOUS_PRIVILEGE_AUDIT.md` §12; the essentials:

| Measurement | Before | After |
|---|---|---|
| `anon` / `authenticated` TRUNCATE, REFERENCES, TRIGGER | 73 tables each | **0** |
| `anon` SELECT / INSERT / UPDATE / DELETE | 73 each | 73 each (unchanged) |
| `service_role` TRUNCATE | 80 | 80 (unchanged) |
| Default ACL grantor `postgres` | `anon=arwdDxtm` | `anon=arwd` |
| Default ACL grantor `supabase_admin` | `anon=arwdDxtm` | unchanged — **cannot be altered by this credential** (`postgres` is not a member; §11.4) |

Functional verification: anonymous reads intact (22 commodities, 11 states,
259 published observations, 96 summary rows); a real contact-enquiry insert
succeeds as `anon` when rolled back; an admin session still updated 48
intelligence rows; `TRUNCATE` refused with `42501` for both `anon` and an admin
`authenticated` session; no row was read, written or deleted.

Two honest caveats. First, `insert … returning id` on `contact_enquiries` fails
even for `anon` — returning a row requires SELECT visibility and the table's only
SELECT policy is staff-scoped. The application inserts without `.select()`
(`src/lib/forms/actions.ts`), so the public form is unaffected. Second, the
`supabase_admin` default ACL gap is real (§11.4).

### 11.4 Residual: `supabase_admin` default ACL

`postgres` is neither superuser nor a member of `supabase_admin`, so
`ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` is refused. All 80 tables are
owned by `postgres` and are covered; a table created *by* `supabase_admin` in
`public` would still inherit `arwdDxtm`. Mitigation: the platform owner runs the
same revocation from a `supabase_admin` credential, and `verify:privileges` plus
the audit's monitoring query catch any reappearance.

## 12. Workstream C — assertion change and 0054

`rls_test.assert_no_rows_affected` now treats **both** "zero rows affected" and
SQLSTATE **42501** as a denial, and still fails on any other error and on any
statement that actually changes rows. Three self-tests in
`tests/rls/permission-tests.sql` pin all three branches, so the helper cannot
regress into swallowing errors:

| Self-test | Expectation | Result |
|---|---|---|
| statement raises 42501 (missing privilege) | helper accepts | PASS |
| statement raises 42703 (malformed) | helper fails | PASS |
| statement changes a row | helper fails | PASS |

The RLS suite therefore runs **222 statements** (was 210) with all assertions
passing; the workflow suite is unchanged at 346; no leftover rows.

`supabase/proposed/0054_anonymous_dml_revocation.sql` is updated and **ready for
independent review**: prerequisite 1 (the assertion change) is done, prerequisites
2 and 3 (staging acceptance, a staging project) remain open. It stays outside
`supabase/migrations/` so nothing can apply it by accident, and it has **not**
been applied to production or staging.

## 13. `0053` — production preflight review and verification record

### 13.0 State discrepancy, stated first

This review was requested against `bc28c9d`. The branch head is **`b3b051d`**,
because the previous turn's authorisation approved applying `0053` and it was
applied then. Nothing was re-executed in this review: doing so would have written
a **second** migration record for one change and made the history lie.

| | |
|---|---|
| Applied migration | **`20261126225938_least_privilege_anonymous_grants`** |
| Execution result | success; transactional (connector rolls back on failure); no DML |
| Repository counterpart | `supabase/migrations/0053_least_privilege_anonymous_grants.sql` |

### 13.1 Step 1 — inspection of the committed SQL

| Condition | Verdict | Evidence |
|---|---|---|
| Revokes only `TRUNCATE`, `REFERENCES`, `TRIGGER`, `MAINTAIN` | **PASS** | the single `revoke` statement names exactly those four |
| Covers `anon` and `authenticated` | **PASS** | `from anon, authenticated` |
| Corrects default privileges for `postgres` **and** `supabase_admin` | **FAIL** | only `alter default privileges for role postgres`. `supabase_admin` cannot be altered by this credential — `postgres` is not superuser and `pg_has_role('postgres','supabase_admin','member')` = false |
| Does not modify SELECT/INSERT/UPDATE/DELETE grants | **PASS** | no such statement; live counts unchanged (anon 73/73/73/73, authenticated 79) |
| Does not modify RLS policies, application data or entitlement functions | **PASS** | no policy, DML or function statement; live policy count unchanged at 162 |
| No dependency on `0052` or `0042`–`0045` | **PASS** | the file references no entitlement object or helper |

One condition fails, so under Step 3 this review does not execute anything.

### 13.2 Step 2 — production preflight capture

| Capture | Value |
|---|---|
| PostgreSQL | **17.11**, x86_64 — target version confirmed |
| Public tables / views | 80 / 7 |
| `anon` SELECT / INSERT / UPDATE / DELETE | 73 / 73 / 73 / 73 |
| `anon` TRUNCATE / REFERENCES / TRIGGER / MAINTAIN | **0 / 0 / 0 / 0** |
| `authenticated` SELECT / INSERT | 79 / 79 (only `_hatsi_migrations` is excluded, by `0032`) |
| `authenticated` TRUNCATE / REFERENCES / TRIGGER / MAINTAIN | **0 / 0 / 0 / 0** |
| `service_role` TRUNCATE | 80 (unchanged — ETL retains it) |
| RLS policies | 162 (unchanged since SEC-01) |
| Default ACL, grantor `postgres` (tables) | `{postgres=arwdDxtm, anon=arwd, authenticated=arwd, service_role=arwdDxtm}` |
| Default ACL, grantor `supabase_admin` (tables) | `{postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}` — **unchanged** |
| Default ACL, functions (both grantors) | `X` (EXECUTE) only — untouched |
| Views | `published_price_observations`, `market_price_summary` keep `anon=arwd`; the five analytics views stay authenticated-only |
| Migration history | **8** entries, last `20261126225938`; ledger `_hatsi_migrations` still 32 (last `0033`); repository 53 files + `supabase/proposed/0054` |
| Application dependencies | none on the four privileges — no `TRUNCATE`/`REFERENCES`/`TRIGGER` use in `src/` or `scripts/`; the only text matches are the CSS class `truncate` and the word "preferences" |
| Data | 321 observations, 48 production rows, 7 evidence sources, 0 subscriptions, 11 profiles, 22 commodities, 11 markets, ledger 32 — **identical to the pre-application snapshot** |

Comparison against the assumptions documented in `ANONYMOUS_PRIVILEGE_AUDIT.md`:
every measured assumption held (73/80 granting the full set, two default-ACL
grantors, tables owned by `postgres`, no application use). The one known
limitation — that `supabase_admin`'s defaults are out of reach — was documented
before the apply and is confirmed here.

### 13.3 Step 3 — decision gate

**Did not execute.** Two independent reasons: the migration is already applied
(re-executing would duplicate history), and one Step 1 condition fails. The
preflight evidence above is the preserved record.

### 13.4 Step 4 — verification of the applied migration

| # | Requirement | Result |
|---|---|---|
| 1 | No `anon`/`authenticated` TRUNCATE, REFERENCES, TRIGGER or MAINTAIN on existing objects | **PASS** — 0 across 80 tables and 7 views for both roles; both `TRUNCATE` attempts refused with `42501` (anon on `commodities`, admin session on `commodity_supply`) |
| 2 | Default privileges corrected for both grantors | **PARTIAL** — `postgres` corrected (`arwd`), `supabase_admin` not, and not correctable here |
| 3 | Public market intelligence readable | **PASS** — as `anon`: 22 commodities, 11 states, 259 published observations, 96 summary rows |
| 4 | Contact enquiry submission functional | **PASS** — insert as `anon` returned `INSERT OK` inside a rolled-back transaction |
| 5 | Authenticated admin ingestion functional | **PASS** — admin session (`is_staff()` true) updated **30** rows of `commodity_supply`; all 48 of `commodity_production` in the earlier run |
| 6 | RLS policies and ordinary DML grants unchanged | **PASS** — 162 policies; anon 73/73/73/73; authenticated 79/79 |
| 7 | No application data modified | **PASS** — every count identical; the migration contains no DML |

### 13.5 What closes the remaining gap

`0053` is now an applied migration, so the standing rule applies: it is **not
edited**. Closing the `supabase_admin` default ACL needs a *new* additive
migration, and one run by a credential that holds `supabase_admin` — which this
environment does not have. Until then, the residual is monitored: the revoke
loop is idempotent and re-runnable, and `npm run verify:privileges` catches any
reappearance in the replica.

Decision required (§16, request 4): obtain that credential, or formally accept
the residual with monitoring.

## 14. Default-privilege evidence — the `supabase_admin` residual (Workstreams A–E)

This section closes the evidence question left open by §13.1. It records what
production actually holds, why this environment could not change it, the
migration that *would* change it, and what was validated locally. Nothing in
this section has been applied to production.

### 14.1 Baseline

| Fact | Value |
|---|---|
| Project | `umxzsdepbrenqysabtlt` |
| PostgreSQL | **17.11** |
| Session role | `postgres` — `rolsuper = false`, `rolbypassrls = true` |
| `supabase_admin` | `rolsuper = **true**`, `rolcanlogin = true` |
| Membership rows for `supabase_admin` / `postgres` in `pg_auth_members` | **0** |
| Public tables owned by `supabase_admin` | **0** (single owner: `postgres`) |
| Applied migration | `20261126225938` (`0053`), last in `list_migrations` |

`pg_default_acl` holds two rows for schema `public`, object type `r`: one for
grantor `postgres`, one for grantor `supabase_admin`. `0053` corrected the
first. The second is unchanged.

### 14.2 Raw ACL evidence

Read from `pg_default_acl` and expanded with `aclexplode` — 56 rows total, no
grant options (`is_grantable` false throughout). Privileges are never quoted
from a transcribed string.

| Grantor | Grantee | Raw array element | Expanded privileges |
|---|---|---|---|
| `postgres` | `anon` | `anon=arwd/postgres` | INSERT, SELECT, UPDATE, DELETE |
| `postgres` | `authenticated` | `authenticated=arwd/postgres` | INSERT, SELECT, UPDATE, DELETE |
| `postgres` | `service_role` | `service_role=arwdDxtm/postgres` | all 8 |
| `postgres` | `postgres` | `postgres=arwdDxtm/postgres` | all 8 |
| `supabase_admin` | `anon` | `anon=arwdDxtm/supabase_admin` | **all 8 — TRUNCATE, REFERENCES, TRIGGER, MAINTAIN included** |
| `supabase_admin` | `authenticated` | `authenticated=arwdDxtm/supabase_admin` | **all 8** |
| `supabase_admin` | `service_role` | `service_role=arwdDxtm/supabase_admin` | all 8 (legitimate) |
| `supabase_admin` | `postgres` | `postgres=arwdDxtm/supabase_admin` | all 8 (legitimate) |

**The `arwdDxtm` vs `anwdDxtm` discrepancy is closed.** `n` is not a table
privilege code; `anwdDxtm` appears in no workspace document and is not valid
syntax. It was a transcription artefact introduced by an earlier chat summary,
never production state. The expansion above is the authority, and it confirms
`arwdDxtm` — the wide grant, not a narrower one.

### 14.3 Execution authority — the blocker

`ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` requires superuser or
membership in that role. This session has neither, and the statement says so:

```
alter default privileges for role supabase_admin in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

ERROR: 42501: permission denied to change default privileges
```

The probe was wrapped in a transaction and rolled back; production state is
unchanged. `supabase_admin` is a superuser role the platform controls, the
`postgres` session role is not a member of it, and there is no role-switching
path through the connector. No escalation was attempted and no unrelated
service credential was used, per instruction.

**Workstream B verdict: no authorised execution path exists from this
environment.** Workstream C is therefore gated, not skipped for convenience.

### 14.4 Proposed remediation — `0055`, prepared and unapplied

`supabase/proposed/0055_supabase_admin_default_privileges.sql`, kept outside
`supabase/migrations/` so it cannot enter the active chain. `0053` is applied
and is not edited. The proposal:

- revokes **TRUNCATE, REFERENCES, TRIGGER, MAINTAIN** on tables from `anon` and
  `authenticated`, for grantor `supabase_admin`, schema `public` — the four
  privileges RLS cannot police;
- preserves INSERT/SELECT/UPDATE/DELETE defaults, and all of `postgres`'s and
  `service_role`'s defaults, including TRUNCATE;
- **fails loudly** with `42501` if the caller lacks authority, rather than
  reporting success while doing nothing — a migration that no-ops silently is
  worse than one that fails;
- self-checks afterwards and raises if any excess privilege survives.

### 14.5 Before and after (expected)

| Grantee | Before | After |
|---|---|---|
| `anon` | arwdDxtm | **arwd** |
| `authenticated` | arwdDxtm | **arwd** |
| `service_role` | arwdDxtm | arwdDxtm (unchanged) |
| `postgres` | arwdDxtm | arwdDxtm (unchanged) |

This puts the `supabase_admin` grantor in exactly the state `0053` produced for
the `postgres` grantor. Existing object privileges are untouched: the change
applies only to tables created *after* it runs.

### 14.6 Recovery

```sql
alter default privileges for role supabase_admin in schema public
  grant truncate, references, trigger, maintain on tables
  to anon, authenticated;
```

Restores the prior default ACL. Nothing is retroactive in either direction, so
recovery cannot affect an existing table.

### 14.7 Local validation

`npm run verify:default-privileges` (new, `supabase/tests/default-privilege-guard.mjs`)
exercises the proposal on the throwaway replica, every branch inside a rolled-back
transaction. **9/9 checks pass:**

| Branch | Check | Result |
|---|---|---|
| role absent | proposal is a no-op, creates no default ACL | PASS |
| role present + authority | reproduction matches production's 8-privilege ACL | PASS |
| role present + authority | `anon` and `authenticated` reduced to INSERT/SELECT/UPDATE/DELETE | PASS |
| role present + authority | no TRUNCATE/REFERENCES/TRIGGER/MAINTAIN left for browser roles | PASS |
| role present + authority | `postgres` and `service_role` keep TRUNCATE | PASS |
| role present, no authority | raises `42501` instead of skipping | PASS |

Full gate run at this commit: `verify:migrations` PASS (89 tables, 89 with RLS,
222 RLS statements, 346 workflow statements, no leftover rows) ·
`verify:privileges` **14/14** · `verify:entitlements` **31/31** ·
`verify:default-privileges` **9/9** · `tsc --noEmit` clean.

Local validation is not production acceptance. Branch 2 proves the SQL is
correct; it does not prove it can run where it needs to run.

### 14.8 What the residual actually exposes

Scoped honestly, because the severity matters: a default ACL applies only to
objects created **by its grantor**. All 80 public tables are owned by
`postgres`, and **zero** are owned by `supabase_admin`. So:

- **today**, nothing is exposed by this row — object privileges were verified
  unchanged (anon TRUNCATE 0, authenticated TRUNCATE 0, `service_role`
  TRUNCATE 80, anon SELECT 73 tables + 2 views);
- the exposure is **latent**: it materialises the moment `supabase_admin` (a
  superuser the platform uses) creates a table in `public`, and that table
  would be carry anonymous TRUNCATE that no policy can refuse.

That is why risk 3a is Medium rather than High, and why the correct disposition
is either a credential or a formal acceptance with monitoring — not a claim
that it is closed.

### 14.9 Outstanding risks

1. No credential holding `supabase_admin` exists in this environment; the
   proposal cannot be executed here at all.
2. The residual is unmonitored in production. `verify:privileges` watches the
   replica; nothing watches for a `supabase_admin`-created table appearing in
   `public`.
3. The existing object-privilege surface was verified, not re-baselined: a new
   table created between now and the next audit would not appear in this
   record.
4. Reconciliation of migration records remains untouched and out of scope.

**Decision required (§16, request 4):** obtain a credential that is a member of
`supabase_admin` so `0055` can be applied, or formally accept the residual with
monitoring. Neither is a release decision, and both are compatible with
`NOT_READY_FOR_PRODUCTION`.

## 15. Risk register (consolidated)

| # | Risk | Severity | Status / next step |
|---|---|---|---|
| 1 | Entitlement resolver raises in production; every client user silently receives zero entitlements | **High** (latent — 0 subscriptions) | Stage 1 prepared, 31/31 locally; **blocked on staging** |
| 2 | `anon`/`authenticated` held TRUNCATE/REFERENCES/TRIGGER on 73 public tables | ~~High~~ | **CLOSED 2026-11-26** — `20261126225938`, verified 73 → 0 |
| 3 | `anon` still holds INSERT/UPDATE/DELETE on 73 tables, denied only by policy | Medium | Phase 2 `0054` ready for review; application needs staging |
| 3a | `supabase_admin` default ACL still grants `arwdDxtm` to `anon` (§11.4, §13.1, §14.2) — the one failing 0053 preflight condition | Medium | **latent only** — 0 tables owned by `supabase_admin` (§14.8); `0055` prepared and 9/9 locally (§14.4–§14.7); no authorised executor (§14.3); decision open (§16.4) |
| 4 | Ten `{public}`-scoped write policies | Medium | Phase 3 proposed |
| 5 | No staging project — blocks entitlement acceptance, Phase 2, and P2.2–P2.6 | **High** | free-tier limit; approval requested (§16, request 1) |
| 6 | Migration records disagree (CLI 7 / ledger 32 / repo 51+1) | Medium | not reconciled by design; needs a separate approved plan |
| 7 | Lint gate red (43 errors / 171 warnings) | Medium | CI cannot enforce the passing build |
| 8 | Publication integrity: all series rows are `imported`, nothing prevents unverified rendering | Medium | open |
| 9 | Staging HTTP/JWT/Vercel verification impossible from this environment | Medium | needs operator-run pass or networked environment |
| 9a | No entitlement/UI test exists: the 31-check matrix tests SQL directly, never PostgREST or a server action | Medium | this is why a green suite coexisted with a broken product (`PHASE_3_ENTITLEMENT_AUDIT.md` §7) |
| 10 | `supabase_admin` default privileges outside Phase 1's reach | Low | residual, documented in §14; latent, not active |
| 11 | **Entitlement resolver raises in production** (`42P01`); `0052` unapplied. Every watchlist, alert, export and premium-report check fails | **Critical** | `PHASE_3_ENTITLEMENT_AUDIT.md` E-1; production `pg_get_functiondef` |
| 12 | **No database entitlement enforcement** — `0042`–`0045` unapplied; a JWT holder writes watchlists/alerts/export jobs directly | **Critical** | Audit E-2, §5; `pg_policies` |
| 13 | **App calls `has_entitlement` with the wrong argument name** (`entitlement_key` vs `p_key`) → `42883`/PGRST202 | **Critical** | Audit E-3; locally reproduced |
| 14 | **No API route declares an entitlement** (0 of 29); `/prices/history` unbounded | **High** | Audit E-5; feature matrix C-1 |
| 15 | **No subscription lifecycle machinery** — no expiry sweep, renewal, dunning, or alert evaluation job | **High** | `PHASE_3_SUBSCRIPTION_LIFECYCLE.md` §2 |
| 16 | **Client subscription page advertises ₦25,000/₦75,000 with live upgrade buttons and payment copy**, contradicting the marketing site and the absence of a provider | **High** (commercial/legal) | Audit E-7; `(client)/client/subscription/page.tsx` |
| 17 | **B2B controls inverted in the unapplied `0047`**: supplier self-verification; `create_order_from_quote` has no caller check and no `search_path`; `expire_old_rfqs` callable by any authenticated user | **High** (latent — tables absent) | `PHASE_3_B2B_READINESS.md` §4, B-1…B-3 |

## 16. Approval requests (separate, in priority order)

1. **Staging capacity** — choose one: Pro at ≈ **$35/month** (≈ $420/year) for
   production + staging; the local Supabase Docker stack at $0 if Docker is
   available; or defer hosted HTTP/UI acceptance. §10.1–§10.3. Nothing is
   actioned until you choose.
2. **Entitlement Stage 1 to production** — `fix_user_entitlements` (`0052`),
   still gated on staging acceptance per the earlier decision.
3. **Privilege Phase 2 to staging, then production** — `0054`, ready for
   independent review; needs a staging run of the anonymous read surface.
4. **`supabase_admin` default ACL** — the single failing preflight condition
   (§13.1, §13.5). Evidence in §14: the operation returns
   `42501 permission denied to change default privileges`, because
   `supabase_admin` is a superuser this session is not a member of. `0055` is
   prepared and validated locally (9/9) but **cannot be executed from here**;
   `0053` cannot be edited because it is applied. Decide: obtain a credential
   that is a member of `supabase_admin` so `0055` can be applied, or formally
   accept the residual — which is latent, since 0 public tables are owned by
   that role — with production monitoring.
5. **Phase 3 (policy scoping)** and **`0042`–`0045`** — not requested.

**Already done, no further approval needed:** Phase 1 (`0053`) applied and
verified; the `assert_no_rows_affected` change plus its three self-tests;
`0054` and `0055` prepared outside the chain, both unapplied.

## 17. Operational metrics — definitions, ready to run

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

## 18. The five outstanding Phase 2 documents

| Document | Blocked on | What can already be stated |
|---|---|---|
| `AGENT_WORKFLOW_VALIDATION.md` | staging + real agent account | Workflow SQL validated (346-statement suite); duplicate-submission and weak-network behaviour covered by unit tests, not end-to-end |
| `ADMIN_VERIFICATION_VALIDATION.md` | staging + verifier account | Self-verification prevented by policy and covered by the RLS suite; the entitlement half of admin gating raises in production (§8) |
| `SCHEDULED_JOBS_VALIDATION.md` | staging | Runner uses a `timingSafeEqual` bearer secret and is idempotent per `(job, slot)`; five jobs defined, never executed against a database |
| `OPERATIONAL_MONITORING_REPORT.md` | error-tracking decision | No error tracking, health endpoint or structured logging; §9 is the skeleton |
| `PHASE_2_OPERATIONAL_READINESS_REPORT.md` | — | this document |

## 19. Blockers, in priority order

1. ~~Six ungoverned tables with full DML for `authenticated`~~ — **closed**
   2026-11-26, migration `20261126224213_sec01_intelligence_table_rls`,
   verified §5.
2. **`has_entitlement()` raises in production** — total, silent denial of paid
   features. Stage 1 prepared and locally validated (31/31); **blocked on
   staging**, which is blocked on approval to provision (§9).
3. **No staging project, and provisioning is blocked on capacity** — the free
   tier allows 2 active projects and both slots are taken, so `hatsi360-staging`
   could not be created (§10). Blocks P2.2–P2.5, entitlement acceptance, and
   Phase 2 of the privilege remediation. Approval requested (§16, request 1).
4. **Migration records disagree** (8 / 32 / 52) — blocks reliable deploy and
   rollback.
5. **Lint gate red** (43 errors / 171 warnings) — CI cannot pass, so the passing
   build and test suite are not enforced on future commits.
6. **Publication integrity** — series are all `imported`; nothing prevents
   unverified series from being rendered as published.
7. ~~`anon` holds `TRUNCATE` on 73 of 80 public tables~~ — **closed**
   2026-11-26 by `20261126225938`, verified 73 → 0 for both browser-facing roles
   (§11.3).
8. **`anon` still holds INSERT/UPDATE/DELETE on 73 tables**, denied only by
   policy, and ten write policies are mis-scoped to `{public}` — Phase 2
   (`0054`, ready) and Phase 3 (proposed) address these; both need staging.
9. **`supabase_admin` default ACL** still grants the full set to `anon` (§11.4) —
   outside this environment's credentials.

## 20. Release recommendation

> **NOT_READY_FOR_PRODUCTION**

Unchanged, and it must stay unchanged. One production blocker has closed; the
rest have not, and closing one defect does not make the platform releasable:

- the entitlement resolver is still broken in production and its fix is
  deliberately **not** applied;
- the schema still cannot be reconciled with its own history;
- Phase 2's operational evidence — agent → verification → publication, jobs,
  monitoring — does not exist yet, because the environment to produce it does not;
- the lint gate is red, so CI is not protecting any of the above;
- the wider grant defect is **partly** closed: unpoliced privileges are gone
  (§11.3), but `anon` still holds INSERT/UPDATE/DELETE on 73 tables and
  `supabase_admin`'s default ACL is unchanged and unreachable from here (§11.4, §14);
- the environment that would let these fixes be proven does not exist, and
  cannot be created without a decision on capacity (§10).

Phase 3 adds four findings to that list, none of which is a privilege issue and
all of which are production-facing:

- the entitlement resolver **raises on every call** in production, so no
  customer can use a paid capability, and the application reports the failure
  as "you need a subscription" (risks 11, 13);
- the database enforces **no plan at all** for watchlists, alerts, exports and
  bulk, so the same features are open to any authenticated caller (risk 12);
- the subscription lifecycle has states but no transitions, and the only
  audit trail covers entitlement-JSON edits (risk 15);
- the authenticated product advertises prices and payment methods the platform
  cannot honour (risk 16), while the B2B surface, if applied as written, would
  let suppliers verify themselves (risk 17).

Documents: `PHASE_3_ENTITLEMENT_AUDIT.md`, `PHASE_3_COMMERCIAL_FEATURE_MATRIX.md`,
`PHASE_3_SUBSCRIPTION_LIFECYCLE.md`, `PHASE_3_B2B_READINESS.md`.

Three decisions would move this report forward, all recorded in §16: resolve the
staging capacity limit, approve Phase 1 of the privilege remediation, and approve
the Phase 2 test change. None of them is a release decision.

What changed materially today: SEC-01 is closed with before/after evidence rather
than a claim; the fix was shaped by two things that would have broken production
if assumed instead of measured (session-based ingestion, and a series that is
100% unverified); all 80 public tables now have RLS; and the entitlement defect
now has a reviewed, reversible, staged remediation waiting for a decision.
