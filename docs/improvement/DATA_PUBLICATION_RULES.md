# Hatsi360 — Data Publication Rules

| | |
|---|---|
| Date | 2026-11-26 |
| Status | Rules 1–6 are already enforced by the code and were verified on a clean database. Rules 7–11 are policy that the code does not yet enforce everywhere, and are marked as such. |
| Evidence | `source code`, `local DB` |

## The lifecycle a price must complete

```
submitted (agent)  →  verified (staff, different actor)  →  published (published_at)  →  current (is_current)
```

Only rows that have completed all four are public. Everything else is internal, and the database — not the page — decides that.

### Rule 1 — Publication is a view, not a convention

Public reads go through `published_price_observations` (`security_invoker = true`), which filters:

```sql
where is_current
  and published_at is not null
  and verification_status in ('verified', 'legacy_unverified')
```

No page reads `price_observations` directly for public display. *Enforced (`local DB`).*

### Rule 2 — Verification and publication are separate records

`price_verification_events` records who verified what and when; `publication_events` records publication. A row cannot be published by being verified, and a verifier cannot publish their own verification as a side effect. *Enforced by separate tables and separate policies.*

### Rule 3 — Agents cannot verify their own submissions

The agent insert policy allows `pending_verification` only; staff verification is a separate policy with a separate actor. *Enforced (`local DB`, RLS suite).*

### Rule 4 — Corrections are append-only

Published economic values (amount, unit, commodity, market, price type, collection time) are frozen by trigger. A correction inserts a superseding row; the original stays in `price_revision_history`. The median therefore changes by adding a row, never by rewriting one. *Enforced (`local DB`).*

### Rule 5 — Fixtures and demo data are never live

`is_public_observation` excludes the `test_fixture` source. Demo seeds are no longer migrations (`supabase/seeds/`). A fixture-backed `DataSource` reports `kind: 'fixture'` and must surface that through `getProvenance()`. *Enforced at the database; the UI banner is a code rule (`src/lib/data/*`).*

### Rule 6 — Freshness is computed, never asserted

`current | aging | stale | no_data` derives from each commodity's `freshness_window_hours` (≤ window, ≤ 2× window, > 2×). No page may print "live" or "real-time"; the label comes from the computation. *Enforced in `src/lib/operations/freshness.ts`.*

---

## Rules the code does not yet enforce everywhere

### Rule 7 — A price is only comparable with its own kind

Comparison requires the same commodity **and** the same `price_type` **and** the same unit **and** a compatible grade. `market_price_summary` groups by `(commodity, market, price_type, grade, variety, display_unit)`; any page that compares across those dimensions must say so explicitly. *Verified for the view; not audited on every page.*

### Rule 8 — No conversion without verification

A `bag` price is not converted to `kg` unless a row exists in `commodity_unit_conversions` with `verified_by` and `verified_at`. Today no such row exists anywhere (`COMMODITY_UNIT_GRADE_STANDARD.md` §2). *Policy only — nothing prevents a future query from assuming 50 kg.*

### Rule 9 — A number without provenance is not published

Every displayed figure must resolve to a source (`evidence_sources`), a collection time and a verification state. If any of the three is missing, the figure may be shown as "not recorded" but not as a price. *Policy: the API returns `source_id` but several pages render only the value.*

### Rule 10 — Intelligence series are public only when verified

After `0050`, `commodity_production`, `commodity_supply`, `commodity_demand` and `commodity_trade` expose only `verification_status = 'verified'` rows to `anon`/`authenticated`; staff see all. An imported-but-unverified series is now invisible to the public, which is fail-closed and intended. *Enforced from this phase.*

### Rule 11 — Nothing is deleted to make a page look better

Unpublished, superseded and rejected observations stay. A `DELETE` on `price_observations` is restricted; audit tables have no delete policy at all. *Enforced for audit tables; partial for observations.*

---

## What may and may not be claimed in copy

| Allowed | Only when |
|---|---|
| "Latest observation, 3 hours ago" | the row is published, current, inside the window |
| "No data for this market yet" | `no_data` state |
| "Verified by our team on <date>" | `verification_status = 'verified'` **and** a `verification_events` row |
| "Price collected by our field agents" | `agent_user_id` is a real agent account, not `test_fixture` |
| "Historical average since 2020" | the underlying rows are published and the window is stated |

| Never | Why |
|---|---|
| "Live market price" / "real-time" | collection is periodic; freshness is a window, not a stream |
| "Verified price" without a verification record | verification is an event, not a label |
| Any figure derived from demo or fixture rows | rules 5 and 9 |
| A kg price derived from an unverified bag weight | rule 8 |
| "X suppliers / Y tonnes traded" unless counted from the database | never estimated |

## Demo and staging data

- `supabase/seeds/*.sql` never runs in a deployment. It is manual, staging-only, and currently needs repair before it can run at all (`supabase/seeds/README.md`).
- A staging environment loaded with demo rows must be visibly a staging environment: `getProvenance()` reports `fixture`, and the banner must be rendered by any page that shows the data.
- The 299 demonstration observations that used to sit in the migration chain are the reason this rule exists in writing.

## WhatsApp

The WhatsApp segment on the homepage is a **waitlist**, not a delivery channel. `whatsapp_subscribers` stores a number only with `consent_at` and the wording agreed to; nothing is sent from the platform, and copy must not imply that alerts are already being delivered. Delivery adapters exist behind `NOTIFICATION_WHATSAPP_*` variables that are unset (`UNKNOWN` in production).
