from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.core.testing import BaseAPITestCase

STRONG_PASSWORD = "MiauMiau.2026!"


class RegisterTests(BaseAPITestCase):
    url = reverse("auth-register")

    def test_register_creates_user_and_logs_in(self):
        response = self.client.post(self.url, {"username": "michi", "password": STRONG_PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "michi")
        self.assertNotIn("password", response.data["user"])
        self.assertTrue(User.objects.get(username="michi").check_password(STRONG_PASSWORD))
        # Queda logueado automáticamente.
        session = self.client.get(reverse("auth-session"))
        self.assertEqual(session.data["user"]["username"], "michi")

    def test_username_is_unique_case_insensitive(self):
        User.objects.create_user(username="Michi", password=STRONG_PASSWORD)

        response = self.client.post(self.url, {"username": "michi", "password": STRONG_PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data["error"]["fields"])

    def test_rejects_invalid_username(self):
        response = self.client.post(self.url, {"username": "no válido!", "password": STRONG_PASSWORD}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data["error"]["fields"])

    def test_rejects_weak_password(self):
        response = self.client.post(self.url, {"username": "michi", "password": "123"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data["error"]["fields"])
        self.assertFalse(User.objects.filter(username="michi").exists())


class LoginLogoutTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        User.objects.create_user(username="Garfield", password=STRONG_PASSWORD)

    def test_login_with_valid_credentials_is_case_insensitive(self):
        response = self.client.post(
            reverse("auth-login"), {"username": "garfield", "password": STRONG_PASSWORD}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "Garfield")

    def test_login_with_wrong_password_returns_generic_error(self):
        response = self.client.post(
            reverse("auth-login"), {"username": "Garfield", "password": "incorrecta"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["message"], "Usuario o contraseña incorrectos.")

    def test_logout_clears_session(self):
        self.client.login(username="Garfield", password=STRONG_PASSWORD)

        response = self.client.post(reverse("auth-logout"))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIsNone(self.client.get(reverse("auth-session")).data["user"])

    def test_session_is_null_for_anonymous_and_sets_csrf_cookie(self):
        response = self.client.get(reverse("auth-session"))

        self.assertIsNone(response.data["user"])
        self.assertIn("csrftoken", response.cookies)


class CsrfTests(BaseAPITestCase):
    """El login y el registro exigen token CSRF aunque el usuario sea anónimo."""

    def setUp(self):
        super().setUp()
        self.client = APIClient(enforce_csrf_checks=True)

    def test_login_without_csrf_token_is_rejected(self):
        response = self.client.post(reverse("auth-login"), {"username": "x", "password": "y"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_register_with_csrf_token_is_accepted(self):
        token = self.client.get(reverse("auth-session")).cookies["csrftoken"].value

        response = self.client.post(
            reverse("auth-register"),
            {"username": "tom", "password": STRONG_PASSWORD},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
