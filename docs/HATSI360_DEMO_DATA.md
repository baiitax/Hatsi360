# Hatsi360 — Demonstration Data

**What this is, and what it is not.**

Every operational table was empty, so no authenticated journey could show a
real workflow: the field agent had nothing to submit, the verification officer
had an empty queue, and the control centre had no activity. This document
describes a small, synthetic dataset that makes those screens demonstrable.

**None of it is a real price.** Every row is labelled a test fixture in three
places, and three independent database barriers stand between it and the public
site. Nothing here was migrated — this is data insertion only, and it is fully
reversible.

---

## The isolation guarantee

The schema was already built for this. `observation_source` has a `test_fixture`
value, and the public read view filters it out **twice**:

```sql
-- public.published_price_observations
WHERE o.is_current
  AND o.published_at IS NOT NULL
  AND o.verification_status IN ('verified','legacy_unverified')
  AND COALESCE(o.source_system,'agent_app') <> 'test_fixture'   -- barrier 1
  AND COALESCE(o.source_reference,'')       <> 'test_fixture';  -- barrier 2
```

The view is `security_invoker = true`, so the RLS policies on the base table
still apply underneath. The seeder therefore sets **all three** markers:

| Barrier | What the seeder does |
| --- | --- |
| `source_system` | `test_fixture` on every row |
| `source_reference` | `test_fixture` on every row |
| `published_at` | `NULL` on every row — also fails `is_public_observation()`, the predicate behind the anon/authenticated SELECT policies |

`published_at` is the strongest of the three: it is enforced by the database,
not by application code, so no future change to a page or an API route can
bypass it.

**Proven, not asserted.** `tests/data-integrity/fixture-isolation.test.ts`
(15 tests) checks the guarantee from three directions: the view, the RLS
predicate evaluated *as the `anon` role*, and the records themselves.

### The barriers were tested by breaking one

One fixture was deliberately published (`published_at = now()`, status already
`verified` so the publication guard allowed it). Two isolation tests failed
immediately — and the public view still returned **zero** rows, because the
`source_system` filter held. One barrier failing did not become a public leak,
which is the point of having three. The experiment was rolled back and the
dataset re-seeded clean.

---

## What was created

| | |
| --- | --- |
| Observations | **58** |
| Collection batches | **10** (2 per market: one open, one completed) |
| Markets covered | **5** — Dawanau, Mile 12, Funtua, Sokoto Central, Zaki Biam |
| Commodities covered | **16** |
| Market assignments added | **4** (the agent already had Dawanau) |
| Coordinates invented | **0** — GPS left null on every batch |

### Verification state mix

| Status | Count | What it demonstrates |
| --- | --- | --- |
| `submitted` | 17 | The verification officer's queue |
| `pending_verification` | 8 | The queue, mid-review |
| `verified` | 11 | **Verification is a separate act from publication** — verified, still unpublished |
| `draft` | 7 | The agent's own work in progress |
| `rejected` | 9 | The rejection path, with a `price_outlier` quality flag |
| `correction_requested` | 6 | The correction path |

The `verified` rows are the important ones. They are verified by the demo
verification officer but carry `published_at = NULL`, so they are visible to
staff and invisible to the public. That is the separation the brief requires,
made visible in the data rather than described in prose.

### Connection to the demo accounts

Every observation is attributed to `demo.agent@hatsi360.test` through
`agent_user_id`, so the agent sees its own submissions under
`agent_user_id = auth.uid()`. Every verification is attributed to
`demo.verifier@hatsi360.test` through `verified_by`. Staff see everything under
`is_staff()`.

The 4 new market assignments entitle the agent to collect at each market its
fixtures sit at — asserted by the isolation test *"only ever writes fixtures at
a market the agent is assigned to"*, which would otherwise be demonstrating a
permission violation.

---

## Usage

```bash
node scripts/manage_demo_data.mjs              # create (refuses if fixtures exist)
node scripts/manage_demo_data.mjs --status     # report what exists
node scripts/manage_demo_data.mjs --dry-run    # show the plan, write nothing
node scripts/manage_demo_data.mjs --remove     # delete every fixture
```

The script is **deterministic** — a seeded PRNG produces an identical dataset on
every run, so a fixture is reviewable rather than a surprise. It refuses to
write twice rather than half-creating, because `collection_batches.reference` is
unique and a second insert would fail part-way through. `--remove` deletes the
observations, the batches and the 4 added assignments, leaving the original
Dawanau assignment from `manage_demo_users.mjs` intact.

### What the public site still shows

Nothing. `published_price_observations` still contains **zero rows**, so
`/prices`, `/commodities`, `/markets` and the homepage all continue to render
their honest empty states. The launch gate still passes 98/98.

---

## Deliberately absent

* **No coordinates.** Inventing a latitude would be inventing where an agent
  stood. Left null.
* **No `buyer_offers` / `seller_offers`.** Those need the full verification
  workflow demonstrated, which is a larger piece of work than this seeding pass.
* **No `market_reports`, `articles`, or analytics rows.** Publishing a synthetic
  research article would be exactly the "AI-generated research published without
  verification" the brief forbids.
* **No published anything.** If a future demonstration needs public prices, that
  is a separate, explicit decision — and it must not be made by a seeder.
