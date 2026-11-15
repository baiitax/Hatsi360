# Hatsi360 Premium Client Portal — Baseline Audit

**Version:** 1.0  
**Date:** 2026-11-15  
**Auditor:** Arena Agent  
**Project Ref:** umxzsdepbrenqysabtlt  
**Repository:** https://github.com/baiitax/Hatsi360_V2  
**Application:** https://hatsi360-app.vercel.app/

---

## 1. Executive Summary

The Hatsi360 platform currently operates **five distinct environments** within a single Next.js application:

| Environment | Route Prefix | Purpose | Status |
|-------------|--------------|---------|--------|
| Public Website | `(site)` | Marketing, public market data, pricing | ✅ Active |
| Premium Client Portal | `(site)` mixed | Authenticated customer workspace | ⚠️ Fragmented |
| Agent Portal | `/agent/*` | Field collection and submission | ✅ Active |
| Admin Portal | `/admin/*` | Platform administration | ✅ Active |
| Intelligence | `/intelligence/*` | Commodity intelligence (FAOSTAT) | ✅ Active |

### Critical Finding: No Dedicated Client Portal

**The Premium Client Portal does not exist as a distinct architectural entity.** Client-facing authenticated pages are scattered across the `(site)` route group, mixed with public pages. There is no:

- Dedicated client portal route group (e.g., `(client)`)
- Client-specific layout with sidebar navigation
- Unified client dashboard
- Client onboarding flow
- Account/settings management pages
- Notification centre
- Business workspace

The `(site)` route group serves both anonymous public visitors AND authenticated premium customers through the same layout, navigation, and design system.

---

## 2. Route Architecture Analysis

### 2.1 Current Route Groups

```
src/app/
├── (portal)/                    # Auth pages (login, register, reset)
├── (site)/                      # PUBLIC + CLIENT mixed
│   ├── page.tsx                 # Homepage (public)
│   ├── dashboard/page.tsx       # Client workspace (auth)
│   ├── trade/                   # Trade intelligence (public + auth)
│   │   ├── page.tsx             # Overview (public)
│   │   ├── terminal/page.tsx    # Terminal (public)
│   │   ├── watchlist/page.tsx   # Watchlist (auth + entitlement)
│   │   ├── alerts/page.tsx      # Alerts (auth + entitlement)
│   │   ├── best-buy/page.tsx    # Sourcing (public)
│   │   ├── best-sell/page.tsx   # Procurement (public)
│   │   └── fundamentals/page.tsx
│   ├── commodities/             # Commodity directory (public)
│   ├── markets/                 # Market directory (public)
│   ├── prices/                  # Price explorer (public)
│   ├── charts/                  # Chart workspace (public)
│   ├── compare/                 # Market comparison (public)
│   ├── reports/                 # Reports (public)
│   ├── insights/                # Research briefs (public)
│   ├── pricing/                 # Plans (public)
│   ├── api-docs/                # API docs (public)
│   └── [legal pages]            # Privacy, terms, cookies, etc.
├── admin/                       # ADMIN PORTAL (25+ pages)
├── agent/                       # AGENT PORTAL (15+ pages)
├── intelligence/                # Commodity intelligence
└── api/                         # API routes
```

### 2.2 Architectural Problems

1. **No separation of concerns**: Public and authenticated client pages share the same layout
2. **No client navigation**: No sidebar, no client-specific menu structure
3. **No onboarding**: New premium customers land on `/dashboard` with no guidance
4. **No account management**: No profile settings, preferences, or subscription management pages
5. **No notification centre**: Notifications exist in DB but no customer-facing UI
6. **No business workspace**: No organisation context, team management, or commercial workflows
7. **Entitlement gating is page-level**: Users see "upgrade" prompts instead of graceful access

---

## 3. Database Schema Analysis

### 3.1 Client-Relevant Tables

| Table | Records | Purpose | UI Status |
|-------|---------|---------|-----------|
| `profiles` | 10 | User profiles | ✅ Used in dashboard |
| `organizations` | 5 | Organisation registry | ❌ No client UI |
| `organization_members` | 7 | Membership | ❌ No client UI |
| `saved_commodities` | 6 | Watchlist (commodities) | ✅ Basic UI in watchlist |
| `saved_markets` | 3 | Watchlist (markets) | ✅ Basic UI in watchlist |
| `price_alerts` | 4 | Price alerts | ✅ Basic UI in alerts |
| `alert_delivery_logs` | 0 | Alert delivery | ❌ No client UI |
| `customer_subscriptions` | 0 | Subscriptions | ❌ No client UI |
| `entitlement_catalog` | 6 | Entitlement keys | ✅ Used server-side |
| `entitlement_tiers` | 3 | Plan tiers | ✅ Used in pricing |
| `report_subscriptions` | 0 | Report subscriptions | ❌ No UI at all |
| `api_applications` | 0 | API keys | ❌ No client UI |
| `api_usage_logs` | 0 | API metering | ❌ No client UI |
| `notifications` | 79 | Notifications (ops) | ❌ No client centre |
| `notification_delivery_logs` | 68 | Delivery tracking | ❌ No client UI |
| `buyer_offers` | 15 | Procurement offers | ❌ No client UI |
| `seller_offers` | 15 | Supply offers | ❌ No client UI |
| `offer_verification_events` | 69 | Verification audit | ❌ No client UI |
| `contact_enquiries` | 0 | Contact form | ❌ Public only |
| `billing_events` | 0 | Billing history | ❌ No client UI |

### 3.2 Key Observations

1. **Subscriptions table is empty**: No customer has an active subscription → all premium features show upgrade prompts
2. **Commercial tables have fixture data**: buyer_offers and seller_offers have 15 records each (likely demo data)
3. **Notifications are operational, not customer-facing**: The 79 notifications are for agents/admins, not customers
4. **No RFQ/quotation tables**: The spec mentions RFQ workflows but no tables exist
5. **No conversation/messaging tables**: No direct messaging between customers
6. **No follow-up/task tables for customers**: No customer activity tracking

### 3.3 Missing Tables (Per Specification)

| Required Feature | Table Needed | Status |
|------------------|--------------|--------|
| RFQ management | `rfqs` | ❌ Missing |
| Quotations | `quotations` | ❌ Missing |
| Customer enquiries | `enquiries` | ❌ Missing |
| Customer conversations | `conversations`, `messages` | ❌ Missing |
| Follow-ups | `customer_follow_ups` | ❌ Missing |
| Activity timeline | `customer_activities` | ❌ Missing |
| User preferences | `user_preferences` | ❌ Missing |
| Onboarding state | `onboarding_progress` | ❌ Missing |
| Document storage | `customer_documents` | ❌ Missing |

---

## 4. Authentication & Authorization

### 4.1 Auth Flow

```
User → /login → Supabase Auth → /auth/callback → Redirect based on role
                                                      │
                                                      ├── agent → /agent/home
                                                      ├── admin/verifier → /admin/overview
                                                      └── customer/public → /dashboard
```

### 4.2 Role System

From `src/lib/auth/guards.ts`:

```typescript
export async function requireStaff(returnTo = '/admin') { ... }
export async function requireAgent(returnTo = '/agent/home') { ... }
```

**Roles defined:**
- `public_user` — Anonymous visitor
- `customer` — Premium customer (registered)
- `agent` — Field agent
- `verification_officer` — Admin verifier
- `market_supervisor` — Admin operations
- `analyst` — Admin analyst
- `admin` — Administrator
- `super_admin` — Super administrator

### 4.3 Entitlement System

From `src/lib/entitlements.ts`:

```typescript
export type EntitlementKey =
  | 'watchlists'
  | 'alerts'
  | 'exports'
  | 'reports'
  | 'api'
  | 'bulk';
```

**How entitlements are resolved:**
1. Query `customer_subscriptions` for active/trialing subscriptions
2. Parse `entitlements` JSONB column
3. Check subscription validity (dates, status)
4. Return entitlement keys

**Current state:** No subscriptions exist → all customers are effectively `public` tier → premium features show upgrade prompts.

### 4.4 RLS Policies

The database has Row Level Security enabled. Key policies:

- `saved_commodities`: Owner-scoped (user can only see their own)
- `saved_markets`: Owner-scoped
- `price_alerts`: Owner-scoped
- `notifications`: Owner-scoped (for operations notifications)

---

## 5. Component Architecture

### 5.1 Shared Components

| Component | Location | Used By |
|-----------|----------|---------|
| `Navbar` | `src/components/homepage/Navbar.tsx` | Public site, client pages |
| `AdminShell` | `src/components/admin/AdminShell.tsx` | Admin portal |
| `AgentLayout` | `src/app/agent/layout.tsx` | Agent portal |
| `PageHero` | `src/components/ui/PageHero.tsx` | Public pages |
| `TerminalShell` | `src/components/terminal/TerminalShell.tsx` | Trade pages |
| `CandleChart` | `src/components/trade/CandleChart.tsx` | Terminal, charts |

### 5.2 Missing Client Components

- ❌ Client sidebar navigation
- ❌ Client header with user menu
- ❌ Notification bell/centre
- ❌ Onboarding wizard
- ❌ Account settings form
- ❌ Subscription management card
- ❌ Watchlist manager (beyond basic save)
- ❌ Alert builder UI
- ❌ Business workspace layout

---

## 6. Design System

### 6.1 Brand Tokens

From `src/lib/brand.ts`:

```typescript
// Forest Green palette
#103C2D  // Forest Green (primary)
#0B2A20  // Deep Green
#1D805A  // Primary Green
#EAF4EE  // Light Green

// Accent
#C7A45A  // Gold

// Neutral
#17241F  // Charcoal
#64736B  // Slate
#F7F9F7  // Background
#FFFFFF  // Surface
#E3EAE5  // Border

// Semantic
#16C784  // Positive
#EA654F  // Negative
```

### 6.2 Current Implementation

- ✅ Design tokens defined
- ✅ Tailwind v4 configured
- ✅ Light theme for public site
- ✅ Dark terminal theme for trade pages
- ❌ No dedicated client portal theme
- ❌ Inconsistent use of terminal vs light theme

---

## 7. Feature Status Summary

### 7.1 Implemented (Verified in Code + DB)

| Feature | Location | Status |
|---------|----------|--------|
| User authentication | Supabase Auth | ✅ Working |
| User profiles | `profiles` table | ✅ Working |
| Organisation registry | `organizations` table | ✅ Working |
| Organisation membership | `organization_members` | ✅ Working |
| Save commodities | `saved_commodities` | ✅ Basic |
| Save markets | `saved_markets` | ✅ Basic |
| Price alerts | `price_alerts` | ✅ Basic |
| Entitlement resolution | Server-side | ✅ Working |
| Role-based routing | Auth guards | ✅ Working |
| Public market data | `(site)` routes | ✅ Working |
| Trade terminal | `/trade/terminal` | ✅ Working |
| Price charts | `/charts` | ✅ Working |
| Commodity directory | `/commodities` | ✅ Working |
| Market directory | `/markets` | ✅ Working |
| Reports (static) | `/reports` | ✅ Working |
| Research insights | `/insights` | ✅ Working |
| API documentation | `/api-docs` | ✅ Working |
| Agent portal | `/agent/*` | ✅ Working |
| Admin portal | `/admin/*` | ✅ Working |
| Buyer offers | `buyer_offers` | ✅ Schema only |
| Seller offers | `seller_offers` | ✅ Schema only |

### 7.2 Partially Implemented

| Feature | What Exists | What's Missing |
|---------|-------------|----------------|
| Dashboard | Basic KPIs, saved items | Personalisation, market snapshot, activity |
| Watchlist | Save/unsave commodities | Named lists, notes, alerts, sharing |
| Alerts | Basic threshold alerts | Lifecycle, channels, preferences, history |
| Notifications | Ops notifications for staff | Customer notification centre |
| Subscriptions | Schema + entitlement resolver | No subscriptions exist, no UI |

### 7.3 Not Implemented (But Schema Exists)

| Feature | Table | Status |
|---------|-------|--------|
| API applications | `api_applications` | No client UI |
| Report subscriptions | `report_subscriptions` | No UI at all |
| Billing events | `billing_events` | No UI at all |
| Alert delivery logs | `alert_delivery_logs` | No client visibility |

### 7.4 Not Implemented (No Schema)

| Feature | Required For |
|---------|--------------|
| RFQ management | Trade workflow |
| Quotations | Trade workflow |
| Customer enquiries | Communication |
| Conversations/messaging | Communication |
| Follow-ups | Business workspace |
| Activity timeline | Customer experience |
| User preferences | Personalisation |
| Onboarding flow | New customer experience |
| Document management | Business workspace |
| Global search | Navigation |

---

## 8. Customer Journey Analysis

### 8.1 Current Journey (Broken)

```
1. User registers → /register
2. User verifies email → Supabase
3. User logs in → /login
4. Auth callback redirects → /dashboard
5. Dashboard shows:
   - "Sign in to your workspace" (if not authenticated)
   - Basic KPIs (if authenticated)
   - Links to watchlist, alerts, API docs
6. Premium features show "Upgrade required" because no subscriptions exist
```

### 8.2 Expected Journey (Per Specification)

```
1. User registers → /register
2. User verifies email → Supabase
3. User logs in → /login
4. Check onboarding status → /client/onboarding (if incomplete)
5. Complete onboarding:
   - Personal profile
   - Business profile
   - Agricultural interests
   - Workspace preferences
   - Subscription selection
6. Land on personalised dashboard → /client
7. Dashboard shows:
   - Welcome message with user name
   - Market snapshot (based on interests)
   - Watched commodities/markets
   - Recent alerts
   - Relevant reports
   - Subscription status
   - Recommended actions
```

---

## 9. Security & Privacy Assessment

### 9.1 Current State

| Concern | Status | Notes |
|---------|--------|-------|
| RLS enabled | ✅ | All client tables protected |
| Owner-scoped queries | ✅ | saved_commodities, saved_markets, price_alerts |
| Server-side auth checks | ✅ | `requireStaff`, `requireAgent` guards |
| Entitlement checks | ✅ | Server-side resolution |
| No service role exposure | ✅ | Only in server components |
| Tenant isolation | ✅ | Organisation-scoped where implemented |

### 9.2 Gaps

| Gap | Risk | Remediation |
|-----|------|-------------|
| No client notification RLS | Medium | Notifications exist for ops, not customers |
| No customer activity tracking | Low | No table to secure |
| No preference storage | Low | No table to secure |
| Buyer/seller offers visible | Medium | Check RLS policies |

---

## 10. Performance Considerations

### 10.1 Current State

- ✅ Static generation for public pages
- ✅ Server components for data fetching
- ✅ Incremental static regeneration where appropriate
- ✅ No excessive client-side JavaScript

### 10.2 Potential Issues

| Concern | Impact | Mitigation |
|---------|--------|------------|
| Dashboard queries | Medium | Optimise with proper indexes |
| Watchlist loading | Low | Pagination if large lists |
| Alert evaluation | High | Background job, not request-time |
| Notification centre | Medium | Pagination, lazy loading |

---

## 11. Recommendations

### 11.1 Immediate Priorities (Stage 2)

1. **Create dedicated client portal route group**: `(client)` with its own layout
2. **Build client sidebar navigation**: Organised by information architecture
3. **Implement client dashboard**: Personalised, data-driven, actionable
4. **Create account settings pages**: Profile, preferences, security
5. **Build subscription management UI**: Even if no subscriptions exist yet

### 11.2 Short-term (Stages 3-5)

1. **Enhanced watchlist management**: Named lists, notes, organisation
2. **Alert builder with lifecycle**: Create, edit, pause, history
3. **Notification centre**: Unified, filterable, actionable
4. **Onboarding wizard**: Progressive, skip-able, resumable
5. **Market intelligence enhancements**: Commodity profiles, saved analysis

### 11.3 Medium-term (Stages 6-9)

1. **Trade workflow**: RFQ, quotations, enquiries
2. **Business workspace**: Organisation context, team, relationships
3. **Research library**: Entitlement-aware, searchable
4. **AI Analyst integration**: Context-aware, evidence-backed
5. **Activity timeline**: Connected events, follow-ups

### 11.4 Long-term (Stages 10-12)

1. **Billing integration**: When payment provider configured
2. **Advanced analytics**: Custom reports, exports
3. **API management**: Client-facing key management
4. **Global search**: Cross-entity discovery
5. **Mobile optimisation**: Responsive refinement

---

## 12. Conclusion

The Hatsi360 platform has a **strong foundation** with:

- ✅ Robust authentication and authorization
- ✅ Well-designed entitlement system
- ✅ Comprehensive database schema for core features
- ✅ Working public market data experience
- ✅ Functional agent and admin portals

However, the **Premium Client Portal is fragmented and incomplete**:

- ❌ No dedicated architecture
- ❌ No unified navigation
- ❌ No onboarding experience
- ❌ No account management
- ❌ No business workspace
- ❌ No notification centre
- ❌ No commercial workflows

The transformation requires:

1. **Architectural restructuring**: Create dedicated `(client)` route group
2. **New components**: Sidebar, dashboard, settings, notification centre
3. **Database additions**: Preferences, activities, RFQs, conversations
4. **UX transformation**: From terminal-inspired to enterprise workspace

The good news: The underlying systems (auth, entitlements, RLS, data) are solid. The work is primarily **presentation and integration**, not foundational rebuild.

---

**Next Document:** `CLIENT-PORTAL-ROUTE-INVENTORY.md`
