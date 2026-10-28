from django.utils import timezone

from apps.accounts.models import User

from .models import Meow


def create_meow(*, author: User, content: str) -> Meow:
    """
    Publica un maullido. full_clean() aplica las validaciones del modelo
    (longitud máxima, no vacío) también fuera de la API (admin, shell, tareas).
    """
    meow = Meow(author=author, content=content.strip())
    meow.full_clean()
    meow.save()
    return meow


def update_meow(*, meow: Meow, content: str) -> Meow:
    """
    Cambia el texto de un maullido. Solo se marca como editado si el contenido
    cambió de verdad, para no mostrar "(editado)" por guardar sin cambios.
    """
    content = content.strip()
    if content == meow.content:
        return meow
    meow.content = content
    meow.edited_at = timezone.now()
    meow.full_clean()
    meow.save(update_fields=["content", "edited_at"])
    return meow


def delete_meow(*, meow: Meow) -> None:
    meow.delete()
