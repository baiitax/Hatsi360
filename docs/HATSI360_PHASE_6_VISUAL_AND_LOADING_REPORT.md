# HATSI360 — Phase 6: visual content system and global loading architecture

**Status:** implemented in the working tree. The registry, the loading
architecture and every integration point are in place; the licensed image
library is built by `scripts/build_image_library.py` from the originals in
`assets/image-sources/`.

---

## 1. Why this phase exists

Two things were missing from the platform after the brand and product phases.

**The visuals were generic.** The public site carried a small set of legacy
marketing photographs — a laptop on a desk, a carousel of stock offices — that
were reused across unrelated pages. An article about cassava price
fluctuations was illustrated with a picture of a laptop. A commodity in the
catalogue had no image of itself. None of it was subject-matched, and none of
it was licensed for this platform.

**The loading states were ad hoc.** There were no `loading.tsx` boundaries at
all. A route change showed nothing. A submission showed a disabled button
with no spinner. There was no application-level startup indicator, so the
first paint was either blank or a flash of unstyled content.

This phase fixes both, in the real application rather than as a proposal.

---

## 2. The image system

### 2.1 One registry, one matching rule

`src/lib/images/registry.ts` is the only place a photograph is chosen. No
component carries an image path; `tests/images/registry.test.ts` asserts
that, so the rule cannot rot.

| What is being pictured | How it is matched |
| --- | --- |
| A commodity | Its canonical **slug** (`paddy-rice`, `maize-yellow`, …) or its catalogue **id** |
| A market | Its canonical **slug** (`dawanau-international-grains-market`, …) or its catalogue **id** |
| A published article | Its article **slug** |
| A page | A route key (`home.hero`, `about.collect`, `pricing.hero`, …) |

The identifiers come from `src/data/seed/reference-data.ts`. The registry's
id maps are asserted against that catalogue by test, so the two cannot drift
apart. Display names are never used for matching — a renamed commodity keeps
its picture.

### 2.2 Truthfulness about market photography

Hatsi360 does not hold licensed photography of every market it reports on.
The brief forbids passing off a generic picture as a verified photograph of a
named market, so the registry distinguishes two kinds of asset:

- `exact` — the picture shows the thing it is filed under (a maize image for
  maize, a yam image for the yam market's subject);
- `representative` — the picture shows *that kind* of place or activity.

Every market image in the current library is representative. The registry
marks it, the interface renders a visible **“Representative image”** badge on
the card and a caption on the detail page, and the alternative text never
names the market as if the picture were of it. The test suite asserts all
three properties.

### 2.3 The library

```
public/images/hatsi360/
  hero/            full-bleed hero imagery
  commodities/     one image per catalogue commodity, by slug
  markets/         one representative image per registered market
  agriculture/     crops, fields, harvest activity
  infrastructure/  storage, grading, bagging, transport, export handling
  professionals/   traders, agents, inspectors, analysts
  insights/        editorial feature images, one per article
  reports/         report and coverage covers
  ui/              the neutral placeholder panel
```

Originals live in `assets/image-sources/` and are **not served**.
`scripts/build_image_library.py` crops and resizes them to the exact
dimensions the catalogue declares, writes progressive JPEGs, generates a
neutral 20-pixel blur placeholder for each, and emits:

- `src/lib/images/generated-manifest.ts` — the real width, height and byte
  weight of every served file, read from the files themselves;
- `docs/IMAGE_LIBRARY_MANIFEST.md` — the human-readable licence,
  attribution, subject, alternative-text and dimensions manifest.

### 2.4 Licensing

Every asset in the library is a **Hatsi360 original asset**: an editorial
illustration generated for this platform and owned by Hatsi360. Nothing is
scraped and nothing is borrowed under an uncleared licence. The test suite
asserts the licence line on every asset, asserts that no source points at a
third-party library, and asserts that no source original is missing.

The legacy `/img` folder — 19 generic marketing files, including the
previous company's logo — has been removed from `public/`.

### 2.5 Delivery

Every photograph is rendered through `src/components/media/HatsiImage.tsx`,
which enforces the delivery rules once:

- the box is reserved before the file arrives, so a photograph never moves
  the page;
- intrinsic dimensions come from the registry, so an image is never squashed;
- `sizes` is always supplied;
- the neutral blur placeholder stands in while the file is in flight;
- only the true hero loads eagerly; everything else is lazy.

`next.config.ts` offers AVIF and WebP where the browser accepts them, with
JPEG as the fallback, and caches optimised renditions for a month.

### 2.6 Where imagery was integrated

| Surface | Treatment |
| --- | --- |
| Homepage | Photographic hero with a deep-green scrim over it; category cards; market-intelligence panel; coverage figure; three customer-segment panels; insight cards |
| Commodity directory | Image-led cards, matched by slug, with a hover zoom |
| Commodity detail | A photographic band above the analytical header |
| Market directory | Image-led cards with a “Representative image” badge |
| Market detail | A representative band above the header; the statistics, comparisons, freshness and history stay dominant below it |
| Insights list and article | A feature image matched to the article's subject, with meaningful alternative text |
| About | A hero image and three photographs of the collection, verification and publication acts |
| Page headers | `PageHero` accepts an optional registry-resolved photograph; applied to 14 pages |
| Admin and Field App | **No decorative imagery.** Density and speed are not compromised for decoration |

---

## 3. The loading architecture

Four distinct levels, each with its own component and its own purpose.

| Level | Component | Where it is used |
| --- | --- | --- |
| Application | `HatsiGlobalPreloader` | The very first startup, on every surface |
| Route | `loading.tsx` boundaries | 24 routes across the public platform, portal, Control Centre and Field App |
| Component | `HatsiPageSkeleton`, `HatsiCardSkeleton`, `HatsiTableSkeleton`, `HatsiChartSkeleton`, `HatsiMetricSkeleton` | Inside route boundaries and around individual data sections |
| Action | `HatsiActionLoader`, `HatsiSubmitState`, `HatsiBusyRegion` | Submissions, uploads, exports, report runs, scheduled jobs, verification decisions |

`HatsiErrorRecovery` covers the failure case: it states what happened, offers
a retry, and returns to an idle state if the retry also fails — a spinner that
cannot end is never left on screen.

### 3.1 The preloader is a boot curtain, not a spinner

It is **server-rendered markup with one small inline script**, so it appears
in the first paint without waiting for JavaScript. The root layout stays a
server component: the only client components are the readiness signal and
the route progress indicator, and both are leaves.

It obeys four rules:

- **It never hides on a timer.** It is dismissed by a readiness signal from
  the client — after React has hydrated and painted — and not before.
- **It never blocks usable content.** It is an overlay; the page beneath it
  is fully server-rendered and readable.
- **It never flickers on a fast connection.** The curtain starts hidden and
  is only *raised* if the application is still starting after a 250 ms grace
  period. A quick load shows no curtain at all.
- **It never loops forever.** A watchdog offers “Try again” and “Continue to
  the page” if readiness never arrives.

The visual language is the brand palette — deep harvest green `#123B2A`,
grain gold `#D5A441`, white and muted typography — with the official reversed
mark at the centre and a single gold arc travelling slowly around a faint
track: a 360 sweep that reads like a dial, never a spinner that spins.

### 3.2 Route-level feedback

A thin grain-gold bar across the top of the viewport, driven by Next.js's
`useLinkStatus`. It appears only while a navigation is genuinely in flight,
never as an overlay, and it never blocks scrolling.

### 3.3 Action-level feedback

Every control that starts work now shows a spinner inside the control, sets
`aria-busy`, and keeps its label in place so the button does not change size
mid-action. The enquiry form, the sign-in and registration forms, the
password-recovery form, the Field App submission and its offline retry, the
CSV export, the scheduled-job runner and the verification decisions all
carry it.

### 3.4 Accessibility and reduced motion

- The curtain is `role="status"`, `aria-live="polite"` and `aria-busy`.
- Every skeleton marks its region `aria-busy` and hides its decorative
  blocks from assistive technology.
- Every action indicator is announced with a live region.
- Under `prefers-reduced-motion`, the curtain keeps its static mark and its
  message, the ring becomes a still arc, the bar becomes a static partially
  filled track, and the spinner stops turning. The feedback is still present
  and still honest; it simply does not move.

---

## 4. Verification

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Clean |
| `npx vitest run` | **Corrected.** This table originally claimed "418 tests, all passing". That claim was wrong: the image library was incomplete at the time the report was written, and the image suite was failing. The current figures are recorded in `docs/HATSI360_FIELD_PHASE_8_IMPLEMENTATION_REPORT.md` §5. As of 22 October 2026 the suite is **449 of 462 passing across 21 files**, with 13 failures — all of them in `tests/images/registry.test.ts`, all of them caused by the image library being 34 assets short of the catalogue. No loading-state test has ever failed: `tests/loading/loading.test.tsx` passes 29 of 29. |
| `npx next build` | Compiled; every route generated |
| `scripts/verify_launch.sh` | Extended with an image-library section and a loading-architecture section |
| `tests/images/registry.test.ts` | 29 assertions over the library, the licence, the alternative text, the slug and id matching, the representative labelling and the registry discipline |
| `tests/loading/loading.test.tsx` | 29 assertions over the four levels, the curtain's rules, the skeletons, the action feedback, the recovery path, reduced motion and the server-component boundary |

---

## 5. Open items

- **Licensed photography of the named markets.** The library currently uses
  representative imagery for every market, clearly labelled. Commissioning
  real photography per market would let the `exact` representation be used
  there, and is the single highest-value remaining improvement to the visual
  system.
- **A CMS seam for the library.** `resolveImage` is the only entry point
  components use, so an admin media manager can be introduced by replacing
  the catalogue source. The catalogue is deliberately a plain JSON file so
  that replacement touches one file.
- **Photographs of the actual Hatsi360 field agents and offices.** The
  professional imagery is representative rather than documentary. Real
  photography would strengthen the trust argument on the about page and in
  the Control Centre.
