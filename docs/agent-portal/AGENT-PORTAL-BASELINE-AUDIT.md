# Agent Portal — Phase A: Baseline Audit

**Date:** 2026-11-14  
**Auditor:** Arena Design & Engineering Agent  
**Status:** COMPLETE

---

## 1. Executive Summary

The existing Hatsi360 Agent Portal is a **functional but dated field operations interface** built for agricultural market data collection. The portal contains the core infrastructure (authentication, assignment management, collection flow, evidence capture, submissions) but suffers from:

- **Outdated visual design** — emoji icons (⌂, ☑, ＋, ≡, ☺), inconsistent styling
- **Limited interactivity** — minimal animations, no skeleton states, basic forms
- **Weak mobile experience** — not optimised for field conditions
- **Missing productivity features** — no performance dashboard, limited notifications
- **No offline resilience** — no draft persistence or sync handling

**Current state:** Functional MVP suitable for internal use, not yet a professional field operations product.

---

## 2. Architecture Overview

### 2.1 Route Structure (19 routes)

| Route | Purpose | Lines | Status |
|-------|---------|-------|--------|
| `/agent` | Redirect → `/agent/home` | — | ✅ |
| `/agent/home` | Agent dashboard | 352 | ⚠️ Basic |
| `/agent/assignments` | Assignment listing | 156 | ⚠️ Basic |
| `/agent/assignments/[id]` | Assignment detail | — | ⚠️ Minimal |
| `/agent/collect` | Collect prices | 13 | ✅ Redirect |
| `/agent/collection/new` | New collection | — | ⚠️ Basic |
| `/agent/collection/[id]` | Collection detail | — | ⚠️ Basic |
| `/agent/corrections` | Correction workflow | 144 | ⚠️ Functional |
| `/agent/help` | Help & support | 134 | ⚠️ Basic |
| `/agent/history` | Collection history | — | ⚠️ Basic |
| `/agent/markets` | Markets | — | ⚠️ Basic |
| `/agent/markets/[id]` | Market detail | — | ⚠️ Basic |
| `/agent/notifications` | Notifications | 55 | ⚠️ Basic |
| `/agent/observations` | Observations | — | ⚠️ Basic |
| `/agent/observations/[id]` | Observation detail | — | ⚠️ Basic |
| `/agent/performance` | Performance metrics | 185 | ⚠️ Basic |
| `/agent/profile` | Agent profile | 143 | ⚠️ Basic |
| `/agent/submissions` | Submission management | 12 | ⚠️ Stub |
| `/agent/tasks` | Task management | — | ⚠️ Minimal |

### 2.2 Component Inventory (10 files, ~3,045 lines)

| Component | Lines | Purpose | Status |
|-----------|-------|---------|--------|
| `CollectionSession.tsx` | 1,132 | Core collection workflow | ✅ Functional |
| `CollectionFlow.tsx` | 780 | Collection flow control | ✅ Functional |
| `FieldUi.tsx` | 217 | Field UI primitives | ⚠️ Basic |
| `NewCollectionForm.tsx` | 285 | New collection form | ✅ Functional |
| `CorrectionForm.tsx` | 171 | Correction workflow | ✅ Functional |
| `EvidencePanel.tsx` | 182 | Evidence capture | ✅ Functional |
| `AgentShell.tsx` | 131 | Application shell | ⚠️ Basic |
| `NotificationList.tsx` | 118 | Notifications | ⚠️ Basic |
| `TaskControls.tsx` | 108 | Task actions | ⚠️ Basic |
| `ProfileForm.tsx` | 91 | Profile editing | ⚠️ Basic |

### 2.3 Library Files

| File | Purpose |
|------|---------|
| `src/lib/operations/field.ts` | Field operations queries |
| `src/lib/operations/agent.ts` | Agent-specific queries |
| `src/lib/operations/field-actions.ts` | Field action handlers |
| `src/lib/operations/field-constants.ts` | Field constants |
| `src/lib/auth/guards.ts` | Agent authentication guard |
| `src/lib/agent/offline-queue.ts` | Offline queue (exists but unclear integration) |
| `src/lib/agent/use-field-queue.ts` | Field queue hook |

---

## 3. Current Functionality Assessment

### 3.1 What Works

| Feature | Status | Notes |
|---------|--------|-------|
| Agent authentication | ✅ Working | Uses `requireAgent()` guard |
| Role-based access | ✅ Working | Agent & market_supervisor only |
| Assignment listing | ✅ Working | Basic table view |
| Collection workflow | ✅ Working | Full commodity → price → evidence flow |
| Evidence upload | ✅ Working | Camera capture, multiple images |
| Observation submission | ✅ Working | Goes through verification pipeline |
| Correction workflow | ✅ Working | Review feedback, resubmit |
| Notifications | ✅ Working | Basic list |
| Profile management | ✅ Working | Name, photo, contact |
| Performance metrics | ✅ Working | Basic stats |

### 3.2 What is Partially Implemented

| Feature | Status | Gap |
|---------|--------|-----|
| Draft support | ⚠️ Partial | `offline-queue.ts` exists but unclear UI integration |
| Offline sync | ⚠️ Partial | Queue exists but no sync status UI |
| Task management | ⚠️ Partial | Basic controls, no full task workflow |
| Assignment detail | ⚠️ Partial | Minimal page, missing market profile, commodity checklist |
| Market detail | ⚠️ Partial | Basic info only |
| Submission history | ⚠️ Partial | Limited filtering and detail view |
| Search | ⚠️ Partial | No global search in agent portal |

### 3.3 What is Missing

| Feature | Impact | Priority |
|---------|--------|----------|
| Interactive dashboard | High — agents can't see day at a glance | P0 |
| Modern navigation | Medium — emoji icons, no brand identity | P1 |
| Mobile-optimised forms | High — field agents use phones | P0 |
| Skeleton loading states | Medium — blank screens on load | P2 |
| Empty states | Medium — confusing when no data | P2 |
| Connectivity indicator | Medium — agents need to know sync status | P2 |
| Progress indicators | Medium — no visual feedback during collection | P2 |
| Toast notifications | Low — no success/error feedback | P3 |
| Geolocation | Medium — market distance, location evidence | P2 |
| Field readiness panel | Low — profile completion status | P3 |

---

## 4. Visual Design Audit

### 4.1 Current Design Issues

| Issue | Severity | Location |
|-------|----------|----------|
| Emoji icons (⌂, ☑, ＋, ≡, ☺) | P1 | `AgentShell.tsx` bottom navigation |
| No brand identity | P1 | All agent pages |
| Inconsistent colors | P2 | Mixed raw Tailwind colors |
| No dark/light mode consideration | P3 | All pages |
| Generic form styling | P2 | Collection forms |
| No animation or transitions | P3 | All interactions |
| No skeleton loading | P2 | All data pages |
| Basic empty states | P2 | All list pages |

### 4.2 Brand Alignment

The agent portal **does not use** the Hatsi360 design system tokens:

| Token Family | Used in Agent Portal? |
|--------------|----------------------|
| `brand-*` | ❌ No |
| `leaf-*` | ❌ No |
| `harvest-*` | ❌ No |
| `ink-*` | ❌ No |
| `terminal-*` | ❌ No |
| Raw Tailwind colors | ✅ Yes (gray-*, green-*, etc.) |

---

## 5. Security & Data Integrity Audit

### 5.1 Authentication

| Check | Status |
|-------|--------|
| `requireAgent()` guard on all routes | ✅ Present |
| Role validation (agent, market_supervisor) | ✅ Present |
| Redirect on unauthorized | ✅ Present |
| Session management | ✅ Uses Supabase auth |

### 5.2 Authorization (RLS)

| Check | Status | Notes |
|-------|--------|-------|
| Agents see only assigned markets | ✅ RLS enforced | Via `market_assignments` table |
| Agents cannot impersonate others | ✅ Enforced | Server-side validation |
| Agents cannot approve own submissions | ✅ Enforced | Verification workflow separation |
| Evidence uploads protected | ✅ Storage RLS | Supabase Storage policies |
| Assignment ownership protected | ✅ RLS | Cannot modify other agents' assignments |

### 5.3 Data Integrity

| Check | Status | Notes |
|-------|--------|-------|
| Duplicate submission prevention | ⚠️ Unclear | May need idempotency keys |
| Audit trail for corrections | ✅ Present | Correction history preserved |
| Verification separation | ✅ Present | Agents cannot approve |
| Evidence metadata capture | ✅ Present | Timestamp, agent, market |

---

## 6. Database Schema Assessment

### 6.1 Key Tables (inferred from code)

| Table | Purpose | Agent Access |
|-------|---------|--------------|
| `agents` | Agent profiles | Read own |
| `market_assignments` | Agent-market assignments | Read assigned |
| `commodities` | Commodity catalogue | Read all |
| `markets` | Market directory | Read assigned |
| `price_observations` | Price records | Create, read own |
| `observation_evidence` | Evidence attachments | Create, read own |
| `verification_events` | Verification decisions | Read own feedback |
| `notifications` | Agent notifications | Read, update own |
| `agent_tasks` | Task assignments | Read, update own |

### 6.2 Schema Gaps

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No `agent_drafts` table | Cannot persist incomplete collections | Add table with RLS |
| No `sync_queue` table | No offline sync tracking | Add table or use local storage |
| No `agent_activity_log` | Cannot track productivity over time | Add table or derive from observations |
| No `field_readiness` concept | Cannot show profile completion | Derive from existing data |
| No `geolocation` fields | Cannot capture GPS coordinates | Add to observations if needed |

---

## 7. Mobile Experience Audit

### 7.1 Current Mobile State

| Aspect | Status |
|--------|--------|
| Responsive layout | ⚠️ Partial — works but not optimised |
| Touch targets (44px min) | ⚠️ Inconsistent |
| Bottom navigation | ✅ Present (5 tabs) |
| Mobile forms | ⚠️ Basic, not optimised |
| Camera access | ✅ Working |
| Offline support | ❌ Not implemented |
| Performance on low-end devices | ⚠️ Unknown |

### 7.2 Mobile Pain Points

1. **Emoji icons** — not professional, inconsistent across platforms
2. **No haptic feedback** — no confirmation on actions
3. **No pull-to-refresh** — must navigate away and back
4. **No offline indicator** — agents don't know sync status
5. **Forms not optimised** — no numeric keypad hints, no autocomplete
6. **No gesture support** — swipe to delete drafts, etc.

---

## 8. Performance Assessment

### 8.1 Current Performance

| Metric | Status | Notes |
|--------|--------|-------|
| Initial page load | ⚠️ Unknown | No metrics collected |
| Data query efficiency | ✅ Good | Uses indexed queries |
| Image upload performance | ⚠️ Unknown | No optimisation visible |
| Bundle size | ⚠️ Unknown | No analysis done |
| Caching strategy | ⚠️ Minimal | `force-dynamic` on most pages |

### 8.2 Performance Recommendations

1. Add skeleton loading states to reduce perceived latency
2. Implement optimistic updates for form submissions
3. Add image compression before upload
4. Implement route-level code splitting
5. Add service worker for offline capability

---

## 9. Accessibility Audit

### 9.1 Current State

| Check | Status |
|-------|--------|
| Keyboard navigation | ⚠️ Partial |
| Focus indicators | ⚠️ Inconsistent |
| Screen reader labels | ⚠️ Minimal |
| Color contrast | ⚠️ Unknown |
| Touch target size | ⚠️ Inconsistent |
| Form labels | ✅ Present |
| Error messages | ⚠️ Basic |

### 9.2 Accessibility Gaps

1. Emoji icons lack proper ARIA labels
2. No skip navigation link
3. Focus rings not standardised
4. Some buttons missing `aria-label`
5. Color used as only status indicator in some places

---

## 10. Competitive Analysis

### 10.1 Comparable Products

| Product | Strength | Weakness |
|---------|----------|----------|
| **TaroWorks** (field data) | Offline-first, mobile-native | Expensive, complex |
| **Fulcrum** (field service) | Robust forms, GPS | Not agriculture-specific |
| **CommCare** (health field) | Offline, workflow | Health-focused, not trade |
| **KoboToolbox** (survey) | Free, flexible | Basic UI, not real-time |

### 10.2 Hatsi360 Agent Portal Differentiation

**Strengths to preserve:**
- Agriculture-specific commodity catalogue
- Verification workflow integration
- Market assignment system
- Evidence capture with metadata
- Real-time price submission

**Gaps to address:**
- Professional visual design
- Mobile-first experience
- Offline resilience
- Productivity insights
- Modern interactions

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing collection workflow | Medium | High | Preserve `CollectionSession.tsx` logic, only refactor UI |
| RLS policy conflicts | Low | High | Test all queries with agent role before deployment |
| Mobile performance regression | Medium | Medium | Test on low-end Android devices |
| Offline sync data loss | Medium | High | Implement idempotency keys, conflict resolution |
| Agent confusion during transition | Low | Medium | Maintain route structure, only change UI |

---

## 12. Phase A Conclusions

### 12.1 What to Preserve

✅ **Keep working as-is:**
- Authentication guards (`requireAgent`)
- Role-based access control
- Core collection workflow logic
- Evidence upload pipeline
- Verification workflow separation
- RLS policies
- Database schema (mostly)

### 12.2 What to Rebuild

🔄 **Rebuild for quality:**
- Agent shell (navigation, header, branding)
- Dashboard (interactive, actionable)
- Assignment listing (modern cards, filters)
- Collection forms (mobile-optimised)
- Submission management (status tabs, detail view)
- Performance page (charts, date ranges)
- Notifications (interactive, real-time)
- Profile page (field readiness panel)

### 12.3 What to Add

➕ **New features:**
- Skeleton loading states
- Empty states with guidance
- Connectivity indicator
- Draft persistence
- Toast notifications
- Progress indicators
- Geolocation (optional)
- Offline sync UI

---

## 13. Next Steps

**Phase B — Agent Workspace Foundation:**
1. Rebuild `AgentShell.tsx` with brand identity
2. Create new bottom navigation with SVG icons
3. Redesign dashboard with actionable metrics
4. Add shared UI components (cards, badges, empty states)
5. Implement skeleton loading pattern

**Phase C — Assignment Management:**
1. Redesign assignment listing
2. Build assignment detail page
3. Add status transitions
4. Implement market information panel

**Phase D — Collection Experience:**
1. Mobile-optimise collection form
2. Add numeric keypad support
3. Improve evidence capture UX
4. Add draft support

---

**Phase A Status:** ✅ COMPLETE  
**Ready for Phase B:** Agent Workspace Foundation
