from django.contrib.auth import login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import presence, selectors, services
from .serializers import (
    LoginSerializer,
    PublicProfileSerializer,
    RegisterSerializer,
    UserListItemSerializer,
    UserSearchSerializer,
    UserSerializer,
)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class SessionView(APIView):
    """
    Devuelve el usuario de la sesión actual (o null) y garantiza que el
    navegador reciba la cookie CSRF que necesitará para los POST.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else None
        return Response({"user": UserSerializer(user).data if user else None})


class _AnonymousAuthView(APIView):
    """
    Base para login/registro. DRF solo comprueba CSRF a usuarios ya
    autenticados, así que lo forzamos explícitamente para evitar 'login CSRF'.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @method_decorator(csrf_protect)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)


class RegisterView(_AnonymousAuthView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = services.register_user(**serializer.validated_data)
        # Requisito: tras registrarse el usuario queda logueado automáticamente.
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return Response({"user": UserSerializer(user).data}, status=status.HTTP_201_CREATED)


class LoginView(_AnonymousAuthView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        return Response({"user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if request.user.is_authenticated:
            presence.mark_offline(request.user)
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicProfileView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username: str):
        user = selectors.get_public_profile(username)
        return Response(PublicProfileSerializer(user).data)


class UserDirectoryPagination(PageNumberPagination):
    page_size = 50
    max_page_size = 100
    page_size_query_param = "page_size"


class UserListView(generics.ListAPIView):
    """GET /api/users/?q=<texto> — directorio público con búsqueda y presencia."""

    serializer_class = UserListItemSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = UserDirectoryPagination

    def get_queryset(self):
        params = UserSearchSerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        return selectors.list_users(search=params.validated_data["q"].strip())
