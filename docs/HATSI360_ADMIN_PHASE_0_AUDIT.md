# Hatsi360 Admin Portal — Phase Zero Audit

**Phase 1 of the Enterprise Admin Transformation**
Status: audit complete; no application code changed by this phase
Date: 12 November 2026

---

## 1. What this audit covered

The existing Hatsi360 Control Centre (`/admin/*`), its data layer, the
PostgreSQL schema behind it, and the gap between what is built and what the
transformation brief asks for.

Everything below was established by reading the repository and the migration
files. Where a claim could not be established from source, it is marked
**UNKNOWN** rather than assumed.

---

## 2. Headline finding

**The admin portal is not a prototype.** This is the single most important
conclusion of the audit, because it changes what the transformation is.

The brief anticipates a portal that may be "UI only", "broken" or "duplicate".
In fact the Control Centre already has:

- 25 implemented routes, none of them stubs or placeholder pages;
- a role-scoped navigation shell with live badge counters;
- a server guard on the console root that refuses non-staff before any module
  renders;
- a 1,653-line analytics layer with declared metric definitions;
- 18 server actions covering approval, correction, rejection, publication,
  quality flags, agent provisioning, assignments, task generation, settings
  and exports;
- 50 database functions behind those actions.

So the work is **not a rebuild**. It is: fill genuine gaps, remove the few
places where the interface and the schema disagree, and raise the quality of
the decision-making surfaces.

---

## 3. Route inventory

### 3.1 Existing routes and their state

| Route | Lines | Data source | Classification |
| --- | --- | --- | --- |
| `/admin` | 11 | — | Redirect/shell entry |
| `/admin/overview` | 313 | `analytics/queries`, `analytics/metrics`, `analytics/definitions` | VERIFIED IN CODE |
| `/admin/operations` | 127 | `analytics/queries` | VERIFIED IN CODE |
| `/admin/search` | 183 | `operations/admin` | VERIFIED IN CODE |
| `/admin/verification` | 225 | direct Supabase, 5 queries | VERIFIED IN CODE |
| `/admin/observations` | 246 | `operations/admin` | VERIFIED IN CODE |
| `/admin/quality` | 165 | `operations/admin`, `quality/rules` | VERIFIED IN CODE |
| `/admin/tasks` | 161 | `operations/admin` | VERIFIED IN CODE |
| `/admin/agents` | 187 | `operations/admin` | VERIFIED IN CODE |
| `/admin/markets` | 150 | `operations/admin` | VERIFIED IN CODE |
| `/admin/schedule` | 111 | `operations/admin` | VERIFIED IN CODE |
| `/admin/assignments` | 80 | `operations/admin` | VERIFIED IN CODE |
| `/admin/commodities` | 147 | `lib/data` (Supabase or legacy fixture) | VERIFIED IN CODE |
| `/admin/categories` | 103 | `lib/data` | VERIFIED IN CODE |
| `/admin/grades` | 78 | `operations/admin` | VERIFIED IN CODE |
| `/admin/units` | 100 | `operations/admin` | VERIFIED IN CODE |
| `/admin/zones` | 75 | `operations/admin` | VERIFIED IN CODE |
| `/admin/analytics` | 281 | `analytics/*` | VERIFIED IN CODE |
| `/admin/reports` | 141 | `reports`, `operations/admin` | VERIFIED IN CODE |
| `/admin/exports` | 87 | `operations/admin` | VERIFIED IN CODE |
| `/admin/notifications` | 87 | `notifications` | VERIFIED IN CODE |
| `/admin/audit` | 166 | `operations/admin` | VERIFIED IN CODE |
| `/admin/settings` | 170 | `operations/admin` | VERIFIED IN CODE |
| `/admin/system` | 126 | `jobs` | VERIFIED IN CODE |
| `/admin/profile` | 82 | `brand` | VERIFIED IN CODE |

"VERIFIED IN CODE" means the route exists, reads a real data source and
renders it. **No route has been verified in a browser** — see §8.

### 3.2 The data-source question

A grep for direct `from('…')` calls finds them in only one admin page
(`verification`). That is not a sign the others are fake: they read through
`src/lib/operations/admin.ts`, `src/lib/analytics/*` and `src/lib/data`.

`src/lib/data` deserves a note. It resolves to `supabaseSource` when Supabase
is configured and `fixtureSource` — the migrated legacy dataset — when it is
not. That is a deliberate fallback so the application runs without a database,
not fabricated data. The `/admin/commodities` and `/admin/categories` pages
read through it, which means **in a no-database deployment those two screens
show the legacy fixture rather than live rows.** That is correct behaviour and
is labelled in the interface, but it is worth knowing when testing.

---

## 4. Navigation architecture

The console uses five groups in `src/lib/operations/navigation.ts`:

| Group | Entries |
| --- | --- |
| Control | Overview, Live operations, Search |
| Operations | Verification queue, Observation directory, Data quality, Collection tasks, Agents, Markets, Collection planner, Agent assignments |
| Catalogue | Commodities, Commodity categories, Grades, Units, Market zones |
| Intelligence | Analytics, Reports, Exports |
| System | Notifications, Audit trail, Settings, Jobs & system health, Profile |

Two rules are already enforced in code and should be preserved:

1. **Only implemented modules are listed.** There is no "coming soon" entry.
2. **Only modules the role may open are listed for that role.**

Three badge counters are live: pending verification, open tasks and
unresolved quality flags. They are counted in the layout with three
`head: true` count queries on every request.

The shell (`src/components/admin/AdminShell.tsx`, 236 lines) already
implements a collapsible desktop sidebar, a mobile drawer that closes on route
change, and `lg:` breakpoints. **Responsive behaviour is largely built.**

---

## 5. Database audit

55 tables, 110 RLS policies, 50 public functions across 22 migrations.

### 5.1 Functions that already exist

This matters because it means most of the brief's workflow requirements have
a server-side implementation already:

`approve_observation`, `reject_observation`, `request_correction`,
`publish_observation`, `resubmit_observation`, `submit_observation`,
`provision_agent`, `set_market_assignment`, `set_account_status`,
`set_user_role`, `generate_collection_tasks`, `transition_task`,
`mark_overdue_tasks`, `raise_quality_flag`, `resolve_quality_flag`,
`apply_observation_findings`, `audit_observation_change`, `write_audit`,
`record_login_attempt`, `count_login_attempts`, `clear_login_attempts`,
`create_export_job`, `complete_export_job`, `refresh_analytics_snapshot`,
`user_entitlements`, `has_entitlement`, `api_application_entitlements`,
`log_entitlement_change`, `prevent_role_escalation`,
`prevent_published_economic_mutation`, `is_public_observation`.

### 5.2 The gap: 27 tables have no administrative surface

These tables exist, are migrated and carry RLS, but **no admin page reads
them**:

| Table | Brief section that asks for it |
| --- | --- |
| `organizations`, `organization_members` | §14 Customer management |
| `customer_subscriptions` | §14.2 Subscription management |
| `entitlement_catalog`, `entitlement_tiers`, `billing_events` | §14.2 Entitlements |
| `api_applications`, `api_usage_logs` | §14.3 API management |
| `articles`, `article_categories` | Content (not in brief) |
| `contact_enquiries` | §18 support |
| `auth_login_attempts` | §17.1 Security monitoring |
| `scheduled_job_runs` | §17.1 Job execution history |
| `notification_delivery_logs`, `alert_delivery_logs` | §15 Alert delivery |
| `analytics_snapshots` | §12.5 Data freshness |
| `data_quality_rule_versions` | §8.1 Configurable rules |
| `commodity_synonyms`, `commodity_unit_conversions` | §11.3 Unit conversion |
| `market_operating_schedules`, `market_reports` | §10 Market detail |
| `countries`, `account_status_events` | Reference / account history |
| `price_alerts`, `report_subscriptions`, `saved_commodities`, `saved_markets` | Customer-facing, correctly no admin surface |

**This is the largest genuine gap in the portal**, and it is the clearest
place where the brief asks for something the schema already supports but the
interface does not reach.

### 5.3 Where the brief asks for routes that already exist as filters

`/admin/verification` already filters by `submitted`, `verified`, `rejected`,
`correction_requested` and `published`. The brief asks for
`/admin/verification/pending`, `/corrections`, `/approved` and `/rejected` as
separate routes. **Those would be duplicates of existing filtered views.** The
brief itself says to adapt to existing routes; creating four more routes that
render the same component with a different constant would violate the
standing instruction against duplicate functionality. The recommendation is to
keep the filtered queue and make the filters more prominent.

---

## 6. Security assessment

Established from source:

- The console root calls `requireStaff('/admin/overview')` before rendering
  anything, and redirects to `/dashboard?error=forbidden` when a role resolves
  to no navigation at all.
- Each module re-checks the role it needs rather than trusting the shell.
- `prevent_role_escalation` and `prevent_published_economic_mutation` exist as
  database triggers.
- The navigation is explicitly documented as a convenience, not the control.

**Not verified:** that every individual mutation re-cheocks its permission on
the server, and that RLS denies cross-role reads on every table. The RLS suite
(`tests/rls/`) covers 169 assertions and passes, which is strong evidence, but
a full role-by-role browser matrix has not been run. See §8.

---

## 7. UI/UX assessment

**Already good:**

- Design tokens are centralised in `src/app/globals.css` and the design-system
  test suite enforces that only defined colour utilities are used.
- `tests/design-system/design-system.test.ts` asserts the Field App keeps admin
  navigation out and the Control Centre keeps its dark-green navigation.
- The shell is responsive with a mobile drawer.

**Genuine weaknesses:**

1. **No `error.tsx` and no per-route `loading.tsx`.** There is one
   `src/app/admin/loading.tsx`. A failing query in one module shows the
   console-level skeleton, not a module-specific error with a recovery path.
2. **No agent detail route.** `/admin/agents/[id]` does not exist, so an
   administrator cannot open one agent's history, submissions or verification
   outcomes — §9.2 of the brief.
3. **No commercial module at all.** §14 is entirely unbuilt despite the schema.
4. **System health shows jobs only.** §17.1 asks for login attempts, delivery
   logs and storage signals; the page renders `scheduled_job_runs` and nothing
   else.
5. **Metric-card discipline is unverified.** The brief is emphatic about
   restraint (§23.2). Whether `/admin/overview` shows ten-plus cards was not
   measured in this audit.

---

## 8. What has NOT been verified

Stated plainly, because the brief requires it:

- **No admin route has been opened in a browser.** Everything above is
  VERIFIED IN CODE or VERIFIED IN DATABASE, never VERIFIED IN UI.
- **No authenticated journey has been run against a live Supabase instance.**
  No connected project has been repurposed and no migration has been applied
  to staging.
- **No responsive measurement** at 320/360/375/390/430 px, tablet or desktop.
- **No performance measurement.** No Lighthouse run, no LCP/INP/CLS, no query
  timings. There is no browser-based measurement tooling in this environment,
  so any such number would be invented.
- **No Playwright suite** for the admin journey.
- **`npm run lint` is broken** in this project: it invokes `next lint`, removed
  in Next 16. TypeScript, Vitest and `next build` are the working gates.

---

## 9. Prioritised roadmap

Ordered by operational value per unit of risk, not by the brief's section
order.

### Priority 1 — Close the schema/interface gap

Build the commercial and system surfaces that already have tables and
functions behind them. Nothing here needs a migration.

- `/admin/customers` — organizations and subscriptions
- `/admin/api-management` — applications, keys, usage
- Enrich `/admin/system` — login attempts, delivery logs, job history

### Priority 2 — The agent detail workspace

`/admin/agents/[id]`: profile, assignments, collection history, submission
history, verification outcomes, activity timeline. This is the single most
used screen in an operations console and it does not exist.

### Priority 3 — Error and loading boundaries

Per-route `error.tsx` with a recovery action, and module-level `loading.tsx`
where the current console-level skeleton is wrong.

### Priority 4 — Verification workspace depth

The queue exists. What is missing is the review screen described in §7.2:
submitted values beside historical prices, evidence, and the decision actions
with mandatory reasons. Confirm whether the current detail view already does
this before building anything.

### Priority 5 — Navigation refinement

Only after the above: consider whether the five groups should become the
brief's ten. **Recommendation: no.** The existing grouping is sound, the brief
asks for grouped collapsible navigation rather than ten flat sections, and
splitting Operations into three groups would make the console harder to scan,
not easier.

---

## 10. Recommendation on scope

The brief describes an eight-phase programme. Phases 1 (this audit) and 2
(admin foundation and design system) are **already substantially complete** —
the shell, tokens, table and filter patterns, and role-scoped navigation all
exist and are tested.

The honest reading of the audit is that the portal needs roughly **three
concentrated pieces of work**, not a rebuild:

1. the commercial/API/system surfaces the schema already supports;
2. the agent detail workspace;
3. error boundaries and the verification review depth.

Everything else in the brief is either built, or is a duplicate of something
already filtered.

---

## 11. Classification summary

| Capability | Classification |
| --- | --- |
| Admin route inventory and navigation | VERIFIED IN CODE |
| Role-scoped navigation with live badges | VERIFIED IN CODE |
| Staff guard on the console root | VERIFIED IN CODE |
| Analytics layer and metric definitions | VERIFIED IN CODE |
| Verification queue with status filters | VERIFIED IN CODE |
| Approval / correction / rejection / publication actions | VERIFIED IN DATABASE |
| Agent provisioning, assignment, role and status functions | VERIFIED IN DATABASE |
| RLS coverage (169 assertions) | VERIFIED IN DATABASE |
| Responsive shell with mobile drawer | VERIFIED IN CODE |
| Design token discipline | VERIFIED IN CODE (design-system suite) |
| Any admin screen in a browser | UNKNOWN — not performed |
| Authenticated admin journey on a live database | UNKNOWN — not performed |
| Responsive measurement at 320–430 px | UNKNOWN — not performed |
| Performance measurement | UNKNOWN — not performed |
| Commercial / customer management | PLANNED — schema exists, no interface |
| API management | PLANNED — schema exists, no interface |
| Agent detail workspace | PLANNED — route absent |
| Per-route error boundaries | PLANNED — absent |
| Full role-by-role security matrix | PLANNED — RLS suite passes, browser matrix not run |
