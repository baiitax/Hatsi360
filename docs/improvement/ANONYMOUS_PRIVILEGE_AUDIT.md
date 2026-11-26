# Hatsi360 — Anonymous Privilege Audit (Workstream B)

| | |
|---|---|
| Date | 2026-11-26 |
| Project measured | `umxzsdepbrenqysabtlt` (production) |
| Method | read-only `execute_query` against `pg_class`, `pg_policies`, `pg_default_acl`, `information_schema.role_table_grants`; repository provenance by inspection; verification of the proposal on the throwaway local replica |
| Production mutations | **none.** No grant changed, no policy changed, no row written. |
| Status | Audit complete. **Phase 1 applied to production** 2026-11-26 as `20261126225938_least_privilege_anonymous_grants`, verified before/after (§12). Phase 2 is a separate, unapplied proposal, ready for independent review. |

---

## 1. Summary

Production has **73 of 80 public tables granting `anon` SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER**. The cause is not a Hatsi360 migration: it is the platform's default privileges for schema `public`, granted independently by **two** roles (`postgres` and `supabase_admin`), measured directly in `pg_default_acl`.

Row-level security polices the four DML privileges. It polices none of the other three:

| Privilege | RLS applies? | Consequence of holding it |
|---|---|---|
| SELECT / INSERT / UPDATE / DELETE | yes | neutralised by policies — provided a policy says no |
| **TRUNCATE** | **no** | one statement empties the table, policy or not |
| **REFERENCES** | **no** | grantee can point a foreign key at the table (needs CREATE in the schema to exploit) |
| **TRIGGER** | **no** | grantee can attach a trigger to the table (needs a SQL session) |
| MAINTAIN (PG17) | **no** | VACUUM/ANALYZE/CLUSTER on the table |

**Severity, stated precisely.** This is *not* an anonymous data-theft or data-write path through the application. `anon` cannot reach `TRUNCATE` through PostgREST (the API has no such verb), every anonymous write policy that exists is predicated on `is_staff()` or `auth.role() = 'authenticated'` and therefore denies, and a REFERENCES/TRIGGER attack requires a SQL session, which the anon key does not provide. What production has is a **least-privilege violation with a catastrophic failure mode**: it converts any SQL-level foothold — a SQL injection, a `SECURITY DEFINER` function that takes SQL, a leaked direct connection, a future permissive policy — into "delete every row in `customer_subscriptions`", which RLS would not stop. SEC-01 was the same defect class on six tables; this is the same class on 73.

It is also *inconsistent in both directions*: the repository grants `anon` far less than production on some tables and leaves stray writes on others (§5), so neither state is the intended one.

---

## 2. Exact anonymous privileges at table level

Counts across the 80 public tables:

| Privilege | Tables granting it to `anon` |
|---|---|
| SELECT | 73 |
| INSERT | 73 |
| UPDATE | 73 |
| DELETE | 73 |
| TRUNCATE | **73** |
| REFERENCES | 73 |
| TRIGGER | 73 |
| MAINTAIN | 73 |

Seven tables grant nothing: `_hatsi_migrations` (revoked in `0032`) and the six SEC-01 tables (revoked in `0034`/`0050`). They are the only tables in the database that are correct.

Full inventory in **Appendix A** — every public table, its anonymous privilege set (`S`/`I`/`U`/`D`/`T`/`R`/`G`), the commands of policies that reach `anon`, and whether anonymous access is intended there at all.

---

## 3. Policies that reach `anon`

A policy reaches `anon` when it is declared `to anon` **or** `to public` — the second form is easy to miss, and six Hatsi360 policies use it.

### 3.1 Write policies — 12 of them, none reachable by `anon`

| Table | Policy | Cmd | Roles | Predicate |
|---|---|---|---|---|
| `commodity_fundamentals` | `commodity_fundamentals_write` | ALL | `{public}` | `is_staff()` (using and check) |
| `commodity_seasonality` | `commodity_seasonality_write` | ALL | `{public}` | `is_staff()` |
| `commodity_specifications` | `commodity_specifications_write` | ALL | `{public}` | `is_staff()` |
| `price_source_registry` | `price_source_registry_write` | ALL | `{public}` | `is_staff()` |
| `trade_data_sources` | `Trade data sources are manageable by authenticated users` | ALL | `{public}` | `auth.role() = 'authenticated'` (USING doubles as WITH CHECK) |
| `international_trade_records` | `… insertable by authenticated users` | INSERT | `{public}` | check `auth.role() = 'authenticated'` |
| `international_trade_records` | `… updatable by authenticated users` | UPDATE | `{public}` | `auth.role() = 'authenticated'` |
| `tariff_schedules` | `… insertable by authenticated users` | INSERT | `{public}` | check `auth.role() = 'authenticated'` |
| `tariff_schedules` | `… updatable by authenticated users` | UPDATE | `{public}` | `auth.role() = 'authenticated'` |
| `trade_data_sync_log` | `… insertable by authenticated users` | INSERT | `{public}` | check `auth.role() = 'authenticated'` |
| `trade_data_sync_log` | `… updatable by authenticated users` | UPDATE | `{public}` | `auth.role() = 'authenticated'` |
| `contact_enquiries` | `contact_enquiries_insert` | INSERT | `{anon,authenticated}` | check `true` — **the only intended anonymous write** |

Every one of the eleven excluding `contact_enquiries` denies `anon`: `is_staff()` is false for an unauthenticated session, and `auth.role()` is `'anon'` (or NULL without a JWT), never `'authenticated'`. For the two `ALL` policies that omit a `WITH CHECK`, PostgreSQL applies the `USING` expression as the check, so the omission is not a hole.

**Policy hygiene finding (not a vulnerability).** Ten of these eleven are *named* for authenticated users but *scoped* to `{public}`, and four are `ALL` where the intent is write-only. They work only because their predicates carry the real restriction. Any future edit that loosens a predicate — a copy-paste of `using (true)`, a "temporarily open for testing" change — turns a `public`-scoped write policy into anonymous write access, with the grant already in place. Recommendation: scope them `to authenticated`, and split `ALL` into `INSERT`/`UPDATE`/`DELETE` with explicit checks. This is a policy change and belongs in Phase 2, not Phase 1.

### 3.2 Read policies

37 tables have an `anon`/`public` SELECT policy. One — `contact_enquiries` — has only an INSERT policy, so 36 tables are anonymously readable by design: prices, published observations and their evidence, commodities and reference data, markets/states/zones, offers, trade data, the entitlement catalogue and tiers, articles, and `market_reports` (subject to the entitlement defect, §6).

---

## 4. Migration provenance

`pg_default_acl`, measured on production:

```
postgres       public  r  {postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres,
                           authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres}
supabase_admin public  r  {postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, …}
postgres       public  f  {…, anon=X/postgres, …}          -- functions: EXECUTE
```

So: **no Hatsi360 migration creates these grants.** They are the platform default for every relation created in `public`, applied by both `postgres` and `supabase_admin`. (`D` = TRUNCATE, `x` = REFERENCES, `t` = TRIGGER, `m` = MAINTAIN.)

The repository only ever *narrows* this, never globally:

| Migration | Effect |
|---|---|
| `0000` / `0032` | `_hatsi_migrations`: RLS on, anon/authenticated grants revoked |
| `0005`, `0006`, `0008`, `0009` | explicit `grant select` / `grant insert` where access is intended |
| `0034`, `0035` | `revoke all … from anon` on the six intelligence tables and the analytics views |
| `0050` (SEC-01) | `revoke truncate, trigger, references` on those same six |
| — | **no default-privilege change anywhere; no global revoke anywhere** |

That is the whole explanation: the seven correct tables are the seven that were explicitly revoked, and everything created since has inherited the platform default.

### 4.1 The repository is not the intended state either

Measured on the local replica after the full chain (89 tables, before this audit's Phase 1):

| | Production (80 tables) | Repository (89 tables) |
|---|---|---|
| `anon` SELECT | 73 | 28 |
| `anon` INSERT | 73 | 9 |
| `anon` DELETE | 73 | 73 |
| `anon` TRUNCATE | 73 | **8** |
| Tables with an `anon`-reaching read policy | 37 | 44 |

So the repository is too permissive in one way (8 tables still grant TRUNCATE, 9 grant INSERT) and too restrictive in another: roughly 16 tables have an `anon`-reaching read policy but **no** SELECT grant, which means the anonymous read path those policies describe does not actually work. Production is the mirror image: everything is granted, so the policies are the only thing standing between the public and the data.

Both states need the same fix: **grants derived from policy intent, not from platform defaults.**

---

## 5. Exposure paths

| Path | Reachable today? | Impact if reached |
|---|---|---|
| PostgREST `TRUNCATE` | **No** — no such verb | — |
| PostgREST anonymous DML | **No** — policies deny (verified predicate by predicate) | — |
| PostgREST `rpc()` into a `SECURITY DEFINER` function executing dynamic SQL | No such function today; this is the class to watch | full DML/DDL as definer |
| SQL injection anywhere in the stack | Not demonstrated | **TRUNCATE/DELETE on any of 73 tables** |
| Leaked direct database connection | Not demonstrated | full access regardless of grants |
| A future permissive policy on a `public`-scoped write policy | plausible (see §3.1) | anonymous writes, no further change needed |
| `anon` JWT used directly against PostgREST with `Prefer: return=representation` on writes | No — denied by policy, not grant | — |

The realistic risk is the fourth and fifth rows: the grant is the thing that turns one bug into a platform-wide data-loss event, and it removes the second line of defence that would otherwise contain a policy mistake.

---

## 6. Interaction with the open entitlement defect

`market_reports` is in the anonymous read set, and its policy calls `has_entitlement('reports')`, which currently raises `42P01` in production (Stage 1 review). So an anonymous read of a premium report row fails rather than returning zero rows. This audit does not change that; it is noted so the two findings are not confused — one is a grant posture, the other is a broken function.

---

## 7. Minimum required privileges

Derived from policies that reach `anon`, not from what is granted:

| Privilege | Required on | Count |
|---|---|---|
| SELECT (tables) | the 36 tables with an `anon`-reaching SELECT/ALL policy | 36 |
| SELECT (views) | `published_price_observations`, `market_price_summary` | 2 |
| INSERT | `contact_enquiries` only | 1 |
| UPDATE | — | 0 |
| DELETE | — | 0 |
| TRUNCATE / REFERENCES / TRIGGER / MAINTAIN | — | 0 |

`authenticated` keeps SELECT/INSERT/UPDATE/DELETE (RLS gates them) and loses TRUNCATE/REFERENCES/TRIGGER/MAINTAIN. `service_role` and `postgres` are unchanged — both need TRUNCATE for maintenance and neither is browser-reachable.

---

## 8. Proposed remediation

### 8.1 Phase 1 — `0053_least_privilege_anonymous_grants.sql` (in the chain, validated)

Revokes `TRUNCATE, REFERENCES, TRIGGER, MAINTAIN` from `anon` **and** `authenticated` on every public relation, and revokes the same from the *default* privileges for role `postgres` so future tables start closed. No DML grant changes, no policy changes — nothing an application path depends on, so there is nothing to break. Ends with a self-check that raises rather than silently under-delivering.

Validated on the local replica: chain applies cleanly, 89/89 tables with RLS, 203 policies, RLS suite (222 statements after the helper change, §12 of the readiness report) and workflow suite (346 statements) pass, no leftover rows.

### 8.2 Phase 2 — `supabase/proposed/0054_anonymous_dml_revocation.sql` (proposed, unapplied)

State-setting: revoke **all** anonymous privileges on every public relation, then grant back exactly the minimum in §7. Deliberately placed **outside** `supabase/migrations/` so it cannot be applied by accident, because it changes how denials are reported and the RLS suite currently asserts the looser form.

Prerequisites, in order:

1. `rls_test.assert_no_rows_affected` must accept `42501 permission denied` as well as "0 rows" for anonymous write attempts (e.g. `tests/rls/permission-tests.sql:870`). The assertion's intent — "anon cannot rewrite this" — survives unchanged; the helper needs the second accepted outcome. This is a reviewed test change, not a weakening.
2. Staging acceptance (the six-context matrix plus an anonymous browsing pass) with Phase 2 applied.
3. A staging project, which does not exist yet.

### 8.3 Phase 3 — policy hygiene (separate, no grant change)

Scope the ten `{public}` write policies to `authenticated`, split `ALL` into explicit commands, and replace the four `is_staff()` `ALL` policies with command-specific policies. Reduces the chance that a future predicate edit re-opens anonymous writes.

---

## 9. Regression test plan

Implemented and executable now (`npm run verify:privileges`, 14/14 passing on the local replica):

| # | Invariant | Result |
|---|---|---|
| 1–3 | `anon` holds no TRUNCATE / REFERENCES / TRIGGER on any public relation | PASS |
| 4–6 | `authenticated` holds none either | PASS |
| 7 | `anon` can read a public table (`commodities`) | PASS (22 rows) |
| 8–9 | `anon` can read both published-read views | PASS (granted; empty in the replica) |
| 10 | `anon` can read `states` | PASS (11 rows) |
| 11 | `anon` can insert a contact enquiry | PASS |
| 12 | `anon` is refused a write to `market_reports` | PASS (`42501`) |
| 13 | `authenticated` keeps INSERT/SELECT on `price_observations` | PASS |
| 14 | `authenticated` lost TRUNCATE on `price_observations` | PASS |

Still to add, when Phase 2 is applied:

1. the `assert_no_rows_affected` "or denied" form, and its use in every anon-context assertion;
2. an assertion that `anon`'s privilege set equals the §7 catalogue exactly (currently reported as a target: 9 public tables still grant anon INSERT/UPDATE/DELETE in the replica);
3. an assertion on `pg_default_acl` so the platform default cannot silently return;
4. a `service_role` sanity check — it must retain TRUNCATE, since ETL maintenance needs it;
5. a production-shaped run on staging, including an anonymous browse of the public surface.

---

## 10. Residual risks

| Risk | Status |
|---|---|
| `supabase_admin`'s default privileges are outside Phase 1's reach | residual; affects tables created by that role, not by migrations |
| DML grants remain until Phase 2 | residual, documented; policies deny, but the second line of defence is missing |
| Ten `{public}`-scoped write policies | residual; correct today because of predicates (§3.1) |
| No staging project | blocks Phase 2 verification |
| Production has not been changed by this audit | by design |

---

## 11. Approval status

| Item | State |
|---|---|
| Phase 1 (`0053`) to production | **APPROVED AND APPLIED** 2026-11-26 — `20261126225938_least_privilege_anonymous_grants`, evidence §12 |
| Phase 2 test change (`42501` accepted) | **DONE** — helper updated, three branches self-tested, suite 222 statements passing |
| Phase 2 (`0054`) for review | **READY** — `supabase/proposed/0054_anonymous_dml_revocation.sql`, unapplied and outside the chain |
| Phase 2 application | **NOT REQUESTED** until a staging project exists |
| Phase 3 (policy scoping) | **NOT REQUESTED** |
| `supabase_admin` default ACL | **needs a credential with that membership** — §12.4, item 1 |

---


## 12. Phase 1 — applied to production (2026-11-26)

Applied under written authorisation as a single migration, after the six-point
preflight the authorisation required.

| | |
|---|---|
| Migration identifier | **`20261126225938_least_privilege_anonymous_grants`** |
| Repository counterpart | `supabase/migrations/0053_least_privilege_anonymous_grants.sql` |
| Payload | the same `revoke truncate, references, trigger, maintain` loop, the `postgres` default-privilege change, the self-check, and the schema comment |
| Transactional | yes — the connector rolls back on failure; it reported success |
| Rows touched | **none** — the migration contains no DML |

### 12.1 Preflight findings

| Check | Result |
|---|---|
| Exact committed SQL reviewed | yes — the applied payload is that file's statements |
| Dependency on `0052` or `0042`–`0045` | **none** — the file references no entitlement function, policy or helper; it applies against production's current schema, which lacks those migrations |
| Before-snapshot captured | yes (§12.2) |
| `postgres` default ACL addressed | **yes** — now `anon=arwd`, `authenticated=arwd` |
| `supabase_admin` default ACL addressed | **NO — not possible with this credential.** `postgres` is neither superuser nor a member of `supabase_admin` (`pg_has_role('postgres','supabase_admin','member')` = false), so `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin` is rejected. Its default ACL still reads `anon=arwdDxtm`. See §12.4. |
| Application dependency on the four privileges | **none** — no `TRUNCATE`, `REFERENCES` or `TRIGGER` use in `src/` or `scripts/` (the only grep hits are the CSS class `truncate` and the word "preferences"); no migration executes `TRUNCATE` |
| Recovery procedure | §12.5 |

### 12.2 Before and after (production)

| Measurement | Before | After |
|---|---|---|
| Public tables / views | 80 / 7 | 80 / 7 |
| `anon` TRUNCATE | 73 | **0** |
| `anon` REFERENCES | 73 | **0** |
| `anon` TRIGGER | 73 | **0** |
| `authenticated` TRUNCATE | 73 | **0** |
| `authenticated` REFERENCES | 73 | **0** |
| `authenticated` TRIGGER | 73 | **0** |
| `anon` SELECT / INSERT / UPDATE / DELETE | 73 each | 73 each (**unchanged** — Phase 1 does not touch DML) |
| `service_role` TRUNCATE | 80 | 80 (**unchanged**) |
| Default ACL, grantor `postgres` | `anon=arwdDxtm`, `authenticated=arwdDxtm` | `anon=arwd`, `authenticated=arwd` |
| Default ACL, grantor `supabase_admin` | `anon=arwdDxtm` | `anon=arwdDxtm` (unchanged, §12.4) |

### 12.3 Post-application verification

| Check | Result |
|---|---|
| Public reads as `anon` | commodities 22, states 11, `published_price_observations` 259, `market_price_summary` 96 — **intact** |
| Contact form as `anon` | insert succeeded (rolled back). Note: `insert … returning id` fails, because returning a row needs SELECT visibility and the table's only SELECT policy is staff-scoped. `src/lib/forms/actions.ts` inserts **without** `.select()`, so the real path is unaffected. |
| Authenticated ingestion | as `admin` (`is_staff()` true): UPDATE on `commodity_production` affected **48 rows** — staff policy and DML grant intact |
| `anon` TRUNCATE attempt | **`42501 permission denied for table commodities`** |
| `authenticated` TRUNCATE attempt (admin session) | **`42501 permission denied for table commodity_production`** |
| Data integrity | no rows read, written or deleted; the migration is pure privilege DDL |

### 12.4 Residual gap: `supabase_admin`'s default ACL

The migration addresses the grantor that creates Hatsi360's tables — all 80 are
owned by `postgres`, and its default ACL now excludes TRUNCATE/REFERENCES/
TRIGGER for both browser-facing roles. `supabase_admin`'s default ACL is
untouched, so a table created **by `supabase_admin`** in `public` would still
inherit them.

Mitigations, in order of preference:

1. Have the platform owner run
   `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public REVOKE …`
   from a credential that holds `supabase_admin` membership.
2. Re-run the revoke loop after any platform-side table creation — it is
   idempotent and self-checking.
3. The `verify:privileges` gate catches any reappearance in the replica, and the
   audit's recommended monitoring query (§9.2) catches it in production.

This is recorded, not concealed: the authorisation asked for both grantors to be
addressed, and only one could be. §13 carries the raw evidence,
the authority assessment and the prepared migration.

**Post-application preflight review (2026-11-26)** formally recorded this as the
single failing condition of the six-point checklist
(`PHASE_2_OPERATIONAL_READINESS_REPORT.md` §13). Because `0053` is now an applied
migration it must not be edited, so closing the gap requires a **new** additive
migration run by a credential holding `supabase_admin` — this environment has
neither. The residual is monitored instead: the revoke loop is idempotent, and
`npm run verify:privileges` fails if the privileges reappear.

### 12.5 Recovery procedure

Every change is a privilege or a default-ACL entry, and the before-state is
fully captured above, so recovery needs no data:

```sql
-- restore the object privileges
grant truncate, references, trigger on all tables in schema public to anon, authenticated;

-- restore the grantor default
alter default privileges for role postgres in schema public
  grant truncate, references, trigger on tables to anon, authenticated;
```

That is deliberately a *reversal*, not a recommendation: re-granting these
privileges restores the SEC-class exposure the migration removed. It exists for
completeness of the control set, not as an expected action.

## 13. The second default-ACL grantor — `supabase_admin` (2026-11-26)

§12 closed the grantor `postgres`. This section records the grantor that could
not be closed, with the evidence that establishes why.

### 13.1 Raw evidence, expanded

`pg_default_acl` for schema `public`, object type `r`, expanded with
`aclexplode` — **56 privilege rows, no grant options** (`is_grantable` false
throughout). ACL strings are never quoted from transcription; `anwdDxtm` is not
a table privilege code and appears in no document — it was an artefact of an
earlier summary, and the expansion below is the only authority.

| Grantor | Grantee | Raw element | Privileges |
|---|---|---|---|
| `postgres` | `anon` | `anon=arwd/postgres` | INSERT, SELECT, UPDATE, DELETE |
| `postgres` | `authenticated` | `authenticated=arwd/postgres` | INSERT, SELECT, UPDATE, DELETE |
| `postgres` | `service_role` | `service_role=arwdDxtm/postgres` | all 8 |
| `postgres` | `postgres` | `postgres=arwdDxtm/postgres` | all 8 |
| `supabase_admin` | `anon` | `anon=arwdDxtm/supabase_admin` | **all 8** |
| `supabase_admin` | `authenticated` | `authenticated=arwdDxtm/supabase_admin` | **all 8** |
| `supabase_admin` | `service_role` | `service_role=arwdDxtm/supabase_admin` | all 8 (legitimate) |
| `supabase_admin` | `postgres` | `postgres=arwdDxtm/supabase_admin` | all 8 (legitimate) |

PostgreSQL 17.11. So the exposure is the wide one — `arwdDxtm`, including
TRUNCATE, REFERENCES, TRIGGER and MAINTAIN — for both browser-facing roles.

### 13.2 Authority assessment

| Fact | Value |
|---|---|
| Session role | `postgres`, `rolsuper = false` |
| `supabase_admin` | `rolsuper = true`, `rolcanlogin = true` |
| `pg_auth_members` rows for `supabase_admin` / `postgres` | 0 |
| Tables in `public` owned by `supabase_admin` | 0 |

Requirement: superuser, or membership in `supabase_admin`. Neither is available.
The statement was run as a probe inside a transaction and rolled back:

```
ERROR: 42501: permission denied to change default privileges
```

No escalation, no role-switching, no unrelated service credential was used.
**The blocker is authority, not the SQL.**

### 13.3 Why six blanket revokes cannot reach it

`REVOKE ... ON ALL TABLES` and `ALTER DEFAULT PRIVILEGES FOR ROLE postgres`
both operate on the objects and grantor this session controls. A default ACL
entry belongs to its grantor; only that grantor (or a superuser) may alter it.
This is also why `0053` — correctly — handled one of the two grantors.

### 13.4 Proposed additive migration, unapplied

`supabase/proposed/0055_supabase_admin_default_privileges.sql`, outside
`supabase/migrations/`. It revokes TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on
tables from `anon` and `authenticated` for grantor `supabase_admin`, leaves
INSERT/SELECT/UPDATE/DELETE and all of `postgres`/`service_role` alone,
self-checks, and raises `42501` rather than silently no-opping when the caller
lacks authority.

Expected result: `anon` and `authenticated` move to `arwd`, exactly matching
what `0053` produced for the `postgres` grantor. Existing object privileges are
unaffected — default ACLs are forward-looking only.

Recovery:

```sql
alter default privileges for role supabase_admin in schema public
  grant truncate, references, trigger, maintain on tables to anon, authenticated;
```

### 13.5 Local validation

`npm run verify:default-privileges` — 9/9 checks, three branches (role absent →
no-op; role present with authority → exact revoke, legitimate grants preserved;
role present without authority → `42501`), all inside rolled-back transactions
on the throwaway replica. This proves the SQL is correct; it does not make it
executable in production.

### 13.6 What the residual exposes

Zero public tables are owned by `supabase_admin`, so **nothing existing is
exposed today**. A default ACL binds only future creations by its grantor: the
exposure materialises when `supabase_admin` creates a table in `public`, and
that table would carry anonymous TRUNCATE that RLS cannot refuse. Latent, not
active — and therefore a decision, not an incident.

### 13.7 Status

| Item | State |
|---|---|
| Object privileges (§12) | closed and verified |
| `postgres` default ACL | closed and verified |
| `supabase_admin` default ACL | **open — no authorised executor** |
| Proposal | prepared, reviewed, locally validated, unapplied |
| Monitoring | replica gate only; no production watch for new `supabase_admin` tables |

Summary: **partly closed, precisely scoped, and honestly reported.** The next
action is a decision about the credential, not more SQL.

## Appendix A — full anonymous privilege inventory (production, 2026-11-26)

`S`=SELECT `I`=INSERT `U`=UPDATE `D`=DELETE `T`=TRUNCATE `R`=REFERENCES `G`=TRIGGER. "Policies reaching anon" is the command list of `to anon` or `to public` policies. "Intended" is derived from those policies.

| Table | anon privileges | Policies reaching anon | Anonymous access intended |
|---|---|---|---|
| _hatsi_migrations |  | - | none intended |
| account_status_events | SIUDTRG | - | none intended |
| agent_profiles | SIUDTRG | - | none intended |
| alert_delivery_logs | SIUDTRG | - | none intended |
| analytics_snapshots | SIUDTRG | - | none intended |
| api_applications | SIUDTRG | - | none intended |
| api_usage_logs | SIUDTRG | - | none intended |
| article_categories | SIUDTRG | SELECT | intended |
| articles | SIUDTRG | SELECT | intended |
| audit_events | SIUDTRG | - | none intended |
| audit_logs | SIUDTRG | - | none intended |
| auth_login_attempts | SIUDTRG | - | none intended |
| billing_events | SIUDTRG | - | none intended |
| buyer_offers | SIUDTRG | SELECT | intended |
| collection_batches | SIUDTRG | - | none intended |
| collection_task_events | SIUDTRG | - | none intended |
| collection_tasks | SIUDTRG | - | none intended |
| commodities | SIUDTRG | SELECT | intended |
| commodity_categories | SIUDTRG | SELECT | intended |
| commodity_demand |  | - | none intended |
| commodity_fundamentals | SIUDTRG | ALL/SELECT | intended |
| commodity_grades | SIUDTRG | SELECT | intended |
| commodity_hs_mappings | SIUDTRG | SELECT | intended |
| commodity_production |  | - | none intended |
| commodity_seasonality | SIUDTRG | ALL/SELECT | intended |
| commodity_specifications | SIUDTRG | ALL/SELECT | intended |
| commodity_supply |  | - | none intended |
| commodity_synonyms | SIUDTRG | SELECT | intended |
| commodity_trade |  | - | none intended |
| commodity_unit_conversions | SIUDTRG | SELECT | intended |
| commodity_varieties | SIUDTRG | SELECT | intended |
| contact_enquiries | SIUDTRG | INSERT | intended |
| countries | SIUDTRG | SELECT | intended |
| customer_subscriptions | SIUDTRG | - | none intended |
| data_quality_flags | SIUDTRG | - | none intended |
| data_quality_rule_versions | SIUDTRG | - | none intended |
| entitlement_catalog | SIUDTRG | SELECT | intended |
| entitlement_tiers | SIUDTRG | SELECT | intended |
| evidence_sources |  | - | none intended |
| export_jobs | SIUDTRG | - | none intended |
| hs_codes | SIUDTRG | SELECT | intended |
| hs_revisions | SIUDTRG | SELECT | intended |
| international_trade_records | SIUDTRG | INSERT/SELECT/UPDATE | intended |
| market_agent_assignments | SIUDTRG | - | none intended |
| market_collection_schedules | SIUDTRG | - | none intended |
| market_commodity_scope | SIUDTRG | SELECT | intended |
| market_operating_schedules | SIUDTRG | SELECT | intended |
| market_reports | SIUDTRG | SELECT | intended |
| market_visit_records | SIUDTRG | - | none intended |
| market_zones | SIUDTRG | SELECT | intended |
| markets | SIUDTRG | SELECT | intended |
| measurement_units | SIUDTRG | SELECT | intended |
| notification_delivery_logs | SIUDTRG | - | none intended |
| notifications | SIUDTRG | - | none intended |
| observation_market_intelligence | SIUDTRG | - | none intended |
| observation_quality_findings | SIUDTRG | - | none intended |
| offer_verification_events | SIUDTRG | SELECT | intended |
| organization_members | SIUDTRG | - | none intended |
| organizations | SIUDTRG | - | none intended |
| price_alerts | SIUDTRG | - | none intended |
| price_observation_evidence | SIUDTRG | SELECT | intended |
| price_observations | SIUDTRG | SELECT | intended |
| price_revision_history | SIUDTRG | - | none intended |
| price_source_registry | SIUDTRG | ALL/SELECT | intended |
| price_verification_events | SIUDTRG | - | none intended |
| profiles | SIUDTRG | - | none intended |
| publication_events | SIUDTRG | - | none intended |
| report_subscriptions | SIUDTRG | - | none intended |
| saved_commodities | SIUDTRG | - | none intended |
| saved_markets | SIUDTRG | - | none intended |
| scheduled_job_runs | SIUDTRG | - | none intended |
| seller_offers | SIUDTRG | SELECT | intended |
| source_sync_events |  | - | none intended |
| states | SIUDTRG | SELECT | intended |
| system_settings | SIUDTRG | - | none intended |
| tariff_schedules | SIUDTRG | INSERT/SELECT/UPDATE | intended |
| trade_bloc_memberships | SIUDTRG | SELECT | intended |
| trade_blocs | SIUDTRG | SELECT | intended |
| trade_data_sources | SIUDTRG | ALL/SELECT | intended |
| trade_data_sync_log | SIUDTRG | INSERT/SELECT/UPDATE | intended |

Note: "intended" here means a policy reaches `anon`; it does **not** mean the privilege granted matches what the policy needs. That gap is the subject of §7 and §8.2.
