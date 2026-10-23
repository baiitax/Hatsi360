# Pluck Live — Audit Report

**Scope:** the production system at `https://liveprice.pluckagro.com` (the "legacy site") and the
rebuild in this repository (`pluck-live`).
**Audit date:** 22 October 2026.
**Auditor:** the Pluck Live rebuild team (automated capture + manual review + code review).
**Status of the rebuild at the time of writing:** migrations apply cleanly to PostgreSQL 18.4,
148 automated unit/integration tests pass, 49 Row Level Security assertions pass against a real
database, and the Next.js 16.4.2 application builds 35 route entries (39 pages).

---

## 1. How to read this report

Every finding carries exactly one classification. The classification states **how the finding was
verified**, not how important it is.

| Classification | Meaning |
| --- | --- |
| `VERIFIED_IN_UI` | Reproduced by requesting the live page and reading what it renders. |
| `VERIFIED_IN_CODE` | Confirmed by reading the application or migration source in this repository. |
| `VERIFIED_IN_DATABASE` | Confirmed by executing SQL against a real PostgreSQL instance with the migrations applied. |
| `VERIFIED_IN_LIVE_API` | Confirmed by calling the live site's own API/JSON endpoints. |
| `DOCUMENTATION_ONLY` | Taken from the legacy site's own published copy (FAQ, terms, privacy, blog posts). Nothing was executed to confirm it. |
| `PLANNED` | Intended work that is not built yet. |
| `UNKNOWN` | Could not be determined with the access available. Stated as a question, not as a fact. |
| `FAILED_TEST` | A check that was run and failed (HTTP status, script, or assertion). |

**Evidence rules applied throughout**

* No credential, source file, database dump or internal workflow of the legacy system was
  available. Everything about the legacy backend is therefore `UNKNOWN` unless it is visible in a
  public response.
* No claim of "real-time" or "live" data is made anywhere in the rebuild unless a published
  observation with a real collection timestamp supports it.
* The legacy site was only ever read (GET requests). Nothing was written, submitted or altered
  on it.

**Material used**

* 46 raw HTML captures of the legacy site (`audit/legacy-pages/`) — the independent truth
  for the data-integrity tests.
* `audit/source/legacy-catalogue.json`, `legacy-pairs.json`, `legacy-price-history.json` — the
  extracted markets, commodities and price history.
* `scripts/build_legacy_dataset.py` — the deterministic reconstruction of the legacy dataset
  (28 observations, 0 unreconstructable, 0 mismatches).
* The nine migrations in `supabase/migrations/`, applied to a disposable PostgreSQL 18.4 instance.

---

## 2. Summary of findings

| # | Area | Finding | Classification | Status |
| --- | --- | --- | --- | --- |
| F-01 | Routing | Every unknown URL returns the homepage with HTTP 200 | `VERIFIED_IN_UI` | Fixed in the rebuild |
| F-02 | Content | `about.php` is byte-identical to `index.php` | `VERIFIED_IN_UI` | Fixed in the rebuild |
| F-03 | Data | `prices.php` renders no price table at all | `VERIFIED_IN_UI` | Fixed in the rebuild |
| F-04 | Reporting | `generate-market-report.php` returns HTTP 500 | `FAILED_TEST` | `PLANNED` in the rebuild |
| F-05 | Catalogue | "Paddy Rice" exists twice (ids 19 and 1) | `VERIFIED_IN_UI` | Preserved and labelled |
| F-06 | Data | Dawanau's headline price range contradicts its own price history | `VERIFIED_IN_UI` | Fixed in the rebuild |
| F-07 | Security | A Google Maps API key and a map token are embedded in a public page | `VERIFIED_IN_UI` | Removed from the rebuild; key rotation owed by the owner |
| F-08 | API docs | The published API key is a placeholder and the base URL is `localhost` | `VERIFIED_IN_UI` | Fixed in the rebuild |
| F-09 | API | The live `/api/*` endpoints resolve to the homepage | `VERIFIED_IN_UI` | Rebuilt as `/api/v1/*` |
| F-10 | Forecasting | The "Price Forecast" widget shows a number with no method, model or error band | `VERIFIED_IN_UI` | Deliberately not replicated |
| F-11 | Truthfulness | The FAQ claims data is updated daily / real-time | `DOCUMENTATION_ONLY` | Corrected in the rebuild |
| F-12 | Data model | No unit, price type, currency, source or verification timestamp exists anywhere in the legacy output | `VERIFIED_IN_UI` | Redesigned in the rebuild |
| F-13 | Data | The newest observation on the legacy site is 14 July 2025 | `VERIFIED_IN_UI` | Disclosed; coverage notice added |
| F-14 | Content | Blog articles carry no publication dates | `VERIFIED_IN_UI` | Preserved with an explicit "not recorded" label |
| F-15 | SEO | `robots.txt` and `sitemap.xml` serve the homepage | `VERIFIED_IN_UI` | Fixed in the rebuild |
| F-16 | UI | The homepage repeats the same blog cards | `VERIFIED_IN_UI` | Fixed in the rebuild |
| F-17 | Maps | The market page's map link is broken | `VERIFIED_IN_UI` | Removed in the rebuild |
| F-18 | Search | `search.php?q=rice` works (the only genuinely functional legacy endpoint found) | `VERIFIED_IN_UI` | Reimplemented as a header search |
| F-19 | Backend | The legacy database schema, auth model and internal API are not inspectable | `UNKNOWN` | Documented as a question |
| F-20 | Permissions | The rebuild's migrations granted no table privileges, so RLS was never reached | `VERIFIED_IN_DATABASE` | Fixed in `0009_grants.sql` |
| F-21 | Permissions | A user without a profile row could create their own profile with `role = 'admin'` | `VERIFIED_IN_DATABASE` | Fixed in `0005_row_level_security.sql` |
| F-22 | Permissions | The role-change trigger only guarded self-escalation | `VERIFIED_IN_CODE` | Tightened in `0005_row_level_security.sql` |
| F-23 | Test method | RLS assertions used `assert_raises` for statements that RLS filters silently | `VERIFIED_IN_DATABASE` | Fixed in `tests/rls/permission-tests.sql` |
| F-24 | Migrations | `append_correction()` was defined before the column it referenced | `VERIFIED_IN_DATABASE` | Fixed in `0006_publication_integrity_views.sql` |
| F-25 | Migrations | An unqualified `id` in `orgs_select_member` bound to the wrong table | `VERIFIED_IN_DATABASE` | Fixed in `0005_row_level_security.sql` |
| F-26 | Data | The seed migration must contain reference data only — never prices | `VERIFIED_IN_DATABASE` | Enforced by a migration smoke test |
| F-27 | Architecture | The rebuild needs a data source that works before Supabase is provisioned | `VERIFIED_IN_CODE` | Two-source data layer |
| F-28 | Money | Monetary values must never be stored as floating point | `VERIFIED_IN_CODE` | `numeric(18,4)` throughout |
| F-29 | Publication | Published prices must be immutable; corrections append | `VERIFIED_IN_DATABASE` | Enforced by trigger + revision history |
| F-30 | API | API credentials must be hashed and never reach the browser | `VERIFIED_IN_CODE` | SHA-256 + constant-time compare |
| F-31 | Packaging | Node 20 is below what `@supabase/supabase-js` now supports | `VERIFIED_IN_CODE` | Documented as a deployment requirement |
| F-32 | Commercial | Subscription tiers, API-key issuance and report delivery are not built | `PLANNED` | Tracked in the migration plan |

---

## 3. Legacy site — detailed findings

### F-01 · Every unknown URL returns the homepage with HTTP 200 — `VERIFIED_IN_UI`

**Method.** `GET` on `/login.php`, `/register.php`, `/signup.php`, `/forgot-password.php`,
`/dashboard.php`, `/profile.php`, `/admin.php`, `/agent.php`, `/logout.php`, `/privacy.php`,
`/terms.php`, `/disclaimer.php`, `/api-docs.php`, `/pricing.php`, `/insights.php`, `/compare.php`,
`/robots.txt`, `/sitemap.xml` and `/api/anything`. All returned HTTP 200 with the homepage markup.

**Impact.** Search engines index the homepage under dozens of URLs; a mistyped or removed page looks
like a working page; `robots.txt` and `sitemap.xml` are unusable. It also means the legacy site's
apparent breadth (a dashboard, an admin area, an API) is not real.

**Remediation (done).** The rebuild implements real routes and a real `not-found.tsx`; unknown
paths return HTTP 404. `src/app/robots.ts` and `src/app/sitemap.ts` emit genuine robots and
sitemap files.

### F-02 · `about.php` is byte-identical to `index.php` — `VERIFIED_IN_UI`

**Method.** MD5 of the raw responses for twelve legacy pages. `about.php` and `index.php` produced
the same digest; the other ten were distinct.

**Impact.** There is no About page. "About Pluck Agro" was marketing copy repeated from the
homepage.

**Remediation (done).** `/about` is a distinct page in the rebuild, built from the same copy with
the actual brand, address and contact details.

### F-03 · `prices.php` renders no price table — `VERIFIED_IN_UI`

**Method.** `GET /prices.php` — the response is 6,962 bytes and stops mid-document; there is no
price table markup, no commodity/market table and no pagination.

**Impact.** The primary price directory of the legacy site does not work. All prices a user could
see came from the homepage comparison widget, the market pages and the commodity pages.

**Remediation (done).** `/prices` is a filterable, paginated directory built from the database,
with an explicit "no published observations" empty state.

### F-04 · The PDF market report returns HTTP 500 — `FAILED_TEST`

**Method.** `GET /generate-market-report.php?market_id=7&commodity_id=1` → HTTP 500.

**Impact.** The one premium-ish feature on the legacy site is broken.

**Remediation (`PLANNED`).** Reports are modelled (`market_reports`,
`report_subscriptions`) but not implemented. When implemented they must be generated from
published observations with their own provenance line, never from a hand-written summary.

### F-05 · "Paddy Rice" exists twice in the catalogue — `VERIFIED_IN_UI`

**Method.** `GET /commodities.php` — 22 rows for 21 distinct commodity names. "Paddy Rice" appears
as id 19 (0 markets) and id 1 (3 markets).

**Impact.** Counts, filters and links are ambiguous; a user can reach two different "Paddy Rice"
entries.

**Remediation (done).** The seed migration keeps both rows and renames id 19 to **"Paddy Rice
(duplicate record)"**, so no identifier is lost and the collision is visible instead of hidden.
`tests/data-integrity.test.ts` asserts the rename.

### F-06 · Dawanau's headline range contradicts its own price history — `VERIFIED_IN_UI`

**Method.** `GET /market-detail.php?market_id=7`. The page headline states a range of
₦12,000–₦12,500 while the price history table on the same page shows Paddy Rice around
₦40,200–₦43,500 and Groundnut entries around ₦40,550.

**Impact.** The number a visitor sees first is not derived from the data on the page.

**Remediation (done).** The rebuild never stores a hand-written summary. `market_price_summary`
computes the median, minimum, maximum, count and window from published observations at read time.

### F-07 · A Google Maps API key and a map token are embedded in a public page — `VERIFIED_IN_UI`

**Method.** `GET /market-detail.php?market_id=7` — the HTML contains
`AIzaSyCmL18misQw9KdwqGaw3zHkitj8vG6QF2Y` and a map token `87652`.

**Impact.** A third-party credential is public. Anyone can use it against Google's Maps billing
account. This is an owner-side rotation item, not a code fix.

**Remediation.** The rebuild embeds no third-party key. Market pages link out to an external map
service by URL only. **Action owed by Pluck Agro:** rotate/revoke the exposed key at the Google
Cloud console.

### F-08 · The published API key is a placeholder and the base URL is `localhost` — `VERIFIED_IN_UI`

**Method.** `GET /api-access.php` — the page instructs integrators to send
`SECRET_API_KEY_HERE_12345` to `http://localhost/agri_price_api/api/`.

**Impact.** The documented integration cannot work for anyone, and the page teaches integrators
that a hard-coded shared secret is acceptable.

**Remediation (done).** `/api-docs` documents the rebuilt `/api/v1/*` endpoints. Keys are issued
per application, stored only as SHA-256 hashes, compared in constant time, and each application
has its own rate limit. Plaintext keys are shown once at issuance and never stored or logged.

### F-09 · The live `/api/*` endpoints resolve to the homepage — `VERIFIED_IN_UI`

**Method.** `GET /api/...` for several paths → HTTP 200 with homepage markup.

**Classification note.** This is `VERIFIED_IN_UI` for the *routing* behaviour. The behaviour of the
legacy application's internal API, if any, is `UNKNOWN` (F-19): it cannot be observed from outside.

**Remediation (done).** Six documented, read-only, versioned endpoints exist under `/api/v1/*` with
a uniform `{data, meta}` / `{error, meta}` envelope, Zod-validated query parameters and
`X-RateLimit-*` headers.

### F-10 · The "Price Forecast" widget publishes an unlabelled number — `VERIFIED_IN_UI`

**Method.** `GET /commodity-detail.php?id=1` — the page shows "Price Forecast: ₦43,568.57 for
Jul 13, 2025" for Paddy Rice, with no method, no inputs, no confidence interval, no error band and
no historical evaluation of the forecast.

**Impact.** The number is indistinguishable from an observed price to a reader, and it is presented
for a date that was in the future when the page was captured. Publishing a point forecast with no
model and no uncertainty is exactly the behaviour the rebuild is required to remove.

**Remediation (done — by omission).** The rebuild contains no forecast widget. A forecasting
feature is `PLANNED` and, when it exists, must be labelled as model-generated, must publish its
method and error band, and must be evaluated retrospectively against the realised prices before it
is shown to the public. `docs/KNOWN_LIMITATIONS.md` records this as an open item.

### F-11 · The FAQ claims daily updates and "real-time" data — `DOCUMENTATION_ONLY`

**Method.** The FAQ page copy. No execution was involved, so the classification is
`DOCUMENTATION_ONLY`; the *contradiction* with F-13 is `VERIFIED_IN_UI` because the underlying
observations are visible on the same site.

**Impact.** The site's own marketing copy misstates the freshness of its data by roughly fifteen
months (F-13).

**Remediation (done).** The rebuild's FAQ describes the actual collection model (periodic market
visits by assigned agents, verification before publication). The freshness of the numbers on screen
is stated by the coverage notice, and the disclaimer explains the limits.

### F-12 · The legacy output carries no unit, price type, currency, source or verification trail — `VERIFIED_IN_UI`

**Method.** A case-insensitive grep for `unit`, `kg`, `bag`, `tonne`, `naira`, `NGN`, `wholesale`,
`retail`, `verified`, `source` and `collected` across all **46** captured pages
(`audit/legacy-pages/`) returned **no data-field matches**. The only hits are marketing copy:
`unit` occurs inside the word "opportunities" in the homepage, and `verified` occurs in the FAQ
sentence "We have a network of verified data collectors". The rendered price blocks are bare
numbers with no unit, price type, currency or source.

**Impact.** A price without a unit is not a price: "₦40,550" could be per bag, per kg, per tonne
or per 50 kg bag, and bags do not all weigh the same. Without a price type, a retail quote cannot
be distinguished from a wholesale one. Without a source and a verification trail, a number cannot
be audited.

**Remediation (done).** The new schema separates `reported_amount` / `reported_unit_id` from
`normalized_amount` / `normalized_unit_id`; carries `price_type`, `currency_code`,
`collected_at` (+ precision), `submitted_at`, `verified_at`, `published_at`, `agent_user_id`,
`verified_by`, `source_system` and `verification_status`; and stores quality flags
(`legacy_unverified`, `unit_ambiguous`, `unit_conversion_unverified`, `timestamp_inconsistent`).

**Deliberate rule.** Normalisation only happens when a conversion is known and valid. The `bag`
unit has `baseFactor = null` because bag weights differ by commodity, so bags are never silently
converted to kilograms. Incomparable buckets are warned about, never merged.

### F-13 · The newest observation on the legacy site is 14 July 2025 — `VERIFIED_IN_UI`

**Method.** The complete recovered dataset (28 observations, 15 daily groups): dates run
2023-07-20/21, 2025-06-29 → 2025-07-14, 2025-07-01 → 2025-07-06 and 2025-07-01 → 2025-07-02. The
newest value is 14 July 2025, and the bulk of it is 1–12 July 2025.

**Impact.** As of the audit date (22 October 2026) the newest public figure is roughly fifteen
months old, while the site presents itself as live.

**Remediation.** Two parts. (1) Disclose: the coverage notice, the `DataCoverageNotice` component
and the disclaimer state the real age of the data on every page that shows prices.
(2) Refresh: the `/agent` console and the `/admin` verification queue are the collection and
publication path that produces fresh, provenance-carrying rows. `docs/MIGRATION_PLAN.md` §7 tracks
the operational go-live that turns the collection on.

### F-14 · Blog articles carry no publication dates — `VERIFIED_IN_UI`

**Method.** `GET /blog-detail.php?...` for three articles — "The Future of Sustainable Farming in
Nigeria", "A Guide to Yam Cultivation for Maximum Yield", "Understanding Market Price
Fluctuations for Cassava". No date is displayed anywhere on the article.

**Impact.** A reader cannot tell how old the advice is; the rebuild cannot invent one.

**Remediation (done).** The three real articles are migrated verbatim into
`src/lib/content/insights.ts`. Where the legacy site recorded no date, the rebuild prints
"Publication date not recorded" instead of guessing.

### F-15 · `robots.txt` and `sitemap.xml` serve the homepage — `VERIFIED_IN_UI`

**Method.** `GET /robots.txt` and `GET /sitemap.xml` → HTTP 200 with homepage HTML.

**Remediation (done).** `src/app/robots.ts` and `src/app/sitemap.ts` emit valid files; the sitemap
lists the public routes and excludes `/admin`, `/agent`, `/dashboard` and the auth pages.

### F-16 · The homepage repeats the same blog cards — `VERIFIED_IN_UI`

**Method.** The homepage contains the "Latest Insights" cards twice — the same three articles in
the same order in two different sections.

**Remediation (done).** The rebuild renders each article once.

### F-17 · The market page's map link is broken — `VERIFIED_IN_UI`

**Method.** The map link on `/market-detail.php?market_id=7` does not resolve to a usable map.

**Remediation (done).** The rebuild's market pages carry the location text and link out to an
external map service; no API key is embedded (F-07).

### F-18 · `search.php` is functional — `VERIFIED_IN_UI`

**Method.** `GET /search.php?q=rice` → HTTP 200, 15,779 bytes, with matching results.

**Remediation (done).** The rebuild ships a header search across commodities and markets, with an
empty state and no dead ends.

### F-19 · The legacy backend is not inspectable — `UNKNOWN`

**Method.** No source code, database access, server configuration or API documentation for the
legacy application was available. Only public HTTP responses were observable.

**Open questions** (each needs an owner answer, and none of them is assumed anywhere in the
rebuild):

1. What does the legacy price actually measure — per bag, per kg, per tonne, retail or wholesale?
2. Is the legacy `price_history` a single daily quote per market/commodity, or an OHLC series?
   (The rebuild assumes one daily quote per pair; see `docs/KNOWN_LIMITATIONS.md` §3.)
3. Which role was allowed to publish a price, and was any verification performed at all?
4. Does the legacy `generate-market-report.php` have a working implementation that only fails on
   some parameter combinations (F-04)?
5. What did the legacy `/api/*` paths return before the catch-all routing was introduced?
6. Where does the forecast number (F-10) come from — a model, a formula, or a hard-coded value?

---

## 4. Rebuild findings — permissions, data and packaging

### F-20 · The migrations granted no table privileges — `VERIFIED_IN_DATABASE`

**Method.** Applying the migrations to a real PostgreSQL 18.4 instance and querying
`information_schema.role_table_grants`. No `grant` statement existed for `anon` or `authenticated`.

**Impact.** With RLS enabled and no grants, `anon` and `authenticated` would receive
`permission denied for table` instead of an empty or filtered result — the policies would never be
evaluated. A policy that has never run is not a policy.

**Remediation (done).** `0009_grants.sql` grants table-level privileges (coarse) while the RLS
policies in `0005` decide rows (precise). The RLS test suite now asserts the refusal for `anon`
explicitly.

### F-21 · Privilege escalation through profile creation — `VERIFIED_IN_DATABASE`

**Method.** Reproduced against the real database with the pre-fix policy
(`profiles_insert_own … with check (id = auth.uid())`):

```
set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
insert into public.profiles (id, full_name, role) values ('7777…', 'Escalator', 'admin');
-- INSERT 1
select role from public.profiles where id = '7777…';  -- admin
```

With the shipped policy the same statement fails with
`new row violates row-level security policy for table "profiles"`, while inserting a
`public_user` profile still succeeds.

**Impact.** Any signed-up user whose profile row was missing (for example a row created before the
`handle_new_user` trigger existed, or a profile deleted by an operator) could create an account
with `role = 'admin'` and inherit every administrative policy: read every observation, publish
prices, manage API applications and read the audit log.

**Remediation (done).** `profiles_insert_own` now requires `id = auth.uid() and role =
'public_user'`, and the regression test asserts both the denial and the allowed least-privileged
insert.

### F-22 · The role-change trigger only guarded self-escalation — `VERIFIED_IN_CODE`

**Assessment.** With the pre-fix update policy (`using (id = auth.uid() or public.is_admin())`) this
was **not** reachable: a non-administrator could only ever update their own row, and self-escalation
was already blocked by the trigger. It is recorded as a defence-in-depth weakness rather than an
exploitable hole.

**Remediation (done).** The trigger `public.prevent_role_escalation()` is now the single authority:
it rejects **any** role change by a caller whose role is not `admin`/`super_admin`, on any
profile, and it refuses to demote the last administrator. The update policies were split into
`profiles_update_own` (own row) and `profiles_admin_update` (administrators) so the intent is
explicit. The trigger is `SECURITY INVOKER` so that `current_user` identifies the caller; the
service role and direct database administrators are trusted and exempt.

### F-23 · RLS assertions used the wrong technique for filtered statements — `VERIFIED_IN_DATABASE`

**Method.** RLS filters UPDATE/DELETE rows silently: the statement succeeds and affects zero rows
instead of raising. The test suite used `assert_raises` for such statements, so a legitimate
denial was reported as a failure.

**Remediation (done).** `tests/rls/permission-tests.sql` now distinguishes three cases:
`assert_raises` (the statement must error), `assert_no_rows_affected` (the statement must succeed
but change nothing) and `assert_rows_affected` (the positive control — the statement must succeed
and change the expected number of rows). The suite now includes the positive control for the
administrator role change, which is what proves the denials are meaningful.

### F-24 · `append_correction()` referenced a column that did not exist yet — `VERIFIED_IN_DATABASE`

**Method.** Applying the migrations in order: `0006` failed with
`column "superseded_by" does not exist` because the `ALTER TABLE … ADD COLUMN` ran after the
function body.

**Remediation (done).** The `ALTER TABLE` was moved above the function definition in
`0006_publication_integrity_views.sql`. This is exactly the class of defect the migration
validator exists to catch.

### F-25 · An unqualified `id` bound to the wrong table — `VERIFIED_IN_DATABASE`

**Method.** `0005` failed with `operator does not exist: uuid = bigint` in `orgs_select_member`:
the bare `id` resolved to `organization_members.id` instead of `organizations.id`.

**Remediation (done).** The reference is qualified as `organizations.id`.

### F-26 · The seed must never contain prices — `VERIFIED_IN_DATABASE`

**Method.** The migration smoke test asserts
`select count(*) from public.price_observations` = 0 immediately after `0007_seed_reference_data.sql`.

**Why it matters.** A seed that carried the migrated prices would make it impossible to tell
"migrated legacy data" from "live collected data", and would silently ship fifteen-month-old
figures into a production database labelled as current.

**Status.** Clean: the seed contains reference data only (11 markets, 22 commodities, 11 states,
8 units, categories, varieties, grades, synonyms, unit conversions) and zero observations. Prices
enter the system only through the agent collection path.

### F-27 · The rebuild needs to run before Supabase is provisioned — `VERIFIED_IN_CODE`

**Decision.** Every page, API route and server action talks to a `DataSource` interface with two
implementations: `supabase` (production) and `fixture` (the migrated legacy dataset). The fixture
is derived from the public scrape and is surfaced with an explicit "migrated records" coverage
notice, so a developer, a reviewer or a stakeholder can run the whole product before a database
exists, without any risk of passing migrated data off as live.

### F-28 · Monetary values are `numeric`, never floating point — `VERIFIED_IN_CODE`

All money columns are `numeric(18,4)`; the domain layer uses `number` in TypeScript only at the
serialisation boundary and formats with `Intl.NumberFormat`. The chart layer is fed the same
`number` values for display only — no arithmetic is performed on floats.

### F-29 · Published prices are immutable — `VERIFIED_IN_DATABASE`

The trigger `prevent_published_economic_mutation` rejects any change to the economic fields of a
published row — for administrators too. A correction calls `public.append_correction()`, which
writes a new observation, marks the original `is_current = false`, records the superseded id, and
writes both a `price_revision_history` snapshot and a `price_verification_events` entry. The RLS
suite exercises all three outcomes.

### F-30 · API credentials — `VERIFIED_IN_CODE`

Keys are stored as SHA-256 hashes and compared with `timingSafeEqual`. The plaintext key is never
stored, never logged, and never reaches the browser: the service-role key is only imported by
`src/lib/supabase/admin.ts`, which is marked `server-only` and is used by the API key verifier and
the usage logger. Usage logs store a hashed IP address.

### F-31 · Node 20 is below the supported range — `VERIFIED_IN_CODE`

`@supabase/supabase-js` now requires Node ≥ 22.14 (or ≥ 24) and prints a deprecation warning
under Node 20.20. The rebuild therefore targets Node 22 LTS in `engines` and in the deployment
documentation.

### F-32 · Commercial surface — `PLANNED`

Subscription tiers, API-key issuance UI, the report generator and alert delivery are modelled in
the schema but not built. `docs/MIGRATION_PLAN.md` §8 sequences them behind the free public
experience, which stays complete and ungated.

---

## 5. Verification log

Everything in this section was executed in this repository, on the dates shown.

| Check | Command | Result |
| --- | --- | --- |
| Migrations apply to a real PostgreSQL 18.4 | `bash scripts/validate_migrations.sh` | 9/9 files applied; 39 public tables, **39 with RLS**, 74 policies, 2 views |
| Seed contains no prices | same run | `prices=0` |
| RLS permissions | same run, `tests/rls/permission-tests.sql` | **49 assertions across 9 blocks, all passed** |
| Unit and integration tests | `npm test` | **148 passed** (46 pricing, 32 observation validation, 28 data integrity, 14 API auth, 28 API routes) |
| Type check | `npm run typecheck` | clean |
| Production build | `npm run build` | 35 route entries (39 pages) |
| Route smoke test | `curl` over 31 public URLs | 31/31 HTTP 200; unknown paths → HTTP 404 |
| API smoke test | `curl` over the six `/api/v1` endpoints | 200 with `{data, meta}`; 400 on invalid parameters; 404 for an unknown commodity |
| Privilege-escalation exploit | direct SQL against PostgreSQL 18.4 | pre-fix: escalation succeeded; post-fix: rejected (F-21) |

### Known gaps in the verification itself

* The RLS suite runs against a **stub** of the Supabase `auth` schema (`auth.users`,
  `auth.uid()`), not against a hosted Supabase project. The policies themselves are exercised
  faithfully; PostgREST's role switching and JWT handling are not.
* The API key rate limiter is tested in-process, not under real concurrency.
* No end-to-end browser test exists. Accessibility is addressed in the markup (skip link, focus
  ring, labels, reduced-motion handling) but is not machine-verified.

---

## 6. Classification counts

| Classification | Count |
| --- | --- |
| `VERIFIED_IN_UI` | 16 |
| `VERIFIED_IN_CODE` | 5 |
| `VERIFIED_IN_DATABASE` | 7 |
| `VERIFIED_IN_LIVE_API` | 0 — no legacy JSON endpoint could be reached; the legacy `/api/*` paths serve the homepage (F-09) |
| `DOCUMENTATION_ONLY` | 1 |
| `PLANNED` | 1 |
| `UNKNOWN` | 1 |
| `FAILED_TEST` | 1 |


---

# Addendum — Tier-1 operations build (22 October 2026)

The original audit (F-01 … F-32) covered the legacy site and the first rebuild. The
Tier-1 build added the operations system: the central login, the Super Admin Control Centre, the
phone-first Market Agent App, the analytics centre, the reports and exports, and the scheduled
jobs. The findings below cover that work.

The full phase-by-phase report, with the evidence for each phase, is in `docs/BUILD_REPORT.md`.

## A. Findings

| ID | Finding | Classification | Evidence | Remediation |
| --- | --- | --- | --- | --- |
| F-33 | The rebuild had no operational data model: no agent identity, no assignment, no task lifecycle, no verification trail, no notifications, no jobs, no exports. | `VERIFIED_IN_CODE` | Full tree review of the first rebuild | Migrations `0010`–`0013` added 12 operational tables, 22 database functions, the RLS policies for them, and the transactional business rules. |
| F-34 | The first rebuild's `approveObservation` published in one step, so approval and publication could not be audited separately. | `VERIFIED_IN_CODE` | `src/lib/verification/actions.ts` (removed) | Split into `approve_observation` and `publish_observation`; the latter refuses to run without a prior approval. The single-step action was deleted. |
| F-35 | The first rebuild's agent console posted prices through a form action with no idempotency key, so a retried request on a flaky connection could create a duplicate price. | `VERIFIED_IN_CODE` | `src/lib/observations/actions.ts` (removed) | `submit_observation` takes a `submission_key` with a unique index; the field app sends a UUID per price and reuses it when retrying. |
| F-36 | The first rebuild had no way to suspend an agent. | `VERIFIED_IN_CODE` | Tree review | `profiles.account_status` plus `set_account_status`; suspension is enforced in the server guard, at sign-in, and by the database functions. |
| F-37 | The first rebuild had no scheduled work: no task generation, no overdue marking, no snapshot refresh, no export expiry. | `VERIFIED_IN_CODE` | Tree review | Five jobs in `src/lib/jobs/index.ts`, each recorded in `scheduled_job_runs` and idempotent through a unique `(job_name, scheduled_for)` constraint. |
| F-38 | The first rebuild had no analytics: no productivity, no coverage, no metric definitions, no prior-period comparison. | `VERIFIED_IN_CODE` | Tree review | The metric registry, the snapshot, the pure computation and the comparison rules, with 48 tests. |
| F-39 | The first rebuild had no export path and no export audit. | `VERIFIED_IN_CODE` | Tree review | Twelve reports, `create_export_job` / `complete_export_job`, and an export history on the reports screen. |
| F-40 | The first rebuild had no sign-in throttling. | `VERIFIED_IN_CODE` | Tree review | `auth_login_attempts` with hashed identifiers, `checkSignInLimit`, and a limiter that fails open so an outage cannot lock every agent out of the field. |
| F-41 | The first rebuild's `/admin` and `/agent` pages read the session in a way that let Next.js prerender them as static HTML when the build ran without a Supabase configuration. | `VERIFIED_IN_TEST` | The first Tier-1 build listed `/admin/settings`, `/admin/system` and every `/agent/*` route as `○ (Static)` | `export const dynamic = 'force-dynamic'` on the admin and agent layouts and on the login page. The build now lists all 23 of those routes as `ƒ (Dynamic)`. |
| F-42 | The `round()` helper produced 1 for 1.005 because of binary floating point. | `VERIFIED_IN_TEST` | `tests/analytics/format.test.ts` | The helper now nudges by `Number.EPSILON` before rounding. Money in the interface must not lose a half-naira to a floating-point artefact. |
| F-43 | The role table in the auth module and the module list in the navigation module disagreed: a market supervisor was offered the agents screen but the path guard refused it. | `VERIFIED_IN_TEST` | `tests/operations/navigation.test.ts` | One table of allowed paths per role in `src/lib/auth/routing.ts`, and a test that asserts the navigation and the guard agree for every role. |
| F-44 | `src/lib/supabase/server.ts` was not marked `server-only`, so a client component could have imported the cookie-bound server client. | `VERIFIED_IN_CODE` | `tests/security/client-bundle.test.ts` | The module is now marked `import 'server-only'`, and the test asserts the marker on every module that reads the database. |
| F-45 | The first rebuild's password fields had no way to reveal a mistyped password on a phone. | `VERIFIED_IN_CODE` | `src/components/forms/CentralSignInForm.tsx` | A show/hide control on the central sign-in form, with the button labelled for screen readers. |
| F-46 | The scheduled job endpoint could have been triggered by anyone. | `VERIFIED_IN_CODE` | `src/app/api/jobs/run/route.ts` | A `JOB_RUNNER_SECRET` compared in constant time; without it the endpoint refuses every request, and `GET` is refused with 405. |
| F-47 | The notification service could have reported an email as delivered without a provider. | `VERIFIED_IN_CODE` | `src/lib/notifications/index.ts` | The external channels are adapters. Without a credential they report `skipped`, and the delivery log keeps that status. The settings screen shows each channel's state. |
| F-48 | There is no geographic coverage map. | `PLANNED` | `src/app/admin/overview/page.tsx` | The coordinates exist in `markets`, but a decorative map is worse than a table. A table and a chart are shown instead. |
| F-49 | The permission suites create synthetic price observations that were indistinguishable from collected prices: same source value, same dates as the real legacy data, and no protection against reaching the public record. | `VERIFIED_IN_CODE` | `tests/rls/permission-tests.sql`, `tests/operations/workflow-tests.sql` | Migrations `0014` and `0015` add the `test_fixture` source value and exclude it from the public read policy. Both suites now refuse to run against a database that holds any non-fixture observation, and both delete everything they created. The validator fails if a single row is left behind. |

## B. What could not be verified in this environment

| Item | Classification | Why |
| --- | --- | --- |
| The signed-in browser journey: signing in as an agent, collecting a price, seeing it in the review queue, approving it, publishing it. | `UNKNOWN` | No Supabase project is configured in this environment. The database behaviour is proved by the workflow suite against a real PostgreSQL; the interface behaviour is proved by the route sweep; the click-through itself is outstanding. |
| The delivery of an email, SMS or WhatsApp notification. | `DOCUMENTATION_ONLY` | No provider credential exists. The adapters and the boundary are documented in `.env.example` and `docs/KNOWN_LIMITATIONS.md`. |
| The offline queue in a real browser on a real phone. | `PLANNED` | The queue is now exercised in a DOM test (`tests/ux/experience.test.tsx`): a dropped connection, a retry with the same idempotency key, a server refusal and a restored draft are all asserted. What is still unverified is the behaviour on a physical device with a real radio. |
| PostgREST's role switching and JWT handling. | `UNKNOWN` | The SQL suites run against a real PostgreSQL with a stub of the `auth` schema. The policies are exercised faithfully; the hosted gateway's own behaviour is not. |

## C. The verification record after the Tier-1 build

| Check | Command | Result |
| --- | --- | --- |
| Migrations | `bash scripts/validate_migrations.sh` | **15 migrations applied cleanly.** 51 tables, 51 with RLS, 97 policies, 2 views |
| RLS permission suite | included in the validator | **169 statements, all assertions passed** |
| Operations workflow suite | included in the validator | **221 statements, all assertions passed** |
| No leftovers | included in the validator | the suites leave **no rows behind**; the validator fails the run if they do |
| Unit and integration tests | `npm test` | **296 passed** (23 analytics format, 25 analytics metrics, 23 quality rules, 25 auth routing, 12 navigation, 9 reports, 6 security, 25 user experience, 148 pre-existing) |
| Type check | `npm run typecheck` | clean |
| Production build | `npm run build` | **62 route entries** (51 pages, 11 API routes); all 23 admin and agent routes are dynamic |
| Route smoke test | `curl` over 40 URLs | public routes 200; every `/admin/*` and `/agent/*` route 307 → `/login?next=…`; `/api/v1/*` 200 |
| API guard checks | `curl` over 4 protected endpoints | 503 when unconfigured, 405 for `GET /api/jobs/run` |
| Credential exposure | `tests/security/client-bundle.test.ts` | the service-role key appears only in a `server-only` module and in no built client asset |
