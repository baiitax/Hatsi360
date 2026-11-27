# Hosted-security fixtures

**Nothing in this directory is data.** It is the specification for synthetic data that an operator
creates **in a disposable staging project, during an acceptance window**, and deletes afterwards.

Rule 0: no real customer, no real supplier, no production user id, no PII, no live transaction, no
copy of a production row. If a fixture value could plausibly belong to a real person or business, it
is wrong.

Rule 1: **this phase introduces nothing into any environment.** No rows exist today, here or
elsewhere.

---

## 1. Determinism

Every fixture id derives from the run tag so that a failed run can be cleaned up by pattern:

```
run tag   p7b-<yyyymmddhhmmss>          e.g. p7b-20261201143000
emails    p7b-<tag>-<role>@example.invalid
names     "P7B <role> <tag>"
titles    "p7b-<tag>-<kind>"            e.g. p7b-20261201143000-public
```

`.invalid` is a reserved TLD (RFC 2606) — mail cannot be delivered even if a job tries.
`example.invalid` never resolves, so no fixture can be confused with a real mailbox.

`createFixtures()` in `../lib/fixtures.mjs` implements exactly this and refuses to run without a run
tag and a service key.

## 2. Identity fixtures

| Fixture | `profiles.role` | Subscriptions | Used by |
|---|---|---|---|
| `p7b-<tag>-unentitled` | `public_user` | none | H-1, H-2, H-3, H-5 negative |
| `p7b-<tag>-entitled` | `customer` | `reports`, `watchlists`, `exports`, `alerts` for the test window | H-5 positive, H-6 |
| `p7b-<tag>-staff` | `analyst` | none | H-4 staff view |
| `p7b-<tag>-admin` | `admin` | none | admin-guard spot checks |
| `p7b-<tag>-bulk` | `customer` | `bulk` | H-7 positive control |

Creation: `auth.users` insert via the service key (**not** the signup endpoint, which would send
mail), then `profiles` is populated by the `handle_new_user` trigger. Passwords are generated per run,
stored only in process memory, printed never, and rotated by deletion. H-1/H-2/H-3 need a real
session, so the run also mints one access token per identity via
`POST /auth/v1/token?grant_type=password` — the token is redacted from all evidence.

## 3. Data fixtures

| Fixture | Table | Shape | Needed by |
|---|---|---|---|
| public report | `market_reports` | `title = p7b-<tag>-public`, `is_premium = false`, published | H-6, H-8 |
| premium report | `market_reports` | `title = p7b-<tag>-premium`, `is_premium = true`, published | H-6 negative, H-8 |
| commodity | `commodities` | existing reference row, first by id — **no new commodity is created** | H-4, H-5, H-6 |
| market | `markets` | existing reference row | H-5 |
| old observation | `price_observations` | `observed_on = 2001-01-01`, `reported_amount = 1.00`, one existing commodity, one existing market | H-7 |
| recent observation | `price_observations` | `observed_on = current_date - 10` | H-7 negative control |
| watchlist row | `saved_commodities` | `user_id = entitled`, `commodity_id = fixture` | H-5 positive |
| export job | `export_jobs` | `requested_by = entitled`, `status = 'queued'`, synthetic name | H-10 |

Reusing existing reference rows is deliberate: creating a commodity would alter a shared reference
table that other tests and the app enumerate, and cleanup would then have to prove nothing else
referenced it.

### 3.1 B2B graph (H-9 only)

| Fixture | Rows |
|---|---|
| buyers | 2 synthetic `supplier_profiles`-independent users, `customer` role |
| suppliers | 2 `supplier_profiles`, `supplier` role, company `p7b-<tag>-supplier-a/b` |
| RFQ | 1 open RFQ from buyer A to supplier A |
| quote | 1 accepted quote, `supplier_id = supplier A`, `rfq_id = RFQ A`, with a recorded `unit_price` |
| order | created **only** by `create_order_from_quote` during the test — never inserted directly |
| events | `order_events` rows created by the transitions |

The graph is required in this order: buyer → supplier profile → RFQ → quote → (test) order. FK
dependencies mean cleanup must run in reverse.

## 4. Cleanup

`createFixtures().cleanup()` deletes in reverse insertion order and reports every failure instead of
swallowing it. Order:

```
order_events → orders → quotes → rfqs → supplier_profiles → export_jobs →
saved_commodities → price_alerts → saved_markets → price_observations →
market_reports → customer_subscriptions → user_subscriptions → profiles → auth_users
```

Evidence tables (`order_events`, `audit_events`, `offer_verification_events`,
`publication_events`, `price_observation_evidence`) cannot be deleted with the service key after the
Phase 6 amendment. H-9 therefore **runs only in a project that is discarded afterwards**, and the
runbook must record that fact before the test is executed. This is a deliberate consequence of
append-only evidence, not a cleanup bug: you cannot have both an undeletable audit trail and a
reusable fixture project.

**Verification of cleanup:** `prereqs.sql`'s `observations` are re-read after cleanup; a run that
leaves `p7b-%` rows behind is a failed run regardless of test results, and the harness records
`cleanup: incomplete` in the summary.

## 5. Reset between runs

| Situation | Action |
|---|---|
| read-only run | no reset needed; no fixtures are created |
| write run, cleanup succeeded | re-run the same window |
| write run, cleanup partial | record it, stop, discard the project |
| H-9 executed | **discard the project** — `order_events` cannot be cleared |

## 6. What the fixtures must never touch

`system_settings`, `_hatsi_migrations`, `entitlement_catalog`, `entitlement_tiers`,
`market_commodity_scope`, `countries`, `states`, `measurement_units`, `commodity_grades` — reference
and configuration data. A test that needs a change there is a test that needs a different project.
