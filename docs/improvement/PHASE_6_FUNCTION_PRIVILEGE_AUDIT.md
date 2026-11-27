# Phase 6 — Function Privilege Audit (S-1 inventory)

**Status:** complete · **Verdict:** `NOT_READY_FOR_PRODUCTION` (unchanged)
**Scope:** all 184 functions in `public`, measured on the migration-chain replica
**Nothing was applied to production or staging.**

---

## 1. The finding this explains

Phase 5 S-1: **every** function in `public` is executable by `anon`. This document inventories that
surface function by function, classifies it, and hands Part C the data it needs to narrow it
without breaking anonymous reads.

Measured after `0056`+`0057`+`0058`:

| Measure | Value |
|---|---|
| Functions in `public` | **184** |
| Application functions (owned by the project) | **69** |
| Extension functions (`citext`, `pgcrypto`, `pg_trgm`) | **115** |
| Executable by `anon` | **184 (100 %)** |
| Application functions with an explicit `ACL` (i.e. not relying on the default) | 0 — all 69 rely on PostgreSQL's `PUBLIC` default |
| `SECURITY DEFINER` application functions | **60 of 69** |
| Application functions with a pinned `search_path` | **58 of 69** |
| Trigger functions among the 69 | 13 |

The 60 definer functions are the reason this matters: a definer function runs as its owner
(`postgres`), so its *only* access control is the guard written inside it. The grant is not a
second line of defence — today there is no second line at all.

## 2. Method

`supabase/tests/lib/pg-harness.mjs` → replica → `0056`+`0057`+`0058` → catalogue query over
`pg_proc`, `pg_policy`, `pg_trigger`, `pg_depend`, `has_function_privilege`. Authorization checks
and sensitive operations are derived by scanning each function body (`pg_get_functiondef`), which
finds what the function *mentions*, not what it enforces — the enforcement claim for each one is
either proved by an executed test in `supabase/tests/function-privileges.mjs` or marked as
reading-only.

Legend for the **Grants** column: `a` = `anon`, `A` = `authenticated`, `S` = `service_role`;
all three are inherited from `PUBLIC` today, which is exactly the defect.

## 3. The 69 application functions

| Function (signature) | Returns | Security | Owner | Grants | In policy | Authorization checks | search_path | Class |
|---|---|---|---|---|---|---|---|---|
| `agent_evidence_url(p_evidence_id bigint)` | text | DEFINER | postgres | aAS | no | auth.uid() presence, is_staff(), raises | public, storage | authenticated |
| `api_application_entitlements(p_application_id uuid)` | SETOF text | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `append_correction(p_observation_id uuid, p_correction jsonb, p_reason text)` | uuid | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `apply_observation_findings(p_observation_id uuid, p_findings jsonb)` | integer | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `approve_observation(p_observation_id uuid, p_notes text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `assigned_market_ids()` | SETOF bigint | DEFINER | postgres | aAS | auth-only | **none** | public | authenticated |
| `audit_observation_change()` | trigger | DEFINER | postgres | aAS | no | **none** | public | service |
| `batch_publish_observations(p_observation_ids uuid[], p_reason text)` | integer | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `can_perform_bulk_operations()` | boolean | DEFINER | postgres | aAS | auth-only | is_staff(), has_entitlement | public, pg_temp | authenticated |
| `clear_login_attempts(p_identifier_hash text)` | void | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `close_collection_batch(p_batch_id bigint, p_notes text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `complete_export_job(p_export_id uuid, p_row_count integer, p_file_path text, p_error text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `complete_onboarding()` | void | DEFINER | postgres | aAS | no | **none** | — | authenticated |
| `count_login_attempts(p_identifier_hash text, p_since timestamp with time zone)` | integer | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `create_export_job(p_scope text, p_filters jsonb, p_format text)` | uuid | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `create_order_from_quote(p_quote_id uuid, p_buyer_notes text)` | uuid | DEFINER | postgres | aAS | no | raises | — | authenticated |
| `current_account_status()` | account_status | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `current_role()` | user_role | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `expire_lapsed_offers()` | integer | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `expire_old_rfqs()` | integer | DEFINER | postgres | aAS | no | **none** | — | authenticated |
| `generate_collection_tasks(p_date date)` | integer | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `generate_order_number()` | text | INVOKER | postgres | aAS | no | **none** | — | authenticated |
| `handle_new_user()` | trigger | DEFINER | postgres | aAS | no | **none** | public | service |
| `has_entitlement(p_key text)` | boolean | DEFINER | postgres | aAS | no | has_entitlement | public, pg_temp | authenticated |
| `has_entitlement_safe(p_key text)` | boolean | DEFINER | postgres | aAS | auth-only | has_entitlement | public, pg_temp | public |
| `has_role(VARIADIC roles user_role[])` | boolean | DEFINER | postgres | aAS | auth-only | has_role | public | authenticated |
| `is_active_account()` | boolean | DEFINER | postgres | aAS | auth-only | **none** | public | authenticated |
| `is_admin()` | boolean | DEFINER | postgres | aAS | auth-only | is_admin() | public | authenticated |
| `is_assigned_to_market(p_market_id bigint)` | boolean | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `is_public_observation(p_status verification_status, p_published_at timestamp with time zone, p_is_current boolean, p_source observation_source, p_source_reference text)` | boolean | INVOKER | postgres | aAS | auth-only | **none** | — | public |
| `is_staff()` | boolean | DEFINER | postgres | aAS | auth-only | is_staff() | public | public |
| `log_entitlement_change()` | trigger | DEFINER | postgres | aAS | no | **none** | public | service |
| `mark_overdue_tasks(p_now timestamp with time zone)` | integer | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `notify(p_user_id uuid, p_kind notification_kind, p_title text, p_body text, p_entity_type text, p_entity_id text, p_action_url text, p_severity operational_priority, p_metadata jsonb)` | uuid | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `notify_assignment_change()` | trigger | DEFINER | postgres | aAS | no | **none** | public | service |
| `observation_findings(p_observation_id uuid)` | TABLE(rule_code text, rule_version integer, severity text, message text, evidence jsonb, evaluated_at timestamp with time zone) | DEFINER | postgres | aAS | no | is_staff() | public | authenticated |
| `open_collection_batch(p_market_id bigint, p_task_id bigint, p_reference text, p_notes text)` | bigint | DEFINER | postgres | aAS | no | is_staff(), has_role, raises | public | authenticated |
| `open_collection_batch(p_market_id bigint, p_task_id bigint, p_reference text, p_notes text, p_latitude numeric, p_longitude numeric)` | bigint | DEFINER | postgres | aAS | no | is_staff(), has_role, raises | public | authenticated |
| `prevent_published_economic_mutation()` | trigger | DEFINER | postgres | aAS | no | is_admin(), raises | public | service |
| `prevent_role_escalation()` | trigger | INVOKER | postgres | aAS | no | is_admin(), raises | public | service |
| `provision_agent(p_profile_id uuid, p_employee_code text, p_region text, p_market_ids bigint[], p_reason text)` | void | DEFINER | postgres | aAS | no | is_admin(), raises | public | authenticated |
| `publication_events(p_observation_id uuid)` | TABLE(id bigint, action text, actor_email text, reason text, created_at timestamp with time zone) | DEFINER | postgres | aAS | no | is_staff() | public | authenticated |
| `publish_observation(p_observation_id uuid)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `publish_observation_with_event(p_observation_id uuid, p_reason text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `raise_quality_flag(p_observation_id uuid, p_flag quality_flag_code, p_detail text, p_severity text, p_rule_code text, p_rule_version integer)` | bigint | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `record_login_attempt(p_identifier_hash text, p_ip_hash text, p_succeeded boolean)` | void | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `refresh_analytics_snapshot(p_date date)` | bigint | DEFINER | postgres | aAS | no | **none** | public | authenticated |
| `reject_observation(p_observation_id uuid, p_reason text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `request_correction(p_observation_id uuid, p_reason text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `resolve_quality_flag(p_flag_id bigint, p_note text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `resubmit_observation(p_observation_id uuid, p_payload jsonb, p_reason text)` | uuid | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `set_account_status(p_profile_id uuid, p_status account_status, p_reason text)` | void | DEFINER | postgres | aAS | no | is_admin(), raises | public | authenticated |
| `set_market_assignment(p_market_id bigint, p_agent_id uuid, p_active boolean, p_reason text)` | void | DEFINER | postgres | aAS | no | is_admin(), has_role, raises | public | authenticated |
| `set_updated_at()` | trigger | INVOKER | postgres | aAS | no | **none** | public | service |
| `set_user_role(p_profile_id uuid, p_role user_role, p_reason text)` | void | DEFINER | postgres | aAS | no | is_admin(), raises | public | authenticated |
| `submit_observation(p_payload jsonb, p_idempotency_key text, p_observation_id uuid)` | uuid | DEFINER | postgres | aAS | no | is_staff(), has_role, raises | public | authenticated |
| `sync_account_status()` | trigger | INVOKER | postgres | aAS | no | **none** | public | service |
| `transition_task(p_task_id bigint, p_status collection_task_status, p_reason text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `update_agent_contact(p_full_name text, p_alternate_phone text)` | void | DEFINER | postgres | aAS | no | auth.uid() presence, raises | public | authenticated |
| `update_commodity_intelligence_timestamp()` | trigger | INVOKER | postgres | aAS | no | **none** | — | service |
| `update_notification_preferences_updated_at()` | trigger | DEFINER | postgres | aAS | no | **none** | — | service |
| `update_offer_status(p_offer_table text, p_offer_id uuid, p_to_status offer_status, p_reason text)` | offer_status | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `update_onboarding_step(step integer)` | void | DEFINER | postgres | aAS | no | **none** | — | authenticated |
| `update_rfq_quote_count()` | trigger | INVOKER | postgres | aAS | no | **none** | — | service |
| `update_supplier_average_rating()` | trigger | INVOKER | postgres | aAS | no | **none** | — | service |
| `update_supplier_profile_completeness()` | trigger | INVOKER | postgres | aAS | no | **none** | — | service |
| `user_entitlements()` | SETOF text | DEFINER | postgres | aAS | no | **none** | public, pg_temp | authenticated |
| `withdraw_observation(p_observation_id uuid, p_reason text)` | void | DEFINER | postgres | aAS | no | is_staff(), raises | public | authenticated |
| `write_audit(p_action text, p_entity_type text, p_entity_id text, p_before jsonb, p_after jsonb, p_reason text)` | bigint | DEFINER | postgres | aAS | no | **none** | public | service |

### Reading the table

* **`**none**` in the checks column is not automatically a defect, but the list is short enough to
  read.** 32 functions contain no authorization text. Eleven are trigger functions (below). Of the
  21 non-trigger ones, 8 only report the caller's own identity and cannot be abused by answering
  honestly (`current_role`, `current_account_status`, `is_active_account`, `is_assigned_to_market`,
  `assigned_market_ids`, `is_public_observation`, `generate_order_number`, `user_entitlements`).
  The remaining **13 mutate or disclose without an in-body check**, which is the group that matters:

  `write_audit`, `notify`, `record_login_attempt`, `count_login_attempts`, `clear_login_attempts`,
  `api_application_entitlements`, `complete_onboarding`, `update_onboarding_step`,
  `expire_old_rfqs`, `expire_lapsed_offers`, `generate_collection_tasks`, `mark_overdue_tasks`,
  `refresh_analytics_snapshot`.

  Five of those are the sign-in rate limiter and the jobs runner — they are called from server code
  that uses the *session* client (`src/lib/auth/rate-limit.ts`, `src/lib/jobs/index.ts`), which is
  why Part C keeps them in the `authenticated` class rather than pretending they are service-only.
* **13 trigger functions** cannot be invoked through PostgREST (their return type is `trigger`) and
  fire regardless of `EXECUTE`. They are classified `service` and need no client grant at all.
* **`search_path` gaps:** 11 of 69 have no pinned path —
  `complete_onboarding`, `create_order_from_quote`, `expire_old_rfqs`, `generate_order_number`,
  `is_public_observation`, `update_onboarding_step`, and five trigger functions
  (`update_commodity_intelligence_timestamp`, `update_notification_preferences_updated_at`,
  `update_rfq_quote_count`, `update_supplier_average_rating`,
  `update_supplier_profile_completeness`). `create_order_from_quote` and `expire_old_rfqs` are the
  *pre-0059* definitions, which is why Phase 4 required 0059 before 0047 ships — 0059 pins both.
  The onboarding pair is definer and unpinned: a real, low-severity hardening gap.

## 4. The 115 extension functions

All 115 belong to `citext`, `pgcrypto` or `pg_trgm`, were installed into `public` by the platform,
are owned by `postgres`, are `SECURITY INVOKER`, have no `search_path` of their own, and are
executable by `anon` through the same `PUBLIC` default:

```
armor, citext, citext_cmp, citext_eq, citext_ge, citext_gt, citext_hash, citext_hash_extended,
citext_larger, citext_le, citext_lt, citext_ne, citext_pattern_cmp, citext_pattern_ge,
citext_pattern_gt, citext_pattern_le, citext_pattern_lt, citext_smaller, citextin, citextout,
citextrecv, citextsend, crypt, dearmor, decrypt, decrypt_iv, digest, digest, encrypt, encrypt_iv,
fips_mode, gen_random_bytes, gen_random_uuid, gen_salt, gen_salt, gin_extract_query_trgm,
gin_extract_value_trgm, gin_trgm_consistent, gin_trgm_triconsistent, gtrgm_compress,
gtrgm_consistent, gtrgm_decompress, gtrgm_distance, gtrgm_in, gtrgm_options, gtrgm_out,
gtrgm_penalty, gtrgm_picksplit, gtrgm_same, gtrgm_union, hmac, hmac, is_public_observation_,
max, min, notify, pgp_armor_headers, pgp_key_id, pgp_pub_decrypt ×4, pgp_pub_encrypt ×3,
pgp_sym_decrypt ×3, pgp_sym_encrypt ×3, regexp_match ×2, regexp_matches ×2, regexp_replace ×2,
regexp_split_to_array ×2, regexp_split_to_table ×2, replace, set_limit, show_limit, show_trgm,
similarity, similarity_dist, similarity_op, split_part, strict_word_similarity ×5, strpos,
texticlike, texticnlike, texticregexeq, texticregexne, translate, word_similarity ×5
```

**They are deliberately left alone by the remediation.** Operator invocation requires `EXECUTE` on
the underlying function: revoking `citext_eq` would break `=` on every `citext` column for whoever
loses it, including anonymous queries against `commodities` and `countries`. This is a real residual
(§6), not an oversight.

## 5. Priority deep-dives

### `set_user_role(uuid, user_role, text)` — the highest-value target
`SECURITY DEFINER`, owner `postgres`, pinned `search_path = public, pg_temp`, and it calls
`is_admin()` before writing. Because `is_admin()` resolves `auth.uid()` from the JWT, an `anon`
caller and a non-staff `authenticated` caller both fail the same way. **Proven:** `function-privileges.mjs`
check 4 (`42501` for self-elevation) and 4b (elevation of another user), 4c (direct `profiles.role`
write refused by the escalation trigger).

### `write_audit(text, text, text, jsonb, jsonb, text, uuid, uuid)` — no guard at all
`SECURITY DEFINER`, pinned search path, **no authorization check in the body**, and no application
call site anywhere in the repository (grep across `src/`, `supabase/functions/`, `scripts/` returns
zero `rpc('write_audit')`). Anyone who can reach the database can write an audit row attributed to
anybody. This is the one function in the inventory whose guard is *absent* rather than merely
imprecise, which is why Part C makes it service-only. **Proven:** `function-privileges.mjs` 5
(`42501` for an authenticated caller after 0061).

### Profiles, roles, subscriptions, orders, trust
| Function | Definer | Guard | Risk if `anon` reaches it |
|---|---|---|---|
| `provision_agent` | yes | `is_admin()` | creates staff profiles |
| `set_account_status` | yes | `is_admin()` | suspends accounts |
| `set_market_assignment` | yes | `is_admin()` + `has_role()` | reassigns agents |
| `submit_observation` / `publish_observation` / `approve_observation` / `reject_observation` / `withdraw_observation` / `resubmit_observation` / `request_correction` / `append_correction` / `raise_quality_flag` / `resolve_quality_flag` / `batch_publish_observations` / `transition_task` / `open_collection_batch` / `close_collection_batch` / `update_offer_status` | yes | `is_staff()` and/or `has_role()`, all `raise` on failure | publish or alter market data without authorization |
| `create_order_from_quote` | yes | caller/quote checks added by 0059 | create an order on someone else's quote (pre-0059: no check at all) |
| `expire_old_rfqs` | yes | **none** in the `0047` version; `raise` in 0059 | expire every open RFQ |
| `update_agent_contact` | yes | `auth.uid()` | edit another agent's contact details |
| `complete_onboarding`, `update_onboarding_step` | yes | none visible; scoped by the caller's own row | advance another user's onboarding state |

### RLS helpers (needed by policies, not by people)
`is_staff`, `is_admin`, `has_role`, `is_active_account`, `assigned_market_ids`,
`can_perform_bulk_operations`, `has_entitlement_safe`, `has_entitlement`, `is_public_observation`,
`is_assigned_to_market`, `current_role`, `current_account_status`. Eight of these appear inside a
policy predicate. Part C keeps only the three that an anonymous-reachable policy actually needs.

### Public market data
`is_public_observation(verification_status, timestamp)` is `SECURITY INVOKER` with no
`search_path`, and it is the gate on `price_observations` / `price_observation_evidence` for
`anon`. `has_entitlement_safe` is the premium branch of `reports_public_read`. Those two plus
`is_staff` are the entire anonymous allowlist — measured, not assumed (Part C §2).

## 6. Residuals this audit leaves open

1. **Extension functions stay `anon`-executable** (115). Revoking them breaks operators. The
   correct fix is to move them out of `public` (extension schema), which is a platform-level change
   no migration here can perform safely.
2. **`PUBLIC` remains the grantee of last resort** for extension functions; the same default will
   apply to any future extension installed into `public`.
3. **Staff/admin is not expressible as a grant** — every signed-in user connects as
   `authenticated`, so staff-only functions keep `authenticated` `EXECUTE` and depend on their
   internal guard. Part C states this plainly rather than pretending a grant can separate them.
4. **Four functions with no visible guard** are mitigated by classification and by the executed
   tests, not by a rewrite. Rewriting `write_audit`/`expire_old_rfqs` is application work.
5. **`api_application_entitlements` and `notify`** are callable by any authenticated session and
   scope their effects in the body; they are classified `authenticated`, not proved harmless.

## 7. Reproducing

```bash
node supabase/tests/function-privileges.mjs    # 60/60 — includes the inventory's assertions
```
