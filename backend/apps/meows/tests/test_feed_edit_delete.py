from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import User
from apps.core.testing import BaseAPITestCase
from apps.meows.models import MEOW_MAX_LENGTH, Meow


class FeedTests(BaseAPITestCase):
    url = reverse("meow-list")

    def setUp(self):
        super().setUp()
        now = timezone.now()
        felix = User.objects.create_user(username="felix", password="x")
        tom = User.objects.create_user(username="tom", password="x")
        ghost = User.objects.create_user(username="fantasma", password="x", is_active=False)
        Meow.objects.create(author=felix, content="viejo", created_at=now - timedelta(hours=2))
        Meow.objects.create(author=tom, content="nuevo", created_at=now)
        Meow.objects.create(author=felix, content="medio", created_at=now - timedelta(hours=1))
        Meow.objects.create(author=ghost, content="oculto", created_at=now)

    def test_anyone_sees_everyones_meows_newest_first(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = [(m["author"]["username"], m["content"]) for m in response.data["results"]]
        self.assertEqual(rows, [("tom", "nuevo"), ("felix", "medio"), ("felix", "viejo")])

    def test_feed_is_paginated_with_cursor(self):
        first = self.client.get(self.url, {"page_size": 2})
        second = self.client.get(first.data["next"])

        self.assertEqual(len(first.data["results"]), 2)
        self.assertEqual([m["content"] for m in second.data["results"]], ["viejo"])

    def test_reading_the_feed_does_not_consume_write_quota(self):
        for _ in range(40):  # más que el límite de 30/min de escrituras
            self.assertEqual(self.client.get(self.url).status_code, status.HTTP_200_OK)


class EditMeowTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.author = User.objects.create_user(username="michi", password="x")
        self.other = User.objects.create_user(username="otro", password="x")
        self.meow = Meow.objects.create(author=self.author, content="Original")
        self.url = reverse("meow-detail", args=[self.meow.pk])

    def test_author_can_edit_and_it_is_marked_as_edited(self):
        self.client.force_authenticate(self.author)

        response = self.client.patch(self.url, {"content": "  Corregido  "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "Corregido")
        self.assertIsNotNone(response.data["edited_at"])
        self.meow.refresh_from_db()
        self.assertEqual(self.meow.content, "Corregido")

    def test_saving_without_changes_does_not_mark_as_edited(self):
        self.client.force_authenticate(self.author)

        response = self.client.patch(self.url, {"content": "Original"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["edited_at"])

    def test_edit_respects_140_limit_and_blank(self):
        self.client.force_authenticate(self.author)

        too_long = self.client.patch(self.url, {"content": "m" * (MEOW_MAX_LENGTH + 1)}, format="json")
        blank = self.client.patch(self.url, {"content": "   "}, format="json")

        self.assertEqual(too_long.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(blank.status_code, status.HTTP_400_BAD_REQUEST)
        self.meow.refresh_from_db()
        self.assertEqual(self.meow.content, "Original")

    def test_other_user_cannot_edit(self):
        self.client.force_authenticate(self.other)

        response = self.client.patch(self.url, {"content": "Hackeado"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["message"], "Solo puedes modificar tus propios maullidos.")
        self.meow.refresh_from_db()
        self.assertEqual(self.meow.content, "Original")

    def test_anonymous_cannot_edit(self):
        response = self.client.patch(self.url, {"content": "Hackeado"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_author_cannot_be_changed_by_editing(self):
        self.client.force_authenticate(self.author)

        self.client.patch(self.url, {"content": "Nuevo", "author": self.other.pk}, format="json")

        self.meow.refresh_from_db()
        self.assertEqual(self.meow.author, self.author)

    def test_editing_missing_meow_returns_404(self):
        self.client.force_authenticate(self.author)

        response = self.client.patch(reverse("meow-detail", args=[99999]), {"content": "x"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DeleteMeowTests(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.author = User.objects.create_user(username="michi", password="x")
        self.other = User.objects.create_user(username="otro", password="x")
        self.meow = Meow.objects.create(author=self.author, content="Bórrame")
        self.url = reverse("meow-detail", args=[self.meow.pk])

    def test_author_can_delete(self):
        self.client.force_authenticate(self.author)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Meow.objects.filter(pk=self.meow.pk).exists())

    def test_other_user_cannot_delete(self):
        self.client.force_authenticate(self.other)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Meow.objects.filter(pk=self.meow.pk).exists())

    def test_anonymous_cannot_delete(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Meow.objects.filter(pk=self.meow.pk).exists())

    def test_deleted_meow_disappears_from_profile_count(self):
        self.client.force_authenticate(self.author)
        self.client.delete(self.url)

        profile = self.client.get(reverse("user-profile", args=["michi"]))

        self.assertEqual(profile.data["meows_count"], 0)
