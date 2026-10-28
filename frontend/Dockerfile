FROM nginx:1.27-alpine

# La imagen oficial procesa /etc/nginx/templates/*.template con envsubst al
# arrancar y genera /etc/nginx/conf.d/default.conf.
ENV NGINX_PORT=80 \
    BACKEND_UPSTREAM=backend:8000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY src/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
