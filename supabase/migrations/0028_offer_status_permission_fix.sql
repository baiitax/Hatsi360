-- 0028_offer_status_permission_fix.sql
--
-- Corrective migration.
--
-- The end-to-end test of the offer workflow found that `update_offer_status`
-- performed no permission check of its own. Any authenticated user could call
-- it and verify their own offer, which would have published an unverified
-- commercial commitment as a verified opportunity.
--
-- The RLS policies stopped them writing the row directly, but the workflow
-- function was `security definer` and ran with the privileges of its owner, so
-- RLS never applied to it. The function is the bypass.
--
-- The fix is the check brief §21 asks for: the permission is enforced in the
-- function itself, not only in the interface. Migration 0027 has been corrected
-- so a fresh database gets the right version; this migration applies the same
-- corrected function to databases that already ran 0027.
--
-- `create or replace` is idempotent, so re-running this is harmless.

begin;

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

  -- Only staff may change an offer's status. Without this check the function
  -- is a privilege-escalation path: any authenticated user could verify their
  -- own offer and have it published as a verified commercial opportunity.
  if not public.is_staff() then
    raise exception 'Only staff may change an offer status'
      using errcode = '42501';
  end if;

  -- A rejection must carry a reason. Enforced here, not in the interface.
  if p_to_status = 'rejected' and (p_reason is null or length(btrim(p_reason)) < 10) then
    raise exception 'A rejection requires a reason of at least 10 characters'
      using errcode = '22023';
  end if;

  -- Read the current state with a row lock so two concurrent decisions cannot
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

  -- A verified offer cannot be silently reverted. Moving it back to draft or
  -- submitted is a correction, and must say so.
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
  'The only path that changes an offer status. Restricted to staff, and writes the verification event and the audit entry in the same call, so a status cannot change without a record.';

commit;
