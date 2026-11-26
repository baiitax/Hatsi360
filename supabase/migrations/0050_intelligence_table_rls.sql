-- ============================================================================
-- Hatsi360 — 0050 Row Level Security for the commodity intelligence tables
-- ============================================================================
-- Phase 1/2, audit finding SEC-01. Applied to production on 2026-11-26 after
-- the hosted project was measured directly (docs/improvement/
-- SUPABASE_RLS_VALIDATION.md), not assumed.
--
-- Measured state before this migration:
--
--   commodity_production   48 rows   RLS off   authenticated: DELETE, INSERT,
--   commodity_supply       30 rows             REFERENCES, SELECT, TRIGGER,
--   commodity_demand       30 rows             TRUNCATE, UPDATE
--   commodity_trade        22 rows
--   evidence_sources        7 rows
--   source_sync_events      0 rows
--
--   public tables 80, tables with RLS 74, policies 150.
--
-- With RLS off the grant *is* the access control, so any signed-in user could
-- read, rewrite or TRUNCATE the intelligence series. TRUNCATE is the part that
-- RLS does not fix on its own: row security is never applied to it, so it is
-- revoked explicitly below.
--
-- ── What visibility is preserved, and why ───────────────────────────────────
--
-- All 130 series rows currently hold verification_status = 'imported'; none is
-- verified. Gating public read on verification_status = 'verified' (as an
-- earlier draft of this file did) would have emptied /intelligence and the v1
-- intelligence endpoints the moment it was applied - a functional regression
-- dressed as a security fix. Visibility therefore stays exactly as it is
-- today for signed-in users, and writes are what changes:
--
--   series + evidence catalogue   any signed-in user  READ (unchanged)
--   series + evidence catalogue   staff               WRITE (was: any user)
--   source_sync_events            staff only          READ + WRITE
--                                 (operational telemetry; it has no rows and
--                                  only the admin intelligence pages read it)
--
-- Restricting published series to verified rows is a *publication* decision
-- that belongs with the entitlement and publication work, and it needs the
-- data to be verified first. It is recorded as an open item rather than being
-- taken silently here.
--
-- ── Why writes are a staff policy and not a revoke ──────────────────────────
--
-- Ingestion (src/lib/intelligence/ingestion/*) writes through the server
-- Supabase client, and POST /api/v1/intelligence/sync requires an authenticated
-- administrator. Revoking INSERT/UPDATE/DELETE from `authenticated` would have
-- broken the only legitimate writer. The grants stay; RLS restricts them to
-- staff, which is the control that was missing.
--
-- `service_role` keeps its grants and BYPASSRLS attribute: it is the ETL and
-- back-office role and is deliberately unaffected.
--
-- Additive and idempotent: every statement is `enable`/`revoke`/`drop ... if
-- exists`/`create`. No row is modified, no column is changed, nothing is
-- dropped.
-- ============================================================================

-- --------------------------------------------------------- 1. the four series

alter table public.commodity_production enable row level security;
alter table public.commodity_supply     enable row level security;
alter table public.commodity_demand     enable row level security;
alter table public.commodity_trade      enable row level security;
alter table public.evidence_sources     enable row level security;
alter table public.source_sync_events   enable row level security;

-- ------------------------------------- 2. revoke what RLS cannot protect
-- TRUNCATE bypasses row security entirely; TRIGGER and REFERENCES let a grantee
-- attach behaviour to the table or point a foreign key at it. None of the three
-- is used by the application.

revoke truncate, trigger, references on public.commodity_production from authenticated, anon;
revoke truncate, trigger, references on public.commodity_supply     from authenticated, anon;
revoke truncate, trigger, references on public.commodity_demand     from authenticated, anon;
revoke truncate, trigger, references on public.commodity_trade      from authenticated, anon;
revoke truncate, trigger, references on public.evidence_sources     from authenticated, anon;
revoke truncate, trigger, references on public.source_sync_events   from authenticated, anon;

-- ------------------------------------------------- 3. read policies (unchanged
-- visibility for signed-in users, staff-only for the telemetry table)

drop policy if exists commodity_production_read on public.commodity_production;
create policy commodity_production_read on public.commodity_production
  for select to authenticated using (true);

drop policy if exists commodity_supply_read on public.commodity_supply;
create policy commodity_supply_read on public.commodity_supply
  for select to authenticated using (true);

drop policy if exists commodity_demand_read on public.commodity_demand;
create policy commodity_demand_read on public.commodity_demand
  for select to authenticated using (true);

drop policy if exists commodity_trade_read on public.commodity_trade;
create policy commodity_trade_read on public.commodity_trade
  for select to authenticated using (true);

drop policy if exists evidence_sources_read on public.evidence_sources;
create policy evidence_sources_read on public.evidence_sources
  for select to authenticated using (true);

drop policy if exists source_sync_events_staff_read on public.source_sync_events;
create policy source_sync_events_staff_read on public.source_sync_events
  for select to authenticated using (public.is_staff());

-- ------------------------------------------------------- 4. staff write access

drop policy if exists commodity_production_staff_write on public.commodity_production;
create policy commodity_production_staff_write on public.commodity_production
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists commodity_supply_staff_write on public.commodity_supply;
create policy commodity_supply_staff_write on public.commodity_supply
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists commodity_demand_staff_write on public.commodity_demand;
create policy commodity_demand_staff_write on public.commodity_demand
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists commodity_trade_staff_write on public.commodity_trade;
create policy commodity_trade_staff_write on public.commodity_trade
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists evidence_sources_staff_write on public.evidence_sources;
create policy evidence_sources_staff_write on public.evidence_sources
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists source_sync_events_staff_write on public.source_sync_events;
create policy source_sync_events_staff_write on public.source_sync_events
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ------------------------------------------------------------------ 5. notes

comment on table public.commodity_production is
  'FAO/USDA-style production series. Read: any signed-in user. Write: staff only. TRUNCATE revoked from authenticated.';
comment on table public.commodity_supply is
  'Supply series. Read: any signed-in user. Write: staff only. TRUNCATE revoked from authenticated.';
comment on table public.commodity_demand is
  'Demand series. Read: any signed-in user. Write: staff only. TRUNCATE revoked from authenticated.';
comment on table public.commodity_trade is
  'Bilateral trade flows. Read: any signed-in user. Write: staff only. TRUNCATE revoked from authenticated.';
comment on table public.evidence_sources is
  'Source catalogue and attribution. Read: any signed-in user. Write: staff only. TRUNCATE revoked from authenticated.';
comment on table public.source_sync_events is
  'Ingestion telemetry. Staff-only read and write: it describes how data was fetched, not what the data says.';
