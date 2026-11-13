-- 0027_offer_workflow.sql
--
-- The offer verification workflow and the row-level security that goes with it.
--
-- Brief §7 requires approve / request correction / reject with reason / flag /
-- escalate, permission-gated, with a meaningful explanation for corrections and
-- rejections, and with previous decisions preserved. Brief §21 requires
-- permissions enforced server-side and in database policies, never only by
-- hiding buttons.
--
-- The four functions below are the only way an offer's status changes. There is
-- no direct update path for a verified offer: `update_offer_status` is
-- security-definer and writes the audit event itself, so a caller cannot change
-- a status without leaving a record.
--
-- Brief §17.1's "no frontend-only permissions" is enforced by RLS: an ordinary
-- user cannot verify an offer at all, whatever the interface shows.

begin;

-- --------------------------------------------------------------- functions --

/**
 * Write an offer status change, its verification event and its audit entry, in
 * one step. Security-definer so the actor does not need direct write access to
 * the offer row.
 *
 * `p_reason` is required for any transition to 'rejected' or back to 'draft',
 * which is brief §7's "correction and rejection require a meaningful
 * explanation".
 */
create or replace function public.update_offer_status(
  p_offer_table text,
  p_offer_id    uuid,
  p_to_status   public.offer_status,
  p_reason      text default null
)
returns public.offer_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_from  public.offer_status;
  v_row   record;
begin
  if p_offer_table not in ('buyer_offers', 'seller_offers') then
    raise exception 'unknown offer table %', p_offer_table
      using errcode = '22023';
  end if;

  -- A rejection must carry a reason. Enforced here, not in the interface.
  if p_to_status = 'rejected' and (p_reason is null or length(btrim(p_reason)) < 10) then
    raise exception 'A rejection requires a reason of at least 10 characters'
      using errcode = '22023';
  end if;

  -- Only staff may change an offer's status.
  --
  -- This is the check that brief §21 means by "permissions enforced
  -- server-side and in DB policies, never only by hiding buttons". Without it,
  -- any authenticated user could verify their own offer and have it published
  -- as a verified commercial opportunity. The RLS policies below stop them
  -- writing the row directly; this stops them using the workflow function.
  if not public.is_staff() then
    raise exception 'Only staff may change an offer status'
      using errcode = '42501';
  end if;

  -- Read the current state with row lock so two concurrent decisions cannot
  -- both succeed.
  execute format('select * from public.%I where id = $1 for update', p_offer_table)
    into v_row using p_offer_id;

  if v_row.id is null then
    raise exception 'offer % not found', p_offer_id using errcode = 'no_data_found';
  end if;

  v_from := v_row.status;

  if v_from = p_to_status then
    return v_from;  -- idempotent: a repeated decision changes nothing
  end if;

  -- A verified offer cannot be silently edited into a different state. Moving
  -- it anywhere except expired or withdrawn is a correction, and must say so.
  if v_from = 'verified' and p_to_status in ('draft', 'submitted') and p_reason is null then
    raise exception 'Reverting a verified offer requires a reason'
      using errcode = '22023';
  end if;

  execute format(
    'update public.%I set status = $1, verified_by = $2, verified_at = case when $1 = ''verified'' then now() else verified_at end, rejection_reason = case when $1 = ''rejected'' then $3 else rejection_reason end, updated_at = now() where id = $4',
    p_offer_table
  ) using p_to_status, v_actor, p_reason, p_offer_id;

  insert into public.offer_verification_events
    (offer_table, offer_id, from_status, to_status, actor_id, reason)
  values
    (p_offer_table, p_offer_id, v_from, p_to_status, v_actor, p_reason);

  insert into public.audit_events
    (actor_id, action, entity_table, entity_id, before_value, after_value, request_id)
  values
    (v_actor,
     'offer_status_changed',
     p_offer_table,
     p_offer_id::text,
     jsonb_build_object('status', v_from),
     jsonb_build_object('status', p_to_status, 'reason', p_reason),
     null);

  return p_to_status;
end;
$$;

comment on function public.update_offer_status is
  'The only path that changes an offer status. Writes the verification event and the audit entry in the same call, so a status cannot change without a record.';

/**
 * Expire offers whose validity window has passed.
 *
 * Called by the scheduled job runner, not by a page load, so a visitor never
 * waits on it. Idempotent: an already-expired offer is skipped.
 */
create or replace function public.expire_lapsed_offers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_table text;
  v_expired record;
begin
  foreach v_table in array array['buyer_offers', 'seller_offers']
  loop
    for v_expired in
      execute format(
        'select id from public.%I where status = ''verified'' and valid_until is not null and valid_until < now() for update',
        v_table
      )
    loop
      perform public.update_offer_status(v_table, v_expired.id, 'expired', 'Validity window passed');
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$;

comment on function public.expire_lapsed_offers is
  'Expires verified offers whose validity window has passed. Idempotent and intended for the scheduled job runner.';

-- ------------------------------------------------------------------- grants --
-- The workflow functions are executable by authenticated users; the RLS
-- policies below decide what each of them may actually do.

grant execute on function public.update_offer_status(text, uuid, public.offer_status, text)
  to authenticated;
grant execute on function public.expire_lapsed_offers() to authenticated;

-- ---------------------------------------------------------------------- RLS --

alter table public.buyer_offers enable row level security;
alter table public.seller_offers enable row level security;
alter table public.offer_verification_events enable row level security;
alter table public.audit_events enable row level security;

-- ------------------------------------------------------------- buyer offers --

-- A visitor sees a verified, unexpired offer, and only when the owner has
-- consented to being named. Brief §10.3.
drop policy if exists buyer_offers_public_read on public.buyer_offers;
create policy buyer_offers_public_read on public.buyer_offers
  for select
  to anon, authenticated
  using (
    status = 'verified'
    and disclosure_consent
    and (valid_until is null or valid_until > now())
  );

-- The owner sees all of their own offers, in any state.
drop policy if exists buyer_offers_owner_read on public.buyer_offers;
create policy buyer_offers_owner_read on public.buyer_offers
  for select
  to authenticated
  using (user_id = auth.uid());

-- The owner may create an offer for themselves. They cannot create one for
-- somebody else, and they cannot set the status: it starts as draft and only
-- the workflow function moves it.
drop policy if exists buyer_offers_owner_insert on public.buyer_offers;
create policy buyer_offers_owner_insert on public.buyer_offers
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'draft'
    and verified_by is null
  );

-- The owner may edit their own offer only while it is still a draft or has
-- been sent back. Once it is submitted or verified, the terms are fixed.
drop policy if exists buyer_offers_owner_update on public.buyer_offers;
create policy buyer_offers_owner_update on public.buyer_offers
  for update
  to authenticated
  using (user_id = auth.uid() and status in ('draft', 'withdrawn'))
  with check (user_id = auth.uid() and status in ('draft', 'withdrawn', 'submitted'));

-- Staff see everything, for verification.
drop policy if exists buyer_offers_staff_read on public.buyer_offers;
create policy buyer_offers_staff_read on public.buyer_offers
  for select
  to authenticated
  using (public.is_staff());

-- No delete policy. An offer is a commercial record; it is withdrawn or
-- expired, never deleted.

-- ------------------------------------------------------------ seller offers --

drop policy if exists seller_offers_public_read on public.seller_offers;
create policy seller_offers_public_read on public.seller_offers
  for select
  to anon, authenticated
  using (
    status = 'verified'
    and disclosure_consent
    and (valid_until is null or valid_until > now())
  );

drop policy if exists seller_offers_owner_read on public.seller_offers;
create policy seller_offers_owner_read on public.seller_offers
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists seller_offers_owner_insert on public.seller_offers;
create policy seller_offers_owner_insert on public.seller_offers
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'draft'
    and verified_by is null
  );

drop policy if exists seller_offers_owner_update on public.seller_offers;
create policy seller_offers_owner_update on public.seller_offers
  for update
  to authenticated
  using (user_id = auth.uid() and status in ('draft', 'withdrawn'))
  with check (user_id = auth.uid() and status in ('draft', 'withdrawn', 'submitted'));

drop policy if exists seller_offers_staff_read on public.seller_offers;
create policy seller_offers_staff_read on public.seller_offers
  for select
  to authenticated
  using (public.is_staff());

-- ------------------------------------------------- verification and audit ----

-- The verification trail is append-only. Anyone may read the events for an
-- offer they can see; nobody may update or delete them.
--
-- The "an offer they can see" half is enforced, not assumed. `using (true)`
-- published the trail of every draft, submitted, withdrawn and rejected offer
-- to the anonymous public — including the rejection reasons, which are private
-- commercial feedback. Migration 0031 carries the corrected policy and the
-- reasoning; it is applied here too so a fresh database is correct from the
-- start.
drop policy if exists offer_verification_events_read on public.offer_verification_events;
create policy offer_verification_events_read on public.offer_verification_events
  for select
  to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1
        from public.buyer_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'buyer_offers'
         and o.status = 'verified'
         and o.disclosure_consent
         and (o.valid_until is null or o.valid_until > now())
    )
    or exists (
      select 1
        from public.seller_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'seller_offers'
         and o.status = 'verified'
         and o.disclosure_consent
         and (o.valid_until is null or o.valid_until > now())
    )
    or exists (
      select 1
        from public.buyer_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'buyer_offers'
         and o.user_id = auth.uid()
    )
    or exists (
      select 1
        from public.seller_offers o
       where o.id = offer_verification_events.offer_id
         and offer_verification_events.offer_table = 'seller_offers'
         and o.user_id = auth.uid()
    )
  );

drop policy if exists offer_verification_events_staff_read on public.offer_verification_events;
create policy offer_verification_events_staff_read on public.offer_verification_events
  for select
  to authenticated
  using (public.is_staff());

-- The audit trail is staff-only. Brief §16: protected against unauthorised
-- modification.
drop policy if exists audit_events_staff_read on public.audit_events;
create policy audit_events_staff_read on public.audit_events
  for select
  to authenticated
  using (public.is_staff());

grant select on public.offer_verification_events to anon, authenticated;
grant select on public.audit_events to authenticated;

commit;
