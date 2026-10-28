from django.db.models import QuerySet

from apps.accounts.models import User

from .models import Meow


def _base_queryset() -> QuerySet[Meow]:
    return Meow.objects.select_related("author").order_by("-created_at", "-id")


def list_meows_for_user(user: User) -> QuerySet[Meow]:
    """Maullidos de un usuario, de más reciente a más antiguo."""
    return _base_queryset().filter(author=user)


def list_feed() -> QuerySet[Meow]:
    """Feed global: maullidos de todos los usuarios activos, más recientes primero."""
    return _base_queryset().filter(author__is_active=True)
