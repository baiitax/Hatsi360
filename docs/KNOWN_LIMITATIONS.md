# Pluck Live — Known limitations

**Date:** 22 October 2026.
**Status:** production candidate. Every limitation below is a real constraint on what the platform
can currently claim. Nothing here is hidden from the product itself: where a limitation is visible
to a user, the interface says so.

---

## 1. The data is old, and the product says so

**The newest observation in the migrated dataset is 14 July 2025** — roughly fifteen months before
this document was written. 28 observations exist in total, across 3 of the 11 markets, for 3
commodities.

Consequences:

* The comparison widget, the price directory and the charts show real, published values — but
  they are old values. The coverage notice (`src/components/data/DataCoverageNotice.tsx`) states
  the age of the data on every page that shows prices, and the disclaimer explains it.
* Until the agent collection rota in `/agent` is running and the verification queue in `/admin` is
  being worked, **the platform has no mechanism to produce a new observation**. That is the single
  most important operational item in the go-live plan (`docs/MIGRATION_PLAN.md` §7).

This is not a defect in the software; it is the state of the underlying business process. The
rebuild makes the gap visible rather than hiding it behind the word "live".

## 2. The migrated records carry no measurement unit

The legacy system recorded a number and nothing else: no unit, no price type, no currency column,
no package weight, no collection time of day, no source, no verification trail. A unit grep across
all 46 captured pages returned zero matches.

How the rebuild handles it:

* Every migrated observation stores the amount in the synthetic `unspecified` unit
  (`isSpecific = false`).
* Comparisons are bucketed by (commodity, grade, price type, unit). Two records in different
  buckets are never merged.
* Where the unit is missing, the UI says so and warns that the figures may not be directly
  comparable with figures that do carry a unit.
* `normalized_amount` stays `NULL` for these rows. Pluck Live does not guess a conversion.

**Limitation.** Until agents start recording units explicitly, the platform cannot answer "how
much did a 50 kg bag of maize cost?" — only "what was the recorded price for maize at Dawanau?".

## 3. The OHLC history was reconstructed, not read

The legacy price-history pages rendered an open/high/low/close block per day. The raw capture
contains the numbers, but not the labels, so the mapping from values to OHLC fields was
**inferred**:

| Values shown for a day | Reconstruction |
| --- | --- |
| 1 value | A single price for the day |
| 2 values | Open and close |
| 3 values | Open and close, plus the high or low that the other two do not already attain |

The rule was applied by `scripts/build_legacy_dataset.py` and validated against the capture:
**28 observations reconstructed, 0 unreconstructable, 0 mismatches**. The rule reproduces the
published values exactly; what it cannot recover is *which* of the two remaining numbers was the
high and which was the low.

**Limitation.** The migrated history is stored as one price per market/commodity/day with a
day-precision timestamp. It is **not** an OHLC series, and the platform does not present it as
one. The reconstructed values are flagged `legacy_unverified`.

## 4. The legacy site is a read-only museum

Everything the legacy site published is migrated. Everything the legacy site *hid* is unknown:

* The legacy database was never accessible, so there may be unpublished observations, drafts, or
  agent records that no visitor could see. They are not in the rebuild, and their absence is not
  evidence that they never existed. (Finding F-19 in `docs/AUDIT_REPORT.md`.)
* No user accounts, saved items, alerts or API keys were migrated — the legacy site had no
  working sign-in. Accounts start empty.

## 5. The duplicate "Paddy Rice" is preserved, not merged

The legacy catalogue listed "Paddy Rice" twice (ids 19 and 1). Merging them would destroy an
identifier and hide a data-quality problem; dropping one would lose a record. The rebuild keeps
both and renames id 19 to **"Paddy Rice (duplicate record)"**.

**Limitation.** Any external system that used the legacy id 19 will not find a "Paddy Rice" under
that name in the rebuild. The id is still carried in `legacy_id`, and the API exposes the slug.

## 6. The RLS suite runs against a stub of Supabase Auth

`tests/rls/permission-tests.sql` executes against a real PostgreSQL instance with a hand-written
stub of the `auth` schema (`auth.users`, `auth.uid()`). The policies, triggers and views are
exercised faithfully, but **PostgREST's role switching, JWT parsing and connection pooling are
not**.

**Limitation.** Before go-live, the same assertions must be run against the hosted project
(`docs/DEPLOYMENT.md` §7). Until that is done, the permission model is verified against a faithful
reconstruction, not against the production platform.

## 7. The API rate limiter is per instance

Rate limits are enforced in the application process, in memory, keyed by API application. On a
single server that is exact. On several instances behind a load balancer each instance counts
separately, so the effective limit is *N × the configured limit*.

**Limitation.** For a strict global limit, the counter must move into the database or a shared
store. This is a change to `src/lib/api/handler.ts` and the `api_usage_logs` table only.

## 8. The API is read-only, and keys are issued by hand

The six `/api/v1/*` endpoints are read-only by design — there is no write path, so an integrator
cannot corrupt data. But there is no self-service key issuance screen yet: an administrator
inserts the key hash into `api_applications` manually, and the plaintext key is shown once.

**Limitation.** No key rotation screen, no scoped key editing, no webhook delivery.

## 9. Commercial features are modelled but not built

| Feature | State | What works today |
| --- | --- | --- |
| Reports (PDF) | Schema + policy only | The legacy generator returned HTTP 500 (F-04); a report must be generated from published observations and carry its own provenance. |
| Price alerts | Tables + UI + RLS | Alerts can be created and are visible in `/dashboard`. **No email or SMS is sent** — there is no delivery worker. |
| Evidence photos | Table + policy | The `price_observation_evidence` table exists; the Storage bucket and its upload path do not. |
| Subscriptions | Tables + entitlement checks | The entitlement logic is implemented and exercised by RLS; there is no billing integration. |
| API key issuance | Tables + verification | Issued manually, as described above. |

## 10. There is no forecast, on purpose

The legacy commodity page published a "Price Forecast" (₦43,568.57 for 13 July 2025) with no
method, no inputs, no error band and no evaluation. It is not replicated.

**Limitation.** The platform offers no forward-looking prices. If forecasting is added it must be
labelled as model-generated, publish its method and uncertainty, and be evaluated retrospectively
against realised prices before it is shown to the public. It is a `PLANNED` item with that
condition attached (`docs/MIGRATION_PLAN.md` §8).

## 11. Accessibility is designed, not machine-verified

The markup includes a skip link, a visible focus ring, labelled form controls, semantic tables
with `scope`, an `aria-current` state on the current filter, a reduced-motion guard, and a
`DataCoverageNotice` exposed as a labelled landmark.

**Limitation.** There is no automated axe/Lighthouse gate in CI and no screen-reader test suite.
The charts are SVG from Recharts; a screen-reader user gets the same figures from the per-market
table and the full observation list on `/prices`, but the chart itself has no textual equivalent.

## 12. Operational gaps

* **No monitoring or alerting.** Nothing pages anybody when collection stops or the verification
  queue grows. The signals to watch are listed in `docs/DEPLOYMENT.md` §8, but they are not
  instrumented.
* **No background jobs.** Nothing runs on a schedule: alerts are never delivered, subscriptions
  are never expiring-notified, nothing is pruned.
* **No offline collection.** `/agent` requires a connection; a field agent in a market with no
  signal cannot submit.
* **Rate limiting on the contact form** is a server-side check, not a CAPTCHA or a proof-of-work.
* **Search covers commodities and markets only**, not observations or articles.

## 13. Performance and scale

* Every public page is server-rendered and reads through the `DataSource` interface. There is no
  caching layer in front of the database beyond Next.js's route caching; the sitemap revalidates
  hourly.
* `/prices` paginates at 25 rows per page; `/commodities` at 18; `/markets` at 12.
* The dataset is 28 observations. **No query has been load-tested against a realistic volume.**
  The obvious candidates at scale are the price directory and `market_price_summary`, which is
  computed at read time.

## 14. Platform and tooling

* **Node 22 or newer is required.** The build and the runtime both warn on Node 20 because
  `@supabase/supabase-js` has dropped it.
* **npm requires `--legacy-peer-deps`** on npm 10 to install the vitest 5 tree.
* The migration validator uses an **embedded PostgreSQL 18.4** downloaded into `pgtest/`. It is
  not part of the application bundle, and it is disposable: every run drops and recreates the
  database.

## 15. Summary table

| # | Limitation | Severity | Owner | Fix |
| --- | --- | --- | --- | --- |
| 1 | No fresh observations until the collection rota runs | **Critical** | Operations | Go-live phase 2 (`docs/MIGRATION_PLAN.md` §7) |
| 2 | Migrated records have no unit or price type | High | Operations | Resolved by the agent form once collection starts |
| 3 | Legacy history is one price per day, not OHLC | Medium | — | Structural; documented in the UI |
| 4 | Hidden legacy data is unknown | Low | — | Ask the owner for a legacy database dump |
| 5 | Duplicate commodity preserved under a new name | Low | — | Structural |
| 6 | RLS verified against a stub, not against hosted Supabase | High | Engineering | Run the assertions against the hosted project before go-live |
| 7 | Rate limiter is per instance | Medium | Engineering | Move the counter into the database |
| 8 | No self-service API key issuance | Medium | Product | Build the issuance screen |
| 9 | Reports, alerts delivery, evidence upload, billing not built | Medium | Product | Backlog (`docs/MIGRATION_PLAN.md` §8) |
| 10 | No forecasting | By design | Product | Gated on method + error band + retrospective evaluation |
| 11 | Accessibility not machine-verified | Medium | Engineering | Add an axe/Lighthouse CI gate |
| 12 | No monitoring, jobs or offline collection | Medium | Engineering | Backlog |
| 13 | No load testing at realistic volume | Low | Engineering | Load test before the dataset grows |
| 14 | Node 22 required; npm legacy peer deps | Low | Engineering | Documented |
