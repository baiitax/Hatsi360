# Hatsi360 UX Baseline Audit

**Stage 1 — Repository & Visual Baseline**  
**Date:** 2026-11-14  
**Auditor:** Arena Design Agent  
**Status:** COMPLETE

---

## 1. Executive Summary

Hatsi360 is a well-architected Next.js 16 application with ~99 routes, 19 component directories and a thoughtful design token system (1121-line `globals.css`). The codebase shows strong foundations: dual-environment theming (dark terminal / light editorial), proper font pairing (Inter + Manrope), semantic colour tokens, tabular numerals, and an honest approach to empty states.

However, the application suffers from **component fragmentation across surface areas**, **inconsistent page header systems**, **overlapping status indicator patterns**, **mixed container conventions**, and **visual disconnection between product surfaces** that makes the platform feel like several related products rather than one cohesive system.

**Overall UX Quality Rating: B-**  
Strong engineering, inconsistent visual execution.

---

## 2. Architecture Overview

### 2.1 Route Groups

| Route Group | Purpose | Layout | Theme | Routes |
|-------------|---------|--------|-------|--------|
| `(site)` | Public terminal + workspace + trade | TerminalShell (dark) | Dark header, mixed content | 37 |
| `(portal)` | Auth (login, register, password) | PortalFrame (standalone) | Light | 4 |
| `admin` | Control Centre | AdminShell (dark sidebar, light body) | Mixed | 30 |
| `agent` | Field collection app | AgentShell (bottom nav) | Light | 16 |
| `intelligence` | Research module | Root layout only | Light (non-terminal) | 2 |
| `api` | REST endpoints | None | N/A | 10 |

### 2.2 Layout Hierarchy

```
RootLayout (fonts, preloader, skip-link)
├── (site)/layout.tsx → TerminalShell (dark header + footer)
│   └── trade/layout.tsx → White nav sub-bar (INCONSISTENT with parent dark shell)
├── (portal)/layout.tsx → Minimal wrapper
├── admin/layout.tsx → AdminShell (dark sidebar + light content)
├── agent/layout.tsx → AgentShell (bottom navigation)
└── intelligence/* → No dedicated layout (uses root only)
```

### 2.3 Technology Stack

- **Framework:** Next.js 16.4.2 (Turbopack)
- **React:** 19
- **CSS:** Tailwind CSS v4 + 1121-line `globals.css`
- **Fonts:** Inter (UI/numbers), Manrope (display) — via `next/font`
- **Database:** Supabase (RLS-enabled)
- **Charts:** Custom SVG (no chart library)

---

## 3. Design System Inventory

### 3.1 Colour Tokens ✅ WELL-DEFINED

The `globals.css` defines a comprehensive token system:

| Token Family | Shades | Purpose |
|--------------|--------|---------|
| `brand-*` | 50–950 | Primary green palette |
| `leaf-*` | 100–700 | Fresh growth accent |
| `harvest-*` | 100–700 | Gold accent |
| `sand-*` | 50–700 | Warm editorial surfaces |
| `earth-*` | 100–700 | Chart series |
| `ink-*` | 50–950 | Typography and neutrals |
| `success-*`, `warning-*`, `error-*`, `info-*` | Various | Semantic status |
| `terminal-*` | bg, surface, elevated, interactive, border, text, text-secondary, text-muted | Dark terminal |
| `editorial-*` | bg, surface, soft, text, text-secondary, border | Light editorial |
| `move-up`, `move-down`, `move-flat` | + soft variants | Price movement |

**Verdict:** ✅ Excellent token architecture. The problem is **inconsistent application**, not missing tokens.

### 3.2 Typography System ✅ WELL-DEFINED

**Families:**
- `--font-display` → Manrope (headings, editorial)
- `--font-sans` → Inter (UI, body, numbers)

**Scale (terminal-specific):**
- `--text-micro` (0.625rem) — metadata
- `--text-metadata` (0.6875rem)
- `--text-label` (0.75rem)
- `--text-body-sm` (0.8125rem)
- `--text-figure` (0.9375rem) — tabular numerals
- `--text-figure-lg` (1.25rem)
- `--text-figure-xl` (1.75rem)

**Additional classes:** `.figure` (tabular numerals), `.prose-hatsi` (editorial body)

**Verdict:** ✅ Good scale. Issue: some pages use raw Tailwind sizes (`text-3xl`, `text-4xl`) that don't map to the defined scale.

### 3.3 Spacing System ⚠️ PARTIALLY DEFINDED

**Defined tokens:**
- `--spacing-terminal-gutter: 1rem`
- `--spacing-terminal-panel: 1rem`
- `--spacing-terminal-row: 0.5rem`
- `.section` (3rem / 4.5rem responsive)
- `.container-page` (max-w-80rem, responsive padding)

**Missing:** No general-purpose spacing scale; pages use ad-hoc Tailwind values.

### 3.4 Radius & Shadow System ✅ WELL-DEFINED

- `--radius-card: 0.875rem`
- `--radius-panel: 0.625rem`
- `--radius-control: 0.375rem`
- `--radius-pill: 999px`
- `--shadow-soft`, `--shadow-lift` (light)
- `--shadow-terminal`, `--shadow-terminal-lift` (dark)

### 3.5 Motion System ✅ WELL-DEFINED

- `--ease-terminal: cubic-bezier(0.2, 0, 0.1, 1)`
- `--duration-instant: 90ms`
- `--duration-fast: 140ms`
- `--duration-panel: 200ms`
- Respects `prefers-reduced-motion`

### 3.6 Z-index System ✅ WELL-DEFINED

Named tokens: `--z-sticky (20)`, `--z-header (40)`, `--z-drawer (60)`, `--z-modal (70)`, `--z-tooltip (80)`, `--z-boot (200)`

---

## 4. Component Inventory

### 4.1 UI Components (`src/components/ui/`)

| File | Exports | Status |
|------|---------|--------|
| `primitives.tsx` | `CONTROL`, `Divider`, `Button`, `Field`, `Select`, `Tabs`, `Badge`, `Tooltip`, `SearchInput` | ✅ Well-designed terminal controls |
| `index.tsx` | `SectionHeading`, `EmptyState`, `StatusBadge`, `StaleBadge`, `MetricCard`, `PriceCard`, `ProvenanceCard` | ✅ Light editorial components |
| `data-display.tsx` | Tables, lists, metric displays | ⚠️ Mixed patterns |
| `overlays.tsx` | Modals, drawers, dropdowns | ✅ Terminal-themed |
| `icons.tsx` | 40+ SVG icons | ✅ Consistent style |
| `PageHero.tsx` | Page header for editorial pages | ⚠️ Competes with `PageHeader` |

### 4.2 Shell Components

| Component | Surface | Pattern |
|-----------|---------|---------|
| `TerminalShell` | `(site)` | Dark header + content |
| `AdminShell` | `admin` | Dark sidebar + light body |
| `AgentShell` | `agent` | Bottom tab navigation |
| `PortalFrame` | `(portal)` | Standalone light |

### 4.3 Page Header Systems ⚠️ **MAJOR ISSUE**

Four competing page header patterns:

| Component | Surface | Used By | Visual |
|-----------|---------|---------|--------|
| `PageHero` (ui/) | Public/editorial | pricing, about, markets, prices, dashboard, contact, faq, insights | Large hero with image, eyebrow, title, lede, breadcrumbs |
| `PageHeader` (terminal/TerminalShell) | Terminal | homepage, commodities, charts | Compact dark header with title, description, meta, actions |
| `PageHeader` (ops/Primitives) | Admin | admin/overview, admin/agents | Medium heading with title, description, optional actions |
| `PageHeader` (trade/Primitives) | Trade terminal | trade/terminal, trade/watchlist, trade/alerts | Terminal-styled header with purpose line |

**This is the single biggest consistency problem.** Four different page headers with different spacing, typography, backgrounds and visual weight.

### 4.4 Status/Badge Systems ⚠️ **MAJOR ISSUE**

Four competing badge patterns:

| Component | Surface | Purpose |
|-----------|---------|---------|
| `StatusBadge` (ui/) | Public/editorial | Verification status with tone mapping |
| `Pill` (ops/Primitives) | Admin | Generic status pill with `tone` prop |
| `FieldStatusPill` (agent/FieldUi) | Agent | Field-specific status |
| `EvidenceBadge` (intelligence/) | Intelligence | Source reliability |
| `Badge` (ui/primitives) | Terminal | Terminal-themed badge |

### 4.5 Card/Stat Components ⚠️ **MODERATE ISSUE**

| Component | Surface | Purpose |
|-----------|---------|---------|
| `MetricCard` (ui/) | Public | Generic metric display |
| `KpiCard` (ops/) | Admin | KPI with change %, definition |
| `FieldStat` (agent/FieldUi) | Agent | Compact stat with optional href |
| `PriceCard` (ui/) | Public | Price-specific card |
| `ProvenanceCard` (ui/) | Public | Data provenance |

### 4.6 Empty State Components ⚠️ **MODERATE ISSUE**

| Component | Surface | Pattern |
|-----------|---------|---------|
| `EmptyState` (ui/) | Public | Icon + title + description + action |
| `EmptyStatePanel` (feedback/TerminalFeedback) | Terminal | Dark-themed empty state |
| `FieldEmpty` (agent/FieldUi) | Agent | Field-specific empty state |
| `ChartEmptyState` (charts/ChartFrame) | Charts | Chart-specific |

### 4.7 Table Components ⚠️ **MODERATE ISSUE**

| Component | Surface | Pattern |
|-----------|---------|---------|
| `PriceTable` (data/) | Public prices | Full search/filter/paginate |
| `DataTable` (ops/) | Admin | Generic typed table |
| `MarketWatchTable` (market/) | Public homepage | Terminal-styled watch |

---

## 5. Visual Inconsistency Findings

### 5.1 Severity: P0 — Critical

None found. All core functionality is accessible.

### 5.2 Severity: P1 — Major Issues

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| **P1-01** | Four competing page header systems | Across all surfaces | Breaks visual continuity; user feels they're in different products |
| **P1-02** | Intelligence pages use completely different visual language | `/intelligence/*` | No terminal shell, no consistent layout, uses raw Tailwind classes (`container mx-auto px-4 py-8 max-w-7xl`) |
| **P1-03** | Trade sub-layout uses white nav bar inside dark terminal shell | `(site)/trade/layout.tsx` | Visual disconnect: user enters a dark terminal, then a white sub-nav appears |
| **P1-04** | Admin and terminal use different background colours | `admin` vs `(site)` | Admin: `bg-ink-50`, Terminal: dark; inconsistent surface treatment |
| **P1-05** | Dashboard uses `PageHero` (editorial light) inside terminal shell | `/dashboard` | Dashboard header is light while terminal header above is dark — jarring |

### 5.3 Severity: P2 — Moderate Issues

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| **P2-01** | Inconsistent container conventions | Throughout | Some use `container-page`, some use `container mx-auto max-w-7xl`, some use inline max-w |
| **P2-02** | Four status badge systems | Throughout | Different shapes, sizes, colours for similar statuses |
| **P2-03** | Three empty state systems | Throughout | Different visual weight and treatment |
| **P2-04** | Admin pages have inconsistent density | `admin/agents` vs `admin/overview` | Different padding, spacing and card sizes |
| **P2-05** | Intelligence page uses non-product font classes | `/intelligence` | Uses `text-4xl font-bold text-neutral-900` instead of design tokens |
| **P2-06** | Inconsistent button styles across surfaces | Throughout | Terminal buttons vs editorial buttons vs admin buttons |
| **P2-07** | Agent app visually disconnected from platform | `agent/*` | Different visual language; could be a different product |
| **P2-08** | No breadcrumbs in terminal pages | `(site)/*` | Users can't see where they are in the hierarchy |
| **P2-09** | Inconsistent loading states | Throughout | Some pages use Suspense + skeletons, others have none |
| **P2-10** | Card hover effects inconsistent | Throughout | Some cards have `card-hover`, others don't; no standard |
| **P2-11** | Mixed colour references in pages | Throughout | Some pages use `text-neutral-600` instead of `text-ink-600` |
| **P2-12** | Trade Primitives `EmptyState` differs from UI `EmptyState` | trade/Primitives vs ui/ | Different visual treatment for same concept |

### 5.4 Severity: P3 — Minor Polish

| ID | Issue | Location | Impact |
|----|-------|----------|--------|
| **P3-01** | SearchBar appears in different positions | Header, TerminalHeader | Inconsistent search placement |
| **P3-02** | Footer links to `/coverage` which may not exist | `SiteFooter.tsx` | Potential dead link |
| **P3-03** | Intelligence pages use `text-neutral-*` instead of `text-ink-*` | `/intelligence/*` | Wrong token family |
| **P3-04** | Terminal control height is fixed at 1.875rem | `primitives.tsx` | Good for terminal, too small for admin |
| **P3-05** | No consistent way to show "page last updated" | Throughout | Freshness indicator only in terminal header |

---

## 6. Responsive Design Assessment

### 6.1 Breakpoints Used

The project uses Tailwind defaults: `sm:640`, `md:768`, `lg:1024`, `xl:1280`, `2xl:1536`.

### 6.2 Issues Found

| Issue | Severity | Location |
|-------|----------|----------|
| Admin sidebar collapse hides labels but keeps icons — icons are text glyphs (⌂, ☑), not proper SVG icons | P2 | `AdminShell.tsx` |
| Agent bottom nav uses text glyphs (⌂, ☑, ＋, ≡, ☺) | P2 | `agent/layout.tsx` |
| Terminal module nav may overflow on small screens | P2 | `TerminalShell.tsx` |
| Trade terminal table doesn't adapt to mobile | P2 | `trade/terminal/page.tsx` |
| `PageHero` image may not scale properly | P3 | `ui/PageHero.tsx` |
| Admin data tables need horizontal scroll on mobile | P2 | `ops/DataTable.tsx` |

### 6.3 What Works Well

- ✅ `.container-page` has proper responsive padding
- ✅ Terminal header collapses search to icon on mobile
- ✅ Mobile drawers are real `<dialog>` patterns
- ✅ Agent bottom nav is mobile-first by design
- ✅ Terminal cards stack properly on mobile

---

## 7. Accessibility Assessment

### 7.1 Strengths

- ✅ Skip link implemented
- ✅ Focus-visible outline defined globally
- ✅ Proper `aria-label` on navigation regions
- ✅ `aria-current="page"` on active nav items
- ✅ Form labels properly associated
- ✅ `role="search"` on search forms
- ✅ Screen-reader-only text (`.sr-only`) used appropriately
- ✅ Reduced-motion media query defined
- ✅ Proper semantic HTML structure
- ✅ Tabular numerals for financial data

### 7.2 Issues

| Issue | Severity | WCAG |
|-------|----------|------|
| Some icon-only buttons lack aria-label | P2 | 4.1.2 |
| Agent nav uses text glyphs instead of proper icons | P2 | 1.3.1 |
| Terminal nav items may be too small for touch (1.875rem height) | P3 | 2.5.5 |
| Intelligence pages use `text-neutral-600` — may not pass contrast on white | P3 | 1.4.3 |
| Admin badge counts use small text (10px) | P3 | 1.4.4 |

---

## 8. Performance Observations

- ✅ Fonts are self-hosted via `next/font`
- ✅ No chart library (custom SVG)
- ✅ Server Components used appropriately
- ✅ `force-dynamic` on data pages
- ✅ Loading preloader and skeletons
- ⚠️ Some pages fetch data in layout AND page (double fetches)

---

## 9. Design System Maturity Score

| Category | Score | Notes |
|----------|-------|-------|
| Colour tokens | A+ | Excellent architecture, well-defined |
| Typography | A- | Good scale, some pages bypass it |
| Spacing | B- | Container and section defined, but ad-hoc elsewhere |
| Component library | B | Good foundations but fragmented across surfaces |
| Layout system | B- | 4 different shell patterns, 4 page headers |
| Status indicators | C+ | 4 competing systems |
| Empty states | C+ | 4 competing systems |
| Data visualization | B | Custom SVG, proper semantics, but inconsistent containers |
| Responsive | B | Good foundations, some gaps |
| Accessibility | B+ | Strong fundamentals, minor gaps |
| Visual consistency | C+ | Multiple visual languages |
| **Overall** | **B-** | Strong engineering, inconsistent execution |

---

## 10. Key Findings Summary

### What's Good
1. **Excellent design token architecture** — colour, typography, spacing, motion, z-index all defined
2. **Dual-environment theming** — terminal/editorial separation is conceptually sound
3. **Honest data presentation** — empty states, provenance, no fabricated data
4. **Strong accessibility foundation** — focus states, skip links, semantic HTML
5. **Well-structured route groups** — clear separation of concerns
6. **Custom chart system** — purposeful, accessible, no heavy dependencies

### What Needs Work
1. **Four page header systems** — must consolidate
2. **Four status badge systems** — must consolidate
3. **Intelligence pages visually disconnected** — need terminal shell integration
4. **Trade sub-layout creates visual break** — white nav inside dark terminal
5. **Agent app feels like separate product** — needs brand continuity
6. **Admin and terminal surface mismatch** — different background patterns
7. **Inconsistent containers** — needs standardization
8. **Text glyph icons** — should use proper SVG icons

---

**Next Step:** Route & Component Inventory → Design Remediation Plan
