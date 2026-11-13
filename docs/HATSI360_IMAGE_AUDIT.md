# Hatsi360 Image & Content Audit

**Phase 1 of the image reconstruction brief.**
Audit date: 22 October 2026 · Repository: `baiitax/Hatsi360` @ `9a00d0d`
Method: every claim below was produced by reading the code, the catalogue, the
manifest and the filesystem, or by querying the live Supabase database. Nothing
here is inferred from appearance.

---

## 1.1 Route discovery

**85 page routes** (`src/app/**/page.tsx`), of which 75 are static and 10 are
dynamic. Route groups (`(site)`, `(portal)`, `(agent)`, `(admin)`) are not part
of the URL. There are **no duplicate routes** and no orphaned pages.

| Area | Routes |
| --- | --- |
| Public marketing | `/`, `/about`, `/solutions`, `/contact`, `/pricing`, `/faq`, `/methodology`, `/disclaimer`, `/api-docs`, `/api-policy`, `/cookies`, `/privacy`, `/terms`, `/coverage-report` |
| Price discovery | `/prices`, `/prices/[commodity]`, `/commodities`, `/commodities/[slug]`, `/markets`, `/markets/[slug]`, `/compare` |
| Trade | `/trade`, `/trade/terminal`, `/trade/best-buy`, `/trade/best-sell`, `/trade/fundamentals`, `/trade/watchlist`, `/trade/alerts` |
| Research | `/insights`, `/insights/[slug]`, `/reports`, `/reports/[slug]` |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| Workspace | `/dashboard`, `/agent/*`, `/admin/*` |

**Coverage:** all 85 routes were previously confirmed to return HTTP 200 over a
real `next start` server. No route renders a placeholder page.

---

## 1.2 Image inventory

The platform has **one image registry** — `src/lib/images/registry.ts` — with
the asset catalogue in `catalogue.json` (52 assets) and the built-file manifest
in `generated-manifest.ts` (46 entries). No page hard-codes an image URL;
everything resolves through `getAsset` / `resolveImage` / `getPageImage` /
`getCommodityImage` / `getMarketImage` / `getInsightImage` / `getCategoryImage`.

### 52 registered assets

| Role | Count | Served |
| --- | --- | --- |
| `commodity` | 19 | 19 |
| `market` | 11 | 11 |
| `hero` | 3 | 3 |
| `agriculture` | 4 | 4 |
| `infrastructure` | 4 | 4 |
| `insights` | 4 | 4 |
| `professionals` | 4 | 4 |
| `reports` | 2 | 2 |
| `ui` (placeholder) | 1 | 1 |
| **Total** | **52** | **52** |

Library size **12 448 KB**, no file over the 320 KB byte budget.

### The gap this audit found, and its cause

At the time of the audit, six assets were registered with complete metadata —
`alt`, `subject`, `folder`, `name`, `width`, `height`, `licence`, `credit`,
`role`, `representation` — but had **no source original in
`assets/image-sources/`**, so `buildAsset()` returned `null` and every lookup
silently fell back to `ui.placeholder`. **All six have since been generated,
verified on-subject and built.** The record is kept because the failure mode,
not the fix, is the useful part.

| Asset | Source original required | Page keys that fall back |
| --- | --- | --- |
| `professionals.trader-phone` | `professionals-trader.jpg` | `home.audiences`, `solutions.traders` |
| `professionals.agent-recording` | `professionals-agent.jpg` | `about.collect`, `contact.hero` |
| `professionals.inspector-grading` | `professionals-inspector.jpg` | `about.verify` |
| `professionals.analyst-reviewing` | `professionals-analyst.jpg` | `solutions.institutions`, `methodology.hero` |
| `reports.market-report` | `reports-market.jpg` | `reports.hero` |
| `reports.coverage-report` | `reports-coverage.jpg` | `reports.coverage` |

**9 page keys** resolved to the placeholder as a result: `home.audiences`,
`about.collect`, `about.verify`, `solutions.traders`, `solutions.institutions`,
`reports.hero`, `reports.coverage`, `methodology.hero`, `contact.hero`. This
was the single remaining cause of all 11 test failures in the suite. **Now 0.**

> **Why this class of defect is dangerous:** a catalogue entry with no built
> derivative fails *silently* — `resolveImage` returns the placeholder, which
> looks like a deliberate design choice in the browser. The only reliable
> detection is cross-checking `catalogue.json` against `SERVED_IMAGE_PATHS`,
> which is now an automated assertion (`tests/images/designation.test.ts` →
> *"reports exactly the assets still waiting on a source original"*).

### Metadata completeness

* **Alt text:** 51 of 52 assets carry descriptive alt text. The one exception is
  `ui.placeholder`, which is correctly `decorative: true` and therefore silent.
* **Licence:** all 52 declare `Hatsi360 original asset — generated editorial
  illustration, produced for this platform and owned by Hatsi360.`
* **No remote URLs:** 0 of 46 served assets point at an external host.
* **Dimensions:** recorded and asserted equal to the real file dimensions.
* **No embedded base64:** asserted by the existing suite.

### The placeholder representation defect (found and fixed)

`ui.placeholder` was the only asset with `representation: 'exact'`. Because
`resolveImage()` returns the asset itself for an unknown id, that meant a
neutral grain texture standing in for a missing photograph rendered with **no
disclosure badge at all** — precisely the situation where disclosure matters
most. Changed to `'representative'` in `catalogue.json`.

---

## 1.3 Duplicate and near-duplicate detection

Two different tests, because they catch different failures.

### Exact duplicates (content hash)

All 46 served files were SHA-256 hashed. **Zero collisions.** No image is
shipped twice under two names.

### Near-duplicates (64-bit average hash, Hamming distance)

All 46 served images were reduced to a 64-bit perceptual hash and compared
pairwise. Three pairs scored within 6 bits of each other:

| Distance | Pair |
| --- | --- |
| 3/64 | `agriculture/maize-field.jpg` ↔ `markets/zaki-biam-yam-market.jpg` |
| 5/64 | `insights/fuel-transport.jpg` ↔ `markets/zaki-biam-yam-market.jpg` |
| 6/64 | `agriculture/maize-field.jpg` ↔ `insights/fuel-transport.jpg` |

**Verdict: not duplicates.** All three were pulled up and compared visually —
they are a maize field, a yam market, and a loaded truck on a dirt road at
sunset. The similarity is compositional and luminance-based (a strong horizontal
band structure and a bright sky region), not content-based. **No action taken.**
The threshold is deliberately tight; a 6-of-64 match on 8×8 grayscale is noise.

### Asset reuse across records

| Asset | Reused by | Justification |
| --- | --- | --- |
| `commodity.gum-arabic` | `gum-arabic-gr-i`, `-gr-ii`, `-gr-iii` | One commodity at three grades. Three near-identical lots do not need three photographs, and three different photographs would imply three different products. |
| `commodity.paddy-rice` | `paddy-rice`, `paddy-rice-duplicate-record` | `paddy-rice-duplicate-record` is an **inactive** data-quality artifact (id 2) of `paddy-rice`, excluded from every public listing by the `is_active` filter. |
| `professionals.trader-phone` | `home.audiences`, `solutions.traders` | Two pages, two genuinely different audiences, one honest photograph of a trader checking a price. Deliberate, not accidental. |
| `infrastructure.export-dock` | `solutions.hero`, `solutions.exporters` | As above. |
| `infrastructure.bagging-line` | `about.publish`, `api-docs.hero` | As above. |
| `agriculture.maize-field` | `faq.hero`, `commodity-directory.hero` | As above. |
| `insights.*` | one per article | 1:1, no reuse. |

**Markets: 1:1, no reuse whatsoever.** All 11 market assets are distinct files.
This is the rule that matters most: one generic grain photograph standing in for
Dawanau, Funtua, Mile 12 and Zaki Biam would be the exact failure the brief
prohibits.

### Orphaned asset

`agriculture.rice-field` is built, served and registered, but referenced by no
page key, no commodity record and no category. **Retained deliberately** — the
rice-field photograph is the correct illustration for the rice commodity family
and will be picked up by `getCategoryImage` if a `cereals` category mapping is
ever pointed at it. Flagged here rather than deleted, because deleting an
original to tidy an inventory would be a loss with no benefit.

---

## 1.4 Live data state (what the images are allowed to say)

Queried directly against Supabase:

| Table / metric | Count |
| --- | --- |
| `commodities` | 22 (21 active; inactive: id 2, "Paddy Rice (duplicate record)") |
| `categories` | 14 |
| `markets` | 11 |
| `states` | 11 |
| `measurement_units` | 8 |
| `commodity_grades` | 58 |
| `commodity_varieties` | 0 |
| `market_commodity_scope` | 0 |
| **`price_observations`** | **0** |
| **`buyer_offers` / `seller_offers`** | **0** |
| **`collection_batches`** | **0** |
| **`market_reports` / `articles`** | **0** |
| **markets with lat/lng** | **0** |

**Consequences that bind every image decision:** no map can be drawn; no price,
movement, percentage or freshness figure may be shown anywhere; and every
intelligence surface must carry an honest empty state. This is why the demo
panel says the operational records are empty — it is not modesty, it is the
measured state.

---

## Findings

| # | Finding | Classification | Status |
| --- | --- | --- | --- |
| 1 | 6 registered assets had no source original → 9 page keys fell back to the placeholder | VERIFIED IN CODE | **FIXED** — all 6 generated and built |
| 2 | `ui.placeholder` claimed `representation: 'exact'`, suppressing its disclosure badge | VERIFIED IN CODE | **FIXED** |
| 3 | 10 source originals generated and built (`market-loading`, `market-yam`, `agriculture-{maize,rice,legume,harvest}`, `infrastructure-{warehouse,grading,bagging,export}`) | VERIFIED IN UI | **DONE** |
| 4 | No exact duplicate files; no content near-duplicates | VERIFIED IN CODE | CLEAN |
| 5 | Markets are 1:1 with assets — no shared market photography | VERIFIED IN CODE | CLEAN |
| 6 | `agriculture.rice-field` is orphaned | VERIFIED IN CODE | RETAINED (documented) |
| 7 | No remote image URLs, no base64 payloads, no over-budget files | VERIFIED IN CODE | CLEAN |
| 8 | 85 routes, no duplicates, all 200 | VERIFIED IN UI | CLEAN |

## Outcome

1. All 6 remaining source originals generated at 1600×900 and verified by
   reading each one back.
2. `scripts/build_image_library.py` → **"Built 52 of 52 assets, 12448 KB"**.
3. `tests/images/registry.test.ts` **32/32** and
   `tests/images/designation.test.ts` **22/22**.
4. `scripts/verify_launch.sh` → **98 passed / 0 failed**.

One image was rejected and regenerated: the first `reports-coverage.jpg`
rendered a hand-drawn map of Nigeria with legible city names and a tally
sheet. Beyond the no-text rule, a map studded with named markets and route
twine reads as a **coverage claim**, which the brief forbids. It was
regenerated as a desk scene with no map and no legible text.

**Full suite: 732 passed / 0 failed / 28 skipped.**
