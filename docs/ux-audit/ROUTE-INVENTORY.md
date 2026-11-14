# Hatsi360 Route Inventory

**Date:** 2026-11-14  
**Total Routes:** 99 pages (+ 12 API endpoints)

---

## 1. Public Terminal — `(site)` — 38 routes

| Route | Lines | Shell | Status | Issues |
|-------|-------|-------|--------|--------|
| `/` | 480 | TerminalShell | ✅ Live | Hero recently rebuilt |
| `/about` | ~200 | TerminalShell | ✅ | Editorial |
| `/api-docs` | 493 | TerminalShell | ✅ | Needs refresh |
| `/api-policy` | ~150 | TerminalShell | ✅ | Legal |
| `/charts` | 416 | TerminalShell | ✅ | Chart workspace |
| `/commodities` | 306 | TerminalShell | ✅ | Directory |
| `/commodities/[slug]` | 439 | TerminalShell | ✅ | Profile |
| `/compare` | 287 | TerminalShell | ✅ | Comparisons |
| `/contact` | ~200 | TerminalShell | ✅ | Form |
| `/cookies` | ~100 | TerminalShell | ✅ | Legal |
| `/coverage-report` | ~200 | TerminalShell | ✅ | Coverage |
| `/dashboard` | 393 | TerminalShell | ⚠️ | Wrong header |
| `/disclaimer` | ~150 | TerminalShell | ✅ | Legal |
| `/faq` | ~200 | TerminalShell | ✅ | FAQ |
| `/insights` | ~300 | TerminalShell | ✅ | Briefs |
| `/insights/[slug]` | ~250 | TerminalShell | ✅ | Brief detail |
| `/markets` | ~300 | TerminalShell | ✅ | Directory |
| `/markets/[slug]` | ~350 | TerminalShell | ✅ | Profile |
| `/methodology` | ~300 | TerminalShell | ✅ | Editorial |
| `/prices` | 326 | TerminalShell | ✅ | Live watch |
| `/prices/[commodity]` | ~300 | TerminalShell | ✅ | Prices |
| `/pricing` | ~400 | TerminalShell | ✅ | Plans |
| `/privacy` | ~200 | TerminalShell | ✅ | Legal |
| `/reports` | ~300 | TerminalShell | ✅ | Reports |
| `/reports/[slug]` | 374 | TerminalShell | ✅ | Report detail |
| `/solutions` | ~300 | TerminalShell | ✅ | Solutions |
| `/terms` | ~200 | TerminalShell | ✅ | Legal |
| `/trade` | 324 | TerminalShell+Trade | ✅ | Overview |
| `/trade/alerts` | ~200 | TerminalShell+Trade | ✅ | Auth required |
| `/trade/best-buy` | ~250 | TerminalShell+Trade | ✅ | Sourcing |
| `/trade/best-sell` | ~250 | TerminalShell+Trade | ✅ | Procurement |
| `/trade/fundamentals` | 308 | TerminalShell+Trade | ✅ | Fundamentals |
| `/trade/terminal` | 560 | TerminalShell+Trade | ✅ | Terminal |
| `/trade/watchlist` | ~300 | TerminalShell+Trade | ✅ | Watchlist |

---

## 2. Auth Portal — `(portal)` — 4 routes

| Route | Lines | Shell | Status |
|-------|-------|-------|--------|
| `/login` | ~150 | PortalFrame | ✅ |
| `/register` | ~200 | PortalFrame | ✅ |
| `/forgot-password` | ~100 | PortalFrame | ✅ |
| `/reset-password` | ~150 | PortalFrame | ✅ |

---

## 3. Admin Control Centre — `admin` — 30 routes

All routes use `AdminShell` (dark sidebar + light content):

| Route Group | Routes | Lines | Status |
|-------------|--------|-------|--------|
| Overview & Profile | 2 | ~400 | ✅ |
| Agent Management | 2 | ~600 | ✅ |
| Data Management | 10 | ~800 | ✅ |
| Intelligence | 7 | ~1,500 | ✅ |
| Operations | 9 | ~700 | ✅ |

---

## 4. Agent Portal — `agent` — 19 routes

All routes use `AgentShell` (mobile-first):

| Route Group | Routes | Lines | Status |
|-------------|--------|-------|--------|
| Home & Profile | 2 | ~500 | ✅ Phase B done |
| Assignments | 2 | ~200 | ✅ |
| Collection | 3 | ~800 | ✅ |
| Submissions | 2 | ~50 | ⚠️ Stub |
| Corrections | 1 | 144 | ✅ |
| Markets | 2 | ~200 | ✅ |
| Performance | 1 | 185 | ✅ |
| Notifications | 1 | 55 | ⚠️ Basic |
| Help | 1 | 134 | ✅ |

---

## 5. Intelligence — `intelligence` — 2 routes

| Route | Shell | Status |
|-------|-------|--------|
| `/intelligence` | None ⚠️ | ⚠️ No shell |
| `/intelligence/[slug]` | None ⚠️ | ⚠️ No shell |

---

## 6. API Endpoints — 12 routes

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/prices/latest` | Latest prices |
| `/api/v1/prices/history` | Price history |
| `/api/v1/prices/compare` | Price comparison |
| `/api/v1/commodities` | Commodities |
| `/api/v1/markets` | Markets |
| `/api/v1/reports` | Reports |
| `/api/v1/charts/commodity` | Candle data |
| `/api/v1/intelligence/*` | Trade intelligence |
| `/api/agent/submit` | Agent submission |
| `/api/auth/signout` | Sign out |

---

## Component Inventory

**81 component files, ~14,000 lines total**

### Largest Components
| File | Lines | Purpose |
|------|-------|---------|
| `agent/CollectionSession.tsx` | 1,132 | Core collection flow |
| `homepage/HomepageComponents.tsx` | 980 | Homepage sections |
| `marketing/sections.tsx` | 881 | Marketing sections |
| `agent/CollectionFlow.tsx` | 780 | Collection flow |
| `ui/icons.tsx` | 738 | Icon system |
| `homepage/ProfessionalMarketWatch.tsx` | 600 | Market watch |
| `ui/data-display.tsx` | 488 | Data display |
| `market/MarketOverview.tsx` | 472 | Market overview |
| `ui/primitives.tsx` | 440 | UI primitives |
| `homepage/Navbar.tsx` | 436 | Navbar |

---

## Shell Distribution

| Shell | Routes | % |
|-------|--------|---|
| TerminalShell | 38 | 38% |
| AdminShell | 30 | 30% |
| AgentShell | 19 | 19% |
| PortalFrame | 4 | 4% |
| None | 2 | 2% |
| API (no UI) | 12 | 12% |

---

**Status:** COMPLETE
