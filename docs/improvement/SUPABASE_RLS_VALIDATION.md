# Hatsi360 — Supabase RLS & Hosted Schema Validation (Phase 2, P2.1)

| | |
|---|---|
| Date | 2026-11-26 |
| Project | `umxzsdepbrenqysabtlt` (Postgres 17.11, `ACTIVE_HEALTHY`) |
| Method | Supabase management connector: `list_migrations`, `list_projects`, and **read-only** `execute_query` against `pg_class`, `pg_policies`, `information_schema.role_table_grants`, `pg_proc` and the data tables |
| Evidence class | `hosted Supabase` — this is the first document in the programme whose claims are measured on the hosted project rather than inferred from the repository |
| Mutations | **none.** No DDL, no DML, no credential change, no migration applied. |

> **Resolution note (added 2026-11-26, after the audit).** The SEC-01 finding in
> this document — six tables with RLS off and full `authenticated` DML including
> `TRUNCATE` — was remediated in production under written authorisation as
> migration `20261126224213_sec01_intelligence_table_rls`. All six now have RLS,
> `TRUNCATE`/`TRIGGER`/`REFERENCES` are revoked from `authenticated`, and writes
> are staff-gated. Project-wide RLS coverage went from 74/80 tables to **80/80**,
> policies from 150 to 162, with row counts unchanged. Before/after evidence and
> role-context verification are in `PHASE_2_OPERATIONAL_READINESS_REPORT.md` §3
> and §5. The remainder of this document is the **pre-remediation** measurement
> and is preserved unchanged as the evidence base the fix was written against;
> the entitlement finding (§ the `has_entitlement` raise) is **still open** and
> is reviewed separately in `ENTITLEMENT_REMEDIATION_REVIEW.md`.

## 1. Verdict

The hosted project is **not** the schema this repository describes, and two of the divergences are security defects that are live right now:

- six public tables have Row Level Security **disabled** while `authenticated` holds `DELETE, INSERT, UPDATE, TRUNCATE` on every one of them;
- `public.has_entitlement()` **raises** on every call in production (`42P01`), so every entitlement check in the database fails rather than answering.

## 2. Migration state

Three different records disagree, and that disagreement is itself the finding.

| Record | Count | Detail |
|---|---|---|
| `supabase_migrations.schema_migrations` (CLI history) | **6** | `0001`–`0004`, `20261114152034 commodity_intelligence`, `20261114152829 intelligence_analytics_views` |
| `public._hatsi_migrations` (the project's own ledger) | **32** | `0001`–`0033`, with `0025` absent |
| Repository | **51** files | `0000`–`0052`, after the Phase 1 repairs |

Consequences:

- The CLI history says the database has four numbered migrations; it actually has thirty-three. Any `supabase db push` or `db reset` driven by the CLI history would mis-sequence the project.
- Objects from migrations **after** `0033` exist anyway — `hs_codes`, `commodity_hs_mappings`, `tariff_schedules`, `trade_blocs` — so those migrations were applied by hand through the dashboard and left no ledger row. The schema is real; the record of how it got there is not.
- Objects from migrations up to `0049` are **missing**: `whatsapp_subscribers` (0049), `rfqs`, `quotes`, `orders`, `supplier_profiles` (0047_stage4), and the function `can_perform_bulk_operations` (0045).

## 3. Schema and policy counts

| Measure | Hosted | Repository (clean run) | Delta |
|---|---|---|---|
| Public tables | **80** | 89 | −9 (**`rfqs`, `quotes`, `orders`, `order_events`, `supplier_profiles`, `supplier_reviews`, `whatsapp_subscribers`**, plus 2 others) |
| Tables with RLS | **74** | 89 | **6 ungoverned** |
| RLS policies | **150** | 202 | −52 (the entitlement policies from 0042–0045 do not exist) |
| Public views | 7 | 7 | — |

## 4. SEC-01 is live: six tables without RLS, with full DML for `authenticated`

```
commodity_demand   commodity_production   commodity_supply
commodity_trade    evidence_sources       source_sync_events
```

Grants measured on the hosted project:

| Table | Grantee | Privileges |
|---|---|---|
| `commodity_production` | `authenticated` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `commodity_supply` | `authenticated` | same |
| `commodity_demand` | `authenticated` | same |
| `commodity_trade` | `authenticated` | same |
| `evidence_sources` | `authenticated` | same |
| `source_sync_events` | `authenticated` | same |

With RLS disabled, the grant **is** the access control. Any signed-in user — including a self-registered `public_user` — can read, alter and **truncate** the production intelligence series and their evidence catalogue. There is no ownership dimension to leak, so this is not a cross-tenant breach; it is unauthorised modification of published-source data, and it breaks the invariant that every public table is policy-governed.

`anon` has no grant on these tables, so anonymous visitors cannot read them.

**Fix ready, not applied:** `0050_intelligence_table_rls.sql` (committed, validated on a local replica). Applying it to production requires approval.

## 5. SEC-02 / SEC-03 are live: entitlement enforcement is absent *and* broken

Two independent defects, both measured:

1. **The privilege-only policies are still in force.** `saved_commodities_owner` (ALL, `user_id = auth.uid()`), `saved_markets_owner` (ALL) and `price_alerts_owner` (ALL) are the only policies on those tables. The entitlement-conditional policies from `0042`/`0043` never applied, and `export_jobs_*` still carry the ownership-only predicates from before `0044`.

2. **The resolver raises.** `public.user_entitlements` in the hosted database still contains the `jsonb_each … as e(k, v)` alias and the `e.k` reference (character offsets 136 and 194). Calling the public entry point proves the effect:

```
select public.has_entitlement('watchlists');
→ ERROR: 42P01: missing FROM-clause entry for table "k"
```

So the *intended* entitlement model is not merely unapplied — the function that implements it cannot execute. Anything that calls `has_entitlement()` fails rather than denying: the export and bulk policies, the alert write policies, and any application code path that checks an entitlement.

**Fix ready, not applied:** `0052_fix_user_entitlements.sql` (repairs the resolver) followed by `0042`–`0045` (the four entitlement migrations, repaired and validated locally). Approval required.

## 6. Data held by the project (measured, not estimated)

| Status | Rows | Source system |
|---|---|---|
| `verified` | 271 | `agent_app` |
| `submitted` | 17 | `agent_app` |
| `pending_verification` | 10 | `agent_app` |
| `rejected` | 9 | `agent_app` |
| `correction_requested` | 7 | `agent_app` |
| `draft` | 7 | `agent_app` |
| **Total** | **321** | |

- **Published and current:** **259** — exactly the figure the historical documents claimed, now measured rather than asserted.
- **Demo contamination: none.** Every row is `source_system = 'agent_app'`; no `test_fixture`, no `DEMO` marker. The demo seeds never reached production, consistent with `MIG-06`.
- Reference data: 11 markets, 22 commodities, 11 profiles. `market_price_summary` holds 96 rows.
- Observation window: 2026-09-15 → 2026-11-22.

This is real field data, and it is the reason the publication boundary matters: 62 of the 321 rows are **not** public.

## 7. Role-based permission testing — what was and was not done

| Test | Status |
|---|---|
| Policy inspection for `anon` / `authenticated` on every table | **done** (`pg_policies`, `role_table_grants`) |
| Six ungoverned tables | **done** — found |
| Entitlement resolver reachability | **done** — raises, proven |
| Anonymous / customer / agent / administrator **execution** against the hosted database | **NOT PERFORMED** — the connector executes as a privileged role, so a `set role` test would not faithfully reproduce PostgREST's JWT claims, and creating test accounts in production is out of bounds |
| The 210-statement RLS suite | **executed against a local replica** of the repository schema (all passing), **not** against the hosted schema (which differs) |

A faithful role test needs a **staging project** with the repository schema applied. Creating one is a project-creation action and is on the stop-and-ask list.

## 8. Required actions before any staging or release claim

| # | Action | Blocking? |
|---|---|---|
| 1 | Approve and apply `0050` (RLS on six tables) — closes a live unauthorised-write path | **yes** |
| 2 | Approve and apply `0052` (resolver), then `0042`–`0045` (entitlement policies) | **yes** |
| 3 | Reconcile `_hatsi_migrations` with `supabase_migrations.schema_migrations` so one record is authoritative | yes |
| 4 | Apply `0049` (`whatsapp_subscribers`) — the homepage form writes to a table that does not exist | yes, before the waitlist is promoted |
| 5 | Decide the fate of the stage-4 trade tables (`0047_stage4`): apply the repaired migration or remove the client routes that query it | yes, before `/client/trade/rfqs` and `/orders` are shipped |
| 6 | Provision a staging project, apply the chain from `0000`, and run the role tests there | yes, for P2.2–P2.4 |

None of 1–6 was executed: every one either changes production state, creates a project, or applies a migration — all on the stop-and-ask list.
