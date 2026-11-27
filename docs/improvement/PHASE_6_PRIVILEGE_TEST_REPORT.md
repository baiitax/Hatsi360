# Phase 6 — Privilege Test Report

**Status:** complete · **Verdict:** `NOT_READY_FOR_PRODUCTION` (unchanged)
**New checks this phase:** 87 across two suites · **All passing**

---

## 1. Results

| Suite | Checks | Result | Proves |
|---|---|---|---|
| `supabase/tests/function-privileges.mjs` (new) | 60 | **60/60** | the curated `EXECUTE` design works and does not break anonymous reads |
| `supabase/tests/service-role-access.mjs` (new) | 27 | **27/27** | `0060` repairs the drift, narrows evidence tables, and grants nothing beyond DML |

Phase 4/5 suites re-run unchanged after amending `0059` and `0060`:

| Suite | Result |
|---|---|
| `proposal-review.mjs` | 32/33 — the one red is S-1a, the unfixed baseline that `0061` addresses |
| `rls-acceptance-matrix.mjs` | 122/126 (4 red = S-4) · **126/126** with `WITH_PROPOSED_0060=1` |
| `b2b-acceptance.mjs` | 20/20 |
| `b2b-security.mjs` · `rpc-contract.mjs` · `entitlement-integration.mjs` · `entitlement-rls-enforcement.mjs` | 22/22 · 49/49 · 23/23 · 22/22 |
| `privilege-invariants.mjs` · `default-privilege-guard.mjs` · `entitlement-stage1-matrix.mjs` | 14/14 · 9/9 · 31/31 |
| `npm run verify:migrations` | clean |

No test was weakened, skipped or deleted. `proposal-review.mjs` now also covers `0060`'s
idempotency; its S-1a assertion is intentionally still red, because it measures the state **before**
`0061` — turning it green by applying a proposal inside that suite would hide the baseline it exists
to record.

## 2. What `function-privileges.mjs` proves

**1. Anonymous public reads survive the revoke (29 checks).** Every table `anon` can `SELECT` is
probed with `count(*)`, not `limit 1` — see §4. Plus two targeted checks: `market_reports` returns
exactly the public row and reports `premium=false`, and `price_observations` stays readable.

**2. Anonymous calls to sensitive functions are refused (13 checks).** `set_user_role`,
`set_account_status`, `write_audit`, `notify`, `provision_agent`, `publish_observation`,
`submit_observation`, `expire_old_rfqs`, `user_entitlements`, `has_entitlement`,
`can_perform_bulk_operations`, `is_admin`, `create_order_from_quote` — all `42501` for `anon`.
Before `0061` every one of them executed (and most then raised inside their own guard); the check is
that the refusal now happens **before** the body runs.

**3. The allowlist is callable and honest (4 checks).** `has_entitlement_safe`,
`is_public_observation`, `is_staff` are executable by `anon`; `is_staff()` answers `false` rather
than erroring, which is what makes anonymous policy evaluation safe.

**4. Authenticated role escalation fails (4 checks).** Self-elevation via `set_user_role` →
`42501`; elevating another user → `42501`; direct `profiles.role` write → refused by the escalation
trigger; direct role-log insert → refused. This is the staff-boundary proof that §4 of the design
doc says cannot be expressed as a grant.

**5. Audit forgery fails three ways (3 checks).** `write_audit` as a client → `42501`; direct
`audit_events` insert as `authenticated` → `42501`; as `anon` → refused. `order_events` forgery is
covered by `b2b-acceptance` 7/7b.

**6. No regression to `PUBLIC` (2 checks).** Zero application functions carry `PUBLIC` `EXECUTE`;
the `anon` set is exactly `has_entitlement_safe, is_public_observation, is_staff`.

**7. RLS helper compatibility (1 check).** A catalogue query walks every anon-reachable policy,
extracts referenced function names, and fails if `anon` cannot execute one. This is the regression
guard for the ordering hazard in the design doc §5 — it would have caught the pre-0058 ordering
mistake before deployment.

**8. Session and staff paths still work (2 checks).** `has_entitlement` answers for a signed-in
session; a staff session still reaches `set_user_role`.

## 3. What `service-role-access.mjs` proves

* **Baseline first:** the suite asserts the gap exists *before* `0060` (43 of 89 tables incomplete),
  so a future "already fixed" state cannot silently make the repair untested.
* **Idempotency:** `0060` applied twice.
* **Repair:** all 89 tables grant `SELECT/INSERT/UPDATE` afterwards.
* **Narrowing:** exactly 5 tables lack `DELETE`, and they are the evidence tables; none of them
  carries `TRUNCATE`.
* **No over-grant:** `REFERENCES`/`TRIGGER` absent on the ten tables that had no privileges at all;
  `service_role` confirmed `rolbypassrls`.
* **Runtime:** `export_jobs` read/insert/update work (the four red matrix cells), and seven other
  tables a service key is expected to read answer without error.
* **Narrowing is enforced, not decorative:** `DELETE` on each of the five evidence tables →
  `42501`; `audit_events` still readable; an ordinary table keeps `DELETE`.
* **No leak to clients:** `anon` cannot read `orders`; an authenticated session sees zero of
  another user's export jobs.

## 4. Two methodology failures worth recording

Both were caught by writing the test, and both would have produced a false green:

1. **`limit 1` hides per-row policy failures.** An anonymous `select 1 … limit 1` over
   `market_reports` succeeded while `count(*)` failed `42501`: the plan stopped at the public row and
   never evaluated the premium branch's `has_entitlement_safe()` call. Every public-read probe now
   uses a full scan.
2. **A missing table grant masks a function grant.** The replica lacks production's
   `grant select on public.market_reports to anon` (a documented Phase 4 gap). In the first run the
   `42501` on `market_reports` was a *table* error, not a function error, and a probe that filtered
   tables by `has_table_privilege` silently skipped the table entirely. The suite now grants the
   missing privilege inside its transaction and probes the table explicitly — the same 42501
   reappears, correctly attributed to the function.

The general lesson is in the design doc: measure with the data present, and never let a probe
succeed because it did not look.

## 5. Not covered

1. **HTTP layer.** Neither suite touches PostgREST. That a `42501` becomes a 403 rather than a 500
   through the REST API is still unproven (H-1…H-10).
2. **Concurrency.** Two sessions racing an entitlement change or a role change are not exercised.
3. **`SECURITY DEFINER` ownership drift.** If a function's owner changes, its effective privileges
   change with it; no check pins the owner (all 69 are owned by `postgres` today, recorded in the
   audit).
4. **Production key custody.** Whether the service key can reach a browser is out of scope here and
   covered by `tests/security/client-bundle.test.ts`.
5. **Post-apply state on staging or production.** Everything above is the replica.

## 6. Reproducing

```bash
node supabase/tests/function-privileges.mjs       # 60/60
node supabase/tests/service-role-access.mjs       # 27/27
```

Each suite runs in one transaction and rolls back; the replica is unchanged afterwards.
