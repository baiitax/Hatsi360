# Hatsi360 — Brand and Design System

**Product:** Hatsi360 — Agricultural Market Intelligence
**Endorsement:** Powered by Pluck Agro
**Tagline:** Know the harvest. Understand the market. Trade with confidence.

This is the Phase 2 deliverable. It is the reference for the brand, the
palette, the typography, the logo system and the reusable component catalogue.
Everything here is enforced by `tests/brand/brand.test.ts` and
`tests/design-system/design-system.test.ts`.

---

## 1. Identity architecture

```
Hatsi360                              ← the product. Always first.
Agricultural Market Intelligence       ← the category. The product's own work.
Powered by Pluck Agro                  ← the corporate endorsement. Always last, always smaller.
```

The endorsement is subordinate in three concrete ways: it is rendered at a
smaller size than the wordmark, it never carries the Pluck Agro logo, and it
never appears in the `<title>` of a page.

| Surface | Name | Route |
| --- | --- | --- |
| Public site | Hatsi360 | `/` |
| Access portal | Hatsi360 Access Portal | `/login` |
| Field application | Hatsi360 Field | `/agent/*` |
| Control Centre | Hatsi360 Intelligence Control Centre | `/admin/*` |
| Customer workspace | Hatsi360 Customer Workspace | `/dashboard` |

**Ownership wording (requires legal approval before publication):**

> Hatsi360 is an independent agricultural market intelligence platform powered
> by Pluck Agro.

The wording deliberately avoids claiming a corporate structure that has not
been verified. Authorised personnel must approve the final sentence.

---

## 2. The logo system

### 2.1 The artwork

The Hatsi360 identity is **supplied artwork**, not artwork drawn in this
repository. Two files are the source of truth:

| Source | Size | What it is |
| --- | --- | --- |
| `/home/user/uploads/HATSI360 Logo.png` | 2075 × 758 RGBA | The horizontal lockup: mark, name, category line and the endorsement. |
| `/home/user/uploads/Hatsi360 Favicon.png` | 1254 × 1254 RGBA | The mark on its own. |

The mark carries the meaning of the product: a market signal turning into
growth, a golden arc that completes the circle, and the field below it. The
wordmark is set in the artwork's own geometric letterforms.

**The artwork is never redrawn.** Nothing in the application, the scripts or
the documentation may substitute a generated stand-in for it. Every file the
site serves is derived from those two images by
`scripts/brand_assets.py`, so the mark on the site is pixel-for-pixel the
mark its owner drew.

### 2.2 The asset set

| File | Use |
| --- | --- |
| `public/brand/hatsi360-logo-horizontal.png` | The full lockup — mark, name, category line and endorsement. Footer, social card, documents. |
| `public/brand/hatsi360-logo-horizontal-light.png` | The same lockup reversed for a deep green surface. |
| `public/brand/hatsi360-logo-horizontal-mono.png` | Single ink (`#123B2A`) for light surfaces, print and embossing. |
| `public/brand/hatsi360-logo-horizontal-mono-light.png` | Single ink (`#FFFFFF`) for dark surfaces. |
| `public/brand/hatsi360-lockup-compact.png` | Mark and name, without the small print. The header lockup. |
| `public/brand/hatsi360-lockup-compact-light.png` | The compact lockup reversed for dark surfaces. |
| `public/brand/hatsi360-lockup-compact-mono.png` | The compact lockup in a single ink. |
| `public/brand/hatsi360-mark.png` | The mark on its own. Avatars, app tiles, the mobile field-app header. |
| `public/brand/hatsi360-mark-light.png` | The mark reversed for dark surfaces. |
| `public/brand/hatsi360-mark-mono.png` / `-mono-light.png` | The mark in a single ink. |
| `public/brand/hatsi360-wordmark.png` | The name alone, for documents and letterheads. |
| `public/brand/hatsi360-favicon-16.png` / `-32.png` | Browser tab. |
| `public/brand/hatsi360-icon-192.png` / `-512.png` | Installable web app. |
| `public/brand/hatsi360-apple-touch-icon.png` | iOS home screen. Also served at `/apple-icon.png`. |
| `public/brand/hatsi360-social-1200x630.png` | The social card: mark, tagline and endorsement on a deep green field. |

The reversed and monochrome variants are produced by recolouring the supplied
pixels, never by redrawing them: the green body becomes white, the gold
accent is kept because it already reads on a deep green surface, and the
monochrome variants flatten everything to a single ink while keeping the
artwork's own alpha.

### 2.3 Where each lockup is used

| Surface | Asset |
| --- | --- |
| Public header | `hatsi360-lockup-compact.png` at 38 pixels tall. |
| Public footer | `hatsi360-logo-horizontal.png` at 300 pixels wide — the endorsement inside the artwork and the endorsement in the text agree. |
| Access portal header | `hatsi360-lockup-compact.png`. |
| Sign-in brand panel | `hatsi360-lockup-compact-light.png` (reversed, on deep green). |
| Control Centre rail | `hatsi360-mark-light.png` (reversed, on deep green). |
| Field App header | `hatsi360-mark.png`. |
| Social card | `hatsi360-social-1200x630.png`. |

### 2.4 Regenerating the assets

```bash
python3 scripts/brand_assets.py \
  --favicon "/home/user/uploads/Hatsi360 Favicon.png" \
  --logo "/home/user/uploads/HATSI360 Logo.png"
```

The script reads only the two supplied files and writes only into
`public/brand/`. It is safe to run at any time, and the result is
deterministic.

`scripts/brand_trace.py` and `scripts/verify_brand_artwork.py` remain in the
repository as the vector tracing and fidelity-checking toolchain. They are not
part of the build: the shipped artwork is the supplied raster, because the
artwork's own gradient shading cannot be reproduced faithfully by a vector
trace without changing the mark.

### 2.5 Rules

**Never** replace the Hatsi360 mark with the Pluck Agro logo. **Never**
recolour the artwork by hand. **Never** show the full lockup where the
compact lockup belongs — the category line and the endorsement are unreadable
at header size. **Never** use the mark below 16 pixels. **Never** place the
full-colour mark on a deep green surface: use the reversed one.

---

## 3. Colour

### 3.1 The palette

| Name | Hex | Role | On white |
| --- | --- | --- | --- |
| Deep Harvest Green | `#123B2A` | Primary brand surface, the mark | 12.46 |
| Forest Green | `#174D35` | Primary actions, links, focus rings | 9.77 |
| Agricultural Green | `#26734B` | Accent text, chart series | 5.78 |
| Fresh Growth Green | `#5B9A57` | Positive movement, highlights | 3.38 |
| Grain Gold | `#D5A441` | Secondary accent, the mark | 2.28 |
| Harvest Amber | `#E5B95F` | Signal colour on dark surfaces | 1.84 |
| Wheat Beige | `#E9D8B5` | Light grain tone on dark surfaces | 1.40 |
| Natural Sand | `#F4EFE4` | Warm editorial panels | 1.15 |
| Charcoal | `#202923` | Body typography | 14.97 |
| Deep Slate | `#34423A` | Secondary headings, dense UI text | 10.57 |
| Muted Grey | `#718078` | Large text and rules only | 4.15 |
| Soft Background | `#F7F8F5` | Page background | — |
| White | `#ffffff` | Cards and analytical surfaces | — |
| Border | `#E3E9E2` | Hairlines and table rules | — |
| Success | `#228B55` | Verified, published, positive | 4.29 |
| Warning | `#D69E2E` | Stale data, pending review | 2.39 |
| Error | `#C84B45` | Rejected, failed, negative | 4.62 |
| Information | `#3478B8` | Informational notices | 4.64 |

A colour marked text-safe clears WCAG AA (4.5:1) on white. A colour that does
not clear it is used for graphics, large text, or on the dark green surface
where its contrast is 5.2:1 or better.

### 3.2 Token names

The Tailwind theme in `src/app/globals.css` exposes:

* `brand-50 … brand-950` — the green ramp
* `leaf-100 … leaf-700` — fresh growth and positive movement
* `harvest-100 … harvest-700` — the gold ramp
* `sand-50 … sand-700` — wheat beige and natural sand
* `earth-100 … earth-700` — the muted chart series
* `ink-50 … ink-950` — neutrals (`ink-450` is the specified Muted Grey;
  `ink-500` is the darker, text-safe muted tone)
* `success-*`, `warning-*`, `error-*`, `info-*` — status

Charts read the same palette through CSS custom properties
(`src/lib/chart-colours.ts`), so no component contains a raw hex value. A test
fails the build if one appears.

### 3.3 Colour discipline

Deep green carries the navigation and the major brand surfaces. Gold is used
selectively. Light natural backgrounds carry the informational pages. White
carries the analytical workspaces. Positive movement is green, negative
movement is red, and **both always carry an arrow**, so colour is never the
only signal.

---

## 4. Typography

| Role | Family | Notes |
| --- | --- | --- |
| Interface and figures | Inter | Tabular numerals. Price columns never shift. |
| Editorial and display | Manrope | Humanist sans, wide apertures, self-hosted by `next/font`. |

Both families are downloaded at build time and served from the application
origin — no third-party font request reaches a field agent's phone.

Hierarchy: large editorial headlines, clear section headings, compact
analytical labels, legible commodity names, distinctive numeric price
displays, consistent metadata. Every numeric price uses the `.figure` utility,
which applies tabular figures.

---

## 5. The component catalogue

One system, four workspaces. The public site, the customer workspace, the Field
App and the Control Centre share these; the *shell* of each workspace differs,
the *components* do not.

| Component | Defined in |
| --- | --- |
| `BrandLogo`, `BrandMark`, `BrandHomeLink` | `components/brand/Logo.tsx` |
| `MainNavigation`, `MobileNavigation`, `SearchBar`, `UserMenu`, `NotificationCenter` | `components/site/navigation.tsx` |
| `PageHeader` / `PageHero`, `Breadcrumbs`, `EmptyState`, `LoadingSkeleton`, `Pagination`, `StatusBadge` | `components/ui/index.tsx`, `components/ui/PageHero.tsx` |
| `PriceMovementIndicator`, `DataFreshnessIndicator`, `VerificationBadge`, `SourceAttribution`, `IntelligenceMetricCard`, `PriceCard`, `ErrorState`, `FilterPanel`, `FilterSelect`, `DateRangeSelector` | `components/ui/data-display.tsx` |
| `CommodityCard`, `MarketCard` | `components/data/Cards.tsx` |
| `PriceCard`, `PriceComparisonTable` | `components/data/PriceTable.tsx` |
| `HistoricalPriceChart`, `ObservationDensityChart` | `components/data/PriceChart.tsx` |
| `MarketCoverageMap` | `components/marketing/sections.tsx` |
| `CategoryGlyph` | `components/marketing/CategoryGlyph.tsx` |
| `Footer` | `components/site/SiteFooter.tsx` |

`tests/design-system/design-system.test.ts` checks that every entry exists,
that the catalogue is exported from one surface, that the verification badge
cannot label an unverified record as verified, that a movement indicator never
relies on colour alone, and that no component contains a raw hex colour.

### 5.1 The four workspaces

| Workspace | Character |
| --- | --- |
| Public site | Editorial. Wide type, generous spacing, commodity discovery and comparison first. |
| Customer workspace | Calm. Saved commodities, watchlists, entitlements and exports. |
| Hatsi360 Field | Fast. One column, large touch targets, bottom navigation within thumb reach, low bandwidth. |
| Control Centre | Dense. Deep-green navigation rail, white analytical surfaces, compact tables, every figure linked to its records. |

---

## 6. Imagery

The logo system is the artwork supplied by the product's owner and is used
exactly as supplied. Everything else in the product is original and generated
in-repo: the fourteen category glyphs, the hero field-row motif and the
coverage map. No stock photography, no clip art, no third-party illustration.

**Planned (not implemented):** licensed commodity and market photography. The
brief asks for authentic Nigerian grain-market imagery. No licensed source has
been obtained, so nothing has been substituted with generated imagery that
would misrepresent the subject. Until assets are licensed, the site uses
original vector artwork and real data, which is honest and complete on its own
terms.

---

## 7. Voice

| Write | Do not write |
| --- | --- |
| "the price recorded at Dawanau on 12 July" | "the market price" |
| "not yet verified" | "verified" for an unverified record |
| "reporting" / "stale" / "registered" | "covered" for a market with no data |
| "coverage is building" | "we cover all of Nigeria" |
| "the latest available observation" | "live price" |
| "proposed tier" | "subscribe" |

The product never claims to be the largest, the most accurate or the only
platform. It states what it has, what it does not, and when a record was
collected.
