# Hatsi360 Complete Route Audit

**Stage 1 — Complete Website Audit**  
**Date:** 2026-11-14  
**Status:** COMPLETE  
**Total Routes:** 104 pages

---

## Route Inventory

### 1. Public Terminal — `(site)` — 38 routes

| Route | Purpose | Shell | Status | Notes |
|-------|---------|-------|--------|-------|
| `/` | Homepage | TerminalShell | ✅ | Recently redesigned |
| `/about` | About page | TerminalShell | ✅ | Editorial |
| `/api-docs` | API documentation | TerminalShell | ✅ | Editorial |
| `/api-policy` | API policy | TerminalShell | ✅ | Legal |
| `/charts` | Price charts | TerminalShell | ✅ | Data-heavy |
| `/commodities` | Commodity directory | TerminalShell | ✅ | Data-heavy |
| `/commodities/[slug]` | Commodity profile | TerminalShell | ✅ | Dynamic |
| `/compare` | Market comparisons | TerminalShell | ✅ | Data-heavy |
| `/contact` | Contact form | TerminalShell | ✅ | Form |
| `/cookies` | Cookie policy | TerminalShell | ✅ | Legal |
| `/coverage-report` | Coverage report | TerminalShell | ✅ | Data display |
| `/dashboard` | Customer workspace | TerminalShell | ⚠️ | Wrong page header (P0) |
| `/disclaimer` | Disclaimer | TerminalShell | ✅ | Legal |
| `/faq` | FAQs | TerminalShell | ✅ | Editorial |
| `/insights` | Market briefs | TerminalShell | ✅ | Editorial |
| `/insights/[slug]` | Brief detail | TerminalShell | ✅ | Dynamic editorial |
| `/markets` | Market directory | TerminalShell | ✅ | Data-heavy |
| `/markets/[slug]` | Market profile | TerminalShell | ✅ | Dynamic |
| `/methodology` | Methodology | TerminalShell | ✅ | Editorial |
| `/prices` | Live market watch | TerminalShell | ✅ | Data-heavy |
| `/prices/[commodity]` | Commodity prices | TerminalShell | ✅ | Dynamic |
| `/pricing` | Pricing plans | TerminalShell | ✅ | Editorial |
| `/privacy` | Privacy policy | TerminalShell | ✅ | Legal |
| `/reports` | Research reports | TerminalShell | ✅ | Editorial |
| `/reports/[slug]` | Report detail | TerminalShell | ✅ | Dynamic editorial |
| `/solutions` | Solutions page | TerminalShell | ✅ | Editorial |
| `/terms` | Terms of service | TerminalShell | ✅ | Legal |
| `/trade` | Trade overview | TerminalShell + Trade sub | ✅ | Trade sub-layout |
| `/trade/alerts` | Trade alerts | TerminalShell + Trade sub | ✅ | Authenticated |
| `/trade/best-buy` | Sourcing intelligence | TerminalShell + Trade sub | ✅ | Data-heavy |
| `/trade/best-sell` | Procurement intelligence | TerminalShell + Trade sub | ✅ | Data-heavy |
| `/trade/fundamentals` | Fundamental analysis | TerminalShell + Trade sub | ✅ | Data-heavy |
| `/trade/terminal` | Trade terminal | TerminalShell + Trade sub | ✅ | Authenticated |
| `/trade/watchlist` | Trade watchlist | TerminalShell + Trade sub | ✅ | Authenticated |

### 2. Auth Portal — `(portal)` — 4 routes

| Route | Purpose | Shell | Status |
|-------|---------|-------|--------|
| `/login` | Sign in | PortalFrame | ✅ |
| `/register` | Register | PortalFrame | ✅ |
| `/forgot-password` | Password recovery | PortalFrame | ✅ |
| `/reset-password` | Password reset | PortalFrame | ✅ |

### 3. Admin Control Centre — `admin` — 31 routes

| Route | Purpose | Shell | Status | Notes |
|-------|---------|-------|--------|-------|
| `/admin` | Redirect to overview | AdminShell | ✅ | |
| `/admin/overview` | Admin dashboard | AdminShell | ✅ | Data-heavy |
| `/admin/agents` | Agent management | AdminShell | ✅ | |
| `/admin/agents/[id]` | Agent detail | AdminShell | ✅ | Dynamic |
| `/admin/analytics` | Analytics | AdminShell | ✅ | |
| `/admin/api-management` | API keys | AdminShell | ✅ | |
| `/admin/assignments` | Assignments | AdminShell | ✅ | |
| `/admin/audit` | Audit log | AdminShell | ✅ | |
| `/admin/categories` | Categories | AdminShell | ✅ | |
| `/admin/commodities` | Commodities | AdminShell | ✅ | |
| `/admin/customers` | Customers | AdminShell | ✅ | |
| `/admin/exports` | Data exports | AdminShell | ✅ | |
| `/admin/grades` | Grades | AdminShell | ✅ | |
| `/admin/intelligence` | Intelligence hub | AdminShell | ✅ | |
| `/admin/intelligence/countries` | Countries | AdminShell | ✅ | |
| `/admin/intelligence/hs-codes` | HS codes | AdminShell | ✅ | |
| `/admin/intelligence/sources` | Sources | AdminShell | ✅ | |
| `/admin/intelligence/tariffs` | Tariffs | AdminShell | ✅ | |
| `/admin/intelligence/trade-blocs` | Trade blocs | AdminShell | ✅ | |
| `/admin/intelligence/trade-data` | Trade data | AdminShell | ✅ | |
| `/admin/intelligence/trade-intelligence` | Trade intelligence | AdminShell | ✅ | Data-heavy |
| `/admin/intelligence/trade-intelligence/commodities` | TI commodities | AdminShell | ✅ | Data-heavy |
| `/admin/intelligence/trade-intelligence/explorer` | TI explorer | AdminShell | ✅ | Data-heavy |
| `/admin/intelligence/trade-intelligence/partners` | TI partners | AdminShell | ✅ | |
| `/admin/markets` | Markets | AdminShell | ✅ | |
| `/admin/notifications` | Notifications | AdminShell | ✅ | |
| `/admin/observations` | Observations | AdminShell | ✅ | |
| `/admin/operations` | Operations | AdminShell | ✅ | |
| `/admin/quality` | Quality control | AdminShell | ✅ | |
| `/admin/reports` | Reports | AdminShell | ✅ | |
| `/admin/schedule` | Schedule | AdminShell | ✅ | |
| `/admin/search` | Search | AdminShell | ✅ | |
| `/admin/settings` | Settings | AdminShell | ✅ | |
| `/admin/subscriptions` | Subscriptions | AdminShell | ✅ | |
| `/admin/system` | System status | AdminShell | ✅ | |
| `/admin/tasks` | Tasks | AdminShell | ✅ | |
| `/admin/units` | Units | AdminShell | ✅ | |
| `/admin/verification` | Verification | AdminShell | ✅ | |
| `/admin/zones` | Zones | AdminShell | ✅ | |

### 4. Agent Field App — `agent` — 17 routes

| Route | Purpose | Shell | Status | Notes |
|-------|---------|-------|--------|-------|
| `/agent` | Redirect to home | AgentShell | ✅ | |
| `/agent/home` | Agent dashboard | AgentShell | ✅ | |
| `/agent/assignments` | Assignments | AgentShell | ✅ | |
| `/agent/assignments/[id]` | Assignment detail | AgentShell | ✅ | Dynamic |
| `/agent/collect` | Collection form | AgentShell | ✅ | Form |
| `/agent/collection/[id]` | Collection detail | AgentShell | ✅ | Dynamic |
| `/agent/collection/new` | New collection | AgentShell | ✅ | Form |
| `/agent/corrections` | Corrections | AgentShell | ✅ | |
| `/agent/help` | Help | AgentShell | ✅ | |
| `/agent/history` | History | AgentShell | ✅ | |
| `/agent/markets` | Markets | AgentShell | ✅ | |
| `/agent/markets/[id]` | Market detail | AgentShell | ✅ | Dynamic |
| `/agent/notifications` | Notifications | AgentShell | ✅ | |
| `/agent/observations` | Observations | AgentShell | ✅ | |
| `/agent/observations/[id]` | Observation detail | AgentShell | ✅ | Dynamic |
| `/agent/performance` | Performance | AgentShell | ✅ | |
| `/agent/profile` | Profile | AgentShell | ✅ | |
| `/agent/submissions` | Submissions | AgentShell | ✅ | |
| `/agent/tasks` | Tasks | AgentShell | ✅ | |

### 5. Intelligence — `intelligence` — 2 routes

| Route | Purpose | Shell | Status | Notes |
|-------|---------|-------|--------|-------|
| `/intelligence` | Intelligence hub | None ⚠️ | ⚠️ | No terminal shell (P0) |
| `/intelligence/[slug]` | Intelligence detail | None ⚠️ | ⚠️ | No terminal shell (P0) |

### 6. API Endpoints — `api` — 10 routes

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/agent/submit` | Agent submission | ✅ |
| `/api/auth/signout` | Sign out | ✅ |
| `/api/jobs/run` | Job runner | ✅ |
| `/api/notifications/read` | Mark read | ✅ |
| `/api/v1/[...path]` | Catch-all API | ✅ |
| `/api/v1/charts/commodity` | Candle data | ✅ |
| `/api/v1/commodities` | Commodities | ✅ |
| `/api/v1/markets` | Markets | ✅ |
| `/api/v1/prices/compare` | Price comparison | ✅ |
| `/api/v1/prices/history` | Price history | ✅ |
| `/api/v1/prices/latest` | Latest prices | ✅ |
| `/api/v1/reports` | Reports | ✅ |

---

## Route Status Summary

| Category | Routes | Issues |
|----------|--------|--------|
| **Public Terminal** | 38 | 1 P0 (dashboard) |
| **Auth Portal** | 4 | 0 |
| **Admin** | 31 | 0 |
| **Agent** | 17 | 0 |
| **Intelligence** | 2 | 2 P0 (no shell) |
| **API** | 12 | 0 |
| **Total** | **104** | **3 P0** |

---

## Shell Distribution

| Shell | Routes | Percentage |
|-------|--------|------------|
| TerminalShell | 38 | 37% |
| AdminShell | 31 | 30% |
| AgentShell | 17 | 16% |
| PortalFrame | 4 | 4% |
| No shell | 2 | 2% |
| API (no UI) | 12 | 11% |

---

## Route Types

| Type | Count | Examples |
|------|-------|----------|
| Static | 70 | `/about`, `/faq`, `/terms` |
| Dynamic | 17 | `/commodities/[slug]`, `/markets/[slug]` |
| Authenticated | 22 | `/trade/terminal`, `/dashboard`, admin routes |
| Form | 5 | `/contact`, `/agent/collect`, `/login` |
| Data-heavy | 15 | `/prices`, `/charts`, `/markets` |
| Editorial | 12 | `/insights`, `/reports`, `/methodology` |

---

## Navigation Hierarchy

```
Hatsi360 Platform
├── Public Site (TerminalShell)
│   ├── Homepage
│   ├── Markets
│   │   ├── Market Overview
│   │   ├── Live Market Watch
│   │   ├── Market Movers
│   │   └── Market Comparisons
│   ├── Commodities
│   │   ├── Commodity Directory
│   │   └── Commodity Profiles
│   ├── Trade
│   │   ├── Trade Overview
│   │   ├── Trade Terminal
│   │   ├── Sourcing Intelligence
│   │   └── Procurement Intelligence
│   ├── Analytics
│   │   ├── Price Charts
│   │   └── Collection Coverage
│   ├── Research
│   │   ├── Market Briefs
│   │   └── Research Reports
│   └── Platform
│       ├── About
│       ├── Pricing
│       ├── Developer API
│       └── Contact
├── Customer Workspace (TerminalShell)
│   └── Dashboard
├── Auth Portal (PortalFrame)
│   ├── Login
│   ├── Register
│   └── Password Recovery
├── Admin Control Centre (AdminShell)
│   ├── Overview
│   ├── Management (Agents, Customers, etc.)
│   ├── Data (Observations, Verification, etc.)
│   └── Intelligence
├── Agent Field App (AgentShell)
│   ├── Home
│   ├── Collection
│   ├── Assignments
│   └── Performance
└── Intelligence (No Shell) ⚠️
    ├── Intelligence Hub
    └── Intelligence Detail
```

---

## Key Findings

1. **Intelligence routes disconnected** — 2 routes have no shell, creating isolated experience
2. **Dashboard uses wrong header** — Uses editorial PageHero in terminal shell
3. **Trade sub-layout** — White navigation bar inside dark terminal creates visual break
4. **Strong route organization** — Clear separation of concerns across route groups
5. **Good coverage** — 104 routes covering all major platform functions

---

**Next Step:** Begin Stage 2 — Design System Consolidation
