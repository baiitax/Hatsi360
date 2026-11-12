-- =============================================================================
-- GonaPulse — 0016 commercial entitlements and brand settings
-- =============================================================================
-- The commercial architecture, expressed as database rules rather than as
-- interface switches.
--
-- Design notes
--   * An entitlement is a *key* ("reports", "api", "exports", "watchlists",
--     "alerts", "bulk"). A tier is a bundle of keys. The tier names in the
--     product (public / professional / enterprise) are a product concept; the
--     database stores keys so a future tier can be introduced without a
--     migration.
--   * Entitlements are resolved from `customer_subscriptions`, and only from a
--     subscription that is active or trialing and has not expired.
--   * Nothing here grants an entitlement to anybody. It defines how an
--     entitlement is *checked*. Granting one is an operator action recorded in
--     the audit log, and it only becomes meaningful once a commercial
--     agreement exists — no payment provider is configured.
--   * The helper functions are `security definer` with a fixed search path so
--     a policy can call them without granting table access to the caller.
-- =============================================================================

-- ---------------------------------------------------------------- entitlements --

-- The entitlement keys the platform recognises.
--
-- `watchlists`, `alerts` and `exports` are customer-workspace capabilities.
-- `reports` unlocks premium market intelligence. `api` unlocks programmatic
-- access beyond the public read scope. `bulk` unlocks large exports.
create table if not exists public.entitlement_catalog (
  key         text primary key,
  label       text not null,
  description text,
  sort_order  integer not null default 100,
  created_at  timestamptz not null default now()
);

comment on table public.entitlement_catalog is
  'The entitlement keys the platform recognises. A tier is a bundle of these keys.';

insert into public.entitlement_catalog (key, label, description, sort_order)
values
  ('watchlists', 'Saved watchlists',
   'Save commodities and markets and follow them from the customer workspace.', 10),
  ('alerts', 'Price alerts',
   'Be notified when a watched commodity or market crosses a threshold.', 20),
  ('exports', 'CSV and spreadsheet exports',
   'Download the underlying observations rather than only the summary.', 30),
  ('reports', 'Premium market intelligence',
   'Read premium reports and extended historical series.', 40),
  ('api', 'API access',
   'Programmatic access with a scoped key beyond the public read scope.', 50),
  ('bulk', 'Bulk data',
   'Large historical exports and bulk retrieval.', 60)
on conflict (key) do update
  set label = excluded.label,
      description = excluded.description,
      sort_order = excluded.sort_order;

-- ------------------------------------------------------- entitlement resolver --

-- The entitlement keys held by the calling user.
--
-- Only a subscription in `active` or `trialing` status counts, and only while
-- it has not expired. An expired, cancelled or `past_due` subscription grants
-- nothing. A `past_due` subscription is deliberately excluded: the product
-- must not keep serving a paid capability after payment has failed.
create or replace function public.user_entitlements()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct k.key
  from public.customer_subscriptions s
  cross join lateral jsonb_each(coalesce(s.entitlements, '{}'::jsonb)) as e(k, v)
  join public.entitlement_catalog c on c.key = e.k
  where s.user_id = auth.uid()
    and s.status in ('active', 'trialing')
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at > now())
    and (s.trial_ends_at is null or s.trial_ends_at > now())
    and coalesce(e.v, 'false')::boolean;
$$;

comment on function public.user_entitlements() is
  'The entitlement keys held by the calling user. Expired or unpaid subscriptions grant nothing.';

-- Does the calling user hold an entitlement?
create or replace function public.has_entitlement(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_entitlements() e where e = p_key
  );
$$;

comment on function public.has_entitlement(text) is
  'True when the calling user holds the named entitlement.';

-- The entitlements attached to a specific API application.
--
-- An application inherits its owner's entitlements; it never carries its own.
-- That is deliberate: revoking a subscription revokes every key issued under
-- it, without the operator having to hunt down individual applications.
create or replace function public.api_application_entitlements(p_application_id uuid)
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select public.user_entitlements()
  where exists (
    select 1 from public.api_applications a
    where a.id = p_application_id
      and a.user_id = auth.uid()
  );
$$;

-- ----------------------------------------------------------- tier definitions --

-- The proposed tiers, stored as key bundles.
--
-- `is_available` is false for the paid tiers. The product must not present a
-- tier as purchasable until a payment provider and commercial terms exist.
create table if not exists public.entitlement_tiers (
  id           text primary key,
  name         text not null,
  summary      text,
  entitlements text[] not null default '{}',
  is_available boolean not null default false,
  sort_order   integer not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.entitlement_tiers is
  'Proposed access tiers. is_available is false until a payment provider and commercial terms exist.';

insert into public.entitlement_tiers (id, name, summary, entitlements, is_available, sort_order)
values
  ('public', 'Public access',
   'Everything needed to see what a market is paying today, at no cost and without registration.',
   '{}', true, 10),
  ('professional', 'Professional intelligence',
   'Extended history, advanced comparison, watchlists, alerts, exports and market dashboards.',
   array['watchlists','alerts','exports','reports'], false, 20),
  ('enterprise', 'Enterprise intelligence',
   'API access with scoped keys, bulk data, custom reports and bespoke coverage.',
   array['watchlists','alerts','exports','reports','api','bulk'], false, 30)
on conflict (id) do update
  set name = excluded.name,
      summary = excluded.summary,
      entitlements = excluded.entitlements,
      is_available = excluded.is_available,
      sort_order = excluded.sort_order;

-- ------------------------------------------------------------ brand settings --

-- The product identity, stored so that operational surfaces (the Control
-- Centre settings screen, exported reports, generated documents) resolve the
-- same name the website does.
--
-- These are seeded values, not a legal statement of corporate structure. The
-- ownership wording is deliberately non-specific; authorised personnel must
-- approve the final legal language before it is published.
insert into public.system_settings (key, value, description)
values
  ('brand.name', '"GonaPulse"'::jsonb, 'The product name.'),
  ('brand.descriptor', '"Agricultural Market Intelligence"'::jsonb,
   'The category line shown under the wordmark.'),
  ('brand.tagline', '"Know the market. Move with confidence."'::jsonb,
   'The product strapline.'),
  ('brand.endorsement', '"Powered by Pluck Agro"'::jsonb,
   'The subordinate corporate endorsement.'),
  ('brand.ownership_statement',
   '"GonaPulse is an independent agricultural market intelligence platform powered by Pluck Agro."'::jsonb,
   'Ownership wording. Requires approval by authorised personnel before legal publication.'),
  ('brand.operating_market', '"Northern Nigeria"'::jsonb,
   'The market the collection network currently covers.'),
  ('brand.expansion', '"Nationwide Nigeria, followed by other African agricultural markets."'::jsonb,
   'The stated expansion ambition. A plan, never a coverage claim.')
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description;

-- ------------------------------------------------------------------- RLS ------

alter table public.entitlement_catalog enable row level security;
alter table public.entitlement_tiers enable row level security;

-- The catalog and the tier definitions are readable by everyone: a reader
-- needs to know what a capability is called in order to ask for it.
drop policy if exists entitlement_catalog_public_read on public.entitlement_catalog;
create policy entitlement_catalog_public_read on public.entitlement_catalog
  for select to anon, authenticated
  using (true);

drop policy if exists entitlement_tiers_public_read on public.entitlement_tiers;
create policy entitlement_tiers_public_read on public.entitlement_tiers
  for select to anon, authenticated
  using (true);

-- Only an administrator may change what a tier contains.
drop policy if exists entitlement_tiers_admin_write on public.entitlement_tiers;
create policy entitlement_tiers_admin_write on public.entitlement_tiers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A subscription's entitlements are writable only by an administrator, and the
-- change is audited by the caller.
drop policy if exists subscriptions_admin_write on public.customer_subscriptions;
create policy subscriptions_admin_write on public.customer_subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The premium-report policy now resolves through the shared entitlement
-- resolver, so the database and the server agree on exactly one rule.
drop policy if exists reports_public_read on public.market_reports;
create policy reports_public_read on public.market_reports
  for select to anon, authenticated
  using (
    (not is_premium and published_at is not null)
    or public.is_staff()
    or public.has_entitlement('reports')
  );

-- ------------------------------------------------------------- audit hooks ---

-- Granting or revoking an entitlement is a commercial act and must leave a
-- trace in the audit log like any other privileged change.
create or replace function public.log_entitlement_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entitlements is distinct from old.entitlements then
    insert into public.audit_logs (
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      reason
    ) values (
      auth.uid(),
      public.current_role(),
      'subscription.entitlements_changed',
      'customer_subscription',
      new.id::text,
      jsonb_build_object('entitlements', old.entitlements, 'plan', old.plan, 'status', old.status),
      jsonb_build_object('entitlements', new.entitlements, 'plan', new.plan, 'status', new.status),
      'Entitlements changed by an administrator.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists subscriptions_log_entitlement_change on public.customer_subscriptions;
create trigger subscriptions_log_entitlement_change
  after update on public.customer_subscriptions
  for each row execute function public.log_entitlement_change();

-- ------------------------------------------------------------------ grants ---

grant select on public.entitlement_catalog to anon, authenticated;
grant select on public.entitlement_tiers to anon, authenticated;
grant insert, update, delete on public.entitlement_tiers to authenticated;
grant execute on function public.user_entitlements() to anon, authenticated;
grant execute on function public.has_entitlement(text) to anon, authenticated;
grant execute on function public.api_application_entitlements(uuid) to authenticated;
