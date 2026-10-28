from django.contrib import admin

from .models import Meow


@admin.register(Meow)
class MeowAdmin(admin.ModelAdmin):
    list_display = ("author", "content", "created_at")
    list_select_related = ("author",)
    search_fields = ("content", "author__username")
    readonly_fields = ("created_at",)
