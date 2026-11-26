# Hatsi360 — Phase 3 commercial feature matrix

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Baseline HEAD | `fa27aaac70fdd4baa974f04e987ef04d0876163b` |
| Project | `umxzsdepbrenqysabtlt` (PostgreSQL 17.11) |
| Mode | Read-only audit — no code, policy or data changed |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

Companion: `PHASE_3_ENTITLEMENT_AUDIT.md` (engine and reconciliation),
`PHASE_3_SUBSCRIPTION_LIFECYCLE.md`, `PHASE_3_B2B_READINESS.md`.

**The rule this document applies:** hiding a control in the interface is not
enforcement. A feature is "enforced" only when a request that bypasses the UI
is refused by the server or the database. Each row below records what each
layer actually does, and "UI only" is never scored as enforcement.

---

## 1. Summary

| Feature | DB enforcement | Server enforcement | Honest status |
|---|---|---|---|
| Public market prices | **yes** — RLS public read, verified anon | n/a (public) | **Working** |
| Historical prices | **none** — no depth limit, no gate | **none** | **Unlimited to everyone** |
| Watchlists | **none** (`0042` unapplied) | gate present, call invalid | **Broken and unenforced** |
| Price alerts | **none** (`0043` unapplied) | gate present, call invalid | **Broken, unenforced, and never fire** |
| Market reports | policy raises (E-6) | none | **Latent failure** |
| Bulk exports | **none** (`0044`/`0045` unapplied) | staff-only path | **Admin tool, not a product** |
| API access | n/a (no rows) | scopes+rate limit exist, **0 routes gated** | **Built, unexercised, ungated** |
| Supplier discovery | **nonexistent in production** | page queries a missing table | **Unavailable** |
| RFQs | **nonexistent in production** | — | **Unavailable** |
| Orders | **nonexistent in production** | — | **Unavailable** |

Nine of ten assessed capabilities are absent, broken, ungated, or unreachable.
One — public price discovery — works and is genuinely free.

---

## 2. The matrix

### 2.1 Public market prices — *free access boundaries*

| Layer | Implementation | Evidence |
|---|---|---|
| **UI** | `/prices`, `/commodities`, `/markets`; no gate, no login wall | route tree |
| **API** | `GET /api/v1/prices/latest`, `/prices/compare`, `/commodities`, `/markets` — no `entitlement:` declared, anonymous rate limit 120/min | `src/app/api/v1/**` |
| **DB** | `price_observations_public_read` policy; anon SELECT granted on 73 tables and 2 views (`published_price_observations`, `market_price_summary`) | Phase 2 verified anon reads: commodities 22, markets 11, observations 259, plus views |
| **Entitlement key** | none — deliberately | `PUBLIC_CAPABILITIES` is `[]`, so a public capability needs no key |
| **Production status** | **Working.** Anon read of published observations succeeds: 321 total observations, 259 anon-visible | Phase 2 §13 evidence |
| **Missing controls** | Only that "public" is defined by policy, not by a documented boundary test — there is no test asserting *which* columns/rows must stay public | — |

Free boundary, as actually implemented: unauthenticated read of published,
non-premium observations and their market/commodity catalogue. This is the one
part of the commercial model that behaves as designed.

### 2.2 Historical prices — *free/premium limits*

| Layer | Implementation |
|---|---|
| **UI** | `/prices/[commodity]/[market]` and `/client/analytics` show series with no depth cap |
| **API** | `GET /api/v1/prices/history?commodity=&market=&start_date=&end_date=` — no `entitlement:`, no maximum span, no row cap (`zod` validates only format and ordering) |
| **DB** | `price_observations_public_read` covers all published rows regardless of age; `0045`'s bulk policy is unapplied |
| **Entitlement key** | would be `bulk` (0045) or `reports` (tier bundle) — **neither is enforced** |
| **Production status** | **Entirely unlimited.** Anyone, anonymously, can request any date range |
| **Missing controls** | Depth limit (e.g. 90 days free); row cap; entitlement check on the API; a documented "extended history" definition |

The tier copy sells "extended historical data" and "limited historical data" on
the free plan. **Neither limit exists.**

### 2.3 Watchlists — *entitlement enforcement*

| Layer | Implementation | Enforced? |
|---|---|---|
| **UI** | `WatchlistsClient` uses `hasEntitlement()` to show an upgrade prompt; `PremiumSidebar` greys the item | **no** — display only |
| **Server** | `saveCommodity` / `saveMarket` call `rpc('has_entitlement', { entitlement_key: 'watchlists' })` | **broken** — `42883` / PGRST202, `data` null → always denies |
| **DB** | production has `saved_commodities_owner` (ALL) and `saved_markets_owner` (ALL) — ownership only | **no gate at all** |
| **Entitlement key** | `watchlists` (catalog), bundled in `professional`/`enterprise` (both `is_available = false`) | — |
| **Production status** | **Unusable via the product, wide open via PostgREST.** 6 saved commodities, 3 saved markets exist from earlier testing | — |
| **Missing controls** | `0042` policies; correct RPC argument; a test that a direct `POST /rest/v1/saved_commodities` without entitlement is refused |

An entitled customer sees "Watchlist feature requires a premium subscription".
An unentitled attacker with a JWT can POST directly and succeed.

### 2.4 Price alerts — *entitlement enforcement*

| Layer | Implementation | Enforced? |
|---|---|---|
| **UI** | `AlertsClient` upgrade prompt; `/trade/alerts` marketing page describes the feature | **no** |
| **Server** | `rpc('has_entitlement', { entitlement_key: 'alerts' })` in `intelligence.ts` and `alerts/page.tsx` | **broken** (same defect) |
| **DB** | `price_alerts_owner` (ALL, ownership only); `alert_delivery_logs` has a SELECT policy and no write policy | **no gate** |
| **Entitlement key** | `alerts` — bundled in professional/enterprise, both unavailable | — |
| **Production status** | **Four alert rows exist**, created under the ownership-only policy. No alert has ever fired: there is **no evaluation job** anywhere in `src/lib/jobs` or the SQL chain | — |
| **Missing controls** | `0043` policies; correct RPC argument; **an alert evaluation job**; an alert count limit per tier ("up to 50 alerts" is advertised, enforced nowhere); delivery integration |

Alerts are the clearest case of a feature that appears complete — page, table,
client component, marketing copy — and has no working mechanism behind it.

### 2.5 Market reports — *access and export limits*

| Layer | Implementation | Enforced? |
|---|---|---|
| **UI** | `/research` (client) lists `market_reports` + `report_subscriptions`; `/admin/reports` runs staff reports; marketing `/insights` is public | partly |
| **Server** | `GET /api/v1/reports` serves **computed** reports from `src/lib/content/reports` — never reads `market_reports`, declares no entitlement. Its own comment claims premium reports are withheld | **claim false** |
| **DB** | `reports_public_read`: `(not is_premium and published_at is not null) or is_staff() or has_entitlement('reports')` — **raises `42P01` for anon/authenticated** once a row exists | **broken** |
| **Entitlement key** | `reports` | — |
| **Production status** | `market_reports` has **0 rows**, so the defect is latent. The public API exposes computed figures that the UI/DB treat as premium | — |
| **Missing controls** | A working resolver before the first row is inserted; a decision on whether computed reports are premium; export gating (no report export path exists for customers) |

### 2.6 Bulk exports — *permission enforcement*

| Layer | Implementation | Enforced? |
|---|---|---|
| **UI** | `/admin/exports` (staff). **No customer export UI exists** | — |
| **Server** | `runReportExport` in `operations/actions.ts` calls `requireStaff('/admin/reports')`; comment says "exports entitlement is enforced at the database level via RLS" — it is not | staff-only by role, not by entitlement |
| **DB** | `export_jobs_insert` (no entitlement); `create_export_job`/`complete_export_job` RPCs with no entitlement check; `0044` and `0045` unapplied | **no** |
| **Entitlement key** | `exports` (0044), `bulk` (0045) | — |
| **Production status** | 0 export jobs. A staff tool exists; a customer product does not | — |
| **Missing controls** | `0044`/`0045`; a customer-facing export surface; size/row limits; `can_perform_bulk_operations()` |

"CSV data exports" is sold in two tiers and implemented for one internal role.

### 2.7 API access — *authentication and quotas*

| Layer | Implementation | Enforced? |
|---|---|---|
| **UI** | `/site/dashboard` lists applications (read-only). `/admin/api-management` is a staff view. **No self-service key creation** | — |
| **Server** | `authenticateApiKey` (SHA-256 hash lookup, expiry, active flag, scope check), in-memory rate limiter; `createApiHandler` supports `entitlement:` — **no route passes it** | auth yes, entitlement no |
| **DB** | `api_applications`, `api_usage_logs` exist; `api_application_entitlements()` exists but inherits the broken resolver | no |
| **Entitlement key** | `api` | — |
| **Production status** | **0 applications**, 0 usage logs. The paid "10,000 requests/month" claim has no quota mechanism | — |
| **Missing controls** | key issuance flow; per-key quota accounting (only per-minute rate exists); entitlement gating of premium endpoints; a documented public-vs-keyed surface |

### 2.8 Supplier discovery — *commercial access model*

| Layer | Implementation |
|---|---|
| **UI** | `/client/trade/suppliers` queries `supplier_profiles` |
| **Server** | none — the page reads the table directly |
| **DB** | `supplier_profiles` **does not exist in production** (`0047` unapplied) |
| **Entitlement key** | none — no commercial model is defined for discovery |
| **Production status** | **Unavailable.** The page raises (missing relation) for every user |
| **Missing controls** | the table; a decision on whether discovery is free, paid, or agreement-based; verification gate (local policy allows only `is_active` + `verified`) |

### 2.9 RFQs — *customer and supplier permissions*

| Layer | Implementation |
|---|---|
| **UI** | `/client/trade/rfqs`, `/client/trade/rfqs/new` + `RFQForm` |
| **Server** | direct table inserts from a client component |
| **DB** | `rfqs`/`quotes` **absent in production**; local policies are ownership/published-scope only, with **no entitlement or subscription reference** |
| **Entitlement key** | none |
| **Production status** | **Unavailable** — every RFQ page raises on a missing relation |
| **Missing controls** | the tables; a commercial model; supplier verification prerequisite in policy; RFQ expiry job exists locally (`expire_old_rfqs`) but nothing schedules it |

### 2.10 Orders — *transaction and ownership controls*

| Layer | Implementation |
|---|---|
| **UI** | `/client/trade/orders` |
| **Server** | `create_order_from_quote` (local, `security definer`), `generate_order_number` |
| **DB** | `orders`/`order_events` **absent in production**; local policies: buyer/supplier ownership on select, insert, update |
| **Entitlement key** | none |
| **Production status** | **Unavailable** |
| **Missing controls** | the tables; a state machine (§B2B doc); dispute evidence (reviews exist as a table, no workflow); payment/settlement — absent by design |

---

## 3. Cross-cutting enforcement findings

| # | Finding | Impact |
|---|---|---|
| C-1 | **No API route declares an entitlement.** 29 routes, 0 gated, although the handler supports it | Every "API access" promise is unenforced |
| C-2 | **All five entitlement RPC calls use the wrong argument name** (`entitlement_key` vs `p_key`) | Gates deny everyone, including legitimate customers |
| C-3 | **No database policy in production enforces a plan** (the only one raises) | A JWT holder bypasses every UI gate with a direct PostgREST call |
| C-4 | **No feature limit is implemented anywhere**: 5 saved items, 50 alerts, 90-day history, 10,000 requests/month are copy only | Tier differentiation is presently zero |
| C-5 | **Staff bypass policies but hold no keys**, so the app shows staff an empty capability set | Interface/database disagreement in the opposite direction |
| C-6 | **Nothing logs an entitlement failure** | The current outage is invisible to telemetry |

---

## 4. What is genuinely sellable today

Nothing that requires a gate. The only capability with a real, enforced
boundary is public price discovery — which is free by design. Every paid
capability is either not implemented (historical limits, exports, API quotas,
suppliers, RFQs, orders), not enforced (watchlists, alerts), or actively broken
(the resolver, the report policy).

A commercial launch would therefore be selling promises the system does not
keep. That is the Phase 3 conclusion, and it is why the recommendation stays
`NOT_READY_FOR_PRODUCTION`.

---

## 5. Evidence references

- Repository: `supabase/migrations/{0016,0042,0043,0044,0045,0046,0047,0049,0052}.sql`
- Application: `src/lib/entitlements.ts`, `src/lib/api/{handler,auth}.ts`, `src/app/(client)/client/{watchlists,alerts,subscription,research}/`, `src/app/(client)/client/actions/intelligence.ts`, `src/app/(client)/layout.tsx`
- Production: `pg_proc` (`user_entitlements`, `has_entitlement`, `can_perform_bulk_operations`), `pg_policies` (per table), `pg_tables` (80), row counts (`saved_commodities` 6, `saved_markets` 3, `price_alerts` 4, `export_jobs` 0, `market_reports` 0, `api_applications` 0)
- Local: `npm run verify:entitlements` 31/31, `verify:privileges` 14/14, `verify:migrations` PASS
- Direct probes: `select public.has_entitlement('reports')` → `42P01`; `begin; set local role anon; select 1 where (false) or public.has_entitlement('reports'); rollback;` → `42P01`; `has_entitlement(entitlement_key := 'reports')` → `42883`
