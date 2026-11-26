# Demo seeds (not migrations)

These three files used to be migrations (`0046_demo_seed_core`, `0047_demo_seed_operations`, `0048_demo_seed_cleanup`). They are moved here, unchanged, for two reasons.

## 1. They could not apply, and would have been wrong if they had

`demo_seed_core.sql` writes into `commodity_unit_conversions` with

```
(commodity_id, unit_id, base_unit_id, factor, is_verified, notes)
```

while `0001_core_reference_schema.sql` defines

```
(commodity_id, from_unit_id, to_unit_id, factor, note, verified_by, verified_at)
```

so the statement fails with `column "unit_id" ... does not exist` (42703). They were written against an older schema and never repaired. The other two build on the same shape.

## 2. Demo data must not be able to reach production through the migration chain

`demo_seed_operations.sql` inserts **299 demonstration price observations**, plus notifications whose body text reads "DEMO: …". `demo_seed_cleanup.sql` deletes rows. Both were part of the chain that a `supabase db push` would run against whatever project it was pointed at.

A migration is a promise that the database should look like this. The product's own rule is the opposite: published prices must be real, verified and current, and demo rows must never be able to appear as live. Keeping demonstration data in `supabase/migrations/` made that rule unenforceable by construction, so it is removed from the chain rather than repaired inside it.

## Status: needs repair before use

These files are **not runnable as they stand** — the column lists do not match the schema. Repairing them requires a decision that has not been taken yet:

- which conversions are genuinely field-verified (the files assert "1 bag = 50 kg, verified" for several grains, which is a factual claim, not a demo detail), and
- which demo accounts the observations are attributed to.

Neither is invented here. Until then, staging can be populated through the application's own submission and verification flows, which exercise the real lifecycle instead of bypassing it.

## Rule

Anything under `supabase/seeds/` is manual, staging-only, and never runs as part of `supabase db push` or `npm run verify:migrations`. See `docs/improvement/DATA_PUBLICATION_RULES.md`.
