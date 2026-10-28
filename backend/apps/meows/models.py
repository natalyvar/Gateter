from django.conf import settings
from django.db import models
from django.utils import timezone

MEOW_MAX_LENGTH = 140


class Meow(models.Model):
    """Un 'maullido': mensaje corto publicado por un usuario."""

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meows",
        verbose_name="autor",
    )
    content = models.CharField("contenido", max_length=MEOW_MAX_LENGTH)
    created_at = models.DateTimeField("creado", default=timezone.now, editable=False)
    edited_at = models.DateTimeField("editado", null=True, blank=True, editable=False)

    class Meta:
        verbose_name = "maullido"
        verbose_name_plural = "maullidos"
        ordering = ("-created_at", "-id")
        indexes = [
            # Cubre la consulta principal: maullidos de un autor, más recientes primero.
            models.Index(fields=["author", "-created_at", "-id"], name="meow_author_recent_idx"),
            # Cubre el feed global (todos los maullidos, más recientes primero).
            models.Index(fields=["-created_at", "-id"], name="meow_recent_idx"),
        ]
        constraints = [
            models.CheckConstraint(condition=~models.Q(content=""), name="meow_content_not_empty"),
        ]

    def __str__(self) -> str:
        return f"@{self.author}: {self.content[:30]}"
