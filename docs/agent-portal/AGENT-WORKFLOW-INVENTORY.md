# Agent Workflow Inventory

**Date:** 2026-11-14  
**Status:** COMPLETE

---

## 1. Core Workflows

### 1.1 Authentication & Onboarding

```
User Login → Role Check → Agent Dashboard
                    ↓
              Not Agent → Redirect to /dashboard
```

**Status:** ✅ Working  
**Components:** `requireAgent()`, `AgentLayout`  
**Tables:** `auth.users`, `agents`

---

### 1.2 Assignment Reception

```
Admin creates assignment → Agent receives notification
                                    ↓
                    Assignment appears in My Assignments
                                    ↓
                    Agent accepts (optional) → Status: Accepted
```

**Status:** ✅ Working  
**Components:** `AssignmentsPage`, `TaskControls`  
**Tables:** `market_assignments`, `agent_tasks`, `notifications`

**Workflow States:**
- `assigned` — Newly created
- `accepted` — Agent confirmed
- `in_progress` — Collection started
- `completed` — All observations submitted
- `overdue` — Past due date
- `cancelled` — Admin cancelled

---

### 1.3 Price Collection (Primary Workflow)

```
Agent opens Collect → Select Market → Select Commodity
                                              ↓
                                    Select Grade (if applicable)
                                              ↓
                                      Select Price Type
                                              ↓
                                         Enter Price
                                              ↓
                                      Select Unit
                                              ↓
                                    Capture Evidence (photos)
                                              ↓
                                      Review & Confirm
                                              ↓
                                       Submit Observation
                                              ↓
                                       Status: Pending Verification
```

**Status:** ✅ Working  
**Components:** `CollectionSession.tsx` (1,132 lines), `NewCollectionForm.tsx`, `EvidencePanel.tsx`  
**Tables:** `price_observations`, `observation_evidence`, `commodities`, `markets`, `grades`

**Data Captured:**
- Commodity ID, variety, grade
- Market ID
- Price amount, currency, unit
- Price type (wholesale, retail, farm-gate)
- Evidence images (up to N)
- Collection timestamp
- Agent ID
- Location (optional GPS)

---

### 1.4 Verification Feedback Loop

```
Observation submitted → Verification officer reviews
                                    ↓
                          ┌─────────┴─────────┐
                          ↓                   ↓
                    Approved            Rejected/Returned
                          ↓                   ↓
                  Status: Approved    Agent notified
                                            ↓
                                    Agent reviews feedback
                                            ↓
                                    Agent corrects data
                                            ↓
                                    Resubmit → Back to review
```

**Status:** ✅ Working  
**Components:** `CorrectionForm.tsx`, `NotificationList.tsx`  
**Tables:** `verification_events`, `price_observations` (status update)

**Verification States:**
- `pending` — Awaiting review
- `approved` — Verified and published
- `rejected` — Invalid, needs correction
- `returned` — Needs clarification

---

### 1.5 Submission Tracking

```
Agent views Submissions → Filter by status
                                    ↓
                          ┌─────────┴─────────┐
                          ↓                   ↓
                    Draft/Local         Submitted
                          ↓                   ↓
                  Edit & Submit        View status
                                            ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                              Under Review         Decision Made
```

**Status:** ⚠️ Partial (stub page exists)  
**Components:** `SubmissionsPage.tsx` (12 lines — stub)  
**Tables:** `price_observations`

---

### 1.6 Performance Monitoring

```
Agent opens Performance → View metrics
                                    ↓
                          ┌─────────┴─────────┐
                          ↓                   ↓
                    Today's stats      Historical trends
                          ↓                   ↓
                  Submitted count     Charts over time
                  Approved count      Completion rate
                  Rejected count      Markets visited
```

**Status:** ✅ Working (basic)  
**Components:** `PerformancePage.tsx` (185 lines)  
**Tables:** `price_observations` (aggregated)

---

### 1.7 Profile Management

```
Agent opens Profile → View info
                                    ↓
                          ┌─────────┴─────────┐
                          ↓                   ↓
                    View details         Edit permitted fields
                          ↓                   ↓
                  Name, role, region     Name, photo, contact
                  Assigned markets       (validated server-side)
                  Account status
```

**Status:** ✅ Working  
**Components:** `ProfilePage.tsx`, `ProfileForm.tsx`  
**Tables:** `agents`, `auth.users`, `market_assignments`

---

### 1.8 Notifications

```
System event → Notification created
                          ↓
                    Agent sees badge count
                          ↓
                    Opens Notifications page
                          ↓
                    Views list (read/unread)
                          ↓
                    Marks as read (individual or all)
```

**Status:** ✅ Working (basic)  
**Components:** `NotificationList.tsx`, `NotificationsPage.tsx`  
**Tables:** `notifications`

**Notification Types:**
- New assignment
- Assignment changed/cancelled
- Submission received
- Submission approved
- Submission rejected
- Correction requested
- Operational announcement

---

### 1.9 Corrections Workflow

```
Agent opens Corrections → See rejected items
                                    ↓
                          Select item to correct
                                    ↓
                          View reviewer feedback
                                    ↓
                          Edit permitted fields
                                    ↓
                          Add correction note
                                    ↓
                          Resubmit → Status: Under Review
```

**Status:** ✅ Working  
**Components:** `CorrectionForm.tsx`, `CorrectionsPage.tsx`  
**Tables:** `price_observations`, `verification_events`

---

### 1.10 Market Information

```
Agent opens Markets → See assigned markets
                                    ↓
                          Select market
                                    ↓
                          View market profile
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
              Market details                  Start collection
              (location, hours,               (jump to collect)
              commodities traded)
```

**Status:** ✅ Working (basic)  
**Components:** `MarketsPage.tsx`, `MarketDetailPage.tsx`  
**Tables:** `markets`, `market_assignments`

---

## 2. Workflow Gaps

### 2.1 Missing Workflows

| Workflow | Impact | Priority |
|----------|--------|----------|
| Draft saving | High — lost data if app closes | P0 |
| Offline queue | High — field connectivity issues | P0 |
| Sync status display | Medium — agents don't know state | P2 |
| Assignment calendar view | Medium — hard to plan week | P2 |
| Bulk submission review | Medium — tedious one-by-one | P3 |
| Issue reporting | Medium — can't flag problems | P2 |
| Team communication | Low — agents work solo | P3 |

### 2.2 Incomplete Workflows

| Workflow | Current State | Gap |
|----------|---------------|-----|
| Submission detail | Stub (12 lines) | No detail view, no timeline |
| Task management | Basic controls | No full lifecycle |
| Assignment detail | Minimal | No market profile, no commodity checklist |
| Observation history | Basic list | No filtering, no export |

---

## 3. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT PORTAL FLOW                         │
└─────────────────────────────────────────────────────────────┘

Agent Device                    Server/Database
     │                                │
     │  1. Login                       │
     │────────────────────────────────→│
     │                                │
     │  2. Load dashboard              │
     │←────────────────────────────────│
     │     (assignments, stats)        │
     │                                │
     │  3. Start collection            │
     │────────────────────────────────→│
     │                                │
     │  4. Submit observation          │
     │────────────────────────────────→│
     │     (price, evidence)           │
     │                                │
     │  5. Receive verification        │
     │←────────────────────────────────│
     │     (approved/rejected)         │
     │                                │
     │  6. Correct if needed           │
     │────────────────────────────────→│
     │                                │
     │  7. View performance            │
     │←────────────────────────────────│
     │     (metrics, trends)           │
     │                                │

┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
└─────────────────────────────────────────────────────────────┘

Frontend                    Lib Layer                Database
   │                            │                        │
   │  React Components          │                        │
   │──────────────────────────→│                        │
   │                            │  Queries               │
   │                            │──────────────────────→│
   │                            │                        │
   │                            │  Results               │
   │                            │←──────────────────────│
   │  Props/Data                │                        │
   │←──────────────────────────│                        │
   │                            │                        │
```

---

## 4. Permission Matrix

| Action | Agent | Market Supervisor | Admin |
|--------|-------|-------------------|-------|
| View own assignments | ✅ | ✅ | ✅ |
| View all assignments | ❌ | ✅ (own markets) | ✅ |
| Create observation | ✅ | ✅ | ❌ |
| Approve observation | ❌ | ❌ | ✅ (via verification) |
| Reject observation | ❌ | ❌ | ✅ (via verification) |
| Correct own observation | ✅ | ✅ | ❌ |
| View all agents | ❌ | ❌ | ✅ |
| Assign markets | ❌ | ❌ | ✅ |
| View performance | ✅ (own) | ✅ (own agents) | ✅ (all) |
| Edit profile | ✅ | ✅ | ✅ |
| Upload evidence | ✅ | ✅ | ❌ |

---

## 5. State Machines

### 5.1 Observation Lifecycle

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ Submit
                         ↓
                    ┌──────────┐
         ┌─────────│ PENDING  │──────────┐
         │         └────┬─────┘          │
         │              │                │
         │         Verify/Review         │
         │              │                │
         ↓              ↓                ↓
    ┌─────────┐  ┌──────────┐    ┌───────────┐
    │APPROVED │  │ RETURNED │    │  REJECTED │
    └─────────┘  └────┬─────┘    └─────┬─────┘
                      │                │
                      │ Correct        │ Correct
                      ↓                ↓
                 ┌──────────┐    ┌──────────┐
                 │ PENDING  │    │ PENDING  │
                 └──────────┘    └──────────┘
```

### 5.2 Assignment Lifecycle

```
                    ┌──────────┐
                    │ ASSIGNED │
                    └────┬─────┘
                         │ Accept (optional)
                         ↓
                    ┌──────────┐
                    │ ACCEPTED │
                    └────┬─────┘
                         │ Start collection
                         ↓
                    ┌─────────────┐
                    │ IN PROGRESS │
                    └──────┬──────┘
                           │ Complete
                           ↓
                    ┌──────────┐
                    │COMPLETED │
                    └──────────┘

    Any state → CANCELLED (admin only)
    Any state → OVERDUE (automatic if past due date)
```

---

## 6. Next Steps

**Phase B Priority Workflows:**
1. ✅ Dashboard — show assignments, tasks, progress
2. ✅ Collection — mobile-optimise existing flow
3. ✅ Submissions — build detail view and status tracking
4. ✅ Assignments — redesign listing and detail

**Phase C Priority Workflows:**
1. Draft persistence
2. Offline queue with sync UI
3. Performance charts with date ranges
4. Notification centre redesign

---

**Status:** ✅ COMPLETE
