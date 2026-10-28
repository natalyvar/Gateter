import re

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User

USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,30}$")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "date_joined")
        read_only_fields = fields


class PublicProfileSerializer(serializers.ModelSerializer):
    meows_count = serializers.IntegerField(read_only=True)
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ("username", "date_joined", "meows_count", "is_online", "last_seen")
        read_only_fields = fields


class UserListItemSerializer(serializers.ModelSerializer):
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ("username", "is_online", "last_seen")
        read_only_fields = fields


class UserSearchSerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True, max_length=30, default="")


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=30)
    password = serializers.CharField(write_only=True, trim_whitespace=False, style={"input_type": "password"})

    def validate_username(self, value: str) -> str:
        if not USERNAME_RE.fullmatch(value):
            raise serializers.ValidationError("Usa entre 3 y 30 caracteres: letras, números o guion bajo.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Ese nombre de usuario ya está ocupado.")
        return value

    def validate(self, attrs):
        try:
            validate_password(attrs["password"], user=User(username=attrs["username"]))
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["username"],
            password=attrs["password"],
        )
        if user is None:
            # Mensaje genérico: no revelamos si el usuario existe.
            raise serializers.ValidationError("Usuario o contraseña incorrectos.")
        attrs["user"] = user
        return attrs
