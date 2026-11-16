# Hatsi360 Customer Dashboard — Data Source Map

**Document Version:** 1.0  
**Created:** 2026-01-XX  
**Purpose:** Map of all data sources used by the customer dashboard

---

## Primary Data Sources

### Database Tables (via Supabase)

| Table | Used By | Access Pattern |
|-------|---------|----------------|
| `profiles` | Layout, Dashboard, Account | Single row by user_id |
| `commodities` | Commodities page, Dashboard, Analytics | Full list with filters |
| `markets` | Markets page, Dashboard | Active markets list |
| `price_observations` | Analytics, Dashboard chart | Filtered by date range, commodity, market |
| `saved_commodities` | Watchlists, Dashboard, Commodities | User-scoped CRUD |
| `saved_markets` | Watchlists, Markets | User-scoped CRUD |
| `price_alerts` | Alerts page, Dashboard stats | User-scoped CRUD |
| `alert_trigger_logs` | Dashboard activity, Alerts history | User-scoped read |
| `notifications` | Notifications page, Header badge | User-scoped read/update |
| `market_reports` | Research page, Dashboard reports | Public read, premium gated |
| `report_subscriptions` | Research page | User-scoped |
| `customer_subscriptions` | Subscription page, Layout entitlements | User-scoped |
| `entitlement_catalog` | Sidebar filtering | Read-only reference |

### Database Views

| View | Used By | Purpose |
|------|---------|---------|
| `latest_market_prices` | Dashboard, Commodities | Latest price per commodity |
| `published_price_observations` | Analytics | Verified prices only |
| `analytics_commodity_overview` | Analytics | Cross-dimensional analysis |
| `analytics_intelligence_dashboard` | Analytics | Unified intelligence view |

### RPC Functions

| Function | Used By | Purpose |
|----------|---------|---------|
| `user_entitlements()` | Layout, entitlement checks | Returns user's entitlement keys |
| `has_entitlement(key)` | Server actions | Boolean check for specific entitlement |

---

## Data Flow Per Page

### Dashboard Overview
```
profiles → user name, onboarding status
saved_commodities → count, watchlist preview (limit 6)
price_alerts → active count
notifications → unread count
markets → active count
latest_market_prices → recent prices (limit 6)
price_observations → 30-day trend for chart
alert_trigger_logs → recent activity (limit 5)
market_reports → latest reports (limit 4)
```

### Analytics
```
commodities → selector options
markets → selector options
price_observations → filtered by commodity, market, date range
```

### Commodities
```
commodities → full list with images
saved_commodities → saved status per commodity
latest_market_prices → latest price per commodity
```

### Markets
```
markets → full active list
saved_markets → saved status per market
latest_market_prices → prices grouped by market
```

### Watchlists
```
saved_commodities + commodities → commodity watchlist
saved_markets + markets → market watchlist
```

### Alerts
```
price_alerts + commodities + markets → user's alerts
alert_trigger_logs → alert history
```

### Research
```
market_reports → all published reports
report_subscriptions → user's subscriptions
```

### Notifications
```
notifications → all user notifications
```

### Subscription
```
customer_subscriptions → current plan
entitlement_catalog → available entitlements
```

---

## External Data Sources

### Static Assets
| Path | Purpose |
|------|---------|
| `/brand/hatsi360-logo-horizontal-light.png` | Sidebar logo (light variant) |
| `/images/hatsi360/commodities/*.jpg` | Commodity images |
| `/images/hatsi360/agriculture/*.jpg` | Agriculture hero images |

### Libraries
| Library | Purpose |
|---------|---------|
| `recharts` | Interactive charts in Analytics |
| `lucide-react` | Icon system |
| `@supabase/supabase-js` | Database client |

---

## Data Freshness

| Data | Refresh Strategy | Cache |
|------|-----------------|-------|
| Prices | Real-time (latest observation) | 5 min |
| Observations | Historical, append-only | No cache |
| Commodities | Static catalog | 1 hour |
| Markets | Static catalog | 1 hour |
| Reports | Published, append-only | 15 min |
| User data | Real-time | No cache |

---

## Data Validation Rules

1. **Prices**: Must have `median_price IS NOT NULL`
2. **Observations**: Must have `observed_on` within date range
3. **Reports**: Must have `published_at IS NOT NULL` for public access
4. **Alerts**: Must belong to current user (`user_id = auth.uid()`)
5. **Saved items**: Unique constraint on `(user_id, commodity_id/market_id)`

---

## Entitlement-Gated Data

| Feature | Required Entitlement | Enforcement |
|---------|---------------------|-------------|
| Save commodities/markets | `watchlists` | RLS + UI check |
| Create price alerts | `alerts` | RLS + UI check |
| Export data | `exports` | Server action check |
| Premium reports | `reports` | RLS + UI check |
| API access | `api` | API key validation |
| Bulk operations | `bulk` | Server action check |
