# Phase 01 — Database Audit

**Verified against the live database on 2026-11-13** by direct PostgreSQL connection
(`SUPABASE_DB_*`). All inspection was read-only: `SELECT` against catalog views and
`count(*)` against tables. **No schema object was created, altered or dropped.**

---

## 1. Inventory

| Object | Count |
|---|---|
| Schemas (non-system) | 9 — `auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, `supabase_migrations`, `vault` |
| Tables (`public`) | **64** |
| Views (`public`) | **2** — `published_price_observations`, `market_price_summary` |
| Materialized views | 0 |
| Enums | **25** |
| Functions (`public`, non-extension) | **130** |
| Triggers (`public`) | see §6 |
| Indexes | **179** |
| RLS policies | **134** |
| Extensions | 7 — `citext`, `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp` |
| Storage buckets | 1 — `hatsi360-evidence` (**private**, 5 MB limit, MIME allow-list, **0 objects**) |

## 2. Table inventory — populated (29 of 64)

| Table | Rows | Business purpose |
|---|---|---|
| `commodities` | 22 | Commodity catalogue (21 active) |
| `commodity_categories` | 14 | Commodity taxonomy |
| `commodity_grades` | 58 | Grade definitions per commodity |
| `commodity_synonyms` | 42 | Search aliases |
| `measurement_units` | 8 | Units with a `dimension` enum |
| `states` | 11 | Nigerian states |
| `countries` | 1 | Nigeria |
| `markets` | 11 | Market register |
| `profiles` | 5 | User profiles (3 demo operational + 2 demo commercial) |
| `agent_profiles` | 1 | Agent-specific attributes |
| `market_agent_assignments` | 6 | Agent → market entitlements |
| `collection_batches` | 10 | Collection sessions (demo fixtures) |
| `price_observations` | 58 | **The core fact table** (demo fixtures) |
| `price_verification_events` | 2 | Verification decisions |
| `buyer_offers` | 15 | Buyer procurement offers (demo) |
| `seller_offers` | 15 | Seller offers (demo) |
| `offer_verification_events` | 69 | Offer verification trail |
| `saved_commodities` | 6 | User watchlist — commodities |
| `saved_markets` | 3 | User watchlist — markets |
| `price_alerts` | 4 | User price alerts |
| `notifications` | 64 | In-app notifications (62 are `assignment_changed`) |
| `notification_delivery_logs` | 64 | Delivery attempts |
| `entitlement_catalog` | 6 | Entitlement definitions |
| `entitlement_tiers` | 3 | Subscription tiers |
| `price_source_registry` | 3 | Registered price sources |
| `system_settings` | 12 | Runtime configuration |
| `audit_logs` | 6 | Audit trail |
| `auth_login_attempts` | 1 | Login throttling |
| `_hatsi_migrations` | 29 | Migration bookkeeping — **RLS DISABLED** |

## 3. Table inventory — EMPTY (35 of 64)

These are architecturally defined, have RLS policies, and hold **zero rows**:

`account_status_events` · `alert_delivery_logs` · `analytics_snapshots` · `api_applications` ·
`article_categories` · `articles` · `audit_events` · `billing_events` ·
`collection_task_events` · `collection_tasks` · `commodity_fundamentals` ·
`commodity_seasonality` · `commodity_specifications` · `commodity_unit_conversions` ·
`commodity_varieties` · `contact_enquiries` · `customer_subscriptions` · `data_quality_flags` ·
`data_quality_rule_versions` · `export_jobs` · `market_collection_schedules` ·
`market_commodity_scope` · `market_operating_schedules` · `market_reports` ·
`market_visit_records` · `market_zones` · `observation_market_intelligence` ·
`observation_quality_findings` · `organization_members` · `organizations` ·
`price_observation_evidence` · `price_revision_history` · `report_subscriptions` ·
`scheduled_job_runs`

**This is the audit's central finding.** Seven of the ten target capabilities
(`REMEDIATION_BACKLOG.md` §Capabilities) have a complete schema and no data.

## 4. The agricultural market data model — mapped to business concepts

| Business concept | Actual table(s) | Columns of note |
|---|---|---|
| Commodities | `commodities` | `slug`, `category_id`, `freshness_window_hours` |
| Categories | `commodity_categories` | |
| Grades | `commodity_grades` | `commodity_id`, `name` |
| Units | `measurement_units` | `code`, `dimension` (`unit_dimension` enum), `is_specific` |
| Markets | `markets` | `state_id`, `market_zone_id`, `latitude`, `longitude` — **both NULL on all 11 rows** |
| Market zones | `market_zones` | **empty** |
| Agents | `profiles` + `agent_profiles` | role `agent`, `employee_code`, `employment_status` |
| Assignments | `market_agent_assignments` | `user_id`, `market_id`, `status` |
| Collection tasks | `collection_tasks` | **empty** |
| Batches | `collection_batches` | `reference`, `status` |
| **Price observations** | `price_observations` | 33 columns — see §5 |
| Verification records | `price_verification_events` | `action`, `actor_id`, `actor_role`, `reason` |
| Published prices | `published_price_observations` (view) | security-invoker, filters `test_fixture` |
| Price history | `price_observations` + `price_revision_history` (empty) | versioning via `supersedes_id`/`superseded_by` |
| Market statistics | `market_price_summary` (view) | median/min/max/count over published rows |
| Analytics | `analytics_snapshots` | **empty** |
| Price alerts | `price_alerts` | `direction`, `threshold_amount`, `threshold_percent`, `channel` |
| Trade offers | `buyer_offers` + `seller_offers` | 28 columns each, separate tables by design |
| Research reports | `market_reports`, `articles` | **both empty** |
| Watchlists | `saved_commodities`, `saved_markets` | owner-scoped |

## 5. `price_observations` — the core table (33 columns)

```
id* · commodity_id* · market_id* · variety_id · grade_id · price_type* ·
reported_amount · reported_unit_id · package_weight_kg · package_count ·
normalized_amount · normalized_unit_id · currency_code* ·
collected_at* · collected_at_precision* · submitted_at · verified_at ·
published_at · rejected_at · agent_user_id · verified_by · verification_status* ·
notes · source_system* · source_reference · supersedes_id · is_current* ·
created_at* · updated_at* · superseded_by · submission_key · quality_flags* ·
collection_batch_id
```
`*` = NOT NULL.

**Constraints:** PK on `id`; 11 FKs (commodity, market, variety, grade, two units, agent, verifier,
batch, and two self-references for lineage); CHECKs on amounts > 0, package counts > 0, and the
**`price_observations_publication_guard`**:

```sql
CHECK ((published_at IS NULL) OR
       (verification_status = ANY (ARRAY['verified','legacy_unverified'])))
```

**Indexes (13):** PK; unique `submission_key` (partial, non-null); unique
`price_observations_duplicate_guard` on
`(commodity_id, market_id, price_type, grade_id, reported_amount, reported_unit_id, collected_at)`
partial `WHERE is_current AND verification_status <> 'rejected'`; plus `agent_collected`,
`agent`, `batch`, `collected_at`, `commodity_market`, `market`, `published` (partial),
`status`, `submitted` (partial), `type`. **No duplicate index definitions** across the whole schema.

**Triggers (3):**
- `price_observations_audit_change` — AFTER UPDATE → `audit_observation_change()`
- `price_observations_prevent_published_mutation` — BEFORE UPDATE → `prevent_published_economic_mutation()`
- `price_observations_set_updated_at` — BEFORE UPDATE → `set_updated_at()`

## 6. Functions and triggers — application layer

130 non-extension functions. The lifecycle-relevant ones:

| Function | Security | Role |
|---|---|---|
| `approve_observation` | SECURITY DEFINER | Verification. Does **not** publish. |
| `append_correction` | SECURITY DEFINER | Append-only correction with a reason |
| `apply_observation_findings` | SECURITY DEFINER | Data-quality rule application |
| `observation_findings` | SECURITY DEFINER | Quality rule evaluation |
| `audit_observation_change` | SECURITY DEFINER (trigger) | Audit trail on observation change |
| `update_offer_status` | SECURITY DEFINER, **internally staff-gated** | The only offer status path |
| `expire_lapsed_offers` | SECURITY DEFINER | Offer expiry sweep |
| `generate_collection_tasks` | SECURITY DEFINER | Task generation (table is empty) |
| `is_staff` / `is_admin` / `is_active_account` / `has_role` | SECURITY DEFINER | Authorisation primitives |
| `is_public_observation` | **not** definer, IMMUTABLE | Public-read predicate |
| `assigned_market_ids` / `is_assigned_to_market` | SECURITY DEFINER | Agent scoping |
| `has_entitlement` / `api_application_entitlements` | SECURITY DEFINER | API gating |
| `count_login_attempts` / `clear_login_attempts` | SECURITY DEFINER | Login throttling |
| `handle_new_user` | SECURITY DEFINER (trigger) | Profile creation on signup |

**Every** SECURITY DEFINER function sets `search_path = public` — no search-path injection found.

## 7. RLS

All 64 tables have `relrowsecurity = true` **except `_hatsi_migrations`**. All 63 RLS-enabled tables
have at least one policy. Full policy inventory: `SECURITY_AND_RLS_AUDIT.md`.

## 8. Views

### `published_price_observations`
`security_invoker = true`. Filters:
```sql
WHERE o.is_current
  AND o.published_at IS NOT NULL
  AND o.verification_status IN ('verified','legacy_unverified')
  AND COALESCE(o.source_system,'agent_app') <> 'test_fixture'
  AND COALESCE(o.source_reference,'')      <> 'test_fixture'
```
Joins commodities, categories, markets, states, countries, and LEFT JOINs grades, varieties, units.
Exposes `display_amount`/`display_unit_id` = `COALESCE(normalized, reported)`. **0 rows.**

### `market_price_summary`
Aggregates `published_price_observations` by `(commodity_id, market_id, price_type, grade_id,
variety_id, display_unit_id)` producing median/min/max/count and window bounds. **0 rows** (it
inherits the parent's emptiness).

## 9. Findings

| # | Finding | Severity |
|---|---|---|
| DB-1 | `_hatsi_migrations` has RLS **disabled** and `anon` holds TRUNCATE/DELETE/INSERT/UPDATE/REFERENCES. Verified: `set local role anon; select count(*) from public._hatsi_migrations` → **29 rows**. | **P0/P1** |
| DB-2 | 35 of 64 tables empty — schema far ahead of data | **P1** |
| DB-3 | `_hatsi_migrations` records **29** migrations; `supabase/migrations/` holds **30** files. Migration 0031 is not recorded. | P2 |
| DB-4 | Two overloads of `is_public_observation` exist. The 3-arg form **omits the `test_fixture` filter**. Every current call site uses the 5-arg form, so no live leak — but a future policy binding the wrong overload would silently publish fixtures. | **P1** |
| DB-5 | 0 of 11 markets carry `latitude`/`longitude`; 0 carry `market_zone_id`. No map is possible. | P2 |
| DB-6 | 21 policies use `using (true)`. All are reference/catalogue tables (commodities, markets, states, units, grades, synonyms, entitlements, zones, operating schedules, scope). Intentional, but `commodity_fundamentals_read`, `commodity_seasonality_read`, `commodity_specifications_read` and `price_source_registry_read` declare **no `TO` role**, which defaults to `PUBLIC` — broader than the explicit `anon, authenticated` used elsewhere. | P2 |
| DB-7 | `contact_enquiries_insert` is an unauthenticated INSERT with `check (true)`. Intended for the public contact form; no rate limit is visible at the database layer. | P2 |
| DB-8 | `price_revision_history` and `observation_quality_findings` are empty although `append_correction` and `apply_observation_findings` exist — the lineage tables are unused in practice. | P3 |

## 10. Proposed database improvements (not applied)

1. Enable RLS on `_hatsi_migrations` and revoke `anon`/`authenticated` DML grants (DB-1).
2. Drop the 3-arg `is_public_observation` overload (DB-4).
3. Record migration 0031 in `_hatsi_migrations` (DB-3).
4. Add an explicit `TO anon, authenticated` to the four role-less policies (DB-6).
5. Backfill `markets.latitude`/`longitude` from a verified source before any map feature (DB-5) —
   **must not be invented**.
6. Consider `noUncheckedIndexedAccess` in TypeScript rather than schema changes for index safety.
