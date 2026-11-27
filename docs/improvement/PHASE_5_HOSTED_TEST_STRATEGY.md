# Phase 5 — Hosted Integration Strategy (H-1 … H-10)

**Status:** strategy complete, **execution impossible in this environment**
**Verdict:** `NOT_READY_FOR_PRODUCTION` — H-1 to H-10 remain the blocking gap
**Nothing here was run against a hosted project.**

---

## 1. The gap, stated precisely

Every check in Phases 3–5 executes SQL against a local replica with `set local role` and a
hand-built `request.jwt.claims`. That proves what PostgreSQL does with a given role and claim set.
It says nothing about the layer production actually talks to:

| Production layer | Local evidence | Consequence |
|---|---|---|
| PostgREST: JWT verification → role assumption | simulated by hand | token handling, role switching and claim parsing are untested |
| PostgREST: RPC argument resolution | none | a function whose argument name changed still returns `PGRST202` through REST even though SQL resolves it |
| PostgREST: schema cache | none | a new function/column is invisible until the cache reloads |
| PostgREST: PG error → HTTP status mapping | none | `42501`→403, `22023`→400, `42P01`→400 are assumptions |
| Next.js middleware and route handlers | unit tests only | a handler that swallows an error and retries with the service key defeats every policy |
| Anonymous traffic path | none | CDN/caching behaviour for public reports is unmeasured |

No local PostgREST binary is available in this sandbox (the download returns an empty `302`), and
there is no Docker. That is a hard constraint, not a choice.

## 2. The three layers, and what each can prove

**Layer A — SQL boundary (done).** 295 executed checks across the Phase 4 and Phase 5 suites
(33 + 126 + 20 new, 22 + 49 + 23 + 22 + 14 + 9 + 31 carried). Proves policy outcomes,
guards, triggers and privileges for a given role and claim set. Proves nothing about HTTP.

**Layer B — local hosted-service simulation (feasible now, not yet built).**
A Node process that (a) mints JWTs with the same `sub`/`role`/`exp` claims Supabase issues, (b)
exposes `/rest/v1/<table>` and `/rest/v1/rpc/<fn>` over HTTP, and (c) maps PG SQLSTATEs to status
codes the way we *believe* PostgREST does. Pointed at the replica, it lets the real Next.js route
handlers and client components run end to end: middleware, error surfacing, entitlement messaging,
`fetch` caching.

It cannot prove: that PostgREST does what the shim does. If the shim maps `42501`→403 because we
assume PostgREST does, the test confirms our assumption, not PostgREST's behaviour. **A passing
Layer B is not hosted acceptance** and must never be reported as H-1…H-10 complete.

What Layer B *is* genuinely good for:

* catching API-side regressions that no SQL test can see (routes that retry via the service key,
  handlers that translate `42501` into a 500, client code that hides a plan error);
* exercising the argument names the client actually sends (H-2/H-3) against the SQL function,
  which is where the Phase 3 defect lived;
* validating response *shapes* our own code depends on, independently of PostgREST.

**Layer C — hosted project (blocked, requires a decision).** 30–60 minutes of scripted checks. This
is the only layer that can close H-1…H-10. See `PHASE_5_STAGING_COST_ANALYSIS.md` for what a
staging project costs and `PHASE_5_RELEASE_RUNBOOK.md` for the ordering.

## 3. H-1 … H-10: current status and exact procedure

Each row is written to be run as-is by someone with dashboard access during a staging window.
Script: `supabase/tests/hosted/phase5-hosted.mjs` (written, **never executed** — see §5).

| # | Validation | Procedure | Passes when | Blocked by |
|---|---|---|---|---|
| H-1 | Resolver answers through PostgREST | `POST /rest/v1/rpc/user_entitlements` with an authenticated session | 200 + array (production today: 400 `42P01`) | needs hosted project |
| H-2 | RPC argument name accepted | `POST /rest/v1/rpc/has_entitlement` body `{"p_key":"reports"}` | 200, `false` for an unentitled user — not `PGRST202` | needs hosted project |
| H-3 | Old argument name rejected | same endpoint, body `{"entitlement_key":"reports"}` | `PGRST202` — proving the fix landed in the caller, not a shim | needs hosted project |
| H-4 | Watchlist write through the app | sign in, save a commodity, with and without the entitlement | entitled: saved; unentitled: refused with a *plan* message, not a service error | needs hosted project |
| H-5 | Direct write bypass | `POST /rest/v1/saved_commodities` as an unentitled session | `42501` → 403 after `0057` | needs hosted project |
| H-6 | Public report read | `GET /rest/v1/market_reports` as anon with one premium and one public row | public row only, HTTP 200, no `42P01` | needs hosted project + a seeded premium row |
| H-7 | History window | `GET /api/v1/prices/history?...&start_date=` beyond 90 days | 403 naming the limit; 200 with a `bulk` entitlement | needs hosted project |
| H-8 | Degraded resolver | temporarily break the resolver in staging | public reports still load; premium shows an outage message; logs carry `[entitlements]` | needs hosted project, **must not be attempted on production** |
| H-9 | B2B atomic apply | apply `0047`+`0059` in one transaction | both apply; the negative cases from `b2b-acceptance.mjs` reproduce over HTTP | needs hosted project |
| H-10 | Service role | server-side export path with the service key | bypasses RLS; **including `export_jobs`, which needs `0060` first** | needs hosted project |

H-10 is the one that changed in this phase: local execution proved `service_role` has no privilege
on `export_jobs` (S-4), so a hosted H-10 run *before* `0060` would fail with `42501` and look like
an RLS problem.

## 4. Ordering (dependency, not preference)

```
H-2, H-3   argument resolution          independent, do first — cheap, isolates the Phase 3 defect
H-1        resolver over REST           after 0056
H-6        public reports for anon      after 0056+0058
H-5        RLS denies a direct write    after 0057
H-4        app-level messaging          after H-5 (needs the denial to be true)
H-7        entitlement window           after H-1 (needs a working resolver)
H-8        degradation path             last of the entitlement group; deliberately breaks things
H-9        B2B apply + negatives        after 0047+0059, in a separate staging transaction
H-10       service role                 after 0060
```

## 5. The script: written, unexecuted

`supabase/tests/hosted/phase5-hosted.mjs` reads `HOSTED_URL`, `ANON_KEY`, `SERVICE_KEY`,
`USER_EMAIL`/`USER_PASSWORD`, `ENTITLED_EMAIL`/`ENTITLED_PASSWORD` from the environment and runs
H-1…H-10 as HTTP calls, printing a pass/fail line per check and exiting non-zero on any failure.

It has been syntax-checked only. It has never been run against any project, so treat it as a
**checklist with a runner attached**, not as tested tooling — expect to fix a URL or a payload on
first use. It refuses to run if `HOSTED_URL` contains `supabase.co` and `ALLOW_REMOTE` is unset,
so it cannot be pointed at production by accident.

## 6. Decision requested

Three options, in descending order of evidence quality:

1. **Pro ~$25/mo for one month, staging as a second project.** Closes H-1…H-10 with a real
   PostgREST, real JWT issuance, and a disposable database. Cost detail in
   `PHASE_5_STAGING_COST_ANALYSIS.md`.
2. **Layer B shim now, Layer C later.** Cheap, catches API-side defects, but does not close the gap
   and must not be reported as closing it.
3. **Release on local evidence alone.** Not recommended: the production defect this whole programme
   exists to fix is an HTTP-layer defect (`PGRST202`/`42P01` through REST) that no local suite can
   reproduce, and H-3 exists precisely to prove it has not been "fixed" by a compatibility shim.

## 7. What remains true regardless of option

* `NOT_READY_FOR_PRODUCTION` stands until H-1…H-10 pass on a hosted project.
* A local simulation, however thorough, does not equal hosted acceptance.
* No staged verification replaces the production preflight and verification queries in
  `PHASE_5_RELEASE_RUNBOOK.md`; staging proves the code, production proves the data.
