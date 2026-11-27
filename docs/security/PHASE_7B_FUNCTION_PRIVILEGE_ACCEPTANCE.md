# Phase 7B — Function Privilege Acceptance

**Classification:** preparation only · **Baseline:** `ce17b64081648bb0cad5a7ace008478dcbde2fce`
**Proposal under review:** `supabase/proposed/0061_function_execute_least_privilege.sql` (unapplied)
**Local evidence:** `supabase/tests/function-privileges.mjs` — **61/61**
**Modified in this workstream?** **No.** One gap found, closed in the test layer, not in the SQL.

---

## 1. The intended model

| Class | Granted to | Count | Acceptance requirement |
|---|---|---|---|
| Public | `anon`, `authenticated`, `service_role` | 3 | exactly these three, no more |
| Authenticated | `authenticated`, `service_role` | 52 | every function a session call site uses |
| Service-only | `service_role` | 14 | `write_audit`, `handle_new_user`, 12 trigger functions |
| Extension | untouched | 115 | excluded from application classification, `PUBLIC` retained |
| Staff/admin | *(not a grant)* | — | internal guard only; see the role matrix §1 |

## 2. Dependency sequence — verified, not assumed

The documented order is `0056 → 0058 → 0057 → 0061`. Phase 7B executed three orderings against the
replica to test whether the documentation is load-bearing:

| # | Applied before `0061` | Result |
|---|---|---|
| A | `0056` + `0057` (no `0058`) | **refused** — `0061: anon-reachable policies call functions anon cannot execute: reports_public_read -> has_entitlement` |
| B | `0056` + `0058` + `0057` | applied cleanly |
| C | `0056` only (no `0057`, no `0058`) | **refused** — same message |

Conclusion: the sequence is not merely documentation. Applied in the wrong order, `0061` refuses on
its own self-check rather than turning every anonymous report read into `42501`. That is the
behaviour the acceptance run depends on, and it now has an executable proof.

**Note on the relative order of `0057` and `0058`:** both depend only on `0056`, and neither
depends on the other. `0058` before `0057` is the safer default because `0058` is the file that
makes the anon policy resolvable; running `0057` first is harmless but leaves the resolver hazard
live for longer.

## 3. Checks against the acceptance criteria

### 3.1 Does `0061`'s self-check cover the policies `0057` introduces?

**Partly — and the gap is now closed in the test layer.**

* `0057` creates fourteen policies, **all `TO authenticated`** (`saved_commodities`,
  `saved_markets`, `price_alerts`, `export_jobs`).
* `0061`'s fourth self-check scans **anon-reachable** policies only (`polroles = '{0}'` or `anon` in
  `polroles`). Every `0057` policy is therefore outside its guard.
* Measured after applying the full sequence: **no policy of either audience references a function
  its audience cannot execute** — `0057`'s policies call `has_entitlement_safe`, `is_staff` and
  `is_admin`, all of which are in the authenticated class. So the current state is consistent, but
  by construction of the class table rather than by the file's own guard.

**Resolution (this workstream):** rather than editing an unapplied proposal, the guarantee is now
enforced by test — `function-privileges.mjs` check **7b** runs the same catalogue query for
`authenticated`-reachable policies. It fails the moment a future policy references a function its
audience cannot execute. This strengthens the suite without touching the proposal, and the proposal
stays exactly as reviewed in Phase 6.

If the reviewer prefers the guard in SQL, extending `0061`'s self-check is a two-line change to the
`polroles` predicate, with the same test as its regression — documented here rather than done here,
because the instruction for this phase was not to modify `0061` without a stated reason, impact and
extra tests.

### 3.2 Do public policies remain functional with the allowlist?

**Yes, and measured with data present.** All 29 anonymous-readable tables were probed with
`count(*)` after `0061`; the three helpers are sufficient. The measured minimum was established by
leave-one-out probing (Phase 6 §2): `is_public_observation` (observations + evidence),
`is_staff` (`offer_verification_events` and the reports OR-branch), `has_entitlement_safe`
(premium branch of `reports_public_read`).

### 3.3 Are authenticated workflows unintentionally broken?

**No — for every call site the repository has.** 52 functions keep `authenticated` `EXECUTE`, which
covers every `rpc()` call site found under `src/`, `supabase/functions/` and `scripts/`.
Residual risk R-4 is unchanged: `notify`, `record_login_attempt`, `count_login_attempts`,
`clear_login_attempts`, `mark_overdue_tasks`, `generate_collection_tasks`,
`refresh_analytics_snapshot` are *conceptually* service-only but are called through the **session**
client; moving them to the admin client is an application change that must land before they could be
narrowed.

### 3.4 Can service-only functions be invoked by clients?

**No.** Proven three ways (`function-privileges` checks 5, 5b, 6b): `write_audit` refused `42501`
for `authenticated`; the anon set is exactly the three helpers; `handle_new_user` and the trigger
functions have no client grants. Note the distinction: **trigger functions fire regardless of
`EXECUTE`**, so removing their grants cannot break a trigger — verified by the trigger suite
(`b2b-acceptance` 20/20, `entitlement-integration` 23/23) still passing.

### 3.5 `SECURITY DEFINER` search paths and internal authorisation

| Measure | Value | Assessment |
|---|---|---|
| Application functions | 69 | — |
| `SECURITY DEFINER` | 60 | each one's only access control is its body |
| Pinned `search_path` | 58 | the 11 gaps are listed in the audit §3 |
| Unpinned **and** definer | 4 | `complete_onboarding`, `update_onboarding_step`, two trigger functions |
| Definer with **no** in-body check | 13 mutators/disclosures | listed in the audit §3; `write_audit` is the worst |
| Definer owned by | `postgres` (all) | ownership drift is not detected by any check — recorded as a gap |

### 3.6 Unintended `PUBLIC` `EXECUTE`

**None for application functions.** Zero of the 69 have `PUBLIC` in their ACL after `0061`
(check 6). The 115 extension functions keep `PUBLIC` deliberately: operator invocation needs
`EXECUTE`, so revoking `citext_eq` would break `=` on `citext` columns — including anonymous reads.

## 4. Proposal-quality findings

| # | Finding | Severity | Resolution |
|---|---|---|---|
| F-1 | Self-check covers only anon-reachable policies; `0057`'s are `authenticated`-reachable | Low | closed by test 7b; optional SQL extension documented above |
| F-2 | `write_audit` has no in-body guard; containment is by grant only | **High (residual)** | risk 28 — needs an application fix, not a migration |
| F-3 | Four definer functions unpinned | Low | risk 29 |
| F-4 | Function ownership is not asserted anywhere; a change of owner silently changes effective privileges | Low | not currently checked; proposed as a future check |
| F-5 | `0061` classification lists 12 trigger functions while the audit counts 13 including `handle_new_user` | Cosmetic | both are `service`; no behavioural difference |

## 5. Acceptance procedure on staging

1. Operator applies `0056` → `0058` → `0057` (in that order) and records them in the prereq
   manifest.
2. Operator applies `0061` and confirms it did **not** raise.
3. Harness `--mode write` runs H-2/H-3 (argument binding), H-5 (RLS + `EXECUTE`), H-10 (service
   role).
4. Operator re-runs `prereqs.sql`; `anon_executable_functions` must read **3**.
5. Re-run `function-privileges.mjs` against staging if a direct database connection is available;
   otherwise the manifest's `anon_executable_functions` is the hosted counterpart.

## 6. What this document does not claim

* It does not claim `0061` has been applied anywhere.
* It does not claim the three-function allowlist is stable: it is a measurement of today's policies
  and appends a test that fails if a future policy needs more.
* It does not close F-2 (`write_audit`). Grant-level containment is not authorisation.
