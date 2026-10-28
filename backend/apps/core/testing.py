"""Utilidades compartidas para los tests."""

from django.core.cache import cache
from rest_framework.test import APITestCase


class BaseAPITestCase(APITestCase):
    """Limpia la caché entre tests para que el throttling no se filtre entre ellos."""

    def setUp(self) -> None:
        super().setUp()
        cache.clear()
