# HATSI360 TRADE INTELLIGENCE — DEVELOPMENT REPORT

**Brief §26 requires a final report. This is the report for Phases 1 and 2.**
Phases 3 to 7 are not built. Every capability below is classified per §26, and
nothing is described as live, verified or operational because its interface
exists.

**Date:** 2026-10-22
**Commit:** `39f235b`

---

## 1. Existing price-data audit

`public.price_observations` already preserves every field brief §6.1 asks for: commodity, market, variety, grade, price type, reported amount and unit, normalised amount and unit (null when conversion is unverified), currency, `collected_at` with `collected_at_precision`, `submitted_at`, `verified_at`, `published_at`, `rejected_at`, agent, verifier, status, notes, source system and reference, and correction lineage via `supersedes_id` / `is_current`.

Two database constraints already enforce brief rules that most platforms implement only in the UI:

```sql
constraint price_observations_publication_guard check (
  published_at is null
  or verification_status in ('verified', 'legacy_unverified')
)
```

Nothing can be published without verification. This is brief §19's "unverified must never appear as confirmed public price", enforced in the database.

**Price types: the schema has nine, the brief lists six.** `wholesale_asking` and `wholesale_transaction` are distinct — an asking price and a completed transaction are different facts. `export_buy` and `export_sell` are likewise distinct. **These are not collapsed to match the brief.** `unspecified` is treated as unknown, never assumed.

**Classification: VERIFIED IN DATABASE.**

---

## 2. Available data sources

| Brief §6.1 source | Status |
|---|---|
| A. Field observations | **EXISTS** — full agent provenance |
| B. Published market prices | **EXISTS** — `is_public_observation()` |
| C. Verified buyer offers | **ABSENT** — no table |
| D. Verified seller offers | **ABSENT** — no table |
| E. External benchmarks | **ABSENT** — no registry, adapter or credentials |
| F. Historical records | **EXISTS (partial)** — 15 legacy daily groups |
| G. Indicative estimates | **PARTIAL** — `indicative` type exists; no estimates recorded |

**The legacy OHLC.** `audit/source/legacy-price-history.json` holds 15 daily groups, 28 price points, 5 (market, commodity) pairs. It looks like a candlestick dataset and is not usable as one:

- `volume` is an **observation count** of 1–3, not trading volume.
- Most candles are **degenerate**: `open = high = low = close`.
- The series has a **two-year gap** (2023-07-21 → 2025-07-01) and irregular intervals.
- It carries **no unit, price type, grade, currency or verification trail**.
- It enters as `legacy_unverified`, never equivalent to a verified observation.

**Classification: VERIFIED IN DATABASE (legacy), DATA-SOURCE VERIFIED (capture).**

---

## 3. Price-source architecture

`observation_market_intelligence` is the most significant finding. It records, per observation:

```
availability   scarce | limited | adequate | abundant | surplus
supply_level   very_low | low | moderate | high | very_high
demand_level   very_low | low | moderate | high | very_high
price_direction rising | stable | falling | volatile
sentiment      positive | neutral | negative
developments   free text, in the agent's words
```

**The Field app writes it. No public or admin screen reads it.** This is brief §12's fundamental intelligence engine, already sourced from real field agents, sitting unread.

Also present and unread: `market_reports`, `articles` (with `commodity_id`), `saved_commodities`, `saved_markets`, `price_alerts` (threshold amount, threshold percent, direction, channel, active flag, last triggered).

**Classification: VERIFIED IN DATABASE. Display: PLANNED.**

---

## 4. Candlestick calculation methodology

Implemented in `src/lib/trade/candles.ts`.

- **Open** = first eligible observation in the interval, by `collected_at`.
- **High** = highest eligible observation.
- **Low** = lowest eligible observation.
- **Close** = last eligible observation, by `collected_at`.
- Ties are broken by observation id, so the close does not depend on database return order.

The series must already be comparable. `buildCandles` **refuses** to aggregate an incomparable series and returns the dimensions that differ — aggregating incompatible prices produces a number that looks like a price and is not one.

A candle carries `observationCount`, `marketCount`, `sourceCount`, `isDegenerate`, `isCalculated` and `observationIds`. **There is no volume field.** A single-observation candle is flagged `isDegenerate` because open, high, low and close are then the same number — a data point, not a price range.

**Gaps are never filled.** `buildCandles` reports every missing period between the first and last candle, with a `consecutiveMissing` count so the interface can say "3 months with no data" rather than drawing three separate breaks.

**Classification: VERIFIED IN CODE (131 tests), ARCHITECTURALLY DEFINED (UI).**

---

## 5. Supported chart timeframes

| Timeframe | Offered | Minimum history |
|---|---|---|
| 15m, 30m, 1h, 4h | **NO** | — |
| Daily | Yes | 2 periods |
| Weekly | Yes | 2 periods |
| Monthly | Yes | 2 periods |
| Quarterly | Yes | 4 periods |

Intraday is absent from the code entirely. `UNSUPPORTED_TIMEFRAMES` records why, so the reason travels with the code and nobody re-adds an intraday control by accident:

> *"No sub-daily collection exists. Agents collect daily, weekly or ad hoc."*

`timeframeReadiness()` refuses a timeframe with too little history rather than rendering a single dot as a chart.

**Classification: VERIFIED IN CODE.**

---

## 6. Live-update implementation

**Not implemented.** No route consumes it yet.

The design is fixed in `classifyFreshness`: `live_feed` is reachable only through an explicit `hasLiveFeed` flag, never inferred. No random price movement, no simulated ticks. Supabase Realtime is available in the stack and is ARCHITECTURALLY DEFINED for this purpose, scoped to the selected commodity only, with subscription cleanup on route change.

**Classification: PLANNED.**

---

## 7. Market freshness rules

Two thresholds, because freshness and verification are different questions.

| Cadence | Fresh window | Verified horizon |
|---|---|---|
| daily | 36 h | 30 days |
| weekly | 8 days | 90 days |
| adhoc | 14 days | 180 days |
| no cadence declared | 30 days | 730 days |

A daily window of 36 hours means one missed day does not turn a good price stale. A missing cadence is never assumed to be daily.

Precedence, first match wins:

1. no observation → `no_data`
2. past the verified horizon → `stale`
3. non-binding price type → `indicative`
4. past the fresh window → `latest_verified` (verified) or `delayed` (not)
5. within the fresh window → `live_feed` (realtime) or `recently_updated`

**Stale outranks indicative**: an old indicative price must not be presented as merely non-binding when it is also out of date.

**A three-week-old verified price is `latest_verified`, not `stale`** — it is the best checked answer available, and calling it stale would tell a trader to ignore data they should use with care.

**Classification: VERIFIED IN CODE (24 tests).**

---

## 8. Best-buy calculation methodology

**Reframed, and the reframing is the point.**

Brief §9 is written around buyer procurement prices. No `buyer_offers` table exists. So the engine returns the **lowest verified observation** recorded for a comparable selection — not a purchasing opportunity.

Every result carries `OPPORTUNITY_DISCLOSURE`:

> *"This is the most extreme verified price recorded for a comparable selection. It is not a commercial offer, a buyer commitment or an available quantity. No seller has agreed to sell at this price."*

Unpublished observations are excluded by default. `rejected` and `draft` never appear. `legacy_unverified` is included, because the publication guard permits it, and is labelled rather than hidden.

**Classification: VERIFIED IN CODE, ARCHITECTURALLY DEFINED (UI).**

---

## 9. Best-sell calculation methodology

Identical structure, opposite direction: the **highest verified observation**. Brief §10.1 states the rule directly — *"Do not confuse a published wholesale observation with a confirmed buyer commitment"* — and the label and disclosure enforce it.

**Classification: VERIFIED IN CODE, ARCHITECTURALLY DEFINED (UI).**

---

## 10. Price-spread and margin methodology

**Spread is feasible and implemented.** `selling − buying` across comparable markets, using the most recent observation per market so a stale price cannot outrank a fresh one.

**Margin is not.** `calculateSpread` returns a permanently-unavailable `margin` assessment:

> *"No transport, handling, packaging or transaction cost is recorded in the platform, so no landed cost or net selling value can be calculated. Any figure would be invented."*

The spread carries the warnings brief §11.2 requires, each one a condition under which the figure would mislead: prices more than a week old, prices recorded on different days, supply reported scarce, no grade recorded, and always — "this is a price gap, not a profit".

**Classification: VERIFIED IN CODE.**

---

## 11. Commodity intelligence modules

Designed, not built. The modules and their real sources:

| Module | Source | Status |
|---|---|---|
| Supply intelligence | `observation_market_intelligence.supply_level`, `availability` | VERIFIED IN DATABASE |
| Demand intelligence | `observation_market_intelligence.demand_level` | VERIFIED IN DATABASE |
| Market developments | `observation_market_intelligence.developments` (agent's words) | VERIFIED IN DATABASE |
| Seasonal analysis | **no table** | PLANNED |
| Product specifications | **no table** | PLANNED — must be authored and sourced |
| Weather / logistics / macro / regulatory | **no source** | **BLOCKED** |

**A caution recorded in the audit:** brief §12.3 asks for commodity-specific seasonal calendars and warns that not every Nigerian state follows an identical agricultural calendar. A single national calendar would be wrong. Any seasonality data must be regional.

**Classification: VERIFIED IN DATABASE (supply, demand), PLANNED (seasonality, specifications), BLOCKED (weather, logistics, macro, regulatory).**

---

## 12. Fundamental information sources

`observation_market_intelligence` is the only fundamental source that exists, and it is strong: it is field-reported, per-observation, and carries the agent's own words about what changed. It has never been displayed.

`market_reports` holds authored intelligence reports with `period_start`, `period_end`, `is_premium` and `published_at`.

**Classification: VERIFIED IN DATABASE. Display: PLANNED.**

---

## 13. Forecasting methodology and limitations

**BLOCKED, and deliberately not built.**

The available history is 15 daily groups across 5 (market, commodity) pairs over two years, with a two-year hole. Non-negotiable #11 forbids publishing unsupported forecasts.

The brief permits the fallback in §13: *"If reliable forecasting is unavailable, provide a fundamental outlook rather than fabricated numerical forecasts."* That is the recommendation. A fundamental outlook reads real supply, demand, availability and direction signals and states them as observations, not predictions.

**Classification: BLOCKED.**

---

## 14. Database changes

**None. Zero migrations.**

Every implemented capability reads existing tables. The audit records the migrations that would be needed to unblock excluded features, each requiring authorisation:

| Table | Unblocks | Note |
|---|---|---|
| `buyer_offers`, `seller_offers` | §9, §10 | New commercial surface; needs verification workflow and private-data RLS |
| `price_candles` | §7 performance | Derived; must be idempotent, never authoritative |
| `commodity_specifications` | §8.4, §15 | Authored content; needs source attribution |
| `commodity_seasonality` | §12.3 | Must be regional, not national |
| `commodity_forecasts` | §13 | Blocked until history supports it |
| `external_market_feeds` | §6.1E, §12.6 | Needs credentials and server-side ingestion |

**Classification: VERIFIED IN CODE (no migration).**

---

## 15. API and server-side implementation

`src/lib/trade/` is pure logic with no database or network access — deliberately, so every rule the brief states as a non-negotiable is directly testable without a live database. No server route has been built yet.

The existing `DataSource` interface already exposes `listObservationsForAnalysis()`, described as *"All matching observations without pagination — used for aggregation"*. That is the hook the candle builder consumes.

**Classification: VERIFIED IN CODE.**

---

## 16. Admin integration

**Not built.** Brief §17 asks for ten `/admin/trade/*` routes. Four of the capabilities they manage do not exist (price feeds, buyer offers, seller offers, forecasts). The audit recommends building admin routes only for capabilities that exist: source configuration, fundamentals review and news.

**Classification: PLANNED.**

---

## 17. Security controls

Inherited from the existing platform, verified in the audit:

- **RLS decides.** `price_observations_public_read` exposes only rows where `is_public_observation()` is true — current, published, and verified or legacy_unverified. Agents see their own; staff see all.
- **No frontend-only permissions.** The publication guard is a database constraint, not a hidden button.
- **Private data.** No buyer or seller identity exists to expose, because no offers exist.
- **No secrets in the browser.** No external feed exists, so no credential could leak. Any future adapter must ingest server-side.
- **`saved_commodities`, `saved_markets` and `price_alerts` are owner-scoped by RLS.**

**Classification: VERIFIED IN DATABASE.**

---

## 18. Performance results

**None measured. No Lighthouse, LCP, INP or CLS figure exists, and none is quoted.**

There is no browser-based measurement tooling in this environment. Any number would be invented, which the standing instructions forbid.

What is designed for: `src/lib/trade/` is pure computation with no I/O, candles are computed once per request from a bounded observation set, and the brief's §20.3 requirement for incremental idempotent aggregation is recorded as a requirement for the `price_candles` table if it is ever authorised.

**Classification: UNKNOWN.**

---

## 19. Testing results

| Suite | Result |
|---|---|
| `tests/trade/freshness.test.ts` | 24 passing |
| `tests/trade/series.test.ts` | 31 passing |
| `tests/trade/candles.test.ts` | 37 passing |
| `tests/trade/opportunities.test.ts` | 39 passing |
| **New total** | **131 passing** |
| Full suite | 646 of 658 passing |
| `npx tsc --noEmit` | clean |
| `npx next build` | 49 pages, clean |

The 12 full-suite failures are all `tests/images/registry.test.ts` — the known incomplete image library (25 of 52 source originals missing). Unchanged by this work.

`npm run lint` remains broken in this project: it invokes `next lint`, which Next 16 removed. TypeScript, Vitest and `next build` are the working gates.

**A real bug was found by these tests and fixed.** `findOpportunity` and `calculateSpread` took `observations[0].seriesKey` as the reference series, so the database's return order decided which price was "comparable" and which was an outlier. The same input could give different answers on different runs. The reference is now chosen deliberately — most observations, then a comparable price type, then the lowest key id — and the fix is pinned by three tests.

**Classification: FUNCTIONALLY TESTED (engine logic), VERIFIED IN CODE.**

---

## 20. Outstanding limitations

**Blocked, requiring authorisation before any work:**

1. **No buyer or seller offers.** §9 and §10 cannot be what the brief describes.
2. **No cost data.** §9.2 landed cost, §10.2 net selling value and §11.2 margin cannot be calculated. Non-negotiable #10 forbids inventing them.
3. **No intraday candles.** §7.2's 15m–4h timeframes are not offered and must not be.
4. **No forecasts.** §13 is blocked on insufficient history.
5. **No external feeds.** §6.1E, §12.4, §12.5 and §12.6 have no source.
6. **No AI copilot.** §18 has no provider integration and unmet grounding requirements.

**Unknown, requiring measurement:**

7. **The production observation count.** The legacy capture shows 28 price points. The live database may hold more since the Field app shipped. **This must be measured before any "commodities tracked" metric is published.**
8. **No responsive measurement** at 320/360/375/390/430 px, tablet or desktop.
9. **No performance measurement.**
10. **No browser verification.** Nothing in this report is VERIFIED IN UI.

**Not built:**

11. No `/trade` route exists. This commit is the audit and the engine only. Phases 3 to 7 — terminal, dashboard, commodity depth, fundamentals, news, watchlist, alerts, admin integration, testing and release — remain.

---

## Classification summary

| Capability | Classification |
|---|---|
| Price observation data model | VERIFIED IN DATABASE |
| Publication guard | VERIFIED IN DATABASE |
| Field intelligence collection | VERIFIED IN DATABASE |
| Field intelligence **display** | PLANNED |
| Commodity news (`articles`) | VERIFIED IN DATABASE / PLANNED |
| Watchlist and alerts | VERIFIED IN DATABASE / PLANNED |
| Verified unit conversions | VERIFIED IN DATABASE |
| Comparability engine | VERIFIED IN CODE |
| Freshness classification | VERIFIED IN CODE |
| OHLC aggregation | VERIFIED IN CODE |
| Gap and degenerate-candle handling | VERIFIED IN CODE |
| Timeframe restriction | VERIFIED IN CODE |
| Best buy / best sell (reframed) | VERIFIED IN CODE / ARCHITECTURALLY DEFINED |
| Price spread | VERIFIED IN CODE |
| Cost, landed cost, margin | **BLOCKED** — no data |
| Intraday candlesticks | **NOT FEASIBLE** — no sub-day collection |
| Fundamental outlook | ARCHITECTURALLY DEFINED / PLANNED |
| Numerical forecasts | **BLOCKED** — insufficient history |
| Buyer and seller offers | **BLOCKED** — no table |
| External feeds, weather, logistics, macro, regulatory | **BLOCKED** — no source |
| AI copilot | **BLOCKED** — no provider |
| Realtime updates | ARCHITECTURALLY DEFINED |
| Route architecture | ARCHITECTURALLY DEFINED |
| Admin integration | PLANNED |
| Security and RLS | VERIFIED IN DATABASE |
| Performance | **UNKNOWN** — not measured |
| Responsive behaviour | **UNKNOWN** — not measured |
| Browser verification | **UNKNOWN** — no route opened |
| Production observation count | **UNKNOWN** — must be measured |

---

## Addendum — commercial offers, security corrections, and the API free tier

This addendum records work done after the report above. It is written in the
same classification the brief requires, and it records two defects found in the
project's own code rather than describing intent.

### 1. The commercial offer layer (brief §9/§10, §11, §20)

The Phase Zero audit found that `buyer_offers` and `seller_offers` did not exist
and that best buy / best sell therefore had to be reframed as "lowest and highest
verified observation". The user chose **"with_offers"** — build the full
verification workflow, RLS and admin screens, with the tables starting empty and
the screens showing honest empty states.

Migration `0026_commercial_offers.sql` creates `buyer_offers` and
`seller_offers` as tables separate from `price_observations`. That separation is
the design decision: **an offer is a commitment by a named party, not a market
fact**, so it is never joined into the published price series and never
aggregated into a candle. Public read requires three conditions together:

- `status = 'verified'`
- `disclosure_consent = true` — the party authorised publication
- an unexpired validity window

Migration `0027_offer_workflow.sql` adds `update_offer_status()`, which is the
only path that changes a status. It writes the verification event and the audit
entry in the same call, so a status cannot change without a record. It refuses a
reasonless rejection and a reasonless revert of a verified offer, and it is
idempotent — a repeated decision changes nothing and adds no duplicate event.

### 2. Two defects found by testing, and fixed

Both were found by executing the workflow rather than reading it. Neither was
visible in the UI, because neither has a UI yet.

**Defect 1 — `update_offer_status()` performed no permission check.**
`/tmp/offer-test2.js` (now `scripts/verify_offer_workflow.mjs`) ran the whole
workflow as a real non-staff user and found that the call succeeded. The function
is `security definer`, so RLS never applied to it — the RLS policies stopped a
direct write to the row, but the function was a bypass that let any authenticated
user verify their own offer and have it published as a verified commercial
opportunity. Fixed by adding `if not public.is_staff() then raise exception`
inside the function (migration `0027` corrected, `0028` applies it to databases
that already ran 0027). This is exactly what brief §21 means by permissions
enforced server-side and in the database, not only by hiding buttons.

**Defect 2 — four analytical tables had no row-level security.**
`scripts/validate_migrations.sh` failed with
`tables without RLS: commodity_fundamentals, commodity_seasonality,
commodity_specifications, price_source_registry`. Migration `0024` created them
with no policies at all. On a table without RLS, `anon` and `authenticated` keep
whatever table grants the host issues, and Supabase's default is `all` — so any
user could have rewritten the platform's specifications, seasonal calendars and
fundamentals. Fixed in `0024` and applied to the live database by `0029`.

A third, smaller gap surfaced from the same run: `0009_grants.sql` grants only
the tables that existed when it ran, so tables created afterwards depended on the
host's implicit default. That made the cold-start validator fail with a *grant*
error that looked like an RLS failure. Migration `0030` makes the grants explicit
so the schema means the same thing on any host and the validator tests policies
rather than missing privileges.

### 3. A bug in the public API free tier

`scripts/verify_launch.sh` dropped from 92/5 to 89/8 once `.env.local` configured
Supabase. The three new failures were all API checks: `reports API responds`,
`latest prices API responds`, `public price API is reachable without a key`.

The cause is in `src/lib/api/auth.ts`. `authenticateApiKey()` had its keyless
branch *after* the `isSupabaseConfigured()` branch, so with a configured project
every keyless request returned 401. Free public price discovery was closed off
entirely. Three independent artifacts of this repository describe the intended
behaviour and were contradicted by the code: the `anonymousRateLimit` option in
`HandlerOptions` ("Free-tier rate limit used when no API key is supplied"), the
`/api-docs` page ("the endpoints below are read-only and currently open"), and
the launch gate's own check.

Fixed by moving the keyless branch before the database lookup. A keyless caller
is admitted to any endpoint that does not require a scope, metered at
`anonymousRateLimit` (default 120/min) per client address. Every `/api/v1`
endpoint is a read-only view of published data — the same data the public
website already renders, behind the same RLS policies — and no `/api/v1` route
declares a `scope`.

`tests/api-auth.test.ts` pins the contract with four assertions, including one
that sets the Supabase variables so it exercises the configured case that
regressed. The test was verified to fail against the original code before being
accepted. Key validation is unaffected: a supplied key still goes to the database
lookup and never falls back to the anonymous tier.

### 4. Verification actually executed

| Gate | Result |
| --- | --- |
| `scripts/validate_migrations.sh` (cold-start, all 29 migrations) | **all applied cleanly** |
| RLS permission tests | **201 statements, all assertions pass** (was 169) |
| Operations workflow tests | **346 statements, all assertions pass** |
| Leftover fixture rows | **none** |
| `scripts/verify_offer_workflow.mjs` (live Supabase, one rolled-back transaction) | **14/14 pass** |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | **668/680** |
| `npx next build` | 49 pages, all `/trade/*` emitted |
| `scripts/verify_launch.sh http://localhost:3100` | **92 pass / 5 fail** |

The 12 vitest failures and 5 launch-gate failures are all the same known cause:
27 of 52 registered image sources have no file in `public/images/hatsi360/`.
No test or check fails for any other reason.

### 5. What remains unverified

Stated plainly, because the brief forbids claiming otherwise.

- **No `/trade` route has been opened in a browser.** No authenticated journey
  has been run against the live Supabase instance.
- **No responsive measurement** at 320/360/375/390/430 px, tablet or desktop.
- **No Lighthouse, LCP, INP, CLS or query timings.** The Core Web Vitals targets
  remain targets; nothing has been measured.
- **No Playwright suite.**
- **The offer screens do not exist yet.** The workflow is verified at the
  database layer only. `buyer_offers` and `seller_offers` contain 0 rows.
- **The public observation count is still zero.** All 29 migrations are applied
  to project `umxzsdepbrenqysabtlt` and every data table is empty. The terminal
  is architecturally complete and has nothing to display; every page therefore
  renders its empty state, which is the honest outcome rather than a defect.
- **`npm run lint` is still broken** (`next lint` was removed in Next 16), so
  TypeScript, Vitest, `next build` and the two verification scripts are the
  working gates.
