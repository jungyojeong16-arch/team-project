from django.contrib import admin
from django.urls import include, path

admin.site.site_header = "ViewFit 관리자"
admin.site.site_title = "ViewFit 관리자"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("core.urls")),
]
