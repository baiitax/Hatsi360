# Phase 04 — Implementation Plan

**Hatsi360 Markets · B2B Trade Marketplace**  
Date: 2026-11-14  
Status: **DRAFT — Pending Owner Approval**  
Depends on: Baseline Audit (`PHASE-04-BASELINE-AUDIT.md`)

---

## 1. Architecture Overview

Phase 04 extends the existing Hatsi360 platform with a B2B agricultural marketplace. The architecture follows established conventions:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HATSI360 PLATFORM                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Market     │  │  Commodity  │  │  Trade      │  ← Phases 01-03 │
│  │   Terminal   │  │ Intelligence│  │  Analytics  │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                           │
│  ┌──────┴────────────────┴────────────────┴──────────────────────┐   │
│  │                   SHARED FOUNDATIONS                            │   │
│  │  Auth · Entitlements · Notifications · Storage · API · Admin   │   │
│  └──────────────────────────┬────────────────────────────────────┘   │
│                              │                                        │
│  ┌──────────────────────────┴────────────────────────────────────┐   │
│  │              PHASE 04: B2B MARKETPLACE                        │   │
│  │                                                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐     │   │
│  │  │ Business │ │ Listings │ │   RFQs   │ │ Quotations   │     │   │
│  │  │ Profiles │ │ & Search │ │ & Match  │ │ & Comparison │     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘     │   │
│  │                                                               │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐     │   │
│  │  │Enquiries │ │Conversa- │ │Opportuni-│ │   Admin &    │     │   │
│  │  │& Contact │ │ tions    │ │ties/CRM  │ │ Moderation   │     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘     │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │              PUBLIC MARKETPLACE                                 │   │
│  │  /marketplace · /marketplace/products · /marketplace/suppliers │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │              BUSINESS WORKSPACE                                 │   │
│  │  /workspace · /workspace/listings · /workspace/rfqs · etc.     │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Migration Strategy

### 2.1 Migration sequence

Phase 04 will use multiple forward-only migrations, each addressing a specific domain:

| Migration | Domain | Depends on |
|---|---|---|
| `0034_marketplace_organizations.sql` | Business profiles, extended org schema | None |
| `0035_marketplace_listings.sql` | Listings, attributes, media, status history | 0034 |
| `0036_marketplace_rfqs.sql` | RFQs, invitations, status history | 0034, 0035 |
| `0037_marketplace_quotations.sql` | Quotations, versions, documents, status | 0035, 0036 |
| `0038_marketplace_communications.sql` | Enquiries, conversations, messages | 0034 |
| `0039_marketplace_opportunities.sql` | Trade opportunities, pipeline, stages | 0034, 0037 |
| `0040_marketplace_moderation.sql` | Reports, moderation actions, audit | 0034, 0035 |
| `0041_marketplace_notifications.sql` | Notification kinds enum extension | All above |
| `0042_marketplace_entitlements.sql` | Entitlement catalog extension | None |
| `0043_marketplace_storage.sql` | Storage buckets and policies | 0035 |

### 2.2 Key design decisions

1. **Separate business profiles from organizations:** The existing `organizations` table stays as-is (identity container). A new `business_profiles` table links 1:1 for marketplace-specific business data (description, address, roles, commodities handled). This avoids breaking existing organization references.

2. **Separate marketplace listings from existing offers:** `buyer_offers`/`seller_offers` remain unchanged. Marketplace listings use a new `marketplace_listings` table with richer lifecycle, media, and attributes.

3. **UUID primary keys** for all marketplace tables (consistent with existing offer and auth tables).

4. **NUMERIC for monetary amounts** (consistent with existing offers — no floating-point).

5. **Status enums** for lifecycle state management with audit trail tables.

6. **Organization-scoped RLS** — every private record has `organization_id`, RLS checks `organization_members`.

### 2.3 Data model — core entities

#### Business Profiles

```
business_profiles
├── id (UUID, PK)
├── organization_id (UUID, FK → organizations)
├── trading_name (text)
├── description (text)
├── business_type (text) — producer, trader, aggregator, processor, exporter, etc.
├── business_roles (text[]) — buyer, seller, producer, aggregator, etc.
├── country_id (FK → countries)
├── state_id (FK → states)
├── city (text)
├── address (text)
├── email (text)
├── phone (text)
├── website (text)
├── year_established (integer)
├── registration_number (text)
├── tax_identification (text)
├── commodities_handled (bigint[]) — FK → commodities
├── markets_operated (bigint[]) — FK → markets
├── verification_status (enum) — not_submitted, submitted, under_review, etc.
├── verified_at (timestamptz)
├── verified_by (UUID)
├── is_published (boolean) — visible in public marketplace
├── created_at / updated_at
```

#### Marketplace Listings

```
marketplace_listings
├── id (UUID, PK)
├── organization_id (UUID, FK → organizations) — seller organization
├── listing_type (enum) — supply, demand
├── title (text)
├── slug (text, unique)
├── commodity_id (FK → commodities)
├── grade_id (FK → commodity_grades)
├── variety_id (FK → commodity_varieties)
├── description (text)
├── origin_country_id (FK → countries)
├── origin_state_id (FK → states)
├── quantity_available (numeric)
├── quantity_unit_id (FK → measurement_units)
├── min_order_quantity (numeric)
├── price_amount (numeric) — NULL means "price on request"
├── price_type (enum) — indicative, negotiable, fixed, on_request
├── currency_code (char(3))
├── packaging_type (text)
├── supply_frequency (text)
├── availability_from (date)
├── availability_to (date)
├── delivery_terms (text)
├── delivery_locations (text[])
├── export_capable (boolean)
├── status (enum) — draft, pending_review, published, paused, sold_out, expired, rejected, archived
├── visibility (enum) — public, authenticated_only
├── published_at (timestamptz)
├── expires_at (timestamptz)
├── created_by (UUID)
├── created_at / updated_at
```

#### Marketplace RFQs

```
marketplace_rfqs
├── id (UUID, PK)
├── organization_id (UUID, FK → organizations) — buyer organization
├── title (text)
├── commodity_id (FK → commodities)
├── grade_id (FK → commodity_grades)
├── required_quantity (numeric)
├── quantity_unit_id (FK → measurement_units)
├── target_price (numeric) — optional
├── currency_code (char(3))
├── delivery_country_id (FK → countries)
├── delivery_state_id (FK → states)
├── delivery_location (text)
├── delivery_terms (text)
├── required_delivery_date (date)
├── response_deadline (timestamptz)
├── quality_requirements (text)
├── certificate_requirements (text[])
├── visibility (enum) — public, targeted, private
├── status (enum) — draft, pending_review, published, open, under_evaluation, negotiation, awarded, closed, cancelled, expired
├── created_by (UUID)
├── created_at / updated_at
```

#### Marketplace Quotations

```
marketplace_quotations
├── id (UUID, PK)
├── rfq_id (UUID, FK → marketplace_rfqs) — NULL for unsolicited
├── supplier_organization_id (UUID, FK → organizations)
├── buyer_organization_id (UUID, FK → organizations)
├── listing_id (UUID, FK → marketplace_listings) — NULL if no listing
├── commodity_id (FK → commodities)
├── grade_id (FK → commodity_grades)
├── quantity_offered (numeric)
├── quantity_unit_id (FK → measurement_units)
├── unit_price (numeric)
├── currency_code (char(3))
├── total_value (numeric) — calculated server-side
├── delivery_location (text)
├── delivery_terms (text)
├── lead_time_days (integer)
├── availability_date (date)
├── quote_valid_until (timestamptz)
├── quality_specifications (jsonb)
├── payment_terms (text)
├── additional_conditions (text)
├── version_number (integer) — for revision tracking
├── superseded_by (UUID, FK → marketplace_quotations)
├── status (enum) — draft, submitted, under_review, accepted_for_negotiation, revision_requested, accepted, rejected, withdrawn, expired, superseded
├── created_by (UUID)
├── created_at / updated_at
```

#### Conversations and Messages

```
marketplace_conversations
├── id (UUID, PK)
├── title (text)
├── rfq_id (UUID, FK → marketplace_rfqs) — optional
├── quotation_id (UUID, FK → marketplace_quotations) — optional
├── listing_id (UUID, FK → marketplace_listings) — optional
├── opportunity_id (UUID, FK → trade_opportunities) — optional
├── created_at / updated_at

marketplace_conversation_participants
├── conversation_id (UUID, FK)
├── organization_id (UUID, FK → organizations)
├── user_id (UUID, FK → auth.users)
├── role (enum) — initiator, respondent, added
├── joined_at (timestamptz)

marketplace_messages
├── id (UUID, PK)
├── conversation_id (UUID, FK)
├── sender_user_id (UUID, FK)
├── sender_organization_id (UUID, FK)
├── body (text)
├── read_at (timestamptz)
├── created_at (timestamptz)
```

#### Trade Opportunities

```
trade_opportunities
├── id (UUID, PK)
├── reference (text, unique) — human-readable ID
├── buyer_organization_id (UUID, FK)
├── seller_organization_id (UUID, FK)
├── commodity_id (FK → commodities)
├── grade_id (FK → commodity_grades)
├── estimated_quantity (numeric)
├── quantity_unit_id (FK)
├── estimated_value (numeric)
├── currency_code (char(3))
├── source_type (enum) — enquiry, rfq, quotation, listing, referral, direct
├── source_id (UUID) — polymorphic FK
├── stage (enum) — new, qualified, contacted, negotiation, proposal, pending_decision, won, lost, on_hold, closed
├── assigned_user_id (UUID)
├── next_follow_up (date)
├── outcome (text)
├── loss_reason (text)
├── created_at / updated_at
```

### 2.4 RLS Policy Design

**Organization-scoped records (listings, RFQs, quotations, conversations, opportunities):**

```sql
-- Organization members can read their org's private records
CREATE POLICY org_members_read ON marketplace_listings
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only org members with appropriate roles can modify
CREATE POLICY org_members_write ON marketplace_listings
  FOR ALL TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role_in_org IN ('owner', 'admin', 'commercial_manager')
    )
  );

-- Public reads only published+public listings
CREATE POLICY public_read_published ON marketplace_listings
  FOR SELECT TO anon, authenticated
  USING (status = 'published' AND visibility = 'public');

-- Staff can read all for moderation
CREATE POLICY staff_read_all ON marketplace_listings
  FOR SELECT TO authenticated
  USING (public.is_staff());
```

**Conversation-specific:**
```sql
-- Only participants can read conversations
CREATE POLICY participants_read ON marketplace_conversations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM marketplace_conversation_participants
      WHERE user_id = auth.uid()
    )
  );
```

---

## 3. Service Module Architecture

### 3.1 New service modules

```
src/lib/marketplace/
├── index.ts                    — barrel exports
├── business-profiles.ts        — business profile CRUD
├── business-verification.ts    — verification workflow
├── listings.ts                 — listing CRUD and search
├── listing-matching.ts         — supplier matching engine
├── rfqs.ts                     — RFQ CRUD and lifecycle
├── quotations.ts               — quotation CRUD, versioning
├── enquiries.ts                — enquiry management
├── conversations.ts            — messaging service
├── opportunities.ts            — trade opportunity pipeline
├── moderation.ts               — reporting and moderation
├── notifications.ts            — marketplace notification dispatch
├── entitlements.ts             — marketplace entitlement checks
├── search.ts                   — marketplace search service
└── intelligence.ts             — market intelligence integration
```

### 3.2 Key service responsibilities

| Service | Responsibility |
|---|---|
| `business-profiles.ts` | Create/update business profiles, validate onboarding data |
| `business-verification.ts` | Manage verification submission, review, approval/rejection workflow |
| `listings.ts` | Listing CRUD, validation, lifecycle transitions, search indexing |
| `listing-matching.ts` | Match listings to RFQs using commodity, grade, geography, quantity rules |
| `rfqs.ts` | RFQ CRUD, visibility enforcement, invitation management, lifecycle |
| `quotations.ts` | Quotation creation, version management, comparison, lifecycle |
| `conversations.ts` | Conversation creation, participant management, message send/receive |
| `opportunities.ts` | Opportunity pipeline management, stage transitions, assignment |
| `moderation.ts` | Report handling, moderation actions, suspension workflow |
| `notifications.ts` | Dispatch marketplace notifications (extend existing notification enum) |
| `intelligence.ts` | Connect Phase 02 price data to marketplace pages |

---

## 4. Frontend Route Architecture

### 4.1 Public marketplace

| Route | Component | Purpose |
|---|---|---|
| `/marketplace` | MarketplaceHome | Landing: search, featured listings, recent RFQs |
| `/marketplace/products` | ProductListing | Searchable product listing grid |
| `/marketplace/products/[slug]` | ProductDetail | Single listing detail |
| `/marketplace/suppliers` | SupplierDirectory | Verified supplier directory |
| `/marketplace/suppliers/[slug]` | SupplierProfile | Business profile page |
| `/marketplace/buyers` | BuyerDirectory | Buyer requirement discovery |
| `/marketplace/rfqs` | RFQDirectory | Public RFQ directory |
| `/marketplace/rfqs/[id]` | RFQDetail | Public RFQ detail |
| `/marketplace/opportunities` | OpportunityDirectory | Public trade opportunities |

### 4.2 Business workspace

| Route | Component | Purpose |
|---|---|---|
| `/workspace` | WorkspaceHome | Dashboard: metrics, recent activity |
| `/workspace/company` | CompanyProfile | Business profile management |
| `/workspace/company/verification` | BusinessVerification | Verification workflow |
| `/workspace/listings` | ListingManagement | CRUD listings |
| `/workspace/listings/new` | ListingEditor | Create/edit listing |
| `/workspace/rfqs` | RFQManagement | Buyer's RFQ management |
| `/workspace/rfqs/new` | RFQCreator | Create RFQ |
| `/workspace/quotations` | QuotationManagement | Supplier's quotation management |
| `/workspace/enquiries` | EnquiryManagement | Enquiry inbox/outbox |
| `/workspace/conversations` | ConversationList | Message threads |
| `/workspace/conversations/[id]` | ConversationThread | Active conversation |
| `/workspace/opportunities` | OpportunityPipeline | Pipeline/list view |

### 4.3 Marketplace admin

| Route | Component | Purpose |
|---|---|---|
| `/admin/marketplace` | MarketplaceAdmin | Dashboard |
| `/admin/marketplace/companies` | CompanyManagement | Manage businesses |
| `/admin/marketplace/verifications` | VerificationQueue | Review verifications |
| `/admin/marketplace/listings` | ListingModeration | Review listings |
| `/admin/marketplace/rfqs` | RFQAdministration | Monitor RFQs |
| `/admin/marketplace/quotations` | QuotationOversight | Monitor quotations |
| `/admin/marketplace/reports` | ReportQueue | Handle reports |
| `/admin/marketplace/moderation` | ModerationLog | Audit trail |
| `/admin/marketplace/audit-logs` | AuditLog | Full audit trail |

---

## 5. Implementation Sequence

### Stage 1 — Discovery and audit (current)
- [x] Verify prior phases
- [x] Inspect existing marketplace infrastructure
- [x] Record technical baseline
- [x] Produce baseline audit document
- [x] Produce implementation plan document
- **Gate:** Audit and plan approved by owner

### Stage 2 — Database foundation
- [ ] Migration 0034: Business profiles + org extension
- [ ] Migration 0041: Notification kinds enum extension
- [ ] Migration 0042: Entitlement catalog extension
- [ ] Update TypeScript domain types
- [ ] Business profile service
- [ ] Tests for business profile operations
- **Gate:** Business profiles can be created, RLS verified

### Stage 3 — Business verification
- [ ] Migration: Business verification tables
- [ ] Verification workflow service
- [ ] Verification admin UI
- [ ] Business verification user UI
- [ ] Tests for verification workflow
- **Gate:** Verification submission → review → approval works

### Stage 4 — Marketplace listings
- [ ] Migration 0035: Listing tables
- [ ] Migration 0043: Storage buckets
- [ ] Listing CRUD service
- [ ] Listing search service
- [ ] Public listing pages
- [ ] Workspace listing management
- [ ] Tests for listing lifecycle
- **Gate:** Listings can be created, published, searched

### Stage 5 — RFQs and supplier matching
- [ ] Migration 0036: RFQ tables
- [ ] RFQ CRUD service
- [ ] Supplier matching engine
- [ ] Public RFQ pages
- [ ] Workspace RFQ management
- [ ] Tests for matching and lifecycle
- **Gate:** RFQs can be created, matched, responded to

### Stage 6 — Quotations
- [ ] Migration 0037: Quotation tables
- [ ] Quotation service with versioning
- [ ] Quotation comparison UI
- [ ] Tests for quotation lifecycle
- **Gate:** Quotations can be submitted, versioned, compared

### Stage 7 — Communications
- [ ] Migration 0038: Enquiry + conversation tables
- [ ] Enquiry service
- [ ] Conversation service
- [ ] Messaging UI
- [ ] Tests for conversation privacy
- **Gate:** Enquiries and conversations work with proper isolation

### Stage 8 — Opportunities
- [ ] Migration 0039: Opportunity tables
- [ ] Opportunity pipeline service
- [ ] Pipeline UI (list + kanban)
- [ ] Tests for stage transitions
- **Gate:** Opportunities can be tracked through pipeline

### Stage 9 — Administration
- [ ] Migration 0040: Moderation tables
- [ ] Marketplace admin dashboard
- [ ] Moderation workflow
- [ ] Report handling
- [ ] Tests for admin operations
- **Gate:** Admin can moderate listings, handle reports

### Stage 10 — Intelligence integration
- [ ] Market intelligence on listing pages
- [ ] Market intelligence on RFQ pages
- [ ] Contextual price references
- [ ] Tests for intelligence display rules
- **Gate:** Intelligence shown only where data supports it

### Stage 11 — Final integration
- [ ] End-to-end workflow tests
- [ ] Responsive review
- [ ] Security review (RLS audit)
- [ ] Performance review
- [ ] Completion report
- **Gate:** All tests pass, documentation complete

---

## 6. Testing Strategy

### 6.1 Unit tests

| Domain | Test file | Coverage |
|---|---|---|
| Business profiles | `tests/marketplace/business-profiles.test.ts` | Validation, creation, update |
| Verification | `tests/marketplace/verification.test.ts` | Status transitions, reviewer rules |
| Listings | `tests/marketplace/listings.test.ts` | CRUD, lifecycle, validation |
| Matching | `tests/marketplace/matching.test.ts` | Commodity/grade/geo matching |
| RFQs | `tests/marketplace/rfqs.test.ts` | CRUD, visibility, lifecycle |
| Quotations | `tests/marketplace/quotations.test.ts` | Versioning, comparison, totals |
| Conversations | `tests/marketplace/conversations.test.ts` | Participant isolation |
| Opportunities | `tests/marketplace/opportunities.test.ts` | Stage transitions |
| Entitlements | `tests/marketplace/entitlements.test.ts` | Marketplace key checks |

### 6.2 Integration tests

| Domain | Test file | Coverage |
|---|---|---|
| RLS | `tests/marketplace/rls.test.ts` | Org isolation, public read rules |
| Notification | `tests/marketplace/notification-integration.test.ts` | Dispatch on events |
| Storage | `tests/marketplace/storage.test.ts` | Bucket access control |
| API | `tests/marketplace/api.test.ts` | Marketplace API endpoints |

### 6.3 Regression

- Run full Phase 00, 01, 02, 03 test suites — no deletions or weakening
- Verify existing admin pages still work
- Verify trade analysis still works
- Verify publication pipeline still works

---

## 7. Security Considerations

### 7.1 Tenant isolation

Every marketplace operation must verify organization membership at the RLS level. The service layer provides convenience checks, but the database is the enforcement point.

**Test:** User A in Org A must never be able to read, write, or infer the existence of Org B's private records.

### 7.2 Public vs. private records

- Published listings with `visibility = 'public'` → public readable
- Public RFQs → public readable (no prices, no contact details)
- Private RFQs → only invited suppliers + buyer org
- Quotations → only supplier org + buyer org + staff
- Conversations → only participants + staff
- Verification documents → only submitting org + reviewing staff

### 7.3 Financial calculations

- All monetary amounts use `NUMERIC` in PostgreSQL
- Server-side calculation of totals (never client-side float arithmetic)
- Currency always explicit (never assumed)
- Unit always explicit (never assumed)

### 7.4 Abuse prevention

- Rate limiting on enquiry/message creation (use existing rate limit infrastructure)
- Report mechanism for listings and users
- Moderation queue for suspicious content
- Suspension capability for users and listings

---

## 8. Integration Dependencies

### 8.1 Phase 02 — Market Intelligence

- Published price observations → shown as market reference on listing/RFQ pages
- Series comparability engine → used for matching grade/unit compatibility
- Freshness classifier → used for market data freshness display
- **Constraint:** Only show market reference where compatible observations exist

### 8.2 Phase 01 — Operations

- Quality engine → could validate listing quality claims in future
- Verification workflow pattern → reused for business verification
- Coverage service → could inform supplier capability assessment

### 8.3 Phase 00 — Security

- Auth system → marketplace users authenticate through existing auth
- Entitlement engine → marketplace capabilities are entitlement-controlled
- RLS pattern → marketplace follows established RLS conventions

### 8.4 Phase 03 — Commodity Intelligence (when available)

- Commodity descriptions → enrich listing pages
- Grade specifications → enrich listing quality display
- Seasonality → inform availability expectations
- Production data → inform supply context

---

## 9. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Scope creep — marketplace is large | HIGH | Strict staging with gates, owner approval at each |
| RLS complexity — tenant isolation is critical | HIGH | Test-first RLS, independent RLS test suite |
| No real businesses to onboard | MEDIUM | Build the infrastructure, verify with test data |
| Phase 03 not yet implemented | LOW | Marketplace intelligence uses Phase 02 prices |
| Existing offer tables create confusion | LOW | Clear documentation, no data migration between them |
| Conversation/messaging complexity | MEDIUM | Start simple (text + attachments), no realtime initially |

---

## 10. Out of Scope

Phase 04 explicitly does **not** implement:
- Trade execution or settlement
- Payment processing or escrow
- Contract generation or legal documents
- AI/ML matching or recommendation
- Automated quality assessment
- Internationalization beyond en-NG
- Mobile app (responsive web only)
- Email/WhatsApp delivery (in-app notifications first)
- Subscription billing integration (no payment provider)

---

## 11. Required Documentation

| Document | Status |
|---|---|
| `PHASE-04-BASELINE-AUDIT.md` | ✅ Complete |
| `PHASE-04-IMPLEMENTATION-PLAN.md` | ✅ This document |
| `PHASE-04-DATA-DICTIONARY.md` | Stage 2 |
| `PHASE-04-SECURITY-REVIEW.md` | Stage 9 |
| `PHASE-04-TEST-REPORT.md` | Stage 11 |
| `PHASE-04-COMPLETION-REPORT.md` | Stage 11 |

---

## 12. Open Questions for Owner

1. **Organization extension:** Should we extend `organizations` in-place or create `business_profiles` as a separate table? (Plan recommends separate table.)

2. **Existing offer data:** The 15 buyer_offers and 15 seller_offers are demonstration data. Should they be migrated to marketplace listings or left as-is? (Plan recommends leaving them — different concepts.)

3. **Marketplace entitlements:** Which marketplace capabilities should be free vs. paid? (Plan recommends: browsing/discovery free, listing/RFQ/quotation behind basic entitlement.)

4. **Listing images:** Should listing images be stored in Supabase Storage (signed URLs) or served from public CDN? (Plan recommends Storage with signed URLs for seller-uploaded images.)

5. **Conversation realtime:** Should conversations use Supabase Realtime or is polling sufficient for Phase 04? (Plan recommends polling/refresh for simplicity.)

---

*Report generated: 2026-11-14*  
*Repository commit: 1d3707c*  
*Author: Hatsi360 Agent*
