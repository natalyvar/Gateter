from django.db.models import BooleanField, Case, Count, QuerySet, Value, When
from django.db.models.functions import Lower

from .exceptions import UserNotFound
from .models import User
from .presence import online_threshold


def _active_users() -> QuerySet[User]:
    return User.objects.filter(is_active=True)


def _with_presence(queryset: QuerySet[User]) -> QuerySet[User]:
    return queryset.annotate(
        is_online=Case(
            When(last_seen__gte=online_threshold(), then=Value(True)),
            default=Value(False),
            output_field=BooleanField(),
        )
    )


def _get_or_raise(queryset: QuerySet[User], username: str) -> User:
    try:
        return queryset.get(username__iexact=username)
    except User.DoesNotExist as exc:
        raise UserNotFound() from exc


def get_user_by_username(username: str) -> User:
    """Usuario activo (búsqueda insensible a mayúsculas) o UserNotFound."""
    return _get_or_raise(_active_users(), username)


def get_public_profile(username: str) -> User:
    """Usuario con número de maullidos y presencia anotados, o UserNotFound."""
    queryset = _with_presence(_active_users().annotate(meows_count=Count("meows")))
    return _get_or_raise(queryset, username)


def list_users(*, search: str = "") -> QuerySet[User]:
    """Directorio de usuarios: primero los conectados, luego en orden alfabético."""
    queryset = _active_users()
    if search:
        queryset = queryset.filter(username__icontains=search)
    return _with_presence(queryset).order_by("-is_online", Lower("username"), "id")
