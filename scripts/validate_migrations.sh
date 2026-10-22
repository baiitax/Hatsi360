#!/usr/bin/env bash
# =============================================================================
# Validate the Pluck Live Supabase migrations against a real PostgreSQL server.
#
# A local PostgreSQL instance is started, a minimal stub of the Supabase `auth`
# schema is created (auth.users + auth.uid()), and every migration file is
# applied in order. Any SQL error fails the run.
#
#   bash scripts/validate_migrations.sh
#
# The instance is thrown away afterwards; it never touches a real project.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGHOME="${PGHOME:-/home/user/pgtest/node_modules/@embedded-postgres/linux-x64/native}"
PGDATA="${PGDATA:-/home/user/.pgpluck}"
PGPORT="${PGPORT:-55432}"
LOG="$PGDATA/server.log"

export PATH="$PGHOME/bin:$PATH"

if [ ! -x "$PGHOME/bin/initdb" ]; then
  echo "PostgreSQL binaries not found at $PGHOME" >&2
  exit 1
fi

if [ ! -d "$PGDATA" ]; then
  echo "==> initdb $PGDATA"
  mkdir -p "$PGDATA"
  "$PGHOME/bin/initdb" -D "$PGDATA" -U postgres --auth=trust >/dev/null
fi

if ! "$PGHOME/bin/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  echo "==> starting postgres on port $PGPORT"
  "$PGHOME/bin/pg_ctl" -D "$PGDATA" -l "$LOG" -o "-p $PGPORT -c listen_addresses=127.0.0.1 -c fsync=off -c full_page_writes=off" start >/dev/null
  for _ in $(seq 1 30); do
    "$PGHOME/bin/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1 && break
    sleep 1
  done
fi

echo "==> running SQL through the node driver"
node "$ROOT/scripts/validate-migrations.mjs"
echo
 echo "ALL MIGRATIONS APPLIED CLEANLY"
