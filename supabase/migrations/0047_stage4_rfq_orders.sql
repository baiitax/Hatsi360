-- 0047_stage4_rfq_orders.sql
--
-- Stage 4: Trade Features - RFQ (Request for Quote) and Order Management
--
-- This migration adds:
-- 1. RFQ (Request for Quote) system - buyers can request quotes from suppliers
-- 2. Quote responses - suppliers can respond to RFQs
-- 3. Order management - convert accepted quotes to orders
-- 4. Supplier profiles - extended profile information for trade participants
--
-- Design principles:
-- - RFQs are separate from buyer_offers (RFQs are requests, offers are responses)
-- - Orders are created from accepted quotes, not created independently
-- - Supplier profiles extend the base profiles table for trade participants
-- - All tables follow existing patterns: RLS, audit trails, verification workflows

begin;

-- ================================================================
-- 1. SUPPLIER PROFILES (extends profiles for trade participants)
-- ================================================================

create table if not exists public.supplier_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  
  -- Business information
  business_name text not null,
  business_type text not null check (business_type in ('farmer', 'trader', 'processor', 'exporter', 'importer', 'distributor', 'warehouse', 'other')),
  registration_number text,
  tax_id text,
  
  -- Contact information
  contact_person text,
  contact_email text,
  contact_phone text,
  whatsapp_number text,
  
  -- Location
  address text,
  city text,
  state_id bigint references public.states(id),
  country_code text not null default 'NG',
  postal_code text,
  
  -- Business details
  year_established integer check (year_established >= 1900 and year_established <= extract(year from now())),
  employee_count text check (employee_count in ('1-10', '11-50', '51-200', '201-500', '500+')),
  annual_revenue_range text check (annual_revenue_range in ('<10M', '10M-50M', '50M-200M', '200M-1B', '>1B')),
  
  -- Trade capabilities
  commodities_traded bigint[] default '{}', -- Array of commodity IDs
  markets_served bigint[] default '{}', -- Array of market IDs
  min_order_quantity numeric(18,4),
  max_order_quantity numeric(18,4),
  lead_time_days integer,
  payment_terms text[] default '{"Advance"}',
  
  -- Quality and certifications
  quality_certifications text[] default '{}', -- ISO, HACCP, etc.
  export_license_number text,
  storage_capacity_mt numeric(18,4),
  
  -- Verification and trust
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'suspended', 'rejected')),
  verification_level integer not null default 0 check (verification_level >= 0 and verification_level <= 3),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  
  -- Ratings and reputation
  average_rating numeric(3,2) check (average_rating >= 0 and average_rating <= 5),
  total_transactions integer default 0,
  response_rate numeric(5,2) default 0, -- percentage
  response_time_hours numeric(6,2) default 0,
  
  -- Profile completeness
  profile_completeness integer not null default 0 check (profile_completeness >= 0 and profile_completeness <= 100),
  
  -- Status
  is_active boolean not null default true,
  is_featured boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_profiles_business_name_idx on public.supplier_profiles(business_name);
create index if not exists supplier_profiles_business_type_idx on public.supplier_profiles(business_type);
create index if not exists supplier_profiles_verification_status_idx on public.supplier_profiles(verification_status);
create index if not exists supplier_profiles_is_active_idx on public.supplier_profiles(is_active);
create index if not exists supplier_profiles_average_rating_idx on public.supplier_profiles(average_rating);
create index if not exists supplier_profiles_state_idx on public.supplier_profiles(state_id);

comment on table public.supplier_profiles is
  'Extended profile information for trade participants (suppliers). Links to base profiles table.';

-- ================================================================
-- 2. REQUESTS FOR QUOTE (RFQ)
-- ================================================================

create type if not exists public.rfq_status as enum (
  'draft',
  'published',
  'closed',
  'awarded',
  'cancelled',
  'expired'
);

create table if not exists public.rfqs (
  id uuid primary key default gen_random_uuid(),
  
  -- Requester
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  buyer_organization_id uuid references public.organizations(id) on delete set null,
  
  -- What is being requested
  title text not null,
  description text not null,
  commodity_id bigint not null references public.commodities(id) on delete restrict,
  grade_id bigint references public.commodity_grades(id) on delete set null,
  variety_id bigint references public.commodity_varieties(id) on delete set null,
  
  -- Quantity and unit
  quantity numeric(18,4) not null check (quantity > 0),
  unit_id bigint not null references public.measurement_units(id) on delete restrict,
  
  -- Delivery requirements
  delivery_location text,
  market_id bigint references public.markets(id) on delete set null,
  state_id bigint references public.states(id) on delete set null,
  delivery_date date,
  delivery_terms text, -- FOB, CIF, etc.
  
  -- Quality requirements
  quality_requirements text,
  certifications_required text[] default '{}',
  
  -- Budget and pricing
  budget_min numeric(18,4),
  budget_max numeric(18,4),
  currency_code char(3) not null default 'NGN',
  price_type public.price_type default 'spot',
  
  -- Timeline
  valid_from timestamptz not null default now(),
  valid_until timestamptz not null,
  
  -- Contact information
  contact_name text,
  contact_email text,
  contact_phone text,
  
  -- Status and management
  status public.rfq_status not null default 'draft',
  is_public boolean not null default true, -- Can all suppliers see this?
  invited_supplier_ids uuid[] default '{}', -- If not public, which suppliers?
  
  -- Results
  selected_quote_id uuid, -- Reference to winning quote
  awarded_at timestamptz,
  notes text,
  
  -- Metadata
  view_count integer not null default 0,
  quote_count integer not null default 0,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rfqs_buyer_id_idx on public.rfqs(buyer_id);
create index if not exists rfqs_commodity_id_idx on public.rfqs(commodity_id);
create index if not exists rfqs_status_idx on public.rfqs(status);
create index if not exists rfqs_valid_until_idx on public.rfqs(valid_until);
create index if not exists rfqs_created_at_idx on public.rfqs(created_at desc);

comment on table public.rfqs is
  'Requests for Quote (RFQs) from buyers seeking supplier quotes for commodities.';

-- ================================================================
-- 3. QUOTES (Responses to RFQs)
-- ================================================================

create type if not exists public.quote_status as enum (
  'draft',
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'withdrawn',
  'expired'
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  
  -- References
  rfq_id uuid not null references public.rfqs(id) on delete cascade,
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Pricing
  unit_price numeric(18,4) not null check (unit_price > 0),
  currency_code char(3) not null default 'NGN',
  price_type public.price_type not null default 'spot',
  
  -- Quantity
  offered_quantity numeric(18,4) not null check (offered_quantity > 0),
  
  -- Delivery
  delivery_date date,
  delivery_location text,
  delivery_terms text,
  lead_time_days integer,
  
  -- Quality and specifications
  grade_id bigint references public.commodity_grades(id) on delete set null,
  variety_id bigint references public.commodity_varieties(id) on delete set null,
  quality_certifications text[] default '{}',
  quality_notes text,
  
  -- Payment terms
  payment_terms text,
  payment_method text,
  
  -- Validity
  valid_until timestamptz not null,
  
  -- Additional information
  message text, -- Message to buyer
  attachments text[] default '{}', -- URLs to documents
  
  -- Status
  status public.quote_status not null default 'draft',
  
  -- Evaluation
  buyer_rating integer check (buyer_rating >= 1 and buyer_rating <= 5),
  buyer_feedback text,
  
  -- Conversion to order
  converted_to_order_id uuid, -- Will reference orders table
  converted_at timestamptz,
  
  -- Timestamps
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_rfq_id_idx on public.quotes(rfq_id);
create index if not exists quotes_supplier_id_idx on public.quotes(supplier_id);
create index if not exists quotes_status_idx on public.quotes(status);
create index if not exists quotes_valid_until_idx on public.quotes(valid_until);

comment on table public.quotes is
  'Quotes submitted by suppliers in response to RFQs.';

-- ================================================================
-- 4. ORDERS (Created from accepted quotes)
-- ================================================================

create type if not exists public.order_status as enum (
  'draft',
  'confirmed',
  'in_progress',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'disputed'
);

create type if not exists public.order_payment_status as enum (
  'pending',
  'partial',
  'paid',
  'refunded'
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  
  -- Order number (human-readable)
  order_number text not null unique,
  
  -- Parties
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  buyer_organization_id uuid references public.organizations(id) on delete set null,
  supplier_id uuid not null references public.profiles(id) on delete restrict,
  
  -- Source
  quote_id uuid references public.quotes(id) on delete set null,
  rfq_id uuid references public.rfqs(id) on delete set null,
  
  -- What is being ordered
  commodity_id bigint not null references public.commodities(id) on delete restrict,
  grade_id bigint references public.commodity_grades(id) on delete set null,
  variety_id bigint references public.commodity_varieties(id) on delete set null,
  
  -- Quantity and pricing
  quantity numeric(18,4) not null check (quantity > 0),
  unit_id bigint not null references public.measurement_units(id) on delete restrict,
  unit_price numeric(18,4) not null check (unit_price > 0),
  currency_code char(3) not null default 'NGN',
  total_amount numeric(18,4) not null check (total_amount > 0),
  
  -- Delivery
  delivery_date date,
  delivery_location text,
  delivery_address text,
  market_id bigint references public.markets(id) on delete set null,
  delivery_terms text,
  tracking_number text,
  
  -- Payment
  payment_terms text,
  payment_status public.order_payment_status not null default 'pending',
  paid_amount numeric(18,4) not null default 0,
  payment_method text,
  invoice_number text,
  
  -- Quality and specifications
  quality_requirements text,
  quality_certifications text[] default '{}',
  
  -- Status
  status public.order_status not null default 'draft',
  cancelled_at timestamptz,
  cancellation_reason text,
  
  -- Completion
  completed_at timestamptz,
  delivered_at timestamptz,
  
  -- Notes and attachments
  buyer_notes text,
  supplier_notes text,
  attachments text[] default '{}',
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_order_number_idx on public.orders(order_number);
create index if not exists orders_buyer_id_idx on public.orders(buyer_id);
create index if not exists orders_supplier_id_idx on public.orders(supplier_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_commodity_id_idx on public.orders(commodity_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

comment on table public.orders is
  'Purchase orders created from accepted quotes. Tracks the full order lifecycle.';

-- ================================================================
-- 5. ORDER EVENTS (Audit trail)
-- ================================================================

create type if not exists public.order_event_type as enum (
  'created',
  'confirmed',
  'updated',
  'status_changed',
  'payment_received',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'dispute_opened',
  'dispute_resolved',
  'note_added'
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type public.order_event_type not null,
  
  -- Who performed the action
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null check (actor_type in ('buyer', 'supplier', 'system')),
  
  -- What changed
  from_status public.order_status,
  to_status public.order_status,
  description text,
  metadata jsonb default '{}',
  
  -- Timestamp
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_id_idx on public.order_events(order_id);
create index if not exists order_events_created_at_idx on public.order_events(created_at desc);
create index if not exists order_events_event_type_idx on public.order_events(event_type);

comment on table public.order_events is
  'Audit trail for order lifecycle events. Append-only.';

-- ================================================================
-- 6. SUPPLIER RATINGS AND REVIEWS
-- ================================================================

create table if not exists public.supplier_reviews (
  id uuid primary key default gen_random_uuid(),
  
  -- Who is reviewing
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Who is being reviewed
  supplier_id uuid not null references public.profiles(id) on delete cascade,
  
  -- What is being reviewed (order or quote)
  order_id uuid references public.orders(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  
  -- Rating
  rating integer not null check (rating >= 1 and rating <= 5),
  
  -- Review content
  title text,
  review_text text,
  
  -- Categories
  quality_rating integer check (quality_rating >= 1 and quality_rating <= 5),
  delivery_rating integer check (delivery_rating >= 1 and delivery_rating <= 5),
  communication_rating integer check (communication_rating >= 1 and communication_rating <= 5),
  value_rating integer check (value_rating >= 1 and value_rating <= 5),
  
  -- Status
  is_verified_purchase boolean not null default false,
  is_public boolean not null default true,
  is_flagged boolean not null default false,
  
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplier_reviews_supplier_id_idx on public.supplier_reviews(supplier_id);
create index if not exists supplier_reviews_reviewer_id_idx on public.supplier_reviews(reviewer_id);
create index if not exists supplier_reviews_rating_idx on public.supplier_reviews(rating);
create index if not exists supplier_reviews_created_at_idx on public.supplier_reviews(created_at desc);

comment on table public.supplier_reviews is
  'Reviews and ratings for suppliers. Can be linked to orders or quotes.';

-- ================================================================
-- 7. HELPER FUNCTIONS
-- ================================================================

-- Function to generate order number
create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  year_part text;
  sequence_part text;
  order_count integer;
begin
  year_part := to_char(now(), 'YY');
  
  -- Get count of orders this year
  select count(*) into order_count
  from public.orders
  where extract(year from created_at) = extract(year from now());
  
  -- Generate sequence (4 digits, zero-padded)
  sequence_part := lpad((order_count + 1)::text, 4, '0');
  
  return 'ORD-' || year_part || '-' || sequence_part;
end;
$$;

comment on function public.generate_order_number() is
  'Generates a unique order number in format ORD-YY-NNNN (e.g., ORD-26-0001)';

-- Function to update RFQ quote count
create or replace function public.update_rfq_quote_count()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' and NEW.status = 'submitted' then
    update public.rfqs
    set quote_count = quote_count + 1,
        updated_at = now()
    where id = NEW.rfq_id;
  elsif TG_OP = 'UPDATE' and OLD.status != 'submitted' and NEW.status = 'submitted' then
    update public.rfqs
    set quote_count = quote_count + 1,
        updated_at = now()
    where id = NEW.rfq_id;
  elsif TG_OP = 'UPDATE' and OLD.status = 'submitted' and NEW.status != 'submitted' then
    update public.rfqs
    set quote_count = quote_count - 1,
        updated_at = now()
    where id = NEW.rfq_id;
  elsif TG_OP = 'DELETE' and OLD.status = 'submitted' then
    update public.rfqs
    set quote_count = quote_count - 1,
        updated_at = now()
    where id = OLD.rfq_id;
  end if;
  
  return NEW;
end;
$$;

-- Trigger for quote count
drop trigger if exists update_rfq_quote_count_trigger on public.quotes;
create trigger update_rfq_quote_count_trigger
after insert or update or delete on public.quotes
for each row execute function public.update_rfq_quote_count();

-- Function to update supplier average rating
create or replace function public.update_supplier_average_rating()
returns trigger
language plpgsql
as $$
begin
  update public.supplier_profiles
  set 
    average_rating = (
      select avg(rating)::numeric(3,2)
      from public.supplier_reviews
      where supplier_id = NEW.supplier_id and is_public = true
    ),
    updated_at = now()
  where id = NEW.supplier_id;
  
  return NEW;
end;
$$;

-- Trigger for supplier rating
drop trigger if exists update_supplier_rating_trigger on public.supplier_reviews;
create trigger update_supplier_rating_trigger
after insert or update on public.supplier_reviews
for each row execute function public.update_supplier_average_rating();

-- Function to update supplier profile completeness
create or replace function public.update_supplier_profile_completeness()
returns trigger
language plpgsql
as $$
declare
  completeness integer := 0;
  fields_completed integer := 0;
  total_fields integer := 10;
begin
  -- Check key fields
  if NEW.business_name is not null then fields_completed := fields_completed + 1; end if;
  if NEW.business_type is not null then fields_completed := fields_completed + 1; end if;
  if NEW.contact_email is not null then fields_completed := fields_completed + 1; end if;
  if NEW.contact_phone is not null then fields_completed := fields_completed + 1; end if;
  if NEW.address is not null then fields_completed := fields_completed + 1; end if;
  if NEW.city is not null then fields_completed := fields_completed + 1; end if;
  if NEW.state_id is not null then fields_completed := fields_completed + 1; end if;
  if array_length(NEW.commodities_traded, 1) > 0 then fields_completed := fields_completed + 1; end if;
  if array_length(NEW.quality_certifications, 1) > 0 then fields_completed := fields_completed + 1; end if;
  if NEW.min_order_quantity is not null then fields_completed := fields_completed + 1; end if;
  
  completeness := (fields_completed * 100) / total_fields;
  
  NEW.profile_completeness := completeness;
  
  return NEW;
end;
$$;

-- Trigger for profile completeness
drop trigger if exists update_supplier_completeness_trigger on public.supplier_profiles;
create trigger update_supplier_completeness_trigger
before insert or update on public.supplier_profiles
for each row execute function public.update_supplier_profile_completeness();

-- Function to create order from quote
create or replace function public.create_order_from_quote(
  p_quote_id uuid,
  p_buyer_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_quote record;
  v_rfq record;
  v_order_id uuid;
  v_order_number text;
begin
  -- Get the quote
  select * into v_quote from public.quotes where id = p_quote_id;
  
  if v_quote.id is null then
    raise exception 'Quote not found';
  end if;
  
  if v_quote.status != 'accepted' then
    raise exception 'Quote must be accepted before creating order';
  end if;
  
  -- Get the RFQ
  select * into v_rfq from public.rfqs where id = v_quote.rfq_id;
  
  if v_rfq.id is null then
    raise exception 'RFQ not found';
  end if;
  
  -- Generate order number
  v_order_number := public.generate_order_number();
  
  -- Create the order
  insert into public.orders (
    order_number,
    buyer_id,
    buyer_organization_id,
    supplier_id,
    quote_id,
    rfq_id,
    commodity_id,
    grade_id,
    variety_id,
    quantity,
    unit_id,
    unit_price,
    currency_code,
    total_amount,
    delivery_date,
    delivery_location,
    market_id,
    delivery_terms,
    payment_terms,
    quality_requirements,
    quality_certifications,
    status,
    buyer_notes
  ) values (
    v_order_number,
    v_rfq.buyer_id,
    v_rfq.buyer_organization_id,
    v_quote.supplier_id,
    v_quote.id,
    v_quote.rfq_id,
    v_rfq.commodity_id,
    coalesce(v_quote.grade_id, v_rfq.grade_id),
    coalesce(v_quote.variety_id, v_rfq.variety_id),
    v_quote.offered_quantity,
    v_rfq.unit_id,
    v_quote.unit_price,
    v_quote.currency_code,
    v_quote.unit_price * v_quote.offered_quantity,
    coalesce(v_quote.delivery_date, v_rfq.delivery_date),
    coalesce(v_quote.delivery_location, v_rfq.delivery_location),
    v_rfq.market_id,
    coalesce(v_quote.delivery_terms, v_rfq.delivery_terms),
    v_quote.payment_terms,
    v_rfq.quality_requirements,
    v_rfq.certifications_required,
    'confirmed',
    p_buyer_notes
  )
  returning id into v_order_id;
  
  -- Update quote with order reference
  update public.quotes
  set converted_to_order_id = v_order_id,
      converted_at = now()
  where id = p_quote_id;
  
  -- Update RFQ status
  update public.rfqs
  set status = 'awarded',
      selected_quote_id = p_quote_id,
      awarded_at = now()
  where id = v_quote.rfq_id;
  
  -- Create order event
  insert into public.order_events (
    order_id,
    event_type,
    actor_id,
    actor_type,
    to_status,
    description
  ) values (
    v_order_id,
    'created',
    v_rfq.buyer_id,
    'buyer',
    'confirmed',
    'Order created from accepted quote'
  );
  
  -- Update supplier transaction count
  update public.supplier_profiles
  set total_transactions = total_transactions + 1,
      updated_at = now()
  where id = v_quote.supplier_id;
  
  return v_order_id;
end;
$$;

comment on function public.create_order_from_quote(uuid, text) is
  'Creates an order from an accepted quote. Updates RFQ status and supplier metrics.';

-- Function to expire old RFQs
create or replace function public.expire_old_rfqs()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
begin
  update public.rfqs
  set status = 'expired',
      updated_at = now()
  where status = 'published'
    and valid_until < now();
  
  get diagnostics v_count = row_count;
  
  return v_count;
end;
$$;

comment on function public.expire_old_rfqs() is
  'Expires RFQs that have passed their valid_until date.';

-- ================================================================
-- 8. ROW LEVEL SECURITY
-- ================================================================

-- Enable RLS on all new tables
alter table public.supplier_profiles enable row level security;
alter table public.rfqs enable row level security;
alter table public.quotes enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.supplier_reviews enable row level security;

-- Supplier profiles: users can read all active suppliers
drop policy if exists supplier_profiles_select on public.supplier_profiles;
create policy supplier_profiles_select on public.supplier_profiles
for select
using (is_active = true and verification_status = 'verified');

-- Supplier profiles: users can update their own
drop policy if exists supplier_profiles_update_own on public.supplier_profiles;
create policy supplier_profiles_update_own on public.supplier_profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

-- Supplier profiles: users can insert their own
drop policy if exists supplier_profiles_insert_own on public.supplier_profiles;
create policy supplier_profiles_insert_own on public.supplier_profiles
for insert
with check (id = auth.uid());

-- RFQs: buyers can manage their own
drop policy if exists rfqs_select_own on public.rfqs;
create policy rfqs_select_own on public.rfqs
for select
using (buyer_id = auth.uid());

-- RFQs: suppliers can see published RFQs
drop policy if exists rfqs_select_published on public.rfqs;
create policy rfqs_select_published on public.rfqs
for select
using (
  status = 'published' 
  and (is_public = true or auth.uid() = any(invited_supplier_ids))
);

-- RFQs: buyers can insert their own
drop policy if exists rfqs_insert on public.rfqs;
create policy rfqs_insert on public.rfqs
for insert
with check (buyer_id = auth.uid());

-- RFQs: buyers can update their own drafts
drop policy if exists rfqs_update_own on public.rfqs;
create policy rfqs_update_own on public.rfqs
for update
using (buyer_id = auth.uid() and status in ('draft', 'published'));

-- Quotes: suppliers can manage their own
drop policy if exists quotes_select_own on public.quotes;
create policy quotes_select_own on public.quotes
for select
using (supplier_id = auth.uid());

-- Quotes: buyers can see quotes for their RFQs
drop policy if exists quotes_select_buyer on public.quotes;
create policy quotes_select_buyer on public.quotes
for select
using (
  exists (
    select 1 from public.rfqs
    where rfqs.id = quotes.rfq_id
    and rfqs.buyer_id = auth.uid()
  )
);

-- Quotes: suppliers can insert quotes for published RFQs
drop policy if exists quotes_insert on public.quotes;
create policy quotes_insert on public.quotes
for insert
with check (
  supplier_id = auth.uid()
  and exists (
    select 1 from public.rfqs
    where rfqs.id = quotes.rfq_id
    and rfqs.status = 'published'
  )
);

-- Quotes: suppliers can update their own drafts
drop policy if exists quotes_update_own on public.quotes;
create policy quotes_update_own on public.quotes
for update
using (supplier_id = auth.uid() and status in ('draft', 'submitted'));

-- Orders: buyers and suppliers can see their orders
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
for select
using (buyer_id = auth.uid() or supplier_id = auth.uid());

-- Orders: buyers can create orders
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
for insert
with check (buyer_id = auth.uid());

-- Orders: buyers and suppliers can update their orders
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
for update
using (buyer_id = auth.uid() or supplier_id = auth.uid());

-- Order events: anyone involved can see events
drop policy if exists order_events_select on public.order_events;
create policy order_events_select on public.order_events
for select
using (
  exists (
    select 1 from public.orders
    where orders.id = order_events.order_id
    and (orders.buyer_id = auth.uid() or orders.supplier_id = auth.uid())
  )
);

-- Order events: system can insert events (via functions)
drop policy if exists order_events_insert on public.order_events;
create policy order_events_insert on public.order_events
for insert
with check (true);

-- Reviews: anyone can read public reviews
drop policy if exists supplier_reviews_select on public.supplier_reviews;
create policy supplier_reviews_select on public.supplier_reviews
for select
using (is_public = true);

-- Reviews: buyers can create reviews
drop policy if exists supplier_reviews_insert on public.supplier_reviews;
create policy supplier_reviews_insert on public.supplier_reviews
for insert
with check (reviewer_id = auth.uid());

-- Reviews: reviewers can update their own
drop policy if exists supplier_reviews_update on public.supplier_reviews;
create policy supplier_reviews_update on public.supplier_reviews
for update
using (reviewer_id = auth.uid());

-- ================================================================
-- 9. GRANTS
-- ================================================================

grant select on public.supplier_profiles to authenticated;
grant select, insert, update on public.supplier_profiles to authenticated;

grant select, insert, update on public.rfqs to authenticated;
grant select, insert, update on public.quotes to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_events to authenticated;
grant select, insert, update on public.supplier_reviews to authenticated;

-- Grant execute on helper functions
grant execute on function public.generate_order_number() to authenticated;
grant execute on function public.create_order_from_quote(uuid, text) to authenticated;
grant execute on function public.expire_old_rfqs() to authenticated;

-- ================================================================
-- 10. INDEXES FOR PERFORMANCE
-- ================================================================

-- Composite indexes for common queries
create index if not exists rfqs_commodity_status_idx on public.rfqs(commodity_id, status);
create index if not exists rfqs_buyer_status_idx on public.rfqs(buyer_id, status);
create index if not exists quotes_rfq_status_idx on public.quotes(rfq_id, status);
create index if not exists orders_buyer_status_idx on public.orders(buyer_id, status);
create index if not exists orders_supplier_status_idx on public.orders(supplier_id, status);

commit;
