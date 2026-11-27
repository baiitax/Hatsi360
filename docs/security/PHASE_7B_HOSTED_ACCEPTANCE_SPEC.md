# Phase 7B — Hosted Acceptance Specification (H-1 … H-10)

**Classification:** preparation only · **Environment:** local repository
**Baseline commit:** `ce17b64081648bb0cad5a7ace008478dcbde2fce`
**Execution status:** **none of H-1…H-10 has ever run against a hosted project**
**Release status:** `NOT_READY_FOR_PRODUCTION`

---

## 1. What this document is

A specification an authorised engineer can execute without re-deriving it: for each hosted check,
what to send, as whom, what must come back, what to capture, how to clean up, and what a pass
actually proves.

The ten checks are **not redefined here**. Their definitions come from
`PHASE_4_INTEGRATION_TEST_REPORT.md` §6 and `PHASE_5_HOSTED_TEST_STRATEGY.md` §3. This document
adds the fields those tables never carried — fixtures, negative controls, evidence, cleanup,
limitations — and resolves three ambiguities the earlier tables left open (§9).

## 2. What acceptance means, and what it does not

Five statuses, used by `tests/hosted-security/lib/report.mjs`:

| Status | Meaning |
|---|---|
| `passed` | The observed result matched the specification exactly, on the named target. |
| `failed` | It did not. |
| `blocked` | The test could not run — missing prerequisite, missing key, wrong environment. |
| `not-applicable` | The behaviour is out of scope for this deployment shape. |
| `not-executed` | Nobody has run it yet. **The default state of all ten today.** |

**A blocked or unexecuted test is never counted as passed.** The runner exits `3` for incomplete,
`1` for failure, `0` only when every selected test is `passed` or `not-applicable`.

## 3. The six layers, and the rule about conflating them

| Layer | Proved by | Never proved by |
|---|---|---|
| 1. SQL behaviour | the 400+ local replica checks | anything about HTTP |
| 2. PostgREST behaviour | H-1, H-2, H-3, H-5, H-6, H-9, H-10 on a hosted project | local suites |
| 3. JWT claim / role behaviour | H-1, H-4, H-5 (two sessions), H-7 | SQL tests using hand-built claims |
| 4. RLS policy behaviour | H-5, H-6, H-9 over HTTP; locally by the acceptance matrix | a policy-read of the SQL |
| 5. Function `EXECUTE` privilege | H-2/H-3 (argument resolution), H-5 (`42501`), H-10 (service role) | local grants inspection |
| 6. Application behaviour | H-4, H-6 (rendering), H-7, H-8 | API-only tests |

**Rule:** a passing local SQL test is never evidence of hosted PostgREST acceptance. The local
suites are necessary and insufficient; the defect this programme exists to fix is an HTTP-layer
defect that no local suite reproduces.

## 4. Prerequisites and ordering

### 4.1 Proposal dependency graph (as reviewed, not as documented)

```
0056 (resolver)  ──┬─→ 0058 (reports policy)  ──┬─→ 0061 (function privileges)
                   └─→ 0057 (RLS enforcement)  ──┘
0047 (RFQ/orders tables) ──→ 0059 (B2B guards)         0060 (service_role grants) → H-10
```

The order `0056 → 0058 → 0057 → 0061` was **verified by execution** in Phase 7B, not assumed:

| Order attempted | Result |
|---|---|
| `0056`+`0057`, then `0061` (no `0058`) | **refused**: `0061: anon-reachable policies call functions anon cannot execute: reports_public_read -> has_entitlement` |
| `0056` alone, then `0061` | **refused**, same message |
| `0056`+`0058`+`0057`, then `0061` | applied cleanly |

`0061`'s fourth self-check walks every anon-reachable policy — **including those created by
`0057`** — extracts referenced function names, and raises if `anon` cannot execute one. That is the
guard that makes the ordering mistake impossible rather than merely documented.

### 4.2 Environment prerequisites

| Requirement | Detail |
|---|---|
| Target | an isolated staging project, never `umxzsdepbrenqysabtlt` |
| Keys | `HATSI360_ANON_KEY` always; `HATSI360_SERVICE_KEY` for H-5/H-6/H-10 only |
| Users | one unentitled authenticated user, one entitlement-holding user (H-4, H-5, H-7) |
| Confirmation | write mode requires `HATSI360_CONFIRM_WRITES=yes-this-staging-is-disposable`, `HATSI360_OPERATOR`, and `HATSI360_CONFIRMED_PROJECT_REF` equal to the project reference |
| Manifest | `tests/hosted-security/prereqs.sql`, run once by the operator, saved as JSON, passed with `--prereqs` |
| Migrations | applied **by the operator**, never by the harness |

## 5. Layer coverage

| Test | SQL | PostgREST | JWT/role | RLS | EXECUTE | App |
|---|---|---|---|---|---|---|
| H-1 | ● | ● | ● | ○ | ○ | ○ |
| H-2 | ● | ● | ● | ○ | ● | ○ |
| H-3 | ● | ● | ○ | ○ | ● | ○ |
| H-4 | ○ | ○ | ● | ● | ○ | ● |
| H-5 | ● | ● | ● | ● | ● | ○ |
| H-6 | ● | ● | ● | ● | ● | ● |
| H-7 | ○ | ○ | ● | ○ | ● | ● |
| H-8 | ● | ● | ○ | ● | ● | ● |
| H-9 | ● | ● | ● | ● | ● | ○ |
| H-10 | ● | ● | ● | ● | ● | ○ |

● primary · ○ incidental

## 6. The tests

Every block below is the unit of work. "Local" means "provable on the replica today"; "hosted
staging" means "this is the only environment that can close it".

### H-1 — Entitlement resolver answers through PostgREST

| Field | Value |
|---|---|
| **Security objective** | A signed-in caller can obtain their entitlement set over HTTP; the resolver does not raise. |
| **Risk addressed** | Risk 11 (resolver raises `42P01`), risk 1. Finding E-1. |
| **Prerequisites** | `0056` applied. Authenticated user exists. |
| **Database objects** | `public.user_entitlements()`, `user_subscriptions`, `entitlement_catalog`. |
| **Role / JWT** | `authenticated`, `sub` = unentitled user, `role: authenticated`. |
| **Operation** | `POST /rest/v1/rpc/user_entitlements` with body `{}`. |
| **Fixtures** | None required; a user with zero subscriptions is the interesting case. |
| **Procedure** | Sign in via `/auth/v1/token?grant_type=password`; call the RPC with the access token. |
| **Expected** | HTTP `200`, JSON array. Production today: `400` with `42P01`. |
| **Expected data** | Array contents match `select * from user_entitlements()` for that user; empty is valid. |
| **Negative control** | `POST /rest/v1/rpc/does_not_exist` → `404`/`PGRST202`. Proves the harness distinguishes "missing function" from "function erroring". |
| **Evidence** | Request (redacted), status, body shape, row count, timestamp. |
| **Cleanup** | None. |
| **Pass/fail** | Pass: `200` **and** array. Anything else: fail (a `4xx` is not a pass even if "expected in production today"). |
| **Limitations** | Proves the REST path, not that entitlement *values* are correct — that is Entitlement Stage 1's own acceptance. |
| **Executable** | **Hosted staging only.** |

### H-2 — `has_entitlement` accepts `p_key`

| Field | Value |
|---|---|
| **Security objective** | The RPC's argument name matches what the application sends. |
| **Risk addressed** | Risk 13 (five call sites sent `entitlement_key`; `42883`/`PGRST202`). |
| **Prerequisites** | `0056` applied. |
| **Database objects** | `public.has_entitlement(p_key text)`. |
| **Role / JWT** | `authenticated`, unentitled user. |
| **Operation** | `POST /rest/v1/rpc/has_entitlement` body `{"p_key":"reports"}`. |
| **Fixtures** | None. |
| **Procedure** | As H-1, different endpoint. |
| **Expected** | `200` and literal `false`. |
| **Expected data** | `false` for an unentitled user; `true` for the entitled fixture user (run the pair). |
| **Negative control** | Same call as `anon` → after `0061`, `401`/`403` (function not in the anonymous allowlist). Before `0061`, `200 false` — which is why the pair matters. |
| **Evidence** | Both responses, both identities. |
| **Cleanup** | None. |
| **Pass/fail** | Pass: `200` + boolean, for both users with opposite values. |
| **Limitations** | Local suites already prove the SQL function resolves; only HTTP proves argument binding. |
| **Executable** | **Hosted staging only.** |

### H-3 — the old argument name is rejected

| Field | Value |
|---|---|
| **Security objective** | The fix lives in the callers; no compatibility shim exists in the database. |
| **Risk addressed** | Risk 13 — a shim would hide future drift. |
| **Prerequisites** | `0056` applied. |
| **Database objects** | `public.has_entitlement(p_key text)` — and the **absence** of an `entitlement_key` overload. |
| **Role / JWT** | `authenticated`. |
| **Operation** | `POST /rest/v1/rpc/has_entitlement` body `{"entitlement_key":"reports"}`. |
| **Fixtures** | None. |
| **Procedure** | As H-2. |
| **Expected** | `4xx` with code `PGRST202`. |
| **Expected data** | No row, no boolean, no silent `null`. |
| **Negative control** | The H-2 call must succeed in the same run; a shim that satisfies H-3 by breaking H-2 is a failure of both. |
| **Evidence** | Status + error code + the H-2 result from the same run. |
| **Cleanup** | None. |
| **Pass/fail** | Pass: `4xx` + `PGRST202` **and** H-2 passed. |
| **Limitations** | PostgREST reports PGRST202 for both "no such function" and "no such signature"; the code alone does not distinguish them. H-2's success is what makes H-3 meaningful. |
| **Executable** | **Hosted staging only.** |

### H-4 — watchlist write through the application

| Field | Value |
|---|---|
| **Security objective** | The product path behaves for both entitled and unentitled users, and the unentitled message is a plan message, not a service error. |
| **Risk addressed** | Risk 12, risk 21 (users lose access), and the Phase 3 finding that a green SQL suite coexisted with a broken product. |
| **Prerequisites** | `0057` applied; two test accounts; app deployed to an environment pointed at staging. |
| **Database objects** | `saved_commodities`, `saved_markets`, entitlement resolver. |
| **Role / JWT** | two `authenticated` sessions, one entitled. |
| **Operation** | Browser: sign in, save a commodity (both accounts). |
| **Fixtures** | One commodity; two synthetic accounts. |
| **Procedure** | Manual, with the network panel open. |
| **Expected** | Entitled: row saved, `201`. Unentitled: refused with a plan/subscription message. |
| **Expected data** | Exactly one `saved_commodities` row for the entitled user, none for the other. |
| **Negative control** | The unentitled attempt must not create a row *and* must not surface a generic 500. |
| **Evidence** | Screenshots, HAR/network excerpt, row counts before and after. |
| **Cleanup** | Delete the fixture row and the two accounts. |
| **Pass/fail** | Pass: both behaviours as specified. |
| **Limitations** | **Application layer only** — not automatable from the harness; reported `not-executed` until a human runs it. |
| **Executable** | **Hosted staging + browser.** |

### H-5 — direct PostgREST write bypass is refused

| Field | Value |
|---|---|
| **Security objective** | A JWT holder cannot write an entitlement-gated table by calling the REST endpoint directly. |
| **Risk addressed** | Risk 12 — the whole reason `0057` exists. |
| **Prerequisites** | `0057` applied; unentitled session; service key for fixtures. |
| **Database objects** | `saved_commodities` (+ policies from `0057`). |
| **Role / JWT** | `authenticated` unentitled. |
| **Operation** | `POST /rest/v1/saved_commodities` body `{"user_id":"<self>","commodity_id":<id>}`. |
| **Fixtures** | A commodity id; tracked for cleanup if the write unexpectedly succeeds. |
| **Procedure** | Automated (harness, write mode). |
| **Expected** | `403` or SQLSTATE `42501`. **Never `201`.** |
| **Expected data** | Zero new rows. |
| **Negative control** | The identical request from the **entitled** session must return `201` — otherwise the refusal could be a malformed payload rather than authorisation. |
| **Evidence** | Both requests, both statuses, row count delta. |
| **Cleanup** | Delete any row created by either request; the harness tracks ids. |
| **Pass/fail** | Pass: unentitled refused **and** entitled accepted. |
| **Limitations** | Proves one table; the acceptance matrix covers the rest locally, and staging only proves the ones exercised. |
| **Executable** | Hosted staging (write mode). |

### H-6 — anonymous report read returns public rows only

| Field | Value |
|---|---|
| **Security objective** | `anon` reads published public reports and never a premium row, and never errors. |
| **Risk addressed** | Risk 11 through the public surface; S-1 (anonymous `EXECUTE`), `0058`. |
| **Prerequisites** | `0056` + `0058`; `grant select on market_reports to anon` (present in production, absent on the replica); one public and one premium row. |
| **Database objects** | `market_reports`, `reports_public_read`, `has_entitlement_safe`. |
| **Role / JWT** | `anon` (no token, anon key only). |
| **Operation** | `GET /rest/v1/market_reports?select=id,title,is_premium`. |
| **Fixtures** | `p7b-*-public` and `p7b-*-premium` synthetic rows created through the service key. |
| **Procedure** | Automated (harness). |
| **Expected** | `200`, public rows only, no `42P01`. |
| **Expected data** | Premium fixture absent from the response. |
| **Negative control** | `GET /rest/v1/market_reports?id=eq.<premium id>` → zero rows (or `42501`), never the row. |
| **Evidence** | Response body (redacted), seeded ids, row counts. |
| **Cleanup** | Delete both synthetic rows by id through the service key. |
| **Pass/fail** | Pass: `200` **and** no premium row **and** the negative control returns nothing. |
| **Limitations** | The replica cannot test this faithfully: it has no anon table grant, and an empty table never evaluates the policy. Both traps are documented in the Phase 6 test report. |
| **Executable** | Hosted staging (write mode, for fixtures). |

### H-7 — history window beyond 90 days

| Field | Value |
|---|---|
| **Security objective** | The entitlement window is enforced at the API boundary before the query runs. |
| **Risk addressed** | Risk 14 (29 routes declared no entitlement; `/prices/history` unbounded). |
| **Prerequisites** | Application deployed against staging; a session cookie for a normal user and for a bulk-entitled user. |
| **Database objects** | `price_observations` (bulk gate via `can_perform_bulk_operations`). |
| **Role / JWT** | `authenticated`, with and without `bulk`. |
| **Operation** | `GET /api/v1/prices/history?commodity_id=<id>&start_date=2000-01-01`. |
| **Fixtures** | Observations older than 90 days (synthetic). |
| **Procedure** | Manual or scripted with a cookie (`HATSI360_SESSION_COOKIE`). |
| **Expected** | `403` naming the limit; with the entitlement, `200`. |
| **Expected data** | No rows beyond the window without the entitlement. |
| **Negative control** | A request inside the window must succeed for the same user. |
| **Evidence** | Both statuses, both bodies (redacted), the cookie's identity. |
| **Cleanup** | Delete fixture observations. |
| **Pass/fail** | Pass: `403` outside, `200` inside, `200` outside with entitlement. |
| **Limitations** | Cookie handling is manual; the harness reports `not-executed` without `HATSI360_SESSION_COOKIE`. |
| **Executable** | Hosted staging + app URL. |

### H-8 — degraded resolver fails open for public reports only

| Field | Value |
|---|---|
| **Security objective** | Breaking the resolver degrades premium reads without breaking public ones, and the failure is visible in logs. |
| **Risk addressed** | Risk 11's containment claim in `0058`. |
| **Prerequisites** | `0056` + `0058`; a staging window where breaking things is allowed. |
| **Database objects** | `has_entitlement_safe`, `reports_public_read`. |
| **Role / JWT** | `anon` and `authenticated`. |
| **Operation** | Deliberately break the resolver (`alter function … rename` or revoke `EXECUTE` from `anon`), then read reports. |
| **Fixtures** | Public + premium rows from H-6. |
| **Procedure** | Manual, staged only, with a restore step rehearsed first. |
| **Expected** | Public reads `200`; premium shows the outage message; logs carry `[entitlements]`. |
| **Expected data** | Public rows visible; premium rows not leaked. |
| **Negative control** | After restore, both read paths return to normal. |
| **Evidence** | Log excerpt, both response bodies, timestamps around the break and restore. |
| **Cleanup** | Restore the resolver; verify with H-1. |
| **Pass/fail** | Pass: public unaffected, premium degraded, log line present, restoration confirmed. |
| **Limitations** | **Destructive.** Requires `--allow-destructive` and `HATSI360_ALLOW_DISRUPTIVE=1`. Never on production. |
| **Executable** | Hosted staging only, human-supervised. |

### H-9 — B2B apply and its negative cases over HTTP

| Field | Value |
|---|---|
| **Security objective** | After `0047` + `0059`, the B2B transaction guards hold through PostgREST, not just in SQL. |
| **Risk addressed** | Risk 17, plus Phase 5 findings S-2/S-3 (forged order economics, client-writable payment state). |
| **Prerequisites** | `0047` then `0059` applied by the operator; prereq manifest listing both. |
| **Database objects** | `rfqs`, `quotes`, `orders`, `order_events`, `supplier_profiles`, `create_order_from_quote`, `pin_order_quote_economics`, `guard_order_transition`. |
| **Role / JWT** | two buyers, two suppliers (synthetic). |
| **Operation** | `POST /rest/v1/rpc/create_order_from_quote` with another buyer's quote; `POST /rest/v1/orders` with forged `unit_price`; `POST /rest/v1/order_events`. |
| **Fixtures** | The full graph; described in `tests/hosted-security/fixtures/README.md`. |
| **Procedure** | Operator applies migrations; harness runs the negatives. |
| **Expected** | `403`/`42501` for all three; `201` for the legitimate buyer on their own accepted quote. |
| **Expected data** | No order with forged economics; no forged event row. |
| **Negative control** | The legitimate order creation must succeed — otherwise the pin is a false positive. |
| **Evidence** | Three refusals, one success, resulting row values. |
| **Cleanup** | Delete orders, quotes, RFQs, events in FK order. |
| **Pass/fail** | Pass: all three refused **and** the legitimate path works. |
| **Limitations** | The harness **never applies migrations**; without the operator's apply plus manifest this is `blocked`. |
| **Executable** | Hosted staging (write mode). |

### H-10 — service role reaches the tables it needs

| Field | Value |
|---|---|
| **Security objective** | The service key can perform the backend operations it exists for, and the privilege is not visible to clients. |
| **Risk addressed** | S-4/S-5 (43 tables lacked complete `service_role` DML; two server paths fail today), LS-1. |
| **Prerequisites** | `0060` applied (amended: `DELETE` withheld on five evidence tables). |
| **Database objects** | `export_jobs` primarily; `orders`, `quotes`, `rfqs`, `notifications`, `scheduled_job_runs`, `international_trade_records`, `supplier_profiles`. |
| **Role / JWT** | `service_role` (service key), `rolbypassrls = true`. |
| **Operation** | `GET /rest/v1/export_jobs?select=id&limit=1` with the service key; the same with the anon key. |
| **Fixtures** | None for the read; write tests need a disposable export job. |
| **Procedure** | Automated (harness, service tier). |
| **Expected** | service key `200`; anon key refused or empty. |
| **Expected data** | No client sees another tenant's export metadata. |
| **Negative control** | Anon-key call must not return rows; and `DELETE` on `audit_events` with the service key must be refused (`42501`) after the Phase 6 amendment. |
| **Evidence** | Both statuses, row counts, the `42501` on the evidence-table delete. |
| **Cleanup** | Delete any export job created. |
| **Pass/fail** | Pass: service `200`, anon refused/empty, evidence `DELETE` refused. |
| **Limitations** | Proves three tables; the 89-table matrix is argued, not executed. Tolerating a broad grant is LS-1, not an acceptance criterion. |
| **Executable** | Hosted staging (write mode). |

## 7. Ordering to execute

1. H-2 → H-3 (cheapest, isolates argument binding against the Phase 3 defect).
2. H-1 → H-6 (resolver then the public surface).
3. H-5 (needs `0057`; pair it with H-4 the same day).
4. H-7 (needs the app and a cookie).
5. H-10 (needs `0060`).
6. H-9 (needs the operator apply; isolate in its own window).
7. H-8 last — it breaks things on purpose.

## 8. Gaps recorded rather than invented

| # | Gap | Resolution proposed |
|---|---|---|
| G-1 | H-4, H-7, H-8 are not automatable (browser, cookie, destructive) | kept `manual`/`destructive`; the harness reports `not-executed` and never guesses |
| G-2 | H-9 presumes the operator applies migrations, but no runbook step says *which command* | `PHASE_5_RELEASE_RUNBOOK.md` §5 already defines per-file verification; H-9 reuses it |
| G-3 | The earlier tables do not state what H-6 needs in fixtures | resolved here: one public + one premium row, synthetic, cleaned by id |
| G-4 | H-3's `PGRST202` is ambiguous between "no function" and "no signature" | paired with H-2 in the same run; documented in the test's pass criteria |
| G-5 | No hosted test covers `pricing`/`subscription` UI at all | out of scope for H-1…H-10; recorded in the final report as an acceptance gap |
| G-6 | `write_audit()` remains unguarded in the body | risk 28; `0061` makes it service-only, which is a containment not a fix |

## 9. Acceptance rules

* A run is `ACCEPTED` only if every selected test is `passed` or `not-applicable`.
* `blocked` and `not-executed` produce `INCOMPLETE` and exit code `3`.
* Any `failed` produces `REJECTED` and exit code `1`.
* A partial run cannot produce `ACCEPTED`: selecting a subset is for diagnosis, and the summary
  records exactly which tests ran.
* **No local suite result may be substituted for any row above.**

## 10. Known limitations of the whole package

1. Staging does not prove production: different data volume, no real traffic, no CDN.
2. Migrations are applied by a human, so "the harness passed" never implies "the schema is right".
3. The harness cannot see the app's server-side code paths; H-4/H-7 are manual.
4. `service_role` acceptance is a spot check of three tables against an argued 89-table matrix
   (LS-1 remains open).
5. Rate limiting, abuse controls and WAF behaviour are out of scope.
