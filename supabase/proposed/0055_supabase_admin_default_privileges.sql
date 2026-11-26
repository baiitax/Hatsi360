-- ============================================================================
-- Hatsi360 — 0055 revoke unpoliced privileges from supabase_admin's default ACL
-- ============================================================================
-- STATUS: PROPOSED. NOT APPLIED, AND NOT EXECUTABLE FROM THE ENVIRONMENT THAT
-- PREPARED IT. Kept outside supabase/migrations/ until separately approved.
--
-- WHY THIS EXISTS
--
-- 0053 corrected the default ACL for grantor `postgres`. Production also has a
-- second default-ACL grantor, `supabase_admin`, which still reads:
--
--   {postgres=arwdDxtm/supabase_admin,
--    anon=arwdDxtm/supabase_admin,
--    authenticated=arwdDxtm/supabase_admin,
--    service_role=arwdDxtm/supabase_admin}
--
-- expanded (pg_default_acl + aclexplode) to INSERT, SELECT, UPDATE, DELETE,
-- TRUNCATE, REFERENCES, TRIGGER, MAINTAIN for all four grantees.
--
-- Any table that `supabase_admin` creates in `public` therefore inherits
-- anonymous TRUNCATE — the privilege row-level security cannot police.
--
-- EXECUTION AUTHORITY (why it cannot run from the audit environment)
--
--   supabase_admin            rolsuper = true
--   postgres (session role)   rolsuper = false, not a member of supabase_admin
--   pg_auth_members           no rows for supabase_admin or postgres
--
-- and the statement itself answers:
--
--   ERROR: 42501: permission denied to change default privileges
--
-- `ALTER DEFAULT PRIVILEGES FOR ROLE x` requires membership in `x` or
-- superuser. The authorised path is therefore a credential that is a member of
-- `supabase_admin` (or platform-side execution), not this one.
--
-- DESIGN RULES
--
--   * additive; 0053 is applied and is not touched
--   * scope: the four unpoliced privileges, for anon and authenticated only,
--     on tables, in schema public — nothing else
--   * preserves legitimate defaults: anon/authenticated keep INSERT, SELECT,
--     UPDATE and DELETE; postgres and service_role keep everything, including
--     TRUNCATE, because maintenance needs it
--   * fails loudly: if the role exists but the caller has no authority, this
--     migration raises rather than skipping, because a migration that reports
--     success while doing nothing is worse than one that fails
--   * self-checks afterwards
--
-- RECOVERY (restores the pre-migration state, i.e. the exposure)
--
--   alter default privileges for role supabase_admin in schema public
--     grant truncate, references, trigger, maintain on tables
--     to anon, authenticated;
--
-- PRE-EXECUTION VERIFICATION
--
--   select d.defaclrole::regrole, d.defaclacl
--   from pg_default_acl d
--   where d.defaclnamespace = 'public'::regnamespace and d.defaclobjtype = 'r';
--
-- POST-EXECUTION VERIFICATION
--
--   select a.grantee::regrole::text, a.privilege_type
--   from pg_default_acl d, aclexplode(d.defaclacl) a
--   where d.defaclrole = 'supabase_admin'::regrole
--     and d.defaclnamespace = 'public'::regnamespace
--     and d.defaclobjtype = 'r'
--   order by 1, 2;
--   -- expect: anon and authenticated limited to INSERT/SELECT/UPDATE/DELETE
--   -- expect: TRUNCATE/REFERENCES/TRIGGER/MAINTAIN only for postgres
--   --         and service_role
-- ============================================================================

do $$
declare
  role_exists boolean;
  authorised boolean;
  remaining text;
begin
  select exists (select 1 from pg_roles where rolname = 'supabase_admin')
  into role_exists;

  if not role_exists then
    raise notice '0055: supabase_admin role is absent here; nothing to change';
    return;
  end if;

  select coalesce((select rolsuper from pg_roles where rolname = current_user), false)
      or pg_has_role(current_user, 'supabase_admin', 'member')
  into authorised;

  if not authorised then
    raise exception
      'SEC default privileges: % may not alter supabase_admin defaults '
      '(requires membership in supabase_admin or superuser). Refusing to '
      'report success without doing the work.', current_user
      using errcode = '42501';
  end if;

  execute 'alter default privileges for role supabase_admin in schema public '
       || 'revoke truncate, references, trigger, maintain on tables '
       || 'from anon, authenticated';

  select string_agg(a.grantee::regrole::text || ':' || a.privilege_type, ', ' order by 1)
  into remaining
  from pg_default_acl d
  cross join lateral aclexplode(d.defaclacl) a
  where d.defaclrole = (select oid from pg_roles where rolname = 'supabase_admin')
    and d.defaclnamespace = 'public'::regnamespace
    and d.defaclobjtype = 'r'
    and a.privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN')
    and a.grantee in ((select oid from pg_roles where rolname = 'anon'),
                      (select oid from pg_roles where rolname = 'authenticated'));

  if remaining is not null then
    raise exception 'SEC default privileges: excess remains for supabase_admin: %', remaining;
  end if;
end $$;
