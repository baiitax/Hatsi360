# Hatsi360 Markets — Typography System

**Phase 02 · Inter + Manrope, tabular numerals, shared formatting**
Status: **Implemented and verified.** Every size below was read from `src/app/globals.css` and
`src/lib/brand.ts`.

---

## 1. The two families

| Family | Role | Source |
|---|---|---|
| **Manrope** | Display. Headings, section titles, the product name in the header. | `--font-display` |
| **Inter** | Everything else. Body, labels, controls, and **every figure**. | `--font-sans` |

Both are already available in the project. No new font dependency was added, and no third family
(such as Geist) was introduced — the brief asked for the two that exist.

Manrope carries the headings because its slightly condensed, geometric forms hold a heavy weight
without going soft, which is what a dense terminal needs at `0.9375rem`. Inter carries everything
else, and specifically carries every number, because its figures are designed to sit in a row.

---

## 2. The type scale

Defined once in `@theme` and mirrored in `TYPE_SCALE` / `TYPE_ROLES` in `src/lib/brand.ts`, so a
component can ask for a role rather than guess a size.

| Token | Size / line-height | Tracking | Role |
|---|---|---|---|
| `--text-micro` | `0.625rem` / `0.875rem` | `0.06em` | Micro-label. Endorsements, provenance markers. |
| `--text-metadata` | `0.6875rem` / `1rem` | — | Metadata. Timestamps, units, secondary table columns. |
| `--text-label` | `0.75rem` / `1.125rem` | — | Label. Card labels, control text, `figure-label`. |
| `--text-body-sm` | `0.8125rem` / `1.25rem` | — | Body, small. Table cells, panel copy. |
| `--text-figure` | `0.9375rem` / `1.375rem` | — | Figure. Inline prices, primary table values. |
| `--text-figure-lg` | `1.25rem` / `1.5rem` | — | Figure, large. KPI values. |
| `--text-figure-xl` | `1.75rem` / `2rem` | — | Figure, extra large. The headline number on an overview card. |

The Display and Numeric roles are:

| Role | Family | Weight | Extra |
|---|---|---|---|
| Display | Manrope | 700 | `tracking-tight` |
| H1 | Manrope | 700 | `tracking-tight` |
| H2 | Manrope | 700 | — |
| H3 | Manrope | 700 | — |
| Body | Inter | 400 | — |
| Secondary | Inter | 400 | `text-terminal-text-secondary` |
| Label | Inter | 600 | `uppercase tracking-wide` where used as a `figure-label` |
| Metadata | Inter | 400 | `--text-metadata` |
| **Numeric** | Inter | **600** | **`font-variant-numeric: tabular-nums`** |
| Micro-label | Inter | 600 | `--text-micro`, uppercase |

---

## 3. Tabular numerals are not a preference

Every figure in the terminal uses tabular numerals:

```css
.figure-num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1, "zero" 1;
  letter-spacing: -0.01em;
}
```

The reason is that a price column is read down, not across. With proportional figures, `₦45,000`
and `₦125,000` have different widths, so the eye cannot compare them without re-anchoring on each
row. With tabular figures the decimals align and the comparison is free.

`zero` is included so a `0` and an `O` are distinguishable in a dense table — relevant because the
terminal's own name contains a zero.

---

## 4. Formatting is a function, never concatenation

There is exactly one money formatter, `formatMoney(amount, options)` in `src/lib/money.ts`:

```ts
formatMoney(45000, { currency: 'NGN' })                       // ₦45,000
formatMoney(45000, { currency: 'NGN', compact: true })        // ₦45K
formatMoney(45000.5, { currency: 'NGN', decimals: 2 })        // ₦45,000.50
```

It takes an **options object** as its second argument, not a currency string. This was a real
source of defects during implementation: five call sites originally passed a bare currency code and
TypeScript accepted it silently against the wrong overload shape. All five were corrected.

**No component builds a price string by concatenation.** Not `₦` + amount, not
`amount + ' / ' + unit`. The reason is that concatenation puts the currency symbol, the thousands
separator, the decimal separator and the unit spacing in five different files, and each one drifts.
A single formatter means `en-NG` grouping is correct everywhere or wrong everywhere, and it is
correct everywhere.

---

## 5. A price is never shown without its context

The display contract, enforced in `PriceDisplay`:

```
₦45,000            ← the figure, tabular
/ 100 kg           ← the unit, immediately below
Wholesale · Grade A  ← the price type and grade
Dawanau Market     ← the market
Observed: 12 Nov, 10:45 AM  ← the observation time
```

When the amount is `null`, the component renders an honest **"Not observed"**. It never renders
`₦0`, never renders a dash that could be misread as zero, and never renders a previously cached
figure.

---

## 6. Long text

Both environments handle long text deliberately:

- **Terminal.** Commodity names truncate with `truncate` and a `title` attribute. The full string is
  never silently dropped — it is available on hover and to a screen reader.
- **Editorial.** `editorial-prose` sets a comfortable measure and `text-wrap: pretty` where
  supported, because a research brief is read in paragraphs, not scanned.

The design-system test asserts that every catalogue component's long-text path is exercised: a
component that only works with a 6-character commodity name is not finished.

---

## 7. How this document was verified

```bash
# The scale, read from the stylesheet
grep -n "text-micro\|text-metadata\|text-label\|text-body-sm\|text-figure" src/app/globals.css

# The roles, read from the brand module
grep -n "TYPE_SCALE\|TYPE_ROLES" src/lib/brand.ts

# The formatter's real signature
grep -n "export function formatMoney" -A 12 src/lib/money.ts

# The tabular-numerals rule, asserted in the suite
./node_modules/.bin/vitest run tests/design-system
```
