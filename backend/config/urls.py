"""Rutas raíz. Toda la API vive bajo /api/ y está versionada por app."""

from django.contrib import admin
from django.urls import include, path

api_patterns = [
    path("", include("apps.core.urls")),
    path("auth/", include("apps.accounts.urls.auth")),
    path("users/", include("apps.accounts.urls.users")),
    path("", include("apps.meows.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include(api_patterns)),
]
