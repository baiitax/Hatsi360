# Hatsi360 Premium Client Portal — Route Inventory

**Version:** 1.0  
**Date:** 2026-11-15  
**Auditor:** Arena Agent

---

## 1. Overview

This document inventories every route in the Hatsi360 application, classifying each by:
- **Environment**: Public, Client, Agent, Admin, API
- **Authentication**: Required, Optional, None
- **Status**: Working, Partial, Stub, Missing
- **Proposed Location**: Where it should live in the client portal architecture

---

## 2. Complete Route Inventory

### 2.1 Public Website Routes

| Route | File | Auth | Status | Client Portal Mapping |
|-------|------|------|--------|----------------------|
| `/` | `(site)/page.tsx` | None | ✅ Working | Public (no change) |
| `/about` | `(site)/about/page.tsx` | None | ✅ Working | Public (no change) |
| `/contact` | `(site)/contact/page.tsx` | None | ✅ Working | Public (no change) |
| `/faq` | `(site)/faq/page.tsx` | None | ✅ Working | Public (no change) |
| `/pricing` | `(site)/pricing/page.tsx` | None | ✅ Working | A → Account → Plans |
| `/solutions` | `(site)/solutions/page.tsx` | None | ✅ Working | Public (no change) |
| `/methodology` | `(site)/methodology/page.tsx` | None | ✅ Working | Public (no change) |
| `/privacy` | `(site)/privacy/page.tsx` | None | ✅ Working | Public (no change) |
| `/terms` | `(site)/terms/page.tsx` | None | ✅ Working | Public (no change) |
| `/cookies` | `(site)/cookies/page.tsx` | None | ✅ Working | Public (no change) |
| `/disclaimer` | `(site)/disclaimer/page.tsx` | None | ✅ Working | Public (no change) |
| `/api-policy` | `(site)/api-policy/page.tsx` | None | ✅ Working | Public (no change) |

### 2.2 Public Market Intelligence Routes

| Route | File | Auth | Status | Client Portal Mapping |
|-------|------|------|--------|----------------------|
| `/markets` | `(site)/markets/page.tsx` | None | ✅ Working | B → Market Intelligence |
| `/markets/[slug]` | `(site)/markets/[slug]/page.tsx` | None | ✅ Working | B → Market Profile |
| `/commodities` | `(site)/commodities/page.tsx` | None | ✅ Working | B → Commodity Directory |
| `/commodities/[slug]` | `(site)/commodities/[slug]/page.tsx` | None | ✅ Working | B → Commodity Profile |
| `/prices` | `(site)/prices/page.tsx` | None | ✅ Working | B → Price Explorer |
| `/prices/[commodity]` | `(site)/prices/[commodity]/page.tsx` | None | ✅ Working | B → Commodity Prices |
| `/compare` | `(site)/compare/page.tsx` | None | ✅ Working | B → Market Comparison |
| `/charts` | `(site)/charts/page.tsx` | None | ✅ Working | B → Chart Workspace |
| `/coverage-report` | `(site)/coverage-report/page.tsx` | None | ✅ Working | B → Coverage |

### 2.3 Public Trade Intelligence Routes

| Route | File | Auth | Status | Client Portal Mapping |
|-------|------|------|--------|----------------------|
| `/trade` | `(site)/trade/page.tsx` | None | ✅ Working | B → Trade Overview |
| `/trade/terminal` | `(site)/trade/terminal/page.tsx` | None | ✅ Working | B → Trading Terminal |
| `/trade/best-buy` | `(site)/trade/best-buy/page.tsx` | None | ✅ Working | B → Sourcing Intelligence |
| `/trade/best-sell` | `(site)/trade/best-sell/page.tsx` | None | ✅ Working | B → Procurement Intelligence |
| `/trade/fundamentals` | `(site)/trade/fundamentals/page.tsx` | None | ✅ Working | B → Fundamentals |

### 2.4 Public Research & Reports Routes

| Route | File | Auth | Status | Client Portal Mapping |
|-------|------|------|--------|----------------------|
| `/reports` | `(site)/reports/page.tsx` | None | ✅ Working | F → Research Library |
| `/reports/[slug]` | `(site)/reports/[slug]/page.tsx` | None | ✅ Working | F → Report Detail |
| `/insights` | `(site)/insights/page.tsx` | None | ✅ Working | F → Market Briefs |
| `/insights/[slug]` | `(site)/insights/[slug]/page.tsx` | None | ✅ Working | F → Brief Detail |
| `/intelligence` | `intelligence/page.tsx` | None | ✅ Working | F → Commodity Intelligence |
| `/intelligence/[slug]` | `intelligence/[slug]/page.tsx` | None | ✅ Working | F → Commodity Detail |

### 2.5 Authenticated Client Routes (CURRENT STATE)

| Route | File | Auth | Status | Client Portal Mapping |
|-------|------|------|--------|----------------------|
| `/dashboard` | `(site)/dashboard/page.tsx` | Required | ⚠️ Basic | A → Client Home |
| `/trade/watchlist` | `(site)/trade/watchlist/page.tsx` | Required | ⚠️ Basic | C → My Watchlists |
| `/trade/alerts` | `(site)/trade/alerts/page.tsx` | Required | ⚠️ Basic | C → My Alerts |
| `/api-docs` | `(site)/api-docs/page.tsx` | Optional | ✅ Working | G → API Access |

### 2.6 Auth Routes

| Route | File | Auth | Status | Client Portal Mapping |
|-------|------|------|--------|----------------------|
| `/login` | `(portal)/login/page.tsx` | None | ✅ Working | Auth |
| `/register` | `(portal)/register/page.tsx` | None | ✅ Working | Auth |
| `/forgot-password` | `(portal)/forgot-password/page.tsx` | None | ✅ Working | Auth |
| `/reset-password` | `(portal)/reset-password/page.tsx` | None | ✅ Working | Auth |
| `/auth/callback` | `auth/callback/route.ts` | N/A | ✅ Working | Auth |

### 2.7 Admin Routes (NOT CLIENT)

| Route | File | Auth | Status | Notes |
|-------|------|------|--------|-------|
| `/admin` | `admin/page.tsx` | Staff | ✅ Working | Admin redirect |
| `/admin/overview` | `admin/overview/page.tsx` | Staff | ✅ Working | Admin dashboard |
| `/admin/operations` | `admin/operations/page.tsx` | Staff | ✅ Working | Live operations |
| `/admin/verification` | `admin/verification/page.tsx` | Staff | ✅ Working | Verification queue |
| `/admin/observations` | `admin/observations/page.tsx` | Staff | ✅ Working | Observation directory |
| `/admin/agents` | `admin/agents/page.tsx` | Staff | ✅ Working | Agent management |
| `/admin/agents/[id]` | `admin/agents/[id]/page.tsx` | Staff | ✅ Working | Agent detail |
| `/admin/markets` | `admin/markets/page.tsx` | Staff | ✅ Working | Market management |
| `/admin/commodities` | `admin/commodities/page.tsx` | Staff | ✅ Working | Commodity management |
| `/admin/categories` | `admin/categories/page.tsx` | Staff | ✅ Working | Category management |
| `/admin/grades` | `admin/grades/page.tsx` | Staff | ✅ Working | Grade management |
| `/admin/units` | `admin/units/page.tsx` | Staff | ✅ Working | Unit management |
| `/admin/customers` | `admin/customers/page.tsx` | Staff | ✅ Working | Customer management |
| `/admin/subscriptions` | `admin/subscriptions/page.tsx` | Staff | ✅ Working | Subscription management |
| `/admin/analytics` | `admin/analytics/page.tsx` | Staff | ✅ Working | Analytics dashboard |
| `/admin/reports` | `admin/reports/page.tsx` | Staff | ✅ Working | Report management |
| `/admin/exports` | `admin/exports/page.tsx` | Staff | ✅ Working | Export management |
| `/admin/notifications` | `admin/notifications/page.tsx` | Staff | ✅ Working | Notification management |
| `/admin/audit` | `admin/audit/page.tsx` | Staff | ✅ Working | Audit trail |
| `/admin/settings` | `admin/settings/page.tsx` | Staff | ✅ Working | System settings |
| `/admin/system` | `admin/system/page.tsx` | Staff | ✅ Working | Jobs & health |
| `/admin/profile` | `admin/profile/page.tsx` | Staff | ✅ Working | Admin profile |
| `/admin/search` | `admin/search/page.tsx` | Staff | ✅ Working | Global search |
| `/admin/tasks` | `admin/tasks/page.tsx` | Staff | ✅ Working | Collection tasks |
| `/admin/schedule` | `admin/schedule/page.tsx` | Staff | ✅ Working | Collection planner |
| `/admin/assignments` | `admin/assignments/page.tsx` | Staff | ✅ Working | Agent assignments |
| `/admin/quality` | `admin/quality/page.tsx` | Staff | ✅ Working | Data quality |
| `/admin/api-management` | `admin/api-management/page.tsx` | Staff | ✅ Working | API key management |
| `/admin/intelligence/*` | Multiple | Staff | ✅ Working | Trade intelligence |
| `/admin/zones` | `admin/zones/page.tsx` | Staff | ✅ Working | Market zones |

### 2.8 Agent Routes (NOT CLIENT)

| Route | File | Auth | Status | Notes |
|-------|------|------|--------|-------|
| `/agent` | `agent/page.tsx` | Agent | ✅ Working | Agent redirect |
| `/agent/home` | `agent/home/page.tsx` | Agent | ✅ Working | Agent dashboard |
| `/agent/assignments` | `agent/assignments/page.tsx` | Agent | ✅ Working | Task assignments |
| `/agent/assignments/[id]` | `agent/assignments/[id]/page.tsx` | Agent | ✅ Working | Assignment detail |
| `/agent/collect` | `agent/collect/page.tsx` | Agent | ✅ Working | Data collection |
| `/agent/collection` | `agent/collection/page.tsx` | Agent | ✅ Working | Collection history |
| `/agent/collection/[id]` | `agent/collection/[id]/page.tsx` | Agent | ✅ Working | Collection detail |
| `/agent/collection/new` | `agent/collection/new/page.tsx` | Agent | ✅ Working | New collection |
| `/agent/corrections` | `agent/corrections/page.tsx` | Agent | ✅ Working | Correction requests |
| `/agent/help` | `agent/help/page.tsx` | Agent | ✅ Working | Help & support |
| `/agent/history` | `agent/history/page.tsx` | Agent | ✅ Working | Submission history |
| `/agent/markets` | `agent/markets/page.tsx` | Agent | ✅ Working | Assigned markets |
| `/agent/markets/[id]` | `agent/markets/[id]/page.tsx` | Agent | ✅ Working | Market detail |
| `/agent/notifications` | `agent/notifications/page.tsx` | Agent | ✅ Working | Agent notifications |
| `/agent/observations` | `agent/observations/page.tsx` | Agent | ✅ Working | Observation history |
| `/agent/observations/[id]` | `agent/observations/[id]/page.tsx` | Agent | ✅ Working | Observation detail |
| `/agent/performance` | `agent/performance/page.tsx` | Agent | ✅ Working | Performance metrics |
| `/agent/profile` | `agent/profile/page.tsx` | Agent | ✅ Working | Agent profile |
| `/agent/submissions` | `agent/submissions/page.tsx` | Agent | ✅ Working | Submission history |
| `/agent/tasks` | `agent/tasks/page.tsx` | Agent | ✅ Working | Task list |

### 2.9 API Routes

| Route | File | Auth | Status | Notes |
|-------|------|------|--------|-------|
| `/api/v1/commodities` | `api/v1/commodities/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/markets` | `api/v1/markets/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/prices/latest` | `api/v1/prices/latest/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/prices/history` | `api/v1/prices/history/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/prices/compare` | `api/v1/prices/compare/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/charts/commodity` | `api/v1/charts/commodity/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/countries` | `api/v1/countries/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/countries/[code]` | `api/v1/countries/[code]/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/hs-codes` | `api/v1/hs-codes/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/hs-codes/[code]` | `api/v1/hs-codes/[code]/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/tariffs/[code]` | `api/v1/tariffs/[code]/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/insights` | `api/v1/insights/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/reports` | `api/v1/reports/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/intelligence/*` | Multiple | Optional | ✅ Working | Trade intelligence |
| `/api/v1/trade/*` | Multiple | Optional | ✅ Working | Trade data |
| `/api/v1/trade-blocs` | `api/v1/trade-blocs/route.ts` | Optional | ✅ Working | Public API |
| `/api/v1/[...path]` | `api/v1/[...path]/route.ts` | Varies | ✅ Working | Catch-all |
| `/api/agent/submit` | `api/agent/submit/route.ts` | Agent | ✅ Working | Agent submission |
| `/api/auth/signout` | `api/auth/signout/route.ts` | Auth | ✅ Working | Sign out |
| `/api/jobs/run` | `api/jobs/run/route.ts` | Admin | ✅ Working | Job runner |
| `/api/notifications/read` | `api/notifications/read/route.ts` | Auth | ✅ Working | Mark read |

---

## 3. Missing Client Portal Routes

### 3.1 Required Routes (Per Specification)

| Proposed Route | Purpose | Priority | Status |
|----------------|---------|----------|--------|
| `/client` | Client home/dashboard | P0 | ❌ Missing |
| `/client/onboarding` | Onboarding wizard | P0 | ❌ Missing |
| `/client/onboarding/profile` | Personal profile step | P0 | ❌ Missing |
| `/client/onboarding/business` | Business profile step | P0 | ❌ Missing |
| `/client/onboarding/interests` | Agricultural interests step | P0 | ❌ Missing |
| `/client/onboarding/preferences` | Workspace preferences step | P1 | ❌ Missing |
| `/client/intelligence` | Market intelligence hub | P1 | ❌ Missing |
| `/client/intelligence/commodities` | Saved commodities | P1 | ❌ Missing |
| `/client/intelligence/markets` | Saved markets | P1 | ❌ Missing |
| `/client/intelligence/analysis` | Saved analyses | P2 | ❌ Missing |
| `/client/watchlists` | Watchlist management | P1 | ❌ Missing |
| `/client/watchlists/[id]` | Watchlist detail | P1 | ❌ Missing |
| `/client/alerts` | Alert management | P1 | ❌ Missing |
| `/client/alerts/new` | Create alert | P1 | ❌ Missing |
| `/client/alerts/[id]` | Alert detail/history | P1 | ❌ Missing |
| `/client/notifications` | Notification centre | P1 | ❌ Missing |
| `/client/research` | Research library | P2 | ❌ Missing |
| `/client/research/saved` | Saved research | P2 | ❌ Missing |
| `/client/research/history` | Reading history | P2 | ❌ Missing |
| `/client/trade` | Trade hub | P2 | ❌ Missing |
| `/client/trade/opportunities` | Trade opportunities | P2 | ❌ Missing |
| `/client/trade/rfqs` | My RFQs | P2 | ❌ Missing |
| `/client/trade/rfqs/new` | Create RFQ | P2 | ❌ Missing |
| `/client/trade/rfqs/[id]` | RFQ detail | P2 | ❌ Missing |
| `/client/trade/quotations` | Received quotations | P2 | ❌ Missing |
| `/client/trade/enquiries` | My enquiries | P2 | ❌ Missing |
| `/client/trade/contacts` | Business contacts | P3 | ❌ Missing |
| `/client/workspace` | Business workspace | P2 | ❌ Missing |
| `/client/workspace/overview` | Company overview | P2 | ❌ Missing |
| `/client/workspace/suppliers` | My suppliers | P2 | ❌ Missing |
| `/client/workspace/customers` | My customers | P2 | ❌ Missing |
| `/client/workspace/procurement` | Procurement activity | P2 | ❌ Missing |
| `/client/workspace/sales` | Sales activity | P2 | ❌ Missing |
| `/client/workspace/follow-ups` | Follow-up tasks | P3 | ❌ Missing |
| `/client/workspace/documents` | Document storage | P3 | ❌ Missing |
| `/client/workspace/team` | Team management | P3 | ❌ Missing |
| `/client/account` | Account settings | P1 | ❌ Missing |
| `/client/account/profile` | Personal profile | P1 | ❌ Missing |
| `/client/account/preferences` | User preferences | P1 | ❌ Missing |
| `/client/account/notifications` | Notification preferences | P1 | ❌ Missing |
| `/client/account/security` | Security settings | P1 | ❌ Missing |
| `/client/subscription` | Subscription overview | P1 | ❌ Missing |
| `/client/subscription/plans` | Available plans | P1 | ❌ Missing |
| `/client/subscription/billing` | Billing history | P2 | ❌ Missing |
| `/client/subscription/invoices` | Invoice history | P2 | ❌ Missing |
| `/client/subscription/usage` | Usage & limits | P2 | ❌ Missing |
| `/client/api` | API access | P2 | ❌ Missing |
| `/client/api/keys` | API key management | P2 | ❌ Missing |
| `/client/api/usage` | API usage stats | P2 | ❌ Missing |

### 3.2 Routes to Deprecate/Migrate

| Current Route | Action | Reason |
|---------------|--------|--------|
| `/dashboard` | Migrate to `/client` | Better IA |
| `/trade/watchlist` | Migrate to `/client/watchlists` | Consolidate client features |
| `/trade/alerts` | Migrate to `/client/alerts` | Consolidate client features |
| `/api-docs` | Keep public, add `/client/api` | Public docs + client management |

---

## 4. Proposed Information Architecture

### A. Client Home
```
/client                          → Dashboard
/client/activity                 → Recent activity timeline
```

### B. Market Intelligence
```
/client/intelligence             → Intelligence hub
/client/intelligence/commodities → Saved/watched commodities
/client/intelligence/markets     → Saved/watched markets
/client/intelligence/analysis    → Saved analyses
```

### C. My Intelligence
```
/client/watchlists               → Watchlist management
/client/watchlists/[id]          → Watchlist detail
/client/alerts                   → Alert management
/client/alerts/[id]              → Alert detail
/client/notifications            → Notification centre
```

### D. Research
```
/client/research                 → Research library
/client/research/saved           → Saved items
/client/research/history         → Reading history
```

### E. Trade & Sourcing
```
/client/trade                    → Trade hub
/client/trade/opportunities      → Opportunities
/client/trade/rfqs               → My RFQs
/client/trade/quotations         → Quotations received
/client/trade/enquiries          → My enquiries
```

### F. Business Workspace
```
/client/workspace                → Business overview
/client/workspace/suppliers      → Suppliers
/client/workspace/customers      → Customers
/client/workspace/procurement    → Procurement
/client/workspace/sales          → Sales
/client/workspace/follow-ups     → Follow-ups
/client/workspace/team           → Team members
```

### G. Account & Subscription
```
/client/account                  → Account settings
/client/account/profile          → Personal profile
/client/account/preferences      → Preferences
/client/account/notifications    → Notification prefs
/client/account/security         → Security
/client/subscription             → Subscription overview
/client/subscription/plans       → Plans
/client/subscription/billing     → Billing
/client/subscription/usage       → Usage
/client/api                      → API access
```

---

## 5. Migration Strategy

### Phase 1: Create Client Route Group
1. Create `(client)` route group with dedicated layout
2. Build client sidebar navigation
3. Create `/client` as new dashboard
4. Keep `/dashboard` as redirect to `/client`

### Phase 2: Migrate Authenticated Pages
1. Move watchlist to `/client/watchlists`
2. Move alerts to `/client/alerts`
3. Create notification centre at `/client/notifications`
4. Keep old routes as redirects

### Phase 3: Build New Pages
1. Account settings
2. Subscription management
3. Onboarding flow
4. Business workspace

### Phase 4: Trade Workflows
1. RFQ management
2. Quotation handling
3. Enquiry management
4. Contact management

---

## 6. Summary Statistics

| Category | Count |
|----------|-------|
| Total routes (current) | 85+ |
| Public routes | 45+ |
| Client routes (current) | 4 |
| Admin routes | 28 |
| Agent routes | 18 |
| API routes | 20+ |
| **Client routes needed** | **45+** |
| **Routes to migrate** | **3** |
| **Routes to deprecate** | **0** (redirect only) |

---

**Next Document:** `CLIENT-PORTAL-FEATURE-MATRIX.md`
