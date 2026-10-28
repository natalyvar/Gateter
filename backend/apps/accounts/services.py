from django.contrib.auth.password_validation import validate_password
from django.db import transaction

from .models import User


@transaction.atomic
def register_user(*, username: str, password: str) -> User:
    """
    Crea un usuario nuevo. La validación de formato/unicidad la hace el
    serializer; aquí se aplican las reglas de contraseña de Django, que
    necesitan conocer al usuario (p. ej. similitud con el nombre).
    """
    user = User(username=username)
    validate_password(password, user=user)
    user.set_password(password)
    user.save()
    return user
