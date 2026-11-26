# Hatsi360 — Entitlement Remediation Review

| | |
|---|---|
| Date | 2026-11-26 |
| Project | `umxzsdepbrenqysabtlt` (production) |
| Branch | `arena/990d7ace-hatsi360` |
| Status | **REVIEW ONLY. Nothing in this document has been applied.** |
| Authority | SEC-01 authorisation, Part C — "review only, submit for separate approval" |

---

## 1. Scope

The SEC-01 authorisation permitted one production change: row-level security and
grants on six intelligence tables (§1–§6 of the readiness report). It
explicitly withheld the entitlement defect, which is a **separate** production
security defect with its own failure mode. This document prepares that change so
it can be approved or rejected on evidence rather than on urgency.

Nothing here is applied. `0052` and the repaired `0042`–`0045` remain
unapplied on production and will remain unapplied until this review is
approved in writing.

## 2. Current production definition of the resolver

Read directly from `pg_proc` on production, not from the repository.

```sql
CREATE OR REPLACE FUNCTION public.user_entitlements()
 RETURNS SETOF text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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

```sql
CREATE OR REPLACE FUNCTION public.has_entitlement(p_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_entitlements() e where e = p_key
  );
$function$
```

`public.current_role()` is the third function in the chain and is **correct**;
it is included because `is_staff()` and `is_admin()` depend on it:

```sql
select coalesce(
  (select p.role from public.profiles p where p.id = auth.uid()),
  'public_user'::public.user_role
);
```

## 3. The defect, stated exactly

`jsonb_each()` returns columns named `key` and `value`. The alias list
`as e(k, v)` renames them to `k` and `v` in the *output*, but the qualified
reference `e.k` is resolved against the row type of `e`, whose field is `key`.
The planner rejects the statement before it runs:

```
ERROR: 42P01: missing FROM-clause entry for table "k"
```

`has_entitlement()` is `select exists (select 1 from user_entitlements() ...)`,
so it raises the same error. A `SECURITY DEFINER` function that raises inside a
policy or an RPC does not deny cleanly — it fails the caller's query.

**Provenance note.** The authorisation referred to this as an alias/`e.k`
conflict. Verified against the live catalogue: the live spelling is exactly
`as e(k, v)` … `e.k`, i.e. the alias form, and `has_entitlement()` uses
`where e = p_key` (valid once the resolver returns, because a scalar-returning
set function exposes its value under the alias name). No discrepancy between
the authorisation and production.

## 4. Blast radius — measured, and smaller than it looks, in a way that matters

### 4.1 In the database

Exactly **one** production policy references the resolver:

| table | policy | cmd |
|---|---|---|
| `market_reports` | `reports_public_read` | SELECT |

The enforcing policies written in `0042`–`0045` (watchlist, alerts, exports,
bulk reads) are **not present on production at all**. They are part of the
hosted-vs-repository gap (150 policies hosted vs 202 in the repository), and
`can_perform_bulk_operations()` does not exist on hosted either. So no database
policy is silently denying rows for a reason anyone could observe — the
enforcement was never installed.

### 4.2 In the application

| Caller | Call | Effect of the raise |
|---|---|---|
| `src/app/(client)/layout.tsx` | `rpc('user_entitlements')` | error ignored, falls back to `[]` |
| `src/app/(client)/client/actions/intelligence.ts` ×3 | `rpc('has_entitlement')` | error → null → treated as "not entitled" |
| `src/app/(client)/client/alerts/page.tsx` | `rpc('has_entitlement')` | same |
| `src/app/(client)/client/watchlists/page.tsx` | `rpc('has_entitlement')` | same |

The layout destructures `{ data: entitlements }` and discards the error, so the
portal **renders normally with zero entitlements**. This is a silent, total
denial of every paid capability — worse than a crash, because a crash would have
been reported.

### 4.3 Why nobody has noticed

```
customer_subscriptions rows          : 0
  of which active or trialing        : 0
entitlement_catalog keys             : 6
entitlement_tiers                    : 3
```

There are no subscriptions, so there is no user who is *supposed* to be entitled
and therefore no visible inconsistency. The defect is **latent and total**: the
first real subscriber would receive nothing, and the catalogue and tiers that
would define what they bought are already seeded and waiting.

## 5. Hosted versus repository — exact differences

| Item | Production | Repository | Consequence |
|---|---|---|---|
| `user_entitlements()` body | `as e(k, v)` … `e.k` — raises | `0052` rewrites to `as e` … `e.key` / `e.value` | the only change `0052` makes |
| `has_entitlement()` body | unchanged, raises via resolver | unchanged in `0052` | fixes itself once the resolver returns |
| `saved_commodities_entitlement_*`, `saved_markets_entitlement_*` (`0042`) | absent | present (3 policies each after the `42710` repair) | watchlists unenforced in DB |
| `price_alerts_*`, `alert_delivery_logs.alert_logs_read` (`0043`) | absent | present | alerts unenforced in DB |
| `export_jobs_insert_entitled` (`0044`) | absent | present | exports unenforced in DB |
| `price_observations_bulk_read`, `international_trade_bulk_read`, `scheduled_job_runs_bulk_access` (`0045`) | absent | present | bulk reads unenforced in DB |
| `can_perform_bulk_operations()` | does not exist | defined (`0051` repair) | bulk gating calls would error |
| `market_reports.reports_public_read` | present, calls `has_entitlement` | same | the one policy that fails today's queries |

## 6. Proposed remediation — three stages, each independently reversible

The sequence matters: the resolver must return before anything is allowed to
depend on it, and each stage must be verifiable on its own.

### Stage 1 — repair the resolver (`0052` as written)

`create or replace function public.user_entitlements()` only. No policy, no
grant, no data. It cannot deny anything that is currently allowed, because it
currently denies everything by raising. Risk: **low**.

### Stage 2 — verify the resolver before it is trusted

Run the test matrix in §8 against production read-only. Stage 2 is not a
migration; it is a gate. If any row of the matrix fails, stop — do not proceed
to Stage 3.

### Stage 3 — install enforcement (`0042`–`0045`, `0051`)

These change access, so they must come **after** a green Stage 2. `0042` was
repaired because the original could never apply (`42710`, duplicate policy name);
`0045`/`0051` were repaired because the bulk check referenced a function that did
not exist. Presenting them as one migration is tempting and wrong: if the
watchlist policies behave unexpectedly, the alerts ones should not be implicated.

Recommended as three separate applies, in this order, with a verification pause
between each: `0042` (watchlists) → `0043` (alerts) → `0044`/`0045` (exports,
bulk).

## 7. Rollback and recovery

| Stage | Rollback | Notes |
|---|---|---|
| 1 | `create or replace` the `0016` body back | The old body raises; rollback restores the *defect*, not a working state. Only justified if the new body is worse, which it cannot be — it is the same predicate with valid field names. |
| 3 (`0042`) | `drop policy` the three `*_entitlement_*` policies, `create policy saved_commodities_owner` from `0016` | Restores owner-only access, i.e. the pre-`0042` behaviour |
| 3 (`0043`) | `drop policy price_alerts_read/create/update`, `create policy price_alerts_owner` from `0016` | same |
| 3 (`0044`, `0045`) | `drop policy export_jobs_insert_entitled`, restore `export_jobs_insert`; `drop policy` the three bulk reads | same |
| any | nothing touches rows, so no data recovery is required at any stage | every object here is a function or policy definition |

Every stage is a definition change. There is no point in the sequence where a
rollback has to restore data, which is the property that makes this approvable
without a maintenance window.

## 8. Test matrix — the four contexts the authorisation requires

Run against production after Stage 1 (read-only) and again after each Stage 3
step. `claims` means `request.jwt.claims` set to a real `profiles.id`.

| # | Context | Setup | Expected |
|---|---|---|---|
| 1 | **Entitled user** | temporary `customer_subscriptions` row, status `active`, `entitlements {"watchlist":true,"alerts":true,"exports":true}` | `user_entitlements()` returns those three keys; `has_entitlement('alerts')` = true; watchlist/alerts/export writes succeed |
| 2 | **Non-entitled user** | real profile without a subscription | `user_entitlements()` returns empty set (not an error); `has_entitlement('alerts')` = false; watchlist/alerts/export writes denied |
| 3 | **Administrator** | `profiles.role = 'admin'` | `is_staff()` true; admin surfaces unaffected; `has_entitlement` still answers (staff status does not imply entitlements — this is intended and should be asserted, not assumed) |
| 4 | **Unauthenticated** | `role anon`, no claims | `auth.uid()` null → empty set, no raise; no entitlement-gated row readable |
| 5 | **Expired / trial-ended** | subscription with `ends_at` in the past, or `trial_ends_at` past | empty set — the predicate's time bounds are part of the contract |
| 6 | **Catalogue miss** | subscription granting a key absent from `entitlement_catalog` | key excluded (the `join` is deliberate) |

Test 1 requires inserting a subscription row, which is a **production data
change** and is therefore outside this authorisation. It must either run on a
staging project or be approved explicitly as a temporary, rolled-back insert.
Tests 2–6 need no writes.

## 9. What this review does not claim

- That the entitlement model is right. It reviews a defect, not a design. The
  six catalogue keys and three tiers are unchanged and unexamined here.
- That Stage 3 is safe to apply without a staging run. The three-part split
  reduces the blast radius; it does not substitute for executing the matrix.
- That any of it has happened. Nothing in this document has been applied to
  production.

## 10. Decision requested

Approve, reject or amend: (a) Stage 1 alone; (b) Stage 1 + the §8 read-only
matrix on production; (c) the full sequence including Stage 3, with or without a
staging project first.

Recommendation: **(b) now, (c) only after a staging project exists**, because
Stage 3 changes access and the matrix's most important row — the entitled user —
needs a temporary subscription row that production should not receive.
