"""
Manejador de excepciones de la API.

Normaliza todas las respuestas de error a un único formato para que el
frontend no tenga que adivinar la forma del JSON:

    {"error": {"code": "not_found", "message": "...", "fields": {...}}}
"""

from django.core.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.serializers import as_serializer_error
from rest_framework.views import exception_handler


def _first_message(detail) -> str:
    if isinstance(detail, list) and detail:
        return _first_message(detail[0])
    if isinstance(detail, dict) and detail:
        return _first_message(next(iter(detail.values())))
    return str(detail)


def api_exception_handler(exc, context):
    # Los ValidationError de Django (p. ej. desde la capa de servicios) se
    # traducen al equivalente de DRF para responder 400 en lugar de 500.
    if isinstance(exc, DjangoValidationError):
        exc = exceptions.ValidationError(as_serializer_error(exc))
    elif isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = exception_handler(exc, context)
    if response is None:
        return None

    code = exc.get_codes() if isinstance(exc, exceptions.APIException) else "error"
    if not isinstance(code, str):
        code = getattr(exc, "default_code", "error")
    if isinstance(exc, exceptions.ValidationError):
        fields = response.data if isinstance(response.data, dict) else {"non_field_errors": response.data}
        payload = {
            "code": "invalid",
            "message": _first_message(response.data),
            "fields": fields,
        }
    else:
        payload = {"code": code, "message": _first_message(response.data)}

    return Response({"error": payload}, status=response.status_code, headers=_headers(response))


def _headers(response) -> dict:
    # Conserva cabeceras útiles como Retry-After (throttling) o WWW-Authenticate.
    return {k: v for k, v in response.items() if k.lower() in {"retry-after", "www-authenticate"}}
