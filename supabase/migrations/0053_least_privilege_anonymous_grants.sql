-- ============================================================================
-- Hatsi360 — 0053 revoke what RLS cannot police (PROPOSED; Phase 1 of 2)
-- ============================================================================
-- Prepared under the staging-and-security workstream authorisation of
-- 2026-11-26. **Not applied to production or staging.** It is part of the
-- repository chain so that it is exercised by `npm run verify:migrations` and
-- the RLS/workflow suites; that is a local throwaway database, not a hosted
-- project.
--
-- Evidence: docs/improvement/ANONYMOUS_PRIVILEGE_AUDIT.md
--
-- WHY THIS IS PHASE 1
--
-- Every table created in `public` inherits `anon=arwdDxtm` from the platform's
-- default privileges — granted independently by both `postgres` and
-- `supabase_admin` (measured in production's `pg_default_acl`). Production
-- consequently has 73 of 80 public tables granting `anon` SELECT, INSERT,
-- UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER.
--
-- Three of those seven privileges cannot be policed at all:
--
--   TRUNCATE    row security is never applied to it (the SEC-01 lesson)
--   REFERENCES  lets the grantee point a foreign key at the table
--   TRIGGER     lets the grantee attach behaviour to it
--   MAINTAIN    PostgreSQL 17: VACUUM/ANALYZE/CLUSTER — not row-scoped either
--
-- Removing them is pure loss-reduction: no policy and no application path in
-- this repository uses them, so there is no functional change to verify.
--
-- DML grants are deliberately left in place here. They are currently
-- neutralised by policy predicates, but "granted and denied by policy" is a
-- weaker posture than "not granted". Revoking them changes how a denial is
-- reported (0 rows versus `42501`) and the repository's RLS permission suite
-- asserts the 0-row form in several places, so that change needs its own
-- reviewed test update. It is written up, unapplied, in
-- supabase/proposed/0054_anonymous_dml_revocation.sql.
--
-- Pooled `service_role` and `postgres` are untouched: both need TRUNCATE for
-- maintenance and neither is reachable from a browser.
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm')
  loop
    execute format(
      'revoke truncate, references, trigger, maintain on public.%I from anon, authenticated',
      r.relname
    );
  end loop;
end $$;

-- Stop future tables inheriting it. This binds relations created by the role
-- that runs migrations (`postgres`); `supabase_admin`'s own defaults are
-- outside this file's reach and are recorded as a residual risk.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- Self-check: a migration that silently under-delivers is worse than one that
-- fails loudly.
do $$
declare
  bad text;
begin
  select string_agg(format('%s(%s)', c.relname, p.priv), ', ')
  into bad
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as p(priv)
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm')
    and (
      has_table_privilege('anon', c.oid, p.priv)
      or has_table_privilege('authenticated', c.oid, p.priv)
    );

  if bad is not null then
    raise exception 'SEC anonymous grants: unpoliced privilege remains on %', bad;
  end if;
end $$;

comment on schema public is
  'Hatsi360 public schema. TRUNCATE/REFERENCES/TRIGGER are not held by anon or authenticated (0053): row security cannot police them.';
