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
  ('44444444-4444-4444-4444-444444444444', 1),
  ('44444444-4444-4444-4444-444444444444', 2)
);

insert into public.market_agent_assignments (user_id, market_id, status, starts_on)
values
  ('33333333-3333-3333-3333-333333333333', 1, 'active', current_date - 30),
  ('44444444-4444-4444-4444-444444444444', 2, 'active', current_date - 30),
  -- The second agent also covers the first market, so that only the rule
  -- about who owns a draft can stop them from submitting it.
  ('44444444-4444-4444-4444-444444444444', 1, 'active', current_date - 30);

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
-- 10g. Saving a draft on the server, then submitting it
--
-- The field app saves a draft so the work survives a lost phone. Submitting
-- that draft must turn the same record into the submitted observation — no
-- second row — and a second submit must not create one either.
--
-- The drafts are inserted outside a transaction, as labelled test fixtures,
-- so that the agent can act on them with the same row-level security the
-- application applies. They are removed by the cleanup section.
-- =============================================================================
delete from public.price_observations
where id in (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000003',
  'bbbbbbbb-0000-0000-0000-000000000004',
  'bbbbbbbb-0000-0000-0000-000000000005'
);

-- An observation with evidence attached, used by the storage tests. It is
-- committed rather than rolled back so that a second agent can be shown to
-- be unable to reach it.
insert into public.price_observations (
  id, commodity_id, market_id, price_type, reported_amount, reported_unit_id,
  currency_code, collected_at, agent_user_id, verification_status,
  source_system, source_reference, updated_at
) values
  ('bbbbbbbb-0000-0000-0000-000000000005', 1, 1, 'wholesale_transaction', 43000, 1, 'NGN',
   now(), '33333333-3333-3333-3333-333333333333', 'draft',
   'test_fixture', 'field-evidence-draft', now() - interval '10 minutes');

insert into public.price_observation_evidence (
  observation_id, storage_path, file_name, content_type, byte_size, uploaded_by
) values (
  'bbbbbbbb-0000-0000-0000-000000000005',
  'bbbbbbbb-0000-0000-0000-000000000005/price-board.jpg',
  'price-board.jpg', 'image/jpeg', 20480,
  '33333333-3333-3333-3333-333333333333'
);

insert into public.price_observations (
  id, commodity_id, market_id, price_type, reported_amount, reported_unit_id,
  currency_code, collected_at, agent_user_id, verification_status,
  source_system, source_reference, updated_at
) values
  ('bbbbbbbb-0000-0000-0000-000000000002', 1, 1, 'wholesale_transaction', 40000, 1, 'NGN',
   now(), '33333333-3333-3333-3333-333333333333', 'draft',
   'test_fixture', 'field-app-draft', now() - interval '10 minutes'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 1, 1, 'wholesale_transaction', 40000, 1, 'NGN',
   now(), '33333333-3333-3333-3333-333333333333', 'draft',
   'test_fixture', 'field-conflict-draft', now() - interval '10 minutes'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 1, 1, 'wholesale_transaction', 40000, 1, 'NGN',
   now(), '33333333-3333-3333-3333-333333333333', 'draft',
   'test_fixture', 'field-other-agent-draft', now() - interval '10 minutes');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where source_reference = 'field-app-draft' and verification_status = 'draft') = 1,
    'the draft should be saved with the draft status'
  );

  -- Submitting the draft in place.
  select public.submit_observation(
    jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                       'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                       'collected_at', now()),
    'field-draft-submit-key',
    (select id from public.price_observations where source_reference = 'field-app-draft')
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where source_reference = 'field-app-draft') = 1,
    'submitting a draft must not create a second observation'
  );

  select rls_test.assert_true(
    (select verification_status = 'submitted' from public.price_observations
      where source_reference = 'field-app-draft'),
    'the submitted draft should move to the submitted state'
  );

  select rls_test.assert_true(
    (select reported_amount = 41000 from public.price_observations
      where source_reference = 'field-app-draft'),
    'the submitted draft should carry the amount the agent sent'
  );

  select rls_test.assert_true(
    (select submitted_at is not null from public.price_observations
      where source_reference = 'field-app-draft'),
    'the submitted draft should record when it was sent'
  );

  select rls_test.assert_true(
    (select count(*) from public.price_verification_events
      where observation_id = (select id from public.price_observations
        where source_reference = 'field-app-draft')
        and action = 'submitted') = 1,
    'submitting a draft should write a verification event'
  );

  -- Retrying the same submit with the same key must be harmless.
  select public.submit_observation(
    jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                       'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                       'collected_at', now()),
    'field-draft-submit-key',
    (select id from public.price_observations where source_reference = 'field-app-draft')
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where source_reference = 'field-app-draft') = 1,
    'a retried draft submission must not create a second observation'
  );

  -- The draft is no longer a draft, so it cannot be submitted again.
  select rls_test.assert_raises(
    'a submitted draft must not be submitted a second time',
    $q$select public.submit_observation(
        jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                           'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                           'collected_at', now()),
        'field-draft-submit-key-2',
        (select id from public.price_observations where source_reference = 'field-app-draft'))$q$
  );
rollback;

-- =============================================================================
-- 10h. Conflict detection when the draft changed on the server
--
-- If the record moved on while the agent was working on it, the submission is
-- refused rather than overwriting a change the agent never saw.
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_raises(
    'a submission based on a stale version must be refused',
    $q$select public.submit_observation(
        jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                           'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                           'collected_at', now(),
                           'expected_updated_at', (now() - interval '1 hour')::text),
        'field-conflict-key',
        (select id from public.price_observations where source_reference = 'field-conflict-draft'))$q$
  );

  select rls_test.assert_true(
    (select verification_status = 'draft' from public.price_observations
      where source_reference = 'field-conflict-draft'),
    'a refused submission must leave the draft untouched'
  );

  -- The same submission with the current version is accepted.
  select public.submit_observation(
    jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                       'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                       'collected_at', now(),
                       'expected_updated_at', (select updated_at from public.price_observations
                         where source_reference = 'field-conflict-draft')::text),
    'field-conflict-key-2',
    (select id from public.price_observations where source_reference = 'field-conflict-draft')
  );

  select rls_test.assert_true(
    (select verification_status = 'submitted' from public.price_observations
      where source_reference = 'field-conflict-draft'),
    'a submission based on the current version must succeed'
  );
rollback;

-- =============================================================================
-- 10i. An agent may not submit somebody else's draft
--
-- The second agent covers the same market, so only the ownership rule can
-- stop them.
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

  select rls_test.assert_raises(
    'an agent must not be able to submit another agent''s draft',
    $q$select public.submit_observation(
        jsonb_build_object('market_id', 1, 'commodity_id', 1, 'reported_amount', 41000,
                           'reported_unit_id', 1, 'price_type', 'wholesale_transaction',
                           'collected_at', now()),
        'field-other-agent-key',
        'bbbbbbbb-0000-0000-0000-000000000004'::uuid)$q$
  );

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where source_reference = 'field-other-agent-draft') = 0,
    'the other agent must not be able to read a draft that is not theirs'
  );
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select rls_test.assert_true(
    (select verification_status = 'draft' from public.price_observations
      where source_reference = 'field-other-agent-draft'),
    'the other agent''s draft must be left as it was'
  );

  select rls_test.assert_true(
    (select reported_amount = 40000 from public.price_observations
      where source_reference = 'field-other-agent-draft'),
    'the other agent''s draft must keep its original amount'
  );
rollback;


-- =============================================================================
-- 10j. The collection session and the market intelligence
--
-- One market visit is one session with several observations in it. The
-- intelligence an agent records sits beside the price and never inside it.
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  -- A session may only be opened at a market the agent covers.
  select rls_test.assert_raises(
    'an agent must not be able to open a session at an unassigned market',
    $q$select public.open_collection_batch(2, null, null, null)$q$
  );

  select public.open_collection_batch(1, null, null, 'Morning round') as batch;

  select rls_test.assert_true(
    (select count(*) from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and market_id = 1
        and completed_at is null) = 1,
    'the agent should be able to open a session at an assigned market'
  );

  select rls_test.assert_true(
    (select count(*) from public.collection_batches
      where reference like 'COL-%' and completed_at is null
        and agent_user_id = '33333333-3333-3333-3333-333333333333') = 1,
    'the session should carry a generated reference'
  );

  -- A price collected inside the session points at it.
  insert into public.price_observations (
    commodity_id, market_id, price_type, reported_amount, reported_unit_id,
    currency_code, collected_at, agent_user_id, verification_status,
    source_system, source_reference, collection_batch_id
  )
  select 1, 1, 'wholesale_transaction', 42000, 1, 'NGN', now(),
         '33333333-3333-3333-3333-333333333333', 'draft',
         'agent_app', 'field-session-price',
         (select id from public.collection_batches
           where agent_user_id = '33333333-3333-3333-3333-333333333333'
             and completed_at is null limit 1);

  select rls_test.assert_true(
    (select count(*) from public.price_observations
      where source_reference = 'field-session-price'
        and collection_batch_id is not null) = 1,
    'a price collected in the session should point at it'
  );

  -- The intelligence is recorded beside the price.
  insert into public.observation_market_intelligence (
    observation_id, availability, supply_level, demand_level,
    price_direction, market_activity, sentiment, developments, agent_user_id
  )
  select id, 'limited', 'low', 'high', 'rising', 'moderate', 'positive',
         'Road works on the approach to the market.', agent_user_id
  from public.price_observations where source_reference = 'field-session-price';

  select rls_test.assert_true(
    (select availability = 'limited' and demand_level = 'high'
       and price_direction = 'rising'
     from public.observation_market_intelligence
     where observation_id = (select id from public.price_observations
       where source_reference = 'field-session-price')),
    'the market intelligence should be stored beside the price'
  );

  select rls_test.assert_true(
    (select reported_amount = 42000 from public.price_observations
      where source_reference = 'field-session-price'),
    'the recorded intelligence must not change the price'
  );

  -- Closing the session records the visit.
  select public.close_collection_batch(
    (select id from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and completed_at is null limit 1),
    'Morning round');

  select rls_test.assert_true(
    (select count(*) from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and completed_at is not null) = 1,
    'closing the session should mark it complete'
  );

  select rls_test.assert_true(
    (select count(*) from public.market_visit_records
      where market_id = 1 and agent_user_id = '33333333-3333-3333-3333-333333333333') = 1,
    'closing the session should record the visit'
  );

  -- Closing twice is harmless.
  select public.close_collection_batch(
    (select id from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and completed_at is not null limit 1),
    'Morning round');
rollback;

-- =============================================================================
-- 10j-2. The optional visit coordinate
--
-- The agent may confirm a position when opening a session. It is optional,
-- it is range-checked, and a session without one opens exactly the same way.
-- The coordinate describes where the agent stood, never what the price was.
--
-- Each scenario is its own transaction on purpose: `now()` does not advance
-- inside a transaction, and the visit record is keyed on the session's start
-- time, so two sessions opened in one transaction would look like one visit.
-- =============================================================================

-- A session opened without a position carries none, and closing it records a
-- visit with no position either.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.open_collection_batch(1, null, null, 'No position offered') as batch;
  select rls_test.assert_true(
    (select gps_latitude is null and gps_longitude is null
     from public.collection_batches
     where agent_user_id = '33333333-3333-3333-3333-333333333333'
       and completed_at is null limit 1),
    'a session opened without a position should carry none'
  );

  select public.close_collection_batch(
    (select id from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and completed_at is null limit 1),
    null);

  select rls_test.assert_true(
    (select gps_latitude is null and gps_longitude is null
     from public.market_visit_records
     where market_id = 1
       and agent_user_id = '33333333-3333-3333-3333-333333333333'
     order by id desc limit 1),
    'a visit from a session without a position should carry none'
  );
rollback;

-- A confirmed position is stored on the session and carried onto the visit.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.open_collection_batch(
    1, null, null, 'Position confirmed', 12.002213, 8.592034
  ) as batch;
  select rls_test.assert_true(
    (select gps_latitude = 12.002213 and gps_longitude = 8.592034
     from public.collection_batches
     where agent_user_id = '33333333-3333-3333-3333-333333333333'
       and completed_at is null limit 1),
    'a confirmed position should be stored on the session'
  );

  select public.close_collection_batch(
    (select id from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and completed_at is null limit 1),
    null);

  select rls_test.assert_true(
    (select gps_latitude = 12.002213 and gps_longitude = 8.592034
     from public.market_visit_records
     where market_id = 1
       and agent_user_id = '33333333-3333-3333-3333-333333333333'
     order by id desc limit 1),
    'closing should carry the position onto the visit record'
  );
rollback;

-- A coordinate out of range is dropped rather than stored, and does not stop
-- the session from opening.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.open_collection_batch(
    1, null, null, 'Nonsense position', 999, 999
  ) as batch;
  select rls_test.assert_true(
    (select count(*) from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and completed_at is null) = 1,
    'an out-of-range position should not stop the session opening'
  );
  select rls_test.assert_true(
    (select gps_latitude is null and gps_longitude is null
     from public.collection_batches
     where agent_user_id = '33333333-3333-3333-3333-333333333333'
       and completed_at is null limit 1),
    'an out-of-range position should be dropped rather than stored'
  );
rollback;

-- A coordinate is never required: the four-argument form still works after
-- the six-argument form has been used.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.open_collection_batch(1, null, null, 'Back to no position') as batch;
  select rls_test.assert_true(
    (select count(*) from public.collection_batches
      where agent_user_id = '33333333-3333-3333-3333-333333333333'
        and completed_at is null) = 1,
    'the four-argument form should still open a session'
  );
rollback;

-- =============================================================================
-- 10k. An agent must not touch another agent's session or intelligence
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

  select rls_test.assert_raises(
    'an agent must not be able to close another agent''s session',
    $q$select public.close_collection_batch(
        (select id from public.collection_batches
          where agent_user_id = '33333333-3333-3333-3333-333333333333' limit 1),
        null)$q$
  );
rollback;


-- =============================================================================
-- 10l. The agent's own details, and nothing else
--
-- The function writes the display name and the alternative phone. The role,
-- the account state and the region stay out of reach.
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  select public.update_agent_contact('Agent One Renamed', '0800 111 2222');

  select rls_test.assert_true(
    (select full_name = 'Agent One Renamed' from public.profiles
      where id = '33333333-3333-3333-3333-333333333333'),
    'the agent should be able to change their display name'
  );

  select rls_test.assert_true(
    (select role = 'agent' from public.profiles
      where id = '33333333-3333-3333-3333-333333333333'),
    'the agent role must not change when the details are saved'
  );

  select rls_test.assert_true(
    (select account_status = 'active' from public.profiles
      where id = '33333333-3333-3333-3333-333333333333'),
    'the account state must not change when the details are saved'
  );

  -- The name is required.
  select rls_test.assert_raises(
    'a blank name must be refused',
    $q$select public.update_agent_contact('   ', null)$q$
  );
rollback;

-- =============================================================================
-- 10m. The market intelligence belongs to the observation
--
-- One agent may not read the intelligence attached to another agent's
-- observation, and may not attach their own intelligence to it.
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

  select rls_test.assert_true(
    (select count(*) from public.observation_market_intelligence
      where observation_id = (select id from public.price_observations
        where source_reference = 'field-session-price')) = 0,
    'an agent must not read the intelligence on another agent''s observation'
  );

  select rls_test.assert_raises(
    'an agent must not attach intelligence to another agent''s observation',
    $q$insert into public.observation_market_intelligence (
        observation_id, availability, agent_user_id)
      values ((select id from public.price_observations
        where source_reference = 'field-session-price'), 'scarce',
        '44444444-4444-4444-4444-444444444444')$q$
  );
rollback;


-- =============================================================================
-- 10n. The evidence bucket
--
-- The evidence is private: the bucket is not public, the path proves which
-- observation a file belongs to, and the link is signed and short-lived.
-- =============================================================================
begin;
  select rls_test.assert_true(
    (select public from storage.buckets where id = 'hatsi360-evidence') = false,
    'the evidence bucket must not be public'
  );

  select rls_test.assert_true(
    (select file_size_limit = 5242880 from storage.buckets where id = 'hatsi360-evidence'),
    'the evidence bucket must carry the size limit'
  );

  select rls_test.assert_true(
    (select count(*) from storage.buckets
      where id = 'hatsi360-evidence'
        and 'image/jpeg' = any(allowed_mime_types)) = 1,
    'the evidence bucket must allow the photograph types'
  );
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

  -- The object is written under the observation's own folder, which is what
  -- the storage policy proves ownership from.
  insert into storage.objects (bucket_id, name, owner)
  values ('hatsi360-evidence', 'bbbbbbbb-0000-0000-0000-000000000005/price-board.jpg',
          '33333333-3333-3333-3333-333333333333');

  select rls_test.assert_true(
    (select count(*) from storage.objects
      where bucket_id = 'hatsi360-evidence') = 1,
    'the agent should be able to write evidence for their own draft'
  );

  -- The signed link is short-lived and points at the stored path.
  select rls_test.assert_true(
    (select public.agent_evidence_url(
        (select id from public.price_observation_evidence
          where observation_id = 'bbbbbbbb-0000-0000-0000-000000000005'))
        like '%hatsi360-evidence/bbbbbbbb-0000-0000-0000-000000000005/price-board.jpg%'),
    'the signed link should point at the stored evidence'
  );

  select rls_test.assert_true(
    (select public.agent_evidence_url(
        (select id from public.price_observation_evidence
          where observation_id = 'bbbbbbbb-0000-0000-0000-000000000005'))
        like '%expires=300%'),
    'the signed link should expire'
  );
rollback;

-- =============================================================================
-- 10o. Another agent's evidence is out of reach
-- =============================================================================
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

  select rls_test.assert_raises(
    'an agent must not be able to sign a link to another agent''s evidence',
    $q$select public.agent_evidence_url(
        (select id from public.price_observation_evidence
          where observation_id = 'bbbbbbbb-0000-0000-0000-000000000005'))$q$
  );

  select rls_test.assert_raises(
    'an agent must not be able to write into another agent''s evidence folder',
    $q$insert into storage.objects (bucket_id, name, owner)
      values ('hatsi360-evidence',
              'bbbbbbbb-0000-0000-0000-000000000005/price-board.jpg',
              '44444444-4444-4444-4444-444444444444')$q$
  );

  select rls_test.assert_true(
    (select count(*) from storage.objects
      where bucket_id = 'hatsi360-evidence') = 0,
    'an agent must not be able to read another agent''s evidence object'
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
  'bbbbbbbb-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000003',
  'bbbbbbbb-0000-0000-0000-000000000004'
);

delete from public.collection_task_events
where task_id in (select id from public.collection_tasks where id in (901, 902));

delete from storage.objects where bucket_id = 'hatsi360-evidence';

delete from public.price_observations where source_system = 'test_fixture';

delete from public.collection_tasks where id in (901, 902);

delete from public.market_collection_schedules
where assigned_agent_id = '33333333-3333-3333-3333-333333333333';

delete from public.market_agent_assignments
where (user_id, market_id) in (
  ('33333333-3333-3333-3333-333333333333', 1),
  ('44444444-4444-4444-4444-444444444444', 1),
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
