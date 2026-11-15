# Hatsi360 — Demo Data Seed Guide

**Version:** 1.0
**Date:** 2026-11-15
**Project ref:** `umxzsdepbrenqysabtlt`

---

## 1. Quick Start

### What was seeded

| Resource | Count |
|----------|-------|
| Price observations | 299 total (238 published + 61 with other statuses) |
| Commodities with data | 16 |
| Markets with data | 9 of 11 |
| Date range | 2026-09-15 to 2026-11-14 |
| Price types | wholesale_transaction, retail |
| Verification statuses | verified, pending_verification |
| Source marker | `source_system = 'agent_app'` + `DEMO:` prefix in notes |

### Where the data lives

All demo observations are in the `price_observations` table. They flow through the `published_price_observations` view when `verification_status = 'verified'` and `published_at IS NOT NULL`.

---

## 2. Connecting Vercel to Supabase

The Hatsi360 Vercel site currently serves the **fixture dataset** (28 legacy observations) because the Supabase connection environment variables are not configured in Vercel.

### Required Vercel Environment Variables

Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add:

| Variable Name | Value | Type |
|--------------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://umxzsdepbrenqysabtlt.supabase.co` | Plain |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_Fp5qAu3ennK9REnnqP1qSw_Pd8rQxqS` | Plain |

**Apply to:** Production, Preview, and Development

After adding these variables, Vercel will automatically redeploy. The homepage will then show:
- **238+ published observations** (instead of 28)
- **10+ commodities** with price history
- **9 markets** with latest prices
- **Market movers** with % changes
- **Charts** with 60-day history

---

## 3. Data Identification

All demo records are identifiable by:
1. **`notes` field** starts with `DEMO: `
2. **Price patterns** are illustrative, not real market data
3. **Date range** is fixed (Sept–Nov 2026)

### What NOT to do

- Do NOT present demo prices as real market intelligence
- Do NOT cite demo figures in reports or external communications
- Do NOT use demo data for production decisions

---

## 4. Cleanup

To remove demo data, run the cleanup migration:

```sql
-- supabase/migrations/0048_demo_seed_cleanup.sql
DELETE FROM price_observations WHERE notes LIKE 'DEMO:%';
```

This only removes records with the `DEMO:` prefix. Genuine data is never affected.

**Warning:** Do NOT run `DELETE FROM price_observations` without a WHERE clause.

---

## 5. Re-seeding

To re-populate demo data after cleanup, re-run the SQL from `supabase/migrations/0046_demo_seed_core.sql` via the Supabase SQL Editor or the Supabase connector.

---

## 6. Commodities with Demo Data

| Commodity | Observations | Price Range (₦/bag) | Trend |
|-----------|-------------|---------------------|-------|
| Paddy Rice | 39 | 39,500–46,800 | Rising +3.7% |
| Maize (White) | 26 | 35,200–40,700 | Rising +3.1% |
| Millet | 26 | 32,800–39,000 | Rising +4.2% |
| Sorghum (White) | 26 | 27,700–32,000 | Declining -2.1% |
| Imported Rice | 21 | 52,000–58,500 | Rising +2.1% |
| Brown Beans (Oloyin) | 21 | varies | varies |
| Wheat | 21 | 48,500–57,500 | Rising +4.6% |
| White Beans | 20 | varies | varies |
| Sesame Seed | 20 | 135,000–165,000 | Rising +4.3% |
| Groundnut | 18 | 56,500–68,500 | Rising +5.2% |

---

## 7. Markets with Demo Data

| Market | State | Observations |
|--------|-------|-------------|
| Dawanau International Grains | Kano | ~80 |
| Mile 12 Market | Lagos | ~40 |
| Anchau Grains Market | Kaduna | ~25 |
| Funtua Grains Market | Katsina | ~25 |
| Gusau Central Market | Zamfara | ~15 |
| Maiduguri Monday Market | Borno | ~20 |
| Sokoto Central Market | Sokoto | ~20 |
| Zaki Biam International Yam | Benue | ~20 |
| Lafia Modern Market | Nasarawa | ~15 |
