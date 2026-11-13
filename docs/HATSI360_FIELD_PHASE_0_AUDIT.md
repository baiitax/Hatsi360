# HATSI360 FIELD — Phase Zero audit

**Scope:** the existing Hatsi360 codebase, its database, its workflows and its
agent surfaces, inspected before implementation.

**Method:** every claim below is read out of the repository. Table and column
names come from `supabase/migrations/`, policies from the same files, and
routes and components from `src/`. Where the code and the schema disagree,
the disagreement is recorded rather than smoothed over.

**Headline:** the database is more complete than the application. Almost every
entity the brief describes already exists, with working RLS and working
functions. The gap is the **agent-facing application layer**, not the data
model. The correct implementation is therefore to build on the existing
schema rather than to introduce a parallel one.

---

## 1. Existing agent functionality inventory

| Surface | Route | State | Notes |
| --- | --- | --- | --- |
| Agent shell | `src/app/agent/layout.tsx` | **Working** | Server-side `requireAgent` guard; five-item bottom navigation; online/offline badge; notification bell. |
| Entry redirect | `src/app/agent/page.tsx` | **Working** | Redirects to `/agent/home`. |
| Operations overview | `src/app/agent/home/page.tsx` | **Partial** | Greeting, three counters, tasks, markets, recent prices. Missing the full command centre the brief describes. |
| Collection engine | `src/components/agent/CollectionFlow.tsx` (780 lines) | **Partial** | Six-step flow, draft restore, offline queue, idempotency keys. Missing grades, market intelligence, evidence, multi-commodity sessions. |
| Market list | `src/app/agent/markets/page.tsx` | **Working** | Assigned markets only, with scope counts. |
| Task list | `src/app/agent/tasks/page.tsx` + `TaskControls.tsx` | **Working** | Task list with status transitions through `transition_task`. |
| Submissions list | `src/app/agent/submissions/page.tsx` | **Partial** | Lists the agent's own observations. No filters, no detail view, no correction response. |
| Profile | `src/app/agent/profile/page.tsx` | **Working** | Reads the agent's own profile. |
| Notifications | `src/app/agent/notifications/page.tsx` | **Working** | Reads real notifications; `unreadCount` drives the bell badge. |
| Loading boundary | `src/app/agent/loading.tsx` | **Working** | Added in the visual/loading phase. |

**Missing surfaces** (none of these exist today):

`/agent/assignments`, `/agent/assignments/[id]`, `/agent/observations`,
`/agent/observations/[id]`, `/agent/corrections`, `/agent/history`,
`/agent/performance`, `/agent/markets/[id]`, `/agent/help`.

---

## 2. Existing database relationship map

The schema is mature. Read from `supabase/migrations/`:

```
profiles ──1:1── agent_profiles
   │
   ├──1:N── market_agent_assignments ──N:1── markets
   │            (status, starts_on, ends_on, assigned_by)
   │
   ├──1:N── collection_tasks ──N:1── markets
   │            │                    ──N:1── commodities (single, optional)
   │            │                    ──N:1── market_collection_schedules (schedule_id)
   │            │                    ──N:1── market_visit_records (market_visit_id)
   │            │  (assigned_to, due_on, deadline_at, expected_commodity_ids[],
   │            │   priority, status, submission_key, started/submitted/completed_at)
   │            └──1:N── collection_task_events
   │                         (event_type ∈ 12 values, from_status, to_status, actor_id, reason)
   │
   ├──1:N── collection_batches (reference, market_id, agent_user_id, started/completed_at)
   ├──1:N── market_visit_records (visited_at, observations_count, market_conditions, notes)
   │
   ├──1:N── price_observations
   │            ├── commodity_id, market_id, variety_id, grade_id
   │            ├── price_type, reported_amount, reported_unit_id, package_weight_kg
   │            ├── collected_at / submitted_at / verified_at / published_at / rejected_at
   │            ├── verification_status, supersedes_id, is_current, submission_key
   │            └──1:N── price_observation_evidence
   │            └──1:N── price_verification_events
   │            └──1:N── price_revision_history
   │            └──1:N── observation_quality_findings
   │
   └──1:N── notifications (kind ∈ 14 values, read_at, action_url)

markets ──N:M── commodities  (via market_commodity_scope, is_primary)
markets ──1:N── market_collection_schedules
              (frequency, days_of_week[], window_start/end, deadline_time,
               required_price_types[], expected_observations, priority,
               evidence_required, assigned_agent_id, escalation_rule)
```

**Enums that define the workflow**

- `verification_status`: `draft, pending_verification, verified, rejected, correction_requested, legacy_unverified`
- `price_type`: `farmgate, wholesale_asking, wholesale_transaction, retail, processor_procurement, export_buy, export_sell, indicative, unspecified`
- `collection_task_status`: `open, in_progress, submitted, awaiting_review, correction_required, completed, cancelled`
- `task_status`: `open, in_progress, submitted, skipped`
- `assignment_status`: `active, paused, ended`
- `collection_frequency`: `daily, weekly, adhoc`
- `operational_priority`: `low, normal, high, critical`
- `notification_kind`: `task_assigned, deadline_reminder, submission_received, submission_approved, submission_rejected, correction_requested, assignment_changed, task_cancelled, review_required, market_unassigned, coverage_gap, system_alert, quality_warning`
- `quality_flag_code`: `duplicate_suspected, price_outlier, unit_conversion_unverified, bag_weight_inconsistent, timestamp_inconsistent, missing_evidence, conflicting_report, stale`

**Reference tables the agent flow needs, all present:** `commodities`,
`commodity_categories`, `commodity_grades`, `commodity_varieties`,
`measurement_units`, `commodity_unit_conversions`, `markets`, `states`,
`market_zones`.

---

## 3. Current workflow assessment

### What works end to end today

1. **Scheduling.** `generate_collection_tasks(p_date)` reads active
   `market_collection_schedules` whose `days_of_week` contains today, creates
   a `collection_tasks` row per schedule with `expected_commodity_ids`,
   `deadline_at` and `priority`, writes a `created` event, and notifies the
   assigned agent.
2. **Submission.** `submit_observation(p_payload, p_idempotency_key)` checks
   the account is active, the caller holds `agent` or `market_supervisor`, the
   market and commodity are active, **the caller is assigned to the market**,
   and — when a task is supplied — the task belongs to them, is for the same
   market and is not closed. It then inserts the observation as `submitted`,
   writes a `price_verification_events` row, writes an audit record, links
   the task and moves it to `in_progress`. **The same idempotency key always
   resolves to the same observation**, so a retried request on a flaky
   connection cannot create a second price.
3. **Review.** `approve_observation`, `reject_observation`,
   `request_correction`, `publish_observation` and `unpublish` are separate
   functions. Approval and publication are deliberately separate acts.
4. **Quality.** `evaluateAndRecord` runs the rule set at submission and
   writes `observation_quality_findings`; the rules include
   `missing_evidence`, `price_outlier`, `duplicate_suspected`,
   `bag_weight_inconsistent`, `timestamp_inconsistent` and `stale`. Findings
   flag a record for review — they never alter the agent's submitted value.
5. **Corrections.** `request_correction` moves the observation to
   `correction_requested` with a reason, and the agent's own update policy
   permits editing exactly those records.
6. **Lineage.** `price_revision_history` stores `before_data`/`after_data`
   per revision, and `price_observations.supersedes_id` plus `is_current`
   let a correction append a new record instead of overwriting the old one.

### Gaps in the workflow

| Gap | Evidence | Consequence |
| --- | --- | --- |
| **No agent-initiated resubmission** | `submit_observation` always inserts `submitted`; there is no function for an agent to resubmit a `correction_requested` observation with a revision row | The agent can edit the record through the client policy, but the amendment is not written to `price_revision_history` and the old values are not preserved as the brief requires. |
| **No draft path** | The server action `saveDraft` returns a success message and stores nothing; drafts live only in `localStorage` | A draft is lost with the device. The brief requires drafts to be saved securely before submission. |
| **No collection-session server object** | `collection_batches` exists but nothing in the application creates or reads one | A multi-commodity market visit is not a first-class record, so "collection session" cannot be listed or reviewed. |
| **No evidence upload** | `price_observation_evidence` exists and the quality rule reads it, but **there is no Storage bucket, no storage policy and no upload code** anywhere in the repository | Evidence can be recorded but never attached. `evidence_required` schedules therefore cannot be satisfied. |
| **No market-intelligence capture** | `market_visit_records.market_conditions` is a free-text column that nothing writes | Availability, demand and price direction — the brief's Step 6 — are not captured at all. |
| **No grade in the collection flow** | `price_observations.grade_id` exists; `CollectionFlow` never sets it | Agents cannot record the grade the brief requires, and the grade is invisible to the reviewer. |
| **Notification kinds unused** | `assignment_changed`, `market_unassigned`, `coverage_gap`, `deadline_reminder` are defined but never raised | An agent is not told when their assignment changes. |
| **Assignment status not surfaced** | `market_agent_assignments.status` is `active/paused/ended` but the agent queries filter on `status = 'active'` only | A paused assignment looks identical to an active one, and the agent cannot see why a market stopped appearing. |

---

## 4. Route inventory (agent surface)

| Route | Exists | Guard |
| --- | --- | --- |
| `/agent` | Yes | Redirects |
| `/agent/home` | Yes | `requireAgent` |
| `/agent/collect` | Yes | `requireAgent` |
| `/agent/markets` | Yes | `requireAgent` |
| `/agent/tasks` | Yes | `requireAgent` |
| `/agent/submissions` | Yes | `requireAgent` |
| `/agent/notifications` | Yes | `requireAgent` |
| `/agent/profile` | Yes | `requireAgent` |
| `/agent/assignments` | **No** | — |
| `/agent/assignments/[id]` | **No** | — |
| `/agent/observations` | **No** | — |
| `/agent/observations/[id]` | **No** | — |
| `/agent/corrections` | **No** | — |
| `/agent/history` | **No** | — |
| `/agent/performance` | **No** | — |
| `/agent/markets/[id]` | **No** | — |
| `/agent/help` | **No** | — |

---

## 5. Security and permission assessment

**Authentication.** Supabase Auth through `@supabase/ssr`. `requireAgent`
resolves the profile and the role server-side and redirects. The role check
is never trusted from the client.

**Row Level Security is already correct for the agent role.** Read from the
migration files:

| Table | Agent's access |
| --- | --- |
| `price_observations` | select own (`agent_user_id = auth.uid()`); insert own, assigned to the market, status `draft`/`submitted`/`pending_verification`; update own while `draft`/`correction_requested`/`submitted` and `is_current`; delete own while `draft` and unpublished |
| `price_observation_evidence` | select own; insert own against a draft or correction-requested observation |
| `collection_tasks` | select assigned or in an assigned market; update when `assigned_to = auth.uid()` and the account is active |
| `collection_tasks` | staff write for all |
| `collection_task_events` | select for own tasks; insert for own tasks |
| `collection_batches` | select and write own |
| `market_visit_records` | select and write own |
| `market_agent_assignments` | select own; write admin/supervisor only |
| `market_collection_schedules` | select own assignment or assigned market; write admin/supervisor only |
| `notifications` | owner read and update only |
| `agent_profiles` | select own; write admin only |

**Server-side enforcement exists in functions, not only in policies.**
`submit_observation` is `security definer` and re-checks the role, the
account status, the market assignment and the task ownership. A second
layer, not a replacement.

**What is already protected against the brief's prohibited list**

| Prohibition | Enforcement |
| --- | --- |
| Assign yourself to a market | `market_agent_assignments` write is admin/supervisor only; `submit_observation` checks `is_assigned_to_market` |
| Change your role | `prevent_role_escalation` trigger + admin-only role writes |
| Approve or publish | `approve_observation`/`publish_observation` are staff-only; the agent update policy does not permit a verified record to change |
| Change verification status | Not in the agent's update `with check` |
| Modify another agent's records | Every agent policy scopes on `auth.uid()` |
| Delete an approved observation | Agent delete requires `verification_status = 'draft'` and `published_at is null` |
| Reach another agent's drafts | Draft select is scoped on `agent_user_id` |
| Trust a browser-supplied id | `submit_observation` re-checks ownership server-side |

**Gaps in security**

1. **No Storage policies exist**, because no bucket exists. Evidence files
   would have to be served from a public URL, which the brief forbids. A
   private bucket with owner-scoped policies and short-lived signed URLs is
   required.
2. **The agent update policy on `price_observations` permits `submitted`.**
   An agent can therefore edit a record that is already in the review queue.
   The brief says an agent must not modify an approved record and that a
   correction must preserve the previous values; permitting an in-place edit
   of a submitted record does neither. The policy should be narrowed to
   `draft` and `correction_requested`, and resubmission should append a
   revision.

---

## 6. Missing functionality report

1. Assignment management: no list, no detail, no categorisation, no
   completion progress, no instruction surface.
2. Market detail page for the agent.
3. Observation management: no list with filters, no detail page, no
   verification history for the agent.
4. Correction centre: no surface, and no agent-initiated resubmission that
   preserves the previous values.
5. Collection history: no session-level view.
6. Performance: no metric surface, and no definition of the measurement
   period.
7. Grades: not offered in the collection flow.
8. Market intelligence fields: not captured.
9. Evidence: no bucket, no upload, no attachment UI, no offline evidence
   queue.
10. Server-side drafts: drafts exist only in `localStorage`.
11. Collection sessions: not created, not listed.
12. Assignment-change notifications: the kinds exist but are never raised.
13. Assignment status (`paused`, `ended`) is invisible to the agent.
14. A help surface for the agent.

---

## 7. Proposed implementation plan

**Principle: extend the schema where it is genuinely incomplete, reuse it
everywhere else, and never create a parallel model.**

### Migration `0019_field_evidence_and_corrections.sql`

| Change | Reason |
| --- | --- |
| Create the private bucket `hatsi360-evidence` | Evidence must be stored privately; there is currently no bucket at all. |
| Storage policies: owner may insert own evidence; owner or staff may read; nobody may read publicly | The brief forbids unrestricted public evidence URLs. |
| `public.agent_evidence_url(p_observation_id, p_evidence_id)` returning a short-lived signed path | The agent and the reviewer need a usable URL without a public object. |
| Narrow `price_observations_agent_update` to `draft` and `correction_requested` | An agent must not silently edit a record already in the review queue. |
| `public.resubmit_observation(p_observation_id, p_payload, p_reason)` | A correction must append a revision and preserve the previous values; the agent path must go through a function so the history is written. |
| `public.raise_assignment_notice(...)` or a trigger on `market_agent_assignments` | The agent must be told when an assignment changes. |
| Indexes for the agent's hot queries | `price_observations (agent_user_id, collected_at desc)`, `collection_tasks (assigned_to, due_on)`, `notifications (user_id, created_at desc)` |

### Application work

| Phase | Work |
| --- | --- |
| **A — Foundation** | `src/lib/operations/field.ts` — the agent data layer: assignments, observations, corrections, history, performance, profile, notifications. Reuses the signed-in Supabase client so RLS applies to every query. |
| **B — Navigation** | Bottom navigation rebuilt to the five required destinations, with the notification and pending-action counts, and the remaining surfaces reachable from the home screen. |
| **C — Home** | Full command centre: real summary figures, pending actions, today's assignments with progress, recent activity, operational notices. |
| **D — Assignments** | `/agent/assignments` (categorised) and `/agent/assignments/[id]` (detail, instructions, coverage, timeline, actions). |
| **E — Markets** | `/agent/markets/[id]`. |
| **F — Collection engine** | Upgraded `CollectionFlow`: grades, market intelligence, evidence, multi-commodity session, review, save-draft vs add-to-session, completion summary, explicit submit confirmation. |
| **G — Observations and corrections** | `/agent/observations`, `/agent/observations/[id]`, `/agent/corrections`, plus the agent resubmission path. |
| **H — History and performance** | `/agent/history` (collection sessions) and `/agent/performance` (evidence-based metrics with a stated period). |
| **I — Offline** | User-scoped local storage, per-item sync status, conflict detection, evidence queue, cleanup on sign-out. |
| **J — Admin integration** | Assignment change raises a notification; the agent's surfaces reflect the change on the next load. |
| **K — Tests** | Security tests (cross-agent access, unauthorised verification), collection-flow tests, mobile viewport tests, and the existing suite kept green. |

### Security requirements

- Every agent query uses the signed-in client, so RLS is the first filter.
- Every mutation goes through a server action that re-checks role and
  ownership.
- The agent may not reach `approve`, `publish`, `reject` or any admin action.
- Evidence is private; access is by signed URL with a short lifetime.
- No service-role key is ever imported into a client component.

---

## 8. Database migration requirements

**One new migration file** (`0019`), because the existing 18 are applied and
must not be edited:

1. `storage.buckets` — insert the private `hatsi360-evidence` bucket.
2. `storage.objects` policies — owner insert, owner-or-staff select, no
   public select, no delete for agents.
3. `public.agent_evidence_url(...)` — a signed URL, owner-or-staff only.
4. Narrow `price_observations_agent_update` to `draft` and
   `correction_requested`.
5. `public.resubmit_observation(...)` — appends a revision, preserves the
   previous values, records a verification event and an audit row, and
   returns the new observation id.
6. A trigger on `market_agent_assignments` raising `assignment_changed` or
   `market_unassigned` for the agent.
7. Three supporting indexes.

**Nothing is dropped. No historical observation is altered. No table is
duplicated.** The migration is additive and reversible: reverting it removes
the bucket, the function, the trigger and the indexes, and restores the
previous policy text.

---

## 9. Verification plan

- `scripts/validate_migrations.sh` against a real PostgreSQL instance, with
  the RLS and workflow assertion counts reported as before.
- Vitest suites: `tests/field/` for the agent data layer and the collection
  flow, `tests/security/` for cross-agent access.
- `npx tsc --noEmit`, `npx vitest run`, `npx next build`.
- `scripts/verify_launch.sh` extended with agent-route and agent-guard checks.
- Browser passes at 320, 360, 375, 390 and 430 CSS pixels, plus tablet and
  desktop.
