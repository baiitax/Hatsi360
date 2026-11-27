# Phase 7B — Hosted Security Acceptance Package: Final Report

**Date:** 2026-11-26 · **Branch:** `arena/990d7ace-hatsi360`
**Baseline:** `ce17b64081648bb0cad5a7ace008478dcbde2fce` (Phase 6)
**Scope:** preparation only · **Status:** uncommitted, unpushed · **Release:** `NOT_READY_FOR_PRODUCTION`

---

## 1. Summary

Phase 7B built the package that lets an authorised engineer run H-1…H-10 against a future isolated
staging project and reach a defensible acceptance decision without re-deriving anything.

**No hosted test was executed. No risk was closed. No migration was applied. Nothing was pushed.**

What changed in our ability to decide:

1. **The ten checks now have an executable form** — a harness that refuses to run anywhere it should
   not, instead of a table of intentions.
2. **The `0056 → 0058 → 0057 → 0061` ordering is proven load-bearing**, by running the wrong orders
   and watching `0061` refuse. Documentation became a mechanism.
3. **The 89 service-role tables are individually classified** for the first time, and the two
   competing models (broad repair vs evidence-narrowed) are separated explicitly, with neither
   approved.
4. **One real guard asymmetry was found and closed** (`0061`'s self-check scans anon-reachable
   policies only), in the test layer — the unapplied proposal was not touched.
5. **One inherited figure was corrected** (R-5's "35 tables still hold `TRUNCATE`" → 39) with the
   measurement and the reason for the discrepancy recorded beside it.

## 2. Deliverables

| # | Deliverable | Path | Status |
|---|---|---|---|
| A | Hosted acceptance specification | `docs/security/PHASE_7B_HOSTED_ACCEPTANCE_SPEC.md` | complete — 353 lines, H-1…H-10 × 15 fields |
| B | Harness | `tests/hosted-security/` (`run.mjs`, `lib/`, `checks/`, `test/`, `prereqs.sql`, `README.md`) | complete, self-tested offline |
| C | Role and identity matrix | `docs/security/PHASE_7B_ROLE_IDENTITY_MATRIX.md` | complete |
| D | Function privilege acceptance | `docs/security/PHASE_7B_FUNCTION_PRIVILEGE_ACCEPTANCE.md` | complete |
| E | Service role acceptance (89 tables) | `docs/security/PHASE_7B_SERVICE_ROLE_ACCEPTANCE.md` | complete |
| F | Fixture specification | `tests/hosted-security/fixtures/README.md` | complete |
| G | Evidence standard + report template | `docs/security/PHASE_7B_EVIDENCE_STANDARD.md` | complete |
| H | Risk register update | `docs/improvement/PHASE_2_OPERATIONAL_READINESS_REPORT.md` rows 34–40, §15.1 | complete |

## 3. Validation (measured today, this worktree)

### 3.1 Harness self-tests — offline, no network

| File | Checks | Result |
|---|---|---|
| `test/guards.test.mjs` | 15 | pass — production ref, missing ref, host mismatch, ambient-variable inference, local gating, write confirmation set, operator, re-typed ref, unknown mode |
| `test/redact.test.mjs` | 8 | pass — secret keys, embedded JWTs, bearer tokens, opaque keys, refs preserved, non-mutation |
| `test/report.test.mjs` | 14 | pass — schema validation, JWT rejection, status semantics, exit codes, blocked≠passed wording |
| `test/routing.test.mjs` | 10 | pass — ten unique checks, tiers, layers, prerequisite chain, mode gating, destructive flag |
| `test/cli.test.mjs` | 10 | pass — end-to-end refusal paths, no key printed, local target yields exit 3 |
| **Total** | **57** | **57/57** |

### 3.2 Local security suites — baseline preserved

| Suite | Result |
|---|---|
| `b2b-acceptance` | 20/20 |
| `b2b-security` | 22/22 |
| `default-privilege-guard` | 9/9 |
| `entitlement-integration` | 23/23 |
| `entitlement-rls-enforcement` | 22/22 |
| `entitlement-stage1-matrix` | 31/31 |
| `function-privileges` | **61/61** (was 60/60 — check 7b added) |
| `privilege-invariants` | 14/14 |
| `proposal-review` | **32/33 — pre-existing failure, unchanged** |
| `rls-acceptance-matrix` | **122/126 — pre-existing failures, unchanged** |
| `rpc-contract` | 49/49 |
| `service-role-access` | 27/27 |
| **Totals** | **437 checks, 432 pass, 5 fail — the same five** |

The five reds are preserved deliberately. `WITH_PROPOSED_0060=1` still yields **126/126** on the
matrix; that remains an opt-in diagnostic, **not** the baseline.

### 3.3 Other gates

| Gate | Result |
|---|---|
| `bash scripts/validate_migrations.sh` | `ALL MIGRATIONS APPLIED CLEANLY` |
| `git diff --stat -- supabase/migrations` | 0 lines — migration history untouched, `0053` byte-identical |
| `npx eslint tests/hosted-security` | clean |
| TypeScript | no `.ts`/`.tsx` file changed, so `tsc` is unaffected |
| `node --check` on every new `.mjs` | pass |

## 4. Findings

| # | Finding | Severity | Disposition |
|---|---|---|---|
| P7B-1 | `0061`'s policy self-check scans **anon-reachable policies only**; all fourteen `0057` policies are `TO authenticated` and therefore outside it | Low | Closed in the test layer: `function-privileges` **7b**. Proposal untouched. Optional SQL extension documented in deliverable D §3.1 |
| P7B-2 | R-5's "35 tables still hold `TRUNCATE`" is arithmetic, not measurement: only `price_observation_evidence` actually holds it, so the correct post-`0060` figure is **39** | Low | Corrected in the risk register (row 31) and E §2, with the original figure kept in the sentence |
| P7B-3 | Class-2 tables (19) are writable by a service key that no measured path uses for writing — a leaked key means forged orders/quotes | Medium | E §4.3; feeds LS-1's narrow model |
| P7B-4 | 46 tables have no measured consumer; "no consumer" is a statement about audited code paths, not proof of absence | Medium | E §4.2; recommendation is runtime instrumentation before narrowing |
| P7B-5 | H-9's own writes are undeletable after `0060` (evidence tables), so the fixture project must be discarded after that test | Medium | Fixture README §4, risk 39 |
| P7B-6 | `0057`-before-`0058` is harmless but leaves the resolver hazard live longer; neither depends on the other | Info | D §2 |
| P7B-7 | `write_audit()` remains unguarded in its body; `0061` is containment by grant, not authorisation | High (residual) | risk 28, unchanged |

## 5. Corrections to earlier phases

* **Phase 5** said "60 of 89 tables grant `service_role` nothing" — Phase 6 corrected this to 42; the
  Phase 7B re-measurement returns the same 42, 43 lacking complete DML, 20 with admin references.
* **Phase 6 R-5** said 35 tables still hold `TRUNCATE`; measured 40 today, **39** after `0060`.
* **Phase 6 §7** describes the classification as `0056 → 0058 → 0057 → 0061`; that order is now
  backed by three executed experiments rather than review alone.

No earlier document was rewritten in place, except risk row 31, whose original figure is preserved
inside the corrected sentence.

## 6. What was deliberately not done

* No staging project created, paused, upgraded or repurposed; no plan change.
* No connection to production; the production reference is refused by code, not convention.
* No migration applied — not `0055`, not `0056`–`0061`, not a test fixture file.
* No change to `supabase/migrations/`, `0053`, or any deployment/secret configuration.
* No credentials requested from anyone; the harness documents what an operator must supply.
* No claim that H-1…H-10 passed; all ten are `not-executed` (H-9 additionally `blocked`).
* No risk closed on the basis of a local test.
* No approval of broad `service_role` grants, and no approval of the narrow model either.
* Nothing pushed or merged — this report is the review request.

## 7. Exact changes under review (25 paths)

Modified (2):

```
docs/improvement/PHASE_2_OPERATIONAL_READINESS_REPORT.md   +36 −1   (rows 34–40, §15.1, row 31 correction)
supabase/tests/function-privileges.mjs                     +18 −0   (check 7b)
```

Added (23):

```
docs/security/PHASE_7B_HOSTED_ACCEPTANCE_SPEC.md
docs/security/PHASE_7B_ROLE_IDENTITY_MATRIX.md
docs/security/PHASE_7B_FUNCTION_PRIVILEGE_ACCEPTANCE.md
docs/security/PHASE_7B_SERVICE_ROLE_ACCEPTANCE.md
docs/security/PHASE_7B_EVIDENCE_STANDARD.md
docs/security/PHASE_7B_FINAL_REPORT.md            (this file)
tests/hosted-security/README.md
tests/hosted-security/run.mjs
tests/hosted-security/prereqs.sql
tests/hosted-security/checks/index.mjs
tests/hosted-security/lib/env.mjs
tests/hosted-security/lib/http.mjs
tests/hosted-security/lib/redact.mjs
tests/hosted-security/lib/report.mjs
tests/hosted-security/lib/fixtures.mjs
tests/hosted-security/fixtures/README.md
            (deliverable F)
tests/hosted-security/test/run-all.mjs
tests/hosted-security/test/guards.test.mjs
tests/hosted-security/test/redact.test.mjs
tests/hosted-security/test/report.test.mjs
tests/hosted-security/test/routing.test.mjs
tests/hosted-security/test/cli.test.mjs
tests/hosted-security/evidence/.gitignore
```

`supabase/migrations/`: **0 diff**. `supabase/proposed/`: **0 diff** (`0061` untouched).

## 8. Residual risk and recommendation

Open and unchanged: LS-1 (broad service-role grant), risk 28 (`write_audit`), risk 37 (`0055`
credential-holder dependency), risk 34–40 (introduced here: hosted layer unproven, no staging,
harness untested against a real target, evidence-table cleanup, five baseline reds).

**Recommendation: `NOT_READY_FOR_PRODUCTION`.** The package removes the *excuse* for not running
hosted acceptance — it does not remove the risk. The next decision belongs to the reviewer: approve
the harness as the instrument, choose the staging path in §16.1 of the operational readiness report,
and schedule the first run.

## 9. Review request

Before this is pushed:

1. Is the harness's safety model sufficient — specifically, is "explicit confirmed ref + operator
   name + exact confirmation string + prereq manifest" enough evidence that a target is disposable?
   A project ref alone proves nothing, and no code can prove disposability; only a human decision can.
2. Should the `0061` self-check for authenticated-reachable policies live in SQL (proposal edit) or in
   the test (as implemented)? Both are documented; only one is applied.
3. Is classifying `offer_verification_events` by evidence precedence (class 4) rather than by its
   admin reference (class 1) the right call? It changes the recommended `DELETE` position.
4. Is the H-9 "discard the project afterwards" constraint acceptable, or does it argue for a
   separate service-role project that is never reused?
