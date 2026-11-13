# Phase 01 — Security and RLS Audit

**Verified against the live database on 2026-11-13** by direct PostgreSQL connection.
All checks were **read-only**: catalog inspection and `SELECT` inside rolled-back transactions
with `set local role`. **No RLS policy, grant or schema object was modified.**

---

## 1. P0 — Published demo administrator credentials mutated the live database during this audit

### Evidence

Two rows exist in `price_verification_events` and `audit_logs` with these timestamps:

| Time (UTC) | Table | Action | Actor | Entity |
|---|---|---|---|---|
| 2026-11-13T23:15:37.054Z | `price_verification_events` | `approved` | `dcc7c070-…` (`admin`) | `d42830c5-27ce-4a55-8ce1-dec05ce6ec3d` |
| 2026-11-13T23:15:45.703Z | `price_verification_events` | `correction_requested`, reason `"65777"` | `dcc7c070-…` (`admin`) | `99593b4e-60bc-4dd1-85b1-56dca53a7e91` |

`dcc7c070-cca6-46e4-907f-3d811079be15` is `demo.admin@hatsi360.test`.

The affected row is a **test fixture** (`source_system = 'test_fixture'`) that was `submitted` and
became `verified` with `verified_by = demo.admin`. Its `published_at` remains `NULL`, so it did **not**
reach the public view — the publication guard held.

### Ruling out local causes

- **No application server was running.** `ss -tlnp` showed no Next.js process; `ps` showed no
  `next`, `vitest` or `vite` process at that time.
- **No scheduled job ran.** `scheduled_job_runs` is **empty**.
- **The test suite is read-only.** `tests/data-integrity/fixture-isolation.test.ts` contains no
  `INSERT`/`UPDATE`/`DELETE`; its only writes are `set local role` inside `BEGIN … ROLLBACK`.
- **The migration validator is isolated.** `scripts/validate-migrations.mjs` runs
  `create database <name>` and executes `tests/rls/permission-tests.sql` and
  `tests/operations/workflow-tests.sql` in that **separate** database.

**Conclusion:** these were **interactive actions by a party authenticated as `demo.admin`, from
outside this sandbox.** The reason string `"65777"` is a five-digit number, consistent with a
form field rather than a considered note.

### Why this is P0

`scripts/manage_demo_users.mjs` creates `demo.admin@hatsi360.test` with password `hatsi360-demo`,
and `src/components/forms/DemoAccountsPanel.tsx` renders that address and password **unconditionally
on the public `/login` page**. The panel's own documentation records this as a deliberate decision.

The consequence, now demonstrated rather than theorised: **anyone who can open the login page can
sign in as an administrator and change production data.** This database is the live Supabase project.
The mutations observed were benign — a fixture verified, a correction requested — but the same
credential can reject, re-status, or (subject to the publication guard) publish observations, and can
read every staff-visible table.

Compounding this: `audit_logs.ip_hash` is **`NULL` on every row**, so the audit trail records *who*
acted but not *from where*. Provenance for privileged actions is absent.

### Business impact

- Unauthorised modification of market price records by an unauthenticated third party.
- No ability to attribute privileged actions to a network origin.
- The demo accounts are indistinguishable from real staff in every list, audit trail and assignment
  table except by their `full_name` prefix `"DEMO — "`.

### Recommended remediation

1. **Rotate the demo password and remove the accounts** before any further shared-database work:
   `node scripts/manage_demo_users.mjs --remove`.
2. **Re-enable them only in a non-production project**, or gate the panel behind an environment flag
   that is off by default in production.
3. **Capture `ip_hash` on privileged server actions** so `audit_logs` records origin.
4. **Consider a distinct `demo` role** rather than reusing `admin`, so a demo account cannot exercise
   the full staff surface.

---

## 2. P0/P1 — `_hatsi_migrations` has RLS disabled and `anon` holds full DML

### Evidence

```
relrowsecurity = false          (pg_class)
grants to anon:     DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
grants to authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
```

Verified reachable, read-only:
```sql
begin; set local role anon;
select count(*) from public._hatsi_migrations;   --> 29
rollback;
```

Columns: `name`, `applied_at`. It holds the internal migration bookkeeping
(`0001_core_reference_schema.sql` … `0029_…`).

### Assessment

The table holds no commercial data, so the confidentiality impact is low. The **availability and
integrity impact is not**: `anon` can `TRUNCATE` or `DELETE` it, and can `INSERT` arbitrary rows. A
public visitor can destroy the migration record or forge one.

This is the only table in `public` with RLS disabled, and the only one where `anon` holds DML.

### Recommended remediation

```sql
alter table public._hatsi_migrations enable row level security;
revoke all on public._hatsi_migrations from anon, authenticated;
-- plus a staff-only read policy, matching audit_events
```

---

## 3. RLS policy inventory

**134 policies** across **64 tables**, by command: `SELECT` 69 · `ALL` 26 · `INSERT` 19 ·
`UPDATE` 14 · `DELETE` 6.

### The authorisation model — VERIFIED IN CODE

| Concern | Mechanism |
|---|---|
| Role resolution | `current_role()` → `profiles.role`, `user_role` enum (8 values) |
| Staff | `is_staff()` → `verification_officer`, `market_supervisor`, `analyst`, `admin`, `super_admin`. **`agent` is deliberately NOT staff.** |
| Admin | `is_admin()` |
| Active account | `is_active_account()` → `account_status` |
| Agent scoping | `is_assigned_to_market(id)` / `assigned_market_ids()` |
| Public observation | `is_public_observation(status, published_at, is_current, source, source_reference)` |
| API entitlement | `has_entitlement(key)` / `api_application_entitlements(app_id)` |

### Public (anon) read surface — 24 policies

Reference data is open by design: `commodities`, `commodity_categories`, `commodity_grades`,
`commodity_synonyms`, `commodity_unit_conversions`, `commodity_varieties`, `markets`, `market_zones`,
`market_operating_schedules`, `market_commodity_scope`, `measurement_units`, `countries`, `states`,
`article_categories`, `entitlement_catalog`, `entitlement_tiers`.

Gated public reads:
- `price_observations_public_read` → `is_public_observation(...)` (verified + published + current + not a fixture)
- `buyer_offers_public_read` / `seller_offers_public_read` → `status='verified' AND disclosure_consent AND (valid_until IS NULL OR valid_until > now())`
- `articles_public_read` → `is_published AND published_at IS NOT NULL`
- `market_reports.reports_public_read` → `(NOT is_premium AND published_at IS NOT NULL) OR is_staff() OR has_entitlement('reports')`
- `evidence_public_read` → only evidence attached to a publicly-readable observation
- `offer_verification_events_read` → **corrected by migration 0031**; see below

### Ownership isolation — VERIFIED

| Table | Policy |
|---|---|
| `saved_commodities` | `user_id = auth.uid()` (ALL) |
| `saved_markets` | `user_id = auth.uid()` (ALL) |
| `price_alerts` | `user_id = auth.uid()` (ALL) |
| `buyer_offers` / `seller_offers` | owner read `user_id = auth.uid()`; owner INSERT only `status='draft' AND verified_by IS NULL`; owner UPDATE only from `draft`/`withdrawn` |

Verified live: as `anon` and as `authenticated` with no JWT, `saved_commodities`, `saved_markets` and
`price_alerts` all return **0 rows**. As the owning `public_user`, they return 6, 3 and 4.

### Agent restrictions — VERIFIED

- `price_observations_agent_read` → `agent_user_id = auth.uid()`
- `price_observations_agent_update` → `is_active_account() AND agent_user_id = auth.uid() AND status IN ('draft','correction_requested') AND is_current`
- `price_observations_agent_insert` / `_staff_insert` → separate policies
- `price_observations_delete` → `is_admin() OR (own draft AND unpublished)`

An agent **cannot** verify: no agent policy grants `verified_by` writes, and `approve_observation`
is staff-gated internally. Separation of duties holds.

### The offer verification trail — FIXED (migration 0031)

Migration 0027 created `offer_verification_events_read` as `using (true)` while its own comment said
*"anyone may read the events for an offer they can see"*. The policy did not implement the sentence,
so the entire trail — including drafts, withdrawn and rejected offers, each with `actor_id` and a
free-text `reason` — was anonymous-readable.

Migration `0031_offer_verification_events_read_fix.sql` corrects it to: staff read all, an owner
reads their own, the public reads only published offers. The inner lookups are deliberately **not**
`security definer`, so they are themselves RLS-filtered.

Measured before/after: `anon` saw **69** events; after the fix **18**, and all 18 belong to the 6
published offers. Regression guard: `tests/data-integrity/offer-privacy.test.ts` (16 tests).

---

## 4. Latent risk — the unused 3-arg `is_public_observation` overload

Two overloads exist:

```sql
-- 3-arg: NO test_fixture filter
is_public_observation(status, published_at, is_current)

-- 5-arg: the safe one, used everywhere
is_public_observation(status, published_at, is_current, source, source_reference)
```

Every policy and view currently calls the **5-arg** form. But the 3-arg overload is still callable,
and PostgreSQL will bind a 3-argument call to it. **A future policy written with the shorter form
would silently publish test fixtures.** Recommend dropping it.

---

## 5. Credential exposure

| Check | Result |
|---|---|
| Service-role key in client code | **Not found.** `SUPABASE_SERVICE_ROLE_KEY` is referenced only in server scripts; browser bundles use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. |
| Secrets in `.git/config` | **0 matches** for `ghp_` / `x-access-token`. |
| Credential in committed diff | **0 matches** (scanned the staged diff). |
| `.env.local` | Gitignored, not committed. |
| Proxy (`src/proxy.ts`) | Uses only the publishable key. No service-role use. |
| API handler | API-key auth, entitlement check, per-minute rate limit (default 120/min anonymous). |

**Note:** `src/proxy.ts` runs on the edge and uses the publishable key only. `getUser()` verifies the
token with the auth server and a network failure is caught rather than blocking the request — the
comment states the guards still refuse an unusable session, which is correct.

---

## 6. Storage

One bucket, `hatsi360-evidence`: **private**, 5 MB limit, MIME allow-list
(`image/jpeg,png,webp,heic`, `application/pdf`), **0 objects**. `agent_evidence_url()` is
`SECURITY DEFINER` with `search_path = public, storage` and generates signed URLs for agent evidence.
No public bucket exists. **No storage security finding.**

---

## 7. Vulnerabilities by severity

| ID | Finding | Severity |
|---|---|---|
| SEC-1 | Published demo admin credentials are live and mutable against production | **P0** |
| SEC-2 | `_hatsi_migrations` RLS disabled + `anon` TRUNCATE/DELETE/INSERT | **P0/P1** |
| SEC-3 | `audit_logs.ip_hash` NULL on every row — no action provenance | **P1** |
| SEC-4 | Unused 3-arg `is_public_observation` omits the fixture filter | **P1** |
| SEC-5 | `contact_enquiries_insert` unauthenticated with no DB-layer rate limit | P2 |
| SEC-6 | Four policies declare no `TO` role (defaults to PUBLIC) | P2 |
| SEC-7 | `npm run lint` broken — no lint gate in CI | P2 |

## 8. What is genuinely well secured

- 134 policies with correct ownership/staff/public separation.
- A publication **guard as a CHECK constraint**, not a hidden button.
- `prevent_published_economic_mutation` trigger blocking edits to published economics.
- Append-only corrections with mandatory reasons.
- Every SECURITY DEFINER function pins `search_path`.
- No service-role key reaches the browser.
- The middleware refreshes sessions but never authorises.
- Invitation-only operational roles, enforced in the server action rather than the UI.
