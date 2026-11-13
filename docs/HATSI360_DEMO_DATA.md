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
| Buyer offers | **15** |
| Seller offers | **15** |
| Offer verification events | **69** |
| Saved commodities | **6** |
| Saved markets | **3** |
| Price alerts | **4** |
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

No fixture prices. `published_price_observations` still contains **zero rows**,
so `/prices`, `/commodities`, `/markets` and the homepage all continue to render
their honest empty states. The launch gate still passes 98/98.

The one exception is the offers: exactly 6 of the 30 demonstration offers are
publicly readable, each labelled `DEMO — Test …` in its counterparty name.
There is no page that shows them, so this is reachable only through the
RLS-gated read path, which is asserted in
`tests/data-integrity/offer-privacy.test.ts`.

`--remove` now clears the offers, the verification events, the saved
commodities, the saved markets and the price alerts as well as the observations,
batches and assignments.

---

## The commercial offers, watchlist and alerts

A second seeding pass added the offer and public-account tables, all owned by
real accounts. This section supersedes the "deliberately absent" list below,
which described the first pass only.

### What was created

| Table | Rows | Owner |
| --- | --- | --- |
| `buyer_offers` | 15 | `demo.customer@hatsi360.test` |
| `seller_offers` | 15 | `demo.customer@hatsi360.test` |
| `offer_verification_events` | 69 | the `customer` for draft/submit, `demo.verifier@hatsi360.test` for the verdict |
| `saved_commodities` | 6 | `demo.public@hatsi360.test` |
| `saved_markets` | 3 | `demo.public@hatsi360.test` |
| `price_alerts` | 4 | `demo.public@hatsi360.test` |

The offer status mix is a **deliberate rotation, not a random draw**. With only
thirty offers a random split can land with no `withdrawn` rows at all, and a
demonstration whose verification workflow never shows one of its own end states
is worse than one with a hand-set mix. Over ten offers the rotation gives
3 verified, 2 submitted, 2 draft, 2 rejected and 1 withdrawn; across thirty that
is 9 verified, 6 submitted, 6 draft, 6 rejected and 3 withdrawn. The rotation
lives in `OFFER_STATUS_CYCLE` in `scripts/manage_demo_data.mjs`.

### Which offers are published, and why only some

`buyer_offers_public_read` and `seller_offers_public_read` expose a row when it
is `status = 'verified'` **and** `disclosure_consent` **and** not expired. So of
the 9 verified offers, **6 carry disclosure consent and are publicly readable,
and 3 are verified but withheld** — withheld by setting `disclosure_consent`
false, so the policy excludes them on its own terms rather than by a status
trick.

This was a deliberate choice, and it is worth stating why it is not more. An
offer is a commercial commitment from a named counterparty. Publishing a
synthetic one presents a fabricated trading opportunity as real, which is
exactly what the brief forbids. The requester accepted that synthetic prices
would become publicly visible when choosing the "public" option, so the offers
that are published carry the label in the one field a public reader always
sees: `counterparty_name` is `DEMO — Test Buyer N` / `DEMO — Test Seller N`,
and `notes` says *"TEST FIXTURE — synthetic commercial offer for demonstration
only. Not a real commitment to trade. Never treat as a confirmed
opportunity."*

**What publishing offers does not do: it does not make `/trade` show content.**
`/trade` reads `published_price_observations` only; it never queries the offer
tables. The offers are visible through the RLS-gated read path, exercised in
the database — not through a page, because no public route reads them yet. The
seeded `saved_commodities`, `saved_markets` and `price_alerts` *do* render, on
`/trade/watchlist` and `/trade/alerts`, for the signed-in public account.

### A security defect found while seeding, and fixed

Migration `0027_offer_workflow.sql` created `offer_verification_events_read`
with a comment saying *"anyone may read the events for an offer they can see"* —
and then wrote `using (true)`. The policy did not implement the sentence.

The consequence: every row of the verification trail was readable by the
anonymous public, including the trail of offers that were drafts, withdrawn or
merely submitted. Each event carries `actor_id`, the transition it recorded and
a free-text `reason` — which for a rejection is private commercial feedback
addressed to the counterparty. So the platform was publishing the existence of
private offers, who acted on them, and why a counterparty was refused. That
breaks the rule that public users may read only explicitly published eligible
records, and the trade brief's "do not expose private commercial information".

Fixed by `0031_offer_verification_events_read_fix.sql`, which restricts the
read to offers the caller may read: **staff read all, an owner reads their own,
the public reads only published offers.** The inner lookups are deliberately not
`security definer`, so they are themselves RLS-filtered and the policy cannot be
used to discover a row the caller otherwise could not read.

Measured, not assumed:

| Reader | Before | After |
| --- | --- | --- |
| `anon` | 69 events | **18** — the trail of exactly the 6 published offers |
| `authenticated` with no JWT | 69 | 18 |
| the offer owner (`customer`) | 69 | 69 |
| staff (`verification_officer`, `admin`) | 69 | 69 |

Zero of the 18 events anon can see belong to an unpublished offer.
`tests/data-integrity/offer-privacy.test.ts` is the regression guard: 16 tests,
all passing, asserting the counts above, the labelling of every fixture row, and
that a stranger's `UPDATE` matches zero rows.

### Documentation that was wrong and is now corrected

Three places asserted that the platform records no commercial offers. All three
were true when written and false afterwards:

* `src/lib/trade/opportunities.ts` — a header comment claiming *"There is no
  `buyer_offers` or `seller_offers` table"*. Both tables exist. Corrected to
  state the real reason the module does not read them: an offer is a private
  commitment by a named party, selectively disclosed by its owner, so it is not
  a market price and cannot be ranked as one.
* `src/app/(site)/trade/alerts/page.tsx` — user-facing copy saying *"the
  platform records none"*. Corrected to state the real reason there is no "new
  opportunity" alert: an offer is a private commitment rather than a market
  fact, so such an alert would fire on ordinary market variation.
* `src/lib/trade/index.ts` — the same claim in the module overview.

The dated reports that carried the claim are not rewritten; a **second
addendum** to `docs/HATSI360_TRADE_PHASE_2_STATUS_REPORT.md` records the
corrections with their date, and `docs/HATSI360_TRADE_PHASE_0_AUDIT.md` points
to it.

---

## Deliberately absent

* **No coordinates.** Inventing a latitude would be inventing where an agent
  stood. Left null.
* **No published observations.** `published_price_observations` still contains
  zero rows, so `/prices`, `/commodities`, `/markets` and the homepage continue
  to render their honest empty states. The 6 published offers are the only
  fixture rows a public reader can see.
* **No `market_reports`, `articles`, or analytics rows.** Publishing a synthetic
  research article would be exactly the "AI-generated research published without
  verification" the brief forbids.
* **No public route reads the offer tables.** The workflow is verified at the
  database layer and through RLS, not through a page. Building that screen is
  separate work, and it must not present an undisclosed or unverified offer as a
  confirmed opportunity.
