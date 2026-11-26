# Hatsi360 — Phase 4 B2B security review

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Starting HEAD | `54b808e3a814cdc6dddc8df87c56d318eb91c54f` |
| Subject | `0047_stage4_rfq_orders.sql` (**unapplied in production**) and its hardening, `0059_b2b_security_hardening.sql` |
| Mode | Review + local hardening + negative tests. **Not deployed** |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

---

## 1. What `0047` creates

Six tables (`supplier_profiles`, `rfqs`, `quotes`, `orders`, `order_events`,
`supplier_reviews`), four enums (`rfq_status`, `quote_status`, `order_status`,
`order_payment_status`), and six functions
(`generate_order_number`, `update_rfq_quote_count`,
`update_supplier_average_rating`, `update_supplier_profile_completeness`,
`create_order_from_quote`, `expire_old_rfqs`), plus 19 policies.

The data model is sound: parties are explicit columns, the state machines are
complete, and `order_events` is shaped like an audit table. The defects are all
in the *controls*, not the model.

---

## 2. Defects

| # | Defect | Evidence | Status |
|---|---|---|---|
| **B-1** | `create_order_from_quote` has **no caller check** — any authenticated user holding an accepted quote id can create the order | function body: only `quote.status <> 'accepted'` and existence are checked | **Fixed** in `0059` |
| **B-2** | Same function is `SECURITY DEFINER` **without `search_path`** | `language plpgsql security definer` and no `set search_path` | **Fixed** |
| **B-3** | `expire_old_rfqs()` is executed by `authenticated` — any user can mass-expire published RFQs | `grant execute … to authenticated` | **Fixed** (revoked, service_role only) |
| **B-4** | No transition guard: any party can write any `order_status`, including backwards | `orders_update` is ownership-only | **Fixed** (allowed-transition map) |
| **B-5** | No party restriction on status writes beyond ownership | same | **Fixed** (party check + reason for cancel/dispute) |
| **B-6** | Suppliers could set their own `verification_status` / `verification_level` | `supplier_profiles_update_own` is row-scoped, not column-scoped | **Fixed** (guard trigger) — see §3 |
| **B-7** | `order_events_insert` is `WITH CHECK (true)`: any authenticated user can forge audit events on any order | policy body | **Fixed** (policy dropped; events written by trigger) |
| **B-8** | `orders_insert` lets a buyer insert any order directly, bypassing the quote flow | `with check (buyer_id = auth.uid())` only | **Fixed** (accepted quote on own RFQ, `status = 'draft'`) |
| **B-9** | `update_supplier_average_rating()` and `update_supplier_profile_completeness()` are **not** `SECURITY DEFINER`, so a buyer's review cannot update the supplier row (RLS filters it) — ratings and completeness never change | function bodies + `supplier_profiles_update_own` | **Deferred** (functional, not a security hole) |

---

## 3. B-6 restated accurately

Phase 3 reported self-verification as an exploitable hole. Testing showed
something more subtle, and the Phase 3 severity was overstated:

- `supplier_profiles_select` requires `verification_status = 'verified'`.
- PostgreSQL applies the **SELECT** policy to the columns an UPDATE reads.
- Therefore a supplier still `pending` **cannot update its own row at all** —
  the UPDATE matches 0 rows, silently, with no error.

So an unverified supplier could not self-verify, because it could not write
anything. The real defect was the opposite of the report: **self-service
editing was broken**, and the vulnerability would appear only for an
already-verified supplier changing its level or reverting its status.

`0059` fixes both halves:

- `supplier_profiles_select_own` (`id = auth.uid()`) so a supplier can always read its own row;
- `guard_supplier_verification` blocks changes to
  `verification_status`, `verification_level`, `total_transactions`,
  `average_rating`, `profile_completeness` from any non-staff caller.

The guard is **`SECURITY INVOKER`**. As a definer function it would see
`current_user` as the owner, and its own "internal context" short-circuit would
disable it — a bug the negative tests caught immediately (the illegal
transitions were accepted).

---

## 4. Negative tests

`supabase/tests/b2b-security.mjs` — 22 checks, `0047` + `0059` applied inside a
single rolled-back transaction on the local replica.

| Test | Expected | Result |
|---|---|---|
| Pending supplier sets `verification_status='verified'` | `42501` | PASS |
| Pending supplier edits its own contact phone | 1 row | PASS |
| Verified supplier raises its `verification_level` | `42501` | PASS |
| Supplier sets `average_rating` / `total_transactions` | `42501` | PASS |
| Supplier edits `business_name` | 1 row | PASS |
| Staff sets verification | accepted | PASS |
| Stranger calls `create_order_from_quote` | `42501` | PASS |
| Supplier calls `create_order_from_quote` | `42501` | PASS |
| Buyer calls it | accepted | PASS |
| Order parties come from the records, not the caller | buyer/supplier frozen | PASS |
| Same quote twice | `23505` | PASS |
| Authenticated calls `expire_old_rfqs` | `42501` | PASS |
| `service_role` calls `expire_old_rfqs` | executed | PASS |
| Illegal transition `confirmed → completed` | `22023` | PASS |
| Status change by a non-party | 0 rows (RLS) | PASS |
| Legal transition `confirmed → in_progress` | 1 row | PASS |
| Cancel without a reason | `22023` | PASS |
| Dispute with a reason | 1 row | PASS |
| Forged `order_events` insert by a party | `42501` | PASS |
| Event trail contains `created` + two `status_changed` with from/to | 3 events | PASS |
| Direct `orders` insert with a forged status | `42501` | PASS |
| `search_path` pinned on all three functions | all three | PASS |

The trail assertion is the interesting one: after the buyer creates the order,
the supplier moves it to `in_progress`, and the buyer disputes it, the events
read `created → confirmed`, `confirmed → in_progress`, `in_progress → disputed`
with no client-written rows.

---

## 5. Deployment shape

`0059` corrects objects that `0047` creates, so the two are inseparable:

```sql
begin;
  \i supabase/migrations/0047_stage4_rfq_orders.sql
  \i supabase/proposed/0059_b2b_security_hardening.sql
commit;
```

Applying `0047` alone ships every defect above. Applying `0059` alone fails —
there is nothing to harden. The pairing is asserted by the suite, which strips
`0047`'s own `begin;`/`commit;` so the harness transaction owns the outcome
(D-5 in the design document).

---

## 6. Residual risks (accepted for now)

| # | Residual | Consequence |
|---|---|---|
| R-1 | No dispute record beyond `cancellation_reason` + an event | A dispute has a reason string and a timeline, not evidence, attachments or a resolution state |
| R-2 | No supplier verification evidence table | `verification_status` is staff-asserted, unattributed and undated |
| R-3 | Ratings never update (B-9) | Reputation is empty until the trigger functions are corrected |
| R-4 | Published public RFQs are readable by anyone | Buyer identity, delivery location and quantities are exposed by design; needs a privacy decision before launch |
| R-5 | `order_payment_status` has no writer | Orders can be `paid` with no payment record |
| R-6 | No settlement, escrow or dispute workflow | Out of scope by instruction; B2B remains a record-keeping surface, not a transaction system |

---

## 7. Verdict

`0047` as written would have shipped four exploitable authorisation defects and
a forgeable audit trail. With `0059` applied atomically, the authorisation
model holds up under negative testing: parties can act, strangers cannot,
nobody can grant themselves trust, transitions are constrained, and the event
trail is a consequence of the change rather than a claim by the client.

That is **necessary and not sufficient** for B2B. Verification has no evidence
model, disputes have no record, and money has no representation. The
recommendation is unchanged: `NOT_READY_FOR_PRODUCTION`, and `0047`+`0059` go
to staging together or not at all.
