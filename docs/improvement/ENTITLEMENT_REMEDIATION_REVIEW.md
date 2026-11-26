# Hatsi360 — Entitlement Remediation Review (Stage 1)

| | |
|---|---|
| Date | 2026-11-26 |
| Project | `umxzsdepbrenqysabtlt` (production) — **not modified by this stage** |
| Branch | `arena/990d7ace-hatsi360` |
| Status | **Stage 1 prepared and validated on the local replica. Hosted staging validation BLOCKED (no staging project). Production NOT applied.** |
| Authority | Stage 1 authorisation, 2026-11-26: "preparation and staging validation only. Production application is not authorised." |

---

## 0. Position in one paragraph

The repair is a single `create or replace function`. It is already in the
repository as `0052_fix_user_entitlements.sql`, has not been applied to any
hosted project, and is the exact payload proposed for production. It has now
been exercised against a real PostgreSQL 17 replica across all six required
contexts — **31 of 31 checks pass**, and a negative control reproduces the
production `42P01` failure in the same run so the fix is demonstrated rather
than asserted. Hosted staging validation has **not** happened: no Hatsi360
staging project exists, and provisioning one requires the approval the
authorisation itself asks for. Production is untouched.

---

## 1. The defect (unchanged, re-verified against the live catalogue)

`public.user_entitlements()` on production, read from `pg_proc` on 2026-11-26:

```sql
CREATE OR REPLACE FUNCTION public.user_entitlements()
 RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  select distinct k.key
  from public.customer_subscriptions s
  cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e(k, v)
  join public.entitlement_catalog c on c.key = e.k
  where s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (s.trial_ends_at is null or s.trial_ends_at > now())
    and coalesce(e.v, 'false')::boolean;
$function$
```

`jsonb_each()` returns columns `key` and `value`. The alias list `as e(k, v)`
renames them in the output, so the qualified reference `e.k` has no field to
resolve against and the planner rejects the statement:

```
ERROR: 42P01: missing FROM-clause entry for table "k"
```

`public.has_entitlement(p_key text)` is `select exists (select 1 from
public.user_entitlements() e where e = p_key)`, so it raises with it. The
`where e = p_key` form is itself valid — a scalar-returning set function exposes
its value under the alias name — and needs no change.

**The live spelling is the alias form**, matching what the authorisation
described. No discrepancy.

---

## 2. Stage A — the prepared repair

### 2.1 Artifact

`supabase/migrations/0052_fix_user_entitlements.sql`, 52 lines: **one**
`create or replace function` plus a `comment on function`. No table is altered,
no policy is touched, no row is read or written.

```sql
create or replace function public.user_entitlements()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct e.key
  from public.customer_subscriptions s
  cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e
  join public.entitlement_catalog c on c.key = e.key
  where s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (s.trial_ends_at is null or s.trial_ends_at > now())
    and coalesce(e.value, 'false')::boolean;
$$;
```

### 2.2 Why this is the smallest safe repair

The change is confined to the two identifiers that cannot resolve — `e.k` →
`e.key`, `e.v` → `e.value` — plus removing the alias list that caused it. Every
predicate is preserved character for character:

| Predicate | 0016 (live) | 0052 | Preserved |
|---|---|---|---|
| subscription owner | `s.user_id = auth.uid()` | same | ✅ |
| status gate | `in ('active','trialing')` | same | ✅ |
| start window | `starts_at is null or <= now()` | same | ✅ |
| end window | `ends_at is null or > now()` | same | ✅ |
| trial window | `trial_ends_at is null or > now()` | same | ✅ |
| per-key boolean | `coalesce(…, 'false')::boolean` | same, on `e.value` | ✅ |
| catalogue gate | `join entitlement_catalog on key` | same | ✅ |
| distinctness | `select distinct` | same | ✅ |
| signature, volatility, security, search path | `setof text / stable / definer / public` | same | ✅ |

`create or replace` keeps the existing ACL, so the `EXECUTE` grants to `anon`
and `authenticated` that production already carries are untouched — no grant
change is required for the fix to work.

### 2.3 What it deliberately does not do

- does not grant an entitlement to anybody, and does not create or edit a
  subscription;
- does not install `0042`–`0045` enforcement (Stage 3, separately authorised);
- does not alter the entitlement model, the six catalogue keys or the tiers;
- does not touch `has_entitlement()`, which needs no change (§1);
- does not fix the other defects listed in §7.

### 2.4 Dependencies

| Direction | Object | Detail |
|---|---|---|
| Reads | `public.customer_subscriptions` | columns `user_id, status, starts_at, ends_at, trial_ends_at, entitlements` — all present on production (13-column table, matches `0016`) |
| Reads | `public.entitlement_catalog` | `key` — present, 6 rows on production |
| Uses | `auth.uid()` | Supabase built-in, unchanged |
| Depended on by | `public.has_entitlement(text)` | raises until this is fixed; needs no edit itself |
| Depended on by | `market_reports.reports_public_read` | production policy whose qual calls `has_entitlement('reports')` |
| Depended on by | application RPC callers | `src/app/(client)/layout.tsx`, `client/actions/intelligence.ts` ×3, `client/alerts/page.tsx`, `client/watchlists/page.tsx` |

**Provenance note on the migration header.** `0052`'s header says "every
entitlement check in the database goes through those two functions… the
watchlist, alert, export and bulk policies plus `can_perform_bulk_operations()`
all call `has_entitlement()`." That describes the **repository's** policy set.
On production those policies do not exist (§4), so only one policy actually
consumes the function today. The SQL is unaffected; the file has deliberately
been left byte-identical so the artifact under approval is the artifact that was
reviewed.

### 2.5 Proposed production payload and identifier

The production apply path (connector `create_migration`) takes a name and a
payload, and assigns the version at execution — SEC-01 landed as
`20261126224213_sec01_intelligence_table_rls` from name
`sec01_intelligence_table_rls`.

| | |
|---|---|
| Proposed name | `fix_user_entitlements` |
| Payload | the `create or replace` + `comment on function` above, unchanged |
| Identifier | assigned at execution; will be recorded in §9 of the readiness report as `YYYYMMDDHHMMSS_fix_user_entitlements` |
| Repository counterpart | `supabase/migrations/0052_fix_user_entitlements.sql` |
| Transactional | yes — the connector rolls back on failure |
| Data changes | none |

### 2.6 Rollback and recovery

A function replacement is the easiest class of change to reverse, because the
prior state is a document, not a row. The exact production text is captured in
§1 above; recovery is:

```sql
-- rollback: restore the 0016 body verbatim (re-instates the defect, see caveat)
create or replace function public.user_entitlements()
returns setof text language sql stable security definer set search_path = public
as $function$
  select distinct k.key
  from public.customer_subscriptions s
  cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e(k, v)
  join public.entitlement_catalog c on c.key = e.k
  where s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (s.trial_ends_at is null or s.trial_ends_at > now())
    and coalesce(e.v, 'false')::boolean;
$function$;
```

**Caveat, stated plainly:** this restores the *previous definition*, which
raises. It is a rollback of the change, not a return to a working entitlement
system. Since the repaired predicate is identical except for two field names,
the realistic failure modes are "still raises" (fix is wrong) or "denies more
than expected" (predicate differs) — both diagnosable from the post-apply
verification below, neither made better by rolling back. Rollback exists for
completeness of the control, not because it is the likely response.

Verification to run immediately after any future apply (read-only):

```sql
select pg_get_functiondef('public.user_entitlements()'::regprocedure);
select public.has_entitlement('reports');                      -- must answer, not raise
select count(*) from public.market_reports;                    -- must not raise
select count(*) from public.user_entitlements();               -- operator's own: 0, no error
```

---

## 3. Stage B — validation

### 3.1 Hosted staging: BLOCKED

`list_projects` on 2026-11-26 returns eight projects in the organisation, none of
them a Hatsi360 staging environment: `supabase-cobalt-park`
(`umxzsdepbrenqysabtlt`, the production project), `supabase-almond-magnet`,
`koriepay_app`, `pluck-erp-dev`, `kwari-pos-manager-test`, `lumi-phase1-dev`,
`pluck-erp-v2-dev`. Several belong to other products and none carries this
schema.

The authorisation says to "obtain approval to provision a staging Supabase
project if one does not already exist". None exists, and project creation is on
the stop-and-ask list, so **no project was created**. Hosted staging acceptance
is therefore **BLOCKED** and is the one remaining gate before a production
application request can be made.

### 3.2 What was validated instead, and what that is worth

The repository ships a throwaway PostgreSQL 17 replica
(`npm run verify:migrations`) that applies every migration, stubs `auth.users` /
`auth.uid()`, creates the real `anon` / `authenticated` / `service_role` roles,
and asserts RLS behaviour. The new matrix runs the six contexts against it:

```bash
npm run verify:migrations     # build/refresh the replica
npm run verify:entitlements   # node supabase/tests/entitlement-stage1-matrix.mjs
```

Synthetic fixtures only, created and removed by the script: seven identities
(no subscription, entitled, expired, trial-ended, cancelled, analyst, admin),
four `market_reports` rows (free/premium × published/unpublished), and
subscriptions whose `entitlements` include a `false` key and a key absent from
the catalogue. The script never connects to a hosted project.

**Result: 31 of 31 checks pass.** `ALL STAGE 1 EXPECTATIONS MET`.

| Context | `user_entitlements()` | `has_entitlement('reports')` | `market_reports` rows visible |
|---|---|---|---|
| anonymous | `(empty)` | false | 1 |
| authenticated, no subscription | `(empty)` | false | 1 |
| active entitled | `alerts, exports, reports, watchlists` | true | 4 |
| expired subscription | `(empty)` | false | 1 |
| trial ended | `(empty)` | false | 1 |
| cancelled subscription | `(empty)` | false | 1 |
| staff (analyst) | `(empty)` | false | 4 |
| administrator | `(empty)` | false | 4 |

Additional checks in the same run:

| Check | Result |
|---|---|
| client-shell path: `select … from public.user_entitlements()` as a non-entitled signed-in user | answers, 0 rows — the layout's `[]` fallback is no longer papering over an error |
| `has_entitlement('api')` where the subscription stores `"api": false` | false — the boolean is honoured, not the key's presence |
| `has_entitlement('not_in_catalog')` where the key is absent from `entitlement_catalog` | false — the catalogue join is load-bearing |
| staff/admin do **not** inherit entitlements | asserted explicitly; `is_staff()` grants report visibility through a separate branch of the policy, which is the intended design |

**Negative control (the important half).** In a rolled-back transaction the
production body is reinstated and the same checks are run:

| Context | Pre-fix call | Observed |
|---|---|---|
| anonymous | `user_entitlements()` | `42P01 missing FROM-clause entry for table "k"` |
| anonymous | read of premium reports | `42P01` — **the defect breaks unauthenticated reads too** |
| active entitled | `user_entitlements()` | `42P01` |
| active entitled | read of premium reports | `42P01` |

Both directions are therefore demonstrated in one run: broken before, correct
after, on the same data.

### 3.3 What this does not prove

| Unproven here | Why it matters | Where it must be proven |
|---|---|---|
| Hosted staging behaviour | the replica is repository state; production is not | staging project, once approved |
| The PostgREST JWT path | the matrix sets `request.jwt.claim.sub` **and** `request.jwt.claims`; production's `auth.uid()` reads the claims JSON, the replica stub reads the singular form | a real `supabase.rpc()` call in staging |
| Anon read of `market_reports` | the repository **revokes** anon's grants; production **grants** them, so the matrix applies a temporary production-parity grant to `anon` for the run and removes it in teardown | staging must measure the real grant state — see §7.1 |
| Client-shell rendering | the SQL path answers; the React layout was not executed against a database | staging, then the app acceptance pass |

The anon row in particular is explicitly an emulation. It is labelled as such in
the script, and the divergence it exposes is filed as a finding rather than
smoothed over.

---

## 4. Stage C — production reconciliation (read-only)

All rows below were read on 2026-11-26. Nothing was written.

### 4.1 Functions

| Function | Production | Repository | Difference |
|---|---|---|---|
| `user_entitlements()` | broken alias body (§1) | `0052` repaired body | the defect; `0052` is the fix |
| `has_entitlement(text)` | `select exists (select 1 from user_entitlements() e where e = p_key)` | identical (`0016`) | **none** — fixes itself |
| `current_role()` | profiles lookup, `coalesce(..., 'public_user')` | identical | none |
| `can_perform_bulk_operations()` | **absent** | defined in `0045` | missing on production; bulk gating would error if called |

### 4.2 Policies that reference entitlements

| Table | Production policy | Shape | Repository | Difference |
|---|---|---|---|---|
| `market_reports` | `reports_public_read` | `((not is_premium and published_at not null) or is_staff() or has_entitlement('reports'))`, to `anon, authenticated` | same (`0016`) | none — but it raises today because it calls the broken function |
| `export_jobs` | `export_jobs_insert` | `(requested_by = auth.uid()) or is_admin()` — **no entitlement check** | `0044` replaces with `requested_by = auth.uid() and has_entitlement('exports')` | enforcement absent |
| `price_alerts` | `price_alerts_owner` | `ALL`, `user_id = auth.uid()` — no entitlement check | `0043` splits into read/create/update with `has_entitlement('alerts')` | enforcement absent |
| `alert_delivery_logs` | `alert_logs_owner` | owner-or-staff read | `0043` renames to `alert_logs_read` | shape differs |
| `saved_markets` / `saved_commodities` | owner-only (no entitlement names present) | — | `0042` adds `*_entitlement_select/insert/delete` | enforcement absent |
| `price_observations`, `international_trade_records`, `scheduled_job_runs` | no bulk policy | — | `0045` adds three bulk-read policies gated on `can_perform_bulk_operations()` | enforcement absent |
| `entitlement_catalog`, `entitlement_tiers` | `*_public_read`, `entitlement_tiers_admin_write` | matches `0016` | same | none |
| `customer_subscriptions` | 2 policies | matches `0016` | same | none |

### 4.3 Schema

`customer_subscriptions` (13 columns), `entitlement_catalog` (5) and
`entitlement_tiers` (8) on production match `0016` exactly, column for column.
The divergence is **functions and policies**, not tables.

### 4.4 Migration records

| Record | Entries | Last | Comment |
|---|---|---|---|
| CLI history (`supabase_migrations.schema_migrations`) | 7 | `20261126224213 sec01_intelligence_table_rls` | records only what was applied through this connector |
| Internal ledger (`public._hatsi_migrations`) | 32 | `0033_collection_activation.sql` (2026-11-14 13:15 UTC) | nothing recorded after `0033` |
| Repository | 51 files (`0000`–`0052`) | — | includes everything unapplied |

Per the authorisation, **no attempt was made to reconcile these records** — no
migration was marked applied, and no historical SQL was replayed. The
disagreement is recorded as a blocker; it means the ledger cannot be used to
determine what production contains, which is why §4.1–§4.3 were measured from
the catalogue instead.

---

## 5. Stage D — approval boundary

Nothing in this stage crossed it:

| Boundary | State |
|---|---|
| `0052` applied to production | **no** |
| `0042`–`0045` applied | **no** |
| Production data changed (subscriptions, entitlements, any row) | **no** |
| Temporary subscription created in production | **no** |
| Production env vars, deploy, staging project | **no** |
| Migration history "reconciled" | **no** |

The four conditions the authorisation sets before a production apply are
tracked in §8: (1) staging acceptance — **not met**, blocked; (2) exact
migration reviewed — **met** (§2.5); (3) recovery documented — **met** (§2.6);
(4) separate production approval — **not yet requested formally**, depends on (1).

---

## 6. Stage E — production approval request

> **Request:** approve a **hosted staging project** (`hatsi360-staging`, free
> plan, `us-east-1`, separate from `umxzsdepbrenqysabtlt`) so the six-context
> matrix can be executed with real JWT claims through PostgREST and with
> production's actual grant state, before any production entitlement change is
> requested.

No production approval is requested at this time, because condition (1) is not
met. When staging acceptance passes, the production request will be:

> Apply payload `fix_user_entitlements` (the `0052` SQL, §2.5) as a single
> transactional migration. No policies, no grants, no data. Rollback and
> post-apply verification as documented in §2.6.

---

## 7. Findings raised by this stage (reported, not fixed)

### 7.1 `anon` holds `TRUNCATE` on 73 of 80 public tables

Measured on production:

| Privilege held by `anon` | Tables |
|---|---|
| `TRUNCATE` | **73 of 80** |
| `INSERT` | 73 |
| `DELETE` | 73 |

Row-level security is enabled on all 80, so `INSERT`/`DELETE` are policed — but
**RLS never applies to `TRUNCATE`**, which is exactly the point the SEC-01
authorisation made. Among the 73 are `customer_subscriptions`,
`entitlement_catalog` and `market_reports`.

This is the same class of defect SEC-01 closed on six tables, at a much larger
scale, and it sits directly underneath the entitlement work: one unguarded
`TRUNCATE` of `customer_subscriptions` would delete every entitlement in the
platform regardless of any policy.

Practical exposure is currently limited by there being no SQL channel for the
anon role through PostgREST (it cannot issue `TRUNCATE`), but the privilege is
unnecessary and would become directly exploitable through any SQL injection,
any `SECURITY DEFINER` function taking SQL, or any credential exposure. The
repository already revokes these grants, so production is behind the repository
here — the same direction of drift as the six SEC-01 tables.

Not fixed in this stage: it needs its own authorisation, its own before/after
evidence, and a staging verification, because revoking grants on 73 tables is a
wider blast radius than Stage 1 permits.

### 7.2 Repository and production disagree on `anon` reads of `market_reports`

The repository's migrations leave `anon` with no grant on `market_reports`, while
production grants it. The policy `reports_public_read` is written `to anon,
authenticated`, which only makes sense under production's grants. So the
repository, applied as written, would give anonymous visitors an empty reports
surface. This should be resolved in the same grant-hygiene work as §7.1 — it is
a grant question, not an entitlement question.

---

## 8. Remaining risks

| Risk | Severity | Note |
|---|---|---|
| Production still raises on every entitlement check | **high** for paid features, latent today | 0 subscriptions, so no user is observably wrong yet; the first subscriber gets nothing |
| Staging unavailable | blocking | no Hatsi360 staging project; creation needs approval |
| `anon` TRUNCATE grants (§7.1) | **high** | 73 tables, RLS cannot mitigate |
| Local replica ≠ production grants | medium | the anon context in §3.2 is an emulation, clearly labelled |
| Migration records disagree (7 / 32 / 51) | medium | no reliable deploy or rollback story |
| Stage 3 (`0042`–`0045`) unvalidated | medium | enforcement will change access for watchlists, alerts, exports, bulk reads |
| First subscriber arrives before Stage 1 applies | **high** | they would be charged and receive nothing, silently |

---

## 9. Decision requested

1. **Approve provisioning of a staging project** so §3.1 can be cleared — the
   only thing standing between Stage 1 and a production request.
2. Note that Stage 1 is otherwise ready: payload fixed, dependencies mapped,
   recovery documented, local acceptance green (31/31) with a passing negative
   control.
3. Confirm whether §7.1 (anon `TRUNCATE` on 73 tables) should be prepared as the
   next security authorisation, in parallel with staging, since it is both
   larger and more directly exploitable than the entitlement defect.
