from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.selectors import get_user_by_username
from apps.core.pagination import NewestFirstCursorPagination

from . import selectors, services
from .serializers import MeowCreateSerializer, MeowSerializer


class MeowCreateView(APIView):
    """POST /api/meows/ — publica un maullido como el usuario autenticado."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "meows"

    def post(self, request):
        serializer = MeowCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        meow = services.create_meow(author=request.user, **serializer.validated_data)
        return Response(MeowSerializer(meow).data, status=status.HTTP_201_CREATED)


class UserMeowListView(generics.ListAPIView):
    """GET /api/users/<username>/meows/ — timeline público de un usuario."""

    serializer_class = MeowSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = NewestFirstCursorPagination

    def get_queryset(self):
        user = get_user_by_username(self.kwargs["username"])
        return selectors.list_meows_for_user(user)
