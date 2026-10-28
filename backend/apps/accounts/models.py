from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.db.models.functions import Lower


class GateterUserManager(UserManager):
    def get_by_natural_key(self, username):
        return self.get(**{f"{self.model.USERNAME_FIELD}__iexact": username})


class User(AbstractUser):
    """
    Usuario propio desde el inicio del proyecto (recomendación oficial de
    Django): permite extender el modelo más adelante sin migraciones dolorosas.
    """

    last_seen = models.DateTimeField("última actividad", null=True, blank=True, db_index=True)

    objects = GateterUserManager()

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        constraints = [
            models.UniqueConstraint(Lower("username"), name="accounts_user_username_ci_unique"),
        ]

    def __str__(self) -> str:
        return self.username
