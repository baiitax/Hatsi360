# Pluck Live — Authorization & Row Level Security design

**Scope:** how the rebuild decides who may see and change what, at every layer of the stack.
**Enforcement:** PostgreSQL Row Level Security is the authority. The UI is a convenience, never a
control.

---

## 1. The rule that matters

> Hiding a button is not authorization.

Every authorisation decision in this application is made **server-side**, and again **in the
database**. The application layer exists so that a user gets a good error message; the RLS layer
exists so that a user cannot get the data at all. If the application layer were entirely bypassed —
a direct `curl` to PostgREST, a leaked anon key, a SQL injection in some future feature — the
database still refuses.

The three layers:

| Layer | Mechanism | Fails to |
| --- | --- | --- |
| Route / server action | `src/lib/auth/guards.ts` — `requireUser()`, `requireStaff()`, `requireAdmin()` | return a friendly 403 instead of a stack trace |
| API handler | `src/lib/api/{auth,handler}.ts` — bearer key, scope check, rate limit | authenticate an integrator and meter their usage |
| Database | `pg_policies` + triggers in `public` schema | ever leak a row |

## 2. Roles

`public.user_role` (migration `0001`):

| Role | Meaning |
| --- | --- |
| `public_user` | Signed-up, no privileges beyond their own profile. The default for every new signup. |
| `customer` | A paying or trial subscriber. Owns saved items, alerts, subscriptions. |
| `agent` | Collects prices in the field, for the markets they are assigned to. |
| `verification_officer` | Reviews and publishes agent submissions. |
| `market_supervisor` | Manages agents and assignments for a set of markets. |
| `analyst` | Manages articles, categories and market reports. |
| `admin` | Full administrative access. |
| `super_admin` | Reserved for the platform owner. |

A user's role lives in `public.profiles.role` and is resolved by the `SECURITY DEFINER` helper
functions in `0005`:

```sql
public.current_role()   -- the caller's role, 'public_user' when unknown
public.has_role(...)    -- variadic role test
public.is_staff()       -- verification_officer, market_supervisor, analyst, admin, super_admin
public.is_admin()       -- admin, super_admin
public.assigned_market_ids()  -- the markets the calling agent is currently assigned to
```

`SECURITY DEFINER` is required because the profiles table's own policy hides other people's rows:
without it, a helper could not read the caller's role. Every helper pins
`set search_path = public`, and **no helper ever accepts a caller-supplied user id** — the subject
is always `auth.uid()`, which comes from the verified JWT and cannot be chosen by the client.

## 3. The privilege layer (why it exists)

`0009_grants.sql` grants table privileges; `0005` grants rows. Both are needed:

* Without a table grant, `anon`/`authenticated` get `permission denied for table` — the RLS policy
  is never evaluated, so a policy that has never run is not a policy.
* Without an RLS policy, a table grant exposes every row.

Grants are deliberately coarse (table level) and policies are deliberately precise (row level).
`anon` is granted `SELECT` only on public reference data, published observations, published
articles and published (non-premium) reports. `authenticated` gets `SELECT`/`INSERT`/`UPDATE` on
the tables listed in `0009`; `DELETE` is granted only where the design calls for it
(`price_observations`, `saved_*`, `organizations`, `organization_members`).

The `service_role` bypasses RLS. It is used **only** on the server, in
`src/lib/supabase/admin.ts`, which is marked `server-only` so it cannot be imported into a client
bundle. Its key never reaches the browser and is never logged.

## 4. The policy map

74 policies across 39 tables. All 39 tables have RLS enabled. The full list is reproduced by the
migration validator; the shape is:

### Reference data — public by design

`countries`, `states`, `market_zones`, `markets`, `market_operating_schedules`,
`commodity_categories`, `commodities`, `commodity_varieties`, `commodity_grades`,
`commodity_synonyms`, `measurement_units`, `commodity_unit_conversions` →
`for select to anon, authenticated using (true)`.

These carry no prices and no secrets. Making them public is deliberate: the price pages, the
comparison widget and the market directory all need them, and a catalogue entry is not sensitive.

### Price observations — the core

| Policy | Command | Who | Rule |
| --- | --- | --- | --- |
| `price_observations_public_read` | select | anon, authenticated | `is_public_observation(verification_status, published_at, is_current)` |
| `price_observations_staff_read` | select | authenticated | `is_staff()` |
| `price_observations_agent_read` | select | authenticated | `agent_user_id = auth.uid()` |
| `price_observations_agent_insert` | insert | authenticated | role is agent/supervisor **and** `agent_user_id = auth.uid()` **and** `market_id in assigned_market_ids()` **and** status is draft/pending |
| `price_observations_staff_insert` | insert | authenticated | `is_staff() and agent_user_id = auth.uid()` |
| `price_observations_agent_update` | update | authenticated | own row **and** status is draft/correction_requested **and** `is_current` |
| `price_observations_staff_update` | update | authenticated | `is_staff()` |
| `price_observations_delete` | delete | authenticated | admin, **or** own unpublished draft |

`public.is_public_observation(status, published_at, is_current)` is the single definition of
"publicly visible":

```sql
is_current
and published_at is not null
and verification_status in ('verified', 'legacy_unverified')
```

`legacy_unverified` is included deliberately: the migrated legacy records are real published
records with no verification trail. They are public **because they were published by the legacy
system**, and every one of them carries the `legacy_unverified` quality flag, which the UI
surfaces. Excluding them would silently delete the site's history; over-claiming them would
pretend they were verified.

### Agents are scoped twice

An agent may only submit for a market they are currently assigned to
(`public.assigned_market_ids()` reads `market_agent_assignments`, filtered by
`auth.uid()`), and only as themselves (`agent_user_id = auth.uid()`). They may not set
`verification_status = 'verified'` and may not set `published_at`: the insert policy only allows
`draft` and `pending_verification`. Publication is a separate, staff-only action.

### Customers own their own data

`saved_commodities`, `saved_markets`, `price_alerts`, `report_subscriptions`,
`api_applications`, `api_usage_logs`, `customer_subscriptions` and `billing_events` are all
scoped with `user_id = auth.uid()`. Administrators can read them for support purposes.

### Premium content

`market_reports` is readable by `anon`/`authenticated` when it is **not** premium and is published.
Premium reports additionally require an active subscription with the `reports` entitlement:

```sql
exists (
  select 1 from customer_subscriptions s
  where s.user_id = auth.uid()
    and s.status in ('active','trialing')
    and (s.ends_at is null or s.ends_at > now())
    and coalesce((s.entitlements ->> 'reports')::boolean, false)
)
```

The free public price experience is never gated. Only the features explicitly designated premium
(reports, API, alerts) are.

### Staff-only surfaces

`audit_logs`, `system_settings`, `price_verification_events`, `price_revision_history`,
`data_quality_flags`, `collection_tasks`, `market_agent_assignments` and the staff-write policies
on `articles` / `article_categories` / `market_reports` are restricted to staff or administrator
roles.

## 5. Triggers — the rules RLS cannot express

RLS decides *which rows* a caller may touch. It cannot express "this row may never change" or
"this field may only be changed one way". Those are triggers:

| Trigger / function | Rule |
| --- | --- |
| `prevent_role_escalation` (trigger `profiles_prevent_role_escalation`) | Only `admin`/`super_admin` may change **any** role, on **any** profile. The last administrator cannot be demoted. |
| `prevent_published_economic_mutation` (trigger `price_observations_prevent_published_mutation`) | A published observation's economic fields are immutable — for administrators too. |
| `audit_observation_change` (trigger `price_observations_audit_change`) | Writes an audit row for every change to an observation. |
| `append_correction()` (function) | Writes a superseding observation, marks the original `is_current = false`, records `superseded_by`, and writes a `price_revision_history` snapshot and a `price_verification_events` entry. |
| `publish_observation()` (function) | Publishes a pending observation, stamps `published_at`, writes the verification event. Staff only. |
| `reject_observation()` (function) | Rejects an observation with a reason, leaving the trail intact. Staff only. |
| `handle_new_user()` (trigger `on_auth_user_created` on `auth.users`) | Creates the profile with the least-privileged role `public_user`. |

### The role-escalation trigger, in full

```sql
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Only end-user sessions are subject to the guard; the service role and
  -- direct database administrators are trusted.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'Only an administrator may change an account role.';
    end if;

    if old.role in ('admin', 'super_admin')
       and new.role not in ('admin', 'super_admin')
       and (select count(*) from public.profiles
             where role in ('admin', 'super_admin') and id <> old.id) = 0 then
      raise exception 'The last administrator account cannot be demoted.';
    end if;
  end if;
  return new;
end;
$$;
```

The function is `SECURITY INVOKER` on purpose: `current_user` then identifies the **caller**, not
the function owner. (Under `SECURITY DEFINER`, `current_user` is the owner, and the guard would
never see an end-user session.) `public.is_admin()` remains `SECURITY DEFINER` so it can read the
profiles table regardless of the caller's own row visibility.

Two independent defences protect the role column: the policy (`profiles_update_own` allows only
your own row; `profiles_admin_update` allows administrators) and the trigger (only administrators
may change a role). Neither is trusted alone.

## 6. Testing the rules

`tests/rls/permission-tests.sql` runs against a real PostgreSQL instance with the migrations
applied (`bash scripts/validate_migrations.sh`). It impersonates each role by switching to it and
setting the JWT subject claim, and it asserts on **effects**, not on error messages:

| Helper | Meaning |
| --- | --- |
| `assert_true(condition, message)` | A condition holds. |
| `assert_raises(message, statement)` | The statement must raise. |
| `assert_no_rows_affected(message, statement)` | The statement must succeed **and change nothing** — this is how RLS denials are detected, because RLS filters UPDATE/DELETE rows silently instead of raising. |
| `assert_rows_affected(message, statement, n)` | The positive control: the statement must succeed and change exactly `n` rows. |

49 assertions in 9 blocks: anonymous visitors, a market agent, a second agent, a customer, a
signed-up user without a profile row, a verification officer, publication integrity, role escalation
and the public views. The positive controls matter as much as the denials: without
`assert_rows_affected`, a test suite can pass while the policy it thinks it is exercising is not
actually granting access.

The suite runs against a **stub** of the Supabase `auth` schema, not a hosted project. The
policies are exercised faithfully; PostgREST's role switching and JWT handling are not. Running
the same assertions against a hosted Supabase project is on the pre-go-live checklist
(`docs/DEPLOYMENT.md` §6).

## 7. What is deliberately not in the database

* **No client-supplied role.** Roles are read from `profiles` by `auth.uid()`.
* **No client-supplied organisation id.** Organisation membership is resolved through
  `organization_members` and `auth.uid()`.
* **No service-role key in the browser.** `src/lib/supabase/admin.ts` imports `server-only`; the
  browser bundle never contains it.
* **No plaintext API key at rest.** `api_applications.key_hash` holds a SHA-256 hash; comparisons
  use `timingSafeEqual`.
* **No floating-point money.** `numeric(18,4)` everywhere.
* **No silent unit conversion.** `normalized_amount` stays `NULL` when the conversion is unknown.
