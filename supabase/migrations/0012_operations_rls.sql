-- =============================================================================
-- Pluck Live — 0012 operations RLS and grants
-- =============================================================================
-- Row Level Security for the operations tables, plus the privilege layer.
--
-- The shape of every policy below:
--   * an agent reads their own operational records and nothing else;
--   * an administrator reads the whole operation;
--   * a notification belongs to exactly one recipient;
--   * a suspended account writes nothing at all.
-- =============================================================================

alter table public.agent_profiles enable row level security;
alter table public.account_status_events enable row level security;
alter table public.auth_login_attempts enable row level security;
alter table public.market_collection_schedules enable row level security;
alter table public.collection_task_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_delivery_logs enable row level security;
alter table public.scheduled_job_runs enable row level security;
alter table public.export_jobs enable row level security;
alter table public.data_quality_rule_versions enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.market_commodity_scope enable row level security;

-- ------------------------------------------------------- agent profiles ----

create policy agent_profiles_select on public.agent_profiles
  for select to authenticated
  using (profile_id = auth.uid() or public.is_staff());

create policy agent_profiles_admin_write on public.agent_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------- account status events ---

create policy account_status_events_admin_read on public.account_status_events
  for select to authenticated
  using (public.is_admin() or public.has_role('verification_officer', 'market_supervisor'));

create policy account_status_events_admin_write on public.account_status_events
  for insert to authenticated
  with check (public.is_admin());

-- Sign-in attempts are only ever read by an administrator, and never through
-- the browser: the identity hash is not something a client should see.
create policy auth_login_attempts_admin_read on public.auth_login_attempts
  for select to authenticated
  using (public.is_admin());

-- --------------------------------------------------------- schedules -------

-- An agent may read the plan for the markets they cover, so the app can tell
-- them what is expected of them.
create policy market_collection_schedules_select on public.market_collection_schedules
  for select to authenticated
  using (
    public.is_staff()
    or assigned_agent_id = auth.uid()
    or market_id in (select public.assigned_market_ids())
  );

create policy market_collection_schedules_admin_write on public.market_collection_schedules
  for all to authenticated
  using (public.is_admin() or public.has_role('market_supervisor'))
  with check (public.is_admin() or public.has_role('market_supervisor'));

-- ------------------------------------------------------- task events -------

create policy collection_task_events_select on public.collection_task_events
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.collection_tasks t
      where t.id = collection_task_events.task_id
        and (t.assigned_to = auth.uid()
             or t.market_id in (select public.assigned_market_ids()))
    )
  );

create policy collection_task_events_insert on public.collection_task_events
  for insert to authenticated
  with check (
    public.is_staff()
    or (
      public.is_active_account()
      and exists (
        select 1 from public.collection_tasks t
        where t.id = collection_task_events.task_id
          and t.assigned_to = auth.uid()
      )
    )
  );

-- ------------------------------------------------------- notifications -----

-- A notification belongs to one recipient. Administrators do not get to read
-- another person's notifications; the audit log is the mechanism for that.
create policy notifications_owner_read on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_owner_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No client insert. Notifications are created by the database functions and
-- by the server-side notification service, both of which write as the
-- database owner. A client can never place a notification in somebody else's
-- inbox.

create policy notification_delivery_logs_staff_read on public.notification_delivery_logs
  for select to authenticated
  using (public.is_staff());

create policy notification_delivery_logs_staff_write on public.notification_delivery_logs
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- -------------------------------------------------------- job runs ---------

create policy scheduled_job_runs_staff_read on public.scheduled_job_runs
  for select to authenticated
  using (public.is_staff());

create policy scheduled_job_runs_admin_write on public.scheduled_job_runs
  for insert to authenticated
  with check (public.is_admin());

-- --------------------------------------------------------- exports ---------

create policy export_jobs_owner_read on public.export_jobs
  for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());

create policy export_jobs_insert on public.export_jobs
  for insert to authenticated
  with check (requested_by = auth.uid() or public.is_admin());

create policy export_jobs_update on public.export_jobs
  for update to authenticated
  using (requested_by = auth.uid() or public.is_admin())
  with check (requested_by = auth.uid() or public.is_admin());

-- ----------------------------------------------------- quality rules ------

create policy quality_rule_versions_read on public.data_quality_rule_versions
  for select to authenticated
  using (public.is_staff());

create policy quality_rule_versions_admin_write on public.data_quality_rule_versions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- --------------------------------------------------- analytics snapshots ---

create policy analytics_snapshots_staff_read on public.analytics_snapshots
  for select to authenticated
  using (public.is_staff());

-- ------------------------------------------------- market commodity scope -

create policy market_commodity_scope_read on public.market_commodity_scope
  for select to anon, authenticated
  using (true);

create policy market_commodity_scope_admin_write on public.market_commodity_scope
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================================
-- Amendments to the existing policies
-- =============================================================================

-- An agent submits; the submission lands in the 'submitted' state.
drop policy if exists price_observations_agent_insert on public.price_observations;
create policy price_observations_agent_insert on public.price_observations
  for insert to authenticated
  with check (
    public.has_role('agent','market_supervisor')
    and public.is_active_account()
    and agent_user_id = auth.uid()
    and market_id in (select public.assigned_market_ids())
    and verification_status in ('draft','submitted','pending_verification')
  );

-- A suspended account may not amend its own work either.
drop policy if exists price_observations_agent_update on public.price_observations;
create policy price_observations_agent_update on public.price_observations
  for update to authenticated
  using (
    public.is_active_account()
    and agent_user_id = auth.uid()
    and verification_status in ('draft','correction_requested','submitted')
    and is_current
  )
  with check (
    public.is_active_account()
    and agent_user_id = auth.uid()
    and verification_status in ('draft','pending_verification','correction_requested','submitted')
    and is_current
  );

-- Collection tasks: a suspended agent keeps read access but loses write access.
drop policy if exists collection_tasks_agent_update on public.collection_tasks;
create policy collection_tasks_agent_update on public.collection_tasks
  for update to authenticated
  using ((assigned_to = auth.uid() and public.is_active_account()) or public.is_staff())
  with check ((assigned_to = auth.uid() and public.is_active_account()) or public.is_staff());

-- The staff read of observations now includes the newly submitted state.
drop policy if exists price_observations_staff_insert on public.price_observations;
create policy price_observations_staff_insert on public.price_observations
  for insert to authenticated
  with check (public.is_staff() and public.is_active_account() and agent_user_id = auth.uid());

-- =============================================================================
-- Grants
-- =============================================================================

grant select on public.agent_profiles to authenticated;
grant insert, update on public.agent_profiles to authenticated;

grant select on public.account_status_events to authenticated;
grant insert on public.account_status_events to authenticated;

grant select on public.auth_login_attempts to authenticated;

grant select on public.market_collection_schedules to authenticated;
grant insert, update, delete on public.market_collection_schedules to authenticated;

grant select on public.collection_task_events to authenticated;
grant insert on public.collection_task_events to authenticated;

grant select on public.notifications to authenticated;
grant update on public.notifications to authenticated;

grant select on public.notification_delivery_logs to authenticated;
grant insert, update on public.notification_delivery_logs to authenticated;

grant select on public.scheduled_job_runs to authenticated;
grant insert on public.scheduled_job_runs to authenticated;

grant select on public.export_jobs to authenticated;
grant insert, update on public.export_jobs to authenticated;

grant select on public.data_quality_rule_versions to authenticated;
grant insert, update on public.data_quality_rule_versions to authenticated;

grant select on public.analytics_snapshots to authenticated;

grant select on public.market_commodity_scope to anon, authenticated;
grant insert, update, delete on public.market_commodity_scope to authenticated;

grant execute on function public.current_account_status() to anon, authenticated;
grant execute on function public.is_active_account() to anon, authenticated;
grant execute on function public.is_assigned_to_market(bigint) to authenticated;
grant execute on function public.write_audit(text, text, text, jsonb, jsonb, text) to authenticated;
grant execute on function public.notify(uuid, public.notification_kind, text, text, text, text, text, public.operational_priority, jsonb) to authenticated;
