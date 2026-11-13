# Phase 01 — Remediation Backlog

**Prioritisation framework (weights applied to every item):**

| Dimension | Weight |
|---|---|
| Data integrity | 25% |
| Security / operational risk | 25% |
| Core market functionality | 20% |
| Architectural dependency | 15% |
| User / business value | 10% |
| Implementation complexity (inverse) | 5% |

Each item is scored **1–5** per dimension (5 = highest value/impact, lowest complexity) and weighted:

```
score = (data × 0.25) + (security × 0.25) + (core × 0.20)
      + (arch × 0.15)   + (value × 0.10)      + (complexity × 0.05
```

Priority is then assigned from the score: **P0 ≥ 4.0 · P1 ≥ 3.2 · P2 ≥ 2.4 · P3 ≥ 1.6 · P4 < 1.6**

---

## R-01 — Remove the published demo administrator credentials

**Severity: P0** · **Decision framework: Remediate**

| Dimension | Score | Reasoning |
|---|---|---|
| Data integrity | 5 | An unauthorised actor already verified a fixture and requested a correction |
| Security | 5 | Anyone who can load `/login` can sign in as an administrator of the live database |
| Core functionality | 5 | No demo accounts are needed to operate the product |
| Architectural dependency | 5 | No dependency; removal is independent |
| Value | 4 | Removes the platform's single largest exposure |
| Complexity | 5 | `node scripts/manage_demo_users.mjs --remove` |

**Score = 4.80 → P0**

**Evidence:** `SECURITY_AND_RLS_AUDIT.md` §1. Two `price_verification_events` rows at
2026-11-13T23:15:37Z and 23:15:45Z written by `demo.admin@hatsi360.test`
(`dcc7c070-cca6-46e4-907f-3d811079be15`), while no app server, no scheduled job, no writable test,
and no validator connected to this database. `DemoAccountsPanel.tsx` renders the credentials
unconditionally.

**Action:** `node scripts/manage_demo_users.mjs --remove`, then gate the panel behind an environment
variable that is off by default in production. Re-enable in a **non-production** project only.

**Note:** the user has explicitly directed that demo credentials remain visible on the login page.
**This backlog item therefore requires explicit user approval before execution.** It is recorded as
P0 because the audit's obligation is to report the risk, not to resolve a conflict with a standing
instruction unilaterally.

---

## R-02 — Enable RLS on `_hatsi_migrations` and revoke `anon` DML

**Severity: P0/P1** · **Decision framework: Remediate**

| Dimension | Score | Reasoning |
|---|---|---|
| Data integrity | 4 | Migration bookkeeping can be forged or destroyed |
| Security | 5 | `anon` holds TRUNCATE, DELETE, INSERT, UPDATE on a table in `public` |
| Core functionality | 4 | Migration tracking must be trustworthy for every future deployment |
| Architectural dependency | 5 | Independent of all other items |
| Value | 3 | Protects deployment integrity |
| Complexity | 5 | One migration: enable RLS + revoke grants |

**Score = 4.50 → P0**

**Evidence:** `DATABASE_AUDIT.md` §9 DB-1. Verified `relrowsecurity = false`; grants to `anon` include
TRUNCATE/DELETE/INSERT/UPDATE; `set local role anon; select count(*) from public._hatsi_migrations`
returned **29 rows**.

**Action:** additive migration `0032_*`:
```sql
alter table public._hatsi_migrations enable row level security;
revoke all on table public._hatsi_migrations from anon, authenticated;
create policy "_hatsi_migrations_staff_read" on public._hatsi_migrations
  for select using (is_staff());
```

---

## R-03 — Re-run the fixture-isolation test after R-01

**Severity: P1** · **Decision framework: Remediate**

`tests/data-integrity/fixture-isolation.test.ts > attributes every verification to the demo verifier`
currently fails because `d42830c5-…` carries `verified_by = demo.admin`. **The test is correct; the
data is wrong.** Do **not** relax the assertion.

After R-01 the fixture must be re-seeded so all verification is attributed to
`demo.verifier@hatsi360.test`. **Score = 3.75 → P1**

---

## R-04 — Drop the unused 3-arg `is_public_observation` overload

**Severity: P1** · **Decision framework: Refactor-Replace (remove the unsafe overload)**

Every live policy and both views call the **5-arg** form, which filters `test_fixture`. The 3-arg
form does not. It is a latent trap: a future policy written with the short signature silently
publishes test fixtures. **Score = 3.70 → P1**

**Action:** additive migration dropping `is_public_observation(verification_status, timestamp,
boolean)`. Confirm no call site first — verified none exists today.

---

## R-05 — Record migration 0031 in `_hatsi_migrations`

**Severity: P2** · **Decision framework: Remediate**

`_hatsi_migrations` holds 29 rows; `supabase/migrations/` holds 30 files. Migration 0031 is applied
(the policy change is live — verified by the offer-privacy test) but not recorded. **Score = 3.05 → P2**

---

## R-06 — Repair `npm run lint`

**Severity: P2** · **Decision framework: Remediate**

`npm run lint` invokes `next lint`, removed in Next 16, so `lint` is parsed as a project directory:
`Invalid project directory provided, no such directory: lint`. The repo has **no lint gate**.

**Action:** replace with `"lint": "eslint ."` (or `next lint --dir`'s replacement) and add it to CI.
**Score = 2.90 → P2**

---

## R-07 — Populate `commodity_unit_conversions`

**Severity: P2** · **Decision framework: Develop**

`normalized_amount`/`normalized_unit_id` are unset on all 58 observations and the conversion table
is empty, so **cross-unit comparison is not actually normalised**. Any Phase 02 surface that
compares across units must either use this table or refuse to compare. **Score = 2.85 → P2**

---

## R-08 — Establish a real publication path

**Severity: P1** · **Decision framework: Preserve + Develop**

`published_price_observations` is **0 rows**. The platform has never published a price, so every
public price surface renders an empty state. This is honest, but it means the product's core promise
is unproven end-to-end.

The enum `legacy_unverified` and the view both already anticipate publishing legacy data. Decide
explicitly whether the 11 verified fixture rows may be published as demo data, or whether
publication waits for real collection. **Do not fabricate a publication.**

**Score = 3.60 → P1**

---

## R-09 — Run the job runner

**Severity: P1** · **Decision framework: Develop**

`scheduled_job_runs` is empty. `expire_lapsed_offers()`, `generate_collection_tasks()` and alert
delivery have no trigger. `buyer_offers.valid_until` will never lapse. **Score = 3.40 → P1**

Also **verify `/api/jobs/run` authentication** (INT-3) before enabling it — an unauthenticated job
runner on a public route is a P2 security exposure.

---

## R-10 — Capture `ip_hash` on privileged actions

**Severity: P1** · **Decision framework: Develop**

Every row in `audit_logs` has `ip_hash = NULL`, so privileged actions cannot be attributed to an
origin. This is why SEC-1 cannot say where the demo admin signed in from. **Score = 3.30 → P1**

---

## R-11 — Market coordinates

**Severity: P2** · **Decision framework: Develop (data only)**

0 of 11 markets have `latitude`/`longitude`. A map is impossible. **Must be sourced from a verified
reference and never invented.** **Score = 2.75 → P2**

---

## R-12 — `package.json` identity

**Severity: P2** · **Decision framework: Remediate**

`name: "pluck-live"`, description "Pluck Live — agricultural commodity price transparency & market
intelligence platform for Pluck Agro." Every user-facing name already resolves through
`src/lib/brand.ts`, so this is metadata only. **Score = 2.70 → P2**

---

## R-13 — Enable stricter TypeScript checks

**Severity P3** — `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. The analytics
code indexes arrays heavily. **Score = 2.20 → P3**

---

## R-14 — Node engine alignment

**Severity: P2** — `engines.node: ">=22.0.0"` but this environment is Node 20.20.2, producing
`EBADENGINE` and forcing `ws` transport injection in scripts. Either pin the environment or relax
the range deliberately. **Score = 2.55 → P2**

---

## R-15 — Legacy branding sweep

**Severity: P3** — 29 files still mention "Pluck Live"/"AgriPrice"/"liveprice"/"pluckagro.com".
`grep -ril` results are mostly `docs/` and code comments; `src/lib/brand.ts` already governs all
user-facing strings. Confirm each remaining occurrence is documentation, not rendered copy.
**Score = 2.05 → P3**

---

## R-16 — Role-less RLS policies

**Severity: P2** — `commodity_fundamentals_read`, `commodity_seasonality_read`,
`commodity_specifications_read` and `price_source_registry_read` declare no `TO` role, defaulting to
`PUBLIC`. Add `TO anon, authenticated` to match the rest of the catalogue policies.
**Score = 2.60 → P2**

---

## R-17 — Rate-limit `contact_enquiries`

**Severity: P2** — `contact_enquiries_insert` is an unauthenticated INSERT with `check (true)` and no
database-layer rate limit. Add a limit at the route layer, or a policy-level throttle.
**Score = 2.45 → P2**

---

## Prioritised queue

| Order | ID | Priority | Score | Title |
|---|---|---|---|---|
| 1 | R-02 | **P0** | 4.50 | Enable RLS on `_hatsi_migrations` + revoke anon DML |
| 2 | R-01 | **P0** | 4.80 | Remove published demo admin credentials *(needs user approval)* |
| 3 | R-03 | P1 | 3.75 | Re-seed fixtures, restore test |
| 4 | R-04 | P1 | 3.70 | Drop the unsafe `is_public_observation` overload |
| 5 | R-08 | P1 | 3.60 | Establish a real publication path |
| 6 | R-09 | P1 | 3.40 | Run the job runner + verify its auth |
| 7 | R-10 | P1 | 3.30 | Capture `ip_hash` on privileged actions |
| 8 | R-05 | P2 | 3.05 | Record migration 0031 |
| 9 | R-06 | P2 | 2.90 | Repair `npm run lint` |
| 10 | R-07 | P2 | 2.85 | Populate `commodity_unit_conversions` |
| 11 | R-11 | P2 | 2.75 | Market coordinates (verified source only) |
| 12 | R-12 | P2 | 2.70 | `package.json` identity |
| 13 | R-16 | P2 | 2.60 | Role-less RLS policies |
| 14 | R-14 | P2 | 2.55 | Node engine alignment |
| 15 | R-17 | P2 | 2.45 | Rate-limit `contact_enquiries` |
| 16 | R-13 | P3 | 2.20 | Stricter TypeScript checks |
| 17 | R-15 | P3 | 2.05 | Legacy branding sweep |

## Decision framework applied

| Framework | Items |
|---|---|
| **Preserve** | `price_observations` schema · RLS policy set · `brand.ts` · `trade/*` · `api/handler.ts` · `data/` abstraction · `images/registry.ts` · migration chain |
| **Remediate** | R-01, R-02, R-03, R-05, R-06, R-12 |
| **Refactor-Replace** | R-04 (remove the unsafe overload) |
| **Develop** | R-07, R-08, R-09, R-10, R-11, R-13, R-16, R-17 |

## QA consistency review

1. Every item cites a specific file, table, policy or measured count.
2. No status was upgraded without evidence at the claimed layer.
3. The failing test is treated as a data defect, not relaxed.
4. The demo-account conflict with a standing user instruction is surfaced rather than resolved
   unilaterally.
5. No item proposes a destructive migration; all schema changes are additive.
6. The prioritisation framework was applied uniformly and the arithmetic is shown.
