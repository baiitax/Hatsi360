# Phase 5 — RLS Acceptance Matrix

**Status:** complete · **Verdict:** `NOT_READY_FOR_PRODUCTION` (unchanged)
**Suite:** `supabase/tests/rls-acceptance-matrix.mjs` · **Result:** 122/126, then **126/126** with `0060`
**Database:** local migration-chain replica, one rolled-back transaction, real roles and JWT claims

---

## 1. Method

Each cell is an executed statement, not a registered expectation. The suite applies
`0056`+`0057`+`0058` to the replica, seeds one user per role with a real `public.profiles` row and
the subscriptions that context needs, creates one owned fixture row per table per user, then runs
each operation under `set local role` plus a `request.jwt.claims` payload carrying that user's `sub`.

Seven contexts are exercised. `supplier` and `customer` both collapse to "authenticated without
entitlement" for these tables — they are kept separate because it is exactly the confusion that
hides defects: a supplier-facing route reading an entitlement table looks identical to a customer
one until the role is in the statement.

| Context | Role | JWT `sub` | Entitlements |
|---|---|---|---|
| `anon` | `anon` | none | none |
| `customer` | `authenticated` | buyer | none |
| `entitled` | `authenticated` | buyer | watchlists, alerts, exports |
| `supplier` | `authenticated` | supplier | none |
| `staff` | `authenticated` | analyst | none (bypass via `is_staff()`) |
| `admin` | `authenticated` | admin | none (bypass via `is_admin()`) |
| `service_role` | `service_role` | none | bypasses RLS |

Outcome legend: ✅ allowed (and expected) · ⛔ denied (and expected) · ∅ allowed by privilege but
zero rows visible · ⚠️ an error other than `42501` · ❗ allowed when it should not be.

## 2. The matrix

| Table · operation | anon | customer | entitled | supplier | staff | admin | service_role |
|---|---|---|---|---|---|---|---|
| `saved_commodities` · SELECT | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `saved_commodities` · INSERT | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `saved_commodities` · UPDATE | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `saved_commodities` · DELETE | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `saved_markets` · SELECT | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `saved_markets` · INSERT | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `saved_markets` · UPDATE | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `saved_markets` · DELETE | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `price_alerts` · SELECT | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `price_alerts` · INSERT | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `price_alerts` · UPDATE | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `price_alerts` · DELETE | ⛔ | ⛔ | ✅ | ⛔ | ✅ | ✅ | ✅ |
| `export_jobs` · SELECT | ⛔ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `export_jobs` · INSERT | ⛔ | ⛔ | ✅ | ⛔ | ⛔ | ✅ | ✅ |
| `export_jobs` · UPDATE | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ | ✅ |
| `export_jobs` · DELETE | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |

### Reading it

* **The entitlement gate holds across role boundaries.** `customer` and `supplier` behave
  identically — an unentitled supplier gains nothing on watchlists, alerts or exports by virtue of
  being a supplier, which was the Phase 4 remediation's core requirement.
* **`price_alerts` SELECT is ownership-only, by design.** An unentitled authenticated user can read
  their own alerts (rows created before an entitlement lapsed) but cannot create, edit or delete
  one. That asymmetry stops a lapsed customer's dashboard from erroring.
* **`export_jobs` distinguishes staff from admin.** `staff` (analyst) can read and create their own
  export job but cannot update one; `admin` can update any. The matrix proves `is_admin()` and
  `is_staff()` are not interchangeable — a defect invisible if only one privileged role existed.
* **`export_jobs` has no DELETE policy at all.** No role reaches DELETE, `admin` included. Only a
  `BYPASSRLS` connection can delete an export job: exports are an audit trail, not user furniture.
* **A ⛔ in the `service_role` column is the finding.** Four cells, all `export_jobs`, one cause:
  the table grants `service_role` nothing (**S-4/S-5**). It is a privilege gap, not a policy gap —
  `service_role` never reaches RLS on that table.
* The reference-data tables are absent on purpose: they are world-readable with a single
  `is_staff()` write policy and no ownership dimension, so they are covered by the
  `anon-reference-write` group instead (8 cells, all green).

## 3. Ownership × entitlement: can they combine into unintended access?

The risk is a policy shaped `owns OR has_entitlement` rather than `owns AND has_entitlement`. Six
cells test the combination directly:

| Probe | Expected | Got |
|---|---|---|
| entitled buyer reading another user's watchlists | 0 rows | 0 rows |
| `staff` reading another user's watchlists | 0 rows | 0 rows |
| entitled buyer reading another user's alerts | 0 rows | 0 rows |
| `staff` reading another user's export jobs | 0 rows | 0 rows |
| `admin` reading every export job | > 0 | 4 |
| `service_role` reading every watchlist row | > 0 | 5 |

Entitlement widens *capability*, never *ownership*: no non-admin context sees another user's rows,
and staff — who bypass every entitlement check — still cannot read another user's watchlist. The
single documented exception is `admin` on `export_jobs`, which is deliberate (support must be able
to see a failed export) and is now recorded here rather than only in the policy.

## 4. B2B tables

`rfqs`, `quotes`, `orders`, `order_events` and `supplier_profiles` have multi-party ownership
(buyer, supplier, staff, admin) and are covered by the two B2B suites rather than duplicated here,
because their fixtures form a transaction graph (RFQ → quote → order → events) that cannot be
expressed as a per-user row.

| Table | SELECT | INSERT | UPDATE | DELETE | Covered by |
|---|---|---|---|---|---|
| `supplier_profiles` | own + public columns | own (registration) | own non-trust columns only | — | `b2b-security` 22/22, `b2b-acceptance` 1–2b |
| `rfqs` | buyer, invited suppliers, staff | buyer | buyer while open | — | `b2b-security`; `b2b-acceptance` 6 |
| `quotes` | supplier, RFQ buyer, staff | supplier against own profile | supplier while submitted | — | `b2b-acceptance` 3, 3b |
| `orders` | buyer, supplier, staff | RPC, or owned accepted quote with **economics pinned** | party, legal transitions only, payment state frozen | none | `b2b-acceptance` 4–5d, 8–9c |
| `order_events` | parties to the order | **no INSERT policy for anyone** | none | none | `b2b-acceptance` 7, 7b |

The `order_events` row is the important one: with no INSERT policy, a forged audit event is refused
with `42501` for both a party and an unrelated authenticated supplier. Events are written only by
the `SECURITY DEFINER` trigger.

## 5. Not covered by this matrix, and why

1. **PostgREST.** RLS as enforced through the REST layer involves JWT verification, role assumption
   and schema preflight errors that no local test reproduces. A cell proving `authenticated` is
   denied at SQL level does not prove the HTTP call returns 403 rather than 200 with an empty
   array. See `PHASE_5_HOSTED_TEST_STRATEGY.md`.
2. **Service-key handling.** The matrix assumes the caller holds the service key. Whether that key
   can reach a browser is an application concern, covered by `tests/security/client-bundle.test.ts`.
3. **Time-dependent access.** No cell tests an entitlement expiring between two statements.
   `price_alerts` SELECT is ownership-only precisely because that scenario exists, but it is not
   executed here.
4. **Bulk paths.** `price_observations` / `international_trade_records` bulk reads go through
   entitlement RPCs, not table SELECT: `entitlement-integration` 23/23, `rpc-contract` 49/49.
5. **Views.** 14 views exist in `public`; none of the four entitlement tables is exposed through
   one today. A future view over `orders` would bypass these policies unless it is
   `security_invoker`.

## 6. Reproducing

```bash
node supabase/tests/rls-acceptance-matrix.mjs                         # 122/126 — 4 red, cause S-4
WITH_PROPOSED_0060=1 node supabase/tests/rls-acceptance-matrix.mjs    # 126/126
MATRIX_OUT=/tmp/matrix.md node supabase/tests/rls-acceptance-matrix.mjs
```
