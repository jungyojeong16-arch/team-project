from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("health/", views.health, name="health"),
    path("options/", views.options, name="options"),
    path("auth/check-nickname/", views.check_nickname_view, name="check-nickname"),
    path("auth/signup/", views.signup, name="signup"),
    path("auth/login/", views.login, name="login"),
    path("auth/logout/", views.logout, name="logout"),
    path("me/", views.me, name="me"),
    path("me/survey/", views.save_survey, name="survey"),
]
