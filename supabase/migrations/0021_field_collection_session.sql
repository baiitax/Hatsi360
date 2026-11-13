-- =============================================================================
-- Hatsi360 — Phase 8: the collection session and market intelligence
--
-- Two additions, both additive:
--
--   1. `collection_batches` gains a link from the observation to the session
--      it belongs to, so a multi-commodity visit is one record with several
--      observations rather than a pile of unconnected prices.
--
--   2. `observation_market_intelligence` records what the agent saw around
--      the price — availability, supply, demand, direction, activity,
--      sentiment and developments. This is the difference between a number
--      and a price a buyer can act on.
--
-- The intelligence is stored beside the observation, never merged into it, so
-- the price itself stays exactly as it was reported.
-- =============================================================================

-- ------------------------------------------------------- session linkage ---

alter table public.price_observations
  add column if not exists collection_batch_id bigint
    references public.collection_batches (id) on delete set null;

create index if not exists price_observations_batch_idx
  on public.price_observations (collection_batch_id)
  where collection_batch_id is not null;

comment on column public.price_observations.collection_batch_id is
  'The market visit this observation was collected in. Null for prices collected outside a session.';

-- ------------------------------------------------------- market intelligence ---

do $$ begin
  create type public.intelligence_availability as enum (
    'scarce', 'limited', 'adequate', 'abundant', 'surplus'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.intelligence_level as enum (
    'very_low', 'low', 'moderate', 'high', 'very_high'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.price_direction as enum (
    'rising', 'stable', 'falling', 'volatile'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.market_sentiment as enum (
    'positive', 'neutral', 'negative'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.observation_market_intelligence (
  id             bigint generated always as identity primary key,

  -- One record per observation. The price is the observation; this is the
  -- context around it.
  observation_id uuid not null unique
    references public.price_observations (id) on delete cascade,

  availability   public.intelligence_availability,
  supply_level   public.intelligence_level,
  demand_level   public.intelligence_level,
  price_direction public.price_direction,
  market_activity public.intelligence_level,
  sentiment      public.market_sentiment,

  -- What changed, in the agent's words. A rumour about the road, a policy
  -- notice, a change in who is buying.
  developments   text,

  agent_user_id  uuid references public.profiles (id) on delete set null,
  recorded_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint observation_intelligence_developments_length
    check (developments is null or length(developments) <= 2000)
);

create index if not exists observation_intelligence_agent_idx
  on public.observation_market_intelligence (agent_user_id);

comment on table public.observation_market_intelligence is
  'What the agent observed around a price: availability, supply, demand, direction, activity, sentiment and developments. Stored separately from the price so the reported price is never altered.';

-- Keep updated_at honest.
drop trigger if exists observation_market_intelligence_set_updated_at
  on public.observation_market_intelligence;
create trigger observation_market_intelligence_set_updated_at
  before update on public.observation_market_intelligence
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------- policies ---

alter table public.observation_market_intelligence enable row level security;

-- The agent reads the intelligence attached to their own observations.
create policy observation_intelligence_owner_read
  on public.observation_market_intelligence
  for select to authenticated
  using (
    public.is_staff()
    or agent_user_id = auth.uid()
    or exists (
      select 1 from public.price_observations o
      where o.id = observation_market_intelligence.observation_id
        and o.agent_user_id = auth.uid()
    )
  );

-- The agent records it, for their own observations only.
create policy observation_intelligence_owner_write
  on public.observation_market_intelligence
  for insert to authenticated
  with check (
    public.is_active_account()
    and public.has_role('agent', 'market_supervisor')
    and (
      agent_user_id is null
      or agent_user_id = auth.uid()
    )
    and exists (
      select 1 from public.price_observations o
      where o.id = observation_market_intelligence.observation_id
        and o.agent_user_id = auth.uid()
        and o.verification_status in ('draft', 'correction_requested')
    )
  );

create policy observation_intelligence_owner_update
  on public.observation_market_intelligence
  for update to authenticated
  using (
    public.is_active_account()
    and public.has_role('agent', 'market_supervisor')
    and exists (
      select 1 from public.price_observations o
      where o.id = observation_market_intelligence.observation_id
        and o.agent_user_id = auth.uid()
        and o.verification_status in ('draft', 'correction_requested')
    )
  )
  with check (
    public.is_active_account()
    and public.has_role('agent', 'market_supervisor')
  );

-- Nothing is deleted outright: the record of what was seen is part of the
-- history of the price.
create policy observation_intelligence_no_direct_delete
  on public.observation_market_intelligence
  for delete to authenticated
  using (public.is_admin());

-- ------------------------------------------------------ the collection batch ---

-- The agent may open and close a session at a market they cover, but may
-- not open one anywhere else, and may not delete a session that holds
-- observations.
drop policy if exists collection_batches_write on public.collection_batches;
create policy collection_batches_write on public.collection_batches
  for insert to authenticated
  with check (
    public.is_active_account()
    and (
      public.is_staff()
      or (
        agent_user_id = auth.uid()
        and market_id in (select public.assigned_market_ids())
      )
    )
  );

create policy collection_batches_update on public.collection_batches
  for update to authenticated
  using (
    public.is_staff()
    or (
      public.is_active_account()
      and agent_user_id = auth.uid()
      and market_id in (select public.assigned_market_ids())
    )
  )
  with check (
    public.is_staff()
    or (
      public.is_active_account()
      and agent_user_id = auth.uid()
      and market_id in (select public.assigned_market_ids())
    )
  );

-- A session is never deleted while it holds observations.
create policy collection_batches_no_delete on public.collection_batches
  for delete to authenticated
  using (
    public.is_admin()
    or (
      agent_user_id = auth.uid()
      and not exists (
        select 1 from public.price_observations o
        where o.collection_batch_id = collection_batches.id
      )
    )
  );

-- --------------------------------------------------- the session functions ---

-- Open a collection session.
--
-- The reference is what the agent reads out over the phone and what appears
-- on the visit record, so it is generated here rather than trusted from the
-- client.
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

-- Close a collection session.
--
-- The session is closed when the agent says so. The observations inside it
-- keep their own review state: a closed session is not an approved price.
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
  v_agent uuid := auth.uid();
  v_batch public.collection_batches;
begin
  if v_agent is null then
    raise exception 'You must be signed in to close a collection.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_batch from public.collection_batches where id = p_batch_id;
  if not found then
    raise exception 'That collection session does not exist.' using errcode = 'no_data_found';
  end if;

  if v_batch.agent_user_id is distinct from v_agent and not public.is_staff() then
    raise exception 'That collection session is not yours.' using errcode = 'insufficient_privilege';
  end if;

  if v_batch.completed_at is not null then
    -- Closing twice is harmless.
    return;
  end if;

  update public.collection_batches
     set completed_at = now(),
         notes = coalesce(nullif(p_notes, ''), notes)
   where id = p_batch_id;

  -- The visit record gives the office the context of the visit.
  insert into public.market_visit_records (
    market_id, agent_user_id, visited_at, observations_count, notes
  )
  select
    v_batch.market_id,
    v_batch.agent_user_id,
    coalesce(v_batch.started_at, now()),
    (select count(*) from public.price_observations o where o.collection_batch_id = v_batch.id),
    coalesce(nullif(p_notes, ''), v_batch.notes)
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

-- ------------------------------------------------ the agent's own details ---

-- Update the two fields the agent is allowed to change.
--
-- This is a function rather than a table policy on purpose. A row-level
-- policy on `agent_profiles` would let an agent update every column of
-- their own row, including the region and the employee code. Here the
-- function writes exactly two columns and nothing else, so the role, the
-- account state, the region and the assignments stay out of reach.
create or replace function public.update_agent_contact(
  p_full_name       text,
  p_alternate_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;

  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'Enter your name.' using errcode = 'invalid_parameter_value';
  end if;

  update public.profiles
     set full_name = left(trim(p_full_name), 120)
   where id = auth.uid();

  update public.agent_profiles
     set alternate_phone = nullif(left(trim(coalesce(p_alternate_phone, '')), 40), '')
   where profile_id = auth.uid();
end;
$$;

grant execute on function public.update_agent_contact(text, text) to authenticated;

-- --------------------------------------------------------------- grants ----

grant select, insert, update, delete
  on public.observation_market_intelligence to authenticated;
grant select, insert, update
  on public.observation_market_intelligence to service_role;

grant usage, select on sequence public.observation_market_intelligence_id_seq to authenticated;
grant usage, select on sequence public.observation_market_intelligence_id_seq to service_role;
