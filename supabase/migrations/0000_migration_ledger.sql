-- ============================================================================
-- Hatsi360 — 0000 migration ledger
-- ============================================================================
-- Phase 1, item P1-A1 (audit finding MIG-01).
--
-- The migration chain could not be applied to an empty database. 0032 hardens
-- `public._hatsi_migrations` (enables RLS, revokes anon/authenticated grants,
-- adds a staff read policy) and 0033 writes a row into it, but no migration in
-- this repository ever created the table: it exists on the hosted project
-- because it was made outside the chain, before migrations were numbered.
--
-- A clean database therefore stopped at 0032 with
--     relation "public._hatsi_migrations" does not exist   (42P01)
--
-- This file runs first because "0000" sorts before every other migration. On
-- the hosted project the table already exists, so `if not exists` makes this a
-- no-op there; on a new database (staging, CI, a laptop) it is the bootstrap
-- that lets the rest of the chain apply.
--
-- The shape is not invented. It is the shape the chain's own statements
-- require and the shape 0032 describes:
--   * 0032 inserts `(name, applied_at)` and relies on `on conflict do nothing`,
--     so `name` must be unique and both columns must exist;
--   * 0032's comment records "29 entries for 30 migration files", so one row is
--     one applied file, keyed by file name.
-- The identity primary key gives the table a stable row identity for later
-- audit work without constraining anything the existing rows rely on.
-- ============================================================================

create table if not exists public._hatsi_migrations (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  applied_at timestamptz not null default now()
);

comment on table public._hatsi_migrations is
  'One row per applied migration file. Created by 0000 so the chain can be applied to an empty database; 0032 governs access to it.';
