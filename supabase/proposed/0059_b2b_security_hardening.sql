-- ============================================================================
-- Hatsi360 — 0059 B2B security hardening (PROPOSED, UNAPPLIED)
-- ============================================================================
-- Applies to the objects created by 0047_stage4_rfq_orders.sql, which is
-- UNAPPLIED in production. This file MUST NOT be applied on its own, and 0047
-- must not be applied without it. Apply both in one transaction:
--
--   begin;
--     \i supabase/migrations/0047_stage4_rfq_orders.sql
--     \i supabase/proposed/0059_b2b_security_hardening.sql
--   commit;
--
-- Defects corrected (Phase 3 B2B review §4, §6):
--   B-1  create_order_from_quote had no caller check: any authenticated user
--        holding an accepted quote id could create the order.
--   B-2  the same function is SECURITY DEFINER without a fixed search_path.
--   B-3  expire_old_rfqs() was executable by every authenticated user.
--   B-4  no transition guard: any party could write any order_status.
--   B-5  no party restriction on who may change status.
--   B-6  suppliers could set their own verification_status/level (self-
--        verification), because the update policy is row-scoped, not
--        column-scoped.
--   B-7  order_events_insert used WITH CHECK (true): any authenticated user
--        could forge audit events on any order.
--   B-8  orders_insert let a buyer insert an order directly, bypassing the
--        quote flow, with any supplier and any amount.
--
-- PRINCIPLE: audit events are written by triggers and definer functions only.
-- A party can drive a transition; it cannot author its own evidence.
-- ============================================================================

-- ------------------------------------------------ B-6 supplier verification --
-- SECURITY INVOKER on purpose: the guard must see the CALLER's role. As a
-- definer function current_user would be the owner and the internal-context
-- short-circuit would disable the check entirely.
create or replace function public.guard_supplier_verification()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_internal boolean := current_user not in ('authenticated', 'anon');
begin
  if not v_internal and not public.is_staff() then
    if new.verification_status is distinct from old.verification_status
       or new.verification_level is distinct from old.verification_level
       or new.total_transactions is distinct from old.total_transactions
       or new.average_rating is distinct from old.average_rating
       or new.profile_completeness is distinct from old.profile_completeness then
      raise exception
        'supplier_profiles: verification and reputation fields are staff-controlled.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists supplier_profiles_guard_verification on public.supplier_profiles;
create trigger supplier_profiles_guard_verification
  before update on public.supplier_profiles
  for each row execute function public.guard_supplier_verification();

-- The directory is for signed-in users. Without `to authenticated` the policy
-- also applied to anon, exposing verified suppliers' contact details.
drop policy if exists supplier_profiles_select on public.supplier_profiles;
create policy supplier_profiles_select on public.supplier_profiles
  for select to authenticated
  using (is_active = true and verification_status = 'verified');

-- A supplier must be able to read its own row whatever its verification state.
-- Without this, 0047's update policy is unusable: PostgreSQL applies the SELECT
-- policy to the columns an UPDATE reads, so a supplier still 'pending' could
-- not edit its own profile at all (UPDATE matched 0 rows, silently).
drop policy if exists supplier_profiles_select_own on public.supplier_profiles;
create policy supplier_profiles_select_own on public.supplier_profiles
  for select to authenticated
  using (id = auth.uid());

-- ------------------------------------------------ B-1/B-2 order from quote --
create or replace function public.create_order_from_quote(
  p_quote_id uuid,
  p_buyer_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quote record;
  v_rfq record;
  v_order_id uuid;
  v_order_number text;
  v_caller uuid := auth.uid();
begin
  select * into v_quote from public.quotes where id = p_quote_id;
  if v_quote.id is null then
    raise exception 'Quote not found' using errcode = 'no_data_found';
  end if;

  if v_quote.status <> 'accepted' then
    raise exception 'Quote must be accepted before creating order' using errcode = '22023';
  end if;

  select * into v_rfq from public.rfqs where id = v_quote.rfq_id;
  if v_rfq.id is null then
    raise exception 'RFQ not found' using errcode = 'no_data_found';
  end if;

  -- B-1: the caller must be the buyer of THIS rfq (or staff acting for them).
  if v_caller is distinct from v_rfq.buyer_id and not public.is_staff() then
    raise exception 'Only the buyer on this RFQ may create an order from its quote.'
      using errcode = '42501';
  end if;

  -- One order per quote, ever.
  if exists (select 1 from public.orders where quote_id = v_quote.id) then
    raise exception 'An order already exists for this quote' using errcode = '23505';
  end if;

  v_order_number := public.generate_order_number();

  insert into public.orders (
    order_number, buyer_id, buyer_organization_id, supplier_id,
    quote_id, rfq_id, commodity_id, grade_id, variety_id,
    quantity, unit_id, unit_price, currency_code, total_amount,
    delivery_date, delivery_location, market_id, delivery_terms,
    payment_terms, quality_requirements, quality_certifications,
    status, buyer_notes
  ) values (
    v_order_number, v_rfq.buyer_id, v_rfq.buyer_organization_id, v_quote.supplier_id,
    v_quote.id, v_quote.rfq_id, v_rfq.commodity_id,
    coalesce(v_quote.grade_id, v_rfq.grade_id),
    coalesce(v_quote.variety_id, v_rfq.variety_id),
    v_quote.offered_quantity, v_rfq.unit_id, v_quote.unit_price,
    v_quote.currency_code, v_quote.unit_price * v_quote.offered_quantity,
    coalesce(v_quote.delivery_date, v_rfq.delivery_date),
    coalesce(v_quote.delivery_location, v_rfq.delivery_location),
    v_rfq.market_id,
    coalesce(v_quote.delivery_terms, v_rfq.delivery_terms),
    v_quote.payment_terms, v_rfq.quality_requirements,
    v_rfq.certifications_required,
    'confirmed', p_buyer_notes
  )
  returning id into v_order_id;

  update public.quotes
  set converted_to_order_id = v_order_id, converted_at = now()
  where id = p_quote_id;

  update public.rfqs
  set status = 'awarded', selected_quote_id = p_quote_id, awarded_at = now()
  where id = v_quote.rfq_id;

  insert into public.order_events (order_id, event_type, actor_id, actor_type, to_status, description)
  values (v_order_id, 'created', v_caller, 'buyer', 'confirmed', 'Order created from accepted quote');

  update public.supplier_profiles
  set total_transactions = total_transactions + 1, updated_at = now()
  where id = v_quote.supplier_id;

  return v_order_id;
end;
$$;

comment on function public.create_order_from_quote(uuid, text) is
  'Creates an order from an accepted quote. Caller must be the RFQ buyer or staff (0059). Fixed search_path; one order per quote.';

-- ------------------------------------------------ B-3 rfq expiry is internal --
create or replace function public.expire_old_rfqs()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  update public.rfqs
  set status = 'expired', updated_at = now()
  where status = 'published'
    and valid_until < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.expire_old_rfqs() from public, anon, authenticated;
grant execute on function public.expire_old_rfqs() to service_role;

-- generate_order_number is not a definer function, but it is only needed from
-- inside one. Close it off and pin its path.
create or replace function public.generate_order_number()
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  year_part text;
  sequence_part text;
  order_count integer;
begin
  year_part := to_char(now(), 'YY');
  select count(*) into order_count
  from public.orders
  where extract(year from created_at) = extract(year from now());
  sequence_part := lpad((order_count + 1)::text, 4, '0');
  return 'ORD-' || year_part || '-' || sequence_part;
end;
$$;

revoke execute on function public.generate_order_number() from public, anon, authenticated;
grant execute on function public.generate_order_number() to service_role;

-- ------------------------------------------ order economics pinned at insert --
-- `orders_insert` lets a buyer insert against their own accepted quote, which
-- is intended. What it does not do is constrain the money columns, so a direct
-- PostgREST insert could name any unit_price/total_amount and then take a legal
-- draft -> confirmed transition. The RPC sets these from the quote; this
-- trigger enforces that every non-privileged insert does the same.
--
-- SECURITY INVOKER: the decision depends on who is inserting, so the caller's
-- role and session identity must be observable.
create or replace function public.pin_order_quote_economics()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_internal boolean := current_user not in ('authenticated', 'anon');
  v_quote public.quotes;
begin
  -- create_order_from_quote() runs as its definer, and staff may correct an
  -- order deliberately; both are trusted paths.
  if v_internal or public.is_staff() then
    return new;
  end if;

  if new.quote_id is null then
    raise exception 'Orders: an order must reference an accepted quote.'
      using errcode = '42501';
  end if;

  select * into v_quote from public.quotes where id = new.quote_id;
  if not found then
    raise exception 'Orders: quote % does not exist.', new.quote_id
      using errcode = '42501';
  end if;
  if v_quote.status <> 'accepted' then
    raise exception 'Orders: quote % is not accepted (status %).', new.quote_id, v_quote.status
      using errcode = '42501';
  end if;

  if new.unit_price is distinct from v_quote.unit_price
     or new.currency_code is distinct from v_quote.currency_code
     or new.quantity is distinct from v_quote.offered_quantity
     or new.total_amount is distinct from v_quote.unit_price * v_quote.offered_quantity then
    raise exception 'Orders: pricing, quantity and currency must come from quote %.', new.quote_id
      using errcode = '42501';
  end if;

  if new.payment_status is distinct from 'pending' or coalesce(new.paid_amount, 0) <> 0 then
    raise exception 'Orders: payment state cannot be set when the order is created.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_pin_quote_economics on public.orders;
create trigger orders_pin_quote_economics
  before insert on public.orders
  for each row execute function public.pin_order_quote_economics();

-- ------------------------------------------------- B-4/B-5/B-8 order guard --
-- SECURITY INVOKER, for the same reason as guard_supplier_verification: the
-- party and transition checks are about the caller, so the caller's role must
-- be observable.
create or replace function public.guard_order_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_internal boolean := current_user not in ('authenticated', 'anon');
  v_allowed text[];
begin
  if v_internal or public.is_staff() then
    return new;
  end if;

  if new.order_number is distinct from old.order_number
     or new.buyer_id is distinct from old.buyer_id
     or new.supplier_id is distinct from old.supplier_id
     or new.quote_id is distinct from old.quote_id
     or new.rfq_id is distinct from old.rfq_id
     or new.total_amount is distinct from old.total_amount
     or new.unit_price is distinct from old.unit_price
     or new.quantity is distinct from old.quantity
     or new.commodity_id is distinct from old.commodity_id then
    raise exception 'Orders: identity and pricing are immutable after creation.'
      using errcode = '42501';
  end if;

  -- Payment state is evidence, not a client-editable field. Until a payment
  -- integration writes these through a trusted path, a buyer must not be able
  -- to declare an order paid. Staff and internal roles returned above.
  if new.payment_status is distinct from old.payment_status
     or new.paid_amount is distinct from old.paid_amount
     or new.payment_method is distinct from old.payment_method
     or new.invoice_number is distinct from old.invoice_number then
    raise exception 'Orders: payment state may only be changed by staff or a payment service.'
      using errcode = '42501';
  end if;

  if auth.uid() is distinct from old.buyer_id and auth.uid() is distinct from old.supplier_id then
    raise exception 'Orders: only the buyer or supplier on this order may change it.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    v_allowed := case old.status
      when 'draft'       then array['confirmed', 'cancelled']
      when 'confirmed'   then array['in_progress', 'cancelled', 'disputed']
      when 'in_progress' then array['shipped', 'cancelled', 'disputed']
      when 'shipped'     then array['delivered', 'disputed']
      when 'delivered'   then array['completed', 'disputed']
      when 'disputed'    then array['completed', 'cancelled']
      else array[]::text[]
    end;

    if new.status::text <> all(v_allowed) then
      raise exception 'Orders: illegal status transition % -> %.', old.status, new.status
        using errcode = '22023';
    end if;

    -- orders has no dispute_reason column; cancellation_reason is the single
    -- free-text reason field on the table, used for both outcomes rather than
    -- changing the schema in a hardening migration.
    if new.status in ('cancelled', 'disputed') and nullif(btrim(coalesce(new.cancellation_reason, '')), '') is null then
      raise exception 'Orders: a reason (cancellation_reason) is required to cancel or dispute an order.'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_guard_transition on public.orders;
create trigger orders_guard_transition
  before update on public.orders
  for each row execute function public.guard_order_transition();

-- Audit trail: written by the trigger, not by the caller (B-7).
create or replace function public.record_order_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_events (
      order_id, event_type, actor_id, actor_type, from_status, to_status, description
    ) values (
      new.id,
      'status_changed',
      auth.uid(),
      case
        when auth.uid() = new.buyer_id then 'buyer'
        when auth.uid() = new.supplier_id then 'supplier'
        else 'system'
      end,
      old.status,
      new.status,
      coalesce(nullif(btrim(coalesce(new.cancellation_reason, '')), ''), 'Status changed')
    );
  end if;
  return null;
end;
$$;

drop trigger if exists orders_record_transition on public.orders;
create trigger orders_record_transition
  after update on public.orders
  for each row execute function public.record_order_transition();

-- B-7/B-8: direct writes must not be able to forge evidence or skip the flow.
drop policy if exists order_events_insert on public.order_events;
drop policy if exists orders_insert on public.orders;

create policy orders_insert on public.orders
  for insert to authenticated
  with check (
    buyer_id = auth.uid()
    and quote_id is not null
    and status = 'draft'
    and exists (
      select 1
      from public.quotes q
      join public.rfqs r on r.id = q.rfq_id
      where q.id = orders.quote_id
        and r.buyer_id = auth.uid()
        and q.status = 'accepted'
    )
  );

-- Events are readable by the parties, writable by nobody through PostgREST.
drop policy if exists order_events_select on public.order_events;
create policy order_events_select on public.order_events
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_events.order_id
        and (o.buyer_id = auth.uid() or o.supplier_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------- self-check --
do $$
declare
  v text;
begin
  if not exists (select 1 from pg_trigger where tgname = 'supplier_profiles_guard_verification') then
    raise exception '0059 self-check failed: supplier verification guard missing';
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'orders_guard_transition') then
    raise exception '0059 self-check failed: order transition guard missing';
  end if;
  if exists (select 1 from pg_policies where schemaname='public' and tablename='order_events' and policyname='order_events_insert') then
    raise exception '0059 self-check failed: order_events still accepts direct inserts';
  end if;

  select pg_get_functiondef(p.oid) into v
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_order_from_quote';
  if position('search_path' in v) = 0 then
    raise exception '0059 self-check failed: create_order_from_quote has no fixed search_path';
  end if;
end $$;
