# Hatsi360 — Phase 4 integration test report

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Starting HEAD | `54b808e3a814cdc6dddc8df87c56d318eb91c54f` |
| Environment | Local PostgreSQL 17 replica (`127.0.0.1:55432`, `pluck_live`), built by `npm run verify:migrations` |
| Mode | Local execution. **No hosted staging run, no production run** |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

---

## 1. Three tiers, clearly separated

| Tier | What it is | Where | Proves |
|---|---|---|---|
| **Unit** | Vitest, mocked modules, no database | `tests/**` (52 files) | Application logic in isolation |
| **Local PostgreSQL integration** | Real functions, real RLS, real roles, real JWT claims, inside one rolled-back transaction | `supabase/tests/*.mjs` | That the SQL and policy design behaves as intended **on the replica** |
| **Hosted staging acceptance** | The real stack — PostgREST, GoTrue, the Next.js runtime | *not available* | That the same behaviour holds through HTTP, real sessions and the deployed app |

Nothing in this report is evidence for the third tier. The distinction is not
pedantic: the defect that started Phase 4 (a PostgREST argument-name mismatch)
was invisible to the local suites that existed at the time.

---

## 2. Suites

| Suite | File | Checks | Result |
|---|---|---|---|
| Resolver + report access | `supabase/tests/entitlement-integration.mjs` | 23 | **23/23 PASS** |
| RLS entitlement enforcement | `supabase/tests/entitlement-rls-enforcement.mjs` | 22 | **22/22 PASS** |
| B2B security negatives | `supabase/tests/b2b-security.mjs` | 22 | **22/22 PASS** |
| Application/database contract | `supabase/tests/rpc-contract.mjs` | 49 | **49/49 PASS** |
| **Total** | | **116** | **all pass** |

Shared harness: `supabase/tests/lib/pg-harness.mjs`. It refuses to run unless
the target is `127.0.0.1:55432`, and every suite runs inside a single
transaction that is rolled back — so applying a proposal in a test cannot reach
a hosted project and cannot leave residue.

### 2.1 Pre-existing suites (unchanged)

| Gate | Result |
|---|---|
| `npm run verify:migrations` | PASS — 89 tables, 89 with RLS, 203 policies, 222 RLS statements, 346 workflow statements, no leftover rows |
| `npm run verify:entitlements` | 31/31 |
| `npm run verify:privileges` | 14/14 |
| `npm run verify:default-privileges` | 9/9 |
| `npx tsc --noEmit` | clean |
| `npm run lint` | 43 errors / 171 warnings — **identical to baseline** |
| `npm test` (vitest) | 1081 tests, 23 failing — **identical to baseline**, all failures require a live Supabase stack at `localhost:54321` |

The vitest baseline was measured by stashing this phase's changes and re-running
the same files; the counts match exactly (1 failed / 24 passed / 12 skipped on
the subset, 22 failed on the two entitlement files). No test was weakened,
skipped or deleted.

---

## 3. Workstream F coverage

| Requirement | Where | Covered |
|---|---|---|
| 1. Client RPC invocation with exact parameter names | `rpc-contract.mjs` — parses every `.rpc(...)` in `src/`, compares argument names to `pg_proc.proargnames` | **yes (static)** |
| 2. PostgREST authenticated and anonymous requests | *not run* — see §4 | **no** |
| 3. RLS enforcement | `entitlement-rls-enforcement.mjs` — real `set role` + JWT claims | **yes** |
| 4. Premium acceptance and rejection | both DB suites — entitled vs non-entitled inserts and reads | **yes** |
| 5. Expired and cancelled rejection | `entitlement-integration.mjs` — 6 subscription contexts | **yes** |
| 6. Staff/admin overrides | both DB suites — `is_staff()`/`is_admin()` bypass, plus "staff hold no keys" | **yes** |
| 7. Report access | `entitlement-integration.mjs` — 6 contexts + broken-resolver outage test | **yes** |
| 8. Historical price API access | contract suite asserts the window exists; **no HTTP test** | **partial** |
| 9. Direct DB bypass attempts | every suite — inserts/updates issued as `authenticated` without the UI | **yes** |

---

## 4. The PostgREST gap, and what was done instead

**Constraint.** PostgREST is not available in this environment: there is no
Docker, no local Supabase stack, and the static binary cannot be fetched —
`github.com` serves a 302 to `objects.githubusercontent.com`, which the
sandbox's egress allowlist does not include (verified: `302, 0 bytes`).

**What that costs.** Item 2 is the one requirement that cannot be met locally.
The specific production defect — PostgREST resolving `has_entitlement` by
argument name and returning `PGRST202` for `entitlement_key` — can only be
reproduced through PostgREST itself.

**Compensating controls, in order of strength:**

1. **SQL-level proof of the mismatch.** On the replica,
   `has_entitlement(entitlement_key := 'reports')` returns
   `42883 function public.has_entitlement(entitlement_key => unknown) does not exist`,
   while `has_entitlement(p_key := 'reports')` succeeds. PostgREST's resolution
   is a name lookup against the same catalogue entry.
2. **Static contract test.** Every `.rpc()` call site in `src/` is parsed and
   its keys compared with the real signature. This would have failed on the
   pre-fix code and fails on any future mismatch.
3. **Route governance.** Every `/api` route must be gated or allowlisted, so a
   new ungated premium surface cannot appear silently.

**Not claimed:** that the corrected calls return 200 through PostgREST in
production. They should; that is unverified.

---

## 5. What the suites actually assert

**`entitlement-integration.mjs` (23)** — keys resolved for anonymous, no-subscription,
active, expired-by-date, trial-ended, cancelled and past-due contexts; a
trialing subscription inside its window still grants; a malformed stored value
no longer raises; a key missing from the catalogue is ignored; a null key is
`false`; staff and admin hold no keys but bypass policies; report visibility for
anon / non-entitled / entitled / staff / service_role; and the outage test —
with the **broken resolver reinstalled**, an anonymous reader still sees the
public report, an entitled reader degrades to public-only, `has_entitlement`
still raises (the defect stays visible) while `has_entitlement_safe` returns
`false`, and rolling back restores the repaired function.

**`entitlement-rls-enforcement.mjs` (22)** — watchlists insert denied for anon
and for non-entitled authenticated users (`42501`), accepted for entitled and
staff, accepted for `service_role`; non-entitled select returns 0 rows;
ownership isolation between entitled users; alerts create denied without the
entitlement while read-your-own-history still works and delete is refused;
exports insert denied without `exports`, accepted with it, accepted for admin;
bulk gate true only for staff and `bulk` holders; job runs hidden from a
non-bulk customer and visible with `bulk`; and structural assertions that no
pre-0042 ownership policy survived and no policy targets `anon` on any paid
table.

**`b2b-security.mjs` (22)** — the table in `PHASE_4_B2B_SECURITY_REVIEW.md` §4.

**`rpc-contract.mjs` (49)** — every RPC call site matches the database
signature; no call site sends `entitlement_key`; every route is gated or
allowlisted; the history window exists in code; `intelligence/sync` retains an
admin check.

---

## 6. Remaining hosted validation

Ordered, each with the exact thing to run. None of it has been done.

| # | Validation | How | Passes when |
|---|---|---|---|
| H-1 | Resolver answers through PostgREST | `POST /rest/v1/rpc/user_entitlements` as an authenticated session | 200 with an array (today: 400 `42P01`) |
| H-2 | RPC argument name accepted | `POST /rest/v1/rpc/has_entitlement` body `{"p_key":"reports"}` | 200, `false` for an unentitled user, **not** PGRST202 |
| H-3 | Old name rejected | same endpoint, body `{"entitlement_key":"reports"}` | PGRST202 — proving the fix is in the caller, not a compatibility shim |
| H-4 | Watchlist write via the app | sign in, save a commodity, with and without an entitlement | entitled: saved; unentitled: refused with a plan message, not a service message |
| H-5 | Direct write bypass | `POST /rest/v1/saved_commodities` as an unentitled session | `42501` after `0057` |
| H-6 | Report access | `GET /rest/v1/market_reports` as anon with one premium and one public row present | public row only, HTTP 200 (no `42P01`) |
| H-7 | History window | `GET /api/v1/prices/history?…&start_date=` beyond 90 days | 403 naming the limit; with a `bulk` key: 200 |
| H-8 | Degraded behaviour | temporarily break the resolver in staging | public reports still load; premium shows the outage message; logs carry `[entitlements]` |
| H-9 | B2B atomic apply | apply `0047`+`0059` in one transaction on staging | both apply; the negative tests pass over HTTP |
| H-10 | Service role | server-side export path with the service key | bypasses RLS as before |

---

## 7. Honest summary

The local evidence is strong for the SQL layer: 116 checks, real roles, real
RLS, and the specific failure modes proven in both directions (the defect
reproduced, and its containment demonstrated). It is silent on the HTTP layer,
which is exactly where the production defect lives.

So: the remediation is **prepared, implemented and locally validated**; it is
**not** production-verified. `NOT_READY_FOR_PRODUCTION` stands until H-1 to
H-10 run against a hosted project.
