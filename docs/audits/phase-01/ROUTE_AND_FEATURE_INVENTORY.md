# Phase 01 — Route and Feature Inventory

**Commit audited:** `26b6514` · **Audit date:** 2026-11-13

98 route files: **85 page routes + 12 API routes + 1 auth callback**. Every route below was discovered by walking `src/app`, and the *Evidence* column is derived from the source of each route file — guards matched, tables read, RPCs called — not from memory.

## Summary

| Group | Routes | With an auth guard | Using centralised `getDataSource()` | Reading Supabase directly |
|---|---|---|---|---|
| Public | 31 | 3 | 21 | 3 |
| Admin | 29 | 24 | 2 | 1 |
| Agent | 19 | 14 | 0 | 0 |
| Auth | 5 | 0 | 0 | 0 |
| API | 14 | 0 | 6 | 0 |

**Only 4 of 98 routes read Supabase directly** — `/dashboard`, `/trade/alerts`, `/trade/watchlist` and `/admin/verification`. The other 29 data-driven routes go through the `DataSource` abstraction in `src/lib/data/`. This is the strongest architectural property in the repository.

---

## Public website (31 routes)

| Route | Purpose | Guard | Data source | Evidence | Status | Disposition |
|---|---|---|---|---|---|---|
| `/` | Homepage — hero, live snapshot, commodity grid | none | DataSource | 724L | VERIFIED IN CODE | Keep |
| `/about` | Company and methodology background | none | DataSource | 230L | VERIFIED IN CODE | Keep |
| `/commodities` | Commodity directory | none | DataSource | EmptyState; 153L | VERIFIED IN CODE | Keep |
| `/commodities/[slug]` | Commodity profile — prices, grades, markets | none | DataSource | 85L | VERIFIED IN CODE | Keep |
| `/compare` | Market-to-market price comparison | none | DataSource | EmptyState; 288L | VERIFIED IN CODE | Keep |
| `/contact` | Contact and business enquiry form | none | static/none | 90L | VERIFIED IN CODE | Keep |
| `/cookies` | Cookie policy | none | static/none | 126L | VERIFIED IN CODE | Keep (marketing/legal) |
| `/coverage-report` | Collection coverage report (public URL /coverage) | none | DataSource | 251L | VERIFIED IN CODE | Keep |
| `/dashboard` | Customer workspace — watchlists, alerts, API keys, subscriptions | staff | DataSource; direct:saved_commodities,saved_markets,price_alerts,api_applications,customer_subscriptions | guard:staff; 344L | VERIFIED IN CODE | Keep + extend |
| `/disclaimer` | Price data disclaimer | none | static/none | 129L | VERIFIED IN CODE | Keep |
| `/faq` | Frequently asked questions | none | static/none | 163L | VERIFIED IN CODE | Keep |
| `/insights` | Market insights index | none | static/none | 105L | VERIFIED IN CODE | Keep |
| `/insights/[slug]` | Individual market insight | none | static/none | 154L | VERIFIED IN CODE | Keep |
| `/markets` | Market directory | none | DataSource | EmptyState; 171L | VERIFIED IN CODE | Keep |
| `/markets/[slug]` | Market profile — commodities, latest prices | none | DataSource | EmptyState; 264L | VERIFIED IN CODE | Keep |
| `/methodology` | Price methodology and verification explanation | none | DataSource | 225L | VERIFIED IN CODE | Keep |
| `/prices` | Public price directory | none | DataSource | EmptyState; 327L | VERIFIED IN CODE | Keep |
| `/prices/[commodity]` | Commodity price history and movement | none | DataSource | 72L | VERIFIED IN CODE | Keep |
| `/pricing` | Subscription tiers | none | static/none | 200L | VERIFIED IN CODE | Keep (marketing/legal) |
| `/privacy` | Privacy policy | none | static/none | 141L | VERIFIED IN CODE | Keep |
| `/reports` | Research report index | none | static/none | 83L | VERIFIED IN CODE | Keep |
| `/reports/[slug]` | Individual research report | none | DataSource | 375L | VERIFIED IN CODE | Keep |
| `/solutions` | Solutions by audience | none | DataSource | EmptyState; 283L | VERIFIED IN CODE | Keep (marketing/legal) |
| `/terms` | Terms of service | none | static/none | 170L | VERIFIED IN CODE | Keep |
| `/trade` | Trade terminal overview | none | DataSource | EmptyState; 352L | VERIFIED IN CODE | Keep |
| `/trade/alerts` | User price alerts | user+redirects-to-login | DataSource; direct:price_alerts | guard:user+redirects-to-login; EmptyState; 223L | VERIFIED IN CODE | Keep |
| `/trade/best-buy` | Lowest verified observation engine | none | DataSource | EmptyState; 171L | VERIFIED IN CODE | Keep |
| `/trade/best-sell` | Highest verified observation engine | none | DataSource | EmptyState; 155L | VERIFIED IN CODE | Keep |
| `/trade/fundamentals` | Fundamental intelligence | none | DataSource | EmptyState; 233L | VERIFIED IN CODE | Keep (empty data) |
| `/trade/terminal` | Market terminal — snapshot, watch, movers | none | DataSource | EmptyState; 561L | VERIFIED IN CODE | Keep |
| `/trade/watchlist` | User watchlist (commodities + markets) | user+redirects-to-login | DataSource; direct:saved_commodities,saved_markets | guard:user+redirects-to-login; EmptyState; 187L | VERIFIED IN CODE | Keep |

## Administrative portal (29 routes)

| Route | Purpose | Guard | Data source | Evidence | Status | Disposition |
|---|---|---|---|---|---|---|
| `/admin` | Control Centre root | none | static/none | 12L | VERIFIED IN CODE | Keep |
| `/admin/agents` | Agent management | none | static/none | 194L | VERIFIED IN CODE | Keep |
| `/admin/agents/[id]` | Agent detail | staff | static/none | guard:staff; 459L | VERIFIED IN CODE | Keep |
| `/admin/analytics` | Market analytics | staff | static/none | guard:staff; 282L | VERIFIED IN CODE | Keep |
| `/admin/api-management` | API applications and keys | staff | static/none | guard:staff; 219L | VERIFIED IN CODE | Keep |
| `/admin/assignments` | Market-agent assignments | staff | static/none | guard:staff; 81L | VERIFIED IN CODE | Keep |
| `/admin/audit` | Audit log viewer | none | static/none | 167L | VERIFIED IN CODE | Keep |
| `/admin/categories` | Commodity categories | staff | DataSource | guard:staff; 104L | VERIFIED IN CODE | Keep |
| `/admin/commodities` | Commodity management | staff | DataSource | guard:staff; 148L | VERIFIED IN CODE | Keep |
| `/admin/customers` | Customer accounts | staff | static/none | guard:staff; 200L | VERIFIED IN CODE | Keep |
| `/admin/exports` | Export job management | staff | static/none | guard:staff; 88L | VERIFIED IN CODE | Keep |
| `/admin/grades` | Commodity grades | staff | static/none | guard:staff; 79L | VERIFIED IN CODE | Keep |
| `/admin/markets` | Market management | staff | static/none | guard:staff; 151L | VERIFIED IN CODE | Keep |
| `/admin/notifications` | Notification dispatch | staff | static/none | guard:staff; 88L | VERIFIED IN CODE | Keep |
| `/admin/observations` | All price observations | staff | static/none | guard:staff; 247L | VERIFIED IN CODE | Keep |
| `/admin/operations` | Live operations | staff | static/none | guard:staff; 128L | VERIFIED IN CODE | Keep |
| `/admin/overview` | Control Centre dashboard | staff | static/none | guard:staff; 314L | VERIFIED IN CODE | Keep |
| `/admin/profile` | Admin profile | staff | static/none | guard:staff; 83L | VERIFIED IN CODE | Keep |
| `/admin/quality` | Data quality flags | staff | static/none | guard:staff; 166L | VERIFIED IN CODE | Keep |
| `/admin/reports` | Report management | staff | static/none | guard:staff; 142L | VERIFIED IN CODE | Keep |
| `/admin/schedule` | Collection schedules | staff | static/none | guard:staff; 112L | VERIFIED IN CODE | Keep |
| `/admin/search` | Global admin search | staff | static/none | guard:staff; 184L | VERIFIED IN CODE | Keep |
| `/admin/settings` | System settings | none | static/none | 171L | VERIFIED IN CODE | Keep |
| `/admin/subscriptions` | Subscription management | staff | static/none | guard:staff; 198L | VERIFIED IN CODE | Keep |
| `/admin/system` | System health | none | static/none | 127L | VERIFIED IN CODE | Keep |
| `/admin/tasks` | Collection task management | staff | static/none | guard:staff; 162L | VERIFIED IN CODE | Keep |
| `/admin/units` | Units of measurement | staff | static/none | guard:staff; 101L | VERIFIED IN CODE | Keep |
| `/admin/verification` | Verification queue | staff | direct:price_observations,commodities,markets,measurement_units,profiles | guard:staff; 226L | VERIFIED IN CODE | Keep |
| `/admin/zones` | Market zones | staff | static/none | guard:staff; 76L | VERIFIED IN CODE | Keep |

## Field-agent application (19 routes)

| Route | Purpose | Guard | Data source | Evidence | Status | Disposition |
|---|---|---|---|---|---|---|
| `/agent` | Field app root | none | static/none | 12L | VERIFIED IN CODE | Keep |
| `/agent/assignments` | Assigned markets | agent | static/none | guard:agent; 157L | VERIFIED IN CODE | Keep |
| `/agent/assignments/[id]` | Assignment detail | agent | static/none | guard:agent; 276L | VERIFIED IN CODE | Keep |
| `/agent/collect` | Start a collection session | none | static/none | 14L | VERIFIED IN CODE | Keep |
| `/agent/collection/[id]` | Collection session detail | agent | static/none | guard:agent; 98L | VERIFIED IN CODE | Keep |
| `/agent/collection/new` | New collection session | agent | static/none | guard:agent; 95L | VERIFIED IN CODE | Keep |
| `/agent/corrections` | Correction requests | agent | static/none | guard:agent; 145L | VERIFIED IN CODE | Keep |
| `/agent/help` | Field app help | none | static/none | 135L | VERIFIED IN CODE | Keep |
| `/agent/history` | Submission history | agent | static/none | guard:agent; 175L | VERIFIED IN CODE | Keep |
| `/agent/home` | Agent dashboard | agent | static/none | guard:agent; 353L | VERIFIED IN CODE | Keep |
| `/agent/markets` | Assigned market list | agent | static/none | guard:agent; 98L | VERIFIED IN CODE | Keep |
| `/agent/markets/[id]` | Market detail for collection | agent | static/none | guard:agent; 169L | VERIFIED IN CODE | Keep |
| `/agent/notifications` | Agent notifications | agent | static/none | guard:agent; 56L | VERIFIED IN CODE | Keep |
| `/agent/observations` | Observation list | agent | static/none | guard:agent; 232L | VERIFIED IN CODE | Keep |
| `/agent/observations/[id]` | Observation detail | agent | static/none | guard:agent; 269L | VERIFIED IN CODE | Keep |
| `/agent/performance` | Agent performance | agent | static/none | guard:agent; 186L | VERIFIED IN CODE | Keep |
| `/agent/profile` | Agent profile | agent | static/none | guard:agent; 144L | VERIFIED IN CODE | Keep |
| `/agent/submissions` | Submission status | none | static/none | 13L | VERIFIED IN CODE | Keep |
| `/agent/tasks` | Collection tasks | none | static/none | 13L | VERIFIED IN CODE | Keep |

## Authentication (5 routes)

| Route | Purpose | Guard | Data source | Evidence | Status | Disposition |
|---|---|---|---|---|---|---|
| `/forgot-password` | Password recovery request | none | static/none | 27L | VERIFIED IN CODE | Keep |
| `/login` | Sign in (demo panel + real form) | none | static/none | 229L | VERIFIED IN CODE | Keep |
| `/register` | Self-registration (public_user only) | none | static/none | 40L | VERIFIED IN CODE | Keep |
| `/reset-password` | Password reset completion | none | static/none | 36L | VERIFIED IN CODE | Keep |
| `/auth/callback` | Auth callback handler | none | static/none | 37L | VERIFIED IN CODE | Keep |

## API routes (14 routes)

| Route | Purpose | Guard | Data source | Evidence | Status | Disposition |
|---|---|---|---|---|---|---|
| `/api-docs` | API endpoint | none | static/none | 494L | VERIFIED IN CODE | Keep |
| `/api-policy` | API endpoint | none | static/none | 139L | VERIFIED IN CODE | Keep (marketing/legal) |
| `/api/agent/submit` | API endpoint | none | rpc:submit_observation | 116L | VERIFIED IN CODE | Keep |
| `/api/auth/signout` | API endpoint | none | static/none | 20L | VERIFIED IN CODE | Keep |
| `/api/jobs/run` | API endpoint | none | static/none | 78L | VERIFIED IN CODE | Keep |
| `/api/notifications/read` | API endpoint | none | static/none | 50L | VERIFIED IN CODE | Keep |
| `/api/v1/[...path]` | API endpoint | none | static/none | 28L | VERIFIED IN CODE | Keep |
| `/api/v1/commodities` | API endpoint | none | DataSource | 75L | VERIFIED IN CODE | Keep |
| `/api/v1/insights` | API endpoint | none | static/none | 42L | VERIFIED IN CODE | Keep |
| `/api/v1/markets` | API endpoint | none | DataSource | 65L | VERIFIED IN CODE | Keep |
| `/api/v1/prices/compare` | API endpoint | none | DataSource | 146L | VERIFIED IN CODE | Keep |
| `/api/v1/prices/history` | API endpoint | none | DataSource | 81L | VERIFIED IN CODE | Keep |
| `/api/v1/prices/latest` | API endpoint | none | DataSource | 103L | VERIFIED IN CODE | Keep |
| `/api/v1/reports` | API endpoint | none | DataSource | 114L | VERIFIED IN CODE | Keep |
