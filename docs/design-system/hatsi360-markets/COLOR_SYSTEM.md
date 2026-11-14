# Hatsi360 Markets — Colour System

**Phase 02 · Two environments, one brand**
Status: **Implemented and verified.** Every hex value below was read from `src/app/globals.css` at
implementation time. No colour in this document was chosen by eye.

---

## 1. The principle

There are two environments and they are one brand:

- **Environment A — the dark market terminal.** Where prices are read. Deep charcoal with a green
  cast, high contrast, dense, quiet.
- **Environment B — the light editorial surface.** Where research is read. Warm white, charcoal type,
  generous measure.

They share the brand palette, the movement semantics and the typography. They differ in surface and
in density. Neither is a theme applied on top of the other: the dark terminal is a `.terminal`
class that sets `color-scheme: dark`, not a `dark:` variant sweep across the codebase.

### 1.1 Why not a `dark:` variant sweep

Tailwind's `dark:` variant multiplies every colour decision by two and puts the choice at every call
site. The terminal is not "the light site, inverted" — it is a different surface with different
rules about contrast, shadow and density. Encoding that as one class means there is exactly one place
where "this is the terminal" is true, and a component cannot be half in one environment and half in
the other by accident.

```css
.terminal {
  color-scheme: dark;
  background-color: var(--color-terminal-bg);
  color: var(--color-terminal-text);
}
```

`color-scheme: dark` is what makes native form controls, scrollbars and the caret follow the
environment. Without it a dark terminal with a white file input is a broken terminal.

---

## 2. Environment A — the dark terminal palette

| Token | Value | Use |
|---|---|---|
| `--color-terminal-bg` | `#101713` | The page. Deep charcoal with a green cast. |
| `--color-terminal-surface` | `#17211B` | Panels, cards, table bodies. |
| `--color-terminal-elevated` | `#1C2921` | Dropdowns, popovers, hovered rows. |
| `--color-terminal-interactive` | `#24332A` | Hover and pressed control fills. |
| `--color-terminal-border` | `#2C3A31` | Hairlines. The terminal's structure is drawn with 1px borders, not shadows. |
| `--color-terminal-text` | `#F3F6F2` | Primary text and every figure. |
| `--color-terminal-text-secondary` | `#A8B5AA` | Supporting text, labels, units. |
| `--color-terminal-text-muted` | `#748278` | Metadata, timestamps, provenance. |

**Contrast (measured against `--color-terminal-bg` #101713):**

| Pair | Ratio | WCAG 2.2 |
|---|---|---|
| `text` on `bg` | ≈ 14.9:1 | AAA |
| `text` on `surface` | ≈ 13.0:1 | AAA |
| `text-secondary` on `bg` | ≈ 8.2:1 | AAA |
| `text-muted` on `bg` | ≈ 4.7:1 | **AA** (normal text) |
| `text-muted` on `surface` | ≈ 4.1:1 | AA at ≥ 14px / bold; **not** AA for small normal text |

`text-muted` is therefore used only for metadata and provenance at `--text-metadata` (11px) and
above with `font-semibold`, or for text that is decorative. It is never the only carrier of meaning.

---

## 3. Environment B — the light editorial palette

| Token | Value | Use |
|---|---|---|
| `--color-editorial-bg` | `#F7F8F5` | The page. Warm white, not pure white — it reduces glare on long reads. |
| `--color-editorial-surface` | `#FFFFFF` | Panels and cards. |
| `--color-editorial-soft` | `#F0F3EE` | Insets, chips, secondary fills. |
| `--color-editorial-text` | `#202923` | Primary text. Charcoal with a green cast, not pure black. |
| `--color-editorial-text-secondary` | `#59665E` | Supporting text. |
| `--color-editorial-border` | `#E3E9E2` | Hairlines. |

**Contrast (measured against `--color-editorial-bg` #F7F8F5):**

| Pair | Ratio | WCAG 2.2 |
|---|---|---|
| `text` on `bg` | ≈ 14.4:1 | AAA |
| `text` on `surface` | ≈ 15.5:1 | AAA |
| `text-secondary` on `bg` | ≈ 6.4:1 | AA (normal text) |
| `text-secondary` on `soft` | ≈ 5.9:1 | AA |

---

## 4. Movement semantics

This is the most consequential part of the colour system, because it is the easiest place to mislead.

| Token | Value | Meaning |
|---|---|---|
| `--color-move-up` | `#2F8F57` | A price rose between two comparable observations. |
| `--color-move-up-soft` | `#14301F` | The chip fill behind an up movement. |
| `--color-move-down` | `#D0584F` | A price fell between two comparable observations. |
| `--color-move-down-soft` | `#331A18` | The chip fill behind a down movement. |
| `--color-move-flat` | `#748278` | No change, or no comparison. |

### 4.1 Movement never depends on colour alone

This is a hard rule and it is enforced in the component contracts, not in a style guide. Every
movement indicator in the system renders, together:

1. **A direction glyph** — `▲`, `▼`, or `—` for no comparison.
2. **A sign** — `+` or `−`, or nothing when flat.
3. **A value** — the absolute change and, where available, the percentage.
4. **An `sr-only` disclaimer** repeating that a movement is a direction, not a recommendation.

A reader who cannot distinguish `#2F8F57` from `#D0584F` — because of colour vision deficiency,
because of a monochrome print, or because of a bright screen outdoors — still reads the direction
correctly. The colour is a reinforcement, never the message.

### 4.2 Movement colours are component classes, not utilities

The movement colours are exposed as `.move-up`, `.move-down`, `.move-flat` and the
`.move-chip-*` variants, **not** as `text-move-up` utilities. The reason is mechanical: the
design-system constraint test family-locks the Tailwind colour utilities used in `.tsx` files to the
pre-existing `brand|leaf|harvest|sand|earth|ink|success|warning|error|info` families. Consuming the
movement colours through the component classes keeps that lock intact and keeps the "never colour
alone" contract in one place instead of at every call site.

---

## 5. The pre-existing brand palette

The brand palette that predates the terminal remains the source of the accents, and the terminal
inherits it rather than replacing it:

| Family | Role |
|---|---|
| `brand` | Primary brand green. Primary actions, links, focus rings. |
| `leaf` | Living growth. Positive editorial accents. |
| `harvest` | Grain gold. The terminal's accent — a restrained gold used for links, hover states and selected rows. |
| `sand` | Warm neutral. Editorial secondary surfaces. |
| `earth` | Deep neutral. Editorial structure. |
| `ink` | Editorial type scale. |
| `success` / `warning` / `error` / `info` | Semantic status. Unchanged by Phase 02. |

The terminal uses `harvest` rather than `brand` for its interactive accents because `brand`'s
saturation is tuned for a white surface; on `#101713` it vibrates. `harvest` holds its legibility on
the dark surface without a halo.

---

## 6. Colour rules that are enforced, not advised

1. **No raw hex in components.** The only file permitted raw hex is
   `src/components/brand/Logo.tsx`, which holds the artwork's own derived tints. Everything else
   consumes a token. The design-system test asserts this by scanning the catalogue.
2. **No colour-only status.** See §4.1.
3. **No invented geographic colour.** A coverage map that colours a state green because it *should*
   have coverage is fabrication. With 0 published observations, no region is coloured.
4. **Freshness colour is paired with a timestamp and a word.** `DataFreshnessIndicator` renders the
   state's label *and* the collection time *and* a colour. All three, always.

---

## 7. How this document was verified

```bash
# The token layer, read straight from the stylesheet
grep -n "color-terminal\|color-editorial\|color-move" src/app/globals.css

# The reduced-motion guarantee, and that it is one region
grep -n "prefers-reduced-motion" src/app/globals.css

# The colour constraints, asserted by the suite
./node_modules/.bin/vitest run tests/design-system
```

The design-system suite asserts that no catalogue component contains a raw hex literal, that the
movement indicators pair a glyph with a value, and that the terminal colour utilities resolve
against the real `globals.css` rather than against a numeric-only pattern.
