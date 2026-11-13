-- 0026_commercial_offers.sql
--
-- Buyer and seller offers.
--
-- Brief §6.1 C and D describe verified buyer offers and verified seller
-- offers. Neither existed in the schema, which is why the audit classified
-- best-buy and best-sell as blocked and reframed them as "lowest verified
-- observation".
--
-- This migration adds them, with the verification workflow that makes them
-- trustworthy. The design constraint that shapes everything here:
--
--   AN OFFER IS NOT A PRICE OBSERVATION.
--
--   A price observation is a fact about a market, collected by an agent.
--   An offer is a commitment by a named party to trade at a stated price.
--   They are different claims with different evidentiary requirements, and
--   merging them would let an unverified offer leak into public price
--   intelligence as though it were a collected price.
--
-- So the two live in their own tables, have their own status enum, their own
-- verification events, and are NEVER joined into the published price series
-- unless they are explicitly verified AND the source is registered as
-- eligible.
--
-- Brief §10.3: "Do not publish private buyer or seller information without
-- authorisation." So every offer carries a disclosure flag, and the public
-- read policy only exposes offers whose owner has consented.

begin;

-- ------------------------------------------------------------------ enums ---
-- Declared before use. PostgreSQL forbids using a new enum value in the
-- transaction that added it, so these come first.

do $$ begin
  create type public.offer_status as enum (
    'draft',          -- being prepared, invisible to everyone but the owner
    'submitted',      -- lodged for verification
    'verified',       -- checked by staff; eligible for publication
    'rejected',       -- refused; retained with a reason
    'expired',        -- validity window passed
    'withdrawn'       -- withdrawn by the owner before verification
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_side as enum ('buy', 'sell');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------- buyer offers -
-- Brief §6.1 C: actual buyer procurement prices, with buyer or organisation
-- reference, market or delivery location, commodity, grade, unit, quantity
-- requirement, price, currency, offer validity, delivery conditions and
-- verification status.

create table if not exists public.buyer_offers (
  id              uuid primary key default gen_random_uuid(),

  -- Who made the offer. Either a platform account or a named organisation.
  user_id         uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  -- The name to show publicly, when the owner has consented to disclosure.
  counterparty_name text not null,

  -- What is wanted.
  commodity_id    bigint not null references public.commodities (id) on delete restrict,
  grade_id        bigint references public.commodity_grades (id) on delete set null,
  variety_id      bigint references public.commodity_varieties (id) on delete set null,

  -- The price, in its own unit and currency. Never normalised on write: the
  -- reported figure is the contract figure.
  price_amount    numeric(18, 4) not null check (price_amount > 0),
  price_type      public.price_type not null,
  unit_id         bigint not null references public.measurement_units (id) on delete restrict,
  currency_code   char(3) not null default 'NGN',

  -- How much, and how it is delivered.
  quantity_required numeric(18, 4) check (quantity_required is null or quantity_required > 0),
  quantity_unit_id  bigint references public.measurement_units (id) on delete restrict,

  -- Where the buyer will take delivery. A market is optional: a processor may
  -- collect at the farm gate.
  market_id       bigint references public.markets (id) on delete set null,
  delivery_location text,
  delivery_terms  text,

  -- When the offer is open.
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,

  -- Quality requirements beyond the grade, in the buyer's words.
  quality_requirements text,
  notes           text,

  -- Verification.
  status          public.offer_status not null default 'draft',
  verified_by     uuid references public.profiles (id) on delete set null,
  verified_at     timestamptz,
  rejection_reason text,

  -- Whether the counterparty consents to being named publicly. Brief §10.3.
  disclosure_consent boolean not null default false,

  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- An offer must have a party. An anonymous offer is not a commercial fact.
  constraint buyer_offers_has_party check (user_id is not null or organization_id is not null),
  -- A rejection must say why.
  constraint buyer_offers_rejection_reason check (
    status <> 'rejected' or rejection_reason is not null
  ),
  -- A validity window must run forwards.
  constraint buyer_offers_validity_window check (
    valid_until is null or valid_until > valid_from
  )
);

create index if not exists buyer_offers_commodity_idx
  on public.buyer_offers (commodity_id, status);
create index if not exists buyer_offers_market_idx
  on public.buyer_offers (market_id) where market_id is not null;
create index if not exists buyer_offers_owner_idx
  on public.buyer_offers (user_id) where user_id is not null;
create index if not exists buyer_offers_validity_idx
  on public.buyer_offers (valid_until) where status = 'verified';

comment on table public.buyer_offers is
  'Verified buyer procurement offers. Kept separate from price_observations because an offer is a commitment by a named party, not a market fact collected by an agent. Publicly readable only when verified and the owner has consented to disclosure.';

-- ------------------------------------------------------------ seller offers -
-- Brief §6.1 D: actual seller offers, with seller reference, commodity,
-- available quantity, grade, price, market or warehouse location, delivery
-- terms, offer validity and verification status.

create table if not exists public.seller_offers (
  id              uuid primary key default gen_random_uuid(),

  user_id         uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  counterparty_name text not null,

  commodity_id    bigint not null references public.commodities (id) on delete restrict,
  grade_id        bigint references public.commodity_grades (id) on delete set null,
  variety_id      bigint references public.commodity_varieties (id) on delete set null,

  price_amount    numeric(18, 4) not null check (price_amount > 0),
  price_type      public.price_type not null,
  unit_id         bigint not null references public.measurement_units (id) on delete restrict,
  currency_code   char(3) not null default 'NGN',

  -- How much is actually available, which is the seller's claim.
  quantity_available numeric(18, 4) check (quantity_available is null or quantity_available > 0),
  quantity_unit_id   bigint references public.measurement_units (id) on delete restrict,

  market_id       bigint references public.markets (id) on delete set null,
  warehouse_location text,
  delivery_terms  text,

  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,

  quality_requirements text,
  notes           text,

  status          public.offer_status not null default 'draft',
  verified_by     uuid references public.profiles (id) on delete set null,
  verified_at     timestamptz,
  rejection_reason text,

  disclosure_consent boolean not null default false,

  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint seller_offers_has_party check (user_id is not null or organization_id is not null),
  constraint seller_offers_rejection_reason check (
    status <> 'rejected' or rejection_reason is not null
  ),
  constraint seller_offers_validity_window check (
    valid_until is null or valid_until > valid_from
  )
);

create index if not exists seller_offers_commodity_idx
  on public.seller_offers (commodity_id, status);
create index if not exists seller_offers_market_idx
  on public.seller_offers (market_id) where market_id is not null;
create index if not exists seller_offers_owner_idx
  on public.seller_offers (user_id) where user_id is not null;
create index if not exists seller_offers_validity_idx
  on public.seller_offers (valid_until) where status = 'verified';

comment on table public.seller_offers is
  'Verified seller offers. Kept separate from price_observations because an offer is a commitment by a named party, not a market fact collected by an agent. Publicly readable only when verified and the owner has consented to disclosure.';

-- ------------------------------------------------------- verification trail -
-- Brief §7 and §16 require an append-only record of every decision, with the
-- actor, the action, the reason and the timestamp. Offers get the same
-- treatment observations already have.

create table if not exists public.offer_verification_events (
  id             bigint generated always as identity primary key,
  offer_table    text not null check (offer_table in ('buyer_offers', 'seller_offers')),
  offer_id       uuid not null,

  from_status    public.offer_status,
  to_status      public.offer_status not null,

  actor_id       uuid references public.profiles (id) on delete set null,
  reason         text,

  created_at     timestamptz not null default now()
);

create index if not exists offer_verification_events_offer_idx
  on public.offer_verification_events (offer_table, offer_id, created_at desc);

comment on table public.offer_verification_events is
  'Append-only record of every offer status change. Never updated or deleted; a correction appends a new event rather than rewriting history.';

-- ------------------------------------------------------------- audit trail --
create table if not exists public.audit_events (
  id             bigint generated always as identity primary key,

  actor_id       uuid references public.profiles (id) on delete set null,
  action         text not null,

  -- What was acted on. Free-form so an event can reference an offer, an
  -- observation, a setting or a user without the schema knowing each.
  entity_table   text,
  entity_id      text,

  -- Before and after, for anything that changed a value.
  before_value   jsonb,
  after_value    jsonb,

  -- The request that caused it, for correlation.
  request_id     text,

  created_at     timestamptz not null default now()
);

create index if not exists audit_events_actor_idx
  on public.audit_events (actor_id, created_at desc);
create index if not exists audit_events_entity_idx
  on public.audit_events (entity_table, entity_id, created_at desc);

comment on table public.audit_events is
  'Append-only audit trail. before_value and after_value must never contain a password, token or secret.';

commit;
