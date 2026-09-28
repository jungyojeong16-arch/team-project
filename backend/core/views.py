from datetime import datetime

from django.db.models import Avg, Count, ExpressionWrapper, F, FloatField, Prefetch, Q, QuerySet
from django.db.models.functions import Cast, Coalesce
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AgeGroup, Content, ContentPlatform, Occupation, Rating
from .serializers import ContentSerializer, HomeFeedSerializer, UserPersonaSerializer, age_group_key

API_VERSION = "v1"

RANKING_SIZE = 10
CROSS_AGE_PICK_SIZE = 12
# Bayesian weighted rating 의 최소 신뢰 표본 수 (평가 수가 적은 작품의 과대평가 방지)
RANKING_MIN_VOTES = 20
HERO_RECENT_YEARS = 2

DEFAULT_GUEST = {"age_group": AgeGroup.TWENTIES, "occupation": Occupation.UNIVERSITY_STUDENT}


# =============================================================================
# QuerySet
# =============================================================================


def content_feed_queryset() -> QuerySet[Content]:
    """
    피드 공용 쿼리셋
      - 전체/세대별 평균 평점 + 세대별 평가 수 annotate (단일 GROUP BY)
      - genres, 현재 제공 중인 플랫폼(through) prefetch
    """
    count_by_age = {
        f"rating_count_{age_group_key(value)}": Count("ratings", filter=Q(ratings__age_group=value))
        for value in AgeGroup.values
    }
    return (
        Content.objects.with_rating_stats()
        .annotate(**count_by_age)
        .prefetch_related(
            "genres",
            Prefetch(
                "platform_links",
                queryset=ContentPlatform.objects.filter(is_available=True).select_related("platform"),
                to_attr="available_platform_links",
            ),
        )
    )


def with_weighted_score(queryset: QuerySet[Content]) -> QuerySet[Content]:
    """IMDb 방식 가중 평점: WR = (v·R + m·C) / (v + m)"""
    global_mean = float(Rating.objects.aggregate(avg=Avg("score"))["avg"] or 0)
    votes = Cast("rating_count", FloatField())
    return queryset.annotate(
        weighted_score=ExpressionWrapper(
            (votes * Coalesce(Cast("avg_score", FloatField()), 0.0) + RANKING_MIN_VOTES * global_mean)
            / (votes + RANKING_MIN_VOTES),
            output_field=FloatField(),
        )
    )


# =============================================================================
# TPO
# =============================================================================

TIME_SLOT_MOODS = {
    "morning": ["#출근길", "#가볍게", "#짧은러닝타임"],
    "afternoon": ["#점심시간", "#숏폼대신", "#기분전환"],
    "evening": ["#맥주한잔", "#힐링", "#정주행각"],
    "late_night": ["#잠못드는밤", "#몰입감", "#스릴러"],
}

TPO_COPY = {
    # (occupation, time_slot): (situation, headline)
    (Occupation.UNIVERSITY_STUDENT, "evening"): ("과제 끝난 저녁", "과제 후 맥주 한잔하며 보기 좋은 신작"),
    (Occupation.UNIVERSITY_STUDENT, "late_night"): ("시험기간 새벽", "딱 한 편만 보고 자기 좋은 몰입작"),
    (Occupation.OFFICE_WORKER, "morning"): ("출근길 지하철", "출근길에 가볍게 이어 보기 좋은 화제작"),
    (Occupation.OFFICE_WORKER, "evening"): ("퇴근 후 저녁", "퇴근 후 머리 비우고 보기 좋은 힐링작"),
    (Occupation.JOB_SEEKER, "evening"): ("하루를 마무리하는 저녁", "지친 하루를 위로해 줄 따뜻한 작품"),
}

TIME_SLOT_COPY = {
    "morning": ("상쾌한 아침", "하루를 기분 좋게 여는 추천작"),
    "afternoon": ("나른한 오후", "잠깐의 휴식에 딱 맞는 추천작"),
    "evening": ("편안한 저녁", "오늘 저녁 가장 많이 선택된 추천작"),
    "late_night": ("조용한 늦은 밤", "잠들기 전 몰입해서 보기 좋은 추천작"),
}


def resolve_time_slot(now: datetime) -> str:
    hour = now.hour
    if 5 <= hour < 11:
        return "morning"
    if 11 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 23:
        return "evening"
    return "late_night"


def build_tpo(occupation: str, time_slot: str) -> tuple[dict, str]:
    situation, headline = TPO_COPY.get((occupation, time_slot), TIME_SLOT_COPY[time_slot])
    tpo = {"time_slot": time_slot, "situation": situation, "mood_tags": TIME_SLOT_MOODS[time_slot]}
    return tpo, headline


# =============================================================================
# Views
# =============================================================================


class HomeFeedAPIView(APIView):
    """
    GET /api/v1/home/feed/

    - 로그인 유저: 프로필(age_group, occupation) 기반 개인화
    - 게스트: ?age_group=20s&occupation=university_student 쿼리로 페르소나 지정 (미지정 시 기본값)
    """

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        now = timezone.localtime()
        persona = self._resolve_persona(request)
        age_group = persona["age_group"]
        time_slot = resolve_time_slot(now)
        tpo, headline = build_tpo(persona["occupation"], time_slot)

        base = with_weighted_score(content_feed_queryset())

        rankings = [
            {
                "rank": rank,
                "rank_change": 0,  # 일간 랭킹 스냅샷 적재(ETL) 이후 전일 대비 값으로 대체
                "is_new": content.release_year == now.year,
                "content": content,
            }
            for rank, content in enumerate(
                base.filter(rating_count__gt=0).order_by("-weighted_score", "-rating_count")[:RANKING_SIZE],
                start=1,
            )
        ]

        age_avg_field = f"avg_score_{age_group_key(age_group)}"
        age_count_field = f"rating_count_{age_group_key(age_group)}"
        hero_content = (
            base.filter(**{f"{age_count_field}__gt": 0}, release_year__gte=now.year - HERO_RECENT_YEARS)
            .order_by(F(age_avg_field).desc(nulls_last=True), f"-{age_count_field}")
            .first()
        ) or (rankings[0]["content"] if rankings else None)

        cross_age_picks = base.filter(
            rating_count_20s__gt=0,
            rating_count_30s__gt=0,
            rating_count_40s__gt=0,
        ).order_by("-rating_count", "-weighted_score")[:CROSS_AGE_PICK_SIZE]

        payload = {
            "user": persona,
            "tpo": tpo,
            "hero": {
                "message": {
                    "headline": headline,
                    "reason": self._hero_reason(hero_content, age_group),
                },
                "content": hero_content,
            },
            "rankings": rankings,
            "cross_age_picks": list(cross_age_picks),
        }

        serializer = HomeFeedSerializer(payload, context={"request": request, "age_group": age_group})
        return Response(
            {
                "success": True,
                "data": serializer.data,
                "meta": {"generated_at": now.isoformat(), "version": API_VERSION},
            }
        )

    @staticmethod
    def _resolve_persona(request: Request) -> dict:
        user = request.user
        if user.is_authenticated and user.age_group:
            data = UserPersonaSerializer(user).data
            data["nickname"] = data["nickname"] or user.username
            data["occupation"] = data["occupation"] or Occupation.OTHER
            return data

        age_group = request.query_params.get("age_group")
        occupation = request.query_params.get("occupation")
        age_group = age_group if age_group in AgeGroup.values else DEFAULT_GUEST["age_group"]
        occupation = occupation if occupation in Occupation.values else DEFAULT_GUEST["occupation"]
        age_label = AgeGroup(age_group).label
        occupation_label = Occupation(occupation).label
        return {
            "id": None,
            "nickname": "게스트",
            "age_group": age_group,
            "age_group_label": age_label,
            "occupation": occupation,
            "occupation_label": occupation_label,
            "persona_label": f"{age_label} {occupation_label} 게스트",
        }

    @staticmethod
    def _hero_reason(content: Content | None, age_group: str) -> str:
        if content is None:
            return "아직 평가 데이터가 충분하지 않아요"
        count = getattr(content, f"rating_count_{age_group_key(age_group)}", 0)
        average = content.get_age_group_average(age_group)
        if not count or average is None:
            return f"전체 평균 ★{content.average_rating} · {content.rating_total_count:,}명 평가"
        return f"{AgeGroup(age_group).label} 시청자 {count:,}명의 평균 ★{average}"


class ContentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/contents/                  목록 (?platform=netflix&genre=18&age_group=20s)
    GET /api/v1/contents/{id}/             상세
    """

    serializer_class = ContentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self) -> QuerySet[Content]:
        # 다대다 필터는 서브쿼리로 분리 — 평점 집계(annotate)에 JOIN 중복이 섞이지 않도록 함
        ids = Content.objects.all()
        params = self.request.query_params
        if platform := params.get("platform"):
            ids = ids.filter(
                platform_links__platform__code__iexact=platform.replace("_", "-"),
                platform_links__is_available=True,
            )
        if genre := params.get("genre"):
            ids = ids.filter(genres__tmdb_id=genre)
        return (
            with_weighted_score(content_feed_queryset())
            .filter(id__in=ids.values("id"))
            .order_by("-weighted_score", "-rating_count", "id")
        )

    def get_serializer_context(self) -> dict:
        context = super().get_serializer_context()
        age_group = self.request.query_params.get("age_group")
        if age_group in AgeGroup.values:
            context["age_group"] = age_group
        elif self.request.user.is_authenticated and self.request.user.age_group:
            context["age_group"] = self.request.user.age_group
        return context
