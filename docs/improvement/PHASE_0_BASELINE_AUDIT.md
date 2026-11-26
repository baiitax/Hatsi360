# Hatsi360 — Phase 0 Baseline Audit

| | |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Base commit | `6cc044dc52796252ef754ee8f137520181a4afaf` (`main`, after PR #1) |
| Scope | Read-only audit of the repository, the migration chain, the test suite and the security surface. No production system was touched. |
| Verdict | **NOT_READY_FOR_PRODUCTION** (see §8) |

## 0. Evidence classes

Every claim in this document and its five companions carries one of these labels. Anything that could not be observed is labelled `UNKNOWN` and is *not* inferred.

| Label | Meaning here |
|---|---|
| `source code` | Read directly from the checked-out repository at the commit above |
| `automated tests` | Produced by `vitest run` on this machine, this commit |
| `local DB` | Produced by applying `supabase/migrations/*.sql` to a throwaway PostgreSQL 19 instance created for this audit |
| `hosted Supabase` | The project `umxzsdepbrenqysabtlt` — **unreachable from this environment**; every such claim is `UNKNOWN` |
| `deployed site` | The Vercel deployment — **not inspected**; every such claim is `UNKNOWN` |
| `physical device` | None performed |
| `documented-only` | Asserted by a file under `docs/` and not reproducible here |

## 1. What was inspected

| Surface | Count | Evidence |
|---|---|---|
| App Router pages (`page.tsx`) | **116** — site 34, client 17, admin 40, agent 19, intelligence 2, root/standalone 4 | `source code` |
| Route handlers (`route.ts`) | **28** | `source code` |
| `"use server"` action modules | **5** | `source code` |
| React components | **101** (`.tsx`) | `source code` |
| `src/lib` modules | **82** (`.ts`) | `source code` |
| SQL migrations | **50** files, numbered `0001`–`0049` | `source code` |
| Test files | **52** | `source code` |
| Test cases | **1081** | `automated tests` |

Runtime baseline: Next.js 16.4.2 (App Router, Turbopack), React 19.3.1, `@supabase/supabase-js` 2.118.0, `@supabase/ssr` 0.12.7, Zod 4.6.7, Tailwind 4.3.3, Vitest 5.0.5, Recharts 3.10.1, Playwright 1.65.0 (declared, no browser in this environment).

## 2. Gate results (this commit, this machine)

| Gate | Command | Result | Classification |
|---|---|---|---|
| Type safety | `npx tsc --noEmit` | **PASS** (exit 0, no output) | — |
| Lint | `npm run lint` | **FAIL** — 45 errors, 171 warnings | application defect (pre-existing) |
| Unit/integration tests | `npx vitest run` | **FAIL** — 999 pass / 42 fail / 40 skip of 1081, 12 of 52 files failing | mixed: 34 environment, 8 application |
| Migrations from scratch | `npm run verify:migrations` | **FAIL** — chain only completes with 5 harness workarounds; final assertion finds 6 tables without RLS | database defect |
| Production build | `npm run build` | **BLOCKED** — `next/font` cannot reach `fonts.googleapis.com` from this sandbox | environment |

Exact numbers are reproduced in `.evidence/phase-0-gates.json`. Full command output is not committed (it is large and machine-specific); every figure quoted in these documents was copied from that run.

### 2.1 Why the build is BLOCKED and not FAILED

```
Error: next/font: error:
Failed to fetch Manrope from Google Fonts.
If you are offline or behind a proxy, self-host the font with next/font/local,
or set HTTP_PROXY/HTTPS_PROXY so Next.js can reach fonts.googleapis.com.
```

This sandbox can reach `github.com`, `registry.npmjs.org` and `pypi.org` only. `src/app/layout.tsx` uses `next/font/google` for Inter and Manrope, so the build aborts before any route compiles. This is an **environment** limitation, not an application defect: the same build runs in CI and on Vercel, both of which have outbound access. It does mean *route-level compilation of this branch is unproven here*; only `tsc` proves type-level correctness.

## 3. Headline findings

Ordered by consequence, not by effort. Identifiers (`MIG-nn`, `SEC-nn`, `QA-nn`, `OPS-nn`, `FEAT-nn`) are stable across all Phase 0 documents and the backlog.

| ID | Finding | Severity | Evidence |
|---|---|---|---|
| `MIG-01`…`MIG-07` | The migration chain **cannot be applied to an empty database**. Seven independent defects; three migrations cannot parse at all and therefore cannot ever have been applied anywhere. | P0 | `local DB` |
| `SEC-01` | Six public tables (`commodity_demand`, `commodity_production`, `commodity_supply`, `commodity_trade`, `evidence_sources`, `source_sync_events`) have **no Row Level Security**, while being readable by every authenticated user. | P0 | `local DB` |
| `SEC-02` | `0042_enforce_watchlist_entitlement.sql` declares the same policy name four times, so it cannot apply. The watchlist entitlement (a paid feature) is therefore **not enforced at the database level** by the migration chain. | P1 | `local DB` |
| `MIG-07` | `0047_stage4_rfq_orders.sql` uses `CREATE TYPE IF NOT EXISTS` (not valid PostgreSQL), so the stage-4 trade schema — `supplier_profiles`, `rfqs`, `quotes`, `orders` — has **no migration that can create it**, while `/client/trade/rfqs`, `/client/trade/orders` query those tables directly. | P1 | `local DB` + `source code` |
| `QA-01` | 34 of the 42 test failures need a live Supabase project (`SUPABASE_SERVICE_ROLE_KEY`), which this environment does not have — the entitlement suites cannot be evaluated here at all. | P1 | `automated tests` |
| `QA-02` | 8 test failures are application defects, 5 of them introduced by the light-theme/hero rewrite merged in PR #1 (brand artwork registry, loading mark path, design-token drift, share metadata wording). | P2 | `automated tests` |
| `QA-03` | `tests/rls/permission-tests.sql` — 1093 lines of RLS assertions — is executed **only** by `scripts/validate-migrations.mjs`, after the RLS assertion that currently fails. RLS is therefore not exercised by `npm test` at all. | P2 | `source code` |
| `FEAT-01` | `/admin/coverage` is linked from the admin navigation (`src/lib/operations/navigation.ts:105`) and allowed in `src/lib/auth/routing.ts`, but no page exists — a dead sidebar link. | P2 | `source code` + `automated tests` |
| `OPS-01` | CI on `main` has never been green: the ESLint job fails before type-check/test/build run. | P1 | `deployed site` (GitHub Actions) |

## 4. What is demonstrably good

Recorded because Phase 1 must not regress it.

- **Publication boundary is real.** `published_price_observations` is `security_invoker` and filters `is_current AND published_at IS NOT NULL AND verification_status IN ('verified','legacy_unverified')`; the five-argument `is_public_observation` excludes the `test_fixture` source. Public reads go through the view, not the table (`source code`).
- **Corrections are append-only at the database level**, enforced by trigger, not by application code (`local DB`).
- **Jobs are idempotent** by `(job name, scheduled slot)` and record every run in `scheduled_job_runs`; the runner authenticates with a bearer secret compared with `timingSafeEqual` (`source code`).
- **Service-role key is confined to two server modules** (`src/lib/supabase/admin.ts`, `src/lib/auth/emails.ts`); no `NEXT_PUBLIC_*` variant exists (`source code`).
- **Security headers** are set globally: `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` in production builds, `Permissions-Policy`, HSTS with preload (`source code`).
- **Demo accounts are env-gated** on `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true'` — but the value in Vercel is `UNKNOWN` from here.
- **Freshness is a first-class concept**: `current | aging | stale | no_data` derived from each commodity's `freshness_window_hours`, and `src/lib/trade/candles.ts` refuses to fabricate intraday bars.

## 5. What could not be established (and will not be guessed)

| Question | Status | Why |
|---|---|---|
| Which migrations are applied to the hosted project | `UNKNOWN` | `*.supabase.co` is unreachable (TLS handshake refused); no `psql`, no Supabase CLI session |
| Row counts for `price_observations`, `profiles`, `businesses` | `UNKNOWN` | same |
| Whether `0049_whatsapp_subscribers` exists in production | `UNKNOWN` | same — matters because the homepage form writes to it |
| Whether the deployed site matches `main` | `UNKNOWN` | `gh api .../deployments` returns `[]`; no Vercel token in this environment |
| `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` in Vercel | `UNKNOWN` | no access to Vercel env vars |
| Whether demo observations reached production | `UNKNOWN` | depends on `0046`–`0048`, which cannot apply as written |
| Email / SMS / WhatsApp delivery providers | `UNKNOWN` | adapter interfaces exist; credentials are not in the repo and not in this environment |
| Physical-device behaviour | `NOT PERFORMED` | no device; no browser in this sandbox |

The historical figures in `docs/` (for example "259 observations", "31 applied migrations") are `documented-only` and are **not** used as evidence anywhere in these documents.

## 6. Method

1. Static inventory of routes, modules, migrations, tests (`source code`).
2. Gate execution on this commit: `tsc`, `lint`, `vitest`, `verify:migrations`, `build`.
3. Database evidence by applying **every migration in order** to a disposable PostgreSQL 19 cluster created for this audit, with Supabase's `auth`/`storage` schemas and roles stubbed exactly as the platform provides them, then querying `pg_class`, `pg_policies` and the migration ledger.
4. Per-area test execution (`vitest run tests/<area>`) to attribute pass/fail to a feature rather than to the suite as a whole.
5. Nothing was created, altered or deleted in any hosted system. No credential was read or used.

## 7. Harness workarounds (disclosed)

`scripts/validate-migrations.mjs` is a validation harness, not production code. To reach the end of the chain and measure the schema, five **harness-only** workarounds were added, each with an in-file comment naming the defect it works around:

| Workaround | Defect | Effect on the measurement |
|---|---|---|
| Create `public._hatsi_migrations` up front | `MIG-01` | none on later schema |
| Seed two stub accounts (`…f9b2d2f7`, `…dcc7c070`) after `0006` | `MIG-02` | adds 2 `profiles` rows, marked `@stub.invalid` |
| Cast `array[]` to `text[]` in `0034` | `MIG-03` | value-preserving |
| Create 25 inactive placeholder commodities before `0038` | `MIG-04` | makes `commodities` 47 instead of 22 — the harness's own seed assertion would fail on this, which is why the run stops earlier |
| Skip `0042`, `0046_demo_seed_core`, `0047_demo_seed_operations`, `0047_stage4_rfq_orders`, `0048_demo_seed_cleanup` | `MIG-05`–`MIG-07` | those objects are absent from the measured schema |

**These workarounds are a measurement instrument, not a fix.** Phase 1 removes them by repairing the migrations themselves (see `PHASE_1_AND_2_BACKLOG.md`, P1-A).

## 8. Release recommendation

> **NOT_READY_FOR_PRODUCTION**

Reasons, in order of weight:

1. A database that cannot be rebuilt from its own migrations cannot be staged, rolled back or audited. Three migrations cannot parse; two depend on rows that no migration creates. (`MIG-01`–`MIG-07`)
2. Six tables that any authenticated user can read have no RLS. (`SEC-01`)
3. A paid entitlement is enforced only in application code, because the migration that enforces it cannot apply. (`SEC-02`)
4. The stage-4 trade feature ships UI that queries tables no migration can create. (`MIG-07`)
5. The default branch's CI has never been green, so "the tests pass" is not currently a usable signal. (`OPS-01`)
6. Production state — data, migrations, deployment, demo flag — is entirely `UNKNOWN` from this environment and must be established before any release claim.

What *is* ready: the publication/verification model, the jobs runner, the service-role boundary and the type-level state of the codebase (`tsc` clean). Phase 1 starts from those.

## 9. Companion documents

| Document | Contents |
|---|---|
| `FEATURE_IMPLEMENTATION_MATRIX.md` | 24 features, one status each, with routes, modules, DB dependencies, tests and defects |
| `DATABASE_AND_MIGRATION_AUDIT.md` | The chain, `MIG-01`–`MIG-07` with reproductions, object inventory, duplicate numbering |
| `SECURITY_BASELINE.md` | RLS coverage, entitlement enforcement, service-role boundary, headers, secrets, API surface |
| `PRODUCTION_READINESS_BASELINE.md` | Gates, CI, deployability, jobs, monitoring, rollback |
| `PHASE_1_AND_2_BACKLOG.md` | Every item above turned into an executable, prioritised task |
