# Hatsi360 — Demo Data Cleanup Guide

**Version:** 1.0
**Date:** 2026-11-15

---

## 1. Safe Cleanup

### Via Supabase SQL Editor

Connect to the Supabase project `umxzsdepbrenqysabtlt` and run:

```sql
-- Remove all demo observations (identified by DEMO: prefix in notes)
DELETE FROM price_observations WHERE notes LIKE 'DEMO:%';

-- Verify cleanup
SELECT count(*) as remaining FROM price_observations WHERE notes LIKE 'DEMO:%';
-- Should return 0
```

### What this deletes

- All price observations with `DEMO:` prefix in the `notes` field
- Approximately 299 records

### What this preserves

- All genuine price observations (no `DEMO:` prefix)
- All reference data (commodities, markets, states, units, grades)
- All user accounts, profiles, and organizations
- All application configuration

---

## 2. Verification After Cleanup

```sql
-- Check no demo records remain
SELECT count(*) FROM price_observations WHERE notes LIKE 'DEMO:%';

-- Check genuine data is intact
SELECT count(*) FROM price_observations WHERE notes NOT LIKE 'DEMO:%' OR notes IS NULL;

-- Check the published view still works
SELECT count(*) FROM published_price_observations;
```

---

## 3. Nuclear Option (Development Only)

To remove ALL observations (genuine + demo) from a development database:

```sql
-- ⚠️ DANGEROUS: Only use on development/staging databases
TRUNCATE TABLE price_observations CASCADE;
```

This resets the observations table entirely. Reference data (commodities, markets, etc.) is preserved.

---

## 4. Re-seeding After Cleanup

After cleanup, re-run the seed migration:

```bash
# Via Supabase CLI
npx supabase db push --db-url postgresql://...

# Or via Supabase Dashboard → SQL Editor
# Paste contents of supabase/migrations/0046_demo_seed_core.sql
```

---

## 5. Safety Rules

1. **Never** run `DELETE FROM price_observations` without a `WHERE` clause
2. **Always** verify the `WHERE` clause targets only demo records
3. **Always** run a `SELECT COUNT` before deleting
4. **Never** run cleanup on production without explicit authorization
5. **Always** backup before bulk deletions
