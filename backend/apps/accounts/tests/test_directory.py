from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from apps.accounts.presence import is_online, touch_last_seen
from apps.core.testing import BaseAPITestCase

PASSWORD = "MiauMiau.2026!"


class UserDirectoryTests(BaseAPITestCase):
    url = reverse("user-list")

    def setUp(self):
        super().setUp()
        now = timezone.now()
        User.objects.create_user(username="zeus", password=PASSWORD, last_seen=now)
        User.objects.create_user(username="Bigotes", password=PASSWORD, last_seen=now - timedelta(hours=1))
        User.objects.create_user(username="atila", password=PASSWORD)
        User.objects.create_user(username="michi", password=PASSWORD, last_seen=now)
        User.objects.create_user(username="baneado", password=PASSWORD, is_active=False)

    def test_lists_online_first_then_alphabetically(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = [(u["username"], u["is_online"]) for u in response.data["results"]]
        self.assertEqual(
            rows,
            [("michi", True), ("zeus", True), ("atila", False), ("Bigotes", False)],
        )
        self.assertEqual(response.data["count"], 4)  # el inactivo no aparece

    def test_search_is_case_insensitive_and_partial(self):
        response = self.client.get(self.url, {"q": "BIG"})

        self.assertEqual([u["username"] for u in response.data["results"]], ["Bigotes"])

    def test_search_without_matches_returns_empty_list(self):
        response = self.client.get(self.url, {"q": "perro"})

        self.assertEqual(response.data["results"], [])

    def test_rejects_too_long_search(self):
        response = self.client.get(self.url, {"q": "x" * 31})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_includes_presence(self):
        response = self.client.get(reverse("user-profile", args=["zeus"]))

        self.assertTrue(response.data["is_online"])
        self.assertFalse(self.client.get(reverse("user-profile", args=["atila"])).data["is_online"])


class PresenceTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username="michi", password=PASSWORD)

    def test_authenticated_api_request_marks_user_online(self):
        self.client.login(username="michi", password=PASSWORD)

        self.client.get(reverse("auth-session"))

        self.user.refresh_from_db()
        self.assertTrue(is_online(self.user))

    def test_login_marks_user_online(self):
        self.client.post(reverse("auth-login"), {"username": "michi", "password": PASSWORD}, format="json")

        self.user.refresh_from_db()
        self.assertTrue(is_online(self.user))

    def test_logout_marks_user_offline_immediately(self):
        self.client.login(username="michi", password=PASSWORD)
        self.client.get(reverse("auth-session"))

        self.client.post(reverse("auth-logout"))

        self.user.refresh_from_db()
        self.assertFalse(is_online(self.user))
        self.assertIsNotNone(self.user.last_seen)

    def test_touch_is_throttled_to_avoid_writes_on_every_request(self):
        first = timezone.now()
        touch_last_seen(self.user, now=first)

        touch_last_seen(self.user, now=first + timedelta(seconds=5))

        self.user.refresh_from_db()
        self.assertEqual(self.user.last_seen, first)

    def test_user_goes_offline_after_inactivity_window(self):
        self.user.last_seen = timezone.now() - timedelta(minutes=5)

        self.assertFalse(is_online(self.user))
