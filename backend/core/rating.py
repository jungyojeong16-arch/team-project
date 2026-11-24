"""
5-1 평점 — 나의 평점 목록 · 평점 반영 결과 (docs/prd/5-1_rating.md)

  my_ratings(member, params)        나의 평점 목록 (type·score 필터, 정렬, 3개씩 페이지) + 요약
  rating_result(member, content)    방금 평가한 작품의 통합 랭킹(주간) 현재/이전 순위 + 주변 순위

저장은 common.save_rating() (7-2 재방문 피드백과 같은 규칙: 한 작품 1개, 다시 하면 수정),
입력 검사는 serializers.RatingInputSerializer (0.5 단위, 한마디 200자).
"""
from decimal import Decimal

from django.db.models import Avg, Count
from rest_framework.exceptions import ValidationError

from . import models as m
from . import ranking
from .common import _int_param, contents_for_cards

PAGE_SIZE = 3  # Figma 220:2672 — 한 페이지 3개

# 별점 필터 (Figma '별점 전체' 드롭다운): 5점 / 4점대 / 3점대 / 2점대 / 1점대 이하
SCORE_FILTERS = {
    "5": (Decimal("5.0"), Decimal("5.0")),
    "4": (Decimal("4.0"), Decimal("4.5")),
    "3": (Decimal("3.0"), Decimal("3.5")),
    "2": (Decimal("2.0"), Decimal("2.5")),
    "1": (Decimal("0.5"), Decimal("1.5")),
}

# 정렬: 최근 평가순(수정한 것도 최근으로) / 별점 높은 순 / 별점 낮은 순
SORTS = {
    "recent": ("-updated_at", "-id"),
    "score_desc": ("-score", "-updated_at", "-id"),
    "score_asc": ("score", "-updated_at", "-id"),
}


def summary(member):
    """프로필 요약 — 좋아요 수 · 평점 수 · 평균 (저장하지 않고 조회할 때 계산, ERD 원칙 ⑤)"""
    stats = m.Rating.objects.filter(member=member).aggregate(count=Count("id"), average=Avg("score"))
    return {
        "like_count": m.ContentLike.objects.filter(member=member).count(),
        "rating_count": stats["count"],
        "rating_average": round(float(stats["average"]), 1) if stats["average"] is not None else None,
    }


def my_ratings(member, params):
    """(전체 행 수, 이번 페이지 평점 목록, page, total_pages) — 잘못된 값은 400"""
    qs = m.Rating.objects.filter(member=member)

    content_type = params.get("type") or "all"
    if content_type != "all":
        if content_type not in m.ContentType.values:
            raise ValidationError({"type": ["all, movie, series 중 하나로 입력해 주세요."]})
        qs = qs.filter(content__content_type=content_type)

    score = params.get("score") or "all"
    if score != "all":
        if score not in SCORE_FILTERS:
            raise ValidationError({"score": ["all, 5, 4, 3, 2, 1 중 하나로 입력해 주세요."]})
        low, high = SCORE_FILTERS[score]
        qs = qs.filter(score__gte=low, score__lte=high)

    sort = params.get("sort") or "recent"
    if sort not in SORTS:
        raise ValidationError({"sort": [f"{', '.join(SORTS)} 중 하나로 입력해 주세요."]})
    qs = qs.order_by(*SORTS[sort])

    count = qs.count()
    total_pages = max(1, -(-count // PAGE_SIZE))
    page = _int_param(params, "page", 1, 1)
    page = min(page, total_pages)  # 지우고 나서 마지막 페이지가 사라져도 빈 화면 대신 마지막 페이지
    rows = list(qs[(page - 1) * PAGE_SIZE : page * PAGE_SIZE])
    return count, rows, page, total_pages


def cards_by_id(content_ids):
    """{작품 번호: 작품 카드용 Content} — contents_for_cards 로 한 번에"""
    return {c.id: c for c in contents_for_cards(m.Content.objects.filter(pk__in=content_ids))}


# -----------------------------------------------------------------------------
# 평점 반영 결과 (FR7) — 통합 랭킹(주간)의 가장 최근 집계와 그 전 집계
# -----------------------------------------------------------------------------

PERIOD = m.RankingPeriod.WEEKLY


def rating_result(member, content):
    """내 작품의 현재/이전 순위와 위·아래 1개. 집계가 없거나 TOP 100 밖이면 current_rank=None"""
    ranked_on = ranking.latest_date(PERIOD)
    result = {
        "period": PERIOD,
        "ranked_on": ranked_on,
        "previous_ranked_on": None,
        "current_rank": None,
        "previous_rank": None,
        "rank_change": 0,
        "is_new": False,
        "neighbors": [],
    }
    if ranked_on is None:
        return result

    prev = ranking.previous_ranks(PERIOD, ranked_on)
    if prev is not None:
        result["previous_ranked_on"] = (
            m.Ranking.objects.filter(period=PERIOD, ranked_on__lt=ranked_on)
            .order_by("-ranked_on")
            .values_list("ranked_on", flat=True)
            .first()
        )
        result["previous_rank"] = prev.get(content.id)

    mine = m.Ranking.objects.filter(period=PERIOD, ranked_on=ranked_on, content=content).first()
    if mine is None:
        return result  # TOP 100 밖 (이전 순위는 있을 수 있음)

    change, is_new = ranking.change_of(mine, prev)
    result.update(current_rank=mine.rank, rank_change=change, is_new=is_new)

    rows = list(
        m.Ranking.objects.filter(period=PERIOD, ranked_on=ranked_on, rank__gte=mine.rank - 1, rank__lte=mine.rank + 1)
        .select_related("content")
        .order_by("rank")
    )
    for row in rows:
        row_change, row_new = ranking.change_of(row, prev)
        result["neighbors"].append(
            {
                "rank": row.rank,
                "previous_rank": prev.get(row.content_id) if prev else None,
                "rank_change": row_change,
                "is_new": row_new,
                "is_mine": row.content_id == content.id,
                "content_id": row.content_id,
                "title": row.content.title,
            }
        )
    return result
