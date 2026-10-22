-- =============================================================================
-- Pluck Live — 0003 customer, intelligence, alert and API tables
-- =============================================================================
-- Everything that belongs to a paying customer or to a commercial API client.
-- All of these tables are private: the public never reads them directly.
-- =============================================================================

-- ------------------------------------------------------- saved items --------
create table if not exists public.saved_commodities (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  commodity_id bigint not null references public.commodities (id) on delete cascade,
  note         text,
  created_at   timestamptz not null default now(),
  unique (user_id, commodity_id)
);

create table if not exists public.saved_markets (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  market_id bigint not null references public.markets (id) on delete cascade,
  note      text,
  created_at timestamptz not null default now(),
  unique (user_id, market_id)
);

-- ------------------------------------------------------------ alerts --------
create table if not exists public.price_alerts (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  commodity_id   bigint references public.commodities (id) on delete cascade,
  market_id      bigint references public.markets (id) on delete cascade,
  price_type     public.price_type,
  direction      text not null default 'any' check (direction in ('above','below','any')),
  threshold_amount numeric(18, 4) check (threshold_amount is null or threshold_amount > 0),
  threshold_percent numeric(6, 3),
  channel        text not null default 'email' check (channel in ('email','sms','webhook')),
  is_active      boolean not null default true,
  last_triggered_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint price_alerts_target check (commodity_id is not null or market_id is not null)
);

create index if not exists price_alerts_user_idx on public.price_alerts (user_id, is_active);

create table if not exists public.alert_delivery_logs (
  id           bigint generated always as identity primary key,
  alert_id     bigint not null references public.price_alerts (id) on delete cascade,
  observation_id uuid references public.price_observations (id) on delete set null,
  channel      text not null,
  status       text not null check (status in ('sent','failed','skipped')),
  detail       text,
  created_at   timestamptz not null default now()
);

create index if not exists alert_delivery_logs_alert_idx on public.alert_delivery_logs (alert_id, created_at desc);

-- ----------------------------------------------------------- reports --------
create table if not exists public.market_reports (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  title         text not null,
  summary       text,
  body          text,
  commodity_id  bigint references public.commodities (id) on delete set null,
  market_id     bigint references public.markets (id) on delete set null,
  state_id      bigint references public.states (id) on delete set null,
  period_start  date,
  period_end    date,
  is_premium    boolean not null default true,
  published_at  timestamptz,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists market_reports_premium_idx on public.market_reports (is_premium, published_at desc);

create table if not exists public.report_subscriptions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  report_id    bigint not null references public.market_reports (id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, report_id)
);

-- ------------------------------------------------- subscriptions & billing ---
create table if not exists public.customer_subscriptions (
  id                 bigint generated always as identity primary key,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  organization_id    uuid references public.organizations (id) on delete cascade,
  plan               text not null default 'free',
  status             text not null default 'active' check (status in ('trialing','active','past_due','cancelled','expired')),
  starts_at          timestamptz not null default now(),
  ends_at            timestamptz,
  renews_at          timestamptz,
  trial_ends_at      timestamptz,
  entitlements       jsonb not null default '{}'::jsonb,
  external_ref       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists customer_subscriptions_user_idx on public.customer_subscriptions (user_id, status);

create table if not exists public.billing_events (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.profiles (id) on delete set null,
  subscription_id bigint references public.customer_subscriptions (id) on delete set null,
  event_type    text not null,
  amount_amount numeric(18, 2),
  currency_code char(3) not null default 'NGN',
  external_ref  text,
  payload       jsonb not null default '{}'::jsonb,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists billing_events_user_idx on public.billing_events (user_id, occurred_at desc);

-- ------------------------------------------------------- API applications ---
create table if not exists public.api_applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  name           text not null,
  description    text,
  key_prefix     text not null unique,
  key_hash       text not null,
  scopes         text[] not null default '{prices:read}',
  tier           text not null default 'free' check (tier in ('free','standard','enterprise')),
  rate_limit_per_minute integer not null default 60,
  is_active      boolean not null default true,
  expires_at     timestamptz,
  last_used_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists api_applications_user_idx on public.api_applications (user_id);
create index if not exists api_applications_key_hash_idx on public.api_applications (key_hash);

comment on column public.api_applications.key_hash is
  'SHA-256 hash of the secret key. The plaintext secret is shown once at creation and never stored.';

comment on column public.api_applications.key_prefix is
  'First characters of the key, used to look an application up without scanning every hash.';

create table if not exists public.api_usage_logs (
  id                bigint generated always as identity primary key,
  application_id    uuid not null references public.api_applications (id) on delete cascade,
  endpoint          text not null,
  method            text not null,
  status_code       integer not null,
  response_ms       integer,
  ip_hash           text,
  requested_at      timestamptz not null default now()
);

create index if not exists api_usage_logs_application_idx
  on public.api_usage_logs (application_id, requested_at desc);
create index if not exists api_usage_logs_requested_at_idx
  on public.api_usage_logs (requested_at desc);

comment on table public.api_usage_logs is
  'Per-request usage log for rate limiting, quota reporting and abuse investigation. IPs are stored hashed.';

do $$
declare t text;
begin
  foreach t in array array['price_alerts','market_reports','customer_subscriptions','api_applications'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t);
  end loop;
end $$;
