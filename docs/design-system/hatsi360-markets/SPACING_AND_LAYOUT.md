# Hatsi360 Markets — Spacing and Layout

**Phase 02 · A terminal rhythm and an editorial rhythm**
Status: **Implemented and verified.**

---

## 1. Two rhythms, on purpose

The terminal is read all day, repeatedly, by someone comparing numbers. The editorial surface is
read once, in paragraphs. They need different vertical rhythms, and pretending otherwise produces
either a cramped article or a wasteful table.

| Token | Value | Environment |
|---|---|---|
| `--spacing-terminal-gutter` | `1rem` | Terminal page gutter. |
| `--spacing-terminal-panel` | `1rem` | Terminal panel padding. |
| `--spacing-terminal-row` | `0.5rem` | Terminal table row padding. |
| `--radius-panel` | `0.625rem` | Terminal panel radius. |
| `--radius-control` | `0.375rem` | Terminal control radius. |
| `--radius-pill` | `999px` | Chips, badges, freshness pills. |
| `--radius-card` | `0.875rem` | Editorial card radius (pre-existing). |

The terminal's controls are `1.875rem` tall — shorter than a typical web button, because a control
that is 44px tall in a table of 30 rows doubles the table's height for no gain. Touch targets are
handled separately (see §4).

---

## 2. The terminal page structure

```
.terminal                     the environment: color-scheme, background, text
  .terminal-rail              sticky, top-0, z-header — the header and toolbar
    TerminalHeader            logo · nav · search · status · account
    (secondary toolbar)       collection state, never page state
  main#main                   flex-1, pb-10
    PageContainer             the gutter
      PageHeader              title · description · actions · meta
      SectionHeader           title · count · action
      .terminal-panel         the content unit
        .terminal-table       sticky head, tabular numerals
```

`PageContainer` applies the gutter and the max width. `PageHeader` is the page's title block;
`SectionHeader` is a section's. Both are exported from
`src/components/terminal/TerminalShell.tsx` and are Server Components.

---

## 3. Density rules

| Rule | Reason |
|---|---|
| Panels are separated by 1px borders, not shadows or gaps | A border reads as structure; a shadow reads as elevation the terminal does not have. |
| Table rows are `--spacing-terminal-row` | 30 rows must fit without scrolling on a 1440×900 viewport. |
| Section spacing is `pb-6`/`pb-8`, not `py-20` | The marketing rhythm would make the terminal feel like a brochure. |
| Figures are right-aligned and tabular | Comparison is the primary reading task. |
| Sticky table headers | A 30-row table is scrolled; the column meanings must not scroll away. |

---

## 4. Touch targets and mobile

The `1.875rem` control height is a desktop decision. On mobile the system does not compress the
terminal — it changes shape:

- **The watch table becomes `MarketWatchCards`** below `md`. Not a horizontally-scrolling
  six-column table at 360px, which is unreadable.
- **The bottom bar** is a fixed 4-item bar with `size-5` icons and comfortable hit areas.
- **The drawer** is a real `role="dialog" aria-modal="true"` panel, `min(20rem, 88vw)` wide.
- **Filters** wrap rather than shrink. A filter control that becomes 40px wide is not a filter.

---

## 5. Z-index layers

Defined once in `Z_LAYERS` and consumed as `z-[var(--z-…)]` — never as bare `z-[80]`, which is how
layering bugs start.

| Layer | Value | Use |
|---|---|---|
| `sticky` | 20 | Sticky table headers, the bottom bar. |
| `header` | 40 | The terminal rail. |
| `drawer` | 60 | The mobile drawer and its backdrop. |
| `modal` | 70 | Modals. |
| `tooltip` | 80 | Tooltips. |
| `boot` | 200 | The boot curtain. |

---

## 6. Motion and space

| Token | Value |
|---|---|
| `--duration-instant` | `90ms` |
| `--duration-fast` | `140ms` |
| `--duration-panel` | `200ms` |
| `--ease-terminal` | `cubic-bezier(0.2, 0, 0.1, 1)` |

Nothing in the terminal animates for longer than `200ms`, and everything stops entirely under
`prefers-reduced-motion: reduce`. The guarantee lives in its own `@media` region, separate from the
loading system's, because the two answer different questions — and a rule inside `@layer components`
would be subordinate to the utilities that follow it, whereas this guarantee is meant to win.

There are **no animated prices**. A price that ticks implies a live feed the platform does not have.
The platform collects on a cadence; it does not stream.

---

## 7. How this document was verified

```bash
grep -n "spacing-terminal\|radius-panel\|radius-control\|z-sticky\|duration-panel" src/app/globals.css
grep -n "Z_LAYERS\|MOTION" src/lib/brand.ts
./node_modules/.bin/vitest run tests/design-system
```

The suite asserts the z-layer ordering, that motion never exceeds 250ms, and that the reduced-motion
guarantee is present.
