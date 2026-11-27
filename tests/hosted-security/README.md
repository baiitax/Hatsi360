# Hosted security acceptance harness

**Status:** preparation artefact — **never executed against a hosted project**.
Ten checks (H-1…H-10) that can only be closed on an isolated staging project.
Specification: `docs/security/PHASE_7B_HOSTED_ACCEPTANCE_SPEC.md`.

## Quick start

```bash
node tests/hosted-security/run.mjs --list          # what exists
node tests/hosted-security/run.mjs --help
node tests/hosted-security/test/run-all.mjs        # harness self-tests (offline, 57 checks)
```

## Running against staging

```bash
export HATSI360_STAGING_PROJECT_REF=<20-char-ref>
export HATSI360_STAGING_URL=https://<ref>.supabase.co
export HATSI360_ANON_KEY=<anon key>
export HATSI360_OPERATOR="<your name>"

# 1. read-only: prove the environment and the resolver surface
node tests/hosted-security/run.mjs --all --dry-run
node tests/hosted-security/run.mjs --test H-2 --test H-3 --test H-1

# 2. write-capable: fixtures, RLS, service role
export HATSI360_SERVICE_KEY=<service key>
export HATSI360_CONFIRM_WRITES=yes-this-staging-is-disposable
export HATSI360_CONFIRMED_PROJECT_REF=<same 20-char-ref, typed again>
node tests/hosted-security/prereqs.sql   # in the SQL editor; save the JSON row
node tests/hosted-security/run.mjs --all --mode write --prereqs ./prereqs.json

# 3. destructive (H-8) — separate window, human supervised
export HATSI360_ALLOW_DISRUPTIVE=1
node tests/hosted-security/run.mjs --test H-8 --mode write --allow-destructive --prereqs ./prereqs.json
```

## Safety controls

| Control | Behaviour |
|---|---|
| Production refusal | `umxzsdepbrenqysabtlt` is rejected in the ref **and** anywhere in the URL |
| No inference | ambient `SUPABASE_URL`/`SUPABASE_*` variables are reported and ignored |
| Explicit reference | missing or empty `HATSI360_STAGING_PROJECT_REF` refuses |
| Host match | the URL host must be `<ref>.supabase.co`; anything else refuses |
| Local gating | non-Supabase/local hosts need `HATSI360_ALLOW_LOCAL=1`, and then every check is `blocked` |
| Write confirmation | mode `write` requires the exact confirmation string, an operator name and a re-typed ref |
| Prereq manifest | write mode refuses without `--prereqs`; the harness never applies migrations |
| Destructive | needs both `--allow-destructive` and `HATSI360_ALLOW_DISRUPTIVE=1` |
| Read-only default | `--all` without `--mode write` runs only the read-only tier |
| No project mutation | nothing creates, deletes, pauses or upgrades a project |
| Secret hygiene | `lib/redact.mjs` strips JWTs, keys and authorisation headers on the way into evidence; `report.mjs` re-validates and will not write a record containing a JWT |
| No false pass | a local target, a missing key or a missing prerequisite yields `blocked`, exit `3` |

## Layout

```
run.mjs              entry point, argument parsing, selection, cleanup finally-block
checks/index.mjs     H-1…H-10 declarations and runners
lib/env.mjs          environment guard
lib/http.mjs         PostgREST client, no-throw on 4xx, redacted traces
lib/report.mjs       record schema, validation, summary, exit codes
lib/fixtures.mjs     synthetic fixtures and reverse-order cleanup
lib/redact.mjs       secret redaction
prereqs.sql          operator-run read-only manifest query
test/                harness self-tests (offline)
evidence/            per-run output, never committed
fixtures/README.md   fixture specification
```

## Exit codes

`0` all selected checks passed (or not applicable) · `1` a check failed · `2` configuration refused ·
`3` incomplete (blocked / not executed).

**Exit 3 is not success.** The summary prints "Blocked and not-executed tests are not passes".

## Limits

* H-4, H-7 and H-8 are manual and will report `not-executed` until a human runs them.
* H-9 needs the operator to apply `0047` and `0059`; the harness only verifies behaviour afterwards.
* The harness samples H-10; it does not enumerate 89 tables.
* Only staging proves staging. Nothing here substitutes for a local suite, and nothing local
  substitutes for this.
