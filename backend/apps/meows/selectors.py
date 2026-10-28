from django.db.models import QuerySet

from apps.accounts.models import User

from .models import Meow


def list_meows_for_user(user: User) -> QuerySet[Meow]:
    """Maullidos de un usuario, de más reciente a más antiguo."""
    return Meow.objects.filter(author=user).select_related("author").order_by("-created_at", "-id")
