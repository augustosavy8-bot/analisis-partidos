#!/usr/bin/env bash
# Levanta un Postgres temporal, aplica migraciones + seed y corre los tests SQL.
# Requiere binarios de Postgres (initdb/pg_ctl/psql) en el PATH o en PG_BIN.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb | tail -1)")}"
DIR="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
trap '"$PG_BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT

if [ "$(id -u)" = "0" ]; then RUN=(su postgres -s /bin/bash -c); chown -R postgres "$DIR"; else RUN=(bash -c); fi
"${RUN[@]}" "'$PG_BIN/initdb' -D '$DIR/data' -U postgres -A trust >/dev/null"
"${RUN[@]}" "'$PG_BIN/pg_ctl' -D '$DIR/data' -o '-p $PORT -k $DIR -c listen_addresses=' -l '$DIR/log' start >/dev/null"

PSQL=(psql -X -q -h "$DIR" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f supabase/tests/stub_supabase.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  "${PSQL[@]}" -f "$f"
done
echo "→ supabase/seed.sql"
"${PSQL[@]}" -f supabase/seed.sql
"${PSQL[@]}" -o /dev/null -f supabase/tests/db_test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /'
