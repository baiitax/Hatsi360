-- ============================================================================
-- Hatsi360 — 0054 least-privilege anonymous grants (PROPOSED; Phase 2 of 2)
-- ============================================================================
-- STATUS: NOT APPLIED, AND DELIBERATELY NOT IN supabase/migrations/.
--
-- This file lives outside the migration chain so that `npm run verify:migrations`
-- does not apply it: the chain must stay green while this is a proposal.
--
-- Prerequisites before this can be applied anywhere:
--
--   1. The RLS permission suite must accept privilege denial as well as policy
--      denial for anonymous write attempts. `rls_test.assert_no_rows_affected`
--      currently requires the statement to run and affect zero rows; after this
--      migration the same attempt raises `42501 permission denied`. The
--      assertion's intent ("anon cannot rewrite X") is preserved either way,
--      but the helper needs an `or denied` form, and every anon-context use
--      (e.g. tests/rls/permission-tests.sql:870) needs to switch to it. That is
--      a test change to be reviewed on its own, not smuggled in here.
--   2. The full six-context entitlement matrix and the staging acceptance run
--      must pass with this applied, because anonymous read of the public
--      surface is exactly what it rewrites.
--   3. A staging project must exist. It does not yet (see the readiness report).
--
-- Measured target, derived from policies that reach `anon` rather than from
-- what is currently granted:
--
--   SELECT  36 tables + 2 published-read views
--   INSERT   1 table (contact_enquiries)
--   UPDATE   0, DELETE 0
--   TRUNCATE / REFERENCES / TRIGGER / MAINTAIN 0 (already removed by 0053)
-- ============================================================================

-- 1. Remove every anonymous privilege on every public relation, then grant
--    back exactly what a policy reaching `anon` requires.
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  loop
    execute format('revoke all on public.%I from anon', r.relname);
  end loop;
end $$;

-- 2. Table read surface.
do $$
declare
  allowed text[] := array[
    'article_categories', 'articles', 'buyer_offers', 'commodities',
    'commodity_categories', 'commodity_fundamentals', 'commodity_grades',
    'commodity_hs_mappings', 'commodity_seasonality', 'commodity_specifications',
    'commodity_synonyms', 'commodity_unit_conversions', 'commodity_varieties',
    'countries', 'entitlement_catalog', 'entitlement_tiers', 'hs_codes',
    'hs_revisions', 'international_trade_records', 'market_commodity_scope',
    'market_operating_schedules', 'market_reports', 'market_zones', 'markets',
    'measurement_units', 'offer_verification_events', 'price_observation_evidence',
    'price_observations', 'price_source_registry', 'seller_offers', 'states',
    'tariff_schedules', 'trade_bloc_memberships', 'trade_blocs',
    'trade_data_sources', 'trade_data_sync_log'
  ];
  name text;
begin
  foreach name in array allowed loop
    if to_regclass(format('public.%I', name)) is not null then
      execute format('grant select on public.%I to anon', name);
    end if;
  end loop;
end $$;

-- 2b. Published-read views are the public data surface (granted in 0006).
do $$
declare
  allowed text[] := array['published_price_observations', 'market_price_summary'];
  name text;
begin
  foreach name in array allowed loop
    if to_regclass(format('public.%I', name)) is not null then
      execute format('grant select on public.%I to anon', name);
    end if;
  end loop;
end $$;

-- 3. The one legitimate anonymous write: the public contact form.
do $$
begin
  if to_regclass('public.contact_enquiries') is not null then
    grant insert on public.contact_enquiries to anon;
  end if;
end $$;

-- 4. Future tables start closed rather than inheriting the platform default.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;

-- 5. Self-check.
do $$
declare
  bad text;
begin
  select string_agg(format('%s(%s)', c.relname, p.priv), ', ')
  into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('UPDATE'), ('DELETE')) as p(priv)
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
    and has_table_privilege('anon', c.oid, p.priv);

  if bad is not null then
    raise exception 'SEC anonymous grants: excess privilege remains on %', bad;
  end if;

  select string_agg(c.relname, ', ')
  into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and has_table_privilege('anon', c.oid, 'INSERT')
    and c.relname <> 'contact_enquiries';

  if bad is not null then
    raise exception 'SEC anonymous grants: unexpected anonymous INSERT on %', bad;
  end if;

  select string_agg(name, ', ')
  into bad
  from unnest(array['published_price_observations', 'market_price_summary']) name
  where to_regclass(format('public.%I', name)) is not null
    and not has_table_privilege('anon', format('public.%I', name), 'SELECT');

  if bad is not null then
    raise exception 'SEC anonymous grants: public read view(s) not granted to anon: %', bad;
  end if;
end $$;
