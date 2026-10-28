from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.selectors import get_user_by_username
from apps.core.pagination import NewestFirstCursorPagination

from . import selectors, services
from .models import Meow
from .permissions import IsAuthorOrReadOnly
from .serializers import MeowSerializer, MeowWriteSerializer


class _ThrottleWritesMixin:
    """Limita solo las escrituras: leer el feed (y su polling) no consume cupo."""

    throttle_scope = "meows"

    def get_throttles(self):
        if self.request.method in permissions.SAFE_METHODS:
            return []
        return [ScopedRateThrottle()]


class MeowListCreateView(_ThrottleWritesMixin, generics.GenericAPIView):
    """
    GET  /api/meows/ — feed global, más recientes primero (público).
    POST /api/meows/ — publica un maullido como el usuario autenticado.
    """

    serializer_class = MeowSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = NewestFirstCursorPagination

    def get_queryset(self):
        return selectors.list_feed()

    def get(self, request):
        page = self.paginate_queryset(self.get_queryset())
        return self.get_paginated_response(MeowSerializer(page, many=True).data)

    def post(self, request):
        serializer = MeowWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meow = services.create_meow(author=request.user, **serializer.validated_data)
        return Response(MeowSerializer(meow).data, status=status.HTTP_201_CREATED)


class MeowDetailView(_ThrottleWritesMixin, generics.GenericAPIView):
    """
    GET    /api/meows/<id>/ — un maullido (público).
    PATCH  /api/meows/<id>/ — edita el texto (solo el autor).
    DELETE /api/meows/<id>/ — elimina (solo el autor).
    """

    queryset = Meow.objects.select_related("author")
    serializer_class = MeowSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def get(self, request, pk: int):
        return Response(MeowSerializer(self.get_object()).data)

    def patch(self, request, pk: int):
        meow = self.get_object()
        serializer = MeowWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meow = services.update_meow(meow=meow, **serializer.validated_data)
        return Response(MeowSerializer(meow).data)

    def delete(self, request, pk: int):
        services.delete_meow(meow=self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserMeowListView(generics.ListAPIView):
    """GET /api/users/<username>/meows/ — timeline público de un usuario."""

    serializer_class = MeowSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = NewestFirstCursorPagination

    def get_queryset(self):
        user = get_user_by_username(self.kwargs["username"])
        return selectors.list_meows_for_user(user)
