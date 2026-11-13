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
-- The safety interlock. This suite must never run against a database that
-- holds real market observations: it would put synthetic prices beside them
-- and, if it were interrupted, leave them behind. The check refuses to run
-- unless every observation already in the table is itself a labelled test
-- fixture.
do $$
declare v_real integer;
begin
  select count(*) into v_real
  from public.price_observations
  where coalesce(source_system, 'agent_app'::public.observation_source) <> 'test_fixture';

  if v_real > 0 then
    raise exception
      'The RLS suite refuses to run: price_observations already holds % row(s) that are not labelled test fixtures. Run it against a scratch database, never against production.',
      v_real;
  end if;
end $$;

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
   '2025-07-06T10:00:00Z', '33333333-3333-3333-3333-333333333333', 'verified', 'test_fixture', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 1, 1, 'wholesale_transaction', 41000, 1,
   'NGN', '2025-07-07T09:00:00Z', 'minute', '2025-07-07T09:05:00Z', null, null,
   '33333333-3333-3333-3333-333333333333', 'pending_verification', 'test_fixture', true),
  ('aaaaaaaa-0000-0000-0000-000000000003', 1, 1, 'wholesale_transaction', 42000, 1,
   'NGN', '2025-07-08T09:00:00Z', 'minute', null, null, null,
   '33333333-3333-3333-3333-333333333333', 'draft', 'test_fixture', true)
on conflict (id) do nothing;

-- One collection task per agent, for the market each agent covers. The ids are
-- fixed so the assertions can name a task directly.
insert into public.collection_tasks (
  id, market_id, commodity_id, assigned_to, due_on, status, priority, deadline_at, expected_commodity_ids
)
overriding system value
values
  (901, 1, 1, '33333333-3333-3333-3333-333333333333', current_date, 'open', 'normal',
   current_date + time '16:00', array[1]),
  (902, 2, 1, '44444444-4444-4444-4444-444444444444', current_date, 'open', 'normal',
   current_date + time '16:00', array[1])
on conflict do nothing;

-- A collection schedule for the first agent's market.
insert into public.market_collection_schedules (
  market_id, commodity_id, frequency, days_of_week, deadline_time, assigned_agent_id, priority
) values
  (1, 1, 'daily', array[0,1,2,3,4,5,6], '16:00', '33333333-3333-3333-3333-333333333333', 'high')
on conflict do nothing;

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
  -- The control row. It stands for a genuinely published price and exists
  -- only for the length of this transaction: the rollback at the end of the
  -- block removes it. It carries no 'test_fixture' label, because that is
  -- exactly what a real published observation looks like to the policy.
  insert into public.price_observations (
    id, commodity_id, market_id, price_type, reported_amount, reported_unit_id,
    currency_code, collected_at, collected_at_precision, submitted_at, verified_at,
    published_at, agent_user_id, verification_status, source_system, is_current
  ) values (
    'bbbbbbbb-0000-0000-0000-000000000001', 1, 1, 'wholesale_transaction', 40550, 1,
    'NGN', '2025-07-06T09:00:00Z', 'minute', '2025-07-06T09:05:00Z', '2025-07-06T10:00:00Z',
    '2025-07-06T10:00:00Z', '33333333-3333-3333-3333-333333333333', 'verified',
    'agent_app', true
  ) on conflict (id) do nothing;

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

  -- The fixtures are published and current, yet the public read refuses them
  -- because they are labelled. A synthetic price can never reach a visitor.
  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0,
    'a published test fixture must not be publicly readable'
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

  -- A pending observation must be approved before it can be published.
  select rls_test.assert_raises(
    'a pending observation must not be publishable before it is approved',
    $q$select public.publish_observation('aaaaaaaa-0000-0000-0000-000000000002')$q$
  );

  -- An administrator approves, then publishes.
  select public.approve_observation('aaaaaaaa-0000-0000-0000-000000000002', 'Checked against the market sheet.');
  select public.publish_observation('aaaaaaaa-0000-0000-0000-000000000002');

  select rls_test.assert_true(
    (select published_at is not null from public.price_observations
      where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
    'publish_observation should set the publication timestamp'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_verification_events
      where observation_id = 'aaaaaaaa-0000-0000-0000-000000000002'
        and action = 'published') = 1,
    'publish_observation should record a verification event'
  );

select rls_test.assert_true(
    (select count(*) from public.price_verification_events
      where observation_id = 'aaaaaaaa-0000-0000-0000-000000000002'
        and action = 'approved') = 1,
    'approve_observation should record a verification event'
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
-- 9. Notifications
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

  -- A notification is created for the customer by the database function.
  select public.notify(
    '55555555-5555-5555-5555-555555555555',
    'system_alert',
    'Your access has been restored',
    'A test notification.',
    'profile',
    '55555555-5555-5555-5555-555555555555',
    '/agent/profile',
    'normal',
    '{}'::jsonb
  );

  select rls_test.assert_true(
    (select count(*) from public.notifications) = 1,
    'a customer should see their own notification'
  );

  -- A notification for somebody else is invisible, even to an administrator.
  select rls_test.assert_true(
    (select count(*) from public.notifications
      where user_id = '33333333-3333-3333-3333-333333333333') = 0,
    'a notification addressed to another user must not be readable'
  );

  select rls_test.assert_raises(
    'a customer must not be able to write a notification into another inbox',
    $q$insert into public.notifications (user_id, kind, title)
      values ('33333333-3333-3333-3333-333333333333', 'system_alert', 'Forged')$q$
  );

  select rls_test.assert_true(
    (select count(*) from public.notifications
      where user_id = '55555555-5555-5555-5555-555555555555'
        and read_at is null) = 1,
    'a new notification should be unread'
  );
rollback;

-- =============================================================================
-- 10. Collection tasks and their history
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.collection_tasks
      where assigned_to = '33333333-3333-3333-3333-333333333333') = 1,
    'an agent should see the task assigned to them'
  );

  select rls_test.assert_true(
    (select count(*) from public.collection_tasks
      where assigned_to = '44444444-4444-4444-4444-444444444444') = 0,
    'an agent must not see another agent''s task'
  );

  select rls_test.assert_no_rows_affected(
    'an agent must not be able to take over another agent''s task',
    $q$update public.collection_tasks set assigned_to = '33333333-3333-3333-3333-333333333333'
      where assigned_to = '44444444-4444-4444-4444-444444444444'$q$
  );

  select rls_test.assert_raises(
    'an agent must not be able to delete a collection task',
    $q$delete from public.collection_tasks
      where assigned_to = '44444444-4444-4444-4444-444444444444'$q$
  );

  select rls_test.assert_raises(
    'an agent must not be able to forge a task history entry for another agent''s task',
    $q$insert into public.collection_task_events (task_id, event_type, reason)
      values (902, 'completed', 'forged')$q$
  );
rollback;

-- =============================================================================
-- 11. Collection schedules
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.market_collection_schedules
      where market_id in (select public.assigned_market_ids())) >= 0,
    'an agent may read the plan for the markets they cover'
  );

  select rls_test.assert_no_rows_affected(
    'an agent must not be able to change the collection plan',
    $q$update public.market_collection_schedules set expected_observations = 99
      where market_id in (select public.assigned_market_ids())$q$
  );

  select rls_test.assert_no_rows_affected(
    'an agent must not be able to delete a collection schedule',
    $q$delete from public.market_collection_schedules
      where market_id in (select public.assigned_market_ids())$q$
  );
rollback;

-- =============================================================================
-- 12. Account administration
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_no_rows_affected(
    'an agent must not be able to suspend another account',
    $q$update public.profiles set account_status = 'suspended'
      where id = '55555555-5555-5555-5555-555555555555'$q$
  );

  select rls_test.assert_raises(
    'an agent must not be able to suspend an account through the account-status function',
    $q$select public.set_account_status(
        '55555555-5555-5555-5555-555555555555', 'suspended', 'testing')$q$
  );

  select rls_test.assert_no_rows_affected(
    'an agent must not be able to read another agent''s agent profile',
    $q$update public.agent_profiles set region = 'Somewhere'
      where profile_id = '44444444-4444-4444-4444-444444444444'$q$
  );
rollback;

-- =============================================================================
-- 13. Exports and job history
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.export_jobs) = 0,
    'an agent must not see an administrator''s export jobs'
  );

  select rls_test.assert_true(
    (select count(*) from public.scheduled_job_runs) = 0,
    'an agent must not see the scheduled job history'
  );
rollback;

-- =============================================================================
-- 14. A suspended agent writes nothing
-- =============================================================================
begin;
  -- The administrator suspends the agent.
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select public.set_account_status(
    '33333333-3333-3333-3333-333333333333', 'suspended', 'RLS test suspension');

  -- The suspended agent tries to carry on working.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_raises(
    'a suspended agent must not be able to submit an observation',
    $q$insert into public.price_observations
        (commodity_id, market_id, price_type, reported_amount, reported_unit_id,
         currency_code, collected_at, agent_user_id, verification_status, source_system)
      values (1, 1, 'retail', 41000, 1, 'NGN', now(),
              '33333333-3333-3333-3333-333333333333', 'submitted', 'agent_app')$q$
  );

  select rls_test.assert_raises(
    'a suspended agent must not be able to move a collection task',
    $q$select public.transition_task(
        (select id from public.collection_tasks
          where assigned_to = '33333333-3333-3333-3333-333333333333' limit 1),
        'in_progress', 'testing')$q$
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

-- =============================================================================
-- 8b. The trade intelligence layer (migrations 0024, 0029, 0030)
-- =============================================================================
-- These four tables hold analytical judgement rather than market fact. The
-- cold-start validator already asserts RLS is enabled on every table, which is
-- how the original omission was caught. These assertions prove the policies
-- actually say the right thing: readable by anyone, writable only by staff.
--
-- A fabricated specification or fundamental is presented to the public as
-- sourced intelligence, which is exactly what brief §12 prohibits.

begin;
  set local role anon;
  set local request.jwt.claim.sub = '';

  select rls_test.assert_true(
    (select count(*) from public.commodity_specifications) >= 0,
    'anon should be able to read commodity specifications'
  );
  select rls_test.assert_true(
    (select count(*) from public.commodity_seasonality) >= 0,
    'anon should be able to read commodity seasonality'
  );
  select rls_test.assert_true(
    (select count(*) from public.commodity_fundamentals) >= 0,
    'anon should be able to read commodity fundamentals'
  );
  select rls_test.assert_true(
    (select count(*) from public.price_source_registry) >= 0,
    'anon should be able to read the price source registry'
  );

  select rls_test.assert_raises(
    'anon must not be able to insert a commodity specification',
    $q$insert into public.commodity_specifications (commodity_id, parameter, requirement)
       values ((select min(id) from public.commodities), 'rls_test_parameter', 'test')$q$
  );

  select rls_test.assert_no_rows_affected(
    'anon must not be able to rewrite the price source registry',
    $q$update public.price_source_registry set eligible_for_publication = true
       where source_system = 'legacy_import'$q$
  );

  set local role authenticated;
  set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

  select rls_test.assert_raises(
    'a non-staff user must not be able to insert a fundamental',
    $q$insert into public.commodity_fundamentals (commodity_id, report_period, sourced_facts)
       values ((select min(id) from public.commodities), now()::date, 'rls_test')$q$
  );

  select rls_test.assert_no_rows_affected(
    'a non-staff user must not be able to edit seasonality',
    $q$update public.commodity_seasonality set price_effect = 'rls_test'$q$
  );

  -- Staff must be able to write. Without this the read-only policies would look
  -- correct while making the tables useless to the admin screens that fill them.
  --
  -- Note the mechanism: `is_staff()` reads `public.current_role()`, which reads
  -- the profile row for `auth.uid()`. So staff is expressed by the JWT subject
  -- and the profile's role column, not by switching the PostgreSQL role.
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.commodity_specifications (commodity_id, parameter, requirement, basis)
  values ((select min(id) from public.commodities), 'rls_test_parameter', 'test value', 'indicative');

  select rls_test.assert_true(
    (select count(*) from public.commodity_specifications
      where parameter = 'rls_test_parameter') = 1,
    'staff should be able to insert a commodity specification'
  );

  delete from public.commodity_specifications where parameter = 'rls_test_parameter';

  reset role;
rollback;

-- ---------------------------------------------------------------------------
-- 8c. The commercial offers (migrations 0026-0028)
-- ---------------------------------------------------------------------------
-- An offer is a commitment by a named party, not a market fact, so it lives in
-- its own table with its own status and its own trail. Public read requires
-- verified status AND the owner's disclosure consent AND an unexpired validity
-- window; `update_offer_status()` is the only status-changing path and is
-- restricted to staff. That staff check was missing originally and is the
-- reason migration 0028 exists.
begin;
  -- The validator's stub auth.users has (id, email, raw_user_meta_data,
  -- created_at); Supabase's real one has more columns. Only the id is needed
  -- here, and `if not exists` keeps the fixture re-runnable.
  insert into auth.users (id)
  values
    ('99999999-9999-9999-9999-999999999999'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  on conflict (id) do nothing;

  -- The fixture is re-runnable: a previous run that failed between the insert
  -- and the rollback leaves these rows behind, and `on conflict` keeps the
  -- suite usable without a manual reset.
  insert into public.profiles (id, full_name, role, account_status)
  values
    ('99999999-9999-9999-9999-999999999999', 'RLS offer owner', 'customer', 'active'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RLS offer verifier', 'verification_officer', 'active')
  on conflict (id) do update
    set role = excluded.role, account_status = 'active';

  insert into public.buyer_offers
    (user_id, counterparty_name, commodity_id, price_amount, price_type, unit_id,
     currency_code, quantity_required, valid_from, valid_until, status, disclosure_consent)
  select
    '99999999-9999-9999-9999-999999999999',
    'RLS Test Aggregator',
    (select min(id) from public.commodities),
    41000, 'wholesale_transaction',
    (select min(id) from public.measurement_units),
    'NGN', 500,
    now() - interval '1 day', now() + interval '30 days',
    'verified', false
  where exists (select 1 from public.commodities);

do $$
declare
  v_offer uuid;
begin
  select id into v_offer from public.buyer_offers
  where user_id = '99999999-9999-9999-9999-999999999999' limit 1;

  if v_offer is null then
    raise notice 'no commodity fixture available; skipping offer assertions';
    return;
  end if;

  -- A verified offer is still hidden from anon until the owner consents.
  perform set_config('role', 'anon', true);
  perform rls_test.assert_true(
    (select count(*) from public.buyer_offers where id = v_offer) = 0,
    'a verified offer must stay hidden until the owner consents to disclosure'
  );

  perform rls_test.assert_no_rows_affected(
    'anon must not be able to write an offer',
    format('update public.buyer_offers set price_amount = 1 where id = %L', v_offer)
  );

  perform set_config('role', 'postgres', true);
  update public.buyer_offers set disclosure_consent = true where id = v_offer;

  perform set_config('role', 'anon', true);
  perform rls_test.assert_true(
    (select count(*) from public.buyer_offers where id = v_offer) = 1,
    'anon should see a verified offer once consent is given'
  );

  -- An expired offer is not a live opportunity and must not be published.
  perform set_config('role', 'postgres', true);
  update public.buyer_offers
     set valid_from = now() - interval '3 days', valid_until = now() - interval '1 day'
   where id = v_offer;

  perform set_config('role', 'anon', true);
  perform rls_test.assert_true(
    (select count(*) from public.buyer_offers where id = v_offer) = 0,
    'an expired offer must not be publicly readable'
  );

  -- The owner cannot edit their own verified offer. RLS's USING clause excludes
  -- the row, so the UPDATE matches zero rows rather than raising.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub',
                     '99999999-9999-9999-9999-999999999999', true);
  perform rls_test.assert_no_rows_affected(
    'the owner must not be able to edit their own verified offer',
    format('update public.buyer_offers set price_amount = 999999 where id = %L', v_offer)
  );

  -- The permission check migration 0028 added: a non-staff caller cannot verify
  -- an offer, even through the workflow function. This is the assertion that
  -- failed against the original 0027.
  perform rls_test.assert_raises(
    'a non-staff user must not be able to change an offer status',
    format($f$select public.update_offer_status('buyer_offers', %L, 'verified', null)$f$, v_offer)
  );

  perform rls_test.assert_raises(
    'a rejection without a reason must be refused',
    format($f$select public.update_offer_status('buyer_offers', %L, 'rejected', null)$f$, v_offer)
  );

  -- Staff can. Verified here as the verification officer.
  perform set_config('request.jwt.claim.sub',
                     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
  perform rls_test.assert_true(
    public.update_offer_status('buyer_offers', v_offer, 'rejected',
                               'RLS permission test rejected this offer.') = 'rejected',
    'staff should be able to reject an offer with a reason'
  );

  perform rls_test.assert_true(
    (select count(*) from public.offer_verification_events where offer_id = v_offer) >= 1,
    'the verification trail should record the rejection'
  );
end $$;

reset role;
rollback;

-- The fixture rows were inserted outside the transaction above, so remove them.
delete from public.offer_verification_events
where offer_id in (select id from public.buyer_offers
                   where user_id = '99999999-9999-9999-9999-999999999999');
delete from public.audit_events
where entity_id in (select id::text from public.buyer_offers
                    where user_id = '99999999-9999-9999-9999-999999999999');
delete from public.buyer_offers
where user_id = '99999999-9999-9999-9999-999999999999';
delete from public.profiles
where id in ('99999999-9999-9999-9999-999999999999',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
delete from auth.users
where id in ('99999999-9999-9999-9999-999999999999',
             'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- =============================================================================
-- 9. Cleanup
--
-- Everything above is a fixture. It is removed here so that running the suite
-- against a scratch database leaves it exactly as it was found. Every case in
-- the body of the suite is wrapped in a transaction that is rolled back; this
-- section removes the fixture rows that were inserted outside one.
-- =============================================================================
delete from public.price_revision_history
where observation_id in (select id from public.price_observations where source_system = 'test_fixture');

delete from public.price_verification_events
where observation_id in (select id from public.price_observations where source_system = 'test_fixture');

delete from public.data_quality_flags
where observation_id in (select id from public.price_observations where source_system = 'test_fixture');

delete from public.price_observation_evidence
where observation_id in (select id from public.price_observations where source_system = 'test_fixture');

delete from public.notifications
where user_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '88888888-8888-8888-8888-888888888888'
);

delete from public.audit_logs
where entity_id in (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000003'
);

delete from public.collection_task_events
where task_id in (select id from public.collection_tasks where id in (901, 902));

delete from public.price_observations where source_system = 'test_fixture';

delete from public.collection_tasks where id in (901, 902);

delete from public.market_collection_schedules
where assigned_agent_id = '33333333-3333-3333-3333-333333333333';

delete from public.market_agent_assignments
where (user_id, market_id) in (
  ('33333333-3333-3333-3333-333333333333', 1),
  ('44444444-4444-4444-4444-444444444444', 2)
);

delete from public.saved_commodities where user_id = '55555555-5555-5555-5555-555555555555';
delete from public.price_alerts where user_id = '55555555-5555-5555-5555-555555555555';

delete from public.agent_profiles
where profile_id in (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '88888888-8888-8888-8888-888888888888'
);

delete from public.profiles
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '88888888-8888-8888-8888-888888888888'
);

delete from auth.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888'
);

drop schema rls_test cascade;
