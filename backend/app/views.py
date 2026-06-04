import json
import secrets

import cloudinary
import cloudinary.uploader
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from .models import AuthToken, MediaItem


def json_body(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return None


def json_error(message, status=400):
    return JsonResponse({"detail": message}, status=status)


def health(request):
    return JsonResponse({"ok": True})


def serialize_media(item):
    return {
        "id": item.id,
        "title": item.title,
        "body_text": item.body_text,
        "media_type": item.media_type,
        "cloudinary_url": item.cloudinary_url,
        "cloudinary_public_id": item.cloudinary_public_id,
        "cloudinary_resource_type": item.cloudinary_resource_type,
        "original_filename": item.original_filename,
        "bytes": item.bytes,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def make_token(user):
    token = secrets.token_urlsafe(32)
    AuthToken.objects.create(user=user, key=token)
    return token


def current_user(request):
    auth_header = request.headers.get("Authorization", "")
    prefix = "Bearer "
    if not auth_header.startswith(prefix):
        return None
    key = auth_header[len(prefix):].strip()
    token = AuthToken.objects.select_related("user").filter(key=key).first()
    return token.user if token else None


def cloudinary_ready():
    return all(
        [
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        ]
    )


def configure_cloudinary():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


@method_decorator(csrf_exempt, name="dispatch")
class RegisterView(View):
    def post(self, request):
        data = json_body(request)
        if data is None:
            return json_error("Invalid JSON.")

        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip()
        password = data.get("password") or ""

        if not username or not password:
            return json_error("Username and password are required.")
        if len(password) < 8:
            return json_error("Password must be at least 8 characters.")

        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return json_error("Username already exists.", status=409)

        user = User.objects.create_user(username=username, email=email, password=password)
        token = make_token(user)
        return JsonResponse(
            {
                "token": token,
                "user": {"id": user.id, "username": user.username, "email": user.email},
            },
            status=201,
        )


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(View):
    def post(self, request):
        data = json_body(request)
        if data is None:
            return json_error("Invalid JSON.")

        user = authenticate(
            request,
            username=(data.get("username") or "").strip(),
            password=data.get("password") or "",
        )
        if not user:
            return json_error("Invalid username or password.", status=401)

        token = make_token(user)
        return JsonResponse(
            {
                "token": token,
                "user": {"id": user.id, "username": user.username, "email": user.email},
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(View):
    def post(self, request):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            AuthToken.objects.filter(key=auth_header[7:].strip()).delete()
        return JsonResponse({"ok": True})


class MeView(View):
    def get(self, request):
        user = current_user(request)
        if not user:
            return json_error("Authentication required.", status=401)
        return JsonResponse(
            {"user": {"id": user.id, "username": user.username, "email": user.email}}
        )


@method_decorator(csrf_exempt, name="dispatch")
class MediaListCreateView(View):
    def get(self, request):
        user = current_user(request)
        if not user:
            return json_error("Authentication required.", status=401)

        media_type = request.GET.get("type", "")
        items = MediaItem.objects.filter(owner=user)
        if media_type in {MediaItem.MEDIA_TEXT, MediaItem.MEDIA_IMAGE, MediaItem.MEDIA_VIDEO}:
            items = items.filter(media_type=media_type)
        return JsonResponse({"items": [serialize_media(item) for item in items]})

    def post(self, request):
        user = current_user(request)
        if not user:
            return json_error("Authentication required.", status=401)

        media_type = request.POST.get("media_type", "").strip()
        title = request.POST.get("title", "").strip()
        body_text = request.POST.get("body_text", "").strip()
        upload = request.FILES.get("file")

        if media_type not in {MediaItem.MEDIA_TEXT, MediaItem.MEDIA_IMAGE, MediaItem.MEDIA_VIDEO}:
            return json_error("media_type must be text, image, or video.")
        if not title:
            return json_error("Title is required.")
        if media_type == MediaItem.MEDIA_TEXT and not body_text:
            return json_error("Text content is required.")
        if media_type in {MediaItem.MEDIA_IMAGE, MediaItem.MEDIA_VIDEO} and not upload:
            return json_error("A file is required for image and video items.")

        upload_result = {}
        if upload:
            if not cloudinary_ready():
                return json_error("Cloudinary environment variables are not configured.", status=500)
            configure_cloudinary()
            resource_type = "video" if media_type == MediaItem.MEDIA_VIDEO else "image"
            upload_result = cloudinary.uploader.upload(
                upload,
                folder=f"web_persion/{media_type}",
                resource_type=resource_type,
            )

        item = MediaItem.objects.create(
            owner=user,
            title=title,
            body_text=body_text,
            media_type=media_type,
            cloudinary_url=upload_result.get("secure_url", ""),
            cloudinary_public_id=upload_result.get("public_id", ""),
            cloudinary_resource_type=upload_result.get("resource_type", ""),
            original_filename=getattr(upload, "name", "") if upload else "",
            bytes=getattr(upload, "size", 0) if upload else 0,
        )
        return JsonResponse({"item": serialize_media(item)}, status=201)


@method_decorator(csrf_exempt, name="dispatch")
class MediaDetailView(View):
    def delete(self, request, item_id):
        user = current_user(request)
        if not user:
            return json_error("Authentication required.", status=401)

        item = MediaItem.objects.filter(id=item_id, owner=user).first()
        if not item:
            return json_error("Media item not found.", status=404)

        if item.cloudinary_public_id and cloudinary_ready():
            configure_cloudinary()
            resource_type = item.cloudinary_resource_type or item.media_type
            cloudinary.uploader.destroy(
                item.cloudinary_public_id,
                resource_type=resource_type,
                invalidate=True,
            )
        item.delete()
        return JsonResponse({"ok": True})
