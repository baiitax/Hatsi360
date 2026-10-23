-- =============================================================================
-- 0014_test_fixture_source_value.sql
--
-- The dedicated source value for a synthetic row created by the permission
-- suites.
--
-- PostgreSQL will not let a new enum value be *used* in the same transaction
-- that adds it, so the value is added here and consumed by migration 0015.
-- =============================================================================

begin;

do $$ begin
  alter type public.observation_source add value 'test_fixture';
exception when duplicate_object then null; end $$;

comment on type public.observation_source is
  'Where an observation came from. ''test_fixture'' marks a synthetic row created by the permission suites; such a row is never publicly readable.';

commit;
