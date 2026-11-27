# Phase 7B — Role and Identity Matrix

**Classification:** preparation only · **Baseline:** `ce17b64081648bb0cad5a7ace008478dcbde2fce`
**Purpose:** state exactly what each identity may do, where that boundary actually lives, and how to
prove it over HTTP rather than in SQL alone.

---

## 1. Two different notions of "role" — do not conflate them

| | PostgreSQL role | Application identity |
|---|---|---|
| Values | `anon`, `authenticated`, `service_role` | `public_user`, `customer`, `agent`, `verification_officer`, `market_supervisor`, `analyst`, `admin`, `super_admin` |
| Where it lives | the JWT `role` claim, assumed by PostgREST per request | `public.profiles.role`, resolved by `current_role()` from `auth.uid()` |
| Enforced by | `GRANT`, `REVOKE`, RLS `TO` clauses | function bodies (`is_staff()`, `is_admin()`, `has_role()`) |
| Distinguishable by a `GRANT`? | yes | **no** |

**Every signed-in user connects as PostgreSQL `authenticated`.** A customer and a `super_admin`
have identical table privileges and identical `EXECUTE` grants; only the internal guards differ.
Any statement that a database grant "separates staff from customers" is wrong, and the harness is
built so that claim cannot be made accidentally: there is no staff class in
`supabase/proposed/0061_function_execute_least_privilege.sql`, and the design document says why.

The application ladder, as implemented:

```sql
current_role()  = coalesce((select role from profiles where id = auth.uid()), 'public_user')
is_staff()      = current_role() in ('verification_officer','market_supervisor','analyst','admin','super_admin')
is_admin()      = current_role() in ('admin','super_admin')
has_role(...)   = current_role() = any (variadic roles)
is_active_account() = current_account_status() = 'active'
```

All four are `SECURITY DEFINER` with `search_path = public` and a `STABLE` volatility.

## 2. Identity matrix

### 2.1 Anonymous (`anon`)

| Attribute | Value |
|---|---|
| JWT claims | none; requests carry only the `apikey` header |
| Database role | `anon` |
| Application profile role | none — `current_role()` returns `public_user` |
| Grants | `SELECT` on 29 reference/public tables; `INSERT` on `contact_enquiries`; `EXECUTE` on exactly three functions after `0061` |
| RLS behaviour | public read policies only; no write policy reaches it |
| Functions callable | `is_public_observation`, `is_staff`, `has_entitlement_safe` (all return `false`/harmless for `anon`) |
| Functions NOT callable (after `0061`) | all other 66 application functions — `42501` before the body runs |
| Tables readable | `markets`, `commodities`, `commodity_*`, `countries`, `states`, `measurement_units`, `price_observations` (public rows), `price_observation_evidence`, `market_reports` (public rows), `articles`, `article_categories`, `entitlement_catalog`, `entitlement_tiers`, `market_commodity_scope`, and the other reference tables listed in the acceptance matrix |
| Tables writable | `contact_enquiries` only (public intake, `check true`) |
| Tables not accessible | every user, billing, operations and evidence table |
| Expected failure modes | `42501` for denied writes and revoked functions; `401` if a token is required by PostgREST config; never `200` with data it should not see |

### 2.2 Authenticated non-staff

| Attribute | Value |
|---|---|
| JWT claims | `sub` = uuid, `role` = `authenticated`, `aud` = `authenticated`, `exp` |
| Database role | `authenticated` |
| Application profile role | `public_user` or `customer` |
| Grants | full DML on `authenticated`-granted tables; `EXECUTE` on 52 application functions after `0061` |
| RLS behaviour | ownership predicates (`auth.uid()`), entitlement predicates (`has_entitlement_safe`) |
| Functions callable | all `authenticated`-class functions, including staff-guarded ones — **which then raise** |
| Functions NOT callable | `write_audit`, `handle_new_user`, trigger functions (service-only after `0061`) |
| Tables readable | own rows in watchlists/alerts/exports; public reference data; own profile |
| Tables writable | own watchlist/alert/export rows **if entitled**; own profile non-role columns |
| Tables not accessible | other users' rows; audit/evidence tables |
| Expected failure modes | `42501` from entitlement gates; `P0001`/`42501` from internal guards (`set_user_role`, `set_account_status`); zero-row updates when a policy hides a column |

### 2.3 Staff

| Attribute | Value |
|---|---|
| JWT claims | same as any authenticated user — **there is no staff claim** |
| Database role | `authenticated` |
| Application profile role | `analyst`, `verification_officer`, `market_supervisor` |
| Grants | identical to 2.2 |
| RLS behaviour | `is_staff()` branches in policies (observation, collection, quality tables) |
| Functions callable | staff workflows: `submit_observation`, `publish_observation`, `approve_observation`, `reject_observation`, `raise_quality_flag`, `transition_task`, `open_collection_batch`, `update_offer_status`, … |
| Functions NOT callable | `set_user_role`, `set_account_status`, `provision_agent`, `set_market_assignment` (admin-only guards) |
| Tables readable | staff-scoped rows via `is_staff()` policies, plus own rows |
| Tables writable | staff workflow tables under `is_staff()` policies |
| Tables not accessible | `billing_events`, `customer_subscriptions` (admin-only), evidence tables (no INSERT policy) |
| Expected failure modes | `42501`/`P0001` from `is_admin()` guards |

### 2.4 Admin

| Attribute | Value |
|---|---|
| JWT claims | identical to 2.3 — admin-ness is in `profiles.role`, never in the token |
| Database role | `authenticated` |
| Application profile role | `admin`, `super_admin` |
| Grants | identical to 2.2/2.3 |
| RLS behaviour | `is_admin()` branches; and only admins can update `export_jobs` |
| Functions callable | everything staff can, plus `set_user_role`, `set_account_status`, `provision_agent`, `set_market_assignment` |
| Functions NOT callable | `write_audit` as a *client* is still refused after `0061`; audit writes happen inside definer functions |
| Tables readable | all rows reachable by policy, including other users' export jobs (documented exception) |
| Tables writable | administrative tables, order payment fields (staff bypass in `guard_order_transition`) |
| Tables not accessible | evidence tables `DELETE`/`TRUNCATE` (no policy, no grant) |
| Expected failure modes | none expected for documented operations; a `42501` here is a defect, not a boundary |

### 2.5 Service role

| Attribute | Value |
|---|---|
| JWT claims | none — the service key *is* the credential; `Authorization: Bearer <service key>` |
| Database role | `service_role`, `rolbypassrls = true`, `rolsuper = false` |
| Application profile role | none; `auth.uid()` is `null` |
| Grants | `SELECT/INSERT/UPDATE` on all 89 tables after `0060`; `DELETE` on 84; none on the five evidence tables' `DELETE` |
| RLS behaviour | **bypassed entirely** — policies do not run for `service_role` |
| Functions callable | all application functions (class `service` included) |
| Functions NOT callable | none by grant; but triggers still run, so `orders` inserts still hit the pin guard's internal bypass |
| Tables readable | every table (`BYPASSRLS`) |
| Tables writable | every table except `DELETE` on the five evidence tables |
| Tables not accessible | none for reads; evidence `DELETE`/`TRUNCATE` |
| Expected failure modes | `42501` on a table it lacks a grant for — this is the S-4 class of defect and looks like an RLS problem |

> **Service role is not an identity in the product sense.** It has no profile, no entitlements and no
> `auth.uid()`. Any code path that uses it to make an *authorization* decision is a defect, because
> it bypasses the only layer that makes those decisions.

## 3. Cross-identity assertions the harness must be able to make

| # | Assertion | Where proved |
|---|---|---|
| A-1 | `anon` cannot execute `set_user_role`, `write_audit`, `notify`, `create_order_from_quote`, `can_perform_bulk_operations` | local: `function-privileges` 2 (13 functions); hosted: post-`0061` spot check |
| A-2 | a non-staff `authenticated` user cannot elevate themselves or anyone else | local: `function-privileges` 4/4b/4c/4d |
| A-3 | an unentitled `authenticated` user cannot write watchlists directly | hosted: H-5, paired with an entitled positive control |
| A-4 | `anon` reads public reports and never premium ones | hosted: H-6 with seeded public + premium rows |
| A-5 | `service_role` reaches backend tables, and no client can | hosted: H-10 with both keys |
| A-6 | `service_role` cannot delete or truncate evidence | local: `service-role-access` 5 |
| A-7 | staff and admin are indistinguishable at the grant layer | structurally true by design; recorded here so no test claims otherwise |

## 4. JWT claim fixtures

The three authenticated fixtures differ **only** in `profiles.role` and subscriptions — never in
token shape. That is the point: if a scenario needs a different JWT claim, the design is wrong.

| Fixture | `sub` | `profiles.role` | Subscriptions | Used by |
|---|---|---|---|---|
| `p7b-user-unentitled` | synthetic uuid | `public_user` | none | H-1, H-2, H-3, H-5 (negative) |
| `p7b-user-entitled` | synthetic uuid | `customer` | `reports`, `watchlists` (test window) | H-5 (positive), H-6 (logged-in variant) |
| `p7b-staff` | synthetic uuid | `analyst` | none | H-4 staff view, workflow spot checks |

## 5. What cannot be verified from the harness

1. **Staff/admin separation at the database layer** — it does not exist, and no test may imply it.
2. **`auth.uid()` propagation** — that PostgREST sets `request.jwt.claims` correctly is assumed by
   every policy; H-1/H-5 would fail if it did not, but that is an inference, not a proof.
3. **Token refresh and expiry** — untested; an expired-token path is a `401`, not a policy decision.
4. **`anon` under a different PostgREST `db-schema`/`db-anon-role` configuration** — staging is
   assumed to mirror production's defaults.
