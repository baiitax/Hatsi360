-- =============================================================================
-- Pluck Live — 0001 core reference schema
-- =============================================================================
-- Countries, states, market zones, markets, commodity taxonomy and measurement
-- units.
--
-- Design notes
--   * Money is always `numeric`. No floating point is used for authoritative
--     monetary values anywhere in this schema.
--   * Reference tables carry a `slug` for search-friendly URLs and a
--     `legacy_id` column so rows imported from the previous Pluck Live PHP
--     system can be reconciled against their source.
--   * Nothing in this file is destroyed by later migrations.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";
create extension if not exists "pg_trgm";

-- ------------------------------------------------------------------ enums ----
do $$ begin
  create type public.price_type as enum (
    'farmgate',
    'wholesale_asking',
    'wholesale_transaction',
    'retail',
    'processor_procurement',
    'export_buy',
    'export_sell',
    'indicative',
    'unspecified'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum (
    'draft',
    'pending_verification',
    'verified',
    'rejected',
    'correction_requested',
    'legacy_unverified'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unit_dimension as enum ('mass', 'volume', 'count', 'length', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum (
    'public_user',
    'customer',
    'agent',
    'verification_officer',
    'market_supervisor',
    'analyst',
    'admin',
    'super_admin'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quality_flag_code as enum (
    'duplicate_suspected',
    'price_outlier',
    'unit_conversion_unverified',
    'bag_weight_inconsistent',
    'timestamp_inconsistent',
    'missing_evidence',
    'conflicting_report',
    'stale'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.observation_source as enum ('legacy_import', 'agent_app', 'manual_entry');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timestamp_precision as enum ('minute', 'date');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assignment_status as enum ('active', 'paused', 'ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('open', 'in_progress', 'submitted', 'skipped');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------- country ---
create table if not exists public.countries (
  id              bigint generated always as identity primary key,
  code            char(2) not null unique,
  name            text not null,
  currency_code   char(3) not null,
  currency_symbol text not null default '₦',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.countries is
  'Countries the platform operates in. Currency is per-country so the schema supports expansion beyond Nigeria.';

-- ------------------------------------------------------------------ state ----
create table if not exists public.states (
  id         bigint generated always as identity primary key,
  country_id bigint not null references public.countries (id) on delete restrict,
  code       text,
  name       text not null,
  slug       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_id, slug)
);

create index if not exists states_slug_idx on public.states (slug);

-- ------------------------------------------------------------- market zone ---
create table if not exists public.market_zones (
  id          bigint generated always as identity primary key,
  state_id    bigint not null references public.states (id) on delete restrict,
  name        text not null,
  slug        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (state_id, slug)
);

comment on table public.market_zones is
  'Optional administrative grouping of markets inside a state (e.g. a grains corridor). Left empty for markets migrated from the legacy system, which had no zone concept.';

-- ------------------------------------------------------------------ market ---
create table if not exists public.markets (
  id             bigint generated always as identity primary key,
  legacy_id      integer unique,
  market_zone_id bigint references public.market_zones (id) on delete set null,
  state_id       bigint not null references public.states (id) on delete restrict,
  name           text not null,
  slug           text not null unique,
  description    text,
  address        text,
  latitude       numeric(9, 6),
  longitude      numeric(9, 6),
  contact_phone  text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint markets_latitude_range check (latitude is null or (latitude between -90 and 90)),
  constraint markets_longitude_range check (longitude is null or (longitude between -180 and 180))
);

create index if not exists markets_state_idx on public.markets (state_id);
create index if not exists markets_name_trgm_idx on public.markets using gin (name gin_trgm_ops);

comment on column public.markets.legacy_id is
  'Identifier used by the previous Pluck Live PHP application, kept for reconciliation.';

-- ----------------------------------------------- market operating schedule ---
create table if not exists public.market_operating_schedules (
  id            bigint generated always as identity primary key,
  market_id     bigint not null references public.markets (id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6),
  opens_at      time,
  closes_at     time,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (market_id, day_of_week)
);

comment on table public.market_operating_schedules is
  'When a market trades. Used to decide whether a collection timestamp is plausible and to schedule agent tasks.';

-- ------------------------------------------------------- commodity category ---
create table if not exists public.commodity_categories (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -------------------------------------------------------------- commodity ---
create table if not exists public.commodities (
  id                   bigint generated always as identity primary key,
  legacy_id            integer unique,
  category_id          bigint not null references public.commodity_categories (id) on delete restrict,
  name                 text not null,
  slug                 text not null unique,
  description          text,
  default_variety_id   bigint,
  default_grade_id     bigint,
  is_active            boolean not null default true,
  freshness_window_hours integer not null default 72,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint commodities_freshness_positive check (freshness_window_hours > 0)
);

create index if not exists commodities_category_idx on public.commodities (category_id);
create index if not exists commodities_name_trgm_idx on public.commodities using gin (name gin_trgm_ops);

comment on column public.commodities.freshness_window_hours is
  'How long an observation of this commodity stays "fresh". Beyond it the public UI marks the price as stale rather than hiding it.';

create table if not exists public.commodity_varieties (
  id           bigint generated always as identity primary key,
  commodity_id bigint not null references public.commodities (id) on delete cascade,
  name         text not null,
  slug         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (commodity_id, slug)
);

create table if not exists public.commodity_grades (
  id           bigint generated always as identity primary key,
  commodity_id bigint not null references public.commodities (id) on delete cascade,
  variety_id   bigint references public.commodity_varieties (id) on delete cascade,
  name         text not null,
  slug         text not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (commodity_id, slug)
);

alter table public.commodities
  drop constraint if exists commodities_default_variety_fk;
alter table public.commodities
  add constraint commodities_default_variety_fk
  foreign key (default_variety_id) references public.commodity_varieties (id) on delete set null;

alter table public.commodities
  drop constraint if exists commodities_default_grade_fk;
alter table public.commodities
  add constraint commodities_default_grade_fk
  foreign key (default_grade_id) references public.commodity_grades (id) on delete set null;

-- ------------------------------------------------------------- synonyms -----
create table if not exists public.commodity_synonyms (
  id           bigint generated always as identity primary key,
  commodity_id bigint not null references public.commodities (id) on delete cascade,
  synonym      text not null,
  created_at   timestamptz not null default now(),
  unique (commodity_id, synonym)
);

create index if not exists commodity_synonyms_trgm_idx on public.commodity_synonyms using gin (synonym gin_trgm_ops);

comment on table public.commodity_synonyms is
  'Local names, spelling variants and trade names used to widen search matching.';

-- ------------------------------------------------------- measurement units ---
create table if not exists public.measurement_units (
  id           bigint generated always as identity primary key,
  code         text not null unique,
  name         text not null,
  plural_name  text,
  dimension    public.unit_dimension not null,
  base_unit_id bigint references public.measurement_units (id) on delete restrict,
  base_factor  numeric,
  is_specific  boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint measurement_units_factor_positive check (base_factor is null or base_factor > 0)
);

comment on table public.measurement_units is
  'Measurement units. base_factor converts into the dimension base unit (kg, litre, piece).';

comment on column public.measurement_units.is_specific is
  'False for the synthetic "unspecified" unit that carries legacy records whose unit was never recorded. Such values are never normalised.';

-- ---------------------------------------------- commodity unit conversions ---
create table if not exists public.commodity_unit_conversions (
  id           bigint generated always as identity primary key,
  commodity_id bigint not null references public.commodities (id) on delete cascade,
  from_unit_id bigint not null references public.measurement_units (id) on delete restrict,
  to_unit_id   bigint not null references public.measurement_units (id) on delete restrict,
  factor       numeric not null check (factor > 0),
  note         text,
  verified_by  uuid,
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (commodity_id, from_unit_id, to_unit_id)
);

comment on table public.commodity_unit_conversions is
  'Commodity-specific package weights. A bag of maize is not a bag of cocoa, so a conversion only exists once its weight has been verified in the field.';

-- ------------------------------------------------------------ updated_at -----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['countries','states','market_zones','markets','commodity_categories',
                           'commodities','commodity_varieties','commodity_grades','measurement_units',
                           'commodity_unit_conversions'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;
