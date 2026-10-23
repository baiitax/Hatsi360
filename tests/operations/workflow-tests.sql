-- =============================================================================
-- Pluck Live — operations workflow tests
-- =============================================================================
-- These assertions exercise the operational transactions end to end against a
-- real PostgreSQL instance with the migrations applied:
--
--   schedule -> generate task -> agent submits (twice, to prove idempotency)
--   -> reviewer approves -> publisher publishes -> the price becomes public
--   -> a correction supersedes it -> the agent is notified -> the task closes.
--
-- Each step impersonates a role by switching to it and setting the JWT subject
-- claim, so the RLS policies and the SECURITY DEFINER functions are both
-- exercised exactly as the application exercises them.
-- =============================================================================

-- ------------------------------------------------------------ assertions ---

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

-- ------------------------------------------------------------- fixtures ----

-- The safety interlock. The workflow suite must never run against a database
-- that holds real market observations: it creates synthetic prices beside
-- them and, if it were interrupted, would leave them behind. The check
-- refuses to run unless every observation already in the table is itself a
-- labelled test fixture.
do $$
declare v_real integer;
begin
  select count(*) into v_real
  from public.price_observations
  where coalesce(source_system, 'agent_app'::public.observation_source) <> 'test_fixture';

  if v_real > 0 then
    raise exception
      'The workflow suite refuses to run: price_observations already holds % row(s) that are not labelled test fixtures. Run it against a scratch database, never against production.',
      v_real;
  end if;
end $$;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'officer@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'agent@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'agent2@test.local'),
  ('55555555-5555-5555-5555-555555555555', 'customer@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'customer2@test.local'),
  ('77777777-7777-7777-7777-777777777777', 'noprofile@test.local'),
  ('88888888-8888-8888-8888-888888888888', 'newagent@test.local')
on conflict (id) do nothing;

insert into public.profiles (id, full_name, role, account_status) values
  ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Verification Officer', 'verification_officer', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'Agent One', 'agent', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'Agent Two', 'agent', 'active'),
  ('55555555-5555-5555-5555-555555555555', 'Customer One', 'customer', 'active'),
  ('66666666-6666-6666-6666-666666666666', 'Customer Two', 'customer', 'active'),
  ('88888888-8888-8888-8888-888888888888', 'New Agent', 'public_user', 'active')
on conflict (id) do update set role = excluded.role, account_status = excluded.account_status;

delete from public.market_agent_assignments
where (user_id, market_id) in (
  ('33333333-3333-3333-3333-333333333333', 1),
  ('44444444-4444-4444-4444-444444444444', 2)
);

insert into public.market_agent_assignments (user_id, market_id, status, starts_on)
values
  ('33333333-3333-3333-3333-333333333333', 1, 'active', current_date - 30),
  ('44444444-4444-4444-4444-444444444444', 2, 'active', current_date - 30);

-- A published legacy-era observation used as the baseline for the correction
-- step, plus the agent's own new submission.
insert into public.price_observations (
  id, commodity_id, market_id, price_type, reported_amount, reported_unit_id,
  currency_code, collected_at, collected_at_precision, submitted_at, verified_at,
  published_at, agent_user_id, verification_status, source_system, is_current
) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 1, 1, 'wholesale_transaction', 40550, 1,
   'NGN', '2025-07-06T09:00:00Z', 'minute', '2025-07-06T09:05:00Z', '2025-07-06T10:00:00Z',
   '2025-07-06T10:00:00Z', '33333333-3333-3333-3333-333333333333', 'verified', 'test_fixture', true)
on conflict (id) do nothing;

-- =============================================================================
-- 1. The collection plan
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.market_collection_schedules (
    id, market_id, commodity_id, frequency, days_of_week, deadline_time,
    required_price_types, expected_observations, priority, evidence_required,
    assigned_agent_id, created_by
  )
  overriding system value
  values (901, 1, 1, 'daily', array[0,1,2,3,4,5,6], '16:00',
          array['wholesale_transaction']::public.price_type[], 1, 'high', false,
          '33333333-3333-3333-3333-333333333333',
          '11111111-1111-1111-1111-111111111111')
  on conflict do nothing;

  select rls_test.assert_true(
    (select count(*) from public.market_collection_schedules where id = 901) = 1,
    'an administrator should be able to create a collection schedule'
  );
rollback;

-- =============================================================================
-- 2. Task generation is idempotent
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.market_collection_schedules (
    id, market_id, commodity_id, frequency, days_of_week, deadline_time,
    required_price_types, expected_observations, priority, evidence_required,
    assigned_agent_id, created_by
  )
  overriding system value
  values (902, 1, 1, 'daily', array[0,1,2,3,4,5,6], '16:00',
          array['wholesale_transaction']::public.price_type[], 1, 'high', false,
          '33333333-3333-3333-3333-333333333333',
          '11111111-1111-1111-1111-111111111111')
  on conflict do nothing;

  -- The schedule only produces tasks on the days it covers.
  select public.generate_collection_tasks(current_date);

  select rls_test.assert_true(
    (select count(*) from public.collection_tasks
      where schedule_id = 902 and due_on = current_date) = 1,
    'the scheduler should create one task for the schedule'
  );

  -- Running it again must not create a second task.
  select public.generate_collection_tasks(current_date);

  select rls_test.assert_true(
    (select count(*) from public.collection_tasks
      where schedule_id = 902 and due_on = current_date) = 1,
    'the scheduler must be idempotent'
  );

  select rls_test.assert_true(
    (select count(*) from public.collection_task_events
      where task_id in (select id from public.collection_tasks where schedule_id = 902)
        and event_type = 'created') = 1,
    'the task history should record the creation'
  );

  -- The notification is private to its recipient: the administrator who ran the
  -- scheduler cannot read it, so the agent checks their own inbox.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.notifications
      where user_id = '33333333-3333-3333-3333-333333333333'
        and kind = 'task_assigned') >= 1,
    'the assigned agent should be notified about the task'
  );
rollback;

-- =============================================================================
-- 3. The agent submits a price
-- =============================================================================
begin;
  -- The administrator creates the task; the agent may not.
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.collection_tasks (
    id, market_id, commodity_id, assigned_to, due_on, status, priority,
    deadline_at, expected_commodity_ids
  )
  overriding system value
  values (903, 1, 1, '33333333-3333-3333-3333-333333333333', current_date, 'open', 'high',
          current_date + time '16:00', array[1])
  on conflict do nothing;

  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  -- An agent may not submit for a market they do not cover.
  select rls_test.assert_raises(
    'an agent must not be able to submit for an unassigned market',
    $q$select public.submit_observation(
        jsonb_build_object('market_id', 2, 'commodity_id', 1, 'reported_amount', 41000,
                           'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                           'collected_at', now()),
        'workflow-unassigned-key')$q$
  );

  -- The happy path.
  select rls_test.assert_true(
    (select public.submit_observation(
        jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41250,
                           'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                           'collected_at', now(), 'task_id', 903),
        'workflow-submit-key') is not null),
    'the agent submission should succeed'
  );

  -- The same idempotency key must not create a second observation.
  select public.submit_observation(
    jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41250,
                       'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                       'collected_at', now(), 'task_id', 903),
    'workflow-submit-key');

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where submission_key = 'workflow-submit-key') = 1,
    'a retried submission must not create a second observation'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where submission_key = 'workflow-submit-key'
        and verification_status = 'submitted') = 1,
    'a submitted observation starts in the submitted state'
  );

  select rls_test.assert_true(
    (select status = 'in_progress' from public.collection_tasks where id = 903),
    'submitting should move the task to in_progress'
  );

  -- An agent may not approve their own submission.
  select rls_test.assert_raises(
    'an agent must not be able to approve their own submission',
    $q$select public.approve_observation(
        (select id from public.price_observations where submission_key = 'workflow-submit-key'),
        'self approval')$q$
  );
rollback;

-- =============================================================================
-- 4. Review, approval and publication
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.submit_observation(
    jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41250,
                       'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                       'collected_at', now()),
    'workflow-review-key');

  -- The reviewer picks it up.
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select public.approve_observation(
    (select id from public.price_observations where submission_key = 'workflow-review-key'),
    'Checked against the market sheet.');

  select rls_test.assert_true(
    (select verification_status = 'verified' from public.price_observations
      where submission_key = 'workflow-review-key'),
    'an approved observation should be in the verified state'
  );

  select rls_test.assert_true(
    (select published_at is null from public.price_observations
      where submission_key = 'workflow-review-key'),
    'approval and publication are separate acts'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_verification_events
      where observation_id = (select id from public.price_observations
        where submission_key = 'workflow-review-key')
        and action = 'approved') = 1,
    'the approval should be recorded in the verification trail'
  );

  -- Before publication the price is not public.
  set local role anon;
  set local request.jwt.claim.sub = '';

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where submission_key = 'workflow-review-key') = 0,
    'an approved but unpublished observation is not public'
  );

  -- Publish it.
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select public.publish_observation(
    (select id from public.price_observations where submission_key = 'workflow-review-key'));

  set local role anon;
  set local request.jwt.claim.sub = '';

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where submission_key = 'workflow-review-key') = 1,
    'a published observation is publicly readable'
  );

  select rls_test.assert_true(
    (select count(*) from public.published_price_observations
      where id = (select id from public.price_observations
        where submission_key = 'workflow-review-key')) = 1,
    'a published observation appears in the public view'
  );

  -- The agent is told that the submission was approved. The reviewer cannot read
  -- the agent's inbox, so the check runs as the agent.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.notifications
      where user_id = '33333333-3333-3333-3333-333333333333'
        and kind = 'submission_approved') >= 1,
    'the agent should be notified when their submission is approved'
  );
rollback;

-- =============================================================================
-- 5. A correction supersedes the published price
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

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
    (select is_current = false from public.price_observations
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
    'the corrected observation is no longer current'
  );

  select rls_test.assert_true(
    (select count(*) from public.published_price_observations
      where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0,
    'a superseded observation leaves the public view'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_revision_history
      where observation_id = 'aaaaaaaa-0000-0000-0000-000000000001') >= 1,
    'the correction leaves a revision history snapshot'
  );

  -- A published price cannot be edited in place, even by an administrator.
  select rls_test.assert_raises(
    'a published price must not be editable in place',
    $q$update public.price_observations set reported_amount = 1
      where id = 'aaaaaaaa-0000-0000-0000-000000000001'$q$
  );
rollback;

-- =============================================================================
-- 6. Overdue tasks are marked and reported
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.collection_tasks (
    id, market_id, commodity_id, assigned_to, due_on, status, priority,
    deadline_at, expected_commodity_ids
  )
  overriding system value
  values (904, 1, 1, '33333333-3333-3333-3333-333333333333', current_date - 2, 'open', 'high',
          now() - interval '2 days', array[1])
  on conflict do nothing;

  select public.mark_overdue_tasks(now());

  select rls_test.assert_true(
    (select count(*) from public.collection_task_events
      where task_id = 904 and event_type = 'overdue') = 1,
    'the overdue job should record the overdue event'
  );

  -- Running the job twice must not double-count.
  select public.mark_overdue_tasks(now());

  select rls_test.assert_true(
    (select count(*) from public.collection_task_events
      where task_id = 904 and event_type = 'overdue') = 1,
    'the overdue job must be idempotent'
  );

  -- The reminder is private to the agent it was addressed to.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.notifications
      where user_id = '33333333-3333-3333-3333-333333333333'
        and kind = 'deadline_reminder') >= 1,
    'the agent should be reminded about the overdue task'
  );
rollback;

-- =============================================================================
-- 7. Task lifecycle
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  insert into public.collection_tasks (
    id, market_id, commodity_id, assigned_to, due_on, status, priority,
    deadline_at, expected_commodity_ids
  )
  overriding system value
  values (905, 1, 1, '33333333-3333-3333-3333-333333333333', current_date, 'open', 'normal',
          current_date + time '16:00', array[1])
  on conflict do nothing;

  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.transition_task(905, 'in_progress', 'Started the round.');

  select rls_test.assert_true(
    (select status = 'in_progress' from public.collection_tasks where id = 905),
    'the task should be in progress'
  );

  -- Cancelling needs a reason.
  select rls_test.assert_raises(
    'a task cannot be cancelled without a reason',
    $q$select public.transition_task(905, 'cancelled', null)$q$
  );

  select public.transition_task(905, 'cancelled', 'Market closed for the festival.');

  select rls_test.assert_true(
    (select status = 'cancelled' from public.collection_tasks where id = 905),
    'the task should be cancelled'
  );

  select rls_test.assert_true(
    (select count(*) from public.collection_task_events where task_id = 905) >= 2,
    'the task history should record every transition'
  );

  -- An agent may not touch another agent's task.
  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

  select rls_test.assert_raises(
    'an agent must not be able to move another agent''s task',
    $q$select public.transition_task(905, 'in_progress', 'not mine')$q$
  );
rollback;

-- =============================================================================
-- 8. Account suspension stops the agent
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  select public.set_account_status(
    '33333333-3333-3333-3333-333333333333', 'suspended', 'Paused during the audit.');

  select rls_test.assert_true(
    (select account_status = 'suspended' from public.profiles
      where id = '33333333-3333-3333-3333-333333333333'),
    'the account should be suspended'
  );

  select rls_test.assert_true(
    (select is_active = false from public.profiles
      where id = '33333333-3333-3333-3333-333333333333'),
    'the profile should no longer be active'
  );

  select rls_test.assert_true(
    (select count(*) from public.account_status_events
      where profile_id = '33333333-3333-3333-3333-333333333333'
        and new_status = 'suspended') = 1,
    'the suspension should be recorded in the account history'
  );

  select rls_test.assert_true(
    (select count(*) from public.audit_logs
      where action = 'account.status_changed'
        and entity_id = '33333333-3333-3333-3333-333333333333') = 1,
    'the suspension should be audited'
  );

  -- The suspended agent cannot work.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_raises(
    'a suspended agent must not be able to submit a price',
    $q$select public.submit_observation(
        jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                           'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                           'collected_at', now()),
        'workflow-suspended-key')$q$
  );
rollback;

-- =============================================================================
-- 9. The analytics snapshot records real counts
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  select public.refresh_analytics_snapshot(current_date);

  select rls_test.assert_true(
    (select count(*) from public.analytics_snapshots
      where snapshot_date = current_date and scope = 'global') = 1,
    'the snapshot should be written'
  );

  select rls_test.assert_true(
    (select (metrics ->> 'markets_total')::int >= 11 from public.analytics_snapshots
      where snapshot_date = current_date and scope = 'global'),
    'the snapshot should count the real markets'
  );

  select rls_test.assert_true(
    (select (metrics ->> 'observations_total')::int >= 1 from public.analytics_snapshots
      where snapshot_date = current_date and scope = 'global'),
    'the snapshot should count the real observations'
  );
rollback;

-- =============================================================================
-- 10. Rejection, role management, provisioning and quality flags
-- =============================================================================

-- 10a. A reviewer can reject a submission, and the agent is told why.
begin;
  -- The agent submits.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.submit_observation(
    jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                       'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                       'collected_at', now()),
    'workflow-reject-key-2');

  select rls_test.assert_true(
    (select count(*) from public.price_observations where submission_key = 'workflow-reject-key-2') = 1,
    'the test submission should exist'
  );

  -- The agent cannot reject their own price.
  select rls_test.assert_raises(
    'an agent must not be able to reject a price',
    $q$select public.reject_observation(
        (select id from public.price_observations where submission_key = 'workflow-reject-key-2'),
        'Because I said so')$q$
  );

  -- A reviewer can.
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  select public.reject_observation(
    (select id from public.price_observations where submission_key = 'workflow-reject-key-2'),
    'The price does not match the market board'
  );

  select rls_test.assert_true(
    (select verification_status from public.price_observations
      where submission_key = 'workflow-reject-key-2') = 'rejected',
    'the rejected price should carry the rejected status'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_verification_events
      where action = 'rejected'
        and observation_id = (select id from public.price_observations
                              where submission_key = 'workflow-reject-key-2')) = 1,
    'the rejection should be recorded as a verification event'
  );

  select rls_test.assert_true(
    (select count(*) from public.audit_logs
      where action = 'observation.rejected'
        and entity_id = (select id::text from public.price_observations
                         where submission_key = 'workflow-reject-key-2')) = 1,
    'the rejection should be audited'
  );

  -- The agent is notified, and only the agent can read their own inbox.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.notifications
      where kind = 'submission_rejected'
        and user_id = '33333333-3333-3333-3333-333333333333') = 1,
    'the agent should be told that the price was rejected'
  );

  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

  select rls_test.assert_true(
    (select count(*) from public.notifications
      where kind = 'submission_rejected'
        and user_id = '44444444-4444-4444-4444-444444444444') = 0,
    'another agent must not see the rejection notification'
  );
rollback;

-- 10b. Roles can only be changed by an administrator, and never your own.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select rls_test.assert_raises(
    'a verification officer must not be able to change a role',
    $q$select public.set_user_role(
        '44444444-4444-4444-4444-444444444444',
        'admin'::public.user_role,
        'Trying it on')$q$
  );
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  select rls_test.assert_raises(
    'an administrator must not be able to change their own role',
    $q$select public.set_user_role(
        '11111111-1111-1111-1111-111111111111',
        'public_user'::public.user_role,
        'Changing my own role')$q$
  );

  select public.set_user_role(
    '44444444-4444-4444-4444-444444444444',
    'market_supervisor'::public.user_role,
    'Promoted to supervisor'
  );

  select rls_test.assert_true(
    (select role from public.profiles
      where id = '44444444-4444-4444-4444-444444444444') = 'market_supervisor',
    'the role should have changed'
  );

  select rls_test.assert_true(
    (select count(*) from public.audit_logs
      where action = 'profile.role_changed'
        and entity_id = '44444444-4444-4444-4444-444444444444') = 1,
    'the role change should be audited'
  );
rollback;

-- 10c. An administrator provisions an agent; a reviewer may not.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select rls_test.assert_raises(
    'a verification officer must not be able to provision an agent',
    $q$select public.provision_agent(
        '88888888-8888-8888-8888-888888888888',
        'EMP-999',
        'Kano',
        array[1]::bigint[],
        'Trying it on')$q$
  );
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  select public.provision_agent(
    '88888888-8888-8888-8888-888888888888',
    'EMP-999',
    'Kano',
    array[1]::bigint[],
    'New field agent'
  );

  select rls_test.assert_true(
    (select role from public.profiles
      where id = '88888888-8888-8888-8888-888888888888') = 'agent',
    'the provisioned profile should be an agent'
  );

  select rls_test.assert_true(
    (select count(*) from public.agent_profiles
      where profile_id = '88888888-8888-8888-8888-888888888888'
        and employee_code = 'EMP-999') = 1,
    'the agent profile should have been created'
  );

  select rls_test.assert_true(
    (select count(*) from public.market_agent_assignments
      where user_id = '88888888-8888-8888-8888-888888888888'
        and market_id = 1 and status = 'active') = 1,
    'the market assignment should have been created'
  );

  select rls_test.assert_true(
    (select count(*) from public.audit_logs
      where action = 'agent.provisioned'
        and entity_id = '88888888-8888-8888-8888-888888888888') = 1,
    'the provisioning should be audited'
  );
rollback;

-- 10d. Quality flags carry the rule that raised them and can be resolved.
begin;
  -- The agent submits.
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.submit_observation(
    jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                       'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                       'collected_at', now()),
    'workflow-flag-key');

  -- The reviewer raises a flag.
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

  select public.raise_quality_flag(
    (select id from public.price_observations where submission_key = 'workflow-flag-key'),
    'price_outlier'::public.quality_flag_code,
    'Far from the recent comparable median',
    'review',
    'large_price_change',
    1
  );

  select rls_test.assert_true(
    (select 'price_outlier'::public.quality_flag_code = any (quality_flags)
      from public.price_observations where submission_key = 'workflow-flag-key'),
    'the observation should carry the quality flag'
  );

  select rls_test.assert_true(
    (select count(*) from public.data_quality_flags
      where observation_id = (select id from public.price_observations
                              where submission_key = 'workflow-flag-key')
        and rule_code = 'large_price_change'
        and rule_version = 1) = 1,
    'the flag should record the rule and its version'
  );

  select public.resolve_quality_flag(
    (select id from public.data_quality_flags
      where observation_id = (select id from public.price_observations
                              where submission_key = 'workflow-flag-key')),
    'Checked against the market board'
  );

  select rls_test.assert_true(
    (select count(*) from public.data_quality_flags
      where observation_id = (select id from public.price_observations
                              where submission_key = 'workflow-flag-key')
        and resolved_at is not null) = 1,
    'the flag should be marked resolved, not deleted'
  );

  select rls_test.assert_true(
    (select count(*) from public.data_quality_flags
      where observation_id = (select id from public.price_observations
                              where submission_key = 'workflow-flag-key')) = 1,
    'the flag row itself must still exist'
  );
rollback;

-- 10e. Exports are recorded, scoped to the requester and expiring.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

  select rls_test.assert_raises(
    'a customer must not be able to export',
    $q$select public.create_export_job('observations', '{}'::jsonb, 'csv')$q$
  );
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

  select public.create_export_job('observations', jsonb_build_object('days', 30), 'csv');

  select rls_test.assert_true(
    (select count(*) from public.export_jobs
      where scope = 'observations' and requested_by = '22222222-2222-2222-2222-222222222222') = 1,
    'the export request should be recorded against the requester'
  );

  select rls_test.assert_true(
    (select count(*) from public.audit_logs where action = 'export.requested') >= 1,
    'the export request should be audited'
  );

  select rls_test.assert_true(
    (select count(*) from public.export_jobs where expires_at is not null) >= 1,
    'the export should carry an expiry'
  );
rollback;

-- 10f. Sign-in attempts are counted against a hashed identifier.
begin;
  select public.record_login_attempt('hash-abc', 'hash-ip', false);
  select public.record_login_attempt('hash-abc', 'hash-ip', false);
  select public.record_login_attempt('hash-abc', 'hash-ip', true);

  select rls_test.assert_true(
    public.count_login_attempts('hash-abc') = 2,
    'only the failed attempts should count towards the limit'
  );

  select public.clear_login_attempts('hash-abc');

  select rls_test.assert_true(
    public.count_login_attempts('hash-abc') = 0,
    'a successful sign-in should clear the counter'
  );

  select rls_test.assert_true(
    (select count(*) from public.auth_login_attempts
      where identifier_hash = 'hash-abc') = 0,
    'the attempts should be removed'
  );
rollback;


-- =============================================================================
-- 11. Cleanup
--
-- Every case above is wrapped in a transaction that is rolled back, so the
-- only rows that outlive the suite are the fixtures inserted outside one.
-- They are removed here.
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
  'bbbbbbbb-0000-0000-0000-000000000001'
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

drop schema if exists rls_test cascade;
