# Phase 01 — Feature Status Matrix

**Each feature is classified independently across four layers.** A feature is only upgraded when
there is evidence at that layer. "A page renders" is never evidence; "a policy exists" is never
evidence that a feature works.

Status set: `VERIFIED IN PRODUCTION` · `VERIFIED IN CODE` · `VERIFIED IN DATABASE` · `FUNCTIONAL` ·
`PARTIALLY IMPLEMENTED` · `UI ONLY` · `ARCHITECTURALLY DEFINED` · `BROKEN` · `DUPLICATED` ·
`PLANNED` · `UNKNOWN`

---

## 1. Authentication and access

| Feature | UI | Code | Database | End-to-end | Status | Evidence |
|---|---|---|---|---|---|---|
| Email/password sign-in | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `src/lib/auth/actions.ts`; `auth_login_attempts` throttle |
| Self-registration | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `signUp` hard-codes `public_user` |
| Password recovery | ✅ | ✅ | — | — | **VERIFIED IN CODE** | `requestPasswordReset`; no email provider → `alert_delivery_logs` empty |
| Demo accounts on `/login` | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `DemoAccountsPanel.tsx`; 5 accounts; **P0** — see SEC-1 |
| Invitation-only operational roles | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `signUp` cannot create admin/agent |
| Role-based redirect after sign-in | ✅ | ✅ | — | ✅ | **FUNCTIONAL** | `src/lib/auth/routing.ts` |
| Session refresh in proxy | — | ✅ | — | ✅ | **VERIFIED IN CODE** | `src/proxy.ts`, `matcher` excludes `/api/v1` |
| OAuth / magic link | — | — | ✅ | — | **ARCHITECTURALLY DEFINED** | `/auth/callback` route exists; no provider configured |

## 2. Public price discovery

| Feature | UI | Code | Database | End-to-end | Status | Evidence |
|---|---|---|---|---|---|---|
| Commodity directory | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | `/commodities`, 22 rows; no published prices |
| Market directory | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | `/markets`, 11 rows |
| Price list `/prices` | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | reads `published_price_observations` = **0 rows** |
| Commodity price history | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | 14-day fixture, 0 published |
| Market comparison `/compare` | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | needs ≥2 published observations |
| Market map | ❌ | — | ❌ | — | **PLANNED** | 0 of 11 markets have lat/lng |
| Coverage report | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | honest empty state |

## 3. Trade terminal (`/trade/*`)

| Feature | UI | Code | Database | End-to-end | Status | Evidence |
|---|---|---|---|---|---|---|
| Terminal overview | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | 0 published rows |
| Best-buy / best-sell | ✅ | ✅ | ✅ | — | **PARTIALLY IMPLEMENTED** | `src/lib/trade/opportunities.ts`; blocked on publication |
| Fundamentals | ✅ | ✅ | ❌ | — | **ARCHITECTURALLY DEFINED** | `commodity_fundamentals` empty |
| Alerts | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `price_alerts`, 4 owner rows, renders |
| Watchlist | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `saved_commodities` 6, `saved_markets` 3 |
| Offer-driven opportunities | ❌ | ❌ | ✅ | — | **PLANNED** | `/trade` never queries offer tables (INT-6) |
| Intraday candlesticks | — | ✅ | ❌ | — | **NOT SUPPORTED** | median-based summary; one observation/day |

## 4. Commercial offers

| Feature | UI | Code | Database | End-to-end | Status | Evidence |
|---|---|---|---|---|---|---|
| Buyer/seller offers | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | 15+15 rows |
| Verification workflow | ✅ | ✅ | ✅ | ✅ | **VERIFIED IN CODE** | `update_offer_status()`, staff-gated |
| Public verified-offer display | ✅ | ✅ | ✅ | ✅ | **VERIFIED IN DATABASE** | anon sees 3; owner 15 |
| Verification trail (public) | ✅ | ✅ | ✅ | ✅ | **VERIFIED IN CODE** | fixed by 0031; 18 events visible to anon |
| Offer expiry | — | ✅ | ✅ | — | **ARCHITECTURALLY DEFINED** | `expire_lapsed_offers()` never called (INT-1) |
| Offer → `/trade` integration | ❌ | ❌ | ✅ | — | **PLANNED** | INT-6 |

## 5. Field collection (agent app)

| Feature | UI | Code | Database | End-to-end | Status | Evidence |
|---|---|---|---|---|---|---|
| Assigned markets | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | 6 assignments |
| Observation draft | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | 7 drafts |
| Submission | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | 17 submitted |
| Evidence upload | ✅ | ✅ | ✅ | — | **VERIFIED IN CODE** | `price_observation_evidence` **empty**; bucket 0 objects |
| Correction requests | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | 6 `correction_requested` |
| Collection tasks | ✅ | ✅ | ❌ | — | **ARCHITECTURALLY DEFINED** | `collection_tasks` **empty** |
| Offline capture | — | — | ❌ | — | **PLANNED** | no service worker / sync queue found |

## 6. Verification and quality

| Feature | UI | Code | Database | End-to-end | Status | Evidence |
|---|---|---|---|---|---|---|
| Verification queue | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `/admin/verification`, 8 pending + 6 correction |
| Approve | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | `approve_observation()` |
| Publish | ✅ | ✅ | ✅ | — | **VERIFIED IN CODE** | 0 rows published |
| Reject | ✅ | ✅ | ✅ | ✅ | **FUNCTIONAL** | 9 rejected |
| Data-quality flags | ✅ | ✅ | ❌ | — | **ARCHITECTURALLY DEFINED** | `data_quality_flags` **empty** |
| Separation of duties | — | ✅ | ✅ | — | **VERIFIED IN CODE** | agent cannot verify; `approve_observation` staff-gated |

## 7. Admin operations

| Feature | Status | Evidence |
|---|---|---|
| 29-module Control Centre | **VERIFIED IN CODE** | all 29 routes exist |
| Market / commodity / grade / unit management | **VERIFIED IN CODE** | 29 modules |
| Assignment management | **VERIFIED IN CODE** | 6 rows |
| Customer + subscription management | **ARCHITECTURALLY DEFINED** | `customer_subscriptions` **empty** |
| API management | **ARCHITECTURALLY DEFINED** | `api_applications` **empty** |
| Export jobs | **ARCHITECTURALLY DEFINED** | `export_jobs` **empty** |
| Notification dispatch | **PARTIALLY IMPLEMENTED** | 64 rows, all `assignment_changed`; no provider |
| Audit viewer | **VERIFIED IN CODE** | 6 rows, `ip_hash` NULL |
| Analytics | **ARCHITECTURALLY DEFINED** | `analytics_snapshots` **empty** |
| System health | **VERIFIED IN CODE** | `/admin/system` |
| Global search | **VERIFIED IN CODE** | `/admin/search` |

## 8. Research and intelligence

| Feature | Status | Evidence |
|---|---|---|
| Research reports | **ARCHITECTURALLY DEFINED** | `market_reports` **empty** |
| Articles / insights | **ARCHITECTURALLY DEFINED** | `articles` **empty** |
| Market intelligence | **ARCHITECTURALLY DEFINED** | `observation_market_intelligence` **empty** |
| AI analyst | **PLANNED** | no AI SDK in `package.json` |

## 9. Capability assessment — A–G

| Capability | Schema | Data | UI | Verdict |
|---|---|---|---|---|
| **A — Markets Terminal** | ✅ | ⚠️ 11 markets, 0 published prices | ✅ | **ARCHITECTURALLY DEFINED** |
| **B — Commodity Intelligence** | ✅ | ⚠️ 58 obs / 16 commodities / 14 days | ✅ | **PARTIALLY IMPLEMENTED** |
| **C — Charts / Analytics** | ✅ median only | ⚠️ 14-day series | ✅ | **PARTIALLY IMPLEMENTED** — no OHLC |
| **D — Trade Intelligence** | ✅ | ❌ 0 published | ✅ | **ARCHITECTURALLY DEFINED** |
| **E — Fundamental Intelligence** | ✅ | ❌ all tables empty | ✅ | **ARCHITECTURALLY DEFINED** |
| **F — Personalisation** | ✅ | ⚠️ 6/3/4 rows, no prices | ✅ | **PARTIALLY IMPLEMENTED** |
| **G — Research / AI Analyst** | ✅ | ❌ all tables empty | ✅ | **ARCHITECTURALLY DEFINED** |

**Does observation frequency support each analytical method?** See
`PRICE_DATA_INTEGRITY_AUDIT.md` §6. Summary: B and C are supported thinly; **C's candlesticks are not
supported at all**; D is blocked on publication; E and G are blocked on data.

## 10. Branding

| Feature | Status | Evidence |
|---|---|---|
| Centralised brand identity | **VERIFIED IN CODE** | `src/lib/brand.ts` |
| User-facing name = Hatsi360 | **VERIFIED IN CODE** | `BRAND.name = 'Hatsi360'` |
| "Powered by Pluck Agro" subordinate | **VERIFIED IN CODE** | `BRAND.endorsement` |
| `package.json` identity | **BROKEN** | name `pluck-live`, description names Pluck Live |
| Legacy copy | **PARTIALLY** | 29 files still mention legacy names in docs/comments |

## 11. Cross-cutting

| Feature | Status | Evidence |
|---|---|---|
| TypeScript strict | **FUNCTIONAL** | `tsc --noEmit` exit 0 |
| Lint | **BROKEN** | `npm run lint` → `no such directory: lint` |
| Test suite | **PARTIALLY IMPLEMENTED** | 765 pass / **1 fail** / 28 skip |
| Production build | **FUNCTIONAL** | `next build` exit 0 |
| Image registry | **FUNCTIONAL** | 52/52 served, 0 duplicates |
| Offline support | **PLANNED** | none found |
