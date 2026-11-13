# Hatsi360

**Hatsi360** is the agricultural commodity price transparency and market intelligence platform
for **Pluck Agro**. It is the successor to the PHP site at `https://liveprice.pluckagro.com`,
rebuilt on Next.js (App Router) + TypeScript + Supabase, with an emphasis on three things the old
site never had: **honest data**, **real permissions**, and a **collection → verification →
publication** workflow that produces fresh, traceable prices.

> The platform never invents a price. Every published figure comes from an observation with a real
> collection time, a market, a unit, a currency, a price type and a source. Where data is missing,
> the interface says so.

---

## Status

| Area | State |
| --- | --- |
| Migrations | **15 files**, apply cleanly to PostgreSQL 18.4 — **51 tables, all with RLS, 97 policies, 2 views** |
| Tests | **296 Vitest tests** + **169 RLS statements** + **221 workflow statements**, all against a real database |
| Build | Next.js 16.4.2 — **62 route entries** (51 pages, 11 API routes), production build clean |
| Interfaces | One central login · a **Super Admin Control Centre** (16 modules) · a **phone-first Market Agent App** (7 screens) |
| Data | 28 migrated legacy observations (the live site's entire public price history) + a live collection path |
| Operations | 5 scheduled jobs, 12 reports with audited CSV exports, notifications, the quality engine, the audit trail |
| Not built yet | Evidence upload, external notification delivery, billing, forecasting, a geographic map — see `docs/KNOWN_LIMITATIONS.md` |

---

## Quick start

```bash
npm ci --legacy-peer-deps        # Node 22 LTS or newer
cp .env.example .env.local        # optional: without Supabase the app runs on the migrated dataset
npm run dev                      # http://localhost:3000
```

Without Supabase credentials the application serves the **migrated legacy dataset** and labels it
as such on every page that shows prices. That mode is read-only and exists so the whole product
can be reviewed without a database.

With Supabase configured:

```bash
npx supabase link --project-ref <ref>
npx supabase db push              # applies supabase/migrations/0001..0015
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: 296 tests across pricing, observations, data integrity, the API, analytics, quality rules, auth routing, navigation, reports, credentials and the user-experience suite |
| `npm run test:watch` | Vitest in watch mode |
| `bash scripts/validate_migrations.sh` | Applies every migration to a throwaway PostgreSQL 18.4, runs the seed smoke test, the 169 RLS statements, the 221 workflow statements, and checks that the suites left nothing behind |

---

## Folder structure

```
pluck-live/
├── audit/                        # the legacy capture — the proof of what was migrated
│   ├── legacy-pages/             #   46 raw HTML captures of the live site
│   └── source/                   #   extracted catalogue, price history and pair index
├── docs/
│   ├── AUDIT_REPORT.md           # every finding, classified by how it was verified
│   ├── MIGRATION_PLAN.md         # page-by-page mapping, legacy URLs, go-live sequence
│   ├── RLS_AUTHORIZATION.md      # the permission model, policy by policy
│   ├── DEPLOYMENT.md             # deploy, back up, restore, roll back
│   └── KNOWN_LIMITATIONS.md      # what this build cannot do, and why
├── public/
│   └── img/                      # brand imagery fetched from the live site
├── scripts/
│   ├── build_legacy_dataset.py   # deterministic reconstruction of the legacy dataset
│   ├── gen_seed_migration.py     # generates 0007_seed_reference_data.sql from the catalogue
│   ├── validate_migrations.sh    # runs the migration + permission suite on a real database
│   └── validate-migrations.mjs   # the runner behind it
├── src/
│   ├── app/                      # App Router — every route is a file
│   │   ├── api/v1/               #   the versioned read-only JSON API
│   │   ├── auth/callback/        #   Supabase auth callback
│   │   ├── (public pages)        #   /, /prices, /prices/[commodity], /commodities, …
│   │   ├── agent/                #   the field-collection console
│   │   ├── admin/                #   the verification and operations console
│   │   ├── dashboard/            #   the customer workspace
│   │   ├── globals.css           #   the Tailwind v4 design system (@theme tokens)
│   │   ├── layout.tsx            #   the site shell: topbar, header, footer, skip link
│   │   ├── not-found.tsx         #   a real 404
│   │   ├── robots.ts / sitemap.ts
│   ├── components/
│   │   ├── ui/                   #   design system: SectionHeading, EmptyState, PriceFigure, …
│   │   ├── site/                 #   SiteHeader, SiteFooter, SignOutButton
│   │   ├── data/                 #   PriceTable, PriceChart, Cards, DataCoverageNotice, …
│   │   ├── forms/                #   CentralSignInForm, ContactForm
│   │   ├── ops/                  #   the console primitives: DataTable, KpiCard, Charts, Primitives
│   │   ├── agent/                #   AgentShell, CollectionFlow, TaskControls
│   │   └── admin/                #   AdminShell, VerificationActions, AgentManagement, …
│   ├── lib/
│   │   ├── api/                  #   request envelope, auth, rate limiting
│   │   ├── analytics/            #   the metric registry, the snapshot, the computation, the comparison
│   │   ├── auth/                 #   session helpers, server actions, route guards, throttling
│   │   ├── content/              #   the migrated articles
│   │   ├── data/                 #   the DataSource interface: supabase | fixture
│   │   ├── forms/                #   server actions for the contact form
│   │   ├── jobs/                 #   the scheduled job runner and its definitions
│   │   ├── notifications/        #   the notification service and the external channel adapters
│   │   ├── operations/           #   the agent and admin read models, the server actions, the navigation
│   │   ├── quality/              #   the versioned quality rule engine
│   │   ├── reports/              #   the report registry, the role scoping, the CSV writer
│   │   ├── supabase/             #   browser / server / admin clients
│   │   ├── money.ts              #   NGN formatting
│   │   └── pricing.ts            #   aggregation, comparability, freshness
│   ├── data/
│   │   ├── legacy/               #   the reconstructed legacy observations
│   │   └── seed/                 #   the reference-data catalogue
│   └── types/domain.ts           #   the domain types
├── supabase/migrations/          # 0001 … 0015, applied in order
├── tests/
│   ├── pricing.test.ts           #   aggregation and comparability rules
│   ├── observations-validation.test.ts
│   ├── data-integrity.test.ts    #   the migration against the raw capture
│   ├── api-auth.test.ts
│   ├── api-routes.test.ts
│   ├── analytics/                #   the metric computation, the comparison, the day boundaries
│   ├── quality/rules.test.ts     #   every quality rule and its severity
│   ├── auth/routing.test.ts      #   role routing and the redirect allowlist
│   ├── operations/navigation.test.ts
│   ├── reports/reports.test.ts   #   the report builders and the CSV writer
│   ├── security/client-bundle.test.ts
│   ├── ux/experience.test.tsx    #   the field app under a dropped connection, the a11y of the controls
│   ├── rls/permission-tests.sql  #   169 statements against a real PostgreSQL instance
│   └── operations/workflow-tests.sql  #   221 statements: the whole operating chain
├── .env.example
└── next.config.ts                # security headers + the legacy URL redirects
```

---

## How the platform is put together

### The data layer

Every page, API route and server action talks to a `DataSource` interface
(`src/lib/data/source.ts`) with two implementations:

* `supabase` — the production backend: PostgreSQL with Row Level Security.
* `fixture` — the migrated legacy dataset, read from
  `src/data/legacy/production-observations.json`, used when no database is configured.

Both return the same shapes, so the interface cannot tell them apart — and the question "is this
live or migrated?" is answered by an explicit `source` flag that the UI surfaces, not by a
divergence in behaviour.

### The money and the units

* Every monetary column is `numeric(18,4)`. No floating point is stored.
* `reported_amount` / `reported_unit_id` hold exactly what the agent wrote down.
  `normalized_amount` / `normalized_unit_id` hold the value in a canonical unit and stay `NULL`
  when the conversion is unknown — a missing conversion is never papered over.
* The `bag` unit has no base factor, because bag weights differ by commodity. Bags are never
  silently converted to kilograms.
* Comparisons are bucketed by (commodity, grade, price type, unit). Incompatible buckets are
  warned about, never merged.

### The publication model

```
collection ──► draft ──► pending_verification ──► verified ──► published
                                    │                                  │
                                    └──► rejected          correction_requested
```

* An agent may submit only for a market they are assigned to, only as themselves, and only as
  `draft` or `pending_verification`. They cannot publish.
* A published observation's economic fields are **immutable** — for administrators too.
* A correction calls `public.append_correction()`, which writes a superseding row, marks the
  original `is_current = false`, and records both a revision-history snapshot and a verification
  event. Nothing is ever silently overwritten.
* Public reads are exactly: `is_current and published_at is not null and verification_status in
  ('verified', 'legacy_unverified')`.

### The permission model

Three layers, and the database is the authority:

1. **Server** — `src/lib/auth/guards.ts` (`requireUser`, `requireStaff`, `requireAdmin`).
2. **API** — bearer/X-API-Key authentication, scope checks, per-application rate limits.
3. **Database** — 74 RLS policies across 39 tables, plus triggers for the rules a row policy
   cannot express (immutability of published prices, role escalation, last-admin protection).

`docs/RLS_AUTHORIZATION.md` has the full policy map and the reasoning.

---

## Routes

### Public

| Route | Purpose |
| --- | --- |
| `/` | Homepage: carousel, market comparison, about, services, latest prices, features, benefits, commodities, markets, insights, FAQ |
| `/prices` | Price directory with filters and pagination |
| `/prices/[commodity]` | The price view for one commodity (accepts the legacy numeric id too) |
| `/commodities` · `/commodities/[slug]` | Catalogue and catalogue entry |
| `/markets` · `/markets/[slug]` | Market directory and market detail |
| `/compare` | Cross-market comparison |
| `/insights` · `/insights/[slug]` | The migrated articles |
| `/pricing` · `/contact` · `/about` · `/faq` · `/privacy` · `/terms` · `/disclaimer` | Commercial and legal pages |
| `/api-docs` | The API reference, with examples taken from live responses |
| `/login` · `/register` · `/forgot-password` · `/reset-password` | Authentication |
| `/dashboard` | Customer workspace (saved items, alerts, subscription, API keys) |
| `/sitemap.xml` · `/robots.txt` | Real machine-readable files |

### Super Admin Control Centre

One login serves every role. The console shows only the modules that are implemented and that the
signed-in role may open.

| Route | Purpose |
| --- | --- |
| `/admin/overview` | Twelve KPIs with definitions and a prior-period comparison, the operations feed, the collection trend, market coverage and the priority action queue |
| `/admin/verification` | Approve, request a correction, reject and publish — four separate, audited acts |
| `/admin/observations` | The observation directory: server-side filtering, sorting and pagination |
| `/admin/quality` | Quality flags with the rule and the rule version that raised them |
| `/admin/tasks` | Collection tasks, by status and overdue |
| `/admin/agents` | Provision an agent, set the account status, assign markets |
| `/admin/markets` | The market directory, coverage and last collection |
| `/admin/schedule` | The collection plan and the task generator |
| `/admin/analytics` | The analytics centre: productivity, coverage, commodity and data quality |
| `/admin/reports` | Twelve reports, each exported as an audited, expiring CSV |
| `/admin/notifications` | The reader's own inbox |
| `/admin/audit` | The append-only audit trail |
| `/admin/settings` | Business, collection, verification, security and integration settings |
| `/admin/system` | The job definitions, the run history, and run-now |
| `/admin/search` | Agents, markets, commodities and observations from one box |

### Market Agent App

Phone-first, low bandwidth, minimal typing. The bottom navigation has four items.

| Route | Purpose |
| --- | --- |
| `/agent/home` | Today's tasks, assigned markets, corrections waiting |
| `/agent/collect` | The six-step guided collection: market → commodity → price type and unit → amount → when and note → check and send. Batch repeat collection, drafts, and an offline queue that retries with the same idempotency key |
| `/agent/tasks` | Start, complete, or cancel with a reason |
| `/agent/submissions` | Every price with its review state and the reviewer's feedback |
| `/agent/notifications` | The agent's private inbox |
| `/agent/profile` | Account, markets, channel status, sign out |

### API

`GET /api/v1/commodities` · `/markets` · `/prices/latest` · `/prices/history` ·
`/prices/compare` · `/insights`

The operational endpoints are server-side only: `POST /api/agent/submit` (idempotent),
`POST /api/notifications/read`, `POST /api/auth/signout`, and `POST /api/jobs/run`, which
requires the `JOB_RUNNER_SECRET` and refuses every other caller.

Uniform envelope, Zod-validated parameters, `X-RateLimit-*` headers, SHA-256 hashed keys:

```bash
curl 'https://<host>/api/v1/prices/latest?commodity=paddy-rice' \
  -H 'Authorization: Bearer <api-key>'
```

---

## Principles this codebase follows

1. **Never fabricate.** No price, no forecast, no fallback value. Missing data renders an honest
   empty state.
2. **Published means published.** A number without a timestamp, a market, a unit, a price type and
   a source is not published.
3. **Hide nothing by omission.** Errors are logged with context, never secrets.
4. **The database decides.** Hiding a button is not authorization.
5. **Append, never overwrite.** Corrections are new rows with a history.
6. **The legacy site's history is preserved.** Even where it is wrong, it is kept, flagged and
   labelled — never quietly rewritten.

---

## Documentation

| Document | What it answers |
| --- | --- |
| [`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md) | What was found in the legacy site and in this rebuild, and how each finding was verified |
| [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md) | How every legacy page maps to a new page, and the go-live sequence |
| [`docs/RLS_AUTHORIZATION.md`](docs/RLS_AUTHORIZATION.md) | Who may see and change what, and why |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | How to deploy, back up, restore and roll back |
| [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) | What this build cannot do yet |
| [`docs/BUILD_REPORT.md`](docs/BUILD_REPORT.md) | The phase-by-phase build report: what was implemented, which tests passed, what remains and the evidence |
