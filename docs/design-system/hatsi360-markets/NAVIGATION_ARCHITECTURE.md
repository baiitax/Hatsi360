# Hatsi360 Markets — Navigation Architecture

**Phase 02 · Six modules, honest destinations**
Status: **Implemented and verified.** Every href in `MARKET_NAV` resolves against a real route,
asserted by a route walk in the brand test.

---

## 1. Two navigation vocabularies, deliberately

| Export | Purpose | Consumer |
|---|---|---|
| `PRIMARY_NAV` | The **site** vocabulary — marketing, about, pricing, contact. Test-locked: its labels and every href's resolution are asserted. | `components/site/navigation.tsx` |
| `MARKET_NAV` | The **terminal** vocabulary — six modules. | `TerminalHeader`, `MobileNavigation` |
| `SECONDARY_NAV` | Method, coverage, disclaimer. Both environments. | Drawer, footer |
| `LEGAL_NAV` | Terms, privacy, cookies. | Footer |
| `ACCOUNT_NAV` | Dashboard, watchlists, alerts, login. | Header, drawer |

`PRIMARY_NAV` is test-locked, so it cannot be reshaped to suit the terminal. Rather than bend it,
the terminal's IA is a **separate export**. This is the honest structure: the marketing site and the
terminal are different products with different vocabularies, and forcing one list to serve both
would break one of them.

---

## 2. The six modules

| Module | Landing route | Summary |
|---|---|---|
| **Markets** | `/markets` | The market register, the live watch and the movers. |
| **Commodities** | `/commodities` | The commodity catalogue, its grades and its history. |
| **Trade** | `/trade` | Where the verified offers and the spread actually are. |
| **Charts** | `/charts` | The chart workspace: history, comparison and context. |
| **Fundamentals** | `/trade/fundamentals` | The supply, demand and seasonal picture behind a price. |
| **Research** | `/insights` | Market briefs, reports and the archive. |

Each module carries `items` (real destinations) and `planned` (intended, unbuilt).

---

## 3. `planned` is documentation, never a link

A destination the platform intends to serve but does not yet is named in the module's `planned`
array. It is rendered in the drawer under an **"In development"** label — as text, never as a link.

The rule is absolute: **a link that 404s is worse than no link.** The brand test asserts that no
`planned` entry is ever rendered as an `<a>` or a `<Link>`.

---

## 4. Every destination exists

The brand test walks `src/app` and builds the set of served routes, then resolves every
`MARKET_NAV` href and every item href through `resolveRoute` and asserts it exists:

```ts
for (const module of MARKET_NAV) {
  if (!routes.has(resolveRoute(module.href))) broken.push(`${module.label} -> ${module.href}`);
  for (const item of module.items) {
    if (!routes.has(resolveRoute(item.href))) broken.push(`${item.label} -> ${item.href}`);
  }
}
expect(broken).toEqual([]);
```

This is why `/charts` was built rather than linked. The moment it appeared in `MARKET_NAV`, the test
required the route to exist.

### 4.1 The `/coverage` alias

`/coverage` is a required public URL, but the workspace snapshot filter excludes any directory named
`coverage` — so a route directory literally named `coverage` would silently disappear from the
working tree between sessions. The implementation lives at `/coverage-report`, and
`src/lib/route-map.ts` is the single source of truth for the alias. `next.config.ts` builds both the
rewrite and the redirect from it, and the brand test resolves navigation through it.

---

## 5. Account navigation

`ACCOUNT_NAV` = dashboard, watchlists, alerts, login. It appears in the header and the drawer, and
it is the only place the terminal talks about the reader rather than the market.

---

## 6. The module menu's behaviour

A module is **a link with a disclosure beside it**. The link is the module's landing route; the
disclosure opens the destinations on **hover and on focus-within** — so it works with a keyboard and
without JavaScript. A click on the module label never depends on the menu being open.

The trailing two modules align their menus to the **right** edge of the bar. Anchored to the left
edge, the last module's menu ran 10px past a 1024px viewport and forced the whole page to scroll
sideways — a defect found by the responsive check and fixed in the component, not worked around.

---

## 7. Mobile navigation

The drawer is not a compressed desktop menu. It carries the full module index with each module's
destinations expanded, the secondary links, and the account action. The bottom bar carries the four
destinations a person in a market actually needs: Markets, Commodities, Trade, Account.

---

## 8. How this document was verified

```bash
grep -n "MARKET_NAV\|ACCOUNT_NAV\|MARKET_NAV_ROUTES" src/lib/brand.ts
grep -n "terminal module navigation" -A 60 tests/brand/brand.test.ts
./node_modules/.bin/vitest run tests/brand
```
