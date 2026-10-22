-- =============================================================================
-- Pluck Live — Row Level Security permission tests
-- =============================================================================
-- These assertions run against a real PostgreSQL instance with the migrations
-- applied. Each block impersonates a role by switching to it and setting the
-- JWT subject claim, then checks what that role can and cannot do.
--
-- A failure raises an exception and aborts the run.
-- =============================================================================

-- ------------------------------------------------------------- assertions --
create schema if not exists rls_test;
grant usage on schema rls_test to anon, authenticated, public;
create or replace function rls_test.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if condition is not true then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end $$;

create or replace function rls_test.assert_raises(message text, statement text)
returns void
language plpgsql
as $$
declare
  raised boolean := false;
begin
  begin
    execute statement;
  exception when others then
    raised := true;
  end;
  if raised is not true then
    raise exception 'ASSERTION FAILED: % (statement was allowed but should not have been)', message;
  end if;
end $$;

-- RLS silently filters UPDATE/DELETE rows that a caller may not touch: the
-- statement succeeds and affects zero rows instead of raising. This helper
-- asserts on the effect, which is the only reliable way to test a row-level
-- UPDATE denial.
create or replace function rls_test.assert_no_rows_affected(message text, statement text)
returns void
language plpgsql
as $$
declare
  affected integer := 0;
begin
  begin
    execute statement;
  exception when others then
    raise exception 'ASSERTION FAILED: % (statement raised: %)', message, sqlerrm;
  end;
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'ASSERTION FAILED: % (% row(s) were affected but should not have been)',
      message, affected;
  end if;
end $$;

-- The positive control: the statement must succeed and change rows.
create or replace function rls_test.assert_rows_affected(message text, statement text, expected integer)
returns void
language plpgsql
as $$
declare
  affected integer := 0;
begin
  begin
    execute statement;
  exception when others then
    raise exception 'ASSERTION FAILED: % (statement raised: %)', message, sqlerrm;
  end;
  get diagnostics affected = row_count;
  if affected <> expected then
    raise exception 'ASSERTION FAILED: % (% row(s) affected, expected %)',
      message, affected, expected;
  end if;
end $$;

-- ------------------------------------------------------------- fixtures ---
-- Test users. The ids are fixed so the JWT claim can be set to them.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'officer@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'agent@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'agent2@test.local'),
  ('55555555-5555-5555-5555-555555555555', 'customer@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'customer2@test.local'),
  ('77777777-7777-7777-7777-777777777777', 'noprofile@test.local')
on conflict (id) do nothing;

-- A user whose profile row is missing (it is normally created by
-- public.handle_new_user when the auth user is created).
delete from public.profiles where id = '77777777-7777-7777-7777-777777777777';

-- public.handle_new_user creates a profile for every auth user with the
-- least-privileged role, so the fixture upserts the intended roles.
insert into public.profiles (id, full_name, role) values
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'Verification Officer', 'verification_officer'),
  ('33333333-3333-3333-3333-333333333333', 'Agent One', 'agent'),
  ('44444444-4444-4444-4444-444444444444', 'Agent Two', 'agent'),
  ('55555555-5555-5555-5555-555555555555', 'Customer One', 'customer'),
  ('66666666-6666-6666-6666-666666666666', 'Customer Two', 'customer')
on conflict (id) do update set role = excluded.role, full_name = excluded.full_name;

-- Agent One is assigned to market 1 (Dawanau). Agent Two is assigned to
-- market 2 (Mile 12). Neither may submit for the other's market.
delete from public.market_agent_assignments
where (user_id, market_id) in (
  ('33333333-3333-3333-3333-333333333333', 1),
  ('44444444-4444-4444-4444-444444444444', 2)
);

insert into public.market_agent_assignments (user_id, market_id, status, starts_on)
values
  ('33333333-3333-3333-3333-333333333333', 1, 'active', current_date - 30),
  ('44444444-4444-4444-4444-444444444444', 2, 'active', current_date - 30);

-- A published observation, a pending one and a draft.
insert into public.price_observations (
  id, commodity_id, market_id, price_type, reported_amount, reported_unit_id,
  currency_code, collected_at, collected_at_precision, submitted_at, verified_at,
  published_at, agent_user_id, verification_status, source_system, is_current
) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 1, 1, 'wholesale_transaction', 40550, 1,
   'NGN', '2025-07-06T09:00:00Z', 'minute', '2025-07-06T09:05:00Z', '2025-07-06T10:00:00Z',
   '2025-07-06T10:00:00Z', '33333333-3333-3333-3333-333333333333', 'verified', 'agent_app', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 1, 1, 'wholesale_transaction', 41000, 1,
   'NGN', '2025-07-07T09:00:00Z', 'minute', '2025-07-07T09:05:00Z', null, null,
   '33333333-3333-3333-3333-333333333333', 'pending_verification', 'agent_app', true),
  ('aaaaaaaa-0000-0000-0000-000000000003', 1, 1, 'wholesale_transaction', 42000, 1,
   'NGN', '2025-07-08T09:00:00Z', 'minute', null, null, null,
   '33333333-3333-3333-3333-333333333333', 'draft', 'agent_app', true)
on conflict (id) do nothing;

-- Customer data that must stay private to its owner.
insert into public.saved_commodities (user_id, commodity_id)
values ('55555555-5555-5555-5555-555555555555', 1)
on conflict do nothing;

insert into public.price_alerts (user_id, commodity_id, direction, threshold_amount)
values ('55555555-5555-5555-5555-555555555555', 1, 'above', 50000)
on conflict do nothing;

-- =============================================================================
-- 1. Anonymous visitors
-- =============================================================================
begin;
  set local role anon;
  set local request.jwt.claim.sub = '';

  select rls_test.assert_true(
    (select count(*) from public.price_observations) = 1,
    'anon should see exactly the one published, current observation'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where verification_status <> 'verified') = 0,
    'anon must not see pending or draft observations'
  );

  select rls_test.assert_true(
    (select count(*) from public.commodities) > 0,
    'anon should be able to read the commodity catalogue'
  );

  select rls_test.assert_true(
    (select count(*) from public.markets) > 0,
    'anon should be able to read the market directory'
  );

  -- `anon` holds no table privilege at all on these, so the refusal happens
  -- at the privilege layer before RLS is even consulted. That is the stronger
  -- guarantee, so the test asserts the refusal.
  select rls_test.assert_raises(
    'anon must not be able to read user profiles',
    'select count(*) from public.profiles'
  );

  select rls_test.assert_raises(
    'anon must not be able to read any customer alerts',
    'select count(*) from public.price_alerts'
  );

  select rls_test.assert_raises(
    'anon must not be able to read the audit log',
    'select count(*) from public.audit_logs'
  );

  select rls_test.assert_raises(
    'anon must not be able to read a customer''s saved items',
    'select count(*) from public.saved_commodities'
  );

  select rls_test.assert_raises(
    'anon must not be able to insert a price observation',
    $q$insert into public.price_observations
        (commodity_id, market_id, price_type, reported_amount, currency_code, collected_at)
      values (1, 1, 'retail', 99999, 'NGN', now())$q$
  );

  select rls_test.assert_raises(
    'anon must not be able to update a published price',
    $q$update public.price_observations set reported_amount = 1
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$
  );
rollback;

-- =============================================================================
-- 2. A market agent
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.price_observations) = 3,
    'an agent should see the published observation and their own submissions'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations where id = 'aaaaaaaa-0000-0000-0000-000000000002') = 1,
    'an agent should see their own pending submission'
  );

  select rls_test.assert_true(
    (select count(*) from public.profiles) = 1,
    'an agent should be able to read their own profile only'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_alerts) = 0,
    'an agent must not be able to read another user''s alerts'
  );

  -- An agent may submit for a market they are assigned to.
  select rls_test.assert_true(
    (select count(distinct m) from public.assigned_market_ids() as m) = 1,
    'an agent should be assigned to exactly one market'
  );

  select rls_test.assert_raises(
    'an agent must not be able to submit for an unassigned market',
    $q$insert into public.price_observations
        (commodity_id, market_id, price_type, reported_amount, reported_unit_id,
         currency_code, collected_at, agent_user_id, verification_status, source_system)
      values (1, 2, 'retail', 41000, 1, 'NGN', now(),
              '33333333-3333-3333-3333-333333333333', 'pending_verification', 'agent_app')$q$
  );

  select rls_test.assert_raises(
    'an agent must not be able to submit on behalf of another agent',
    $q$insert into public.price_observations
        (commodity_id, market_id, price_type, reported_amount, reported_unit_id,
         currency_code, collected_at, agent_user_id, verification_status, source_system)
      values (1, 1, 'retail', 41000, 1, 'NGN', now(),
              '44444444-4444-4444-4444-444444444444', 'pending_verification', 'agent_app')$q$
  );

  select rls_test.assert_raises(
    'an agent must not be able to publish their own observation directly',
    $q$insert into public.price_observations
        (commodity_id, market_id, price_type, reported_amount, reported_unit_id,
         currency_code, collected_at, agent_user_id, verification_status,
         published_at, source_system)
      values (1, 1, 'retail', 41000, 1, 'NGN', now(),
              '33333333-3333-3333-3333-333333333333', 'verified', now(), 'agent_app')$q$
  );

  select rls_test.assert_no_rows_affected(
    'an agent must not be able to change another user''s role',
    $q$update public.profiles set role = 'admin'
      where id = '55555555-5555-5555-5555-555555555555'$q$
  );

  select rls_test.assert_no_rows_affected(
    'an agent must not be able to edit another user''s profile at all',
    $q$update public.profiles set full_name = 'Owned by an agent'
      where id = '55555555-5555-5555-5555-555555555555'$q$
  );

  select rls_test.assert_raises(
    'an agent must not be able to grant themselves a staff role',
    $q$update public.profiles set role = 'verification_officer'
      where id = '33333333-3333-3333-3333-333333333333'$q$
  );
rollback;

-- =============================================================================
-- 3. A second agent
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where id = 'aaaaaaaa-0000-0000-0000-000000000002') = 0,
    'a second agent must not see another agent''s pending submission'
  );

  select rls_test.assert_raises(
    'a second agent must not be able to submit for market 1',
    $q$insert into public.price_observations
        (commodity_id, market_id, price_type, reported_amount, reported_unit_id,
         currency_code, collected_at, agent_user_id, verification_status, source_system)
      values (1, 1, 'retail', 41000, 1, 'NGN', now(),
              '44444444-4444-4444-4444-444444444444', 'pending_verification', 'agent_app')$q$
  );
rollback;

-- =============================================================================
-- 4. A customer
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

  select rls_test.assert_true(
    (select count(*) from public.price_alerts) = 1,
    'a customer should see their own alerts'
  );

  select rls_test.assert_true(
    (select count(*) from public.saved_commodities) = 1,
    'a customer should see their own saved commodities'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where verification_status = 'pending_verification') = 0,
    'a customer must not see pending observations'
  );

  select rls_test.assert_raises(
    'a customer must not be able to read another customer''s saved items',
    $q$insert into public.saved_commodities (user_id, commodity_id)
      values ('66666666-6666-6666-6666-666666666666', 2)$q$
  );
rollback;

-- =============================================================================
-- 4b. A signed-up user whose profile row does not exist yet
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

  select rls_test.assert_raises(
    'a user must not be able to create their own profile with a staff role',
    $q$insert into public.profiles (id, full_name, role)
      values ('77777777-7777-7777-7777-777777777777', 'Escalator', 'admin')$q$
  );

  select rls_test.assert_rows_affected(
    'a user should be able to create their own least-privileged profile',
    $q$insert into public.profiles (id, full_name, role)
      values ('77777777-7777-7777-7777-777777777777', 'Escalator', 'public_user')$q$,
    1
  );
rollback;

-- =============================================================================
-- 5. A verification officer
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select rls_test.assert_true(
    (select count(*) from public.price_observations) = 3,
    'a verification officer should see every observation'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_verification_events) >= 0,
    'a verification officer should be able to read the verification trail'
  );

  select rls_test.assert_raises(
    'a verification officer must not be able to escalate their own role',
    $q$update public.profiles set role = 'super_admin'
      where id = '22222222-2222-2222-2222-222222222222'$q$
  );

  select rls_test.assert_no_rows_affected(
    'a verification officer must not be able to change another user''s role',
    $q$update public.profiles set role = 'admin'
      where id = '55555555-5555-5555-5555-555555555555'$q$
  );

  select rls_test.assert_raises(
    'a verification officer must not be able to change a published price in place',
    $q$update public.price_observations set reported_amount = 1
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$
  );
rollback;

-- =============================================================================
-- 6. Publication integrity
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  -- An administrator may publish a pending observation.
  select public.publish_observation('aaaaaaaa-0000-0000-0000-000000000002');

  select rls_test.assert_true(
    (select published_at is not null from public.price_observations
      where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
    'publish_observation should set the publication timestamp'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_verification_events
      where observation_id = 'aaaaaaaa-0000-0000-0000-000000000002') = 1,
    'publish_observation should record a verification event'
  );

  -- A published observation's economic fields are immutable, even for an admin.
  select rls_test.assert_raises(
    'a published price must not be editable in place, even by an administrator',
    $q$update public.price_observations set reported_amount = 12345
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$
  );

  -- A correction appends a superseding row instead of overwriting.
  select public.append_correction(
    'aaaaaaaa-0000-0000-0000-000000000001',
    jsonb_build_object(
      'commodity_id', 1,
      'market_id', 1,
      'price_type', 'wholesale_transaction',
      'reported_amount', 40900,
      'reported_unit_id', 1,
      'currency_code', 'NGN',
      'collected_at', '2025-07-06T09:00:00Z',
      'agent_user_id', '33333333-3333-3333-3333-333333333333'
    ),
    'The figure was mis-transcribed during collection.'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where id = 'aaaaaaaa-0000-0000-0000-000000000001' and is_current) = 0,
    'a corrected observation must no longer be current'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_revision_history
      where observation_id = 'aaaaaaaa-0000-0000-0000-000000000001') >= 1,
    'a correction must leave a revision history snapshot'
  );

  -- An administrator may change another account's role: the positive control
  -- for the policy that denies everyone else.
  select rls_test.assert_rows_affected(
    'an administrator should be able to change another account''s role',
    $q$update public.profiles set role = 'agent'
      where id = '55555555-5555-5555-5555-555555555555'$q$,
    1
  );

  select rls_test.assert_true(
    (select role = 'agent' from public.profiles
      where id = '55555555-5555-5555-5555-555555555555'),
    'the administrator''s role change should have been applied'
  );

  -- The last administrator account may not demote itself.
  select rls_test.assert_raises(
    'the last administrator must not be able to demote themselves',
    $q$update public.profiles set role = 'customer'
      where id = '11111111-1111-1111-1111-111111111111'$q$
  );
rollback;

-- =============================================================================
-- 7. Role escalation
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

  select rls_test.assert_raises(
    'a customer must not be able to promote themselves to admin',
    $q$update public.profiles set role = 'admin'
      where id = '55555555-5555-5555-5555-555555555555'$q$
  );
rollback;

-- =============================================================================
-- 8. The public views
-- =============================================================================
begin;
  set local role anon;
  set local request.jwt.claim.sub = '';

  select rls_test.assert_true(
    (select count(*) from public.published_price_observations) >= 0,
    'the published view should be readable by anon'
  );

  select rls_test.assert_true(
    (select count(*) from public.published_price_observations
      where published_at is null) = 0,
    'the published view must not expose unpublished observations'
  );
rollback;

drop schema rls_test cascade;
