from django.urls import path

from . import views

app_name = "core"

urlpatterns = [
    path("health/", views.health, name="health"),
    path("options/", views.options, name="options"),
    path("contents/", views.contents, name="contents"),  # 0번 공통
    path("home/feed/", views.home_feed, name="home-feed"),  # 0-4
    path("rankings/", views.rankings, name="rankings"),  # 6-1
    path("rankings/generation/", views.generation_rankings, name="generation-rankings"),  # 6-2
    path("contents/search/", views.content_search, name="content-search"),  # 4-1
    path("contents/<int:content_id>/", views.content_detail, name="content-detail"),  # 4-1
    path("contents/<int:content_id>/watch/", views.content_watch, name="content-watch"),  # 4-1
    path("contents/<int:content_id>/rating/", views.content_rating, name="content-rating"),  # 5-1
    path("contents/<int:content_id>/rating-result/", views.content_rating_result, name="content-rating-result"),  # 5-1
    path("me/ratings/", views.my_ratings, name="my-ratings"),  # 5-1
    path("recommendations/", views.recommendations, name="recommendations"),  # 7-1
    path("recommendations/refresh/", views.recommendations_refresh, name="recommendations-refresh"),  # 7-1
    path("recommendations/pending-feedback/", views.pending_feedback, name="pending-feedback"),  # 7-2
    path("recommendations/<int:rec_id>/feedback/", views.submit_feedback, name="submit-feedback"),  # 7-2
    path("auth/check-nickname/", views.check_nickname_view, name="check-nickname"),
    path("auth/signup/", views.signup, name="signup"),
    path("auth/login/", views.login, name="login"),
    path("auth/logout/", views.logout, name="logout"),
    path("me/", views.me, name="me"),
    path("me/survey/", views.save_survey, name="survey"),
]
