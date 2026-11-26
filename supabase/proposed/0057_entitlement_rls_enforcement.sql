-- ============================================================================
-- Hatsi360 — 0057 database entitlement enforcement (PROPOSED, UNAPPLIED)
-- ============================================================================
-- Kept outside supabase/migrations/ until separately approved.
--
-- Why this exists: production enforces no plan at all. 0042–0045 are
-- unapplied there, so watchlists, alerts, exports and bulk are gated only by
-- application code, which a direct PostgREST call bypasses.
--
-- This file is self-contained: it drops the pre-0042 ownership policies AND
-- the 0042–0045 policies if they are present, then creates the enforced set.
-- It therefore converges to the same final state whether or not 0042–0045
-- have been applied. Predicates use has_entitlement_safe() so a resolver
-- regression denies the feature instead of erroring the query.
--
-- Nothing here is retroactive to data, and no grant, column or row changes.
--
-- Roles, explicitly:
--   anon            — no policy on any of these tables targets anon, and none
--                     is added. Anonymous access is denied by absence.
--   authenticated   — ownership AND entitlement (or staff).
--   staff/admin     — bypass via is_staff() / is_admin(), as before.
--   service_role    — has BYPASSRLS; policies do not apply. Unchanged.
--
-- NOT addressed here, by scope: per-tier item counts ("5 saved items",
-- "50 alerts"). Those are product limits with no implementation anywhere;
-- enforcing them is a feature, not a remediation.
-- ============================================================================

-- ------------------------------------------------------------- watchlists --
alter table if exists public.saved_commodities enable row level security;
alter table if exists public.saved_markets enable row level security;

drop policy if exists saved_commodities_owner on public.saved_commodities;
drop policy if exists saved_markets_owner on public.saved_markets;

drop policy if exists saved_commodities_entitlement_select on public.saved_commodities;
create policy saved_commodities_entitlement_select on public.saved_commodities
  for select to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

drop policy if exists saved_commodities_entitlement_insert on public.saved_commodities;
create policy saved_commodities_entitlement_insert on public.saved_commodities
  for insert to authenticated
  with check (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

drop policy if exists saved_commodities_entitlement_update on public.saved_commodities;
create policy saved_commodities_entitlement_update on public.saved_commodities
  for update to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()))
  with check (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

drop policy if exists saved_commodities_entitlement_delete on public.saved_commodities;
create policy saved_commodities_entitlement_delete on public.saved_commodities
  for delete to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

drop policy if exists saved_markets_entitlement_select on public.saved_markets;
create policy saved_markets_entitlement_select on public.saved_markets
  for select to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

drop policy if exists saved_markets_entitlement_insert on public.saved_markets;
create policy saved_markets_entitlement_insert on public.saved_markets
  for insert to authenticated
  with check (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

drop policy if exists saved_markets_entitlement_update on public.saved_markets;
create policy saved_markets_entitlement_update on public.saved_markets
  for update to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()))
  with check (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

drop policy if exists saved_markets_entitlement_delete on public.saved_markets;
create policy saved_markets_entitlement_delete on public.saved_markets
  for delete to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('watchlists') or public.is_staff()));

-- ----------------------------------------------------------------- alerts --
alter table if exists public.price_alerts enable row level security;
alter table if exists public.alert_delivery_logs enable row level security;

drop policy if exists price_alerts_owner on public.price_alerts;
drop policy if exists alert_logs_owner on public.alert_delivery_logs;
drop policy if exists price_alerts_read on public.price_alerts;
drop policy if exists price_alerts_create on public.price_alerts;
drop policy if exists price_alerts_update on public.price_alerts;
drop policy if exists price_alerts_delete on public.price_alerts;
drop policy if exists alert_logs_read on public.alert_delivery_logs;
drop policy if exists alert_logs_write on public.alert_delivery_logs;

-- Read is ownership only: an entitlement lapse must not hide the user's own
-- alert history.
create policy price_alerts_read on public.price_alerts
  for select to authenticated
  using (user_id = auth.uid());

create policy price_alerts_create on public.price_alerts
  for insert to authenticated
  with check (user_id = auth.uid() and (public.has_entitlement_safe('alerts') or public.is_staff()));

create policy price_alerts_update on public.price_alerts
  for update to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('alerts') or public.is_staff()))
  with check (user_id = auth.uid() and (public.has_entitlement_safe('alerts') or public.is_staff()));

create policy price_alerts_delete on public.price_alerts
  for delete to authenticated
  using (user_id = auth.uid() and (public.has_entitlement_safe('alerts') or public.is_staff()));

create policy alert_logs_read on public.alert_delivery_logs
  for select to authenticated
  using (
    exists (select 1 from public.price_alerts a where a.id = alert_delivery_logs.alert_id and a.user_id = auth.uid())
    or public.is_staff()
  );

create policy alert_logs_write on public.alert_delivery_logs
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------- exports --
alter table if exists public.export_jobs enable row level security;

drop policy if exists export_jobs_owner_read on public.export_jobs;
drop policy if exists export_jobs_insert on public.export_jobs;
drop policy if exists export_jobs_update on public.export_jobs;
drop policy if exists export_jobs_read on public.export_jobs;
drop policy if exists export_jobs_insert_entitled on public.export_jobs;
drop policy if exists export_jobs_update_admin on public.export_jobs;

create policy export_jobs_read on public.export_jobs
  for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());

create policy export_jobs_insert_entitled on public.export_jobs
  for insert to authenticated
  with check (
    (requested_by = auth.uid() and public.has_entitlement_safe('exports'))
    or public.is_admin()
  );

create policy export_jobs_update_admin on public.export_jobs
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------------- bulk --
drop policy if exists price_observations_bulk_read on public.price_observations;
create policy price_observations_bulk_read on public.price_observations
  for select to authenticated
  using (public.can_perform_bulk_operations());

drop policy if exists international_trade_bulk_read on public.international_trade_records;
create policy international_trade_bulk_read on public.international_trade_records
  for select to authenticated
  using (public.can_perform_bulk_operations());

drop policy if exists scheduled_job_runs_bulk_access on public.scheduled_job_runs;
create policy scheduled_job_runs_bulk_access on public.scheduled_job_runs
  for select to authenticated
  using (public.can_perform_bulk_operations());

-- ---------------------------------------------------------------- self-check --
do $$
declare
  v_missing text;
begin
  select string_agg(x, ', ') into v_missing
  from unnest(array[
    'saved_commodities:saved_commodities_entitlement_insert',
    'saved_markets:saved_markets_entitlement_select',
    'price_alerts:price_alerts_create',
    'price_alerts:price_alerts_delete',
    'alert_delivery_logs:alert_logs_read',
    'export_jobs:export_jobs_insert_entitled',
    'price_observations:price_observations_bulk_read',
    'international_trade_records:international_trade_bulk_read',
    'scheduled_job_runs:scheduled_job_runs_bulk_access'
  ]) x
  where not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = split_part(x, ':', 1)
      and policyname = split_part(x, ':', 2)
  );

  if v_missing is not null then
    raise exception '0057 self-check failed: missing policies: %', v_missing;
  end if;

  -- The pre-enforcement ownership policies must be gone, or an ALL-policy
  -- would OR its way past the entitlement predicate.
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and (tablename, policyname) in (
        ('saved_commodities','saved_commodities_owner'),
        ('saved_markets','saved_markets_owner'),
        ('price_alerts','price_alerts_owner'),
        ('alert_delivery_logs','alert_logs_owner'),
        ('export_jobs','export_jobs_insert'),
        ('export_jobs','export_jobs_owner_read'),
        ('export_jobs','export_jobs_update')
      )
  ) then
    raise exception '0057 self-check failed: a pre-0042 ownership policy survived the replace';
  end if;
end $$;
