# Hatsi360 Markets — Responsive Design

**Phase 02 · A deliberate mobile experience, not a compressed desktop one**
Status: **Implemented and verified in a real browser.** See §5 for the measured results and the two
defects the check found.

---

## 1. The principle

The brief is explicit that mobile must not be the desktop squeezed. A ten-column watch table at
360px is unreadable, and a six-module nav bar with dropdowns is unusable with a thumb.

So the mobile terminal does three **different** things, rather than three smaller versions of the
same things:

1. **A compact branded header** — mark, product name, search, account. Never the full desktop bar.
2. **A drawer, not a dropdown** — a real `role="dialog" aria-modal="true"` panel carrying the full
   module index with destinations expanded.
3. **A bottom bar** — four destinations, thumb-reachable, always visible.

And the **watch table becomes `MarketWatchCards`** below `md`: price cards, not a horizontally
scrolling six-column table.

---

## 2. The breakpoints, and what changes at each

| Width | Environment |
|---|---|
| ≥ 1280 | Full terminal. Three-column grids, six-column watch table, simultaneous mover panels. |
| 1024–1279 | Full terminal, tighter. Trailing module menus flip to right-aligned. |
| 768–1023 | Tablet. Two-column grids, drawer navigation, bottom bar. |
| 430–767 | Large phone. Single column, cards, bottom bar. |
| 360–429 | Phone. Single column, cards, filters wrap. |
| < 360 | Small phone. Same as phone, with the drawer capped at `min(20rem, 88vw)`. |

---

## 3. What is preserved at every width

On mobile the card preserves, in this order: **commodity, price, unit, market, movement, observation
time.** These six are the decision set. Everything else — grade, price type, verification status —
moves to a secondary line or is available on the commodity page.

A reader must never have to zoom in to read a price.

---

## 4. What is never done

- **No aggressive compression.** Controls do not shrink below a usable width; filters wrap instead.
- **No horizontal page scroll.** A table may scroll inside its own container
  (`.terminal-panel.overflow-x-auto`); the page itself must not.
- **No hidden information behind a hover.** Hover is an enhancement; focus and tap are the contract.
- **No desktop-only navigation on a phone.** The `lg:flex` nav is `hidden` below 1024 and the bottom
  bar takes over.

---

## 5. Measured results

A Playwright check (`scripts/check-responsive.mjs`) renders seven routes at eight widths and
measures horizontal overflow, the presence of real content in `<main>`, and the correct
navigation for the width.

**Two defects were found and fixed:**

| Width | Route | Symptom | Cause | Fix |
|---|---|---|---|---|
| 1024 | all seven | 10px horizontal overflow | The last module's dropdown is `absolute left-0 w-60` at `left:794`, extending to 1034 — past the 1024 viewport. It was `invisible`, but it still contributed to `scrollWidth`. | `MainNavigation` passes `align="end"` to the trailing two modules, anchoring their menus to the right edge. |
| 360 | `/insights` | 16px horizontal overflow | `PageHeader`'s actions row was `shrink-0`, pinning a 285px button beside the title block. | The actions row is now `min-w-0 max-w-full flex-wrap`, so it wraps below the title. |

After both fixes: **56 of 56 checks pass** across 1440, 1366, 1280, 1024, 768, 430, 390 and 360.

```bash
# Requires a running server on :3111
./node_modules/.bin/next start -p 3111 &
node scripts/check-responsive.mjs
```

---

## 6. The tablet decision

At 1024px the terminal keeps its full chrome — the watch table, the movers, the filters — because a
tablet in landscape is a legitimate reading surface for a dense table. What changes is the grid:
three columns become two, and the mover panels stack.

At 768px the drawer takes over from the horizontal nav. This is the width at which a six-module
horizontal bar with dropdowns stops being usable, not the width at which it stops fitting.

---

## 7. How this document was verified

```bash
node scripts/check-responsive.mjs http://127.0.0.1:3111
# 56 checks: overflow, main content, nav correctness per width
```
