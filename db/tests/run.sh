#!/bin/sh
# Reloads the scratch database from db/schema.sql and the reference lists,
# then runs every database test. Never production: the database must not be
# music_tracker. Run from anywhere: db/tests/run.sh [database]
set -e
DB=${1:-music_test}
if [ "$DB" = music_tracker ]; then
  echo "run.sh: refusing to reload the production database" >&2
  exit 1
fi
cd "$(dirname "$0")/../.."
psql -U jon -X -q -v ON_ERROR_STOP=1 -d "$DB" \
  -c 'DROP SCHEMA IF EXISTS music, api, auth CASCADE' \
  -c 'DROP EXTENSION IF EXISTS pgtap'
psql -U jon -X -q -v ON_ERROR_STOP=1 -d "$DB" -f db/schema.sql > /dev/null
psql -U jon -X -q -v ON_ERROR_STOP=1 -d "$DB" -f db/seed/reference.sql > /dev/null
pg_prove -U jon -d "$DB" db/tests/*.sql
