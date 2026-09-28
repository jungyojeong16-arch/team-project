from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContentViewSet, HomeFeedAPIView

app_name = "core"

router = DefaultRouter()
router.register("contents", ContentViewSet, basename="content")

urlpatterns = [
    path("home/feed/", HomeFeedAPIView.as_view(), name="home-feed"),
    path("", include(router.urls)),
]
