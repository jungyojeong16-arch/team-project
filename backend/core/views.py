"""
API 목록 (주소 앞에 /api/v1 이 붙음)

  [확인용]
  GET  /health/                서버·DB 연결 상태, 테이블별 행 개수
  GET  /options/               설문 선택지 (연령대, 직업, 장르, OTT, 상황)

  [0번 공통]
  GET  /contents/              작품 카드 목록 (type·platform·genre·tpo 필터, offset·limit)

  [회원]
  GET  /auth/check-nickname/?nickname=  닉네임 사용 가능 여부
  POST /auth/signup/           회원가입 → 로그인 토큰
  POST /auth/login/            로그인 → 로그인 토큰
  POST /auth/logout/           로그아웃 (토큰 삭제)            * 로그인 필요
  GET  /me/                    내 정보 + 설문 결과              * 로그인 필요
  PUT  /me/survey/             취향 설문 저장                   * 로그인 필요

로그인이 필요한 API 는 요청 헤더에  Authorization: Token <토큰>  을 붙입니다.
"""
from django.db import connection, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import models as m
from .common import contents_for_cards, filter_contents, paginate
from .serializers import (
    ContentCardSerializer, LoginSerializer, MeSerializer, SignupSerializer, SurveySerializer, check_nickname,
)


def me_payload(member):
    member = m.Member.objects.prefetch_related("genre_preferences__genre").get(pk=member.pk)
    return MeSerializer(member).data


def token_payload(member, http_status=status.HTTP_200_OK):
    token, _ = Token.objects.get_or_create(user=member)
    return Response({"token": token.key, "member": me_payload(member)}, status=http_status)


# -----------------------------------------------------------------------------
# 확인용
# -----------------------------------------------------------------------------


@api_view(["GET"])
def health(request):
    tables = {
        model._meta.db_table: model.objects.count()
        for model in [
            m.Member, m.Genre, m.Platform, m.Tpo, m.Content, m.Ranking,
            m.Rating, m.ContentLike, m.WatchHistory, m.Recommendation,
            m.GenrePreference, m.ContentGenre, m.ContentPlatform, m.ContentTpo,
        ]
    }
    return Response({"status": "ok", "database": connection.vendor, "tables": tables})


@api_view(["GET"])
def options(request):
    def choices(enum):
        return [{"value": value, "label": label} for value, label in enum.choices]

    return Response(
        {
            "age_groups": choices(m.AgeGroup),
            "jobs": choices(m.Job),
            "genres": list(m.Genre.objects.values("id", "name")),
            "platforms": list(m.Platform.objects.values("id", "code", "name")),
            "tpos": list(m.Tpo.objects.values("id", "name")),
        }
    )


# -----------------------------------------------------------------------------
# 0번 공통 — 작품 카드 목록
# -----------------------------------------------------------------------------


@api_view(["GET"])
def contents(request):
    """작품 카드 목록. 공통 규칙(필터·offset/limit·카드 모양)을 보여 주는 기본 목록이기도 합니다.

    정렬: 평가 수 많은 순 → 작품 번호 순
    """
    qs = filter_contents(m.Content.objects.all(), request.query_params)
    qs = contents_for_cards(qs).order_by("-rating_count", "id")
    return paginate(qs, request, ContentCardSerializer)


@api_view(["GET"])
def content_search(request):
    query = request.query_params.get("q", "").strip()
    if len(query) < 2:
        return Response([])

    qs = contents_for_cards(m.Content.objects.filter(title__icontains=query).order_by("title", "id"))[:20]
    cards = ContentCardSerializer(qs, many=True).data
    return Response([
        {key: card[key] for key in ("id", "title", "content_type", "release_year", "poster_url")}
        for card in cards
    ])


@api_view(["GET"])
def content_detail(request, content_id):
    content = contents_for_cards().filter(pk=content_id).first()
    if content is None:
        raise NotFound("작품을 찾을 수 없어요")
    data = dict(ContentCardSerializer(content).data)
    data["rating"]["by_age_group"] = [
        group for group in data["rating"]["by_age_group"] if group["count"] >= 3
    ]

    if request.user.is_authenticated:
        rating = m.Rating.objects.filter(content=content, member=request.user).first()
        data["my"] = {
            "score": round(float(rating.score), 1) if rating else None,
            "liked": m.ContentLike.objects.filter(content=content, member=request.user).exists(),
        }
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def content_watch(request, content_id):
    content = m.Content.objects.filter(pk=content_id).first()
    if content is None:
        raise NotFound("작품을 찾을 수 없어요")
    m.WatchHistory.objects.create(member=request.user, content=content, source=m.WatchSource.DIRECT)
    return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------------------
# 회원가입 · 로그인
# -----------------------------------------------------------------------------


@api_view(["GET"])
@authentication_classes([])
def check_nickname_view(request):
    nickname = request.query_params.get("nickname", "").strip()
    reason = check_nickname(nickname)
    return Response({"nickname": nickname, "available": reason is None, "reason": reason})


@api_view(["POST"])
@authentication_classes([])
def signup(request):
    serializer = SignupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    member = serializer.save()
    return token_payload(member, status.HTTP_201_CREATED)


@api_view(["POST"])
@authentication_classes([])
def login(request):
    serializer = LoginSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    member = serializer.validated_data["member"]
    member.last_login = timezone.now()
    member.save(update_fields=["last_login"])
    return token_payload(member)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------------------
# 내 정보 · 취향 설문
# -----------------------------------------------------------------------------


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(me_payload(request.user))


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def save_survey(request):
    serializer = SurveySerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    member = request.user

    with transaction.atomic():
        member.age_group = data.get("age_group")
        member.job = data.get("job")
        member.survey_completed_at = timezone.now()
        member.save(update_fields=["age_group", "job", "survey_completed_at"])

        # 다시 설문하면 예전 장르 취향을 지우고 새로 저장
        member.genre_preferences.all().delete()
        genres = {g.name: g for g in m.Genre.objects.all()}
        m.GenrePreference.objects.bulk_create(
            [m.GenrePreference(member=member, genre=genres[n], kind=m.PreferenceKind.LIKE) for n in data["liked_genres"]]
            + [m.GenrePreference(member=member, genre=genres[n], kind=m.PreferenceKind.DISLIKE) for n in data["disliked_genres"]]
        )
    return Response(me_payload(member))
