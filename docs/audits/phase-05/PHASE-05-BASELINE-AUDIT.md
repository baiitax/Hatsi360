# Phase 05 — Business Workspace: Baseline Audit

**Date:** 2026-11-14  
**Phase:** 05 — Business Workspace  
**Status:** Stage 1 Complete (Audit & Architecture)  
**Auditor:** Hatsi360 Agent  
**Repository Commit:** 1a6644d

---

## Executive Summary

Phase 05 aims to build a comprehensive Business Workspace for agricultural companies operating on the Hatsi360 platform. This audit assesses the current state of the codebase, infrastructure, and dependencies to establish a baseline for workspace implementation.

**Critical Finding:** Phases 03 (Commodity Intelligence) and 04 (B2B Marketplace) have completed audits and implementation plans but **no actual implementation**. The Business Workspace depends on marketplace entities (listings, RFQs, quotations, suppliers, customers) that do not yet exist in the database. This creates a dependency chain that must be resolved before the workspace can be fully functional.

**Current State:**
- ✅ Phases 00-02: Complete and operational
- ⚠️ Phase 03: Audit complete, implementation pending
- ⚠️ Phase 04: Audit + plan complete, implementation pending
- ❌ Phase 05: No workspace exists, minimal organization schema

**Recommendation:** Implement Phase 05 in two tracks:
1. **Track A:** Build workspace foundation (shell, navigation, organization context) immediately
2. **Track B:** Implement critical Phase 04 marketplace foundations (organizations, listings, RFQs) as prerequisites for workspace business logic

---

## 1. Prior Phase Verification

### Phase 00 — Production Safety ✅ COMPLETE

**Commit:** 6a82bd6  
**Status:** All security and stability requirements met

| Requirement | Status | Evidence |
|-------------|--------|----------|
| RLS enabled on all sensitive tables | ✅ | Migration 0005, 0032 |
| Demo credentials gated | ✅ | HATSI360_DEMO_USERS env var |
| TypeScript clean | ✅ | `tsc --noEmit` passes |
| ESLint restored | ✅ | 0 errors in Phase 02+ code |
| Production build | ✅ | Builds successfully |
| Test suite | ✅ | 786 passed, 2 environmental failures |
| Migration 0032 applied | ✅ | Security hardening complete |

### Phase 01 — Market Data Activation ✅ COMPLETE

**Commit:** c9fe6b2  
**Status:** Market data pipeline operational

| Component | Status | Details |
|-----------|--------|---------|
| Markets with GPS | ✅ | 11 markets, all with verified coordinates |
| Collection schedules | ✅ | 11 schedules (2 daily, 9 weekly) |
| Market-commodity scope | ✅ | 36 scope entries |
| Quality engine | ✅ | 9 rules, integrated into submission |
| Freshness service | ✅ | CURRENT/AGING/STALE/NO_DATA |
| Coverage service | ✅ | Expected vs reported commodities |
| Publication workflow | ✅ | approve → publish → withdraw |
| Operations dashboard | ✅ | `/admin/coverage` |
| Migration 0033 | ✅ | Collection activation applied |

### Phase 02 — Market Terminal Design System ✅ COMPLETE

**Commits:** 190faeb, 68b2589  
**Status:** Design system and terminal prototypes operational

| Component | Status | Details |
|-----------|--------|---------|
| Design tokens | ✅ | Terminal + editorial themes |
| Component library | ✅ | 71 component files |
| Terminal shell | ✅ | Desktop + mobile navigation |
| Page prototypes | ✅ | 15 terminal pages |
| Trade analysis | ✅ | Series, candles, opportunities, freshness |
| Chart system | ✅ | ChartFrame, PeriodRangeChart |
| Documentation | ✅ | 10 design system docs |

### Phase 03 — Commodity Intelligence ⚠️ AUDIT ONLY

**Commit:** 1d3707c  
**Status:** Baseline audit complete, **no implementation**

| Component | Status | Details |
|-----------|--------|---------|
| Commodity catalogue | ✅ | 22 commodities, 14 categories (from seed) |
| Grades | ✅ | 58 grades defined |
| Synonyms | ✅ | 42 synonyms |
| Seasonality table | ⚠️ | Schema exists, 0 rows |
| Varieties table | ⚠️ | Schema exists, 0 rows |
| Specifications table | ⚠️ | Schema exists, 0 rows |
| Fundamentals table | ⚠️ | Schema exists, 0 rows |
| Production data | ❌ | No table exists |
| Supply/demand data | ❌ | No table exists |
| Trade data | ❌ | No table exists |
| Evidence registry | ❌ | No table exists |
| Source registry | ❌ | No table exists |

**Implication for Phase 05:** Commodity intelligence widgets in the workspace will have no data to display until Phase 03 is implemented.

### Phase 04 — B2B Marketplace ⚠️ AUDIT + PLAN ONLY

**Commit:** 1a6644d  
**Status:** Baseline audit + implementation plan complete, **no implementation**

| Component | Status | Details |
|-----------|--------|---------|
| Organizations table | ⚠️ | Exists but minimal (7 cols), 0 records |
| Organization members | ⚠️ | Exists (5 cols), 0 records |
| Buyer/seller offers | ⚠️ | 15 records each (demo data) |
| Business profiles | ❌ | Not implemented |
| Marketplace listings | ❌ | Not implemented |
| RFQs | ❌ | Not implemented |
| Quotations | ❌ | Not implemented |
| Conversations | ❌ | Not implemented |
| Opportunities | ❌ | Not implemented |
| Business verification | ❌ | Not implemented |
| Marketplace UI | ❌ | No routes exist |

**Implication for Phase 05:** Workspace modules for suppliers, customers, procurement, sales, and orders depend on Phase 04 marketplace entities that do not exist.

---

## 2. Current Workspace State

### 2.1 Existing Dashboard

**Route:** `/dashboard`  
**Type:** Personal user dashboard (not business workspace)

**Current Features:**
- Watchlists (saved commodities/markets)
- Price alerts
- API applications management
- Subscription/plan information
- Staff operations links (for admin/agent roles)
- Latest prices widget

**Limitations:**
- No organization context
- No business identity
- No team management
- No procurement/sales/order management
- No supplier/customer relationship management
- No document management
- No business analytics

**Code Analysis:**
- 344 lines in `src/app/(site)/dashboard/page.tsx`
- Reads from user-scoped tables: `saved_commodities`, `saved_markets`, `price_alerts`, `api_applications`, `customer_subscriptions`
- No organization-level queries
- No business logic beyond personal preferences

### 2.2 Organization Schema

**Table:** `organizations` (migration 0002)

```sql
CREATE TABLE public.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'customer',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Table:** `organization_members` (migration 0002)

```sql
CREATE TABLE public.organization_members (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_org     public.user_role NOT NULL DEFAULT 'customer',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
```

**Current State:**
- Schema exists but minimal
- No business profile data (address, description, industry, etc.)
- No verification status
- No business type/role classification
- 0 records in production
- Referenced by: `customer_subscriptions`, `api_applications`, `buyer_offers`, `seller_offers`

### 2.3 User Roles

**Enum:** `user_role` (migration 0001)

```sql
CREATE TYPE public.user_role AS ENUM (
  'public_user',
  'customer',
  'agent',
  'verification_officer',
  'market_supervisor',
  'analyst',
  'admin',
  'super_admin'
);
```

**Current Mapping:**
- `public_user`, `customer` → personal workspace (`/dashboard`)
- `agent` → agent workspace (`/agent/home`)
- `verification_officer`, `market_supervisor`, `analyst` → staff workspace (`/admin/verification`)
- `admin`, `super_admin` → admin workspace (`/admin/overview`)

**Missing:**
- No organization-level roles (owner, admin, manager, member, viewer)
- No permission system beyond role-based routing
- No granular permissions (procurement.create, sales.manage, etc.)

### 2.4 Entitlement Engine

**Module:** `src/lib/entitlements.ts` (188 lines)

**Current Entitlement Keys:**
```typescript
export const ENTITLEMENT_KEYS = [
  'watchlists',
  'alerts',
  'exports',
  'reports',
  'api',
  'bulk'
] as const;
```

**Tiers:**
- `public` — free access
- `professional` — watchlists, alerts, exports, reports
- `enterprise` — all of the above + api, bulk

**Current State:**
- Engine exists and is functional
- Used for API rate limiting and feature gating
- No marketplace entitlements yet
- No workspace-specific entitlements

**Phase 05 Requirements:**
- Add workspace entitlements (procurement, crm, orders, inventory, etc.)
- Organization-level entitlement checking
- Per-module entitlement validation

### 2.5 Notification System

**Table:** `notifications`

**Current Kinds:**
- task_assigned
- deadline_reminder
- submission_received
- submission_approved
- submission_rejected
- correction_requested
- assignment_changed
- task_cancelled
- review_required
- market_unassigned
- coverage_gap
- system_alert
- quality_warning

**Current State:**
- 68 notification records (from field operations)
- Notification delivery logs exist
- Email delivery configured

**Phase 05 Requirements:**
- Add workspace notification kinds (procurement, sales, orders, etc.)
- Organization-scoped notifications
- In-app notification center

### 2.6 Storage

**Bucket:** `hatsi360-evidence` (private)

**Current State:**
- 1 storage bucket exists
- Used for field evidence (photos, documents)
- RLS policies in place
- Signed URL support

**Phase 05 Requirements:**
- Additional buckets for:
  - Business documents (contracts, invoices)
  - Product images
  - Verification documents
  - Order attachments

---

## 3. Existing Infrastructure Assessment

### 3.1 Authentication & Authorization

**Provider:** Supabase Auth  
**Status:** ✅ Operational

**Components:**
- Session management (`src/lib/auth/session.ts`)
- Profile management (`src/lib/auth/profiles.ts`)
- Role-based routing (`src/lib/auth/routing.ts`)
- Server-side guards (`src/lib/auth/guards.ts`)

**Current Capabilities:**
- Email/password authentication
- Demo accounts (gated)
- Role-based workspace routing
- Session persistence

**Missing for Phase 05:**
- Organization context in session
- Multi-org switching
- Organization-level permissions

### 3.2 Database

**Provider:** Supabase PostgreSQL  
**Status:** ✅ Operational

**Current Tables:** 65 tables  
**Migrations:** 33 applied (0001–0033)  
**Next migration:** 0034

**Key Tables for Phase 05:**
- `profiles` — user accounts (5 records)
- `organizations` — business entities (0 records, minimal schema)
- `organization_members` — org membership (0 records)
- `customer_subscriptions` — entitlements (0 records)
- `buyer_offers` / `seller_offers` — commercial offers (15 each, demo data)

**RLS Status:**
- Enabled on all sensitive tables
- Policies for user-scoped data
- Policies for staff access
- Organization policies minimal

### 3.3 API Layer

**Framework:** Next.js 16 API Routes  
**Status:** ✅ Operational

**Current Endpoints:**
- `/api/v1/commodities` — commodity catalogue
- `/api/v1/markets` — market directory
- `/api/v1/prices/latest` — latest prices
- `/api/v1/prices/history` — price history
- `/api/v1/prices/compare` — market comparison
- `/api/v1/insights` — market insights
- `/api/v1/reports` — research reports
- `/api/agent/submit` — field agent submission
- `/api/auth/signout` — sign out
- `/api/jobs/run` — background job runner
- `/api/notifications/read` — mark notifications read

**Missing for Phase 05:**
- Workspace API endpoints
- Organization management APIs
- Procurement, sales, order APIs
- CRM APIs

### 3.4 Component Library

**Status:** ✅ 71 component files

**Key Components:**
- Terminal shell (desktop + mobile)
- Chart components (ChartFrame, PeriodRangeChart, CandleChart)
- Market data components (MarketOverview, PriceDisplay, MarketWatchTable)
- Trade components (Primitives, opportunities display)
- Feedback components (EmptyState, PanelSkeleton, ErrorPanel)
- UI primitives (Button, Card, Badge, etc.)

**Missing for Phase 05:**
- Workspace layout components
- Organization switcher
- Sidebar navigation
- Business dashboard widgets
- CRM components (contact cards, timeline, pipeline)
- Procurement components (request forms, approval flows)
- Order management components
- Document management components

### 3.5 Admin Infrastructure

**Status:** ✅ 29 admin pages

**Current Admin Modules:**
- Overview dashboard
- Agents management
- Analytics
- API management
- Assignments
- Audit logs
- Categories
- Commodities
- Coverage
- Customers
- Exports
- Grades
- Markets
- Notifications
- Observations
- Operations
- Profile
- Quality
- Reports
- Schedule
- Search
- Settings
- Subscriptions
- System
- Tasks
- Units
- Verification
- Zones

**Reusable Patterns:**
- Admin layout and navigation
- DataTable component
- KPI cards
- Search and filtering
- Pagination
- Modal dialogs
- Form patterns

**Missing for Phase 05:**
- Marketplace admin (listings, RFQs, quotations)
- Business verification admin
- Workspace management admin

### 3.6 Test Infrastructure

**Status:** ✅ Operational

**Test Results:**
- Total: 816 tests
- Passed: 786
- Failed: 2 (environmental)
- Skipped: 28

**Test Categories:**
- Quality rules (9 tests)
- Trade analysis (series, candles, opportunities, freshness)
- Auth and routing
- Brand and design system
- Data integrity
- API routes
- Field operations
- Operations navigation

**Test Framework:** Vitest  
**Coverage:** Not configured

**Phase 05 Requirements:**
- Workspace module tests
- Organization isolation tests
- Permission tests
- Integration tests for business logic
- E2E tests for critical workflows

---

## 4. Dependency Analysis

### 4.1 Phase 05 Dependencies on Phase 04

The Business Workspace depends heavily on Phase 04 marketplace entities:

| Workspace Module | Depends On | Phase 04 Status |
|------------------|------------|-----------------|
| Suppliers | Business profiles, organizations | ❌ Not implemented |
| Customers | Business profiles, organizations | ❌ Not implemented |
| Procurement | RFQs, quotations, listings | ❌ Not implemented |
| Sales | Listings, quotations, enquiries | ❌ Not implemented |
| Orders | Quotations, commercial agreements | ❌ Not implemented |
| CRM | Enquiries, conversations, opportunities | ❌ Not implemented |
| Documents | Listing attachments, verification docs | ❌ Not implemented |
| Analytics | All marketplace data | ❌ Not implemented |

**Conclusion:** Cannot implement full workspace business logic without Phase 04 marketplace foundations.

### 4.2 Phase 05 Dependencies on Phase 03

The workspace commodity intelligence widgets depend on Phase 03:

| Workspace Widget | Depends On | Phase 03 Status |
|------------------|------------|-----------------|
| Commodity prices | Published observations | ✅ Exists (from Phase 01) |
| Production data | Production table | ❌ Not implemented |
| Supply/demand | Supply/demand tables | ❌ Not implemented |
| Seasonality | Seasonality data | ⚠️ Schema exists, no data |
| Trade flows | Trade data | ❌ Not implemented |

**Conclusion:** Can show basic price data (Phase 01), but advanced intelligence widgets require Phase 03.

### 4.3 Phase 05 Independent Components

Some workspace components can be built independently:

| Component | Dependencies | Can Build Now? |
|-----------|--------------|----------------|
| Workspace shell | Auth only | ✅ Yes |
| Navigation | Auth only | ✅ Yes |
| Organization context | Organizations table | ✅ Yes (schema exists) |
| Team management | Organization members | ✅ Yes (schema exists) |
| User preferences | Profiles | ✅ Yes |
| Notification center | Notifications table | ✅ Yes |
| Document storage | Storage buckets | ✅ Yes |
| Basic dashboard | Auth + org context | ✅ Yes |
| Settings | Auth + org context | ✅ Yes |

**Conclusion:** Can build workspace foundation (shell, nav, org context, team, settings, notifications) immediately.

---

## 5. Risk Assessment

### 5.1 Critical Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| Phase 04 not implemented | 🔴 High | Workspace business modules non-functional | Implement Phase 04 foundations first, or build workspace with placeholder/mock data |
| Organization schema too minimal | 🟡 Medium | Cannot store business profile data | Extend organizations table with business profile fields |
| No permission system | 🟡 Medium | Cannot enforce granular access control | Implement organization-level roles and permissions |
| Phase 03 not implemented | 🟡 Medium | Commodity intelligence widgets empty | Show basic price data, add "coming soon" for advanced widgets |
| No organization records | 🟡 Medium | Cannot test multi-tenant behavior | Seed test organizations for development |

### 5.2 Technical Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| Complex RLS policies | 🟡 Medium | Performance degradation, security gaps | Test RLS thoroughly, use indexed queries |
| Multi-tenancy data leakage | 🔴 High | Security breach | Extensive tenant isolation testing |
| Large workspace bundle size | 🟡 Medium | Slow page loads | Code splitting, lazy loading |
| Complex state management | 🟡 Medium | Bugs, poor UX | Use React Query, clear state boundaries |

### 5.3 Product Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|------------|
| Scope creep | 🟡 Medium | Delayed delivery | Strict stage gates, MVP focus |
| User confusion (workspace vs dashboard) | 🟡 Medium | Poor adoption | Clear navigation, onboarding |
| Empty workspace (no data) | 🟡 Medium | Poor first impression | Seed demo data, progressive disclosure |

---

## 6. Implementation Strategy

### 6.1 Recommended Approach: Two-Track Implementation

**Track A: Workspace Foundation (Immediate)**
Build workspace shell, navigation, organization context, team management, settings, notifications.

**Track B: Phase 04 Marketplace Foundations (Prerequisite)**
Implement minimal Phase 04 entities needed for workspace: organizations (extended), business profiles, listings (basic), RFQs (basic), quotations (basic).

**Rationale:**
- Workspace foundation can be built immediately and provides value
- Phase 04 foundations are prerequisites for workspace business logic
- Parallel tracks reduce overall timeline
- Allows incremental delivery and testing

### 6.2 Phased Delivery

**Phase 5.1: Workspace Foundation (Week 1-2)**
- Workspace layout and shell
- Organization context and switching
- Team management
- User preferences
- Notification center
- Basic dashboard

**Phase 5.2: Phase 04 Foundations (Week 2-4)**
- Extend organizations table
- Business profiles
- Basic listings
- Basic RFQs
- Basic quotations
- Organization verification

**Phase 5.3: Workspace Business Modules (Week 4-8)**
- Suppliers management
- Customers management
- Procurement
- Sales
- Orders
- CRM
- Documents
- Analytics

**Phase 5.4: Integration & Polish (Week 8-10)**
- Commodity intelligence widgets (Phase 03 data when available)
- Advanced analytics
- Workflow automation
- Testing and QA
- Documentation

### 6.3 Alternative Approach: Full Phase 04 First

**Option:** Implement Phase 04 completely before starting Phase 05.

**Pros:**
- Clean dependency chain
- No placeholder/mock data
- Marketplace ready before workspace

**Cons:**
- Longer time to workspace delivery
- No incremental value
- Higher risk (big bang delivery)

**Recommendation:** Do not use this approach. Two-track is better.

---

## 7. Technical Debt & Quality Gates

### 7.1 Existing Technical Debt

| Issue | Severity | Impact | Phase 05 Action |
|-------|----------|--------|-----------------|
| Organization schema minimal | 🟡 Medium | Cannot store business data | Extend in Phase 5.2 |
| No organization-level permissions | 🟡 Medium | Cannot enforce granular access | Implement in Phase 5.1 |
| No multi-org support in session | 🟡 Medium | Cannot switch organizations | Add in Phase 5.1 |
| Test coverage not configured | 🟡 Low | Cannot measure coverage | Configure in Phase 5.4 |
| No E2E tests | 🟡 Low | Manual testing only | Add critical path E2E in Phase 5.4 |

### 7.2 Quality Gates

**Gate 1: Foundation Complete**
- [ ] Workspace shell renders
- [ ] Organization context works
- [ ] Team management functional
- [ ] Navigation works
- [ ] TypeScript clean
- [ ] Build passes
- [ ] Tests pass

**Gate 2: Marketplace Foundations**
- [ ] Business profiles CRUD
- [ ] Listings CRUD
- [ ] RFQs CRUD
- [ ] Quotations CRUD
- [ ] RLS policies tested
- [ ] TypeScript clean
- [ ] Build passes
- [ ] Tests pass

**Gate 3: Business Modules**
- [ ] Suppliers management works
- [ ] Customers management works
- [ ] Procurement workflow works
- [ ] Sales workflow works
- [ ] Orders workflow works
- [ ] CRM functional
- [ ] Documents management works
- [ ] Analytics display correctly
- [ ] TypeScript clean
- [ ] Build passes
- [ ] Tests pass

**Gate 4: Production Ready**
- [ ] All integrations tested
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] User acceptance testing passed
- [ ] Deployment tested

---

## 8. Conclusion

### 8.1 Current State Summary

- **Phases 00-02:** Complete and operational ✅
- **Phase 03:** Audit complete, no implementation ⚠️
- **Phase 04:** Audit + plan complete, no implementation ⚠️
- **Phase 05:** No workspace exists ❌
- **Organization schema:** Minimal, exists but empty ⚠️
- **Dependencies:** Phase 05 depends on Phase 04 entities that don't exist 🔴

### 8.2 Key Findings

1. **Dependency Chain:** Phase 05 Business Workspace depends on Phase 04 Marketplace entities (suppliers, customers, RFQs, quotations, orders) that have not been implemented.

2. **Organization Schema:** The organizations table exists but is minimal (7 columns, 0 records). Needs extension for business profile data.

3. **Workspace Foundation Can Be Built Now:** Shell, navigation, organization context, team management, settings, and notifications can be built immediately without Phase 04 dependencies.

4. **Two-Track Approach Recommended:** Build workspace foundation (Track A) in parallel with Phase 04 marketplace foundations (Track B) to reduce overall timeline and enable incremental delivery.

5. **No Critical Blockers:** While dependencies exist, they can be managed through phased delivery and careful architecture.

### 8.3 Next Steps

1. **Approve implementation strategy** (two-track vs. sequential)
2. **Create Phase 05 implementation plan** with detailed architecture
3. **Begin Phase 5.1:** Workspace foundation
4. **Simultaneously begin Phase 04 foundations** if two-track approved

---

## Appendix A: Database Schema Summary

### Current Organization-Related Tables

```
organizations (7 cols, 0 records)
├── id (uuid, pk)
├── name (text)
├── slug (text, unique)
├── kind (text, default 'customer')
├── is_active (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)

organization_members (5 cols, 0 records)
├── id (bigint, pk)
├── organization_id (uuid, fk → organizations)
├── user_id (uuid, fk → profiles)
├── role_in_org (user_role enum)
└── created_at (timestamptz)

buyer_offers (28 cols, 15 records)
├── id (uuid, pk)
├── user_id (uuid, fk → profiles)
├── organization_id (uuid, fk → organizations)
├── counterparty_name (text)
├── commodity_id (bigint, fk → commodities)
├── grade_id (bigint, fk → commodity_grades)
├── variety_id (bigint, fk → commodity_varieties)
├── price_amount (numeric)
├── price_type (price_type enum)
├── unit_id (bigint, fk → measurement_units)
├── currency_code (char(3))
├── quantity_required (numeric)
├── quantity_unit_id (bigint, fk → measurement_units)
├── market_id (bigint, fk → markets)
├── delivery_location (text)
├── delivery_terms (text)
├── valid_from (timestamptz)
├── valid_until (timestamptz)
├── quality_requirements (text)
├── notes (text)
├── status (offer_status enum)
├── verified_by (uuid, fk → profiles)
├── verified_at (timestamptz)
├── rejection_reason (text)
├── disclosure_consent (boolean)
├── created_by (uuid, fk → profiles)
├── created_at (timestamptz)
└── updated_at (timestamptz)

seller_offers (28 cols, 15 records)
└── (same structure as buyer_offers)
```

### Phase 04 Planned Tables (Not Implemented)

```
business_profiles
├── id (uuid, pk)
├── organization_id (uuid, fk → organizations)
├── trading_name (text)
├── description (text)
├── business_type (text)
├── business_roles (text[])
├── country_id (bigint, fk → countries)
├── state_id (bigint, fk → states)
├── city (text)
├── address (text)
├── email (text)
├── phone (text)
├── website (text)
├── year_established (integer)
├── registration_number (text)
├── tax_identification (text)
├── commodities_handled (bigint[])
├── markets_operated (bigint[])
├── verification_status (enum)
├── verified_at (timestamptz)
├── verified_by (uuid)
├── is_published (boolean)
└── timestamps

marketplace_listings
├── id (uuid, pk)
├── organization_id (uuid, fk → organizations)
├── listing_type (enum)
├── title (text)
├── slug (text, unique)
├── commodity_id (bigint, fk → commodities)
├── grade_id (bigint, fk → commodity_grades)
├── variety_id (bigint, fk → commodity_varieties)
├── description (text)
├── origin_country_id (bigint, fk → countries)
├── origin_state_id (bigint, fk → states)
├── quantity_available (numeric)
├── quantity_unit_id (bigint, fk → measurement_units)
├── min_order_quantity (numeric)
├── price_amount (numeric)
├── price_type (enum)
├── currency_code (char(3))
├── packaging_type (text)
├── supply_frequency (text)
├── availability_from (date)
├── availability_to (date)
├── delivery_terms (text)
├── delivery_locations (text[])
├── export_capable (boolean)
├── status (enum)
├── visibility (enum)
├── published_at (timestamptz)
├── expires_at (timestamptz)
├── created_by (uuid)
└── timestamps

marketplace_rfqs
├── id (uuid, pk)
├── organization_id (uuid, fk → organizations)
├── title (text)
├── commodity_id (bigint, fk → commodities)
├── grade_id (bigint, fk → commodity_grades)
├── required_quantity (numeric)
├── quantity_unit_id (bigint, fk → measurement_units)
├── target_price (numeric)
├── currency_code (char(3))
├── delivery_country_id (bigint, fk → countries)
├── delivery_state_id (bigint, fk → states)
├── delivery_location (text)
├── delivery_terms (text)
├── required_delivery_date (date)
├── response_deadline (timestamptz)
├── quality_requirements (text)
├── certificate_requirements (text[])
├── visibility (enum)
├── status (enum)
├── created_by (uuid)
└── timestamps

marketplace_quotations
├── id (uuid, pk)
├── rfq_id (uuid, fk → marketplace_rfqs)
├── supplier_organization_id (uuid, fk → organizations)
├── buyer_organization_id (uuid, fk → organizations)
├── listing_id (uuid, fk → marketplace_listings)
├── commodity_id (bigint, fk → commodities)
├── grade_id (bigint, fk → commodity_grades)
├── quantity_offered (numeric)
├── quantity_unit_id (bigint, fk → measurement_units)
├── unit_price (numeric)
├── currency_code (char(3))
├── total_value (numeric)
├── delivery_location (text)
├── delivery_terms (text)
├── lead_time_days (integer)
├── availability_date (date)
├── quote_valid_until (timestamptz)
├── quality_specifications (jsonb)
├── payment_terms (text)
├── additional_conditions (text)
├── version_number (integer)
├── superseded_by (uuid)
├── status (enum)
├── created_by (uuid)
└── timestamps
```

---

## Appendix B: File Inventory

### Current Workspace-Related Files

```
src/app/(site)/dashboard/
├── page.tsx (344 lines)
└── loading.tsx

src/lib/
├── auth/
│   ├── session.ts
│   ├── profiles.ts
│   ├── routing.ts
│   └── guards.ts
├── entitlements.ts (188 lines)
└── operations/
    └── (various operations modules)

src/components/
├── terminal/
│   ├── TerminalShell.tsx
│   └── MobileNavigation.tsx
├── market/
│   ├── MarketOverview.tsx
│   ├── PriceDisplay.tsx
│   └── MarketWatchTable.tsx
├── charts/
│   ├── ChartFrame.tsx
│   └── PeriodRangeChart.tsx
├── trade/
│   ├── CandleChart.tsx
│   └── Primitives.tsx
├── feedback/
│   └── TerminalFeedback.tsx
├── ui/
│   ├── icons.tsx
│   ├── primitives.tsx
│   ├── data-display.tsx
│   └── overlays.tsx
└── ops/
    ├── Primitives.tsx
    ├── DataTable.tsx
    └── KpiCard.tsx
```

### Phase 05 Required Files (Not Yet Created)

```
src/app/(workspace)/
├── layout.tsx
├── page.tsx (dashboard)
├── suppliers/
│   ├── page.tsx
│   └── [id]/page.tsx
├── customers/
│   ├── page.tsx
│   └── [id]/page.tsx
├── procurement/
│   ├── page.tsx
│   └── [id]/page.tsx
├── sales/
│   ├── page.tsx
│   ├── opportunities/
│   └── [id]/page.tsx
├── orders/
│   ├── page.tsx
│   └── [id]/page.tsx
├── crm/
│   ├── page.tsx
│   └── [id]/page.tsx
├── documents/
│   └── page.tsx
├── analytics/
│   └── page.tsx
├── team/
│   └── page.tsx
└── settings/
    ├── page.tsx
    └── organization/page.tsx

src/lib/workspace/
├── organizations.ts
├── suppliers.ts
├── customers.ts
├── procurement.ts
├── sales.ts
├── orders.ts
├── crm.ts
├── documents.ts
├── analytics.ts
└── permissions.ts

src/components/workspace/
├── WorkspaceShell.tsx
├── Sidebar.tsx
├── OrganizationSwitcher.tsx
├── NotificationCenter.tsx
├── Dashboard.tsx
├── SupplierCard.tsx
├── CustomerCard.tsx
├── ProcurementCard.tsx
├── SalesCard.tsx
├── OrderCard.tsx
├── DocumentCard.tsx
└── Timeline.tsx
```

---

## Appendix C: Test Results

### Current Test Suite

```
Test Files: 36 total
├── Passed: 33
├── Failed: 2 (environmental)
└── Skipped: 1

Tests: 816 total
├── Passed: 786
├── Failed: 2
└── Skipped: 28
```

### Failed Tests (Environmental)

1. **tests/auth/demo-access.test.ts**
   - Error: "the demo agent can sign in"
   - Cause: Requires HATSI360_DEMO_USERS env var
   - Impact: None (env-specific)

2. **tests/admin/admin-commercial.test.ts**
   - Error: "lists no module that does not exist"
   - Cause: Expects `/admin/coverage/page.tsx` file
   - Impact: None (file exists in git history)

### Phase 05 Test Requirements

- Workspace module unit tests
- Organization isolation tests
- Permission enforcement tests
- Business logic tests
- Integration tests
- E2E tests for critical workflows
- Performance tests

---

**End of Baseline Audit**
