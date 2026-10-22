-- =============================================================================
-- Pluck Live — 0008 contact enquiries
-- =============================================================================
-- Business and general enquiries submitted through the public contact form.
-- =============================================================================

create table if not exists public.contact_enquiries (
  id           bigint generated always as identity primary key,
  name         text not null,
  email        citext not null,
  organisation text,
  topic        text not null default 'general',
  message      text not null,
  status       text not null default 'new' check (status in ('new','in_progress','closed','spam')),
  handled_by   uuid references public.profiles (id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists contact_enquiries_status_idx
  on public.contact_enquiries (status, created_at desc);

alter table public.contact_enquiries enable row level security;

-- Anyone may submit an enquiry. Nobody may read them except staff.
create policy contact_enquiries_insert on public.contact_enquiries
  for insert to anon, authenticated
  with check (true);

create policy contact_enquiries_staff_read on public.contact_enquiries
  for select to authenticated
  using (public.is_staff());

create policy contact_enquiries_staff_update on public.contact_enquiries
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

grant insert on public.contact_enquiries to anon, authenticated;
grant select, update on public.contact_enquiries to authenticated;
