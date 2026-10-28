from django.db import connection
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """Endpoint de salud usado por Docker/orquestadores. Verifica la BD."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return Response({"status": "ok"})
