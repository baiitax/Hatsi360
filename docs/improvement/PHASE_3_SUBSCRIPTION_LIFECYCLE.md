# Hatsi360 — Phase 3 subscription lifecycle

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Baseline HEAD | `fa27aaac70fdd4baa974f04e987ef04d0876163b` |
| Mode | Read-only. **No payment provider introduced, no subscription altered** |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

Companion: `PHASE_3_ENTITLEMENT_AUDIT.md`, `PHASE_3_COMMERCIAL_FEATURE_MATRIX.md`,
`PHASE_3_B2B_READINESS.md`.

---

## 1. What exists today

`public.customer_subscriptions` (created in `0003_customer_intelligence.sql`):

```sql
id               bigint generated always as identity primary key
user_id          uuid not null references profiles(id) on delete cascade
organization_id  uuid references organizations(id) on delete cascade
plan             text not null default 'free'
status           text not null default 'active'
                 check (status in ('trialing','active','past_due','cancelled','expired'))
starts_at        timestamptz not null default now()
ends_at          timestamptz
renews_at        timestamptz
trial_ends_at    timestamptz
entitlements     jsonb not null default '{}'
external_ref     text
created_at, updated_at
```

Index: `customer_subscriptions_user_idx (user_id, status)` — **not unique**.
Triggers: `customer_subscriptions_set_updated_at`, `subscriptions_log_entitlement_change`.
Related: `billing_events` (0 rows), `log_entitlement_change()`.

Production counts: **0 subscriptions**, 0 billing events, 11 profiles (3 staff).

The required model has six states. The schema can represent **five**:

| Required state | Representable | Value |
|---|---|---|
| Trial | yes | `trialing` (+ `trial_ends_at`) |
| Active | yes | `active` |
| Past due | yes | `past_due` |
| Expired | yes | `expired` |
| Cancelled | yes | `cancelled` |
| **Suspended** | **no** | **not in the check constraint** |

Suspension exists elsewhere — as `profiles.account_status` with
`set_account_status(profile, status, reason)` (admin-only, reason mandatory,
appends to `account_status_events`). That suspends an *identity*, not a
*subscription*; the two are not linked, and `is_active_account()` guards
operations RPCs (observation submission and similar), not customer features.

---

## 2. The required state machine, against what is implemented

| From → to | Trigger in a real product | Implemented here | Evidence |
|---|---|---|---|
| (none) → **trialing** | signup with trial | **No.** Nothing creates a subscription at signup; `handle_new_user` creates a profile only | `handle_new_user` in the auth chain |
| **trialing** → **active** | first successful payment | **No.** No payment path, no transition logic | — |
| **trialing** → **expired** | trial window elapsed | **Passive only.** Nothing flips the row; the resolver stops granting at `trial_ends_at` | `user_entitlements()` predicate |
| **active** → **active** (renewal) | successful recurring charge | **No.** `renews_at` is stored and displayed, never acted on, never advanced | no job, no function |
| **active** → **past_due** | charge fails | **No.** No charge exists, so no failure signal; nothing sets `past_due` | — |
| **past_due** → **active** | retry succeeds | **No** | — |
| **past_due** → **expired** | dunning exhausted | **No** | — |
| **active** → **expired** | period ends without renewal | **Passive only.** `ends_at` in the past stops the grant; the row stays `active` forever | predicate; no sweep |
| **active/past_due** → **cancelled** | customer cancels | **Manual only.** An administrator sets `status='cancelled'` by row update under `subscriptions_admin_write` | `0016` policy |
| **cancelled** → **active** | reactivation | Manual only | — |
| any → **suspended** | fraud, abuse, dispute | **Not representable at subscription level** | check constraint |
| any → deleted | erasure | `on delete cascade` from `profiles` | schema |

**There is no scheduled transition of any kind.** The job registry has five
jobs — `generate_collection_tasks`, `mark_overdue_tasks`,
`refresh_analytics_snapshot`, `retry_notification_delivery`, `expire_exports` —
and **none** touches `customer_subscriptions`. The only "expire" job expires
export artefacts.

---

## 3. Activation, renewal, expiry, cancellation, payment failure

### 3.1 Activation

There is no activation path a customer can take. `entitlement_tiers` marks
`professional` and `enterprise` as `is_available = false`; no provider is
configured; `external_ref` (the field that would hold a provider subscription
id) is always null. Activation today means: an administrator inserts a row and
writes a JSON object of keys.

That is a legitimate operating model at this stage — "no payment provider is
configured" is stated deliberately in `0016` — but it means **there is no
commercial mechanism**, only a data entry convention. And the convention is
not enforced: nothing validates that `entitlements` keys exist in
`entitlement_catalog` (the resolver filters, so unknown keys are silently
ignored rather than rejected), and nothing validates that the keys match the
`plan` or the tier bundle.

### 3.2 Renewal

`renews_at` is displayed in the admin table and the customer subscription page.
It is never advanced, never compared to `now()` in any function, and never
drives a transition. A subscription is therefore **open-ended by default**: if
an administrator forgets to set `ends_at`, it grants entitlements forever.

### 3.3 Expiry — the one part that works, and how

Expiry is enforced **by predicate, not by state**:

```sql
and (s.ends_at is null or s.ends_at > now())
and (s.trial_ends_at is null or s.trial_ends_at > now())
```

This is the strongest element of the design. Because the check is temporal, a
lapsed subscription stops granting entitlements at the correct instant **even
though its `status` still says `active`** and even if no job ever runs. The
31-check acceptance matrix verifies expired and trial-ended contexts receive
no keys.

The cost of that choice: the `status` column no longer tells the truth about
lapsed rows, so reporting ("how many active customers?") and any future
notification ("your plan expired") cannot rely on it. A read model or a sweep
is needed before the number is quoted to anyone.

### 3.4 Cancellation

Cancelling is an administrator row update. Two consequences worth deciding
deliberately:

- **Immediate or end-of-period?** The resolver excludes `cancelled`
  immediately, so cancelling today removes access today. `ends_at` is ignored
  for a cancelled row. Most products grant access until the paid period ends —
  this does not.
- **No reason capture.** `subscriptions_log_entitlement_change` fires only when
  `entitlements` changes (§4), so setting `status='cancelled'` with unchanged
  entitlements writes **no audit row at all**. A cancellation can happen with
  no record of who did it.

### 3.5 Payment failure

Does not exist. There is no charge, no webhook, no retry, no grace period, no
`past_due` transition — although `past_due` is representable and its exclusion
from the resolver is already written and documented ("the product must not keep
serving a paid capability after payment has failed"). The rule is drafted; the
machinery is absent.

### 3.6 Entitlement refresh

No cache is involved (audit §4.6), so a change applies on the next request in
both layers. The lag that does exist is structural rather than temporal: the
client shell resolves entitlements once per page render, and any long-lived
client component keeps the value it was handed until it remounts. Nothing
subscribes to changes.

---

## 4. Audit logging — narrower than it appears

`log_entitlement_change()` is installed and fires on
`after update on customer_subscriptions`. Its guard is:

```sql
if new.entitlements is distinct from old.entitlements then
```

So the audit trail records **only** changes to the `entitlements` JSON. It does
**not** record:

- `status` transitions (activation, cancellation, expiry, suspension),
- `plan` changes,
- `starts_at` / `ends_at` / `renews_at` / `trial_ends_at` changes,
- inserts and deletes of subscription rows.

`billing_events` would be the natural place for money-adjacent events and is
present but empty, with no writer.

Result: the commercial record is a JSON-diff log with gaps around every state
change — precisely the events an auditor or a customer dispute would ask about.
The trigger *shape* is right (definer-safe, writes `before_data`/`after_data`,
actor and role); the *condition* is too narrow.

---

## 5. Data-integrity gaps that affect lifecycle correctness

| # | Gap | Consequence |
|---|---|---|
| L-1 | No uniqueness on an active subscription per user | Two `active` rows grant the union of both key sets; a "cancelled" row beside an "active" one is invisible to the resolver |
| L-2 | `entitlements` is free-form JSON | Typos and unknown keys are silently ignored; no FK to `entitlement_catalog`, no schema, no tier-bundle validation |
| L-3 | No constraint tying `plan` to `entitlement_tiers` | `plan='enterprise'` can carry no keys, or `plan='free'` can carry `api` |
| L-4 | `organization_id` is stored but **never used for resolution** | Seats/org-level plans are unsupported: a member of a subscribed organisation holds nothing |
| L-5 | Time fields are nullable and unvalidated | `ends_at < starts_at`, or `trial_ends_at` without `trialing`, are both accepted |
| L-6 | No `suspended` state | Abuse handling has to delete the row (losing history) or use the unrelated profile-level suspension |
| L-7 | No status history table | Past states are unrecoverable except from the partial audit log |

---

## 6. What a correct lifecycle would require (not implemented)

Ordered by dependency, with no provider decision assumed:

1. **State history + widened audit** — record every transition (status, plan,
   dates), not only entitlement JSON. This is the prerequisite for disputes and
   for any reporting.
2. **Deterministic transition function** — a single `security definer` RPC
   (`transition_subscription(id, to_status, reason, effective_at)`) with an
   allowed-transitions table, replacing ad-hoc row updates.
3. **Scheduled sweep** — a job that (a) expires rows whose `ends_at` has
   passed, (b) ends trials, (c) moves `past_due` to `expired` after a defined
   grace window. Until it exists, `status` must not be used as a reporting
   source.
4. **Renewal model** — decide whether renewal is manual (administrator extends
   `ends_at`) or automated (provider webhook). Today it is neither.
5. **Cancellation semantics** — immediate vs end-of-period, recorded in the
   audit log with a reason.
6. **Uniqueness + validation** — one live subscription per user; entitlements
   constrained to catalogue keys; plan-to-tier consistency.
7. **Provider integration** — explicitly out of scope for this phase, and
   gated on the commercial decision in the audit's remediation item 6.

---

## 7. Verdict

| Question | Answer |
|---|---|
| Can a subscription be created correctly? | Yes, by an administrator, as data |
| Do entitlements stop when a subscription lapses? | **Yes** — by time predicate, reliably |
| Does `status` reflect reality? | **No** — nothing transitions it |
| Is every commercial event audited? | **No** — only entitlement-JSON changes |
| Can a customer self-serve? | **No** — no purchase, no cancel, no reactivate |
| Is suspension possible? | Not at subscription level |
| Is payment failure handled? | No |

The lifecycle is **half-built in the safest direction**: access stops when it
should, because the grant is time-scoped and stateless. Everything that
depends on *state* — reporting, notices, dunning, suspension, disputes — is
missing. That is a coherent place to stop for a pre-revenue product, provided
nobody describes it as a subscription system yet.
