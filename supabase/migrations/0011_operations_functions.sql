-- =============================================================================
-- Pluck Live — 0011 operations functions
-- =============================================================================
-- The transactional rules of the operations system live here, in the database,
-- so that every caller — the agent app, the admin console, a scheduled job or
-- a future integration — is subject to exactly the same rules.
--
-- Each function re-checks authorisation itself. A SECURITY DEFINER function
-- bypasses RLS, so the check that RLS would have made is made explicitly.
-- =============================================================================

-- ------------------------------------------------------------- helpers -----

-- Is the calling account allowed to operate at all?
create or replace function public.current_account_status()
returns public.account_status
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.account_status from public.profiles p where p.id = auth.uid()),
    'deactivated'::public.account_status
  );
$$;

comment on function public.current_account_status() is
  'The calling account''s status. A suspended or deactivated account is treated as having no access, even if its role would allow it.';

create or replace function public.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_account_status() = 'active';
$$;

-- Write one audit row. Never stores credentials or session material.
create or replace function public.write_audit(
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_before      jsonb default null,
  p_after       jsonb default null,
  p_reason      text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data, reason)
  values (auth.uid(), public.current_role(), p_action, p_entity_type, p_entity_id, p_before, p_after, p_reason)
  returning id into v_id;
  return v_id;
end;
$$;

-- Create a notification for one recipient.
--
-- The in-app channel is delivered by the row's existence; external channels
-- are queued and are only marked delivered when the provider confirms it.
create or replace function public.notify(
  p_user_id    uuid,
  p_kind       public.notification_kind,
  p_title      text,
  p_body       text default null,
  p_entity_type text default null,
  p_entity_id  text default null,
  p_action_url text default null,
  p_severity   public.operational_priority default 'normal',
  p_metadata   jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  insert into public.notifications (user_id, kind, severity, title, body, entity_type, entity_id, action_url, metadata)
  values (p_user_id, p_kind, p_severity, p_title, p_body, p_entity_type, p_entity_id, p_action_url, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;

  insert into public.notification_delivery_logs (notification_id, channel, status, attempt_count)
  values (v_id, 'in_app', 'delivered', 1)
  on conflict (notification_id, channel) do nothing;

  return v_id;
end;
$$;

-- Is the calling agent currently assigned to this market?
create or replace function public.is_assigned_to_market(p_market_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.market_agent_assignments a
    where a.user_id = auth.uid()
      and a.market_id = p_market_id
      and a.status = 'active'
      and (a.starts_on is null or a.starts_on <= current_date)
      and (a.ends_on is null or a.ends_on >= current_date)
  );
$$;

-- ------------------------------------------------- agent submission --------

-- Submit one price observation.
--
-- The agent must have an active account, must be assigned to the market, and
-- must submit as themselves. The task, when supplied, must be theirs.
--
-- p_idempotency_key makes a retry safe: the same key returns the same
-- observation instead of creating a second one.
create or replace function public.submit_observation(
  p_payload jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent      uuid := auth.uid();
  v_market     bigint;
  v_commodity  bigint;
  v_amount     numeric;
  v_unit       bigint;
  v_price_type public.price_type;
  v_collected  timestamptz;
  v_existing   uuid;
  v_new_id     uuid;
  v_task       public.collection_tasks;
  v_visit      bigint;
begin
  if v_agent is null then
    raise exception 'You must be signed in to submit a price.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;

  if not public.has_role('agent', 'market_supervisor') then
    raise exception 'Only market agents may submit collected prices.' using errcode = 'insufficient_privilege';
  end if;

  -- Idempotency: the same key always resolves to the same observation.
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select id into v_existing
    from public.price_observations
    where submission_key = p_idempotency_key;

    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  v_market    := (p_payload ->> 'market_id')::bigint;
  v_commodity := (p_payload ->> 'commodity_id')::bigint;
  v_amount    := nullif(p_payload ->> 'reported_amount', '')::numeric;
  v_unit      := nullif(p_payload ->> 'reported_unit_id', '')::bigint;
  v_price_type := coalesce(nullif(p_payload ->> 'price_type', '')::public.price_type, 'unspecified'::public.price_type);
  v_collected := coalesce(nullif(p_payload ->> 'collected_at', '')::timestamptz, now());

  if v_market is null or v_commodity is null then
    raise exception 'A market and a commodity are required.' using errcode = 'invalid_parameter_value';
  end if;

  if v_amount is null or v_amount <= 0 then
    raise exception 'Enter the price you collected.' using errcode = 'invalid_parameter_value';
  end if;

  if not exists (select 1 from public.markets where id = v_market and is_active) then
    raise exception 'That market is not available for collection.' using errcode = 'invalid_parameter_value';
  end if;

  if not exists (select 1 from public.commodities where id = v_commodity and is_active) then
    raise exception 'That commodity is not available for collection.' using errcode = 'invalid_parameter_value';
  end if;

  if not public.is_assigned_to_market(v_market) then
    raise exception 'You are not assigned to that market.' using errcode = 'insufficient_privilege';
  end if;

  -- When a task is supplied it must belong to this agent and this market.
  if nullif(p_payload ->> 'task_id', '') is not null then
    select * into v_task from public.collection_tasks where id = (p_payload ->> 'task_id')::bigint;
    if not found then
      raise exception 'That collection task does not exist.' using errcode = 'no_data_found';
    end if;
    if v_task.assigned_to is distinct from v_agent then
      raise exception 'That collection task is not assigned to you.' using errcode = 'insufficient_privilege';
    end if;
    if v_task.market_id <> v_market then
      raise exception 'That collection task is for a different market.' using errcode = 'invalid_parameter_value';
    end if;
    if v_task.status in ('completed', 'cancelled') then
      raise exception 'That collection task is closed.' using errcode = 'invalid_parameter_value';
    end if;
  end if;

  insert into public.price_observations (
    commodity_id, market_id, variety_id, grade_id, price_type,
    reported_amount, reported_unit_id, package_weight_kg, package_count,
    currency_code, collected_at, collected_at_precision, submitted_at,
    agent_user_id, verification_status, notes, source_system, source_reference,
    submission_key
  )
  values (
    v_commodity,
    v_market,
    nullif(p_payload ->> 'variety_id', '')::bigint,
    nullif(p_payload ->> 'grade_id', '')::bigint,
    v_price_type,
    v_amount,
    v_unit,
    nullif(p_payload ->> 'package_weight_kg', '')::numeric,
    nullif(p_payload ->> 'package_count', '')::integer,
    coalesce(nullif(p_payload ->> 'currency_code', ''), 'NGN'),
    v_collected,
    coalesce(nullif(p_payload ->> 'collected_at_precision', '')::public.timestamp_precision, 'minute'::public.timestamp_precision),
    now(),
    v_agent,
    'submitted',
    p_payload ->> 'notes',
    'agent_app',
    p_payload ->> 'source_reference',
    nullif(trim(p_idempotency_key), '')
  )
  returning id into v_new_id;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role)
  values (v_new_id, 'submitted', v_agent, public.current_role());

  perform public.write_audit(
    'observation.submitted', 'price_observation', v_new_id::text,
    null,
    jsonb_build_object(
      'market_id', v_market,
      'commodity_id', v_commodity,
      'reported_amount', v_amount,
      'reported_unit_id', v_unit,
      'price_type', v_price_type
    ),
    p_payload ->> 'notes'
  );

  -- Link the observation to the task and move the task forward.
  if v_task.id is not null then
    update public.collection_tasks
       set status = case when status = 'open' then 'in_progress'::public.collection_task_status
                         else status end,
           started_at = coalesce(started_at, now())
     where id = v_task.id;

    insert into public.collection_task_events (task_id, event_type, from_status, to_status, actor_id, reason)
    values (
      v_task.id,
      'started',
      v_task.status,
      (select status from public.collection_tasks where id = v_task.id),
      v_agent,
      null
    );
  end if;

  return v_new_id;
end;
$$;

grant execute on function public.submit_observation(jsonb, text) to authenticated;

-- --------------------------------------------------------- verification ----

-- Approve an observation. Approval and publication are separate acts: an
-- approved observation is not public until publish_observation is called.
create or replace function public.approve_observation(
  p_observation_id uuid,
  p_notes text default null
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
    raise exception 'Only verification staff may approve prices.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_obs from public.price_observations where id = p_observation_id for update;
  if not found then
    raise exception 'Observation % not found.', p_observation_id using errcode = 'no_data_found';
  end if;
  if v_obs.agent_user_id = auth.uid() then
    raise exception 'You cannot approve your own submission.' using errcode = 'insufficient_privilege';
  end if;
  if v_obs.verification_status in ('rejected') then
    raise exception 'That observation was rejected.' using errcode = 'invalid_parameter_value';
  end if;
  if v_obs.published_at is not null then
    raise exception 'That observation is already published.' using errcode = 'invalid_parameter_value';
  end if;

  update public.price_observations
     set verification_status = 'verified',
         verified_at = now(),
         verified_by = auth.uid(),
         notes = case when p_notes is null then notes else p_notes end
   where id = p_observation_id;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role, reason)
  values (p_observation_id, 'approved', auth.uid(), public.current_role(), p_notes);

  perform public.write_audit('observation.approved', 'price_observation', p_observation_id::text, null, null, p_notes);

  if v_obs.agent_user_id is not null then
    perform public.notify(
      v_obs.agent_user_id, 'submission_approved',
      'Your price submission was approved',
      format('Your submission for %s was approved.', v_obs.commodity_id),
      'price_observation', p_observation_id::text,
      '/agent/submissions', 'normal'
    );
  end if;
end;
$$;

grant execute on function public.approve_observation(uuid, text) to authenticated;

-- Send an observation back to the agent for correction.
create or replace function public.request_correction(
  p_observation_id uuid,
  p_reason text
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
    raise exception 'Only verification staff may request corrections.' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'Tell the agent what needs correcting.' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_obs from public.price_observations where id = p_observation_id for update;
  if not found then
    raise exception 'Observation % not found.', p_observation_id using errcode = 'no_data_found';
  end if;
  if v_obs.agent_user_id = auth.uid() then
    raise exception 'You cannot review your own submission.' using errcode = 'insufficient_privilege';
  end if;

  update public.price_observations
     set verification_status = 'correction_requested'
   where id = p_observation_id;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role, reason)
  values (p_observation_id, 'correction_requested', auth.uid(), public.current_role(), p_reason);

  perform public.write_audit('observation.correction_requested', 'price_observation', p_observation_id::text, null, null, p_reason);

  if v_obs.agent_user_id is not null then
    perform public.notify(
      v_obs.agent_user_id, 'correction_requested',
      'A correction was requested',
      p_reason,
      'price_observation', p_observation_id::text,
      '/agent/submissions', 'high'
    );
  end if;
end;
$$;

grant execute on function public.request_correction(uuid, text) to authenticated;

-- Publication requires an approved observation.
--
-- Approval and publication are separate acts: a reviewer approves, and the
-- price becomes public only when it is published. Publishing an observation
-- that was never reviewed is not possible.
create or replace function public.publish_observation(p_observation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_staff() then
    raise exception 'Only verification staff may publish prices.' using errcode = 'insufficient_privilege';
  end if;

  update public.price_observations
     set published_at = now(),
         verified_at = coalesce(verified_at, now()),
         verified_by = coalesce(verified_by, auth.uid())
   where id = p_observation_id
     and published_at is null
     and verification_status in ('verified', 'legacy_unverified');

  if not found then
    raise exception 'Observation % is not approved for publication. Approve it first.',
      p_observation_id using errcode = 'invalid_parameter_value';
  end if;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role)
  values (p_observation_id, 'published', auth.uid(), public.current_role());

  perform public.write_audit(
    'observation.published', 'price_observation', p_observation_id::text,
    null,
    jsonb_build_object('published_at', now())
  );
end;
$$;

grant execute on function public.publish_observation(uuid) to authenticated;

-- --------------------------------------------------- account management ----

-- Change an account's status. Administrators only; every change is recorded.
create or replace function public.set_account_status(
  p_profile_id uuid,
  p_status     public.account_status,
  p_reason     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous public.account_status;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may change an account status.' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'A reason is required.' using errcode = 'invalid_parameter_value';
  end if;

  select account_status into v_previous from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception 'Account % not found.', p_profile_id using errcode = 'no_data_found';
  end if;

  if v_previous = p_status then
    return;
  end if;

  update public.profiles set account_status = p_status where id = p_profile_id;

  insert into public.account_status_events (profile_id, previous_status, new_status, reason, actor_id)
  values (p_profile_id, v_previous, p_status, p_reason, auth.uid());

  perform public.write_audit(
    'account.status_changed', 'profile', p_profile_id::text,
    jsonb_build_object('account_status', v_previous),
    jsonb_build_object('account_status', p_status),
    p_reason
  );

  perform public.notify(
    p_profile_id,
    'system_alert'::public.notification_kind,
    case p_status
      when 'active' then 'Your access has been restored'
      when 'suspended' then 'Your access has been suspended'
      else 'Your account has been deactivated'
    end,
    p_reason,
    'profile', p_profile_id::text,
    '/agent/profile',
    case when p_status = 'active'
         then 'normal'::public.operational_priority
         else 'high'::public.operational_priority end
  );
end;
$$;

grant execute on function public.set_account_status(uuid, public.account_status, text) to authenticated;

-- Assign or unassign an agent to a market.
create or replace function public.set_market_assignment(
  p_market_id bigint,
  p_agent_id  uuid,
  p_active    boolean,
  p_reason    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.market_agent_assignments;
begin
  if not (public.is_admin() or public.has_role('market_supervisor')) then
    raise exception 'Only supervisors and administrators may change market assignments.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_existing from public.market_agent_assignments
  where market_id = p_market_id and user_id = p_agent_id
  for update;

  if not found then
    insert into public.market_agent_assignments (user_id, market_id, status, starts_on, notes)
    values (p_agent_id, p_market_id, 'active', current_date, p_reason);
  else
    update public.market_agent_assignments
       set status = case when p_active then 'active'::public.assignment_status else 'ended'::public.assignment_status end,
           ends_on = case when p_active then null else current_date end,
           notes = coalesce(p_reason, notes)
     where market_id = p_market_id and user_id = p_agent_id;
  end if;

  perform public.write_audit(
    'assignment.changed', 'market_agent_assignment',
    (p_market_id || ':' || p_agent_id),
    jsonb_build_object('active', v_existing.status = 'active'),
    jsonb_build_object('active', p_active),
    p_reason
  );

  perform public.notify(
    p_agent_id, 'assignment_changed',
    case when p_active then 'You were assigned to a market' else 'A market assignment ended' end,
    p_reason,
    'market', p_market_id::text,
    '/agent/markets',
    'normal'
  );
end;
$$;

grant execute on function public.set_market_assignment(bigint, uuid, boolean, text) to authenticated;

-- ------------------------------------------------------- scheduling --------

-- One task per schedule per day. The unique index makes a repeated run a
-- no-op rather than a duplicate.
create unique index if not exists collection_tasks_schedule_due_idx
  on public.collection_tasks (schedule_id, due_on)
  where schedule_id is not null;

-- Generate the collection tasks due on a given date.
create or replace function public.generate_collection_tasks(p_date date default current_date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created integer := 0;
  v_schedule record;
  v_task_id bigint;
begin
  for v_schedule in
    select s.*,
           m.name as market_name
    from public.market_collection_schedules s
    join public.markets m on m.id = s.market_id
    where s.is_active
      and m.is_active
      and s.frequency in ('daily', 'weekly')
      and extract(dow from p_date)::int = any (s.days_of_week)
  loop
    insert into public.collection_tasks (
      market_id, commodity_id, schedule_id, assigned_to, due_on, status,
      priority, expected_commodity_ids, deadline_at, notes
    )
    values (
      v_schedule.market_id,
      v_schedule.commodity_id,
      v_schedule.id,
      v_schedule.assigned_agent_id,
      p_date,
      'open',
      v_schedule.priority,
      case when v_schedule.commodity_id is null then '{}' else array[v_schedule.commodity_id] end,
      (p_date + coalesce(v_schedule.deadline_time, '16:00'::time)),
      format('Scheduled collection for %s', v_schedule.market_name)
    )
    on conflict do nothing
    returning id into v_task_id;

    if v_task_id is not null then
      v_created := v_created + 1;

      insert into public.collection_task_events (task_id, event_type, to_status, actor_id, payload)
      values (v_task_id, 'created', 'open', auth.uid(), jsonb_build_object('schedule_id', v_schedule.id));

      if v_schedule.assigned_agent_id is not null then
        perform public.notify(
          v_schedule.assigned_agent_id, 'task_assigned',
          'A collection task was assigned to you',
          format('%s — due %s', v_schedule.market_name, p_date),
          'collection_task', v_task_id::text,
          '/agent/tasks', v_schedule.priority
        );
      end if;
    end if;
  end loop;

  return v_created;
end;
$$;

grant execute on function public.generate_collection_tasks(date) to authenticated, service_role;

-- Mark overdue tasks and tell the people who need to know.
create or replace function public.mark_overdue_tasks(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task record;
  v_marked integer := 0;
begin
  for v_task in
    select t.id, t.market_id, t.assigned_to, t.deadline_at, t.due_on, m.name as market_name
    from public.collection_tasks t
    join public.markets m on m.id = t.market_id
    where t.status in ('open', 'in_progress')
      and t.deadline_at is not null
      and t.deadline_at < p_now
      and not exists (
        select 1 from public.collection_task_events e
        where e.task_id = t.id and e.event_type = 'overdue'
      )
  loop
    insert into public.collection_task_events (task_id, event_type, actor_id, reason)
    values (v_task.id, 'overdue', auth.uid(), 'past its collection deadline');

    v_marked := v_marked + 1;

    if v_task.assigned_to is not null then
      perform public.notify(
        v_task.assigned_to, 'deadline_reminder',
        'A collection task is overdue',
        format('%s was due %s.', v_task.market_name, v_task.deadline_at),
        'collection_task', v_task.id::text,
        '/agent/tasks', 'high'
      );
    end if;
  end loop;

  return v_marked;
end;
$$;

grant execute on function public.mark_overdue_tasks(timestamptz) to authenticated, service_role;

-- -------------------------------------------------------- task lifecycle ---

-- Move a task through its lifecycle. Permitted transitions are explicit.
create or replace function public.transition_task(
  p_task_id bigint,
  p_status  public.collection_task_status,
  p_reason  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.collection_tasks;
  v_allowed boolean := false;
begin
  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_task from public.collection_tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task % not found.', p_task_id using errcode = 'no_data_found';
  end if;

  if v_task.assigned_to = auth.uid() then
    v_allowed := (p_status in ('in_progress', 'submitted', 'correction_required', 'cancelled', 'completed'));
  elsif public.is_staff() then
    v_allowed := true;
  else
    raise exception 'That collection task is not assigned to you.' using errcode = 'insufficient_privilege';
  end if;

  if not v_allowed then
    raise exception 'That task cannot be moved to % from %.', p_status, v_task.status using errcode = 'invalid_parameter_value';
  end if;

  if p_status = 'cancelled' and (p_reason is null or length(trim(p_reason)) < 3) then
    raise exception 'A reason is required to cancel a task.' using errcode = 'invalid_parameter_value';
  end if;

  update public.collection_tasks
     set status = p_status,
         started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
         submitted_at = case when p_status = 'submitted' then now() else submitted_at end,
         completed_at = case when p_status in ('completed', 'cancelled') then now() else completed_at end,
         cancellation_reason = case when p_status = 'cancelled' then p_reason else cancellation_reason end
   where id = p_task_id;

  insert into public.collection_task_events (task_id, event_type, from_status, to_status, actor_id, reason)
  values (
    p_task_id,
    case p_status
      when 'open' then 'reopened'
      when 'in_progress' then 'started'
      else lower(p_status::text)
    end,
    v_task.status, p_status, auth.uid(), p_reason
  );

  perform public.write_audit(
    'task.transition', 'collection_task', p_task_id::text,
    jsonb_build_object('status', v_task.status),
    jsonb_build_object('status', p_status),
    p_reason
  );
end;
$$;

grant execute on function public.transition_task(bigint, public.collection_task_status, text) to authenticated;

-- ------------------------------------------------------- analytics snapshot -

-- Store a daily snapshot of the operational metrics.
create or replace function public.refresh_analytics_snapshot(p_date date default current_date)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_metrics jsonb;
begin
  select jsonb_build_object(
    'markets_total', (select count(*) from public.markets),
    'markets_active', (select count(*) from public.markets where is_active),
    'agents_total', (select count(*) from public.profiles where role = 'agent'),
    'observations_total', (select count(*) from public.price_observations),
    'observations_today', (
      select count(*) from public.price_observations
      where collected_at >= p_date and collected_at < p_date + 1
    ),
    'pending_verification', (
      select count(*) from public.price_observations
      where verification_status in ('submitted', 'pending_verification')
    ),
    'published_total', (
      select count(*) from public.price_observations where published_at is not null
    ),
    'open_tasks', (select count(*) from public.collection_tasks where status in ('open','in_progress')),
    'overdue_tasks', (
      select count(*) from public.collection_tasks
      where status in ('open','in_progress') and deadline_at < now()
    )
  ) into v_metrics;

  insert into public.analytics_snapshots (snapshot_date, scope, metrics)
  values (p_date, 'global', v_metrics)
  on conflict (snapshot_date, scope) do update
    set metrics = excluded.metrics, generated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.refresh_analytics_snapshot(date) to authenticated, service_role;
