from django.urls import path

from .views import (
    health,
    LoginView,
    LogoutView,
    MeView,
    MediaDetailView,
    MediaListCreateView,
    RegisterView,
)

urlpatterns = [
    path("health/", health, name="health"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("media/", MediaListCreateView.as_view(), name="media-list-create"),
    path("media/<int:item_id>/", MediaDetailView.as_view(), name="media-detail"),
]
