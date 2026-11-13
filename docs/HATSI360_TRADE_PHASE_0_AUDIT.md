# HATSI360 TRADE INTELLIGENCE — PHASE ZERO AUDIT

**Deliverable:** verified data capability report (brief §2.4, Phase 1)
**Date:** 2026-10-22
**Scope:** existing Hatsi360 application, database schema, price records, verification workflow, public and admin surfaces
**Method:** direct inspection of 22 SQL migrations, 55 tables, 26 public routes, 28 admin routes, the analytics and data layers, and the migrated legacy dataset. No assumptions were carried in from the brief.

---

## 1. Headline finding

**The brief asks for a trading terminal. The data supports a price-intelligence terminal.**

Hatsi360 is not missing a front end. It is missing a *terminal-shaped* read of data it already collects well. The gap is one of presentation and derived analysis, not of collection.

Three of the brief's headline features are **not supportable by the current schema**, and building them would require either inventing data or a schema expansion that must be authorised first:

| Brief feature | Verdict | Why |
|---|---|---|
| Intraday candlesticks (15m–4h) | **NOT FEASIBLE** | `collection_frequency` is `('daily','weekly','adhoc')` and `timestamp_precision` is `('minute','date')`. There is no sub-day collection model. |
| Buyer and seller offers | **NOT FEASIBLE** | No `buyer_offers` or `seller_offers` table exists. Nothing in the schema represents a commercial offer. |
| Landed cost and trading margin | **BLOCKED** | No transport, handling, packaging or transaction cost is recorded anywhere. Non-negotiable #10 forbids inventing them. |

Conversely, four capabilities the brief treats as future work **already exist and are unread**:

| Capability | Existing asset |
|---|---|
| Fundamental supply/demand intelligence | `observation_market_intelligence` — written by the Field app, **read by no public or admin screen** |
| Intelligence reports | `market_reports` |
| Commodity news | `articles` (with `commodity_id`, `is_published`, `published_at`) |
| Watchlist and price alerts | `saved_commodities`, `saved_markets`, `price_alerts` |

The single most valuable finding in this audit: **the platform already collects field-reported supply levels, demand levels, availability, price direction and market sentiment for every observation, and nothing displays it.** That is the brief's §12 fundamental intelligence engine, already sourced from real field agents.

---

## 2. The price data model

`public.price_observations` is well designed and already satisfies most of brief §6.1. Every field the brief asks to preserve is present:

```
commodity_id, market_id, variety_id, grade_id, price_type
reported_amount, reported_unit_id, package_weight_kg, package_count
normalized_amount, normalized_unit_id          -- NULL when conversion unknown/unverified
currency_code
collected_at, collected_at_precision, submitted_at, verified_at, published_at, rejected_at
agent_user_id, verified_by
verification_status
notes, source_system, source_reference
supersedes_id, is_current                       -- correction lineage
created_at, updated_at
```

Two constraints already enforce the integrity rules the brief restates:

```sql
constraint price_observations_publication_guard check (
  published_at is null
  or verification_status in ('verified', 'legacy_unverified')
)
```

Nothing can be published without having been verified. This is brief §19's "unverified must never appear as confirmed public price", already enforced in the database rather than in the UI.

```sql
constraint price_observations_amount_present check (
  reported_amount is not null or normalized_amount is not null
)
```

`normalized_amount` is explicitly nullable and the column comment records *why*: "NULL when the conversion is unknown or unverified." The schema refuses to normalise what it cannot verify — which is precisely the behaviour brief §12 demands.

**Price types (9, not 6).** The brief §11 lists six price types. The schema has nine:

```
farmgate, wholesale_asking, wholesale_transaction, retail,
processor_procurement, export_buy, export_sell, indicative, unspecified
```

`wholesale_asking` and `wholesale_transaction` are distinct — an asking price and a completed transaction are different facts. `export_buy` and `export_sell` are likewise distinct. **Do not collapse these to match the brief's list of six.** The schema is more granular than the brief, and the extra granularity is correct. `unspecified` exists and must be treated as an unknown, never assumed to be any particular type.

**Sources are already classified.** `source_system` is `('legacy_import','agent_app','manual_entry')`. Brief §6.1's categories A, B and F map onto existing columns; C, D and E (offers, external feeds) have no representation at all.

---

## 3. Candlestick feasibility — the decisive constraint

This is the finding that most changes the brief's shape.

### 3.1 The collection model has no sub-day resolution

```sql
create type public.collection_frequency as enum ('daily', 'weekly', 'adhoc');
create type public.timestamp_precision  as enum ('minute', 'date');
```

The fastest configured collection cadence is **daily**. `timestamp_precision` allows a minute clock time to be recorded, but nothing in the system *collects* at minute intervals — a single agent at a single market produces at most a handful of observations per day.

Brief §7.2 anticipates exactly this: *"If agents submit one observation per day, do not generate convincing 15-minute candles from daily data."* Non-negotiable #4 repeats it. **15-minute, 30-minute, 1-hour and 4-hour candles must not be built.** Offering the control and rendering a chart would be fabrication.

### 3.2 The legacy OHLC is not what it appears

The migrated legacy dataset contains pre-computed OHLC — `audit/source/legacy-price-history.json`, 15 daily groups, 28 price points, across 5 (market, commodity) pairs. It looks like a candlestick dataset. It is not usable as one:

**`volume` is an observation count, not trading volume.** Every row carries `volume: 1`, `2` or `3`. The legacy site was dividing 1–3 reported prices per day into OHLC. Brief §7.4 and non-negotiable #6 both prohibit labelling this as volume.

**Most candles are degenerate.** A single-observation day produces:

```json
{"open": 41550.75, "high": 41550.75, "low": 41550.75, "close": 41550.75, "volume": 1}
```

Open = high = low = close. A candlestick drawn from that is a horizontal dash that *looks* like a settled market price. Brief §7.6 forbids implying observations occurred that did not.

**The series has real gaps and irregular intervals:**

```
market 1 / commodity 1:  2023-07-20, 2023-07-21,  [2-year gap]  2025-07-…
market 1 / commodity 21: 2025-06-29, 2025-07-02,  2025-07-14
```

**It carries no comparability metadata.** The capture README states it plainly: *"carry no unit, price type, collection time or verification trail."* So legacy OHLC cannot be merged with observation-derived series — they share no compatibility key.

**It is unverified by construction.** Legacy imports enter as `legacy_unverified`, permitted by the publication guard but never equivalent to a verified observation.

### 3.3 What is feasible

| Timeframe | Verdict | Condition |
|---|---|---|
| 15m, 30m, 1h, 4h | **DO NOT BUILD** | No sub-day collection exists |
| Daily | **FEASIBLE** | Gaps stay visible; single-observation candles disclosed |
| Weekly | **FEASIBLE** | Only where ≥2 observations per week exist |
| Monthly | **FEASIBLE** | Only with sufficient history |
| Quarterly | **FEASIBLE** | Only with ≥2 years of history |

Every candle must carry its observation count, its market coverage and its aggregation basis, per brief §7.5.

### 3.4 An honest chart already exists

`src/components/data/PriceChart.tsx` already renders the correct primitive for sparse agricultural data:

> *"The shaded band is the observed range (min–max) for each day and the line is the median. The band is deliberately visible so a single day with one report does not look like a settled market price."*

**This is the honest alternative to a candlestick, and it is already built and in production.** The terminal must not render a *less* honest chart than the one it replaces. Any candlestick view must be additive and must disclose the same information.

---

## 4. Available data sources inventory

| Brief §6.1 source | Status | Asset |
|---|---|---|
| A. Field observations | **EXISTS** | `price_observations` with full agent provenance |
| B. Published market prices | **EXISTS** | `verification_status` + `published_at`, `is_public_observation()` |
| C. Verified buyer offers | **ABSENT** | No table |
| D. Verified seller offers | **ABSENT** | No table |
| E. External benchmarks | **ABSENT** | No feed registry, no adapter, no credentials |
| F. Historical records | **EXISTS (partial)** | 15 legacy daily groups + `price_revision_history` |
| G. Indicative estimates | **PARTIAL** | `indicative` price type exists; no estimates are recorded |

`price_revision_history` exists and preserves the correction lineage brief §16 demands — corrections never overwrite, they supersede (`supersedes_id` / `is_current`).

---

## 5. Capability map against the brief

### Feasible now, on real data

| Brief § | Capability | Source |
|---|---|---|
| 4 | Market overview and movement | `price_observations` (published only) |
| 5 | Terminal shell, watchlist, market data panel | `commodities`, `markets`, `price_observations` |
| 6.2 | Price freshness states | `collected_at` + `collected_at_precision` |
| 7.1–7.6 | Daily/weekly/monthly OHLC with provenance | Aggregation over `price_observations` |
| 8.1–8.3 | Commodity overview, performance, charts | `commodities` + observations |
| 11 | Market comparison and spread | `compare` route exists; spread is arithmetic |
| 12.1–12.3 | Supply, demand, seasonal intelligence | **`observation_market_intelligence` — unread** |
| 14 | Commodity news | `articles` |
| 16 | Product specifications | **ABSENT** — must be authored, clearly labelled |
| 19 | Watchlist and alerts | `saved_commodities`, `saved_markets`, `price_alerts` |

### Blocked, with the reason

| Brief § | Capability | Blocker |
|---|---|---|
| 9 | Best buy with offers, landed cost | No offers table; no cost data |
| 10 | Best sell with offers, net value | No offers table; no cost data |
| 11.2 | Trading margin | No cost data |
| 12.4 | Weather and climate | No provider, no credentials, no adapter |
| 12.5 | Logistics intelligence | No cost or route data |
| 12.6 | Macro/currency | No FX feed |
| 12.7 | Regulatory | No verified regulatory source |
| 13 | Numerical forecasts | 15 daily groups over 2 years across 5 pairs. Non-negotiable #11 forbids unsupported forecasts. |
| 18 | AI copilot | No LLM provider integration; §18's grounding requirements are unmet |

### Reframed rather than built

**Best buy and best sell (§9, §10).** Without offers, these cannot be what the brief describes. What the data *does* support, honestly:

- **Best buy** = the market with the lowest **verified published observation** for a comparable commodity/grade/unit/price type/currency. This is "where the cheapest verified price was last recorded", which is a real and useful signal — but it is *not* a purchasing opportunity, and must not be labelled as one.
- **Best sell** = the market with the highest verified published observation. Again, not a buyer commitment.

The screen must say which of the two it is showing. Brief §10.1 itself warns: *"Do not confuse a published wholesale observation with a confirmed buyer commitment."*

**Spread (§11).** `selling price − buying price` across comparable markets is pure arithmetic on real data and is feasible. **Margin is not** — it requires the costs that do not exist.

**Forecasting (§13).** The brief explicitly permits the fallback: *"If reliable forecasting is unavailable, provide a fundamental outlook rather than fabricated numerical forecasts."* That is the recommendation. A fundamental outlook reads real supply/demand/seasonality signals from `observation_market_intelligence` and states them as observations, not predictions.

---

## 6. Route architecture recommendation

The brief asks for 14 `/trade/*` routes and warns: *"Adapt routes to the existing architecture and avoid duplicate commodity pages."* Four of the requested routes duplicate existing public pages:

| Requested route | Existing route | Recommendation |
|---|---|---|
| `/trade/commodities/[slug]` | `/commodities/[slug]` | **Enhance the existing page.** Do not create a second commodity detail page. |
| `/trade/market-comparison` | `/compare` | **Enhance the existing page.** |
| `/trade/news` | `/insights` | **Enhance**, or add a commodity-filtered view |
| `/trade/reports` | `/reports` | **Do not duplicate.** |

The brief also specifies both `/trade/commodities/[slug]` and `/trade/commodity/[slug]/analysis` — singular and plural. That is an internal inconsistency in the brief; the recommendation is one commodity detail page, enhanced.

**Proposed routes (new only):**

```
/trade                    dashboard — market movement, highlights, activity
/trade/terminal           the terminal
/trade/best-buy           lowest verified comparable observation
/trade/best-sell          highest verified comparable observation
/trade/fundamentals       supply/demand/seasonality from field intelligence
/trade/watchlist          saved commodities and markets
/trade/alerts             price alert configuration
```

Six new routes, no duplicates. Admin integration (§17) adds `/admin/trade` sub-routes only for capabilities that actually exist — source configuration, fundamentals review, news, and feed monitoring are all **PLANNED** rather than built.

---

## 7. Database migration assessment

**No migration is required for the recommended scope.** Every recommended capability reads existing tables.

Migrations would be needed only to unblock the excluded features, and each requires authorisation:

| Proposed table | Unblocks | Risk |
|---|---|---|
| `buyer_offers` / `seller_offers` | §9, §10 | New commercial surface; needs verification workflow, RLS, private-data protection |
| `price_candles` | §7 performance | Derived data; must be idempotent and never authoritative |
| `commodity_specifications` | §8.4, §15 | Authored content; needs source attribution |
| `commodity_seasonality` | §12.3 | Regional variation is real; a single national calendar would be wrong |
| `commodity_forecasts` | §13 | Must be blocked until history supports it |
| `external_market_feeds` | §6.1E, §12.6 | Needs credentials and a server-side ingestion adapter |

**Recommendation: build the read layer first, on zero migrations.** Prove the analysis is useful before expanding the schema. This also satisfies the standing instruction that no destructive or unnecessary migration be performed without authorisation.

---

## 8. What this audit does not verify

- No route has been opened in a browser. Everything here is **VERIFIED IN CODE** or **VERIFIED IN DATABASE**.
- No authenticated journey has run against a live Supabase instance. The observation counts quoted are from the migrated legacy fixture, not from production.
- **The production observation count is UNKNOWN.** The legacy capture shows 28 price points. The live database may hold more from Field app collection since migration. This must be measured before any "commodities tracked" metric is published.
- No responsive, performance or Lighthouse measurement exists.

---

## 9. Roadmap

**Phase 2 — Price intelligence foundation (this deliverable's successor).**
Freshness classification, comparable-series selection, OHLC aggregation with gap and degenerate-candle handling, and the opportunity/spread arithmetic. Pure logic, fully unit-tested, no migration.

**Phase 3 — Terminal and dashboard.**
`/trade` and `/trade/terminal`, consuming Phase 2.

**Phase 4 — Commodity depth.**
Enhance `/commodities/[slug]` with performance, market comparison and field intelligence.

**Phase 5 — Fundamentals, news, watchlist, alerts.**
Read `observation_market_intelligence`, `articles`, `saved_*`, `price_alerts`.

**Phase 6 — Admin integration.**
Only for capabilities that exist.

**Phase 7 — Testing and release.**

Blocked phases (offers, forecasts, external feeds, AI copilot) are recorded as **BLOCKED** with their specific blockers, and are not scheduled.

---

## 10. Classification summary

| Capability | Classification |
|---|---|
| Price observation data model | VERIFIED IN DATABASE |
| Publication guard (no unverified publication) | VERIFIED IN DATABASE |
| Field intelligence collection | VERIFIED IN DATABASE |
| Field intelligence **display** | **PLANNED** — collected, unread |
| Commodity news | VERIFIED IN DATABASE / PLANNED (UI) |
| Watchlist and alerts | VERIFIED IN DATABASE / PLANNED (UI) |
| Verified unit conversions | VERIFIED IN DATABASE |
| Intraday candlesticks | **NOT FEASIBLE** — no sub-day collection |
| Daily/weekly/monthly OHLC | ARCHITECTURALLY DEFINED / PLANNED |
| Buyer and seller offers | **BLOCKED** — no table |
| Landed cost and margin | **BLOCKED** — no cost data |
| Price spread | ARCHITECTURALLY DEFINED / PLANNED |
| Best buy / best sell | ARCHITECTURALLY DEFINED / PLANNED (reframed, no offers) |
| Fundamental intelligence | VERIFIED IN DATABASE / PLANNED (UI) |
| Weather, logistics, macro, regulatory | **BLOCKED** — no source |
| Numerical forecasts | **BLOCKED** — insufficient history |
| Fundamental outlook | ARCHITECTURALLY DEFINED / PLANNED |
| AI copilot | **BLOCKED** — no provider integration |
| Live external feed | **BLOCKED** — no feed, no credentials |
| Realtime updates | ARCHITECTURALLY DEFINED (Supabase Realtime available) |
| Route architecture | ARCHITECTURALLY DEFINED |
| Production observation count | **UNKNOWN** — must be measured |
