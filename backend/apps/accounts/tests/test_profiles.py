from django.urls import reverse
from rest_framework import status

from apps.accounts.models import User
from apps.core.testing import BaseAPITestCase
from apps.meows.models import Meow


class PublicProfileTests(BaseAPITestCase):
    def test_anyone_can_see_a_profile(self):
        user = User.objects.create_user(username="Felix", password="x")
        Meow.objects.create(author=user, content="Hola")

        response = self.client.get(reverse("user-profile", args=["felix"]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "Felix")
        self.assertEqual(response.data["meows_count"], 1)

    def test_unknown_profile_returns_404_with_clear_message(self):
        response = self.client.get(reverse("user-profile", args=["fantasma"]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"]["code"], "user_not_found")
        self.assertIn("No encontramos", response.data["error"]["message"])
