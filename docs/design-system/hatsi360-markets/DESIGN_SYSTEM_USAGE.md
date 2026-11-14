# Hatsi360 Markets — Design System Usage

**Phase 02 · How to use the system, and how not to**
Status: **Implemented and verified.**

---

## 1. Start here

```bash
# The tokens
src/app/globals.css                      @theme + component classes

# The identity and the IA
src/lib/brand.ts                         BRAND, MARKET_NAV, DESIGN_TOKENS, TYPE_ROLES, MOTION, Z_LAYERS

# The controls
src/components/ui/primitives.tsx         Button, Field, Select, Tabs, Badge, …
src/components/ui/overlays.tsx          Tooltip, DropdownMenu, Modal, Drawer  ('use client')
src/components/ui/icons.tsx              Icon({ name }) — 45 icons, no dependency

# The market components
src/components/market/                   PriceDisplay, MarketWatchTable, MarketOverview
src/components/charts/                   ChartFrame, PeriodRangeChart
src/components/feedback/                 TerminalFeedback
src/components/terminal/                 TerminalShell, MobileNavigation
```

---

## 2. The four rules that matter most

### 2.1 Never build a price string by concatenation

```ts
// Wrong
₦{amount} / {unit}

// Right
<PriceDisplay amount={amount} unit={unit} currency={currency} … />
```

There is one formatter, `formatMoney(amount, { currency })`. It takes an **options object** as its
second argument, not a currency string. Five call sites originally passed a bare code and TypeScript
accepted it silently against the wrong shape; all five were corrected. Concatenation puts the
currency symbol, the grouping, the decimals and the unit spacing in five files, and each one drifts.

### 2.2 Never show a movement without its direction

```tsx
// Wrong — colour alone
<span className="text-move-up">+4.2%</span>

// Right
<PriceMovementIndicator change={change} changePercent={changePercent} currencyCode={currency} />
```

Arrow **and** sign **and** value **and** `sr-only` disclaimer. Always. A reader with colour vision
deficiency, a monochrome print, or a bright screen outdoors must read the direction correctly.

### 2.3 Never show a price without its context

A price is not a number. It is a number **plus** unit, grade, market, price type and observation
time. `PriceDisplay` renders all of them, and renders an honest **"Not observed"** when the amount
is `null` — never `₦0`, never a bare dash.

### 2.4 Never present page freshness as data freshness

```ts
// Wrong — this is when the page loaded
new Date()

// Right — this is when the data was collected
observation.collectedAt
```

`classifyFreshness` in `src/lib/trade/freshness.ts` is the single implementation. The header summary
and the price cards both use it, so they cannot disagree.

---

## 3. Adding a component

1. **Decide which environment.** Dark terminal (`.terminal`) for market data; light editorial
   (`.editorial`) for long-form. Not both, and not neither.
2. **Decide Server or Client.** If it holds state, it is Client. Put it in its own file with
   `'use client'` and re-export it from the presentational module, so the display half stays a Server
   Component.
3. **Use tokens, never hex.** The only file permitted raw hex is `components/brand/Logo.tsx`.
4. **Handle all six states**: default, long text, empty, loading, error, and — where relevant —
   unavailable-with-a-reason.
5. **Add it to the catalogue** in `tests/design-system/design-system.test.ts` under
   "Phase 02 terminal catalogue". If it is not in the catalogue, it is not part of the system.

---

## 4. Adding a page

1. Wrap it in `PageContainer`.
2. Open with `PageHeader` — title, description, actions.
3. Use `SectionHeader` for each section, with a real `count`.
4. Compose from the existing components. **Do not re-implement a price row, a movement chip, a
   freshness pill or a table header.**
5. `export const dynamic = 'force-dynamic'` if it reads live data.
6. Use `title: { absolute: … }` if the root layout's `title.template` would double the brand name.
7. Add it to `MARKET_NAV` **only when the route exists** — the brand test asserts every href
   resolves. If it is intended but unbuilt, put it in `planned`, which is never rendered as a link.

---

## 5. Consuming the terminal's colour utilities

The terminal, editorial and movement palettes are exposed as **component classes**, not as
`text-terminal-*` / `text-move-*` utilities:

```tsx
// Right
<div className="terminal-panel">…</div>
<span className="figure-num">…</span>
<span className="move-up">▲ +4.2%</span>

// Not available as utilities, by design
<div className="text-terminal-text">…</div>
```

The reason is mechanical: the design-system constraint test family-locks the Tailwind colour
utilities used in `.tsx` files to the pre-existing `brand|leaf|harvest|sand|earth|ink|success|
warning|error|info` families. Consuming the new palettes through component classes keeps that lock
intact and keeps the "never colour alone" contract in one place.

---

## 6. Icons

```tsx
import { Icon } from '@/components/ui/icons';

<Icon name="markets" className="size-4" />
```

45 icons, Lucide geometry, `currentColor`, `aria-hidden`, sized in `em`. **No icon library is
installed.** If one is added later, the `ICONS` registry is the single swap point.

---

## 7. What not to do

| Don't | Because |
|---|---|
| Add a `dark:` variant sweep | The terminal is a `.terminal` class, not an inversion. |
| Add an icon dependency | 45 hand-drawn paths exist and the registry is the swap point. |
| Concatenate a price or a date | One formatter each. |
| Render `planned` destinations as links | A 404 link is worse than no link. |
| Put raw hex in a component | Only `Logo.tsx` may. |
| Add a `z-[80]` | Use `z-[var(--z-tooltip)]`. |
| Add `rounded-[--radius-control]` | Use `rounded-control`. |
| Animate a price | The platform does not stream. |
| Show a zero where there is no data | Show "Not observed" and say why. |

---

## 8. Verification commands

```bash
./node_modules/.bin/tsc --noEmit                 # types
./node_modules/.bin/eslint src                    # lint (restored in Phase 02 — see the report)
./node_modules/.bin/vitest run                    # the suite
NODE_OPTIONS=--max-old-space-size=1400 \
  ./node_modules/.bin/next build                  # the build
node scripts/check-responsive.mjs                 # responsive, needs a running server
```

---

## 9. Known gaps, stated honestly

- **ESLint reports 10 pre-existing errors** in `admin/*`, `agent/*` and `components/data/*` files
  that predate Phase 02. They are React 19 compiler-rule violations (setState-in-effect, impure
  render calls) in working code. Phase 02 introduced **zero**.
- **One failing test**, `tests/data-integrity/fixture-isolation.test.ts`, is the pre-existing P0
  data finding from Phase 01 — the demo admin mutated a live fixture. It is not a Phase 02
  regression.
- **Playwright's browsers were not installed** in the Phase 02 environment. The responsive check
  could not run until `npx playwright install chromium` and `install-deps` were executed. This is now
  done and the check passes.
