# Phase 6 — Curated EXECUTE Privilege Design

**Status:** design complete, proposal written, locally validated · **Not applied**
**Proposal:** `supabase/proposed/0061_function_execute_least_privilege.sql` (257 lines)
**Evidence:** `supabase/tests/function-privileges.mjs` — **60/60**
**Verdict:** `NOT_READY_FOR_PRODUCTION` (unchanged)

---

## 1. The design in one paragraph

Revoke `EXECUTE` from `PUBLIC`, `anon`, `authenticated` and `service_role` on every application
function, then grant it back per class: **three** functions to `anon` (the measured minimum for
anonymous RLS evaluation), everything else a signed-in session uses to `authenticated`, and the
audit writer plus the auth hook and all trigger functions to `service_role` only. Extension
functions are not touched, because revoking them breaks operators.

## 2. Why the anonymous allowlist is exactly three functions

Phase 5 established that a blanket revoke breaks anonymous reads. This phase measured which
functions anonymous reads actually call, instead of inferring it:

1. Revoke everything from `anon`, grant a candidate set back.
2. Probe **every** table `anon` can `SELECT`, using `select count(*)` — a full scan.
3. Remove candidates one at a time; a candidate is dropped only if all probes still pass.

Two findings from doing it properly:

* **A `limit 1` probe is worthless here.** With one public and one premium report seeded, an
  anonymous `select 1 from market_reports limit 1` succeeded while a full scan failed `42501` —
  the plan stopped at the public row and never evaluated the premium branch. Every probe in Part E
  now uses `count(*)`. The earlier "all tables readable" result was an artefact of the cheap probe.
* **The minimal set is three, not eight.** All eight policy-referenced helpers were candidates;
  five proved unnecessary for anonymous access:

| Function | Needed by `anon` | Evidence |
|---|---|---|
| `is_public_observation` | **yes** | dropping it → `price_observations`, `price_observation_evidence` return `42501` |
| `is_staff` | **yes** | dropping it → `offer_verification_events` returns `42501` |
| `has_entitlement_safe` | **yes** | dropping it → `market_reports` returns `42501` once a premium row exists |
| `has_role`, `is_active_account`, `is_admin`, `assigned_market_ids`, `can_perform_bulk_operations` | no | dropping them changes nothing for `anon`; their policies are `authenticated`-only |

`has_entitlement` is **not** in the set: after `0058`, `reports_public_read` calls
`has_entitlement_safe` instead. That is a hard ordering dependency — see §5.

## 3. The four classes

| Class | Granted to | Count | Includes |
|---|---|---|---|
| **1. Public** | `anon`, `authenticated`, `service_role` | 3 | the anonymous RLS helpers above |
| **2. Authenticated** | `authenticated`, `service_role` | 52 | every session RPC, every staff-guarded workflow function, the jobs runner, the sign-in rate limiter, both order/RFQ functions, the remaining RLS helpers |
| **3. Staff / admin** | — | — | **not expressible as a grant**, see §4 |
| **4. Service only** | `service_role` | 14 | `write_audit`, `handle_new_user`, 12 trigger functions |

Every function is named explicitly in the proposal's classification table with a one-line reason,
and the file refuses to apply if any application function is left unclassified.

## 4. Staff-only is a guard, not a grant — and saying so matters

There is no `staff` database role. A signed-in analyst connects as `authenticated`, exactly like a
customer; "staff" is a claim in the profile/JWT that `is_staff()` resolves. So `set_user_role`,
`set_account_status`, `publish_observation` and the other supervisor functions cannot be separated
from ordinary user functions at the privilege layer — they keep `authenticated` `EXECUTE`.

Calling that out is the point. The design does not claim a privilege boundary it cannot enforce;
instead it pins the boundary where it actually lives and proves it there — `function-privileges.mjs`
attacks `set_user_role` and `set_account_status` as a **non-staff authenticated session** and
requires `42501`, and attacks a direct `profiles.role` write and requires refusal.

## 5. Ordering dependency (this is the dangerous part)

`0061` **must not be applied before `0056` and `0058`.**

Before `0058`, production's `reports_public_read` policy calls `has_entitlement('reports')`, not
`has_entitlement_safe('reports')`. `0061` revokes `has_entitlement` from `anon`. Applied in the
wrong order, every anonymous report read becomes `42501` — a live outage caused by a hardening
migration.

The file defends itself: its fourth self-check walks every anon-reachable policy, extracts the
function names referenced in the predicate, and raises if `anon` cannot execute any of them. Applied
against the pre-0058 policy set it fails loudly instead of shipping. Verified in-suite:
`function-privileges.mjs` check 7 re-runs the same query independently.

## 6. Future function creation

PostgreSQL will keep defaulting new functions to `PUBLIC` `EXECUTE`, and a `ALTER DEFAULT
PRIVILEGES … REVOKE EXECUTE … FROM PUBLIC` is possible but blunt: it would also strip the grant from
functions that a policy needs, and the failure would appear only when someone reads a table.

The recommendation is therefore a **test, not a default**: `function-privileges.mjs` check 6 fails
the moment any application function is executable by `PUBLIC`, and check 6b fails if the `anon` set
differs from the three names. Any future function is either classified — and the check passes — or
the suite goes red at review time. Default-privilege hardening for functions remains a residual
(§8), deliberately weaker than a test that names the expectation.

## 7. What the design does not change

* **Extension functions** (115) keep `PUBLIC` `EXECUTE`. Revoking `citext_eq` breaks `=` on
  `citext` columns for whoever loses it, including anonymous reads of `commodities` and `countries`.
* **No function is rewritten.** `write_audit`'s missing guard is contained by classification
  (`service` only), not repaired. Rewriting it is application work with its own review.
* **No table privilege, policy or grant is touched.** `0060` owns table privileges; `0061` owns
  function privileges. Two files, two failure modes, two rollbacks.

## 8. Residuals

| # | Residual | Why it stays |
|---|---|---|
| R-1 | 115 extension functions remain `anon`-executable | operator invocation needs `EXECUTE`; moving extensions out of `public` is platform-level |
| R-2 | `PUBLIC` is still the default grantee for future functions | guarded by test, not by default privileges |
| R-3 | Five `SECURITY DEFINER` functions remain unpinned (`complete_onboarding`, `update_onboarding_step`, and three trigger functions) | low severity, no user-controlled search path; separate hardening |
| R-4 | `notify`, `record_login_attempt` and the jobs runner stay `authenticated` | their call sites use the session client; moving them to the admin client is an application change that must land first |

## 9. Validation

```
node supabase/tests/function-privileges.mjs     # 60/60
```

The suite applies `0056`+`0057`+`0058`+`0061` in one rolled-back transaction and proves: all 29
anonymous-readable tables still readable; 13 sensitive functions `42501` for `anon`; the three
helpers callable; self-elevation refused; audit forgery refused three ways; no application function
reachable through `PUBLIC`; the `anon` set is exactly the allowlist; every anon-reachable policy
resolves; session and staff paths still execute.

## 10. What would make this phase's work releasable

1. Apply `0056` → `0058` on staging, then `0061`, in that order.
2. Run H-1…H-10 (the HTTP layer is still unproven — see `PHASE_5_HOSTED_TEST_STRATEGY.md`).
3. Re-run `function-privileges.mjs` against staging; the local pass is necessary, not sufficient.
