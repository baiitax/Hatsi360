# Hatsi360 — Database & Migration Audit (Phase 0)

| | |
|---|---|
| Date | 2026-11-26 |
| Method | All 50 migrations applied in filename order to a disposable PostgreSQL 19 cluster, with Supabase's `auth` and `storage` schemas and `anon`/`authenticated`/`service_role` roles stubbed as the platform provides them. Then `pg_class`, `pg_policies` and the migration ledger were queried. |
| Evidence class | `local DB` unless stated otherwise. Hosted state is `UNKNOWN` throughout. |

## 1. Verdict

**The migration chain does not apply to an empty database.** Seven independent defects (`MIG-01`–`MIG-07`) stop it. Three of them are parse-time or name-resolution errors in files that therefore **cannot have been applied to any PostgreSQL database, ever** — not production, not staging, not a laptop. That is the single most important fact in this audit: the hosted schema and this repository are not the same object, and the difference cannot be measured from here.

With five disclosed harness workarounds (`PHASE_0_BASELINE_AUDIT.md` §7) the chain reaches `0049` and yields a schema with:

| Measure | Value |
|---|---|
| Public tables | **83** |
| Tables with RLS enabled | **77** |
| Tables **without** RLS | **6** — `commodity_demand`, `commodity_production`, `commodity_supply`, `commodity_trade`, `evidence_sources`, `source_sync_events` |
| RLS policies | **166** |
| Public views | **7** |

For comparison, a naive static count of the SQL text suggests ~70 tables and ~205 `create policy` statements. Both figures are wrong: policies get dropped and recreated, some are conditional, and `create table if not exists` means a later file can redefine nothing while an earlier one created everything. **Only an executed chain gives a trustworthy inventory**, which is why this audit ran one.

## 2. Defects

Each entry gives the reproduction, the classification, and whether the file can have been applied anywhere.

### MIG-01 — the migration ledger table is created by no migration

```
FAILED in 0032_phase00_security_and_integrity.sql:
relation "public._hatsi_migrations" does not exist   (SQLSTATE 42P01)
```

`0032` hardens `public._hatsi_migrations` (enables RLS, revokes grants, adds a staff read policy), and `0033` inserts a row into it. No migration creates it. On the hosted project it exists because it was created outside the chain.

*Classification:* database defect (missing bootstrap).
*Applied anywhere?* `0032` cannot have applied to an empty database, but it may well have applied to the hosted project, where the table predates the file. `UNKNOWN`.

### MIG-02 — `0033` inserts schedules owned by accounts that no migration creates

```
FAILED in 0033_collection_activation.sql:
insert or update on table "market_collection_schedules" violates foreign key
constraint "market_collection_schedules_assigned_agent_id_fkey"
Key (assigned_agent_id)=(f9b2d2f7-2147-4579-845d-17ec462e3f91) is not present in table "profiles"
```

Both UUIDs that `0033` hard-codes (`…f9b2d2f7` as the assigned agent, `…dcc7c070` as `created_by`) are created by `0047_demo_seed_operations.sql` — a file that runs **thirty-three migrations later** and cannot apply itself (`MIG-06`). The dependency graph is inverted.

*Classification:* database defect (data dependency on rows created by a later, broken migration).
*Applied anywhere?* Only if the accounts already existed. On a fresh database: impossible.

### MIG-03 — `0034` contains an untypeable empty array literal

```
FAILED in 0034_commodity_intelligence.sql:
cannot determine type of empty array   (SQLSTATE 42P18)
hint: Explicitly cast to the desired type, for example ARRAY[]::integer[].
```

Line 253 of the seed block passes a bare `array[]` as one row of a multi-row `INSERT` into a `text[]` column. PostgreSQL cannot infer an element type for an empty array, even with a known target column — verified directly on the audit instance:

```
OK  : insert into t_arr(a) values (array[]::text[])
OK  : insert into t_arr(a) values (array['x'])
FAIL: insert into t_arr(a) values (array[])   -> cannot determine type of empty array
```

*Classification:* database defect (syntax). It is the only such literal in the chain — `0046_stage3_enhanced_features.sql` spells the same construct correctly as `array[]::text[]`.
*Applied anywhere?* **No.** A parse/analysis error cannot be applied to any PostgreSQL instance. The six intelligence tables (`commodity_production`, `commodity_supply`, `commodity_demand`, `commodity_trade`, `evidence_sources`, `source_sync_events`) were therefore created in production by some other means, or do not exist.

### MIG-04 — `0038` maps HS codes onto commodities that this repository never creates

```
FAILED in 0038_hs_classification.sql:
null value in column "commodity_id" of relation "commodity_hs_mappings" violates not-null constraint
Failing row contains (1, null, 92, high, Live bovine animals, t, ...)
```

`0038` resolves commodities by name: `WHERE name = 'Cattle'`, `'Beef'`, `'Milk'`, `'Dairy'`, `'Rice'`, `'Maize'`, `'Sugar'`, `'Salt'`, `'Iron and Steel'`, `'Machinery'`, `'Vehicles'`, `'Pharmaceuticals'`, `'Wood'`, `'Paper'`… The reference data created by `0007_seed_reference_data.sql` is the 22 Nigerian commodities (`Paddy Rice`, `Imported Rice`, `Local Rice`, `Wheat`, `Maize (White)`, `Maize (Yellow)`, `Millet`, `Sorghum (White)`, `Sorghum (Red)`, `Sesame Seed`, `Soya Beans`, `Groundnut`, `Bambara Nuts`, `Brown Beans (Oloyin)`, `White Beans`, `Dried Chilli Pepper`, `Dried Ginger`, `Gum Arabic GR-I/II/III`, `Sweet Potato`). **Exactly one name — `Wheat` — matches.**

*Classification:* database defect (seed/data-model mismatch). It also means no HS mapping for the real commodity set is version-controlled — a Phase 1 data-integrity item.
*Applied anywhere?* **No**, unless the hosted `commodities` table happens to contain a generic HS vocabulary. `UNKNOWN`, but no migration creates one.

### MIG-05 — `0042` declares one policy name four times

```
FAILED in 0042_enforce_watchlist_entitlement.sql:
policy "saved_commodities_entitlement" for table "saved_commodities" already exists   (SQLSTATE 42710)
```

The file drops `saved_commodities_owner`, then issues `CREATE POLICY saved_commodities_entitlement` once for `SELECT`, once for `INSERT`, once for `UPDATE`, once for `DELETE`. PostgreSQL allows one policy per `(name, table)`; the four commands must be four names or one `FOR ALL` policy.

*Classification:* database defect (security control that never lands). Because the `DROP` precedes the failure, a non-transactional runner would leave the table with **no policy at all**; Supabase's transactional runner rolls back, leaving the ownership-only policy in place.
*Applied anywhere?* **No.** Consequence: watchlist entitlement is enforced only in application code (`SEC-02`).

### MIG-06 — the demo-seed migrations target a schema that no longer exists

```
FAILED in 0046_demo_seed_core.sql:
column "unit_id" of relation "commodity_unit_conversions" does not exist   (SQLSTATE 42703)
```

`0046_demo_seed_core.sql` writes `(commodity_id, unit_id, base_unit_id, factor, is_verified, notes)`. `0001` defines `(commodity_id, from_unit_id, to_unit_id, factor, note, verified_by, verified_at)`. `0047_demo_seed_operations.sql` and `0048_demo_seed_cleanup.sql` build on the same stale shape.

*Classification:* database defect (stale seed). Two further problems make these files a data-integrity risk rather than just broken code: `0047` seeds **299 demonstration price observations** and `0048` deletes rows, both inside the production migration chain.
*Applied anywhere?* **No.**

### MIG-07 — the stage-4 trade schema cannot be created

```
FAILED in 0047_stage4_rfq_orders.sql:
syntax error at or near "not"   (SQLSTATE 42601)
```

The file uses `CREATE TYPE IF NOT EXISTS` five times. PostgreSQL has no such clause — `IF NOT EXISTS` is accepted by `CREATE TABLE`, `CREATE INDEX`, `CREATE SCHEMA`, `CREATE EXTENSION`, but not `CREATE TYPE`. The result is that `supplier_profiles`, `rfqs`, `rfq_quotes`/`quotes`, `orders`, `order_items` have **no migration that can create them**, while `src/app/(client)/client/trade/rfqs/page.tsx` and `.../orders/page.tsx` query them directly (`source code`).

*Classification:* database defect + application defect (routes with no possible backing schema).
*Applied anywhere?* **No.**

## 3. Structural problems independent of the defects

| Problem | Detail | Evidence |
|---|---|---|
| Duplicate migration numbers | Two files numbered `0046` (`demo_seed_core`, `stage3_enhanced_features`) and two numbered `0047` (`demo_seed_operations`, `stage4_rfq_orders`). Applied state cannot be named unambiguously; `supabase migration up` orders lexicographically, so `0046_demo_seed_core` and `0046_stage3_enhanced_features` are ordered by suffix, not by intent. | `source code` |
| Missing number | `0025` does not exist. Harmless, but it means "50 migrations, 0001–0049" is not a monotonic sequence and any tooling that infers count from the highest number is wrong. | `source code` |
| Ledger table has no migration | `_hatsi_migrations` is an out-of-band object (`MIG-01`). Its true shape is `UNKNOWN`; this audit's stub reproduces the only shape the chain's own statements require. | `local DB` |
| Seeds inside the chain | `0007` (reference data), `0023` (grades), `0033` (collection schedules), `0038` (HS codes), `0039`–`0041` (trade data), `0046`–`0048` (demo). Mixing reference data, demo data and DDL in one chain is why `MIG-02` and `MIG-06` exist. | `source code` |
| Demo data in a production chain | `0047_demo_seed_operations` inserts 299 observation rows and notification records with the text "DEMO". Whether such rows are in production is `UNKNOWN` and must be checked before any public claim about data volume. | `source code` |

## 4. What the executed schema shows is correct

- **Publication boundary.** `published_price_observations` is defined `with (security_invoker = true)` and filters `is_current and published_at is not null and verification_status in ('verified','legacy_unverified')`; `market_price_summary` derives medians per `(commodity, market, price_type, grade, variety, display_unit)`. Verified present on the audit instance.
- **Append-only corrections.** The trigger that freezes published economic values fires on the audit instance; `UPDATE`s that would move an amount, unit, commodity, market or collection time are rejected.
- **One policy per command, everywhere else.** `0043`, `0044` and `0045` — the three entitlement migrations that *do* apply — follow the correct pattern (`..._select`, `..._insert`, …), which is what `0042` should have done.
- **Storage isolation.** Bucket policies are evaluated against `storage.objects` with `storage.foldername`, and the same behaviour is reproduced by the harness stub, so a policy that passes locally is not passing because the stub is lenient.

## 5. Reproducing this audit

```bash
npm run verify:migrations        # local Postgres on port 55432, throwaway database
```

The harness prints, in order: the ledger stub, each applied file, each skipped file with the defect it works around, then table/RLS/policy/view counts and the list of tables without RLS. On this commit it exits 1 at the RLS assertion (`SEC-01`) — before reaching the RLS permission suite, the operations workflow suite and the seed assertions, which is itself a finding (`QA-03`).

## 6. What Phase 1 must do

1. Create the ledger table from the chain itself, as `0000_migration_ledger.sql` — before `0032`, so a fresh database works and the hosted project (where it already exists) is unaffected.
2. Repair the four files that **cannot ever have applied**: `0034` (cast), `0038` (guard the lookups), `0042` (distinct policy names), `0047_stage4` (`DO`/`EXCEPTION` instead of `CREATE TYPE IF NOT EXISTS`). Editing them is safe precisely because no database can hold their applied state; the rule against modifying applied migrations protects the *hosted* record, which these never entered.
3. Decide the fate of `0046`–`0048`: they are demo seeds written against a dead schema. They should not be repaired into the production chain; they should be removed from it or converted to explicitly-gated seed scripts.
4. Add RLS to the six intelligence tables (`SEC-01`) in a new migration, with staff-only read and service-role write, rather than by weakening anything.
5. Only then rerun the harness and let it reach the RLS permission suite, the workflow suite and the seed assertions — which is where the real verification value is.

Items 1–4 are in `PHASE_1_AND_2_BACKLOG.md` as P1-A.
