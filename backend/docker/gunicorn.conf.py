"""Configuración de Gunicorn (servidor WSGI de producción)."""

import multiprocessing
import os

bind = "0.0.0.0:8000"
workers = int(os.getenv("GUNICORN_WORKERS", min(multiprocessing.cpu_count() * 2 + 1, 4)))
threads = int(os.getenv("GUNICORN_THREADS", 2))
timeout = int(os.getenv("GUNICORN_TIMEOUT", 30))
accesslog = "-"
errorlog = "-"
forwarded_allow_ips = "*"  # Solo Nginx (red interna de Docker) llega al backend.
