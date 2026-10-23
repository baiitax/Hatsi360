# Pluck Live — Deployment, backup and rollback

**Applies to:** the Next.js 16 application and the Supabase (PostgreSQL) backend.

---

## 1. What has to exist before the first deploy

| Component | Requirement | Notes |
| --- | --- | --- |
| Node.js | **22 LTS or newer** | `@supabase/supabase-js` no longer supports Node 20; the build prints a deprecation warning on 20 and will stop working on a future release. |
| Package manager | npm 10+ | `npm ci --legacy-peer-deps` — npm 10's peer-dependency resolver fails on the vitest 5 tree without the legacy flag. |
| Supabase project | Postgres 14+ | The migrations use `security_invoker` views and `numeric(18,4)`; both are long-standing features. |
| Auth | Email/password enabled, redirect URLs configured | `NEXT_PUBLIC_SITE_URL/auth/callback` and the same path on any preview host. |
| Storage | A bucket for evidence photos | Not created by the migrations. See §6. |

## 2. Environment variables

Copy `.env.example` to `.env.local` (local) or set the variables in your hosting provider's
dashboard. **Never commit `.env.local`.**

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | build + runtime | production | The canonical origin used for `sitemap.xml`, `robots.txt`, Open Graph URLs and Supabase auth redirects. |
| `NEXT_PUBLIC_SUPABASE_URL` | build + runtime | production | The Supabase project URL. Its presence is what switches the app from the migrated fixture to the real database. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | build + runtime | production | The publishable (anon) key. Safe in the browser **only** because RLS is what protects the data. |
| `SUPABASE_SERVICE_ROLE_KEY` | runtime only | for the API + provisioning | Server-side only. Used by the API-key verifier, the usage logger and the agent-provisioning action. Never exposed to the browser, never logged. |
| `JOB_RUNNER_SECRET` | runtime only | for the scheduler | The shared secret the platform cron presents as `Authorization: Bearer <secret>` when it calls `POST /api/jobs/run`. Without it the endpoint refuses every request. Generate with `openssl rand -hex 32`. |
| `NOTIFICATION_EMAIL_*` | runtime only | optional | The email adapter. Without it the channel reports `skipped`, never `delivered`. |
| `NOTIFICATION_SMS_*` | runtime only | optional | The SMS adapter. Same rule. |
| `NOTIFICATION_WHATSAPP_*` | runtime only | optional | The WhatsApp adapter. Same rule. |

**If the Supabase variables are absent, the application runs on the migrated fixture dataset** and
says so on every page that shows prices. That is a supported mode for design review and demos; it
is not a production mode, because the fixture is read-only and contains no fresh observations.

### Rotating a leaked key

The legacy site exposed a Google Maps key (`docs/AUDIT_REPORT.md`, F-07). The procedure for any
credential that must be replaced:

1. Issue the new credential at the provider and revoke the old one **first** — a rotation in which
   the old key stays live leaves the exposure open.
2. Deploy with the new value.
3. Confirm the old value no longer authenticates.
4. Record the rotation date in the change log.

The service-role key is the most dangerous one: it bypasses RLS. If it leaks, rotate it
immediately, then review `audit_logs` and `api_usage_logs` for unfamiliar activity.

## 3. Deploying the application

```bash
git clone <repository> && cd pluck-live
npm ci --legacy-peer-deps
cp .env.example .env.local      # fill in the values
npm run typecheck
npm test
npm run build
npm start                       # production server on $PORT (default 3000)
```

### On Vercel

* Build command: `npm run build`
* Install command: `npm ci --legacy-peer-deps`
* Environment variables: the four in §2
* Set `NEXT_PUBLIC_SITE_URL` to the final production origin **before** the first deploy, because
  it is baked into the sitemap and the Open Graph URLs at build time.

### On a plain Node host (systemd)

```ini
[Unit]
Description=Pluck Live
After=network.target

[Service]
Type=simple
User=pluck
WorkingDirectory=/srv/pluck-live
EnvironmentFile=/srv/pluck-live/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Put a TLS-terminating reverse proxy in front of it. The application sets `X-Content-Type-Options`,
`Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` itself.

## 4. Database deployment

```bash
# link the CLI to the project once
npx supabase link --project-ref <project-ref>

# apply every migration in order
npx supabase db push

# verify what is actually in the database
npx supabase db dump --data-only --schema public > /tmp/after.sql
```

### Verification after every database deployment

| Check | Expected |
| --- | --- |
| Table count in `public` | 39 |
| Tables with RLS enabled | 39 (every one) |
| Policies | 74 |
| Views | 2 (`published_price_observations`, `market_price_summary`) |
| `select count(*) from price_observations` | 0 after the seed; 28 after the legacy import |
| `select count(*) from commodities` / `markets` / `states` / `measurement_units` | 22 / 11 / 11 / 8 |

The same checks run locally against a real PostgreSQL instance:

```bash
bash scripts/validate_migrations.sh
```

That script starts a disposable PostgreSQL 18.4, applies all nine migrations, runs the seed
smoke test and then the 49 RLS assertions. **Run it before every database deployment** — it has
already caught three real defects (F-20, F-24, F-25).

### Importing the legacy observations

The migrated records are imported as data, not as seed:

1. Take a backup first (§5). This step writes to `price_observations`.
2. Run the import for the 28 observations, each with:
   * `verification_status = 'legacy_unverified'`
   * `source_system = 'legacy_site'`
   * `collected_at` at **day** precision (`collected_at_precision = 'date'`)
   * `reported_unit_id` = the synthetic `unspecified` unit
   * quality flags `legacy_unverified`, `unit_ambiguous`,
     `unit_conversion_unverified`, `timestamp_inconsistent`
3. Verify the count, the date range and the per-pair totals against
   `audit/source/legacy-price-history.json`.
4. Never run the import twice: the import must be idempotent or it must be preceded by a check
   that the table is empty.

## 5. Backups

### What to back up

| Object | Why | Frequency |
| --- | --- | --- |
| Supabase database (full) | The authoritative record of every observation, its revisions and the audit trail | Daily automated; weekly copy retained off-site |
| Supabase Storage bucket | Evidence photos | Daily |
| Auth users | Accounts and roles | With the database |
| Repository (`git`) | Migrations, application code, the legacy capture | Every commit — that is the point of Git |
| Environment configuration | Secrets and settings | On every change, in the provider's secret store, never in Git |

### How

```bash
# a logical backup, gzipped
npx supabase db dump --data-only --schema public | gzip > pluck-live-$(date +%F).sql.gz

# or a physical backup straight from the database host
pg_dump -Fc -d postgres -f pluck-live-$(date +%F).dump
```

Supabase's own daily backups and point-in-time recovery (PITR) cover the hosted project; the
logical dumps above are the **portable** copy, and they are what you restore from if the project
is moved.

### Restore drill (do this before you need it)

```bash
createdb pluck_restore
gunzip -c pluck-live-2026-10-22.sql.gz | psql -d pluck_restore
psql -d pluck_restore -c "select count(*) from public.price_observations;"
psql -d pluck_restore -c "select count(*) from pg_policies where schemaname='public';"
```

A backup that has never been restored is not a backup. Run the drill quarterly and record the
result.

### Retention

| Data | Retention |
| --- | --- |
| Price observations and revisions | **Never deleted.** They are the record. Corrections append. |
| Audit logs | Minimum 7 years. |
| API usage logs | 13 months (or as long as an application is subscribed). |
| Contact enquiries | 24 months, then deleted. |
| Legacy raw capture (`audit/legacy-pages`) | Kept in Git forever; it is the proof of what was migrated. |

## 6. Rollback

### Rolling back the application

```bash
git log --oneline -5
git checkout <last-good-sha>
npm ci --legacy-peer-deps
npm run build
sudo systemctl restart pluck-live
```

The application is stateless, so a rollback is a checkout and a restart. There is no data
migration in the application layer to undo.

### Rolling back the database

**Never run `supabase db reset` against production.** It drops everything.

| Situation | Action |
| --- | --- |
| A migration failed and was not applied | Nothing to do. `supabase db push` only applies files that have not been recorded in `supabase_migrations.schema_migrations`. |
| A migration applied and is wrong | Write a **forward** migration that undoes it. Never edit an applied migration file — the migration ledger would then disagree with the file, and the next deploy would try to re-apply it. |
| The data is damaged | Restore from the backup (§5) into a scratch database, compare, then restore forward. |

### The safe procedure for a bad migration

```bash
# 1. stop the writes
sudo systemctl stop pluck-live

# 2. snapshot the current state before touching anything
npx supabase db dump --data-only --schema public > pre-fix-$(date +%F).sql

# 3. write the corrective migration as a new file, e.g. 0010_restore_policy.sql
#    and apply it
npx supabase db push

# 4. re-run the permission suite against the hosted project (see §7)

# 5. restart the application
sudo systemctl start pluck-live
```

### Emergency: the site is publishing wrong prices

1. Take the affected rows out of public view **without deleting them**:
   `update public.price_observations set is_current = false where id = <id>;` — this removes them
   from `published_price_observations` while keeping the row and its history.
2. If the figure was wrong, do not edit it. Use `public.append_correction(...)`, which writes the
   corrected observation, supersedes the original and records both revisions. The original stays
   visible in the revision history.
3. Record what happened in `audit_logs` and note it on the status page.

## 7. Pre-go-live checklist

- [ ] `bash scripts/validate_migrations.sh` passes locally (15 migrations, 169 permission statements, 221 workflow statements, no leftover rows).
- [ ] The same RLS assertions run against the **hosted** project — the local run uses a stub of
      the `auth` schema, so the hosted run is the one that proves PostgREST behaves as expected.
- [ ] `npm test` passes (296 tests).
- [ ] `npm run build` succeeds and every public route returns 200, unknown routes 404.
- [ ] The legacy import has run exactly once and the counts match the capture.
- [ ] The first administrator exists and can log in to `/admin`.
- [ ] Agents are assigned to markets and can submit an observation end to end.
- [ ] A test observation was verified, published, appears on `/prices`, and a correction was
      appended and shows in the revision history.
- [ ] `NEXT_PUBLIC_SITE_URL` is correct in the production environment.
- [ ] The auth redirect URLs include the production `/auth/callback`.
- [ ] The Google Maps key exposed by the legacy site has been revoked at the provider.
- [ ] A first backup has been taken **and restored** successfully.
- [ ] The DNS plan keeps the legacy host reachable in read-only mode for 30 days.
- [ ] The signed-in journeys have been clicked through: sign in as an agent, collect a price, see it
      in `/admin/verification`, approve it (it must **not** be public yet), publish it (it must
      appear on `/prices`), then open the agent's submission history and read the reviewer note.
- [ ] A suspended agent is refused immediately, both in the field app and at the API.
- [ ] Each of the five jobs has been run once by hand from `/admin/system` and the outcome is in
      `scheduled_job_runs`.
- [ ] Each of the twelve reports has been exported and the CSV matches the screen.
- [ ] The platform cron is configured to call `POST /api/jobs/run` with `JOB_RUNNER_SECRET`.

## 8. Monitoring

| Signal | Where | Action if it changes |
| --- | --- | --- |
| Newest observation age | `market_price_summary.latest_collected_at` | If it exceeds the market's collection schedule, the collection rota has stopped. The public coverage notice will start saying the data is stale — that is the intended behaviour. |
| Pending queue depth | `select count(*) from price_observations where verification_status = 'pending_verification'` | A growing queue means the verification rota is behind. |
| API error rate | `api_usage_logs` / provider logs | Investigate before rate limits start rejecting paying integrations. |
| Failed logins | Supabase Auth logs | Possible credential stuffing; the API rate limiter does not cover the auth endpoints. |
| Database size | Supabase dashboard | `price_observations` grows slowly; `api_usage_logs` grows fastest. |

## 9. Incident response for a data-integrity problem

If a wrong number reaches the public:

1. **Do not edit the published row.** It is immutable by design, and the trigger will refuse.
2. Append a correction with `public.append_correction(...)` and a plain-language reason.
3. Note the affected window, the commodities and the markets.
4. Add a `data_quality_flags` entry so the issue is visible in the audit trail.
5. If the cause is systemic (a bad conversion factor, a mis-trained agent, a broken form), fix the
   cause and then correct every affected row — the `is_current` flag makes the affected set
   queryable.


## 10. The scheduled jobs

Five jobs run on the platform cron. All five are idempotent: the runner refuses to run the same
`(job_name, scheduled_for)` slot twice and reports it as `skipped`.

| Job | Suggested cadence | What it does |
| --- | --- | --- |
| `generate_collection_tasks` | daily, early morning | Creates the tasks that are due from `market_collection_schedules`. |
| `mark_overdue_tasks` | hourly | Records an `overdue` event on the tasks that passed their deadline. |
| `refresh_analytics_snapshot` | daily | Stores the daily metric snapshot in `analytics_snapshots`. |
| `retry_notification_delivery` | every 15 minutes | Retries the queued and failed notification deliveries. |
| `expire_exports` | hourly | Expires the export artefacts that have passed their expiry. |

Calling the runner:

```bash
# all jobs, using the slot the server computes
curl -X POST https://liveprice.pluckagro.com/api/jobs/run \
  -H "Authorization: Bearer $JOB_RUNNER_SECRET" \
  -H "content-type: application/json" \
  -d '{}'

# one job, for a specific slot (a backfill)
curl -X POST https://liveprice.pluckagro.com/api/jobs/run \
  -H "Authorization: Bearer $JOB_RUNNER_SECRET" \
  -H "content-type: application/json" \
  -d '{"job":"generate_collection_tasks","scheduledFor":"2026-10-23"}'
```

The response lists each job with its outcome (`succeeded`, `skipped`, `failed`) and the number of
records it touched. Every run is also written to `scheduled_job_runs`, which is what
`/admin/system` displays.

**There is no public trigger.** The endpoint answers 401/503 without the secret and refuses
`GET` with 405. The secret is compared in constant time.

## 11. Migrating the operations schema

Migrations `0010`–`0015` add the operations system. Apply them in order with the same command as
the rest:

```bash
supabase db push            # applies every pending migration in filename order
```

Or, one at a time, so a failure is unambiguous:

```bash
for f in supabase/migrations/001[0-5]_*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

**Verify immediately after, on the hosted project:**

```bash
psql "$DATABASE_URL" -c "select count(*) from pg_tables where schemaname = 'public';"
psql "$DATABASE_URL" -c "select count(*) from pg_policies where schemaname = 'public';"
psql "$DATABASE_URL" -c "select count(*) from pg_tables t join pg_class c on c.oid = t.oid
                          where t.schemaname = 'public' and c.relrowsecurity;"
```

The expected values are **51 tables, 51 with RLS, 97 policies** and 2 views. A different number
means a migration did not apply; do not continue.

### 11.1 Creating the first administrator

There is no public path to an administrative role. Create the account, then set the role once,
directly in the database, and audit the change by hand:

```sql
-- the account must already exist in auth.users
insert into public.profiles (id, full_name, role, account_status)
values ('<auth-user-uuid>', 'Platform Owner', 'super_admin', 'active')
on conflict (id) do update set role = 'super_admin', account_status = 'active';
```

After that, use `/admin/agents` to provision every other agent. A provisioned agent is created
with the service role **on the server**; the browser never holds a privileged key and cannot
choose the role it creates.

### 11.2 Running the permission suites against the hosted project

The local run uses a stub of the `auth` schema. On the hosted project, replace the stub with the
real one — Supabase provides `auth.users`, `auth.uid()` and `auth.jwt()` — and run the same
assertions:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/rls/permission-tests.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/operations/workflow-tests.sql
```

Both suites are written to be safe to run repeatedly: every case is wrapped in a transaction that
is rolled back, and a cleanup section at the end of each file removes the fixtures that were
inserted outside one. The validator fails the run if a single row was left behind.

**Both suites also refuse to start against a database that holds real observations.** Each one
checks that every row in `price_observations` is a labelled `test_fixture` and raises an
exception otherwise, so a synthetic price can never be created beside a real one.

**Run them against a scratch database restored from a dump, not against production.** The
published record is the one thing that must never carry a test row, and the guard above is a
second line of defence rather than a licence to be careless.
