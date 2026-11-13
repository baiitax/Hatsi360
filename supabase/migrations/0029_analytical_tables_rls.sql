-- 0029_analytical_tables_rls.sql
--
-- Corrective migration.
--
-- The cold-start migration validator runs all migrations into an empty
-- PostgreSQL instance and asserts that every table has row-level security
-- enabled. It failed with:
--
--     FAILED: tables without RLS: commodity_fundamentals, commodity_seasonality,
--             commodity_specifications, price_source_registry
--
-- Migration 0024 created those four tables with no policies at all. On a table
-- without RLS, `anon` and `authenticated` get full write access through the
-- grants Supabase issues by default. That would have let any user rewrite the
-- platform's specifications, seasonal calendars and fundamentals — the sourced
-- intelligence the public pages are supposed to be able to trust.
--
-- 0024 has been corrected so a fresh database gets the policies. This migration
-- applies the same policies to a database that already ran 0024.
--
-- Policy shape:
--   read  — everyone, including `anon`. These are reference material displayed
--           on public price pages.
--   write — staff only. A fabricated fundamental would be shown to the public
--           as sourced intelligence, which brief §12 and non-negotiable #12
--           prohibit.
--
-- `create or replace policy` and `enable row level security` are idempotent, so
-- re-running this migration is harmless.

begin;

alter table public.commodity_specifications enable row level security;
alter table public.commodity_seasonality       enable row level security;
alter table public.commodity_fundamentals      enable row level security;
alter table public.price_source_registry       enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'commodity_specifications', 'commodity_seasonality',
    'commodity_fundamentals', 'price_source_registry'
  ]
  loop
    execute format($f$drop policy if exists %1$I_read on public.%1$I$f$, t);
    execute format($f$drop policy if exists %1$I_write on public.%1$I$f$, t);
    execute format($f$create policy %1$I_read on public.%1$I
      for select
      using (true)$f$, t);
    execute format($f$create policy %1$I_write on public.%1$I
      for all
      using (public.is_staff())
      with check (public.is_staff())$f$, t);
  end loop;
end
$$;

commit;
