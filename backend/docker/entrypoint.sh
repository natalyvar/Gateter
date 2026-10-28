#!/bin/sh
# Aplica migraciones antes de arrancar el proceso principal.
# La espera a la BD la resuelve docker compose (depends_on: service_healthy).
set -eu

if [ "${DJANGO_MIGRATE_ON_START:-1}" = "1" ]; then
  echo "→ Aplicando migraciones…"
  python manage.py migrate --noinput
fi

exec "$@"
