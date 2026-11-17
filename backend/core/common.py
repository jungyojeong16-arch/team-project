"""
0번 공통 기반 — 백엔드 공통 도구 (1~8번 담당이 가져다 씀)

docs/prd/0_common_base.md 의 0-2 공통 규칙을 코드로 옮긴 것입니다.

  - paginate()         목록은 offset·limit (기본 20, 최대 100)
  - filter_contents()  필터 바(0-3 FR9)와 같은 값: type=all|movie|series, platform=NETFLIX…, genre=드라마…
  - contents_for_cards()  작품 카드(0-3 FR5)에 필요한 장르·OTT·평점을 한 번에 불러온 작품 목록

잘못된 값은 400 + {"칸이름": ["한국어 안내"]} 모양으로 돌려줍니다 (회원가입 API 와 같은 모양).

사용 예 (views.py)
    qs = filter_contents(contents_for_cards(), request.query_params)
    return paginate(qs, request, ContentCardSerializer)
"""
from django.db.models import Avg, Count, Prefetch, QuerySet
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from . import models as m

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


# -----------------------------------------------------------------------------
# 목록 나누기 (offset · limit)
# -----------------------------------------------------------------------------


def _int_param(params, name, default, minimum, maximum=None):
    raw = params.get(name)
    if raw in (None, ""):
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ValidationError({name: ["숫자로 입력해 주세요."]})
    if value < minimum or (maximum is not None and value > maximum):
        rule = f"{minimum}~{maximum}" if maximum is not None else f"{minimum} 이상"
        raise ValidationError({name: [f"{rule} 사이 숫자로 입력해 주세요."]})
    return value


def page_bounds(params, default_limit=DEFAULT_LIMIT):
    """요청의 offset·limit 을 검사해서 (offset, limit) 으로 돌려줌"""
    offset = _int_param(params, "offset", 0, 0)
    limit = _int_param(params, "limit", default_limit, 1, MAX_LIMIT)
    return offset, limit


def paginate(items, request, serializer_class, default_limit=DEFAULT_LIMIT, context=None):
    """목록 응답 공통 모양: {count, offset, limit, next_offset, results}

    next_offset 이 null 이면 마지막 묶음입니다 (화면의 [펼치기] 버튼을 숨기면 됨).
    items 는 QuerySet 이나 list 모두 됩니다.
    """
    offset, limit = page_bounds(request.query_params, default_limit)
    count = items.count() if isinstance(items, QuerySet) else len(items)
    page = items[offset : offset + limit]
    next_offset = offset + limit if offset + limit < count else None
    data = serializer_class(page, many=True, context={"request": request, **(context or {})}).data
    return Response({"count": count, "offset": offset, "limit": limit, "next_offset": next_offset, "results": data})


# -----------------------------------------------------------------------------
# 작품 목록 필터 (필터 바와 같은 값)
# -----------------------------------------------------------------------------


def filter_contents(qs, params):
    """type / platform / genre / tpo 로 작품을 거름. 비어 있거나 'all' 이면 거르지 않음.

    연결 테이블은 하위 쿼리(pk__in)로 걸러서, 같은 작품이 여러 번 나오거나 평균 평점이 틀어지지 않게 합니다.
    """
    content_type = params.get("type") or "all"
    if content_type != "all":
        if content_type not in m.ContentType.values:
            raise ValidationError({"type": ["all, movie, series 중 하나로 입력해 주세요."]})
        qs = qs.filter(content_type=content_type)

    platform = params.get("platform") or "all"
    if platform != "all":
        if not m.Platform.objects.filter(code=platform).exists():
            codes = ", ".join(m.Platform.objects.values_list("code", flat=True))
            raise ValidationError({"platform": [f"없는 OTT예요. ({codes} 중 하나)"]})
        qs = qs.filter(pk__in=m.ContentPlatform.objects.filter(platform__code=platform).values("content_id"))

    genre = params.get("genre") or "all"
    if genre != "all":
        if not m.Genre.objects.filter(name=genre).exists():
            raise ValidationError({"genre": [f"없는 장르예요: {genre}"]})
        qs = qs.filter(pk__in=m.ContentGenre.objects.filter(genre__name=genre).values("content_id"))

    tpo = params.get("tpo") or "all"
    if tpo != "all":
        if not m.Tpo.objects.filter(name=tpo).exists():
            raise ValidationError({"tpo": [f"없는 상황이에요: {tpo}"]})
        qs = qs.filter(pk__in=m.ContentTpo.objects.filter(tpo__name=tpo).values("content_id"))

    return qs


# -----------------------------------------------------------------------------
# 작품 카드용 목록 (장르·OTT·평점을 한 번에)
# -----------------------------------------------------------------------------


def contents_for_cards(qs=None):
    """작품 카드에 필요한 것을 미리 불러온 QuerySet.

    - 평균 평점·평가 수는 저장하지 않고 조회할 때 계산 (ERD 원칙 ⑤)
    - 연령대별 평점은 ContentCardSerializer 가 prefetch 된 평점으로 계산
    """
    qs = m.Content.objects.all() if qs is None else qs
    return qs.annotate(
        rating_avg=Avg("ratings__score"),
        rating_count=Count("ratings", distinct=True),
    ).prefetch_related(
        "genres",
        Prefetch("contentplatform_set", queryset=m.ContentPlatform.objects.select_related("platform").order_by("platform_id")),
        Prefetch("ratings", queryset=m.Rating.objects.only("id", "content_id", "score", "age_group_at_rating")),
    )
