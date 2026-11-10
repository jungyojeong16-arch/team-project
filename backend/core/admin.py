"""관리자 페이지(/admin) — 테이블에 데이터가 잘 들어갔는지 눈으로 확인하는 용도"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Content,
    ContentGenre,
    ContentLike,
    ContentPlatform,
    ContentTpo,
    Genre,
    GenrePreference,
    Member,
    Platform,
    Ranking,
    Rating,
    Recommendation,
    Tpo,
    WatchHistory,
)


@admin.register(Member)
class MemberAdmin(UserAdmin):
    ordering = ["-date_joined"]
    list_display = ["email", "nickname", "age_group", "job", "date_joined", "is_staff"]
    search_fields = ["email", "nickname"]
    fieldsets = [
        (None, {"fields": ["email", "nickname", "password"]}),
        ("설문 정보", {"fields": ["age_group", "job"]}),
        ("동의·가입", {"fields": ["marketing_opt_in", "terms_agreed_at", "survey_completed_at", "date_joined"]}),
        ("권한", {"fields": ["is_active", "is_staff", "is_superuser"]}),
    ]
    add_fieldsets = [(None, {"classes": ["wide"], "fields": ["email", "nickname", "password1", "password2"]})]


class ContentGenreInline(admin.TabularInline):
    model = ContentGenre
    extra = 1


class ContentPlatformInline(admin.TabularInline):
    model = ContentPlatform
    extra = 1


class ContentTpoInline(admin.TabularInline):
    model = ContentTpo
    extra = 1


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ["title", "content_type", "release_year", "tmdb_id"]
    list_filter = ["content_type"]
    search_fields = ["title"]
    inlines = [ContentGenreInline, ContentPlatformInline, ContentTpoInline]


@admin.register(Genre, Platform, Tpo)
class LookupAdmin(admin.ModelAdmin):
    list_display = ["id", "__str__"]


@admin.register(Ranking)
class RankingAdmin(admin.ModelAdmin):
    list_display = ["ranked_on", "period", "rank", "content"]
    list_filter = ["period", "ranked_on"]


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ["member", "content", "score", "age_group_at_rating", "rated_at"]
    list_filter = ["age_group_at_rating"]


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ["member", "rank", "content", "tpo", "feedback", "recommended_at"]
    list_filter = ["feedback", "tpo"]


@admin.register(ContentLike, WatchHistory, GenrePreference)
class MemberActivityAdmin(admin.ModelAdmin):
    list_display = ["id", "__str__"]
