# Hatsi360 — Commodity, Unit & Grade Standard

| | |
|---|---|
| Date | 2026-11-26 |
| Purpose | One canonical vocabulary for commodity, unit, grade and package weight, so a price can only be compared with a price that means the same thing. |
| Evidence | `source code` + `local DB` (contents of `0007_seed_reference_data.sql`, `0023_seed_commodity_grades.sql` as applied to a clean database). No figure here was invented; anything unverified is marked **not established**. |

## 1. Units (8)

`measurement_units` — seeded by `0007`, verified on a clean run.

| id | code | dimension | base | factor to base | note |
|---|---|---|---|---|---|
| 1 | `kg` | mass | kg | 1 | the base unit for every mass conversion |
| 2 | `g` | mass | kg | 0.001 | |
| 3 | `t` | mass | kg | 1000 | metric tonne, not short/long ton |
| 4 | `bag` | mass | kg | **null** | commodity-specific weight; deliberately unknown until verified |
| 5 | `crate` | count | piece | **null** | |
| 6 | `litre` | volume | litre | 1 | |
| 7 | `piece` | count | piece | 1 | |
| 8 | `unspecified` | unknown | — | **null** | honest representation of "not recorded" |

`bag` and `crate` carry `base_factor = null` on purpose. A bag of paddy rice and a bag of gum arabic are different weights, so a single number would be false. Any conversion must live in `commodity_unit_conversions` per commodity.

## 2. Package conversions: none is established

After a clean migration run, **`commodity_unit_conversions` is empty**.

The only conversion data in the repository sits in `supabase/seeds/demo_seed_core.sql` — 12 rows, every one of them "1 bag = 50 kg", every one marked `is_verified = true`. That file is no longer a migration (see its README) because:

- 50 kg is plausible for rice, maize, millet and sorghum, and is *not* the standard for cocoa, gum arabic or sesame, where bag weights differ by commodity and by buyer;
- a demo fixture has no way to justify `verified` — verification is a field act with an actor (`verified_by`) and a date (`verified_at`), and the seed has neither;
- a wrong factor does not look wrong. It silently rescales every bag price into a kg price, and the error is invisible on the page.

**Rule.** A conversion row may be added only with:

1. a commodity and both units,
2. a factor measured, not assumed,
3. `verified_by` (the staff member who confirmed it) and `verified_at`,
4. a `note` naming the trade context and season if it varies.

Until then, a price recorded in `bag` is compared only with other `bag` prices for the same commodity, and the UI must not present a kg-equivalent. `market_price_summary` groups by `display_unit`, which means the two do not get mixed — this is the behaviour to preserve, not to work around.

## 3. Commodities (22)

`commodities` — seeded by `0007` with explicit ids, with one intentionally inactive duplicate.

| id | name | slug | category | active |
|---|---|---|---|---|
| 1 | Paddy Rice | `paddy-rice` | Grains & Cereals | yes |
| 2 | Paddy Rice (duplicate record) | `paddy-rice-duplicate-record` | Grains & Cereals | **no** — retained for legacy id mapping |
| 3 | Imported Rice | `imported-rice` | Grains & Cereals | yes |
| 4 | Local Rice | `local-rice` | Grains & Cereals | yes |
| 5 | Wheat | `wheat` | Grains & Cereals | yes |
| 6 | Maize (White) | `maize-white` | Grains & Cereals | yes |
| 7 | Maize (Yellow) | `maize-yellow` | Grains & Cereals | yes |
| 8 | Millet | `millet` | Grains & Cereals | yes |
| 9 | Sorghum (White) | `sorghum-white` | Grains & Cereals | yes |
| 10 | Sorghum (Red) | `sorghum-red` | Grains & Cereals | yes |
| 11 | Sesame Seed | `sesame-seed` | Oilseeds | yes |
| 12 | Soya Beans | `soya-beans` | Pulses & Legumes | yes |
| 13 | Groundnut | `groundnut` | Pulses & Legumes | yes |
| 14 | Bambara Nuts | `bambara-nuts` | Pulses & Legumes | yes |
| 15 | Brown Beans (Oloyin) | `brown-beans-oloyin` | Pulses & Legumes | yes |
| 16 | White Beans | `white-beans` | Pulses & Legumes | yes |
| 17 | Dried Chilli Pepper | `dried-chilli-pepper` | Spices & Herbs | yes |
| 18 | Dried Ginger | `dried-ginger` | Spices & Herbs | yes |
| 19 | Gum Arabic GR-I | `gum-arabic-gr-i` | Tree Crops | yes |
| 20 | Gum Arabic GR-II | `gum-arabic-gr-ii` | Tree Crops | yes |
| 21 | Gum Arabic GR-III | `gum-arabic-gr-iii` | Tree Crops | yes |
| 22 | Sweet Potato | `sweet-potato` | Roots & Tubers | yes |

Freshness default is 72 h for every commodity unless a row overrides `freshness_window_hours`. Whether the production values differ is `UNKNOWN`; the pages must keep showing the label derived from the *stored* window, never a constant.

## 4. Grades

`0023` seeds **58 grade rows covering all 22 commodities**. The schemes are commodity-specific rather than a single ladder — that is deliberate:

| Scheme | Example | Where |
|---|---|---|
| Tiered quality (Grade 1 / 2 / 3 / Off-grade) | rice: broken kernels <5% / 5–15% / 15–25% / >25% | grains |
| Acacia species | Gum Arabic GR-I/II/III ↔ *Acacia senegal* (Hashab) / *Acacia seyal* (Talha) | gum arabic |
| Purpose grades | Milling grade, Food grade, Feed grade, Crush grade | wheat, maize, soya |
| Defect grades | Broken | rice, beans |
| Ungraded | explicitly recorded as `ungraded` | commodities with no trade standard |

Each grade carries the criterion it is graded on (moisture, foreign matter, broken kernels, purity). A grade is a **definition**, not an observation: no price, yield or volume is attached to it.

**Rule.** A grade may exist only for a commodity, and an observation's grade must belong to that commodity — this is enforced by the schema's FK, and it is why grade-based comparison is possible at all.

## 5. Markets, states, sources

- 11 markets, 11 states (seeded, asserted by the harness on every run).
- `evidence_sources`: FAOSTAT, USDA FAS, CBN, NBS and others, each with a `license_type` and `source_type`. **No figure is published from a source whose licence forbids it**, and `source_sync_events` (how a figure was fetched) is staff-only after `0050`.

## 6. What this standard forbids

1. A conversion factor that nobody measured.
2. A `bag` price presented as a `kg` price.
3. Comparing two prices with different `price_type` without saying so (`farmgate` ≠ `retail`).
4. Comparing a grade with an ungraded commodity as if they were the same product.
5. Presenting an `imported` intelligence series as published — after `0050` only `verification_status = 'verified'` rows are public.
6. Any statement of "live", "real-time" or "verified" price unless the observation is published, current, and inside its freshness window.

## 7. Open items

| Item | Owner decision needed |
|---|---|
| Which package weights are field-verified, per commodity | data owner / field lead |
| Whether `bag` is displayed as a first-class unit or hidden until conversions exist | product |
| HS code mapping for the 22 real commodities (currently 1 of 25 survives, `Wheat`) | trade analyst |
| Whether `unspecified` should be selectable in the field app | product |
