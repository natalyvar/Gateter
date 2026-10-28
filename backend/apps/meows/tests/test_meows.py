from datetime import timedelta

from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from apps.core.testing import BaseAPITestCase
from apps.meows.models import MEOW_MAX_LENGTH, Meow
from apps.meows.services import create_meow


class CreateMeowTests(BaseAPITestCase):
    url = reverse("meow-create")

    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username="michi", password="x")

    def test_authenticated_user_can_publish(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"content": "  ¡Miau!  "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "¡Miau!")
        self.assertEqual(response.data["author"]["username"], "michi")
        self.assertEqual(Meow.objects.filter(author=self.user).count(), 1)

    def test_anonymous_user_cannot_publish(self):
        response = self.client.post(self.url, {"content": "Miau"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Meow.objects.exists())

    def test_rejects_more_than_140_characters(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"content": "m" * (MEOW_MAX_LENGTH + 1)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.data["error"]["fields"])

    def test_accepts_exactly_140_characters(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"content": "m" * MEOW_MAX_LENGTH}, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_rejects_blank_content(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, {"content": "    "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_author_cannot_be_spoofed(self):
        other = User.objects.create_user(username="otro", password="x")
        self.client.force_authenticate(self.user)

        self.client.post(self.url, {"content": "Miau", "author": other.pk}, format="json")

        self.assertEqual(Meow.objects.get().author, self.user)


class CreateMeowServiceTests(BaseAPITestCase):
    def test_service_validates_outside_the_api(self):
        user = User.objects.create_user(username="michi", password="x")

        with self.assertRaises(ValidationError):
            create_meow(author=user, content="m" * (MEOW_MAX_LENGTH + 1))


class UserMeowListTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = User.objects.create_user(username="michi", password="x")
        now = timezone.now()
        Meow.objects.create(author=self.user, content="viejo", created_at=now - timedelta(hours=2))
        Meow.objects.create(author=self.user, content="nuevo", created_at=now)
        Meow.objects.create(author=self.user, content="medio", created_at=now - timedelta(hours=1))
        Meow.objects.create(author=User.objects.create_user(username="otro", password="x"), content="ajeno")

    def test_lists_only_that_users_meows_newest_first(self):
        response = self.client.get(reverse("user-meows", args=["michi"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([m["content"] for m in response.data["results"]], ["nuevo", "medio", "viejo"])

    def test_paginates_with_cursor(self):
        url = reverse("user-meows", args=["michi"])

        first = self.client.get(url, {"page_size": 2})
        second = self.client.get(first.data["next"])

        self.assertEqual([m["content"] for m in first.data["results"]], ["nuevo", "medio"])
        self.assertEqual([m["content"] for m in second.data["results"]], ["viejo"])
        self.assertIsNone(second.data["next"])

    def test_unknown_user_returns_404(self):
        response = self.client.get(reverse("user-meows", args=["fantasma"]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
