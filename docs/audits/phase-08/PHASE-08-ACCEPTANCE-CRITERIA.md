# Phase 08 — Acceptance Criteria

**Date:** 2026-11-14  
**Status:** STAGE 1 COMPLETE — PROPOSED  
**Purpose:** Define what "done" means for Phase 08 and each stage

---

## Phase 08 Overall Success Criteria

Phase 08 is considered **COMPLETE** when ALL of the following are demonstrated:

### 1. Commercial Architecture ✅ Architectural Requirements

| # | Criterion | Verification Method | Status |
|---|-----------|-------------------|--------|
| 1.1 | One central entitlement decision service exists | Code review: `src/lib/entitlements/resolver.ts` | ⏳ Stage 3 |
| 1.2 | One feature/capability registry exists | Database: `entitlement_catalog` with 20+ keys | ⏳ Stage 3 |
| 1.3 | One consistent usage metering architecture | Database: `usage_events`, `usage_aggregates`, `usage_quotas` | ⏳ Stage 4 |
| 1.4 | Configurable plans (admin can change without code) | Admin UI: `/admin/commerce/plans` | ⏳ Stage 2 |
| 1.5 | Configurable product packages | Admin UI: `/admin/commerce/products` | ⏳ Stage 2 |
| 1.6 | Documented entitlement precedence | Doc: Resolution order documented | ⏳ Stage 3 |
| 1.7 | Versioned commercial configuration | Database: Plan versions tracked | ⏳ Stage 2 |

### 2. Platform Enforcement ✅

| # | Criterion | Verification Method | Status |
|---|-----------|-------------------|--------|
| 2.1 | All Phase 01-07 capabilities integrated | Each phase's features check central entitlements | ⏳ Stage 10 |
| 2.2 | Backend authorization enforced | RLS policies + service layer checks | ⏳ Stage 10 |
| 2.3 | API restrictions enforced | API handler checks entitlements | ⏳ Stage 11 |
| 2.4 | Export restrictions enforced | Export routes check entitlements | ⏳ Stage 11 |
| 2.5 | Organization and user scopes enforced | RLS + service layer | ⏳ Stage 9 |
| 2.6 | Licensing restrictions preserved | Data source licensing overrides entitlements | ⏳ Stage 10 |
| 2.7 | No duplicated subscription logic | Code review: single source of truth | ⏳ Stage 10 |

### 3. Billing ✅

| # | Criterion | Verification Method | Status |
|---|-----------|-------------------|--------|
| 3.1 | Subscription lifecycle works | Test: create → activate → upgrade → cancel | ⏳ Stage 5 |
| 3.2 | Payment verification is server-side | Code review: no client-side payment trust | ⏳ Stage 6 |
| 3.3 | Webhooks are authenticated and idempotent | Test: signature verification + duplicate handling | ⏳ Stage 6 |
| 3.4 | Billing records are auditable | Database: `payment_transactions`, `subscription_events` | ⏳ Stage 6, 7 |
| 3.5 | Invoice totals are correct | Test: amount_minor matches payment | ⏳ Stage 7 |
| 3.6 | Failed payment behaviour is documented | Doc: Grace period, past_due handling | ⏳ Stage 5 |
| 3.7 | Reconciliation is operational | Admin UI: Payment reconciliation dashboard | ⏳ Stage 7 |

### 4. Usage ✅

| # | Criterion | Verification Method | Status |
|---|-----------|-------------------|--------|
| 4.1 | Usage is recorded correctly | Test: AI query → usage_event recorded | ⏳ Stage 4 |
| 4.2 | Duplicate usage events are prevented | Test: Idempotency key prevents duplicates | ⏳ Stage 4 |
| 4.3 | Concurrent consumption is safe | Test: Race condition handling | ⏳ Stage 4 |
| 4.4 | Quotas are enforced | Test: Exceeded quota → blocked | ⏳ Stage 4 |
| 4.5 | Usage dashboards reflect authoritative data | UI: Dashboard shows correct totals | ⏳ Stage 4 |
| 4.6 | Usage corrections are auditable | Database: Correction records with audit trail | ⏳ Stage 4 |

### 5. Security ✅

| # | Criterion | Verification Method | Status |
|---|-----------|-------------------|--------|
| 5.1 | RLS is verified | Test: Cross-tenant access blocked | ⏳ Stage 3 |
| 5.2 | Cross-tenant isolation is tested | Test: Org A cannot see Org B data | ⏳ Stage 9 |
| 5.3 | Administrative operations are protected | Test: Non-admin cannot access admin features | ⏳ Stage 12 |
| 5.4 | API keys are securely managed | Code review: No plaintext secrets | ⏳ Stage 11 |
| 5.5 | No payment secrets are exposed | Code review: No secrets in client code | ⏳ Stage 6 |
| 5.6 | No critical unresolved security findings | Security review: All findings resolved | ⏳ Stage 14 |

### 6. Engineering ✅

| # | Criterion | Verification Method | Status |
|---|-----------|-------------------|--------|
| 6.1 | TypeScript passes | `npm run typecheck` — 0 errors | Ongoing |
| 6.2 | ESLint passes | `npm run lint` — 0 errors | Ongoing |
| 6.3 | Production build passes | `npm run build` — success | Ongoing |
| 6.4 | Required automated tests pass | `npm test` — all tests pass | Ongoing |
| 6.5 | Existing functionality remains operational | Regression tests: All Phase 00-07 tests pass | Ongoing |
| 6.6 | Database migrations are safe | Test: Migrations apply cleanly | Per stage |
| 6.7 | CI checks are reproducible | CI: All checks pass | Ongoing |

### 7. Commercial Readiness ✅

| # | Criterion | Verification Method | Status |
|---|-----------|-------------------|--------|
| 7.1 | Pricing configuration is accurate | Admin UI: Prices match business requirements | ⏳ Stage 8 |
| 7.2 | Plan entitlements are approved | Doc: Business approval documented | ⏳ Stage 2 |
| 7.3 | Provider capabilities are verified | Test: Paystack sandbox tests pass | ⏳ Stage 6 |
| 7.4 | Currency support is verified | Test: NGN and USD transactions work | ⏳ Stage 6 |
| 7.5 | Commercial terms are documented | Doc: Terms of service, pricing policy | ⏳ Stage 8 |
| 7.6 | Customer billing experience is functional | Test: End-to-end checkout flow | ⏳ Stage 8 |
| 7.7 | Support and reconciliation processes documented | Doc: Support procedures, reconciliation guide | ⏳ Stage 12 |

---

## Stage-by-Stage Acceptance Criteria

### Stage 1 — Audit & Architecture ✅ COMPLETE

**Status:** ✅ Complete

| # | Criterion | Verification | Status |
|---|-----------|--------------|--------|
| 1.1 | Baseline audit document created | `PHASE-08-BASELINE-AUDIT.md` exists | ✅ Done |
| 1.2 | Existing entitlement inventory created | `PHASE-08-EXISTING-ENTITLEMENT-INVENTORY.md` exists | ✅ Done |
| 1.3 | Implementation plan created | `PHASE-08-IMPLEMENTATION-PLAN.md` exists | ✅ Done |
| 1.4 | Acceptance criteria defined | This document exists | ✅ Done |
| 1.5 | Audit presented to user | User review pending | ⏳ Pending |

**Gate:** User approves audit findings and implementation plan.

---

### Stage 2 — Commercial Product Catalog

| # | Criterion | Verification | Status |
|---|-----------|--------------|--------|
| 2.1 | `commercial_products` table created | Migration exists, table in database | ⏳ Pending |
| 2.2 | `commercial_plans` table created | Migration exists, table in database | ⏳ Pending |
| 2.3 | `commercial_prices` table created | Migration exists, table in database | ⏳ Pending |
| 2.4 | `plan_feature_entitlements` table created | Migration exists, table in database | ⏳ Pending |
| 2.5 | `plan_usage_limits` table created | Migration exists, table in database | ⏳ Pending |
| 2.6 | Service layer implemented | `src/lib/commerce/catalog.ts` exists | ⏳ Pending |
| 2.7 | Admin UI for products exists | `/admin/commerce/products` accessible | ⏳ Pending |
| 2.8 | Admin UI for plans exists | `/admin/commerce/plans` accessible | ⏳ Pending |
| 2.9 | Seed data loaded | 4 products, 6 plans, pricing configured | ⏳ Pending |
| 2.10 | Tests pass | All Stage 2 tests pass | ⏳ Pending |

**Gate:** Admin can configure products, plans, and pricing via UI.

---

### Stage 3 — Unified Entitlement Engine

| # | Criterion | Verification | Status |
|---|-----------|-------------------|--------|
| 3.1 | 16 new entitlement keys added | `entitlement_catalog` has 22+ keys | ⏳ Pending |
| 3.2 | `organization_subscriptions` table created | Migration exists, table in database | ⏳ Pending |
| 3.3 | `subscription_addons` table created | Migration exists, table in database | ⏳ Pending |
| 3.4 | `enterprise_contracts` table created | Migration exists, table in database | ⏳ Pending |
| 3.5 | Entitlement resolver supports organizations | Test: Org subscription grants entitlements | ⏳ Pending |
| 3.6 | Add-on entitlements work | Test: Add-on grants additional entitlements | ⏳ Pending |
| 3.7 | Enterprise contract entitlements work | Test: Contract overrides plan entitlements | ⏳ Pending |
| 3.8 | Entitlement precedence is documented | Doc: Resolution order documented | ⏳ Pending |
| 3.9 | All tests pass | Unit + integration tests pass | ⏳ Pending |

**Gate:** Entitlement engine resolves individual + organization + contract + add-on entitlements.

---

### Stage 4 — Usage Metering

| # | Criterion | Verification | Status |
|---|-----------|--------------|--------|
| 4.1 | `usage_metrics` table created | Migration exists, seeded with 7 metrics | ⏳ Pending |
| 4.2 | `usage_events` table created | Migration exists, table in database | ⏳ Pending |
| 4.3 | `usage_aggregates` table created | Migration exists, table in database | ⏳ Pending |
| 4.4 | `usage_quotas` table created | Migration exists, table in database | ⏳ Pending |
| 4.5 | `usage_reservations` table created | Migration exists, table in database | ⏳ Pending |
| 4.6 | Idempotent event recording works | Test: Duplicate event_id rejected | ⏳ Pending |
| 4.7 | Atomic quota consumption works | Test: Concurrent requests handled safely | ⏳ Pending |
| 4.8 | Quota enforcement works | Test: Exceeded quota → blocked | ⏳ Pending |
| 4.9 | Background aggregation runs | Job: Aggregates usage periodically | ⏳ Pending |
| 4.10 | Usage dashboard shows data | UI: `/dashboard/usage` displays metrics | ⏳ Pending |
| 4.11 | All tests pass | Unit + integration + concurrency tests pass | ⏳ Pending |

**Gate:** Usage is recorded, aggregated, and enforced correctly.

---

### Stage 5 — Subscription Lifecycle

| # | Criterion | Verification | Status |
|---|-----------|--------------|--------|
| 5.1 | `subscription_events` table created | Migration exists, table in database | ⏳ Pending |
| 5.2 | Subscription creation works | Test: Create subscription → active | ⏳ Pending |
| 5.3 | Subscription activation works | Test: Activate after payment → active | ⏳ Pending |
| 5.4 | Upgrade works | Test: Upgrade plan → new entitlements | ⏳ Pending |
| 5.5 | Downgrade works | Test: Downgrade plan → reduced entitlements | ⏳ Pending |
| 5.6 | Cancellation works | Test: Cancel → canceled status | ⏳ Pending |
| 5.7 | Expiration works | Test: Expired → no entitlements | ⏳ Pending |
| 5.8 | Trial management works | Test: Trial → active conversion | ⏳ Pending |
| 5.9 | State machine enforced | Test: Invalid transitions blocked | ⏳ Pending |
| 5.10 | All tests pass | Unit + integration tests pass | ⏳ Pending |

**Gate:** Full subscription lifecycle (create → activate → upgrade/downgrade → cancel/expire) works.

---

### Stage 6 — Payment Provider Integration

| # | Criterion | Verification | Status |
|---|-----------|--------------|--------|
| 6.1 | `payment_providers` table created | Migration exists, seeded with Paystack | ⏳ Pending |
| 6.2 | `payment_transactions` table created | Migration exists, table in database | ⏳ Pending |
| 6.3 | `payment_webhook_events` table created | Migration exists, table in database | ⏳ Pending |
| 6.4 | Paystack integration works | Test: Create payment → success (sandbox) | ⏳ Pending |
| 6.5 | Webhook handler works | Test: Paystack webhook → transaction recorded | ⏳ Pending |
| 6.6 | Signature verification works | Test: Invalid signature rejected | ⏳ Pending |
| 6.7 | Idempotent webhook processing | Test: Duplicate webhook handled | ⏳ Pending |
| 6.8 | Payment verification works | Test: Verify payment with Paystack API | ⏳ Pending |
| 6.9 | Failed payment handling works | Test: Failed payment → past_due | ⏳ Pending |
| 6.10 | No secrets in client code | Code review: No API keys in client | ⏳ Pending |
| 6.11 | All tests pass | Unit + integration + security tests pass | ⏳ Pending |

**Gate:** Payment provider integrated, webhooks processed, payments verified in sandbox.

---

### Stages 7-14 — Summary Criteria

**Stage 7 — Invoices & Billing:**
- Invoice generation works
- Payment history accessible
- Refund processing works
- Billing notifications sent

**Stage 8 — Pricing & Checkout:**
- Public pricing page displays plans
- Checkout flow works end-to-end
- Payment succeeds in production
- Subscription activated after payment

**Stage 9 — Organisation Billing:**
- Organization subscription works
- Team seats managed correctly
- Billing dashboard functional
- Shared usage tracked

**Stage 10 — Platform-Wide Migration:**
- All Phase 01-07 features check central entitlements
- No old access logic remains
- All regression tests pass
- No breaking changes to existing users

**Stage 11 — API & Export Governance:**
- API keys have scopes and quotas
- Export routes check entitlements
- Usage metered for API and exports
- Quotas enforced

**Stage 12 — Commercial Administration:**
- Admin commerce dashboard functional
- Plans manageable via UI
- Subscriptions viewable and manageable
- Audit trail complete

**Stage 13 — Revenue Analytics:**
- MRR/ARR calculated correctly
- Churn tracking works
- Revenue reports generated
- Customer analytics available

**Stage 14 — Production Hardening:**
- Security review complete
- Performance tests pass
- Load testing successful
- Documentation complete
- All acceptance criteria met

---

## Definition of Done

A stage is **DONE** when:

1. ✅ All acceptance criteria for that stage are met
2. ✅ All tests pass (unit, integration, security)
3. ✅ TypeScript compiles with 0 errors
4. ✅ ESLint passes with 0 errors
5. ✅ Production build succeeds
6. ✅ Database migrations apply cleanly
7. ✅ Documentation updated
8. ✅ Code reviewed and approved
9. ✅ Gate presented to user (where applicable)
10. ✅ User approval received (where applicable)

---

## Sign-Off

### Stage 1 — Audit & Architecture

**Status:** ✅ Complete  
**Deliverables:** 10 audit documents  
**Gate:** User approval required

**Approver:** ___________________  
**Date:** ___________________

### Stage 2 — Commercial Product Catalog

**Status:** ⏳ Not started  
**Gate:** Admin can configure products, plans, pricing

**Approver:** ___________________  
**Date:** ___________________

### (Continue for all stages...)

---

## Appendix: Verification Methods

### Code Review
- Manual inspection of code
- Check for security issues
- Verify architecture compliance

### Database Verification
- Query tables to confirm existence
- Check row counts for seed data
- Verify RLS policies

### Test Execution
- Run `npm test` to execute all tests
- Verify test coverage
- Check for failing tests

### UI Verification
- Navigate to admin pages
- Verify functionality
- Check for errors

### Integration Testing
- Test end-to-end flows
- Verify cross-component interaction
- Check error handling

### Security Testing
- Test tenant isolation
- Verify RLS enforcement
- Check for secret exposure

### Performance Testing
- Load test critical paths
- Measure response times
- Check for bottlenecks

---

**Document Status:** ✅ PROPOSED  
**Approval Required:** Yes  
**Next Step:** User reviews and approves Stage 1, then proceed to Stage 2
