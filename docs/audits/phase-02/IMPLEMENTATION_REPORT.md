# Phase 02 — Implementation Report

**Hatsi360 Markets · Product identity, brand system and enterprise market terminal design system**

Status: **COMPLETE.** All four stages delivered and verified. This report records what was built,
what was verified, what was found broken, and what remains.

---

## 1. What was asked for, and what was built

The brief asked for two complementary environments of one brand — a dark market terminal and a light
editorial surface — plus a component library, a market table system, seven page prototypes and ten
design-system documents.

| Deliverable | Status |
|---|---|
| Identity: HATSI360 MARKETS, descriptor, tagline, endorsement | ✅ `src/lib/brand.ts` |
| Colour: §5.1/§5.2/§5.3 token tables + movement semantics | ✅ `src/app/globals.css` |
| Typography: Inter + Manrope, ten roles, tabular numerals | ✅ `@theme` + `TYPE_ROLES` |
| IA: MARKETS, COMMODITIES, TRADE, CHARTS, FUNDAMENTALS, RESEARCH | ✅ `MARKET_NAV` |
| Shell: terminal header, secondary toolbar, drawer, bottom bar | ✅ `TerminalShell`, `MobileNavigation` |
| Component library: core / market data / chart / intelligence / interaction | ✅ 41 components, 5 groups |
| Market table system: 11 columns, sticky head, sortable, responsive | ✅ `MarketWatchTable` + `MarketWatchCards` |
| Cards/KPIs, chart system, feedback, iconography | ✅ |
| Seven page prototypes | ✅ all seven render |
| Ten design-system documents | ✅ `docs/design-system/hatsi360-markets/` |

---

## 2. Stage-by-stage record

### Stage 1 — Inspection

Read `globals.css`, `layout.tsx`, `Logo.tsx`, `SiteHeader.tsx`, `navigation.tsx`, the three NAV
arrays, both constraint test files in full. Mapped 60 component files across 12 directories.
Confirmed **no icon library** and **no dark theme** existed.

### Stage 2 — Token foundation

Inserted the terminal, editorial, movement, typography, spacing, radius, shadow, motion and z-index
token layer into `@theme`, and the component classes (`.terminal`, `.terminal-panel`, `.terminal-rail`,
`.terminal-rule`, `.figure-num`, `.figure-label`, `.move-*`, `.move-chip-*`, `.terminal-control`,
`.terminal-action`, `.terminal-table`, `.editorial*`).

Added `BRAND.productName`, changed `category`/`descriptor` to "African Agricultural Market
Intelligence", and added `MARKET_NAV`, `MARKET_NAV_ROUTES`, `ACCOUNT_NAV`, `TYPE_SCALE`,
`TYPE_ROLES`, `MOTION`, `Z_LAYERS`.

Created the 45-icon hand-drawn Lucide-geometry set.

### Stage 3 — Component library and shell

Built the control set, the price display and movement indicators, the watch table with its mobile
card alternative, the overview/movers/coverage/freshness/history cards, the chart frame system, the
skeleton/empty/error/provenance states, and the terminal shell with its mobile navigation.

### Stage 4 — Pages

Wrote the markets homepage and `/charts`, then the commodity directory, commodity profile, trade
intelligence, fundamentals and research.

---

## 3. Verification results

| Gate | Result |
|---|---|
| `./node_modules/.bin/tsc --noEmit` | **exit 0, no output** |
| `vitest run tests/brand tests/design-system` | **48 passed / 48** |
| `vitest run` (full suite) | **787 passed / 1 failed / 28 skipped** |
| `next build` | **exit 0**, compiled in 24.4s, 47 static pages |
| `eslint src` | **0 errors in Phase 02 code**; 10 pre-existing errors elsewhere |
| `scripts/check-responsive.mjs` | **56 / 56 checks pass** at 8 widths × 7 routes |
| All seven routes render | **HTTP 200** with real streamed content |

---

## 4. Defects found and fixed during verification

These were found by the verification gates, not by assumption. Each is recorded because the fix
explains a design decision.

### 4.1 Three `tests/loading` reduced-motion failures

The test slices `css.lastIndexOf('@media (prefers-reduced-motion…')` and asserts the sliced block
contains `hatsi-boot__arc` and `width: 38%`. A Stage 2 `bash` append had added a **second**
reduced-motion block, so `lastIndexOf` grabbed the wrong one.

**Fixed** by removing the duplicate and folding the terminal rules into a single, correctly-placed
region. Then, when reviewing the result, the comment I had written claimed the rules were "folded
into the loading system's block" — which was **not what the stylesheet did**. The comment was
corrected to describe the actual structure: two separate blocks, for two different questions, with
the terminal's block outside `@layer components` so the guarantee wins.

### 4.2 A `demo-access` test that failed for the wrong reason

The test signs in as `demo.agent@hatsi360.test` and asserts a token comes back. It failed — but the
account authenticates fine, verified with a direct fetch. **Vitest does not populate `process.env`
from `.env.local`**; that is Vite's `import.meta.env` mechanism and it does not reach the test
process. The suite had been passing only when the caller happened to have the variables exported.

**Fixed** by loading the env file in `vitest.config.ts` with `loadEnv` from `vite` (not
`vitest/config`, which does not export it), copying only undeclared variables so an explicit shell
override still wins. The suite is now reproducible rather than shell-dependent.

### 4.3 A build failure: `useState` in a Server Component

`ChartFrame.tsx` and `primitives.tsx` both imported `useState` and were imported by Server
Components. Turbopack refused.

**Fixed** by splitting each into a presentational Server half and an interactive Client half
(`ui/overlays.tsx`, `charts/PeriodRangeChart.tsx`), re-exported so the import surface stays single.
41 of 189 `.tsx` files are now Client Components. This is the split §1.1 of `COMPONENT_LIBRARY.md`
describes.

### 4.4 A `Math.random()` key in the pagination

React's purity rule rejected `key={`gap-${Math.random()}`}`. Replaced with the gap's index.

### 4.5 A `setState` in an effect in the mobile drawer

The drawer stored `open` as a boolean and closed it in a `useEffect` on `pathname`. React's
`set-state-in-effect` rule rejected it, and it was right to: it caused a cascading render.

**Fixed** by deriving the state instead of storing it — the drawer holds the route it was opened on
and is open only while the reader is still on that route. A route change now closes it by
construction, with no effect and no second render.

### 4.6 A 10px horizontal overflow at 1024px, on every page

The last module's dropdown is `absolute left-0 w-60` at `left:794`, extending to 1034 — past a
1024px viewport. It was `invisible`, but it still contributed to `scrollWidth`.

**Fixed** by passing `align="end"` to the trailing two modules so their menus anchor to the right
edge of the bar.

### 4.7 A 16px horizontal overflow at 360px on `/insights`

`PageHeader`'s actions row was `shrink-0`, pinning a 285px button beside the title block.

**Fixed** by making the actions row `min-w-0 max-w-full flex-wrap` so it wraps below the title.

### 4.8 An inaccurate comment in `globals.css`

See §4.1. The code was right; the documentation was not.

---

## 5. `npm run lint` — restored

`npm run lint` was broken in Phase 01 for two reasons, and only one was known:

1. `next lint` was **removed in Next 16**.
2. **ESLint was never a dependency of this project.**

The script has been restored as `eslint .`, with a flat `eslint.config.mjs` importing
`eslint-config-next` directly (Next 16 ships it as a flat config; the `FlatCompat` route fails with a
circular-structure error against `@eslint/eslintrc` 9.39).

**The gate now runs for the first time, and it reports 10 errors — all pre-existing**, in
`admin/*`, `agent/*` and `components/data/*` files that predate Phase 02. They are React 19
compiler-rule violations (`set-state-in-effect`, impure render calls, ref access during render) in
working code. **Phase 02 introduced zero.**

---

## 6. What Phase 02 deliberately did not do

| Not done | Why |
|---|---|
| Install an icon library | 45 hand-drawn Lucide-geometry paths exist; the registry is the swap point. |
| Implement a candlestick chart | `market_price_summary` is median-based, not OHLC. A candle would be fabricated. The prototyped `PeriodRangeChart` is labelled a range bar and says so. |
| Offer intraday chart periods | One observation per commodity/market/day. An intraday series would be fabricated. |
| Publish any price | `published_at` is a separate act from verification. Phase 02 changed no data. |
| Fix the P0 demo-admin finding | It conflicts with the standing "demo credentials always visible" instruction. Surfaced, not actioned. |
| Resolve the fixture-isolation failure | It is a live-data condition (the demo admin mutated a fixture), not a code defect. |

---

## 7. Pre-existing failures, recorded separately

**One failing test:** `tests/data-integrity/fixture-isolation.test.ts` — "attributes every
verification to the demo verifier". This is the Phase 01 P0 data finding (PDI-1): the demo admin
verified a fixture, so `verified_by` is no longer exclusively the verification officer. It is **not**
a Phase 02 regression, and the assertion must not be relaxed.

**Ten ESLint errors** — see §5.

---

## 8. Git recovery

The object store rolled back to `b03c1d0` (the GonaPulse state) during Stage 4, losing the remote
config and making 406 files look modified. Recovered per the established playbook: re-added
`origin`, fetched, `git reset --mixed origin/main` (HEAD → `535e11e`, the Phase 01 commit), verified
the working tree still held all Phase 02 work, then committed as `190faeb` and pushed to
`baiitax/Hatsi360` main. The resulting status was exactly the 21-entry Phase 02 changeset with
nothing spurious.

---

## 9. Phase 03 readiness

Phase 02 is complete and verified. The terminal shell, the design system and all seven page
prototypes are in place and honest.

**The one thing that will limit Phase 03 is data, not code:** the platform holds **0 published price
observations**, so every analytical surface — market watch, movements, gainers/decliners, regional
comparison — correctly renders its honest empty state. That is the truthful state and it must not be
"fixed" by fabrication. See `docs/audits/phase-01/PRICE_DATA_INTEGRITY_AUDIT.md` §3 and §6, and
`REMEDIATION_BACKLOG.md` R-08.
