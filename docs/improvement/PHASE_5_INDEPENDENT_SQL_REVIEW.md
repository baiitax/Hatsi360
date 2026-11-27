# Phase 5 — Independent SQL Review of the Proposed Migrations

**Status:** complete · **Verdict:** `NOT_READY_FOR_PRODUCTION` (unchanged)
**Branch:** `arena/990d7ace-hatsi360` · **HEAD at review:** `3a8b3b70021db344c78fbcb9c40c11686bac6885`
**Database reviewed:** the local migration-chain replica, not production
**Nothing in this document was applied to production or staging.**

---

## 1. What was reviewed and how

The review is mechanical where it can be. `supabase/tests/proposal-review.mjs` applies each
proposed file to a throwaway replica inside one rolled-back transaction and then inspects what the
database actually produced — function security attributes, search paths, grant matrices, policy
roles, trigger shapes — rather than what the comments claim. Statements that cannot be tested
mechanically were read line by line and are marked `[read]`.

| File | Lines | Mechanical checks | `[read]` review |
|---|---|---|---|
| `0055_supabase_admin_default_privileges.sql` | 119 | **cannot be applied here** — needs `supabase_admin` authority | ✅ |
| `0056_entitlement_resolver_repair.sql` | 142 | idempotency ×2, definer/search_path, argnames, overload count, grant matrix | ✅ |
| `0057_entitlement_rls_enforcement.sql` | 210 | idempotency ×2, policy count, anon-policy scan, `relacl` before/after | ✅ |
| `0058_reports_access_policy.sql` | 62 | idempotency ×2, policy shape, public-read behaviour for `anon` | ✅ |
| `0059_b2b_security_hardening.sql` | 445 | idempotency (0047 then 0059 twice), trigger/event-policy shape | ✅ |
| `0060_service_role_grant_drift.sql` *(new)* | 110 | idempotency ×2, self-check block | ✅ |

`proposal-review.mjs`: **32/33 checks pass.** The single failure is finding **S-1a** below, and it
is the review catching the proposals rather than the proposals catching themselves.

## 2. Findings

| ID | Severity | Title | State |
|---|---|---|---|
| S-1 | High | Every public function is executable by `anon` (184/184) | **Open** — no safe one-line remedy, see §2.1 |
| S-1a | Low | `can_perform_bulk_operations()` executable by `anon` | Instance of S-1 |
| S-2 | High | Order economics unpinned on direct insert (was D-1) | **Closed** by 0059 amendment, asserted by test 8 |
| S-3 | Medium | Payment state writable by a party with no payment record (was D-2) | **Closed** by 0059 amendment, asserted by tests 9/9b |
| S-4 | Medium | `export_jobs` grants `service_role` nothing | **Closed by 0060** (proven) |
| S-5 | Medium | `service_role` grant drift: 60 of 89 public tables | **Closed by 0060** (proven) |
| S-6 | Info | Six tables grant `anon` INSERT/UPDATE/DELETE; policies neutralise all of them | Accepted, see §2.4 |

### 2.1 S-1 — `anon` may execute all 184 public functions

**Evidence.** After applying 0056–0058 the replica reports:

```
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and has_function_privilege('anon', p.oid, 'EXECUTE');
-- 184 of 184
```

This includes `set_user_role`, `set_account_status`, `write_audit`, `publish_observation`,
`create_order_from_quote`, `expire_old_rfqs` and every trigger function, plus the `citext` and
`pgcrypto` extension functions that the platform installed into `public`.

**Why it happens.** PostgreSQL grants `EXECUTE` to `PUBLIC` on every new function. Neither the
existing migrations nor the proposals revoke it; `0056`'s `grant execute … to authenticated` is
decorative because the grantee already had the privilege through `PUBLIC`. Preventing this shape
needs `revoke execute … from public, anon`, not `grant … to authenticated`.

**Impact.** Not remote code execution: each function still has to pass its own internal guard
(`is_staff()`, `auth.uid() is null`, `has_entitlement()`). Phase 3 and Phase 4 audited those guards
individually and the B2B suite proves the important ones reject `anon`. The risk is structural —
the only thing between the anonymous internet and ~90 privileged functions is that no guard was
missed, and a single missed `null` check becomes an unauthenticated privileged action.

**Why it is not fixed in this phase.** The obvious remedy was tested and it breaks the product:

| Probe after a blanket `revoke execute … from public, anon` | Result |
|---|---|
| `anon` reads `markets` | ok, 11 rows |
| `anon` reads `price_observations` | **`42501`** (was: rows) |
| `anon` reads `market_reports` | **`42501`** (was: rows) |
| `anon` calls `has_entitlement('bulk_exports')` | `42501` |
| `authenticated` resolves entitlements | ok |

RLS policies are evaluated with the *caller's* privileges, so any policy that calls a helper
function requires that the caller can execute it. A blanket revoke silently converts public reads
into errors. The remedy must therefore be a curated revoke with an explicit `anon` allowlist
derived from (a) every function referenced in a policy predicate and (b) the application's
anonymous RPC surface — then re-validated by the full suite plus the public-read checks in
§5 of `PHASE_5_RLS_ACCEPTANCE_MATRIX.md`. That is a reviewed change with its own test update, not
something to append to a release pack untested.

### 2.2 S-2 / S-3 — order integrity, closed by amending an unapplied proposal

`0059` has never been applied anywhere, so it was amended rather than shipped with a known hole:

* new `BEFORE INSERT` trigger `orders_pin_quote_economics` (SECURITY **INVOKER**) requires a
  non-privileged insert to carry `unit_price`, `currency_code`, `quantity` and `total_amount`
  derived from an `accepted` quote, and to start with `payment_status='pending'`, `paid_amount=0`;
* `payment_status`, `paid_amount`, `payment_method`, `invoice_number` joined the immutable set in
  `guard_order_transition` (staff and internal roles return before the check, as before).

Both are verified positively and negatively — the forgery is rejected (`42501`) *and* the honest
insert with the quote's own numbers still succeeds, so the pin is not a false positive that breaks
a legitimate path. See `PHASE_5_B2B_SECURITY_TESTS.md` §4.

### 2.3 S-4 / S-5 — `service_role` grant drift, closed by 0060

`0009_grants.sql:92` declares `grant all on all tables in schema public to service_role`. That
statement covers only the tables that existed at the time. **60 of 89 public tables created since
then grant `service_role` nothing**, including `export_jobs`, `orders`, `quotes`, `rfqs`,
`notifications`, `scheduled_job_runs` and `international_trade_records`. `0053` narrowed `anon`
but never addressed `service_role`, and no default privileges were ever set for it.

`service_role` bypasses RLS but not table privileges, so a server-side worker holding the service
key gets `42501 permission denied` — a hard error, not an empty result. This is exactly what the
acceptance matrix caught: **4 red cells, all `export_jobs × service_role`.**

`0060` repairs it (DML + sequence usage + default privileges for future tables, self-checking).
Proven, with no expectation in the matrix changed:

```
node supabase/tests/rls-acceptance-matrix.mjs                        → 122/126 (4 red)
WITH_PROPOSED_0060=1 node supabase/tests/rls-acceptance-matrix.mjs   → 126/126
```

`0060` applies twice cleanly. It is widening, not narrowing: nothing that works today breaks. It
still must be replayed on staging, because it can turn a silently-empty read into a real one in
code that never expected rows.

### 2.4 S-6 — `anon` DML grants on reference data

Six tables still grant `anon` INSERT/UPDATE/DELETE (plus SELECT): `audit_events`, `buyer_offers`,
`seller_offers`, `commodity_fundamentals`, `commodity_seasonality`, `commodity_specifications`,
`price_source_registry`, `offer_verification_events`. `0053` left DML grants in place deliberately;
`0054` (unapplied) would remove them.

Policy analysis shows all of them are neutralised: the `ALL` policies on the four reference tables
carry `using is_staff()` and `with check is_staff()`, `audit_events` has no `anon`-reachable
policy at all, and the offer tables expose `_public_read` only. Executed checks confirm `anon`
UPDATE and DELETE are refused (`42501` or 0 rows) on all four reference tables
(`rls-acceptance-matrix.mjs`, group `anon-reference-write`, 8 cells).

Residual risk is therefore "granted and denied by policy" rather than "not granted" — a weaker
posture that survives only as long as no permissive policy is ever added to those tables.
`contact_enquiries` is a deliberate public intake surface and is reachable by `anon` INSERT with
`check true`; that is by design and is a spam-control concern, not an authorization defect.

## 3. Per-migration verdict

### `0055` — `supabase_admin` default ACL
| Property | Result |
|---|---|
| Subject | second default-ACL grantor, `supabase_admin`, still grants `anon`/`authenticated` `arwdDxtm` — anonymous TRUNCATE included, which RLS cannot police |
| Syntax / PG compatibility | `alter default privileges for role supabase_admin …` is valid; `[read]` |
| **Executability** | **cannot be applied from this environment.** `postgres` is not superuser and has no membership in `supabase_admin`; the statement answers `42501 permission denied to change default privileges`. It needs a credential that is a member of `supabase_admin`, i.e. the SQL editor or platform-side execution |
| Transaction boundaries | none embedded |
| Grants/revokes | narrows only `anon`/`authenticated`; `postgres` and `service_role` keep everything |
| Failure mode | raises rather than skipping when authority is missing — the right choice; a silent no-op would report success while doing nothing |
| Idempotency | revoking an already-absent default is safe |
| Recovery | documented in the file (`grant … to anon, authenticated` restores the exposure) |
| **Verdict** | **no objection to the SQL; cannot be validated by this review** — it must be dry-run by whoever holds `supabase_admin`, and the pre-execution query in the file should be captured as the before-state |

### `0056` — entitlement resolver repair
| Property | Result |
|---|---|
| Syntax / PG compatibility | `[read]` valid; `language sql` body is parse-validated at creation |
| Transaction boundaries | none embedded |
| Grants/revokes | `grant execute … to authenticated` but **no revoke from `public`** → S-1 |
| SECURITY DEFINER | yes, on `has_entitlement` / `has_entitlement_safe` / `user_entitlements` — all with `set search_path = public, pg_temp` (mechanically confirmed) |
| Overloads | exactly one `has_entitlement(text)` after apply — no `42725` ambiguity |
| Idempotency | applies twice cleanly |
| Recovery | `create or replace` — old body restorable from `pg_get_functiondef` before apply |
| **Verdict** | acceptable **as an entitlement fix**; S-1 is systemic and out of its scope |

### `0057` — entitlement RLS enforcement
| Property | Result |
|---|---|
| Transaction boundaries | none embedded |
| Grants/revokes | **explicitly none** — the file states this; confirmed by diff of `relacl` before/after |
| SECURITY DEFINER | none created |
| RLS interaction | restates policies on the four entitlement tables; no policy references a function that `anon` cannot execute for the anon-visible tables, verified by the matrix rather than by reading |
| Idempotency | applies twice cleanly; policy count stable |
| Recovery | **the important one** — see §4 |
| **Verdict** | acceptable, with the rollback caveat in §4 |

### `0058` — reports access policy
| Property | Result |
|---|---|
| Transaction boundaries | none embedded |
| RLS interaction | policy on `market_reports` calls a helper; with `anon` execute intact the public read works (verified before and after) |
| Idempotency | applies twice cleanly |
| **Verdict** | acceptable |

### `0059` — B2B security hardening *(as amended in this phase)*
| Property | Result |
|---|---|
| Transaction boundaries | none embedded; depends on `0047` for the tables it guards |
| Grants/revokes | `grant execute … generate_order_number() to service_role` only; `expire_old_rfqs` guarded by `raise` for non-staff, proven by test 6 |
| SECURITY DEFINER | `record_order_transition` (definer, pinned search path, `on conflict do nothing`) |
| SECURITY INVOKER | `guard_supplier_verification`, `guard_order_transition`, `pin_order_quote_economics` — correctly invoker, because each decides on the *caller* |
| Trigger interaction | `orders_pin_quote_economics` (BEFORE INSERT) and `orders_guard_transition` (BEFORE UPDATE) are disjoint by event; the definer RPC bypasses the pin via `current_user`, which is intended and tested (test 4b) |
| Idempotency | `0047` then `0059` twice — clean |
| **Verdict** | acceptable after amendment; **must not be applied without `0047`** |

### `0060` — service_role grant drift *(new, unapplied)*
| Property | Result |
|---|---|
| Syntax / PG compatibility | `[read]` loop + `alter default privileges`; valid on PG15+ |
| Transaction boundaries | none embedded |
| Grants/revokes | widening only; DML + sequence usage; TRUNCATE/REFERENCES/TRIGGER deliberately withheld |
| Self-check | raises and names any table still lacking DML — fails loudly rather than half-delivering |
| Idempotency | applies twice cleanly; `grant` is idempotent by nature |
| **Verdict** | ready to be replayed on staging |

## 4. Recovery and rollback limits (the part that cannot be tested locally)

These are properties of the *deployment*, and the replica cannot demonstrate any of them:

1. **`0057` is destructive to current access.** It replaces the policies that today let some
   authenticated users read entitlement tables. Rolling back means restoring prior policy
   definitions; if the definitions were not captured beforehand, the rollback is a rewrite, not a
   restore. Preflight must dump `pg_policies` for the four tables (§Preflight in the runbook).
2. **`0059` installs triggers that a rollback must drop explicitly.** Dropping the function without
   the trigger leaves a trigger pointing at a missing function — every subsequent order write fails.
   Rollback order is: drop trigger, then function.
3. **`0060` is not reversible by revoking.** Revoking `service_role` DML after code has started
   relying on it re-breaks the paths it fixed. Reversal requires knowing which tables were granted,
   i.e. capture `relacl` for `service_role` before apply.
4. **No migration here is idempotent in the presence of data.** All of them are structure-only, so
   idempotency holds today; that is a property of these files, not of the chain.
5. **`0047` owns its own transaction.** Applying it with a naive per-file runner that wraps each
   file in `BEGIN` produces a nested-transaction error. The harness handles this with
   `applyFileInsideTransaction`; any CLI path must too.

## 5. What this review does not establish

* No production schema was inspected. All measurements are of the migration chain replayed on a
  throwaway replica; drift between the chain and the live database would invalidate the counts.
  The runbook includes the queries that measure the same facts on staging/production before any
  apply.
* No concurrency, locking or performance behaviour was tested. `0059`'s pin trigger runs per row;
  a bulk insert of orders would take the same `quotes` lookup per row.
* No PostgREST layer was exercised — the authenticated path through the API (argument resolution,
  JWT propagation, HTTP status codes) is untested locally by construction. See
  `PHASE_5_HOSTED_TEST_STRATEGY.md`.
* Nothing here is an approval. A review that finds a High issue and closes three others is still a
  review of an unapplied pack; the release decision lives in `PHASE_5_RELEASE_RUNBOOK.md`.

## 6. Reproducing

```bash
node supabase/tests/proposal-review.mjs                                  # 32/33 (S-1a red)
node supabase/tests/rls-acceptance-matrix.mjs                           # 122/126 (S-4 red)
WITH_PROPOSED_0060=1 node supabase/tests/rls-acceptance-matrix.mjs      # 126/126
node supabase/tests/b2b-acceptance.mjs                                  # 20/20
```

Every suite rolls back its own transaction and leaves the replica unchanged.
