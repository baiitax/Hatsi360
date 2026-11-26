# Hatsi360 — Security Baseline (Phase 0)

| | |
|---|---|
| Date | 2026-11-26 |
| Evidence | `source code`, `local DB`, `automated tests`. Nothing here was tested against the hosted project; those cells are `UNKNOWN`. |
| Method | Executed migration chain on a disposable instance (83 tables / 77 with RLS / 166 policies), static review of every server module that touches a privileged key, and the security-related test suites. |

**Scope note.** This is a baseline, not a penetration test. No request was sent to any deployed host, no credential was exercised, and no account was created, modified or removed.

## 1. Summary

| Area | State | Severity of the gap |
|---|---|---|
| RLS coverage | 77 of 83 public tables have RLS; **6 do not** | P0 |
| Paid-entitlement enforcement in the database | Watchlists: **absent** (migration cannot apply) | P1 |
| Privileged-key containment | Sound — `service_role` used in 2 server-only modules | — |
| Secret hygiene | Sound — no key material in tracked files | — |
| Transport/browser headers | Good, **no CSP** | P2 |
| API surface authentication | Present (hashed keys, scopes, per-key limits) | P2 (in-process limiter) |
| Demo-account exposure | Gated in code; production flag `UNKNOWN` | P1 (unverified) |
| Audit trail | Append-only at database level; corrections cannot overwrite economic values | — |
| Notification/delivery providers | Adapter interfaces only; credentials not in repo; delivery `UNKNOWN` | UNKNOWN |

## 2. SEC-01 — six tables have no Row Level Security

```
FAILED: tables without RLS: commodity_demand, commodity_production,
        commodity_supply, commodity_trade, evidence_sources, source_sync_events
```

Evidence class: `local DB` (assertion executed by the harness against the fully applied chain).

These six tables are created by `0034_commodity_intelligence.sql`, which grants `select` to `authenticated` and full DML to `service_role` but never enables RLS:

```sql
grant select, insert, update, delete on public.evidence_sources to service_role;
...
grant select on public.evidence_sources to authenticated;
```

With RLS disabled, a table grant *is* the access control. Any authenticated user — including a self-registered public user — can read every row of all six tables: production figures, supply/demand series, trade flows, evidence sources and their sync events. There is no ownership dimension to leak, so this is not a cross-tenant breach, but it is a data-exposure and licensing problem (some `evidence_sources` are third-party datasets with attribution terms), and it breaks the invariant that every public table is policy-governed.

Note the interaction with `MIG-03`: `0034` cannot parse, so this state exists **only if `0034` was applied to the hosted project by hand**. On the hosted project the six tables are either absent or ungoverned — both are `UNKNOWN` and both need checking before release. The fix is the same either way: a migration that enables RLS and adds staff-only read + service-role write policies.

## 3. SEC-02 — the watchlist entitlement is not enforced in the database

`0042_enforce_watchlist_entitlement.sql` sets out to replace the ownership-only policy `saved_commodities_owner` with one that also requires `public.has_entitlement('watchlists') or public.is_staff()`. It drops the old policy and then creates `saved_commodities_entitlement` four times — once per command — and PostgreSQL rejects the second:

```
policy "saved_commodities_entitlement" for table "saved_commodities" already exists  (42710)
```

Because the file cannot apply, the entitlement guarantee described in its own header ("Users must have the 'watchlists' entitlement OR be staff to use watchlists") does not exist at the database level. Two consequences:

- A user whose subscription lapses keeps database-level access to their watchlists; only the application layer stands between them and a paid feature. That is a revenue-control gap, not a data-leak gap.
- If the file is ever run by a non-transactional tool, the preceding `DROP POLICY` commits and the table ends up with **zero** policies — RLS enabled with no policy, which denies everything to `authenticated`. That would take watchlists offline, silently.

By contrast `0043`, `0044` and `0045` (alerts, exports, bulk) implement the same idea correctly with distinct names per command, and they apply. The inconsistency is in one file, not in the design.

## 4. Verified controls

### 4.1 Privileged key containment — sound

`SUPABASE_SERVICE_ROLE_KEY` is read in exactly two files, both server-only:

| File | Purpose |
|---|---|
| `src/lib/supabase/admin.ts` | Server-side admin client; exports `isAdminConfigured()` and throws a named error when unset |
| `src/lib/auth/emails.ts` | Account email side-effects |

No `NEXT_PUBLIC_*SERVICE_ROLE*` variable exists anywhere in `src/`, and `git grep` finds no JWT-shaped literal in tracked files. `.env.example` is the only tracked env file; `.env.local` is ignored (`source code`).

### 4.2 Publication and verification boundary — sound

- Public reads go through `published_price_observations` (`security_invoker`, `is_current`, `published_at not null`, `verification_status in ('verified','legacy_unverified')`), not the base table.
- The five-argument `is_public_observation` excludes `test_fixture` sources, so demo rows cannot surface as live prices even if present.
- Agents cannot verify their own submissions: verification is recorded in a separate table with a separate actor, and the UI has no path to self-verification (`source code`).

### 4.3 Append-only economy — sound

Published economic values (amount, unit, commodity, market, price type, collection time) are frozen by trigger; a correction is a *new* superseding row and the original stays. Verified on the audit instance (`local DB`).

### 4.4 API authentication — present, with a caveat

`src/lib/api/auth.ts` hashes keys with SHA-256, accepts `Authorization: Bearer` or `X-API-Key`, resolves per-application `scopes`, `tier`, `rateLimitPerMinute` and entitlements, and rejects `missing | invalid | expired | inactive`. `src/lib/api/handler.ts` enforces the limit (anonymous fallback 120/min) and records usage.

Caveat: `checkRateLimit` keeps state **in process memory**, so on Vercel each lambda instance has its own counter. Effective limits are therefore a multiple of the nominal value, and a cold start resets them. Acceptable as abuse friction; not a quota guarantee. A durable limiter (table or Redis) is a Phase 2 option, not a blocker.

### 4.5 Headers — good, one gap

`next.config.ts` sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (production builds only — deliberately omitted in dev so the preview can be embedded), `Permissions-Policy` (camera/microphone/geolocation denied), `X-DNS-Prefetch-Control` and HSTS `max-age=63072000; includeSubDomains; preload`. `/api/v1/*` is `Cache-Control: no-store`.

**Gap: no `Content-Security-Policy`.** With no CSP there is no script-src allowlist, so any injected script or compromised third-party asset runs unconstrained. Reports render via `dangerouslySetInnerHTML` on structured data (`src/app/(site)/reports/[slug]/page.tsx`), which is the highest-risk surface. A CSP in report-only mode first, then enforced, is the recommended sequence.

### 4.6 Demo accounts — gated, unverified in production

`src/app/(portal)/login/page.tsx` shows the demo credentials only when `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === 'true'`; there is no hard-coded fallback and no server-side leak of the accounts. What cannot be established here is the Vercel value of that variable (`UNKNOWN`), and therefore whether the demo accounts are publicly visible in production. This must be confirmed by the account owner before release — it is on the stop-and-ask list for a reason.

### 4.7 Jobs endpoint — sound

`app/api/jobs/run/route.ts` requires a bearer secret compared with `timingSafeEqual`, and the five jobs are idempotent per `(name, scheduled slot)` with every run written to `scheduled_job_runs`. Production scheduling state is `UNKNOWN`; enabling it in production is explicitly out of scope for this phase.

## 5. Open questions that must be answered with hosted access

| # | Question | Why it matters | Status |
|---|---|---|---|
| S-1 | Are the six intelligence tables present in production, and do they have RLS? | `SEC-01` | `UNKNOWN` |
| S-2 | Is `0042` applied in some hand-edited form? Do `saved_commodities` policies contain an entitlement check? | `SEC-02` | `UNKNOWN` |
| S-3 | Is `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS` unset or `false` in Vercel? | demo exposure | `UNKNOWN` |
| S-4 | Do any `price_observations` rows carry the `DEMO` markers from `0047_demo_seed_operations`? | credibility of every public figure | `UNKNOWN` |
| S-5 | Is the deployed commit the same as `main`? | any claim about "the current build" | `UNKNOWN` |
| S-6 | Are the `v1` API keys issued, scoped and expiring as the schema implies? | API abuse surface | `UNKNOWN` |

None of these can be answered from this environment — `*.supabase.co` is unreachable (TLS handshake refused) and no Vercel credential is present. They are recorded as blockers, not filled with assumptions.

## 6. Recommended Phase 1/2 security work

1. **P1-A6** — new migration enabling RLS on the six tables, with read restricted to `is_staff()` (or to `authenticated` minus raw columns, if the product intends public intelligence — a product decision, not a default), writes to `service_role`.
2. **P1-A4** — repair `0042` to four distinct policy names; this also makes the file idempotent by adding `drop policy if exists` for each.
3. **P2** — CSP in report-only mode, then enforced; sanitise the reports HTML path regardless.
4. **P2** — durable rate limiting for `v1` if the API is promoted.
5. **Before release** — answer S-1…S-6 with hosted access; rotate nothing until the owner approves.
