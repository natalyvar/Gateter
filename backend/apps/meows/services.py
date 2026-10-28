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
