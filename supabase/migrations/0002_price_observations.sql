-- =============================================================================
-- Pluck Live — 0002 price observations, evidence, verification and revisions
-- =============================================================================
-- The authoritative record of every price observation.
--
-- Design notes
--   * `reported_*` columns hold exactly what the agent wrote down. They are
--     never overwritten.
--   * `normalized_*` columns hold the value in a canonical unit. They stay
--     NULL when the conversion is not known — a missing conversion is never
--     papered over with an estimate.
--   * Published rows are immutable in place. Corrections create a new row and
--     a revision-history entry; the original is marked superseded.
-- =============================================================================

-- --------------------------------------------------------------- profiles ----
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  phone         text,
  organisation  text,
  role          public.user_role not null default 'public_user',
  locale        text not null default 'en-NG',
  timezone      text not null default 'Africa/Lagos',
  avatar_url    text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.profiles.role is
  'Primary role. Membership of additional organisations is expressed through organization_members.';

create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------- organisations ----
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  kind        text not null default 'customer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.organization_members (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role_in_org     public.user_role not null default 'customer',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members (user_id);

-- -------------------------------------------------------- price observations --
create table if not exists public.price_observations (
  id                      uuid primary key default gen_random_uuid(),

  commodity_id            bigint not null references public.commodities (id) on delete restrict,
  market_id               bigint not null references public.markets (id) on delete restrict,
  variety_id              bigint references public.commodity_varieties (id) on delete set null,
  grade_id                bigint references public.commodity_grades (id) on delete set null,
  price_type              public.price_type not null default 'unspecified',

  -- Exactly as reported by the agent. Immutable.
  reported_amount         numeric(18, 4) check (reported_amount is null or reported_amount > 0),
  reported_unit_id        bigint references public.measurement_units (id) on delete restrict,
  package_weight_kg       numeric(12, 4) check (package_weight_kg is null or package_weight_kg > 0),
  package_count           integer check (package_count is null or package_count > 0),

  -- Normalised values. NULL when the conversion is unknown or unverified.
  normalized_amount       numeric(18, 4) check (normalized_amount is null or normalized_amount > 0),
  normalized_unit_id      bigint references public.measurement_units (id) on delete restrict,

  currency_code           char(3) not null default 'NGN',

  -- Provenance timestamps.
  collected_at            timestamptz not null,
  collected_at_precision  public.timestamp_precision not null default 'minute',
  submitted_at            timestamptz,
  verified_at             timestamptz,
  published_at            timestamptz,
  rejected_at             timestamptz,

  -- People.
  agent_user_id           uuid references public.profiles (id) on delete set null,
  verified_by             uuid references public.profiles (id) on delete set null,

  verification_status     public.verification_status not null default 'draft',

  notes                   text,
  source_system           public.observation_source not null default 'agent_app',
  source_reference        text,

  -- Correction workflow.
  supersedes_id           uuid references public.price_observations (id) on delete set null,
  is_current              boolean not null default true,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  -- A published observation must have been verified (or be an explicitly
  -- labelled legacy import) and must carry a publication timestamp.
  constraint price_observations_publication_guard check (
    published_at is null
    or verification_status in ('verified', 'legacy_unverified')
  ),
  -- Nothing may be published without a price.
  constraint price_observations_amount_present check (
    reported_amount is not null or normalized_amount is not null
  )
);

create index if not exists price_observations_commodity_market_idx
  on public.price_observations (commodity_id, market_id);
create index if not exists price_observations_market_idx on public.price_observations (market_id);
create index if not exists price_observations_collected_at_idx
  on public.price_observations (collected_at desc);
create index if not exists price_observations_status_idx
  on public.price_observations (verification_status);
create index if not exists price_observations_published_idx
  on public.price_observations (published_at desc)
  where published_at is not null;
create index if not exists price_observations_type_idx on public.price_observations (price_type);
create index if not exists price_observations_agent_idx on public.price_observations (agent_user_id);

comment on column public.price_observations.collected_at_precision is
  '''minute'' when the true clock time was captured. ''date'' means only the calendar day is known — as with every record migrated from the legacy system.';

comment on column public.price_observations.is_current is
  'False once the observation has been superseded by a correction. Superseded rows are kept for audit and excluded from published aggregates.';

-- Duplicate guard: the same agent cannot file the same price twice.
create unique index if not exists price_observations_duplicate_guard
  on public.price_observations (
    commodity_id, market_id, price_type, grade_id,
    reported_amount, reported_unit_id, collected_at
  )
  where is_current and verification_status <> 'rejected';

comment on index public.price_observations_duplicate_guard is
  'Blocks accidental double submission of an identical observation. Legitimate repeat prices at different timestamps remain possible.';

-- ----------------------------------------------------------- evidence -------
create table if not exists public.price_observation_evidence (
  id              bigint generated always as identity primary key,
  observation_id  uuid not null references public.price_observations (id) on delete cascade,
  storage_path    text not null,
  file_name       text not null,
  content_type    text not null,
  byte_size       integer not null check (byte_size > 0),
  caption         text,
  uploaded_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists price_observation_evidence_observation_idx
  on public.price_observation_evidence (observation_id);

comment on table public.price_observation_evidence is
  'Files in the private "price-evidence" bucket. Approved evidence may be promoted to the public bucket after verification.';

-- --------------------------------------------------- verification events ----
create table if not exists public.price_verification_events (
  id              bigint generated always as identity primary key,
  observation_id  uuid not null references public.price_observations (id) on delete cascade,
  action          text not null check (action in ('submitted','approved','rejected','correction_requested','published','unpublished','republished')),
  actor_id        uuid references public.profiles (id) on delete set null,
  actor_role      public.user_role,
  reason          text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists price_verification_events_observation_idx
  on public.price_verification_events (observation_id, created_at desc);

comment on table public.price_verification_events is
  'Append-only audit trail of every consequential decision on an observation.';

-- ------------------------------------------------------ revision history ----
create table if not exists public.price_revision_history (
  id              bigint generated always as identity primary key,
  observation_id  uuid not null references public.price_observations (id) on delete cascade,
  revision_number integer not null,
  changed_by      uuid references public.profiles (id) on delete set null,
  change_reason   text not null,
  before_data     jsonb not null,
  after_data      jsonb not null,
  created_at      timestamptz not null default now(),
  unique (observation_id, revision_number)
);

comment on table public.price_revision_history is
  'Snapshot of every published value before it was changed. Published observations are never silently overwritten.';

-- ------------------------------------------------------ quality flags -------
create table if not exists public.data_quality_flags (
  id              bigint generated always as identity primary key,
  observation_id  uuid not null references public.price_observations (id) on delete cascade,
  flag            public.quality_flag_code not null,
  detail          text,
  severity        text not null default 'warning' check (severity in ('info','warning','critical')),
  raised_by       uuid references public.profiles (id) on delete set null,
  resolved_at     timestamptz,
  resolved_by     uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists data_quality_flags_observation_idx
  on public.data_quality_flags (observation_id);
create index if not exists data_quality_flags_unresolved_idx
  on public.data_quality_flags (flag) where resolved_at is null;

-- ------------------------------------------- agent assignments and tasks ----
create table if not exists public.market_agent_assignments (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  market_id      bigint not null references public.markets (id) on delete cascade,
  status         public.assignment_status not null default 'active',
  starts_on      date not null default current_date,
  ends_on        date,
  assigned_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint market_agent_assignments_dates check (ends_on is null or ends_on >= starts_on)
);

create index if not exists market_agent_assignments_user_idx on public.market_agent_assignments (user_id);
create index if not exists market_agent_assignments_market_idx on public.market_agent_assignments (market_id);

create table if not exists public.collection_batches (
  id             bigint generated always as identity primary key,
  reference      text not null unique,
  market_id      bigint not null references public.markets (id) on delete restrict,
  agent_user_id  uuid references public.profiles (id) on delete set null,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists public.collection_tasks (
  id             bigint generated always as identity primary key,
  market_id      bigint not null references public.markets (id) on delete cascade,
  commodity_id   bigint references public.commodities (id) on delete cascade,
  batch_id       bigint references public.collection_batches (id) on delete set null,
  assigned_to    uuid references public.profiles (id) on delete set null,
  due_on         date not null,
  status         public.task_status not null default 'open',
  notes          text,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists collection_tasks_assignee_idx on public.collection_tasks (assigned_to, status);
create index if not exists collection_tasks_market_idx on public.collection_tasks (market_id, due_on);

create table if not exists public.market_visit_records (
  id             bigint generated always as identity primary key,
  market_id      bigint not null references public.markets (id) on delete cascade,
  agent_user_id  uuid references public.profiles (id) on delete set null,
  visited_at     timestamptz not null,
  observations_count integer not null default 0,
  market_conditions text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists market_visit_records_market_idx
  on public.market_visit_records (market_id, visited_at desc);

comment on table public.market_visit_records is
  'One row per agent visit to a market. Gives context to the observations collected in that visit (weather, disruptions, notable events).';

-- --------------------------------------------------------- triggers ---------
do $$
declare t text;
begin
  foreach t in array array['profiles','organizations','market_agent_assignments','collection_tasks'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;

-- Keep price_observations.updated_at fresh.
drop trigger if exists price_observations_set_updated_at on public.price_observations;
create trigger price_observations_set_updated_at
  before update on public.price_observations
  for each row execute function public.set_updated_at();
