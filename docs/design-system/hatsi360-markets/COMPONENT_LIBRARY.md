# Hatsi360 Markets — Component Library

**Phase 02 · The catalogue, its contracts and its states**
Status: **Implemented and verified.** 41 named components in five groups, all present in the
catalogue test. This document records what each one guarantees.

---

## 1. The five groups

| Group | Files | Responsibility |
|---|---|---|
| **Core** | `ui/primitives.tsx`, `ui/overlays.tsx`, `ui/icons.tsx` | The controls everything else is built from. |
| **Market data** | `market/PriceDisplay.tsx`, `market/MarketWatchTable.tsx`, `market/MarketOverview.tsx`, `ui/data-display.tsx` | Prices, movements, the watch table, verification. |
| **Chart** | `charts/ChartFrame.tsx`, `charts/PeriodRangeChart.tsx` | The chart frame, its mandatory context, and the range bar. |
| **Intelligence** | `feedback/TerminalFeedback.tsx` (provenance) | Provenance, skeletons, empty and error states. |
| **Interaction** | `terminal/TerminalShell.tsx`, `terminal/MobileNavigation.tsx` | The shell, the header, the drawer, the bottom bar. |

### 1.1 The one deliberate split

Two files are split into a Server half and a Client half:

- `ui/primitives.tsx` (presentational, Server) re-exports the interactive controls from
  `ui/overlays.tsx` (`'use client'`).
- `charts/ChartFrame.tsx` (presentational, Server) re-exports `PeriodRangeChart` from
  `charts/PeriodRangeChart.tsx` (`'use client'`).

A terminal is read far more often than it is clicked. The parts that only *display* must not be paid
for by the parts that *interact*. The split keeps 41 of 189 components as Client Components, and the
import surface stays single: a caller imports the design system from one place and does not need to
know which half it came from.

---

## 2. Core controls

All from `ui/primitives.tsx` and `ui/overlays.tsx`.

### 2.1 Button, IconButton, Spinner

`Button` has exactly one filled variant (`primary`); everything else is a quiet hairline control at
`1.875rem` with secondary text. A terminal with three filled button styles has no visual hierarchy.

Controls own their state attributes, so a control can never be *styled* selected without *being*
selected:

| Control | State attribute |
|---|---|
| Button, filter link | `aria-pressed` |
| Disclosure | `aria-expanded` |
| Panel | `data-loading` |
| Tab | `aria-selected` |

### 2.2 Field, TextInput, Select, SearchInput

`SearchInput` is a **plain GET form** by default. It is not a client component, it does not fetch,
and it navigates. The terminal's search is a URL, which means it is shareable, bookmarkable, and
works with JavaScript disabled.

### 2.3 Tabs, Badge, Divider

`Tabs` uses `aria-selected` and renders as a list of links. `Badge` carries a tone and never carries
meaning by colour alone.

### 2.4 Tooltip

CSS-only, so it works with JavaScript disabled and costs nothing on a phone. The trigger is a
`<button type="button">` — never a div — so it is keyboard-reachable and announced as an expandable
control. The panel is `aria-describedby`-linked rather than left as a floating mystery.

### 2.5 DropdownMenu, MenuItem

A real disclosure button. `aria-expanded` is set by the component, not by the caller.

### 2.6 Modal, Drawer

Both close on **Escape**, on **backdrop click**, and on **selection**. Both are focus-managed. The
Drawer is `role="dialog" aria-modal="true"`.

### 2.7 Icons — 45, hand-drawn, no dependency

`ui/icons.tsx` contains 45 Lucide-geometry-compatible icons, an `ICONS` registry keyed by name, and
an `Icon({ name })` component. Every icon is `currentColor`, `aria-hidden`, and sized in `em` so it
scales with its label.

**No icon library was installed.** Lucide was evaluated and not added — the project already carries
no icon dependency, the required set is small and known, and adding a dependency to draw 45 paths
that are mostly lines is not a trade this codebase should make. The geometry follows Lucide's
conventions (24×24 viewBox, 2px stroke, round caps and joins) so the set is visually
indistinguishable from one and can be swapped for the real library later without touching a call
site.

One implementation note that cost a debugging cycle: the internal shape component was originally
named `Icon`, which collided with the exported `Icon` wrapper and made the registry resolve to
itself. It was renamed to `IconShape`.

---

## 3. Market data components

### 3.1 PriceDisplay

Renders a price with its full context, or an honest refusal:

| Input | Output |
|---|---|
| `amount` is a number | `₦45,000` with unit, grade, market, price type, observed time |
| `amount` is `null` | **"Not observed"** — never `₦0`, never a bare dash |
| `normalizedAmount` is null | falls back to `reportedAmount`, never invents a conversion |

### 3.2 PriceMovementIndicator, PriceChangeBadge

The movement contract, in full:

- Arrow (`▲` / `▼` / `—`) **and** sign (`+` / `−`) **and** value **and** percentage.
- An `sr-only` label repeating *"a movement is a direction, not a recommendation."*
- **"No comparison"** — never a flat zero — when there is no comparable previous period. A zero
  implies stability that the record does not support.
- Colour is `.move-up` / `.move-down` / `.move-flat`, always alongside the glyph and the value.

### 3.3 MarketWatchTable and its alternatives

| Component | Role |
|---|---|
| `MarketWatchTable` | 6 columns, sticky head, `aria-sort`, `.num` right-aligned tabular. |
| `MarketWatchRow` | One row. |
| `MarketWatchCards` | The deliberate ≤`md` alternative. Price cards, not a squeezed table. |
| `WatchPagination` | A `<nav>` of **real links** with `rel=prev`/`rel=next` and `aria-current="page"`. |
| `WatchSort` | Sort state, owned by the page that renders it. |

### 3.4 MarketOverview family

| Component | Guarantee |
|---|---|
| `MarketOverviewCard` | Renders **"Not available"** plus a reason when `value` is `null`. |
| `MarketMovers` | Names the direction it is listing; footer repeats "a direction, not a recommendation". |
| `MarketCoverageSummary` | Renders zero counts as zero. Never hides an empty region. |
| `DataFreshnessIndicator` | Label **and** collection time **and** colour. A freshly *loaded page* is never presented as freshly *collected data*. |
| `FreshnessExplanation` | The methodology sentence, for a panel. |
| `PriceHistorySummary` | Always shows the observation count. A single observation is not a trend. |

### 3.5 VerificationBadge

`status === 'verified'` without a literal `label: 'Verified'` string. Takes
`surface?: 'light' | 'terminal'` so the same badge is legible on both environments.

---

## 4. Chart components

### 4.1 The mandatory context

Every `ChartContainer` renders a mandatory context `<dl>` naming the commodity, the market, the
price type, the grade, the unit and the currency. A chart without its context is a shape, not data.

### 4.2 ChartSegment

`role="radiogroup"` — the series selector is a single-choice control, and it says so.

### 4.3 ChartLegend

Declares the series kind with an explanation. `ChartSeriesKind` is
`observed | aggregated | indicative | projected | range`, and a chart states which one it is
showing. An aggregated median and an observed price are different facts.

### 4.4 PeriodRangeChart — the prototyped candlestick

This is the most important honest decision in the chart system.

A candlestick needs an open, a high, a low and a close **for the same period from the same
series**. This platform aggregates a **minimum, a maximum and a median** over published
observations. That is a description of *dispersion*, not of a trading session.

So the component is a **range bar** — min/max with a median rule — and its figcaption states:
*"This is dispersion, not a trading range."* Drawing a candle from median-based aggregation would
be inventing an OHLC series the schema cannot produce.

`ChartEmptyState`, `ChartLoadingState` and `ChartErrorState` each name the situation and what would
change it. `ChartMetricSummary` pairs a figure with its observation count.

---

## 5. Feedback components

Every skeleton mirrors the component it replaces — `MarketTableSkeleton` has the table's shape,
`OverviewCardSkeleton` the card's, `ChartSkeleton` the chart's.

`EmptyStatePanel` takes one of ten kinds, and **each one names the situation *and* says what would
change it**, because an empty state that only says "nothing here" tells a reader nothing about
whether the platform is broken, incomplete, or simply has not been given this data yet.

`ErrorStatePanel` takes one of seven kinds and **offers a retry only when
`ERROR_STATE_COPY[kind].retry` is true *and* a handler was supplied.** A retry button that cannot
retry is a lie with a cursor.

`ProvenanceNotice` states where a figure came from, and optionally when it was collected.

---

## 6. The shell

`TerminalShell.tsx` — all Server Components:

| Export | Role |
|---|---|
| `TerminalHeader` | Logo, `MainNavigation`, global search, collection state, account. |
| `MainNavigation` | The six-module bar with hover **and** focus-within menus. The module label is always the landing route, so a click never depends on the menu being open. |
| `PageContainer` | The gutter. |
| `PageHeader` | Title, description, actions, meta. |
| `SectionHeader` | Title, count, action. |
| `TerminalShell` | The composition. |

`MobileNavigation.tsx` — the only Client part of the shell. Its drawer's open state is **derived**,
not stored: it holds the route it was opened on, and is open only while the reader is still on that
route. A route change closes it by construction, with no effect and no second render — and a drawer
can never survive navigation to the page whose destination was just tapped.

The header's freshness summary reports **collection** state, never **page** state. It is computed
through the same `classifyFreshness` rules the price cards use, and it is `null` — falling back to a
coverage line — when nothing is published. No fake "Live" pulse can appear.

---

## 7. How this document was verified

```bash
# The catalogue, asserted complete by the suite
grep -n "Phase 02 terminal catalogue" -A 40 tests/design-system/design-system.test.ts

# The five groups, the no-hex rule, and the movement contract
./node_modules/.bin/vitest run tests/design-system

# The Server/Client split
grep -rln "^'use client'" src/ | wc -l     # 41 of 189 .tsx files
```
