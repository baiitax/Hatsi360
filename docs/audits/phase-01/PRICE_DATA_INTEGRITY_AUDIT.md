# Phase 01 — Price Data Integrity Audit

**Verified against the live database on 2026-11-13** by read-only queries. All counts below were
measured, not estimated.

---

## 1. What the schema protects — and protects well

The agricultural market data model is the most carefully built part of this platform. It solves, at
the database level, the exact problems the trade brief calls out.

| Requirement | Implementation |
|---|---|
| Never mix incompatible grades/units/price types | `price_type` (8-value enum), `grade_id`, `reported_unit_id` and `normalized_unit_id` are all **NOT NULL or FK-constrained** on every row; `market_price_summary` groups by all of them |
| Preserve provenance | `source_system*`, `source_reference`, `agent_user_id`, `collected_at*`, `submitted_at`, `verified_at`, `published_at` |
| Preserve history | `supersedes_id` / `superseded_by` / `is_current` self-FKs; `price_revision_history`; `append_correction()` |
| Never label unverified as verified | `verification_status` enum + `price_observations_publication_guard` CHECK |
| Separate approval from publication | `verified_at` and `published_at` are distinct columns; `approve_observation` does not publish |
| Idempotency | unique partial index on `submission_key` |
| Duplicate suppression | unique partial index `price_observations_duplicate_guard` |
| Honest timestamps | `collected_at_precision` enum + `timestamp_precision` |
| Unit normalisation | `normalized_amount`, `normalized_unit_id`, `package_weight_kg`, `package_count`, `commodity_unit_conversions` |
| Currency | `currency_code` on every row (NOT NULL) |
| Corrections preserve lineage | `append_correction()` is append-only; `price_observations_prevent_published_mutation` blocks in-place edits to published economics |

**This schema satisfies the trade brief's data-integrity requirements by construction.** Any
Phase 02 work must preserve it.

## 2. Current data volume — measured

```
price_observations                         58 rows
  distinct commodities                      16
  distinct markets                           5
  distinct price_types                       5   (farmgate, wholesale_asking,
                                                   wholesale_transaction, retail,
                                                   indicative)
  distinct grades                           16
  earliest collected_at     2026-10-28T19:24:34.419Z
  latest collected_at       2026-11-10T23:19:34.419Z
  published_at NOT NULL                      0
```

### Verification status distribution

| Status | Rows |
|---|---|
| `submitted` | 17 |
| `verified` | 11 |
| `rejected` | 9 |
| `pending_verification` | 8 |
| `draft` | 7 |
| `correction_requested` | 6 |
| `legacy_unverified` | 0 |
| **Total** | **58** |

### `verified_by` provenance

- 11 rows → `demo.verifier@hatsi360.test` (the verification officer)
- **1 row → `demo.admin@hatsi360.test`** ← the P0 finding in `SECURITY_AND_RLS_AUDIT.md` §1

The 11 verifier rows are consistent with the demo workflow. The single admin row is not.

## 3. `published_price_observations` — 0 rows

The public view filters on `is_current AND published_at IS NOT NULL AND verification_status IN
('verified','legacy_unverified') AND source_* <> 'test_fixture'`.

Measured: **0 rows**. Confirmed across four roles (`anon`, `agent`, `verification_officer`,
`admin`) — identical counts, so this is a genuine data condition, not a policy artifact.

**Consequence:** every public price surface — `/prices`, `/prices/[commodity]`, `/markets/[slug]`,
`/compare`, `/trade/*` — renders its honest empty state. This is **correct behaviour**, not a defect.
The platform has never published a price.

## 4. Comparability — where the model is strong and where it will need help

**Strong:** grade, unit, price type and currency are all first-class and mandatory. A chart or
comparison that mixes them would have to ignore the schema.

**Weak — and it is a data weakness, not a schema weakness:**

- **`normalized_amount` is NULL on most rows.** Cross-unit comparison relies on it. With
  `commodity_unit_conversions` empty (0 rows) and `normalized_unit_id` unset, no row has actually
  been normalised.
- **16 commodities have observations but 6 do not** — 22 commodities exist, 16 have any observation.
- **Only 5 of 11 markets report** — so "market-to-market comparison" compares 5 markets, and only
  for 16 of 22 commodities.
- **No grade coverage for 6 of the 16 observed commodities.**

## 5. Historical price integrity

| Property | Status |
|---|---|
| History preserved (append-only) | ✅ `append_correction()`, `price_revision_history` |
| Published rows immutable | ✅ `prevent_published_economic_mutation` trigger |
| Versioning chain | ✅ `supersedes_id` / `superseded_by` / `is_current` |
| Audit trail | ✅ `audit_observation_change()` trigger |
| Duplicate suppression | ✅ unique partial index |
| Time-series depth | ❌ **14 days** of observations (2026-10-28 → 2026-11-10) |
| Seasonal series | ❌ `commodity_seasonality` empty |
| Fundamental series | ❌ `commodity_fundamentals` empty |

**A 14-day, 58-row fixture cannot support any of the analytical methods in Capability B–F.**
Any chart, forecast, or trend in Phase 02 must either (a) be built to *decline gracefully* when
series are short, or (b) be fed by a real collection programme. **It must not be fabricated.**

## 6. Observation frequency vs. analytical capability

| Capability | Requires | Current data | Verdict |
|---|---|---|---|
| **B — Commodity Intelligence** (latest price, trend, movers) | ≥2 observations per commodity/market | 58 rows / 5 markets | **Possible, thin** |
| **C — Charts / Analytics** (price history line) | ≥30 days daily series | 14 days, uneven | **Possible, honest thin series** |
| **C — OHLC / candlesticks** | intraday multiple prices per day | one price per commodity/market/date | **NOT SUPPORTED** — and `market_price_summary` is median-based, so it cannot synthesise candles |
| **D — Trade Intelligence** (best-buy/best-sell) | ≥2 verified published observations | **0 published** | **Blocked on publication** |
| **E — Fundamental Intelligence** | fundamentals, seasonality, specs, reports | all empty | **Blocked on data** |
| **F — Personalisation** | watchlists + alerts + published prices | watchlists ✅, alerts ✅, prices ❌ | **Partially blocked** |
| **G — Research / AI Analyst** | reports, articles, auditable method | all empty | **Blocked on data** |

**The 15-minute-candle idea from the trade brief must not be implemented.** With one observation per
commodity/market/day, an intraday candle series would be fabricated. The existing `trade/candles.ts`
is careful about this and must be reviewed for any residual assumption of intraday availability.

## 7. Where data integrity is at risk

| # | Risk | Severity |
|---|---|---|
| PDI-1 | `demo.admin` verified a fixture (P0 finding). `verified_by` is no longer exclusively the verification officer. | **P0** |
| PDI-2 | Nothing is published, so the public product shows no prices. | **P1** |
| PDI-3 | `normalized_amount` unused; `commodity_unit_conversions` empty → cross-unit comparison is not actually normalised. | P2 |
| PDI-4 | `price_revision_history` empty although `append_correction` exists — lineage tables unused. | P3 |
| PDI-5 | `data_quality_flags` empty; `quality_flags` column unpopulated → the quality subsystem is architecturally defined only. | P3 |

## 8. Recommendations (not applied)

1. Rotate/remove the demo admin account — **P0**, see `REMEDIATION_BACKLOG.md` R-01.
2. Establish a **real** publication path: something must be verified *and* published before the
   public product can show a price. Decide whether legacy rows may be marked `legacy_unverified`
   and published (the enum and the view both already anticipate this).
3. Populate `commodity_unit_conversions` before enabling any cross-unit comparison surface.
4. Populate `markets.latitude`/`longitude` from a **verified** source — never invented — before any
   map feature.
5. Keep `normalized_amount` NULL rather than computing it silently; a NULL normalisation is honest.
