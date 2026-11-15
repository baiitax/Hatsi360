# Hatsi360 Premium Client Portal — UX Issue Register

**Version:** 1.0  
**Date:** 2026-11-15  
**Auditor:** Arena Agent

---

## 1. Overview

This register documents UX issues discovered during the client portal audit. Issues are categorised by severity and mapped to proposed remediation.

**Severity Levels:**
- 🔴 **Critical**: Blocks core customer journey
- 🟡 **Major**: Degrades experience significantly
- 🟢 **Minor**: Cosmetic or convenience issue
- 🔵 **Enhancement**: Opportunity for improvement

---

## 2. Navigation & Information Architecture

### UX-001: No Dedicated Client Portal Navigation 🔴

**Issue:** Client-facing authenticated pages are mixed with public pages in the `(site)` route group. No sidebar, no client-specific navigation structure.

**Impact:** Premium customers cannot quickly access their saved items, alerts, account settings, or business workspace.

**Location:** `src/app/(site)/`

**Remediation:** Create `(client)` route group with dedicated layout, sidebar navigation, and client header.

---

### UX-002: Dashboard Is Not Personalised 🟡

**Issue:** `/dashboard` shows generic KPIs, not content based on customer interests, saved items, or activity.

**Impact:** New customers land on an unhelpful page with no guidance.

**Location:** `src/app/(site)/dashboard/page.tsx`

**Remediation:** Build personalised client home with:
- Welcome message with user name
- Market snapshot based on saved commodities/markets
- Recent activity timeline
- Recommended actions
- Subscription status

---

### UX-003: No Onboarding Flow 🔴

**Issue:** New customers are dropped directly onto the dashboard with no guidance, no profile completion, no interest selection.

**Impact:** Customers don't understand what to do next, don't set up their workspace, churn quickly.

**Location:** Nowhere (missing feature)

**Remediation:** Create progressive onboarding wizard:
1. Personal profile
2. Business profile
3. Agricultural interests (commodities, markets)
4. Workspace preferences
5. Subscription selection

---

### UX-004: No Account Settings Pages 🔴

**Issue:** Customers cannot edit their profile, change preferences, manage notification settings, or update security.

**Impact:** Customers cannot personalise their experience or manage their account.

**Location:** Nowhere (missing feature)

**Remediation:** Create account settings section:
- `/client/account/profile` — Edit name, phone, avatar
- `/client/account/preferences` — Currency, units, theme
- `/client/account/notifications` — Alert channels, frequencies
- `/client/account/security` — Password change, 2FA

---

### UX-005: No Subscription Management UI 🟡

**Issue:** Customers cannot view their subscription status, see what's included, manage billing, or upgrade.

**Impact:** Customers don't understand their entitlements, cannot self-serve subscription changes.

**Location:** Nowhere (missing feature, schema exists)

**Remediation:** Create subscription section:
- `/client/subscription` — Current plan, status, renewal date
- `/client/subscription/plans` — Available plans, comparison
- `/client/subscription/billing` — Payment history (when configured)
- `/client/subscription/usage` — Usage meters, limits

---

## 3. Watchlists & Alerts

### UX-006: Watchlist Is Flat (No Named Lists) 🟡

**Issue:** Saved commodities and markets are in a single undifferentiated list. Cannot create named watchlists like "Northern Markets" or "Export Commodities".

**Impact:** Customers with diverse interests cannot organise their saved items.

**Location:** `src/app/(site)/trade/watchlist/page.tsx`

**Remediation:** Implement named watchlists:
- Create/rename/delete watchlists
- Add items to specific watchlists
- Reorder watchlists
- View watchlist-specific alerts

---

### UX-007: Cannot Add Notes to Saved Items 🟢

**Issue:** When saving a commodity or market, cannot attach a note explaining why it was saved.

**Impact:** Customers forget why they saved items, context is lost.

**Location:** `saved_commodities.note` and `saved_markets.note` columns exist but no UI

**Remediation:** Add "Add note" option when saving, editable later.

---

### UX-008: Alert Builder Is Basic 🟡

**Issue:** Alert creation only supports simple threshold alerts. Cannot set percentage change alerts, cannot select notification channel, cannot set comparison period.

**Impact:** Alerts are inflexible, don't match sophisticated customer needs.

**Location:** `src/app/(site)/trade/alerts/page.tsx`

**Remediation:** Enhance alert builder:
- Percentage change alerts
- Channel selection (email, in-app, push)
- Comparison period selection
- Alert scheduling (pause/resume)

---

### UX-009: No Alert History or Trigger Visibility 🟡

**Issue:** Cannot see when alerts were triggered, what price triggered them, or delivery status.

**Impact:** Customers don't know if alerts are working, cannot review historical triggers.

**Location:** `alert_delivery_logs` table exists but no UI

**Remediation:** Add alert history section showing:
- Trigger timestamp
- Triggering price
- Delivery status
- Link to market at time of trigger

---

## 4. Notifications

### UX-010: No Notification Centre 🔴

**Issue:** Navbar shows unread count but no way to view, filter, or act on notifications.

**Impact:** Customers cannot see what's happened, cannot navigate to relevant records.

**Location:** Nowhere (missing feature)

**Remediation:** Build notification centre:
- Dropdown or dedicated page
- Filter by type (alerts, reports, commercial, account)
- Mark as read / mark all as read
- Deep links to related records
- Notification preferences

---

### UX-011: Notifications Don't Link to Records 🟡

**Issue:** When notifications exist (operational), they don't provide actionable links to the relevant commodity, market, or report.

**Impact:** Customers see a notification but can't navigate to the context.

**Location:** `notifications.action_url` column exists but unused

**Remediation:** Populate `action_url` when creating notifications, render as clickable links.

---

### UX-012: No Communication Preferences 🟡

**Issue:** Cannot configure which notifications to receive, via which channels, at what frequency.

**Impact:** Customers may be overwhelmed or miss important alerts.

**Location:** Nowhere (missing feature)

**Remediation:** Create preferences page with granular controls:
- Price alerts: email/in-app/push
- Report publications: email digest
- Commercial updates: in-app
- Account notifications: email (mandatory)

---

## 5. Research & Reports

### UX-013: Cannot Save Reports 🟡

**Issue:** No way to bookmark or save reports for later reference.

**Impact:** Customers must re-discover reports, cannot build a personal research library.

**Location:** Nowhere (missing feature)

**Remediation:** Add "Save" button to reports, create `saved_research` table, show saved reports in `/client/research/saved`.

---

### UX-014: Cannot Download Reports 🟡

**Issue:** No PDF download or export option for reports.

**Impact:** Customers cannot share reports internally, cannot archive for compliance.

**Location:** Nowhere (missing feature)

**Remediation:** Generate PDFs server-side, respect entitlements (exports key), track downloads.

---

### UX-015: No Reading History 🟢

**Issue:** Cannot see which reports have been read, when, or resume reading.

**Impact:** Customers lose place in long reports, cannot track what they've reviewed.

**Location:** Nowhere (missing feature)

**Remediation:** Track report access in `report_access_history`, show "Continue reading" prompts.

---

### UX-016: All Reports Are Public (No Entitlement Gating) 🟡

**Issue:** Reports that should be premium are accessible to everyone.

**Impact:** No incentive to upgrade, premium content not protected.

**Location:** `src/app/(site)/reports/[slug]/page.tsx`

**Remediation:** Check `reports` entitlement before rendering premium reports, show upgrade prompt.

---

## 6. Trade & Commerce

### UX-017: No RFQ Workflow 🔴

**Issue:** Buyers cannot create procurement requests, cannot receive quotations.

**Impact:** Trade workflow is incomplete, cannot move from intelligence to action.

**Location:** Nowhere (missing feature, no table)

**Remediation:** Build complete RFQ workflow:
- Create RFQ with requirements
- Submit/distribute to suppliers
- Receive and compare quotations
- Accept/reject/negotiate
- Track decision

---

### UX-018: No Supplier Discovery 🟡

**Issue:** Buyers cannot browse verified suppliers, cannot see supplier profiles.

**Impact:** Cannot connect sourcing intelligence to actual suppliers.

**Location:** Nowhere (missing feature)

**Remediation:** Build supplier directory with:
- Organisation profile
- Commodity specialisations
- Verification status
- Contact permissions

---

### UX-019: Buyer/Seller Offers Have No UI 🟡

**Issue:** `buyer_offers` and `seller_offers` tables exist with demo data but no customer-facing interface.

**Impact:** Commercial functionality is invisible.

**Location:** Nowhere (missing UI)

**Remediation:** Build offer management interface:
- Create/edit offers
- View received offers (where disclosed)
- Track offer status
- Verification workflow

---

## 7. Business Workspace

### UX-020: No Business Workspace 🔴

**Issue:** Organisation members cannot access a business workspace, cannot see company activity, cannot manage relationships.

**Impact:** Enterprise customers cannot use Hatsi360 as a team tool.

**Location:** Nowhere (missing feature)

**Remediation:** Build business workspace:
- Company overview
- Team management
- Shared procurement/sales
- Relationship management
- Document storage

---

### UX-021: No Team Management 🟡

**Issue:** Organisation owners cannot invite team members, assign roles, or manage seats.

**Impact:** Cannot scale Hatsi360 usage within an organisation.

**Location:** Nowhere (missing feature, `organization_members` exists)

**Remediation:** Build team management:
- Invite members by email
- Assign roles (member, admin)
- View member activity
- Remove members
- Seat usage display

---

### UX-022: No Follow-up Management 🟡

**Issue:** Cannot create follow-up tasks linked to RFQs, quotations, suppliers, or customers.

**Impact:** Commercial activities are not tracked, things fall through cracks.

**Location:** Nowhere (missing feature)

**Remediation:** Build follow-up system:
- Create follow-up with due date
- Link to entity (RFQ, supplier, etc.)
- Set priority
- Mark complete
- View in activity timeline

---

## 8. Account & Subscription

### UX-023: Cannot Edit Profile 🟡

**Issue:** Profile is created during registration but cannot be edited later.

**Impact:** Name changes, phone updates, avatar uploads are impossible.

**Location:** Nowhere (missing feature)

**Remediation:** Build profile editor with:
- Full name
- Phone
- Avatar upload
- Organisation (if individual)
- Timezone/locale

---

### UX-024: Cannot Change Password 🟡

**Issue:** No password change functionality in the client portal.

**Impact:** Security concern, customers cannot rotate credentials.

**Location:** Nowhere (missing feature)

**Remediation:** Add password change form with:
- Current password verification
- New password with strength check
- Confirmation
- Email notification of change

---

### UX-025: No Usage Dashboard 🟢

**Issue:** Cannot see API usage, export counts, or other metered capabilities.

**Impact:** Customers don't know how close they are to limits.

**Location:** Nowhere (missing feature, `api_usage_logs` exists)

**Remediation:** Build usage dashboard:
- API request count (current period)
- Export count
- AI query count (when implemented)
- Limit indicators
- Reset date

---

## 9. Mobile & Responsive

### UX-026: No Mobile-Optimised Client Navigation 🟡

**Issue:** Public site has mobile drawer, but client pages don't have dedicated mobile navigation.

**Impact:** Premium customers on mobile have poor experience.

**Location:** Client layout (when created)

**Remediation:** Design mobile-first client navigation:
- Bottom tab bar for primary sections
- Swipeable panels where appropriate
- Touch-optimised actions
- Responsive tables and charts

---

### UX-027: Tables Not Optimised for Small Screens 🟢

**Issue:** Market watch tables, watchlists, and alert lists don't adapt to narrow viewports.

**Impact:** Mobile users must scroll horizontally or miss information.

**Location:** Various table components

**Remediation:** Implement responsive tables:
- Card layouts on mobile
- Progressive disclosure
- Swipeable rows
- Collapsible columns

---

## 10. Accessibility

### UX-028: Inconsistent Focus Management 🟢

**Issue:** Navigation between pages doesn't always manage focus correctly.

**Impact:** Keyboard users lose place, screen reader users confused.

**Location:** Various navigation components

**Remediation:** Implement proper focus management:
- Focus heading on page load
- Announce page changes
- Maintain focus in modals/drawers
- Skip links

---

### UX-029: Charts Lack Keyboard Navigation 🟢

**Issue:** Candlestick charts and range charts cannot be navigated with keyboard.

**Impact:** Keyboard users cannot inspect individual data points.

**Location:** `src/components/trade/CandleChart.tsx`

**Remediation:** Add keyboard navigation:
- Arrow keys to move between candles
- Enter/space to select and announce values
- Tab to exit chart

---

## 11. Performance

### UX-030: Dashboard Loads Unnecessarily Slow 🟢

**Issue:** Dashboard queries all commodities and markets even if user has saved items.

**Impact:** Slower time-to-interactive.

**Location:** `src/app/(site)/dashboard/page.tsx`

**Remediation:** Optimise queries:
- Only load saved items if they exist
- Lazy-load non-critical widgets
- Cache frequently accessed data
- Use proper indexes

---

## 12. Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 7 |
| 🟡 Major | 15 |
| 🟢 Minor | 7 |
| 🔵 Enhancement | 1 |
| **Total** | **30** |

### Top 5 Priorities

1. **UX-001**: Create dedicated client portal navigation (Critical)
2. **UX-003**: Build onboarding flow (Critical)
3. **UX-010**: Build notification centre (Critical)
4. **UX-017**: Implement RFQ workflow (Critical)
5. **UX-020**: Build business workspace (Critical)

---

## 13. Remediation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- UX-001: Client portal route group & layout
- UX-003: Onboarding wizard
- UX-004: Account settings pages
- UX-010: Notification centre

### Phase 2: Intelligence (Weeks 3-4)
- UX-002: Personalised dashboard
- UX-006: Named watchlists
- UX-008: Enhanced alert builder
- UX-009: Alert history
- UX-013/014: Save/download reports

### Phase 3: Commerce (Weeks 5-6)
- UX-017: RFQ workflow
- UX-018: Supplier discovery
- UX-019: Offer management UI
- UX-022: Follow-up management

### Phase 4: Workspace (Weeks 7-8)
- UX-020: Business workspace
- UX-021: Team management
- UX-005: Subscription management
- UX-025: Usage dashboard

### Phase 5: Polish (Weeks 9-10)
- UX-026/027: Mobile optimisation
- UX-028/029: Accessibility improvements
- UX-030: Performance optimisation
- Remaining minor issues

---

**End of Stage 1 Audit Documentation**
