"""
Presencia ("en línea") basada en la última actividad.

Se descartaron WebSockets para esto: con un polling ligero cada ~30 s y una
ventana de 90 s se obtiene un indicador fiable sin añadir Redis ni Channels.
"""

from datetime import datetime, timedelta

from django.conf import settings
from django.utils import timezone

from .models import User


def online_threshold(now: datetime | None = None) -> datetime:
    """Instante a partir del cual una actividad cuenta como 'en línea'."""
    return (now or timezone.now()) - timedelta(seconds=settings.PRESENCE_ONLINE_SECONDS)


def is_online(user: User, now: datetime | None = None) -> bool:
    return user.last_seen is not None and user.last_seen >= online_threshold(now)


def touch_last_seen(user: User, now: datetime | None = None) -> None:
    """
    Registra actividad del usuario. Solo escribe en la BD si la marca anterior
    tiene más de PRESENCE_TOUCH_SECONDS, para no hacer un UPDATE por petición.
    """
    now = now or timezone.now()
    interval = timedelta(seconds=settings.PRESENCE_TOUCH_SECONDS)
    if user.last_seen is None or now - user.last_seen >= interval:
        User.objects.filter(pk=user.pk).update(last_seen=now)
        user.last_seen = now


def mark_offline(user: User, now: datetime | None = None) -> None:
    """Al cerrar sesión el usuario deja de aparecer en línea de inmediato."""
    last_seen = online_threshold(now) - timedelta(seconds=1)
    User.objects.filter(pk=user.pk).update(last_seen=last_seen)
    user.last_seen = last_seen
