# Phase 08 — Existing Entitlement Inventory

**Date:** 2026-11-14  
**Status:** STAGE 1 COMPLETE  
**Purpose:** Complete inventory of all access controls, entitlements, and feature gates across the platform

---

## 1. Entitlement Catalog (Migration 0016)

### 1.1 Registered Entitlement Keys

| Key | Label | Description | Defined | Enforced | Phase |
|-----|-------|-------------|---------|----------|-------|
| `watchlists` | Saved watchlists | Save commodities and markets | ✅ Migration 0016 | ❌ Not enforced | Phase 02 |
| `alerts` | Price alerts | Price threshold notifications | ✅ Migration 0016 | ❌ Not enforced | Phase 02 |
| `exports` | CSV and spreadsheet exports | Download observations | ✅ Migration 0016 | ❌ Not enforced | Phase 01, 02 |
| `reports` | Premium market intelligence | Premium reports access | ✅ Migration 0016 | ✅ RLS enforced | Phase 01, 03, 06 |
| `api` | API access | Programmatic access with scoped key | ✅ Migration 0016 | ✅ API handler | Phase 01 |
| `bulk` | Bulk data | Large historical exports | ✅ Migration 0016 | ❌ Not enforced | Phase 01, 02 |

### 1.2 Tier Definitions (Migration 0016)

| Tier ID | Name | Entitlement Keys | Available | Sort Order |
|---------|------|-----------------|-----------|------------|
| `public` | Public access | {} (none) | ✅ Yes | 10 |
| `professional` | Professional intelligence | watchlists, alerts, exports, reports | ❌ No (proposed) | 20 |
| `enterprise` | Enterprise intelligence | watchlists, alerts, exports, reports, api, bulk | ❌ No (proposed) | 30 |

### 1.3 Entitlement Resolution Functions

| Function | Location | Purpose | Security |
|----------|----------|---------|----------|
| `user_entitlements()` | Migration 0016 | Returns all entitlement keys for caller | ✅ security definer, stable |
| `has_entitlement(key)` | Migration 0016 | Boolean check for specific key | ✅ security definer, stable |
| `api_application_entitlements(app_id)` | Migration 0016 | Resolves API key entitlements from owner | ✅ security definer, stable |
| `getEntitlements()` | src/lib/entitlements.ts | TypeScript entitlement resolution | ✅ Server-only |
| `hasEntitlement(set, key)` | src/lib/entitlements.ts | TypeScript boolean check | ✅ Pure function |
| `rateLimitFor(options)` | src/lib/entitlements.ts | Tier-aware rate limiting | ✅ Pure function |

---

## 2. Feature-to-Entitlement Mapping

### 2.1 Phase 01 — Market Data Activation

| Capability | Table/Route | Current Access | Entitlement | Enforced | Action Required |
|-----------|-------------|---------------|-------------|----------|-----------------|
| View public prices | price_observations | ✅ Public | None | ✅ RLS | None |
| View public reports | market_reports (is_premium=false) | ✅ Public | None | ✅ RLS | None |
| View premium reports | market_reports (is_premium=true) | 🔒 Gated | `reports` | ✅ RLS | None |
| Export CSV data | — | ✅ Public | `exports` | ❌ Not enforced | Add enforcement |
| Bulk historical data | — | ✅ Public | `bulk` | ❌ Not enforced | Add enforcement |

### 2.2 Phase 02 — Market Terminal

| Capability | Table/Route | Current Access | Entitlement | Enforced | Action Required |
|-----------|-------------|---------------|-------------|----------|-----------------|
| View market comparison | /compare | ✅ Public | None | ✅ RLS | None |
| View price charts | /charts | ✅ Public | None | ✅ RLS | None |
| Save commodities | saved_commodities | 🔓 Auth only | `watchlists` | ❌ Not enforced | Add RLS |
| Save markets | saved_markets | 🔓 Auth only | `watchlists` | ❌ Not enforced | Add RLS |
| Create price alerts | price_alerts | 🔓 Auth only | `alerts` | ❌ Not enforced | Add RLS |
| Advanced analytics | terminal/ | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |

### 2.3 Phase 03 — Commodity Intelligence

| Capability | Table/Route | Current Access | Entitlement | Enforced | Action Required |
|-----------|-------------|---------------|-------------|----------|-----------------|
| View basic profiles | /intelligence/[slug] | ✅ Public | None | ✅ RLS | None |
| View premium reports | market_reports | 🔒 Gated | `reports` | ✅ RLS | None |
| Grade comparison | intelligence/ | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |
| Seasonal analysis | intelligence/ | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |
| Advanced intelligence | intelligence/ | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |

### 2.4 Phase 04 — Trade Marketplace

| Capability | Table/Route | Current Access | Entitlement | Enforced | Action Required |
|-----------|-------------|---------------|-------------|----------|-----------------|
| Browse offers | commercial_offers | 🔓 Auth only | None | ✅ RLS | None |
| Create offer | commercial_offers | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |
| Create RFQ | — | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |
| Advanced discovery | — | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |

### 2.5 Phase 05 — Business Workspace

| Capability | Table/Route | Current Access | Entitlement | Enforced | Action Required |
|-----------|-------------|---------------|-------------|----------|-----------------|
| View organization | organizations | 🔒 Member only | None | ✅ RLS | None |
| Create organization | organizations | 🔓 Auth only | TBD | ❌ Not defined | Define + enforce |
| Invite members | organization_memberships | 🔒 Owner/Admin | TBD | ❌ Not defined | Define + enforce |
| Procurement workflows | operations/ | 🔒 Member only | TBD | ❌ Not defined | Define + enforce |
| CRM features | operations/ | 🔒 Member only | TBD | ❌ Not defined | Define + enforce |

### 2.6 Phase 06 — Research & AI Analyst

| Capability | Table/Route | Current Access | Entitlement | Enforced | Action Required |
|-----------|-------------|---------------|-------------|----------|-----------------|
| Public reports | market_reports | ✅ Public | None | ✅ RLS | None |
| Premium reports | market_reports | 🔒 Gated | `reports` | ✅ RLS | None |
| AI analyst queries | intelligence/[slug] | 🔓 Auth only | TBD | ❌ Not defined | Define + meter |
| Advanced analysis | intelligence/[slug] | 🔓 Auth only | TBD | ❌ Not defined | Define + meter |
| Report generation | intelligence/[slug] | 🔓 Auth only | TBD | ❌ Not defined | Define + meter |

### 2.7 Phase 07 — Global Trade Intelligence

| Capability | Table/Route | Current Access | Entitlement | Enforced | Action Required |
|-----------|-------------|---------------|-------------|----------|-----------------|
| Trade data overview | trade-intelligence/ | 🔒 Staff only | None | ✅ Auth guard | None |
| Trade flow explorer | trade-intelligence/explorer | 🔒 Staff only | None | ✅ Auth guard | None |
| Partner profiles | trade-intelligence/partners | 🔒 Staff only | None | ✅ Auth guard | None |
| Commodity profiles | trade-intelligence/commodities | 🔒 Staff only | None | ✅ Auth guard | None |
| Advanced analytics | trade-intelligence/ | 🔒 Staff only | TBD | ❌ Not defined | Define + enforce |

### 2.8 API Routes

| Endpoint | Route | Current Access | Entitlement | Enforced | Action Required |
|----------|-------|---------------|-------------|----------|-----------------|
| Latest prices | /api/v1/prices/latest | ✅ Public | None | ✅ Rate limited | None |
| Price history | /api/v1/prices/history | 🔒 API key | `api` | ✅ Handler | None |
| Compare prices | /api/v1/prices/compare | 🔒 API key | `api` | ✅ Handler | None |
| Reports | /api/v1/reports | 🔒 API key | `reports` | ✅ Handler | None |
| Trade flows | /api/v1/trade/flows | 🔒 API key | TBD | ❌ Not defined | Define |
| Trade intelligence | /api/v1/trade/intelligence/* | 🔒 API key | TBD | ❌ Not defined | Define |

---

## 3. Authentication & Authorization Infrastructure

### 3.1 Auth Guards

| Guard | Location | Purpose | Usage Count |
|-------|----------|---------|-------------|
| `requireStaff()` | src/lib/auth/guards.ts | Require staff role | 34 pages |
| `requireAdmin()` | src/lib/auth/guards.ts | Require admin role | Used in admin pages |
| `requireUser()` | src/lib/auth/guards.ts | Require authentication | Used in portal pages |

### 3.2 RLS Policies

| Table | Policy | Purpose | Entitlement Check |
|-------|--------|---------|-------------------|
| market_reports | reports_public_read | Gate premium reports | ✅ `has_entitlement('reports')` |
| customer_subscriptions | subscriptions_admin_write | Admin-only writes | ✅ `is_admin()` |
| entitlement_tiers | entitlement_tiers_admin_write | Admin-only writes | ✅ `is_admin()` |
| All Phase 00-07 tables | Various | Tenant isolation | ✅ User/org isolation |

### 3.3 API Authentication

| Method | Handler | Purpose | Entitlement Check |
|--------|---------|---------|-------------------|
| API Key | src/lib/api/auth.ts | Bearer token auth | ✅ via handler |
| Entitlement | src/lib/api/handler.ts | Endpoint gating | ✅ `hasEntitlement()` |
| Rate limit | src/lib/api/handler.ts | Tier-aware limiting | ✅ `rateLimitFor()` |

---

## 4. Hardcoded Access Patterns

### 4.1 Plan Checks

**Finding:** ❌ NO hardcoded plan checks found

Search patterns tested:
- `plan === 'pro'` — 0 results
- `plan === 'premium'` — 0 results
- `tier === 'enterprise'` — 0 results

**Status:** ✅ ALL access goes through central entitlement system

### 4.2 Frontend-Only Restrictions

**Finding:** ✅ Minimal frontend-only restrictions

All gated features use server-side checks:
- RLS policies enforce database-level access
- API handler enforces entitlements
- Auth guards enforce role-based access

**Status:** ✅ Backend is authoritative

### 4.3 Duplicate Authorization Logic

**Finding:** ✅ NO duplicate authorization logic

Single sources of truth:
- Entitlement resolution: `src/lib/entitlements.ts` + Migration 0016
- Role checks: `src/lib/auth/guards.ts`
- API auth: `src/lib/api/auth.ts`

**Status:** ✅ No duplication found

---

## 5. Usage Controls & Metering

### 5.1 Current Usage Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| API rate limiting | src/lib/api/handler.ts | ✅ Implemented |
| Tier-aware limits | rateLimitFor() | ✅ Implemented |
| AI query limits | — | ❌ Not implemented |
| Export limits | — | ❌ Not implemented |
| Storage limits | — | ❌ Not implemented |

### 5.2 Usage Metering Status

| Metric | Tracked | Metered | Quota Enforced | Dashboard |
|--------|---------|---------|----------------|-----------|
| AI queries | ❌ No | ❌ No | ❌ No | ❌ No |
| AI tokens | ❌ No | ❌ No | ❌ No | ❌ No |
| API requests | ✅ Count only | ❌ No | ✅ Rate limit | ❌ No |
| Exports | ❌ No | ❌ No | ❌ No | ❌ No |
| Reports | ❌ No | ❌ No | ❌ No | ❌ No |
| Storage | ❌ No | ❌ No | ❌ No | ❌ No |

**Status:** ⚠️ USAGE METERING NOT IMPLEMENTED — Required for usage-based billing

---

## 6. Gaps Summary

### 6.1 Entitlements Defined But Not Enforced (3)

| Entitlement | Defined In | Should Gate | Action |
|-------------|-----------|-------------|--------|
| `watchlists` | Migration 0016 | saved_commodities, saved_markets | Add RLS |
| `alerts` | Migration 0016 | price_alerts | Add RLS |
| `exports` | Migration 0016 | Export routes | Add checks |
| `bulk` | Migration 0016 | Bulk export routes | Add checks |

### 6.2 Capabilities Without Entitlements (18+)

| Capability | Phase | Recommended Key | Priority |
|-----------|-------|-----------------|----------|
| Advanced market analytics | Phase 02 | market.advanced_analytics | Medium |
| Commodity grade comparison | Phase 03 | commodity.grade_comparison | Medium |
| Commodity seasonal analysis | Phase 03 | commodity.seasonal_analysis | Medium |
| Create marketplace listings | Phase 04 | marketplace.publish_listing | High |
| Create RFQs | Phase 04 | marketplace.create_rfq | Medium |
| Create organizations | Phase 05 | workspace.create | High |
| Invite team members | Phase 05 | workspace.team_members | High |
| AI analyst queries | Phase 06 | ai.basic_queries | High |
| Advanced AI analysis | Phase 06 | ai.advanced_analysis | Medium |
| Trade country profiles | Phase 07 | global_trade.country_profiles | Medium |
| Advanced trade analytics | Phase 07 | global_trade.advanced_analytics | High |

### 6.3 Missing Infrastructure (5)

| Infrastructure | Purpose | Status |
|---------------|---------|--------|
| Usage metering | Track AI/API/export consumption | ❌ Not implemented |
| Payment integration | Process subscriptions | ❌ No provider configured |
| Invoicing | Generate bills | ❌ No tables exist |
| Organization subscriptions | Shared team access | ❌ Not implemented |
| Enterprise contracts | Custom agreements | ❌ Not implemented |

---

## 7. Security Assessment

### 7.1 Entitlement Security

| Check | Status | Notes |
|-------|--------|-------|
| Entitlements require active subscription | ✅ Secure | Only active/trialing grant |
| Expired subscriptions grant nothing | ✅ Secure | Date checks enforced |
| Past_due subscriptions grant nothing | ✅ Secure | Deliberately excluded |
| API keys inherit owner entitlements | ✅ Secure | No independent grants |
| Admin overrides are audited | ✅ Secure | Trigger logs changes |
| No entitlement bypass paths | ✅ Secure | All checks go through central functions |

### 7.2 RLS Security

| Check | Status | Notes |
|-------|--------|-------|
| User isolation enforced | ✅ Secure | All tables have user_id checks |
| Organization isolation enforced | ✅ Secure | All org tables have org_id checks |
| Admin functions protected | ✅ Secure | requireStaff/requireAdmin used |
| No service-role exposure | ✅ Secure | No service-role keys in client code |
| RLS never disabled | ✅ Secure | No disable RLS found |

### 7.3 API Security

| Check | Status | Notes |
|-------|--------|-------|
| API key authentication | ✅ Secure | Bearer token validation |
| Scope-based access | ✅ Secure | Scopes checked per endpoint |
| Rate limiting | ✅ Secure | Tier-aware limits |
| Entitlement gating | ✅ Secure | hasEntitlement() checked |
| No secret exposure | ✅ Secure | No secrets in client code |

---

## 8. Recommendations

### 8.1 Immediate Actions (Stage 2-3)

1. **Enforce existing entitlements** (1 week)
   - Add RLS to saved_commodities, saved_markets (watchlists)
   - Add RLS to price_alerts (alerts)
   - Add checks to export routes (exports)
   - Add checks to bulk routes (bulk)

2. **Define new entitlement keys** (3 days)
   - Add marketplace.publish_listing
   - Add workspace.create
   - Add workspace.team_members
   - Add ai.basic_queries
   - Add global_trade.advanced_analytics

3. **Build usage metering** (2 weeks)
   - Create usage_events table
   - Implement event recording
   - Build quota checking
   - Create usage dashboards

### 8.2 Medium-Term Actions (Stage 4-6)

4. **Integrate payment provider** (2 weeks)
   - Evaluate Paystack/Flutterwave
   - Build payment abstraction
   - Implement webhooks
   - Build checkout flow

5. **Add organization subscriptions** (1 week)
   - Extend entitlement resolution
   - Build org billing dashboard
   - Implement seat management

6. **Migrate phase-by-phase** (6 weeks)
   - Gate Phase 01-07 features
   - Add upgrade prompts
   - Test thoroughly

---

## 9. Conclusion

The existing entitlement infrastructure is **well-designed and secure**. The primary gaps are:

1. **4 entitlements defined but not enforced** (watchlists, alerts, exports, bulk)
2. **18+ capabilities without entitlement definitions**
3. **No usage metering** (required for usage-based billing)
4. **No payment integration** (required for subscription activation)

**Recommendation:** Extend the existing architecture rather than replacing it. The foundation is solid; it needs enhancement, not reconstruction.

---

**Inventory Status:** ✅ COMPLETE  
**Next Review:** Upon Stage 2 approval
