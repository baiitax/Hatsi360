# Hatsi360 Premium Client Portal — Data Architecture

**Version:** 1.0  
**Date:** 2026-11-15  
**Auditor:** Arena Agent

---

## 1. Current Database Schema (Client-Relevant)

### 1.1 Identity & Access

```
auth.users
├── id (uuid, PK)
├── email (text, unique)
├── encrypted_password (text)
├── email_confirmed_at (timestamptz)
├── raw_app_meta_data (jsonb)
├── created_at (timestamptz)
└── updated_at (timestamptz)

public.profiles
├── id (uuid, PK, FK → auth.users.id)
├── full_name (text)
├── phone (text)
├── organisation (text)
├── role (user_role enum)
├── locale (text)
├── timezone (text)
├── avatar_url (text)
├── is_active (boolean)
├── account_status (account_status enum)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### 1.2 Organisation & Membership

```
public.organizations
├── id (uuid, PK)
├── name (text)
├── slug (text, unique)
├── kind (text)  -- platform_operator, trader, producer, buyer, supplier
├── is_active (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)

public.organization_members
├── id (bigint, PK, identity)
├── organization_id (uuid, FK → organizations.id)
├── user_id (uuid, FK → profiles.id)
├── role_in_org (user_role enum)
└── created_at (timestamptz)
```

### 1.3 Saved Intelligence (Watchlists)

```
public.saved_commodities
├── id (bigint, PK, identity)
├── user_id (uuid, FK → profiles.id)
├── commodity_id (bigint, FK → commodities.id)
├── note (text)
├── created_at (timestamptz)
└── RLS: user_id = auth.uid()

public.saved_markets
├── id (bigint, PK, identity)
├── user_id (uuid, FK → profiles.id)
├── market_id (bigint, FK → markets.id)
├── note (text)
├── created_at (timestamptz)
└── RLS: user_id = auth.uid()
```

### 1.4 Price Alerts

```
public.price_alerts
├── id (bigint, PK, identity)
├── user_id (uuid, FK → profiles.id)
├── commodity_id (bigint, FK → commodities.id, nullable)
├── market_id (bigint, FK → markets.id, nullable)
├── direction (text)  -- above, below
├── threshold_amount (numeric, nullable)
├── threshold_percent (numeric, nullable)
├── channel (text)  -- in_app, email, sms
├── is_active (boolean)
├── last_triggered_at (timestamptz)
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── RLS: user_id = auth.uid()

public.alert_delivery_logs
├── id (bigint, PK, identity)
├── alert_id (bigint, FK → price_alerts.id)
├── channel (text)
├── status (text)  -- queued, sent, delivered, failed
├── price_observation_id (uuid, nullable)
├── triggered_at (timestamptz)
├── delivered_at (timestamptz)
└── error (text)
```

### 1.5 Subscriptions & Entitlements

```
public.entitlement_catalog
├── key (text, PK)  -- watchlists, alerts, exports, reports, api, bulk
├── label (text)
├── description (text)
└── sort_order (integer)

public.entitlement_tiers
├── id (text, PK)  -- public, professional, enterprise
├── label (text)
├── entitlements (jsonb)  -- {"watchlists": true, "alerts": true, ...}
└── sort_order (integer)

public.customer_subscriptions
├── id (bigint, PK, identity)
├── user_id (uuid, FK → profiles.id)
├── organization_id (uuid, FK → organizations.id, nullable)
├── plan (text)  -- professional, enterprise
├── status (text)  -- active, trialing, past_due, cancelled, expired
├── starts_at (timestamptz)
├── ends_at (timestamptz)
├── renews_at (timestamptz)
├── trial_ends_at (timestamptz)
├── entitlements (jsonb)  -- {"watchlists": true, "alerts": true, ...}
├── external_ref (text)  -- Stripe/Paystack subscription ID
├── created_at (timestamptz)
└── updated_at (timestamptz)

public.billing_events
├── id (bigint, PK, identity)
├── subscription_id (bigint, FK → customer_subscriptions.id)
├── event_type (text)  -- created, renewed, cancelled, refunded
├── amount (numeric)
├── currency (text)
├── description (text)
├── external_ref (text)
├── occurred_at (timestamptz)
└── created_at (timestamptz)
```

### 1.6 API Access

```
public.api_applications
├── id (uuid, PK)
├── user_id (uuid, FK → profiles.id)
├── organization_id (uuid, FK → organizations.id, nullable)
├── name (text)
├── key_hash (text)
├── key_prefix (text)
├── tier (text)  -- public, professional, enterprise
├── rate_limit (integer)
├── is_active (boolean)
├── last_used_at (timestamptz)
├── expires_at (timestamptz)
├── created_at (timestamptz)
└── updated_at (timestamptz)

public.api_usage_logs
├── id (bigint, PK, identity)
├── application_id (uuid, FK → api_applications.id)
├── endpoint (text)
├── method (text)
├── status_code (integer)
├── response_time_ms (integer)
├── ip_address (text)
├── user_agent (text)
├── created_at (timestamptz)
```

### 1.7 Notifications (Operational)

```
public.notifications
├── id (uuid, PK)
├── user_id (uuid, FK → profiles.id)
├── kind (notification_kind enum)
├── severity (operational_priority enum)
├── title (text)
├── body (text)
├── entity_type (text)
├── entity_id (text)
├── action_url (text)
├── metadata (jsonb)
├── read_at (timestamptz)
└── created_at (timestamptz)

public.notification_delivery_logs
├── id (bigint, PK, identity)
├── notification_id (uuid, FK → notifications.id)
├── channel (delivery_channel enum)  -- in_app, email, sms, whatsapp, push
├── status (delivery_status enum)  -- queued, sent, delivered, failed, skipped
├── provider (text)
├── provider_message_id (text)
├── attempt_count (integer)
├── error (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### 1.8 Commercial Offers

```
public.buyer_offers
├── id (uuid, PK)
├── user_id (uuid, FK → profiles.id)
├── organization_id (uuid, FK → organizations.id, nullable)
├── counterparty_name (text)
├── commodity_id (bigint, FK → commodities.id)
├── grade_id (bigint, FK → commodity_grades.id, nullable)
├── variety_id (bigint, nullable)
├── price_amount (numeric)
├── price_type (price_type enum)
├── unit_id (bigint, FK → measurement_units.id)
├── currency_code (text)
├── quantity_required (numeric)
├── quantity_unit_id (bigint)
├── market_id (bigint, FK → markets.id, nullable)
├── delivery_location (text)
├── delivery_terms (text)
├── valid_from (timestamptz)
├── valid_until (timestamptz)
├── quality_requirements (text)
├── notes (text)
├── status (offer_status enum)
├── verified_by (uuid, FK → profiles.id, nullable)
├── verified_at (timestamptz)
├── rejection_reason (text)
├── disclosure_consent (boolean)
├── created_by (uuid)
├── created_at (timestamptz)
└── updated_at (timestamptz)

public.seller_offers
├── (similar structure to buyer_offers)
├── quantity_available (numeric)  -- instead of quantity_required
├── warehouse_location (text)  -- instead of delivery_location
└── (same verification/tracking fields)

public.offer_verification_events
├── id (bigint, PK, identity)
├── offer_type (text)  -- buyer, seller
├── offer_id (uuid)
├── event_type (text)  -- submitted, verified, rejected, disclosed, withdrawn
├── actor_id (uuid, FK → profiles.id)
├── reason (text)
├── payload (jsonb)
└── created_at (timestamptz)
```

### 1.9 Report Subscriptions

```
public.report_subscriptions
├── id (bigint, PK, identity)
├── user_id (uuid, FK → profiles.id)
├── report_slug (text)
├── frequency (text)  -- daily, weekly, monthly
├── channel (text)  -- email, in_app
├── is_active (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### 1.10 Contact Enquiries

```
public.contact_enquiries
├── id (bigint, PK, identity)
├── name (text)
├── email (text)
├── organisation (text)
├── subject (text)
├── message (text)
├── status (text)  -- new, in_progress, resolved
├── assigned_to (uuid, FK → profiles.id, nullable)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

---

## 2. Missing Tables (Required for Client Portal)

### 2.1 User Preferences

```sql
CREATE TABLE public.user_preferences (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Display preferences
  default_currency text DEFAULT 'NGN',
  default_unit text DEFAULT '50kg_bag',
  theme text DEFAULT 'light',  -- light, dark, system
  -- Notification preferences
  email_alerts boolean DEFAULT true,
  push_alerts boolean DEFAULT false,
  market_updates boolean DEFAULT true,
  report_notifications boolean DEFAULT true,
  commercial_updates boolean DEFAULT true,
  -- Dashboard preferences
  dashboard_layout jsonb DEFAULT '{}'::jsonb,
  -- Onboarding
  onboarding_completed_at timestamptz,
  onboarding_step text,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```

### 2.2 Customer Activities (Timeline)

```sql
CREATE TABLE public.customer_activities (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  -- Activity details
  activity_type text NOT NULL,  -- saved_commodity, alert_created, report_viewed, rfq_submitted, etc.
  entity_type text,  -- commodity, market, alert, report, rfq, etc.
  entity_id text,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_activities_user ON customer_activities(user_id, created_at DESC);
CREATE INDEX idx_customer_activities_org ON customer_activities(organization_id, created_at DESC);
```

### 2.3 Named Watchlists

```sql
CREATE TABLE public.watchlists (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_commodities ADD COLUMN watchlist_id bigint REFERENCES watchlists(id) ON DELETE SET NULL;
ALTER TABLE saved_markets ADD COLUMN watchlist_id bigint REFERENCES watchlists(id) ON DELETE SET NULL;
```

### 2.4 RFQ Management

```sql
CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  -- RFQ details
  title text NOT NULL,
  description text,
  commodity_id bigint REFERENCES commodities(id),
  grade_id bigint REFERENCES commodity_grades(id),
  quantity_required numeric,
  quantity_unit_id bigint REFERENCES measurement_units(id),
  target_price numeric,
  currency_code text DEFAULT 'NGN',
  delivery_location text,
  delivery_date date,
  quality_requirements text,
  -- Status
  status text DEFAULT 'draft',  -- draft, submitted, active, closed, cancelled
  valid_until timestamptz,
  -- Responses
  response_count integer DEFAULT 0,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_user_id uuid NOT NULL REFERENCES profiles(id),
  supplier_organization_id uuid REFERENCES organizations(id),
  -- Quotation details
  price_offered numeric NOT NULL,
  currency_code text DEFAULT 'NGN',
  quantity_available numeric,
  delivery_location text,
  delivery_date date,
  validity_days integer,
  notes text,
  -- Status
  status text DEFAULT 'pending',  -- pending, accepted, rejected, withdrawn
  -- Review
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 2.5 Customer Enquiries & Conversations

```sql
CREATE TABLE public.customer_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Enquiry target
  target_type text,  -- supplier, buyer, support
  target_user_id uuid REFERENCES profiles(id),
  target_organization_id uuid REFERENCES organizations(id),
  -- Enquiry details
  subject text NOT NULL,
  message text NOT NULL,
  commodity_id bigint REFERENCES commodities(id),
  -- Status
  status text DEFAULT 'open',  -- open, in_progress, resolved, closed
  priority text DEFAULT 'normal',  -- low, normal, high, urgent
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES customer_enquiries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 2.6 Follow-ups

```sql
CREATE TABLE public.customer_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Linked entity
  entity_type text,  -- rfq, quotation, enquiry, supplier, customer
  entity_id uuid,
  -- Follow-up details
  title text NOT NULL,
  description text,
  due_date date,
  priority text DEFAULT 'normal',  -- low, normal, high, urgent
  status text DEFAULT 'pending',  -- pending, completed, cancelled, overdue
  completed_at timestamptz,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 2.7 Saved Analysis & Research

```sql
CREATE TABLE public.saved_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  -- Analysis parameters
  commodity_id bigint REFERENCES commodities(id),
  market_ids bigint[] DEFAULT '{}',
  price_type text,
  date_from date,
  date_to date,
  -- Results snapshot
  snapshot jsonb DEFAULT '{}'::jsonb,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.saved_research (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_slug text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE(user_id, report_slug)
);

CREATE TABLE public.report_access_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_slug text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
```

### 2.8 Business Relationships

```sql
CREATE TABLE public.business_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  -- Relationship target
  contact_name text NOT NULL,
  contact_email text,
  contact_phone text,
  company_name text,
  relationship_type text,  -- supplier, customer, partner
  commodity_interests bigint[] DEFAULT '{}',  -- commodity IDs
  -- Status
  status text DEFAULT 'active',  -- active, inactive, pending
  verification_status text DEFAULT 'unverified',  -- unverified, verified, rejected
  -- Notes
  notes text,
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 3. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT PORTAL                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────────────────┐     │
│  │   Dashboard  │────▶│  Saved Items │────▶│  Watchlists & Alerts     │     │
│  │              │     │              │     │                          │     │
│  │  - Snapshot  │     │  - Commodities│    │  - Price alerts          │     │
│  │  - Activity  │     │  - Markets   │     │  - Notification bridge   │     │
│  │  - Quick     │     │  - Analyses  │     │  - Delivery logs         │     │
│  │    actions   │     │  - Research  │     │                          │     │
│  └──────┬───────┘     └──────────────┘     └──────────────────────────┘     │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐     ┌──────────────┐     ┌──────────────────────────┐     │
│  │  Market      │────▶│   Trade      │────▶│  Business Workspace      │     │
│  │ Intelligence │     │  Workflows   │     │                          │     │
│  │              │     │              │     │  - Organisation          │     │
│  │  - Prices    │     │  - RFQs      │     │  - Relationships         │     │
│  │  - Charts    │     │  - Quotations│     │  - Follow-ups            │     │
│  │  - Research  │     │  - Enquiries │     │  - Documents             │     │
│  └──────────────┘     └──────────────┘     └──────────────────────────┘     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Account & Subscription                       │    │
│  │                                                                      │    │
│  │  - Profile & Preferences    - Subscription & Plans                  │    │
│  │  - Notification Settings    - Billing & Invoices                   │    │
│  │  - Security                 - Usage & Limits                       │    │
│  │  - API Keys                 - Team Management                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────┐    ┌───────────────────┐    ┌──────────────────┐    │
│  │  Published Data   │    │   User Data       │    │  Commercial Data │    │
│  │                   │    │                   │    │                  │    │
│  │  - Commodities    │    │  - Saved items    │    │  - RFQs          │    │
│  │  - Markets        │    │  - Watchlists     │    │  - Quotations    │    │
│  │  - Prices         │    │  - Alerts         │    │  - Enquiries     │    │
│  │  - Reports        │    │  - Preferences    │    │  - Relationships │    │
│  │  - Intelligence   │    │  - Activities     │    │  - Follow-ups    │    │
│  │                   │    │  - Subscriptions  │    │                  │    │
│  └───────────────────┘    └───────────────────┘    └──────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Entitlement Resolution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTITLEMENT RESOLUTION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. User authenticates                                                       │
│         │                                                                    │
│         ▼                                                                    │
│  2. Get user_id from session                                                 │
│         │                                                                    │
│         ▼                                                                    │
│  3. Query customer_subscriptions                                             │
│     WHERE user_id = auth.uid()                                               │
│     AND status IN ('active', 'trialing')                                     │
│     AND (starts_at IS NULL OR starts_at <= now())                            │
│     AND (ends_at IS NULL OR ends_at > now())                                 │
│     AND (trial_ends_at IS NULL OR trial_ends_at > now())                     │
│         │                                                                    │
│         ▼                                                                    │
│  4. Parse entitlements JSONB from matching subscriptions                     │
│         │                                                                    │
│         ▼                                                                    │
│  5. Return EntitlementSet { keys: Set<EntitlementKey>, tier, tierActive }    │
│         │                                                                    │
│         ▼                                                                    │
│  6. Check entitlements in UI (show/hide features)                            │
│  7. Enforce entitlements in RLS (block unauthorized access)                  │
│  8. Enforce entitlements in API (reject unauthorized requests)               │
│                                                                              │
│  CURRENT STATE: No subscriptions exist → all users have empty entitlements   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. RLS Policy Summary

| Table | Policy | Scope |
|-------|--------|-------|
| `profiles` | SELECT: own row | `id = auth.uid()` |
| `organizations` | SELECT: via membership | Via `organization_members` |
| `organization_members` | SELECT: own memberships | `user_id = auth.uid()` |
| `saved_commodities` | ALL: owner only | `user_id = auth.uid()` |
| `saved_markets` | ALL: owner only | `user_id = auth.uid()` |
| `price_alerts` | ALL: owner only | `user_id = auth.uid()` |
| `customer_subscriptions` | SELECT: own subscriptions | `user_id = auth.uid()` |
| `api_applications` | ALL: owner only | `user_id = auth.uid()` |
| `notifications` | SELECT: own notifications | `user_id = auth.uid()` |
| `buyer_offers` | SELECT: own or verified+disclosed | Complex policy |
| `seller_offers` | SELECT: own or verified+disclosed | Complex policy |

---

## 6. Migration Strategy

### Phase 1: Create Missing Tables (Non-Breaking)

All new tables are additive. No existing tables are modified except:
- `saved_commodities`: Add `watchlist_id` column (nullable)
- `saved_markets`: Add `watchlist_id` column (nullable)

### Phase 2: Backfill Default Watchlist

For existing users with saved items, create a default watchlist and link items.

### Phase 3: Add RLS Policies

New tables get RLS policies matching the existing pattern: owner-scoped.

### Phase 4: Update Application Code

Update queries and components to use new tables.

---

**Next Document:** `CLIENT-PORTAL-WORKFLOW-MAP.md`
