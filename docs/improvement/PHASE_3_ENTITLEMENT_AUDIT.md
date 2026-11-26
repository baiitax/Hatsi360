# Hatsi360 — Phase 3 entitlement and commercial readiness audit

| Field | Value |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Baseline HEAD | `fa27aaac70fdd4baa974f04e987ef04d0876163b` (confirmed, clean worktree) |
| Project | `umxzsdepbrenqysabtlt`, PostgreSQL **17.11** |
| Mode | **Read-only.** No production SQL changes, no migrations applied, no staging, no payment or subscription changes, no deployment |
| Status | **`NOT_READY_FOR_PRODUCTION`** — maintained |

Companion documents: `PHASE_3_COMMERCIAL_FEATURE_MATRIX.md`,
`PHASE_3_SUBSCRIPTION_LIFECYCLE.md`, `PHASE_3_B2B_READINESS.md`. Risk register
updates are applied to `PHASE_2_OPERATIONAL_READINESS_REPORT.md` §15.

---

## 1. Method

Every claim below is either a repository citation (file and line), a local
database result on the throwaway replica built by `npm run verify:migrations`
(`PGPORT` 55432, database `pluck_live`), or a production result from the
Supabase connector's `execute_query` against `umxzsdepbrenqysabtlt`.

Privileges and definitions were **read from `pg_proc`/`pg_policies`, never from
transcribed summaries**. That discipline is inherited from Phase 2, where a
transcribed ACL string (`anwdDxtm`) proved to be an artefact rather than
production state.

Where this audit cannot see something — PostgREST's own response, the Vercel
runtime, an authenticated browser session — it says so rather than inferring a
pass.

---

## 2. Headline findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| **E-1** | `0052` is **not applied** in production. The live `user_entitlements()` is the broken 0016 body (`as e(k, v)` … `e.k`), so **every** entitlement check raises `42P01 missing FROM-clause entry for table "k"`. | **Critical** | §3.2, §4.1 |
| **E-2** | **Zero entitlement enforcement exists at the database layer.** `0042`–`0045` are unapplied: watchlists, alerts, exports and bulk are gated by nothing but application code. | **Critical** | §3.3, §5 |
| **E-3** | The application calls `rpc('has_entitlement', { entitlement_key: … })`, but the function's parameter is `p_key`. The call is invalid regardless of E-1 — locally verified as `42883 function public.has_entitlement(entitlement_key => unknown) does not exist`. | **Critical** | §4.2 |
| **E-4** | Net effect: **entitled users cannot use watchlists or alerts** (fail-closed), while **unentitled users can write them directly through PostgREST** (no DB gate). The feature is simultaneously unusable and unenforced. | **High** | §4.2, §5 |
| **E-5** | No API route declares an `entitlement:`, although the handler supports it. `/api/v1/prices/history` serves unbounded history to anyone. | **High** | §2.1 |
| **E-6** | `reports_public_read` is the only entitlement-referencing policy in production, and it **raises `42P01` for `anon`** the moment any `market_reports` row exists. Currently 0 rows, so the defect is latent, not visible. | **High** | §3.4 |
| **E-7** | The authenticated app `/client/subscription` advertises **₦25,000/month** and **₦75,000/month** with live "Upgrade" buttons that have no handler, and FAQ copy claiming payment partners and proration. The marketing site correctly says "Proposed — pricing to be confirmed". | **High** (commercial/legal) | §6 |
| **E-8** | No subscription lifecycle machinery exists: no expiry sweep, no renewal, no past-due transition, no dunning, no alert-trigger job. | **High** | lifecycle doc §2 |

---

## 3. Workstream 1 — migration and schema reconciliation

### 3.1 The three records disagree, and none of them is the schema

| Record | Content | Count |
|---|---|---|
| Repository chain | `0001` … `0053` (no `0048`) | **52** files, plus `0054`/`0055` outside the chain |
| Internal ledger `public._hatsi_migrations` | columns `(name, applied_at)`; rows `0001_core_reference_schema.sql` … **`0033_collection_activation.sql`** (2026-11-14 13:15) | **32** |
| Hosted CLI history (`list_migrations`) | `0001`,`0002`,`0003`,`0004`, `20261114152034 commodity_intelligence`, `20261114152829 intelligence_analytics_views`, `20261126224213 sec01_intelligence_table_rls`, `20261126225938 least_privilege_anonymous_grants` | **8** |

Production's schema is **ahead of the ledger** (it contains tables created by
migrations after `0033`) and **behind the repository** (nine tables are
missing). The ledger is therefore not a reliable record of what applied, and
the CLI history records only the migrations pushed through the CLI.

This is inherited, documented, and **not reconciled here** — reconciliation
would require replaying history, which this phase forbids.

### 3.2 The entitlement migrations specifically

| Migration | Repository definition | Local DB behaviour | Production status | Evidence |
|---|---|---|---|---|
| `0016_commercial_entitlements.sql` | 6 catalogue keys, 3 tiers, `user_entitlements()` (broken body), `has_entitlement()`, `api_application_entitlements()`, audit trigger, `reports_public_read` | Applied, then superseded by `0052` | **Applied** — its broken resolver is live | `pg_get_functiondef` shows `as e(k, v)` … `join … c.key = e.k` |
| `0042_enforce_watchlist_entitlement.sql` | 8 policies on `saved_commodities`/`saved_markets`, each `user_id = auth.uid() AND (has_entitlement('watchlists') OR is_staff())` | Applied — suite verifies deny for unentitled, allow for entitled/staff | **NOT APPLIED** — production still has the ownership-only `saved_commodities_owner` (ALL) and `saved_markets_owner` (ALL) | `pg_policies` for both tables |
| `0043_enforce_alert_entitlement.sql` | 6 policies: `price_alerts_read` (ownership only), `_create`/`_update`/`_delete` (entitlement), `alert_logs_read`, `alert_logs_write` | Applied | **NOT APPLIED** — production has `price_alerts_owner` (ALL) and `alert_logs_owner` (SELECT) | `pg_policies` |
| `0044_enforce_exports_entitlement.sql` | 3 policies incl. `export_jobs_insert_entitled` with `has_entitlement('exports')` | Applied | **NOT APPLIED** — production has `export_jobs_insert`, `export_jobs_owner_read`, `export_jobs_update` | `pg_policies` |
| `0045_enforce_bulk_entitlement.sql` | `can_perform_bulk_operations()` + 3 policies (`price_observations_bulk_read`, `international_trade_bulk_read`, `scheduled_job_runs_bulk_access`) | Applied | **NOT APPLIED** — the function does not exist (`count(*) = 0`); none of the three policies exist | `pg_proc`, `pg_policies` |
| `0052_fix_user_entitlements.sql` | Replaces the resolver without the alias list; same predicate | Applied — 31/31 acceptance matrix passes | **NOT APPLIED** — production definition is the 0016 body | `pg_get_functiondef` |
| `0053_least_privilege_anonymous_grants.sql` | Revoke loop + default ACL + self-check | Applied | **APPLIED** as `20261126225938` | CLI history; Phase 2 §13 |

### 3.3 Object-level reconciliation

Production has **80 tables, 7 views, 162 policies**. The replica has **89
tables, 7 views, 203 policies**. The nine-table difference is exact:

| Table | Defining migration | Consequence in production |
|---|---|---|
| `user_notification_preferences` | `0046_stage3_enhanced_features.sql` | Notification preferences unavailable |
| `alert_trigger_logs` | `0046` | No alert audit trail |
| `supplier_profiles` | `0047_stage4_rfq_orders.sql` | Supplier discovery unavailable |
| `rfqs` | `0047` | RFQ surface unavailable |
| `quotes` | `0047` | Quoting unavailable |
| `orders` | `0047` | Orders unavailable |
| `order_events` | `0047` | No order event trail |
| `supplier_reviews` | `0047` | No review/dispute evidence |
| `whatsapp_subscribers` | `0049_whatsapp_subscribers.sql` | Channel subscription unavailable |

Production is missing **no** table that the replica has not got — the
difference is one-directional, so the replica is a strict superset.

The 20 entitlement policies of `0042`–`0045` are all absent, verified by name
and by the presence of the pre-existing policies they were written to replace.
The remaining part of the 41-policy gap is consistent with the 25 policies
defined by `0046`, `0047` and `0049` on tables that do not exist in production.

### 3.4 The one entitlement policy that *is* live

```sql
-- market_reports, SELECT, roles {anon, authenticated}
(not is_premium and published_at is not null) or is_staff() or has_entitlement('reports')
```

`market_reports` currently holds **0 rows**, so the predicate is never evaluated
and an anonymous read returns 0 rows without error. It was verified directly
that evaluating the predicate raises:

```
begin; set local role anon;
select 1 where (false) or public.has_entitlement('reports');
-- ERROR: 42P01: missing FROM-clause entry for table "k"
```

So the premium-report surface is not "closed" — it is **unexercised**. The
first published report makes every anonymous read of that table fail, and the
failure will look like a broken page rather than a permission denial.

---

## 4. Workstream 2 — the entitlement engine

### 4.1 `user_entitlements()` — production definition (verbatim)

```sql
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
```

`jsonb_each` returns columns `key`/`value`; the alias list renames them to
`k`/`v`, so `e.k` and `e.v` are invalid column references. The planner rejects
the statement at execution, so the function **raises on every call**. This is
`0052`'s finding, confirmed still live.

The predicate itself — active or trialing, started, not ended, not past trial
end, catalogue key must exist, stored value true — is sound and is what the
repaired definition preserves.

### 4.2 `has_entitlement()` — and the parameter-name defect

```sql
select exists (select 1 from public.user_entitlements() e where e = p_key);
```

One overload, argument `p_key text` (verified in `pg_proc.proargnames`). The
application calls it five times, **always** as:

```ts
await supabase.rpc('has_entitlement', { entitlement_key: 'watchlists' })
```

Locally verified:

| Call form | Result |
|---|---|
| `has_entitlement(p_key := 'reports')` | OK → `false` |
| `has_entitlement('reports')` | OK → `false` |
| `has_entitlement(entitlement_key := 'reports')` | **`42883 function public.has_entitlement(entitlement_key => unknown) does not exist`** |

Through PostgREST the same mismatch yields a resolution error (PGRST202) and
`data = null`. Every call site discards `error` and tests only the data, so the
gate resolves to "not entitled" for everyone — including a customer whose
subscription genuinely carries the key.

Call sites, all affected:

| Call site | Gate |
|---|---|
| `src/app/(client)/client/actions/intelligence.ts` (×3) | save/remove commodity and market watchlist entries, alert creation |
| `src/app/(client)/client/alerts/page.tsx` | alert page entitlement flag |
| `src/app/(client)/client/watchlists/page.tsx` | watchlist page entitlement flag |
| `src/app/(client)/layout.tsx` | `rpc('user_entitlements')` → sidebar capability list |

`layout.tsx` calls the parameterless `user_entitlements`, so it has no
name defect — but it inherits E-1 and returns `null`, which the layout
coalesces to `[]`.

### 4.3 `can_perform_bulk_operations()`

Repository definition (0045) is `security definer`, `stable`, and returns
`is_admin() OR has_entitlement('bulk') OR (profile role in ('admin','staff') AND account_status = 'active')`.

**Absent in production.** No policy references it, no application code calls
it. The `bulk` entitlement therefore has no enforcement surface anywhere today,
and the only route that would exercise it (`0045`'s three policies) is
unapplied.

### 4.4 Subscription-related functions

| Function | Present in production | Purpose | Notes |
|---|---|---|---|
| `user_entitlements()` | yes (broken) | resolve caller's keys | E-1 |
| `has_entitlement(text)` | yes (uncallable by the app) | key test | E-3 |
| `api_application_entitlements(uuid)` | yes | keys for an API application | only one overload; also inherits E-1 |
| `log_entitlement_change()` + trigger | yes | audits `entitlements` change | fires, writes `audit_logs` |
| `create_export_job`, `complete_export_job` | yes | export lifecycle | no entitlement check inside |
| `can_perform_bulk_operations()` | **no** | bulk gate | 0045 unapplied |

There is **no** function for granting, revoking, renewing, expiring, trialing
or dunning a subscription. Entitlement changes happen by direct row update on
`customer_subscriptions`, by an administrator, through RLS
(`subscriptions_admin_write`, `FOR ALL`, `is_admin()`).

### 4.5 Staff and admin overrides

| Surface | Rule | Where |
|---|---|---|
| Watchlists, alerts | `OR public.is_staff()` | 0042/0043 (unapplied in production) |
| Exports | `OR public.is_admin()` | 0044 (unapplied) |
| Bulk | `is_admin() OR has_entitlement('bulk') OR role in ('admin','staff')` | 0045 (unapplied) |
| Premium reports | `OR public.is_staff()` | 0016 — **live**, and it is why staff reads work while anon raises |
| Entitlement resolution | **no override** — staff and admin hold no keys by virtue of role | 0052 predicate |

The last row matters: a staff user does not "have" `reports`; they bypass the
policy that tests it. Application code that asks `has_entitlement('reports')`
about a staff user gets `false`. The interface therefore shows staff fewer
capabilities than the database grants them — the inverse of the usual failure.

`is_staff()` includes `verification_officer`, `market_supervisor`, `analyst`,
`admin`, `super_admin`; `is_admin()` is `admin`/`super_admin`. Production has
11 profiles, **3** of which are staff-side.

### 4.6 Caching and refresh

**There is no cache.** `getEntitlements()` opens a session client and queries
`customer_subscriptions` on every invocation; there is no `unstable_cache`,
no `revalidate` tag, no in-process memo. Consequences:

- a revocation takes effect on the next request in the application layer;
- there is no staleness window to reason about, and no cache-invalidation bug
  to find;
- the cost is one extra query per gated page render.

The database layer has no cache either: `user_entitlements()` is `STABLE`,
which permits a single evaluation per statement, not across statements.

### 4.7 Error handling when the entitlement service fails

| Layer | Behaviour on failure | Verdict |
|---|---|---|
| `user_entitlements()` / `has_entitlement()` | **raises** `42P01` | A raising function inside an RLS policy fails the query rather than denying a row |
| RLS policy referencing the raiser | query errors (`42P01`) | Users see an error, not an empty list |
| `getEntitlements()` (app) | `try/catch` → `EMPTY_ENTITLEMENTS` | **Fail-closed**, correct direction, but silent |
| `rpc('has_entitlement', …)` call sites | `data` null → falsy → "requires a premium subscription" | Fail-closed, but the message blames the customer's plan for a server defect |
| `getApplicationEntitlements()` (API keys) | same catch → empty | Fail-closed; every API key loses entitlements |

The asymmetry is the real finding: **the application fails closed and the
database fails open-by-error**. A user cannot use a paid feature, and the
system cannot tell them why. Nothing logs the entitlement failure — the catch
blocks swallow it without a single log line, so production telemetry would not
reveal E-1 or E-3.

### 4.8 Dependency inventory — everything that depends on entitlements

**Database policies (local chain, 20 gated policies from 0042–0045).**

**Application surfaces:**

| Surface | File | Uses | Enforced? |
|---|---|---|---|
| Watchlist server actions | `(client)/client/actions/intelligence.ts` | `rpc has_entitlement` | Gate present, call invalid → always denies |
| Alerts page | `(client)/client/alerts/page.tsx` | `rpc has_entitlement` | Same |
| Alerts client | `(client)/client/alerts/AlertsClient.tsx` | `hasEntitlement()` on the set | UI only |
| Watchlists page | `(client)/client/watchlists/page.tsx` | `rpc has_entitlement` | Same |
| Watchlists client | `(client)/client/watchlists/WatchlistsClient.tsx` | `hasEntitlement()` | UI only |
| Client shell | `(client)/layout.tsx` | `rpc user_entitlements` | Sidebar visibility only |
| Dashboard | `(site)/dashboard/page.tsx` | `hasEntitlement` | Display |
| Trade watchlist/alerts (marketing) | `(site)/trade/watchlist/page.tsx`, `(site)/trade/alerts/page.tsx` | `hasEntitlement` | Display |
| API handler | `src/lib/api/handler.ts` | `options.entitlement` | Implemented, **used by zero routes** |
| API auth | `src/lib/api/auth.ts` | `getApplicationEntitlements` | Resolves per key |
| Ingestion | `src/lib/intelligence/ingestion/faostat.ts` | `getEntitlements`/`hasEntitlement` | Present in ingestion path |
| Operations | `src/lib/operations/actions.ts` | `getEntitlements`, `hasEntitlement` | Staff exports bypass |
| Admin | `src/lib/operations/commercial.ts`, `admin/subscriptions/page.tsx` | reads subscriptions, tiers | Read-only surfaces |
| Pricing / policy pages | `(site)/pricing`, `(site)/terms`, `(site)/api-policy`, `(site)/faq` | tier copy from `INTELLIGENCE_TIERS` | Display only |

**API routes declaring an entitlement: 0 of 29.** `createApiHandler` supports
`entitlement`, and no route passes it. `/api/v1/prices/history` accepts
arbitrary `start_date`/`end_date` with no depth cap, no row cap and no
entitlement — the "extended history" premium boundary does not exist in code
or in data.

---

## 5. Database enforcement inventory (production)

| Table | Production policies | Entitlement-gated | Gap |
|---|---|---|---|
| `saved_commodities` | `saved_commodities_owner` (ALL) | **no** | Any authenticated user can save; no plan check |
| `saved_markets` | `saved_markets_owner` (ALL) | **no** | Same |
| `price_alerts` | `price_alerts_owner` (ALL) | **no** | Any authenticated user can create unlimited alerts |
| `alert_delivery_logs` | `alert_logs_owner` (SELECT) | **no** | No write policy at all — system-managed by absence |
| `export_jobs` | `export_jobs_insert`, `export_jobs_owner_read`, `export_jobs_update` | **no** | Any authenticated user can create export jobs |
| `price_observations` | 6 policies (`public_read`, staff/agent read/insert/update, delete) | **no** | No bulk policy; public read is the only route |
| `international_trade_records` | 3 policies ("viewable by everyone", insert/update by authenticated) | **no** | Authenticated users can insert/update trade records |
| `scheduled_job_runs` | `scheduled_job_runs_staff_read`, `_admin_write` | **no** | No bulk access policy |
| `market_reports` | `reports_public_read` | **yes — raises (E-6)** | Broken rather than closed |
| `entitlement_catalog` / `entitlement_tiers` | public read; admin write on tiers | n/a | Correct |

The last-but-one row of the commercial story: **the only live database
entitlement check in production is the one that raises.**

---

## 6. Workstream 6 — staging and cost (no provisioning performed)

No project was created and no plan was changed. Figures below are the
independently verified ones carried forward from Phase 2 §10, with the same
caveat: the annual figure is **derived** (12 × monthly), not a published price.

| Option | Cost | What it buys | Limits that matter here |
|---|---|---|---|
| Current Free plan | **$0** | 2 active projects, 500 MB database, project pauses after ~7 days idle | **Cannot create a second project** (`create_project` → 400). No staging. |
| Pro | **from $25/month** per organisation, incl. $10 compute credit / one Micro instance | A second project for staging, no idle pause | Production + staging on one org; annual ≈ **$420** *derived* |
| Pro + Small compute | $25 + $15 = **$40/month** | More memory for the replica-heavy test suite | Annual ≈ $480 *derived* |
| Team | **from $599/month** | Compliance features, more projects | Disproportionate for this stage |
| Local Supabase Docker stack | **$0** | Full Postgres + PostgREST + GoTrue + Storage locally | Requires Docker; not available in this sandbox, so PostgREST/GoTrue behaviour cannot be exercised here |

Safe alternatives, in order of preference:

1. **Local Supabase Docker stack** — the closest thing to staging without cost
   or data exposure. It would let E-3 be tested against a real PostgREST, which
   no other option available here can.
2. **Pro with production + staging**, seeded from the repository chain plus
   synthetic data only. **Never** a copy of production data (see below).
3. Defer hosted acceptance entirely and keep the local replica as the only
   proof — what is happening today.

**Data protection and migration-testing implications.** Restoring production
into staging would move live personal data (11 profiles, including 3 staff
accounts, and their `auth.users` rows) into a second environment with its own
access path and its own backup posture. For this audit, schema-level staging
is sufficient: every finding above is reproducible from the repository chain
plus synthetic rows, which is what the local replica already does. If a
production clone is ever required, it must be anonymised first (emails,
names, hashes) and the staging project must be destroyed afterwards.

---

## 7. Test evidence, and what it does not prove

| Gate | Result at this HEAD |
|---|---|
| `npm run verify:migrations` | PASS — 89 tables, 89 with RLS, 203 policies, 222 RLS statements, 346 workflow statements, no leftover rows |
| `npm run verify:entitlements` | **31/31** |
| `npm run verify:privileges` | 14/14 |
| `npm run verify:default-privileges` | 9/9 |
| `npx tsc --noEmit` | clean |
| `npm run lint` | 43 errors / 171 warnings (unchanged baseline) |

The 31-check entitlement matrix exercises: anonymous, no subscription, active
entitled, expired, trial-ended, cancelled, staff (analyst) and admin contexts;
the pre-fix `42P01` control; the catalogue-join rule; the client-shell RPC; and
premium report visibility per context.

**What it does not prove:**

- that production behaves this way — the matrix runs on the replica, where
  `0052` **is** applied;
- that the application can call the function — the matrix calls SQL directly,
  by position or by `p_key`, never through PostgREST with the argument name the
  app actually uses (E-3 is invisible to it);
- that any UI gate works — no test renders a page or invokes a server action;
- that alerts fire — no test exercises a trigger job, because none exists.

That gap is the reason this audit was needed: a green suite and a broken
product are compatible when the suite tests a different layer than the one
that fails.

---

## 8. Unresolved questions

1. **Is PostgREST returning PGRST202 for the `entitlement_key` calls in
   production?** Locally proven at the SQL layer (`42883`); the HTTP layer
   cannot be reached from this environment (direct `*.supabase.co` TLS is
   blocked, and the app runtime is on Vercel). High confidence, not measured.
2. **Which clients call `/api/v1`?** No API applications exist (0 rows), so
   there is no telemetry to say whether the ungated history endpoint is in use.
3. **Were `0042`–`0045` ever applied and then rolled back?** The ledger stops at
   `0033` and the CLI history does not list them, so there is no record either
   way. Their absence is certain; the history is not.
4. **Should staff hold entitlements as data?** Today they bypass policies
   instead, which makes `/client` show them an empty capability set. That is a
   product decision, not a defect, and it is not changed here.
5. **Is ₦25,000/₦75,000 a real price list or placeholder copy?** It exists only
   in `(client)/client/subscription/page.tsx`; no tier, catalogue entry,
   settings row or contract references it.

---

## 9. Prioritized remediation plan

No item below has been actioned in this phase.

| # | Action | Why first | Blocks | Risk of doing it |
|---|---|---|---|---|
| **1** | Apply **`0052`** to production | E-1 makes every entitlement check raise; it is a one-function replacement with a 31/31 acceptance matrix and a clean recovery (`create or replace` back to the 0016 body) | Everything else in the entitlement chain | Low — but it must be applied **before** `0042`–`0045`, or policies that call a raising function will fail closed and break the surfaces they gate |
| **2** | Fix the RPC argument name at the five call sites (`entitlement_key` → `p_key`) | E-3 keeps watchlists/alerts unusable **even after** fixing `0052` | Paid-feature usability | Low, application-only. Needs a test that goes through PostgREST or asserts the argument name against `pg_proc` |
| **3** | Apply **`0042`–`0045`** in order, after 1 and 2 | E-2 is the actual security gap: the database enforces no plan at all | Watchlist/alert/export/bulk enforcement | Medium — these policies deny data to users who currently see it; needs staging |
| **4** | Decide the `market_reports` policy (E-6) before publishing any report | The first report turns a silent 0-row result into a hard error for every anonymous reader | Premium reports launch | Medium — a policy rewrite, not a privilege change |
| **5** | Gate the API surface (`entitlement:` on `/prices/history`, `/intelligence/*`, `/trade/*`) or state deliberately that it is public | E-5; the handler already supports it and no route uses it | "API access" as a sellable tier | Low for public endpoints, medium for any existing consumer (none registered) |
| **6** | Reconcile or retire the client subscription page copy | E-7 is a customer-facing misrepresentation with no payment provider behind it | Any commercial launch | Low — copy change; must not invent a price list |
| **7** | Build the lifecycle machinery (expiry sweep, trial end, past-due, dunning) — see lifecycle doc | E-8; without it every subscription is permanent by default | Selling anything | Medium — new jobs, new state transitions |
| **8** | Decide staging (Docker first, Pro second) | Nothing above can be proved end-to-end without it | Items 3, 5, 7 | Cost/decision only |
| **9** | Reconcile migration records | Standing risk 6; blocks any repeatable deploy | Release process | High if done as a replay; needs its own plan |

**Do-not-do list**, restated because it is easy to violate under pressure:
do not edit applied `0053`; do not replay the chain; do not apply `0054` or
`0055` without separate approval; do not "fix" the resolver by editing `0016`;
do not grant entitlements to make a demo work.
