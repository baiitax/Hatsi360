# Hatsi360 — Transformation Audit

**Product:** Hatsi360 — Agricultural Market Intelligence
**Endorsement:** Powered by Pluck Agro
**Audit date:** 2026-10-22
**Auditor:** the Hatsi360 rebuild team (automated capture + manual review + code review + executed tests)

This is the Phase 1 deliverable of the Hatsi360 transformation. It records what
was inspected, what each finding actually is (with the evidence class that
proves it), what changed, and what deliberately did not change.

Nothing in this document is asserted without evidence. Every claim is labelled
with one of:

| Label | Meaning |
| --- | --- |
| `VERIFIED_IN_UI` | Seen rendered in a browser during the audit. |
| `VERIFIED_IN_CODE` | Read in the source of this repository. |
| `VERIFIED_IN_DATABASE` | Read from a real PostgreSQL instance (the validator's server, not a mock). |
| `VERIFIED_IN_API` | Observed in an HTTP response from a running server. |
| `VERIFIED_IN_TEST` | Proven by an executed test in `tests/`. |
| `DOCUMENTATION_ONLY` | Asserted in a document, not implemented. |
| `PLANNED` | Designed, not built. |
| `UNKNOWN` | Not inspected, or not inspectable from here. |
| `FAILED_TEST` | A test exists and fails. |

---

## 1. What was inspected

### 1.1 The legacy product (`https://liveprice.pluckagro.com`)

| Area | Finding | Class |
| --- | --- | --- |
| Homepage | Server-rendered market list; comparison widget is a plain GET form; no fetch/ajax. | `VERIFIED_IN_UI` |
| `/markets.php` | 11 markets with ids, locations and entry counts; 28 price entries in total. | `VERIFIED_IN_UI` |
| `/commodities.php` | 22 commodities, including a duplicate "Paddy Rice" record. | `VERIFIED_IN_UI` |
| `/commodity-detail.php?id=1` | Paddy Rice across three markets, plus a "Price Forecast" widget with no stated method. | `VERIFIED_IN_UI` |
| `/market-detail.php?id=7` | Dawanau observations; headline conflicts with the table. | `VERIFIED_IN_UI` |
| `/api-access.php` | Placeholder API key; legacy PHP endpoint documentation, not a production API. | `VERIFIED_IN_UI` |
| `/about.php` | Byte-identical to the homepage. | `VERIFIED_IN_UI` |
| `/search.php?q=rice` | Functional legacy search. | `VERIFIED_IN_UI` |
| `/blog.php`, `/blog-detail.php` | Three undated articles; address **No 7 Kwanar Zainawa, Tokarawa Industrial Estate, Kano, Nigeria**. | `VERIFIED_IN_UI` |
| `/api/*`, `/admin`, `/agent`, `/dashboard`, `/pricing`, `/insights`, `/compare`, `/api-docs` | All served the homepage through a catch-all. | `VERIFIED_IN_UI` |
| `/generate-market-report.php` | HTTP 500. | `VERIFIED_IN_UI` |
| Legacy Google Maps key in page source | Exposed in the market detail page. | `VERIFIED_IN_UI` |
| `pluckagro.com` and `liveprice.pluckagro.com` | Both resolve to `198.135.50.79` (the legacy PHP host). | `VERIFIED_IN_API` |

### 1.2 This repository

| Area | Finding | Class |
| --- | --- | --- |
| Framework | Next.js 16.4.2 (App Router, Turbopack), React 19.3.1, TypeScript 5.9.3, Tailwind CSS v4. | `VERIFIED_IN_CODE` |
| Data layer | One `DataSource` contract with two implementations: Supabase and the migrated legacy fixture. | `VERIFIED_IN_CODE` |
| Schema | 54 tables, 104 row level security policies, 2 views across 18 migrations. | `VERIFIED_IN_DATABASE` |
| Migrations | All 18 apply cleanly on a real PostgreSQL 18 instance; 169 RLS assertions and 221 workflow assertions pass; no leftover rows. | `VERIFIED_IN_TEST` |
| Tests | 357 tests across 17 files; all pass. | `VERIFIED_IN_TEST` |
| Launch gate | 77 checks against a production build; all pass. | `VERIFIED_IN_TEST` |
| Public read model | `published_price_observations` view, created `security_invoker = true`. | `VERIFIED_IN_CODE` |
| Commercial model | Entitlement catalogue, tier resolver, API-owner inheritance and server-side gating exist; no entitlement is live. | `VERIFIED_IN_CODE` |
| Quality engine | Nine rules evaluated after submission and persisted; findings visible to owner and staff. | `VERIFIED_IN_TEST` |
| Legacy dataset | 28 historical observations, 11 markets, 22 catalogue entries; newest record July 2025. | `VERIFIED_IN_DATABASE` |

### 1.3 Connected services

| Area | Finding | Class |
| --- | --- | --- |
| Supabase | Two active projects, both belonging to other Pluck products. Neither contains the price schema. **Nothing was changed in either.** | `VERIFIED_IN_API` |
| Vercel | Hobby account. The domain endpoint shows the legacy A record. No usable project enumeration. | `VERIFIED_IN_API` |
| DNS | `pluckagro.com` and `liveprice.pluckagro.com` resolve to the legacy host. | `VERIFIED_IN_API` |
| Candidate domains | `gonapulse.com`, `gonapulse.ng`, `gonapulse.io`, `gonapulse.africa` returned NXDOMAIN. **NXDOMAIN does not establish availability or trademark clearance**, so no domain is assumed, registered or configured. | `VERIFIED_IN_API` |

---

## 2. The identity problem this transformation solves

The product was rebuilt twice before this transformation and each rebuild left a
working name in the code:

| Layer | Name found | Class |
| --- | --- | --- |
| Consumer-facing identity | Pluck Live (the legacy PHP site) | `VERIFIED_IN_UI` |
| Repository, package, schema comments | Pluck Live | `VERIFIED_IN_CODE` |
| Rebuild identity (previous working name) | GonaPulse — 167 occurrences across source, tests, scripts and migrations | `VERIFIED_IN_CODE` |
| Corporate backing | Pluck Agro | `VERIFIED_IN_UI` |

The transformation replaces the product identity with **Hatsi360** everywhere a
reader would understand the string as the product's name, and keeps the
historical name only where it describes what the *data* was.

`tests/brand/brand.test.ts` enforces this: a source file that says "Pluck Live"
outside a whitelisted historical phrase fails the build.

---

## 3. Migration inventory

Feature → current condition → Hatsi360 target → action → class.

### 3.1 Brand and design system

| Feature | Current condition | Hatsi360 target | Action | Class |
| --- | --- | --- | --- | --- |
| Product name | GonaPulse in 167 places | Hatsi360 everywhere a reader sees the product | Global rename, then locked by test | `VERIFIED_IN_TEST` |
| Category line | "Agricultural Market Intelligence" | Same | Kept | `VERIFIED_IN_CODE` |
| Tagline | "Know the market. Move with confidence." | "Know the harvest. Understand the market. Trade with confidence." | Replaced in `src/lib/brand.ts` and in the stored brand settings | `VERIFIED_IN_TEST` |
| Endorsement | "Powered by Pluck Agro" | Same, subordinate | Kept, asserted in footer, header and portal | `VERIFIED_IN_TEST` |
| Ownership wording | Product-driven statement | Same shape, Hatsi360 named | Replaced; legal approval still required | `DOCUMENTATION_ONLY` |
| Primary palette | Previous green/gold ramp | Deep Harvest `#123B2A`, Forest `#174D35`, Agricultural `#26734B`, Fresh Growth `#5B9A57`, Grain Gold `#D5A441`, Harvest Amber `#E5B95F`, Wheat Beige `#E9D8B5`, Natural Sand `#F4EFE4`, plus slate, sand and status ramps | Tokens re-pointed in `globals.css`, mirrored in `src/lib/brand.ts`, contrast asserted by test | `VERIFIED_IN_TEST` |
| Typography | Inter + Sora | Inter (interface and figures) + Manrope (editorial) | Font stack replaced | `VERIFIED_IN_CODE` |
| Logo | Leaf-and-pulse mark | "Grain orbit": eight grain kernels on a 360° orbit around a market-signal trace | New artwork in six SVG variants plus five PNG sizes, generated from one geometry | `VERIFIED_IN_TEST` |
| Logo asset pipeline | Generated eight-kernel mark in `Logo.tsx` and `scripts/brand_icons.py` | `scripts/brand_assets.py` derives every served asset from the owner's supplied artwork; the generated mark is retired | Rebuilt | `VERIFIED_IN_TEST` |
| Component system | Scattered per-page definitions | One catalogue of 28 named components, re-exported from one barrel | Added `src/components/ui/data-display.tsx`, `src/components/site/navigation.tsx`; existing components aliased to catalogue names | `VERIFIED_IN_TEST` |
| Hard-coded colours | Raw hex inside chart components | CSS custom properties resolved from the token theme | `src/lib/chart-colours.ts` added; a test fails on any raw hex outside the token system | `VERIFIED_IN_TEST` |

### 3.2 Public website

| Feature | Current condition | Hatsi360 target | Action | Class |
| --- | --- | --- | --- | --- |
| Homepage | Editorial hero, pulse, categories, coverage, comparison, trends | Same structure, new headline, a real market-data panel and five published pulse metrics | Rebuilt | `VERIFIED_IN_TEST` |
| Market pulse metrics | Sampled the 40 most recent observations | Aggregates over **every** eligible published observation | Replaced with complete aggregation | `VERIFIED_IN_CODE` |
| Hero panel | Static illustration | Panel of the newest eligible observations with its collection time, labelled "latest available", never "live" | Rebuilt | `VERIFIED_IN_TEST` |
| Commodity discovery | Emoji icons | Original line-art category glyphs, 14 categories | `src/components/marketing/CategoryGlyph.tsx` | `VERIFIED_IN_CODE` |
| Coverage | Two states | Four states: reporting, stale, registered, awaiting coverage | Rebuilt | `VERIFIED_IN_CODE` |
| Commodity cards | Name and counts | Name, category, latest published price, unit, market, date, verification state | Rebuilt | `VERIFIED_IN_CODE` |
| Comparison | Grouped by reported unit, incompatible units excluded | Unchanged, plus a shared `PriceComparisonTable` | Kept and shared | `VERIFIED_IN_TEST` |
| History | 7 / 30 / 90 / 1 year / all time | Same | Kept | `VERIFIED_IN_TEST` |
| Business solutions | Eight audiences | Nine, per the brief | Rebuilt | `VERIFIED_IN_CODE` |
| Navigation | Prices, Commodities, Markets, Compare, Insights, Reports, About | Market Prices, Commodities, Markets, Compare Prices, Market Insights, Reports, About | Rebuilt | `VERIFIED_IN_TEST` |
| Footer | Identity, contact, legal, endorsement | Same, plus the tagline and the ownership statement | Rebuilt | `VERIFIED_IN_CODE` |
| Coverage URL | Implemented at `/coverage-report` | Public URL `/coverage`, canonical `/coverage` | Rewrite kept; the alias is centralised in `src/lib/route-map.ts` | `VERIFIED_IN_TEST` |
| Legacy URLs | 308 redirects for the PHP paths | Unchanged | Kept and asserted by the launch gate | `VERIFIED_IN_TEST` |

### 3.3 Commodity, market and price intelligence

| Feature | Current condition | Hatsi360 target | Action | Class |
| --- | --- | --- | --- | --- |
| Price discovery | Search by commodity, market, state | Adds category and grade to the searchable vocabulary | Search vocabulary widened; the underlying comparability rule is untouched | `VERIFIED_IN_CODE` |
| Price types | Farmgate, wholesale asking, wholesale transaction, retail, processor procurement, exporter offer, indicative estimate | Unchanged; the types remain distinct everywhere | Kept | `VERIFIED_IN_TEST` |
| Normalisation | Only when a verified conversion exists | Unchanged | Kept | `VERIFIED_IN_TEST` |
| Reported vs normalised values | Both preserved | Unchanged | Kept | `VERIFIED_IN_TEST` |
| Timestamps | Collection, submission, verification, publication | Unchanged | Kept | `VERIFIED_IN_TEST` |
| Verification labelling | `legacy_unverified` shown as unverified | Unchanged; a shared `VerificationBadge` refuses to label anything but a `verified` record as verified | Kept and strengthened | `VERIFIED_IN_TEST` |
| Freshness | Per-commodity freshness window | Unchanged, now surfaced by a shared `DataFreshnessIndicator` | Kept | `VERIFIED_IN_TEST` |
| Movement | Percentage change when a comparable previous period exists | Unchanged, plus an arrow so colour is never the only signal | Kept and strengthened | `VERIFIED_IN_TEST` |
| Market map | Only plots markets with verified coordinates | Unchanged; no coordinate is invented | Kept | `VERIFIED_IN_CODE` |
| Charts | Recharts, server-fed | Unchanged; palette now resolves from tokens | Kept | `VERIFIED_IN_TEST` |

### 3.4 Field application (Hatsi360 Field)

| Feature | Current condition | Hatsi360 target | Action | Class |
| --- | --- | --- | --- | --- |
| Identity | "GonaPulse Field App" | "Hatsi360 Field" | Replaced | `VERIFIED_IN_TEST` |
| Modules | Home, Tasks, Collect, Prices | Home, Markets, Tasks, Collect, Prices, plus Notifications and Profile | `/agent/markets` added | `VERIFIED_IN_CODE` |
| Assigned markets | Listed on the home screen | A dedicated screen with scope, deadline, today's count and last collection | Added | `VERIFIED_IN_CODE` |
| Market pre-selection | The agent picked the market each time | "Collect prices here" carries the market into the form | Added | `VERIFIED_IN_CODE` |
| Drafts | Device-local draft restored on return | Unchanged, plus a draft filter on the submissions screen | Added | `VERIFIED_IN_TEST` |
| Offline queue | Queued submissions survive a dropped connection | Unchanged | Kept | `VERIFIED_IN_TEST` |
| Touch targets and layout | Single column, bottom navigation, five tabs | Unchanged | Kept | `VERIFIED_IN_TEST` |

### 3.5 Control Centre

| Feature | Current condition | Hatsi360 target | Action | Class |
| --- | --- | --- | --- | --- |
| Navigation | White rail | Deep-green rail, white content surfaces | Restyled | `VERIFIED_IN_TEST` |
| Live operations | Overview feed only | A dedicated queue of decisions waiting on a human | `/admin/operations` added | `VERIFIED_IN_CODE` |
| Catalogue modules | Not present | Commodities, categories, grades, units, market zones | Five modules added | `VERIFIED_IN_CODE` |
| Assignments | Buried in the agents screen | Its own module | `/admin/assignments` added | `VERIFIED_IN_CODE` |
| Exports | Part of "Reports & exports" | Its own module | `/admin/exports` added | `VERIFIED_IN_CODE` |
| Profile | Not present | The signed-in operator's own account and what it may open | `/admin/profile` added | `VERIFIED_IN_CODE` |
| Alerts | `price_alerts` is customer-owned by policy | Staff cannot read it, so it is **not** in the navigation | Deliberately omitted | `VERIFIED_IN_DATABASE` |
| Metrics | All read from the operational database | Unchanged; every card links to the records behind it | Kept and extended | `VERIFIED_IN_CODE` |
| Audit trail | Append-only, admin-readable | Unchanged | Kept | `VERIFIED_IN_DATABASE` |

### 3.6 Authentication

| Feature | Current condition | Hatsi360 target | Action | Class |
| --- | --- | --- | --- | --- |
| Portal | One sign-in page | "Hatsi360 Access Portal", server-side role and status routing | Replaced | `VERIFIED_IN_TEST` |
| Role enforcement | Server guard plus RLS | Unchanged; new modules added to the role path map so the navigation and the guard cannot disagree | Extended | `VERIFIED_IN_TEST` |
| Self-registration | Public registration only; privileged roles are provisioned | Unchanged | Kept | `VERIFIED_IN_CODE` |
| Recovery | Password reset and email flows | Unchanged | Kept | `VERIFIED_IN_CODE` |
| Rate limiting | Login attempt limits | Unchanged | Kept | `VERIFIED_IN_CODE` |

### 3.7 Commercial, data, SEO and legal

| Feature | Current condition | Hatsi360 target | Action | Class |
| --- | --- | --- | --- | --- |
| Tiers | Public live; professional and enterprise proposed | Unchanged — no payment provider, so nothing is sold | Kept | `VERIFIED_IN_TEST` |
| Entitlement controls | Server-side resolver, API-owner inheritance, rate-limit mapping | Unchanged | Kept | `VERIFIED_IN_TEST` |
| Stored brand identity | `system_settings` rows seeded in migration 0016 | A controlled refresh in migration 0018 | Added `0018_hatsi360_brand_refresh.sql` | `VERIFIED_IN_DATABASE` |
| Historical data | Never deleted; corrections append | Unchanged | Kept | `VERIFIED_IN_TEST` |
| SEO | Canonical, Open Graph, sitemap, robots, Organization, WebSite, BreadcrumbList, Dataset | Unchanged, plus a social identity image | Kept and extended | `VERIFIED_IN_TEST` |
| Legal pages | Privacy, terms, disclaimer, API policy, cookies — review drafts with `[confirm]` markers | Unchanged | Kept | `DOCUMENTATION_ONLY` |
| Contact address | Legacy mailbox and postal address | Unchanged; the mailbox still carries the previous domain and is recorded as an open item | Kept | `VERIFIED_IN_UI` |
| Domain and DNS | Legacy host only | No change authorised or made | Not touched | `UNKNOWN` |

---

## 4. What was preserved

* Every price record, market, commodity, grade, unit, assignment, task,
  verification event, revision and audit row.
* The comparability rule: price types stay distinct and units are only
  normalised when a verified conversion exists.
* The separation of approval from publication, and the append-only correction
  model.
* The rule that an unverified record is never published as a market price.
* The legacy PHP URL redirects.
* The public free price discovery surface.
* The Field App workflow, the offline queue and the device-local draft.
* The role model, the server guards and the Row Level Security policies.

## 5. Outstanding issues

| # | Issue | Impact | Class |
| --- | --- | --- | --- |
| 1 | The published mailbox is `info@agripricelive.com` — it carries the previous domain. | Cosmetic, but it contradicts the new identity on every page. Replace when a domain is confirmed. | `UNKNOWN` |
| 2 | No confirmed Hatsi360 domain. Every candidate checked returned NXDOMAIN, which proves nothing about availability. | The canonical host, the sitemap and the domain migration cannot be finalised. | `UNKNOWN` |
| 3 | The legal pages are drafts with `[confirm]` markers. | They must not be published as final legal text without review. | `DOCUMENTATION_ONLY` |
| 4 | The ownership statement is deliberately non-specific. | Authorised personnel must approve the final wording. | `DOCUMENTATION_ONLY` |
| 5 | No photography. The identity uses original vector artwork; commodity and market photography is a licensed-asset task. | The site is credible but not photographic. | `PLANNED` |
| 6 | No market has verified coordinates. | The coverage map draws no pins and says why. | `PLANNED` |
| 7 | The price schema is not deployed to any Supabase project. | The site runs on the migrated legacy fixture until a project is provisioned. | `PLANNED` |
| 8 | No CI, no end-to-end browser suite, no content security policy, no vercel.json cron. The web application manifest and the installable icons are now in place. | Deployment and long-term operations are not production-hardened. | `PLANNED` |
| 9 | The legacy site's own forecast widget was never replicated. | Intentional. Any forecast must be model-generated, labelled and evaluated. | `PLANNED` |
| 10 | `apply_observation_findings` can insert a duplicate quality flag on retry. | Cosmetic in the findings table; the flags themselves are correct. | `VERIFIED_IN_CODE` |
| 11 | An empty-unit comparable is compared against the synthetic unit id `0` rather than being excluded. | One edge case in the comparison logic. | `VERIFIED_IN_CODE` |
| 12 | The evidence-required rule reads the market's first active schedule instead of matching market, commodity and task. | One rule may be applied at the wrong granularity. | `VERIFIED_IN_CODE` |

## 6. Evidence index

| Evidence | Where | How to reproduce |
| --- | --- | --- |
| Migrations | `supabase/migrations/0001…0018` | `bash scripts/validate_migrations.sh` |
| Unit and contract tests | `tests/` | `npx vitest run` — 357 tests, 17 files |
| Launch gate | `scripts/verify_launch.sh` | `bash scripts/verify_launch.sh http://localhost:3000` — 77 checks |
| Brand artwork | `scripts/brand_assets.py` | `python3 scripts/brand_assets.py --favicon "/home/user/uploads/Hatsi360 Favicon.png" --logo "/home/user/uploads/HATSI360 Logo.png"` |
| Brand assertions | `tests/brand/brand.test.ts` | `npx vitest run tests/brand` |
| Design system assertions | `tests/design-system/design-system.test.ts` | `npx vitest run tests/design-system` |
| Production build | `.next` | `npx next build` |
| Legacy capture | `audit/` | 46 captured legacy pages and the recovered dataset |
