-- =============================================================================
-- Pluck Live — 0005 Row Level Security
-- =============================================================================
-- Every exposed table has RLS enabled and an explicit policy. Hiding a button
-- in the UI is never the enforcement mechanism — these policies are.
--
-- Roles are read from `public.profiles.role`. Additional organisation
-- memberships live in `public.organization_members`.
-- =============================================================================

-- --------------------------------------------------------------- helpers ----

-- Returns the role of the calling user, or 'public_user' for anonymous callers.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.profiles p where p.id = auth.uid()),
    'public_user'::public.user_role
  );
$$;

comment on function public.current_role() is
  'Role of the calling user. SECURITY DEFINER so it can read profiles regardless of the profiles policy, and it never accepts a caller-supplied id.';

create or replace function public.has_role(variadic roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = any (roles);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('verification_officer','market_supervisor','analyst','admin','super_admin');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin','super_admin');
$$;

-- Markets the calling agent is currently assigned to.
create or replace function public.assigned_market_ids()
returns setof bigint
language sql
stable
security definer
set search_path = public
as $$
  select a.market_id
  from public.market_agent_assignments a
  where a.user_id = auth.uid()
    and a.status = 'active'
    and (a.ends_on is null or a.ends_on >= current_date)
    and a.starts_on <= current_date;
$$;

-- An observation is publicly readable when it is published, current, and its
-- verification status is one the public is allowed to see.
create or replace function public.is_public_observation(
  p_status public.verification_status,
  p_published_at timestamptz,
  p_is_current boolean
)
returns boolean
language sql
immutable
as $$
  select p_is_current
     and p_published_at is not null
     and p_status in ('verified','legacy_unverified');
$$;

-- ------------------------------------------------------------------ grants ---
-- The anon/authenticated roles only get what they need. Everything else is
-- inherited from the table owner.
grant usage on schema public to anon, authenticated, service_role;

-- ------------------------------------------------------- reference tables ---
-- Reference data is public by design: it carries no prices and no secrets.
-- RLS is still enabled on every one of these tables so that access is granted
-- by an explicit policy rather than by table privileges alone.
do $$
declare t text;
begin
  foreach t in array array['countries','states','market_zones','markets','market_operating_schedules',
                           'commodity_categories','commodities','commodity_varieties',
                           'commodity_grades','commodity_synonyms','measurement_units',
                           'commodity_unit_conversions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.price_observations enable row level security;
alter table public.price_observation_evidence enable row level security;
alter table public.price_verification_events enable row level security;
alter table public.price_revision_history enable row level security;
alter table public.data_quality_flags enable row level security;
alter table public.market_agent_assignments enable row level security;
alter table public.collection_batches enable row level security;
alter table public.collection_tasks enable row level security;
alter table public.market_visit_records enable row level security;
alter table public.saved_commodities enable row level security;
alter table public.saved_markets enable row level security;
alter table public.price_alerts enable row level security;
alter table public.alert_delivery_logs enable row level security;
alter table public.market_reports enable row level security;
alter table public.report_subscriptions enable row level security;
alter table public.api_applications enable row level security;
alter table public.api_usage_logs enable row level security;
alter table public.customer_subscriptions enable row level security;
alter table public.billing_events enable row level security;
alter table public.articles enable row level security;
alter table public.article_categories enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- ------------------------------------------------------- reference read -----
-- Reference data is public by design: it carries no prices and no secrets.

-- --------------------------------------------------------------- profiles ---
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

-- A profile row is created automatically when the auth user is created
-- (public.handle_new_user, role 'public_user'). A client may only insert its
-- own profile, and only with the least-privileged role.
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'public_user');

-- Owners may edit their own profile — but not their own role. The
-- `profiles_prevent_role_escalation` trigger rejects a role change made by
-- anybody who is not an administrator.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Administrators may update any profile, including the role column.
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Only an administrator may change a role — on any profile, including their
-- own. The trigger is the last line of defence: even if a policy is ever
-- widened by mistake, a role change still cannot be made by a non-admin.
--
-- The trigger function is SECURITY INVOKER on purpose, so that `current_user`
-- identifies the caller. The service role (server-side administration) and
-- direct database administrators are trusted and are not subject to it.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.role is distinct from old.role then
    if not public.is_admin() then
      raise exception 'Only an administrator may change an account role.';
    end if;

    -- Never let the last administrator lock every account out.
    if old.role in ('admin', 'super_admin')
       and new.role not in ('admin', 'super_admin')
       and (select count(*) from public.profiles
             where role in ('admin', 'super_admin')
               and id <> old.id) = 0 then
      raise exception 'The last administrator account cannot be demoted.';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.prevent_role_escalation() is
  'Rejects any role change performed by a caller whose role is not admin/super_admin, and protects the last administrator account. SECURITY INVOKER so that current_user identifies the caller.';

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- --------------------------------------------------------- organisations ---
create policy orgs_select_member on public.organizations
  for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.organization_members m
    where m.organization_id = organizations.id and m.user_id = auth.uid()
  ));

create policy orgs_admin_write on public.organizations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy org_members_select on public.organization_members
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid() or exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_members.organization_id and m.user_id = auth.uid()
  ));

create policy org_members_admin_write on public.organization_members
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------ price observations ---
-- Public read: only published, current, publicly-visible observations.
create policy price_observations_public_read on public.price_observations
  for select to anon, authenticated
  using (public.is_public_observation(verification_status, published_at, is_current));

-- Staff read everything.
create policy price_observations_staff_read on public.price_observations
  for select to authenticated
  using (public.is_staff());

-- Agents read their own submissions.
create policy price_observations_agent_read on public.price_observations
  for select to authenticated
  using (agent_user_id = auth.uid());

-- Agents insert only into markets they are assigned to, only as themselves.
create policy price_observations_agent_insert on public.price_observations
  for insert to authenticated
  with check (
    public.has_role('agent','market_supervisor')
    and agent_user_id = auth.uid()
    and market_id in (select public.assigned_market_ids())
    and verification_status in ('draft','pending_verification')
  );

-- Staff insert.
create policy price_observations_staff_insert on public.price_observations
  for insert to authenticated
  with check (public.is_staff() and agent_user_id = auth.uid());

-- Agents may edit their own unsubmitted or correction-requested rows only.
create policy price_observations_agent_update on public.price_observations
  for update to authenticated
  using (
    agent_user_id = auth.uid()
    and verification_status in ('draft','correction_requested')
    and is_current
  )
  with check (
    agent_user_id = auth.uid()
    and verification_status in ('draft','pending_verification','correction_requested')
    and is_current
  );

-- Staff may update rows inside their scope.
create policy price_observations_staff_update on public.price_observations
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Published rows are never deleted. Drafts may be removed by their author.
create policy price_observations_delete on public.price_observations
  for delete to authenticated
  using (
    public.is_admin()
    or (agent_user_id = auth.uid() and verification_status = 'draft' and published_at is null)
  );

-- ----------------------------------------------------------- evidence -------
create policy evidence_staff_read on public.price_observation_evidence
  for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.price_observations o
    where o.id = price_observation_evidence.observation_id
      and o.agent_user_id = auth.uid()
  ));

create policy evidence_public_read on public.price_observation_evidence
  for select to anon, authenticated
  using (exists (
    select 1 from public.price_observations o
    where o.id = price_observation_evidence.observation_id
      and public.is_public_observation(o.verification_status, o.published_at, o.is_current)
  ));

create policy evidence_owner_write on public.price_observation_evidence
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.price_observations o
      where o.id = price_observation_evidence.observation_id
        and o.agent_user_id = auth.uid()
        and o.verification_status in ('draft','correction_requested')
    )
  );

create policy evidence_staff_write on public.price_observation_evidence
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- --------------------------------------------------- verification events ---
create policy verification_events_read on public.price_verification_events
  for select to authenticated
  using (public.is_staff() or exists (
    select 1 from public.price_observations o
    where o.id = price_verification_events.observation_id and o.agent_user_id = auth.uid()
  ));

create policy verification_events_insert on public.price_verification_events
  for insert to authenticated
  with check (actor_id = auth.uid() and public.is_staff());

-- ------------------------------------------------------ revision history ---
create policy revision_history_read on public.price_revision_history
  for select to authenticated
  using (public.is_staff());

create policy revision_history_insert on public.price_revision_history
  for insert to authenticated
  with check (changed_by = auth.uid() and public.is_staff());

-- ------------------------------------------------------- quality flags -----
create policy quality_flags_read on public.data_quality_flags
  for select to authenticated
  using (public.is_staff());

create policy quality_flags_write on public.data_quality_flags
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ------------------------------------------------------ agent assignments ---
create policy assignments_select on public.market_agent_assignments
  for select to authenticated
  using (public.is_staff() or user_id = auth.uid());

create policy assignments_admin_write on public.market_agent_assignments
  for all to authenticated
  using (public.is_admin() or public.has_role('market_supervisor'))
  with check (public.is_admin() or public.has_role('market_supervisor'));

-- ------------------------------------------------------ collection tasks ---
create policy collection_tasks_select on public.collection_tasks
  for select to authenticated
  using (public.is_staff() or assigned_to = auth.uid() or market_id in (select public.assigned_market_ids()));

create policy collection_tasks_agent_update on public.collection_tasks
  for update to authenticated
  using (assigned_to = auth.uid() or public.is_staff())
  with check (assigned_to = auth.uid() or public.is_staff());

create policy collection_tasks_staff_write on public.collection_tasks
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ----------------------------------------------------- collection batches ---
create policy collection_batches_select on public.collection_batches
  for select to authenticated
  using (public.is_staff() or agent_user_id = auth.uid());

create policy collection_batches_write on public.collection_batches
  for all to authenticated
  using (public.is_staff() or agent_user_id = auth.uid())
  with check (public.is_staff() or agent_user_id = auth.uid());

-- ----------------------------------------------------- market visit records -
create policy market_visits_select on public.market_visit_records
  for select to authenticated
  using (public.is_staff() or agent_user_id = auth.uid());

create policy market_visits_write on public.market_visit_records
  for all to authenticated
  using (public.is_staff() or agent_user_id = auth.uid())
  with check (public.is_staff() or agent_user_id = auth.uid());

-- --------------------------------------------------------- saved entities ---
create policy saved_commodities_owner on public.saved_commodities
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy saved_markets_owner on public.saved_markets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy price_alerts_owner on public.price_alerts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy alert_logs_owner on public.alert_delivery_logs
  for select to authenticated
  using (exists (
    select 1 from public.price_alerts a
    where a.id = alert_delivery_logs.alert_id and a.user_id = auth.uid()
  ) or public.is_staff());

-- -------------------------------------------------------------- reports -----
-- Free reports are public. Premium reports need an active entitlement.
create policy reports_public_read on public.market_reports
  for select to anon, authenticated
  using (
    (not is_premium and published_at is not null)
    or public.is_staff()
    or exists (
      select 1 from public.customer_subscriptions s
      where s.user_id = auth.uid()
        and s.status in ('active','trialing')
        and (s.ends_at is null or s.ends_at > now())
        and coalesce((s.entitlements ->> 'reports'), 'false')::boolean
    )
  );

create policy reports_staff_write on public.market_reports
  for all to authenticated
  using (public.has_role('analyst','admin','super_admin'))
  with check (public.has_role('analyst','admin','super_admin'));

create policy report_subscriptions_owner on public.report_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------- subscriptions ------
create policy subscriptions_owner on public.customer_subscriptions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy subscriptions_admin_write on public.customer_subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy billing_events_owner on public.billing_events
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------ API applications ----
create policy api_applications_owner on public.api_applications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy api_applications_owner_write on public.api_applications
  for insert to authenticated
  with check (user_id = auth.uid());

create policy api_applications_owner_update on public.api_applications
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy api_applications_admin_delete on public.api_applications
  for delete to authenticated
  using (public.is_admin());

create policy api_usage_owner_read on public.api_usage_logs
  for select to authenticated
  using (exists (
    select 1 from public.api_applications a
    where a.id = api_usage_logs.application_id
      and (a.user_id = auth.uid() or public.is_admin())
  ));

-- ------------------------------------------------------------- articles -----
create policy articles_public_read on public.articles
  for select to anon, authenticated
  using (is_published and published_at is not null);

create policy articles_staff_read on public.articles
  for select to authenticated
  using (public.is_staff() or author_id = auth.uid());

create policy articles_staff_write on public.articles
  for all to authenticated
  using (public.has_role('analyst','admin','super_admin'))
  with check (public.has_role('analyst','admin','super_admin'));

create policy article_categories_public_read on public.article_categories
  for select to anon, authenticated
  using (true);

create policy article_categories_staff_write on public.article_categories
  for all to authenticated
  using (public.has_role('analyst','admin','super_admin'))
  with check (public.has_role('analyst','admin','super_admin'));

-- ------------------------------------------------------------ audit logs ----
create policy audit_logs_staff_read on public.audit_logs
  for select to authenticated
  using (public.is_staff());

create policy audit_logs_admin_insert on public.audit_logs
  for insert to authenticated
  with check (public.is_admin());

-- ------------------------------------------------------- system settings ---
create policy settings_staff_read on public.system_settings
  for select to authenticated
  using (public.is_staff());

create policy settings_admin_write on public.system_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
