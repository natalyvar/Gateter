from rest_framework import serializers

from .models import MEOW_MAX_LENGTH, Meow


class MeowAuthorSerializer(serializers.Serializer):
    username = serializers.CharField(read_only=True)


class MeowSerializer(serializers.ModelSerializer):
    author = MeowAuthorSerializer(read_only=True)

    class Meta:
        model = Meow
        fields = ("id", "author", "content", "created_at", "edited_at")
        read_only_fields = ("id", "author", "created_at", "edited_at")


class MeowWriteSerializer(serializers.Serializer):
    """Entrada para crear o editar un maullido."""

    content = serializers.CharField(
        max_length=MEOW_MAX_LENGTH,
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            "blank": "El maullido no puede estar vacío.",
            "max_length": f"Máximo {MEOW_MAX_LENGTH} caracteres.",
        },
    )
