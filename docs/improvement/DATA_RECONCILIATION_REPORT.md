# Hatsi360 — Data Reconciliation Report (Phase 1)

| | |
|---|---|
| Date | 2026-11-26 |
| Scope | Compare the data a clean run of this repository *creates* with the data the hosted project *holds*, and with what earlier documents *claim*. |
| Result | Two of the three columns can be established here. The third — production — cannot, and is recorded as `UNKNOWN` with the exact query that would resolve it. |

## 1. Method

| Column | How it was obtained | Evidence class |
|---|---|---|
| **Repository** | Applied every migration to a throwaway PostgreSQL 19 database, then counted rows per table | `local DB` |
| **Documented** | Read the figures asserted in `docs/*.md` and `docs/audits/*` | `documented-only` |
| **Production** | Not reachable: `*.supabase.co` refuses TLS from this environment; no Supabase CLI session, no `psql` | `UNKNOWN` |

This report does **not** infer production numbers from the repository, and does not repeat historical figures as if they were measurements.

## 2. Repository — what a clean run produces

Asserted by the harness on every run (and therefore regression-tested):

| Entity | Count | Source |
|---|---|---|
| Markets | 11 | `0007` |
| Commodities | 22 active + 1 inactive duplicate | `0007` |
| States | 11 | `0007` |
| Measurement units | 8 | `0007` |
| Commodity grades | 58, covering all 22 commodities | `0023` |
| Price observations | **0** | by design — the seed must not create prices |
| Unit conversions | **0** | nothing in the chain seeds one |
| HS code mappings surviving against the real catalogue | 1 (`Wheat`) | `0038` after repair |
| Entitlement keys | 6 (`watchlists`, `alerts`, `exports`, `reports`, `api`, `bulk`) | `0016` |
| Demo observations | **0** in the chain; 299 in `supabase/seeds/` (not run) | `MIG-06` repair |

The "0 price observations" assertion is the important one: a fresh deployment cannot accidentally look like a live market. Every published price must come from a real collection and verification.

## 3. Production — what must be measured, and how

Nothing below can be observed from this environment. Each row gives the exact query that answers it against the hosted project, so the check is mechanical once access exists.

| # | Question | Query |
|---|---|---|
| P-1 | Applied migrations vs the repository | `select name from public._hatsi_migrations order by name;` then diff against `ls supabase/migrations` |
| P-2 | Observation volume and spread | `select count(*), min(collected_at), max(collected_at) from public.price_observations;` |
| P-3 | How many are actually public | `select count(*) from public.published_price_observations;` |
| P-4 | Demo/fixture contamination | `select count(*) from public.price_observations where source_system not in ('agent_app','legacy_import') or notes ilike '%DEMO%';` |
| P-5 | Verification coverage | `select verification_status, count(*) from public.price_observations group by 1;` |
| P-6 | Commodity/unit conversions | `select count(*), count(verified_at) from public.commodity_unit_conversions;` |
| P-7 | Grades actually in use | `select grade_id, count(*) from public.price_observations group by 1 order by 2 desc;` |
| P-8 | Markets with coverage | `select market_id, count(*) from public.published_price_observations group by 1;` |
| P-9 | Freshness distribution | per commodity, `max(collected_at)` vs `commodities.freshness_window_hours` |
| P-10 | WhatsApp waitlist | `select count(*), min(consent_at) from public.whatsapp_subscribers;` (if `0049` is applied) |
| P-11 | RLS state of the six intelligence tables | `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname in ('commodity_production','commodity_supply','commodity_demand','commodity_trade','evidence_sources','source_sync_events');` |
| P-12 | Entitlement function actually installed | `select prosrc from pg_proc where proname = 'user_entitlements';` — if it contains `as e(k, v)`, production still has the raising body fixed by `0052` |

Rows P-4, P-6 and P-12 are the ones that change what may be claimed publicly. Until they are answered, every statement about "verified prices", "live data" and "bag weights" is unproven.

## 4. Reconciliation against historical documentation

Earlier documents in `docs/` assert figures such as "259 observations", "31 applied migrations" and various coverage percentages. None is reproducible from the repository — a clean run creates **zero** observations — so each is either a snapshot of a specific date in a specific environment, or an estimate.

They are recorded here as `documented-only` and are **not** used in any Phase 0/1 statement. Where a public claim depends on one of them, it must be re-measured against production (P-2…P-5) first.

## 5. Known inconsistencies inside the repository

| Inconsistency | Consequence | Resolution |
|---|---|---|
| 22 commodities vs a generic 25-name HS vocabulary (`0038`) | HS mapping is unpopulated for the real catalogue | filtered; needs trade-domain mapping (`COMMODITY_UNIT_GRADE_STANDARD.md` §7) |
| `bag` unit with `base_factor = null` vs a demo seed that asserts 50 kg | the only conversion claim in the repo is unverified | demo seed removed from the chain |
| Duplicate commodity id 2 (`Paddy Rice (duplicate record)`, inactive) | legacy id mapping must keep it | documented; do not re-use id 22 |
| Two files numbered `0046` and two numbered `0047` (before this phase) | ambiguous applied state | demo seeds moved out; `0046`/`0047` now unique |
| `0025` missing from the sequence | tools that infer count from the highest id are wrong | documented |

## 6. Verdict

The repository is now **self-consistent**: a clean run produces a schema of 89 tables (all with RLS), 202 policies, 11 markets, 22 active commodities, 8 units, 58 grades, 0 observations, 0 unverified conversions. That is a defensible starting state — it contains no invented market data.

Reconciliation with production remains **blocked** on the twelve queries in §3, which require access this environment does not have.
