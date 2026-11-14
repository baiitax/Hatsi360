# Hatsi360 Markets — Page Design Specifications

**Phase 02 · The seven page prototypes**
Status: **Implemented and verified.** All seven routes render. All seven render their honest empty
state, because the platform currently holds **0 published price observations** — which is the
truthful state, not a defect.

---

## 0. The state of the data, stated once

Verified against the live database:

| Measure | Value |
|---|---|
| `price_observations` | 58 rows |
| `verification_status` | submitted 16 · verified 12 · rejected 9 · draft 7 · pending 7 · correction_requested 7 |
| `published_at IS NOT NULL` | **0** |
| `published_price_observations` (the public view) | **0 rows** |
| Markets | 11 (all active) |
| Commodities | 22 (21 active) |
| Latest `collected_at` | 2026-11-10T23:19:34Z |
| `observation_market_intelligence` | 0 rows |

Every public price surface reads the `published_price_observations` view, which filters on
`is_current AND published_at IS NOT NULL AND verification_status IN ('verified','legacy_unverified')
AND source_* <> 'test_fixture'`. With zero published rows, every analytical section correctly
reports that it has nothing.

**This is the designed behaviour.** The platform has never published a price. A terminal that
invented one would be worse than a terminal that says so.

---

## 1. Markets homepage — `/`

**No corporate hero.** The page opens with the data.

Order:

1. **Page header** — title, one-line purpose, actions.
2. **Market overview** — four `MarketOverviewCard`s: commodities, markets, published observations,
   commodities with movement.
3. **Market watch** — `MarketWatchTable` with `MarketWatchCards` as the mobile alternative.
4. **Movers** — gainers and decliners side by side.
5. **Price history** — `PriceHistorySummary`, labelled a derived aggregation.
6. **Intelligence entry points** — trade and fundamentals previews.
7. **Coverage** — `MarketCoverageSummary`.

Every movement on the page comes from `getMarketMovements`. The page never computes a movement
itself, so it cannot compute one wrongly.

The page is `dynamic = 'force-dynamic'` and uses `title: { absolute: … }` to avoid the root layout's
`title.template` doubling the brand name.

---

## 2. Commodity directory — `/commodities`

A working register, not a gallery. Each commodity shows its observation count, its market count and
its freshness state, so the directory answers "is there anything here for me?" without a click.

**Preserved behaviour:** the legacy `?id=` link from `commodity-detail.php` still resolves — it
redirects to `/prices/<slug>` rather than 404ing. Category filter and pagination are preserved.

The catalogue is **complete on purpose**: a commodity with no published observation is still listed,
because its absence from the price record is itself information.

---

## 3. Commodity profile — `/commodities/[slug]`

The register view of one commodity. Deliberately **not** the deep price view — that is
`/prices/<slug>`, which keeps the photographic hero, the history chart and the full observation list.

Sections:

1. **The record** — observations, reporting markets, units quoted, grades recorded. A `null` count
   renders "Not available" with a reason.
2. **Movement** — only where a comparable previous observation exists, with the full
   arrow + sign + value contract.
3. **Comparable series** — from `getCommoditySeriesOptions`, because a price in one series is not
   comparable with a price in another.
4. **Reporting markets** — the most recent published observation per market, with unit, grade,
   verification and observation date.
5. **The range selector** — the same `PRICE_RANGES` keys as the price view, so an existing link
   still lands on the window it asked for.

**The range is anchored to the newest observation in the record, not to the wall clock.** A record
whose latest observation is a week old should show its own last ninety days, not a window that ends
a week before today and silently drops the most recent data.

---

## 4. Trade intelligence — `/trade`

Four questions, answered in order: what is covered, what is moving, where the best prices were, how
fresh the data is. Six KPI cards, gainers and decliners, the movement table, the freshness table.

Every column the market table system names is present: commodity, market, price, currency, unit,
price type, grade, movement, last observed, verification.

---

## 5. Fundamentals — `/trade/fundamentals`

Field-reported supply, demand, availability and market conditions, quoted verbatim and attributed to
the market and date they came from.

**What is not shown is stated on the page:** seasonal calendars, weather, production estimates, trade
policy, currency and logistics factors, and model-generated projections are absent, because the
platform has no verified source for them. The panels that would hold them are absent rather than
empty — a panel that says "unavailable" on every page is noise.

Currently 0 field reports exist, so the page renders the `no-fundamentals` empty state, which names
the situation and says what would change it.

---

## 6. Charts — `/charts`

The chart workspace. A commodity/series/period GET form.

- **Only daily, weekly, monthly and quarterly** are offered. Intraday is not offered, and the page
  says so, because with one observation per commodity/market/day an intraday candle series would be
  fabricated.
- `PeriodRangeChart` is labelled a **range bar**, and its caption states *"This is dispersion, not a
  trading range."*
- The observations behind the chart are listed beneath it.
- Three methodology cards: one series never a blend · a range not a candle · gaps stay gaps.

---

## 7. Research — `/insights`

The long-form surface, and the one place the terminal uses the **light editorial** environment: a
brief is read, not scanned.

Preserved: the insight grid, the registry-matched images, the reading times, the "Publication date
not recorded" honesty for the undated archive entries, and the note on forecasts — the predecessor
displayed a "Price Forecast" figure without a method; it was removed and the removal is stated.

The published reports are listed as a compact terminal panel beneath the briefs.

---

## 8. How these pages were verified

```bash
# Every route renders
for r in / /commodities /commodities/paddy-rice /trade /trade/fundamentals /insights /charts; do
  curl -s -o /dev/null -w "%{http_code}  $r\n" "http://127.0.0.1:3111$r"
done

# The streamed content is real, not just the loading fallback
curl -s http://127.0.0.1:3111/commodities/paddy-rice | grep -o 'No observations recorded'
```

The production build compiles, `tsc --noEmit` exits 0, and ESLint reports **0 errors** across the
Phase 02 code.
