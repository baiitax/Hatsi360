# Hatsi360 — Phase 2 Brand Artwork Report

**Product:** Hatsi360 — Agricultural Market Intelligence
**Endorsement:** Powered by Pluck Agro
**Date:** 2026-10-22

This records the Phase 2 artwork integration in full: what the owner's
artwork is, how it became the product's identity, what was verified, and what
was deliberately not done.

---

## 1. What was inspected

| Area | Finding | Class |
| --- | --- | --- |
| Supplied artwork | `/home/user/uploads/HATSI360 Logo.png` — 2075 × 758 RGBA, horizontal lockup | `VERIFIED_IN_CODE` |
| Supplied artwork | `/home/user/uploads/Hatsi360 Favicon.png` — 1254 × 1254 RGBA, the mark alone | `VERIFIED_IN_CODE` |
| Artwork materials | Two only: a deep green body (`#013723`–`#0E2C1F`) and a gold accent (`#EFA218`–`#FCBF23`) | `VERIFIED_IN_CODE` |
| Artwork shading | Both materials carry real gradient shading; a single flat colour does not reproduce the artwork | `VERIFIED_IN_CODE` |
| Previous identity | The repository carried a **generated** eight-kernel "grain orbit" mark, an inline SVG in `Logo.tsx` and a Pillow rasteriser in `scripts/brand_icons.py` | `VERIFIED_IN_CODE` |
| Superseded assets | `public/brand/` held generated SVG and PNG variants of that mark, plus the older `gonapulse-*` icons | `VERIFIED_IN_CODE` |

---

## 2. What was implemented

### 2.1 The artwork is the source of truth

`scripts/brand_assets.py` derives **every** served asset from the two supplied
files. Nothing is redrawn, re-interpreted or substituted. It produces eighteen
files in `public/brand/`:

| Family | Files |
| --- | --- |
| Full colour | `hatsi360-logo-horizontal.png`, `hatsi360-lockup-compact.png`, `hatsi360-mark.png`, `hatsi360-wordmark.png` |
| Reversed for dark surfaces | `hatsi360-logo-horizontal-light.png`, `hatsi360-lockup-compact-light.png`, `hatsi360-mark-light.png` |
| Monochrome | `hatsi360-logo-horizontal-mono.png`, `hatsi360-logo-horizontal-mono-light.png`, `hatsi360-lockup-compact-mono.png`, `hatsi360-mark-mono.png`, `hatsi360-mark-mono-light.png` |
| Icons | `hatsi360-favicon-16.png`, `hatsi360-favicon-32.png`, `hatsi360-icon-192.png`, `hatsi360-icon-512.png`, `hatsi360-apple-touch-icon.png` |
| Social | `hatsi360-social-1200x630.png` — the mark, the tagline and the endorsement on a deep green field |

The reversed variants are produced by a soft ramp across the artwork's own
two materials: the green body becomes white, the gold accent is kept because
it already reads on a deep green surface. The monochrome variants flatten
everything to a single ink while keeping the artwork's own alpha.

### 2.2 The compact lockup

The supplied lockup carries the category line and the endorsement *inside* the
symbol's own height, so a straight crop cannot remove them. `compose_compact_lockup`
lifts the three parts — symbol, rule, wordmark — from the artwork at their
original positions and lays them out again in the same relationships. The
result is the mark, the rule and the name: the lockup that belongs in a header.

### 2.3 The application

`src/components/brand/Logo.tsx` now renders the supplied artwork through
`next/image`:

* `BrandMark` — the mark alone, with a `tone="dark"` reversed variant.
* `BrandLogo` — the compact lockup, sized from its height.
* `BrandLockup` — the full lockup, including the endorsement inside the artwork.
* `BrandHomeLink` — the header's home link.

Surfaces: the public header uses the compact lockup; the public footer uses the
full lockup at 300 px; the access portal header uses the compact lockup; the
sign-in brand panel and the Control Centre rail use the reversed mark; the
Field App uses the mark.

The generated mark is gone from the application, and `scripts/brand_icons.py`
is removed.

### 2.4 Metadata and icons

* `icons` in the root metadata points at the supplied favicon, 16 px icon and
  192 px icon; the Apple touch icon is the supplied artwork.
* `src/app/apple-icon.png` is the supplied artwork; the generated
  `src/app/icon.svg` is removed.
* `src/app/manifest.ts` is a new installable web application manifest that
  names the product and points at the supplied icons.
* Open Graph and Twitter cards use the new 1200 × 630 social card.
* `ORGANISATION.logo` and the report structured data point at the supplied PNG.

---

## 3. What was preserved and improved

| Area | Detail |
| --- | --- |
| Identity architecture | Hatsi360 remains the product; "Powered by Pluck Agro" remains visible and subordinate. |
| Layout architecture | The application was restructured into route groups so each surface carries its own chrome — see section 5. |
| Accessibility | A systemic heading-colour bug was found and fixed — see section 4. |
| Layout | A 127 px horizontal overflow at 1440 px was found and fixed — see section 4. |
| Data | Nothing in the database was touched. No observation, market or catalogue record was altered. |

---

## 4. Verification performed

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | **Clean** |
| Unit and contract tests | `npx vitest run` | **357 passed**, 17 files, 0 failed |
| Brand and design-system suites | `npx vitest run tests/brand tests/design-system` | **37 passed** |
| Production build | `npx next build` | **Success**, 49 static pages |
| Launch gate | `bash scripts/verify_launch.sh http://localhost:3000` | **77 passed, 0 failed** |
| Asset generation | `python3 scripts/brand_assets.py` | 18 assets written, deterministic |
| Rendered heading contrast | headless Chromium over 26 public routes | **349 headings measured**, every one clears WCAG AA against its own surface |
| Horizontal overflow | headless Chromium at 1440 px and 390 px | **0 px** on every public, portal and directory route |
| Visual inspection | headless Chromium screenshots | Public header, footer, homepage, market pulse, comparison, insights, solutions, final CTA, access portal, registration, sign-in, prices directory |

### 4.1 The heading-colour bug

The stylesheet set `color: var(--color-ink-950)` on `h1`–`h6`. A heading
inside a deep green panel inherits nothing, because a colour set on the
element beats an inherited one — so the sign-in page's "Hatsi360 Access
Portal" heading rendered ink-on-deep-green at a contrast ratio of **1.2:1**.

The fix is structural rather than local: headings now take
`color: inherit`, and the body carries the ink colour. A heading is white on a
dark panel and ink on a light one without either having to say so. All 349
headings across the 26 public routes were then measured in a real browser
against their own background.

### 4.2 The overflow

The header's own content was 127 px wider than its container at 1440 px,
because the supplied lockup is wider than the mark-and-text lockup it
replaced. The header now uses the short nav labels in the desktop bar
(`Prices`, `Compare`, `Insights`), keeps the full labels in the mobile drawer
and the footer, and moves the search and the business-enquiry action into the
utility strip. Overflow is now zero at both 1440 px and 390 px.

---

## 5. The layout restructure

The public site header and footer were rendered by the root layout, so every
surface carried them — including the sign-in page, the registration page, the
Control Centre and the Field App. The application now uses route groups:

| Group | Surfaces | Chrome |
| --- | --- | --- |
| `src/app/(site)/` | The public platform, the catalogue, the directories, the legal pages, the customer workspace | The site header and footer |
| `src/app/(portal)/` | Sign-in, registration, password recovery, password reset | The portal frame only — standalone |
| `src/app/admin/`, `src/app/agent/` | The Control Centre and the Field App | Their own shells |

Route groups do not change a URL. The navigation test was updated to discover
routes from the app directory, skipping the group folders, so it still proves
that every navigation entry points at a real page.

The not-found page and the error boundary sit outside every group, so they
were given a minimal branded frame of their own.

---

## 6. Outstanding

| # | Item | State |
| --- | --- | --- |
| 1 | The vector tracing toolchain (`scripts/brand_trace.py`, `scripts/verify_brand_artwork.py`) is retained but is not part of the build. | The artwork's gradient shading cannot be reproduced faithfully by a vector trace without changing the mark. The shipped identity is the owner's own raster. A vector mark remains the right long-term answer and the tools to judge it are in place. |
| 2 | The legal pages and the published mailbox still need business confirmation. | Unchanged by this phase. |
| 3 | The domain, the Supabase project, CI and the deployment remain unauthorised. | Unchanged by this phase. |
| 4 | The asset files are large rasters (the full lockup is 466 KB). | `next/image` serves them as optimised WebP at the size each surface needs. A vector lockup would remove the question. |

---

## 7. Files changed in this phase

* `scripts/brand_assets.py` — rewritten to derive every asset from the owner's artwork.
* `scripts/brand_icons.py` — removed; it drew the generated mark.
* `scripts/brand_trace.py`, `scripts/verify_brand_artwork.py` — kept as the vector toolchain; the verifier's metrics were rebuilt around shape agreement and distance-tolerant coverage.
* `scripts/verify_launch.sh` — extended with ten checks on the asset system, the lockups, the standalone portal and the web application manifest.
* `src/components/brand/Logo.tsx` — rewritten to render the supplied artwork.
* `src/components/site/SiteHeader.tsx`, `navigation.tsx`, `SiteFooter.tsx`, `PortalFrame.tsx` — updated for the new lockup and the standalone portal.
* `src/components/admin/AdminShell.tsx`, `src/app/(portal)/login/page.tsx` — the reversed mark on deep green surfaces.
* `src/components/site/BareFrame.tsx` — new; the branded frame for the pages outside every route group.
* `src/app/layout.tsx`, `src/app/(site)/layout.tsx`, `src/app/(portal)/layout.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx` — the route-group restructure.
* `src/app/manifest.ts`, `src/app/apple-icon.png` — the web application manifest and the supplied Apple touch icon.
* `src/app/globals.css` — headings inherit their colour.
* `src/lib/brand.ts` — the organisation logo path, the short navigation labels.
* `src/components/marketing/StructuredData.tsx`, `src/app/(site)/reports/[slug]/page.tsx` — the supplied logo path.
* `public/brand/` — eighteen files, all derived from the supplied artwork.
* `tests/brand/brand.test.ts` — the asset assertions rewritten; the navigation test now discovers routes through route groups.
* `docs/BRAND_GUIDE.md`, `docs/HATSI360_TRANSFORMATION_AUDIT.md`, `docs/PRODUCTION_READINESS_REPORT.md` — updated to the artwork that actually ships.
* `package.json` — `jsdom` pinned to `^27.4.0` so the test suite runs on Node 20 as well as Node 22.
