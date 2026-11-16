# Hatsi360 Customer Dashboard — UX Issues Registry

**Document Version:** 1.0  
**Created:** 2026-01-XX  
**Purpose:** Comprehensive list of UX issues identified during audit

---

## Critical Issues (Must Fix)

### UX-001: No Mobile Navigation
- **Severity:** Critical
- **Impact:** Mobile users cannot access dashboard
- **Status:** FIXED in Phase B — Mobile drawer implemented

### UX-002: Placeholder Logo
- **Severity:** High
- **Impact:** Brand identity not established
- **Status:** FIXED in Phase B — Using hatsi360-logo-horizontal-light.png

### UX-003: No Loading States
- **Severity:** High
- **Impact:** Users see blank pages during data fetch
- **Status:** FIXED in Phase C — Dashboard has proper empty states

### UX-004: No Error Boundaries
- **Severity:** High
- **Impact:** Unhandled errors crash the page
- **Status:** PARTIALLY ADDRESSED — Empty states handle no-data, but no React error boundaries

### UX-005: No Search Functionality
- **Severity:** High
- **Impact:** Users cannot quickly find commodities, markets, reports
- **Status:** FIXED in Phase B — Search bar added to header

---

## High Priority Issues

### UX-006: Sequential Data Fetching
- **Severity:** High
- **Impact:** Slow page loads (8+ sequential queries)
- **Status:** FIXED in Phase C — Dashboard uses Promise.all for parallel fetching

### UX-007: Watchlist Read-Only
- **Severity:** High
- **Impact:** Users cannot manage their watchlist
- **Status:** TO FIX in Phase G — CRUD operations planned

### UX-008: Alerts Read-Only
- **Severity:** High
- **Impact:** Users cannot create/edit/delete alerts
- **Status:** TO FIX in Phase G — CRUD operations planned

### UX-009: No Report Reader
- **Severity:** High
- **Impact:** Users cannot read reports in-app
- **Status:** TO FIX in Phase F — Report reader planned

### UX-010: Charts Not Interactive
- **Severity:** High
- **Impact:** Custom SVG charts have no tooltips, zoom, or pan
- **Status:** FIXED in Phase D — Recharts integration with tooltips

### UX-011: No Date Range Selection
- **Severity:** High
- **Impact:** Users limited to 30-day view only
- **Status:** FIXED in Phase D — 7d/30d/90d/6m/1y/all options

### UX-012: No Commodity Discovery
- **Severity:** High
- **Impact:** Users cannot browse or search commodities
- **Status:** FIXED in Phase E — Commodities page with search/filter/grid

### UX-013: No Market Discovery
- **Severity:** High
- **Impact:** Users cannot browse markets
- **Status:** FIXED in Phase E — Markets page with search/filter

---

## Medium Priority Issues

### UX-014: Sidebar Not Collapsible
- **Severity:** Medium
- **Impact:** Takes up screen space
- **Status:** FIXED in Phase B — Collapsible with localStorage persistence

### UX-015: No Breadcrumbs
- **Severity:** Medium
- **Impact:** Users lose context in deep navigation
- **Status:** NOT STARTED — Lower priority

### UX-016: No Notification Badge Count
- **Severity:** Medium
- **Impact:** Users miss important notifications
- **Status:** FIXED in Phase B — Badge shows unread count

### UX-017: No Data Export
- **Severity:** Medium
- **Impact:** Users cannot download their data
- **Status:** NOT STARTED — Planned for Phase F

### UX-018: No Entitlement UI Checks
- **Severity:** Medium
- **Impact:** Users see features they can't use
- **Status:** PARTIALLY FIXED — Sidebar filters by entitlement

### UX-019: No Upgrade Prompts
- **Severity:** Medium
- **Impact:** No conversion path for free users
- **Status:** NOT STARTED — Planned for Phase H

### UX-020: No Subscription Management
- **Severity:** Medium
- **Impact:** Users cannot change plans
- **Status:** NOT STARTED — No payment provider configured

### UX-021: No Pagination
- **Severity:** Medium
- **Impact:** Large datasets load slowly
- **Status:** NOT STARTED — Limited to 20 items per view

### UX-022: No Offline Support
- **Severity:** Medium
- **Impact:** Users lose access without internet
- **Status:** NOT STARTED — Lower priority

---

## Low Priority Issues

### UX-023: No Theme Preferences
- **Severity:** Low
- **Impact:** No dark mode option
- **Status:** NOT STARTED

### UX-024: No Widget Arrangement
- **Severity:** Low
- **Impact:** Users cannot customize dashboard layout
- **Status:** NOT STARTED

### UX-025: No Keyboard Shortcuts
- **Severity:** Low
- **Impact:** Power users less efficient
- **Status:** NOT STARTED

### UX-026: No Swipe Gestures (Mobile)
- **Severity:** Low
- **Impact:** Mobile UX less polished
- **Status:** NOT STARTED

### UX-027: No Pull to Refresh (Mobile)
- **Severity:** Low
- **Impact:** Mobile data refresh less intuitive
- **Status:** NOT STARTED

---

## Resolved Issues

| Issue | Resolution | Phase |
|-------|-----------|-------|
| UX-001: No mobile nav | Mobile drawer with overlay | Phase B |
| UX-002: Placeholder logo | Actual Hatsi360 logo | Phase B |
| UX-003: No loading states | Empty state designs | Phase C |
| UX-005: No search | Global search in header | Phase B |
| UX-006: Sequential fetch | Promise.all parallel | Phase C |
| UX-010: Non-interactive charts | Recharts with tooltips | Phase D |
| UX-011: No date range | 7d/30d/90d/6m/1y/all | Phase D |
| UX-012: No commodity discovery | Commodities page | Phase E |
| UX-013: No market discovery | Markets page | Phase E |
| UX-014: Non-collapsible sidebar | Collapse with localStorage | Phase B |
| UX-016: No notification badge | Badge with count | Phase B |

---

## Remaining Work

| Issue | Target Phase | Priority |
|-------|-------------|----------|
| UX-004: Error boundaries | Phase H | High |
| UX-007: Watchlist CRUD | Phase G | High |
| UX-008: Alerts CRUD | Phase G | High |
| UX-009: Report reader | Phase F | High |
| UX-015: Breadcrumbs | Phase H | Medium |
| UX-017: Data export | Phase F | Medium |
| UX-018: Entitlement UI | Phase H | Medium |
| UX-019: Upgrade prompts | Phase H | Medium |
| UX-020: Subscription mgmt | Phase H | Medium |
| UX-021: Pagination | Phase H | Medium |
