#!/usr/bin/env bash
# Arranque del contenedor de producción: migraciones → Gunicorn → Nginx.
# Si cualquiera de los dos procesos muere, el contenedor termina y la
# plataforma lo reinicia (en vez de quedar "vivo" pero roto).
set -euo pipefail

export NGINX_PORT="${PORT:-10000}"

echo "→ Aplicando migraciones…"
python manage.py migrate --noinput

echo "→ Generando configuración de Nginx (puerto ${NGINX_PORT})…"
mkdir -p /tmp/nginx/conf.d
envsubst '${NGINX_PORT} ${BACKEND_UPSTREAM}' \
  < /app/deploy/default.conf.template > /tmp/nginx/conf.d/default.conf
nginx -t -q -e /dev/stderr -c /app/deploy/nginx.conf

echo "→ Iniciando Gunicorn y Nginx…"
gunicorn config.wsgi:application --config docker/gunicorn.conf.py &
GUNICORN_PID=$!
nginx -e /dev/stderr -c /app/deploy/nginx.conf -g 'daemon off;' &
NGINX_PID=$!

shutdown() {
  kill -TERM "$GUNICORN_PID" "$NGINX_PID" 2>/dev/null || true
  wait
}
trap shutdown TERM INT

# Espera a que termine el primero de los dos procesos.
set +e
wait -n "$GUNICORN_PID" "$NGINX_PID"
status=$?
set -e
echo "Un proceso terminó (código ${status}); deteniendo el contenedor." >&2
shutdown
exit "$status"
