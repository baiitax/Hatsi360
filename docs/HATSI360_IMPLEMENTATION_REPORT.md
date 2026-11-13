# Hatsi360 — Image Reconstruction & Login Access Implementation Report

**Date:** 22 October 2026 · **Commit:** `9a00d0d` (pushed to `baiitax/Hatsi360`)
**Scope:** (1) public website image reconstruction + image-to-content mapping,
(2) login-page audit/redesign + demo credential access.

Every item below carries a classification from the required set. Where a claim
is not verified, it says so. Nothing is claimed from visual appearance alone.

```
VERIFIED IN CODE   the source and/or the built artefact was read directly
VERIFIED IN DATABASE  a live query returned the stated rows
VERIFIED IN UI     a real browser (Chromium, production build) rendered it
FUNCTIONALLY TESTED  an automated test or a scripted HTTP/DB exercise proved it
PERFORMANCE MEASURED  a number was measured, with the instrument named
PLANNED           not yet implemented
BLOCKED           cannot proceed, with the blocker named
UNKNOWN           not investigated — said so rather than guessed
```

---

## Phase 1 — Audit

### 1.1 Route discovery — VERIFIED IN CODE

**85 page routes** enumerated by walking `src/app/**/page.tsx`. 75 static,
10 dynamic. Route groups excluded from URLs. **No duplicate routes, no orphan
pages.** Full table in `docs/HATSI360_IMAGE_AUDIT.md` §1.1.

### 1.2 Image inventory — VERIFIED IN CODE / VERIFIED IN DATABASE

52 catalogue assets; 46 served; 11 162 KB; 0 files over the 320 KB budget;
0 remote URLs; 0 base64 payloads; 51/52 assets carry descriptive alt text (the
52nd is the correctly-decorative placeholder).

**The gap found: 6 assets registered with complete metadata but no source
original, causing 9 page keys to fall back to `ui.placeholder`.** Root cause
named, not guessed: `buildAsset()` returns `null` when the id is absent from
`SERVED_IMAGE_PATHS`, and the failure is silent.

**Defect found and fixed in the same pass:** `ui.placeholder` was the only
asset declaring `representation: 'exact'`. Since `resolveImage()` returns the
asset itself for unknown ids, a neutral texture substituting for a missing
photograph rendered with **no disclosure badge**. Changed to `'representative'`.

### 1.3 Duplicate detection — VERIFIED IN CODE

* Exact duplicates by SHA-256: **0**.
* Near-duplicates by 64-bit average hash: 3 pairs within 6 bits, **all
  visually inspected and confirmed to be different subjects** (maize field /
  yam market / loaded truck). No action taken.
* Markets: **1:1 with assets, zero reuse.** Commodity reuse is limited to the
  three Gum Arabic grades (one commodity at three grades) and the inactive
  `paddy-rice-duplicate-record` (id 2) — both justified and documented.
* `agriculture.rice-field` is orphaned. Retained, with the reason recorded.

### 1.4 Live data state — VERIFIED IN DATABASE

Every operational table is empty: `price_observations`, `buyer_offers`,
`seller_offers`, `collection_batches`, `market_reports`, `articles`, and the
commodity reference tables `commodity_specifications`, `commodity_seasonality`,
`commodity_fundamentals`. **0 markets carry lat/lng.** Reference data is
populated: 22 commodities (21 active), 14 categories, 11 markets, 11 states,
8 units, 58 grades.

---

## Phase 2 — Central image registry & designation mapping

### Registry — VERIFIED IN CODE

`src/lib/images/registry.ts` remains the single source. It exports
`getAsset`, `resolveImage`, `getPageImage`, `hasPageImage`, `getCommodityImage`,
`getCommodityImageById`, `getCategoryImage`, `getMarketImage`,
`getMarketImageById`, `getInsightImage`, `listAssetIds`, `assetPath`,
`libraryBytes`, `representativeCaption` and `REPRESENTATIVE_BADGE`.

No page hard-codes an image URL. No new dependency was added. The registry was
**extended, not replaced** — `src/config/image-registry.ts` was deliberately
not created.

### Mapping — VERIFIED IN CODE

`pages` (23 keys), `commodities` (22 slugs), `markets` (11 slugs),
`categories` (14 slugs), `insights` (4 slugs). All page keys resolve to an
existing asset id; **0 dangling references.**

### Source originals — 10 of 16 generated — VERIFIED IN UI

Generated with `generate_image` (originally generated, never scraped, no
European farmland, no cartoon style, no text/watermark/logos), at 1600×900:

```
market-loading.jpg          market-yam.jpg
agriculture-maize-field.jpg agriculture-rice-field.jpg
agriculture-legume-field.jpg agriculture-harvest.jpg
infrastructure-warehouse.jpg infrastructure-grading.jpg
infrastructure-bagging.jpg  infrastructure-export.jpg
```

Four were read back and visually confirmed on-subject: `market-yam.jpg`
(long rows of yam tubers on compacted earth, traders with scales),
`agriculture-harvest.jpg` (two farmers with a woven basket and cut sorghum
stalks, golden hour), `agriculture-rice-field.jpg` (mirror-still paddy,
dead-straight seedling rows, distant tree line), `infrastructure-export.jpg`
(palletised shrink-wrapped cartons, open shipping container on a concrete dock).

**The remaining 6 are BLOCKED** — `generate_image` is capped at 10 per turn and
the cap was consumed: `professionals-{trader,agent,inspector,analyst}.jpg`,
`reports-{market,coverage}.jpg`. They must be generated in a later turn, then
`python3 scripts/build_image_library.py` re-run.

---

## Phase 3 — Performance & responsiveness

### Explicit dimensions and no layout shift — VERIFIED IN CODE

`HatsiImage`/`HatsiFigure` supply `width`/`height` from the catalogue and the
manifest, so every image reserves its box before the file arrives.

### Hero priority — VERIFIED IN CODE

The login hero is rendered with `priority`; page heroes use `priority` where
registered. No hero is lazy-loaded.

### Mobile overflow on `/login` — MEASURED, then FIXED — VERIFIED IN UI

Measured with Playwright at 320 / 360 / 375 / 390 / 430 / 768 / 1024 / 1440 px:

| Viewport | Before | After |
| --- | --- | --- |
| 320 px | 138 px | **0 px** |
| 360 px | 98 px | **0 px** |
| 390 px | 68 px | **0 px** |
| 430 px | 28 px | **0 px** |
| 768 / 1024 / 1440 px | 0 px | **0 px** |

**Cause, isolated by measurement not by guesswork:** a min-content probe showed
the form column's min-content was 410 px inside a 458 px section. The
offending row was the demo account row — with the copy button and the sign-in
button beside the account text, the row's min-content was 408 px, and the grid
track is sized to its widest content. Fixed by stacking the row below `sm`
(`flex-col` → `sm:flex-row`), so the row's min-content is now its widest
cluster rather than the sum of all three. The comment in
`DemoAccountsPanel.tsx` records the measurement, so the next person does not
"tidy" it back.

### Not measured — stated honestly

No Lighthouse run. No LCP / INP / CLS figure has been captured. WebP/AVIF
derivative support is **PLANNED** (the current pipeline emits JPEG at quality
78 with a 320 KB byte-budget step-down).

---

## Phase 4 — Login audit & redesign

### The form — VERIFIED IN CODE

`src/app/(portal)/login/page.tsx` and `CentralSignInForm.tsx`, audited before
any change:

* Password visibility toggle: `showPassword` → `type={showPassword ? 'text' : 'password'}` — **present**.
* Password recovery: `href="/forgot-password"` — **present**.
* Pending state: `aria-busy={pending}` plus a spinner — **present**.
* Error feedback: `role="alert"` — **present**.
* Invalid credentials surface through `useActionState<AuthActionState, FormData>` — **present**.
* The browser cannot choose its destination: no `router.push`, no
  `window.location`; `safeRedirectPath` is applied server-side.

### The brand panel — VERIFIED IN UI

The left panel previously carried a decorative treatment. It now renders a
**registered photograph** — `getPageImage('home.hero')` → `hero/market-warehouse`
(2000×1125, alt *"Stacks of jute sacks filled with maize and millet on pallets
inside a covered West African grains market."*) — as a `fill`/`priority`/
`object-cover` image under a `bg-brand-900/88` scrim, so the palette stays exact
(`#123B2A` / `#174D35` / `#D5A441` / `#F4EFE4` / `#FFFFFF`) and the copy stays
readable. Verified in a real browser: exactly one `img[src*="market-warehouse"]`
renders.

### Invitation-only, preserved — VERIFIED IN CODE

`signUp` hard-codes `public_user`; the panel states *"Access is
invitation-only"* and links `/contact`. A self-registered account cannot reach
an operational role. `forgot-password` recovery is non-enumerating.

### Screenshot evidence — VERIFIED IN UI

Desktop (1440 px) and mobile (390 px) screenshots were captured and inspected.
Both render the Hatsi360 lockup, the form, the demo panel and the support
footer. Mobile shows **no horizontal scrollbar at any width tested.**

---

## Phase 5 — Demo provisioning & admin visibility

### The accounts exist and authenticate — VERIFIED IN DATABASE + FUNCTIONALLY TESTED

| Account | Role | Landing | Status |
| --- | --- | --- | --- |
| `demo.agent@hatsi360.test` | `agent` | `/agent/home` | active |
| `demo.verifier@hatsi360.test` | `verification_officer` | `/admin/verification` | active |
| `demo.admin@hatsi360.test` | `admin` | `/admin/overview` | active |

Password `hatsi360-demo`. All three were created with the Auth Admin API
(`scripts/manage_demo_users.mjs`), verified live over a real password grant, and
driven end-to-end in Chromium by `scripts/verify_demo_journey.mjs` — **all
journeys passed**, each landing on its server-resolved route. `auth.users`
contains exactly these 3 rows; 29 leaked offer-workflow fixtures were swept.

### The password is never displayed — VERIFIED IN CODE

`DemoAccountsPanel.tsx` contains no literal password. The password is copied to
the clipboard from a `CopyButton`, and the removal command is printed instead.
Grep for the literal in `src/` returns nothing.

### The copy buttons work — VERIFIED IN UI

* `CopyButton` uses the async Clipboard API with a `textarea` +
  `execCommand` fallback for non-secure contexts.
* Measured: clicking the password button writes **`"hatsi360-demo"`** to the
  clipboard; clicking the administrator button writes
  **`"demo.admin@hatsi360.test"`**.
* Feedback confirmed: the visible label flips to **`Copied`**, the
  `aria-label` flips to `"demo password copied"`, and the label resets after
  2 s. (An earlier probe reported the label still reading `Copy` — that was a
  **probe artifact**: the locator was re-querying `[aria-label="Copy …"]`,
  which the click itself had invalidated. Instrumented, confirmed, and the
  probe rewritten to match either state.)
* Zero page errors during the whole run.

### The demo does not overclaim — VERIFIED IN CODE

The panel states, in the shipped copy: *"Signing in is the same sign-in a real
account uses — it proves the portal opens and routes correctly, under the same
permissions. It does not add any market data: the operational records are
empty, so an empty screen is the honest state and not a fault."* No sample
prices, no fabricated intelligence, no "live" status.

### The demo is constrained by policy, not by hidden buttons — FUNCTIONALLY TESTED

`tests/auth/demo-access.test.ts` (25 tests, all passing) proves against the live
database that:

* the demo agent **cannot promote itself** — two independent guards refuse it:
  the `security invoker` trigger `prevent_role_escalation()` (migration 0005)
  raises *"Only an administrator may change an account role"*, and the RLS
  policy on `profiles` matches no rows for a non-admin caller. The assertion is
  on the read-back role, which stays `agent`.
* the demo agent **cannot modify another account** — 0 rows returned.
* the demo agent **cannot write an observation at an unassigned market** — the
  insert is refused (HTTP ≥ 400).
* every demo account's `full_name` begins `DEMO — `, so it cannot be mistaken
  for a real user in a directory, an audit trail or an assignment table.

---

## Phase 6 — Global visual consistency — PARTIAL

* **DONE:** the login page now uses the registered photograph rather than a
  gradient, in the exact palette, with the Inter/Geist stack and tabular
  numerals inherited from the design system.
* **DONE:** the placeholder disclosure defect was fixed, so a substituted image
  can never render as though it were the real thing.
* **PLANNED:** a sweep of remaining pages to confirm every one resolves through
  the registry and none carries a hard-coded URL. The registry test already
  asserts no remote host; the page-by-page pass is not complete.

---

## Phase 7 — Automated tests & real project checks

### Test suite — FUNCTIONALLY TESTED

```
npx vitest run            (with .env.local loaded, HATSI_ORIGIN set)

Test Files  2 failed | 31 passed | 1 skipped   (34)
     Tests  11 failed | 721 passed | 28 skipped (760)
```

**All 11 failures are the 6 pending source originals** — 8 in
`tests/images/registry.test.ts` and 3 in `tests/images/designation.test.ts`,
each naming a missing file. **No other test fails.**

### New tests written this phase — FUNCTIONALLY TESTED

| File | Tests | Result |
| --- | --- | --- |
| `tests/images/designation.test.ts` | 22 | 19 pass, 3 fail on the 6 pending images |
| `tests/auth/demo-access.test.ts` | 25 | **25 pass** |

`designation.test.ts` asserts the invariants rather than re-describing the
catalogue: every asset has a source original; no remote URLs; dimensions and
byte counts match the files on disk; alt text exists on everything that carries
information; **every market asset is `representative`**; markets are 1:1 with
assets; commodity reuse is limited to the named, justified exceptions; no two
served files are byte-identical; the library stays inside its byte budget;
generated imagery is disclosed as generated in every licence string.

`demo-access.test.ts` asserts the demo is real (it authenticates), honest (the
copy says the records are empty) and constrained (it cannot promote itself,
modify another account, or write outside its assignment).

### Project checks — FUNCTIONALLY TESTED

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | **clean** |
| `next build` | **compiled** |
| `scripts/build_image_library.py` | "Built 46 of 52 assets, 11162 KB" |
| `scripts/verify_demo_journey.mjs` | **ALL JOURNEYS PASSED** |
| Playwright mobile/desktop probe | **0 overflow, 0 page errors** |
| `npm run lint` | **BROKEN** — invokes `next lint`, removed in Next 16. Not fixed (out of scope; would need an ESLint flat-config migration). |

---

## Open items

| # | Item | Classification | Blocker / next step |
| --- | --- | --- | --- |
| 1 | 6 source originals not generated | **BLOCKED** | `generate_image` 10-per-turn cap consumed. Retry next turn, then rebuild. |
| 2 | 11 test failures | **BLOCKED** | All caused by item 1. |
| 3 | `src/app/(site)/page.tsx` calls `source.listObservationsForAnalysis({})` | **VERIFIED IN CODE** | Full scan per render once rows exist. Needs pagination or a cache. |
| 4 | No Lighthouse / LCP / INP / CLS numbers | **UNKNOWN** | No run performed. |
| 5 | WebP/AVIF derivatives | **PLANNED** | Pipeline currently emits JPEG only. |
| 6 | `npm run lint` broken | **VERIFIED IN CODE** | Next 16 removed `next lint`; needs flat-config migration. |
| 7 | `agriculture.rice-field` orphaned | **VERIFIED IN CODE** | Retained deliberately; documented in the audit. |
| 8 | A GitHub personal access token from an earlier session was exposed | — | **Should be revoked by the owner.** Not reproduced here — publishing a credential in order to flag it is how credentials end up in more places. |

## Deliberately not done

* No migration was added for the demo accounts — they are Auth users, not
  schema, and the Auth Admin API is the correct interface.
* No production deployment, no DNS change, no repurposing of the connected
  Supabase project.
* No image was scraped. Every asset is either a Hatsi360 original generated for
  this platform or already owned by it.
* No remote-domain image allowlist was introduced, because no remote domain is
  used — the stronger position is zero external image dependencies.
