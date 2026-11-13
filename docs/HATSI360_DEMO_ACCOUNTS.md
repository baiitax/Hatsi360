# Hatsi360 demo accounts

Status: **created and verified live**. Three accounts exist in the connected
Supabase project. Anyone who can open `/login` can sign in as an
administrator. That is a deliberate, recorded decision, not an oversight.

## The decision, and why it is a decision

When this work started the demo credentials were gated behind an environment
flag that defaulted to **off** — the safe default. The requester chose
**always visible on the login page** instead, after being shown the exposure.

The trade-off that was accepted:

- Anyone who can reach `/login` can sign in as `admin` and read every screen in
  the admin console.
- `/login` is a public route. It is `noindex, nofollow` (verified in the served
  HTML), but that does not restrict access.
- There is no additional rate limit or IP allowlist in front of it.

The mitigation is that **these are not real accounts and hold no real data**:

- The production database is empty of observations, offers, reports and
  articles — verified by count, not by assumption.
- The demo accounts' `profiles.organisation` reads
  `Hatsi360 demo account — not a real user`, and `full_name` is prefixed
  `DEMO — `.
- The only real rows they can reach are the reference catalogue: 22
  commodities, 14 categories, 11 markets, 11 states, 8 measurement units, 58
  commodity grades. Those are reference data, already public through the
  marketing site.

If this deployment ever holds real commercial data, the credentials must be
removed or the panel gated again. See "Removing them" below.

## The accounts

Shared password: **`hatsi360-demo`**

| Email | Role | Lands in | Why |
| --- | --- | --- | --- |
| `demo.agent@hatsi360.test` | `agent` | `/agent/home` | The field agent app. |
| `demo.verifier@hatsi360.test` | `verification_officer` | `/admin/verification` | The verification queue — a *staff* workspace, not the admin console. |
| `demo.admin@hatsi360.test` | `admin` | `/admin/overview` | The enterprise admin console. |

Three accounts, not one per role, because the requester asked for both the
agent and admin portals to be testable and a verification officer is the role
that actually exercises the offer workflow.

### Why the agent has a market assignment

`demo.agent` carries an `agent_profiles` row (`employee_code = DEMO-AGENT`,
`employment_status = active`) and an **active** `market_agent_assignments` row
for **market 1, Dawanau International Grains Market**.

This is not decoration. RLS refuses an agent's writes at markets they are not
assigned to. Without the assignment, opening the agent app would fail in a way
that looks like a broken build rather than a correctly under-granted
permission. With it, the app opens and the permission boundary is the one the
policies actually define.

### Verified state

Each account was checked by reading the row, not by assuming the script
worked:

- `auth.users` holds exactly these three rows — confirmed by paging the admin
  API. (See "The sweep" for what was there before.)
- `profiles.role` is `agent` / `verification_officer` / `admin`.
- `profiles.account_status` is `active`; `is_active` is `true`.
- Password sign-in issues a real session token for each of the three.
- Each user's **own** token can read their own profile under RLS — i.e. the
  session works end to end, not just at the auth layer.

## Creating, updating, removing

Everything is `scripts/manage_demo_users.mjs`. It is idempotent — run it
twice and it updates rather than duplicating. It uses the Supabase Auth Admin
API, because `auth.users` cannot be written by the `postgres` role and carries
an `after insert` trigger (`on_auth_user_created` → `handle_new_user()`) that
creates the `profiles` row. Going through the admin API fires that trigger, so
the accounts are created the same way the application creates them.

```bash
# Create or update all three (safe to re-run).
node scripts/manage_demo_users.mjs

# Delete the three demo accounts.
node scripts/manage_demo_users.mjs --remove
```

The script reads credentials from `.env.local`
(`SUPABASE_SERVICE_ROLE_KEY`); nothing is hardcoded.

The password and market id are constants at the top of the file:

```js
const DEMO_PASSWORD = 'hatsi360-demo';
const DEMO_MARKET_ID = 1;
```

### Changing the password

Edit `DEMO_PASSWORD` and re-run the script. The panel renders no password of
its own — each button submits `demo.agent@hatsi360.test` with whatever
`DEMO_PASSWORD` is, so the UI and the database cannot disagree.

## Where they appear in the UI

`src/components/forms/DemoAccountsPanel.tsx`, rendered by
`src/app/(portal)/login/page.tsx` directly under the real sign-in form.

Each account is its own `<form>` posting through the **same** `signIn` server
action as the real form, with `email` and `password` as hidden inputs. That is
deliberate: there is no second authentication path to keep in sync, and a demo
sign-in is subject to the same rate limiting, the same account-status check
and the same `landingPathForRole()` redirect as a real one.

The panel shows the target workspace on each button so the reader knows where
they will land, and carries the removal command in its footer.

## The sweep — and a rule for future tests

`auth.users` held **32 rows** after the demo accounts were created. The other
29 were not leftovers from this task: they were `offer-owner*`,
`offer-verifier-*` and `offer-stranger-*` fixtures leaked by earlier
offer-workflow test runs, and **each one was login-capable**.

`scripts/manage_demo_users.mjs --sweep` removed all 29. `auth.users` now holds
exactly the three demo accounts.

The reason 29 accumulated rather than being cleaned up as they were created:
the Supabase Auth Admin API has **no delete-by-query and no
lookup-by-email** — `findUserByEmail` has to page `?page=N&per_page=200`. So
the tests had no cheap way to confirm a fixture was gone, and did not try.

**Rule for any future test that creates an auth user:** delete your own
fixture in a `finally`, and run `node scripts/manage_demo_users.mjs --sweep`
afterwards to confirm. A fixture that can log in is a credential leak, not
test data.

## Verified in a real browser

`scripts/verify_demo_journey.mjs` (Playwright) clicks each demo button on
`/login` exactly as a person would and asserts the browser lands in the right
workspace and renders it. **All three journeys pass** — 6 checks each:
redirect target, workspace content rendered, no runtime error, session cookie
set, no console errors.

| Account | Lands in | What it renders |
| --- | --- | --- |
| Market agent | `/agent/home` | 1 assigned market, **Start collection** enabled, Dawanau listed under "Your markets" |
| Verification officer | `/admin/verification` | The queue with its status filters and an honest empty state: *"No sample or placeholder records are shown."* |
| Administrator | `/admin/overview` | 11 registered markets, 1 registered agent, 0 observations / 0 awaiting verification / 0 published — each with its `public.*` source named |

Run it with the server up:

```bash
npx next build && npx next start -p 3103
node scripts/verify_demo_journey.mjs http://localhost:3103
```

The verification officer's screen is worth reading closely: it states that
approving a price records that it is sound and that publishing is a separate,
second act — and the queue is empty because nothing has been submitted, not
because the screen is unfinished.

## What this does not verify

- No responsive measurement at 320/360/375/390/430 px, tablet or desktop has
  been taken on the login page or the three portals.
- No Lighthouse / LCP / INP / CLS measurement has been taken.
- No Playwright suite exists in the repository; `scripts/verify_demo_journey.mjs`
  is a one-shot verification script, not a checked-in suite.

## What the journey found — three real bugs

The browser journey is not decoration. Running it found three defects that no
unit test could have caught, because each one is correct TypeScript that only
fails when the query executes.

**1. The agent portal was broken for every agent.**
`getFieldMarkets()` selected `zone_id` from `markets`. The column is
`market_zone_id`. The query failed, the failure was swallowed by
`data ?? []`, and the function returned an empty list — so an agent with an
active assignment saw *"No market is assigned to you"* and a disabled Start
collection button, while the notification beside it said they had been assigned
to a market. Fixed. `admin.ts` and `analytics/snapshot.ts` already used the
correct name; only the field app was wrong.

**2. The agent detail screen 404'd for every agent.**
`getAgentRecord()` selected `profiles.email`. `profiles` has no `email` column
— the address belongs to `auth.users`, and duplicating it would let the two
drift. The query failed, `profileResult.data` was null, and the page called
`notFound()`. The same wrong column was in three places in `commercial.ts`,
including a search filter (`.or('full_name.ilike.%x%,email.ilike.%x%')`) that
failed whenever a term was supplied. Fixed by reading the address through the
auth admin API in a new server-only module, `src/lib/auth/emails.ts`.

**3. The collection form had no grades.**
`getFieldGrades()` selected `commodity_grades.grade_code` and filtered
`.eq('is_active', true)`. Neither column exists. The query failed and the form
opened with no grades to choose from. Fixed — the catalogue is the 58 rows
migration 0023 seeded, and every one of them is a grade an agent may use.

**The regression test that came out of it.**
`tests/data-integrity/schema-drift.test.ts` reads every
`.from('table').select('columns')` and every `.eq()/.in()/.order()` filter in
`src/` and `scripts/` and checks the columns against the live schema. It skips
with a stated reason when the database is unreachable rather than passing
vacuously. All three bugs above fail it.

## Also found while verifying

- **An unknown `/api/v1/*` path returned 28 KB of HTML**, not the JSON error
  envelope every other failure on that surface uses. An API client parsing
  `error.code` on a 400 would choke on a 404. Fixed with a catch-all route in
  `src/app/api/v1/[...path]/route.ts`.
- **`tests/api-routes.test.ts` could never run.** Its route handlers call
  `cookies()` from `next/headers`, which Next.js refuses outside a request
  scope, and Vitest provides none — so 19 of its 28 assertions failed on a 500
  before evaluating anything. This predates every change in this session
  (verified by stashing the working tree and re-running). The same assertions
  now run for real in `tests/api/http.test.ts` over HTTP, and the original file
  skips with that reason instead of sitting permanently red.
- **A stale count in that test.** It asserted `pagination.total` is 22. The
  catalogue holds 22 commodities, one of which — *"Paddy Rice (duplicate
  record)"* — is `is_active = false` and correctly excluded from the public
  API. The live API returns 21. Asserting 22 counted the raw table.
