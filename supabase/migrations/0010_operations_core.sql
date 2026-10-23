-- =============================================================================
-- Pluck Live — 0010 operations core
-- =============================================================================
-- The operational substrate for the Tier-1 admin and market-agent system:
-- account status, collection schedules, task history, notifications, job and
-- export bookkeeping, quality-rule versions and analytics snapshots.
--
-- Design rules held to here:
--   * No table is created without a purpose stated in a comment.
--   * Nothing that duplicates an existing source of truth is added.
--   * Enumerated lifecycles are explicit, and permitted transitions are
--     enforced in 0011 (functions), not in the UI.
-- =============================================================================

-- ------------------------------------------------------------- enums --------

-- An agent submits; a reviewer picks the submission up. 'verified' is the
-- approved state; publication is a separate act (published_at is set).
alter type public.verification_status add value if not exists 'submitted';

-- The full collection-task lifecycle.
do $$ begin
  create type public.collection_task_status as enum (
    'open',              -- to do
    'in_progress',       -- the agent has started
    'submitted',         -- the agent has sent the observations
    'awaiting_review',   -- handed to a reviewer
    'correction_required',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

-- How often a market is collected.
do $$ begin
  create type public.collection_frequency as enum ('daily', 'weekly', 'adhoc');
exception when duplicate_object then null; end $$;

-- Operational priority of a market or a schedule.
do $$ begin
  create type public.operational_priority as enum ('low', 'normal', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- The state of an account, beyond "has a profile".
do $$ begin
  create type public.account_status as enum ('active', 'suspended', 'deactivated');
exception when duplicate_object then null; end $$;

-- How serious a quality rule outcome is.
do $$ begin
  create type public.quality_severity as enum ('info', 'warning', 'review', 'blocking');
exception when duplicate_object then null; end $$;

-- Notification kinds, shared by both audiences.
do $$ begin
  create type public.notification_kind as enum (
    'task_assigned',
    'deadline_reminder',
    'submission_received',
    'submission_approved',
    'submission_rejected',
    'correction_requested',
    'assignment_changed',
    'task_cancelled',
    'review_required',
    'market_unassigned',
    'coverage_gap',
    'system_alert',
    'quality_warning'
  );
exception when duplicate_object then null; end $$;

-- Where a notification was (or was going to be) delivered.
do $$ begin
  create type public.delivery_channel as enum ('in_app', 'email', 'sms', 'whatsapp', 'push');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.delivery_status as enum ('queued', 'sent', 'delivered', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum ('running', 'succeeded', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.export_status as enum ('queued', 'running', 'completed', 'failed', 'expired');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------- identity and access -----

-- Agent-specific fields that would otherwise crowd the shared profile row.
create table if not exists public.agent_profiles (
  profile_id       uuid primary key references public.profiles (id) on delete cascade,
  employee_code    text unique,
  supervisor_notes text,
  joined_on        date,
  employment_status text not null default 'active',
  alternate_phone  text,
  region           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.agent_profiles is
  'Agent-specific operational attributes. Kept separate from public.profiles so that a customer account never carries agent fields.';

-- The audit trail for anything that changes who may use the system.
create table if not exists public.account_status_events (
  id              bigint generated always as identity primary key,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  previous_status public.account_status,
  new_status      public.account_status not null,
  reason          text,
  actor_id        uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists account_status_events_profile_idx
  on public.account_status_events (profile_id, created_at desc);

comment on table public.account_status_events is
  'Every change to an account''s status — created, suspended, reactivated, deactivated — with the actor and the reason.';

-- Sign-in throttling. Identifiers are hashed; the table never holds a usable
-- email address or IP address.
create table if not exists public.auth_login_attempts (
  id             bigint generated always as identity primary key,
  identifier_hash text not null,
  ip_hash         text,
  succeeded       boolean not null default false,
  attempted_at    timestamptz not null default now()
);

create index if not exists auth_login_attempts_identifier_idx
  on public.auth_login_attempts (identifier_hash, attempted_at desc);

comment on table public.auth_login_attempts is
  'Recent sign-in attempts, keyed by a hash of the identifier. Used to slow down credential guessing; contains no plaintext identifier.';

-- -------------------------------------------------- market operations ------

-- What should be collected, where, by whom and when.
create table if not exists public.market_collection_schedules (
  id                  bigint generated always as identity primary key,
  market_id           bigint not null references public.markets (id) on delete cascade,
  commodity_id        bigint references public.commodities (id) on delete cascade,
  frequency           public.collection_frequency not null default 'daily',
  days_of_week        smallint[] not null default '{1,2,3,4,5}',
  window_start        time,
  window_end          time,
  deadline_time       time not null default '16:00',
  required_price_types public.price_type[] not null default '{wholesale_transaction}',
  expected_observations integer not null default 1 check (expected_observations > 0),
  priority            public.operational_priority not null default 'normal',
  evidence_required   boolean not null default false,
  assigned_agent_id   uuid references public.profiles (id) on delete set null,
  escalation_rule     jsonb,
  is_active           boolean not null default true,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint market_collection_schedules_window check (
    window_start is null or window_end is null or window_start < window_end
  ),
  constraint market_collection_schedules_days check (
    cardinality(days_of_week) between 1 and 7
  )
);

create index if not exists market_collection_schedules_market_idx
  on public.market_collection_schedules (market_id) where is_active;
create index if not exists market_collection_schedules_agent_idx
  on public.market_collection_schedules (assigned_agent_id) where is_active;

comment on table public.market_collection_schedules is
  'The collection plan: which commodities are expected, at which market, on which days, with which deadline and priority.';

-- How a task came to exist and what happened to it.
create table if not exists public.collection_task_events (
  id          bigint generated always as identity primary key,
  task_id     bigint not null references public.collection_tasks (id) on delete cascade,
  event_type  text not null check (event_type in (
                 'created','assigned','reassigned','started','submitted',
                 'awaiting_review','correction_required','completed','cancelled',
                 'overdue','reopened','commented')),
  from_status public.collection_task_status,
  to_status   public.collection_task_status,
  actor_id    uuid references public.profiles (id) on delete set null,
  reason      text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists collection_task_events_task_idx
  on public.collection_task_events (task_id, created_at);

comment on table public.collection_task_events is
  'Append-only history of a collection task: who created it, who it was assigned to, when it was started, submitted, cancelled or completed.';

-- ------------------------------------------------------- notifications ------

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        public.notification_kind not null,
  severity    public.operational_priority not null default 'normal',
  title       text not null,
  body        text,
  entity_type text,
  entity_id   text,
  action_url  text,
  metadata    jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;

comment on table public.notifications is
  'In-app notifications for one recipient. A notification is never visible to anyone else, including administrators.';

create table if not exists public.notification_delivery_logs (
  id              bigint generated always as identity primary key,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel         public.delivery_channel not null,
  status          public.delivery_status not null default 'queued',
  provider        text,
  provider_message_id text,
  attempt_count   integer not null default 0,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint notification_delivery_logs_unique unique (notification_id, channel)
);

create index if not exists notification_delivery_logs_status_idx
  on public.notification_delivery_logs (status, updated_at desc);

comment on table public.notification_delivery_logs is
  'One row per notification per channel. The status is only ever set to a delivered state when the provider confirms it.';

-- ------------------------------------------------------ jobs and exports ---

create table if not exists public.scheduled_job_runs (
  id                bigint generated always as identity primary key,
  job_name          text not null,
  scheduled_for     timestamptz not null,
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  status            public.job_status not null default 'running',
  records_processed integer not null default 0,
  attempt_count     integer not null default 1,
  error             text,
  triggered_by      text,
  created_at        timestamptz not null default now(),
  constraint scheduled_job_runs_unique unique (job_name, scheduled_for)
);

create index if not exists scheduled_job_runs_job_idx
  on public.scheduled_job_runs (job_name, scheduled_for desc);

comment on table public.scheduled_job_runs is
  'One row per scheduled job execution. The (job_name, scheduled_for) unique constraint makes a job idempotent: a retry cannot create a second run for the same slot.';

create table if not exists public.export_jobs (
  id           uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles (id) on delete set null,
  scope        text not null,
  filters      jsonb not null default '{}'::jsonb,
  format       text not null default 'csv' check (format in ('csv','json')),
  status       public.export_status not null default 'queued',
  row_count    integer,
  file_path    text,
  error        text,
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists export_jobs_requester_idx
  on public.export_jobs (requested_by, created_at desc);
create index if not exists export_jobs_status_idx
  on public.export_jobs (status, created_at desc);

comment on table public.export_jobs is
  'A record of every export that was requested, by whom, over which scope, with the outcome and an expiry.';

-- ----------------------------------------------------------- quality -------

create table if not exists public.data_quality_rule_versions (
  id          bigint generated always as identity primary key,
  rule_code   text not null,
  version     integer not null check (version > 0),
  description text not null,
  severity    public.quality_severity not null default 'warning',
  threshold   jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint data_quality_rule_versions_unique unique (rule_code, version)
);

create index if not exists data_quality_rule_versions_code_idx
  on public.data_quality_rule_versions (rule_code, version desc);

comment on table public.data_quality_rule_versions is
  'The versioned definition of every quality rule. A flag always records the rule version that produced it, so a historical flag can be explained.';

-- ---------------------------------------------------------- analytics -------

create table if not exists public.analytics_snapshots (
  id            bigint generated always as identity primary key,
  snapshot_date date not null,
  scope         text not null default 'global',
  metrics       jsonb not null,
  generated_at  timestamptz not null default now(),
  constraint analytics_snapshots_unique unique (snapshot_date, scope)
);

comment on table public.analytics_snapshots is
  'A daily snapshot of the operational metrics, kept so that trend charts do not have to aggregate the raw records on every page load.';

-- ------------------------------------------------------- alterations --------

-- Account status becomes explicit. `is_active` stays in step for backwards
-- compatibility with the existing policies.
alter table public.profiles add column if not exists account_status public.account_status;
update public.profiles set account_status = 'active' where account_status is null;
alter table public.profiles alter column account_status set default 'active';
alter table public.profiles alter column account_status set not null;

comment on column public.profiles.account_status is
  'active | suspended | deactivated. A suspended or deactivated account is refused at the edge, in the server guards and by RLS.';

-- Operational attributes of a market.
alter table public.markets add column if not exists priority public.operational_priority not null default 'normal';
alter table public.markets add column if not exists market_type text;
alter table public.markets add column if not exists collection_instructions text;
alter table public.markets add column if not exists coverage_target integer check (coverage_target is null or coverage_target > 0);

comment on column public.markets.coverage_target is
  'How many observations per collection day this market is expected to produce. Used by the coverage analytics; never used to imply that a missing observation exists.';

-- The task table grows the fields the scheduling engine needs.
alter table public.collection_tasks add column if not exists schedule_id bigint references public.market_collection_schedules (id) on delete set null;
alter table public.collection_tasks add column if not exists priority public.operational_priority not null default 'normal';
alter table public.collection_tasks add column if not exists expected_commodity_ids bigint[] not null default '{}';
alter table public.collection_tasks add column if not exists deadline_at timestamptz;
alter table public.collection_tasks add column if not exists started_at timestamptz;
alter table public.collection_tasks add column if not exists submitted_at timestamptz;
alter table public.collection_tasks add column if not exists completed_at timestamptz;
alter table public.collection_tasks add column if not exists market_visit_id bigint references public.market_visit_records (id) on delete set null;
alter table public.collection_tasks add column if not exists cancellation_reason text;
alter table public.collection_tasks add column if not exists submission_key text;

-- Move the task status onto the full lifecycle.
alter table public.collection_tasks alter column status drop default;
alter table public.collection_tasks
  alter column status type public.collection_task_status
  using (case when status::text = 'skipped' then 'cancelled' else status::text end)::public.collection_task_status;
alter table public.collection_tasks alter column status set default 'open';

-- Idempotent submissions: the agent app sends a key, the database refuses a
-- second observation with the same key.
alter table public.price_observations add column if not exists submission_key text;
create unique index if not exists price_observations_submission_key_idx
  on public.price_observations (submission_key)
  where submission_key is not null;

-- Market visits gain the timing the productivity analytics needs.
alter table public.market_visit_records add column if not exists reference text;
alter table public.market_visit_records add column if not exists started_at timestamptz;
alter table public.market_visit_records add column if not exists completed_at timestamptz;
alter table public.market_visit_records add column if not exists duration_seconds integer check (duration_seconds is null or duration_seconds >= 0);
alter table public.market_visit_records add column if not exists status text not null default 'completed';

-- Which commodities a market is expected to report.
create table if not exists public.market_commodity_scope (
  market_id    bigint not null references public.markets (id) on delete cascade,
  commodity_id bigint not null references public.commodities (id) on delete cascade,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint market_commodity_scope_pk primary key (market_id, commodity_id)
);

comment on table public.market_commodity_scope is
  'The commodities a market is expected to cover. Coverage analytics compare what was expected against what was actually reported.';

-- ------------------------------------------------------------- indexes -----

create index if not exists collection_tasks_due_idx
  on public.collection_tasks (due_on, status);
create index if not exists collection_tasks_status_idx
  on public.collection_tasks (status, due_on);
create index if not exists collection_tasks_deadline_idx
  on public.collection_tasks (deadline_at) where status in ('open','in_progress');
create index if not exists price_observations_submitted_idx
  on public.price_observations (submitted_at desc) where submitted_at is not null;
create index if not exists price_observations_status_idx
  on public.price_observations (verification_status, submitted_at desc);

-- ------------------------------------------------------------- triggers ----

do $$
declare t text;
begin
  foreach t in array array['agent_profiles','market_collection_schedules'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;

-- Keep profiles.is_active in step with the authoritative account status.
create or replace function public.sync_account_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.account_status is distinct from old.account_status then
    new.is_active := (new.account_status = 'active');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_account_status on public.profiles;
create trigger profiles_sync_account_status
  before update on public.profiles
  for each row execute function public.sync_account_status();
