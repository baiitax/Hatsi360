# Phase 08 — Implementation Plan

**Date:** 2026-11-14  
**Status:** STAGE 1 COMPLETE — PROPOSED  
**Duration:** 14 stages, approximately 16-20 weeks  
**Key Principle:** Extend existing entitlement infrastructure (Migration 0016), do not replace it

---

## Overview

Phase 08 transforms Hatsi360 into a commercially sustainable SaaS platform by building a unified commercial architecture. The implementation is divided into 14 stages, each building on the previous.

**Critical Finding:** A functional entitlement engine already exists (Migration 0016). All stages must extend this infrastructure, not replace it.

---

## Stage Summary

| Stage | Name | Duration | Dependencies | Risk |
|-------|------|----------|--------------|------|
| 1 | Audit & Architecture | ✅ Complete | None | Low |
| 2 | Commercial Product Catalog | 1 week | Stage 1 | Low |
| 3 | Unified Entitlement Engine | 1.5 weeks | Stage 2 | Medium |
| 4 | Usage Metering | 2 weeks | Stage 3 | Medium |
| 5 | Subscription Lifecycle | 1.5 weeks | Stage 3 | Medium |
| 6 | Payment Provider Integration | 2 weeks | Stage 5 | High |
| 7 | Invoices & Billing | 1.5 weeks | Stage 6 | Medium |
| 8 | Pricing & Checkout | 1 week | Stage 6, 7 | Low |
| 9 | Organisation Billing | 1.5 weeks | Stage 5, 6 | Medium |
| 10 | Platform-Wide Migration | 2 weeks | Stage 3 | High |
| 11 | API & Export Governance | 1 week | Stage 4, 10 | Medium |
| 12 | Commercial Administration | 1 week | Stage 7 | Low |
| 13 | Revenue Analytics | 1 week | Stage 7, 12 | Low |
| 14 | Production Hardening | 1 week | All | Medium |

---

## Detailed Stage Plans

### Stage 1 — Audit & Architecture ✅ COMPLETE

**Duration:** 1 day  
**Status:** ✅ Complete  
**Deliverables:** 10 audit documents (this plan + 9 others)

**Completed:**
- ✅ Baseline audit of all phases
- ✅ Entitlement inventory
- ✅ Capability mapping
- ✅ Gap analysis
- ✅ Security review
- ✅ Implementation plan

**Gate:** Present audit findings and get approval to proceed.

---

### Stage 2 — Commercial Product Catalog

**Duration:** 1 week  
**Dependencies:** Stage 1  
**Risk:** Low

**Objective:** Build configurable product catalog (products, plans, pricing, features)

**Database Changes:**
```sql
-- Commercial products (what we sell)
CREATE TABLE commercial_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  target_segment text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Commercial plans (how we package products)
CREATE TABLE commercial_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  product_id uuid REFERENCES commercial_products(id),
  name text NOT NULL,
  description text,
  billing_interval text CHECK (billing_interval IN ('free','monthly','annual')),
  is_active boolean DEFAULT true,
  is_available boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Plan pricing
CREATE TABLE commercial_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES commercial_plans(id),
  currency text NOT NULL,
  amount_minor bigint NOT NULL, -- e.g. 5000 = ₦50.00
  billing_interval text NOT NULL,
  is_active boolean DEFAULT true
);

-- Plan feature entitlements
CREATE TABLE plan_feature_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES commercial_plans(id),
  entitlement_key text NOT NULL,
  is_included boolean DEFAULT true,
  UNIQUE(plan_id, entitlement_key)
);

-- Plan usage limits
CREATE TABLE plan_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES commercial_plans(id),
  metric_key text NOT NULL,
  limit_value bigint, -- null = unlimited
  period text, -- 'monthly', 'annual', null
  UNIQUE(plan_id, metric_key)
);
```

**Service Layer:**
- `src/lib/commerce/catalog.ts` — Product/plan/price queries
- `src/lib/commerce/plans.ts` — Plan configuration management
- `src/app/api/v1/commerce/plans/route.ts` — Public plan API

**Admin UI:**
- `/admin/commerce/products` — Product catalog management
- `/admin/commerce/plans` — Plan configuration
- `/admin/commerce/pricing` — Pricing management

**Seed Data:**
- 4 products: Market Intelligence, Commodity Intelligence, Trade Intelligence, Data & API
- 6 plans: Public, Starter, Professional, Business, Enterprise, API
- Pricing: NGN and USD for each paid plan
- Entitlements: Map each plan to entitlement keys

**Tests:**
- Plan configuration CRUD
- Pricing calculation
- Entitlement mapping
- Plan availability

**Deliverables:**
- 5 new database tables
- Service layer (3 modules)
- Admin UI (3 pages)
- API endpoint
- Seed data
- Tests

---

### Stage 3 — Unified Entitlement Engine Enhancement

**Duration:** 1.5 weeks  
**Dependencies:** Stage 2  
**Risk:** Medium

**Objective:** Extend existing entitlement engine to support organization subscriptions, add-ons, and new entitlement keys

**Database Changes:**
```sql
-- Extend entitlement_catalog with new keys
INSERT INTO entitlement_catalog (key, label, description) VALUES
  ('market.historical_data', 'Extended price history', 'Access historical price data beyond 30 days'),
  ('market.advanced_analytics', 'Advanced market analytics', 'Comparison tools and advanced charts'),
  ('commodity.grade_comparison', 'Grade comparison', 'Commodity grade analysis tools'),
  ('commodity.seasonal_analysis', 'Seasonal analysis', 'Seasonal pattern analysis'),
  ('commodity.advanced_intelligence', 'Advanced intelligence', 'Extended commodity profiles'),
  ('marketplace.publish_listing', 'Publish listings', 'Create marketplace listings'),
  ('marketplace.create_rfq', 'Create RFQs', 'Request for quotation'),
  ('workspace.create', 'Create workspace', 'Create organization workspace'),
  ('workspace.team_members', 'Team members', 'Invite team members'),
  ('ai.basic_queries', 'AI queries', 'Basic AI analyst queries'),
  ('ai.advanced_analysis', 'Advanced AI', 'Advanced AI analysis'),
  ('ai.report_generation', 'AI reports', 'AI-generated reports'),
  ('global_trade.country_profiles', 'Country profiles', 'Trade country analysis'),
  ('global_trade.advanced_analytics', 'Trade analytics', 'Advanced trade analytics'),
  ('global_trade.market_access', 'Market access', 'Tariff and market access research'),
  ('global_trade.export_readiness', 'Export readiness', 'Export readiness tools');

-- Organization-level subscriptions
CREATE TABLE organization_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  plan_id uuid REFERENCES commercial_plans(id),
  status text CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  trial_ends_at timestamptz,
  seat_allowance integer DEFAULT 1,
  seats_used integer DEFAULT 0,
  entitlements jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Subscription add-ons
CREATE TABLE subscription_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid, -- references either customer_subscriptions or organization_subscriptions
  subscription_type text CHECK (subscription_type IN ('individual','organization')),
  addon_code text NOT NULL,
  quantity integer DEFAULT 1,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enterprise contracts
CREATE TABLE enterprise_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  contract_reference text UNIQUE,
  status text CHECK (status IN ('draft','active','expired','terminated')),
  starts_at timestamptz,
  ends_at timestamptz,
  custom_entitlements jsonb DEFAULT '{}',
  custom_limits jsonb DEFAULT '{}',
  seat_allowance integer,
  api_allowance bigint,
  contract_value_minor bigint,
  currency text,
  created_at timestamptz DEFAULT now()
);
```

**Service Layer Enhancements:**
- Extend `src/lib/entitlements.ts`:
  - `resolveEntitlements(userId, organizationId?)` — Include org subscriptions
  - `checkEntitlement(capability, context)` — Unified check with reason codes
  - `getEntitlementDecision(capability, context)` — Full decision with audit trail
- New `src/lib/entitlements/resolver.ts` — Entitlement resolution engine
- New `src/lib/entitlements/organization.ts` — Organization entitlement support

**Entitlement Resolution Logic:**
```
1. Check public access (no subscription required)
2. Check individual subscription entitlements
3. Check organization subscription entitlements (if user is member)
4. Check enterprise contract entitlements
5. Check add-on entitlements
6. Check usage limits (if applicable)
7. Return decision with reason
```

**Tests:**
- Individual subscription entitlements
- Organization subscription entitlements
- Enterprise contract entitlements
- Add-on entitlements
- Entitlement precedence
- Usage limit enforcement
- Expired subscription handling
- Organization membership checks

**Deliverables:**
- 16 new entitlement keys
- 3 new database tables
- Enhanced entitlement resolver
- Organization entitlement support
- Add-on support
- Enterprise contract support
- Comprehensive tests

---

### Stage 4 — Usage Metering Engine

**Duration:** 2 weeks  
**Dependencies:** Stage 3  
**Risk:** Medium

**Objective:** Build reusable usage metering system for AI, API, exports, and other billable operations

**Database Changes:**
```sql
-- Usage metric definitions
CREATE TABLE usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  unit text NOT NULL, -- 'query', 'token', 'request', 'record', 'byte'
  is_billable boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Usage events (immutable log)
CREATE TABLE usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('user','organization')),
  subject_id uuid NOT NULL,
  user_id uuid, -- the specific user, if applicable
  metric_code text NOT NULL REFERENCES usage_metrics(code),
  quantity bigint NOT NULL CHECK (quantity > 0),
  source text NOT NULL, -- e.g. 'ai_analyst', 'api_v1', 'export_csv'
  resource_ref text, -- e.g. report_id, export_id
  idempotency_key text UNIQUE, -- prevent duplicate recording
  event_at timestamptz DEFAULT now(),
  billing_period text, -- e.g. '2026-11'
  metadata jsonb DEFAULT '{}'
);

-- Usage aggregations (for dashboards)
CREATE TABLE usage_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  metric_code text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_quantity bigint NOT NULL DEFAULT 0,
  event_count integer NOT NULL DEFAULT 0,
  UNIQUE(subject_type, subject_id, metric_code, period_start)
);

-- Usage quotas (allowances per period)
CREATE TABLE usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  metric_code text NOT NULL,
  quota_limit bigint, -- null = unlimited
  period text NOT NULL, -- 'monthly', 'annual'
  period_start date NOT NULL,
  period_end date NOT NULL,
  consumed bigint DEFAULT 0,
  UNIQUE(subject_type, subject_id, metric_code, period_start)
);

-- Usage reservations (for expensive operations)
CREATE TABLE usage_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  metric_code text NOT NULL,
  quantity bigint NOT NULL,
  status text CHECK (status IN ('reserved','consumed','released','expired')),
  reserved_at timestamptz DEFAULT now(),
  consumed_at timestamptz,
  expires_at timestamptz
);

-- Seed usage metrics
INSERT INTO usage_metrics (code, name, unit, is_billable) VALUES
  ('ai.queries', 'AI queries', 'query', true),
  ('ai.tokens', 'AI tokens', 'token', true),
  ('api.requests', 'API requests', 'request', false),
  ('exports.records', 'Exported records', 'record', true),
  ('exports.jobs', 'Export jobs', 'job', false),
  ('reports.generated', 'Reports generated', 'report', false),
  ('storage.bytes', 'Storage used', 'byte', false);
```

**Service Layer:**
- `src/lib/usage/meter.ts` — Core metering service
  - `recordUsage(event)` — Idempotent event recording
  - `checkQuota(subject, metric)` — Check remaining allowance
  - `consumeQuota(subject, metric, quantity)` — Atomic consumption
  - `reserveQuota(subject, metric, quantity)` — Reserve for expensive ops
- `src/lib/usage/aggregation.ts` — Period aggregation
- `src/lib/usage/dashboard.ts` — Usage dashboard data
- `src/app/api/v1/usage/current/route.ts` — Current usage API

**Key Features:**
- Idempotent event recording (prevent duplicates)
- Atomic quota consumption (prevent race conditions)
- Period management (monthly/annual resets)
- Usage reservations (for expensive operations)
- Background aggregation (eventual consistency for dashboards)
- Usage corrections (audit trail for adjustments)

**Tests:**
- Idempotent recording
- Concurrent consumption
- Period resets
- Quota enforcement
- Reservation lifecycle
- Aggregation accuracy
- Cross-tenant isolation

**Deliverables:**
- 5 new database tables
- 4 service modules
- 1 API endpoint
- Background job for aggregation
- Comprehensive tests

---

### Stage 5 — Subscription Lifecycle

**Duration:** 1.5 weeks  
**Dependencies:** Stage 3  
**Risk:** Medium

**Objective:** Implement complete subscription lifecycle management (create, activate, upgrade, downgrade, renew, cancel, expire)

**Service Layer:**
- `src/lib/subscriptions/lifecycle.ts`
  - `createSubscription(params)` — Create new subscription
  - `activateSubscription(id)` — Activate after payment
  - `upgradeSubscription(id, newPlanId)` — Upgrade plan
  - `downgradeSubscription(id, newPlanId)` — Downgrade plan
  - `renewSubscription(id)` — Renew at period end
  - `cancelSubscription(id, reason)` — Cancel subscription
  - `expireSubscription(id)` — Mark as expired
- `src/lib/subscriptions/state-machine.ts` — State transition validation
- `src/lib/subscriptions/trials.ts` — Trial management

**State Machine:**
```
INCOMPLETE → TRIALING → ACTIVE → PAST_DUE → CANCELED
                              ↓           ↓
                           EXPIRED    CANCELED
```

**Database Changes:**
```sql
-- Subscription state change log
CREATE TABLE subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  subscription_type text NOT NULL,
  event_type text NOT NULL, -- 'created','activated','upgraded','downgraded','renewed','canceled','expired','past_due'
  from_status text,
  to_status text,
  from_plan_id uuid,
  to_plan_id uuid,
  reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

**Tests:**
- Subscription creation
- State transitions
- Upgrade/downgrade logic
- Trial handling
- Cancellation flows
- Expiration handling

**Deliverables:**
- 1 new database table
- 3 service modules
- State machine
- Trial management
- Comprehensive tests

---

### Stage 6 — Payment Provider Integration

**Duration:** 2 weeks  
**Dependencies:** Stage 5  
**Risk:** High

**Objective:** Integrate payment provider (recommended: Paystack for Nigerian market) with provider-agnostic abstraction

**Provider Evaluation:**

| Provider | Nigerian Support | NGN | Recurring | Webhooks | API Quality | Recommendation |
|----------|-----------------|-----|-----------|----------|-------------|----------------|
| Paystack | ✅ Excellent | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Good | **RECOMMENDED** |
| Flutterwave | ✅ Good | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Good | Good alternative |
| Stripe | ⚠️ Limited | ❌ No | ✅ Yes | ✅ Yes | ✅ Excellent | International only |

**Database Changes:**
```sql
-- Payment provider configuration
CREATE TABLE payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL, -- 'paystack', 'flutterwave', 'stripe'
  name text NOT NULL,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}', -- encrypted credentials
  supported_currencies text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Payment transactions
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES payment_providers(id),
  subscription_id uuid,
  subscription_type text,
  amount_minor bigint NOT NULL,
  currency text NOT NULL,
  status text CHECK (status IN ('pending','processing','succeeded','failed','refunded')),
  provider_reference text,
  idempotency_key text UNIQUE,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Webhook event log
CREATE TABLE payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES payment_providers(id),
  event_type text NOT NULL,
  event_id text UNIQUE, -- provider's event ID for idempotency
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**Service Layer:**
- `src/lib/payments/provider.ts` — Provider abstraction interface
- `src/lib/payments/paystack.ts` — Paystack implementation
- `src/lib/payments/webhooks.ts` — Webhook processing
- `src/lib/payments/verification.ts` — Payment verification
- `src/app/api/webhooks/paystack/route.ts` — Paystack webhook handler
- `src/app/api/v1/checkout/session/route.ts` — Checkout session creation

**Security:**
- Webhook signature verification
- Idempotent webhook processing
- Server-side payment verification
- Encrypted provider credentials
- No card data storage (PCI compliance)

**Tests:**
- Payment creation
- Webhook processing
- Signature verification
- Duplicate prevention
- Failed payment handling
- Refund processing

**Deliverables:**
- 3 new database tables
- 5 service modules
- 2 API endpoints (webhook, checkout)
- Paystack integration
- Security hardening
- Comprehensive tests

---

### Stages 7-14 — Summary

**Stage 7 — Invoices & Billing (1.5 weeks):**
- Invoice generation
- Payment history
- Receipts
- Refund workflows
- Billing notifications

**Stage 8 — Pricing & Checkout (1 week):**
- Public pricing page (enhance existing)
- Plan comparison
- Checkout flow
- Upgrade/downgrade UI

**Stage 9 — Organisation Billing (1.5 weeks):**
- Organization billing dashboard
- Team seat management
- Billing roles
- Shared usage
- Enterprise agreements

**Stage 10 — Platform-Wide Migration (2 weeks):**
- Migrate Phase 01-07 features to central entitlements
- Add upgrade prompts
- Test each phase thoroughly
- Remove old access logic

**Stage 11 — API & Export Governance (1 week):**
- API subscription controls
- API key management
- Request metering
- Export quotas

**Stage 12 — Commercial Administration (1 week):**
- Admin commerce dashboard
- Plan management
- Customer management
- Subscription management

**Stage 13 — Revenue Analytics (1 week):**
- MRR/ARR calculation
- Churn tracking
- Revenue reporting
- Customer analytics

**Stage 14 — Production Hardening (1 week):**
- Security review
- Performance optimization
- Load testing
- Documentation
- Final testing

---

## Risk Mitigation

### High-Risk Items

1. **Payment Provider Integration (Stage 6)**
   - Risk: Provider may not support all features
   - Mitigation: Build abstraction layer, test thoroughly in sandbox
   - Fallback: Switch to alternative provider

2. **Platform-Wide Migration (Stage 10)**
   - Risk: Breaking existing access
   - Mitigation: Migrate one phase at a time, test thoroughly
   - Fallback: Keep old access logic as fallback

3. **Usage Metering Performance (Stage 4)**
   - Risk: High-volume metering impacts database
   - Mitigation: Background aggregation, efficient queries
   - Fallback: Reduce metering granularity

### Testing Strategy

- **Unit tests:** All service functions
- **Integration tests:** Database operations
- **E2E tests:** Checkout flow, subscription lifecycle
- **Security tests:** Tenant isolation, RLS
- **Performance tests:** Load testing for metering
- **Regression tests:** All existing tests still pass

---

## Success Criteria

Phase 08 is complete when:

1. ✅ One central entitlement decision service governs all access
2. ✅ Configurable product catalog with plans and pricing
3. ✅ Usage metering for AI, API, exports
4. ✅ Subscription lifecycle (create, activate, upgrade, cancel)
5. ✅ Payment provider integrated and verified
6. ✅ Invoices and billing operational
7. ✅ Organization billing with team seats
8. ✅ All Phase 01-07 features migrated to central entitlements
9. ✅ API and export governance enforced
10. ✅ Commercial administration console functional
11. ✅ Revenue analytics operational
12. ✅ All tests passing, security verified

---

**Plan Status:** ✅ PROPOSED  
**Approval Required:** Yes  
**Next Step:** Complete remaining audit documents, present to user for approval
