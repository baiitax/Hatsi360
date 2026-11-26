# Hatsi360 — Phase 4 entitlement implementation

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Starting HEAD | `54b808e3a814cdc6dddc8df87c56d318eb91c54f` |
| Mode | Local implementation + local integration tests. **No production SQL executed, nothing deployed** |
| Status | **`NOT_READY_FOR_PRODUCTION`** |

Design rationale: `PHASE_4_REMEDIATION_DESIGN.md`. Test evidence:
`PHASE_4_INTEGRATION_TEST_REPORT.md`.

---

## 1. Application changes

| File | Change | Why |
|---|---|---|
| `src/app/(client)/client/actions/intelligence.ts` | 3 × `entitlement_key:` → `p_key:` | The RPC's argument is `p_key`; the old name resolved to no function (`42883` / PGRST202) |
| `src/app/(client)/client/alerts/page.tsx` | 1 × same | same |
| `src/app/(client)/client/watchlists/page.tsx` | 1 × same | same |
| `src/lib/entitlements.ts` | `EntitlementSet.error`, `degraded()`, `EntitlementServiceError`, `requireEntitlement` distinguishes outage from plan limit | A broken engine must not be reported to a customer as "your plan does not include this" |
| `src/lib/api/handler.ts` | entitlement denial and degraded lookup are logged distinctly; degraded callers get an outage message, not an upgrade message | Failure visibility at the boundary, without changing the authorisation outcome |
| `src/app/api/v1/prices/history/route.ts` | free window 90 days, `bulk` entitlement extends to 3,650; explicit 403 with the limit named | "Extended historical data" was unlimited and free |
| `src/app/api/v1/reports/route.ts` | comment corrected | The route never read `market_reports`; the old comment claimed it withheld premium rows |
| `package.json` | `verify:contract`, `verify:integration` | The new suites need to be runnable by name |

`src/lib/entitlements.ts` is the only behavioural change in shared code, and it
is additive: `error` is optional, so every existing construction site still
type-checks, and `hasEntitlement()` is unchanged.

### 1.1 The degraded model

```ts
export interface EntitlementFailure {
  operation: 'getEntitlements' | 'getApplicationEntitlements' | 'user_entitlements';
  code: string;
  message: string;
}

export interface EntitlementSet {
  keys: Set<EntitlementKey>;
  tier: 'public' | 'professional' | 'enterprise' | null;
  tierActive: boolean;
  error?: EntitlementFailure | null;   // set when the lookup failed
}
```

- `getEntitlements()` and `getApplicationEntitlements()` return an empty set **and** an `error`, and log `[entitlements] … failed (code)` once per failure.
- `requireEntitlement()` throws `EntitlementServiceError` ("we could not verify your plan… this is a service problem") when `error` is set, and `EntitlementError` ("requires the X entitlement") only when the lookup succeeded and the key is genuinely absent.
- The API handler logs `[api] entitlement denied: …` with `service_error=<code>` when the set is degraded, and answers 403 with the outage message rather than the upgrade message.

Authorisation stays fail-closed in every path. What changes is that the failure
is now **visible** — in logs, in the message, and in the type.

---

## 2. Proposed migrations

| File | Objects | Notes |
|---|---|---|
| `0056_entitlement_resolver_repair.sql` | `user_entitlements()`, `has_entitlement(text)`, `has_entitlement_safe(text)` (new), `can_perform_bulk_operations()` (new); grants; self-check | Replaces the unapplied `0052` content. No overload added — see design §2 |
| `0057_entitlement_rls_enforcement.sql` | 20 policies over 8 tables; self-check | Self-contained: converges with or without `0042`–`0045` |
| `0058_reports_access_policy.sql` | `reports_public_read`; self-check | Public branch independent of the engine |
| `0059_b2b_security_hardening.sql` | 2 guard functions, 1 audit trigger, 4 policy changes, 3 function hardenings; self-check | Must be applied with `0047` in one transaction |

All four are in `supabase/proposed/` and outside the active chain. Every one
ends with a `DO` block that raises on failure, so a partial application cannot
report success.

Security-definer hygiene across the new and corrected functions: explicit
`set search_path = public, pg_temp`, schema-qualified references, and
`security invoker` wherever the check is about the caller (design §7, D-4).

---

## 3. Production application order (not executed)

```text
1. 0056          — resolver only. Reversible by itself. Unbreaks every gate.
2. [approve]      — the only step that must not be bundled with the rest: it
                    changes no authorisation outcome, so a staging run can be a
                    single endpoint smoke test.
3. 0057          — enforcement. Changes outcomes for unentitled users.
4. 0058          — report policy. Safe before or after 0057, required before
                    the first market_reports row is published.
5. 0047 + 0059   — only together, only in one transaction, only if B2B ships.
```

Do **not** apply `0057` before `0056`: every policy it creates calls
`has_entitlement_safe`, which `0056` defines.

### 3.1 Rollback

| Step | Reversal |
|---|---|
| `0056` | `create or replace` the `0052` body (or the `0016` body) — the suite's `BROKEN_RESOLVER` constant is a verbatim copy for exactly this purpose |
| `0057` | re-apply `0042`–`0045` to restore the previous policy set, accepting that it enforces nothing in production |
| `0058` | re-apply `0016`'s `reports_public_read` statement |
| `0059` | `drop trigger orders_guard_transition, orders_record_transition, supplier_profiles_guard_verification` and re-apply the `0047` policies |

---

## 4. What was not implemented, and why

| Item | Reason |
|---|---|
| A customer-facing exports endpoint | No such route exists. Adding one is a feature, not a remediation; the control is `0057`'s `export_jobs_insert_entitled` |
| Per-tier item counts (5 saved, 50 alerts, 10,000 requests) | Product limits with no implementation anywhere; inventing numbers in a security phase would be worse than documenting the gap |
| Rate limiting for the three handler-bypassing routes | Needs shared state (KV/Redis) or a design decision; the routes are documented in the API matrix as unthrottled |
| `entitlement:` on any API route | No route is premium today by decision; the matrix records the decision per route and the contract test fails on an undecided new route |
| B-9 (rating triggers not definer) | Functional defect, not a security hole; out of scope, recorded for the owner |
| Payment provider, subscription lifecycle jobs | Explicitly out of scope for this phase |

---

## 5. Verification commands

```bash
npm run verify:integration   # 116 checks: resolver+reports, RLS, B2B, contract
npm run verify:migrations    # rebuild the replica (89 tables, 222 RLS statements)
npm run verify:entitlements  # 31/31
npm run verify:privileges    # 14/14
npm run verify:default-privileges  # 9/9
npm run typecheck && npm test
```

The integration suites refuse to run against anything that is not the local
replica, and they run inside a single transaction that is rolled back, so
applying a proposal never leaves residue.

---

## 6. What this implementation does **not** establish

- That PostgREST returns 200 for the corrected calls in production — the sandbox cannot run PostgREST, and the code path is proven only at the SQL and static-contract layers.
- That any page renders correctly with the corrected gates — no UI test exists here.
- That the enforcement is acceptable to customers — `0057` removes access from users who currently have it.
- That production's data satisfies `0057`'s assumptions — the replica was built from the chain, not from production.
