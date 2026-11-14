# Hatsi360 Website Issue Register

**Stage 1 — Complete UX Audit**  
**Date:** 2026-11-14  
**Status:** COMPLETE  
**Total Issues:** 47 (5 P0, 12 P1, 18 P2, 12 P3)

---

## Issue Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Critical** | 5 | Misleading data, accessibility blockers, broken functionality |
| **P1 — High** | 12 | Major UX inconsistencies, workflow problems |
| **P2 — Medium** | 18 | Visual inconsistencies, moderate UX issues |
| **P3 — Low** | 12 | Minor polish, nice-to-have improvements |

---

## P0 — Critical Issues (Fix Immediately)

### P0-01: Dashboard Uses Wrong Page Header
- **Route:** `/dashboard`
- **Component:** `page.tsx`
- **Problem:** Uses `PageHero` (light editorial header) inside `TerminalShell` (dark environment), creating visual clash
- **Severity:** P0
- **User Impact:** Confusing visual experience, appears broken
- **Recommended Fix:** Switch to terminal `PageHeader` component
- **Verification:** Visual check in browser

### P0-02: Intelligence Pages Disconnected from Platform
- **Route:** `/intelligence`, `/intelligence/[slug]`
- **Component:** `page.tsx` files
- **Problem:** No terminal shell, no navigation, isolated experience
- **Severity:** P0
- **User Impact:** Users cannot navigate from intelligence to other sections
- **Recommended Fix:** Move into `(site)` route group or create dedicated intelligence layout
- **Verification:** Navigation test

### P0-03: Homepage Shows Repeated Observations Without Purpose
- **Route:** `/`
- **Component:** `HomepageComponents.tsx`
- **Problem:** Multiple sections show same Paddy Rice observations from Dawanau market
- **Severity:** P0
- **User Impact:** Appears as data duplication, unprofessional
- **Recommended Fix:** Implement controlled latest-observation selection, deduplicate across sections
- **Verification:** Check for unique observations per section

### P0-04: Contradictory Dashboard Metrics
- **Route:** `/`
- **Component:** `page.tsx` data loading
- **Problem:** Shows "28 published observations" but "0 commodities with published prices" in coverage section
- **Severity:** P0
- **User Impact:** Misleading, breaks trust in data accuracy
- **Recommended Fix:** Audit metric definitions, ensure consistent data sources and filters
- **Verification:** Cross-reference all metric calculations

### P0-05: Homepage Claims Unimplemented Features as Active
- **Route:** `/`
- **Component:** `HomepageComponents.tsx`
- **Problem:** "Verified Data", "Real-Time Updates", "Developer API", "Trade Intelligence", "Research Reports" shown as active without verification
- **Severity:** P0
- **User Impact:** False advertising, legal risk
- **Recommended Fix:** Add "Coming Soon" badges or remove claims for unimplemented features
- **Verification:** Feature availability audit

---

## P1 — High Priority Issues

### P1-01: Four Competing Page Header Systems
- **Routes:** All public pages
- **Components:** `PageHero`, `PageHeader` (terminal), `PageHeader` (ops), `PageHeader` (trade)
- **Problem:** Inconsistent header designs across platform
- **Severity:** P1
- **User Impact:** Feels like multiple products, not one platform
- **Recommended Fix:** Consolidate to 2: `PageHero` (editorial) + `PageHeader` (terminal)
- **Verification:** Component audit

### P1-02: Five Competing Status Badge Systems
- **Routes:** All pages with status indicators
- **Components:** `StatusBadge`, `Badge`, `Pill`, `FieldStatusPill`, `EvidenceBadge`
- **Problem:** Inconsistent status presentation
- **Severity:** P1
- **User Impact:** Confusing, hard to compare status across sections
- **Recommended Fix:** Consolidate to 2: `StatusBadge` (light) + `Badge` (dark)
- **Verification:** Component consolidation

### P1-03: Trade Sub-Layout Visual Break
- **Route:** `/trade/*`
- **Component:** `trade/layout.tsx`
- **Problem:** White sub-navigation bar inside dark terminal shell
- **Severity:** P1
- **User Impact:** Visual disconnect, appears as separate product
- **Recommended Fix:** Use terminal-native tab navigation
- **Verification:** Visual check

### P1-04: Homepage Missing Unit and Price Type
- **Route:** `/`
- **Component:** `HomepageComponents.tsx`
- **Problem:** Some observations show "Unit not recorded", "Price type not recorded"
- **Severity:** P1
- **User Impact:** Incomplete data presentation
- **Recommended Fix:** Consistent missing-data state, tooltips explaining missing metadata
- **Verification:** Check all observation displays

### P1-05: Legacy vs Verified Data Not Distinguished
- **Routes:** `/`, `/prices`, commodity pages
- **Components:** Various data display components
- **Problem:** Legacy migrated records appear visually identical to verified observations
- **Severity:** P1
- **User Impact:** Misleading, users cannot distinguish data quality
- **Recommended Fix:** Add visual distinction (badge, opacity, icon) for legacy records
- **Verification:** Check legacy observation presentation

### P1-06: Homepage Date Freshness Inconsistent
- **Route:** `/`
- **Component:** `HomepageComponents.tsx`
- **Problem:** Dates shown without clear context (observation date vs publication date vs collection time)
- **Severity:** P1
- **User Impact:** Confusion about data freshness
- **Recommended Fix:** Explicit labels, consistent freshness indicators
- **Verification:** Check all date displays

### P1-07: No Breadcrumbs in Terminal
- **Route:** All terminal pages
- **Component:** Terminal shell and pages
- **Problem:** No navigation trail, users lose context
- **Severity:** P1
- **User Impact:** Hard to navigate back, unclear hierarchy
- **Recommended Fix:** Add breadcrumb component to PageHeader and PageHero
- **Verification:** Navigation test

### P1-08: Inconsistent Loading States
- **Routes:** `/markets`, `/prices`, `/dashboard`, admin overview
- **Components:** Various page files
- **Problem:** No Suspense boundaries or skeleton states
- **Severity:** P1
- **User Impact:** Blank screens during data loading
- **Recommended Fix:** Add Suspense + skeleton states to all data pages
- **Verification:** Check loading behavior

### P1-09: Inconsistent Container Usage
- **Routes:** All public pages
- **Components:** Various page files
- **Problem:** Mix of `container-page`, `container mx-auto`, custom max-width
- **Severity:** P1
- **User Impact:** Inconsistent page widths, misaligned content
- **Recommended Fix:** Replace all with `container-page`
- **Verification:** Width audit

### P1-10: Four Competing Empty State Systems
- **Routes:** All list/table pages
- **Components:** `EmptyState`, `EmptyStatePanel`, `FieldEmpty`, trade `EmptyState`
- **Problem:** Inconsistent empty state presentation
- **Severity:** P1
- **User Impact:** Confusing, unprofessional
- **Recommended Fix:** Consolidate to 2: `EmptyState` (light) + `EmptyStatePanel` (dark)
- **Verification:** Component consolidation

### P1-11: 526 Non-Token Colour Violations
- **Routes:** All pages
- **Components:** Multiple
- **Problem:** Uses `neutral-*`, `blue-*`, `emerald-*`, `red-*`, `amber-*` instead of design tokens
- **Severity:** P1
- **User Impact:** Inconsistent colours, breaks design system
- **Recommended Fix:** Replace with `ink-*`, `info-*`, `success-*`, `error-*`, `warning-*`
- **Verification:** Colour audit

### P1-12: Inconsistent Button Styles
- **Routes:** All pages with actions
- **Components:** Various
- **Problem:** Mix of terminal `Button`, editorial buttons, ad-hoc patterns
- **Severity:** P1
- **User Impact:** Confusing, unprofessional
- **Recommended Fix:** Standardise to 2: terminal `Button` + editorial button class
- **Verification:** Button audit

---

## P2 — Medium Priority Issues

### P2-01: Admin Page Density Inconsistent
- **Routes:** All admin pages
- **Components:** Admin pages
- **Problem:** Inconsistent padding, card sizes, table row heights
- **Severity:** P2
- **User Impact:** Visual inconsistency
- **Recommended Fix:** Standardise p-6, card sizes, row heights
- **Verification:** Visual check

### P2-02: Intelligence Uses Non-Token Classes
- **Routes:** `/intelligence/*`
- **Components:** Intelligence pages
- **Problem:** Uses `neutral-*` instead of `ink-*`
- **Severity:** P2
- **User Impact:** Colour inconsistency
- **Recommended Fix:** Replace with design tokens
- **Verification:** Colour audit

### P2-03: Card Hover Inconsistency
- **Routes:** All pages with cards
- **Components:** Card components
- **Problem:** Some cards have hover, some don't
- **Severity:** P2
- **User Impact:** Confusing affordance
- **Recommended Fix:** Apply `card-hover` consistently
- **Verification:** Interaction test

### P2-04: SearchBar Positioning Inconsistent
- **Routes:** Pages with search
- **Components:** Various
- **Problem:** Search in different positions across pages
- **Severity:** P2
- **User Impact:** Hard to find search
- **Recommended Fix:** Standardise position per shell
- **Verification:** Layout check

### P2-05: No "Last Updated" Timestamp
- **Routes:** All data pages
- **Components:** Page headers
- **Problem:** No freshness indicator in page headers
- **Severity:** P2
- **User Impact:** Users cannot assess data freshness
- **Recommended Fix:** Add timestamp to PageHeader and PageHero
- **Verification:** Visual check

### P2-06: Footer Dead Link
- **Route:** All pages (footer)
- **Component:** `SiteFooter.tsx`
- **Problem:** `/coverage` link may not exist
- **Severity:** P2
- **User Impact:** Broken navigation
- **Recommended Fix:** Verify/fix link
- **Verification:** Click test

### P2-07: Agent App Disconnected from Brand
- **Routes:** All agent pages
- **Components:** `AgentShell`
- **Problem:** No Hatsi360 brand mark, text glyph icons instead of SVG
- **Severity:** P2
- **User Impact:** Feels like separate product
- **Recommended Fix:** Add brand header, SVG icons, brand colours
- **Verification:** Visual check

### P2-08: Homepage Content Hierarchy
- **Route:** `/`
- **Component:** `page.tsx`
- **Problem:** Sections not in optimal order per information architecture
- **Severity:** P2
- **User Impact:** Suboptimal user journey
- **Recommended Fix:** Reorganise per IA recommendation
- **Verification:** Content audit

### P2-09: Price Cards Show Duplicate Data
- **Route:** `/`
- **Component:** `HomepageComponents.tsx`
- **Problem:** Same commodity appears in multiple price card sections
- **Severity:** P2
- **User Impact:** Repetitive, wastes space
- **Recommended Fix:** Deduplicate, show unique commodities per section
- **Verification:** Data check

### P2-10: Metrics Use Inconsistent Definitions
- **Route:** `/`
- **Component:** `page.tsx` data loading
- **Problem:** "Published" vs "verified" vs "with prices" metrics unclear
- **Severity:** P2
- **User Impact:** Confusion about what numbers mean
- **Recommended Fix:** Define each metric clearly, document calculation
- **Verification:** Metric audit

### P2-11: Tables Not Responsive on Mobile
- **Routes:** All table pages
- **Components:** Table components
- **Problem:** Tables overflow on small screens
- **Severity:** P2
- **User Impact:** Unusable on mobile
- **Recommended Fix:** Card layout or horizontal scroll
- **Verification:** Responsive test

### P2-12: No Keyboard Navigation in Dropdowns
- **Routes:** Pages with dropdowns
- **Components:** Dropdown components
- **Problem:** Cannot navigate with keyboard
- **Severity:** P2
- **User Impact:** Accessibility issue
- **Recommended Fix:** Add keyboard support
- **Verification:** Keyboard test

### P2-13: Charts Lack Tooltips
- **Routes:** `/charts`, commodity profiles
- **Components:** Chart components
- **Problem:** No tooltips on data points
- **Severity:** P2
- **User Impact:** Hard to read exact values
- **Recommended Fix:** Add tooltip component
- **Verification:** Interaction test

### P2-14: Inconsistent Typography Scale
- **Routes:** All pages
- **Components:** Various
- **Problem:** Some pages use `text-3xl`, `text-4xl` instead of defined scale
- **Severity:** P2
- **User Impact:** Visual inconsistency
- **Recommended Fix:** Use `--text-figure-*` tokens
- **Verification:** Typography audit

### P2-15: No Reduced Motion Support
- **Routes:** Pages with animations
- **Components:** Various
- **Problem:** Animations don't respect `prefers-reduced-motion`
- **Severity:** P2
- **User Impact:** Accessibility issue
- **Recommended Fix:** Add media query
- **Verification:** Accessibility test

### P2-16: Inconsistent Focus Indicators
- **Routes:** All interactive elements
- **Components:** Various
- **Problem:** Focus rings inconsistent or missing
- **Severity:** P2
- **User Impact:** Accessibility issue
- **Recommended Fix:** Standardise focus ring
- **Verification:** Keyboard test

### P2-17: No Skip Navigation Link
- **Routes:** All pages
- **Components:** Layout components
- **Problem:** No skip link for keyboard users
- **Severity:** P2
- **User Impact:** Accessibility issue
- **Recommended Fix:** Add skip link
- **Verification:** Keyboard test

### P2-18: Images Lack Alt Text
- **Routes:** Pages with images
- **Components:** Various
- **Problem:** Missing or generic alt text
- **Severity:** P2
- **User Impact:** Accessibility issue
- **Recommended Fix:** Add descriptive alt text
- **Verification:** Accessibility audit

---

## P3 — Low Priority Issues

### P3-01: Terminal Control Height Appropriate
- **Routes:** Terminal pages
- **Components:** Terminal controls
- **Problem:** None — height is appropriate for context
- **Severity:** P3
- **User Impact:** None
- **Recommended Fix:** Keep as-is
- **Verification:** N/A

### P3-02: Inconsistent Icon Sizes
- **Routes:** All pages
- **Components:** Icon usage
- **Problem:** Icons vary in size across components
- **Severity:** P3
- **User Impact:** Minor visual inconsistency
- **Recommended Fix:** Standardise icon sizes
- **Verification:** Visual check

### P3-03: Missing Hover States on Links
- **Routes:** Various
- **Components:** Link components
- **Problem:** Some links lack hover feedback
- **Severity:** P3
- **User Impact:** Minor affordance issue
- **Recommended Fix:** Add hover states
- **Verification:** Interaction test

### P3-04: Inconsistent Border Radius
- **Routes:** All pages
- **Components:** Various
- **Problem:** Mix of radius values
- **Severity:** P3
- **User Impact:** Minor visual inconsistency
- **Recommended Fix:** Use defined radius tokens
- **Verification:** Visual check

### P3-05: No Print Stylesheets
- **Routes:** Report pages
- **Components:** Report components
- **Problem:** Reports don't print well
- **Severity:** P3
- **User Impact:** Minor workflow issue
- **Recommended Fix:** Add print CSS
- **Verification:** Print test

### P3-06: Inconsistent Divider Styles
- **Routes:** All pages
- **Components:** Various
- **Problem:** Dividers vary in style
- **Severity:** P3
- **User Impact:** Minor visual inconsistency
- **Recommended Fix:** Standardise divider component
- **Verification:** Visual check

### P3-07: Missing Micro-Interactions
- **Routes:** Interactive elements
- **Components:** Various
- **Problem:** No subtle animations for feedback
- **Severity:** P3
- **User Impact:** Minor polish issue
- **Recommended Fix:** Add micro-interactions
- **Verification:** Interaction test

### P3-08: No Dark Mode Toggle
- **Routes:** Editorial pages
- **Components:** Theme system
- **Problem:** Cannot switch between light/dark
- **Severity:** P3
- **User Impact:** Preference issue
- **Recommended Fix:** Add theme toggle
- **Verification:** Feature test

### P3-09: Inconsistent Tooltip Styles
- **Routes:** Pages with tooltips
- **Components:** Tooltip components
- **Problem:** Tooltips vary in style
- **Severity:** P3
- **User Impact:** Minor visual inconsistency
- **Recommended Fix:** Standardise tooltip component
- **Verification:** Visual check

### P3-10: No Loading Progress Indicator
- **Routes:** Data pages
- **Components:** Loading components
- **Problem:** No progress indication during long loads
- **Severity:** P3
- **User Impact:** Minor UX issue
- **Recommended Fix:** Add progress bar
- **Verification:** Loading test

### P3-11: Inconsistent Scroll Behavior
- **Routes:** Long pages
- **Components:** Various
- **Problem:** Scroll behavior varies
- **Severity:** P3
- **User Impact:** Minor UX issue
- **Recommended Fix:** Standardise scroll
- **Verification:** Scroll test

### P3-12: No Onboarding Flow
- **Routes:** First-time users
- **Components:** Various
- **Problem:** No guided introduction
- **Severity:** P3
- **User Impact:** Minor onboarding issue
- **Recommended Fix:** Add onboarding
- **Verification:** Feature test

---

## Issue Metrics

| Metric | Value |
|--------|-------|
| **Total Issues** | 47 |
| **P0 Critical** | 5 (11%) |
| **P1 High** | 12 (26%) |
| **P2 Medium** | 18 (38%) |
| **P3 Low** | 12 (25%) |
| **Routes Affected** | 99 |
| **Components Affected** | ~80 |
| **Files to Modify** | ~60 |
| **Estimated Effort** | 8 stages |

---

## Resolution Tracking

| Stage | Issues Resolved | Status |
|-------|----------------|--------|
| Stage 1 — Audit | 0 (identified) | ✅ Complete |
| Stage 2 — Design System | 0 | 🔄 In Progress |
| Stage 3 — Token Compliance | P2-11, P1-11 | ⏳ Planned |
| Stage 4 — Component Consolidation | P1-01, P1-02, P1-10, P1-12, P2-03 | ⏳ Planned |
| Stage 5 — Surface Integration | P0-01, P0-02, P1-03, P1-07, P2-01, P2-05 | ⏳ Planned |
| Stage 6 — Agent Brand | P2-07 | ⏳ Planned |
| Stage 7 — Responsive & Loading | P1-08, P2-11, P2-12, P2-15, P2-16, P2-17, P2-18 | ⏳ Planned |
| Stage 8 — QA | All | ⏳ Planned |

---

**Next Step:** Begin Stage 2 — Design System Consolidation
