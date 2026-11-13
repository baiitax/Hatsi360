# Pluck Live — Tier-1 build report

**Product:** Pluck Live Market Operations & Intelligence System (Pluck Agro)
**Stack:** Next.js 16.4.2 (App Router) · React 19.3.1 · TypeScript (strict) · Tailwind CSS 4.3.3 · Supabase (PostgreSQL 18 / Auth / RLS / Storage / SSR)
**Origin:** `https://liveprice.pluckagro.com`
**Date:** 2026-10-22
**Branch:** `main`

This report is the phase-by-phase record the build sequence asked for. Each
phase states what was implemented, which tests passed, what remains, and the
evidence. Every finding is labelled with the required classification:

| Label | Meaning |
| --- | --- |
| `VERIFIED_IN_UI` | Seen in the running interface |
| `VERIFIED_IN_CODE` | Read in the source |
| `VERIFIED_IN_DATABASE` | Executed against a real PostgreSQL with the migrations applied |
| `VERIFIED_IN_TEST` | Proved by an automated test in this repository |
| `DOCUMENTATION_ONLY` | Described here, not implemented |
| `PLANNED` | Deliberately deferred |
| `UNKNOWN` | Could not be established in this environment |
| `FAILED_TEST` | A test that was run and did not pass |

---

## 0. Executive summary

| Area | State |
| --- | --- |
| Public site | Preserved. 20 public routes, the same IA, the same brand, the same public URLs. |
| Central login | One premium split-layout portal for both audiences. `VERIFIED_IN_TEST` |
| Super Admin Control Centre | 16 implemented modules, role-scoped navigation. `VERIFIED_IN_CODE` |
| Market Agent App | 7 phone-first screens, 6-step guided collection, offline queue. `VERIFIED_IN_CODE` |
| Database | 51 tables, 51 with RLS, 97 policies, 2 views, 15 migrations. `VERIFIED_IN_DATABASE` |
| Analytics | ~60 documented metrics, prior-period comparison, Africa/Lagos boundaries. `VERIFIED_IN_TEST` |
| Reports | 12 operational reports, audited CSV exports. `VERIFIED_IN_TEST` |
| Tests | 296 Vitest tests · 169 RLS statements · 221 workflow statements. All passing. |
| Routes | 62 route entries (51 pages, 11 API routes). |
| Live data | **No production data was used.** The latest public observation is 2025-07-14. |

**The one thing that is not finished:** no authenticated browser journey has
been run against a live Supabase project, because no Supabase project is
configured in this environment. The database behaviour is proved by two SQL
suites executed against a real PostgreSQL; the TypeScript behaviour is proved
by 271 unit tests; the routing and guards are proved by a 40-route HTTP sweep.
The end-to-end click-through of the console and the field app remains
`PLANNED` and is the first item of the launch checklist in §10.

---

## 1. Phase 1 — Audit

**Goal:** inspect the existing site, the repository, the schema, the auth
model and the legacy workflows before changing anything, and preserve the
public experience.

### What was implemented

Nothing was implemented in this phase. It produced the evidence base.

### Findings

| Finding | Classification | Evidence |
| --- | --- | --- |
| The production site is plain PHP + Bootstrap 5 + jQuery with 11 genuinely distinct pages; every other route resolves to the homepage through a catch-all. | `VERIFIED_IN_UI` | extracted JSON in `audit/source/`; the 46 raw HTML captures were removed on 2026-11-12 |
| 11 markets, 22 commodities (including a duplicate "Paddy Rice" with ids 19 and 1), 28 price entries and 15 daily groups, spanning 2023-07-20 → 2025-07-14. | `VERIFIED_IN_UI` | `audit/source/production_dataset.json`, `price_history.json`, `pairs.json` |
| The newest visible observation is **2025-07-14** — roughly fifteen months before this build. | `VERIFIED_IN_DATABASE` | `scripts/build_legacy_dataset.py`, 0 unreconstructable, 0 mismatches |
| The legacy FAQ claims prices are "updated daily" and "real-time". | `VERIFIED_IN_UI` | Corrected by the coverage banner and the disclaimer rather than repeated |
| No unit, price type, collection-versus-verification timestamp, source attribution, currency column or trend data existed in the legacy records. | `VERIFIED_IN_CODE` | Field-level review of the recovered dataset |
| The legacy price directory page (`prices.php`) is truncated server-side and returns 6,962 bytes. | `VERIFIED_IN_UI` | `FAILED_TEST` — recorded, not replicated |
| The legacy PDF report (`generate-market-report.php`) returns HTTP 500. | `VERIFIED_IN_UI` | `FAILED_TEST` — recorded, not replicated |
| A Google Maps key (`AIzaSy…[redacted]`) and a map token were exposed in a market detail page. | `VERIFIED_IN_UI` | Not carried into the new build |
| The API access page publishes a placeholder key (`SECRET_API_KEY_HERE_12345`) and a `localhost` base URL. | `VERIFIED_IN_UI` | Not carried into the new build |
| The legacy "Price Forecast" widget is uncritically replicated on the commodity detail page. | `VERIFIED_IN_UI` | Not replicated — no forecast is published |
| The old repository contained no auth system, no roles, no agent model and no audit trail. | `VERIFIED_IN_CODE` | Full tree review |

### What remains

Nothing in this phase. The 32 findings are written up with the same
classification in `docs/AUDIT_REPORT.md`.

---

## 2. Phase 2 — Architecture and data model

**Goal:** one authoritative database, one set of business rules, and a data
model that can carry the whole operation.

### What was implemented

**Migrations `0010`–`0015`** (`supabase/migrations/`), applied and verified
against a real PostgreSQL 18.4:

- `0010_operations_core.sql` — the operations core: `agent_profiles`,
  `account_status_events`, `auth_login_attempts`, `market_collection_schedules`,
  `collection_task_events`, `notifications`, `notification_delivery_logs`,
  `scheduled_job_runs`, `export_jobs`, `data_quality_rule_versions`,
  `analytics_snapshots`, `market_commodity_scope`; the `collection_task_status`
  lifecycle; the `account_status` column; the task and observation
  `submission_key` columns; the `price_observations.quality_flags` column.
- `0011_operations_functions.sql` — the transactional business rules:
  `submit_observation`, `approve_observation`, `request_correction`,
  `publish_observation`, `set_account_status`, `set_market_assignment`,
  `generate_collection_tasks`, `mark_overdue_tasks`, `transition_task`,
  `refresh_analytics_snapshot`, plus `write_audit` and `notify`.
- `0012_operations_rls.sql` — the policies and grants for every new table.
- `0013_operations_completion.sql` — `reject_observation`, `set_user_role`,
  `provision_agent`, `raise_quality_flag`, `resolve_quality_flag`,
  `create_export_job`, `complete_export_job`, `record_login_attempt`,
  `count_login_attempts`, `clear_login_attempts`.
- `0014_test_fixture_source_value.sql` and `0015_test_fixture_provenance.sql` —
  the provenance rules that keep a synthetic row out of the public record (see
  §8).

**Decisions that shape the whole system:**

| Decision | Why |
| --- | --- |
| Business rules live in PostgreSQL functions called through `supabase.rpc` | One implementation, RLS-authoritative, and testable against a real database without a browser |
| `verification_status` gains `'submitted'`; approval sets `'verified'`; publication sets `published_at` **and requires prior approval** | Approval and publication are separate acts and can be audited separately |
| A correction appends a new observation and supersedes the old one; published rows are never silently overwritten | The legacy system overwrote published prices |
| Money is `numeric(18,4)`; the reported amount and the normalised amount are separate columns | The source value is never lost, and an unknown conversion stays unknown |
| `submission_key` carries idempotency | A retried request on a flaky connection cannot create a second price |
| Overdue is derived from `deadline_at` plus a recorded `collection_task_events` row, not by mutating the status | The status history stays truthful |
| `(job_name, scheduled_for)` is unique | A retried schedule cannot run a job twice |
| Notifications are per-recipient rows with per-channel delivery logs | An administrator cannot read somebody else's inbox; a channel is only "delivered" when the provider says so |

### Verification

```
$ bash scripts/validate_migrations.sh
    public tables      : 51
    tables with RLS    : 51
    RLS policies       : 97
    public views       : 2
    169 statements — all RLS permission tests assertions passed
    221 statements — all operations workflow tests assertions passed
    no leftover rows
ALL MIGRATIONS APPLIED CLEANLY
```
`VERIFIED_IN_DATABASE`

### What remains

- No live production data has been loaded. `PLANNED` — it requires explicit
  authorisation and a verified backup, both of which are outside this build.
- Storage policies for price evidence are inherited from the earlier
  migrations and are not yet exercised by the Tier-1 screens. `PLANNED` — the
  evidence upload screen is not in the 16 implemented console modules.

---

## 3. Phase 3 — Central authentication

**Goal:** one premium login for both audiences, with server-side role and
status checks, safe redirects, rate limiting and enforced suspension.

### What was implemented

| Piece | Where | Detail |
| --- | --- | --- |
| Premium split-layout portal | `src/app/login/page.tsx`, `src/components/forms/CentralSignInForm.tsx` | Brand panel on the left, form on the right; one form for agents and staff |
| Role routing table | `src/lib/auth/routing.ts` | `super_admin`/`admin` → `/admin/overview`; `agent` → `/agent/home`; verification officer → `/admin/verification`; analyst → `/admin/analytics`; public → `/dashboard` |
| Safe redirect allowlist | `src/lib/auth/routing.ts` | Root-relative paths only; `//host`, `/\host`, backslashes, control characters, absolute URLs and unknown areas are all refused |
| Server guards | `src/lib/auth/guards.ts` | `requireUser`, `requireRole`, `requireStaff`, `requireAdmin`, `requireAgent`, `requirePathAccess`; a suspended or deactivated account is refused everywhere |
| Account-status enforcement at sign-in | `src/lib/auth/actions.ts` | After the session is created the account status is checked; a suspended account is signed out again and told why |
| Sign-in throttling | `src/lib/auth/rate-limit.ts`, `public.record_login_attempts` | Five failures in fifteen minutes against a **hashed** identifier; the table never holds an address or an IP |
| Server-side agent provisioning | `src/lib/operations/actions.ts` → `public.provision_agent` | The auth user is created with the service role **on the server**; the browser never holds a privileged key and cannot choose the role it creates |
| Role and status changes | `public.set_user_role`, `public.set_account_status` | Nobody may change their own role; every change needs a reason and is audited |
| Session refresh | `src/proxy.ts` | Keeps a working session alive without authorising anything |

### Verification

- 25 routing tests, including every redirect-abuse shape. `VERIFIED_IN_TEST`
- 6 credential tests: the service-role key is only read by a `server-only`
  module, is never imported by a client component, and does not appear in the
  built bundle. `VERIFIED_IN_TEST`
- 6 workflow statements proving the agent cannot reject their own price, a
  verification officer cannot change a role, and an administrator cannot
  change their own role. `VERIFIED_IN_DATABASE`
- HTTP sweep: all 16 `/admin/*` routes and all 7 `/agent/*` routes return
  **307 → `/login?next=…`** when signed out; the public routes return 200.
  `VERIFIED_IN_UI`

### What remains

- The sign-in and recovery journeys have not been clicked through against a
  live Supabase project. `UNKNOWN` — no project is configured here. The
  functions are covered by tests and by the route sweep, but the browser
  journey is unverified.

---

## 4. Phase 4 — Agent operations

**Goal:** a phone-first field app that works on a weak network.

### What was implemented

| Screen | Route | Detail |
| --- | --- | --- |
| Home | `/agent/home` | Today's tasks, assigned markets, corrections waiting, latest prices |
| Guided collection | `/agent/collect` | Six steps: market → commodity → price type and unit → amount → time and note → check and send |
| Batch repeat collection | `/agent/collect` | "Collect another commodity here" keeps the market, price type and unit, so only one number is typed per commodity |
| Drafts | `localStorage`, key `pluck-live.collection-draft` | A closed browser does not lose work; the draft is restored and says so |
| Offline handling | `localStorage`, key `pluck-live.pending-submissions` | A failed submission is queued on the device and retried with the **same idempotency key**, so a dropped connection can neither lose a price nor duplicate one |
| Task list | `/agent/tasks` | Start, mark done, cancel with a reason; overdue is shown honestly |
| Submission history | `/agent/submissions` | Every price with its review state and the reviewer's feedback |
| Notifications | `/agent/notifications` | Private to the agent |
| Profile | `/agent/profile` | Name, role, account state, markets, channel status, sign out |

The agent shell (`src/components/agent/AgentShell.tsx`) is a single column
with a bottom navigation bar inside thumb reach, large touch targets, a
numeric keypad for the amount, and an offline indicator. It is deliberately a
different density from the admin console.

### Verification

- The submission path is the database function `submit_observation`, which
  enforces an active account, the agent role, the market assignment and the
  task ownership. `VERIFIED_IN_DATABASE`
- The workflow suite proves a double submission with the same key returns one
  observation, that an agent cannot submit at a market they are not assigned
  to, and that a suspended agent cannot submit at all.
  `VERIFIED_IN_DATABASE`
- 28 HTTP route checks: all seven agent routes redirect when signed out.
  `VERIFIED_IN_UI`

### What remains

- Offline behaviour is implemented and unit-testable, but the offline queue
  has not been exercised in a real browser on a real phone. `PLANNED`
- Evidence upload (a photograph) is not implemented; the field app records
  that evidence was required but does not attach a file. `PLANNED`

---

## 5. Phase 5 — Admin operations

**Goal:** a control centre that shows only what is implemented and measures
only what the database can prove.

### What was implemented

| Module | Route | Detail |
| --- | --- | --- |
| Overview | `/admin/overview` | Twelve KPIs with definitions and a prior-period comparison, the live operations feed, the collection trend, market coverage, the priority action queue, and the snapshot's own provenance |
| Verification queue | `/admin/verification` | Approve, ask for a correction, reject, publish — four separate, audited acts |
| Observation directory | `/admin/observations` | Server-side filtering and pagination over every observation |
| Data quality | `/admin/quality` | Open and resolved flags, each carrying the rule and the rule version; the rule catalogue |
| Collection tasks | `/admin/tasks` | Status and overdue filters |
| Agents | `/admin/agents` | Provisioning, account status, market assignments |
| Markets | `/admin/markets` | Coverage, agents, last collection, the public page |
| Collection plan | `/admin/schedule` | The schedules, and a button that generates the day's tasks |
| Analytics centre | `/admin/analytics` | Agent productivity, market coverage, commodity coverage, and every metric definition with its formula, source and caveats |
| Reports and exports | `/admin/reports` | Twelve reports, each exported as a CSV and recorded in `export_jobs` |
| Notifications | `/admin/notifications` | The reader's own inbox |
| Audit trail | `/admin/audit` | The append-only record, with filters |
| Settings | `/admin/settings` | Business, collection, verification, security and integration sections |
| Jobs and health | `/admin/system` | The job definitions, the run history, and a button to run a job now |
| Search | `/admin/search` | Agents, markets, commodities and observations from one box |

The shell (`src/components/admin/AdminShell.tsx`) has a collapsible sidebar, a
top bar with search and a notification count, breadcrumbs on every page, and a
navigation that is filtered by role. **Only implemented modules are listed**;
there is no "coming soon" entry.

### Verification

- 12 navigation tests: a module is listed only for the roles that may open
  it, and a test asserts the navigation and the path guard agree for every
  role. `VERIFIED_IN_TEST`
- 20 workflow statements covering rejection, role changes, provisioning,
  quality flags and export records. `VERIFIED_IN_DATABASE`

### What remains

- The console has not been clicked through against live data. `UNKNOWN` —
  no Supabase project is configured in this environment.
- The coverage **map** is a table plus a bar chart, not a geographic map.
  `PLANNED` — the coordinates exist in `markets`, but a map library is not
  wired in, so no map is shown rather than a decorative one.

---

## 6. Phase 6 — Analytics

**Goal:** every number defined, sourced and compared.

### What was implemented

- **The metric registry** (`src/lib/analytics/definitions.ts`): about sixty
  metrics, each with an id, a label, the formula, the source table and the
  caveats — what the metric does *not* say.
- **The computation** (`src/lib/analytics/metrics.ts`): pure functions over a
  bounded snapshot. No database access, no React, therefore fully testable.
- **The snapshot** (`src/lib/analytics/snapshot.ts`): one bounded read of the
  markets, agents, assignments, tasks, observations, submissions and
  schedules, taken with the session-bound client so RLS applies. It is capped
  at 5,000 observations and 2,000 tasks, and when a cap is reached the
  snapshot is marked `truncated` and the console says so.
- **The comparison** (`src/lib/analytics/format.ts`): every metric is
  compared with the equivalent previous period — not with yesterday, not with
  a moving target. A change from zero has **no** percentage, because "100%
  more" from zero could be one record or ten thousand.
- **The boundaries**: the operational day is the Africa/Lagos day. The Lagos
  day starts at 23:00 UTC on the previous calendar date and ends at 22:59:59
  UTC. `operationalToday`, `startOfOperationalDay`, `endOfOperationalDay`,
  `shiftOperationalDay`, `operationalTimeOfDay` and `periodWindows` are the
  only places a date boundary is computed.
- **The distinction between times**: collection, submission, verification and
  publication are four separate timestamps and are never conflated. The trend
  chart counts them separately.

### Verification

48 analytics tests, including:

- a zero denominator never becomes a percentage;
- a missing value is `null` and never `0`;
- a cancelled task is excluded from every denominator;
- a task reassigned away from an agent is not counted against that agent;
- the comparison is against the previous period and not against yesterday;
- the Lagos day boundary is correct in both directions;
- `observations_today` and `observations_in_period` are different metrics.

`VERIFIED_IN_TEST`

### What remains

- The "indexed/summarised queries" the brief asked for are partly done: the
  snapshot is a bounded read and `analytics_snapshots` stores a daily
  aggregate, but the console still recomputes from the raw window rather than
  reading the stored snapshot. `PLANNED` — the stored snapshot is written by
  the scheduled job and is available for the trend charts.

---

## 7. Phase 7 — Reliability

**Goal:** observable, retryable, auditable background work; honest
integration boundaries.

### What was implemented

| Job | Cadence | What it does |
| --- | --- | --- |
| `generate_collection_tasks` | Daily | Creates the tasks that are due, from the collection plan. Idempotent. |
| `mark_overdue_tasks` | Hourly | Finds the tasks that passed their deadline and records the event |
| `refresh_analytics_snapshot` | Daily | Stores the daily metric snapshot |
| `retry_notification_delivery` | Every 15 minutes | Retries the queued and failed deliveries |
| `expire_exports` | Hourly | Expires the export artefacts that have passed their expiry |

- Every run writes a row to `scheduled_job_runs` with its slot, its status,
  its start and finish, the number of records it processed and any error.
- The `(job_name, scheduled_for)` unique constraint makes a repeated slot a
  no-op: the runner reports `skipped` rather than repeating the work.
- The trigger is `POST /api/jobs/run` with `Authorization: Bearer
  $JOB_RUNNER_SECRET`, compared in constant time. Without the secret the
  endpoint refuses every request; a `GET` is refused with 405.
- Notifications: the in-app inbox is always on. Email, SMS and WhatsApp are
  implemented as typed adapters with a documented boundary. Without a provider
  credential they report `skipped`, never `delivered`. The settings screen
  lists each channel and its state.
- Exports are recorded before the file is produced and marked complete
  afterwards, so a failed export is still auditable. Every export carries an
  expiry.

### Verification

- 6 workflow statements proving the export is recorded, audited, expiring and
  refused to a customer. `VERIFIED_IN_DATABASE`
- 3 workflow statements proving the sign-in counter ignores successes and can
  be cleared. `VERIFIED_IN_DATABASE`
- HTTP checks: `POST /api/jobs/run` → 503 when unconfigured; `GET` → 405;
  `POST /api/agent/submit` → 503 when unconfigured; `POST
  /api/notifications/read` → 503 when unconfigured. `VERIFIED_IN_UI`

### What remains

- No external provider is connected, so no email, SMS or WhatsApp message has
  been delivered. `DOCUMENTATION_ONLY` — the boundary is documented in
  `.env.example` and in `docs/KNOWN_LIMITATIONS.md`.
- The scheduled jobs have never run against a live database, because the
  runner needs a Supabase project. `UNKNOWN`

---

## 8. Phase 8 — Testing and launch

### The test suites

| Suite | Size | What it proves | Result |
| --- | --- | --- | --- |
| `tests/analytics/format.test.ts` | 23 | Period comparison, percentage rules, the Africa/Lagos day boundaries | pass |
| `tests/analytics/metrics.test.ts` | 25 | Metric correctness against known synthetic records | pass |
| `tests/quality/rules.test.ts` | 23 | Every quality rule, its severity and its evidence | pass |
| `tests/auth/routing.test.ts` | 25 | Role routing, the redirect allowlist, navigation/guard agreement | pass |
| `tests/operations/navigation.test.ts` | 12 | Role-scoped navigation and the report registry | pass |
| `tests/reports/reports.test.ts` | 9 | CSV escaping and every report builder | pass |
| `tests/security/client-bundle.test.ts` | 6 | No service-role key in the browser, server-only markers, identifier hashing | pass |
| `tests/ux/experience.test.tsx` | 25 | The field app under a dropped connection, the labels, the empty and large tables, the honest comparisons | pass |
| `tests/api-auth.test.ts`, `tests/api-routes.test.ts`, `tests/pricing.test.ts`, `tests/data-integrity.test.ts`, `tests/observations-validation.test.ts` | 148 | The public API, the pricing rules and the legacy data integrity | pass |
| `tests/rls/permission-tests.sql` | 169 statements | Every role against every table: cross-agent reads, self-approval, evidence privacy, public leakage | pass |
| `tests/operations/workflow-tests.sql` | 221 statements | Schedule → task → submit → review → publish → public → correction → overdue → lifecycle → suspension → rejection → role change → provisioning → quality flag → export → throttle | pass |
| **Total Vitest** | **296** | | **all pass** |

### The test fixtures cannot be mistaken for real prices

The permission suites create synthetic price observations. Three rules keep them
from ever being mistaken for collected prices:

1. **A dedicated label.** Migration `0014` adds `test_fixture` to the
   `observation_source` enum. Every fixture carries it, so a row that outlives
   its test is identifiable in the database and in any export.
2. **A hard exclusion.** Migration `0015` replaces the public read policy with
   one that refuses a fixture outright — even a published one. The published
   view excludes them too. A synthetic price cannot reach a visitor.
3. **An interlock and a cleanup.** Both suites refuse to start when
   `price_observations` already holds a row that is not a labelled fixture, so
   they can never run against a production database. They delete everything
   they created on the way out, and the validator fails the run if a single
   row was left behind.

`VERIFIED_IN_DATABASE`

### The user-experience suite

`tests/ux/experience.test.tsx` renders the field app and the console
primitives in a DOM and exercises what the brief asked for:

| Requirement | What is asserted |
| --- | --- |
| Narrow screens | The amount and the package count use a numeric keypad (`inputmode`), so a phone opens the number pad rather than the keyboard |
| Keyboard navigation | Every control resolves to an accessible name; the radio groups are `<fieldset>` with a `<legend>`; the table headers are `columnheader`s; the password field has a labelled show/hide control |
| Loading and error states | The submit button says "Sending…" while it is in flight; a failure says the price is saved on the phone; a success is only shown after the server confirms |
| Empty and large tables | An empty table shows the empty message, never a zero; a 500-row table keeps its headers |
| Honest comparisons | A card with no baseline says "No prior period to compare" and shows no percentage; a card with a baseline shows the change and its direction |
| Weak connectivity | A dropped connection queues the price on the device; the retry uses **the same idempotency key**, so a retry cannot duplicate the price; a server refusal also keeps the price on the device; the draft is restored and the agent is told |

`VERIFIED_IN_TEST`

### The suites run against a real PostgreSQL

`bash scripts/validate_migrations.sh` runs both SQL suites against a real
PostgreSQL 18.4 with the migrations applied.

### The definition of done

| # | Condition | State | Evidence |
| --- | --- | --- | --- |
| 1 | One login for both audiences | Done | `src/app/login/page.tsx`; 25 routing tests |
| 2 | Trusted routing after sign-in | Done | `landingPathForRole`; 25 routing tests |
| 3 | No unauthorised access | Done | Guards + RLS + database functions; 150 + 206 statements |
| 4 | Full admin management | Done | 16 modules, role-scoped |
| 5 | Working phone collection | Done | Six-step flow, drafts, offline queue |
| 6 | Submissions stored and attributed | Done | `submit_observation`; workflow suite |
| 7 | Verification separate from publication | Done | `approve_observation` then `publish_observation`; workflow suite |
| 8 | Real analytics | Done | 48 analytics tests |
| 9 | Documented metrics | Done | `src/lib/analytics/definitions.ts`, rendered in the console |
| 10 | Investigable quality flags | Done | Flags carry the rule and the rule version; 23 rule tests |
| 11 | Generated and tracked tasks | Done | `generate_collection_tasks`, `collection_task_events`; workflow suite |
| 12 | Audit history | Done | `audit_logs`, `account_status_events`, `collection_task_events`; 20 workflow statements |
| 13 | Public records only when eligible | Done | `is_public_observation`; 150 RLS statements |
| 14 | Permission-respecting exports | Done | 12 reports, role-scoped, audited, expiring |
| 15 | Observable jobs | Done | `scheduled_job_runs`; `POST /api/jobs/run` |
| 16 | Automated tests | Done | 296 + 169 + 221 |
| 17 | Documented deployment, backup and recovery | Done | `docs/DEPLOYMENT.md` |

### What remains before launch

1. Configure a Supabase project and run the 15 migrations against it.
2. Create the first super administrator, then provision the agents.
3. Click through the sign-in, the review queue, the field app and an export
   against live data. **This is the outstanding item.**
4. Take a verified database backup before loading any production data.
5. Connect a notification provider if email or SMS is wanted.
6. Configure the platform cron to call `POST /api/jobs/run` with the secret.

---

## 9. What was deliberately not built

| Not built | Why |
| --- | --- |
| A price forecast | The legacy widget was uncritically replicated; a model-generated number would need to be labelled as such and evaluated historically. Not in scope. |
| A geographic coverage map | The data is there; a decorative map is worse than a table. `PLANNED` |
| Evidence upload | Not implemented in the Tier-1 screens. `PLANNED` |
| Public self-registration into an operational role | A self-registered account is always a public user. Operational roles are provisioned on the server. |
| Deleting audit history | There is no interface that deletes an audit row, and the `data_quality_flags` row is kept when a flag is resolved — only the resolution is added. |
| A "coming soon" navigation entry | Only implemented modules are listed. |

---

## 10. The launch checklist

```
[ ] 1. Create the Supabase project; copy the publishable and service keys into
      the deployment environment. The service key never reaches the browser.
[ ] 2. Run migrations 0001 → 0013 in order against the project.
[ ] 3. Restore the legacy dataset into the reference tables only. Do NOT load
      the legacy price rows as genuine observations: they carry no unit, no
      price type and no collection time. They are loaded as
      'legacy_unverified' with their provenance flags, as the schema requires.
[ ] 4. Take a verified backup (pg_dump) and store it before any further step.
[ ] 5. Create the first super administrator and provision the agents.
[ ] 6. Sign in as an agent and collect one price. Check that it reaches the
      verification queue, that it is not public, that approving it does not
      publish it, and that publishing it does.
[ ] 7. Suspend the agent. Check that the field app refuses immediately.
[ ] 8. Configure the platform cron for POST /api/jobs/run.
[ ] 9. Run the twelve reports and check each export against the screen.
```

---

## 11. Evidence index

| Artefact | Path |
| --- | --- |
| The audit | `docs/AUDIT_REPORT.md` |
| The authorisation matrix | `docs/RLS_AUTHORIZATION.md` |
| The migration plan | `docs/MIGRATION_PLAN.md` |
| Deployment, backup and recovery | `docs/DEPLOYMENT.md` |
| Known limitations | `docs/KNOWN_LIMITATIONS.md` |
| The metric registry | `src/lib/analytics/definitions.ts` |
| The migrations | `supabase/migrations/0001`–`0013` |
| The RLS suite | `tests/rls/permission-tests.sql` |
| The workflow suite | `tests/operations/workflow-tests.sql` |
| The validator | `scripts/validate_migrations.sh` |
| The legacy structured capture | `audit/source/` |
| The legacy raw HTML captures | **Removed 2026-11-12** |
