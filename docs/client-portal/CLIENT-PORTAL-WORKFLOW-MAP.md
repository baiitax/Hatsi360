# Hatsi360 Premium Client Portal — Workflow Map

**Version:** 1.0  
**Date:** 2026-11-15  
**Auditor:** Arena Agent

---

## 1. Overview

This document maps the critical customer workflows that the Premium Client Portal must support. Each workflow is assessed for current implementation status and identifies gaps.

---

## 2. Core Customer Workflows

### 2.1 Journey A: New Premium Customer Onboarding

**Goal:** A new customer registers, completes onboarding, and reaches a useful personalised dashboard.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: New Customer Onboarding                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: REGISTRATION                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ User visits /register                                                 │   │
│  │ → Enters email, password, name                                       │   │
│  │ → Supabase creates auth.users record                                 │   │
│  │ → Trigger creates profiles record (role = 'customer')                │   │
│  │ → Verification email sent                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 2: EMAIL VERIFICATION                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ User clicks verification link                                        │   │
│  │ → Supabase confirms email                                            │   │
│  │ → Redirect to /auth/callback                                         │   │
│  │ → Auto-login                                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 3: ONBOARDING CHECK (MISSING)                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ Check if onboarding_completed_at is null                          │   │
│  │ ❌ If null, redirect to /client/onboarding                           │   │
│  │ ❌ Show onboarding wizard                                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 4: ONBOARDING WIZARD (MISSING)                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ Step 4a: Personal profile                                         │   │
│  │    - Full name, phone, country, language, timezone                   │   │
│  │                                                                       │   │
│  │ ❌ Step 4b: Business profile                                         │   │
│  │    - Individual or organisation                                      │   │
│  │    - Business name, category, operating region                       │   │
│  │    - Business role (buyer, seller, trader, processor)                │   │
│  │                                                                       │   │
│  │ ❌ Step 4c: Agricultural interests                                   │   │
│  │    - Select commodities of interest                                  │   │
│  │    - Select markets of interest                                      │   │
│  │    - Preferred regions                                               │   │
│  │                                                                       │   │
│  │ ❌ Step 4d: Workspace preferences                                    │   │
│  │    - Default currency                                                │   │
│  │    - Default units                                                   │   │
│  │    - Notification preferences                                        │   │
│  │                                                                       │   │
│  │ ❌ Step 4e: Subscription selection                                   │   │
│  │    - Show available plans                                            │   │
│  │    - Select plan or skip (free tier)                                 │   │
│  │    - If paid plan, enter payment (when configured)                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 5: PERSONALISED DASHBOARD (PARTIALLY IMPLEMENTED)                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Redirect to /client (currently /dashboard)                        │   │
│  │ ⚠️ Show personalised content based on interests                      │   │
│  │    - Currently: Basic KPIs only                                      │   │
│  │    - Needed: Market snapshot, watched items, recommendations         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STATUS: ⚠️ PARTIALLY IMPLEMENTATED                                          │
│  - Registration works                                                       │
│  - Email verification works                                                 │
│  - Onboarding flow MISSING                                                  │
│  - Personalised dashboard INCOMPLETE                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Journey B: Market Intelligence User

**Goal:** A customer opens a commodity, reviews prices, saves analysis, creates an alert.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Market Intelligence Exploration                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: DISCOVER COMMODITY                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ User visits /commodities or /trade                                │   │
│  │ ✅ Browses commodity directory                                       │   │
│  │ ✅ Selects commodity (e.g., Paddy Rice)                              │   │
│  │ → Navigates to /commodities/paddy-rice                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 2: REVIEW PRICE DATA                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Sees latest verified prices                                       │   │
│  │ ✅ Sees price history chart (candlestick or range)                   │   │
│  │ ✅ Sees market comparison                                            │   │
│  │ ✅ Can filter by market, price type, date range                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 3: SAVE COMMODITY (WATCHLIST)                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ User clicks "Save" or "Watch" button                              │   │
│  │ ✅ Inserts into saved_commodities table                              │   │
│  │ ✅ Confirmation shown                                                │   │
│  │ ⚠️ Cannot add to named watchlist (feature missing)                   │   │
│  │ ⚠️ Cannot add notes (feature missing)                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 4: CREATE PRICE ALERT                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ User navigates to /trade/alerts                                   │   │
│  │ ✅ Clicks "Create alert"                                             │   │
│  │ ✅ Selects commodity, direction (above/below), threshold             │   │
│  │ ✅ Inserts into price_alerts table                                   │   │
│  │ ✅ Confirmation shown                                                │   │
│  │ ⚠️ Cannot select notification channel (hardcoded)                    │   │
│  │ ⚠️ Cannot set percentage threshold (UI missing)                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 5: ALERT TRIGGER (MISSING)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ Background job evaluates alerts against new observations          │   │
│  │ ❌ Alert triggers when condition met                                 │   │
│  │ ❌ Notification created in notifications table                       │   │
│  │ ❌ Email sent (when configured)                                      │   │
│  │ ❌ Alert logged in alert_delivery_logs                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 6: RECEIVE NOTIFICATION (PARTIALLY IMPLEMENTED)                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Navbar shows unread count badge                                   │   │
│  │ ❌ No notification centre to view details                            │   │
│  │ ❌ Cannot mark as read (no UI)                                       │   │
│  │ ❌ Cannot navigate to related record                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STATUS: ⚠️ PARTIALLY IMPLEMENTATED                                          │
│  - Commodity discovery works                                                │
│  - Price review works                                                       │
│  - Save to watchlist works (basic)                                          │
│  - Create alert works (basic)                                               │
│  - Alert trigger detection MISSING                                          │
│  - Notification centre MISSING                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Journey C: Research Customer

**Goal:** A customer discovers, reads, and saves research reports.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Research Discovery & Access                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: DISCOVER RESEARCH                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ User visits /insights or /reports                                 │   │
│  │ ✅ Browses research library                                          │   │
│  │ ✅ Filters by category, date                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 2: OPEN REPORT                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Clicks report card                                                │   │
│  │ ✅ Navigates to /reports/[slug] or /insights/[slug]                  │   │
│  │ ⚠️ No entitlement check (all reports currently public)               │   │
│  │ ✅ Reads full report content                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 3: SAVE REPORT (MISSING)                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No "Save" button                                                  │   │
│  │ ❌ No saved_research table                                           │   │
│  │ ❌ Cannot access saved reports later                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 4: DOWNLOAD REPORT (MISSING)                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No download button                                                │   │
│  │ ❌ No PDF generation                                                 │   │
│  │ ❌ No download history tracking                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 5: SUBSCRIBE TO UPDATES (MISSING)                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No subscription option                                            │   │
│  │ ❌ report_subscriptions table exists but empty                       │   │
│  │ ❌ No notification when related research published                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STATUS: ⚠️ PARTIALLY IMPLEMENTATED                                          │
│  - Research discovery works                                                 │
│  - Report reading works                                                     │
│  - Save research MISSING                                                    │
│  - Download MISSING                                                         │
│  - Subscribe MISSING                                                        │
│  - Entitlement gating MISSING (all reports public)                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Journey D: Buyer (Trade Workflow)

**Goal:** A buyer discovers suppliers, submits an RFQ, receives quotations, makes a decision.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Buyer Procurement                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: DISCOVER OPPORTUNITY                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ User visits /trade/best-buy (sourcing intelligence)               │   │
│  │ ✅ Sees lowest verified prices by commodity                          │   │
│  │ ⚠️ Cannot see who is selling (no supplier discovery UI)              │   │
│  │ ⚠️ Cannot browse supplier profiles                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 2: CREATE RFQ (MISSING)                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No "Create RFQ" button                                            │   │
│  │ ❌ No rfqs table                                                     │   │
│  │ ❌ Cannot specify requirements                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 3: SUBMIT RFQ (MISSING)                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No submission workflow                                            │   │
│  │ ❌ No RFQ distribution to suppliers                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 4: RECEIVE QUOTATIONS (MISSING)                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No quotation inbox                                                │   │
│  │ ❌ No quotations table                                               │   │
│  │ ❌ Cannot compare quotations                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 5: MAKE DECISION (MISSING)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ Cannot accept quotation                                           │   │
│  │ ❌ Cannot reject quotation                                           │   │
│  │ ❌ Cannot request clarification                                      │   │
│  │ ❌ No decision tracking                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STATUS: ❌ NOT IMPLEMENTED                                                  │
│  - Sourcing discovery works (basic)                                         │
│  - RFQ workflow completely MISSING                                          │
│  - Quotation handling completely MISSING                                    │
│  - Decision tracking completely MISSING                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.5 Journey E: Supplier (Trade Workflow)

**Goal:** A supplier responds to RFQs, submits quotations, tracks status.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Supplier Response                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STATUS: ❌ NOT IMPLEMENTED                                                  │
│                                                                              │
│  All steps missing:                                                         │
│  - View relevant RFQs                                                       │
│  - Prepare quotation                                                        │
│  - Submit quotation                                                         │
│  - Track quotation status                                                   │
│  - Receive feedback                                                         │
│  - Manage offers (schema exists but no UI)                                  │
│                                                                              │
│  NOTE: seller_offers table exists with 15 demo records but no client UI     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.6 Journey F: Organisation Owner

**Goal:** An organisation owner manages team, reviews activity, monitors subscription.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Organisation Management                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: ACCESS WORKSPACE (MISSING)                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No business workspace UI                                          │   │
│  │ ❌ Cannot view company overview                                      │   │
│  │ ❌ Cannot see organisation activity                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 2: INVITE TEAM MEMBER (MISSING)                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No team management UI                                             │   │
│  │ ❌ Cannot send invitations                                           │   │
│  │ ❌ Cannot assign roles                                               │   │
│  │ ⚠️ organization_members table exists but admin-only access           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 3: REVIEW ACTIVITY (MISSING)                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No activity dashboard                                             │   │
│  │ ❌ Cannot view team procurement                                      │   │
│  │ ❌ Cannot view team sales                                            │   │
│  │ ❌ Cannot view relationships                                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 4: MANAGE SUBSCRIPTION (MISSING)                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No subscription overview                                          │   │
│  │ ❌ Cannot view seats usage                                           │   │
│  │ ❌ Cannot upgrade/downgrade                                          │   │
│  │ ⚠️ customer_subscriptions table exists but empty                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STATUS: ❌ NOT IMPLEMENTED                                                  │
│  - Organisation schema exists                                               │
│  - Membership schema exists                                                 │
│  - No client-facing workspace UI                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.7 Journey G: Restricted Entitlement

**Goal:** A customer attempts to access a restricted feature and receives appropriate feedback.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Entitlement Restriction                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: ATTEMPT ACCESS                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ User clicks "Watchlists" or "Alerts" or "Export"                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 2: CHECK ENTITLEMENT                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ hasEntitlement() returns false                                    │   │
│  │ ✅ user_entitlements() returns empty set                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 3: SHOW UPGRADE PROMPT                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Watchlist page shows "Watchlists require a subscription"          │   │
│  │ ✅ Alerts page shows "Price alerts require a subscription"           │   │
│  │ ✅ "View plans" button links to /pricing                             │   │
│  │ ⚠️ Message is generic, not personalised                              │   │
│  │ ⚠️ Cannot see which plan is needed                                   │   │
│  │ ⚠️ Cannot see current plan status                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 4: SERVER-SIDE ENFORCEMENT                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ RLS blocks unauthorized access                                    │   │
│  │ ✅ API returns 403 for unauthorized requests                         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STATUS: ⚠️ PARTIALLY IMPLEMENTATED                                          │
│  - Entitlement check works                                                  │
│  - Upgrade prompt shown                                                     │
│  - Server-side enforcement works                                            │
│  - Personalised messaging MISSING                                           │
│  - Plan comparison MISSING                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.8 Journey H: Customer Communication

**Goal:** A customer receives, views, and acts on notifications.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW: Notification Handling                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: EVENT OCCURS                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Limited event types trigger notifications                         │   │
│  │ ✅ Agent submissions → admin notifications                           │   │
│  │ ❌ Price alerts → no trigger mechanism                               │   │
│  │ ❌ Report publications → no trigger mechanism                        │   │
│  │ ❌ Commercial events → no trigger mechanism                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 2: NOTIFICATION CREATED                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ notifications table receives new row                              │   │
│  │ ⚠️ Only for operational events (agent/admin)                         │   │
│  │ ❌ Not for customer events                                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 3: DELIVERY ATTEMPT (PARTIALLY IMPLEMENTED)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ notification_delivery_logs records attempt                        │   │
│  │ ⚠️ Only in_app channel implemented                                   │   │
│  │ ❌ Email delivery not implemented                                    │   │
│  │ ❌ Push notifications not implemented                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  Step 4: CUSTOMER VIEWS NOTIFICATION (MISSING)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ❌ No notification centre UI                                         │   │
│  │ ⚠️ Navbar shows unread count                                         │   │
│  │ ❌ Cannot view notification list                                     │   │
│  │ ❌ Cannot mark as read                                               │   │
│  │ ❌ Cannot navigate to related record                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  STATUS: ⚠️ PARTIALLY IMPLEMENTATED                                          │
│  - Notification schema works                                                │
│  - Operational notifications work                                           │
│  - Customer notifications MISSING                                           │
│  - Notification centre MISSING                                              │
│  - Email/push delivery MISSING                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Workflow Priority Matrix

| Workflow | Business Value | Implementation Status | Priority |
|----------|----------------|----------------------|----------|
| A. Onboarding | High | ⚠️ Partial | P0 |
| B. Market Intelligence | High | ⚠️ Partial | P1 |
| C. Research Access | Medium | ⚠️ Partial | P2 |
| D. Buyer Procurement | High | ❌ Missing | P2 |
| E. Supplier Response | High | ❌ Missing | P2 |
| F. Organisation Management | Medium | ❌ Missing | P3 |
| G. Entitlement Restriction | Medium | ⚠️ Partial | P1 |
| H. Notification Handling | Medium | ⚠️ Partial | P1 |

---

## 4. Implementation Sequence

### Phase 1: Foundation (P0-P1)
1. Onboarding wizard
2. Notification centre
3. Entitlement messaging improvements

### Phase 2: Intelligence (P1-P2)
1. Enhanced watchlists (named lists, notes)
2. Alert lifecycle (trigger, delivery, history)
3. Research save/download

### Phase 3: Commerce (P2)
1. RFQ management
2. Quotation handling
3. Supplier/buyer discovery

### Phase 4: Workspace (P3)
1. Business workspace
2. Team management
3. Relationship management

---

**Next Document:** `CLIENT-PORTAL-UX-ISSUE-REGISTER.md`
