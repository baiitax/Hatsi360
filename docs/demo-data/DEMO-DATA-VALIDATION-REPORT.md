# Hatsi360 — Data Visibility & Database Connectivity Audit

**Version:** 1.0
**Date:** 2026-11-15
**Project ref:** `umxzsdepbrenqysabtlt`

---

## 1. Architecture Overview

The Hatsi360 application has a **dual data source** architecture:

```
┌────────────────────────────────────────────────────────────────┐
│                     Pages & Components                         │
├────────────────────────────────────────────────────────────────┤
│  getDataSource()  ←  isSupabaseConfigured()                    │
│     │                                                          │
│     ├── TRUE  →  supabaseSource  →  PostgreSQL (Supabase)      │
│     │                    │                                     │
│     │                    ├── published_price_observations view │
│     │                    ├── commodities, markets, states      │
│     │                    └── admin: price_observations, tasks  │
│     │                                                          │
│     └── FALSE →  fixtureSource   →  Historical dataset (JSON)  │
│                         (28 legacy observations)               │
└────────────────────────────────────────────────────────────────┘
```

**Critical finding:** When `NEXT_PUBLIC_SUPABASE_URL` is not set on Vercel, ALL pages fall back to the **fixture dataset** (28 legacy observations). The live site currently shows fixture data because this environment variable is not configured.

---

## 2. Public Pages — Data Sources & Visibility

### 2.1 Homepage (`/`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Published observation count | `published_price_observations` view | `SELECT count(*)` | ✅ 238 visible |
| Commodity count | `commodities` table | `listCommodities()` | ✅ 22 commodities |
| Market count | `markets` table | `listMarkets()` | ✅ 11 markets |
| Latest prices | `published_price_observations` | `listObservations()` | ✅ 10 commodities |
| Price tracker data | `published_price_observations` | Analysis queries | ✅ Movements computed |
| Leaderboard | `published_price_observations` | Daily history computation | ✅ All tracked |

**Supabase config gate:** `isSupabaseConfigured()` — returns fixture data if not set.

### 2.2 Trade Intelligence (`/trade`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Market movements (40) | `published_price_observations` | `getMarketMovements(40)` | ✅ 10 commodities with movements |
| Commodity freshness | `published_price_observations` | `getCommodityFreshness()` | ✅ All assessed |
| Market watch table | `published_price_observations` | Via movements | ✅ Full table |
| Market overview cards | `published_price_observations` | Via movements | ✅ Movers visible |

**Supabase config gate:** Yes. Falls back to empty arrays.

### 2.3 Trading Terminal (`/trade/terminal`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Commodity list | `commodities` table | `listCommodities()` | ✅ 22 commodities |
| Market list | `markets` table | `listMarkets()` | ✅ 11 markets |
| Candlestick chart | `published_price_observations` | `getCommoditySeries()` | ✅ Charts render with data |
| Observation count | `published_price_observations` | Via series | ✅ Counts shown |
| Best buy/sell | `published_price_observations` | `getCommodityOpportunities()` | ✅ Opportunities computed |

**Supabase config gate:** Yes. Falls back to empty state.

### 2.4 Best Buy / Best Sell (`/trade/best-buy`, `/trade/best-sell`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Opportunity computations | `published_price_observations` | `getCommodityOpportunities()` | ✅ Spread analysis |

### 2.5 Trade Watchlist (`/trade/watchlist`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Watchlist data | `published_price_observations` | Analysis queries | ✅ Requires auth |

### 2.6 Trade Alerts (`/trade/alerts`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Alert data | `published_price_observations` | Analysis queries | ✅ Requires auth |

### 2.7 Trade Fundamentals (`/trade/fundamentals`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Fundamental data | `published_price_observations` | Analysis queries | ✅ Analysis visible |

### 2.8 Commodity Directory (`/commodities`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Commodity list | `commodities` table | `listCommodities()` | ✅ 22 commodities |
| Categories | `commodity_categories` table | `listCategories()` | ✅ 14 categories |
| Freshness indicators | `published_price_observations` | `getCommodityFreshness()` | ✅ All 22 assessed |

### 2.9 Commodity Detail (`/commodities/[slug]`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Commodity info | `commodities` table | `getCommodityBySlug()` | ✅ Full detail |
| Price history | `published_price_observations` | `listObservationsForAnalysis()` | ✅ Chart data |
| Market breakdown | `published_price_observations` | Via observations | ✅ Per-market prices |

### 2.10 Dashboard (`/dashboard`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| User watchlists | `price_observations` (via RLS) | `createClient()` | ✅ Requires auth |
| API keys | `api_keys` table | `createClient()` | ✅ Requires auth |

### 2.11 Intelligence Pages (`/intelligence`, `/intelligence/[slug]`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Intelligence reports | `content_audit_settings` | Supabase query | ⚠️ No demo content |

### 2.12 API Docs (`/api-docs`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| API documentation | Static + `api_keys` | `createClient()` | ⚠️ Requires auth |

---

## 3. Admin Pages — Data Sources & Visibility

All admin pages require staff authentication via `requireStaff()`.

### 3.1 Verification Queue (`/admin/verification`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Pending observations | `price_observations` (direct) | `.from('price_observations')` | ✅ 61 pending/submitted |
| Verified observations | `price_observations` (direct) | `.eq('verification_status', 'verified')` | ✅ 238 verified |
| Agent names | `profiles` table | Lookup | ✅ 6 named profiles |
| Quality flags | `quality_flags` column | Direct column | ✅ Visible |

**Key:** This page reads `price_observations` DIRECTLY (not via view), so ALL observations including pending_verification are visible.

### 3.2 Agent Detail (`/admin/agents/[id]`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Agent profile | `profiles` + `agent_profiles` | `getAgentRecord()` | ✅ Full profile |
| Task history | `collection_tasks` | Via agent ID | ✅ 45 demo tasks |
| Submitted observations | `price_observations` | Via agent_user_id | ⚠️ Observations don't have agent_user_id set |
| Visit records | `market_visit_records` | Via agent_user_id | ✅ 8 demo visits |

### 3.3 Customers (`/admin/customers`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Customer list | `profiles` (filtered) | `listCustomers()` | ✅ 1 customer (Chidi Okafor) |
| Entitlements | Entitlements table | `listEntitlementTiers()` | ⚠️ No demo entitlements |

### 3.4 Commodities Admin (`/admin/commodities`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Commodity list | `commodities` table | Direct query | ✅ 22 commodities |
| Grades | `commodity_grades` table | Direct query | ✅ 58 grades |

### 3.5 Intelligence Admin Pages
| Page | Source | Demo Data |
|------|--------|-----------|
| `/admin/intelligence/sources` | `data_sources` table | ⚠️ No demo sources |
| `/admin/intelligence/tariffs` | `tariff_schedules` table | ⚠️ No demo tariffs |
| `/admin/intelligence/trade-data` | Trade data tables | ⚠️ No demo trade data |
| `/admin/intelligence/trade-intelligence/*` | Analytics tables | ⚠️ No demo intelligence |

### 3.6 API Management (`/admin/api-management`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| API keys | `api_keys` table | `createClient()` | ⚠️ No demo API keys |

### 3.7 Subscriptions (`/admin/subscriptions`)
| Data Point | Source | Query | Demo Data Visible? |
|-----------|--------|-------|-------------------|
| Subscriptions | Subscriptions tables | `createClient()` | ⚠️ No demo subscriptions |

---

## 4. API Routes — Data Sources

| Route | Auth | Source | Demo Data |
|-------|------|--------|-----------|
| `/api/agent/submit` | Agent JWT | `price_observations` INSERT | ✅ Creates observations |
| `/api/auth/signout` | Any | Auth signout | N/A |
| `/api/notifications/read` | Authenticated | `notifications` UPDATE | ✅ Demo notifications exist |
| `/api/v1/intelligence/production` | API key | Intelligence tables | ⚠️ No demo data |
| `/api/v1/intelligence/sync` | API key | Intelligence tables | ⚠️ No demo data |
| `/api/v1/intelligence/trade` | API key | Trade tables | ⚠️ No demo data |
| `/api/v1/trade/intelligence/*` | API key | Trade intelligence | ⚠️ No demo data |

---

## 5. Critical Findings

### 5.1 🔴 Vercel Environment Variables Missing

The live site at `hatsi360-app.vercel.app` shows **fixture data** (28 legacy observations) because `NEXT_PUBLIC_SUPABASE_URL` is not configured in Vercel.

**Fix required:** Add to Vercel project environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://umxzsdepbrenqysabtlt.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_Fp5qAu3ennK9REnnqP1qSw_Pd8rQxqS`

### 5.2 🟡 Agent User IDs Not Set on Observations

The 299 demo price observations were inserted via SQL without `agent_user_id`. The admin agent detail page (`/admin/agents/[id]`) queries observations by `agent_user_id`, so it will show 0 observations per agent.

**Fix:** Update observations to link to agents based on market assignment.

### 5.3 🟡 No Demo Data for Intelligence/Trade Modules

The intelligence, tariffs, trade data, and subscriptions modules have no demo data. These pages will show empty states.

### 5.4 🟢 Published View Works Correctly

When Supabase is configured, all public pages correctly query `published_price_observations` which returns 238 verified observations across 10 commodities and 9 markets.

---

## 6. Data Flow Diagram

```
PUBLIC PAGES                        ADMIN PAGES
     │                                  │
     ▼                                  ▼
getDataSource()                 createClient() (authenticated)
     │                                  │
     ▼                                  ▼
supabaseSource                    Direct table access
     │                             (price_observations,
     ▼                              collection_tasks,
published_price_observations        agent_profiles,
 (VIEW)                             notifications)
     │
     ├── source_system <> 'test_fixture'
     ├── verification_status = 'verified'
     └── published_at IS NOT NULL
```

---

## 7. Demo Data Summary

| Resource | Count | Where Visible |
|----------|-------|---------------|
| Price observations (published) | 238 | Homepage, Trade, Commodities, Terminal |
| Price observations (pending) | 61 | Verification queue only |
| Market visit records | 8 | Agent detail page |
| Collection tasks | 45 | Agent detail, verification |
| Notifications | 11 | Notification bell (authenticated) |
| Analytics snapshots | 5 | Dashboard (future) |
| User profiles | 10 | Admin pages |
| Organizations | 5 | Admin, customer pages |
| Agent profiles | 5 | Agent management |

---

## 8. Recommendations

1. **IMMEDIATE:** Configure Supabase env vars on Vercel to show real data
2. **HIGH:** Update `agent_user_id` on demo observations to link to agents
3. **MEDIUM:** Add demo data for intelligence/trade modules
4. **LOW:** Add demo API keys and subscriptions for admin testing
