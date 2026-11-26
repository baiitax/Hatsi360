# Hatsi360 — Phase 3 customer and B2B readiness

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Baseline HEAD | `fa27aaac70fdd4baa974f04e987ef04d0876163b` |
| Mode | Read-only. No schema, policy, data or code change |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

Companion: `PHASE_3_ENTITLEMENT_AUDIT.md`, `PHASE_3_COMMERCIAL_FEATURE_MATRIX.md`,
`PHASE_3_SUBSCRIPTION_LIFECYCLE.md`.

---

## 1. Status taxonomy

| Term | Meaning |
|---|---|
| **Implemented** | Present in the repository chain, reachable in the UI, and enforced in the database |
| **Partially implemented** | Present but missing a control (a transition guard, a verification gate, a workflow) |
| **Missing** | No table, route or rule exists |
| **Production-unavailable** | Defined in the repository, but the objects do not exist in production, so the surface cannot load |

Production counts at audit time: profiles **11**, organizations **5**,
organization_members **7**, report_subscriptions 0, contact_enquiries 1.

---

## 2. Feature-by-feature

| Area | Status | Evidence |
|---|---|---|
| Customer workspaces (`/client/*`) | **Partially implemented** | 13 route groups exist; shell loads profile + entitlements; entitlements RPC fails (audit E-1) |
| Organization membership model | **Partially implemented** | `organizations`, `organization_members` in production (5/7); read-only select policies; **no workflow to create or administer an organisation**, and subscriptions never resolve through it |
| Supplier profiles | **Production-unavailable** | `supplier_profiles` absent from production (0047 unapplied); `/client/trade/suppliers` queries it → missing relation |
| Supplier verification | **Partially implemented, and unsound** | `verification_status`/`verification_level` exist; **a supplier can set them on their own row** (§4) |
| RFQs | **Production-unavailable** | `rfqs`, `quotes` absent; 3 client routes raise |
| Orders | **Production-unavailable** | `orders`, `order_events` absent; `/client/trade/orders` raises |
| Ownership and isolation | **Partially implemented** | Ownership predicates exist per table; one definer function has **no caller check** (§6) |
| Transaction state transitions | **Missing guard** | 8-state `order_status` enum exists; any owner can write any status — no transition function, no guard |
| Auditability | **Partially implemented** | `order_events` append-only shape; `audit_logs` + triggers elsewhere; **no supplier-verification audit**, no subscription state audit |
| Dispute evidence | **Missing** | `supplier_reviews` table only; `dispute_opened`/`dispute_resolved` event types exist with no workflow or resolution record |

---

## 3. Customer workspaces

`(client)` is a separate authenticated shell from `(site)`: 13 sub-routes
(account, alerts, analytics, commodities, markets, notifications, onboarding,
research, subscription, trade, watchlists, actions). It resolves the user
through `createClient()` (session cookies), then loads profile and
entitlements for the sidebar.

Two structural observations:

1. **The workspace is user-scoped, not organisation-scoped.** The shell loads
   `profiles.full_name/avatar_url/role` and `user_entitlements()`; nothing
   loads the caller's organisation to scope data or capabilities. A member of a
   5-organisation dataset sees only what their personal `user_id` owns.
2. **Capability display is derived from a broken call** (audit E-1), so every
   customer sees the sidebar's unentitled state regardless of plan.

The workspace is a functioning authenticated shell around per-user data. It is
not a multi-tenant customer workspace in the B2B sense.

---

## 4. Supplier profiles and verification — the most serious B2B defect

`supplier_profiles` (0047) carries business identity, trade capability
(`commodities_traded`, `min/max_order_quantity`, `lead_time_days`,
`payment_terms`), certifications (`quality_certifications`,
`export_license_number`) and trust fields (`verification_status`,
`verification_level` 0–3).

The policies are:

```sql
create policy supplier_profiles_select on public.supplier_profiles
  for select using (is_active = true and verification_status = 'verified');

create policy supplier_profiles_update_own on public.supplier_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
```

| Defect | Detail |
|---|---|
| **Self-verification** | `update_own` is row-scoped, not column-scoped. A supplier can `PATCH` their own row and set `verification_status = 'verified'`, `verification_level = 3`. The discovery gate then admits them. |
| **No administrative verifier** | No policy or function lets staff set verification; no admin UI exists (`/admin/verification` is observation verification, not suppliers). Only the supplier can write the field. |
| **Anon-readable directory** | `supplier_profiles_select` has **no `to authenticated`** clause, so it applies to `anon` as well. Verified suppliers' `contact_email`, `contact_phone`, `whatsapp_number`, `address` would be world-readable. |
| **No evidence model** | No document table, no verification event log, no expiry, no reviewer identity. `verification_status` is an unsubstantiated enum. |

Because the table is absent from production today, none of this is currently
exploitable — it is a defect shipped in the local chain that **must be fixed
before `0047` is ever applied**.

---

## 5. RFQs

Locally: `rfqs` (6-state `rfq_status`: draft → published → closed → awarded |
cancelled | expired), `quotes` (7-state), with `rfq_quote_count` and
`supplier_rating` maintenance triggers, plus `expire_old_rfqs()`.

| Aspect | Status |
|---|---|
| Buyer creates and publishes an RFQ | Implemented (route + form + insert policy) |
| Supplier discovers published RFQs | Implemented (`rfqs_select_published`; `is_public` or invited) |
| Invited-supplier targeting | Implemented by array membership `invited_supplier_ids` |
| Supplier submits a quote | Implemented (`quotes_insert`) |
| Buyer accepts a quote | Partially — status write allowed by owner, no transition guard |
| RFQ expiry | Function exists, **nothing schedules it** (`src/lib/jobs` has no RFQ job); and it is **granted to `authenticated`**, so any user can trigger a mass expiry |
| Quote withdrawal / expiry | Enum values exist; no logic |
| Notification on new quote | Missing |

Public RFQ visibility is a commercial decision with a privacy consequence:
`rfqs_select_published` (no role clause) exposes published, `is_public` RFQs —
including `buyer_id`, `delivery_location`, quantities — to anonymous readers.

---

## 6. Orders and transactions

Locally: `orders` (8-state `order_status`: draft, confirmed, in_progress,
shipped, delivered, completed, cancelled, **disputed**;
`order_payment_status`: pending, partial, paid, refunded), `order_events`
(11 event types incl. `dispute_opened`, `dispute_resolved`), and
`create_order_from_quote()` which freezes the quote into an order, advances the
RFQ to `awarded`, and emits an event.

| Aspect | Status |
|---|---|
| Order creation from an accepted quote | Implemented — **but see the authorization hole below** |
| Order status transitions | **Unguarded.** `orders_update` permits any owner to write any `order_status` value, including backwards and straight to `completed` |
| Payment status | Enum only — no payment, no settlement, no reconciliation; `billing_events` unused |
| Order numbering | Implemented (`generate_order_number`, unique per order) |
| Event trail | Implemented shape (append-only by absence of update/delete policies) |

### Defects in the local chain

| # | Defect | Consequence |
|---|---|---|
| **B-1** | `create_order_from_quote(uuid, text)` is `security definer`, callable by `authenticated`, and **does not check that the caller is the buyer of the RFQ or the supplier of the quote**. It verifies only that the quote is `accepted` | Any authenticated user who obtains a quote id can turn it into an order as the recorded buyer |
| **B-2** | The same function is `security definer` **without `set search_path`** | Classic definer-hijack surface; every other definer function in the chain sets `search_path` |
| **B-3** | `expire_old_rfqs()` granted to `authenticated` | Any user can force-expire published RFQs platform-wide |
| **B-4** | No transition guard on `orders`/`quotes`/`rfqs` | Illegal state jumps are permitted to any owner; `disputed` can be set with no evidence, and cleared by either party |
| **B-5** | No party-level restriction on which status a party may set | A supplier can mark an order `delivered` without buyer confirmation |

None is exploitable in production while the tables are absent. All would ship
with `0047`.

---

## 7. Ownership and isolation

Where tables exist in production, isolation is sound and was re-verified in
Phase 2: `saved_commodities`, `saved_markets`, `price_alerts` are
`user_id = auth.uid()`; `export_jobs` is `requested_by`/`is_admin`;
`notification_delivery_logs` / `scheduled_job_runs` are staff-scoped;
`audit_logs` is staff-read with admin insert.

The isolation model is **per user**. It has no concept of:

- organisation membership granting access to shared records (7 members across
  5 organisations exist, but no object is owned by an organisation except
  `organization_id` columns that no policy reads);
- a supplier's access to the buyer's records that concern them (that is what
  0047 adds: `buyer_id`/`supplier_id` predicates);
- delegated access (an employee acting for an organisation).

The B2B isolation model is therefore *drafted* in `0047` and *absent* from the
schema that is actually running.

---

## 8. Auditability and dispute evidence

| Event | Trail | Adequate? |
|---|---|---|
| Order created / status changed | `order_events` (from_status, to_status, actor, actor_type) — local only | Shape is good; not deployed; and events can be absent because transitions are unguarded |
| Quote submitted / accepted | status column only | No event table |
| RFQ published / awarded | status + `rfqs.awarded_at` | Thin |
| Supplier verified | **nothing** | No record of who verified, when, or on what evidence |
| Supplier reviewed | `supplier_reviews` table | No workflow, no moderation, no right of reply |
| Dispute | `disputed` status + `dispute_opened` event type | No resolution record, no evidence attachment, no timeline |
| Subscription state change | partial — only entitlement-JSON changes (lifecycle doc §4) | Insufficient for billing disputes |

For a dispute the platform could show: an order row, its current status, and —
once `0047` ships — a status-event list. It could not show who verified the
supplier, what evidence was checked, what was agreed in the quote beyond the
frozen row, or how a dispute was resolved. That is below the evidence standard
a B2B marketplace is normally held to.

---

## 9. Readiness verdict

| Question | Answer |
|---|---|
| Can two businesses transact today in production? | **No** — no supplier, RFQ, quote or order tables exist |
| If `0047` were applied as written, could they? | Technically yes, with three exploitable defects (B-1…B-3) and self-verification (§4) |
| Is supplier trust substantiated? | **No** — self-asserted and self-writable |
| Are transaction states governed? | **No** — enums exist, guards do not |
| Is there dispute evidence? | **No** |
| Is there a commercial model for B2B access? | **No** — no entitlement key, no org plan, no seat model |

**Verdict: not B2B-ready, and not close.** The data model is thoughtful — the
state machines, the event table, the capability fields are the right shape —
but the controls that make a marketplace trustworthy (verification by a
reviewer, guarded transitions, party-scoped writes, dispute records) are the
ones that are missing, and two of them are actively inverted (the supplier
writes their own verification; the buyer's order can be created by a stranger).

### Prerequisites before any B2B surface is exposed

1. Fix B-1 (caller check), B-2 (`set search_path`), B-3 (revoke execute) and
   the self-verification policy — in a **new** migration; `0047` is unapplied,
   so it can be superseded rather than edited only if the team prefers
   additive-only history. Either way, do not apply it as written.
2. Add a staff-only verification path with an evidence record.
3. Add transition guards (one function per entity, allowed-transition table).
4. Decide the B2B access model (entitlement key or agreement-based) and encode
   it, since no key exists today.
5. Add dispute records with resolution state and evidence pointers.
6. Stage the whole surface before exposing it — the local replica proves
   nothing about PostgREST or the UI.
