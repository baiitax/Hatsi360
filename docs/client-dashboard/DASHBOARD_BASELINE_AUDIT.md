# Hatsi360 Customer Dashboard — Baseline Audit

**Audit Date:** 2026-01-XX  
**Auditor:** Arena AI  
**Status:** Phase A — Audit & Baseline

---

## Executive Summary

This audit documents the current state of the Hatsi360 Premium Customer Dashboard, identifying existing functionality, data sources, UI/UX patterns, and areas requiring improvement. The dashboard serves authenticated customers with access to market intelligence, watchlists, alerts, research reports, and trade features.

**Key Findings:**
- Dashboard structure exists with 13 pages across 4 main sections
- Basic authentication and authorization implemented
- Entitlement engine (Migration 0016) functional with 3 tiers
- Data fetching uses Supabase direct queries (no dedicated API layer for client)
- UI uses Tailwind CSS with consistent brand colors
- Missing: advanced analytics, commodity intelligence, premium data experience, personalization

---

## 1. Current Dashboard Architecture

### 1.1 Route Structure

```
src/app/(client)/client/
├── page.tsx                          # Main dashboard overview
├── account/page.tsx                  # Account settings
├── alerts/page.tsx                   # Price alerts management
├── notifications/
│   ├── page.tsx                      # Notifications center
│   └── preferences/page.tsx          # Notification preferences
├── onboarding/
│   ├── page.tsx                      # Onboarding server component
│   └── OnboardingWizard.tsx          # Onboarding client component
├── research/page.tsx                 # Research reports
├── subscription/page.tsx             # Subscription management
├── trade/
│   ├── page.tsx                      # Trade overview
│   ├── rfqs/
│   │   ├── page.tsx                  # RFQ management
│   │   └── new/
│   │       ├── page.tsx              # Create RFQ server
│   │       └── RFQForm.tsx           # Create RFQ client
│   ├── orders/page.tsx               # Order management
│   └── suppliers/page.tsx            # Supplier directory
├── watchlists/page.tsx               # Watchlist management
└── [Dashboard components]
    ├── DashboardPriceChart.tsx       # Price trend chart (SVG)
    ├── DashboardTopMovers.tsx        # Top commodities widget
    └── DashboardMarketActivity.tsx   # Alert activity widget
```

**Total Pages:** 13  
**Route Group:** `(client)` with dedicated layout  
**Authentication:** Session-based with redirect to `/login`

### 1.2 Layout Structure

**File:** `src/app/(client)/layout.tsx`

- Server-side authentication check via `getSession()`
- Redirects unauthenticated users to `/login?returnUrl=/client`
- Two-column layout: Sidebar (264px) + Main content
- Client components: `ClientSidebar` + `ClientHeader`
- Responsive: Sidebar hidden on mobile (no mobile navigation implemented)

**Status:** VERIFIED IN CODE ✓

### 1.3 Sidebar Navigation

**File:** `src/components/client/ClientSidebar.tsx`

**Current Structure:**
```
Overview
  └─ Dashboard (/client)

Market Intelligence
  ├─ My Watchlists (/client/watchlists)
  ├─ Price Alerts (/client/alerts)
  └─ Saved Research (/client/research)

Trade & Sourcing
  ├─ Trade Overview (/client/trade)
  ├─ My RFQs (/client/trade/rfqs)
  ├─ Orders (/client/trade/orders)
  └─ Suppliers (/client/trade/suppliers)

Account
  ├─ Profile (/client/account)
  ├─ Subscription (/client/subscription)
  └─ API Keys (/client/api) [NOT IMPLEMENTED]
```

**Issues Identified:**
1. Uses placeholder "H" logo instead of actual Hatsi360 logo
2. No mobile navigation (sidebar hidden, no hamburger menu)
3. "API Keys" route does not exist
4. No "Commodity Intelligence" section
5. No "Price Analytics" section
6. No "Notifications" in sidebar
7. Missing version label update (shows "v4.0 • Stage 4" but should be "v5.0 • Premium Dashboard")
8. No collapsible sidebar functionality
9. Active state detection works but no visual indicator beyond background color

**Status:** PARTIALLY IMPLEMENTED (UI exists but incomplete)

### 1.4 Header Component

**File:** `src/components/client/ClientHeader.tsx`

- Displays user avatar (or initials fallback)
- User dropdown menu with profile link and sign-out
- Notification bell icon (no unread count badge)
- No search functionality
- No breadcrumb navigation

**Status:** VERIFIED IN CODE ✓ (but minimal)

---

## 2. Dashboard Overview Page

**File:** `src/app/(client)/client/page.tsx`

### 2.1 Current Widgets

1. **Welcome Banner**
   - Personalized greeting with user's name
   - Gradient background (brand colors)
   - Onboarding banner if not completed

2. **Quick Stats Cards (4 cards)**
   - Saved Commodities count
   - Active Alerts count
   - Unread Notifications count
   - Active Markets count
   - All link to respective pages

3. **Market Price Trends Chart**
   - SVG-based line chart (custom implementation)
   - Shows 30-day price trend
   - Not using Recharts (despite being installed)
   - Limited interactivity

4. **Top Commodities Widget**
   - Shows top 5 commodities by average price
   - Links to commodity pages
   - Simple card layout

5. **Recent Market Prices**
   - Lists 5 most recent prices
   - Shows commodity, market, price, unit
   - Links to full prices page

6. **Market Activity Widget**
   - Shows recent alert triggers
   - Displays trigger type, value, status
   - Links to alerts page

7. **Your Watchlist**
   - Shows 5 saved commodities
   - Grid layout with commodity cards
   - Links to commodity pages

8. **Quick Actions**
   - 4 action buttons: Watchlists, Alerts, Research, Price Terminal
   - Icon + label layout
   - All functional links

### 2.2 Data Sources

All data fetched directly from Supabase:

```typescript
// Profile
profiles (full_name, onboarding_completed_at)

// Counts
saved_commodities (count where user_id = session.user.id)
price_alerts (count where user_id = session.user.id AND is_active = true)
notifications (count where user_id = session.user.id AND read_at IS NULL)
markets (count where is_active = true)

// Recent data
latest_market_prices (view, limit 5)
saved_commodities + commodities (join, limit 5)
price_observations (last 30 days, limit 30)
alert_trigger_logs (limit 5)
```

**Issues:**
1. No data caching or revalidation strategy
2. Multiple sequential queries (no Promise.all)
3. No error handling for failed queries
4. No loading states
5. No empty state designs
6. No data freshness indicators

### 2.3 Data Quality Concerns

- `latest_market_prices` is a view — need to verify it's current
- Price observations query doesn't filter by user's watchlist
- No entitlement checks for premium features
- No subscription status validation

**Status:** VERIFIED IN CODE ✓ (but needs enhancement)

---

## 3. Watchlists Page

**File:** `src/app/(client)/client/watchlists/page.tsx`

### 3.1 Features

- Displays saved commodities (saved_commodities table)
- Displays saved markets (saved_markets table)
- Shows notes for each saved item
- Links to commodity/market detail pages
- Stats cards showing counts

### 3.2 Data Sources

```typescript
saved_commodities + commodities (join)
saved_markets + markets (join)
```

### 3.3 Issues

1. No ability to create/edit watchlists (read-only)
2. No ability to remove items
3. No ability to organize into custom watchlists
4. No search or filter functionality
5. No bulk actions
6. No export functionality
7. No entitlement check (should verify user has 'watchlists' entitlement)

**Status:** PARTIALLY IMPLEMENTED (view only, no management)

---

## 4. Alerts Page

**File:** `src/app/(client)/client/alerts/page.tsx`

### 4.1 Features

- Displays active price alerts
- Shows alert details (commodity, market, threshold, direction)
- Shows delivery channel (email/SMS/webhook)
- Stats cards (active, inactive, total counts)
- Links to create new alerts (but no actual form)

### 4.2 Data Sources

```typescript
price_alerts + commodities + markets (join)
```

### 4.3 Issues

1. No ability to create alerts from this page
2. No ability to edit alerts
3. No ability to delete alerts
4. No ability to pause/resume alerts
5. No alert history or trigger logs view
6. No entitlement check (should verify 'alerts' entitlement)
7. No validation of alert limits (Professional: 50, Enterprise: unlimited)

**Status:** PARTIALLY IMPLEMENTED (view only, no management)

---

## 5. Research Page

**File:** `src/app/(client)/client/research/page.tsx`

### 5.1 Features

- Displays user's report subscriptions
- Shows all available published reports
- Stats cards (subscriptions, available, premium counts)
- Report cards with title, summary, commodity, market, premium badge

### 5.2 Data Sources

```typescript
report_subscriptions + market_reports (join)
market_reports (all published, limit 20)
```

### 5.3 Issues

1. No report reader/viewer
2. No ability to subscribe/unsubscribe
3. No search or filter by commodity/market
4. No sorting options
5. No pagination (only shows 20)
6. No download functionality
7. Entitlement check relies on RLS (not explicit in UI)
8. No "restricted" state for non-premium users
9. No reading time estimate

**Status:** PARTIALLY IMPLEMENTED (view only, no reader)

---

## 6. Notifications Page

**File:** `src/app/(client)/client/notifications/page.tsx`

### 6.1 Features

- Displays all notifications
- Shows unread/read counts
- Notification cards with kind, severity, title, body, action URL
- Unread notifications highlighted

### 6.2 Data Sources

```typescript
notifications (where user_id = session.user.id)
```

### 6.3 Issues

1. No ability to mark as read
2. No ability to delete notifications
3. No filtering by type/severity
4. No pagination
5. No bulk actions
6. No notification preferences link (exists but not connected)

**Status:** PARTIALLY IMPLEMENTED (view only, no management)

---

## 7. Subscription Page

**File:** `src/app/(client)/client/subscription/page.tsx`

### 7.1 Features

- Displays current subscription plan
- Shows plan comparison (Free, Professional, Enterprise)
- Highlights current plan
- Upgrade/downgrade buttons (non-functional)

### 7.2 Data Sources

```typescript
customer_subscriptions (where user_id = session.user.id)
```

### 7.3 Issues

1. No actual upgrade/downgrade functionality
2. No payment integration
3. No billing history
4. No usage tracking
5. No entitlement details
6. No trial information
7. No cancellation flow
8. Plan prices are hardcoded (not from database)

**Status:** UI ONLY (no backend integration)

---

## 8. Trade Features

### 8.1 Trade Overview

**File:** `src/app/(client)/client/trade/page.tsx`

- Overview of trade features
- Links to RFQs, Orders, Suppliers
- Stats cards
- Info banner about trade platform

**Status:** VERIFIED IN CODE ✓

### 8.2 RFQs

**Files:**
- `src/app/(client)/client/trade/rfqs/page.tsx`
- `src/app/(client)/client/trade/rfqs/new/page.tsx`
- `src/app/(client)/client/trade/rfqs/new/RFQForm.tsx`

**Features:**
- List user's RFQs
- Create new RFQ with detailed form
- Show RFQ status and quote count
- Display quotes received

**Status:** VERIFIED IN CODE ✓ (functional)

### 8.3 Orders

**File:** `src/app/(client)/client/trade/orders/page.tsx`

- List purchase orders (as buyer)
- List sales orders (as supplier)
- Show order status and details

**Status:** VERIFIED IN CODE ✓ (functional)

### 8.4 Suppliers

**File:** `src/app/(client)/client/trade/suppliers/page.tsx`

- Browse verified suppliers
- Show ratings and certifications
- Quick quote request button

**Status:** VERIFIED IN CODE ✓ (functional)

---

## 9. Onboarding Flow

**Files:**
- `src/app/(client)/client/onboarding/page.tsx`
- `src/app/(client)/client/onboarding/OnboardingWizard.tsx`

### 9.1 Features

- 5-step wizard: Welcome → Interests → Markets → Notifications → Complete
- Auto-saves progress
- Creates notification preferences
- Saves selected commodities/markets

### 9.2 Issues

1. No ability to skip onboarding
2. No ability to redo onboarding
3. No progress indicator in header
4. Interests not used to personalize dashboard

**Status:** VERIFIED IN CODE ✓ (functional)

---

## 10. Database Schema Analysis

### 10.1 Core Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `profiles` | User profiles | ✓ VERIFIED |
| `saved_commodities` | Watchlist items | ✓ VERIFIED |
| `saved_markets` | Watchlist items | ✓ VERIFIED |
| `price_alerts` | Alert configurations | ✓ VERIFIED |
| `alert_trigger_logs` | Alert history | ✓ VERIFIED |
| `notifications` | User notifications | ✓ VERIFIED |
| `notification_delivery_logs` | Delivery tracking | ✓ VERIFIED |
| `user_notification_preferences` | Preferences | ✓ VERIFIED |
| `market_reports` | Research reports | ✓ VERIFIED |
| `report_subscriptions` | Report subscriptions | ✓ VERIFIED |
| `customer_subscriptions` | Subscription plans | ✓ VERIFIED |
| `billing_events` | Billing history | ✓ VERIFIED |
| `supplier_profiles` | Supplier info | ✓ VERIFIED |
| `rfqs` | Request for quotes | ✓ VERIFIED |
| `quotes` | Quote responses | ✓ VERIFIED |
| `orders` | Purchase orders | ✓ VERIFIED |
| `order_events` | Order audit trail | ✓ VERIFIED |
| `supplier_reviews` | Supplier ratings | ✓ VERIFIED |

### 10.2 Entitlement Engine

**Migration:** 0016_commercial_entitlements.sql

**Entitlement Keys:**
- `watchlists` — Save commodities and markets
- `alerts` — Price alerts
- `exports` — CSV and spreadsheet exports
- `reports` — Premium market intelligence
- `api` — API access
- `bulk` — Large historical exports

**Tiers:**
- `public` — No entitlements
- `professional` — watchlists, alerts, exports, reports
- `enterprise` — all entitlements

**Functions:**
- `user_entitlements()` — Returns user's entitlement keys
- `has_entitlement(key)` — Checks if user has entitlement
- `api_application_entitlements(app_id)` — API app entitlements

**Status:** VERIFIED IN DATABASE ✓ (fully functional)

### 10.3 Views

| View | Purpose | Status |
|------|---------|--------|
| `latest_market_prices` | Latest prices per commodity | ✓ VERIFIED |
| `published_price_observations` | Verified prices | ✓ VERIFIED |
| `market_price_summary` | Market aggregation | ✓ VERIFIED |
| `analytics_production_trends` | Production analytics | ✓ VERIFIED |
| `analytics_supply_demand_balance` | Supply/demand | ✓ VERIFIED |
| `analytics_trade_summary` | Trade analytics | ✓ VERIFIED |
| `analytics_commodity_overview` | Commodity overview | ✓ VERIFIED |
| `analytics_intelligence_dashboard` | Intelligence dashboard | ✓ VERIFIED |

**Status:** VERIFIED IN DATABASE ✓

---

## 11. API Routes

### 11.1 Existing Routes

```
/api/notifications/read     — Mark notifications as read
/api/agent/submit           — Agent data submission
/api/auth/signout           — Sign out
/api/v1/prices/latest       — Latest prices
/api/v1/prices/history      — Price history
/api/v1/prices/compare      — Price comparison
/api/v1/commodities         — Commodity list
/api/v1/countries           — Country list
/api/v1/intelligence/*      — Intelligence endpoints
/api/v1/charts/*            — Chart data
```

### 11.2 Issues

1. No dedicated client dashboard API routes
2. All client pages query Supabase directly
3. No data aggregation or caching layer
4. No API rate limiting for client queries
5. No entitlement checks in API routes

**Status:** PARTIALLY IMPLEMENTED (exists but not optimized for client)

---

## 12. UI/UX Assessment

### 12.1 Design System

**Colors:**
- Primary: `#1D805A` (Primary Green)
- Secondary: `#103C2D` (Forest Green)
- Accent: `#C7A45A` (Gold)
- Background: `#F7F9F7` (Light Green)
- Border: `#E3EAE5` (Border)
- Text: `#17241F` (Charcoal), `#64736B` (Slate)

**Status:** VERIFIED IN UI ✓ (consistent)

### 12.2 Components

**Using:**
- Tailwind CSS for styling
- Custom icon components (IconSave, IconBell, etc.)
- Card-based layouts
- Gradient backgrounds
- Responsive grids

**Not Using:**
- Recharts (despite being installed)
- Shadcn/ui components
- Headless UI
- Radix UI

### 12.3 Responsive Design

**Desktop:** ✓ Works well  
**Tablet:** ✓ Acceptable  
**Mobile:** ✗ Sidebar hidden, no mobile navigation

### 12.4 Accessibility

- Basic ARIA labels present
- Keyboard navigation not tested
- Screen reader support not verified
- Color contrast meets WCAG AA

**Status:** PARTIALLY IMPLEMENTED

---

## 13. Security & Permissions

### 13.1 Authentication

- Session-based authentication via Supabase
- All pages check for session
- Redirect to login if unauthenticated
- Session expires after inactivity

**Status:** VERIFIED IN CODE ✓

### 13.2 Authorization

- RLS policies on all tables
- User can only access own data
- Entitlement checks via `has_entitlement()`
- Premium reports protected by RLS

**Status:** VERIFIED IN DATABASE ✓

### 13.3 Issues

1. No explicit entitlement checks in UI (relies on RLS)
2. No "upgrade required" messaging
3. No usage limit enforcement
4. No API key management UI
5. No organization/workspace switching

**Status:** PARTIALLY IMPLEMENTED

---

## 14. Performance Concerns

### 14.1 Data Fetching

- Sequential queries (not parallelized)
- No caching or revalidation
- No pagination on large datasets
- No lazy loading

### 14.2 Rendering

- All pages are server components (good)
- Some client components for interactivity
- No code splitting optimization
- No image optimization

### 14.3 Issues

1. Dashboard makes 8+ sequential queries
2. No data caching between page loads
3. No optimistic updates
4. No loading skeletons
5. No error boundaries

**Status:** NEEDS OPTIMIZATION

---

## 15. Missing Features (High Priority)

### 15.1 Analytics & Charts

1. **Commodity Price Analytics**
   - Historical price charts (Recharts)
   - Date range selection
   - Market comparison
   - Price movement calculations
   - Export chart data

2. **Market Comparison**
   - Side-by-side market analysis
   - Price difference calculations
   - Historical comparison

3. **Advanced Filters**
   - Date range filters
   - Commodity filters
   - Market filters
   - Price type filters

### 15.2 Commodity Intelligence

1. **Commodity Profiles**
   - Detailed commodity pages
   - Market coverage
   - Historical data
   - Related reports

2. **Commodity Discovery**
   - Browse by category
   - Search commodities
   - Featured commodities
   - Trending commodities

### 15.3 Premium Data Experience

1. **Data Downloads**
   - CSV exports
   - Excel exports
   - PDF reports
   - Bulk data access

2. **Entitlement Indicators**
   - Premium badges
   - Upgrade prompts
   - Usage tracking
   - Feature gating

### 15.4 Personalization

1. **Dashboard Preferences**
   - Default view settings
   - Widget arrangement
   - Default filters
   - Preferred commodities/markets

2. **Watchlist Management**
   - Create custom watchlists
   - Organize items
   - Bulk actions
   - Share watchlists

### 15.5 Research & Reports

1. **Report Reader**
   - In-app report viewing
   - Table of contents
   - Search within report
   - Download options

2. **Report Discovery**
   - Search reports
   - Filter by category
   - Featured reports
   - Related reports

### 15.6 Mobile Experience

1. **Mobile Navigation**
   - Hamburger menu
   - Drawer navigation
   - Touch-optimized
   - Responsive tables

2. **Mobile Dashboard**
   - Compact widgets
   - Swipe gestures
   - Optimized charts
   - Quick actions

---

## 16. Technical Debt

### 16.1 Code Quality

1. No TypeScript strict mode
2. Some `any` types in use
3. Inconsistent error handling
4. Missing prop validation
5. No unit tests for client components

### 16.2 Architecture

1. No dedicated API layer for client
2. Direct Supabase queries in pages
3. No data caching strategy
4. No state management (React Query, SWR)
5. No error boundary components

### 16.3 Documentation

1. No component documentation
2. No API documentation for client
3. No user guide
4. No developer onboarding guide

---

## 17. Recommendations (Priority Order)

### Phase B — Dashboard Shell (Immediate)

1. **Implement proper mobile navigation**
   - Hamburger menu
   - Drawer sidebar
   - Touch-optimized

2. **Update sidebar structure**
   - Add actual Hatsi360 logo
   - Reorganize navigation sections
   - Add missing items (Notifications, Commodity Intelligence, Analytics)
   - Implement collapsible sidebar

3. **Add loading states**
   - Skeleton screens
   - Loading indicators
   - Error boundaries

### Phase C — Overview Dashboard (High Priority)

1. **Enhance dashboard widgets**
   - Add market activity snapshot
   - Add premium research snapshot
   - Add subscription overview
   - Add recent activity feed

2. **Improve data fetching**
   - Parallelize queries
   - Add error handling
   - Add caching strategy

3. **Add entitlement checks**
   - Explicit checks in UI
   - Upgrade prompts
   - Feature gating

### Phase D — Analytics (High Priority)

1. **Implement Recharts integration**
   - Replace custom SVG charts
   - Add interactive charts
   - Add date range selection

2. **Build analytics pages**
   - Commodity price analytics
   - Market comparison
   - Historical trends

### Phase E — Commodity Intelligence (Medium Priority)

1. **Create commodity profiles**
   - Detailed commodity pages
   - Market coverage
   - Historical data

2. **Add commodity discovery**
   - Browse by category
   - Search
   - Featured items

### Phase F — Research & Premium Data (Medium Priority)

1. **Build report reader**
   - In-app viewing
   - Navigation
   - Download options

2. **Add premium data features**
   - Data exports
   - Bulk access
   - Usage tracking

### Phase G — Personalization (Low Priority)

1. **Dashboard preferences**
   - Widget arrangement
   - Default filters
   - Preferred items

2. **Advanced watchlist management**
   - Custom watchlists
   - Organization
   - Sharing

### Phase H — Integration & QA (Ongoing)

1. **End-to-end testing**
   - Workflow testing
   - Cross-browser testing
   - Performance testing

2. **Security audit**
   - Entitlement verification
   - RLS testing
   - API security

---

## 18. Conclusion

The Hatsi360 Customer Dashboard has a solid foundation with functional authentication, authorization, and basic data display. However, it requires significant enhancement to deliver a premium intelligence experience.

**Key Gaps:**
1. No advanced analytics or charting
2. No commodity intelligence features
3. No premium data experience
4. No personalization
5. Poor mobile experience
6. No proper data management (create/edit/delete)

**Recommended Approach:**
- Phased implementation (B through H)
- Focus on analytics and commodity intelligence first
- Maintain existing architecture
- Enhance rather than replace
- Prioritize mobile experience

**Estimated Effort:**
- Phase B: 1-2 days
- Phase C: 2-3 days
- Phase D: 3-4 days
- Phase E: 2-3 days
- Phase F: 2-3 days
- Phase G: 1-2 days
- Phase H: Ongoing

**Total:** 11-17 days for full implementation

---

**Next Step:** Proceed to Phase B — Dashboard Shell implementation.
