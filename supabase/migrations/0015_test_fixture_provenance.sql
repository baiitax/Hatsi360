-- =============================================================================
-- 0015_test_fixture_provenance.sql
--
-- The permission suites create synthetic price observations. Two rules make
-- them safe:
--
--   1. Every fixture carries the dedicated source value 'test_fixture' (added
--      in migration 0014), so a row that outlives its test is always
--      identifiable as a fixture and can never be confused with a collected
--      price.
--   2. The public read policy refuses a test fixture outright. Even if a
--      fixture was published by mistake, it could not reach a visitor.
--
-- The staff read policy is deliberately unchanged: a reviewer must be able to
-- see everything in the table, including the fixtures.
-- =============================================================================

begin;

-- --------------------------------------------------- the public predicate --
-- The five-argument form refuses a test fixture even when it has been
-- published and marked current. The three-argument form is kept for callers
-- that have no source to check.
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

create or replace function public.is_public_observation(
  p_status public.verification_status,
  p_published_at timestamptz,
  p_is_current boolean,
  p_source public.observation_source,
  p_source_reference text
)
returns boolean
language sql
immutable
as $$
  select p_is_current
     and p_published_at is not null
     and p_status in ('verified','legacy_unverified')
     and coalesce(p_source, 'agent_app'::public.observation_source) <> 'test_fixture'
     and coalesce(p_source_reference, '') <> 'test_fixture';
$$;

-- ------------------------------------------------------- the public reads --
drop policy if exists price_observations_public_read on public.price_observations;
create policy price_observations_public_read on public.price_observations
  for select to anon, authenticated
  using (public.is_public_observation(
           verification_status, published_at, is_current, source_system, source_reference));

drop policy if exists evidence_public_read on public.price_observation_evidence;
create policy evidence_public_read on public.price_observation_evidence
  for select to anon, authenticated
  using (exists (
    select 1 from public.price_observations o
    where o.id = price_observation_evidence.observation_id
      and public.is_public_observation(
            o.verification_status, o.published_at, o.is_current,
            o.source_system, o.source_reference)
  ));

-- The published view is `security_invoker`, so the policy above already
-- applies to it. The view is replaced anyway so that the exclusion is
-- visible where a reader looks for it.
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
  and o.verification_status in ('verified', 'legacy_unverified')
  and coalesce(o.source_system, 'agent_app'::public.observation_source) <> 'test_fixture'
  and coalesce(o.source_reference, '') <> 'test_fixture';

grant select on public.published_price_observations to anon, authenticated;

commit;
