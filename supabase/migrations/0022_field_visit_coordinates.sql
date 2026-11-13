-- =============================================================================
-- Hatsi360 — Phase 8: the optional visit coordinate
--
-- The field app offers the agent a "confirm my position" button. It is
-- optional: the app explains it, records it on the visit when it is granted,
-- and never refuses a collection because the phone could not get a fix.
--
-- Until now the coordinate was captured in the browser and dropped on the
-- floor. This migration gives it somewhere to live, additively:
--
--   1. `collection_batches` gains `gps_latitude` / `gps_longitude`, recorded
--      when the session is opened.
--   2. `market_visit_records` gains the same pair, so the coordinate survives
--      into the visit record the session writes when it closes.
--   3. `open_collection_batch` and `close_collection_batch` gain optional
--      coordinate parameters. Both default to null, so every existing caller
--      keeps working unchanged.
--
-- Nothing here changes a price. The coordinate describes where the agent was
-- standing, which is a different fact from what the market was charging, and
-- it is stored as a different column for that reason.
--
-- Nullable columns and defaulted parameters: this migration adds and rewrites
-- two function bodies. It removes nothing and rewrites no data. Reverting it
-- is `alter table ... drop column` plus restoring the previous function
-- signatures from migration 0021.
-- =============================================================================

-- --------------------------------------------------- session coordinates ---

alter table public.collection_batches
  add column if not exists gps_latitude numeric(9, 6);

alter table public.collection_batches
  add column if not exists gps_longitude numeric(9, 6);

comment on column public.collection_batches.gps_latitude is
  'Latitude the agent reported when opening the session, to six decimal places. Null when the agent did not confirm a position, or the device could not get one.';

comment on column public.collection_batches.gps_longitude is
  'Longitude the agent reported when opening the session, to six decimal places. Null when the agent did not confirm a position, or the device could not get one.';

-- ---------------------------------------------------- visit coordinates ---

alter table public.market_visit_records
  add column if not exists gps_latitude numeric(9, 6);

alter table public.market_visit_records
  add column if not exists gps_longitude numeric(9, 6);

comment on column public.market_visit_records.gps_latitude is
  'Latitude carried over from the session the visit was recorded from.';

comment on column public.market_visit_records.gps_longitude is
  'Longitude carried over from the session the visit was recorded from.';

-- ------------------------------------------------- open a collection -------

-- Two overloads, deliberately.
--
-- The four-argument signature is the one migration 0021 defined and the one
-- every existing caller uses. It is left exactly as it was.
--
-- The six-argument signature is the same function plus the coordinate. Its
-- last two parameters have **no** defaults: a defaulted trailing parameter
-- would make `open_collection_batch(market, task, ref, notes)` ambiguous
-- between the two signatures, and every four-argument call in the codebase
-- would stop resolving. Keeping them required at the tail means a four-arg
-- call is unambiguously the four-arg function and a six-arg call is
-- unambiguously this one.
create or replace function public.open_collection_batch(
  p_market_id    bigint,
  p_task_id      bigint default null,
  p_reference    text default null,
  p_notes        text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent    uuid := auth.uid();
  v_batch_id bigint;
  v_task     public.collection_tasks;
  v_ref      text;
begin
  if v_agent is null then
    raise exception 'You must be signed in to start a collection.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;

  if not public.has_role('agent', 'market_supervisor') then
    raise exception 'Only market agents may open a collection session.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.markets where id = p_market_id and is_active) then
    raise exception 'That market is not available for collection.' using errcode = 'invalid_parameter_value';
  end if;

  if not public.is_assigned_to_market(p_market_id) then
    raise exception 'You are not assigned to that market.' using errcode = 'insufficient_privilege';
  end if;

  if p_task_id is not null then
    select * into v_task from public.collection_tasks where id = p_task_id;
    if not found then
      raise exception 'That collection task does not exist.' using errcode = 'no_data_found';
    end if;
    if v_task.assigned_to is distinct from v_agent and not public.is_staff() then
      raise exception 'That collection task is not assigned to you.' using errcode = 'insufficient_privilege';
    end if;
    if v_task.market_id <> p_market_id then
      raise exception 'That collection task is for a different market.' using errcode = 'invalid_parameter_value';
    end if;
  end if;

  v_ref := coalesce(
    nullif(trim(p_reference), ''),
    'COL-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  );

  insert into public.collection_batches (reference, market_id, agent_user_id, notes)
  values (v_ref, p_market_id, v_agent, nullif(p_notes, ''))
  returning id into v_batch_id;

  if p_task_id is not null then
    update public.collection_tasks
       set batch_id = v_batch_id,
           status = case when status = 'open' then 'in_progress'::public.task_status else status end,
           started_at = coalesce(started_at, now())
     where id = p_task_id;
  end if;

  return v_batch_id;
end;
$$;

grant execute on function public.open_collection_batch(bigint, bigint, text, text) to authenticated;

-- ------------------------------------------------- open with a coordinate ---

-- The same session, with an optional position attached. Everything the
-- four-argument version checks is checked here too — this is a full
-- implementation, not a shortcut past the guards.
create or replace function public.open_collection_batch(
  p_market_id    bigint,
  p_task_id      bigint,
  p_reference    text,
  p_notes        text,
  p_latitude     numeric,
  p_longitude    numeric
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent    uuid := auth.uid();
  v_batch_id bigint;
  v_task     public.collection_tasks;
  v_ref      text;
  v_lat      numeric(9, 6);
  v_lon      numeric(9, 6);
begin
  if v_agent is null then
    raise exception 'You must be signed in to start a collection.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;

  if not public.has_role('agent', 'market_supervisor') then
    raise exception 'Only market agents may open a collection session.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.markets where id = p_market_id and is_active) then
    raise exception 'That market is not available for collection.' using errcode = 'invalid_parameter_value';
  end if;

  if not public.is_assigned_to_market(p_market_id) then
    raise exception 'You are not assigned to that market.' using errcode = 'insufficient_privilege';
  end if;

  if p_task_id is not null then
    select * into v_task from public.collection_tasks where id = p_task_id;
    if not found then
      raise exception 'That collection task does not exist.' using errcode = 'no_data_found';
    end if;
    if v_task.assigned_to is distinct from v_agent and not public.is_staff() then
      raise exception 'That collection task is not assigned to you.' using errcode = 'insufficient_privilege';
    end if;
    if v_task.market_id <> p_market_id then
      raise exception 'That collection task is for a different market.' using errcode = 'invalid_parameter_value';
    end if;
  end if;

  -- A coordinate is accepted only if it is a real one. Anything out of range
  -- is dropped rather than stored, and it is never required: the session
  -- opens exactly the same way without it.
  if p_latitude is not null and p_latitude between -90 and 90 then
    v_lat := p_latitude;
  end if;
  if p_longitude is not null and p_longitude between -180 and 180 then
    v_lon := p_longitude;
  end if;

  v_ref := coalesce(
    nullif(trim(p_reference), ''),
    'COL-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  );

  insert into public.collection_batches (
    reference, market_id, agent_user_id, notes, gps_latitude, gps_longitude
  )
  values (v_ref, p_market_id, v_agent, nullif(p_notes, ''), v_lat, v_lon)
  returning id into v_batch_id;

  if p_task_id is not null then
    update public.collection_tasks
       set batch_id = v_batch_id,
           status = case when status = 'open' then 'in_progress'::public.task_status else status end,
           started_at = coalesce(started_at, now())
     where id = p_task_id;
  end if;

  return v_batch_id;
end;
$$;

grant execute on function public.open_collection_batch(bigint, bigint, text, text, numeric, numeric) to authenticated;

-- ------------------------------------------------- close a collection ------

create or replace function public.close_collection_batch(
  p_batch_id bigint,
  p_notes   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.collection_batches;
begin
  select * into v_batch from public.collection_batches where id = p_batch_id;
  if not found then
    raise exception 'That collection session does not exist.' using errcode = 'no_data_found';
  end if;

  if v_batch.agent_user_id is distinct from auth.uid() and not public.is_staff() then
    raise exception 'That collection session is not yours.' using errcode = 'insufficient_privilege';
  end if;

  if v_batch.completed_at is not null then
    -- Closing twice is a no-op, not an error: the agent may press it again
    -- after a dropped connection.
    return;
  end if;

  update public.collection_batches
     set completed_at = now(),
         notes = coalesce(nullif(p_notes, ''), notes)
   where id = p_batch_id
   returning * into v_batch;

  -- Record the visit. The coordinate is carried over so the visit keeps the
  -- same position the session was opened with.
  insert into public.market_visit_records (
    market_id, agent_user_id, visited_at, observations_count, notes,
    gps_latitude, gps_longitude
  )
  select
    v_batch.market_id,
    v_batch.agent_user_id,
    coalesce(v_batch.started_at, now()),
    (select count(*) from public.price_observations o where o.collection_batch_id = v_batch.id),
    coalesce(nullif(p_notes, ''), v_batch.notes),
    v_batch.gps_latitude,
    v_batch.gps_longitude
  from public.collection_batches b
  where b.id = p_batch_id
    and not exists (
      select 1 from public.market_visit_records v
      where v.market_id = v_batch.market_id
        and v.agent_user_id = v_batch.agent_user_id
        and v.visited_at = coalesce(v_batch.started_at, now())
    );
end;
$$;

grant execute on function public.close_collection_batch(bigint, text) to authenticated;
