-- 0030_trade_table_grants.sql
--
-- Corrective migration.
--
-- Migration 0009 issues explicit grants for the tables that existed when it
-- ran. Tables created afterwards inherit whatever the platform grants by
-- default: Supabase issues `grant all on all tables in schema public to anon,
-- authenticated, service_role` at project creation, so the trade tables were
-- covered in production — but only by that implicit default.
--
-- The cold-start migration validator creates a bare PostgreSQL instance with a
-- stub `auth` schema, so there is no such default. Without an explicit grant
-- the RLS permission tests failed with:
--
--     permission denied for table commodity_specifications
--
-- That failure is a false negative about RLS: it is a grant failure, not a
-- policy failure. It also means the schema is only correct on a host that
-- happens to issue the right defaults.
--
-- This migration makes the grants explicit and matches the Supabase default
-- exactly, so the schema means the same thing on any host and the validator
-- tests policies rather than missing privileges.
--
-- These are table-level privileges. Row-level access is enforced entirely by
-- RLS, which is enabled on every one of these tables (asserted by the
-- validator). Granting `all` to `anon` here is not a hole: the policies are
-- what decide which rows a caller may read or write, and they were written to
-- allow `anon` to read published intelligence and nothing else.

begin;

grant all on public.commodity_specifications to anon, authenticated;
grant all on public.commodity_seasonality       to anon, authenticated;
grant all on public.commodity_fundamentals      to anon, authenticated;
grant all on public.price_source_registry       to anon, authenticated;
grant all on public.buyer_offers                to anon, authenticated;
grant all on public.seller_offers               to anon, authenticated;
grant all on public.offer_verification_events   to anon, authenticated;
grant all on public.audit_events                to anon, authenticated;

-- The sequence grants are separate in PostgreSQL and are what let an
-- authenticated customer create an offer at all.
grant usage, select on all sequences in schema public to anon, authenticated;

commit;
