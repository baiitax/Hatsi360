# Hatsi360 — Phase 4 API access matrix

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Starting HEAD | `54b808e3a814cdc6dddc8df87c56d318eb91c54f` |
| Scope | All **29** route handlers under `src/app/api` (25 under `/api/v1`) |
| Mode | Read-only audit of production behaviour; route-level changes implemented locally only |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

Legend — **Access**: who may call it. **Ent.**: entitlement required.
**Check**: where the decision is made (handler / route / session).
**Limit**: rows or date range the server enforces. **Log**: whether the request
is recorded.

---

## 1. The 29 routes

| # | Route | Access | Ent. today | Check | Limit | Rate limit | Log |
|---|---|---|---|---|---|---|---|
| 1 | `/api/v1/[...path]` | public | — | none needed (404 envelope) | n/a | n/a | no |
| 2 | `/api/v1/charts/commodity` | **public, ungated** | none | **none — bypasses the handler** | none | **none** | **no** |
| 3 | `/api/v1/commodities` | public / optional key | none | handler | `limit` ≤ 200 (default 50), `offset` | 120/min anon | keyed only |
| 4 | `/api/v1/countries/[code]` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 5 | `/api/v1/countries` | public / optional key | none | handler | `limit` ≤ 500 (default 50) | 120/min anon | keyed only |
| 6 | `/api/v1/hs-codes/[code]` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 7 | `/api/v1/hs-codes` | public / optional key | none | handler | `limit` ≤ 500 (default 100) | 120/min anon | keyed only |
| 8 | `/api/v1/insights` | public / optional key | none | handler | `limit` ≤ 50 (default 20) | 120/min anon | keyed only |
| 9 | `/api/v1/intelligence/production` | **public, ungated** | none | **none — bypasses the handler** | **none** | **none** | **no** |
| 10 | `/api/v1/intelligence/sync` | **admin only (POST)** | none | route: session + `role === 'admin'` | n/a | none | no |
| 11 | `/api/v1/intelligence/trade` | **public, ungated** | none | **none — bypasses the handler** | **none** | **none** | **no** |
| 12 | `/api/v1/markets` | public / optional key | none | handler | `limit` ≤ 200 (default 50) | 120/min anon | keyed only |
| 13 | `/api/v1/prices/compare` | public / optional key | none | handler | fixed comparison set | 120/min anon | keyed only |
| 14 | `/api/v1/prices/history` | public / optional key | **`bulk` for > 90 days** *(new)* | handler + route | **90 days free, 3,650 with `bulk`** *(new)* | 120/min anon | keyed only |
| 15 | `/api/v1/prices/latest` | public / optional key | none | handler | `limit` ≤ 200 (default 50) | 120/min anon | keyed only |
| 16 | `/api/v1/reports` | public / optional key | none *(decision)* | handler | `limit` ≤ 50 (default 20), `offset` | 120/min anon | keyed only |
| 17 | `/api/v1/tariffs/[code]` | public / optional key | none | handler | `limit` ≤ 500 (default 100) | 120/min anon | keyed only |
| 18 | `/api/v1/trade-blocs/[code]` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 19 | `/api/v1/trade-blocs` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 20 | `/api/v1/trade/analytics/[code]` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 21 | `/api/v1/trade/flows` | public / optional key | none | handler | `limit` ≤ 500 (default 100) | 120/min anon | keyed only |
| 22 | `/api/v1/trade/intelligence/commodities` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 23 | `/api/v1/trade/intelligence/overview` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 24 | `/api/v1/trade/intelligence/partners` | public / optional key | none | handler | `limit` ≤ 100 (default 50) | 120/min anon | keyed only |
| 25 | `/api/v1/trade/sources` | public / optional key | none | handler | none | 120/min anon | keyed only |
| 26 | `/api/agent/submit` | authenticated agent | none | route: session + agent role | n/a | none | no |
| 27 | `/api/auth/signout` | session | none | session | n/a | none | no |
| 28 | `/api/jobs/run` | cron secret | none | route: shared secret | n/a | none | route logs |
| 29 | `/api/notifications/read` | session | none | session, own rows | n/a | none | no |

---

## 2. Findings

| # | Finding | Severity |
|---|---|---|
| A-1 | **Three routes bypass the shared handler** (`charts/commodity`, `intelligence/production`, `intelligence/trade`): no authentication, no rate limit, no usage logging, and **no limit on the result set**. | Medium |
| A-2 | **No route declares an `entitlement:`**, although `createApiHandler` supports it. "API access" as a paid capability is therefore unenforced on every endpoint. | High |
| A-3 | **Anonymous requests are not logged at all.** `logApiUsage` is only called when a key is present, so the majority of traffic — and all abuse — leaves no record. | Medium |
| A-4 | The `api` entitlement's advertised higher limit (`rateLimitFor` → 600/min) is **not wired into the handler**; the handler reads `application.rateLimitPerMinute ?? 120`. | Low |
| A-5 | Several routes have **no pagination or cap at all** (countries/[code], trade-blocs, trade/intelligence/*, tariff by code, insights-by-code). | Low–Medium |
| A-6 | `prices/history` accepted **any date range** — the premium boundary the tiers are sold on did not exist. | High *(fixed in code)* |

---

## 3. Changes implemented in this phase

### 3.1 `prices/history` — the window (A-6)

```ts
const FREE_WINDOW_DAYS = 90;
const ENTITLED_WINDOW_DAYS = 3650;
```

- The effective start is the request's `start_date`, or *today minus the caller's window* when none is given — so an absent range no longer means "everything".
- A span larger than the window returns **403** naming the limit and, for free callers, the `bulk` entitlement.
- Entitlement is resolved from the API key's inherited set (`context.application.entitlementSet`), not from the UI.

The number 90 is a **product decision recorded as such**, not a discovered
constant; it lives in one named constant so it can be changed in one place.

### 3.2 `reports` — the claim corrected (not gated)

The route always served computed reports from `src/lib/content/reports` and
never read `market_reports`. Its comment claimed it withheld premium rows. The
comment now states the actual scope, and the premium gate lives where the data
lives: `reports_public_read` (`0058`). Making the computed reports premium would
be a commercial decision, and nothing here presumes it.

### 3.3 Denial logging (A-2/A-3, partial)

`createApiHandler` now logs every entitlement denial with the path, the key
presence and — when the lookup is degraded — the service error code. Anonymous
request logging (A-3) is **not** implemented: it needs a bounded, non-PII record
and a retention decision.

### 3.4 Governance test (A-2)

`supabase/tests/rpc-contract.mjs` fails if a route under `src/app/api` is
neigher gated by an `entitlement:` nor listed in the suite's documented
allowlist. Adding an endpoint now requires a decision; the current 29 are
recorded above.

---

## 4. Prepared but deliberately not implemented

| Item | Reason |
|---|---|
| Rate limiting / logging / caps for the three bypass routes (A-1) | They need shared state and a product view of what the trade-intelligence surface is worth. Recommend: move them onto `createApiHandler` with an explicit `anonymousRateLimit` and a `limit` cap |
| `entitlement: 'api'` on any route (A-2) | Would break every current anonymous client; the correct sequence is: publish a public/keyed split, then gate |
| `rateLimitFor` wiring (A-4) | Depends on the above; the 600/min figure is currently decorative |
| Anonymous access logging (A-3) | Needs a retention/PII decision |
| An exports endpoint | Does not exist; `0057` gates the table instead |

---

## 5. Verdict

The public read surface is coherent and genuinely open — that is a product
choice, and it is now documented route by route. The problems are of three
kinds: three routes escape the handler's controls entirely, no route enforces a
plan, and nothing records who called what. One of those (the historical-price
boundary) is fixed in code; the rest are decisions, not defects to be patched
blind.

`NOT_READY_FOR_PRODUCTION` stands: an API surface that cannot say who used it,
or under which plan, is not ready to be sold as one.
