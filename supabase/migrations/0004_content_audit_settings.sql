-- =============================================================================
-- Pluck Live — 0004 articles, audit log and system settings
-- =============================================================================

-- ---------------------------------------------------------- article content --
create table if not exists public.article_categories (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

create table if not exists public.articles (
  id             bigint generated always as identity primary key,
  slug           text not null unique,
  title          text not null,
  excerpt        text,
  body           text,
  cover_image_path text,
  category_id    bigint references public.article_categories (id) on delete set null,
  author_id      uuid references public.profiles (id) on delete set null,
  author_name    text,
  commodity_id   bigint references public.commodities (id) on delete set null,
  market_id      bigint references public.markets (id) on delete set null,
  is_published   boolean not null default false,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists articles_published_idx on public.articles (published_at desc) where is_published;
create index if not exists articles_category_idx on public.articles (category_id);

-- -------------------------------------------------------------- audit log ---
create table if not exists public.audit_logs (
  id            bigint generated always as identity primary key,
  actor_id      uuid references public.profiles (id) on delete set null,
  actor_role    public.user_role,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  before_data   jsonb,
  after_data    jsonb,
  reason        text,
  ip_hash       text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

comment on table public.audit_logs is
  'Append-only record of consequential administrative actions: who did what, when, and why.';

-- -------------------------------------------------------- system settings ---
create table if not exists public.system_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

comment on table public.system_settings is
  'Operational configuration such as freshness windows, required evidence rules and rate limits.';

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();
