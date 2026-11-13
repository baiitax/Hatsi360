-- =============================================================================
-- Hatsi360 — Phase 8: submitting a saved draft, and conflict detection
--
-- The field app saves a draft to the server so the work survives a lost or
-- wiped phone. When the agent submits it, the same record becomes the
-- submitted observation — no second row, no stray draft.
--
-- This migration redefines `public.submit_observation` to accept an optional
-- `p_observation_id`. When the id names a draft the caller owns, the draft is
-- submitted in place. When it is absent, the function behaves exactly as it
-- did before: it inserts a new observation.
--
-- It also adds a conflict check. If the client says "this is the version I
-- saw" and the server has moved on, the function refuses rather than
-- overwriting a change the agent never saw.
--
-- Nothing is dropped and no historical record is altered.
-- =============================================================================

-- The two-argument overload from 0011 is replaced by this one. Keeping
-- both would make every two-argument call ambiguous, so the old signature
-- is dropped explicitly. The old call still works: the third parameter has
-- a default.
drop function if exists public.submit_observation(jsonb, text);

create or replace function public.submit_observation(
  p_payload jsonb,
  p_idempotency_key text default null,
  p_observation_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent       uuid := auth.uid();
  v_market      bigint;
  v_commodity   bigint;
  v_amount      numeric;
  v_unit        bigint;
  v_price_type  public.price_type;
  v_collected   timestamptz;
  v_existing    uuid;
  v_new_id      uuid;
  v_task        public.collection_tasks;
  v_draft       public.price_observations;
  v_expected    timestamptz;
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

  if v_unit is null then
    raise exception 'A measurement unit is required.' using errcode = 'invalid_parameter_value';
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

  -- ------------------------------------------------------------- a draft ---
  if p_observation_id is not null then
    select * into v_draft
    from public.price_observations
    where id = p_observation_id and is_current;

    if not found then
      raise exception 'That observation does not exist.' using errcode = 'no_data_found';
    end if;

    if v_draft.agent_user_id is distinct from v_agent and not public.is_staff() then
      raise exception 'That observation does not belong to you.' using errcode = 'insufficient_privilege';
    end if;

    if v_draft.verification_status <> 'draft' then
      raise exception 'That observation has already been submitted.' using errcode = 'invalid_parameter_value';
    end if;

    -- Conflict detection. The client sends the version it last saw. If the
    -- server has moved on, the agent is told rather than overwriting a
    -- change they never saw.
    v_expected := nullif(p_payload ->> 'expected_updated_at', '')::timestamptz;
    if v_expected is not null and v_draft.updated_at is distinct from v_expected then
      raise exception
        'This draft changed on the server while you were working on it. Open the record and check the current values before sending it.'
        using errcode = 'serialization_failure';
    end if;

    update public.price_observations
       set reported_amount = v_amount,
           reported_unit_id = v_unit,
           grade_id = coalesce(nullif(p_payload ->> 'grade_id', '')::bigint, v_draft.grade_id),
           variety_id = coalesce(nullif(p_payload ->> 'variety_id', '')::bigint, v_draft.variety_id),
           price_type = v_price_type,
           package_weight_kg = coalesce(
             nullif(p_payload ->> 'package_weight_kg', '')::numeric, v_draft.package_weight_kg),
           package_count = coalesce(
             nullif(p_payload ->> 'package_count', '')::integer, v_draft.package_count),
           collected_at = v_collected,
           notes = coalesce(nullif(p_payload ->> 'notes', ''), v_draft.notes),
           submitted_at = now(),
           verification_status = 'submitted',
           source_reference = coalesce(nullif(p_payload ->> 'source_reference', ''), v_draft.source_reference),
           submission_key = coalesce(nullif(trim(p_idempotency_key), ''), v_draft.submission_key),
           updated_at = now()
     where id = p_observation_id
     returning id into v_new_id;

    insert into public.price_verification_events (observation_id, action, actor_id, actor_role, notes)
    values (v_new_id, 'submitted', v_agent, public.current_role(), 'Submitted from a saved draft');

    perform public.write_audit(
      'observation.submitted', 'price_observation', v_new_id::text,
      jsonb_build_object('verification_status', 'draft'),
      jsonb_build_object(
        'market_id', v_market,
        'commodity_id', v_commodity,
        'reported_amount', v_amount,
        'reported_unit_id', v_unit,
        'price_type', v_price_type
      ),
      p_payload ->> 'notes'
    );

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
  end if;

  -- -------------------------------------------------------- a new record ---
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

grant execute on function public.submit_observation(jsonb, text, uuid) to authenticated;

-- The agent's own update policy has to allow the draft -> submitted
-- transition, and nothing beyond it. An agent still cannot touch a record
-- that has been reviewed.
drop policy if exists price_observations_agent_update on public.price_observations;
create policy price_observations_agent_update on public.price_observations
  for update to authenticated
  using (
    public.is_active_account()
    and agent_user_id = auth.uid()
    and verification_status in ('draft', 'correction_requested')
    and is_current
  )
  with check (
    public.is_active_account()
    and agent_user_id = auth.uid()
    and verification_status in ('draft', 'submitted', 'pending_verification', 'correction_requested')
    and is_current
  );
