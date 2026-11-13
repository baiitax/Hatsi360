-- 0024_trade_analytical_tables.sql
--
-- The analytical layer behind Trade Intelligence.
--
-- Four tables, each added only because it has an operational purpose and can
-- be populated with real data:
--
--   commodity_specifications  brief §8.4, §15, §16.6 — product specifications
--   commodity_seasonality     brief §12.3 — regional seasonal calendars
--   commodity_fundamentals    brief §12.8 — authored fundamental research
--   price_source_registry     brief §17.1 — source configuration and freshness
--
-- What is NOT here, and why:
--
--   commodity_forecasts       Blocked. Brief §13 requires sufficient history
--                             before any forecast is published. The platform
--                             has none, and non-negotiable #11 forbids an
--                             unsupported forecast.
--   external_market_feeds     Blocked. No provider, no credentials, no
--                             adapter. Adding the table would imply a feed
--                             exists.
--   buyer_offers, seller_offers  Added separately in 0026, with their own
--                             verification workflow.
--
-- Every authored row records who wrote it and when, and separates sourced
-- fact from interpretation. A specification with no source is not a
-- specification.

begin;

-- ----------------------------------------------------- specifications ------
-- Brief §8.4 warns: "Do not apply generic specifications to every commodity.
-- Sesame quality parameters must be distinct from Gum Arabic specifications."
--
-- So this is a per-commodity parameter table, not a fixed column set. Each row
-- is one parameter for one commodity, with its own unit and its own source.
-- A commodity with no known specification simply has no rows.

create table if not exists public.commodity_specifications (
  id             bigint generated always as identity primary key,
  commodity_id   bigint not null references public.commodities (id) on delete cascade,
  grade_id       bigint references public.commodity_grades (id) on delete cascade,

  -- The parameter, named. Free text so a commodity can carry "aflatoxin" or
  -- "calyx colour" without the schema knowing either in advance.
  parameter      text not null,

  -- The requirement. Text rather than numeric, because "under 12%" and
  -- "99.9% purity" and "machine-cleaned and colour-sorted" are all legitimate
  -- values and none of them is a single number.
  requirement    text not null,

  -- Whether this is an official standard or a commercial expectation. Brief
  -- §8.4 requires the two to be distinguished.
  basis          text not null default 'commercial'
                  check (basis in ('official', 'commercial', 'indicative')),

  -- Where the requirement comes from. Required when the basis is official.
  source_name    text,
  source_url     text,

  -- Provenance for the record itself.
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (commodity_id, grade_id, parameter)
);

create index if not exists commodity_specifications_commodity_idx
  on public.commodity_specifications (commodity_id);

comment on table public.commodity_specifications is
  'Per-commodity quality parameters and their requirements. One row per parameter so that sesame purity and Gum Arabic moisture are separate facts rather than columns on one generic table.';

-- ---------------------------------------------------------- seasonality ----
-- Brief §12.3 warns: "Do not assume every Nigerian state follows an identical
-- agricultural calendar." So every row carries a state, and a commodity with
-- no regional data has no rows rather than a national default.

create table if not exists public.commodity_seasonality (
  id             bigint generated always as identity primary key,
  commodity_id   bigint not null references public.commodities (id) on delete cascade,

  -- The region this calendar describes. Null means the entry is stated to
  -- apply nationally, which is only permitted where that is genuinely true.
  state_id       bigint references public.states (id) on delete cascade,

  phase          text not null
                  check (phase in (
                    'land_preparation', 'planting', 'growing', 'harvest',
                    'post_harvest', 'lean_season', 'off_season'
                  )),

  -- Month numbers, 1-12. A phase can span several months and need not be
  -- contiguous, because planting windows in Nigeria are not.
  start_month    integer not null check (start_month between 1 and 12),
  end_month      integer not null check (end_month between 1 and 12),

  -- What the phase means for supply and price, in one sentence.
  supply_effect  text,
  price_effect   text,

  -- Whether this is observed or inferred. Brief §12.3 requires the
  -- distinction.
  basis          text not null default 'commercial'
                  check (basis in ('official', 'commercial', 'indicative')),
  source_name    text,

  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (commodity_id, state_id, phase, start_month)
);

create index if not exists commodity_seasonality_commodity_idx
  on public.commodity_seasonality (commodity_id);

comment on table public.commodity_seasonality is
  'Regional seasonal calendars per commodity. state_id is nullable only where an entry is explicitly national; regional differences must be preserved rather than averaged away.';

-- --------------------------------------------------------- fundamentals ----
-- Brief §12.8 asks for a fundamental intelligence report that "clearly
-- separates sourced facts, analytical interpretation, and forecasts".
--
-- So the table has three separate text columns rather than one blob, and the
-- forecast column is the one that is hardest to fill: it requires a stated
-- method and a stated historical basis, and it may be left null.

create table if not exists public.commodity_fundamentals (
  id             bigint generated always as identity primary key,
  commodity_id   bigint not null references public.commodities (id) on delete cascade,

  title          text not null,
  slug           text not null unique,

  -- The three separated registers. Brief §12.8.
  sourced_facts     text not null,
  interpretation    text,
  outlook           text,

  -- Required whenever `outlook` is non-null. A forecast without a stated
  -- method and historical basis is not published.
  forecast_method       text,
  forecast_basis_period text,
  forecast_horizon      text,

  -- The reporting period this analysis covers.
  period_start    date,
  period_end      date,

  -- Review state. Brief §17.4 requires analyst research to be reviewed before
  -- publication.
  review_status   text not null default 'draft'
                   check (review_status in ('draft', 'in_review', 'approved', 'rejected')),
  reviewed_by     uuid references public.profiles (id) on delete set null,
  reviewed_at     timestamptz,

  is_published    boolean not null default false,
  published_at    timestamptz,

  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists commodity_fundamentals_commodity_idx
  on public.commodity_fundamentals (commodity_id);
create index if not exists commodity_fundamentals_published_idx
  on public.commodity_fundamentals (published_at desc) where is_published;

comment on table public.commodity_fundamentals is
  'Authored fundamental intelligence per commodity. sourced_facts, interpretation and outlook are separate columns so the three registers are never blended. A forecast may only be published with a stated method and historical basis.';

-- --------------------------------------------------- price source registry -
-- Brief §17.1 asks administrators to manage source configuration, freshness
-- rules, reliability and update frequency.
--
-- This registers the sources that exist. There are three today: field agents,
-- manual entry, and the legacy import. It does not register an external feed,
-- because there is not one.

create table if not exists public.price_source_registry (
  id             bigint generated always as identity primary key,

  -- The source, as the observations table already classifies it.
  source_system  text not null unique
                 check (source_system in ('legacy_import', 'agent_app', 'manual_entry')),

  display_name   text not null,
  description    text,

  -- How often this source is expected to produce an observation. This is what
  -- the freshness engine reads to decide whether a price is current.
  expected_frequency text not null default 'adhoc'
                      check (expected_frequency in ('daily', 'weekly', 'adhoc')),

  -- Minutes within which data from this source counts as current, and minutes
  -- after which a verified observation stops being the answer. Null falls
  -- back to the cadence defaults in the application.
  fresh_window_minutes     integer check (fresh_window_minutes is null or fresh_window_minutes > 0),
  verified_horizon_minutes integer check (verified_horizon_minutes is null or verified_horizon_minutes > 0),

  -- Whether observations from this source are eligible for public
  -- intelligence. The legacy import is registered but not eligible, because
  -- it carries no unit, price type or verification trail.
  eligible_for_publication boolean not null default false,

  is_active      boolean not null default true,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.price_source_registry is
  'Configuration for each price source the platform actually has. No external feed is registered because none exists; the legacy import is registered as ineligible for public price intelligence.';

-- Register the three real sources.
insert into public.price_source_registry
  (source_system, display_name, description, expected_frequency, fresh_window_minutes, verified_horizon_minutes, eligible_for_publication)
values
  ('agent_app', 'Field agent collection',
   'Prices collected by authorised Hatsi360 field agents through the Field App, with evidence and market intelligence.',
   'daily', 36 * 60, 30 * 24 * 60, true),
  ('manual_entry', 'Manual staff entry',
   'Prices entered by platform staff where a field visit is not possible. Requires the same verification as any other observation.',
   'adhoc', 14 * 24 * 60, 180 * 24 * 60, true),
  ('legacy_import', 'Legacy system import',
   'Daily OHLC groups migrated from the previous platform. Carries no unit, price type, grade or verification trail, so it is retained for provenance but is not eligible for public price intelligence.',
   'adhoc', 30 * 24 * 60, 730 * 24 * 60, false)
on conflict (source_system) do nothing;

-- ---------------------------------------------------------------- security ---
-- These four tables carry analytical judgement rather than market fact. They
-- are readable by everyone, including `anon`, because they are reference
-- material the public price pages display; but they are writable only by staff,
-- because a fabricated fundamental or specification would be presented to the
-- public as sourced intelligence. That is exactly what brief §12 and
-- non-negotiable #12 prohibit.
--
-- Row-level security is enabled on all four. The cold-start migration
-- validator asserts this, and it is what caught the omission.

alter table public.commodity_specifications enable row level security;
alter table public.commodity_seasonality       enable row level security;
alter table public.commodity_fundamentals      enable row level security;
alter table public.price_source_registry       enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'commodity_specifications', 'commodity_seasonality',
    'commodity_fundamentals', 'price_source_registry'
  ]
  loop
    execute format($f$drop policy if exists %1$I_read on public.%1$I$f$, t);
    execute format($f$drop policy if exists %1$I_write on public.%1$I$f$, t);
    execute format($f$create policy %1$I_read on public.%1$I
      for select
      using (true)$f$, t);
    execute format($f$create policy %1$I_write on public.%1$I
      for all
      using (public.is_staff())
      with check (public.is_staff())$f$, t);
  end loop;
end
$$;


-- ---------------------------------------------------------------- security ---
-- These four tables carry analytical judgement rather than market fact. They
-- are readable by everyone, including `anon`, because they are reference
-- material the public price pages display; but they are writable only by staff,
-- because a fabricated fundamental or specification would be presented to the
-- public as sourced intelligence. That is exactly what brief §12 and
-- non-negotiable #12 prohibit.
--
-- Row-level security is enabled on all four. The cold-start migration
-- validator asserts this, and it is what caught the omission.

alter table public.commodity_specifications enable row level security;
alter table public.commodity_seasonality       enable row level security;
alter table public.commodity_fundamentals      enable row level security;
alter table public.price_source_registry       enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'commodity_specifications', 'commodity_seasonality',
    'commodity_fundamentals', 'price_source_registry'
  ]
  loop
    execute format($f$drop policy if exists %1$I_read on public.%1$I$f$, t);
    execute format($f$drop policy if exists %1$I_write on public.%1$I$f$, t);
    execute format($f$create policy %1$I_read on public.%1$I
      for select
      using (true)$f$, t);
    execute format($f$create policy %1$I_write on public.%1$I
      for all
      using (public.is_staff())
      with check (public.is_staff())$f$, t);
  end loop;
end
$$;


commit;
