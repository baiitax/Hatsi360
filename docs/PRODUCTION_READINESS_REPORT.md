# Hatsi360 — Production Readiness Report

**Product:** Hatsi360 — Agricultural Market Intelligence
**Date:** 2026-10-22
**Build:** Next.js 16.4.2 production build, TypeScript clean, 49 static pages generated

This is the Phase 7 deliverable. It records the evidence that was executed, the
findings, and what is explicitly not ready.

---

## 1. Evidence executed

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | **Clean**, no errors |
| Production build | `npx next build` | **Success**, 49 static pages, 6 dynamic routes |
| Unit and contract tests | `npx vitest run` | **357 passed**, 17 files, 0 failed |
| Brand suite | `npx vitest run tests/brand` | **21 passed** |
| Design system suite | `npx vitest run tests/design-system` | **8 passed** |
| Migration validation | `bash scripts/validate_migrations.sh` | **All 18 migrations applied cleanly** — 54 tables, 54 with RLS, 104 policies, 2 views, 169 RLS assertions, 221 workflow assertions, no leftover rows |
| Launch gate | `bash scripts/verify_launch.sh http://localhost:3000` | **77 passed, 0 failed** |
| Brand assets | `python3 scripts/brand_assets.py` | **18 assets** derived from the owner's two supplied artwork files, all verified present by test |
| Rendered heading contrast | headless Chromium, 26 public routes | **349 headings measured**, every one clears WCAG AA against its own surface |
| Horizontal overflow | headless Chromium, 1440 px and 390 px | **0 px** on every public, portal and directory route |

### 1.1 The launch gate covers

* 26 public routes returning HTTP 200, including the coverage alias and the
  sitemap and robots files.
* Identity: the product name, the descriptor, the tagline, the hero headline,
  the corporate endorsement, and the absence of any earlier product name in a
  title or heading.
* Product surfaces: the access portal carries the product name and the
  endorsement; the Control Centre and the Field App redirect an anonymous
  request instead of rendering; the brand assets are served; the header and
  footer reference the owner's supplied lockups; the access portal is
  standalone and does not render the public navigation; the web application
  manifest names the product and points at the supplied icon.
* Metadata: canonical link, Open Graph title, `Organization`, `WebSite` and
  `BreadcrumbList` structured data, and a homepage that publishes its pulse
  metrics rather than asserting them.
* Indexing: robots disallows `/admin` and `/agent`; the sitemap is well formed.
* API: the reports and latest-prices endpoints respond; the public price API is
  reachable without a key.
* Route aliases: `/coverage` is served and is its own canonical URL.
* Security headers: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Strict-Transport-Security`.
* Legacy redirects: `/index.php`, `/commodities.php`, `/markets.php`,
  `/blog.php` and `/api-access.php` all redirect.

---

## 2. Accessibility

| Area | State |
| --- | --- |
| Target | WCAG 2.2 AA |
| Colour contrast | Every text colour is asserted against white by test; a colour that cannot clear 4.5:1 is marked graphics-only. Headings now inherit their colour from the surface they sit on, so a heading on a deep green panel is white and one on a light panel is ink. All 349 headings across the 26 public routes were measured in a real browser against their own background and clear WCAG AA. |
| Focus | One visible focus ring across all four workspaces (`:focus-visible`, 2px Forest Green). |
| Skip link | Present on every page. |
| Semantics | Landmarks, one `h1` per page, ordered heading levels, `nav` labels, `table` captions. |
| Motion | `prefers-reduced-motion` disables the skeleton sweep and all transitions. |
| Charts | Each chart carries an accessible name and a text description; the movement indicator pairs colour with an arrow. |
| Verification labelling | A shared badge can only label a record "Verified" when its status is `verified`. |
| Type | Tabular numerals on every price; Inter and Manrope self-hosted. |
| Remaining | No automated axe scan, no screen-reader walkthrough, no 200% zoom audit. |

---

## 3. Performance

| Area | State |
| --- | --- |
| Server components | Public pages render on the server; the client bundle carries only the chart and navigation components. |
| Fonts | Self-hosted at build time; `display: swap`. |
| Images | The only raster assets are the icons; no page ships a photograph. |
| Caching | Reports revalidate every five minutes; the sitemap every hour; the observation APIs are `no-store`. |
| Queries | The homepage aggregates over one eligible-observation read rather than several. |
| Remaining | No Lighthouse run, no real-user monitoring, no image CDN, no bundle budget in CI. |

---

## 4. Security

| Area | State |
| --- | --- |
| Row Level Security | Enabled on all 54 tables; 104 policies; verified by 169 executed assertions. |
| Authorisation | Server-side guards on every admin and agent route; the navigation and the path guard are asserted to agree by test. |
| Service role | Confined to `src/lib/supabase/admin.ts`; never referenced from a client component. |
| API keys | Hashed at rest; entitlements resolved server-side; rate limits mapped to the entitlement. |
| Secrets | Read from the environment only; never logged; never rendered. |
| Headers | `nosniff`, `DENY` framing, `Referrer-Policy`, HSTS. |
| Missing | No content security policy, no rate limiting on the public read APIs, no automated dependency audit in CI. |

---

## 5. Data integrity

| Area | State |
| --- | --- |
| Historical data | 28 legacy observations, 11 markets and 22 catalogue entries preserved with their attribution. |
| Provenance | Migrated records remain `legacy_unverified` and are labelled as such. Nothing was relabelled as newly collected. |
| Corrections | Append-only. A published price is never overwritten; a correction creates a revision with its reason. |
| Normalisation | Applied only where a verified conversion exists. A bag of maize is never assumed to equal a bag of cocoa. |
| Comparability | Commodity, grade, variety, price type, currency and unit must all match before two figures are compared. |
| Migrations | Controlled, versioned, applied in order, validated against a real PostgreSQL, and asserted to leave no rows behind. |
| Backups | Not configured for a deployment — no project is deployed. |

---

## 6. SEO

| Area | State |
| --- | --- |
| Titles and descriptions | Unique per page, with a template of `%s | Hatsi360`. |
| Canonicals | Every page declares one; the coverage alias canonicalises to `/coverage`. |
| Open Graph and Twitter | Site name, title, description and a social identity image. |
| Structured data | `Organization`, `WebSite`, `BreadcrumbList`, `Dataset` and `Article` where it applies. |
| Sitemap | Static routes plus live price, commodity, market, insight and report URLs. |
| Robots | Indexable public routes; `/admin`, `/agent`, `/api` and the portal are excluded. |
| Redirects | Permanent 308 redirects for every indexed legacy PHP URL. |
| Canonical host | Configured but inert: no host is named in the environment, so nothing redirects today. |

---

## 7. Findings that block production

None of these block the site from being deployed as a preview, and all of them
block it from replacing the legacy site.

| # | Finding | Why it blocks |
| --- | --- | --- |
| 1 | No domain is confirmed, registered or configured. | The canonical host, the sitemap and the domain migration are unfinished. |
| 2 | No Supabase project holds the schema. | The site currently runs on the migrated fixture, not on live data. |
| 3 | No deployment, no CI, no cron configuration. | There is no automated path from a commit to a running site. |
| 4 | The legal pages are review drafts. | They must not be published as final terms. |
| 5 | The published mailbox carries the previous domain. | It contradicts the new identity on every page. |
| 6 | The ownership statement needs legal approval. | It is a corporate statement. |

---

## 8. Verdict

**Ready for:** internal review, stakeholder demonstration, content review of
the legal drafts, and a staging deployment to a preview host.

**Not ready for:** replacing the legacy site, a public launch, taking payment,
or claiming a canonical domain.

The legacy Pluck Live site remains the live public site and continues to
operate. Nothing in this transformation changed it.
