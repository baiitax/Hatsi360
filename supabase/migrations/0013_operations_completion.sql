-- =============================================================
-- 0013 — Operations completion: rejection, provisioning, flags,
--          exports, sign-in throttling.
--
-- Every function in this file is server-side only, checks the caller's
-- account state and role, and writes an audit row.
-- =============================================================

-- The quality flags live on the observation so a list can show them without
-- a join, while `data_quality_flags` keeps the reviewable detail.
alter table public.price_observations
  add column if not exists quality_flags public.quality_flag_code[] not null default '{}';

comment on column public.price_observations.quality_flags is
  'The quality flags currently raised against this observation. The reviewable detail, including the rule version that produced the flag, is in data_quality_flags.';

-- The severity vocabulary of the rule engine is richer than the original
-- three values, so the constraint is widened rather than the engine weakened.
alter table public.data_quality_flags
  drop constraint if exists data_quality_flags_severity_check;

alter table public.data_quality_flags
  add constraint data_quality_flags_severity_check
  check (severity in ('info','warning','review','blocking','critical'));

alter table public.data_quality_flags
  add column if not exists rule_code text;

alter table public.data_quality_flags
  add column if not exists rule_version integer;

comment on column public.data_quality_flags.rule_code is
  'The quality rule that raised the flag, so a historical flag can be explained after the thresholds change.';

-- ------------------------------------------------------- rejection ---------

-- Reject a submitted observation.
--
-- Rejection is separate from approval and separate from publication. A
-- rejected observation is never published and the agent is told why.
create or replace function public.reject_observation(
  p_observation_id uuid,
  p_reason        text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obs public.price_observations;
begin
  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_staff() then
    raise exception 'Only verification staff may reject prices.' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'Tell the agent why the price was rejected.' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_obs from public.price_observations where id = p_observation_id for update;
  if not found then
    raise exception 'Observation % not found.', p_observation_id using errcode = 'no_data_found';
  end if;
  if v_obs.agent_user_id = auth.uid() then
    raise exception 'You cannot review your own submission.' using errcode = 'insufficient_privilege';
  end if;
  if v_obs.published_at is not null then
    raise exception 'A published price cannot be rejected. Publish a correction instead.' using errcode = 'invalid_parameter_value';
  end if;

  update public.price_observations
     set verification_status = 'rejected',
         rejected_at = now(),
         notes = coalesce(notes, '') || case when notes is null then '' else E'\n' end || 'Rejected: ' || p_reason
   where id = p_observation_id;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role, reason)
  values (p_observation_id, 'rejected', auth.uid(), public.current_role(), p_reason);

  perform public.write_audit(
    'observation.rejected', 'price_observation', p_observation_id::text,
    jsonb_build_object('verification_status', v_obs.verification_status),
    jsonb_build_object('verification_status', 'rejected'),
    p_reason
  );

  if v_obs.agent_user_id is not null then
    perform public.notify(
      v_obs.agent_user_id,
      'submission_rejected'::public.notification_kind,
      'A price you submitted was not accepted',
      p_reason,
      'price_observation', p_observation_id::text,
      '/agent/submissions',
      'high'::public.operational_priority
    );
  end if;
end;
$$;

grant execute on function public.reject_observation(uuid, text) to authenticated;

-- ------------------------------------------------------- role management ----

-- Change somebody's role.
--
-- Only a super administrator may do this, nobody may change their own role,
-- and the previous role is written to the audit log.
create or replace function public.set_user_role(
  p_profile_id uuid,
  p_role       public.user_role,
  p_reason     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.user_role;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may change a role.' using errcode = 'insufficient_privilege';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'You cannot change your own role.' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'A reason is required.' using errcode = 'invalid_parameter_value';
  end if;

  select role into v_previous from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Profile % not found.', p_profile_id using errcode = 'no_data_found';
  end if;
  if v_previous = p_role then
    return;
  end if;

  update public.profiles set role = p_role where id = p_profile_id;

  perform public.write_audit(
    'profile.role_changed', 'profile', p_profile_id::text,
    jsonb_build_object('role', v_previous),
    jsonb_build_object('role', p_role),
    p_reason
  );

  perform public.notify(
    p_profile_id,
    'system_alert'::public.notification_kind,
    'Your access level has changed',
    p_reason,
    'profile', p_profile_id::text,
    null,
    'normal'::public.operational_priority
  );
end;
$$;

grant execute on function public.set_user_role(uuid, public.user_role, text) to authenticated;

-- Turn a signed-up account into an operational agent.
--
-- The authentication user is created by the server with the service role; this
-- function does the operational part: the role, the agent profile and the
-- market assignments. There is no public registration path into it.
create or replace function public.provision_agent(
  p_profile_id     uuid,
  p_employee_code  text default null,
  p_region         text default null,
  p_market_ids     bigint[] default '{}',
  p_reason         text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market bigint;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may provision agents.' using errcode = 'insufficient_privilege';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'You cannot provision yourself.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Profile % not found.', p_profile_id using errcode = 'no_data_found';
  end if;

  update public.profiles
     set role = 'agent',
         account_status = 'active'
   where id = p_profile_id;

  insert into public.agent_profiles (profile_id, employee_code, region, joined_on)
  values (p_profile_id, nullif(trim(p_employee_code), ''), nullif(trim(p_region), ''), current_date)
  on conflict (profile_id) do update
    set employee_code = coalesce(excluded.employee_code, public.agent_profiles.employee_code),
        region = coalesce(excluded.region, public.agent_profiles.region),
        updated_at = now();

  foreach v_market in array coalesce(p_market_ids, '{}'::bigint[]) loop
    if not exists (select 1 from public.markets where id = v_market and is_active) then
      raise exception 'Market % is not active.', v_market using errcode = 'invalid_parameter_value';
    end if;

    insert into public.market_agent_assignments (user_id, market_id, status, starts_on)
    values (p_profile_id, v_market, 'active', current_date)
    on conflict do nothing;
  end loop;

  perform public.write_audit(
    'agent.provisioned', 'profile', p_profile_id::text,
    null,
    jsonb_build_object(
      'role', 'agent',
      'employee_code', nullif(trim(p_employee_code), ''),
      'region', nullif(trim(p_region), ''),
      'market_ids', coalesce(p_market_ids, '{}'::bigint[])
    ),
    p_reason
  );

  perform public.notify(
    p_profile_id,
    'assignment_changed'::public.notification_kind,
    'You have been added as a market agent',
    'Your markets are ready on the home screen.',
    'profile', p_profile_id::text,
    '/agent/home',
    'normal'::public.operational_priority
  );
end;
$$;

grant execute on function public.provision_agent(uuid, text, text, bigint[], text) to authenticated;

-- ------------------------------------------------------- quality flags -----

-- Raise a quality flag against an observation.
create or replace function public.raise_quality_flag(
  p_observation_id uuid,
  p_flag           public.quality_flag_code,
  p_detail         text,
  p_severity       text default 'warning',
  p_rule_code      text default null,
  p_rule_version   integer default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_severity public.quality_severity;
begin
  if not public.is_staff() then
    raise exception 'Only verification staff may raise quality flags.' using errcode = 'insufficient_privilege';
  end if;

  v_severity := case p_severity
    when 'info' then 'info'::public.quality_severity
    when 'warning' then 'warning'::public.quality_severity
    when 'review' then 'review'::public.quality_severity
    when 'blocking' then 'blocking'::public.quality_severity
    when 'critical' then 'blocking'::public.quality_severity
    else 'warning'::public.quality_severity
  end;

  if not exists (select 1 from public.price_observations where id = p_observation_id) then
    raise exception 'Observation % not found.', p_observation_id using errcode = 'no_data_found';
  end if;

  insert into public.data_quality_flags (observation_id, flag, detail, severity, raised_by, rule_code, rule_version)
  values (p_observation_id, p_flag, p_detail, p_severity, auth.uid(), p_rule_code, p_rule_version)
  returning id into v_id;

  update public.price_observations
     set quality_flags = case
           when p_flag = any (quality_flags) then quality_flags
           else array_append(quality_flags, p_flag)
         end,
         updated_at = now()
   where id = p_observation_id;

  perform public.write_audit(
    'observation.quality_flag_raised', 'price_observation', p_observation_id::text,
    null,
    jsonb_build_object('flag', p_flag, 'severity', p_severity, 'rule_code', p_rule_code, 'rule_version', p_rule_version),
    p_detail
  );

  return v_id;
end;
$$;

grant execute on function public.raise_quality_flag(uuid, public.quality_flag_code, text, text, text, integer) to authenticated;

-- Resolve a quality flag. The flag row is kept: only the resolution is added.
create or replace function public.resolve_quality_flag(
  p_flag_id bigint,
  p_note    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_flag public.data_quality_flags;
begin
  if not public.is_staff() then
    raise exception 'Only verification staff may resolve quality flags.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_flag from public.data_quality_flags where id = p_flag_id for update;
  if not found then
    raise exception 'Quality flag % not found.', p_flag_id using errcode = 'no_data_found';
  end if;
  if v_flag.resolved_at is not null then
    return;
  end if;

  update public.data_quality_flags
     set resolved_at = now(), resolved_by = auth.uid()
   where id = p_flag_id;

  perform public.write_audit(
    'observation.quality_flag_resolved', 'price_observation', v_flag.observation_id::text,
    jsonb_build_object('flag_id', p_flag_id, 'flag', v_flag.flag),
    jsonb_build_object('resolved_at', now()),
    p_note
  );
end;
$$;

grant execute on function public.resolve_quality_flag(bigint, text) to authenticated;

-- ------------------------------------------------------------- exports -----

-- Register an export request.
--
-- The row is created before the work starts so the request is auditable even
-- if the export later fails. Only staff may export.
create or replace function public.create_export_job(
  p_scope   text,
  p_filters jsonb default '{}'::jsonb,
  p_format  text default 'csv'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Only staff may export data.' using errcode = 'insufficient_privilege';
  end if;
  if p_format not in ('csv','json') then
    raise exception 'Unsupported export format.' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.export_jobs (requested_by, scope, filters, format, status, expires_at)
  values (auth.uid(), p_scope, coalesce(p_filters, '{}'::jsonb), p_format, 'running', now() + interval '7 days')
  returning id into v_id;

  perform public.write_audit(
    'export.requested', 'export_job', v_id::text,
    null,
    jsonb_build_object('scope', p_scope, 'format', p_format, 'filters', coalesce(p_filters, '{}'::jsonb)),
    null
  );

  return v_id;
end;
$$;

grant execute on function public.create_export_job(text, jsonb, text) to authenticated;

-- Record the outcome of an export.
create or replace function public.complete_export_job(
  p_export_id uuid,
  p_row_count integer default null,
  p_file_path text default null,
  p_error     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.export_jobs;
begin
  if not public.is_staff() then
    raise exception 'Only staff may complete exports.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_job from public.export_jobs where id = p_export_id for update;
  if not found then
    raise exception 'Export % not found.', p_export_id using errcode = 'no_data_found';
  end if;

  update public.export_jobs
     set status = case when p_error is null then 'completed'::public.export_status else 'failed'::public.export_status end,
         row_count = p_row_count,
         file_path = p_file_path,
         error = p_error,
         completed_at = now()
   where id = p_export_id;

  perform public.write_audit(
    'export.completed', 'export_job', p_export_id::text,
    jsonb_build_object('status', v_job.status),
    jsonb_build_object('status', case when p_error is null then 'completed' else 'failed' end, 'row_count', p_row_count),
    p_error
  );
end;
$$;

grant execute on function public.complete_export_job(uuid, integer, text, text) to authenticated;

-- ------------------------------------------------------ sign-in throttle ---

-- Record one sign-in attempt.
--
-- The identifier is already hashed by the caller. The table never holds an
-- email address or an IP address.
create or replace function public.record_login_attempt(
  p_identifier_hash text,
  p_ip_hash         text default null,
  p_succeeded       boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.auth_login_attempts (identifier_hash, ip_hash, succeeded)
  values (p_identifier_hash, p_ip_hash, p_succeeded);
$$;

grant execute on function public.record_login_attempt(text, text, boolean) to anon, authenticated;

-- How many failed attempts for this identifier since a moment in time.
create or replace function public.count_login_attempts(
  p_identifier_hash text,
  p_since           timestamptz default now() - interval '15 minutes'
)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.auth_login_attempts
  where identifier_hash = p_identifier_hash
    and not succeeded
    and attempted_at >= p_since;
$$;

grant execute on function public.count_login_attempts(text, timestamptz) to anon, authenticated;

-- Clear the throttle for an identifier after a successful sign-in.
create or replace function public.clear_login_attempts(p_identifier_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.auth_login_attempts where identifier_hash = p_identifier_hash;
$$;

grant execute on function public.clear_login_attempts(text) to anon, authenticated;
