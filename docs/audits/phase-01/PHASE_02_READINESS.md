# Phase 01 — Phase 02 Readiness

**Verdict: CONDITIONALLY APPROVED.**

Phase 02 may begin **after** the three blocking items below are resolved. Phase 02 must **not** begin
automatically — explicit approval is required, per the audit brief.

---

## 1. Why not NOT APPROVED

The architecture, schema and security model are sound and, in several places, unusually good:

- `price_observations` has versioning, idempotency, unit normalisation, provenance and a
  **database-level publication guard** — the exact properties the trade brief demands.
- 134 RLS policies correctly separate ownership, staff and public access.
- Approval and publication are genuinely separate acts, enforced by distinct columns and a trigger.
- No service-role key reaches the browser.
- The middleware refreshes sessions but authorises nothing.
- Only 4 of 98 routes touch Supabase directly; the rest go through a central `DataSource`.
- `tsc --noEmit` is clean and `next build` succeeds.

Nothing here needs to be undone or rebuilt. That is a strong foundation, and "NOT APPROVED" would
overstate the problems.

## 2. Why not APPROVED

Three issues make starting Phase 02 now unsafe.

### Blocker 1 — SEC-1 / R-01: published demo admin credentials, live against production

`demo.admin@hatsi360.test` and its password are printed on the public `/login` page, and this audit
proved they work: two privileged actions were recorded against this database during a read-only
audit, with no local process able to have made them.

Beginning Phase 02 — which will make schema and code changes — while an unauthenticated third party
holds administrator credentials is an unacceptable operational risk. **A migration or a code change
made alongside an unauthorised actor is unverifiable.**

### Blocker 2 — SEC-2 / R-02: `_hatsi_migrations` has RLS disabled and `anon` holds TRUNCATE

Phase 02 will add migrations. If the migration bookkeeping table can be truncated by an anonymous
visitor, then the deployment state of the database is not trustworthy, and any migration work is
built on sand.

### Blocker 3 — PDI-1 / R-03: the test suite is red

One test fails because of Blocker 1. A red suite cannot gate Phase 02. **The failure must be resolved
by correcting the data, never by relaxing the assertion.**

---

## 3. Conditions for Phase 02

| # | Condition | Item | Verification |
|---|---|---|---|
| C1 | Remove or gate the demo admin credentials | R-01 | `node scripts/manage_demo_users.mjs --remove`; panel gated by env var, off by default |
| C2 | Enable RLS on `_hatsi_migrations`, revoke `anon` DML | R-02 | additive migration 0032; re-run the anon SELECT probe → 0 rows |
| C3 | Restore the fixture and the green suite | R-03 | `npx vitest run` → 0 failures |
| C4 | Drop the 3-arg `is_public_observation` overload | R-04 | additive migration; `tsc --noEmit` exit 0 |
| C5 | Repair `npm run lint` and add it to CI | R-06 | `npm run lint` exits 0 |

**C1 requires the user's explicit approval** because it reverses a standing instruction that demo
credentials stay visible on `/login`. The audit reports the risk; the user decides.

## 4. Recommended (not blocking)

| Item | Why |
|---|---|
| R-08 publication path | Phase 02 will build public surfaces that read published prices. Decide the publication policy first, or every public surface renders an empty state. |
| R-09 job runner | `expire_lapsed_offers` and `generate_collection_tasks` are unreachable; `valid_until` never lapses. |
| R-10 `ip_hash` | Privileged actions have no origin. |
| R-05 migration bookkeeping | 29 recorded vs 30 on disk. |
| R-07 unit conversions | Cross-unit comparison is not actually normalised. |

## 5. Limitations recorded

The following could **not** be verified and are recorded as explicit limitations rather than assumed:

| Limitation | Impact |
|---|---|
| **No production access.** The live deployment `hatsi360.vercel.app` is behind Vercel SSO and the Vercel connector returns `Access denied` for every account query. | Cannot verify production behaviour, runtime env vars, or that the deployed build matches `26b6514`. Live is commit `b03c1d0`. |
| **No Vercel account access.** `list_projects`, `list_deployments`, `list_teams`, `get_authenticated_user` all denied. | Cannot inspect build settings or env configuration. |
| **No Lighthouse / Web Vitals run.** | No LCP, INP or CLS measurement exists. Performance is assessed from code structure only. |
| **ESLint never ran.** `npm run lint` is broken (R-06). | No static-analysis findings are claimed. |
| **No end-to-end browser run in this session.** Playwright browsers were pruned; the last full UI verification predates this audit. | UI behaviour is assessed from source, not from a rendered page. |
| **Only one job-runner read.** `/api/jobs/run` authentication was not fully traced (INT-3). | Recorded as UNKNOWN rather than assumed secure. |
| **Supabase connector used read-only.** No schema, data, auth or RLS change was made. | The audit makes no production change. |
| **`/tmp/arena-workspace` deleted; `/home/user/uploads` kept** by explicit instruction. | Brand source files preserved. |

## 6. Explicit non-authorisations

This audit does **not** authorise, and must not be read as authorising:

- Any production deployment.
- Any DNS, canonical-host or domain change.
- Any migration against the connected Supabase project without staging, backup, count verification
  and a rollback plan.
- Any destructive migration or record deletion.
- Repurposing the connected Supabase project for another product.
- Any page redesign, brand change or component rewrite.
- Beginning Phase 02 without explicit approval.

## 7. Sign-off

| Field | Value |
|---|---|
| Phase | 01 — Comprehensive technical audit |
| Commit | `26b6514` |
| Audit date | 2026-11-13 |
| Method | Non-destructive, evidence-driven; read-only database inspection; source analysis |
| Documents produced | 11 (this set) |
| Blocking conditions | C1, C2, C3, C4, C5 |
| **Phase 02 verdict** | **CONDITIONALLY APPROVED** |

**Phase 02 has not been started.** Awaiting explicit approval and closure of the conditions above.
