# Hatsi360 — Phase 4 remediation design

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Starting HEAD | `54b808e3a814cdc6dddc8df87c56d318eb91c54f` (confirmed, clean worktree) |
| Mode | Read-only analysis of production; local implementation; **no production SQL executed** |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

This document is the design behind four proposed migrations and the application
changes that accompany them. Nothing here has been applied to production.

| Deliverable | File |
|---|---|
| Resolver repair | `supabase/proposed/0056_entitlement_resolver_repair.sql` |
| Database enforcement | `supabase/proposed/0057_entitlement_rls_enforcement.sql` |
| Report access | `supabase/proposed/0058_reports_access_policy.sql` |
| B2B hardening | `supabase/proposed/0059_b2b_security_hardening.sql` |
| *(Phase 2, unchanged)* | `supabase/proposed/0055_supabase_admin_default_privileges.sql` — still outside the chain |

---

## 1. Root causes, and the design answer to each

| # | Root cause (Phase 3) | Design answer | Where |
|---|---|---|---|
| R1 | `user_entitlements()` aliases `jsonb_each` as `(k, v)` then references `e.k` → `42P01` on every call | Recreate without the alias list; replace the boolean cast with a jsonb comparison so a malformed stored value cannot raise either | `0056` |
| R2 | Application sends `entitlement_key`, function takes `p_key` → `42883` / PGRST202 | Fix the five call sites; **do not** add a same-typed overload | app + `0056` |
| R3 | `can_perform_bulk_operations()` absent (0045 unapplied); its staff branch tested a non-existent role value | Create it with `is_staff()` | `0056` |
| R4 | Zero database entitlement enforcement (0042–0045 unapplied) | One self-contained enforcement migration that converges whether or not they ran | `0057` |
| R5 | A raising entitlement test inside a policy fails the query instead of denying the row | Fail-closed safe wrapper in policies; report policy restructured so the public branch never depends on it | `0056`, `0058` |
| R6 | Failures were swallowed: "upgrade your plan" for a server defect, no log line | Degraded entitlement set + distinct error type + logging at the boundary | app |
| R7 | B2B: self-verification, unauthenticated definer call, public expiry function, unguarded transitions, forgeable events | Hardening migration with negative tests | `0059` |

---

## 2. R2 — why the database keeps one signature

The mismatch can be fixed in two places. Only one is safe.

**Rejected: add `has_entitlement(entitlement_key text)` as an overload.**
Two single-`text` overloads make the positional call `has_entitlement('watchlists')`
ambiguous (`42725`), and PostgREST resolves RPCs by argument name, so the
overload would make the broken call *work* while leaving the application wrong
and the database ambiguous. It hides the defect instead of removing it.

**Chosen: correct the application, keep `p_key`.** The database has one
unambiguous signature; the app is the only caller; a static contract test
(`supabase/tests/rpc-contract.mjs`) now reads every `supabase.rpc(...)` call in
`src/` and compares its argument names with `pg_proc.proargnames`, so the same
class of defect fails the suite instead of reaching production.

---

## 3. R5 — the fail-closed model

Three behaviours, deliberately different:

| Surface | Function | Behaviour on resolver failure | Rationale |
|---|---|---|---|
| Policies, UI gates | `has_entitlement_safe(text)` | returns `false`, `RAISE WARNING` | A premium feature must deny, not error |
| Tests, diagnostics, strict callers | `has_entitlement(text)` | **raises** | The defect stays visible; a suite cannot pass by accident |
| Public product surfaces | policy restructured | unaffected | A paying customer's page must not depend on the entitlement engine to render public content |

`0058` is the important case. Production's policy was:

```sql
(not is_premium and published_at is not null) or is_staff() or has_entitlement('reports')
```

The third term raises, so the whole row set fails — including rows the first
term would have admitted. The replacement evaluates the public condition
independently and only consults the engine inside the premium branch, through
the safe wrapper. Verified in the suite: with the resolver reinstalled broken,
an anonymous read still returns the public report and the entitled user
degrades to public-only (no error, no outage).

---

## 4. R4 — why `0057` is self-contained

`0042`–`0045` exist in the repository and are unapplied in production.
Production still carries the pre-0042 ownership policies
(`saved_commodities_owner` `FOR ALL`, `price_alerts_owner` `FOR ALL`,
`export_jobs_insert`, …). An `ALTER POLICY` or a partial patch would therefore
behave differently depending on whether those four ever ran.

`0057` drops both generations and recreates the full enforced set, so:

- applied to production (where 0042–0045 never ran) → converges;
- applied on top of 0042–0045 (the local replica) → converges to the same state;
- applied twice → idempotent.

Its self-check asserts two things that are easy to get wrong: that every
expected policy exists, and that **no `FOR ALL` ownership policy survived** — an
`ALL` policy is permissive and would OR its way past the entitlement predicate,
which is exactly the shape of the original defect.

Role handling is explicit. `anon` is denied by absence (no policy targets it);
`authenticated` needs ownership *and* entitlement; staff and admin bypass by
predicate, as before; `service_role` keeps `BYPASSRLS`.

---

## 5. R3 — a correction inside the correction

`0045`'s function ended with:

```sql
or exists (select 1 from public.profiles
           where id = auth.uid() and role in ('admin','staff') and account_status = 'active')
```

`public.user_role` has no `'staff'` value — the enum is
`public_user, customer, agent, verification_officer, market_supervisor, analyst, admin, super_admin`.
That branch could only ever match `admin`, which `is_admin()` already covers;
staff-side bulk access therefore never worked as written. `0056` replaces the
whole expression with `is_staff() OR has_entitlement_safe('bulk')`, which is
what the comment always claimed.

---

## 6. R7 — B2B design

`0047` is unapplied, so its defects are latent. They are corrected in a
**separate** migration rather than by editing `0047` — the same discipline that
keeps applied migrations immutable, applied one step earlier. Ordering is
therefore load-bearing, and the two files must be applied in one transaction:

```sql
begin;
  \i supabase/migrations/0047_stage4_rfq_orders.sql
  \i supabase/proposed/0059_b2b_security_hardening.sql
commit;
```

| Defect | Correction |
|---|---|
| Supplier sets its own `verification_status` / `verification_level` | `BEFORE UPDATE` guard: trust and reputation columns are staff-only |
| `create_order_from_quote` had no caller check, no `search_path` | Caller must be the RFQ buyer or staff; `search_path = public, pg_temp`; one order per quote |
| `expire_old_rfqs()` executable by any authenticated user | `REVOKE` from `public`/`anon`/`authenticated`, `GRANT` to `service_role` |
| Any order status reachable by any party | Allowed-transition map + party check + reason required for cancel/dispute |
| `order_events_insert` `WITH CHECK (true)` — forgeable evidence | Policy dropped; events written only by triggers and definer functions |
| `orders_insert` allowed a buyer to bypass the quote flow | Insert requires an accepted quote on the caller's own RFQ, `status = 'draft'` |

**Audit principle:** a party can drive a transition; it cannot author its own
evidence. `record_order_transition()` writes the event, including
`from_status`/`to_status` and the actor, so the trail is a consequence of the
change rather than a separate request the client could skip.

---

## 7. Findings discovered *while* designing (not in the Phase 3 audit)

These are new, and each changed the design:

| # | Finding | Effect on design |
|---|---|---|
| D-1 | `coalesce(e.value,'false')::boolean` raised `22P02` for a non-boolean stored value — a second, independent way for every entitlement check to fail | `0056` compares `e.value = 'true'::jsonb` instead of casting |
| D-2 | A `LANGUAGE sql` body is validated at creation, so the broken resolver can only be installed with `check_function_bodies = off` — which is how `0016` reached production | the integration suite sets that flag deliberately when it re-installs the defect |
| D-3 | `supplier_profiles_select` requires `verification_status = 'verified'`, and PostgreSQL applies the **SELECT** policy to columns an UPDATE reads — so a `pending` supplier could not edit its own profile at all (UPDATE matched 0 rows, silently) | `0059` adds `supplier_profiles_select_own` (`id = auth.uid()`); without it the "self-verification" fix would have made a broken surface merely safer |
| D-4 | A `SECURITY DEFINER` guard sees `current_user` as the owner, which disables its own "internal context" check | guards are **`SECURITY INVOKER`**; only the event writer is definer |
| D-5 | `0047` wraps itself in `begin; … commit;`, so applying it inside a harness transaction silently commits | the harness strips transaction control and documents why |
| D-6 | `update_supplier_average_rating()` / `update_supplier_profile_completeness()` are **not** `SECURITY DEFINER`, so a buyer's review cannot update the supplier row (RLS filters it) — ratings never change | **not fixed** here: recorded as B-9, out of scope for a security hardening file |

D-3 deserves emphasis: the Phase 3 report described self-verification as
exploitable. It is not, as written — the SELECT policy blocks every update by an
unverified supplier. The correction is therefore a *guard*, not a blocked
exploit, and the report's severity for that item was overstated. The
integration suite now asserts both halves: the trust fields are protected, and
ordinary self-service editing works.

---

## 8. What deliberately does not change

- **No grants revoke.** `0057` changes policies, not privileges; `0053`'s work is untouched.
- **No data.** No row is created, updated or deleted by any proposal.
- **No applied migration is edited.** `0016`, `0042`–`0045`, `0052`, `0053` are history.
- **No product limits invented.** "5 saved items", "50 alerts", "10,000 requests/month" stay unimplemented; enforcing them is a feature decision, not a remediation.
- **No payment integration**, no subscription changes, no staging provisioning.
- **`0055` stays outside the chain**, unchanged.

---

## 9. Blast radius and reversal, per proposal

| Proposal | Changes | Reversal |
|---|---|---|
| `0056` | 3 functions replaced, 1 created | `create or replace` back to the 0052 body; nothing else touched |
| `0057` | 20 policies replaced on 8 tables | re-apply `0042`–`0045`; the pre-0042 ownership policies would have to be recreated deliberately (they are the exposure) |
| `0058` | 1 policy on `market_reports` | re-apply `0016`'s policy statement |
| `0059` | 4 functions, 4 triggers, 3 policies on B2B tables | drop the triggers and re-apply the `0047` policies — only meaningful if `0047` was applied, which is the atomic pairing |

None is destructive. The one with a real behavioural consequence is `0057`:
users who currently see watchlists and alerts will lose access unless they hold
the entitlement. That is the intent, and it is why it needs a staging run and a
decision, not just a review.

---

## 10. Decisions the owner still has to make

1. **Apply `0056` first, alone?** It is the only change that unbreaks production without changing any authorisation outcome. Recommended as a separate, immediately reversible step.
2. **Free history window.** This design uses **90 days**, with the `bulk` entitlement extending to **3,650**. That number is a product choice, not a discovered constant.
3. **Whether `market_reports` premium rows stay premium.** Today the table is empty and the public API serves computed reports regardless; the policy now works either way.
4. **Whether `0047` ships at all**, and if so as the atomic pair with `0059`.
5. **B-9 (rating triggers).** Fix now, or accept that supplier ratings do not update until a later phase.
