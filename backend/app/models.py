from django.db import models
from django.conf import settings


class AuthToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    key = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} token"


class MediaItem(models.Model):
    MEDIA_TEXT = "text"
    MEDIA_IMAGE = "image"
    MEDIA_VIDEO = "video"

    MEDIA_TYPE_CHOICES = [
        (MEDIA_TEXT, "Text"),
        (MEDIA_IMAGE, "Image"),
        (MEDIA_VIDEO, "Video"),
    ]

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    title = models.CharField(max_length=180)
    body_text = models.TextField(blank=True)
    media_type = models.CharField(max_length=12, choices=MEDIA_TYPE_CHOICES)
    cloudinary_url = models.URLField(blank=True)
    cloudinary_public_id = models.CharField(max_length=255, blank=True)
    cloudinary_resource_type = models.CharField(max_length=32, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    bytes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
