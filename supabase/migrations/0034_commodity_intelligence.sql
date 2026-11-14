-- ============================================================================
-- Migration 0034: Commodity Intelligence Foundation
-- Phase 06 / Stage 1 — Evidence-backed agricultural decision support
--
-- Creates the foundational tables for commodity fundamentals analysis:
--   1. Evidence provenance (sources + registry)
--   2. Commodity production data
--   3. Commodity supply chain data
--   4. Commodity demand data
--   5. Commodity trade flows
--
-- All data carries provenance metadata: who collected it, when, from which
-- source, and with what confidence level. Nothing enters these tables
-- without traceable origin.
-- ============================================================================

-- ── 1. Evidence Provenance Foundation ───────────────────────────────────────

-- External data source registry: authoritative catalogues we ingest from
create table if not exists public.evidence_sources (
  id              bigint generated always as identity primary key,
  code            text not null unique,           -- short identifier: 'faostat', 'usda_fas', 'nbs', 'cbn'
  name            text not null,                  -- human-readable name
  organization    text not null,                  -- publishing organisation
  url             text,                           -- primary URL
  source_type     text not null
                    check (source_type in (
                      'government',
                      'international_org',
                      'academic',
                      'industry',
                      'media',
                      'other'
                    )),
  reliability     numeric(3,2) default 0.80
                    check (reliability between 0 and 1),
  update_frequency text,                          -- 'daily', 'monthly', 'quarterly', 'annual'
  license_type    text,                           -- 'public_domain', 'cc_by_4', 'cc_by_nc_sa', etc.
  access_method   text not null default 'manual'
                    check (access_method in ('api', 'web_scrape', 'manual_download', 'file_upload', 'manual')),
  api_base_url    text,
  api_key_env_var text,                           -- environment variable NAME only; never store actual key
  country_codes   text[] default '{}',            -- ISO 3166-1 alpha-3 codes this source covers
  commodity_scope text[] default '{}',            -- commodity slugs this source covers
  last_sync_at    timestamptz,
  is_active       boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists evidence_sources_code_idx on public.evidence_sources (code);
create index if not exists evidence_sources_active_idx on public.evidence_sources (is_active) where is_active;

-- Data retrieval audit trail: every sync / upload event
create table if not exists public.source_sync_events (
  id              bigint generated always as identity primary key,
  source_id       bigint not null references public.evidence_sources(id) on delete cascade,
  sync_type       text not null
                    check (sync_type in ('api_fetch', 'file_upload', 'manual_entry', 'scheduled')),
  started_at      timestamptz not null default now(),
  completed_at    timestamptz,
  status          text not null default 'running'
                    check (status in ('running', 'completed', 'failed', 'partial')),
  data_period_start date,
  data_period_end   date,
  records_fetched   integer default 0,
  records_inserted  integer default 0,
  records_updated   integer default 0,
  records_skipped   integer default 0,
  error_message     text,
  raw_file_path     text,                       -- optional reference to stored raw file
  file_hash         text,                       -- SHA-256 of downloaded file
  triggered_by      uuid references public.profiles(id) on delete set null,
  metadata          jsonb default '{}'::jsonb,   -- source-specific metadata
  created_at        timestamptz not null default now()
);

create index if not exists source_sync_events_source_idx on public.source_sync_events (source_id);
create index if not exists source_sync_events_status_idx on public.source_sync_events (status) where status in ('running', 'failed');

-- ── 2. Commodity Production ─────────────────────────────────────────────────

create table if not exists public.commodity_production (
  id                      bigint generated always as identity primary key,
  commodity_id            bigint not null references public.commodities(id) on delete restrict,
  country_code            text not null,          -- ISO 3166-1 alpha-3
  year                    integer not null
                            check (year between 1960 and 2100),
  production_quantity_mt  numeric(18,4),          -- metric tonnes
  yield_mt_per_ha         numeric(12,4),          -- metric tonnes per hectare
  harvested_area_ha       numeric(18,4),          -- hectares
  production_value_usd    numeric(18,2),          -- producer value in USD

  -- Provenance
  source_id               bigint references public.evidence_sources(id) on delete set null,
  sync_event_id           bigint references public.source_sync_events(id) on delete set null,
  original_item_code      text,                   -- source-specific item code (e.g., FAOSTAT item code)
  original_element_code   text,                   -- source-specific element code
  verified_at             timestamptz,
  verified_by             uuid references public.profiles(id) on delete set null,
  verification_status     text not null default 'imported'
                            check (verification_status in ('imported', 'verified', 'questionable', 'deprecated')),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  unique (commodity_id, country_code, year)
);

create index if not exists commodity_production_country_idx on public.commodity_production (country_code);
create index if not exists commodity_production_year_idx on public.commodity_production (year desc);
create index if not exists commodity_production_commodity_idx on public.commodity_production (commodity_id);

-- ── 3. Commodity Supply ─────────────────────────────────────────────────────

create table if not exists public.commodity_supply (
  id                      bigint generated always as identity primary key,
  commodity_id            bigint not null references public.commodities(id) on delete restrict,
  country_code            text not null,
  year                    integer not null
                            check (year between 1960 and 2100),
  domestic_production_mt  numeric(18,4),
  imports_mt              numeric(18,4),
  beginning_stocks_mt     numeric(18,4),
  other_supply_mt         numeric(18,4),          -- aid, re-exports, etc.
  total_supply_mt         numeric(18,4),

  -- Provenance
  source_id               bigint references public.evidence_sources(id) on delete set null,
  sync_event_id           bigint references public.source_sync_events(id) on delete set null,
  verified_at             timestamptz,
  verified_by             uuid references public.profiles(id) on delete set null,
  verification_status     text not null default 'imported'
                            check (verification_status in ('imported', 'verified', 'questionable', 'deprecated')),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  unique (commodity_id, country_code, year)
);

create index if not exists commodity_supply_country_idx on public.commodity_supply (country_code);
create index if not exists commodity_supply_year_idx on public.commodity_supply (year desc);

-- ── 4. Commodity Demand ─────────────────────────────────────────────────────

create table if not exists public.commodity_demand (
  id                      bigint generated always as identity primary key,
  commodity_id            bigint not null references public.commodities(id) on delete restrict,
  country_code            text not null,
  year                    integer not null
                            check (year between 1960 and 2100),
  food_consumption_mt     numeric(18,4),
  industrial_use_mt       numeric(18,4),
  feed_use_mt             numeric(18,4),
  seed_use_mt             numeric(18,4),
  waste_mt                numeric(18,4),
  exports_mt              numeric(18,4),
  ending_stocks_mt        numeric(18,4),
  total_domestic_mt       numeric(18,4),
  total_demand_mt         numeric(18,4),

  -- Per-capita indicators
  population_millions     numeric(12,2),
  per_capita_consumption_kg numeric(12,4),

  -- Provenance
  source_id               bigint references public.evidence_sources(id) on delete set null,
  sync_event_id           bigint references public.source_sync_events(id) on delete set null,
  verified_at             timestamptz,
  verified_by             uuid references public.profiles(id) on delete set null,
  verification_status     text not null default 'imported'
                            check (verification_status in ('imported', 'verified', 'questionable', 'deprecated')),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  unique (commodity_id, country_code, year)
);

create index if not exists commodity_demand_country_idx on public.commodity_demand (country_code);
create index if not exists commodity_demand_year_idx on public.commodity_demand (year desc);

-- ── 5. Commodity Trade Flows ────────────────────────────────────────────────

create table if not exists public.commodity_trade (
  id                      bigint generated always as identity primary key,
  commodity_id            bigint not null references public.commodities(id) on delete restrict,
  flow_type               text not null
                            check (flow_type in ('export', 'import')),
  reporter_country        text not null,          -- ISO 3166-1 alpha-3
  partner_country         text not null,          -- ISO 3166-1 alpha-3
  year                    integer not null
                            check (year between 1960 and 2100),
  quantity_mt             numeric(18,4),
  value_usd               numeric(18,2),
  unit_value_usd_per_mt   numeric(12,4),          -- derived: value / quantity
  hs_code                 text,                   -- Harmonized System classification code

  -- Provenance
  source_id               bigint references public.evidence_sources(id) on delete set null,
  sync_event_id           bigint references public.source_sync_events(id) on delete set null,
  verified_at             timestamptz,
  verified_by             uuid references public.profiles(id) on delete set null,
  verification_status     text not null default 'imported'
                            check (verification_status in ('imported', 'verified', 'questionable', 'deprecated')),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists commodity_trade_commodity_idx on public.commodity_trade (commodity_id);
create index if not exists commodity_trade_reporter_idx on public.commodity_trade (reporter_country);
create index if not exists commodity_trade_partner_idx on public.commodity_trade (partner_country);
create index if not exists commodity_trade_flow_idx on public.commodity_trade (flow_type);
create index if not exists commodity_trade_year_idx on public.commodity_trade (year desc);
create index if not exists commodity_trade_hs_idx on public.commodity_trade (hs_code) where hs_code is not null;

-- ── 6. Seed: Authoritative External Sources ─────────────────────────────────

insert into public.evidence_sources (code, name, organization, url, source_type, reliability, update_frequency, license_type, access_method, api_base_url, country_codes, commodity_scope, notes)
values
  ('faostat', 'FAOSTAT', 'Food and Agriculture Organization of the United Nations',
   'https://www.fao.org/faostat',
   'international_org', 0.92, 'annual', 'cc_by_nc_sa_3.0_igo', 'api',
   'https://fenixservices.fao.org/faostat/api/v1/en',
   array['NGA', 'GHA', 'CIV', 'SEN', 'MLI', 'BFA', 'NER', 'BEN', 'TGO'],
   array['rice', 'maize', 'cassava', 'yam', 'sorghum', 'millet', 'groundnut', 'soybean', 'cowpea', 'sesame', 'cocoa', 'palm_oil', 'cotton', 'ginger', 'sesame_seed', 'cashew', 'shea', 'hibiscus', 'garlic', 'plantain', 'sweet_potato'],
   'Primary source for global agricultural production, trade, and food balance sheets. Free API with attribution requirement. Non-commercial license — intelligence generation is permitted.'),

  ('usda_fas', 'USDA Foreign Agricultural Service — PSD Online', 'United States Department of Agriculture',
   'https://apps.fas.usda.gov/psdonline',
   'government', 0.90, 'monthly', 'public_domain', 'api',
   'https://apps.fas.usda.gov/PSDOnlineDataServices',
   array['NGA', 'GHA', 'CIV', 'SEN', 'MLI', 'BFA', 'NER', 'BEN', 'TGO', 'USA', 'CHN', 'IND', 'BRA'],
   array['rice', 'maize', 'cassava', 'sorghum', 'millet', 'groundnut', 'soybean', 'cowpea', 'cotton', 'cocoa', 'sugar', 'wheat'],
   'Production, Supply, and Distribution (PSD) database. US government public domain. Excellent for supply/demand balance sheets.'),

  ('nbs', 'National Bureau of Statistics — Nigeria', 'National Bureau of Statistics (Nigeria)',
   'https://nist.gov.plbstat.gov.ng',
   'government', 0.85, 'quarterly', 'public_domain', 'manual_download',
   null,
   array['NGA'],
   array['rice', 'maize', 'cassava', 'yam', 'sorghum', 'millet', 'groundnut', 'soybean', 'cowpea', 'cocoa', 'palm_oil', 'cotton', 'plantain', 'sweet_potato'],
   'Official Nigerian agricultural statistics. Quarterly agricultural GDP reports and annual statistical bulletins. Public domain government data.'),

  ('cbn', 'Central Bank of Nigeria — Exchange Rates', 'Central Bank of Nigeria',
   'https://www.cbn.gov.ng',
   'government', 0.95, 'daily', 'public_domain', 'api',
   'https://www.cbn.gov.ng/rates/exchRate.asp',
   array['NGA'],
   array[],
   'Official NGN exchange rates. Used for currency normalisation across all price observations. Primary authority for NGN/USD conversion.');

-- ── 7. Grants ───────────────────────────────────────────────────────────────

-- Service role can manage all intelligence tables (for ETL functions)
grant select, insert, update, delete on public.evidence_sources to service_role;
grant select, insert, update, delete on public.source_sync_events to service_role;
grant select, insert, update, delete on public.commodity_production to service_role;
grant select, insert, update, delete on public.commodity_supply to service_role;
grant select, insert, update, delete on public.commodity_demand to service_role;
grant select, insert, update, delete on public.commodity_trade to service_role;

-- Authenticated users get read-only access to verified intelligence
grant select on public.evidence_sources to authenticated;
grant select on public.source_sync_events to authenticated;
grant select on public.commodity_production to authenticated;
grant select on public.commodity_supply to authenticated;
grant select on public.commodity_demand to authenticated;
grant select on public.commodity_trade to authenticated;

-- Anonymous users cannot access intelligence tables
revoke all on public.evidence_sources from anon;
revoke all on public.source_sync_events from anon;
revoke all on public.commodity_production from anon;
revoke all on public.commodity_supply from anon;
revoke all on public.commodity_demand from anon;
revoke all on public.commodity_trade from anon;

-- ── 8. Auto-update timestamps ───────────────────────────────────────────────

create or replace function public.update_commodity_intelligence_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_commodity_production_updated
  before update on public.commodity_production
  for each row execute function public.update_commodity_intelligence_timestamp();

create trigger trg_commodity_supply_updated
  before update on public.commodity_supply
  for each row execute function public.update_commodity_intelligence_timestamp();

create trigger trg_commodity_demand_updated
  before update on public.commodity_demand
  for each row execute function public.update_commodity_intelligence_timestamp();

create trigger trg_commodity_trade_updated
  before update on public.commodity_trade
  for each row execute function public.update_commodity_intelligence_timestamp();
