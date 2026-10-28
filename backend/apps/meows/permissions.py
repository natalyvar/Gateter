from rest_framework import permissions


class IsAuthorOrReadOnly(permissions.BasePermission):
    """Cualquiera puede leer; solo el autor puede modificar o borrar."""

    message = "Solo puedes modificar tus propios maullidos."

    def has_object_permission(self, request, view, obj) -> bool:
        return request.method in permissions.SAFE_METHODS or obj.author_id == request.user.id
