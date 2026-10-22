-- =============================================================================
-- Pluck Live — 0006 publication integrity, correction workflow and public views
-- =============================================================================
-- Two rules are enforced here at the database level, where a client cannot
-- bypass them:
--
--   1. A published observation's economic values (amount, unit, commodity,
--      market, price type, collection time) can never be changed in place.
--      Corrections are append-only: a new row supersedes the old one, and the
--      original stays in the audit trail.
--
--   2. Every consequential action writes an audit record.
-- =============================================================================

-- ----------------------------------------------------- published immutability
create or replace function public.prevent_published_economic_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.published_at is null then
    return new;
  end if;

  if old.reported_amount       is distinct from new.reported_amount
     or old.normalized_amount    is distinct from new.normalized_amount
     or old.reported_unit_id     is distinct from new.reported_unit_id
     or old.normalized_unit_id   is distinct from new.normalized_unit_id
     or old.package_weight_kg    is distinct from new.package_weight_kg
     or old.price_type           is distinct from new.price_type
     or old.commodity_id         is distinct from new.commodity_id
     or old.market_id            is distinct from new.market_id
     or old.grade_id             is distinct from new.grade_id
     or old.variety_id           is distinct from new.variety_id
     or old.collected_at         is distinct from new.collected_at
     or old.currency_code        is distinct from new.currency_code
  then
    raise exception
      'Published observation % cannot be modified in place. Use public.append_correction() to publish a corrected observation.', old.id
      using errcode = 'restrict_violation';
  end if;

  -- Removing a published price is allowed, but only by an administrator.
  if old.published_at is not null and new.published_at is null and not public.is_admin() then
    raise exception
      'Only an administrator can unpublish a price observation (id %).', old.id
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists price_observations_prevent_published_mutation on public.price_observations;
create trigger price_observations_prevent_published_mutation
  before update on public.price_observations
  for each row execute function public.prevent_published_economic_mutation();

-- ------------------------------------------------------------ audit trail ---
create or replace function public.audit_observation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.verification_status is distinct from new.verification_status
       or old.published_at is distinct from new.published_at
       or old.is_current is distinct from new.is_current
    then
      insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data)
      values (
        auth.uid(),
        public.current_role(),
        'observation_status_change',
        'price_observation',
        new.id::text,
        jsonb_build_object(
          'verification_status', old.verification_status,
          'published_at', old.published_at,
          'is_current', old.is_current
        ),
        jsonb_build_object(
          'verification_status', new.verification_status,
          'published_at', new.published_at,
          'is_current', new.is_current
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists price_observations_audit_change on public.price_observations;
create trigger price_observations_audit_change
  after update on public.price_observations
  for each row execute function public.audit_observation_change();

-- --------------------------------------------- correction workflow (RPC) -----
-- `superseded_by` points at the corrected row that replaced this one.
alter table public.price_observations
  drop constraint if exists price_observations_superseded_by_fk;
alter table public.price_observations
  add column if not exists superseded_by uuid references public.price_observations (id) on delete set null;

-- Append a corrected observation that supersedes a published one.
--
-- The original row is retained (is_current = false) so its history stays
-- visible in the audit trail. It simply stops being included in published
-- aggregates, because the views filter on is_current.
create or replace function public.append_correction(
  p_observation_id uuid,
  p_correction jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old public.price_observations;
  v_new_id uuid;
  v_next integer;
begin
  if not public.is_staff() then
    raise exception 'Only verification staff may publish a correction.' using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A correction reason is required.' using errcode = 'invalid_parameter_value';
  end if;

  select * into v_old from public.price_observations where id = p_observation_id for update;
  if not found then
    raise exception 'Observation % not found.', p_observation_id using errcode = 'no_data_found';
  end if;
  if not v_old.is_current then
    raise exception 'Observation % has already been superseded.', p_observation_id using errcode = 'invalid_parameter_value';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_next
  from public.price_revision_history where observation_id = p_observation_id;

  insert into public.price_observations (
    commodity_id, market_id, variety_id, grade_id, price_type,
    reported_amount, reported_unit_id, package_weight_kg, package_count,
    normalized_amount, normalized_unit_id, currency_code,
    collected_at, collected_at_precision, submitted_at, verified_at, published_at,
    agent_user_id, verified_by, verification_status, notes,
    source_system, source_reference, supersedes_id, is_current
  )
  values (
    (p_correction ->> 'commodity_id')::bigint,
    (p_correction ->> 'market_id')::bigint,
    nullif(p_correction ->> 'variety_id', '')::bigint,
    nullif(p_correction ->> 'grade_id', '')::bigint,
    coalesce((p_correction ->> 'price_type')::public.price_type, v_old.price_type),
    nullif(p_correction ->> 'reported_amount', '')::numeric,
    nullif(p_correction ->> 'reported_unit_id', '')::bigint,
    nullif(p_correction ->> 'package_weight_kg', '')::numeric,
    nullif(p_correction ->> 'package_count', '')::integer,
    nullif(p_correction ->> 'normalized_amount', '')::numeric,
    nullif(p_correction ->> 'normalized_unit_id', '')::bigint,
    coalesce(p_correction ->> 'currency_code', v_old.currency_code),
    coalesce((p_correction ->> 'collected_at')::timestamptz, v_old.collected_at),
    coalesce((p_correction ->> 'collected_at_precision')::public.timestamp_precision, v_old.collected_at_precision),
    now(),
    now(),
    now(),
    v_old.agent_user_id,
    auth.uid(),
    'verified',
    p_correction ->> 'notes',
    v_old.source_system,
    p_correction ->> 'source_reference',
    v_old.id,
    true
  )
  returning id into v_new_id;

  update public.price_observations
     set is_current = false,
         superseded_by = v_new_id
   where id = v_old.id;

  insert into public.price_revision_history (
    observation_id, revision_number, changed_by, change_reason, before_data, after_data
  )
  values (
    v_old.id, v_next, auth.uid(), p_reason,
    to_jsonb(v_old) - 'superseded_by',
    p_correction
  );

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role, reason)
  values (v_new_id, 'republished', auth.uid(), public.current_role(), p_reason);

  return v_new_id;
end;
$$;

grant execute on function public.append_correction(uuid, jsonb, text) to authenticated;

-- ------------------------------------------------------ publish / unpublish --
create or replace function public.publish_observation(p_observation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Only verification staff may publish prices.' using errcode = 'insufficient_privilege';
  end if;

  update public.price_observations
     set verification_status = 'verified',
         verified_at = now(),
         verified_by = auth.uid(),
         published_at = now()
   where id = p_observation_id
     and verification_status in ('pending_verification','draft','legacy_unverified');

  if not found then
    raise exception 'Observation % is not in a publishable state.', p_observation_id using errcode = 'invalid_parameter_value';
  end if;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role)
  values (p_observation_id, 'published', auth.uid(), public.current_role());
end;
$$;

grant execute on function public.publish_observation(uuid) to authenticated;

create or replace function public.reject_observation(p_observation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Only verification staff may reject observations.' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(trim(p_reason)) < 5 then
    raise exception 'A rejection reason is required.' using errcode = 'invalid_parameter_value';
  end if;

  update public.price_observations
     set verification_status = 'rejected',
         verified_at = now(),
         verified_by = auth.uid(),
         rejected_at = now(),
         published_at = null
   where id = p_observation_id;

  insert into public.price_verification_events (observation_id, action, actor_id, actor_role, reason)
  values (p_observation_id, 'rejected', auth.uid(), public.current_role(), p_reason);
end;
$$;

grant execute on function public.reject_observation(uuid, text) to authenticated;

-- ------------------------------------------------------------- public views --
-- security_invoker = true makes PostgreSQL apply the querying user's RLS
-- policies to these views. Without it the views would run with the owner's
-- privileges and silently bypass RLS.
create or replace view public.published_price_observations
with (security_invoker = true)
as
select
  o.id,
  o.commodity_id,
  o.market_id,
  o.variety_id,
  o.grade_id,
  o.price_type,
  o.reported_amount,
  o.reported_unit_id,
  o.package_weight_kg,
  o.normalized_amount,
  o.normalized_unit_id,
  o.currency_code,
  o.collected_at,
  o.collected_at_precision,
  o.submitted_at,
  o.verified_at,
  o.published_at,
  o.agent_user_id,
  o.verified_by,
  o.verification_status,
  o.notes,
  o.source_system,
  o.source_reference,
  o.created_at,
  -- Denormalised reference data for display and filtering.
  c.name  as commodity_name,
  c.slug  as commodity_slug,
  c.category_id,
  cc.name as category_name,
  cc.slug as category_slug,
  m.name  as market_name,
  m.slug  as market_slug,
  s.id    as state_id,
  s.name  as state_name,
  s.slug  as state_slug,
  co.code as country_code,
  g.name  as grade_name,
  v.name  as variety_name,
  u.code  as unit_code,
  u.name  as unit_name,
  u.dimension as unit_dimension,
  u.is_specific as unit_is_specific,
  coalesce(o.normalized_amount, o.reported_amount) as display_amount,
  coalesce(o.normalized_unit_id, o.reported_unit_id) as display_unit_id,
  c.freshness_window_hours
from public.price_observations o
join public.commodities c on c.id = o.commodity_id
join public.commodity_categories cc on cc.id = c.category_id
join public.markets m on m.id = o.market_id
join public.states s on s.id = m.state_id
join public.countries co on co.id = s.country_id
left join public.commodity_grades g on g.id = o.grade_id
left join public.commodity_varieties v on v.id = o.variety_id
left join public.measurement_units u
  on u.id = coalesce(o.normalized_unit_id, o.reported_unit_id)
where o.is_current
  and o.published_at is not null
  and o.verification_status in ('verified', 'legacy_unverified');

grant select on public.published_price_observations to anon, authenticated;

-- R1: the published summary is the median of the underlying observations,
-- rounded to 2 decimal places, and always reports its count and window.
create or replace view public.market_price_summary
with (security_invoker = true)
as
select
  commodity_id,
  market_id,
  price_type,
  grade_id,
  variety_id,
  display_unit_id,
  round((percentile_cont(0.5) within group (order by display_amount))::numeric, 2) as median_amount,
  round(min(display_amount)::numeric, 2) as min_amount,
  round(max(display_amount)::numeric, 2) as max_amount,
  count(*)::integer as observation_count,
  min(collected_at) as window_start,
  max(collected_at) as window_end,
  max(collected_at) as latest_collected_at,
  max(verified_at) as latest_verified_at,
  max(freshness_window_hours)::integer as freshness_window_hours
from public.published_price_observations
group by commodity_id, market_id, price_type, grade_id, variety_id, display_unit_id;

grant select on public.market_price_summary to anon, authenticated;

-- --------------------------------------------------- profile auto-creation --
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'phone',
    'public_user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
