# Hatsi360 — Demo Data Relationship Map

**Version:** 1.0
**Date:** 2026-11-15

---

## 1. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORGANIZATIONS                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐     │
│  │ Hatsi360     │  │ Kano Grains   │  │ Lagos Food Trading   │     │
│  │ Agro Ltd     │  │ Cooperative   │  │ Co                   │     │
│  └──────┬───────┘  └───────┬───────┘  └──────────┬───────────┘     │
│         │                  │                      │                  │
│         └──────────────┬───┴──────────────────────┘                  │
│                        │                                             │
│               organization_members                                   │
│                        │                                             │
├────────────────────────┼─────────────────────────────────────────────┤
│                        ▼                                             │
│  ┌──────────────────────────────────────────────────────────┐       │
│  │                     PROFILES (auth.users)                  │       │
│  │                                                            │       │
│  │  ADMIN        AGENTS              CUSTOMERS    OBSERVERS   │       │
│  │  ┌─────────┐  ┌──────────────┐    ┌────────┐  ┌────────┐ │       │
│  │  │Fatima   │  │Amina Yusuf   │    │Chidi   │  │Musa    │ │       │
│  │  │Bello    │  │Yusuf Danladi │    │Okafor  │  │Garba   │ │       │
│  │  │(admin)  │  │Adeola Bankole│    │(buyer) │  │(analyst│ │       │
│  │  └────┬────┘  │Halima Suleim.│    └────────┘  └────────┘ │       │
│  │       │       │Abubakar Moh. │                             │       │
│  │       │       └──────┬───────┘                             │       │
│  │  ┌────┴────┐         │                                     │       │
│  │  │Ibrahim  │         │                                     │       │
│  │  │Musa     │         │                                     │       │
│  │  │(verify) │         │                                     │       │
│  │  └─────────┘         │                                     │       │
│  └──────────────────────┼─────────────────────────────────────┘       │
│                         │                                             │
├─────────────────────────┼─────────────────────────────────────────────┤
│     OPERATIONAL LAYER   │                                             │
│                         ▼                                             │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │agent_profiles  │  │market_collection │  │collection_tasks    │   │
│  │                │  │_schedules        │  │                    │   │
│  │employee_code   │◄─┤                  │◄─┤assigned_to         │   │
│  │region          │  │assigned_agent_id │  │market_id           │   │
│  └────────────────┘  │market_id         │  │due_on              │   │
│                      │commodity_id      │  │status              │   │
│                      └────────┬─────────┘  └────────┬───────────┘   │
│                               │                      │               │
│                               │    ┌─────────────────┘               │
│                               ▼    ▼                                 │
│  ┌────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │market_visit    │  │price_observations│  │collection_task     │   │
│  │_records        │  │                  │  │_events             │   │
│  │                │  │commodity_id      │  │                    │   │
│  │market_id       │  │market_id         │  │task_id             │   │
│  │agent_user_id   │◄─┤agent_user_id     │  │event_type          │   │
│  │observations_   │  │verification_     │  │from_status         │   │
│  │ count          │  │ status           │  │to_status           │   │
│  └────────────────┘  │published_at      │  └────────────────────┘   │
│                      │notes: 'DEMO: ...'│                            │
│                      └──────────────────┘                            │
│                                                                       │
├───────────────────────────────────────────────────────────────────────┤
│     REFERENCE DATA (not demo-created, used by demo)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │commodities│  │markets   │  │states    │  │commodity_grades  │    │
│  │  (22)    │  │  (11)    │  │  (11)    │  │  (58)            │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │categories│  │units     │  │countries │                          │
│  │  (14)    │  │  (8)     │  │  (1)     │                          │
│  └──────────┘  └──────────┘  └──────────┘                          │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Relationships

### Price Observations
- `price_observations.commodity_id` → `commodities.id`
- `price_observations.market_id` → `markets.id`
- `price_observations.agent_user_id` → `profiles.id`
- `price_observations.verified_by` → `profiles.id`

### Collection Tasks
- `collection_tasks.market_id` → `markets.id`
- `collection_tasks.assigned_to` → `profiles.id`
- `collection_tasks.status` → `collection_task_status` enum

### Market Schedules
- `market_collection_schedules.market_id` → `markets.id`
- `market_collection_schedules.assigned_agent_id` → `profiles.id`
- `market_collection_schedules.commodity_id` → `commodities.id` (nullable = all)

### Visit Records
- `market_visit_records.market_id` → `markets.id`
- `market_visit_records.agent_user_id` → `profiles.id`

### Task Events (Audit Trail)
- `collection_task_events.task_id` → `collection_tasks.id`
- `collection_task_events.actor_id` → `profiles.id`
- `collection_task_events.from_status/to_status` → `collection_task_status`

### Organizations
- `organization_members.organization_id` → `organizations.id`
- `organization_members.user_id` → `profiles.id`
- `organization_members.role_in_org` → `user_role` enum

### Notifications
- `notifications.user_id` → `profiles.id`
- Notifications are private per user — never cross-visible

---

## 3. Data Flow: Observation Lifecycle

```
SCHEDULE       →  TASK         →  FIELD VISIT  →  OBSERVATION  →  VERIFICATION  →  PUBLICATION
                                                                                 
market_          collection_     market_visit_    price_          price_           published_
collection_      tasks           records          observations    verification_    price_
schedules                                        │               events           observations
│                                                │                                  (VIEW)
│ assigned_agent_id ──► assigned_to              │
│ market_id ────────► market_id ──────────────► market_id     │
│ commodity_id                                   │               │
│ frequency                                      │          verified_by (Ibrahim)
│ priority                                       │          verification_status
│                                                │          → verified
│                                                │          → published_at set
│                                                │
│                                                └──► agent_user_id
│                                                     collected_at
│                                                     reported_amount
│                                                     price_type
│                                                     verification_status
│                                                     notes: 'DEMO: ...'
```

---

## 4. Access Patterns by Page

| Page | Tables Accessed | Auth Required | Demo Data Visible |
|------|----------------|---------------|-------------------|
| `/` (homepage) | `published_price_observations`, `commodities`, `markets` | No | ✅ |
| `/trade` | `published_price_observations`, `commodities`, `markets` | No | ✅ |
| `/trade/terminal` | `published_price_observations`, `commodities`, `markets` | No | ✅ |
| `/commodities` | `commodities`, `commodity_categories`, `published_price_observations` | No | ✅ |
| `/commodities/[slug]` | `commodities`, `published_price_observations` | No | ✅ |
| `/dashboard` | User-specific (watchlists, API keys) | Yes | ✅ |
| `/admin/verification` | `price_observations`, `profiles` | Staff | ✅ |
| `/admin/agents/[id]` | `profiles`, `agent_profiles`, `collection_tasks`, `market_visit_records`, `price_observations` | Staff | ✅ |
| `/admin/customers` | `profiles` (filtered) | Staff | ✅ |
