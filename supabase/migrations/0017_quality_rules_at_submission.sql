-- =============================================================================
-- Hatsi360 — 0017 quality findings at submission
-- =============================================================================
-- The nine data-quality rules are defined once, in the application layer
-- (`src/lib/quality/rules.ts`), and they are unit-tested there. This migration
-- gives them somewhere to live: the function below records the findings the
-- application computed against a freshly submitted observation, so the Control
-- Centre's quality screen shows them and the verification queue can see them
-- before a human opens the record.
--
-- Design notes
--   * The rule definitions are NOT duplicated here. This function stores what
--     the application evaluated; it does not re-evaluate. Duplicating the
--     rules would let the two copies drift apart, and the tests would then be
--     testing the wrong implementation.
--   * The function is callable by the agent who submitted the observation, or
--     by staff. An agent can annotate their own submission and nothing else.
--   * A finding never blocks a submission and never deletes anything. A flag
--     is a review marker. Approval and publication remain separate acts.
--   * Recording the same rule twice for the same observation is a no-op, so a
--     retried submission does not flood the quality screen.
-- =============================================================================

-- The findings recorded against one observation.
create table if not exists public.observation_quality_findings (
  id              bigint generated always as identity primary key,
  observation_id  uuid not null references public.price_observations (id) on delete cascade,
  rule_code       text not null,
  rule_version    integer not null default 1,
  severity        text not null check (severity in ('info','warning','review','blocking')),
  message         text not null,
  evidence        jsonb not null default '{}'::jsonb,
  evaluated_at    timestamptz not null default now(),
  unique (observation_id, rule_code, rule_version)
);

create index if not exists observation_quality_findings_observation_idx
  on public.observation_quality_findings (observation_id);

comment on table public.observation_quality_findings is
  'Findings produced by the quality rule engine at submission. The rule definitions live in the application layer; this table stores their output.';

-- ------------------------------------------------------ recording findings --

-- Record the findings the application computed for one observation.
--
-- `p_findings` is a JSON array of objects with the shape:
--   { "ruleCode": "...", "ruleVersion": 1, "severity": "warning",
--     "message": "...", "evidence": { ... } }
create or replace function public.apply_observation_findings(
  p_observation_id uuid,
  p_findings       jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent        uuid := auth.uid();
  v_owner        uuid;
  v_status       public.verification_status;
  v_inserted     integer := 0;
  v_finding      jsonb;
  v_rule_code    text;
  v_rule_version integer;
  v_severity     text;
  v_message      text;
  v_evidence     jsonb;
begin
  if v_agent is null then
    raise exception 'You must be signed in.' using errcode = 'insufficient_privilege';
  end if;

  if p_findings is null or jsonb_typeof(p_findings) <> 'array' then
    raise exception 'Findings must be a JSON array.' using errcode = 'invalid_parameter_value';
  end if;

  select agent_user_id, verification_status
    into v_owner, v_status
  from public.price_observations
  where id = p_observation_id;

  if not found then
    raise exception 'Observation % not found.', p_observation_id using errcode = 'no_data_found';
  end if;

  -- The agent who submitted it, or any member of staff.
  if v_owner is distinct from v_agent and not public.is_staff() then
    raise exception 'You can only record findings on your own submissions.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Findings are only meaningful before the record is approved. Once a
  -- reviewer has signed it off, the finding set is part of the signed record.
  if v_status in ('approved', 'published', 'rejected', 'superseded') and not public.is_staff() then
    raise exception 'This observation has already been reviewed.'
      using errcode = 'insufficient_privilege';
  end if;

  for v_finding in select value from jsonb_array_elements(p_findings)
  loop
    v_rule_code    := v_finding ->> 'ruleCode';
    v_rule_version := coalesce((v_finding ->> 'ruleVersion')::integer, 1);
    v_severity     := coalesce(v_finding ->> 'severity', 'warning');
    v_message      := coalesce(v_finding ->> 'message', '');
    v_evidence     := coalesce(v_finding -> 'evidence', '{}'::jsonb);

    if v_rule_code is null or v_message = '' then
      continue;
    end if;

    if v_severity not in ('info', 'warning', 'review', 'blocking') then
      v_severity := 'warning';
    end if;

    insert into public.observation_quality_findings (
      observation_id, rule_code, rule_version, severity, message, evidence
    )
    values (
      p_observation_id, v_rule_code, v_rule_version, v_severity, v_message, v_evidence
    )
    on conflict (observation_id, rule_code, rule_version) do update
      set message = excluded.message,
          evidence = excluded.evidence,
          severity = excluded.severity,
          evaluated_at = now();

    v_inserted := v_inserted + 1;

    -- A finding that a reviewer must look at also raises a flag on the
    -- quality screen. Informational findings do not: they would drown the
    -- screen in noise.
    if v_severity <> 'info' then
      insert into public.data_quality_flags (observation_id, flag, detail, severity, raised_by)
      values (
        p_observation_id,
        case
          when v_rule_code = 'duplicate_suspected' then 'duplicate_suspected'::public.quality_flag_code
          when v_rule_code = 'unrecognised_unit' then 'unit_conversion_unverified'::public.quality_flag_code
          when v_rule_code = 'missing_evidence' then 'missing_evidence'::public.quality_flag_code
          when v_rule_code = 'stale_observation' then 'stale'::public.quality_flag_code
          when v_rule_code = 'collection_timestamp_out_of_range' then 'timestamp_inconsistent'::public.quality_flag_code
          else 'price_outlier'::public.quality_flag_code
        end,
        v_message,
        case when v_severity = 'blocking' then 'critical' else 'warning' end,
        v_agent
      );
    end if;
  end loop;

  -- Keep the denormalised flag column on the observation in step, so the
  -- observation list can filter on it without a join.
  update public.price_observations o
     set quality_flags = (
       select coalesce(array_agg(distinct f.flag order by f.flag), '{}'::public.quality_flag_code[])
         from public.data_quality_flags f
        where f.observation_id = o.id
          and f.resolved_at is null
     )
   where o.id = p_observation_id;

  return v_inserted;
end;
$$;

comment on function public.apply_observation_findings(uuid, jsonb) is
  'Record the quality findings the application computed for an observation. Callable by the submitting agent or by staff.';

-- ------------------------------------------------------- reading findings ---

-- The findings for one observation.
create or replace function public.observation_findings(p_observation_id uuid)
returns table (
  rule_code    text,
  rule_version integer,
  severity     text,
  message      text,
  evidence     jsonb,
  evaluated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.rule_code, f.rule_version, f.severity, f.message, f.evidence, f.evaluated_at
  from public.observation_quality_findings f
  where f.observation_id = p_observation_id
    and (
      public.is_staff()
      or exists (
        select 1 from public.price_observations o
        where o.id = f.observation_id and o.agent_user_id = auth.uid()
      )
    )
  order by f.evaluated_at desc;
$$;

-- ------------------------------------------------------------------- RLS ----

alter table public.observation_quality_findings enable row level security;

-- The agent who submitted it, or staff.
drop policy if exists observation_findings_owner_read on public.observation_quality_findings;
create policy observation_findings_owner_read on public.observation_quality_findings
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.price_observations o
      where o.id = observation_quality_findings.observation_id
        and o.agent_user_id = auth.uid()
    )
  );

-- Findings are written through the function only. There is no direct insert
-- path, so an agent cannot manufacture a finding against someone else's
-- record and cannot delete one.
drop policy if exists observation_findings_no_direct_write on public.observation_quality_findings;
create policy observation_findings_no_direct_write on public.observation_quality_findings
  for insert to authenticated
  with check (false);

drop policy if exists observation_findings_no_direct_update on public.observation_quality_findings;
create policy observation_findings_no_direct_update on public.observation_quality_findings
  for update to authenticated
  using (false)
  with check (false);

drop policy if exists observation_findings_no_direct_delete on public.observation_quality_findings;
create policy observation_findings_no_direct_delete on public.observation_quality_findings
  for delete to authenticated
  using (false);

-- ----------------------------------------------------------------- grants --

grant execute on function public.apply_observation_findings(uuid, jsonb) to authenticated;
grant execute on function public.observation_findings(uuid) to authenticated;
