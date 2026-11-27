# Phase 5 — Release Runbook (prepared, not executed)

**Status:** prepared · **Release decision: `NOT_READY_FOR_PRODUCTION`**
**Nothing in this document has been executed against production or staging.**

---

## 1. Go/no-go gate

Release is **blocked** until all of the following are true. Each is an open item with an owner
decision, not a task this phase can complete.

| # | Blocker | State | Evidence |
|---|---|---|---|
| B1 | H-1…H-10 pass on a hosted project | **Open** | `PHASE_5_HOSTED_TEST_STRATEGY.md` |
| B2 | Staging provisioned and paid for (Option A, $45/mo) or a decision taken to skip it | **Not decided** | `PHASE_5_STAGING_COST_ANALYSIS.md` |
| B3 | S-1 (`anon` executes all 184 public functions) remediated or formally accepted | **Open** | `PHASE_5_INDEPENDENT_SQL_REVIEW.md` §2.1 |
| B4 | Production's applied migration state measured, not assumed | **Open** | §3 step 0 |
| B5 | Pre-apply dumps captured (schema, `pg_policies`, `relacl`) and restored once in a scratch database | **Open** | §4 |
| B6 | Customer-facing change in `0057` communicated | **Open** | §7 |
| B7 | Each proposed file individually approved | **Open** | standing restriction |

## 2. Dependency graph

Ordering is by dependency, not preference. Files marked ⛔ are proposals that no environment has
ever applied.

```
                       (existing chain, 0001 … 0053 assumed applied — verify in step 0)
                                          │
        ┌─────────────────────────────────┼──────────────────────────────┐
        │                                 │                              │
   ⛔ 0056 resolver                 ⛔ 0060 service_role grants      (0047 RFQ/orders foundation)
        │                                 │                              │
   ┌────┴─────┐                           │                              │
   │          │                           │                              │
⛔ 0057     ⛔ 0058                        │                         ⛔ 0059 B2B guards
   │          │                           │                              │
   └────┬─────┘                           │                              │
        └──────────┬──────────────────────┴──────────────────────────────┘
                   │
        independent, any time after approval:
        ⛔ 0054 (anon DML revocation — needs its own test-message update)
        ⛔ 0055 (supabase_admin defaults — needs supabase_admin authority)
```

Hard constraints:

* `0057` and `0058` **must** follow `0056` — both reference the repaired resolver; applying them
  first turns a live error into a different live error.
* `0059` **must** follow `0047` — it guards tables that `0047` creates. `0047` owns its own
  transaction; a runner that wraps every file in `BEGIN` will fail on it with a nested-transaction
  error.
* `0060` **must** precede any service-role work (H-10), otherwise the export path fails `42501` and
  looks like an RLS defect.
* `0054` and `0055` are independent of the rest and of each other.

## 3. Preflight (read-only, run before anything else)

**Step 0 — measure, do not assume.** Production's applied state has never been verified from this
environment.

```sql
-- applied migrations: compare against the repository chain
select version, name from supabase_migrations.schema_migrations order by version;

-- the facts this phase measured locally must be re-measured here
select count(*) filter (where not has_table_privilege('service_role', c.oid,'SELECT')) as tables_missing_service_role
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p');           -- locally: 60 of 89

select count(*) as anon_executable_functions
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and has_function_privilege('anon', p.oid,'EXECUTE');  -- locally: 184
```

**Step 1 — capture what a rollback needs.** A data restore does not restore policies or ACLs.

```sql
\copy (select tablename, policyname, permissive, roles, cmd, qual, with_check
       from pg_policies where schemaname='public') to 'pre_policies.csv' csv header
\copy (select c.relname, c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relkind in ('r','p','S')) to 'pre_acls.csv' csv header
\copy (select p.oid::regprocedure, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid)
       from pg_proc p join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public') to 'pre_functions.csv' csv header
select d.defaclrole::regrole, d.defaclobjtype, d.defaclacl
from pg_default_acl d where d.defaclnamespace='public'::regnamespace;   -- before 0055
```

**Step 2 — baseline counts**, so "did this change data?" is answerable: row counts for `orders`,
`quotes`, `rfqs`, `order_events`, `market_reports`, `user_entitlements`, `export_jobs`,
`saved_commodities`, `saved_markets`, `price_alerts`.

**Step 3 — dependency sanity.**

```sql
select to_regclass('public.orders'), to_regclass('public.quotes');   -- 0059 needs both non-null
select count(*) from pg_proc where proname='has_entitlement';        -- exactly 1 expected after 0056
```

## 4. Backup requirements

1. A full logical dump taken immediately before the window and **verified by restoring it** into a
   scratch database. An unverified dump is a hope, not a backup.
2. The three CSV captures from step 1 stored outside the database.
3. Platform backups confirmed as enabled and recent (Pro: daily, 7-day retention; the free plan
   lists none — if production is still on free, requirement 1 is the *only* recovery path).
4. Point-in-time recovery is not listed on the vendor's pricing page; do not plan around it.

## 5. Apply procedure

One file at a time, in the §2 order, each inside its own transaction where the file does not manage
one itself, and each followed by its verification block. If any verification fails: **stop, do not
continue to the next file**, and go to §6 for that file only.

| Order | File | Verify immediately after |
|---|---|---|
| 1 | ⛔ `0056` | `select public.has_entitlement('reports')` answers (no `42P01`); `select count(*) from public.user_entitlements()` succeeds; exactly one `has_entitlement` proc |
| 2 | ⛔ `0058` | as `anon`: `select count(*) from public.market_reports` returns without error |
| 3 | ⛔ `0057` | as an unentitled session: `insert into saved_commodities` → `42501`; as entitled: insert succeeds; policy count on the four tables matches expectation |
| 4 | ⛔ `0060` | `has_table_privilege('service_role','public.export_jobs','SELECT')` is true; count of tables missing service_role DML is 0 |
| 5 | (if applicable) `0047` | `to_regclass('public.orders')` non-null; `0047` manages its own transaction |
| 6 | ⛔ `0059` | triggers `orders_pin_quote_economics` and `orders_guard_transition` both exist and are `tgenabled='O'`; a direct insert with forged economics → `42501` |
| 7 | ⛔ `0054` *(separate decision)* | denial shape changes from 0 rows to `42501`; the RLS permission suite must be updated in the same release |
| 8 | ⛔ `0055` *(needs `supabase_admin`)* | `pg_default_acl` for `supabase_admin` no longer lists TRUNCATE/REFERENCES/TRIGGER/MAINTAIN for `anon` |

## 6. Recovery

| File | Rollback | Gets you back to |
|---|---|---|
| `0056` | `create or replace` the previous body from the `pre_functions.csv` capture | the raising resolver — i.e. the current production defect; only do this to stop worse breakage |
| `0057` | restore the four tables' policies from `pre_policies.csv` | today's permissive state (watchlists/export/alerts ungated) |
| `0058` | restore the single `market_reports` policy | today's policy that errors when the resolver raises |
| `0059` | `drop trigger orders_pin_quote_economics` then `drop trigger orders_guard_transition` then the functions — **in that order**; dropping a function while its trigger exists leaves every order write failing | unguarded orders |
| `0060` | `revoke` the granted privileges (list from `pre_acls.csv`) | the drift, i.e. `service_role` locked out of 60 tables again |
| `0054` | re-grant DML to `anon` | the weaker but working posture |
| `0055` | re-grant the four privileges in `supabase_admin`'s default ACL (statement documented in the file) | the exposure |

**Rollback is per-file and stops at the first file that was actually applied.** Reverting `0057`
without `0056` leaves the resolver repaired and enforcement gone — a coherent state. Reverting
`0056` while `0057` is applied makes every entitlement check raise again.

## 7. Customer impact

| Change | Who notices | What they see |
|---|---|---|
| `0056` | everyone using reports/entitlements | **improvement** — a query that currently errors (`42P01`) starts returning data |
| `0057` | any user saving commodities/markets, creating alerts or exports **without** an active entitlement | **loss of function** — writes start failing `42501`. These users currently succeed because enforcement is application-only. This is the change that needs a comms decision and, ideally, a populated entitlement set |
| `0058` | anonymous readers of reports | **improvement** — public reports load instead of erroring once a premium row exists |
| `0059` | any client creating orders outside `create_order_from_quote()`, or setting payment fields | **breakage by design** — forged economics and self-marked payments stop working. Must be checked against the shipped client before release |
| `0060` | server-side code only | **improvement** — service-key paths that were failing `42501` start working |

## 8. Stop conditions

Abort the window (roll back the file just applied) on any of:

1. A `42501` on a path that the pre-apply baseline showed succeeding.
2. `has_entitlement` or `user_entitlements` raising after `0056`.
3. Policy count or `relacl` after a file differing from the file's own self-check expectation.
4. Order creation failing for `create_order_from_quote()` after `0059` — that is a false positive in
   the pin trigger, not an attacker.
5. Any error rate above the pre-window baseline for 10 minutes after a file, whatever the cause.
6. A verification query that cannot be run at all (missing permission, missing view) — an
   unverifiable step is a failed step.

## 9. Post-apply production verification

Run within the window, not later:

```sql
-- resolver alive, for a real authenticated user
select * from public.user_entitlements() limit 5;
-- enforcement present
select count(*) from pg_policies where schemaname='public'
  and tablename in ('saved_commodities','saved_markets','price_alerts','export_jobs');  -- expect 4× write+read set
-- B2B guards installed and enabled
select tgname, tgenabled from pg_trigger
  where tgrelid='public.orders'::regclass and not tgisinternal;                          -- both 'O'
-- grants repaired
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
    and not has_table_privilege('service_role', c.oid,'SELECT');                        -- expect 0
```

Then re-run the Phase 5 suites against staging one final time; they are read-only and roll back.

## 10. What this runbook cannot do

It cannot make the release safe by itself. B1 (hosted validation) and B3 (anonymous function
execution) are open findings about the *system*, not about procedure. Until both are closed, the
correct action is to keep the pack unapplied — which is what has happened.

**Release recommendation: `NOT_READY_FOR_PRODUCTION`.**
