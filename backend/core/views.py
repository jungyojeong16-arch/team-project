"""
API 목록 (주소 앞에 /api/v1 이 붙음)

  [확인용]
  GET  /health/                서버·DB 연결 상태, 테이블별 행 개수
  GET  /options/               설문 선택지 (연령대, 직업, 장르, OTT, 상황)

  [0번 공통]
  GET  /contents/              작품 카드 목록 (type·platform·genre·tpo 필터, offset·limit)
  GET  /home/feed/             홈 화면 데이터 (0-4, 로그인하면 내 취향 반영)

  [4-1 작품]
  GET  /contents/search/?q=    제목 검색 (2글자 이상, 최대 20개) — 장르·OTT 코드 포함
  GET  /contents/<id>/         작품 상세 + my{score, liked}
  POST /contents/<id>/watch/   [바로 보기] 시청 기록 {platform}   * 로그인 필요

  [6-1 통합 랭킹]
  GET  /rankings/?period=weekly|monthly&type=&platform=&genre=&offset=&limit=
                               가장 최근 집계일의 TOP 100 (필터 걸면 1위부터 다시 번호)

  [7-1 맞춤 추천]                                            * 로그인 + 취향 설문 필요 (안 했으면 403)
  GET  /recommendations/?tpo=&type=&platform=&genre=&offset=&limit=
                               오늘의 추천 묶음 (없으면 새로 만듦). tpo 비우면 전체 상황
  POST /recommendations/refresh/  {tpo}  지금 바로 새로 만들기 (8-1·8-2)

  [회원]
  GET  /auth/check-nickname/?nickname=  닉네임 사용 가능 여부
  POST /auth/signup/           회원가입 → 로그인 토큰
  POST /auth/login/            로그인 → 로그인 토큰
  POST /auth/logout/           로그아웃 (토큰 삭제)            * 로그인 필요
  GET  /me/                    내 정보 + 설문 결과              * 로그인 필요
  PUT  /me/survey/             취향 설문 저장 (+ 기억에 남는 작품)  * 로그인 필요

로그인이 필요한 API 는 요청 헤더에  Authorization: Token <토큰>  을 붙입니다.
"""
from django.db import connection, transaction
from django.db.models import Count
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import models as m
from . import ranking, recommend
from .common import contents_for_cards, filter_contents, page_bounds, paginate
from .curation import ALL_SITUATIONS, situation_label
from .home import build_home_feed
from .serializers import (
    ContentCardSerializer, LoginSerializer, MeSerializer, SignupSerializer, SurveySerializer, check_nickname, content_brief,
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

        # 3-1 기억에 남는 작품: 설문에서 넣은 기록(source=survey)만 지우고 새로 넣음 — [바로 보기] 기록(direct)은 그대로
        member.watch_histories.filter(source=m.WatchSource.SURVEY).delete()
        m.WatchHistory.objects.bulk_create(
            [
                m.WatchHistory(member=member, content_id=cid, source=m.WatchSource.SURVEY)
                for cid in data["memorable_content_ids"]
            ]
        )
    return Response(me_payload(member))


# -----------------------------------------------------------------------------
# 4-1 작품 검색 · 상세 · OTT 바로가기 (백엔드 — 화면은 정재준)
# -----------------------------------------------------------------------------

SEARCH_LIMIT = 20


def _content_or_404(content_id):
    content = contents_for_cards(m.Content.objects.filter(pk=content_id)).first()
    if content is None:
        raise NotFound("작품을 찾을 수 없어요.")
    return content


@api_view(["GET"])
def content_search(request):
    """제목에 q 가 들어간 작품 최대 20개 (FR1). 2글자 미만이면 400."""
    q = request.query_params.get("q", "").strip()
    if len(q) < 2:
        return Response({"q": ["두 글자 이상 입력해 주세요."]}, status=status.HTTP_400_BAD_REQUEST)
    rows = (
        m.Content.objects.filter(title__icontains=q)
        .annotate(rating_count=Count("ratings"))
        .order_by("-rating_count", "id")
        .prefetch_related("genres", "contentplatform_set__platform")[:SEARCH_LIMIT]
    )
    return Response([content_brief(c) for c in rows])


@api_view(["GET"])
def content_detail(request, content_id):
    """작품 상세 = 작품 카드 + my{score, liked} (로그인했을 때만, 아니면 null)"""
    content = _content_or_404(content_id)
    data = ContentCardSerializer(content).data
    my = None
    if request.user.is_authenticated:
        rating = m.Rating.objects.filter(member=request.user, content=content).first()
        my = {
            "score": float(rating.score) if rating else None,
            "liked": m.ContentLike.objects.filter(member=request.user, content=content).exists(),
        }
    data["my"] = my
    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def content_watch(request, content_id):
    """[바로 보기] 를 누르면 시청 기록(source=direct) 저장 (FR5). body: {platform: "NETFLIX"}"""
    content = _content_or_404(content_id)
    code = (request.data or {}).get("platform", "")
    if not m.ContentPlatform.objects.filter(content=content, platform__code=code).exists():
        codes = ", ".join(cp.platform.code for cp in content.contentplatform_set.all())
        return Response({"platform": [f"이 작품을 볼 수 있는 OTT가 아니에요. ({codes})"]}, status=status.HTTP_400_BAD_REQUEST)
    m.WatchHistory.objects.create(member=request.user, content=content, source=m.WatchSource.DIRECT)
    return Response(status=status.HTTP_204_NO_CONTENT)


# -----------------------------------------------------------------------------
# 6-1 통합 랭킹 (정준교) — 계산·저장은 core/ranking.py, 집계 명령 build_rankings
# -----------------------------------------------------------------------------

RANKING_FILTERS = ("type", "platform", "genre")


@api_view(["GET"])
def rankings(request):
    """통합 랭킹 TOP 100 (가장 최근 집계일).

    ?period=weekly|monthly &type= &platform= &genre= &offset=0 &limit=20
    - 필터를 걸면 조건에 맞는 작품만 1위부터 다시 번호를 매김 (rank). 전체 순위는 overall_rank.
    - rank_change(+상승/−하락)·is_new 는 전체 순위로 바로 전 집계와 비교
    """
    params = request.query_params
    period = params.get("period") or m.RankingPeriod.WEEKLY
    if period not in m.RankingPeriod.values:
        return Response({"period": ["weekly, monthly 중 하나로 입력해 주세요."]}, status=status.HTTP_400_BAD_REQUEST)
    offset, limit = page_bounds(params)

    ranked_on = ranking.latest_date(period)
    rows = ranking.ranking_rows(period, ranked_on) if ranked_on else []
    if rows and any((params.get(k) or "all") != "all" for k in RANKING_FILTERS):
        ids = [r.content_id for r in rows]
        allowed = set(filter_contents(m.Content.objects.filter(pk__in=ids), params).values_list("pk", flat=True))
        rows = [r for r in rows if r.content_id in allowed]
    else:
        filter_contents(m.Content.objects.none(), params)  # 잘못된 필터 값은 집계가 없어도 400

    page = rows[offset : offset + limit]
    prev = ranking.previous_ranks(period, ranked_on) if ranked_on else None
    page_contents = list(contents_for_cards(m.Content.objects.filter(pk__in=[r.content_id for r in page])))
    cards = dict(zip((c.id for c in page_contents), ContentCardSerializer(page_contents, many=True).data))
    items = []
    for i, row in enumerate(page, start=offset + 1):
        change, is_new = ranking.change_of(row, prev)
        items.append(
            {
                "rank": i,
                "overall_rank": row.rank,
                "rank_change": change,
                "is_new": is_new,
                "score": float(row.score) if row.score is not None else None,
                "movie": cards[row.content_id],
            }
        )
    return Response(
        {
            "period": period,
            "ranked_on": ranked_on,
            "total": len(rows),
            "offset": offset,
            "limit": limit,
            "next_offset": offset + limit if offset + limit < len(rows) else None,
            "items": items,
        }
    )


# -----------------------------------------------------------------------------
# 7-1 맞춤 추천 — 계산은 core/recommend.py, 한 줄 문구는 core/curation.py
# -----------------------------------------------------------------------------

SURVEY_REQUIRED = {"detail": "취향 설문을 먼저 해 주세요.", "survey_required": True}


def recommendation_page(request, rows, tpo):
    """추천 묶음 → 목록 응답. type·platform·genre 로 묶음 안에서 거르고 offset·limit 으로 나눔.

    {tpo, recommended_at, count, offset, limit, next_offset,
     results: [{rank, tpo, situation_label, reason, content: 작품 카드}]}
    """
    recommended_at = timezone.localtime(rows[0].recommended_at).isoformat(timespec="seconds") if rows else None
    filters = {name: request.query_params.get(name) for name in ("type", "platform", "genre")}
    allowed = set(
        filter_contents(m.Content.objects.filter(pk__in=[r.content_id for r in rows]), filters).values_list("pk", flat=True)
    )
    # 상황 라벨은 묶음 전체 순서로 정해지므로 거르기 전에 계산
    items = [item for item in recommend.batch_items(request.user, rows, tpo) if item[0].content_id in allowed]
    offset, limit = page_bounds(request.query_params)
    results = [
        {
            "rank": row.rank,
            "tpo": situation,
            "situation_label": situation_label(situation),
            "reason": row.reason,
            "content": ContentCardSerializer(content).data,
        }
        for row, content, situation in items[offset : offset + limit]
    ]
    return Response(
        {
            "tpo": tpo.name if tpo else ALL_SITUATIONS,
            "recommended_at": recommended_at,
            "count": len(items),
            "offset": offset,
            "limit": limit,
            "next_offset": offset + limit if offset + limit < len(items) else None,
            "results": results,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recommendations(request):
    if request.user.survey_completed_at is None:
        return Response(SURVEY_REQUIRED, status=status.HTTP_403_FORBIDDEN)
    tpo = recommend.tpo_from_param(request.query_params.get("tpo"))
    return recommendation_page(request, recommend.current_recommendations(request.user, tpo), tpo)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def recommendations_refresh(request):
    """지금 바로 새 묶음 만들기 (8-1 취향 수정·8-2 최근 관심사 반영에서 호출). body: {tpo} — 비우면 전체 상황"""
    if request.user.survey_completed_at is None:
        return Response(SURVEY_REQUIRED, status=status.HTTP_403_FORBIDDEN)
    tpo = recommend.tpo_from_param((request.data or {}).get("tpo"))
    return recommendation_page(request, recommend.build_recommendations(request.user, tpo), tpo)


# -----------------------------------------------------------------------------
# 0-4 홈 피드 (3명 공동) — 계산은 core/home.py
# -----------------------------------------------------------------------------


@api_view(["GET"])
def home_feed(request):
    member = request.user if request.user.is_authenticated else None
    return Response(
        {
            "success": True,
            "data": build_home_feed(member),
            "meta": {"generated_at": timezone.localtime().isoformat(timespec="seconds"), "version": "v1"},
        }
    )
