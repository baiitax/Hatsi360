-- =============================================================================
-- Hatsi360 — 0049 WhatsApp alerts waitlist
-- =============================================================================
-- Visitors leave a WhatsApp number on the homepage to join the market-alerts
-- list. WhatsApp delivery is wired as a notification adapter but is not
-- connected in this deployment, so the list is a *waitlist*: a number is stored
-- only when the person consents, and nothing is sent from here.
--
-- Two rules shape the table:
--
--   1. **Consent is part of the record, not a checkbox in the UI only.** A row
--      cannot exist without `consent_at` and the wording that was agreed to, so
--      the record can answer "when did this person agree, and to what?" long
--      after the form has changed.
--   2. **The browser cannot read it, and cannot write it directly.** Row Level
--      Security is enabled with no policy for `anon` or `authenticated`; the
--      only writer is the server action, using the service role, after it has
--      validated and normalised the number. Staff can read the list.
-- =============================================================================

begin;

create table if not exists public.whatsapp_subscribers (
  id            bigint generated always as identity primary key,

  -- The number in E.164, e.g. +2348031234567. Normalised before insert so the
  -- same person cannot be stored twice under two spellings.
  phone_e164    text not null,
  -- The number as the visitor typed it, kept for resolving disputes.
  phone_entered text,

  status        text not null default 'pending'
                  check (status in ('pending', 'active', 'unsubscribed')),

  -- When, and to what, the person agreed. Never null: a row without consent is
  -- not a record we are willing to hold.
  consent_at    timestamptz not null default now(),
  consent_text  text not null,

  -- Where it came from, so a future channel can be audited.
  source        text not null default 'homepage',
  user_agent    text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint whatsapp_subscribers_e164_format
    check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$')
);

comment on table public.whatsapp_subscribers is
  'People who asked to be messaged on WhatsApp about market alerts. WhatsApp delivery is not connected in this deployment; the list is a waitlist and nothing is sent from it automatically.';

comment on column public.whatsapp_subscribers.consent_text is
  'The exact wording the person agreed to. Stored with the row so consent can be evidenced later.';

-- One row per number, so a second submission updates rather than duplicates.
create unique index if not exists whatsapp_subscribers_phone_key
  on public.whatsapp_subscribers (phone_e164);

-- The list's own reading order: who is waiting, newest first.
create index if not exists whatsapp_subscribers_status_idx
  on public.whatsapp_subscribers (status, created_at desc);

drop trigger if exists whatsapp_subscribers_set_updated_at on public.whatsapp_subscribers;
create trigger whatsapp_subscribers_set_updated_at
  before update on public.whatsapp_subscribers
  for each row execute function public.set_updated_at();

alter table public.whatsapp_subscribers enable row level security;

-- No insert, update or delete policy: the form's write goes through the server
-- action with the service role, where the number has already been validated.
-- Direct writes from the browser are refused by RLS.

-- Staff can read the list, so it can be worked from the application rather than
-- only from the SQL console.
drop policy if exists whatsapp_subscribers_staff_read on public.whatsapp_subscribers;
create policy whatsapp_subscribers_staff_read on public.whatsapp_subscribers
  for select to authenticated
  using (public.is_staff());

grant select on public.whatsapp_subscribers to authenticated;

commit;
