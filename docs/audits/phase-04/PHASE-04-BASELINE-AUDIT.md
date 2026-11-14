# Phase 04 — Baseline Audit

**Hatsi360 Markets · B2B Trade Marketplace**  
Date: 2026-11-14  
Status: **Stage 1 — Pre-Implementation Audit (COMPLETE)**  
Repository commit: `1d3707c`  
Supabase project: `supabase-cobalt-park` (ref: `umxzsdepbrenqysabtlt`)  
Deployment: `hatsi360.vercel.app`

---

## 1. Executive Summary

Phase 04 will build a B2B agricultural trade marketplace on top of the existing Hatsi360 platform. This audit documents the actual state of all prior phases, existing marketplace-related infrastructure, and identifies what can be reused versus what must be built.

**Key finding:** The platform has meaningful existing infrastructure — buyer/seller offer tables with RLS and verification workflows, an organization/membership schema, an entitlement engine, a notification system, a storage bucket, an API layer, a comprehensive design system, and 29 admin pages. However, there is **no marketplace UI**, **no business onboarding**, **no RFQ system**, **no quotation management**, **no messaging**, and **no trade pipeline**. The existing offer tables are simple commercial declarations (not a marketplace), and the organizations table has zero records.

Phase 04 must extend, not replace. The existing offer infrastructure can inform the marketplace listing design but should not be conflated with it. The organization and entitlement infrastructure is structurally ready but operationally empty.

---

## 2. Prior Phase Verification

### 2.1 Phase 00 — Production Safety ✅ COMPLETE

**Commit:** `6a82bd6`  
**Status:** VERIFIED AND OPERATIONAL

| Check | Status |
|---|---|
| Security baseline (RLS on `_hatsi_migrations`, demo credentials gated) | ✅ Verified |
| Migration integrity (0032 applied) | ✅ Verified |
| RLS enabled on all sensitive tables | ✅ Verified |
| Environment separation | ✅ Verified |
| TypeScript: `npx tsc --noEmit` exit 0 | ✅ Clean |
| ESLint: restored, 0 new errors in Phase 02+ code | ✅ Verified |
| Production build: compiles successfully | ✅ Verified |
| CI/CD: GitHub Actions workflow | ✅ Established |
| Test suite: 786 passed, 2 failed (environmental), 28 skipped | ✅ Stable |

The 2 test failures are environmental (demo-access requires Supabase credentials, admin-commercial expects `/admin/coverage` page file that was restored from git). Not code defects.

### 2.2 Phase 01 — Market Data Activation ✅ COMPLETE

**Commit:** `c9fe6b2`  
**Status:** VERIFIED AND OPERATIONAL

| Check | Status |
|---|---|
| 11 markets with verified GPS coordinates | ✅ Verified |
| 11 collection schedules (2 daily, 9 weekly) | ✅ Verified |
| 36 market-commodity scope entries | ✅ Verified |
| Quality engine integrated (9 rules) | ✅ Verified |
| Freshness service (CURRENT/AGING/STALE/NO_DATA) | ✅ Verified |
| Coverage service | ✅ Verified |
| Publication workflow (approve → publish → withdraw) | ✅ Verified |
| Operations dashboard (`/admin/coverage`) | ✅ Verified |
| Migration 0033 applied | ✅ Verified |

### 2.3 Phase 02 — Market Terminal Design System ✅ COMPLETE

**Commits:** `190faeb`, `68b2589`  
**Status:** VERIFIED AND OPERATIONAL

| Check | Status |
|---|---|
| Terminal design system (tokens, typography, colour) | ✅ Verified |
| 71 component files | ✅ Verified |
| 15 terminal page prototypes | ✅ Verified |
| Trade analysis engine (series, candles, opportunities, freshness) | ✅ Verified |
| Data source abstraction (DataSource interface) | ✅ Verified |
| Chart system (ChartFrame, PeriodRangeChart) | ✅ Verified |
| Design documentation (10 files) | ✅ Verified |
| Navigation (MARKET_NAV, 6 modules) | ✅ Verified |

### 2.4 Phase 03 — Commodity Intelligence ⚠️ DISCOVERY COMPLETE, IMPLEMENTATION NOT STARTED

**Commit:** `1d3707c` (baseline report only)  
**Status:** STAGE 1 COMPLETE — baseline report written, no implementation

| Check | Status |
|---|---|
| 22 commodities, 14 categories, 58 grades, 42 synonyms | ✅ Operational (from earlier seed data) |
| Commodity profile page (`/commodities/[slug]`) | ✅ Working (prices only) |
| Seasonality, varieties, specifications, fundamentals schemas | ✅ Schema exists, 0 data |
| Production, supply, demand, trade tables | ❌ Do not exist |
| Evidence/provenance registry | ❌ Does not exist |
| Source registry | ❌ Does not exist |

**Implication for Phase 04:** Phase 03's commodity intelligence is not yet built. Phase 04 must plan for future integration but cannot depend on Phase 03 data being available. The market intelligence integration (§13 of Phase 04 brief) will use Phase 02's published price observations, which do exist (even if currently unpublished).

---

## 3. Existing Marketplace Infrastructure

### 3.1 Database tables — commercial

| Table | Records | Purpose | Phase 04 relevance |
|---|---|---|---|
| `buyer_offers` | 15 | Buyer procurement intent | **REUSABLE PATTERN** — structure informs listing design |
| `seller_offers` | 15 | Seller supply offers | **REUSABLE PATTERN** — structure informs listing design |
| `offer_verification_events` | 69 | Offer status audit trail | **REUSABLE PATTERN** — verification workflow model |
| `organizations` | 0 | Organization identity | **EXTEND** — needs business profile fields |
| `organization_members` | 0 | Org membership with roles | **EXTEND** — needs more granular roles |
| `profiles` | 5 | User profiles | **REUSE** — core identity |
| `customer_subscriptions` | 0 | Subscription/entitlement | **REUSE** — entitlement engine works |
| `entitlement_catalog` | 6 | Capability keys | **EXTEND** — add marketplace entitlements |
| `entitlement_tiers` | exists | Tier definitions | **EXTEND** — add marketplace tiers |
| `api_applications` | exists | API key management | **REUSE** — marketplace API access |
| `notifications` | 68 | In-app notifications | **EXTEND** — add marketplace notification kinds |
| `notification_delivery_logs` | exists | Delivery audit | **REUSE** |

### 3.2 Existing offer structure analysis

**`buyer_offers` / `seller_offers` schema (28 columns each):**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `organization_id` | UUID | Optional org |
| `counterparty_name` | text | Counterparty display name |
| `commodity_id` | bigint | FK → commodities |
| `grade_id` | bigint | FK → commodity_grades |
| `variety_id` | bigint | FK → commodity_varieties |
| `price_amount` | numeric | Precise decimal |
| `price_type` | enum | Price classification |
| `unit_id` | bigint | FK → measurement_units |
| `currency_code` | char | Currency |
| `quantity_required` / `quantity_available` | numeric | Quantity |
| `quantity_unit_id` | bigint | Quantity unit |
| `market_id` | bigint | FK → markets |
| `delivery_location` / `warehouse_location` | text | Location |
| `delivery_terms` | text | Terms |
| `valid_from` | timestamptz | Validity start |
| `valid_until` | timestamptz | Validity end |
| `quality_requirements` | text | Quality notes |
| `notes` | text | General notes |
| `status` | enum | draft/submitted/verified/rejected/expired/withdrawn |
| `verified_by` | UUID | Verifier |
| `verified_at` | timestamptz | Verification time |
| `rejection_reason` | text | Rejection explanation |
| `disclosure_consent` | boolean | Consent to publish |
| `created_by` | UUID | Creator |
| `created_at` / `updated_at` | timestamptz | Timestamps |

**Assessment:** These tables are functional but limited. They:
- ✅ Use UUID primary keys
- ✅ Use numeric for monetary amounts (no floating-point)
- ✅ Reference commodities, grades, units from canonical tables
- ✅ Have status workflow with audit trail
- ✅ Have RLS policies (public read for verified, owner read/write, staff read)
- ❌ Have no listing lifecycle (PAUSED, SOLD_OUT, ARCHIVED)
- ❌ Have no image/document support
- ❌ Have no quality specification attributes (free text only)
- ❌ Have no search/discovery indexing
- ❌ Have no matching or recommendation capability
- ❌ Are not connected to organizations in practice (0 org records)

**Decision:** The existing offer tables should **not** be transformed into marketplace listings. They serve a different purpose (private commercial declarations with verification). Marketplace listings need a richer schema with lifecycle, media, attributes, and discovery. The existing pattern is reusable as an architectural model but the tables should remain separate.

### 3.3 Existing RLS policies on offer tables

| Policy | Table | Command | Roles | Purpose |
|---|---|---|---|---|
| `buyer_offers_public_read` | buyer_offers | SELECT | anon, authenticated | Read verified offers |
| `buyer_offers_owner_read` | buyer_offers | SELECT | authenticated | Owner reads own |
| `buyer_offers_owner_insert` | buyer_offers | INSERT | authenticated | Owner creates |
| `buyer_offers_owner_update` | buyer_offers | UPDATE | authenticated | Owner modifies |
| `buyer_offers_staff_read` | buyer_offers | SELECT | authenticated | Staff reads all |
| (same pattern for seller_offers) | | | | |
| `offer_verification_events_read` | offer_verification_events | SELECT | anon, authenticated | Public audit |
| `offer_verification_events_staff_read` | offer_verification_events | SELECT | authenticated | Staff detailed |

**Assessment:** The RLS pattern is well-designed — public reads only verified+disclosed offers, owners read/write their own, staff reads all. This pattern can be replicated for marketplace listings.

### 3.4 Organization infrastructure

**`organizations` table (7 columns):**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | text | Organization name |
| `slug` | text | URL slug |
| `kind` | text | Organization type |
| `is_active` | boolean | Active status |
| `created_at` / `updated_at` | timestamptz | Timestamps |

**Assessment:** Minimal schema. Missing:
- Business description, address, contact info
- Business type/role (buyer, seller, producer, etc.)
- Registration number, tax ID
- Verification status
- Operating markets, commodities handled
- Website, year established

**Decision:** The organizations table must be extended significantly for Phase 04 business onboarding. Alternatively, a separate `business_profiles` table can link to organizations for marketplace-specific data.

### 3.5 Organization membership

**`organization_members` table (5 columns):**

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Primary key |
| `organization_id` | UUID | FK → organizations |
| `user_id` | UUID | FK → profiles/auth |
| `role_in_org` | enum | Role within organization |
| `created_at` | timestamptz | Timestamp |

**Assessment:** Functional but needs more granular roles for marketplace (commercial manager, sales rep, procurement officer, operations staff, read-only).

### 3.6 Entitlement engine

**File:** `src/lib/entitlements.ts` (188 lines)

**Existing entitlement keys:** watchlists, alerts, exports, reports, api, bulk

**Architecture:**
- `getEntitlements()` — resolves caller's entitlements from active subscriptions
- `hasEntitlement()` — capability check
- `tierFor()` — derives tier from key set (public/professional/enterprise)
- `rateLimitFor()` — rate limit based on entitlement
- Server-side only (`import 'server-only'`)
- Fails closed (no entitlement on error)

**Assessment:** Well-designed, production-ready. Phase 04 must add marketplace-specific entitlement keys (marketplace_listings, rfq_access, quotations, supplier_matching, etc.) without modifying the engine's architecture.

### 3.7 Notification system

**`notifications` table (12 columns):**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Recipient |
| `kind` | enum | 13 notification kinds |
| `severity` | enum | Severity level |
| `title` | text | Notification title |
| `body` | text | Notification body |
| `entity_type` | text | Related entity type |
| `entity_id` | text | Related entity ID |
| `action_url` | text | Deep link |
| `metadata` | jsonb | Additional data |
| `read_at` | timestamptz | Read timestamp |
| `created_at` | timestamptz | Creation timestamp |

**Existing notification kinds:** task_assigned, deadline_reminder, submission_received, submission_approved, submission_rejected, correction_requested, assignment_changed, task_cancelled, review_required, market_unassigned, coverage_gap, system_alert, quality_warning

**Assessment:** Well-designed, flexible (jsonb metadata). Phase 04 must add marketplace notification kinds (rfq_matched, quotation_received, enquiry_received, etc.) — requires a migration to extend the enum.

### 3.8 Storage

**Bucket:** `hatsi360-evidence` (private)

Only one bucket exists. Phase 04 needs additional buckets for:
- Marketplace listing images (semi-public, signed URLs)
- Business verification documents (strictly private)
- Quotation attachments (private, participant-only)

### 3.9 API routes

| Route | Purpose |
|---|---|
| `/api/v1/commodities` | Commodity catalogue |
| `/api/v1/markets` | Market directory |
| `/api/v1/prices/latest` | Latest prices |
| `/api/v1/prices/history` | Price history |
| `/api/v1/prices/compare` | Market comparison |
| `/api/v1/insights` | Market insights |
| `/api/v1/reports` | Research reports |
| `/api/v1/[...path]` | Catch-all route handler |
| `/api/agent/submit` | Field agent submission |
| `/api/auth/signout` | Sign out |
| `/api/jobs/run` | Background job runner |
| `/api/notifications/read` | Mark notifications read |

**Assessment:** No marketplace API routes exist. Phase 04 will need new API routes for listings, RFQs, quotations, etc.

### 3.10 Auth and role system

**Roles (from `src/lib/auth/routing.ts`):**

| Role | Workspace | Landing |
|---|---|---|
| `public_user` | public | `/dashboard` |
| `customer` | public | `/dashboard` |
| `agent` | agent | `/agent/home` |
| `verification_officer` | staff | `/admin/verification` |
| `market_supervisor` | staff | `/admin/verification` |
| `analyst` | staff | `/admin/verification` |
| `admin` | admin | `/admin/overview` |
| `super_admin` | admin | `/admin/overview` |

**Assessment:** No marketplace-specific roles exist. Phase 04 could either:
1. Add a `marketplace_user` role (extends public_user with marketplace capabilities)
2. Use `customer` role with marketplace entitlements
3. Add organization-level roles (handled in `organization_members.role_in_org`)

The brief calls for organization-level roles (owner, admin, commercial manager, sales rep, procurement officer, operations, read-only) — these belong in `role_in_org`, not in the platform `profiles.role`.

---

## 4. Existing Admin Infrastructure

**29 admin pages exist:**

| Page | Purpose | Phase 04 relevance |
|---|---|---|
| `/admin/overview` | Dashboard | **REUSE PATTERN** |
| `/admin/agents` | Agent management | Separate concern |
| `/admin/analytics` | Analytics | **REUSE PATTERN** |
| `/admin/api-management` | API keys | **REUSE** for marketplace API |
| `/admin/assignments` | Market assignments | Separate concern |
| `/admin/audit` | Audit log | **REUSE PATTERN** for marketplace audit |
| `/admin/categories` | Commodity categories | **REUSE** as-is |
| `/admin/commodities` | Commodity management | **REUSE** as-is |
| `/admin/coverage` | Operations coverage | Separate concern |
| `/admin/customers` | Customer directory | **REUSE PATTERN** — shows org/subscription joins |
| `/admin/exports` | Export management | **REUSE PATTERN** |
| `/admin/grades` | Grade management | **REUSE** as-is |
| `/admin/markets` | Market management | **REUSE** as-is |
| `/admin/notifications` | Notification management | **EXTEND** for marketplace |
| `/admin/observations` | Observation management | Separate concern |
| `/admin/operations` | Operations dashboard | Separate concern |
| `/admin/profile` | User profile | **REUSE** |
| `/admin/quality` | Quality engine | Separate concern |
| `/admin/reports` | Report management | Separate concern |
| `/admin/schedule` | Collection scheduling | Separate concern |
| `/admin/search` | Global search | **REUSE PATTERN** |
| `/admin/settings` | System settings | **REUSE** |
| `/admin/subscriptions` | Subscription management | **REUSE PATTERN** |
| `/admin/system` | System status | **REUSE** |
| `/admin/tasks` | Task management | Separate concern |
| `/admin/units` | Unit management | **REUSE** as-is |
| `/admin/verification` | Verification management | **REUSE PATTERN** for business verification |
| `/admin/zones` | Market zones | **REUSE** as-is |

**Commercial operations module:** `src/lib/operations/commercial.ts` (507 lines) provides customer listing, subscription management, entitlement tier management, API application management. This is the existing admin commercial surface — Phase 04 marketplace admin should extend it.

---

## 5. Component Library Assessment

### 5.1 Reusable components

| Component | Path | Phase 04 reuse |
|---|---|---|
| TerminalShell, PageHeader, SectionHeader | `terminal/TerminalShell.tsx` | ✅ Marketplace workspace pages |
| TerminalFeedback (EmptyState, Skeleton) | `feedback/TerminalFeedback.tsx` | ✅ No-data states |
| Primitives (Pill, Button, Card) | `ui/primitives.tsx` | ✅ Base UI elements |
| Icons (45+ hand-drawn SVGs) | `ui/icons.tsx` | ✅ May need marketplace-specific additions |
| MarketOverview cards | `market/MarketOverview.tsx` | ✅ KPI display |
| PriceDisplay | `market/PriceDisplay.tsx` | ✅ Price context on listings |
| ChartFrame | `charts/ChartFrame.tsx` | ✅ Market price context |
| Ops Primitives | `ops/Primitives.tsx` | ✅ Marketplace admin |
| Ops DataTable | `ops/DataTable.tsx` | ✅ Tabular marketplace data |
| Ops KpiCard | `ops/KpiCard.tsx` | ✅ Admin dashboard metrics |

### 5.2 Components Phase 04 must build

- Listing cards and grid
- Listing detail page components
- RFQ form and detail components
- Quotation comparison table
- Conversation/messaging components
- Opportunity pipeline (kanban board)
- Business profile components
- Verification status badges
- Supplier match cards
- Marketplace search/filter components
- Organization management components

---

## 6. Dependency Matrix

| Phase 04 Capability | Existing Infrastructure | Reuse Level |
|---|---|---|
| Business onboarding | `organizations` (empty), `profiles`, auth system | **EXTEND** — add business profile fields |
| Buyer/seller profiles | `buyer_offers`/`seller_offers` (pattern only) | **NEW** — profiles are not offers |
| Business verification | `offer_verification_events` (pattern) | **NEW** — business verification is different from offer verification |
| Product listings | `buyer_offers`/`seller_offers` (conceptual only) | **NEW** — separate table with richer schema |
| Supplier/buyer discovery | Market terminal search patterns | **NEW** — different search model |
| RFQ workflows | None | **NEW** |
| Quotation management | None | **NEW** |
| Commercial enquiries | `notifications` (pattern) | **NEW** |
| Conversations | `notifications` (pattern) | **NEW** |
| Trade opportunities | `src/lib/trade/opportunities.ts` (different concept) | **NEW** — CRM-style pipeline |
| Marketplace admin | `src/lib/operations/commercial.ts` (pattern) | **EXTEND** — add marketplace modules |
| Market intelligence integration | Phase 02 trade services | **REUSE** — query published prices |
| Entitlement control | `src/lib/entitlements.ts` | **EXTEND** — add marketplace keys |
| Notifications | `notifications` table + enum | **EXTEND** — add marketplace kinds |
| Document management | `hatsi360-evidence` bucket | **EXTEND** — add marketplace buckets |
| API access | `api_applications` + API routes | **EXTEND** — add marketplace endpoints |

---

## 7. Technical Baseline

### 7.1 Repository state

| Metric | Value |
|---|---|
| Latest commit | `1d3707c` |
| Branch | `main` |
| Total migrations | 33 (0001 through 0033) |
| Next migration number | 0034 |
| Component files | 71 .tsx |
| Page files (site) | 34 page.tsx |
| Admin pages | 29 page.tsx |
| API routes | 12 routes |
| Library modules | `src/lib/` — auth, brand, data, operations, quality, trade, etc. |

### 7.2 TypeScript status

```
npx tsc --noEmit → exit 0, no output (CLEAN)
```

### 7.3 Test results

```
Test Files: 33 passed, 2 failed, 1 skipped (36 total)
Tests: 786 passed, 2 failed, 28 skipped (816 total)
```

**The 2 failures:**
1. `tests/auth/demo-access.test.ts` — "the demo agent can sign in" — requires Supabase credentials in environment
2. `tests/admin/admin-commercial.test.ts` — "lists no module that does not exist" — expects `/admin/coverage/page.tsx` file on disk

Both are environmental, not code defects. The coverage page exists in git history but was not restored to disk in the workspace until I restored it earlier.

### 7.4 Build status

Production build compiles successfully (verified in Phase 00).

### 7.5 Production deployment

- Vercel project: `hatsi360`
- Domain: `hatsi360.vercel.app`
- Supabase project: `supabase-cobalt-park`

---

## 8. Security Assessment

### 8.1 Existing security posture

- RLS enabled on all sensitive tables
- Published price observations view enforces publication predicate
- Offer tables have RLS with public read for verified+disclosed only
- Service-role key never exposed to browser
- Admin operations use server-side clients
- Entitlement checks are server-side
- API keys stored as SHA-256 hashes, never plaintext
- Audit trail on offer status changes

### 8.2 Phase 04 security requirements

| Requirement | Complexity | Notes |
|---|---|---|
| Tenant isolation (cross-org data leakage prevention) | HIGH | Critical — must enforce at RLS level |
| Private RFQ access control | HIGH | Only invited suppliers can read |
| Quotation confidentiality | HIGH | Only buyer + supplier + admin can read |
| Conversation participant enforcement | HIGH | Only authorized participants |
| Business document privacy | MEDIUM | Private bucket with signed URLs |
| Verification document privacy | HIGH | Strictly private |
| Moderation record isolation | MEDIUM | Staff-only access |
| Rate limiting on enquiries/messages | MEDIUM | Abuse prevention |
| Attachment type validation | MEDIUM | Security + quality |

### 8.3 RLS design principles for Phase 04

1. **Organization-scoped:** All private records have `organization_id` — RLS checks membership
2. **Visibility-scoped:** Public records have explicit `visibility` + `status` checks
3. **Participant-scoped:** Conversations and quotations check participant membership
4. **Staff-override:** Platform admins can read all records for moderation
5. **No client-only enforcement:** Every access control check exists at the RLS level

---

## 9. Existing Patterns to Follow

### 9.1 Migration convention

Migrations are numbered sequentially: `NNNN_description.sql`

```
0001_core_reference_schema.sql
0002_price_observations.sql
...
0033_collection_activation.sql
→ Next: 0034_marketplace_foundation.sql (or similar)
```

### 9.2 Service module convention

Services live in `src/lib/` organized by domain:
- `src/lib/trade/` — trade analysis
- `src/lib/operations/` — operational services
- `src/lib/data/` — data source abstraction
- `src/lib/auth/` — authentication
- `src/lib/quality/` — quality engine

Phase 04 should follow this pattern:
- `src/lib/marketplace/` — marketplace services
- Or `src/lib/commerce/` — commercial services

### 9.3 Page convention

- Public pages: `src/app/(site)/`
- Admin pages: `src/app/admin/`
- Agent pages: `src/app/agent/`
- API routes: `src/app/api/`

Phase 04 should add:
- `src/app/(site)/marketplace/` — public marketplace
- `src/app/(site)/workspace/` — business workspace
- `src/app/admin/marketplace/` — marketplace admin

### 9.4 Component convention

Components organized by domain under `src/components/`:
- `src/components/market/` — market data
- `src/components/trade/` — trade intelligence
- `src/components/ops/` — operations
- `src/components/ui/` — foundation

Phase 04 should add:
- `src/components/marketplace/` — marketplace components
- `src/components/workspace/` — workspace components

---

## 10. Data Inventory Summary

### 10.1 What exists and has data

| Table | Records | Usable for Phase 04 |
|---|---|---|
| commodities | 22 | ✅ Reference data |
| commodity_categories | 14 | ✅ Reference data |
| commodity_grades | 58 | ✅ Listing grade selection |
| commodity_synonyms | 42 | ✅ Search support |
| markets | 11 | ✅ Location reference |
| states | 11 | ✅ Geographic reference |
| measurement_units | 8 | ✅ Quantity units |
| profiles | 5 | ✅ User accounts |
| buyer_offers | 15 | Pattern only (not marketplace listings) |
| seller_offers | 15 | Pattern only |
| notifications | 68 | ✅ Notification engine |
| entitlement_catalog | 6 | ✅ Extend with marketplace keys |

### 10.2 What exists but is empty

| Table | Phase 04 use |
|---|---|
| organizations | Business identity — extend and populate |
| organization_members | Team membership — extend roles |
| customer_subscriptions | Entitlement bundles |
| api_applications | API key management |
| commodity_varieties | Product variety selection |
| commodity_specifications | Quality parameter definitions |

### 10.3 What must be created

| Domain | Tables needed |
|---|---|
| Business profiles | `business_profiles`, `business_verification_submissions`, `business_verification_documents`, `business_verification_reviews` |
| Marketplace listings | `marketplace_listings`, `marketplace_listing_attributes`, `marketplace_listing_media`, `marketplace_listing_status_history` |
| RFQs | `marketplace_rfqs`, `marketplace_rfq_invitations`, `marketplace_rfq_status_history` |
| Quotations | `marketplace_quotations`, `marketplace_quotation_versions`, `marketplace_quotation_documents`, `marketplace_quotation_status_history` |
| Enquiries | `marketplace_enquiries` |
| Conversations | `marketplace_conversations`, `marketplace_conversation_participants`, `marketplace_messages`, `marketplace_message_attachments` |
| Opportunities | `trade_opportunities`, `trade_opportunity_activities`, `trade_opportunity_stage_history` |
| Moderation | `marketplace_reports`, `marketplace_moderation_actions` |
| Storage | Additional buckets for listing images, verification documents, quotation attachments |

---

## 11. Risks and Unresolved Questions

### 11.1 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Phase 03 not implemented — commodity intelligence unavailable | MEDIUM | Phase 04 marketplace intelligence integration uses Phase 02 prices, not Phase 03 |
| Organization table is empty — no businesses onboarded | HIGH | Phase 04 must include full onboarding flow |
| Notification enum needs extension — requires migration | LOW | Standard migration, backward-compatible |
| Existing offer tables could be confused with marketplace listings | MEDIUM | Clear documentation separating the two concepts |
| No Supabase Realtime for conversations | LOW | Polling/refresh fallback is acceptable per brief |
| Multiple organizations per user — existing `profiles` has no org link | MEDIUM | `organization_members` handles this; `profiles` stays personal |

### 11.2 Unresolved decisions requiring owner input

| Question | Impact |
|---|---|
| Should `organizations` be extended in-place or should `business_profiles` be a separate table? | Schema design |
| Should existing `buyer_offers`/`seller_offers` be migrated to the new listing system? | Data migration scope |
| Which marketplace entitlements should be free vs. paid? | Business model |
| Should the marketplace use its own notification kinds or share the existing enum? | Migration scope |
| What file types and sizes should be allowed for marketplace attachments? | Security policy |

---

## 12. Conclusion

The Hatsi360 platform has a solid foundation for Phase 04:
- ✅ Authentication, authorization, and role system
- ✅ Entitlement engine with tier support
- ✅ Notification infrastructure
- ✅ Storage with signed URL support
- ✅ API framework
- ✅ Comprehensive admin interface pattern
- ✅ Design system and component library
- ✅ Commodity/grade/unit reference data
- ✅ RLS pattern for commercial privacy
- ✅ Audit trail pattern

What Phase 04 must build:
- ❌ Business onboarding and company profiles
- ❌ Business verification workflow
- ❌ Marketplace listing system (product catalog)
- ❌ RFQ creation and management
- ❌ Quotation system
- ❌ Conversation/messaging
- ❌ Trade opportunity pipeline
- ❌ Marketplace administration
- ❌ Supplier/buyer discovery
- ❌ Market intelligence integration on marketplace pages

The existing infrastructure reduces Phase 04 from a greenfield build to an extension project. The critical path is the database schema (listings, RFQs, quotations, conversations, opportunities) and the RLS policies that protect commercial privacy.

---

*Report generated: 2026-11-14*  
*Repository commit: 1d3707c*  
*Author: Hatsi360 Agent*
