from django.contrib import admin
from .models import AuthToken, MediaItem


@admin.register(MediaItem)
class MediaItemAdmin(admin.ModelAdmin):
    list_display = ("title", "media_type", "owner", "created_at")
    list_filter = ("media_type", "created_at")
    search_fields = ("title", "body_text", "cloudinary_public_id")


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at")
    search_fields = ("user__username", "key")
