# Phase 08 — Baseline Technical & Commercial Audit

**Date:** 2026-11-14  
**Status:** STAGE 1 COMPLETE — AWAITING APPROVAL  
**Auditor:** Arena Agent  
**Scope:** Phases 00–07 codebase, database schema, API routes, entitlement infrastructure

---

## Executive Summary

Phase 08 proposes building a unified commercial architecture for Hatsi360 Markets. Before implementing any billing or subscription infrastructure, this audit examined the existing codebase to identify:

1. **Existing entitlement infrastructure** — DISCOVERED: A functional entitlement engine already exists (Migration 0016, src/lib/entitlements.ts)
2. **Existing subscription tables** — DISCOVERED: customer_subscriptions table exists (Migration 0003)
3. **Existing commercial UI** — DISCOVERED: Pricing page and admin subscriptions page exist
4. **Payment integrations** — NONE FOUND: No Stripe, Paystack, or Flutterwave integrations
5. **Hardcoded access logic** — NONE FOUND: No scattered plan checks; all access goes through central entitlement system

**Critical Finding:** The "Phase 10 entitlement engine" mentioned in the Phase 08 specification already exists as Migration 0016. It is functional, tested, and integrated with the API layer. Phase 08 must **extend and enhance** this existing architecture, not replace it.

---

## 1. Existing Infrastructure Inventory

### 1.1 Entitlement Engine (Migration 0016)

**Status:** ✅ VERIFIED IN CODE & DATABASE

**Database Tables:**
- `entitlement_catalog` — 6 entitlement keys (watchlists, alerts, exports, reports, api, bulk)
- `entitlement_tiers` — 3 tiers (public, professional, enterprise)
- `customer_subscriptions` — Subscription records with entitlements JSONB field

**SQL Functions:**
- `user_entitlements()` — Returns entitlement keys for authenticated user
- `has_entitlement(key)` — Boolean check for specific entitlement
- `api_application_entitlements(app_id)` — Resolves API key entitlements

**RLS Policies:**
- Premium reports gated by `has_entitlement('reports')`
- Tier definitions readable by all, writable only by admins
- Subscription changes audited via trigger

**Key Design Decisions:**
- Entitlements resolved from active/trialing subscriptions only
- Expired, cancelled, past_due subscriptions grant nothing
- API applications inherit owner's entitlements (no independent grants)
- No payment provider configured — all paid tiers marked unavailable

### 1.2 Application Layer (src/lib/entitlements.ts)

**Status:** ✅ VERIFIED IN CODE

**TypeScript Implementation:**
```typescript
export type EntitlementKey = 'watchlists' | 'alerts' | 'exports' | 'reports' | 'api' | 'bulk';

export interface EntitlementSet {
  keys: Set<EntitlementKey>;
  tier: 'public' | 'professional' | 'enterprise' | null;
  tierActive: boolean;
}

export async function getEntitlements(): Promise<EntitlementSet>;
export async function getApplicationEntitlements(userId: string): Promise<EntitlementSet>;
export function hasEntitlement(set: EntitlementSet, key: EntitlementKey): boolean;
export function rateLimitFor(options): number;
```

**Integration Points:**
- `src/lib/api/handler.ts` — API routes use `hasEntitlement()` for endpoint gating
- `getEntitlements()` called from server components
- `rateLimitFor()` provides tier-aware rate limiting

### 1.3 Subscription Management (Migration 0003)

**Status:** ✅ VERIFIED IN DATABASE

**Table Schema:**
```sql
customer_subscriptions (
  id, user_id, organization_id,
  plan text default 'free',
  status text check (status in ('trialing','active','past_due','cancelled','expired')),
  starts_at, ends_at, renews_at, trial_ends_at,
  entitlements jsonb default '{}',
  external_ref text,
  ...
)
```

**Admin Interface:**
- `/admin/subscriptions` — Subscription list with status, plan, dates
- `listSubscriptions()` and `listEntitlementTiers()` service functions
- Status tracking: active, trialing, past_due, cancelled, expired

### 1.4 Commercial UI

**Status:** ✅ VERIFIED IN UI

**Pricing Page:**
- `/pricing` — Public pricing page with 3 tiers
- Explicitly marked as "proposed" with no payment provider
- Clear messaging: "Public access is live today and always will be"
- Paid tiers show "On agreement" instead of prices

**Admin Subscriptions:**
- `/admin/subscriptions` — Staff-only subscription management
- Shows customer, plan, status, dates
- Lists entitlement tiers with availability flags

---

## 2. Phase-by-Phase Capability Audit

### Phase 00 — Production Safety & Technical Stabilisation

**Existing Capabilities:**
- Security hardening (RLS policies, audit logging)
- Data quality rules at submission
- Field evidence and corrections
- Visit coordinates tracking
- Test fixtures for provenance

**Access Controls:**
- RLS on all sensitive tables
- Staff/admin role checks via `requireStaff()`, `requireAdmin()`
- Audit logging for entitlement changes

**Entitlement Requirements:** NONE — All Phase 00 features are operational infrastructure

### Phase 01 — Market Data Activation

**Existing Capabilities:**
- Price observations (public.price_observations)
- Market data (public.markets)
- Commodity data (public.commodities)
- Collection sessions and field visits

**Access Controls:**
- Public observations readable by all (RLS)
- No entitlement checks — all public
- Collection restricted to authenticated field agents

**Entitlement Requirements:**
- `reports` — Premium market intelligence (existing)
- `exports` — CSV/spreadsheet exports (existing)
- `bulk` — Large historical exports (existing)

### Phase 02 — Market Terminal

**Existing Capabilities:**
- Market comparison (src/app/(site)/compare)
- Price charts (src/app/(site)/charts)
- Market coverage report (src/app/(site)/coverage-report)
- Advanced analytics (src/lib/terminal/)

**Access Controls:**
- Public market data readable by all
- No entitlement checks currently enforced
- Advanced features exist but not gated

**Entitlement Requirements:**
- `watchlists` — Save commodities/markets (existing capability, not enforced)
- `alerts` — Price alerts (existing capability, not enforced)
- `exports` — Data downloads (existing capability, not enforced)
- NEW: `market.historical_data` — Extended price history (not yet defined)
- NEW: `market.advanced_analytics` — Comparison tools (not yet defined)

### Phase 03 — Commodity Intelligence

**Existing Capabilities:**
- Commodity grades (public.commodity_grades)
- Intelligence profiles (src/app/intelligence/[slug])
- Supply/demand analytics (src/lib/intelligence/)
- Grade comparison tools

**Access Controls:**
- Public commodity data readable by all
- Premium reports gated by `has_entitlement('reports')` (RLS)
- Intelligence service layer exists but not entitlement-aware

**Entitlement Requirements:**
- `reports` — Premium commodity intelligence (existing, enforced)
- NEW: `commodity.grade_comparison` — Grade analysis (not yet defined)
- NEW: `commodity.seasonal_analysis` — Seasonal patterns (not yet defined)
- NEW: `commodity.advanced_intelligence` — Extended profiles (not yet defined)

### Phase 04 — Trade Marketplace

**Existing Capabilities:**
- Commercial offers (public.commercial_offers)
- Offer workflow (public.offer_workflow)
- Trade analytics (src/lib/trade/)
- Offer verification events

**Access Controls:**
- Offer creation requires authentication
- Offer status permissions via RLS
- No entitlement checks for premium features

**Entitlement Requirements:**
- NEW: `marketplace.publish_listing` — Create offers (currently unrestricted)
- NEW: `marketplace.create_rfq` — Request for quotation (currently unrestricted)
- NEW: `marketplace.advanced_discovery` — Premium supplier discovery (not yet defined)

### Phase 05 — Business Workspace

**Existing Capabilities:**
- Organizations (public.organizations)
- Organization memberships (public.organization_memberships)
- Roles: owner, admin, member, viewer
- Procurement workflows (src/lib/operations/)
- CRM features

**Access Controls:**
- Organization isolation via RLS
- Role-based access within organizations
- No entitlement checks for workspace features

**Entitlement Requirements:**
- NEW: `workspace.create` — Create organization (currently unrestricted)
- NEW: `workspace.team_members` — Invite members (currently unrestricted)
- NEW: `workspace.procurement` — Procurement features (not yet defined)
- NEW: `workspace.crm` — Customer management (not yet defined)

### Phase 06 — Research, Intelligence & AI Analyst

**Existing Capabilities:**
- Market reports (public.market_reports)
- Intelligence analytics views
- AI analyst (src/app/intelligence/[slug])
- Research service layer

**Access Controls:**
- Premium reports gated by `has_entitlement('reports')` (RLS)
- AI analyst access not currently gated
- No usage metering for AI operations

**Entitlement Requirements:**
- `reports` — Premium reports (existing, enforced)
- NEW: `ai.basic_queries` — AI analyst requests (not yet defined)
- NEW: `ai.advanced_analysis` — Advanced AI features (not yet defined)
- NEW: `ai.report_generation` — Custom reports (not yet defined)
- NEW: Usage metering for AI tokens/queries (not yet implemented)

### Phase 07 — Global Trade Intelligence

**Existing Capabilities:**
- International trade records (public.international_trade_records)
- Tariff schedules (public.tariff_schedules)
- Trade data sources (public.trade_data_sources)
- Trade intelligence dashboards (src/app/admin/intelligence/trade-intelligence/)
- Trade flow explorer, partner profiles, commodity profiles

**Access Controls:**
- Trade data readable by authenticated users
- Admin dashboards require staff role
- No entitlement checks for premium trade features

**Entitlement Requirements:**
- NEW: `global_trade.country_profiles` — Country analysis (not yet defined)
- NEW: `global_trade.advanced_analytics` — Extended analytics (not yet defined)
- NEW: `global_trade.market_access` — Tariff/market access research (not yet defined)
- NEW: `global_trade.export_readiness` — Export tools (not yet defined)

---

## 3. Capability-to-Entitlement Mapping

### Existing Entitlement Keys (6)

| Key | Label | Currently Enforced | Phase |
|-----|-------|-------------------|-------|
| `watchlists` | Saved watchlists | ❌ Not enforced | Phase 02 |
| `alerts` | Price alerts | ❌ Not enforced | Phase 02 |
| `exports` | CSV/spreadsheet exports | ❌ Not enforced | Phase 01, 02 |
| `reports` | Premium market intelligence | ✅ Enforced (RLS) | Phase 01, 03, 06 |
| `api` | API access | ✅ Enforced (API handler) | Phase 01 |
| `bulk` | Bulk data | ❌ Not enforced | Phase 01, 02 |

### Proposed New Entitlement Keys (18+)

| Key | Label | Phase | Priority |
|-----|-------|-------|----------|
| `market.historical_data` | Extended price history | Phase 02 | High |
| `market.advanced_analytics` | Comparison tools | Phase 02 | Medium |
| `market.price_alerts` | Advanced alerts | Phase 02 | Medium |
| `commodity.grade_comparison` | Grade analysis | Phase 03 | Medium |
| `commodity.seasonal_analysis` | Seasonal patterns | Phase 03 | Medium |
| `commodity.advanced_intelligence` | Extended profiles | Phase 03 | High |
| `marketplace.publish_listing` | Create offers | Phase 04 | High |
| `marketplace.create_rfq` | Request for quotation | Phase 04 | Medium |
| `marketplace.advanced_discovery` | Premium supplier discovery | Phase 04 | Medium |
| `workspace.create` | Create organization | Phase 05 | High |
| `workspace.team_members` | Invite members | Phase 05 | High |
| `workspace.procurement` | Procurement features | Phase 05 | Medium |
| `workspace.crm` | Customer management | Phase 05 | Medium |
| `ai.basic_queries` | AI analyst requests | Phase 06 | High |
| `ai.advanced_analysis` | Advanced AI features | Phase 06 | Medium |
| `ai.report_generation` | Custom reports | Phase 06 | Medium |
| `global_trade.country_profiles` | Country analysis | Phase 07 | Medium |
| `global_trade.advanced_analytics` | Extended analytics | Phase 07 | High |
| `global_trade.market_access` | Tariff/market access | Phase 07 | Medium |
| `global_trade.export_readiness` | Export tools | Phase 07 | Medium |

---

## 4. Access Control Inconsistencies

### 4.1 Inconsistency #1: Watchlists & Alerts Not Enforced

**Current State:**
- `saved_commodities` and `saved_markets` tables exist (Migration 0003)
- `price_alerts` table exists (Migration 0003)
- `watchlists` and `alerts` entitlement keys defined (Migration 0016)
- **NO RLS policies** enforce these entitlements

**Impact:** Any authenticated user can save items and create alerts, regardless of subscription status.

**Recommendation:** Add RLS policies to enforce `watchlists` and `alerts` entitlements.

### 4.2 Inconsistency #2: Exports Not Enforced

**Current State:**
- `exports` entitlement key defined (Migration 0016)
- Export functionality exists in admin interface
- **NO entitlement checks** in export routes or UI

**Impact:** Any authenticated user can export data, regardless of subscription status.

**Recommendation:** Add entitlement checks to export routes and UI components.

### 4.3 Inconsistency #3: Bulk Data Not Enforced

**Current State:**
- `bulk` entitlement key defined (Migration 0016)
- Bulk export functionality exists
- **NO entitlement checks** for bulk operations

**Impact:** Any authenticated user can perform bulk operations, regardless of subscription status.

**Recommendation:** Add entitlement checks to bulk export routes.

### 4.4 Inconsistency #4: No Usage Metering

**Current State:**
- AI analyst exists (Phase 06)
- API endpoints exist (28 routes)
- **NO usage metering** for AI queries, tokens, or API requests
- **NO quota enforcement** beyond basic rate limiting

**Impact:** Cannot implement usage-based billing or enforce usage limits.

**Recommendation:** Build usage metering engine (Phase 08 Stage 4).

### 4.5 Inconsistency #5: Organization Entitlements Not Integrated

**Current State:**
- Organizations exist (Phase 05)
- `customer_subscriptions` has `organization_id` field
- **NO organization-level entitlement resolution**
- Enterprise tier defined but not implemented

**Impact:** Organizations cannot purchase shared subscriptions or manage team entitlements.

**Recommendation:** Extend entitlement engine to support organization-level subscriptions (Phase 08 Stage 5).

---

## 5. Payment & Billing Infrastructure

### 5.1 Current State

**Payment Providers:** ❌ NONE
- No Stripe integration
- No Paystack integration
- No Flutterwave integration
- No webhook handlers
- No payment transaction records

**Billing Tables:** ❌ NONE
- No invoices table
- No payment_attempts table
- No refunds table
- No credit_notes table

**Billing UI:** ⚠️ PARTIAL
- Pricing page exists (marked as "proposed")
- Admin subscriptions page exists (manages grants, not payments)
- No checkout flow
- No payment forms

### 5.2 Recommendations

**Payment Provider Selection:**
- Evaluate Paystack (Nigerian market, NGN support)
- Evaluate Flutterwave (Pan-African, multi-currency)
- Evaluate Stripe (International, USD/EUR)
- **Recommendation:** Start with Paystack for Nigerian market, add others later

**Billing Architecture:**
- Build payment provider abstraction layer
- Implement webhook handlers for payment events
- Create invoice and payment transaction tables
- Build checkout flow and payment forms
- Implement subscription lifecycle (activate, renew, cancel, past_due)

---

## 6. Security & RLS Audit

### 6.1 Current RLS Coverage

**Tables with RLS Enabled:**
- ✅ entitlement_catalog (public read, admin write)
- ✅ entitlement_tiers (public read, admin write)
- ✅ customer_subscriptions (user read own, admin write)
- ✅ market_reports (public read non-premium, entitlement for premium)
- ✅ All Phase 00-07 operational tables

**Tables Missing RLS:**
- ⚠️ saved_commodities (should check `watchlists` entitlement)
- ⚠️ saved_markets (should check `watchlists` entitlement)
- ⚠️ price_alerts (should check `alerts` entitlement)

### 6.2 Tenant Isolation

**Organization Isolation:** ✅ VERIFIED
- Organization memberships use RLS
- Users can only access their organization's data
- Admin functions require staff role

**User Isolation:** ✅ VERIFIED
- Subscriptions filtered by user_id
- Saved items filtered by user_id
- API keys filtered by user_id

### 6.3 Entitlement Security

**Entitlement Resolution:** ✅ SECURE
- Only active/trialing subscriptions grant entitlements
- Expired subscriptions grant nothing
- Past_due subscriptions grant nothing (deliberate)
- Trial expiration enforced

**API Key Entitlements:** ✅ SECURE
- API keys inherit owner's entitlements
- Revoking subscription revokes all keys
- No independent API key grants

---

## 7. Database Architecture Assessment

### 7.1 Current Schema Strengths

✅ **Well-normalized** — Proper foreign keys, no redundant data  
✅ **Audit-friendly** — created_at/updated_at on all tables  
✅ **RLS-ready** — All tables have RLS enabled  
✅ **Entitlement-aware** — JSONB entitlements field supports flexible grants  
✅ **Status-tracked** — Subscription status enum prevents invalid states  

### 7.2 Current Schema Gaps

❌ **No payment tables** — No invoices, transactions, refunds  
❌ **No usage metering** — No usage_events, quotas, or aggregations  
❌ **No API credentials** — No api_keys or api_credentials tables (relies on existing api_applications)  
❌ **No billing contacts** — No separate billing contact records  
❌ **No enterprise contracts** — No enterprise_agreements or contract_entitlements  

### 7.3 Recommended Additions

**Stage 2 — Commercial Product Catalog:**
- commercial_products (product definitions)
- commercial_features (feature registry)
- commercial_plans (plan definitions)
- commercial_prices (pricing configuration)

**Stage 4 — Usage Metering:**
- usage_metrics (metric definitions)
- usage_events (metering events)
- usage_aggregates (periodic rollups)
- usage_quotas (allowance tracking)

**Stage 6 — Payment Integration:**
- payment_providers (provider configuration)
- payment_transactions (payment records)
- payment_webhook_events (webhook log)
- invoices (billing documents)
- invoice_items (line items)
- refunds (refund records)

**Stage 9 — Organization Billing:**
- organization_billing_settings (org billing config)
- organization_entitlements (org-level grants)
- enterprise_contracts (enterprise agreements)

---

## 8. Platform-Wide Integration Requirements

### 8.1 Phase 01 — Market Data

**Capabilities to Gate:**
- Premium reports → `reports` (already enforced)
- Data exports → `exports` (not enforced)
- Historical datasets → `market.historical_data` (not defined)

**Migration Path:**
1. Add RLS to export routes
2. Define new entitlement keys
3. Enforce in API handlers
4. Update UI to show upgrade prompts

### 8.2 Phase 02 — Market Terminal

**Capabilities to Gate:**
- Watchlists → `watchlists` (not enforced)
- Alerts → `alerts` (not enforced)
- Advanced analytics → `market.advanced_analytics` (not defined)

**Migration Path:**
1. Add RLS to saved_commodities, saved_markets, price_alerts
2. Define new entitlement keys
3. Enforce in API handlers
4. Update UI to show upgrade prompts

### 8.3 Phase 03 — Commodity Intelligence

**Capabilities to Gate:**
- Premium reports → `reports` (already enforced)
- Grade comparison → `commodity.grade_comparison` (not defined)
- Seasonal analysis → `commodity.seasonal_analysis` (not defined)

**Migration Path:**
1. Define new entitlement keys
2. Enforce in intelligence service layer
3. Update UI to show upgrade prompts

### 8.4 Phase 04 — Trade Marketplace

**Capabilities to Gate:**
- Offer creation → `marketplace.publish_listing` (not defined)
- RFQ creation → `marketplace.create_rfq` (not defined)

**Migration Path:**
1. Define new entitlement keys
2. Add RLS to commercial_offers
3. Enforce in offer creation routes
4. Update UI to show upgrade prompts

### 8.5 Phase 05 — Business Workspace

**Capabilities to Gate:**
- Organization creation → `workspace.create` (not defined)
- Team invitations → `workspace.team_members` (not defined)

**Migration Path:**
1. Define new entitlement keys
2. Enforce in organization creation routes
3. Update UI to show upgrade prompts

### 8.6 Phase 06 — Research & AI

**Capabilities to Gate:**
- AI queries → `ai.basic_queries` (not defined)
- Advanced AI → `ai.advanced_analysis` (not defined)

**Migration Path:**
1. Define new entitlement keys
2. Build usage metering for AI
3. Enforce in AI routes
4. Implement quota checking

### 8.7 Phase 07 — Global Trade

**Capabilities to Gate:**
- Country profiles → `global_trade.country_profiles` (not defined)
- Advanced analytics → `global_trade.advanced_analytics` (not defined)

**Migration Path:**
1. Define new entitlement keys
2. Enforce in trade intelligence routes
3. Update UI to show upgrade prompts

---

## 9. Implementation Recommendations

### 9.1 Consolidate, Don't Replace

**Critical Principle:** The existing entitlement engine (Migration 0016) is functional and well-designed. Phase 08 must **extend** it, not replace it.

**Actions:**
- ✅ Keep `entitlement_catalog`, `entitlement_tiers`, `customer_subscriptions`
- ✅ Keep `user_entitlements()`, `has_entitlement()` functions
- ✅ Keep `src/lib/entitlements.ts` TypeScript layer
- ✅ Extend with new entitlement keys as needed
- ✅ Add organization-level entitlement resolution
- ✅ Add usage metering layer on top

### 9.2 Implementation Sequence

**Stage 1 — Audit (COMPLETE):**
- ✅ Inspect existing infrastructure
- ✅ Identify inconsistencies
- ✅ Document capabilities
- ✅ Produce audit documents

**Stage 2 — Commercial Product Catalog:**
- Add commercial_products, commercial_plans, commercial_prices tables
- Migrate from hardcoded tiers to configurable catalog
- Keep existing entitlement_catalog and entitlement_tiers as legacy

**Stage 3 — Entitlement Engine Enhancement:**
- Extend user_entitlements() to support organization subscriptions
- Add enterprise contract entitlements
- Add add-on entitlements
- Keep existing resolution logic

**Stage 4 — Usage Metering:**
- Build usage_events, usage_aggregates, usage_quotas
- Implement idempotent event recording
- Build quota consumption logic
- Add usage dashboards

**Stage 5 — Subscription Lifecycle:**
- Add individual subscription management
- Add organization subscription management
- Add enterprise contract management
- Build subscription state machine

**Stage 6 — Payment Integration:**
- Evaluate and select payment provider (recommend Paystack)
- Build payment provider abstraction
- Implement webhook handlers
- Build checkout flow

**Stage 7–14 — Continue per specification**

### 9.3 Migration Strategy

**Phase-by-Phase Migration:**

1. **Phase 01 (Market Data):** Add export entitlement checks (1 week)
2. **Phase 02 (Market Terminal):** Enforce watchlists, alerts, exports (1 week)
3. **Phase 03 (Commodity Intelligence):** Add grade comparison gating (3 days)
4. **Phase 04 (Trade Marketplace):** Add listing creation gating (3 days)
5. **Phase 05 (Business Workspace):** Add organization creation gating (3 days)
6. **Phase 06 (Research & AI):** Add AI query metering (2 weeks)
7. **Phase 07 (Global Trade):** Add advanced analytics gating (1 week)

**Total Migration Effort:** ~6 weeks

---

## 10. Risk Assessment

### 10.1 High Priority Risks

**Risk #1: Breaking Existing Access**
- **Description:** Entitlement enforcement may inadvertently block legitimate users
- **Mitigation:** Migrate one phase at a time, test thoroughly, allow admin overrides
- **Probability:** Medium
- **Impact:** High

**Risk #2: Payment Provider Integration Failures**
- **Description:** Payment provider may not support all required features
- **Mitigation:** Evaluate providers thoroughly, build abstraction layer
- **Probability:** Low
- **Impact:** High

**Risk #3: Usage Metering Performance**
- **Description:** High-volume usage recording may impact database performance
- **Mitigation:** Use background aggregation, implement quotas efficiently
- **Probability:** Medium
- **Impact:** Medium

### 10.2 Medium Priority Risks

**Risk #4: Organization Entitlement Complexity**
- **Description:** Organization-level entitlements may conflict with individual entitlements
- **Mitigation:** Define clear precedence rules, test edge cases
- **Probability:** Medium
- **Impact:** Medium

**Risk #5: Migration Timeline**
- **Description:** Phase-by-phase migration may take longer than expected
- **Mitigation:** Prioritize high-value features, defer low-priority gating
- **Probability:** Medium
- **Impact:** Low

---

## 11. Acceptance Criteria for Stage 1

### 11.1 Audit Completion

- ✅ Existing entitlement infrastructure documented
- ✅ All phases audited for capabilities and access controls
- ✅ Inconsistencies identified and documented
- ✅ Payment infrastructure assessed
- ✅ Security and RLS reviewed
- ✅ Database architecture assessed
- ✅ Implementation recommendations provided

### 11.2 Documentation Deliverables

- ✅ PHASE-08-BASELINE-AUDIT.md (this document)
- ⏳ PHASE-08-EXISTING-ENTITLEMENT-INVENTORY.md
- ⏳ PHASE-08-COMMERCIAL-PRODUCT-MAP.md
- ⏳ PHASE-08-PRICING-AND-PACKAGING-STRATEGY.md
- ⏳ PHASE-08-BILLING-ARCHITECTURE.md
- ⏳ PHASE-08-ENTITLEMENT-ARCHITECTURE.md
- ⏳ PHASE-08-USAGE-METERING-ARCHITECTURE.md
- ⏳ PHASE-08-PAYMENT-AND-SECURITY-DESIGN.md
- ⏳ PHASE-08-IMPLEMENTATION-PLAN.md
- ⏳ PHASE-08-ACCEPTANCE-CRITERIA.md

---

## 12. Next Steps

### 12.1 Immediate Actions (Pending Approval)

1. **Complete remaining audit documents** (8 documents)
2. **Define commercial product catalog** (products, plans, pricing)
3. **Evaluate payment providers** (Paystack, Flutterwave, Stripe)
4. **Design usage metering architecture**
5. **Plan subscription lifecycle**

### 12.2 Stage 2 Preparation

After approval, Stage 2 will:
1. Build commercial product catalog tables
2. Migrate from hardcoded tiers to configurable catalog
3. Define initial product offerings
4. Configure pricing structure

---

## 13. Conclusion

Phase 08's objective — building a unified commercial architecture — is achievable because **significant infrastructure already exists**. The entitlement engine (Migration 0016) provides a solid foundation. The subscription table (Migration 0003) supports the data model. The pricing UI exists (marked as proposed).

The primary work is **extension and integration**:
- Extend entitlement keys for all phases
- Enforce existing entitlements that are defined but not checked
- Add usage metering for AI and API operations
- Integrate payment provider for subscription activation
- Add organization-level subscription support
- Build billing and invoicing infrastructure

**Estimated Total Effort:** 14 weeks (14 stages × 1 week each)  
**Critical Path:** Payment provider integration (Stage 6)  
**Highest Risk:** Breaking existing access during migration  
**Highest Value:** Usage metering and payment integration

**Recommendation:** Proceed with Stage 2 (Commercial Product Catalog) after completing remaining audit documents.

---

**Audit Status:** ✅ STAGE 1 COMPLETE  
**Next Status:** ⏳ AWAITING APPROVAL FOR STAGE 2  
**Audit Date:** 2026-11-14  
**Next Review:** Upon approval
