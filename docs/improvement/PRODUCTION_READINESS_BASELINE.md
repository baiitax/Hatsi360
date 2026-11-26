# Hatsi360 — Production Readiness Baseline (Phase 0)

| | |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360`, base `6cc044d` |
| Evidence | `source code`, `automated tests`, `local DB`, `deployed site` (GitHub Actions only — Vercel and the Supabase dashboard were unreachable) |

## 1. Release recommendation for this baseline

> **NOT_READY_FOR_PRODUCTION**

Not because the product is thin — it is not — but because the evidence needed to release it does not exist yet: the schema cannot be rebuilt, CI has never been green, and production state is unobservable from here. Each item below is a fact with a command or file behind it.

## 2. Gate status

| Gate | Command | Result | Classification |
|---|---|---|---|
| Type check | `npx tsc --noEmit` | **exit 0**, no diagnostics | pass |
| Lint | `npm run lint` | **45 errors, 171 warnings** | application (pre-existing) |
| Tests | `npx vitest run` | **999 pass / 42 fail / 40 skip** of 1081; 12 of 52 files red | 34 environment, 8 application |
| Migrations | `npm run verify:migrations` | fails: chain needs 5 workarounds; 6 tables without RLS | database |
| Build | `npm run build` | **not executable here** — `next/font` needs `fonts.googleapis.com` | environment |
| CI (default branch) | GitHub Actions run `45772656337` | `tsc` success → **ESLint failure** → test **skipped** → build **skipped** | application |

The last row matters most: **the production build has never been executed by CI.** Every run of the workflow in recent history stops at ESLint, so `npm run build` passing is not an established fact anywhere, and neither is the test suite in CI. Three runs on `main`, all `failure`:

| Run | Commit subject | Conclusion |
|---|---|---|
| `45772656337` | `feat(home): sunrise hero photograph… (#1)` | failure at ESLint |
| earlier | `fix: make navbar logo responsive` | failure |
| earlier | `feat(seo): Comprehensive metadata…` | failure |

## 3. Lint debt (45 errors)

| Rule / diagnostic | Count | Where |
|---|---|---|
| `react/no-unescaped-entities` | 16 | client trade pages, subscription, RFQ list, misc JSX copy |
| React Compiler: `setState` synchronously in effect | 12 | explorers, wizards, dashboard widgets |
| React Compiler: impure function during render | 10 | mixed |
| `react-hooks/rules-of-hooks` (**conditional `useCallback`**) | 2 | `src/components/charts/CandlestickChart.tsx:156`, `:181` |
| React Compiler: component created during render | 2 | mixed |
| React Compiler: value modified during render | 1 | `admin/intelligence/trade-intelligence/explorer/page.tsx:86` |
| React Compiler: variable used before declaration | 1 | — |
| React Compiler: refs read during render | 1 | — |

The 16 unescaped entities and the compiler diagnostics are stylistic or slow-path; the two `rules-of-hooks` errors are a **real defect**: `CandlestickChart` calls `useCallback` conditionally, so a prop change that flips the condition changes the hook order and React throws `Rendered fewer hooks than expected`. The chart is used on market detail pages. This is the one lint error with a plausible user-visible crash behind it, and it is scheduled as a Phase 2 fix rather than a lint cleanup.

CI runs lint with `--max-warnings 50`; the branch has 171 warnings, so even a warning-only cleanup cannot make CI green without touching the threshold. Errors fail regardless.

## 4. Test failures (42 of 1081)

Attribution matters more than the count. Running each area separately (`vitest run tests/<area>`) gives:

| Area | Result | Attribution |
|---|---|---|
| `entitlements` | 10 failed / 8 passed | **environment** — needs `SUPABASE_SERVICE_ROLE_KEY` against a live project |
| `phase-08a` | 12 failed / 78 passed / 12 skipped | **environment** — alerts/bulk/exports entitlement suites |
| `ux` | 7 failed / 25 passed | **application** — draft persistence, brand/hero strings |
| `design-system` | 4 failed / 18 passed | **application** — raw colour literals from the light-theme rewrite |
| `loading` | 3 failed / 26 passed | **application** — expects `/brand/hatsi360-mark-light.png` in `BRAND` |
| `brand` | 2 failed / 36 passed | **application** — hero artwork not in the supplied-artwork registry |
| `trade` | 1 failed / 232 passed | application — share-metadata wording (`collected by`) |
| `images` | 1 failed / 68 passed | application — hard-coded path |
| `admin` | 1 failed / 27 passed | application — asserts `/admin/coverage` exists (it does not) |
| `auth` | 1 failed / 49 passed | **environment** — demo agent cannot authenticate |
| everything else | all green | `field` 80, `data-integrity` 61, `quality` 39, `analytics` 48, `intelligence` 32, `api` 26 + 28 skipped, `forms` 24, `operations` 12, `security` 10, `reports` 9, `routing` 7, `formatting` 6 |

So: **34 of 42 failures are the absence of a hosted project**, and 8 are code-level regressions — five of them traceable to the light-theme/hero rewrite merged in PR #1 (brand registry, loading mark, design tokens, share metadata). Those are cheap, honest fixes and are in the backlog as `QA-02`.

No test was deleted, skipped or weakened to produce this table.

## 5. Deployability

| Question | Finding | Evidence |
|---|---|---|
| Is there a deployment pinned to `main`? | `gh api repos/baiitax/Hatsi360/deployments` → `[]` (no GitHub deployments recorded). Vercel's own history is not readable from here. | `deployed site` |
| Is there a `vercel.json`? | No. Defaults only: framework Next.js, build `next build`, output `.next`. | `source code` |
| Are build-time secrets available to Vercel? | `UNKNOWN` | — |
| Does the app fail closed without Supabase env vars? | `src/lib/supabase/config.ts` + `isAdminConfigured()` guard admin paths; the data layer falls back to a `fixture` DataSource with `kind: 'fixture'`, which the UI surfaces through `getProvenance()`. Fail-closed, but a fallback that renders fixture data is precisely the "never present archive data as live" risk that the product rules forbid — the fallback is labelled, and must stay labelled. | `source code` |
| Rollback path | Redeploy previous Vercel build: available in principle. **Database rollback does not exist**: there are no down-migrations in this repo, and `npm run db:reset` is destructive. | `source code` |
| Backups / PITR | `UNKNOWN` — Supabase project settings not reachable | — |

## 6. Configuration surface

17 variables are read by application code; 9 are documented in `.env.example`:

| Read in code | In `.env.example` | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | required |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | required |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | server-only |
| `NEXT_PUBLIC_SITE_URL` | yes | canonical URLs, metadata |
| `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` | yes | must be unset/`false` in production — **unverified** |
| `JOB_RUNNER_SECRET` | yes | bearer for `/api/jobs/run` |
| `NEXT_PUBLIC_LEGACY_HOSTS` / `NEXT_PUBLIC_PREVIEW_HOSTS` | yes | host normalisation / dev origins |
| `NEXT_PUBLIC_BASE_URL` | **no** | used in metadata helpers |
| `NOTIFICATION_EMAIL_PROVIDER` / `_API_KEY` | **no** | delivery adapters |
| `NOTIFICATION_SMS_PROVIDER` / `_API_KEY` | **no** | delivery adapters |
| `NOTIFICATION_WHATSAPP_PROVIDER` / `_TOKEN` | **no** | delivery adapters |
| `USDA_PSD_API_KEY` | **no** | intelligence ingestion |
| `VERCEL_URL` | **no** | provided by the platform automatically |

Gap `OPS-02`: `.env.example` omits 8 variables that the code reads, so a new environment cannot be provisioned from the repository alone. Low effort, real operational cost.

## 7. Scheduled jobs and background work

| Job | Idempotency | Writes |
|---|---|---|
| `generate_collection_tasks` | per `(name, scheduled slot)` | `collection_tasks`, `scheduled_job_runs` |
| `mark_overdue_tasks` | same | `collection_tasks`, `scheduled_job_runs` |
| `refresh_analytics_snapshot` | same | `analytics_snapshots`, `scheduled_job_runs` |
| `retry_notification_delivery` | same | `notification_deliveries`, `scheduled_job_runs` |
| `expire_exports` | same | `export_jobs`, `scheduled_job_runs` |

Runner: `POST /api/jobs/run`, bearer secret, `timingSafeEqual`, per-job result recorded. **No scheduler wiring exists in the repository** (no `vercel.json` cron, no external trigger config), so production scheduling is `UNKNOWN` and enabling it is on the stop-and-ask list. Nothing in the test suite exercises the runner against a database — `tests/operations` covers the workflow SQL, not the HTTP surface (`OPS-03`).

## 8. Observability

| Capability | State |
|---|---|
| Error tracking (Sentry/Rollbar) | **absent** — no dependency, no config |
| Structured logging | partial — `console.error` in `lib/api/*`, `lib/forms/actions.ts`, one ingestion adapter |
| Request IDs / correlation | absent |
| Health endpoint | absent (`/api/health` does not exist) |
| Job run history | present in `scheduled_job_runs` (if the table is reachable) |
| Database metrics / slow queries | `UNKNOWN` (Supabase dashboard not reachable) |

`OPS-04`: with no error tracking and no health endpoint, a production incident today would be discovered by a user report. For a price-intelligence product that publishes freshness labels, that is the weakest link in the operational story after the schema itself.

## 9. Data-integrity prerequisites before any public claim

The product promises that every displayed price is published, verified and fresh. Three facts must hold before that promise can be made in public, and none of them can be verified here:

1. Production `price_observations` contain no `DEMO`/`test_fixture` rows surfaced through the publication view (`S-4`).
2. `commodity_unit_conversions` in production reflects field-verified package weights — the repository's demo seeds claim "1 bag = 50 kg" with `is_verified = true` and cannot even apply (`MIG-06`), so no verified conversion for any commodity is version-controlled.
3. Each commodity's `freshness_window_hours` matches the collection cadence actually being met.

These become the Phase 1 data-integrity work: reconciliation report, commodity/unit/grade standard, publication rules.

## 10. Release checklist (what "ready" would require)

- [ ] Chain applies to an empty database with no workarounds (`MIG-01`–`MIG-07` fixed).
- [ ] RLS on every public table (`SEC-01`), entitlement enforced in the database (`SEC-02`).
- [ ] CI green end-to-end on `main`, including `npm run build`.
- [ ] 42 test failures resolved or explicitly quarantined with issue references — none deleted.
- [ ] Hosted migration state read and reconciled against the repository (`S-1`, `S-2`).
- [ ] Demo flag confirmed `false` in Vercel (`S-3`); demo rows confirmed absent from the publication view (`S-4`).
- [ ] Deployed commit confirmed equal to `main` (`S-5`).
- [ ] Error tracking + health endpoint in place (`OPS-04`).
- [ ] Rollback rehearsed: previous build redeployable, database backup/PITR confirmed.
- [ ] Owner approval for anything on the stop-and-ask list.

## 11. Honest summary

The repository contains a large, coherent, type-safe application with a genuinely good publication boundary, a real audit trail and a disciplined data vocabulary. It is not production-ready because its schema is not reproducible, its CI has never run its build, its RLS has holes, and none of the production facts that matter can be observed from the environment this audit ran in. All four are fixable, and three of them are fixable without any access to production.
