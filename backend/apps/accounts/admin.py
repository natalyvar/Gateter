from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class GateterUserAdmin(UserAdmin):
    list_display = ("username", "is_staff", "date_joined")
