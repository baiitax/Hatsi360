-- ============================================================================
-- Hatsi360 — 0050 Row Level Security for the commodity intelligence tables
-- ============================================================================
-- Phase 1, item P1-A6 (audit finding SEC-01).
--
-- 0034 created six tables, granted `select` on all of them to `authenticated`,
-- full DML to `service_role`, and never enabled Row Level Security. The audit
-- that applied the whole chain to an empty database caught it:
--
--     FAILED: tables without RLS: commodity_demand, commodity_production,
--             commodity_supply, commodity_trade, evidence_sources,
--             source_sync_events
--
-- With RLS off, a table grant *is* the access control: any authenticated user
-- could read every row - production and supply series, trade flows, the
-- evidence catalogue and its sync log. Nothing is broken today only because
-- 0034 cannot parse (MIG-03), which means either those tables do not exist in
-- production or they exist ungoverned. Both need this migration.
--
-- ── What "public" means for each table ──────────────────────────────────────
--
-- The four series tables carry a `verification_status`
-- ('imported' | 'verified' | 'questionable' | 'deprecated') and a `verified_at`.
-- That is the same idea as the price-observation lifecycle: a row becomes
-- public when a human has verified it, not when the import job wrote it.
--   * commodity_production / _supply / _demand / _trade : public read of
--     verified rows only; staff read everything (they are the ones verifying).
--   * evidence_sources : the source catalogue is attribution data and is
--     deliberately public for active sources - publishable provenance is the
--     point of it.
--   * source_sync_events : operational telemetry (fetch times, error text).
--     Staff only. It is not part of any published figure.
--
-- Consequence to be aware of: if a series has been imported but never verified,
-- it becomes invisible to anonymous readers after this migration. That is the
-- intended fail-closed behaviour, and it is the reason the predicate is written
-- down here rather than defaulted to "allow".
--
-- ── Grants ──────────────────────────────────────────────────────────────────
--
-- 0034 granted `select` to `authenticated` only, while /api/v1/intelligence/*
-- queries through the server client with the anon key for unauthenticated API
-- callers. Those routes therefore could not have returned rows for anonymous
-- callers even with RLS off. `anon` now receives `select` on the four series
-- tables and on the active source catalogue - verified rows only, by policy -
-- and nothing else. `service_role` keeps its `bypassrls` attribute and needs
-- no policy.
--
-- No existing grant is revoked, no row is modified, and every statement is
-- additive and re-runnable.
-- ============================================================================

-- ------------------------------------------------------------ the four series

alter table public.commodity_production enable row level security;
alter table public.commodity_supply     enable row level security;
alter table public.commodity_demand     enable row level security;
alter table public.commodity_trade      enable row level security;

drop policy if exists commodity_production_public_read on public.commodity_production;
create policy commodity_production_public_read on public.commodity_production
  for select to anon, authenticated
  using (verification_status = 'verified');

drop policy if exists commodity_production_staff_read on public.commodity_production;
create policy commodity_production_staff_read on public.commodity_production
  for select to authenticated
  using (public.is_staff());

drop policy if exists commodity_supply_public_read on public.commodity_supply;
create policy commodity_supply_public_read on public.commodity_supply
  for select to anon, authenticated
  using (verification_status = 'verified');

drop policy if exists commodity_supply_staff_read on public.commodity_supply;
create policy commodity_supply_staff_read on public.commodity_supply
  for select to authenticated
  using (public.is_staff());

drop policy if exists commodity_demand_public_read on public.commodity_demand;
create policy commodity_demand_public_read on public.commodity_demand
  for select to anon, authenticated
  using (verification_status = 'verified');

drop policy if exists commodity_demand_staff_read on public.commodity_demand;
create policy commodity_demand_staff_read on public.commodity_demand
  for select to authenticated
  using (public.is_staff());

drop policy if exists commodity_trade_public_read on public.commodity_trade;
create policy commodity_trade_public_read on public.commodity_trade
  for select to anon, authenticated
  using (verification_status = 'verified');

drop policy if exists commodity_trade_staff_read on public.commodity_trade;
create policy commodity_trade_staff_read on public.commodity_trade
  for select to authenticated
  using (public.is_staff());

grant select on public.commodity_production to anon;
grant select on public.commodity_supply     to anon;
grant select on public.commodity_demand     to anon;
grant select on public.commodity_trade      to anon;

-- --------------------------------------------------------- the source catalogue

alter table public.evidence_sources enable row level security;

drop policy if exists evidence_sources_public_read on public.evidence_sources;
create policy evidence_sources_public_read on public.evidence_sources
  for select to anon, authenticated
  using (is_active);

drop policy if exists evidence_sources_staff_read on public.evidence_sources;
create policy evidence_sources_staff_read on public.evidence_sources
  for select to authenticated
  using (public.is_staff());

grant select on public.evidence_sources to anon;

-- ------------------------------------------------------------- the sync log

alter table public.source_sync_events enable row level security;

drop policy if exists source_sync_events_staff_read on public.source_sync_events;
create policy source_sync_events_staff_read on public.source_sync_events
  for select to authenticated
  using (public.is_staff());

-- No anon grant: this is operational telemetry, not published intelligence.

-- ------------------------------------------------------------------ comments

comment on table public.commodity_production is
  'FAO/USDA-style production series. Public read is limited to verification_status = verified; staff see all rows.';
comment on table public.commodity_supply is
  'Supply series. Public read is limited to verification_status = verified; staff see all rows.';
comment on table public.commodity_demand is
  'Demand series. Public read is limited to verification_status = verified; staff see all rows.';
comment on table public.commodity_trade is
  'Bilateral trade flows. Public read is limited to verification_status = verified; staff see all rows.';
comment on table public.source_sync_events is
  'Ingestion telemetry. Staff-only: it describes how data was fetched, not what the data says.';
