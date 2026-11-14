# Hatsi360 Markets — Interaction and Feedback

**Phase 02 · Restrained micro-interactions, honest feedback**
Status: **Implemented and verified.**

---

## 1. The rule

A terminal is read repeatedly, all day, by someone who already knows what they are looking for. Every
animation is therefore either **under 200ms** or **absent**. Nothing bounces, nothing pulses, nothing
travels.

There are **no animated prices**. A price that ticks implies a live feed. This platform collects on
a cadence — daily, weekly, ad-hoc — and it publishes after verification. Simulating a continuously
streaming terminal would be the single most dishonest thing the interface could do.

---

## 2. Motion tokens

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | `90ms` | Hover on a row, a control's colour change. |
| `--duration-fast` | `140ms` | Control state, a chip's appearance. |
| `--duration-panel` | `200ms` | A panel's shadow or border change. |
| `--ease-terminal` | `cubic-bezier(0.2, 0, 0.1, 1)` | Everything. |

The design-system test asserts that no motion duration exceeds **250ms**.

---

## 3. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .terminal,
  .terminal *,
  .editorial,
  .editorial * {
    transition-duration: 0.001ms !important;
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

This block is **deliberately separate** from the loading system's own reduced-motion block. They
answer different questions: that one describes what each loading component *becomes* when it stops
moving; this one guarantees that nothing in either environment transitions or animates at all.

It also cannot live inside `@layer components` alongside the loading components, because a rule
inside a layer is subordinate to the utilities that follow it — and this guarantee is meant to win.

An earlier draft folded the terminal rules into the loading block and left a comment claiming they
were one region. The comment was wrong; the code was corrected and the comment now describes what
the stylesheet actually does.

---

## 4. Loading feedback

Four levels, each with its own component:

| Level | Component | Behaviour |
|---|---|---|
| Boot curtain | `HatsiBootSignal` | Full-screen, first startup only. Has a 10s watchdog that reveals a recovery panel if the app never finishes loading. |
| Progress bar | `HatsiLoadingIndicator` | Quiet route-level indicator during navigation. |
| Skeletons | `MarketTableSkeleton`, `OverviewCardSkeleton`, `ChartSkeleton`, `CommodityCardSkeleton`, `PanelSkeleton`, `SkeletonBlock` | Each mirrors the component it replaces. |
| Action loader | `HatsiActionLoader` | In-place feedback for a submission, upload or export. |

**Every skeleton mirrors its target.** A skeleton that is a grey rectangle where a table will be
causes a layout jump when the table arrives. The table skeleton has the table's shape, including its
header row.

---

## 5. Empty states

`EmptyStatePanel` takes one of ten kinds. **Each names the situation *and* says what would change
it.** An empty state that only says "nothing here" tells a reader nothing about whether the platform
is broken, incomplete, or simply has not been given this data yet.

| Kind | Names |
|---|---|
| `no-market-data` | Nothing has completed verification and publication. |
| `no-commodity-results` | No commodity matches those filters. |
| `no-history` | Not enough observations for a series. |
| `no-comparison` | The comparison is unavailable for this grade and unit. |
| `no-research` | No published research. |
| `no-watchlist` / `no-alerts` | Nothing saved yet. |
| `no-coverage` | No market is reporting. |
| `no-observations` | No observation for this series. |
| `no-fundamentals` | No field intelligence recorded yet. |

---

## 6. Error states

`ErrorStatePanel` takes one of seven kinds. **A retry is offered only when
`ERROR_STATE_COPY[kind].retry` is true *and* a handler was supplied.**

A retry button that cannot retry is a lie with a cursor. If the database is unreachable, a retry is
honest — the reader can try again. If the record genuinely does not exist, a retry is theatre, and
the state says what is actually true instead.

---

## 7. Freshness feedback

`DataFreshnessIndicator` renders three things together, always:

1. **The state in words** — "Recently observed", "Delayed", "Stale", "No observation".
2. **The actual collection time** — not the page load time.
3. **A colour** — as reinforcement only.

`FreshnessExplanation` supplies the methodology sentence for a panel.

**A freshly loaded page is never presented as freshly collected data.** These are different facts,
and conflating them is the single most common way a price platform misleads. The header's own
freshness summary reports *collection* state and is `null` — falling back to a coverage line — when
nothing is published, so no fake "Live" pulse can appear.

---

## 8. Interaction contracts

| Control | Contract |
|---|---|
| `SearchInput` | A plain GET form. Navigates; does not fetch. |
| `Tooltip` | CSS-only, `<button>` trigger, `aria-describedby` panel. |
| `DropdownMenu` | A real disclosure button; owns its `aria-expanded`. |
| `Modal` / `Drawer` | Close on Escape, backdrop and selection. Focus-managed. |
| `Tabs` | `aria-selected`, rendered as links. |
| `ChartSegment` | `role="radiogroup"`. |
| `WatchPagination` | Real links, `rel=prev`/`rel=next`, `aria-current="page"`. |
| Market table header | `aria-sort`, and the sort direction is reflected in the DOM. |

---

## 9. How this document was verified

```bash
grep -n "duration-panel\|ease-terminal\|prefers-reduced-motion" src/app/globals.css
grep -n "MOTION" src/lib/brand.ts
./node_modules/.bin/vitest run tests/loading tests/design-system
```

The loading suite asserts the reduced-motion block contains the boot and progress rules; the
design-system suite asserts motion ≤ 250ms and that the empty-state and retry contracts hold.
