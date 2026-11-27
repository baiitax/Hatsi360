# Phase 7B — Evidence Standard

**Classification:** preparation only · **Baseline:** `ce17b64081648bb0cad5a7ace008478dcbde2fce`
**Implementation:** `tests/hosted-security/lib/report.mjs`, `lib/redact.mjs`

---

## 1. Why an evidence standard is the deliverable

The acceptance decision will be made months from now, by someone who was not in the room, from
whatever was written down. Two failure modes have already occurred in this programme:

* a green local suite was read as evidence for a hosted behaviour it could not test (Phase 3), and
* a test that had never been run was described as part of a passing baseline (Phase 5 review).

This standard exists so that neither can happen again: every claim carries its target, its commit,
its identity, its exact request and its raw status — and "not run" has a name.

## 2. Record schema

One JSON object per test, written to `evidence/<run-id>/<TEST-ID>.json`.

| Field | Type | Rule |
|---|---|---|
| `id` | string | `H-1` … `H-10`; validated by regex |
| `title` | string | copied from the registry, never retyped |
| `layer` | string[] | from `{sql, postgrest, jwt, rls, execute, application}` |
| `tier` | string | `read-only`, `write`, `service`, `manual`, `destructive` |
| `identity` | string | which fixture identity made the request |
| `status` | enum | `passed`, `failed`, `blocked`, `not-applicable`, `not-executed` |
| `startedAt` / `finishedAt` | ISO-8601 UTC | from the runner's clock |
| `commit` | string | `git rev-parse HEAD` at run time; `(unset)` is itself a finding |
| `target` | object | `kind`, `ref`, `host`, `mode`, `operator`, `allowDisruptive` |
| `proposalVersion` | string \| null | the prereq manifest's `applied` list |
| `request` | object \| null | method, path, sanitised params, redacted headers |
| `response` | object \| null | status, sanitised body (or a shape summary for large payloads) |
| `expected` | string | what the specification required |
| `actual` | string | what happened, in the same terms |
| `dbEvidence` | object \| null | row counts or ids captured before/after; no row **contents** for PII tables |
| `notes` | string \| null | operator commentary; validated for secrets |
| `cleanup` | object \| null | `attempted`, `deleted`, `failed[]` |
| `problems` | string[] | validation errors; **a record with problems is never written** |

## 3. Redaction

Applied on the way in, and re-validated on the way out (`report.mjs` refuses to write a record whose
text still matches a JWT pattern):

| Pattern | Replacement |
|---|---|
| any value under a key matching `apikey`, `authorization`, `*token*`, `*secret*`, `*password*`, `*cookie*`, `*_key` | `[REDACTED]` |
| `eyJ…` JWTs anywhere in text | `[REDACTED]` |
| `Bearer <opaque>` | `[REDACTED]` |
| opaque strings ≥ 30 chars that look like keys | `[REDACTED]` |
| project references (20 chars, lowercase) | **kept** — a target reference is evidence, not a secret |

Never captured at all: passwords, service keys, session cookies, refresh tokens, `Authorization`
headers, `.env` contents, emails of real users.

## 4. Run-level artefacts

```
evidence/<run-id>/
  H-1.json … H-10.json      per-test records (only those selected)
  summary.json              counts, acceptance verdict, target, commit, mode, operator
  summary.md                the human-readable table pasted into the final report
  fixtures.json             ids created and their cleanup state
  run.log                   console transcript, secrets already redacted
```

`<run-id>` = `run-<UTC timestamp>`. The directory is created fresh; an existing directory is never
reused, so two runs cannot be confused.

## 5. Acceptance semantics

| Verdict | Condition | Exit code |
|---|---|---|
| `ACCEPTED` | every selected test `passed` or `not-applicable` | 0 |
| `REJECTED` | at least one `failed` | 1 |
| `INCOMPLETE` | at least one `blocked` or `not-executed`, and no failures | 3 |
| refused | the environment guard rejected the target | 2 |

**`blocked` ≠ `passed`.** **`not-executed` ≠ `passed`.** A missing service key, a missing
prerequisite or a manual test nobody performed all yield `INCOMPLETE`, and the runner prints
"Blocked and not-executed tests are not passes".

## 6. Final acceptance report template

```markdown
# Hosted Security Acceptance — <date>

Target:      <project ref> (<host>)          Commit: <sha>
Operator:    <name>                           Mode: read-only | write
Prereqs:     <applied list from the manifest>
Verdict:     ACCEPTED | REJECTED | INCOMPLETE

| ID | Objective | Status | Evidence |
|----|-----------|--------|----------|
| H-1 | resolver answers over HTTP | passed | H-1.json |
| … | | | |

## Failures
<one subsection per failed test: request, response, expected, actual, suspected cause>

## Blocked / not executed
<why each one could not run, and what would unblock it>

## Deviations from the specification
<anything the operator had to do differently, and whether the result is still meaningful>

## Residual risks accepted
<risk numbers from the register, with the owner who accepted them>

## Recommendation
NOT_READY_FOR_PRODUCTION | READY_FOR_PRODUCTION_WITH_CONDITIONS | READY_FOR_PRODUCTION
```

The recommendation line is the only place a release statement may appear, and it must be consistent
with the verdict: `INCOMPLETE` can never produce "ready".

## 7. Retention

Evidence directories are not committed (`.gitignore` in `evidence/`). They are attached to the
acceptance record and retained for the life of the risk register entry they close — a closed risk
with no evidence file is reopened on the next review.

## 8. Reviewing someone else's evidence

Check, in order: (1) the target is not production; (2) the commit matches the code reviewed;
(3) every `failed` / `blocked` has an explanation; (4) `expected` is quoted from this specification
rather than written after the fact; (5) no record has an empty `response` for a test that claims a
status; (6) the verdict arithmetic matches the table.
