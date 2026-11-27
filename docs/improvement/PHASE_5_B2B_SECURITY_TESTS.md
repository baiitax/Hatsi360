# Phase 5 — B2B Transaction Security Tests

**Status:** complete · **Verdict:** `NOT_READY_FOR_PRODUCTION` (unchanged)
**Suite:** `supabase/tests/b2b-acceptance.mjs` · **Result:** **20/20** (was 15/15 with 2 open deviations)
**Database:** local migration-chain replica, `0047` then `0059`, one rolled-back transaction

---

## 1. What these tests do that Phase 4's did not

Phase 4's `b2b-security.mjs` (22/22) proved the *guards respond*. This suite proves the
*transactions are safe*: it builds a two-buyer, two-supplier graph, drives it through the real
RPCs, and then attacks the seams — including the plain PostgREST `INSERT`, which is the path a
guarded RPC never sees.

Seven cases were specified. Six pass unchanged; the seventh (audit-event forgery) needed two
attackers rather than one. Three new cases came out of running them.

| # | Case | Attacker | Result |
|---|---|---|---|
| 1 | Supplier self-verification | supplier updates own `verification_status` | `42501` |
| 2 | Cross-supplier trust write | supplier B sets supplier A verified | 0 rows |
| 2b | Cross-supplier profile write | supplier B edits supplier A's phone | 0 rows |
| 3 | Cross-customer quote read | buyer A reads buyer B's quote | 0 rows |
| 3b | Order from another buyer's quote | buyer A calls `create_order_from_quote(buyer B's quote)` | `42501` |
| 4 | Non-party staff creates order | analyst calls the RPC on a stranger's quote | accepted (documented staff override) |
| 4b | Buyer creates order | buyer on own accepted quote | accepted |
| 4c | Total comes from the quote | — | `30000000` = 300000 × 100 |
| 5 | Confirmed → completed | buyer | `22023` |
| 5b | Dispute with no reason | buyer | `22023` |
| 5c | Confirmed → shipped (skips `in_progress`) | buyer | `22023` |
| 5d | Price rewrite after creation | buyer sets `total_amount=1` | `42501` |
| 6 | Authenticated RFQ expiry | buyer calls `expire_old_rfqs()` | `42501` |
| 7 | Forged audit event | supplier inserts `order_events` | `42501` |
| 7b | Forged event by unrelated supplier | supplier B on supplier A's order | `42501` |
| 8 | Forged economics on own accepted quote | buyer inserts with `unit_price=1` | `42501` **(new)** |
| 8b | Honest direct insert | buyer inserts with the quote's numbers | accepted **(new)** |
| 9 | Order created already paid | buyer inserts with `paid_amount` set | `42501` **(new)** |
| 9b | Buyer marks an order paid | buyer `update … payment_status='paid'` | `42501` **(new)** |
| 9c | Non-payment edit | buyer edits `buyer_notes` | 1 row **(new)** |

## 2. The two deviations, and why they mattered

Running the specified cases surfaced two holes that no test asserted, because the suite only
attacked through the RPC:

**D-1 — forged order economics (now S-2).** `orders_insert` correctly pins `buyer_id = auth.uid()`,
`status = 'draft'` and the quote to the buyer's own RFQ. It did not constrain `unit_price`,
`total_amount` or `quantity`. A direct PostgREST insert could therefore name any price, and the
transition guard would then happily accept `draft → confirmed` because nothing had changed *after*
creation. The economics were forged at birth, so an "immutable after creation" rule never saw them.

**D-2 — payment state (now S-3).** `payment_status` and `paid_amount` were outside the immutable
set, so a buyer could mark an order paid with no payment record anywhere. There is no payment
integration in this system, which is precisely why the field must not be client-writable: nothing
downstream would contradict the claim.

Neither was a regression from Phase 4. Both were reachable before it and after it, and both were
invisible to a suite that only attacks through the front door.

## 3. The fix (0059, amended in this phase, still unapplied)

`0059` has never been applied anywhere, so it was amended rather than shipped with a known hole —
it is a proposal, not a deployed migration.

**Economics pinned at insert.** New `BEFORE INSERT` trigger `orders_pin_quote_economics`,
`SECURITY INVOKER` (the decision depends on who is inserting, so the caller's role must be
observable). For any caller that is not staff and not an internal role it requires:

```
unit_price    = quote.unit_price
currency_code = quote.currency_code
quantity      = quote.offered_quantity
total_amount  = quote.unit_price * quote.offered_quantity
quote.status  = 'accepted'
payment_status = 'pending' and paid_amount = 0
```

`create_order_from_quote()` is `SECURITY DEFINER`, so `current_user` is the definer and the trigger
returns early — the RPC's own path is unchanged (test 4b still passes, total still 30 000 000).

**Payment state frozen.** `payment_status`, `paid_amount`, `payment_method` and `invoice_number`
joined the immutable set inside `guard_order_transition`. The function already returns early for
staff and internal roles, so support can still correct a payment manually; only the parties are
frozen.

**Why reject rather than silently rewrite.** A buyer who supplies a different price is either
attacking or badly broken; quietly substituting the right number would hide both. The trigger
raises `42501`, which the API layer reports and the audit trail records.

## 4. Proving the fix is not a false positive

A control that blocks everything is not a control. Each new rule is tested in both directions:
8/8b (forged insert rejected, honest insert accepted), 9/9b/9c (paid-at-creation rejected, later
payment change rejected, ordinary note edit accepted). That pairing is what distinguishes "the
guard works" from "the guard is in the way".

## 5. Interaction with the rest of the pack

| Suite | Result after amending 0059 |
|---|---|
| `b2b-security.mjs` (Phase 4) | 22/22 — unchanged |
| `rpc-contract.mjs` | 49/49 — unchanged |
| `entitlement-integration.mjs` | 23/23 — unchanged |
| `entitlement-rls-enforcement.mjs` | 22/22 — unchanged |
| `rls-acceptance-matrix.mjs` | 122/126 — unchanged (the 4 red are `export_jobs × service_role`, unrelated) |
| `proposal-review.mjs` idempotency | `0047` + `0059` ×2 still clean |

The pin trigger adds one `quotes` lookup per inserted order row. That is a per-row read inside the
inserting transaction; no concurrency or bulk-insert behaviour was measured.

## 6. What these tests do not prove

1. **Nothing was executed through PostgREST.** Every call is a direct SQL statement with a JWT
   claim payload. Whether PostgREST maps `42501` to `403` and `22023` to `400`, and whether it
   surfaces the trigger's message, is untested here — see `PHASE_5_HOSTED_TEST_STRATEGY.md` (H-3, H-9).
2. **The API layer is not covered.** A route that catches a `42501` and retries through a
   service-key client would defeat all of this at a higher layer.
3. **Race conditions are not covered.** Two buyers confirming the same quote concurrently, or an
   order confirmed while its quote is withdrawn, were not exercised. `quotes.converted_to_order_id`
   suggests the intent to make conversion once-only, but nothing here proves it under concurrency.
4. **`supplier_reviews` and `buyer_offers`/`seller_offers`** are outside this suite; they are
   covered at policy level by `b2b-security` and are not part of the RFQ→order graph.

## 7. Reproducing

```bash
node supabase/tests/b2b-acceptance.mjs      # 20/20, 0 documented deviations
```

The suite rolls back its transaction; the replica is unchanged afterwards.
