# Hatsi360 Route & Component Inventory

**Stage 1 — Repository & Visual Baseline**  
**Date:** 2026-11-14  
**Status:** COMPLETE

---

## 1. Route Inventory (99 pages)

### 1.1 Public Terminal — `(site)` — 37 routes

| Route | Component | Page Header System | Container | Shell | Status |
|-------|-----------|-------------------|-----------|-------|--------|
| `/` | `page.tsx` (737 lines) | PageHeader (terminal) | PageContainer | Terminal | ✅ |
| `/about` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/api-docs` | `page.tsx` (493 lines) | PageHero | section/container-page | Terminal | ✅ |
| `/api-policy` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/charts` | `page.tsx` (416 lines) | PageHeader (terminal) | PageContainer | Terminal | ✅ |
| `/commodities` | `page.tsx` (306 lines) | PageHeader (terminal) | PageContainer | Terminal | ✅ |
| `/commodities/[slug]` | `page.tsx` (439 lines) | PageHeader (terminal) | PageContainer | Terminal | ✅ |
| `/compare` | `page.tsx` (287 lines) | PageHero | section/container-page | Terminal | ✅ |
| `/contact` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/cookies` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/coverage-report` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/dashboard` | `page.tsx` (393 lines) | **PageHero** ⚠️ | section/container-page | Terminal | ⚠️ Wrong header for shell |
| `/disclaimer` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/faq` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/insights` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/insights/[slug]` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/markets` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/markets/[slug]` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/methodology` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/prices` | `page.tsx` (326 lines) | PageHero | section/container-page | Terminal | ✅ |
| `/prices/[commodity]` | `page.tsx` | PageHeader (terminal) | PageContainer | Terminal | ✅ |
| `/pricing` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/privacy` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/reports` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/reports/[slug]` | `page.tsx` (374 lines) | PageHero | section/container-page | Terminal | ✅ |
| `/solutions` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/terms` | `page.tsx` | PageHero | section/container-page | Terminal | ✅ |
| `/trade` | `page.tsx` (324 lines) | PageHeader (terminal) | PageContainer | Terminal | ✅ |
| `/trade/alerts` | `page.tsx` | PageHeader (trade/) | container-page | Terminal + Trade sub | ✅ |
| `/trade/best-buy` | `page.tsx` | PageHeader (trade/) | container-page | Terminal + Trade sub | ✅ |
| `/trade/best-sell` | `page.tsx` | PageHeader (trade/) | container-page | Terminal + Trade sub | ✅ |
| `/trade/fundamentals` | `page.tsx` (308 lines) | PageHeader (trade/) | container-page | Terminal + Trade sub | ✅ |
| `/trade/terminal` | `page.tsx` (560 lines) | PageHeader (trade/) | container-page | Terminal + Trade sub | ✅ |
| `/trade/watchlist` | `page.tsx` | PageHeader (trade/) | container-page | Terminal + Trade sub | ✅ |

### 1.2 Auth Portal — `(portal)` — 4 routes

| Route | Component | Shell | Status |
|-------|-----------|-------|--------|
| `/login` | `page.tsx` | PortalFrame | ✅ |
| `/register` | `page.tsx` | PortalFrame | ✅ |
| `/forgot-password` | `page.tsx` | PortalFrame | ✅ |
| `/reset-password` | `page.tsx` | PortalFrame | ✅ |

### 1.3 Admin Control Centre — `admin` — 30 routes

| Route | Component | Layout | Status |
|-------|-----------|--------|--------|
| `/admin` | redirect → overview | AdminShell | ✅ |
| `/admin/overview` | `page.tsx` (313 lines) | AdminShell | ✅ |
| `/admin/agents` | `page.tsx` | AdminShell | ✅ |
| `/admin/agents/[id]` | `page.tsx` (458 lines) | AdminShell | ✅ |
| `/admin/analytics` | `page.tsx` | AdminShell | ✅ |
| `/admin/api-management` | `page.tsx` | AdminShell | ✅ |
| `/admin/assignments` | `page.tsx` | AdminShell | ✅ |
| `/admin/audit` | `page.tsx` | AdminShell | ✅ |
| `/admin/categories` | `page.tsx` | AdminShell | ✅ |
| `/admin/commodities` | `page.tsx` | AdminShell | ✅ |
| `/admin/customers` | `page.tsx` | AdminShell | ✅ |
| `/admin/exports` | `page.tsx` | AdminShell | ✅ |
| `/admin/grades` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence/countries` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence/hs-codes` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence/sources` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence/tariffs` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence/trade-blocs` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence/trade-data` | `page.tsx` | AdminShell | ✅ |
| `/admin/intelligence/trade-intelligence` | `page.tsx` (511 lines) | AdminShell | ✅ |
| `/admin/intelligence/trade-intelligence/commodities` | `page.tsx` (315 lines) | AdminShell | ✅ |
| `/admin/intelligence/trade-intelligence/explorer` | `page.tsx` (330 lines) | AdminShell | ✅ |
| `/admin/intelligence/trade-intelligence/partners` | `page.tsx` | AdminShell | ✅ |
| `/admin/markets` | `page.tsx` | AdminShell | ✅ |
| `/admin/notifications` | `page.tsx` | AdminShell | ✅ |
| `/admin/observations` | `page.tsx` | AdminShell | ✅ |
| `/admin/operations` | `page.tsx` | AdminShell | ✅ |
| `/admin/quality` | `page.tsx` | AdminShell | ✅ |
| `/admin/reports` | `page.tsx` | AdminShell | ✅ |
| `/admin/schedule` | `page.tsx` | AdminShell | ✅ |
| `/admin/search` | `page.tsx` | AdminShell | ✅ |
| `/admin/settings` | `page.tsx` | AdminShell | ✅ |
| `/admin/subscriptions` | `page.tsx` | AdminShell | ✅ |
| `/admin/system` | `page.tsx` | AdminShell | ✅ |
| `/admin/tasks` | `page.tsx` | AdminShell | ✅ |
| `/admin/units` | `page.tsx` | AdminShell | ✅ |
| `/admin/verification` | `page.tsx` | AdminShell | ✅ |
| `/admin/zones` | `page.tsx` | AdminShell | ✅ |

### 1.4 Agent Field App — `agent` — 16 routes

| Route | Component | Shell | Status |
|-------|-----------|-------|--------|
| `/agent` | redirect → home | AgentShell | ✅ |
| `/agent/home` | `page.tsx` (352 lines) | AgentShell | ✅ |
| `/agent/assignments` | `page.tsx` | AgentShell | ✅ |
| `/agent/assignments/[id]` | `page.tsx` | AgentShell | ✅ |
| `/agent/collect` | `page.tsx` | AgentShell | ✅ |
| `/agent/collection/[id]` | `page.tsx` | AgentShell | ✅ |
| `/agent/collection/new` | `page.tsx` | AgentShell | ✅ |
| `/agent/corrections` | `page.tsx` | AgentShell | ✅ |
| `/agent/help` | `page.tsx` | AgentShell | ✅ |
| `/agent/history` | `page.tsx` | AgentShell | ✅ |
| `/agent/markets` | `page.tsx` | AgentShell | ✅ |
| `/agent/markets/[id]` | `page.tsx` | AgentShell | ✅ |
| `/agent/notifications` | `page.tsx` | AgentShell | ✅ |
| `/agent/observations` | `page.tsx` | AgentShell | ✅ |
| `/agent/observations/[id]` | `page.tsx` | AgentShell | ✅ |
| `/agent/performance` | `page.tsx` | AgentShell | ✅ |
| `/agent/profile` | `page.tsx` | AgentShell | ✅ |
| `/agent/submissions` | `page.tsx` | AgentShell | ✅ |

### 1.5 Intelligence — `intelligence` — 2 routes

| Route | Component | Shell | Status |
|-------|-----------|-------|--------|
| `/intelligence` | `page.tsx` (286 lines) | **None** ⚠️ | ⚠️ No terminal shell |
| `/intelligence/[slug]` | `page.tsx` | **None** ⚠️ | ⚠️ No terminal shell |

**CRITICAL FINDING:** Intelligence pages sit outside the terminal shell, creating a disconnected visual experience.

---

## 2. Component Inventory

### 2.1 By Directory (19 dirs, ~80 components)

| Directory | Files | Lines | Purpose |
|-----------|-------|-------|---------|
| `ui/` | 6 | 2,302 | Core UI primitives, data display, overlays, icons |
| `terminal/` | 2 | 692 | Terminal shell, mobile navigation |
| `site/` | 6 | 210 | Public site header, footer, navigation |
| `admin/` | 9 | 760 | Admin shell, management components |
| `agent/` | 11 | 3,313 | Field app shell, collection flow, forms |
| `market/` | 3 | 1,370 | Market overview, watch table, price display |
| `ops/` | 4 | 1,100 | Operations: KPI cards, charts, tables |
| `charts/` | 2 | 571 | Chart frame, period range chart |
| `feedback/` | 1 | 428 | Terminal feedback (skeletons, empty states) |
| `data/` | 7 | 1,380 | Data display: tables, cards, price views |
| `forms/` | 5 | 826 | Auth forms, contact, copy button |
| `intelligence/` | 5 | 970 | Intelligence charts, evidence badges |
| `trade/` | 2 | 711 | Trade candle chart, primitives |
| `marketing/` | 5 | 1,340 | Marketing sections, structured data |
| `loading/` | 8 | 488 | Loading states, preloader, skeletons |
| `brand/` | 1 | 150 | Logo components |
| `media/` | 1 | 60 | Image component |

### 2.2 Duplicate/Competing Components

#### Page Headers (4 systems)

| Component | File | Used By | Visual |
|-----------|------|---------|--------|
| `PageHero` | `ui/PageHero.tsx` | 19 public pages | Large, image, eyebrow, breadcrumbs |
| `PageHeader` (terminal) | `terminal/TerminalShell.tsx` | Homepage, commodities, charts, prices/[commodity] | Compact, dark, terminal |
| `PageHeader` (ops) | `ops/Primitives.tsx` | Admin overview, agents | Medium, light, admin |
| `PageHeader` (trade) | `trade/Primitives.tsx` | Trade terminal, watchlist, alerts | Medium, terminal-styled |

#### Status Badges (5 systems)

| Component | File | Used By |
|-----------|------|---------|
| `StatusBadge` | `ui/index.tsx` | Public pages |
| `Badge` | `ui/primitives.tsx` | Terminal |
| `Pill` | `ops/Primitives.tsx` | Admin |
| `FieldStatusPill` | `agent/FieldUi.tsx` | Agent |
| `EvidenceBadge` | `intelligence/EvidenceBadge.tsx` | Intelligence |

#### Empty States (4 systems)

| Component | File | Used By |
|-----------|------|---------|
| `EmptyState` | `ui/index.tsx` | Public editorial |
| `EmptyStatePanel` | `feedback/TerminalFeedback.tsx` | Terminal |
| `EmptyState` | `trade/Primitives.tsx` | Trade |
| `FieldEmpty` | `agent/FieldUi.tsx` | Agent |

#### Stat/Metric Cards (3 systems)

| Component | File | Used By |
|-----------|------|---------|
| `MetricCard` | `ui/index.tsx` | Public |
| `KpiCard` | `ops/KpiCard.tsx` | Admin |
| `FieldStat` | `agent/FieldUi.tsx` | Agent |

#### Cards (multiple patterns)

| Component | File | Used By |
|-----------|------|---------|
| `PriceCard` | `ui/index.tsx` | Public prices |
| `ProvenanceCard` | `ui/index.tsx` | Public provenance |
| `MarketOverviewCard` | `market/MarketOverview.tsx` | Terminal |
| `FieldCard` | `agent/FieldUi.tsx` | Agent |
| `card` class | globals.css | Throughout |

---

## 3. Token Usage Violations

### 3.1 Non-Token Colour Usage

| Violation | Count | Location | Should Be |
|-----------|-------|----------|-----------|
| `neutral-*` colours | 336 instances | Intelligence, some pages | `ink-*` |
| `blue-*` colours | ~40 instances | Various | `info-*` |
| `emerald-*` colours | ~30 instances | Various | `success-*` or `leaf-*` |
| `red-*` colours | ~60 instances | Various | `error-*` |
| `amber-*` colours | ~60 instances | Various | `warning-*` or `harvest-*` |

**Total:** ~526 instances of non-token colour usage.

### 3.2 Container Violations

| Pattern | Count | Should Be |
|---------|-------|-----------|
| `container mx-auto px-4 max-w-7xl` | ~15 | `container-page` |
| `container mx-auto px-4 py-8 max-w-7xl` | ~10 | `container-page` + `section` |
| Custom inline max-width | ~20 | `container-page` |

---

## 4. Layout Consistency Matrix

### 4.1 Background Colours

| Surface | Background | Consistent? |
|---------|------------|-------------|
| Terminal body | `terminal-bg` (#101713) | ✅ |
| Admin body | `bg-ink-50` (#F7F8F5) | ✅ |
| Agent body | `bg-ink-50` | ✅ |
| Portal body | white | ✅ |
| Intelligence body | **`bg-neutral-50`** ⚠️ | ❌ Should be `bg-ink-50` |
| Trade sub-layout | `bg-soft` + `bg-white` nav | ⚠️ Inside terminal |

### 4.2 Content Width

| Surface | Max Width | Container |
|---------|-----------|-----------|
| Terminal | 80rem | `PageContainer` |
| Public editorial | 80rem | `container-page` |
| Admin | 80rem | `container mx-auto px-4 max-w-7xl` |
| Agent | 48rem | Custom |
| Intelligence | 80rem | `container mx-auto max-w-7xl` |
| Trade | 80rem | `container-page` |

**Finding:** Admin and Intelligence use Tailwind `container` + `max-w-7xl` instead of the defined `container-page`.

---

## 5. Loading & Empty State Coverage

### 5.1 Loading States

| Page | Loading Strategy |
|------|-----------------|
| Homepage | ✅ Suspense + skeletons |
| Commodities | ✅ Suspense + skeletons |
| Markets | ⚠️ No loading state |
| Prices | ⚠️ No loading state |
| Dashboard | ⚠️ No loading state |
| Admin overview | ⚠️ No loading state |
| Agent home | ⚠️ No loading state |

### 5.2 Empty States

| Page | Empty State |
|------|-------------|
| Homepage | ✅ Terminal empty state |
| Commodities | ✅ Terminal empty state |
| Markets | ✅ Public EmptyState |
| Prices | ✅ Public EmptyState |
| Dashboard | ✅ Sign-in prompt |
| Admin overview | ⚠️ Shows zeros |
| Agent home | ✅ FieldEmpty |

---

## 6. Cross-Surface Component Usage

### Components Used Across Multiple Surfaces

| Component | Public | Admin | Agent | Trade | Intelligence |
|-----------|--------|-------|-------|-------|--------------|
| `card` class | ✅ | ✅ | ✅ | ❌ | ❌ |
| `container-page` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `PageHero` | ✅ | ❌ | ❌ | ❌ | ❌ |
| Terminal primitives | ❌ | ❌ | ❌ | ✅ | ❌ |
| `brand-*` colours | ✅ | ✅ | ✅ | ✅ | ❌ |
| `ink-*` colours | ✅ | ✅ | ✅ | ✅ | ❌ |
| `neutral-*` colours | ❌ | ❌ | ❌ | ❌ | ✅ |

---

**Next Step:** Design Remediation Plan
