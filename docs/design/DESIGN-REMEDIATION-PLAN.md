# Hatsi360 Design Remediation Plan

**Stage 1 — Repository & Visual Baseline**  
**Date:** 2026-11-14  
**Status:** COMPLETE  
**Priority-ordered implementation plan**

---

## 1. Executive Summary

This plan addresses **5 P1 issues, 12 P2 issues, and 5 P3 issues** identified in the baseline audit. The approach is **consolidation-first**: rather than creating new components, we will unify the existing systems around the strongest patterns already in the codebase.

**Total estimated effort:** 8 stages, sequenced for minimal risk.

---

## 2. Remediation Philosophy

1. **Consolidate, don't create.** The design token system is excellent. The problem is inconsistent application, not missing architecture.
2. **Surface-appropriate unification.** Each surface (terminal, admin, agent, intelligence) has legitimate UX requirements. Unification means shared foundations with surface-specific expression, not identical layouts.
3. **Forward-only changes.** No rewrites of business logic, no structural route changes, no layout re-architecture.
4. **Token compliance.** Replace all 526 non-token colour usages with the defined system.
5. **Progressive enhancement.** Each stage delivers visible improvement independently.

---

## 3. Prioritised Remediation Items

### 3.1 P1 — Critical (Fix First)

| ID | Issue | Remediation | Effort | Stage |
|----|-------|-------------|--------|-------|
| **P1-01** | Four page header systems | Consolidate to 2: `PageHero` (editorial/light) + `PageHeader` (terminal/dark). Remove `PageHeader` from ops/Primitives and trade/Primitives, replacing with surface-appropriate variants of the two primary headers. | Medium | Stage 4 |
| **P1-02** | Intelligence pages disconnected | Move intelligence pages into `(site)` route group so they inherit TerminalShell. Or create a dedicated intelligence layout that extends the terminal shell. | Medium | Stage 5 |
| **P1-03** | Trade sub-layout visual break | Redesign trade layout to integrate with terminal shell without a white sub-nav. Use terminal-native tab navigation. | Low | Stage 4 |
| **P1-04** | Admin/terminal surface mismatch | Standardise page backgrounds: admin keeps `bg-ink-50`, terminal keeps dark. Ensure consistent content areas within each. | Low | Stage 3 |
| **P1-05** | Dashboard uses PageHero in terminal | Dashboard should use terminal PageHeader since it lives inside TerminalShell. | Low | Stage 5 |

### 3.2 P2 — Major (Fix in Sequence)

| ID | Issue | Remediation | Effort | Stage |
|----|-------|-------------|--------|-------|
| **P2-01** | Inconsistent containers | Replace all `container mx-auto max-w-7xl` with `container-page`. Remove ad-hoc max-width patterns. | Low | Stage 3 |
| **P2-02** | Four status badge systems | Consolidate to 2: `StatusBadge` (light surfaces) + `Badge` (dark terminal). Add surface-aware tone mapping. | Medium | Stage 4 |
| **P2-03** | Three empty state systems | Consolidate to 2: `EmptyState` (light) + `EmptyStatePanel` (dark). Remove `FieldEmpty` and trade `EmptyState`. | Low | Stage 4 |
| **P2-04** | Admin inconsistent density | Standardise admin page padding (p-6), card sizes, and table row heights. | Low | Stage 5 |
| **P2-05** | Intelligence uses non-token classes | Replace all `neutral-*` with `ink-*`, all raw semantic colours with token equivalents. | Medium | Stage 5 |
| **P2-06** | Inconsistent button styles | Standardise to 2 systems: terminal `Button` (dark) and editorial button pattern (light). | Medium | Stage 4 |
| **P2-07** | Agent app disconnected | Add brand header, consistent logo, and brand colour accents to agent shell. | Medium | Stage 6 |
| **P2-08** | No breadcrumbs in terminal | Add breadcrumb trail to terminal PageHeader and PageHero. | Low | Stage 4 |
| **P2-09** | Inconsistent loading states | Add Suspense boundaries + skeleton states to all data-heavy pages. | Medium | Stage 7 |
| **P2-10** | Card hover inconsistency | Apply `card-hover` class consistently to all interactive cards. | Low | Stage 4 |
| **P2-11** | Mixed colour references | Replace all 336 `neutral-*` instances + 190 raw semantic colours with design tokens. | High | Stage 3 |
| **P2-12** | Trade vs UI EmptyState | Remove duplicate, use consolidated empty state. | Low | Stage 4 |

### 3.3 P3 — Minor Polish

| ID | Issue | Remediation | Effort | Stage |
|----|-------|-------------|--------|-------|
| **P3-01** | SearchBar positioning | Standardise search in one position per shell. | Low | Stage 4 |
| **P3-02** | Footer dead link | Verify/fix `/coverage` link in SiteFooter. | Low | Stage 7 |
| **P3-03** | Intelligence wrong tokens | Covered by P2-05/P2-11. | — | Stage 3 |
| **P3-04** | Terminal control height | Keep as-is; appropriate for terminal context. | — | N/A |
| **P3-05** | No "last updated" | Add freshness timestamp to page headers where relevant. | Low | Stage 7 |

---

## 4. Implementation Stages

### Stage 2 — Unified Design System Foundation

**Goal:** Ensure the design token system is complete and all foundational classes are defined.

**Tasks:**
1. Add missing semantic colour aliases:
   ```css
   --color-surface: #ffffff;
   --color-background: #f7f8f5;
   --color-text-primary: #202923;
   --color-text-secondary: #59665e;
   --color-text-muted: #68756e;
   --color-border: #e3e9e2;
   ```
2. Add terminal equivalents:
   ```css
   --color-terminal-text-primary: #f3f6f2;
   ```
3. Define standard container widths for all surfaces
4. Add consistent focus ring utilities
5. Add consistent transition utilities
6. Define card variants (interactive, static, metric, status)

**Deliverables:**
- Updated `globals.css` with complete token set
- `docs/design/HATSI360-DESIGN-SYSTEM.md`
- `docs/design/DESIGN-TOKEN-REFERENCE.md`

### Stage 3 — Global Token Compliance

**Goal:** Replace all non-token colour usage and standardise containers.

**Tasks:**
1. Replace all 336 `neutral-*` instances with `ink-*` equivalents
2. Replace all raw `blue-*`, `emerald-*`, `red-*`, `amber-*` with semantic tokens
3. Replace all ad-hoc container patterns with `container-page`
4. Standardise section spacing across public pages
5. Verify all changes visually

**Files affected:** ~30 files, ~526 colour instances  
**Risk:** Low (purely cosmetic, no logic changes)

### Stage 4 — Component Consolidation

**Goal:** Reduce duplicate component systems to 2 surface-appropriate variants.

**Tasks:**
1. **Page Headers:** Consolidate to 2 systems
   - `PageHero` → light editorial surfaces (public pages)
   - `PageHeader` → dark terminal surfaces (terminal, trade)
   - Update admin to use a consistent variant
   - Add breadcrumbs to both

2. **Status Badges:** Consolidate to 2 systems
   - `StatusBadge` → light surfaces (with tone mapping)
   - `Badge` → dark terminal surfaces
   - Remove `Pill`, `FieldStatusPill`, `EvidenceBadge` → use unified system

3. **Empty States:** Consolidate to 2 systems
   - `EmptyState` → light surfaces
   - `EmptyStatePanel` → dark terminal
   - Remove `FieldEmpty`, trade `EmptyState`

4. **Buttons:** Standardise 2 systems
   - Terminal `Button` → dark surfaces
   - Editorial button class → light surfaces
   - Remove ad-hoc button patterns

5. **Cards:** Standardise hover behaviour
   - Apply `card-hover` to all interactive cards
   - Define card variants: interactive, static, metric

**Deliverables:**
- Consolidated component exports
- Migration of all usage sites
- Updated component documentation

### Stage 5 — Surface Integration

**Goal:** Fix disconnected surfaces and ensure visual continuity.

**Tasks:**
1. **Intelligence pages:** Move into `(site)` route group or create intelligence layout extending TerminalShell
2. **Trade sub-layout:** Replace white nav with terminal-native tab navigation
3. **Dashboard:** Switch from `PageHero` to terminal `PageHeader`
4. **Admin:** Standardise page density, padding, card sizes
5. **Intelligence:** Replace all non-token classes
6. **Agent brand:** Add brand header, logo, colour accents

**Deliverables:**
- All surfaces visually connected to Hatsi360 brand
- Consistent navigation hierarchy

### Stage 6 — Agent App Brand Integration

**Goal:** Bring the field app into visual alignment with the platform.

**Tasks:**
1. Add Hatsi360 brand mark to agent header
2. Replace text glyph icons (⌂, ☑, ＋, ≡, ☺) with proper SVG icons
3. Add brand colour accents to key UI elements
4. Maintain mobile-first design and touch-friendly targets
5. Add consistent loading and empty states

**Deliverables:**
- Updated `AgentShell` with brand identity
- SVG icon set for agent navigation

### Stage 7 — Responsive & Loading Remediation

**Goal:** Ensure all pages have loading states and work across viewports.

**Tasks:**
1. Add Suspense boundaries to all data-heavy pages
2. Create skeleton variants for each page type
3. Test all pages at 320px, 375px, 768px, 1024px, 1440px
4. Fix horizontal overflow issues
5. Fix table responsiveness on mobile
6. Verify touch target sizes (44px minimum)
7. Fix dead links in footer

**Deliverables:**
- Loading states on all data pages
- Responsive fixes documented

### Stage 8 — Quality Assurance & Final Audit

**Goal:** Verify all improvements, run full test suite, document final state.

**Tasks:**
1. Run TypeScript compiler
2. Run ESLint
3. Run production build
4. Run existing test suite
5. Visual comparison: before vs after
6. Accessibility audit (keyboard nav, screen reader, contrast)
7. Cross-browser testing
8. Document final state

**Deliverables:**
- `docs/design/FINAL-UX-QUALITY-REPORT.md`
- `docs/design/RESPONSIVE-TEST-REPORT.md`
- `docs/design/ACCESSIBILITY-REPORT.md`
- `docs/design/COMPONENT-CONSISTENCY-REPORT.md`

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Component consolidation breaks existing pages | Medium | Medium | Stage-by-stage rollout, test after each |
| Token replacement introduces contrast issues | Low | Medium | Verify WCAG AA for all replacements |
| Intelligence route move breaks links | Low | High | Redirect from old URL |
| Agent icon replacement breaks touch targets | Low | Medium | Test on mobile devices |
| Loading state additions increase bundle size | Low | Low | Use dynamic import for skeletons |

---

## 6. Success Criteria

### Visual Quality
- [ ] One consistent colour token system (zero `neutral-*`, zero raw Tailwind semantics)
- [ ] One consistent typography system (all pages use defined scale)
- [ ] Two page header systems (editorial + terminal), not four
- [ ] Two badge systems (light + dark), not five
- [ ] Two empty state systems (light + dark), not four
- [ ] All surfaces visually connected to Hatsi360 brand

### UX Quality
- [ ] Clear navigation hierarchy on all surfaces
- [ ] Loading states on all data pages
- [ ] Empty states on all list/table pages
- [ ] Breadcrumbs on all pages below root
- [ ] Consistent container widths

### Responsive Quality
- [ ] No horizontal overflow at any breakpoint
- [ ] Touch targets ≥ 44px on mobile
- [ ] Tables usable on mobile (horizontal scroll or card layout)
- [ ] Navigation usable on mobile

### Engineering Quality
- [ ] TypeScript passes
- [ ] ESLint passes
- [ ] Production build passes
- [ ] Existing tests pass
- [ ] No new accessibility regressions

---

## 7. File Impact Estimate

| Stage | Files Modified | Lines Changed | Risk Level |
|-------|---------------|---------------|------------|
| Stage 2 | 2 (globals.css, design docs) | +200 | Low |
| Stage 3 | ~30 | ~700 replacements | Low |
| Stage 4 | ~40 | ~2,000 | Medium |
| Stage 5 | ~15 | ~1,500 | Medium |
| Stage 6 | ~8 | ~800 | Low |
| Stage 7 | ~20 | ~1,000 | Low |
| Stage 8 | 4 docs | ~2,000 | None |
| **Total** | **~60 unique files** | **~8,200** | **Medium** |

---

## 8. Dependencies & Constraints

- **No database changes** — this is purely a UX/visual project
- **No new dependencies** — use existing Tailwind + custom CSS
- **No route removals** — only additions or consolidations
- **No business logic changes** — separate from functional improvements
- **Preserve all entitlements** — RLS, auth, and permission checks untouched
- **Preserve all data fetching** — same queries, same Supabase calls

---

**Ready to proceed to Stage 2.**
