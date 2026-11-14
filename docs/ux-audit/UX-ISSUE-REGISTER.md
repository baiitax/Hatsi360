# Hatsi360 UX Issue Register

**Date:** 2026-11-14  
**Total Issues:** 45 (3 P0, 12 P1, 18 P2, 12 P3)

---

## P0 — Critical (3)

### P0-01: Dashboard Uses Wrong Page Header
- **Route:** `/dashboard`
- **Issue:** Uses `PageHero` (light editorial) inside `TerminalShell` (dark environment)
- **Impact:** Visual clash, appears broken
- **Fix:** Switch to terminal `PageHeader`
- **Effort:** Low (1 hour)

### P0-02: Intelligence Pages Disconnected
- **Routes:** `/intelligence`, `/intelligence/[slug]`
- **Issue:** No terminal shell, no navigation, isolated experience
- **Impact:** Users cannot navigate from intelligence to other sections
- **Fix:** Move into `(site)` route group or create intelligence layout
- **Effort:** Medium (4 hours)

### P0-03: Homepage Repeated Observations
- **Route:** `/`
- **Issue:** Multiple sections show same Paddy Rice observations
- **Impact:** Appears as data duplication
- **Fix:** Implement controlled latest-observation selection
- **Status:** ✅ Fixed in hero rebuild

---

## P1 — High (12)

### P1-01: Four Competing Page Header Systems
- **Impact:** Inconsistent headers across platform
- **Fix:** Consolidate to 2: `PageHero` (editorial) + `PageHeader` (terminal)
- **Effort:** Medium (8 hours)

### P1-02: Five Competing Status Badge Systems
- **Impact:** Confusing status presentation
- **Fix:** Consolidate to 2: `StatusBadge` (light) + `Badge` (dark)
- **Effort:** Medium (6 hours)

### P1-03: 526 Non-Token Color Violations
- **Impact:** Inconsistent colors, breaks design system
- **Fix:** Replace with `ink-*`, `info-*`, `success-*`, `error-*`, `warning-*`
- **Effort:** High (16 hours)

### P1-04: Agent Portal Emoji Icons ✅ FIXED
- **Status:** ✅ Complete (Phase B)
- **Fix:** Replaced with SVG icons from `@/components/ui/icons`

### P1-05: Trade Sub-Layout Visual Break
- **Route:** `/trade/*`
- **Issue:** White sub-nav bar inside dark terminal shell
- **Fix:** Use terminal-native tab navigation
- **Effort:** Medium (6 hours)

### P1-06: Inconsistent Containers
- **Impact:** Misaligned content, inconsistent widths
- **Fix:** Replace all with `container-page`
- **Effort:** Low (4 hours)

### P1-07: Four Competing Empty State Systems
- **Impact:** Inconsistent empty states
- **Fix:** Consolidate to 2: `EmptyState` (light) + `EmptyStatePanel` (dark)
- **Effort:** Low (4 hours)

### P1-08: Inconsistent Button Styles
- **Impact:** Confusing, unprofessional
- **Fix:** Standardise to 2: terminal `Button` + editorial button class
- **Effort:** Medium (6 hours)

### P1-09: No Breadcrumbs in Terminal
- **Impact:** Users lose context
- **Fix:** Add breadcrumb component to PageHeader and PageHero
- **Effort:** Low (2 hours)

### P1-10: Inconsistent Loading States
- **Impact:** Blank screens during data loading
- **Fix:** Add Suspense + skeleton states
- **Effort:** Medium (8 hours)

### P1-11: Mixed Color References
- **Impact:** Same as P1-03
- **Status:** Combined with P1-03

### P1-12: Trade vs UI EmptyState Duplication
- **Status:** Combined with P1-07

---

## P2 — Medium (18)

### P2-01: Admin Page Density Inconsistent
- **Fix:** Standardise p-6, card sizes, row heights
- **Effort:** Low (2 hours)

### P2-02: Intelligence Uses Non-Token Classes
- **Fix:** Replace `neutral-*` with `ink-*`
- **Effort:** Medium (4 hours)

### P2-03: Card Hover Inconsistency
- **Fix:** Apply `card-hover` consistently
- **Effort:** Low (2 hours)

### P2-04: SearchBar Positioning
- **Fix:** Standardise position per shell
- **Effort:** Low (1 hour)

### P2-05: No "Last Updated" Timestamp
- **Fix:** Add to PageHeader and PageHero
- **Effort:** Low (2 hours)

### P2-06: Footer Dead Link
- **Fix:** Verify/fix `/coverage` link
- **Effort:** Low (0.5 hours)

### P2-07: Agent Brand Integration ✅ FIXED
- **Status:** ✅ Complete (Phase B)

### P2-08: Homepage Content Hierarchy
- **Fix:** Reorganise per IA recommendation
- **Effort:** Medium (4 hours)

### P2-09: Price Cards Duplicate Data
- **Fix:** Deduplicate across sections
- **Effort:** Low (2 hours)

### P2-10: Metrics Inconsistent Definitions
- **Fix:** Define each metric clearly
- **Effort:** Medium (4 hours)

### P2-11: Tables Not Responsive on Mobile
- **Fix:** Card layout or horizontal scroll
- **Effort:** Medium (6 hours)

### P2-12: No Keyboard Navigation in Dropdowns
- **Fix:** Add keyboard support
- **Effort:** Medium (4 hours)

### P2-13: Charts Lack Tooltips
- **Fix:** Add tooltip component
- **Effort:** Medium (4 hours)

### P2-14: Inconsistent Typography Scale
- **Fix:** Use `--text-figure-*` tokens
- **Effort:** Low (2 hours)

### P2-15: No Reduced Motion Support
- **Fix:** Add `prefers-reduced-motion` media query
- **Effort:** Low (2 hours)

### P2-16: Inconsistent Focus Indicators
- **Fix:** Standardise focus ring
- **Effort:** Low (2 hours)

### P2-17: No Skip Navigation Link
- **Fix:** Add skip link
- **Effort:** Low (1 hour)

### P2-18: Images Lack Alt Text
- **Fix:** Add descriptive alt text
- **Effort:** Medium (4 hours)

---

## P3 — Low (12)

Minor polish items:
- P3-01: Inconsistent icon sizes
- P3-02: Missing hover states on links
- P3-03: Inconsistent border radius
- P3-04: No print stylesheets
- P3-05: Inconsistent divider styles
- P3-06: Missing micro-interactions
- P3-07: No dark mode toggle
- P3-08: Inconsistent tooltip styles
- P3-09: No loading progress indicator
- P3-10: Inconsistent scroll behavior
- P3-11: No onboarding flow
- P3-12: Terminal control height (keep as-is)

---

## Implementation Priority

### Week 1 (Immediate)
- ✅ P1-04: Agent emoji icons (Phase B complete)
- P0-01: Dashboard header fix
- P0-02: Intelligence shell
- P1-06: Container consistency

### Week 2
- P1-01: Page header consolidation
- P1-07: Empty state consolidation
- P1-09: Add breadcrumbs

### Week 3-4
- P1-03: Non-token color replacement (526 instances)
- P1-02: Badge consolidation
- P1-08: Button standardization

### Week 5-8
- P2 items (mobile, accessibility, loading states)
- P3 items (polish)

---

**Status:** COMPLETE  
**Total Estimated Effort:** ~120 hours across 8 weeks
