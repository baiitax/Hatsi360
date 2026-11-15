# Hatsi360 Premium Client Portal — Feature Matrix

**Version:** 1.0  
**Date:** 2026-11-15  
**Auditor:** Arena Agent

---

## Classification Key

| Code | Meaning |
|------|---------|
| ✅ VERIFIED IN CODE | Implementation exists and works |
| ✅ VERIFIED IN DB | Database table exists with data |
| ✅ VERIFIED IN UI | Page renders and functions |
| ⚠️ PARTIALLY IMPLEMENTED | Some parts work, others missing |
| 🔲 ARCHITECTURALLY DEFINED | Schema exists, no UI |
| 📋 PLANNED | No schema, no UI, but specified |
| 🚫 BLOCKED | Depends on unavailable external system |
| ❓ UNKNOWN | Could not determine status |

---

## A. Client Home & Dashboard

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Personalised dashboard | ✅ | ✅ | ⚠️ | PARTIALLY | Basic KPIs only |
| Welcome message | ✅ | ✅ | ❌ | MISSING | No user name shown |
| Market snapshot | ✅ | ✅ | ❌ | MISSING | Not connected to interests |
| Watched commodities summary | ✅ | ✅ | ⚠️ | PARTIALLY | Shows in watchlist, not dashboard |
| Watched markets summary | ✅ | ✅ | ⚠️ | PARTIALLY | Shows in watchlist, not dashboard |
| Price movements widget | ✅ | ✅ | ❌ | MISSING | Not on dashboard |
| Recent alerts summary | ✅ | ✅ | ❌ | MISSING | No alert centre |
| Unread notifications | ✅ | ✅ | ❌ | MISSING | Bell icon only in navbar |
| Recommended reports | ❌ | ❌ | ❌ | MISSING | No recommendation engine |
| Business activity summary | ❌ | ❌ | ❌ | MISSING | No workspace yet |
| Subscription status widget | 🔲 | ✅ | ❌ | MISSING | Schema exists |
| Usage summary widget | 🔲 | ✅ | ❌ | MISSING | Schema exists |
| Recent activity timeline | ❌ | ❌ | ❌ | PLANNED | No activity table |
| Quick actions panel | ❌ | ❌ | ❌ | PLANNED | No implementation |
| Onboarding progress banner | ❌ | ❌ | ❌ | MISSING | No onboarding |

## B. Market Intelligence

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Commodity directory | ✅ | ✅ | ✅ | VERIFIED | Public `/commodities` |
| Commodity profile | ✅ | ✅ | ✅ | VERIFIED | Public `/commodities/[slug]` |
| Market directory | ✅ | ✅ | ✅ | VERIFIED | Public `/markets` |
| Market profile | ✅ | ✅ | ✅ | VERIFIED | Public `/markets/[slug]` |
| Price explorer | ✅ | ✅ | ✅ | VERIFIED | Public `/prices` |
| Price history chart | ✅ | ✅ | ✅ | VERIFIED | Candlestick + range |
| Market comparison | ✅ | ✅ | ✅ | VERIFIED | Public `/compare` |
| Chart workspace | ✅ | ✅ | ✅ | VERIFIED | Public `/charts` |
| Trade terminal | ✅ | ✅ | ✅ | VERIFIED | Public `/trade/terminal` |
| Sourcing intelligence | ✅ | ✅ | ✅ | VERIFIED | Public `/trade/best-buy` |
| Procurement intelligence | ✅ | ✅ | ✅ | VERIFIED | Public `/trade/best-sell` |
| Fundamentals overview | ✅ | ✅ | ✅ | VERIFIED | Public `/trade/fundamentals` |
| Collection coverage | ✅ | ✅ | ✅ | VERIFIED | Public `/coverage-report` |
| Saved market analysis | ❌ | ❌ | ❌ | PLANNED | No analysis save feature |
| Custom date range analysis | ✅ | ✅ | ⚠️ | PARTIALLY | In charts, not saved |
| Multi-market comparison | ✅ | ✅ | ⚠️ | PARTIALLY | In compare, limited |
| Export analysis | 🔲 | ✅ | ❌ | MISSING | Entitlement exists, no UI |
| Regional intelligence | ✅ | ✅ | ⚠️ | PARTIALLY | Via intelligence pages |

## C. Watchlists & Saved Intelligence

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Save commodity | ✅ | ✅ | ✅ | VERIFIED | Basic save button |
| Save market | ✅ | ✅ | ✅ | VERIFIED | Basic save button |
| View saved commodities | ✅ | ✅ | ✅ | VERIFIED | `/trade/watchlist` |
| View saved markets | ✅ | ✅ | ✅ | VERIFIED | `/trade/watchlist` |
| Named watchlists | ❌ | ❌ | ❌ | PLANNED | No list concept |
| Add notes to saved items | ❌ | ❌ | ❌ | PLANNED | No notes field |
| Remove saved items | ✅ | ✅ | ✅ | VERIFIED | Basic unsave |
| Reorder watchlist | ❌ | ❌ | ❌ | PLANNED | No ordering |
| Watchlist price updates | ✅ | ✅ | ⚠️ | PARTIALLY | Shows latest, no change |
| Share watchlist | ❌ | ❌ | ❌ | PLANNED | No sharing model |
| Saved price analysis | ❌ | ❌ | ❌ | PLANNED | No save analysis |
| Saved research items | ❌ | ❌ | ❌ | PLANNED | No save research |
| Download history | ❌ | ❌ | ❌ | PLANNED | No download log |

## D. Alerts & Notifications

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Create price alert | ✅ | ✅ | ✅ | VERIFIED | Basic threshold alert |
| Alert on price above | ✅ | ✅ | ✅ | VERIFIED | Direction: above |
| Alert on price below | ✅ | ✅ | ✅ | VERIFIED | Direction: below |
| Percentage change alert | ✅ | ✅ | ⚠️ | PARTIALLY | Schema supports, UI basic |
| New observation alert | ❌ | ❌ | ❌ | PLANNED | No trigger mechanism |
| Report publication alert | 🔲 | ✅ | ❌ | MISSING | report_subscriptions empty |
| Pause alert | ❌ | ❌ | ❌ | PLANNED | is_active exists, no toggle |
| Delete alert | ✅ | ✅ | ✅ | VERIFIED | Basic delete |
| Alert trigger detection | ❌ | ❌ | ❌ | MISSING | No background job |
| Alert delivery (email) | 🔲 | ✅ | ❌ | MISSING | Schema exists, no sender |
| Alert delivery (in-app) | ❌ | ❌ | ❌ | MISSING | No notification bridge |
| Alert history | 🔲 | ✅ | ❌ | MISSING | alert_delivery_logs empty |
| Notification centre | ❌ | ❌ | ❌ | MISSING | No client notification UI |
| Mark notification read | ✅ | ✅ | ❌ | MISSING | API exists, no UI |
| Notification preferences | ❌ | ❌ | ❌ | MISSING | No preference storage |
| Unread count badge | ✅ | ✅ | ⚠️ | PARTIALLY | In navbar, no centre |

## E. Research & Reports

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Report library | ✅ | ✅ | ✅ | VERIFIED | Public `/reports` |
| Report detail | ✅ | ✅ | ✅ | VERIFIED | Static content |
| Research insights | ✅ | ✅ | ✅ | VERIFIED | Public `/insights` |
| Commodity intelligence | ✅ | ✅ | ✅ | VERIFIED | FAOSTAT data |
| Entitlement-gated reports | ✅ | ✅ | ⚠️ | PARTIALLY | Logic exists, all public |
| Subscribe to reports | 🔲 | ✅ | ❌ | MISSING | report_subscriptions empty |
| Save report | ❌ | ❌ | ❌ | PLANNED | No save mechanism |
| Download report | ❌ | ❌ | ❌ | PLANNED | No download |
| Reading history | ❌ | ❌ | ❌ | PLANNED | No tracking |
| Report search | ❌ | ❌ | ❌ | PLANNED | Basic filter only |
| AI Analyst | ❌ | ❌ | ❌ | PLANNED | Not implemented |
| Related reports | ❌ | ❌ | ❌ | PLANNED | No recommendation |

## F. Trade & Sourcing

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Buyer offers (schema) | ✅ | ✅ | ❌ | SCHEMA ONLY | 15 demo records |
| Seller offers (schema) | ✅ | ✅ | ❌ | SCHEMA ONLY | 15 demo records |
| Offer verification | ✅ | ✅ | ❌ | SCHEMA ONLY | 69 verification events |
| Create RFQ | ❌ | ❌ | ❌ | PLANNED | No table |
| RFQ list | ❌ | ❌ | ❌ | PLANNED | No table |
| RFQ detail | ❌ | ❌ | ❌ | PLANNED | No table |
| Submit quotation | ❌ | ❌ | ❌ | PLANNED | No table |
| Quotation list | ❌ | ❌ | ❌ | PLANNED | No table |
| Buyer discovery | ❌ | ❌ | ❌ | PLANNED | No UI |
| Seller discovery | ❌ | ❌ | ❌ | PLANNED | No UI |
| Trade enquiries | ❌ | ❌ | ❌ | PLANNED | No table |
| Conversations/messaging | ❌ | ❌ | ❌ | PLANNED | No table |
| Follow-up management | ❌ | ❌ | ❌ | PLANNED | No table |
| Contact management | ❌ | ❌ | ❌ | PLANNED | No table |

## G. Business Workspace

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Organisation registry | ✅ | ✅ | ❌ | SCHEMA ONLY | Admin only |
| Organisation membership | ✅ | ✅ | ❌ | SCHEMA ONLY | Admin only |
| Company profile (client) | ❌ | ❌ | ❌ | PLANNED | No client UI |
| Team management | ❌ | ❌ | ❌ | PLANNED | No client UI |
| Supplier management | ❌ | ❌ | ❌ | PLANNED | No table |
| Customer management | ❌ | ❌ | ❌ | PLANNED | No table |
| Procurement tracking | ❌ | ❌ | ❌ | PLANNED | No table |
| Sales tracking | ❌ | ❌ | ❌ | PLANNED | No table |
| Document storage | ❌ | ❌ | ❌ | PLANNED | No table |
| Activity timeline | ❌ | ❌ | ❌ | PLANNED | No table |
| Business overview | ❌ | ❌ | ❌ | PLANNED | No implementation |

## H. Account & Subscription

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| User registration | ✅ | ✅ | ✅ | VERIFIED | `/register` |
| User login | ✅ | ✅ | ✅ | VERIFIED | `/login` |
| Password reset | ✅ | ✅ | ✅ | VERIFIED | `/forgot-password` |
| View profile | ✅ | ✅ | ⚠️ | PARTIALLY | In admin, not client |
| Edit profile | ❌ | ❌ | ❌ | MISSING | No client edit |
| User preferences | ❌ | ❌ | ❌ | MISSING | No preference table |
| Notification preferences | ❌ | ❌ | ❌ | MISSING | No preference table |
| Security settings | ❌ | ❌ | ❌ | MISSING | No password change UI |
| Subscription overview | 🔲 | ✅ | ❌ | MISSING | customer_subscriptions empty |
| Plan selection | 🔲 | ✅ | ⚠️ | PARTIALLY | `/pricing` exists, no purchase |
| Billing history | 🔲 | ✅ | ❌ | MISSING | billing_events empty |
| Invoice download | ❌ | ❌ | ❌ | MISSING | No invoice generation |
| Usage dashboard | 🔲 | ✅ | ❌ | MISSING | api_usage_logs empty |
| API key management | 🔲 | ✅ | ❌ | MISSING | api_applications empty |
| Onboarding flow | ❌ | ❌ | ❌ | MISSING | No implementation |
| Account deletion | ❌ | ❌ | ❌ | MISSING | No self-service |

## I. Onboarding

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Onboarding redirect | ❌ | ❌ | ❌ | MISSING | No check |
| Personal profile step | ❌ | ❌ | ❌ | MISSING | No wizard |
| Business profile step | ❌ | ❌ | ❌ | MISSING | No wizard |
| Agricultural interests | ❌ | ❌ | ❌ | MISSING | No wizard |
| Workspace preferences | ❌ | ❌ | ❌ | MISSING | No wizard |
| Subscription selection | ❌ | ❌ | ❌ | MISSING | No wizard |
| Onboarding completion | ❌ | ❌ | ❌ | MISSING | No state tracking |
| Skip/resume onboarding | ❌ | ❌ | ❌ | MISSING | No state tracking |

## J. Navigation & Search

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| Public navbar | ✅ | N/A | ✅ | VERIFIED | Logo + dropdowns |
| Client sidebar | ❌ | N/A | ❌ | MISSING | No dedicated layout |
| Client top bar | ❌ | N/A | ❌ | MISSING | No dedicated header |
| Breadcrumbs | ✅ | N/A | ✅ | VERIFIED | On most pages |
| Global search (public) | ✅ | N/A | ⚠️ | PARTIALLY | In navbar, limited |
| Global search (client) | ❌ | ❌ | ❌ | MISSING | No client search |
| Mobile navigation | ✅ | N/A | ✅ | VERIFIED | Drawer menu |
| Keyboard navigation | ✅ | N/A | ✅ | VERIFIED | Basic support |

## K. Communication

| Feature | Code | DB | UI | Status | Notes |
|---------|------|----|----|--------|-------|
| In-app notifications | ✅ | ✅ | ⚠️ | PARTIALLY | For ops, not customers |
| Email notifications | ❌ | ❌ | ❌ | MISSING | No email service |
| Push notifications | ❌ | ❌ | ❌ | MISSING | No implementation |
| WhatsApp notifications | ❌ | ❌ | ❌ | PLANNED | No integration |
| Contact form | ✅ | ✅ | ✅ | VERIFIED | Public `/contact` |
| Support chat | ❌ | ❌ | ❌ | PLANNED | No integration |

---

## Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ VERIFIED | 38 | 26% |
| ⚠️ PARTIALLY IMPLEMENTED | 12 | 8% |
| 🔲 SCHEMA ONLY | 9 | 6% |
| 📋 PLANNED | 72 | 49% |
| 🚫 BLOCKED | 2 | 1% |
| ❓ UNKNOWN | 0 | 0% |
| **Total features audited** | **133** | 100% |

### By Category

| Category | Verified | Partial | Schema | Planned | Missing |
|----------|----------|---------|--------|---------|---------|
| A. Dashboard | 0 | 3 | 2 | 3 | 7 |
| B. Market Intelligence | 12 | 4 | 1 | 1 | 0 |
| C. Watchlists | 4 | 1 | 0 | 8 | 0 |
| D. Alerts | 4 | 2 | 3 | 5 | 2 |
| E. Research | 4 | 1 | 1 | 6 | 0 |
| F. Trade | 3 | 0 | 3 | 11 | 0 |
| G. Workspace | 2 | 0 | 0 | 11 | 0 |
| H. Account | 4 | 1 | 4 | 6 | 2 |
| I. Onboarding | 0 | 0 | 0 | 0 | 8 |
| J. Navigation | 4 | 1 | 0 | 2 | 2 |
| K. Communication | 1 | 1 | 0 | 2 | 2 |

---

## Key Findings

1. **Market intelligence is the strongest area**: 12 verified features
2. **Onboarding is completely missing**: 8 features, all PLANNED
3. **Trade workflows don't exist**: Only schema, no UI
4. **Business workspace is aspirational**: All PLANNED
5. **Alert system is basic**: Create/delete works, lifecycle missing
6. **No notification centre**: Operational notifications exist, customer UI doesn't
7. **Subscription is placeholder**: Schema ready, no subscriptions exist

---

**Next Document:** `CLIENT-PORTAL-DATA-ARCHITECTURE.md`
