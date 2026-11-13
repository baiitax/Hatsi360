# Hatsi360 Homepage Transformation — Phase Zero Audit

Audit performed **2026-10-22** against the live application and the live Supabase
project `umxzsdepbrenqysabtlt`. Nothing in this document is inferred from the
visual appearance of a page; every figure below was read from the database or
from the source.

---

## 1. The constraint that decides everything else

The production database holds the complete reference catalogue and **no
observations at all**.

| Table | Rows |
| --- | --- |
| `commodities` | 22 |
| `commodity_categories` | 14 |
| `markets` | 11 |
| `states` | 11 |
| `measurement_units` | 8 |
| `commodity_grades` | 58 |
| `commodity_varieties` | 0 |
| `market_commodity_scope` | 0 |
| **`price_observations`** | **0** |
| **`buyer_offers`** | **0** |
| **`seller_offers`** | **0** |
| `collection_batches` | 0 |
| `observation_market_intelligence` | 0 |
| `market_reports` | 0 |
| `articles` | 0 |
| `commodity_specifications` | 0 |
| `commodity_seasonality` | 0 |
| `commodity_fundamentals` | 0 |
| `saved_commodities` | 0 |
| `price_alerts` | 0 |

**No market has coordinates.** `select count(*) from markets where latitude is
not null and longitude is not null` returns 0.

This is not a gap to be papered over. The brief's own non-negotiables forbid
fabricated prices, invented movements, and approximate map pins. So the correct
homepage is one that is genuinely well-designed *and* honest about having
nothing published yet — not one that looks busy.

The existing homepage already does this correctly, which is the single most
important thing this audit found. The work below is therefore about **structure,
content, craft and credibility**, not about making the page look active.

---

## 2. Existing homepage structure

`src/app/(site)/page.tsx` (619 lines) renders, in order:

| # | Section | Component | Data source |
| --- | --- | --- | --- |
| 1 | Hero | `HeroPanel` | newest 8 observations (empty) |
| 2 | Market pulse | `IntelligenceMetricCard` ×4, `MarketPulse`, `DataCoverageNotice` | all observations (empty) |
| 3 | Market intelligence search | inline form | catalogue (real) |
| 4 | Commodity discovery | `CategoryGrid`, `FeaturedCommodities` | catalogue (real) |
| 5 | Market coverage | `CoverageMap` | catalogue (real), map correctly not drawn |
| 6 | Price comparison | `ComparisonTable` | observations (empty) |
| 7 | Historical movement | `TrendPanel` | observations (empty) |
| 8 | Why Hatsi360 | `WhyHatsi360` | static |
| 9 | Insights and reports | inline cards | `src/lib/content/insights.ts` (real) |
| 10 | Business solutions | `BusinessSolutions` | static |
| 11 | Final CTA | inline | static |

Header: `src/components/site/SiteHeader.tsx` + `navigation.tsx`.
Footer: `src/components/site/SiteFooter.tsx`.

### What the existing page does well, and must not regress

- Every figure is computed from the database, never hard-coded. "Commodities
  tracked" is `commoditiesWithPrices.length`, not a marketing number.
- `DataCoverageNotice` appears whenever records are migrated or stale.
- The hero panel is labelled "Latest available observations" and says plainly
  "This is a verified published observation, not a live tick feed."
- `CoverageMap` refuses to draw when no market has coordinates, and says why.
- Verification state is broken out: `verifiedCount`, `legacyCount`, and
  awaiting review — with the sentence "Only the first group carries a field
  verification."
- Insights carry `<BrandClaim>Publication date not recorded</BrandClaim>`
  rather than an invented date.
- `BrandClaim` exists specifically so an unverifiable claim is visibly marked.

---

## 3. Design weaknesses

1. **The hero headline is a generic SaaS promise.** "The Market Moves. Stay
   Ahead of Every Harvest." could belong to any agritech startup. It does not
   say what Hatsi360 is. Brief §6 asks for a proposition.
2. **No section introduces the Trade Intelligence terminal.** `/trade` is the
   first item in `PRIMARY_NAV`, but the homepage never explains what it is.
   A visitor arriving from a shared link has no route into the product.
3. **No "How Hatsi360 works" section.** Brief §13 asks for the four-stage
   workflow. The mechanism is the product's main differentiator and it is only
   implied in the hero's three definition-list items.
4. **No dedicated data-trust section.** Brief §15 asks for the source-label
   vocabulary to be shown. `WhyHatsi360` covers principles but never names the
   labels a visitor will actually see on a price.
5. **Audience is a CTA, not a section.** `BusinessSolutions` is three cards and
   two buttons. Brief §14 asks for six named audiences with specific, relevant
   descriptions.
6. **Empty states are honest but thin.** With zero observations, sections 2, 6
   and 7 render almost nothing. A first-time visitor sees a large, sparse page
   and cannot tell whether the platform is broken or new.
7. **Insights are only three cards** with no category filter and no reports.
8. **The homepage does not state what is *not* yet covered.** The coverage
   statement exists at `/coverage` but the homepage does not surface it.

---

## 4. Content deficiencies

- No copy explains the difference between a submitted observation, a verified
  one, and a published one — which is the entire basis of the platform's
  credibility.
- No copy explains what a price type is, or why sesame farmgate and wholesale
  asking are not comparable.
- No copy explains the source hierarchy, or that the legacy import is
  deliberately ineligible for public intelligence.
- The tagline "Know the harvest. Understand the market. Trade with confidence."
  appears only in the final CTA, not as the page's organising idea.

---

## 5. Image deficiencies

52 assets are registered in `src/lib/images/catalogue.json`. **27 have a served
file; 25 do not**, so `resolveImage` falls back to the placeholder for them.

Missing by role:

| Role | Missing |
| --- | --- |
| commodity (3) | `dried-ginger`, `gum-arabic`, `sweet-potato` |
| market (4) | `lafia`, `sokoto`, `wunti`, `zaki-biam` |
| agriculture (4) | `harvest-hands`, `legume-field`, `maize-field`, `rice-field` |
| infrastructure (4) | `bagging-line`, `export-dock`, `grading-line`, `warehouse-storage` |
| insights (4) | `cassava-prices`, `fuel-transport`, `sustainable-farming`, `yam-cultivation` |
| professionals (4) | `agent-recording`, `analyst-reviewing`, `inspector-grading`, `trader-phone` |
| reports (2) | `coverage-report`, `market-report` |

`assets/image-sources/` holds exactly the 27 originals that produced the 27
served files. The user's supplied uploads contain only `HATSI360 Logo.png` and
`Hatsi360 Favicon.png` — no agricultural photography.

**Brief §19.2 permits generated imagery "only when genuine visual assets are
unavailable and the generated image is not presented as documentary
evidence."** So any generated image must be labelled as illustrative in the
registry and in the interface. The registry already has a
`representation: 'exact' | 'representative'` field; generated imagery needs a
distinct, honest label rather than being folded into either.

The three missing **commodity** images are a real functional gap: the commodity
cards for ginger, Gum Arabic and sweet potato currently show a placeholder,
which is the one place the brief explicitly forbids a generic fallback
("Never use the same generic image for different commodities unless no suitable
image is available and the fallback is clearly appropriate").

---

## 6. Performance risks

- `src/app/(site)/page.tsx` calls `source.listObservationsForAnalysis({})` —
  the **complete** observation set — and then does all aggregation in
  JavaScript. With 0 rows this is free; with a real dataset it is a full table
  scan on every homepage render. This is a latent risk, not a current one, and
  is worth recording before the first real collection run.
- The hero image is `priority` (correct) and everything else is lazy (correct).
- `recharts` 3.10.1 is installed and used by `TrendPanel` and `PriceChart`.
  `TrendPanel` is below the fold and should be dynamically imported.

---

## 7. Implementation plan

Ordered by value and by how much of it is verifiable without data.

1. **Hero** — replace the generic headline with the brief's proposition; keep
   the honest observation panel and its empty state.
2. **Trade Intelligence section** — four capabilities, accurately labelled, with
   the two that are not yet operational marked as such.
3. **How Hatsi360 works** — the four-stage workflow, with the source
   classification stated accurately.
4. **Data trust section** — the actual source-label vocabulary, drawn from the
   database's `price_source_registry` and `verification_status` values rather
   than invented.
5. **Audience section** — six named audiences.
6. **Commodity discovery** — keep the category grid; make the empty-price state
   on cards explicit rather than absent.
7. **SEO** — the exact title and meta description brief §22 specifies, plus
   `Organization` and `WebSite` schema (already present) and no `SearchAction`
   unless search genuinely resolves (it does: `/prices?q=`).
8. **Commodity images** — generate the three missing commodity images, register
   them as illustrative, and label them in the interface.
9. **Verification** — TypeScript, Vitest, production build, launch gate, and an
   honest statement of what was not measured.

---

## 8. What will not be claimed

- No Core Web Vitals figure will be stated. There is no browser in this
  environment, so LCP, INP and CLS cannot be measured. The targets remain
  targets.
- No responsive measurement at 320/360/375/390/430 px will be claimed.
- No market map will be drawn, because no market has coordinates.
- No price, movement, percentage, article or forecast will be invented.
