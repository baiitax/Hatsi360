# Pluck Live — Page-by-page migration plan

**Goal:** mirror the live site at `https://liveprice.pluckagro.com` — its information
architecture, branding, sections, user journeys and public URLs — while replacing the broken
parts and adding the collection, verification and API surfaces it never had.

**Principle:** the rebuild is a *successor*, not a redesign. Every page the legacy site actually
had has a successor. Every page it only pretended to have is either built properly or deliberately
not built — and never faked.

---

## 1. The legacy site, honestly counted

A request sweep of the legacy host found **11 genuinely distinct pages**. Every other path —
`/login.php`, `/register.php`, `/dashboard.php`, `/admin.php`, `/agent.php`, `/pricing.php`,
`/api-docs.php`, `/robots.txt`, `/sitemap.xml`, every `/api/*` path — resolved to the homepage
with HTTP 200. This is finding F-01 in `docs/AUDIT_REPORT.md`.

| # | Legacy page | Status on the live site |
| --- | --- | --- |
| L1 | `index.php` | Works. The homepage: hero carousel, comparison widget, about, services, latest prices, features, benefits, commodities, markets, insights, FAQ, CTA. |
| L2 | `about.php` | Byte-identical to `index.php` (F-02). |
| L3 | `prices.php` | Truncated server-side; renders no price table (F-03). |
| L4 | `commodities.php` | Works. 22 commodities (one duplicated). |
| L5 | `commodity-detail.php?id=N` | Works for the commodities that have data. Contains the unlabelled "Price Forecast" widget (F-10). |
| L6 | `markets.php` | Works. 11 markets with entry counts. |
| L7 | `market-detail.php?market_id=N` | Works for the three markets with data. Contains the exposed Maps key (F-07) and a broken map link (F-17). |
| L8 | `blog.php` | Works. Article list. |
| L9 | `blog-detail.php?id=N` | Works for 3 articles. No publication dates (F-14). |
| L10 | `search.php?q=` | Works. The only genuinely functional legacy endpoint besides the pages (F-18). |
| L11 | `api-access.php` | Works, but documents a placeholder key and a `localhost` base URL (F-08). |
| — | `generate-market-report.php` | HTTP 500 (F-04). |
| — | `faq.php`, `privacy.php`, `terms.php`, `disclaimer.php`, `contact.php`, `pricing.php` | All served the homepage. The *copy* exists in the site's footer and FAQ; the pages do not. |

## 2. Route mapping

### 2.1 Public pages — legacy → rebuild

| Legacy | Rebuild | Mirroring notes | Status |
| --- | --- | --- | --- |
| `index.php` | `/` | Same section order: carousel → market comparison → about → services → latest prices → features → benefits → commodities → markets → insights → FAQ → CTA. The comparison widget is still a server-rendered GET form (commodity + market), but it now compares **published observations** and says so when there is nothing to compare. A data-coverage banner is added above it. | Done |
| `about.php` | `/about` | The legacy page was a copy of the homepage (F-02). The rebuild makes it a real About page using the same brand, address and contact details. | Done |
| `prices.php` | `/prices` | New: filters (commodity, market, price type, date range), pagination, a per-row provenance column, and an honest empty state. The legacy page was broken (F-03), so this is a repair, not a copy. | Done |
| `commodity-detail.php?id=N` | `/prices/<commodity>` and `/commodities/<slug>` | `/prices/<commodity>` is the price view (summary, history chart, per-market comparison, units and price types). `/commodities/<slug>` is the catalogue entry that links into it. Both accept the legacy numeric id as a path segment. The forecast widget is **not** carried over (F-10). | Done |
| `commodities.php` | `/commodities` | Same catalogue, same categories. The duplicate "Paddy Rice" is renamed "Paddy Rice (duplicate record)" rather than silently merged (F-05). | Done |
| `markets.php` | `/markets` | Same 11 markets, with state filter, search and pagination. | Done |
| `market-detail.php?market_id=N` | `/markets/<slug>` | Market description, location, operating schedule, the commodities reported there, the price history and the per-commodity comparison. The headline figure is computed from the observations, never hand-written (F-06). No Maps key is embedded (F-07). | Done |
| `blog.php` | `/insights` | Article list with category and reading-time metadata. | Done |
| `blog-detail.php?id=N` | `/insights/<slug>` | The three real articles, migrated verbatim. Where the legacy site recorded no date, the page says "Publication date not recorded" (F-14). | Done |
| `search.php?q=` | header search (all pages) | Searches commodities and markets; no dead ends. | Done |
| `api-access.php` | `/api-docs` | Documents the rebuilt `/api/v1/*` endpoints with real request and response examples, taken from live responses rather than invented (F-08). | Done |
| `faq.php` (copy only) | `/faq` | The legacy FAQ copy, corrected where it claimed "real-time" data (F-11). | Done |
| `privacy.php` (copy only) | `/privacy` | Rebuilt for the new data flows (accounts, agents, verification, API usage). | Done |
| `terms.php` (copy only) | `/terms` | Rebuilt; adds the commercial terms for the API and subscriptions. | Done |
| `disclaimer.php` (copy only) | `/disclaimer` | Rebuilt; states the limits of the data (F-13): collection frequency, verification status, unit comparability, and that no figure is a forecast. | Done |
| `contact.php` (copy only) | `/contact` | The legacy address and phone number, plus a validated enquiry form stored in `contact_enquiries`. | Done |
| `pricing.php` (copy only) | `/pricing` | The commercial plan: free public prices, paid reports and API access. The free public experience is never gated. | Done |
| — (never existed) | `/compare` | The legacy homepage's comparison widget, promoted to a full page with multi-market comparison. | Done |
| — (never existed) | `/dashboard` | The customer workspace: saved commodities and markets, alerts, subscriptions and API keys. | Done |
| — (never existed) | `/agent` | The collection console for field agents. | Done |
| — (never existed) | `/admin` | The operations console: the verification queue, quality flags and audit trail. | Done |
| — (never existed) | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback` | Real Supabase Auth flows. The legacy site had none (they returned the homepage). | Done |

### 2.2 Legacy URL compatibility

Every legacy PHP URL that has a successor answers with a permanent redirect, so bookmarks,
backlinks and shared links keep working:

| Legacy URL | Redirect target |
| --- | --- |
| `/index.php`, `/index.html` | `/` |
| `/about.php` | `/about` |
| `/prices.php` | `/prices` |
| `/commodities.php` | `/commodities` |
| `/commodity-detail.php?id=N` | `/commodities?id=N` → `307` → `/prices/<slug>` |
| `/markets.php` | `/markets` |
| `/market-detail.php?market_id=N` | `/markets?market_id=N` → `307` → `/markets/<slug>` |
| `/blog.php` | `/insights` |
| `/faq.php` | `/faq` |
| `/api-access.php` | `/api-docs` |
| `/contact.php` | `/contact` |
| `/signin.php` | `/login` |
| `/signup.php` | `/register` |

The two-hop redirects exist because Next.js 16 refuses a dynamic redirect destination combined
with a `has` query condition. The first hop is a 308 from `next.config.ts`; the second is a 307
issued by the page after it resolves the legacy id to the canonical slug. A future middleware
handler can collapse this into a single hop without changing any destination.

### 2.3 The API

| Legacy | Rebuild | Notes |
| --- | --- | --- |
| `api-access.php` documentation (5 PHP endpoints, placeholder key, `localhost` base URL) | `/api/v1/commodities`, `/api/v1/markets`, `/api/v1/prices/latest`, `/api/v1/prices/history`, `/api/v1/prices/compare`, `/api/v1/insights` | JSON, versioned, read-only, uniform `{data, meta}` envelope, Zod-validated query parameters, per-application rate limits with `X-RateLimit-*` headers, `Authorization: Bearer` or `X-API-Key` authentication, SHA-256 hashed keys. |

### 2.4 Machine-readable files

| Legacy | Rebuild |
| --- | --- |
| `/robots.txt` → homepage HTML (F-15) | `/robots.txt` from `src/app/robots.ts`: allows crawling, disallows `/api/`, `/admin`, `/agent`, `/dashboard` and the auth pages, points at the sitemap. |
| `/sitemap.xml` → homepage HTML (F-15) | `/sitemap.xml` from `src/app/sitemap.ts`: static routes, the price directory entries that have published observations, every commodity, every market and every article. |

## 3. Branding and design system

The rebuild reuses the legacy palette, extracted from the live stylesheet:

| Token | Value | Legacy use |
| --- | --- | --- |
| `brand-900` / forest | `#243C18` | Dark green sections, footer |
| `brand-700` / leaf | `#0C8430` | Primary buttons, links |
| `brand-500` / accent | `#00D084` | Highlights, chart accents, active states |

Typefaces stay Inter + Roboto. `src/app/globals.css` defines the whole system as Tailwind v4
`@theme` tokens, plus the focus ring, selection colour, skeleton shimmer and a
`prefers-reduced-motion` guard.

The legacy site's own imagery (carousel, about, services, offers, blog, testimonial) was fetched
from the live host into `public/img/` and re-used, so the successor looks like the same brand.

## 4. Data migration

### 4.1 What was recovered

| Layer | Recovered | Source |
| --- | --- | --- |
| Markets | 11 (id, name, location, state, entry count) | `/markets.php` |
| Commodities | 22 (id, name, category, description) | `/commodities.php` |
| Prices | 28 observations in 15 daily groups, 2023-07-20 → 2025-07-14 | 5 market/commodity price-history pages |
| Blog | 3 articles | `/blog-detail.php` |
| Brand assets | 19 images | `/img/*` |

### 4.2 How it is loaded

The recovered dataset lives in three places, each with a different job:

1. `audit/source/*.json` + `audit/legacy-pages/*.html` — the **raw capture**, committed, and the
   independent truth that `tests/data-integrity.test.ts` compares against.
2. `scripts/build_legacy_dataset.py` — the deterministic reconstruction
   (28 observations, 0 unreconstructable, 0 mismatches against the capture).
3. `src/data/legacy/production-observations.json` — the reconstructed dataset the application
   reads when no database is configured.

### 4.3 What is *not* migrated

| Legacy artefact | Decision | Reason |
| --- | --- | --- |
| The "Price Forecast" value | **Not migrated** | No method, no model, no error band, no evaluation (F-10). |
| Hand-written market headline ranges | **Not migrated** | Contradicted the site's own history (F-06). Recomputed instead. |
| `SECRET_API_KEY_HERE_12345` | **Not migrated** | A placeholder, not a credential. |
| The exposed Google Maps key | **Not migrated** | It is a third-party credential that must be rotated by the owner (F-07). |
| "Updated daily / real-time" claims | **Not migrated** | Contradicted by the data (F-11, F-13). |
| Blog publication dates | **Not invented** | Shown as "Publication date not recorded" (F-14). |

### 4.4 Loading into the production database

The migrations are ordered so the database is always in a valid state:

| Migration | Contents |
| --- | --- |
| `0001_core_reference_schema.sql` | Countries, states, market zones, markets, operating schedules, categories, commodities, varieties, grades, synonyms, units, unit conversions, the `user_role` enum. |
| `0002_price_observations.sql` | Profiles, organisations, organisation members, price observations, evidence, verification events, revision history, quality flags, agent assignments, collection batches/tasks, market visits. |
| `0003_customer_intelligence.sql` | Saved commodities and markets, price alerts, delivery logs, market reports, report subscriptions, API applications, usage logs, customer subscriptions, billing events. |
| `0004_content_audit_settings.sql` | Articles, article categories, audit logs, system settings. |
| `0005_row_level_security.sql` | The RLS helper functions, RLS enabled on every table, 74 policies, the role-escalation trigger. |
| `0006_publication_integrity_views.sql` | Publication-integrity triggers, `append_correction()`, `publish_observation()`, `reject_observation()`, the audit trigger, the public views, the profile auto-creation trigger. |
| `0007_seed_reference_data.sql` | Reference data only — **zero prices**. |
| `0008_contact_enquiries.sql` | The contact form's table. |
| `0009_grants.sql` | Table-level privileges for `anon`, `authenticated` and `service_role`. |

The migrated legacy observations are loaded **as data, not as seed**: they are inserted by a
one-off import script after the migrations, each row carrying
`verification_status = 'legacy_unverified'`, `source_system = 'legacy_site'`, the original
collection date at day precision and the quality flags `legacy_unverified`,
`unit_ambiguous`, `unit_conversion_unverified` and `timestamp_inconsistent`. This is the only
way legacy data enters the system, and it is visible in the UI as such.

## 5. User journeys

| Journey | Legacy | Rebuild |
| --- | --- | --- |
| Find a price | Homepage comparison widget (server-rendered GET form) | Same widget, plus `/prices` with filters, `/prices/<commodity>` for the full view, `/compare` for cross-market comparison, `/markets/<slug>` for a market view. |
| Learn about a commodity | `commodity-detail.php` | `/commodities/<slug>` (catalogue) → `/prices/<commodity>` (prices). |
| Learn about a market | `market-detail.php` | `/markets/<slug>`. |
| Read an article | `blog.php` → `blog-detail.php` | `/insights` → `/insights/<slug>`. |
| Contact Pluck Agro | The phone number and email in the header | The same, plus `/contact` with a validated form stored in `contact_enquiries` and readable by staff in `/admin`. |
| Use the API | Documented, unusable | Issued keys, scopes, rate limits, real endpoints, documented examples. |
| Collect a price | **Did not exist** | `/agent`: an agent signs in, sees their assigned markets, submits an observation with unit, price type, collection time and optional evidence, and tracks it through verification. |
| Publish a price | **Did not exist** | `/admin`: staff see the verification queue, check the observation against the evidence, and publish, reject or request a correction. Every action is written to the audit trail. |
| Manage a subscription | **Did not exist** | `/dashboard`: saved items, alerts, subscription, API keys. |

## 6. Parity and verification

The rebuild is not considered done until the following are true, and each is checked in CI or by
an explicit command:

| Check | Command | Status |
| --- | --- | --- |
| Every public route responds 200, unknown routes 404 | route smoke test | 31/31 public URLs return 200; unknown URLs return 404 |
| The two legacy id-based URLs still resolve | `curl -L` on the legacy URLs | Confirmed: `/commodity-detail.php?id=1` → `/prices/paddy-rice` |
| The API returns the documented envelope | API smoke test | Confirmed for all six endpoints |
| The migrated prices match the raw capture | `npm test` → `tests/data-integrity.test.ts` | 28 assertions |
| The permissions hold against a real database | `bash scripts/validate_migrations.sh` | 49 assertions |
| The build is clean | `npm run build` | 35 route entries, 39 pages |

## 7. Go-live sequence

The cut-over is deliberately ordered so that the public site is never in a state where it shows
prices it cannot explain.

| Phase | Work | Exit criterion |
| --- | --- | --- |
| 0 — Provision | Create the Supabase project, run the migrations, apply the reference-data seed, set the auth redirect URLs, create the first administrator. | Migrations apply cleanly against the hosted project; `/api/v1/commodities` returns real data. |
| 1 — Import the legacy observations | Run the one-off import with the `legacy_unverified` flags; verify the row count (28) and the date range against the capture. | The production database holds the same 28 observations as the capture, and no others. |
| 2 — Turn on collection | Assign agents to markets; open the `/agent` console; start the verification rota. | At least one observation collected, verified and published end to end. |
| 3 — Parallel run | Serve the rebuild at a staging host; compare every public page with the legacy site. | No unexplained difference in any price, market, commodity or article. |
| 4 — Cut over | DNS to the new host; keep the legacy host read-only for 30 days. | The new host serves 200 for every public URL and 404 for unknown URLs. |
| 5 — Retire | After 30 days, archive the legacy host and its database. | Backup of the legacy database retained per the retention policy. |

### Do not skip this

* The migrated records must be imported **before** the site goes live, otherwise the first
  visitors see an empty catalogue. The empty state is honest, but it is not the product.
* The first administrator must be created **before** the agents are, because role assignment is
  administrator-only by design.
* The DNS change must be accompanied by the redirect table above; without it, every legacy link
  that is still in circulation (blog posts, WhatsApp messages, printed material) breaks.

## 8. Backlog after go-live

| Item | Why it is not in the first release |
| --- | --- |
| Market report PDFs | The legacy generator is broken (F-04) and a report must carry its own provenance. Schema is ready. |
| Price alerts (email/SMS) delivery | The alert tables and the UI exist; the delivery worker does not. |
| Evidence photo upload | The evidence table exists; the Storage bucket policy is not yet written. |
| API key issuance UI | The table and the verification path exist; the self-service issue screen does not. |
| Offline collection on mobile | The agent console requires a connection. |
| Forecasting | `PLANNED`, and gated on: a published method, an error band, and a retrospective evaluation against realised prices (F-10). |
