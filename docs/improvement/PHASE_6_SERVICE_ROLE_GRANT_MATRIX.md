# Phase 6 — service_role Grant Matrix (S-4 detail)

**Status:** audit complete, `0060` reviewed and **amended** in this phase · **Not applied**
**Evidence:** `supabase/tests/service-role-access.mjs` — **27/27**
**Verdict:** `NOT_READY_FOR_PRODUCTION` (unchanged)

---

## 1. What was measured, and a correction to Phase 5

`service_role` has `rolbypassrls = true` and `rolsuper = false`. It skips every policy but not table
privileges, so a table it lacks `GRANT` on returns `42501`, not an empty set.

| Measure | Value |
|---|---|
| Tables in `public` | 89 |
| Grant `service_role` complete SELECT/INSERT/UPDATE/DELETE **before** `0060` | 46 |
| Grant SELECT/INSERT/UPDATE but not DELETE | 1 (`observation_market_intelligence`) |
| Grant `service_role` **nothing at all** | **42** |
| Therefore lacking complete DML | **43** |

**Correction:** the Phase 5 review said "60 of 89 tables grant `service_role` nothing". That figure
counted tables lacking *complete DML* with a looser predicate. The precise numbers are above: 42
grant nothing, 43 lack complete DML. The finding and its severity are unchanged; the count is now
exact. (`PHASE_5_INDEPENDENT_SQL_REVIEW.md` §2.3 has been corrected in the same commit.)

## 2. Actual application usage

Measured by scanning every `.ts`/`.tsx`/`.mjs` file under `src/`, `supabase/functions/` and
`scripts/` for `.from('<table>')`, and recording whether the same file uses
`createAdminClient`/`SERVICE_ROLE`:

| Signal | Meaning |
|---|---|
| **admin refs** | a file that builds the service-role client touches this table — a real server path |
| **session refs** | the table is touched only with the signed-in user's client; `service_role` is not needed for it |

**20 tables have admin refs.** Two of them — `offer_verification_events` and
`whatsapp_subscribers` — grant `service_role` nothing today, which means those code paths fail
`42501` in production right now. That is the concrete cost of the drift, not a hypothetical.

## 3. The matrix

`service_role today` shows S/I/U/D/T as granted (`·` = not granted) before `0060`.

| Table | service_role today | admin refs | session refs | Proposed minimum | Consequence of missing access |
|---|---|---|---|---|---|
| `_hatsi_migrations` | SIUDT | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `account_status_events` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `agent_profiles` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `alert_delivery_logs` | SIUDT | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `alert_trigger_logs` | ····· | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `analytics_snapshots` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `api_applications` | SIUDT | 2 | 3 | S, I, U | works today |
| `api_usage_logs` | SIUDT | 1 | 1 | S, I, U | works today |
| `article_categories` | SIUDT | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `articles` | SIUDT | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `audit_events` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `audit_logs` | SIUDT | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `auth_login_attempts` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `billing_events` | SIUDT | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `buyer_offers` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `collection_batches` | SIUDT | 2 | 5 | S, I, U | works today |
| `collection_task_events` | ····· | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `collection_tasks` | SIUDT | 0 | 14 | S | no measured server path; read for ops/diagnostics |
| `commodities` | SIUDT | 2 | 34 | S, I, U | works today |
| `commodity_categories` | SIUDT | 0 | 4 | S | no measured server path; read for ops/diagnostics |
| `commodity_demand` | SIUD· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `commodity_fundamentals` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `commodity_grades` | SIUDT | 1 | 6 | S, I, U | works today |
| `commodity_hs_mappings` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `commodity_production` | SIUD· | 1 | 3 | S, I, U | works today |
| `commodity_seasonality` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `commodity_specifications` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `commodity_supply` | SIUD· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `commodity_synonyms` | SIUDT | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `commodity_trade` | SIUD· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `commodity_unit_conversions` | SIUDT | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `commodity_varieties` | SIUDT | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `contact_enquiries` | SIUDT | 1 | 0 | S, I, U | works today |
| `countries` | SIUDT | 0 | 14 | S | no measured server path; read for ops/diagnostics |
| `customer_subscriptions` | SIUDT | 2 | 5 | S, I, U | works today |
| `data_quality_flags` | SIUDT | 0 | 4 | S | no measured server path; read for ops/diagnostics |
| `data_quality_rule_versions` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `entitlement_catalog` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `entitlement_tiers` | ····· | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `evidence_sources` | SIUD· | 2 | 9 | S, I, U | works today |
| `export_jobs` | ····· | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `hs_codes` | ····· | 0 | 12 | S | no measured server path; read for ops/diagnostics |
| `hs_revisions` | ····· | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `international_trade_records` | ····· | 0 | 24 | S | no measured server path; read for ops/diagnostics |
| `market_agent_assignments` | SIUDT | 2 | 9 | S, I, U | works today |
| `market_collection_schedules` | ····· | 0 | 9 | S | no measured server path; read for ops/diagnostics |
| `market_commodity_scope` | ····· | 0 | 8 | S | no measured server path; read for ops/diagnostics |
| `market_operating_schedules` | SIUDT | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `market_reports` | SIUDT | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `market_visit_records` | SIUDT | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `market_zones` | SIUDT | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `markets` | SIUDT | 0 | 31 | S | no measured server path; read for ops/diagnostics |
| `measurement_units` | SIUDT | 1 | 10 | S, I, U | works today |
| `notification_delivery_logs` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `notifications` | ····· | 0 | 10 | S | no measured server path; read for ops/diagnostics |
| `observation_market_intelligence` | SIU·· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `observation_quality_findings` | ····· | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `offer_verification_events` | ····· | 1 | 0 | S, I, U | **fails 42501 today** — a server path in this repo uses it |
| `order_events` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `orders` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `organization_members` | SIUDT | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `organizations` | SIUDT | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `price_alerts` | SIUDT | 1 | 8 | S, I, U | works today |
| `price_observation_evidence` | SIUDT | 0 | 9 | S | no measured server path; read for ops/diagnostics |
| `price_observations` | SIUDT | 1 | 44 | S, I, U | works today |
| `price_revision_history` | SIUDT | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `price_source_registry` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `price_verification_events` | SIUDT | 0 | 4 | S | no measured server path; read for ops/diagnostics |
| `profiles` | SIUDT | 1 | 26 | S, I, U | works today |
| `publication_events` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `quotes` | ····· | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `report_subscriptions` | SIUDT | 0 | 1 | S | no measured server path; read for ops/diagnostics |
| `rfqs` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `saved_commodities` | SIUDT | 1 | 9 | S, I, U | works today |
| `saved_markets` | SIUDT | 1 | 8 | S, I, U | works today |
| `scheduled_job_runs` | ····· | 0 | 4 | S | no measured server path; read for ops/diagnostics |
| `seller_offers` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `source_sync_events` | SIUD· | 2 | 5 | S, I, U | works today |
| `states` | SIUDT | 0 | 11 | S | no measured server path; read for ops/diagnostics |
| `supplier_profiles` | ····· | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `supplier_reviews` | ····· | 0 | 0 | S | no measured server path; read for ops/diagnostics |
| `system_settings` | SIUDT | 1 | 2 | S, I, U | works today |
| `tariff_schedules` | ····· | 0 | 4 | S | no measured server path; read for ops/diagnostics |
| `trade_bloc_memberships` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `trade_blocs` | ····· | 0 | 2 | S | no measured server path; read for ops/diagnostics |
| `trade_data_sources` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `trade_data_sync_log` | ····· | 0 | 4 | S | no measured server path; read for ops/diagnostics |
| `user_notification_preferences` | ····· | 0 | 3 | S | no measured server path; read for ops/diagnostics |
| `whatsapp_subscribers` | ····· | 1 | 0 | S, I, U | **fails 42501 today** — a server path in this repo uses it |

## 4. Review of `0060` for least-privilege compliance

`0060` was written in Phase 5 as a mechanical drift repair: `SELECT/INSERT/UPDATE/DELETE` on every
table. Reviewed here against the matrix above, that shape **fails least privilege in one dimension
and passes in another**:

| Dimension | Verdict |
|---|---|
| Does it grant DDL-adjacent privileges? | **No** — no `TRUNCATE`, `REFERENCES` or `TRIGGER`. Verified by test (`service-role-access.mjs` 3). |
| Does every grant correspond to a measured need? | **No** — 20 tables have measured admin usage, 69 do not. Narrowing the other 69 to `SELECT` was considered and **rejected**: the failure mode is exactly the one this file exists to remove (a server path returning `42501` at 3 a.m.), and `service_role` already bypasses RLS, so the confidentiality gain is close to zero. |
| Is anything granted that should never be granted? | **Yes, before amendment** — `DELETE` (and, on `price_observation_evidence`, `TRUNCATE`) on five append-only evidence tables. |

**Amended in this phase:**

* `SELECT, INSERT, UPDATE` on all 89 tables.
* `DELETE` on 84 — withheld on `audit_events`, `order_events`, `offer_verification_events`,
  `publication_events`, `price_observation_evidence`.
* `REVOKE DELETE, TRUNCATE` explicitly on those five (some inherited `TRUNCATE` from `0009`'s
  blanket `ALL`), because `TRUNCATE` is the privilege row security can never police.
* Default privileges for future tables now grant `SELECT, INSERT, UPDATE` only.
* Self-checks updated: every table must have S/I/U; no evidence table may carry `DELETE` or
  `TRUNCATE`; failure names the offending tables.

The rationale is integrity against a **bug**, not an attacker: a runaway server-side `DELETE` of the
audit trail is unrecoverable in a way a wrong `UPDATE` is not, and deletions of evidence remain a
deliberate act by `postgres`/`supabase_admin`.

### Outstanding least-privilege review item (LS-1) — not closed by this phase

`0060`, even as amended, grants `SELECT/INSERT/UPDATE` on **69 tables that have no measured
service-key usage**. That is a deliberate decision, taken for the reason in the table above, but it
is **not an approval** and it must not be read as one:

* **Status:** open. Requires an explicit sign-off before `0060` is applied anywhere.
* **What was rejected and why:** narrowing those 69 tables to `SELECT` (the audit's proposed
  minimum, §3) would create the exact failure mode the file exists to remove — a service-key path
  returning `42501` at runtime — while buying almost nothing, because `service_role` bypasses RLS and
  84 tables keep `DELETE` regardless.
* **The alternative, if the reviewer disagrees:** replace the four-table `evidence` array with the
  20 admin-referenced tables from §2 and grant `S/I/U` only there. The test suite would need the
  same change in `service-role-access.mjs` checks 1 and 2, which is precisely the trade-off to
  debate before apply, not after.
* **Residual R-6** below records the same item from the auditor's side.

After the amendment the Phase 5 acceptance matrix goes back to **126/126** with
`WITH_PROPOSED_0060=1`, unchanged from before the narrowing.

## 5. Consequences of missing access, by group

| Group | Tables | Consequence today |
|---|---|---|
| Admin path with no grant | `offer_verification_events`, `whatsapp_subscribers` | **live `42501`** in `src/lib/operations/*` and `src/lib/forms/actions.ts` service-key paths |
| Admin path, grant present | 18 tables | works |
| No measured server path, no grant | 40 tables | latent: the next service-key feature written against them fails at runtime, which is how this drift started |
| Evidence tables (after amendment) | 5 | `SELECT`/`INSERT`/`UPDATE` work; `DELETE` refuses — intended |

## 6. Residuals

| # | Residual | Note |
|---|---|---|
| R-5 | **35 tables still carry `service_role` `TRUNCATE`** from `0009`'s `grant all` (all pre-date this phase; the five evidence tables are the exception this file removes) | recommend a `0053`-style sweep for `service_role` as its own reviewed change |
| R-6 | Narrowing to measured usage was rejected on the 69 unmeasured tables | rationale above; revisit only if the service key's blast radius becomes a stated requirement |
| R-7 | Usage is measured from this repository, not from production traffic | a path deployed elsewhere would be missed; the staging replay is the check |
| R-8 | `service_role` bypasses RLS by design | the real control is key custody (`tests/security/client-bundle.test.ts`), not per-table grants |

## 7. Reproducing

```bash
node supabase/tests/service-role-access.mjs                              # 27/27
WITH_PROPOSED_0060=1 node supabase/tests/rls-acceptance-matrix.mjs       # 126/126
```
