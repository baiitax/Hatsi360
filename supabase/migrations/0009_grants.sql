-- =============================================================================
-- Pluck Live — 0009 table grants
-- =============================================================================
-- Row Level Security only filters rows a role can already reach. Without
-- explicit grants, `anon` and `authenticated` receive "permission denied for
-- table" instead of an empty or filtered result, and the policies are never
-- evaluated at all.
--
-- Every grant below is deliberately coarse at the table level and precise at
-- the row level: the RLS policies in 0005 decide which rows a role may see.
-- =============================================================================

-- ------------------------------------------------------- reference data ----
-- Public by design: geography, taxonomy and units carry no prices and no
-- secrets. Read-only for everyone.
grant select on
  public.countries,
  public.states,
  public.market_zones,
  public.markets,
  public.market_operating_schedules,
  public.commodity_categories,
  public.commodities,
  public.commodity_varieties,
  public.commodity_grades,
  public.commodity_synonyms,
  public.measurement_units,
  public.commodity_unit_conversions
to anon, authenticated;

-- ------------------------------------------------------ price observations --
grant select on public.price_observations to anon, authenticated;
grant insert, update, delete on public.price_observations to authenticated;

grant select on public.price_observation_evidence to anon, authenticated;
grant insert, update on public.price_observation_evidence to authenticated;

grant select on public.price_verification_events to authenticated;
grant insert on public.price_verification_events to authenticated;

grant select on public.price_revision_history to authenticated;
grant insert on public.price_revision_history to authenticated;

grant select on public.data_quality_flags to anon, authenticated;
grant insert on public.data_quality_flags to authenticated;

-- ------------------------------------------------------------- operations --
grant select, insert, update on
  public.market_agent_assignments,
  public.collection_batches,
  public.collection_tasks,
  public.market_visit_records
to authenticated;

-- ------------------------------------------------------------- identities --
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on
  public.organizations,
  public.organization_members
to authenticated;

-- ---------------------------------------------------- customer intelligence --
grant select, insert, update, delete on
  public.saved_commodities,
  public.saved_markets,
  public.price_alerts,
  public.alert_delivery_logs,
  public.market_reports,
  public.customer_subscriptions,
  public.billing_events,
  public.api_applications,
  public.api_usage_logs
to authenticated;

-- ---------------------------------------------------------- content & ops --
grant select on public.article_categories to anon, authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update on public.articles to authenticated;

grant select on public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated;

grant select on public.system_settings to authenticated;

-- ------------------------------------------------ contact enquiries (0008) --
grant insert on public.contact_enquiries to anon, authenticated;
grant select, update on public.contact_enquiries to authenticated;

-- ------------------------------------------------------- service role -----
-- The service role bypasses RLS (it has BYPASSRLS). It is used only on the
-- server, for administration and usage logging — never in the browser.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
