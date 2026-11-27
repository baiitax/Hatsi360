# Phase 7B — Service Role Acceptance

**Classification:** preparation only · **Baseline:** `ce17b64081648bb0cad5a7ace008478dcbde2fce`
**Proposal under review:** `supabase/proposed/0060_service_role_grant_repair.sql` (unapplied)
**Local evidence:** `supabase/tests/service-role-access.mjs` — **27/27**; matrix row **LS-1** open
**Verdict:** **neither model is approved here.** The broad grant and the narrow evidence-based grant
are both described, both measured as far as the local replica allows, and both left for the reviewer.

---

## 1. Why this is the hardest of the four acceptance areas

`service_role` is granted to the backend key. It has `BYPASSRLS`, no profile and no `auth.uid()`.
Everything it can reach, any code path holding the key can reach — including a compromised server
function, a logged secret, or an over-broad `createAdminClient()` call site.

Two models compete:

| | **Broad (`0060` as written)** | **Narrow (evidence-based)** |
|---|---|---|
| Scope | `SELECT, INSERT, UPDATE, DELETE` on all 89 tables; `TRUNCATE` withheld on 5 evidence tables | the same, but only on tables with a **measured** consumer |
| Argument | the backend is trusted; grants stop 500s from missing privileges | a grant is blast-radius; measures should be sized to what is used |
| Cost of being wrong | one compromised key reaches every table, including audit and payment state | an unmeasured-but-real consumer breaks in production with `42501` |
| Measured today | 27/27 service-role checks pass | would need 69 tables narrowed to 20 — untested |

**The distinction must not be collapsed.** Passing the compatibility tests proves that the backend's
*known* paths work; it says nothing about whether the *rest* of the surface should be reachable. A
green `service-role-access` run is not an endorsement of `GRANT ALL`.

## 2. Measurement method (reproducible)

1. Enumerate every base table in `public` → **89**.
2. Current grants from `pg_class.relacl` (`now` column; `S`=SELECT, `I`=INSERT, `U`=UPDATE,
   `D`=DELETE, `T`=TRUNCATE).
3. Admin-client references: `createAdminClient(` call sites grouped by `.from('<table>')` and
   `.rpc(`/`.schema(` variants → **20 tables** with a demonstrated consumer (Phase 6 §2 agrees).
4. Definer writers: functions with `SECURITY DEFINER` whose bodies contain `insert into`/`update`/
   `delete from <table>` → **19 further tables** that are written without any admin-client reference.
5. Evidence tables: the five append-only tables the retention design depends on → **withheld from
   `DELETE`**. One of them (`offer_verification_events`) also has an admin reference, so it is
   classified by evidence precedence.
6. Remainder → **46 tables with no measured consumer at all**.

**Reconciliation with Phase 6 (no figure is silently overwritten):**

| Measure | Phase 6 | Re-measured in 7B | Note |
|---|---|---|---|
| Tables in `public` | 89 | 89 | — |
| `service_role` grant on nothing | 42 | **42** | agrees |
| lacking complete `SELECT/INSERT/UPDATE/DELETE` | 43 | **43** | agrees; the one table with S/I/U but no D is `observation_market_intelligence` |
| tables with an admin reference | 20 | **20** | agrees |
| `TRUNCATE` held today | not stated / R-5 says 35 remain | **40 today; 39 after `0060`** | **R-5 is imprecise**: it subtracts all five evidence tables from 40, but only `price_observation_evidence` actually holds `TRUNCATE`. Corrected here and in the risk register (row 35) |
| class 1 / 2 / 3 / 4 | — | **19 / 19 / 46 / 5** | class 1 excludes the one evidence table with an admin reference |

Class legend — **1** demonstrated consumer · **2** compatibility writer (rows written only by definer
functions; the key still needs `SELECT` for support paths) · **3** unverified (no measured consumer)
· **4** withhold destructive rights (evidence).

## 3. The 89 tables

`now` = current grants on the replica; the `0060` column is uniform (`S,I,U` plus `D` except on
class 4) and is therefore stated once here rather than repeated 89 times: **`0060` proposes
`SELECT, INSERT, UPDATE` everywhere and `DELETE` on every table except the five class-4 evidence
tables, where `DELETE` and `TRUNCATE` are both withheld.**

| Table | now | class | usage evidence | rec. min | DELETE | TRUNCATE | risk if over-granted | test |
|---|---|---|---|---|---|---|---|---|
| `_hatsi_migrations` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `account_status_events` | ···· | 2 | definer:set_account_status | S | kept | no | D not used by service key | argued only |
| `agent_profiles` | ···· | 2 | definer:provision_agent,update_agent_contact | S | kept | no | D not used by service key | argued only |
| `alert_delivery_logs` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `alert_trigger_logs` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `analytics_snapshots` | ···· | 2 | definer:refresh_analytics_snapshot | S | kept | no | D not used by service key | argued only |
| `api_applications` | SIUD | 1 | admin:2 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `api_usage_logs` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `article_categories` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `articles` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `audit_events` | ···· | 4 | definer:update_offer_status | S,I,U | withheld | withheld | DELETE destroys evidence | service-role 5 |
| `audit_logs` | SIUD | 2 | definer:audit_observation_change,write_audit | S | kept | pre-existing | D not used by service key | argued only |
| `auth_login_attempts` | ···· | 2 | definer:clear_login_attempts,record_login_attempt | S | kept | no | D not used by service key | argued only |
| `billing_events` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `buyer_offers` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `collection_batches` | SIUD | 1 | admin:2; definer:open_collection_batch,open_collection_batch | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `collection_task_events` | ···· | 2 | definer:generate_collection_tasks,mark_overdue_tasks | S | kept | no | D not used by service key | argued only |
| `collection_tasks` | SIUD | 2 | definer:generate_collection_tasks,transition_task | S | kept | pre-existing | D not used by service key | argued only |
| `commodities` | SIUD | 1 | admin:2 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `commodity_categories` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `commodity_demand` | SIUD | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `commodity_fundamentals` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `commodity_grades` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `commodity_hs_mappings` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `commodity_production` | SIUD | 1 | admin:1 | S,I,U,D | kept | no | none identified | H-10 spot |
| `commodity_seasonality` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `commodity_specifications` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `commodity_supply` | SIUD | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `commodity_synonyms` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `commodity_trade` | SIUD | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `commodity_unit_conversions` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `commodity_varieties` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `contact_enquiries` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `countries` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `customer_subscriptions` | SIUD | 1 | admin:2 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `data_quality_flags` | SIUD | 2 | definer:resolve_quality_flag,raise_quality_flag | S | kept | pre-existing | D not used by service key | argued only |
| `data_quality_rule_versions` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `entitlement_catalog` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `entitlement_tiers` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `evidence_sources` | SIUD | 1 | admin:2 | S,I,U,D | kept | no | none identified | H-10 spot |
| `export_jobs` | ···· | 2 | definer:create_export_job,complete_export_job | S | kept | no | D not used by service key | H-10 |
| `hs_codes` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `hs_revisions` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `international_trade_records` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `market_agent_assignments` | SIUD | 1 | admin:2; definer:set_market_assignment,provision_agent | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `market_collection_schedules` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `market_commodity_scope` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `market_operating_schedules` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `market_reports` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `market_visit_records` | SIUD | 2 | definer:close_collection_batch | S | kept | pre-existing | D not used by service key | argued only |
| `market_zones` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `markets` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `measurement_units` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `notification_delivery_logs` | ···· | 2 | definer:notify | S | kept | no | D not used by service key | argued only |
| `notifications` | ···· | 2 | definer:notify | S | kept | no | D not used by service key | argued only |
| `observation_market_intelligence` | SIU· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `observation_quality_findings` | ···· | 2 | definer:apply_observation_findings | S | kept | no | D not used by service key | argued only |
| `offer_verification_events` | ···· | 4 | admin:1; definer:update_offer_status | S,I,U | withheld | withheld | DELETE destroys evidence | service-role 5 |
| `order_events` | ···· | 4 | definer:create_order_from_quote | S,I,U | withheld | withheld | DELETE destroys evidence | service-role 5 |
| `orders` | ···· | 2 | definer:create_order_from_quote | S | kept | no | D not used by service key | argued only |
| `organization_members` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `organizations` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `price_alerts` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `price_observation_evidence` | SIUD | 4 | definer:resubmit_observation | S,I,U | withheld | withheld | DELETE destroys evidence | service-role 5 |
| `price_observations` | SIUD | 1 | admin:1; definer:append_correction,reject_observation | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `price_revision_history` | SIUD | 2 | definer:append_correction,resubmit_observation | S | kept | pre-existing | D not used by service key | argued only |
| `price_source_registry` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `price_verification_events` | SIUD | 2 | definer:append_correction,reject_observation | S | kept | pre-existing | D not used by service key | argued only |
| `profiles` | SIUD | 1 | admin:1; definer:handle_new_user,set_account_status | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `publication_events` | ···· | 4 | definer:publish_observation_with_event,withdraw_observation | S,I,U | withheld | withheld | DELETE destroys evidence | service-role 5 |
| `quotes` | ···· | 2 | definer:create_order_from_quote | S | kept | no | D not used by service key | argued only |
| `report_subscriptions` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `rfqs` | ···· | 2 | definer:create_order_from_quote,expire_old_rfqs | S | kept | no | D not used by service key | argued only |
| `saved_commodities` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `saved_markets` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `scheduled_job_runs` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `seller_offers` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `source_sync_events` | SIUD | 1 | admin:2 | S,I,U,D | kept | no | none identified | H-10 spot |
| `states` | SIUD | 3 | none measured | S | kept | pre-existing | unverified consumer | argued only |
| `supplier_profiles` | ···· | 2 | definer:create_order_from_quote | S | kept | no | D not used by service key | argued only |
| `supplier_reviews` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `system_settings` | SIUD | 1 | admin:1 | S,I,U,D | kept | pre-existing | none identified | H-10 spot |
| `tariff_schedules` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `trade_bloc_memberships` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `trade_blocs` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `trade_data_sources` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `trade_data_sync_log` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `user_notification_preferences` | ···· | 3 | none measured | S | kept | no | unverified consumer | argued only |
| `whatsapp_subscribers` | ···· | 1 | admin:1 | S,I,U,D | kept | no | none identified | H-10 spot |

## 4. Reading the table

### 4.1 The five withheld tables

`audit_events`, `order_events`, `offer_verification_events`, `publication_events`,
`price_observation_evidence`. Each is append-only by design. `DELETE` on them is not a capability the
product needs; if a retention job ever requires it, it must be a definer function with a narrow grant,
not a table privilege — otherwise "append-only" is a convention, not an invariant (risk 24).

### 4.2 The 46 unverified tables

"No measured consumer" is a statement about the **audited** code paths, not proof that none exists.
The measurement covers `src/`, `supabase/functions/` and `scripts/`. It cannot see:
dynamic table names, SQL built at runtime, an external integration, or a future feature.
Consequently:
* narrowing them to nothing would be a production outage risk on unknown evidence, and
* keeping them broad is an unverified blast radius.

Neither is acceptable as a final answer. **Proposed resolution (LS-1):** grant the 19 demonstrated
tables at S/I/U/D; grant the 19 compatibility tables `SELECT` (plus DML if a support path is
confirmed); hold the 46 until each is either confirmed or removed from the schema. This is a
proposal for review, not a change made here.

### 4.3 What the compatibility class means

`orders`, `quotes`, `rfqs`, `notifications`, `supplier_profiles`, `agent_profiles` and the other 13
are written **only** by `SECURITY DEFINER` functions, which run as their owner (`postgres`) and do not
need the caller's privileges. Granting `service_role` write access to them is therefore *unnecessary
for the measured paths* — and it is exactly the kind of grant that turns a leaked key into forged
orders. Compatibility grants exist because some server code may read these tables directly.

## 5. Acceptance criteria (per class)

| Class | Criterion for `passed` |
|---|---|
| 1 demonstrated | H-10 succeeds on the sampled tables; a table with a measured `INSERT` path accepts a service-key insert |
| 2 compatibility | `SELECT` works; `INSERT`/`UPDATE` via the definer function works without those grants |
| 3 unverified | **cannot pass on evidence**. Status is `blocked` until a consumer is identified or the table is dropped |
| 4 withhold | `DELETE` and `TRUNCATE` raise `42501`; the corresponding append path still works |

The harness's H-10 samples `export_jobs` (a class-1 table with a known failing path) and asserts the
class-4 refusal. It does not attempt 89 tables.

## 6. Findings

| # | Finding | Severity |
|---|---|---|
| S-4 (unchanged) | 43 tables lacked complete `service_role` DML before `0060`; two server paths fail today | High |
| S-5 (unchanged) | `GRANT ALL` in `0009` included `TRUNCATE`, which `0060` does not fully correct: **39 tables still carry it after `0060`** (40 today) | Medium |
| LS-1 (open) | 69 tables granted with no measured usage; no sign-off recorded either way | High |
| New — E-1 | class 2 tables are writable by a key that never needs to write them | Medium |
| New — E-2 | the 46 unverified tables have no owner-visible inventory; the audit produced one for the first time | Medium |

## 7. Verdict

* `0060` **repairs a real production defect** (S-4) and its `DELETE`/`TRUNCATE` narrowing on the five
  evidence tables is correct and verified (27/27, including the `42501` refusals).
* `0060` **is not least privilege** and must not be described as such. It is a compatibility repair
  with a documented blast radius.
* The narrow model is **argued, measured and unapproved**. Adopting it changes
  `service-role-access` checks 1–2 (they assert per-table rights) and would need its own test run.

**Recommendation.** Apply `0060` as a repair (it fixes a live defect), record LS-1 as an accepted
risk with a named owner, and schedule the narrowing as its own phase with per-table usage
instrumentation — logs, not static analysis — to settle the 46.
