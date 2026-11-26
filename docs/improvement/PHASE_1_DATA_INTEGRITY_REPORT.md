# Hatsi360 — Phase 1 Data Integrity Report

| | |
|---|---|
| Date | 2026-11-26 |
| Branch | `arena/990d7ace-hatsi360` |
| Commits | `0a36db4` (Phase 0 baseline), `5b83d65` (Phase 1 schema repairs) |
| Evidence | `local DB` (executed chain), `source code`, `automated tests`. Hosted project: `UNKNOWN`. |

## 1. Result

`npm run verify:migrations` — which could not get past migration 0032 before this phase — now reports:

```
==> verifying objects
    public tables      : 89
    tables with RLS    : 89
    RLS policies       : 202
    public views       : 7
==> running migration smoke tests
    seed checks passed
==> running Row Level Security permission tests
    210 statements
    all RLS permission tests assertions passed
==> running operations workflow tests
    346 statements
    all operations workflow tests assertions passed
==> checking that the suites left nothing behind
    no leftover rows

ALL MIGRATIONS APPLIED CLEANLY
```

| Measure | Before | After |
|---|---|---|
| Migration files applied without workarounds | **0** (stopped at 0032) | **51 of 51** |
| Tables with RLS | 77 of 83 (with 5 harness workarounds) | **89 of 89** |
| RLS permission statements executed | 0 (suite never reached) | **210, all passing** |
| Operations workflow statements executed | 0 | **346, all passing** |
| Harness workarounds in `scripts/validate-migrations.mjs` | 5 | **1** (account provisioning, `MIG-02`) |

## 2. Schema defects fixed

Each repair is in a file that **could not parse or resolve names**, and therefore could not hold applied state in any PostgreSQL database. That is the condition under which editing an "applied" migration is safe, and it does not apply to any migration this phase did not touch.

| ID | File | Defect | Fix |
|---|---|---|---|
| `MIG-01` | new `0000_migration_ledger.sql` | `_hatsi_migrations` created by no migration | created `if not exists` before `0032` needs it; no-op where it already exists |
| `MIG-03` | `0034_commodity_intelligence.sql` | `array[]` with no element type (42P18) | `array[]::text[]`; value unchanged |
| `MIG-04` | `0038_hs_classification.sql` | 24 of 25 commodity lookups resolve to `NULL` (23502) | unresolved mappings filtered out instead of inserting `NULL` |
| `MIG-05` / `SEC-02` | `0042_enforce_watchlist_entitlement.sql` | one policy name used for four commands (42710) | one policy per command, each dropped first; predicate unchanged |
| `MIG-07` | `0047_stage4_rfq_orders.sql` | `CREATE TYPE IF NOT EXISTS` (42601); `price_type = 'spot'` (22P02) | enums created in `DO … EXCEPTION` blocks; `'indicative'`, an existing member |
| `MIG-06` | `0046`/`0047`/`0048` demo seeds | column lists from a dead schema | moved to `supabase/seeds/`, out of the chain |
| `SEC-01` | new `0050_intelligence_table_rls.sql` | six tables with no RLS | RLS on, verified rows public, staff see all, sync log staff-only |
| new | `0051_fix_bulk_role_check.sql` | `role in ('admin','staff')` — no `staff` enum member (22P02 at run time) | `is_staff()` + active account |
| new | `0052_fix_user_entitlements.sql` | `jsonb_each … as e(k, v)` then `e.k` — rejected by the planner (42P01 at run time) | native `e.key` / `e.value` |

The last two were found *by executing* the RLS suite, which had never run because the harness stopped earlier. `0052` matters most: `has_entitlement()` is called by every entitlement policy, so a raising body meant the watchlist, alert, export and bulk policies failed the query rather than answering it.

## 3. Data findings that are not fixed by SQL

### 3.1 No unit conversion is defined anywhere in the chain

`commodity_unit_conversions` is empty after a clean migration run (`local DB`). The only conversion data in the repository is the demo seed that this phase moved out of the chain: **12 rows, all "1 bag = 50 kg", all written as `is_verified = true`**. A 50 kg bag is plausible for rice, maize and millet; it is not plausible for cocoa, gum arabic or sesame, where bag weights differ by trade. Marking those "verified" inside a demo fixture is precisely the kind of claim the product rules forbid.

Consequence: today the platform cannot honestly convert a `bag` price to `kg`. The `bag` unit exists with `base_factor = null` (`0007`), which is the correct representation of "not yet known". See `COMMODITY_UNIT_GRADE_STANDARD.md`.

### 3.2 HS code coverage for the real commodity set is one row

`0038` maps HS codes onto a generic vocabulary. After the repair, exactly one mapping survives against the 22 real commodities (`Wheat`). The trade-intelligence screens therefore have essentially no published HS mapping for the Nigerian catalogue (`local DB`). This is a content gap requiring trade-domain review — it is not something to invent in a migration.

### 3.3 Grade coverage is partial by design

`0023` seeds grades for all 22 commodities, but with a deliberate rule: where a commodity has no recognised Nigerian trade grading standard, the seed says so rather than inventing tiers (`source code`). The standard document records which is which.

### 3.4 Demo data can no longer reach production through a migration

`supabase/seeds/` is not part of `db push` or the verifier. The 299 demonstration observations and their destructive cleanup are now staging-only, and the file carries the reasons.

## 4. Regression coverage added

| Test | Asserts |
|---|---|
| `tests/rls/permission-tests.sql` §4 | a customer **with** the watchlists and alerts entitlements sees their own rows |
| `tests/rls/permission-tests.sql` §4b (new) | a customer **without** them sees no saved commodities, and cannot create an alert — while still being able to *read* the alerts they already created, which is `0043`'s deliberate asymmetry |
| harness RLS assertion | no public table may exist without RLS (this is what caught `SEC-01` and now passes) |
| harness seed assertions | 11 markets, 22 commodities, 11 states, 8 units, 0 price observations after a clean run |

No test was deleted, skipped or weakened. The RLS fixture gained a subscription row because a paid capability test without a paying customer was testing the wrong thing.

## 5. What is still unknown

| Question | Status |
|---|---|
| Do the hosted project's migrations match these files? | `UNKNOWN` — unreachable |
| Does the hosted `commodity_unit_conversions` hold verified factors, and from where? | `UNKNOWN` |
| Are there `DEMO`-marked rows in production `price_observations`? | `UNKNOWN` — check `select count(*) from price_observations where source_system = 'demo_seed' or notes ilike '%DEMO%'` |
| Is `0049_whatsapp_subscribers` applied in production? | `UNKNOWN` |
| Are the six intelligence tables present, and do they now have RLS? | `UNKNOWN` |

The two new migrations (`0050`, `0051`, `0052`) must be reviewed before they are applied to production; `0050` deliberately makes unverified series invisible to anonymous readers, which is a behaviour change even though it tightens rather than loosens access.

## 6. Phase 1 exit criteria

| Criterion | State |
|---|---|
| Chain applies to an empty database with no workarounds | **met**, except account provisioning (`MIG-02`, documented, environment step) |
| Every published figure has a documented, reproducible source | **partly** — publication rules written (`DATA_PUBLICATION_RULES.md`), unit conversions genuinely absent (`COMMODITY_UNIT_GRADE_STANDARD.md`) |
| Reconciliation against production | **blocked** (`DATA_RECONCILIATION_REPORT.md` §3) |
