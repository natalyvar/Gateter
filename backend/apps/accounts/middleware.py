from .presence import touch_last_seen


class LastSeenMiddleware:
    """Actualiza `last_seen` cuando un usuario autenticado usa la API."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        user = getattr(request, "user", None)
        if request.path.startswith("/api/") and user is not None and user.is_authenticated:
            touch_last_seen(user)
        return response
