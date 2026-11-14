# Agent Portal Rebuild Plan

**Date:** 2026-11-14  
**Status:** APPROVED  
**Phases:** B through H

---

## 1. Vision

Transform the Hatsi360 Agent Portal from a basic data-entry interface into a **modern, professional field operations workspace** that enables agricultural market agents to:

- Understand their daily responsibilities at a glance
- Collect prices efficiently from mobile devices
- Track submission status and verification feedback
- Monitor personal productivity and performance
- Work reliably even with intermittent connectivity

**Design Inspiration:**
- Modern logistics operations (Flexport, Convoy)
- Field service management (ServiceTitan, Jobber)
- Enterprise workforce apps (Salesforce Field Service)
- Mobile-first SaaS dashboards (Notion, Linear)

---

## 2. Implementation Phases

### Phase B — Agent Workspace Foundation (Current)

**Goal:** Rebuild the application shell and dashboard with professional design.

**Deliverables:**
1. New `AgentShell.tsx` with:
   - Brand-aligned design (forest green, gold accents)
   - SVG icons replacing emoji
   - Collapsible desktop sidebar
   - Mobile bottom navigation
   - Notification badge
   - Connectivity indicator
   - User profile menu

2. Redesigned Dashboard (`/agent/home`):
   - Greeting with time-based message
   - Today's assignments summary
   - Collection progress indicator
   - Quick action buttons
   - Recent activity feed
   - Operational metrics cards

3. Shared UI Components:
   - `AgentCard` — consistent card layout
   - `AgentBadge` — status indicators
   - `AgentEmptyState` — empty state patterns
   - `AgentSkeleton` — loading skeletons
   - `AgentProgress` — progress bars
   - `AgentToast` — toast notifications

**Files to Modify:**
- `src/components/agent/AgentShell.tsx` (rewrite)
- `src/app/agent/home/page.tsx` (rewrite)
- `src/components/agent/FieldUi.tsx` (extend)
- New: `src/components/agent/ui/` directory

**Estimate:** 4-6 hours

---

### Phase C — Assignment Management

**Goal:** Rebuild assignment listing and detail pages.

**Deliverables:**
1. Assignment listing with:
   - Card and list view toggle
   - Filters (today, upcoming, in-progress, completed, overdue)
   - Market and priority filters
   - Search functionality
   - Calendar view (optional)

2. Assignment detail page:
   - Market profile section
   - Commodity checklist
   - Collection requirements
   - Start collection CTA
   - Status timeline
   - Supervisor info (where permitted)

3. Status transitions:
   - Accept assignment
   - Start collection
   - Mark completed
   - Report issue

**Files to Modify:**
- `src/app/agent/assignments/page.tsx` (rewrite)
- `src/app/agent/assignments/[id]/page.tsx` (rewrite)
- `src/lib/operations/field.ts` (extend queries)

**Estimate:** 6-8 hours

---

### Phase D — Collection Experience

**Goal:** Mobile-optimise the price collection workflow.

**Deliverables:**
1. Mobile-optimised collection form:
   - Numeric keypad for price input
   - Currency and unit visibility
   - Progressive disclosure
   - Inline validation
   - Confirmation step

2. Improved evidence capture:
   - Camera integration
   - Image preview and management
   - Upload progress indicator
   - Retry on failure

3. Draft support:
   - Save incomplete observations
   - Resume from draft
   - Draft list view
   - Auto-save option

4. Location features (optional):
   - GPS coordinate capture
   - Distance from market
   - Location permission handling

**Files to Modify:**
- `src/components/agent/CollectionSession.tsx` (refactor)
- `src/components/agent/NewCollectionForm.tsx` (rewrite)
- `src/components/agent/EvidencePanel.tsx` (extend)
- New: `src/lib/agent/drafts.ts`

**Estimate:** 8-10 hours

---

### Phase E — Submission Management

**Goal:** Build comprehensive submission tracking.

**Deliverables:**
1. Submission listing:
   - Status tabs (All, Drafts, Submitted, Under Review, Approved, Rejected, Needs Correction)
   - Search and filters
   - Sorting options
   - Pagination

2. Submission detail:
   - Full observation information
   - Evidence gallery
   - Submission timeline
   - Verification feedback
   - Reviewer comments (where authorised)
   - Correction history
   - Resubmission action

3. Correction workflow:
   - Review feedback
   - Edit permitted fields
   - Add correction note
   - Resubmit

**Files to Modify:**
- `src/app/agent/submissions/page.tsx` (expand from stub)
- `src/app/agent/submissions/[id]/page.tsx` (new)
- `src/app/agent/corrections/page.tsx` (refactor)
- `src/components/agent/CorrectionForm.tsx` (extend)

**Estimate:** 6-8 hours

---

### Phase F — Field Productivity

**Goal:** Build performance monitoring and notifications.

**Deliverables:**
1. Performance dashboard:
   - Observations submitted (today, 7d, 30d, custom)
   - Approval rate
   - Rejection rate
   - Completion rate
   - Markets visited
   - Activity charts
   - Average review turnaround

2. Notification centre:
   - Read/unread states
   - Notification types with icons
   - Related page links
   - Mark as read (individual/all)
   - Notification preferences (future)

3. Support features:
   - Issue reporting form
   - Help documentation
   - Contact support

**Files to Modify:**
- `src/app/agent/performance/page.tsx` (extend)
- `src/app/agent/notifications/page.tsx` (rewrite)
- `src/app/agent/help/page.tsx` (extend)
- New: `src/components/agent/PerformanceCharts.tsx`

**Estimate:** 6-8 hours

---

### Phase G — Offline & Resilience

**Goal:** Add offline-first capabilities.

**Deliverables:**
1. Draft persistence:
   - Local storage for incomplete observations
   - Draft list in submissions
   - Resume from draft
   - Conflict handling

2. Offline queue:
   - Pending submissions queue
   - Sync status indicator
   - Retry on reconnection
   - Idempotency keys

3. Connectivity awareness:
   - Online/offline indicator
   - Sync status badges
   - Conflict resolution UI

**Files to Modify:**
- `src/lib/agent/offline-queue.ts` (complete)
- `src/lib/agent/use-field-queue.ts` (extend)
- New: `src/lib/agent/local-storage.ts`
- New: `src/components/agent/ConnectivityIndicator.tsx`

**Estimate:** 8-10 hours

**Note:** If robust offline functionality cannot be safely implemented, deliver reliable draft-first experience and document offline as future enhancement.

---

### Phase H — Security & Quality Assurance

**Goal:** Verify security, run tests, ensure quality.

**Deliverables:**
1. Security audit:
   - RLS policy verification
   - Agent isolation tests
   - Workflow validation tests
   - Penetration testing (basic)

2. Testing:
   - Unit tests for components
   - Integration tests for workflows
   - E2E tests for critical paths
   - Mobile responsive tests
   - Accessibility tests

3. Performance:
   - Bundle size audit
   - Load time optimisation
   - Image compression
   - Caching strategy

4. Documentation:
   - Final report
   - Deployment guide
   - User guide (agent-facing)

**Estimate:** 4-6 hours

---

## 3. Design System Integration

### 3.1 Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `brand-700` | #174d35 | Primary actions, sidebar |
| `brand-600` | #26734b | Buttons, active states |
| `harvest-500` | #d5a441 | Gold accents, highlights |
| `leaf-500` | #5b9a57 | Success, approved |
| `warning-500` | #d69e2e | Pending, caution |
| `error-500` | #c84b45 | Rejected, errors |
| `ink-900` | #202923 | Primary text |
| `ink-500` | #5a6760 | Secondary text |
| `ink-200` | #e3e9e2 | Borders |

### 3.2 Typography

- Display headings: Manrope (`--font-display`)
- Body text: Inter (`--font-sans`)
- Numeric data: Inter with `tabular-nums`

### 3.3 Spacing

- Page padding: 1.5rem (mobile), 2rem (desktop)
- Section spacing: 3rem (mobile), 4.5rem (desktop)
- Card padding: 1.25rem
- Component gaps: 0.75rem to 1.5rem

---

## 4. Mobile Strategy

### 4.1 Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 640px | Mobile-first, bottom navigation |
| 640-1024px | Tablet, collapsible sidebar |
| > 1024px | Desktop, persistent sidebar |

### 4.2 Touch Targets

- Minimum: 44x44px
- Buttons: 48px height
- Navigation items: 56px height
- Form inputs: 48px height

### 4.3 Gestures

- Swipe right: Back navigation
- Swipe left: Delete draft (with confirmation)
- Pull down: Refresh (future)
- Long press: Context menu (future)

---

## 5. Success Metrics

### 5.1 User Experience

- **Task completion rate:** > 90% of assignments completed on time
- **Collection time:** < 3 minutes per observation
- **Error rate:** < 5% rejection rate
- **Satisfaction:** > 4.0/5.0 agent satisfaction score

### 5.2 Technical

- **Load time:** < 2 seconds initial page load
- **Bundle size:** < 200KB initial JS
- **Accessibility:** WCAG 2.2 AA compliance
- **Test coverage:** > 80% component coverage

### 5.3 Business

- **Data quality:** > 95% verification approval rate
- **Agent retention:** > 90% monthly active agents
- **Market coverage:** Increase in markets with observations

---

## 6. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing workflows | Preserve core logic, only refactor UI |
| RLS policy conflicts | Test all queries with agent role |
| Mobile performance issues | Test on low-end Android devices |
| Offline data loss | Implement idempotency keys, conflict resolution |
| Agent confusion | Maintain route structure, provide onboarding |

---

## 7. Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase A (Audit) | ✅ Complete | 2026-11-14 | 2026-11-14 |
| Phase B (Foundation) | 1 week | 2026-11-14 | 2026-11-21 |
| Phase C (Assignments) | 1 week | 2026-11-21 | 2026-11-28 |
| Phase D (Collection) | 1.5 weeks | 2026-11-28 | 2026-12-09 |
| Phase E (Submissions) | 1 week | 2026-12-09 | 2026-12-16 |
| Phase F (Productivity) | 1 week | 2026-12-16 | 2026-12-23 |
| Phase G (Offline) | 1.5 weeks | 2026-12-23 | 2027-01-06 |
| Phase H (QA) | 1 week | 2027-01-06 | 2027-01-13 |

**Total estimated duration:** 8 weeks

---

## 8. Dependencies

### 8.1 External

- Supabase (authentication, database, storage)
- Next.js 16 (framework)
- Tailwind CSS v4 (styling)
- React 19 (UI library)

### 8.2 Internal

- Existing agent authentication system
- Market assignment workflow
- Price observation schema
- Verification pipeline
- Notification system

---

## 9. Team Roles

| Role | Responsibilities |
|------|------------------|
| Product Designer | UI/UX design, component library |
| Frontend Engineer | Component implementation, state management |
| Backend Engineer | API endpoints, database queries |
| QA Engineer | Testing, accessibility, performance |
| DevOps | Deployment, monitoring |

---

## 10. Approval

**Prepared by:** Arena Design & Engineering Agent  
**Date:** 2026-11-14  
**Status:** Ready for Phase B implementation

---

**Next Step:** Begin Phase B — Agent Workspace Foundation
