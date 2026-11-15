# Hatsi360 — Demo Data Schema Mapping

**Version:** 1.0
**Date:** 2026-11-15

---

## 1. Table → Migration Mapping

| Table | Migration | Records | Identifiable By |
|-------|-----------|---------|-----------------|
| `price_observations` | 0046 | 299 | `notes LIKE 'DEMO:%'` |
| `commodity_unit_conversions` | 0046 | 12 | `notes LIKE 'DEMO:%'` |
| `agent_profiles` | 0047 | 5 | `employee_code LIKE 'AGT-%'` |
| `collection_tasks` | 0047 | 45 | `notes LIKE 'DEMO:%'` |
| `collection_task_events` | 0047 | 35 | `reason LIKE 'DEMO:%'` |
| `market_visit_records` | 0047 | 8 | `notes LIKE 'DEMO:%'` |
| `notifications` | 0047 | 11 | Via specific title patterns |
| `analytics_snapshots` | 0047 | 5 | `scope IN (...)` |
| `organizations` | (manual) | 5 | `slug LIKE 'hatsi360%' OR kind IN (...)` |
| `organization_members` | 0047 | 11 | Via demo user IDs |
| `market_collection_schedules` | 0047 | Updated | `assigned_agent_id` changed |

---

## 2. User → Role → Profile Mapping

| Auth Email | Profile Name | Role | Profile ID | Organization |
|-----------|-------------|------|-----------|-------------|
| demo.agent@hatsi360.test | Amina Yusuf | agent | f9b2d2f7-... | Hatsi360 Agro |
| demo.verifier@hatsi360.test | Ibrahim Musa | verification_officer | 3caaa619-... | Hatsi360 Agro |
| demo.admin@hatsi360.test | Fatima Bello | admin | dcc7c070-... | Hatsi360 Agro |
| demo.customer@hatsi360.test | Chidi Okafor | customer | cf465f88-... | Hatsi360 Agro, Kano Grains, Lagos Food |
| demo.public@hatsi360.test | Halima Ahmed | public_user | c79f092d-... | — |
| demo.observer@hatsi360.test | Musa Garba | analyst | b2000000-... | Hatsi360 Agro |
| demo.agent.kano@hatsi360.test | Yusuf Danladi | agent | c3000001-... | Hatsi360 Agro |
| demo.agent.lagos@hatsi360.test | Adeola Bankole | agent | c3000002-... | Hatsi360 Agro |
| demo.agent.kaduna@hatsi360.test | Halima Suleiman | agent | c3000003-... | Hatsi360 Agro |
| demo.agent.sokoto@hatsi360.test | Abubakar Mohammed | agent | c3000004-... | Hatsi360 Agro |

---

## 3. Organization Mapping

| Name | Slug | Kind | Members |
|------|------|------|---------|
| Hatsi360 Agro Ltd | hatsi360-agro | platform_operator | All 10 users |
| Kano Grains Cooperative | kano-grains-coop | trader | Chidi Okafor |
| Northern Farmers Alliance | northern-farmers | producer | — |
| Lagos Food Trading Co | lagos-food-trading | buyer | Chidi Okafor |
| Nassarawa Produce Union | nassarawa-produce | supplier | — |

---

## 4. Agent → Market Assignment

| Agent | Markets | Observations |
|-------|---------|-------------|
| Yusuf Danladi (Kano) | Dawanau (1), Gujungu (3) | 45 |
| Adeola Bankole (Lagos) | Mile 12 (2) | 32 |
| Halima Suleiman (Kaduna) | Anchau (4), Funtua (5) | 55 |
| Abubakar Mohammed (Borno/Sokoto) | Maiduguri (7), Sokoto (8) | 51 |
| Amina Yusuf (Multi) | Gusau (6), Zaki Biam (10), Lafia (11) | 58 |

---

## 5. Commodity Coverage

| Commodity | ID | Observations | Markets | Price Range (₦) |
|-----------|-----|-------------|---------|-----------------|
| Paddy Rice | 1 | 39 | 6 | 39,500–46,800 |
| Maize (White) | 6 | 26 | 5 | 35,200–40,700 |
| Millet | 8 | 26 | 5 | 32,800–39,000 |
| Sorghum (White) | 9 | 26 | 5 | 27,700–32,000 |
| Imported Rice | 3 | 21 | 5 | 52,000–58,500 |
| Brown Beans (Oloyin) | 16 | 21 | 4 | varies |
| Wheat | 5 | 21 | 4 | 48,500–57,500 |
| White Beans | — | 20 | 4 | varies |
| Sesame Seed | 11 | 20 | 4 | 135,000–165,000 |
| Groundnut | 13 | 18 | 3 | 56,500–68,500 |
| Maize (Yellow) | 7 | 6 | 2 | varies |
| Local Rice | 4 | 4 | 2 | varies |
| Sorghum (Red) | 10 | 4 | 2 | varies |
| Soya Beans | 15 | 4 | 2 | varies |
| Gum Arabic | 19 | 2 | 1 | varies |
| Sweet Potato | — | 2 | 1 | varies |

---

## 6. Enum Values Used in Demo Data

| Enum Type | Values Used |
|-----------|-------------|
| `price_type` | wholesale_transaction, retail |
| `verification_status` | verified, pending_verification, submitted |
| `observation_source` | (via source_system) agent_app |
| `collection_task_status` | open, in_progress, submitted |
| `collection_frequency` | daily, weekly |
| `operational_priority` | normal, high |
| `notification_kind` | task_assigned, deadline_reminder, submission_received, review_required, submission_approved, correction_requested, coverage_gap, system_alert |
| `user_role` | agent, verification_officer, admin, customer, public_user, analyst |
| `account_status` | active |

---

## 7. Views & RLS

| View/Policy | Filters Applied | Demo Data Visible? |
|-------------|----------------|-------------------|
| `published_price_observations` | `source_system <> 'test_fixture'`, `verification_status = 'verified'`, `published_at IS NOT NULL` | ✅ 238 visible |
| Anonymous RLS on `commodities` | Public read | ✅ 22 visible |
| Anonymous RLS on `markets` | Public read | ✅ 11 visible |
| Anonymous RLS on `states` | Public read | ✅ 11 visible |
| Staff RLS on `price_observations` | Requires staff role | ✅ 299 visible to admin |
| Staff RLS on `collection_tasks` | Requires staff role | ✅ 45 visible to admin |
| Staff RLS on `notifications` | Owner only | ✅ Per-user visibility |
