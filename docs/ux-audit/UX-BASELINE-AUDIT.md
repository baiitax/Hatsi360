# Hatsi360 UX Baseline Audit

**Date:** 2026-11-14  
**Auditor:** Arena Design & Engineering Agent  
**Status:** COMPLETE

---

## Executive Summary

Hatsi360 Markets is a **well-architected Next.js 16 application** with 99 routes, 81 components (~14,000 lines), and a thoughtful design token system. The platform serves multiple user types (public visitors, traders, agents, admins) across different interfaces (public site, terminal, admin, agent portal).

**Overall UX Quality: B-**

**Strengths:**
- ✅ Comprehensive route coverage (99 pages)
- ✅ Strong design token system (globals.css)
- ✅ Dual-environment theming (dark terminal / light editorial)
- ✅ Proper font pairing (Inter + Manrope)
- ✅ Semantic color tokens
- ✅ Tabular numerals for financial data
- ✅ Honest empty states
- ✅ RLS-protected data access

**Critical Issues:**
- ⚠️ **4 competing page header systems** (P1)
- ⚠️ **5 competing status badge systems** (P1)
- ⚠️ **526 non-token color violations** (P1)
- ⚠️ **Dashboard uses wrong header in terminal** (P0)
- ⚠️ **Intelligence pages disconnected** (P0)
- ⚠️ **Agent portal uses emoji icons** (P1) — ✅ Fixed in Phase B

---

## Route Health Summary

| Category | Routes | Issues | Priority |
|----------|--------|--------|----------|
| Public Terminal | 38 | 1 P0 (dashboard header) | High |
| Auth Portal | 4 | 0 | — |
| Admin | 30 | 0 | — |
| Agent | 19 | 0 (Phase B complete) | ✅ |
| Intelligence | 2 | 2 P0 (no shell) | Critical |
| API | 12 | 0 | — |

---

## Component Fragmentation

### Page Headers — 4 Systems (Should be 2)

| Component | Used By | Issue |
|-----------|---------|-------|
| `PageHero` | 19 editorial pages | ✅ Keep for editorial |
| `PageHeader` (terminal) | Homepage, charts, commodities | ✅ Keep for terminal |
| `PageHeader` (ops) | Admin pages | ❌ Duplicate |
| `PageHeader` (trade) | Trade pages | ❌ Duplicate |

### Status Badges — 5 Systems (Should be 2)

| Component | Used By | Issue |
|-----------|---------|-------|
| `StatusBadge` | Public pages | ✅ Keep for light |
| `Badge` | Terminal | ✅ Keep for dark |
| `Pill` | Admin | ❌ Duplicate |
| `FieldStatusPill` | Agent | ❌ Duplicate |
| `EvidenceBadge` | Intelligence | ❌ Duplicate |

### Empty States — 4 Systems (Should be 2)

| Component | Used By | Issue |
|-----------|---------|-------|
| `EmptyState` | Public editorial | ✅ Keep for light |
| `EmptyStatePanel` | Terminal | ✅ Keep for dark |
| `FieldEmpty` | Agent | ❌ Duplicate |
| Trade `EmptyState` | Trade | ❌ Duplicate |

---

## Design Token Compliance

### Color Violations: ~526 instances

| Violation | Count | Should Use |
|-----------|-------|-----------|
| `neutral-*` | 336 | `ink-*` |
| `blue-*` | 40 | `info-*` |
| `emerald-*` | 30 | `success-*` or `leaf-*` |
| `red-*` | 60 | `error-*` |
| `amber-*` | 60 | `warning-*` or `harvest-*` |

### Container Violations: ~45 instances

| Pattern | Count | Should Use |
|---------|-------|-----------|
| `container mx-auto px-4 max-w-7xl` | 25 | `container-page` |
| Custom inline max-width | 20 | `container-page` |

---

## Visual Environment Assessment

### 1. Public Website — Light Editorial ✅

**Status:** Good  
**Issues:**
- Homepage recently rebuilt (professional)
- Other pages use PageHero consistently
- Needs token compliance fixes

### 2. Market Intelligence Terminal — Dark ✅

**Status:** Good  
**Issues:**
- Trade sub-layout has white nav bar (visual break)
- Dashboard uses PageHero instead of terminal PageHeader

### 3. Business Workspace — Admin ✅

**Status:** Good  
**Issues:**
- Uses ops PageHeader (duplicate)
- Inconsistent density across pages

### 4. Agent Portal — Mobile-First ✅ Phase B Complete

**Status:** Improved  
**Fixed in Phase B:**
- ✅ Emoji icons replaced with SVG
- ✅ Enhanced dashboard with time-based greeting
- ✅ Better visual hierarchy
- ✅ Improved stat cards with icons

**Remaining:**
- ⚠️ FieldUi components need icon system upgrade
- ⚠️ Collection forms need mobile optimization

### 5. Intelligence — Disconnected ⚠️

**Status:** Critical  
**Issues:**
- No shell (uses root layout only)
- Not integrated with navigation
- Uses non-token colors (`neutral-*`)

---

## Data Presentation Audit

### Market Data Display

**Strengths:**
- ✅ Honest about missing data
- ✅ Shows verification status
- ✅ Distinguishes verified vs legacy
- ✅ Freshness indicators

**Issues:**
- ⚠️ Some pages show repeated observations
- ⚠️ Unit/price type missing metadata not always clear
- ⚠️ Date formats inconsistent across pages

### Charts & Visualizations

**Strengths:**
- ✅ Custom SVG charts (no heavy library)
- ✅ Candlestick charts with OHLC data
- ✅ Responsive chart containers

**Issues:**
- ⚠️ Some charts lack tooltips
- ⚠️ Chart legends inconsistent
- ⚠️ No chart export functionality

---

## Mobile Experience

### Public Site
- ✅ Responsive layouts
- ✅ Mobile navigation works
- ⚠️ Tables not optimized for mobile

### Agent Portal
- ✅ Mobile-first design
- ✅ Bottom navigation
- ⚠️ Forms need numeric keypad optimization
- ⚠️ No offline support

### Admin
- ⚠️ Desktop-focused
- ⚠️ Tables not mobile-friendly

---

## Accessibility

**Current State:**
- ⚠️ Partial keyboard navigation
- ⚠️ Inconsistent focus indicators
- ⚠️ Some missing ARIA labels
- ✅ Semantic HTML structure
- ✅ Form labels present

**Priority Fixes:**
1. Standardize focus rings
2. Add skip navigation link
3. Ensure color is not only status indicator
4. Add ARIA labels to icon buttons

---

## Performance

**Current State:**
- ✅ Server components where appropriate
- ✅ `force-dynamic` on data pages
- ⚠️ No skeleton loading states on most pages
- ⚠️ No image optimization audit done

**Priority:**
1. Add skeleton loaders to data-heavy pages
2. Audit image sizes and formats
3. Review bundle size

---

## Priority Issues Summary

### P0 — Critical (3)
1. Dashboard uses wrong header in terminal shell
2. Intelligence pages disconnected (no shell)
3. Homepage shows repeated observations (fixed in hero rebuild)

### P1 — High (12)
1. Four competing page header systems
2. Five competing status badge systems
3. 526 non-token color violations
4. Agent portal emoji icons (✅ Fixed Phase B)
5. Trade sub-layout visual break
6. Inconsistent containers
7. Four competing empty state systems
8. Inconsistent button styles
9. No breadcrumbs in terminal
10. Inconsistent loading states
11. Mixed color references
12. Trade vs UI EmptyState duplication

### P2 — Medium (18)
- Admin density inconsistency
- Intelligence non-token classes
- Card hover inconsistency
- SearchBar positioning
- No "last updated" timestamp
- Footer dead link
- Agent brand integration (✅ Phase B)
- Homepage content hierarchy
- Price cards duplicate data
- Metrics inconsistent definitions
- Tables not responsive on mobile
- No keyboard navigation in dropdowns
- Charts lack tooltips
- Inconsistent typography scale
- No reduced motion support
- Inconsistent focus indicators
- No skip navigation link
- Images lack alt text

### P3 — Low (12)
- Minor visual polish items

---

## Recommendations

### Immediate (Week 1-2)
1. ✅ Agent Portal Phase B (Complete)
2. Fix dashboard header (P0)
3. Add intelligence shell (P0)
4. Consolidate page headers to 2 systems

### Short-term (Week 3-4)
5. Replace non-token colors (526 instances)
6. Consolidate status badges to 2 systems
7. Consolidate empty states to 2 systems
8. Add breadcrumbs to terminal

### Medium-term (Week 5-8)
9. Agent Portal Phase C-H
10. Mobile table optimization
11. Skeleton loading states
12. Accessibility improvements

---

## Success Metrics

**Visual Quality:**
- [ ] Zero `neutral-*` color usage
- [ ] Two page header systems (not four)
- [ ] Two badge systems (not five)
- [ ] All surfaces use brand tokens

**UX Quality:**
- [ ] Clear navigation hierarchy
- [ ] Loading states on data pages
- [ ] Breadcrumbs on all pages
- [ ] Consistent containers

**Responsive:**
- [ ] No horizontal overflow
- [ ] Touch targets ≥ 44px
- [ ] Tables usable on mobile

**Engineering:**
- [ ] TypeScript passes
- [ ] ESLint passes
- [ ] Production build passes
- [ ] No accessibility regressions

---

**Status:** COMPLETE  
**Next:** Design System Specification → Navigation Architecture → Page-by-page improvements
