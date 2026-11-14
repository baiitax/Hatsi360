# Hatsi360 Markets — Brand Identity

**Phase 02 · Product identity, brand system and terminal design system**
Status: **Implemented and verified** — every value in this document is read from the source, not
asserted. See §6 for how each was checked.

---

## 1. What the brand is

| Element | Value | Where it lives |
|---|---|---|
| Product name | **Hatsi360 Markets** | `BRAND.productName` — `src/lib/brand.ts` |
| Organisation | **Hatsi360** | `BRAND.name` |
| Descriptor / category | **African Agricultural Market Intelligence** | `BRAND.descriptor`, `BRAND.category` |
| Tagline | **Know the harvest. Understand the market. Trade with confidence.** | `BRAND.tagline` |
| Endorsement | **Powered by Pluck Agro** | `BRAND.endorsement` |
| Contact address | No 7 Kwanar Zainawa, Tokarawa Industrial Estate, Kano, Nigeria | `CONTACT` |

The product name is **Hatsi360 Markets**. It is not "Hatsi360", and it is not "GonaPulse". The
GonaPulse name and artwork belonged to the predecessor product and were removed; the legacy
`gonapulse-*` artwork files were deleted in the same pass that introduced `hatsi360-*` artwork.

### 1.1 Why the name changed from Hatsi360 to Hatsi360 Markets

Hatsi360 alone describes an organisation. Hatsi360 Markets describes a *product* — a place a
trader opens every morning to read the market. The organisation remains Hatsi360, which is why
`BRAND.name` and `BRAND.productName` are separate fields rather than one string. A page can
therefore be titled "Hatsi360 Markets" while the legal footer, the JSON-LD organisation block and
the contact details all continue to say "Hatsi360".

---

## 2. The identity hierarchy

The brand states itself in a fixed order of precedence, and the order matters:

1. **Hatsi360 Markets** — the product. Largest, first.
2. **African Agricultural Market Intelligence** — the descriptor. Answers "what is this?" in one
   line. Never a slogan, never decorative.
3. **Know the harvest. Understand the market. Trade with confidence.** — the tagline. Used on
   marketing surfaces and in structured data, never inside the terminal chrome.
4. **Powered by Pluck Agro** — the endorsement. Always subordinate.

The endorsement is deliberately last. Hatsi360 must remain independently identifiable: a reader
who sees only the product name should know what the product is, and the endorsement should read
as a statement of provenance rather than as the brand itself. In the terminal chrome it renders
at `0.5625rem` uppercase in the header's secondary toolbar and in the mobile drawer footer — present,
legible, and unmistakably not the headline.

---

## 3. What the brand is not

These are negative requirements, and they are enforced rather than hoped for:

- **Not an agro-company website.** There is no "About our farm" hero, no founder story above the
  fold, and no corporate photography standing in for market data.
- **Not a commodity directory.** The catalogue exists and is complete, but it is a working register
  with freshness and observation counts, not a browsable gallery.
- **Not a price-listing site.** A price is never shown without its unit, its market, its grade, its
  price type and its observation time.
- **Not GonaPulse.** The predecessor name, its artwork and its deployed identity are gone.

---

## 4. Voice

Derived from the descriptor and the tagline, and applied consistently across both environments:

| Situation | Voice |
|---|---|
| A number | State it, with its unit and its source. Never round it into vagueness. |
| No data | Say so, and say what would change it. Never imply a source failed to load when none exists. |
| A movement | Give direction, sign, magnitude and period. Never imply a recommendation. |
| A forecast | There isn't one. The predecessor published a "Price Forecast" figure without a method; it was removed and the removal is stated on the research page. |
| Verification | A row is verified, or it isn't. Nothing is "mostly verified". |

The voice is the same in the dark terminal and in the light editorial environment. Only the surface
changes.

---

## 5. Artwork

The mark and its derived files live in `public/brand/` and are registered in
`src/lib/images/registry.ts`. They are generated, never scraped, and never redrawn by hand —
`src/components/brand/Logo.tsx` is the only file in the codebase permitted raw hex values, and that
is because it holds the artwork's own derived tints.

`BRAND_ARTWORK` in `Logo.tsx` resolves 18 files: the mark (light/dark/mono), the horizontal and
stacked lockups (light/dark/mono), the app icons at 192 and 512, the Apple touch icon, the favicon
at 32, and the social card. The `BrandMark`/`BrandLogo` components take a `tone` of `'light'` or
`'dark'` so the same mark inverts correctly against the terminal's `#101713` and the editorial
`#F7F8F5`.

**A generic image is never presented as a verified photograph of a named market.** Market
photography is either an actual photograph of that market or it is absent. No watermark is ever
removed.

---

## 6. How this document was verified

Every value above was read from the source at implementation time:

```bash
# The identity strings
grep -n "productName\|descriptor\|category\|tagline\|endorsement" src/lib/brand.ts

# The artwork registry
ls public/brand/ | wc -l        # 18 derived files
grep -n "BRAND_ARTWORK" src/components/brand/Logo.tsx

# The design-system and brand constraint tests
./node_modules/.bin/vitest run tests/brand tests/design-system
```

The brand test suite asserts the descriptor, the category, the product name, the tagline, the
endorsement and every `MARKET_NAV` href against a route walk of the real `src/app` tree — so a
navigation entry pointing at a route that does not exist fails the build rather than shipping a
404 link.
