from rest_framework import serializers

from .models import AgeGroup, Content, ContentPlatform, Genre, Platform, User


def age_group_key(age_group: str) -> str:
    """AgeGroup 값 → annotate 필드 접미사 ('50s+' → '50s_plus')"""
    return age_group.replace("+", "_plus")


def _round(value) -> float | None:
    return round(float(value), 1) if value is not None else None


# =============================================================================
# Nested
# =============================================================================


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ["id", "tmdb_id", "name"]


class PlatformSerializer(serializers.ModelSerializer):
    code = serializers.SerializerMethodField()

    class Meta:
        model = Platform
        fields = ["id", "code", "name", "color_code"]

    def get_code(self, obj: Platform) -> str:
        # 프론트 PlatformCode 규격 (netflix → NETFLIX, disney-plus → DISNEY_PLUS)
        return obj.code.upper().replace("-", "_")


class ContentPlatformSerializer(serializers.ModelSerializer):
    """N:M through 모델 기반 플랫폼 정보 (브랜드 컬러 + 콘텐츠별 시청 URL)"""

    id = serializers.IntegerField(source="platform.id")
    code = serializers.SerializerMethodField()
    name = serializers.CharField(source="platform.name")
    color_code = serializers.CharField(source="platform.color_code")

    class Meta:
        model = ContentPlatform
        fields = ["id", "code", "name", "color_code", "watch_url"]

    def get_code(self, obj: ContentPlatform) -> str:
        return obj.platform.code.upper().replace("-", "_")


class UserPersonaSerializer(serializers.ModelSerializer):
    age_group_label = serializers.CharField(source="get_age_group_display", read_only=True)
    occupation_label = serializers.CharField(source="get_occupation_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "nickname",
            "age_group",
            "age_group_label",
            "occupation",
            "occupation_label",
            "persona_label",
        ]


# =============================================================================
# Content
# =============================================================================


class ContentSerializer(serializers.ModelSerializer):
    """
    HomeFeed 카드/Hero 공용 직렬화기.

    권장 쿼리셋: views.content_feed_queryset()
      - with_rating_stats() + 세대별 count annotate → 평점 계산 추가 쿼리 없음
      - genres / available_platform_links prefetch → N+1 없음
    """

    genres = GenreSerializer(many=True, read_only=True)
    platforms = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    my_age_group_rating = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = [
            "id",
            "tmdb_id",
            "content_type",
            "title",
            "original_title",
            "overview",
            "poster_url",
            "backdrop_url",
            "release_year",
            "genres",
            "platforms",
            "rating",
            "my_age_group_rating",
        ]

    def get_platforms(self, obj: Content) -> list[dict]:
        links = getattr(obj, "available_platform_links", None)
        if links is None:
            links = obj.platform_links.filter(is_available=True).select_related("platform")
        return ContentPlatformSerializer(links, many=True).data

    def get_rating(self, obj: Content) -> dict:
        return {
            "overall": obj.average_rating,
            "total_count": obj.rating_total_count,
            "by_age_group": self._by_age_group(obj),
        }

    def get_my_age_group_rating(self, obj: Content) -> float | None:
        """요청 유저(또는 게스트 페르소나) 세대의 평균 평점 — TPO 추천 근거 표시용"""
        age_group = self.context.get("age_group")
        if not age_group:
            return None
        return obj.get_age_group_average(age_group)

    @staticmethod
    def _by_age_group(obj: Content) -> list[dict]:
        # 뷰에서 세대별 avg/count가 annotate된 경우 추가 쿼리 없이 구성
        if all(hasattr(obj, f"rating_count_{age_group_key(v)}") for v in AgeGroup.values):
            return [
                {
                    "age_group": value,
                    "label": label,
                    "average": _round(getattr(obj, f"avg_score_{age_group_key(value)}")),
                    "count": getattr(obj, f"rating_count_{age_group_key(value)}"),
                }
                for value, label in AgeGroup.choices
            ]
        return obj.get_age_group_ratings()


# =============================================================================
# HomeFeed
# =============================================================================


class RankingItemSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    rank_change = serializers.IntegerField()
    is_new = serializers.BooleanField()
    movie = ContentSerializer(source="content")


class CurationMessageSerializer(serializers.Serializer):
    headline = serializers.CharField()
    reason = serializers.CharField()


class HeroSerializer(serializers.Serializer):
    message = CurationMessageSerializer()
    movie = ContentSerializer(source="content", allow_null=True)


class TPOContextSerializer(serializers.Serializer):
    time_slot = serializers.CharField()
    situation = serializers.CharField()
    mood_tags = serializers.ListField(child=serializers.CharField())


class HomeFeedSerializer(serializers.Serializer):
    user = serializers.DictField()
    tpo = TPOContextSerializer()
    hero = HeroSerializer()
    rankings = RankingItemSerializer(many=True)
    cross_age_picks = ContentSerializer(many=True)
