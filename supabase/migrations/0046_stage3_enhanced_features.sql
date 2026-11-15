-- Stage 3: Enhanced Features & Onboarding
-- Migration 0046: User onboarding and notification preferences

-- ============================================================
-- 1. ADD ONBOARDING TRACKING TO PROFILES
-- ============================================================

-- Add onboarding completion tracking
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Add user interests/preferences as JSONB for flexibility
alter table public.profiles
  add column if not exists interests jsonb not null default '{}'::jsonb;

-- Add onboarding step tracking (for wizard state)
alter table public.profiles
  add column if not exists onboarding_step integer not null default 0;

comment on column public.profiles.onboarding_completed_at is
  'Timestamp when user completed onboarding. NULL means onboarding not started or incomplete.';

comment on column public.profiles.interests is
  'User interests and preferences: commodities, markets, price_alerts frequency, etc.';

comment on column public.profiles.onboarding_step is
  'Current onboarding step (0=not started, 1-5=in progress, 5=complete)';

-- ============================================================
-- 2. CREATE NOTIFICATION PREFERENCES TABLE
-- ============================================================

create table if not exists public.user_notification_preferences (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  
  -- Alert notifications
  price_alerts_enabled    boolean not null default true,
  price_alerts_channels   text[] not null default array['email']::text[],
  
  -- Market report notifications
  reports_enabled         boolean not null default true,
  reports_channels        text[] not null default array['email']::text[],
  
  -- System notifications
  system_enabled          boolean not null default true,
  system_channels         text[] not null default array['email']::text[],
  
  -- Marketing/updates
  marketing_enabled       boolean not null default false,
  marketing_channels      text[] not null default array['email']::text[],
  
  -- Digest preferences
  digest_enabled          boolean not null default false,
  digest_frequency        text not null default 'weekly' 
                          check (digest_frequency in ('daily', 'weekly', 'monthly', 'never')),
  
  -- Quiet hours
  quiet_hours_enabled     boolean not null default false,
  quiet_hours_start       time,
  quiet_hours_end         time,
  quiet_hours_timezone    text not null default 'Africa/Lagos',
  
  -- Metadata
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  
  -- One preferences row per user
  constraint user_notification_preferences_user_unique unique (user_id)
);

create index if not exists user_notification_preferences_user_idx 
  on public.user_notification_preferences (user_id);

comment on table public.user_notification_preferences is
  'Granular notification preferences per user, controlling which notifications are sent via which channels.';

-- ============================================================
-- 3. CREATE ALERT TRIGGER LOGS TABLE
-- ============================================================

create table if not exists public.alert_trigger_logs (
  id                bigint generated always as identity primary key,
  alert_id          bigint not null references public.price_alerts (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  
  -- Trigger details
  trigger_type      text not null check (trigger_type in ('threshold', 'percent_change', 'manual_test')),
  trigger_value     numeric(18, 4),
  trigger_message   text,
  
  -- Price context at trigger time
  commodity_id      bigint references public.commodities (id) on delete set null,
  market_id         bigint references public.markets (id) on delete set null,
  price_at_trigger  numeric(18, 4),
  price_type        text,
  
  -- Delivery status
  delivery_status   text not null default 'pending' 
                    check (delivery_status in ('pending', 'sent', 'failed', 'queued')),
  delivery_channels text[] not null default array[]::text[],
  delivery_errors   text,
  
  -- Timestamps
  triggered_at      timestamptz not null default now(),
  delivered_at      timestamptz,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists alert_trigger_logs_user_idx 
  on public.alert_trigger_logs (user_id, triggered_at desc);

create index if not exists alert_trigger_logs_alert_idx 
  on public.alert_trigger_logs (alert_id, triggered_at desc);

comment on table public.alert_trigger_logs is
  'History of all alert triggers with delivery status and context.';

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on new tables
alter table public.user_notification_preferences enable row level security;
alter table public.alert_trigger_logs enable row level security;

-- Drop existing policies if any (for idempotency)
drop policy if exists "Users can view own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can update own notification preferences" on public.user_notification_preferences;
drop policy if exists "Users can insert own notification preferences" on public.user_notification_preferences;

drop policy if exists "Users can view own alert trigger logs" on public.alert_trigger_logs;

-- Notification preferences policies
create policy "Users can view own notification preferences"
  on public.user_notification_preferences
  for select
  using (auth.uid() = user_id);

create policy "Users can update own notification preferences"
  on public.user_notification_preferences
  for update
  using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
  on public.user_notification_preferences
  for insert
  with check (auth.uid() = user_id);

-- Alert trigger logs policies
create policy "Users can view own alert trigger logs"
  on public.alert_trigger_logs
  for select
  using (auth.uid() = user_id);

-- ============================================================
-- 5. UPDATE PROFILES POLICY FOR ONBOARDING
-- ============================================================

-- Ensure users can update their own onboarding fields
-- This should already be covered by existing policies, but let's be explicit
drop policy if exists "Users can update own profile onboarding" on public.profiles;

create policy "Users can update own profile onboarding"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
create or replace function public.update_notification_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for updated_at
drop trigger if exists trigger_update_notification_preferences_updated_at 
  on public.user_notification_preferences;

create trigger trigger_update_notification_preferences_updated_at
  before update on public.user_notification_preferences
  for each row
  execute function public.update_notification_preferences_updated_at();

-- Function to mark onboarding as complete
create or replace function public.complete_onboarding()
returns void as $$
begin
  update public.profiles
  set 
    onboarding_completed_at = now(),
    onboarding_step = 5,
    updated_at = now()
  where id = auth.uid();
end;
$$ language plpgsql security definer;

-- Function to update onboarding step
create or replace function public.update_onboarding_step(step integer)
returns void as $$
begin
  update public.profiles
  set 
    onboarding_step = step,
    updated_at = now()
  where id = auth.uid();
end;
$$ language plpgsql security definer;

-- ============================================================
-- 7. GRANTS
-- ============================================================

grant select, insert, update on public.user_notification_preferences to authenticated;
grant select on public.alert_trigger_logs to authenticated;

-- Grant execute on functions
grant execute on function public.complete_onboarding() to authenticated;
grant execute on function public.update_onboarding_step(integer) to authenticated;
