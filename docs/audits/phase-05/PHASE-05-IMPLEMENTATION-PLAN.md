# Phase 05 — Business Workspace: Implementation Plan

**Date:** 2026-11-14  
**Phase:** 05 — Business Workspace  
**Status:** Stage 1 Complete (Architecture)  
**Architect:** Hatsi360 Agent  
**Repository Commit:** 1a6644d  
**Depends On:** Baseline Audit (PHASE-05-BASELINE-AUDIT.md)

---

## Executive Summary

This implementation plan outlines the architecture and delivery strategy for Phase 05 — Business Workspace, a comprehensive business operating environment for agricultural companies on the Hatsi360 platform.

**Key Decision:** Two-track implementation approach

- **Track A:** Build workspace foundation immediately (shell, navigation, organization context, team, settings, notifications)
- **Track B:** Implement critical Phase 04 marketplace foundations as prerequisites (organizations extension, business profiles, listings, RFQs, quotations)

**Rationale:** The workspace depends on Phase 04 entities (suppliers, customers, procurement, sales, orders) that don't exist yet. Building the workspace foundation in parallel with Phase 04 foundations reduces overall timeline and enables incremental delivery.

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    HATSI360 PLATFORM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Market     │  │  Commodity   │  │    Trade     │      │
│  │   Terminal   │  │ Intelligence │  │   Analytics  │      │
│  │  (Phase 02)  │  │  (Phase 03)  │  │  (Phase 02)  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └────────────┬────┴──────────────────┘               │
│                      │                                       │
│  ┌───────────────────┴──────────────────────────────────┐   │
│  │              SHARED FOUNDATIONS                        │   │
│  │  Auth · Entitlements · Notifications · Storage · API  │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────┴──────────────────────────────────┐   │
│  │           PHASE 04: B2B MARKETPLACE                   │   │
│  │  Business Profiles · Listings · RFQs · Quotations     │   │
│  │  Enquiries · Conversations · Opportunities            │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│  ┌───────────────────┴──────────────────────────────────┐   │
│  │         PHASE 05: BUSINESS WORKSPACE                  │   │
│  │                                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │Supplier │ │Customer │ │Procure- │ │  Sales  │   │   │
│  │  │   Mgmt  │ │   CRM   │ │  ment   │ │Pipeline │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  │                                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ Orders  │ │Inventory│ │Documents│ │Analytics│   │   │
│  │  │& Fulfill│ │   Vis.  │ │   Mgmt  │ │& Report │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ Workspace Shell · Navigation · Org Context       │ │   │
│  │  │ Team Management · Settings · Notifications       │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Workspace Modules

**Foundation (Track A - Immediate):**
1. Workspace shell and layout
2. Organization context and switching
3. Team management
4. User preferences
5. Notification center
6. Basic dashboard
7. Settings

**Business Modules (Track B - After Phase 04 foundations):**
8. Suppliers management
9. Customers management (CRM)
10. Procurement
11. Sales pipeline
12. Orders & fulfillment
13. Inventory visibility
14. Document management
15. Analytics & reporting

### 1.3 Technology Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **State:** React Query (TanStack Query)
- **Forms:** React Hook Form + Zod
- **Testing:** Vitest
- **Deployment:** Vercel

### 1.4 Routing Strategy

**Workspace Routes:**
```
/workspace                          → Dashboard
/workspace/suppliers                → Supplier directory
/workspace/suppliers/[id]           → Supplier detail
/workspace/customers                → Customer directory (CRM)
/workspace/customers/[id]           → Customer detail
/workspace/procurement              → Procurement requests
/workspace/procurement/[id]         → Procurement detail
/workspace/sales                    → Sales overview
/workspace/sales/opportunities      → Sales pipeline
/workspace/sales/opportunities/[id] → Opportunity detail
/workspace/orders                   → Orders
/workspace/orders/[id]              → Order detail
/workspace/documents                → Document repository
/workspace/analytics                → Analytics dashboard
/workspace/team                     → Team management
/workspace/settings                 → Settings
/workspace/settings/organization    → Organization settings
```

**Route Group:** `(workspace)` — authenticated, organization-scoped

### 1.5 Layout Architecture

```
src/app/(workspace)/
├── layout.tsx              → Workspace layout (sidebar, header, etc.)
├── loading.tsx             → Workspace loading state
├── page.tsx                → Dashboard
└── [module]/
    ├── layout.tsx          → Module-specific layout (optional)
    ├── page.tsx            → Module list view
    └── [id]/
        └── page.tsx        → Module detail view
```

---

## 2. Database Architecture

### 2.1 Migration Strategy

**Phase 05 Migrations:**

| Migration | Purpose | Dependencies |
|-----------|---------|--------------|
| 0044_workspace_organization_extension | Extend organizations with business profile fields | None |
| 0045_workspace_permissions | Organization roles and permissions | 0044 |
| 0046_workspace_notifications | Workspace notification kinds | 0044 |
| 0047_workspace_documents | Document management tables | 0044 |
| 0048_workspace_procurement | Procurement request tables | 0044 |
| 0049_workspace_inventory | Inventory tracking tables | 0044 |
| 0050_workspace_entitlements | Workspace entitlements | None |

**Phase 04 Foundation Migrations (if implementing Track B):**

| Migration | Purpose | Dependencies |
|-----------|---------|--------------|
| 0034_marketplace_organizations | Business profiles (if separate from 0044) | None |
| 0035_marketplace_listings | Product listings | 0034 |
| 0036_marketplace_rfqs | RFQs | 0034, 0035 |
| 0037_marketplace_quotations | Quotations | 0035, 0036 |
| 0038_marketplace_communications | Enquiries, conversations | 0034 |
| 0039_marketplace_opportunities | Trade opportunities | 0034, 0037 |

### 2.2 Organization Extension (Migration 0044)

**Extend `organizations` table:**

```sql
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS
  trading_name TEXT,
  description TEXT,
  business_type TEXT,
  business_roles TEXT[] DEFAULT '{}',
  country_id BIGINT REFERENCES public.countries(id),
  state_id BIGINT REFERENCES public.states(id),
  city TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  year_established INTEGER,
  registration_number TEXT,
  tax_identification TEXT,
  commodities_handled BIGINT[] DEFAULT '{}',
  markets_operated BIGINT[] DEFAULT '{}',
  verification_status TEXT DEFAULT 'not_submitted',
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  is_published BOOLEAN DEFAULT false;
```

**Rationale:** Extending organizations is simpler than creating a separate business_profiles table. The organization IS the business in this context.

### 2.3 Organization Roles (Migration 0045)

**New enum:**

```sql
CREATE TYPE public.organization_role AS ENUM (
  'owner',           → Full control, billing, settings
  'admin',           → Manage team, approve workflows
  'manager',         → Manage specific modules
  'member',          → Standard access
  'viewer'           → Read-only access
);
```

**Update `organization_members`:**

```sql
ALTER TABLE public.organization_members
  DROP COLUMN role_in_org,
  ADD COLUMN role organization_role NOT NULL DEFAULT 'member';
```

**New table:**

```sql
CREATE TABLE public.organization_permissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, permission)
);
```

**Permission keys:**

```
workspace.view
procurement.view
procurement.create
procurement.approve
suppliers.view
suppliers.manage
customers.view
customers.manage
sales.view
sales.manage
orders.view
orders.manage
inventory.view
inventory.manage
documents.view
documents.manage
analytics.view
team.manage
settings.manage
```

### 2.4 Documents Table (Migration 0047)

```sql
CREATE TABLE public.business_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Document metadata
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,  -- contract, invoice, certificate, specification, etc.
  
  -- File reference
  storage_path TEXT NOT NULL,  -- Supabase Storage path
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Linking
  linked_entity_type TEXT,  -- supplier, customer, procurement, order, etc.
  linked_entity_id UUID,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',  -- active, archived, expired
  expires_at TIMESTAMPTZ,
  
  -- Audit
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_documents_org ON public.business_documents(organization_id);
CREATE INDEX idx_business_documents_category ON public.business_documents(category);
CREATE INDEX idx_business_documents_linked ON public.business_documents(linked_entity_type, linked_entity_id);
```

### 2.5 Procurement Requests Table (Migration 0048)

```sql
CREATE TABLE public.procurement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Request details
  title TEXT NOT NULL,
  description TEXT,
  commodity_id BIGINT NOT NULL REFERENCES public.commodities(id),
  grade_id BIGINT REFERENCES public.commodity_grades(id),
  quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  unit_id BIGINT NOT NULL REFERENCES public.measurement_units(id),
  target_price NUMERIC(18,4),
  currency_code CHAR(3) NOT NULL DEFAULT 'NGN',
  
  -- Delivery
  delivery_location TEXT,
  delivery_date DATE,
  
  -- Workflow
  status TEXT NOT NULL DEFAULT 'draft',  -- draft, pending_approval, approved, sourcing, quoted, ordered, completed, cancelled
  priority TEXT NOT NULL DEFAULT 'normal',  -- low, normal, high, urgent
  
  -- Approval
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  
  -- Linking
  rfq_id UUID,  -- Will reference marketplace_rfqs when Phase 04 implemented
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_procurement_requests_org ON public.procurement_requests(organization_id);
CREATE INDEX idx_procurement_requests_status ON public.procurement_requests(status);
CREATE INDEX idx_procurement_requests_commodity ON public.procurement_requests(commodity_id);
```

### 2.6 RLS Policies

**Organization-scoped access:**

```sql
-- Users can only access their organization's data
CREATE POLICY org_isolation_procurement ON public.procurement_requests
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Users can only access their organization's documents
CREATE POLICY org_isolation_documents ON public.business_documents
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

**Permission-based access:**

```sql
-- Only users with procurement.create can create requests
CREATE POLICY procurement_create ON public.procurement_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_permissions
      WHERE organization_id = NEW.organization_id
        AND user_id = auth.uid()
        AND permission = 'procurement.create'
        AND granted = true
    )
  );
```

---

## 3. Service Layer Architecture

### 3.1 Service Modules

**Location:** `src/lib/workspace/`

```
src/lib/workspace/
├── organizations.ts       → Organization CRUD, profile management
├── permissions.ts         → Permission checks, role management
├── suppliers.ts           → Supplier relationship management
├── customers.ts           → Customer relationship management (CRM)
├── procurement.ts         → Procurement request management
├── sales.ts               → Sales pipeline management
├── orders.ts              → Order management
├── inventory.ts           → Inventory tracking
├── documents.ts           → Document management
├── analytics.ts           → Analytics calculations
├── notifications.ts       → Workspace notifications
└── entitlements.ts        → Workspace entitlement checks
```

### 3.2 Service Pattern

**Example: organizations.ts**

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Organization } from '@/types/domain';

export async function getOrganization(id: string): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      organization:organizations(*)
    `)
    .eq('user_id', userId);
  
  if (error || !data) return [];
  return data.map(m => m.organization);
}

export async function updateOrganization(
  id: string, 
  updates: Partial<Organization>
): Promise<Organization | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) return null;
  return data;
}
```

### 3.3 Permission Checks

**Example: permissions.ts**

```typescript
export async function hasPermission(
  organizationId: string,
  userId: string,
  permission: string
): Promise<boolean> {
  const supabase = await createClient();
  
  // Check explicit permission
  const { data: explicit } = await supabase
    .from('organization_permissions')
    .select('granted')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('permission', permission)
    .single();
  
  if (explicit) return explicit.granted;
  
  // Check role-based permission
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();
  
  if (!member) return false;
  
  // Role hierarchy
  const rolePermissions: Record<string, string[]> = {
    owner: ['*'],  // All permissions
    admin: ['workspace.view', 'team.manage', 'settings.manage', /* ... */],
    manager: ['workspace.view', /* module-specific */],
    member: ['workspace.view'],
    viewer: ['workspace.view']
  };
  
  const perms = rolePermissions[member.role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}
```

---

## 4. Component Architecture

### 4.1 Component Structure

**Location:** `src/components/workspace/`

```
src/components/workspace/
├── shell/
│   ├── WorkspaceShell.tsx       → Main workspace layout
│   ├── Sidebar.tsx              → Navigation sidebar
│   ├── Header.tsx               → Top header with org switcher
│   └── OrganizationSwitcher.tsx → Organization selector
├── dashboard/
│   ├── Dashboard.tsx            → Dashboard container
│   ├── StatCard.tsx             → Metric card
│   ├── RecentActivity.tsx       → Activity feed
│   └── QuickActions.tsx         → Quick action buttons
├── suppliers/
│   ├── SupplierList.tsx         → Supplier directory
│   ├── SupplierCard.tsx         → Supplier summary card
│   └── SupplierDetail.tsx       → Supplier detail view
├── customers/
│   ├── CustomerList.tsx         → Customer directory
│   ├── CustomerCard.tsx         → Customer summary card
│   └── CustomerDetail.tsx       → Customer detail view
├── procurement/
│   ├── ProcurementList.tsx      → Procurement requests
│   ├── ProcurementCard.tsx      → Request summary
│   ├── ProcurementForm.tsx      → Create/edit form
│   └── ApprovalWorkflow.tsx     → Approval UI
├── sales/
│   ├── SalesPipeline.tsx        → Pipeline view
│   ├── OpportunityCard.tsx      → Opportunity summary
│   └── OpportunityDetail.tsx    → Opportunity detail
├── orders/
│   ├── OrderList.tsx            → Order directory
│   ├── OrderCard.tsx            → Order summary
│   └── OrderDetail.tsx          → Order detail
├── documents/
│   ├── DocumentList.tsx         → Document repository
│   ├── DocumentCard.tsx         → Document summary
│   └── DocumentUpload.tsx       → Upload component
├── analytics/
│   ├── AnalyticsDashboard.tsx   → Analytics container
│   ├── MetricChart.tsx          → Chart component
│   └── ReportTable.tsx          → Data table
├── team/
│   ├── TeamList.tsx             → Team members
│   ├── MemberCard.tsx           → Member summary
│   └── InviteForm.tsx           → Invite form
└── common/
    ├── EntityHeader.tsx         → Common header for entities
    ├── StatusBadge.tsx          → Status indicator
    ├── Timeline.tsx             → Activity timeline
    ├── EmptyState.tsx           → Empty state component
    └── LoadingState.tsx         → Loading skeleton
```

### 4.2 Component Pattern

**Example: SupplierCard.tsx**

```typescript
import Link from 'next/link';
import { formatCurrency } from '@/lib/format';
import type { Supplier } from '@/types/workspace';

interface SupplierCardProps {
  supplier: Supplier;
}

export function SupplierCard({ supplier }: SupplierCardProps) {
  return (
    <Link 
      href={`/workspace/suppliers/${supplier.id}`}
      className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {supplier.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {supplier.city}, {supplier.state}
          </p>
        </div>
        <StatusBadge status={supplier.verificationStatus} />
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Commodities</p>
          <p className="text-sm font-medium text-gray-900">
            {supplier.commodities.length}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Active Orders</p>
          <p className="text-sm font-medium text-gray-900">
            {supplier.activeOrders}
          </p>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {supplier.commodities.slice(0, 3).map(c => (
            <span 
              key={c.id}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {c.name}
            </span>
          ))}
        </div>
        <span className="text-sm text-blue-600 font-medium">
          View →
        </span>
      </div>
    </Link>
  );
}
```

---

## 5. Implementation Phases

### Phase 5.1: Workspace Foundation (Week 1-2)

**Deliverables:**
- [ ] Workspace layout and shell
- [ ] Organization context and switching
- [ ] Team management (view, invite, roles)
- [ ] User preferences
- [ ] Notification center
- [ ] Basic dashboard with stats
- [ ] Settings page
- [ ] Organization settings

**Database:**
- [ ] Migration 0044: Extend organizations
- [ ] Migration 0045: Organization roles and permissions
- [ ] Migration 0046: Workspace notifications

**Services:**
- [ ] organizations.ts
- [ ] permissions.ts
- [ ] notifications.ts

**Components:**
- [ ] WorkspaceShell
- [ ] Sidebar
- [ ] Header
- [ ] OrganizationSwitcher
- [ ] Dashboard
- [ ] TeamList
- [ ] NotificationCenter

**Tests:**
- [ ] Organization CRUD
- [ ] Permission checks
- [ ] Tenant isolation

**Gate 1:** Workspace foundation functional, organization context working

### Phase 5.2: Phase 04 Foundations (Week 2-4)

**Deliverables:**
- [ ] Business profile management
- [ ] Product listings (basic)
- [ ] RFQs (basic)
- [ ] Quotations (basic)
- [ ] Business verification workflow

**Database:**
- [ ] Migration 0034: Business profiles (if separate)
- [ ] Migration 0035: Listings
- [ ] Migration 0036: RFQs
- [ ] Migration 0037: Quotations

**Services:**
- [ ] listings.ts
- [ ] rfqs.ts
- [ ] quotations.ts

**Components:**
- [ ] ListingForm
- [ ] ListingList
- [ ] RFQForm
- [ ] RFQList
- [ ] QuotationForm
- [ ] QuotationList

**Tests:**
- [ ] Listing CRUD
- [ ] RFQ workflow
- [ ] Quotation workflow
- [ ] RLS policies

**Gate 2:** Marketplace foundations operational, can create listings and RFQs

### Phase 5.3: Workspace Business Modules (Week 4-8)

**Deliverables:**
- [ ] Suppliers management
- [ ] Customers management (CRM)
- [ ] Procurement requests
- [ ] Sales pipeline
- [ ] Orders & fulfillment
- [ ] Inventory visibility
- [ ] Document management
- [ ] Analytics dashboard

**Database:**
- [ ] Migration 0047: Documents
- [ ] Migration 0048: Procurement
- [ ] Migration 0049: Inventory

**Services:**
- [ ] suppliers.ts
- [ ] customers.ts
- [ ] procurement.ts
- [ ] sales.ts
- [ ] orders.ts
- [ ] inventory.ts
- [ ] documents.ts
- [ ] analytics.ts

**Components:**
- [ ] SupplierList, SupplierCard, SupplierDetail
- [ ] CustomerList, CustomerCard, CustomerDetail
- [ ] ProcurementList, ProcurementForm
- [ ] SalesPipeline, OpportunityCard
- [ ] OrderList, OrderCard, OrderDetail
- [ ] InventoryList
- [ ] DocumentList, DocumentUpload
- [ ] AnalyticsDashboard

**Tests:**
- [ ] All module CRUD
- [ ] Workflow tests
- [ ] Integration tests

**Gate 3:** All business modules functional

### Phase 5.4: Integration & Polish (Week 8-10)

**Deliverables:**
- [ ] Commodity intelligence widgets
- [ ] Advanced analytics
- [ ] Workflow automation
- [ ] Performance optimization
- [ ] Testing and QA
- [ ] Documentation
- [ ] User acceptance testing

**Services:**
- [ ] Integrate Phase 03 data (when available)
- [ ] analytics.ts enhancements
- [ ] automation.ts

**Components:**
- [ ] CommodityPriceWidget
- [ ] SeasonalityWidget
- [ ] ProductionWidget
- [ ] Advanced charts

**Tests:**
- [ ] E2E tests for critical paths
- [ ] Performance tests
- [ ] Security audit

**Gate 4:** Production ready

---

## 6. Security Architecture

### 6.1 Authentication

**Provider:** Supabase Auth  
**Method:** Email/password + session tokens  
**Session:** Server-side cookies

**Flow:**
1. User logs in via `/login`
2. Supabase issues JWT token
3. Token stored in HttpOnly cookie
4. Server validates token on each request
5. RLS policies use `auth.uid()` for user context

### 6.2 Authorization

**Three layers:**
1. **Route-level:** Next.js middleware checks authentication
2. **Organization-level:** RLS policies check organization membership
3. **Permission-level:** Service layer checks granular permissions

**Example flow:**
```
User request
  ↓
Middleware: Is user authenticated? (auth.uid() exists?)
  ↓
RLS: Is user in this organization? (organization_members check)
  ↓
Service: Does user have this permission? (organization_permissions check)
  ↓
Execute operation
```

### 6.3 Tenant Isolation

**Strategy:** Organization-scoped RLS

**Every business table includes:**
```sql
organization_id UUID NOT NULL REFERENCES public.organizations(id)
```

**Every RLS policy includes:**
```sql
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
)
```

**Testing:**
- User A in Org A cannot access Org B's data
- User with viewer role cannot modify data
- Admin can manage team but not billing
- Owner has full control

### 6.4 Data Protection

**Sensitive data:**
- Financial data (prices, amounts) → encrypted at rest
- Personal data (emails, phones) → access logged
- Documents → stored in private bucket with signed URLs
- API keys → hashed, never stored in plaintext

**Audit logging:**
- All mutations logged with user_id, timestamp, action
- Logs immutable (append-only)
- Accessible to org admins and platform admins

---

## 7. Performance Strategy

### 7.1 Database Optimization

**Indexes:**
- All foreign keys indexed
- Frequently queried columns indexed (status, organization_id, created_at)
- Composite indexes for common queries

**Query optimization:**
- Use `select()` with specific columns (avoid `*`)
- Use `limit()` for lists
- Use `order()` with indexed columns
- Avoid N+1 queries (use joins or batch queries)

**Connection pooling:**
- Supabase connection pooling enabled
- Reuse connections across requests

### 7.2 Caching Strategy

**React Query:**
- Cache API responses client-side
- Stale-while-revalidate pattern
- Configurable cache times per query type

**Server-side:**
- Static generation for public pages
- ISR for semi-static content
- No caching for authenticated data

### 7.3 Code Splitting

**Route-based:**
- Each route is a separate chunk
- Lazy load non-critical components

**Component-level:**
- Dynamic imports for heavy components (charts, maps)
- Lazy load modals and dialogs

### 7.4 Image Optimization

**Next.js Image:**
- Automatic optimization
- Lazy loading
- Responsive sizes

**Storage:**
- Store images in Supabase Storage
- Use signed URLs
- Generate thumbnails server-side

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Coverage targets:**
- Services: 80%+
- Utilities: 90%+
- Components: 70%+

**Example: procurement.test.ts**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createProcurementRequest, getProcurementRequest } from './procurement';

describe('procurement service', () => {
  it('creates a procurement request', async () => {
    const request = await createProcurementRequest({
      organizationId: 'org-1',
      title: 'Buy maize',
      commodityId: 1,
      quantity: 100,
      unitId: 1,
    });
    
    expect(request.id).toBeDefined();
    expect(request.title).toBe('Buy maize');
  });
  
  it('enforces tenant isolation', async () => {
    const request = await createProcurementRequest({
      organizationId: 'org-1',
      // ...
    });
    
    // User in org-2 cannot access
    const result = await getProcurementRequest(request.id, 'user-in-org-2');
    expect(result).toBeNull();
  });
});
```

### 8.2 Integration Tests

**Test scenarios:**
- Create organization and invite members
- Create procurement request and approve
- Create listing and receive quotation
- Upload document and link to entity

**Example:**

```typescript
describe('procurement workflow', () => {
  it('creates, approves, and fulfills a procurement request', async () => {
    // Create request
    const request = await createProcurementRequest({ /* ... */ });
    expect(request.status).toBe('draft');
    
    // Request approval
    await submitForApproval(request.id);
    const submitted = await getProcurementRequest(request.id);
    expect(submitted.status).toBe('pending_approval');
    
    // Approve
    await approveProcurementRequest(request.id, 'approver-user');
    const approved = await getProcurementRequest(request.id);
    expect(approved.status).toBe('approved');
  });
});
```

### 8.3 E2E Tests

**Critical paths:**
- Login → Dashboard → Create procurement → Approve
- Login → Dashboard → Create listing → Receive quotation
- Login → Dashboard → Upload document → Link to order

**Tool:** Playwright (recommended) or Cypress

**Example:**

```typescript
test('procurement workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'user@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Navigate to procurement
  await page.click('text=Procurement');
  
  // Create request
  await page.click('text=New Request');
  await page.fill('[name="title"]', 'Buy maize');
  await page.fill('[name="quantity"]', '100');
  await page.click('text=Submit');
  
  // Verify
  await expect(page.locator('text=Buy maize')).toBeVisible();
  await expect(page.locator('text=Pending Approval')).toBeVisible();
});
```

### 8.4 Security Tests

**Test scenarios:**
- Tenant isolation (User A cannot access User B's org data)
- Permission enforcement (viewer cannot edit)
- RLS policy validation
- API authentication
- Session management

**Example:**

```typescript
describe('tenant isolation', () => {
  it('prevents cross-organization access', async () => {
    const org1User = await createUser({ organizationId: 'org-1' });
    const org2User = await createUser({ organizationId: 'org-2' });
    
    const org1Request = await createProcurementRequest({
      organizationId: 'org-1',
      userId: org1User.id,
      // ...
    });
    
    // Org2 user cannot access org1's request
    const result = await getProcurementRequest(
      org1Request.id, 
      org2User.id
    );
    
    expect(result).toBeNull();
  });
});
```

---

## 9. Deployment Strategy

### 9.1 Environment Strategy

**Development:**
- Local Supabase instance
- Local Next.js dev server
- Hot reload enabled

**Staging:**
- Supabase project (staging)
- Vercel preview deployments
- Test data seeded

**Production:**
- Supabase project (production)
- Vercel production deployment
- Real data

### 9.2 Migration Strategy

**Database migrations:**
- Run via Supabase CLI
- Tested in staging before production
- Rollback scripts prepared

**Deployment flow:**
1. Merge to main
2. Vercel builds preview
3. Run migrations in staging
4. Test in staging
5. Promote to production
6. Run migrations in production
7. Monitor for issues

### 9.3 Monitoring

**Metrics:**
- Page load times
- API response times
- Error rates
- Database query performance

**Tools:**
- Vercel Analytics
- Supabase Dashboard
- Sentry (error tracking)

**Alerts:**
- Error rate > 1%
- API latency > 2s
- Database connection failures

---

## 10. Documentation Requirements

### 10.1 Technical Documentation

**Required docs:**
- `PHASE-05-ARCHITECTURE.md` — System architecture
- `PHASE-05-DATABASE-DESIGN.md` — Database schema
- `PHASE-05-API-REFERENCE.md` — API endpoints
- `PHASE-05-SECURITY-AND-RLS.md` — Security model
- `PHASE-05-TEST-REPORT.md` — Test results

### 10.2 User Documentation

**Required docs:**
- Workspace user guide
- Module-specific guides (procurement, sales, etc.)
- FAQ
- Troubleshooting guide

### 10.3 Developer Documentation

**Required docs:**
- Setup guide
- Development workflow
- Code style guide
- Testing guide
- Deployment guide

---

## 11. Risk Mitigation

### 11.1 Dependency Risk

**Risk:** Phase 04 not implemented, blocking workspace business modules

**Mitigation:**
- Two-track approach: build foundation (Track A) while Phase 04 foundations built (Track B)
- Use placeholder data for business modules until Phase 04 ready
- Clearly document dependencies in each module

### 11.2 Scope Creep Risk

**Risk:** Too many features, delayed delivery

**Mitigation:**
- Strict stage gates
- MVP focus for each phase
- Defer "nice-to-have" features to Phase 06+

### 11.3 Performance Risk

**Risk:** Slow page loads, poor UX

**Mitigation:**
- Code splitting and lazy loading
- Database query optimization
- Caching strategy
- Performance testing in Phase 5.4

### 11.4 Security Risk

**Risk:** Data leakage, unauthorized access

**Mitigation:**
- Comprehensive RLS policies
- Tenant isolation testing
- Permission enforcement testing
- Security audit in Phase 5.4

---

## 12. Success Criteria

### 12.1 Functional Criteria

- [ ] Workspace shell renders and navigates
- [ ] Organization context works (switching, isolation)
- [ ] Team management functional (invite, roles, permissions)
- [ ] All business modules CRUD operational
- [ ] Procurement workflow complete (create → approve → fulfill)
- [ ] Sales workflow complete (lead → opportunity → won/lost)
- [ ] Document management works (upload, link, access control)
- [ ] Analytics display correctly
- [ ] Notifications delivered

### 12.2 Technical Criteria

- [ ] TypeScript strict mode, no errors
- [ ] ESLint clean
- [ ] Build successful
- [ ] Test coverage 70%+ (services 80%+)
- [ ] All tests passing
- [ ] Page load < 3s
- [ ] API response < 500ms
- [ ] RLS policies tested and enforced
- [ ] Tenant isolation verified

### 12.3 Product Criteria

- [ ] User can manage suppliers
- [ ] User can manage customers (CRM)
- [ ] User can create and approve procurement requests
- [ ] User can track sales pipeline
- [ ] User can manage orders
- [ ] User can upload and link documents
- [ ] User can view analytics
- [ ] User receives notifications
- [ ] User can manage team

---

## 13. Conclusion

### 13.1 Key Decisions

1. **Two-track implementation:** Build workspace foundation (Track A) in parallel with Phase 04 foundations (Track B)
2. **Extend organizations table:** Rather than separate business_profiles table
3. **Granular permissions:** Beyond role-based access control
4. **Organization-scoped RLS:** Every business table includes organization_id
5. **React Query for state:** Client-side caching and synchronization
6. **Supabase Storage for documents:** Private bucket with signed URLs

### 13.2 Implementation Timeline

- **Week 1-2:** Workspace foundation (Track A)
- **Week 2-4:** Phase 04 foundations (Track B)
- **Week 4-8:** Workspace business modules
- **Week 8-10:** Integration, testing, polish

**Total:** 10 weeks to production-ready workspace

### 13.3 Next Steps

1. **Get approval** for two-track implementation strategy
2. **Begin Phase 5.1:** Workspace foundation
3. **Simultaneously begin Phase 04 foundations** (if approved)
4. **Daily standups** to track progress
5. **Weekly demos** to validate direction

---

**End of Implementation Plan**
