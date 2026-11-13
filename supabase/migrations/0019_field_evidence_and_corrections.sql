-- =============================================================================
-- Hatsi360 — Phase 7: field agent evidence, corrections and assignment notices
--
-- This migration is additive. It creates nothing that duplicates an existing
-- entity, it drops nothing, and it alters no historical observation.
--
--   1. A private Storage bucket for collection evidence, with owner-scoped
--      policies. Evidence must never be readable from an unrestricted public
--      URL.
--   2. A short-lived signed URL function, so the agent and the reviewer can
--      open an evidence file without the object ever being public.
--   3. A narrowed agent update policy. An agent may edit a draft or a
--      record a reviewer asked to be corrected, but may not silently edit a
--      record that is already in the review queue.
--   4. `resubmit_observation` — the agent's path for answering a correction
--      request. It appends a revision, preserves the previous values, records
--      the verification event and the audit trail, and supersedes the old
--      record rather than overwriting it.
--   5. A trigger that tells an agent when their assignment changes.
--   6. The indexes the agent's hot queries need.
-- =============================================================================

-- ---------------------------------------------------------------- evidence --

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hatsi360-evidence',
  'hatsi360-evidence',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- Evidence is written by the agent who owns the observation, and read only by
-- that agent or by staff. There is deliberately no policy for the `anon`
-- role: a published price never exposes the file that supports it.
drop policy if exists evidence_storage_insert on storage.objects;
create policy evidence_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hatsi360-evidence'
    and exists (
      select 1
      from public.price_observations o
      where o.agent_user_id = auth.uid()
        and o.verification_status in ('draft', 'correction_requested')
        and (
          storage.foldername(name))[1] = o.id::text
    )
  );

drop policy if exists evidence_storage_select on storage.objects;
create policy evidence_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'hatsi360-evidence'
    and (
      public.is_staff()
      or exists (
        select 1
        from public.price_observations o
        where o.agent_user_id = auth.uid()
          and (storage.foldername(name))[1] = o.id::text
      )
    )
  );

-- An agent may remove their own evidence while the observation is still a
-- draft or awaiting correction. Staff may always remove it.
drop policy if exists evidence_storage_delete on storage.objects;
create policy evidence_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hatsi360-evidence'
    and (
      public.is_staff()
      or exists (
        select 1
        from public.price_observations o
        where o.agent_user_id = auth.uid()
          and o.verification_status in ('draft', 'correction_requested')
          and (storage.foldername(name))[1] = o.id::text
      )
    )
  );

-- A signed URL for one evidence file, for the owner or for staff.
--
-- The function takes the evidence row, not a path built from parts. The
-- stored path is the one the upload wrote, so the link can never point at a
-- file that was never uploaded, and the ownership check is made against the
-- observation the evidence belongs to.
--
-- The path convention is `<observation id>/<file name>`, so the object
-- belongs to exactly one observation and the storage policy above can prove
-- it from the path alone.
create or replace function public.agent_evidence_url(
  p_evidence_id bigint
)
returns text
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_evidence public.price_observation_evidence;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_evidence
  from public.price_observation_evidence
  where id = p_evidence_id;

  if not found then
    raise exception 'That evidence does not exist.' using errcode = 'no_data_found';
  end if;

  if not public.is_staff() then
    if not exists (
      select 1 from public.price_observations
      where id = v_evidence.observation_id and agent_user_id = auth.uid()
    ) then
      raise exception 'That evidence does not belong to you.' using errcode = 'insufficient_privilege';
    end if;
  end if;

  return storage.create_signed_url('hatsi360-evidence', v_evidence.storage_path, 300);
end;
$$;

grant execute on function public.agent_evidence_url(bigint) to authenticated;

-- ------------------------------------------------------- agent correction --

-- Narrow the agent's update policy.
--
-- Before this change an agent could edit a record that was already sitting in
-- the review queue. The brief requires that an agent never silently edits a
-- submitted record and that a correction preserves the previous values, so
-- the policy is narrowed to the two states where editing is legitimate:
-- a draft the agent owns, and a record a reviewer has asked to be corrected.
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
    and verification_status in ('draft', 'pending_verification', 'correction_requested')
    and is_current
  );

--
-- Resubmit a corrected observation.
--
-- The agent's answer to a correction request. The record that was reviewed is
-- preserved: the correction is written to `price_revision_history` with the
-- before and after values, the observation is marked as no longer current,
-- and a new observation supersedes it. Nothing is overwritten.
--
create or replace function public.resubmit_observation(
  p_observation_id uuid,
  p_payload        jsonb,
  p_reason         text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent       uuid := auth.uid();
  v_existing    public.price_observations;
  v_new_id      uuid;
  v_revision    integer;
  v_amount      numeric;
  v_unit        bigint;
  v_price_type  public.price_type;
  v_grade       bigint;
  v_collected   timestamptz;
  v_before      jsonb;
begin
  if v_agent is null then
    raise exception 'You must be signed in to correct a price.' using errcode = 'insufficient_privilege';
  end if;

  if not public.is_active_account() then
    raise exception 'This account is not active.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_existing
  from public.price_observations
  where id = p_observation_id and is_current;

  if not found then
    raise exception 'That observation does not exist.' using errcode = 'no_data_found';
  end if;

  if v_existing.agent_user_id is distinct from v_agent and not public.is_staff() then
    raise exception 'That observation does not belong to you.' using errcode = 'insufficient_privilege';
  end if;

  if v_existing.verification_status <> 'correction_requested' then
    raise exception 'That observation is not awaiting a correction.' using errcode = 'invalid_parameter_value';
  end if;

  v_amount := nullif(p_payload ->> 'reported_amount', '')::numeric;
  v_unit := nullif(p_payload ->> 'reported_unit_id', '')::bigint;
  v_grade := nullif(p_payload ->> 'grade_id', '')::bigint;
  v_price_type := coalesce(nullif(p_payload ->> 'price_type', '')::public.price_type, v_existing.price_type);
  v_collected := coalesce(nullif(p_payload ->> 'collected_at', '')::timestamptz, v_existing.collected_at);

  if v_amount is null or v_amount <= 0 then
    raise exception 'Enter the price you collected.' using errcode = 'invalid_parameter_value';
  end if;

  if v_unit is null then
    raise exception 'A measurement unit is required.' using errcode = 'invalid_parameter_value';
  end if;

  -- The snapshot of what was reviewed, kept before anything changes.
  v_before := jsonb_build_object(
    'reported_amount', v_existing.reported_amount,
    'reported_unit_id', v_existing.reported_unit_id,
    'grade_id', v_existing.grade_id,
    'price_type', v_existing.price_type,
    'package_weight_kg', v_existing.package_weight_kg,
    'package_count', v_existing.package_count,
    'collected_at', v_existing.collected_at,
    'notes', v_existing.notes
  );

  select coalesce(max(revision_number), 0) + 1
    into v_revision
  from public.price_revision_history
  where observation_id = p_observation_id;

  insert into public.price_revision_history (
    observation_id, revision_number, changed_by, change_reason, before_data, after_data
  )
  values (
    p_observation_id,
    v_revision,
    v_agent,
    coalesce(nullif(p_reason, ''), 'Agent correction'),
    v_before,
    jsonb_build_object(
      'reported_amount', v_amount,
      'reported_unit_id', v_unit,
      'grade_id', v_grade,
      'price_type', v_price_type,
      'collected_at', v_collected,
      'notes', p_payload ->> 'notes'
    )
  );

  -- The reviewed record stops being the current one. It is not deleted and
  -- its values are not changed.
  update public.price_observations
     set is_current = false,
         updated_at = now()
   where id = p_observation_id;

  insert into public.price_observations (
    commodity_id, market_id, variety_id, grade_id, price_type,
    reported_amount, reported_unit_id, package_weight_kg, package_count,
    currency_code, collected_at, collected_at_precision, submitted_at,
    agent_user_id, verification_status, notes, source_system, source_reference,
    supersedes_id, is_current
  )
  select
    v_existing.commodity_id, v_existing.market_id,
    coalesce(nullif(p_payload ->> 'variety_id', '')::bigint, v_existing.variety_id),
    coalesce(v_grade, v_existing.grade_id),
    v_price_type,
    v_amount,
    v_unit,
    coalesce(nullif(p_payload ->> 'package_weight_kg', '')::numeric, v_existing.package_weight_kg),
    coalesce(nullif(p_payload ->> 'package_count', '')::integer, v_existing.package_count),
    v_existing.currency_code,
    v_collected,
    v_existing.collected_at_precision,
    now(),
    v_agent,
    'pending_verification',
    coalesce(p_payload ->> 'notes', v_existing.notes),
    v_existing.source_system,
    v_existing.source_reference,
    p_observation_id,
    true
  returning id into v_new_id;

  -- The evidence travels with the correction.
  update public.price_observation_evidence
     set observation_id = v_new_id
   where observation_id = p_observation_id;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role, reason)
  values (v_new_id, 'submitted', v_agent, public.current_role(), p_reason);

  perform public.write_audit(
    'observation.corrected', 'price_observation', v_new_id::text,
    v_before,
    jsonb_build_object('reported_amount', v_amount, 'reported_unit_id', v_unit, 'grade_id', v_grade),
    p_reason
  );

  -- Tell the reviewer queue that a correction came back.
  if exists (select 1 from public.profiles where id = v_existing.verified_by) then
    perform public.notify(
      v_existing.verified_by, 'submission_received',
      'A corrected price was resubmitted',
      format('Correction reference %s', left(v_new_id::text, 8)),
      'price_observation', v_new_id::text,
      '/admin/verification', 'normal'
    );
  end if;

  return v_new_id;
end;
$$;

grant execute on function public.resubmit_observation(uuid, jsonb, text) to authenticated;

-- ------------------------------------------------- assignment notifications --

-- An agent must be told when their coverage changes. The notification kinds
-- already exist; nothing was raising them.
create or replace function public.notify_assignment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market text;
begin
  select name into v_market from public.markets where id = new.market_id;

  if tg_op = 'INSERT' then
    perform public.notify(
      new.user_id, 'assignment_changed',
      'You have been assigned to a market',
      format('%s is now in your coverage.', coalesce(v_market, 'A market')),
      'market', new.market_id::text,
      '/agent/markets', 'normal'
    );
  elsif new.status = 'active' and old.status is distinct from 'active' then
    perform public.notify(
      new.user_id, 'assignment_changed',
      'Your assignment was reactivated',
      format('%s is active again.', coalesce(v_market, 'A market')),
      'market', new.market_id::text,
      '/agent/markets', 'normal'
    );
  elsif old.status = 'active' and new.status is distinct from 'active' then
    perform public.notify(
      new.user_id, 'market_unassigned',
      'Your assignment was changed',
      format('%s is no longer in your coverage (%s).', coalesce(v_market, 'A market'), new.status),
      'market', new.market_id::text,
      '/agent/markets', 'high'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists market_agent_assignments_notify on public.market_agent_assignments;
create trigger market_agent_assignments_notify
  after insert or update of status on public.market_agent_assignments
  for each row execute function public.notify_assignment_change();

-- ------------------------------------------------------------------ indexes --

-- The agent's hot paths: my observations newest first, my tasks by due date,
-- my notifications newest first, and the evidence attached to an observation.
create index if not exists price_observations_agent_collected_idx
  on public.price_observations (agent_user_id, collected_at desc);

create index if not exists collection_tasks_assignee_due_idx
  on public.collection_tasks (assigned_to, due_on);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists price_observation_evidence_observation_idx
  on public.price_observation_evidence (observation_id);

create index if not exists collection_batches_agent_started_idx
  on public.collection_batches (agent_user_id, started_at desc);
