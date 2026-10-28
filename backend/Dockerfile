# ---------- Etapa 1: dependencias en un virtualenv aislado ----------
FROM python:3.12-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements/ /tmp/requirements/
RUN pip install -r /tmp/requirements/base.txt

# ---------- Etapa 2: imagen final mínima ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_SETTINGS_MODULE=config.settings

# Usuario sin privilegios: el contenedor nunca corre como root.
RUN groupadd --system app && useradd --system --gid app --home /app app

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app . .

# Los estáticos del admin se generan en build (no necesitan BD ni secretos reales).
RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput \
    && chmod +x docker/entrypoint.sh

USER app
EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health/', timeout=2).status == 200 else 1)"

ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--config", "docker/gunicorn.conf.py"]
