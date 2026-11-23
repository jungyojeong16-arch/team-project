"""
6-1 통합 랭킹 — ViewFit 지수 계산 · 저장 · 조회

docs/prd/6-1_total_ranking.md 의 'ViewFit 지수 계산'

    지수 = 70 × (TMDB 인기도 순위 백분위) + 30 × (ViewFit 보정 평점 / 5)
    ViewFit 보정 평점 = (평가 수 × 평균 + 5 × 전체 평균) / (평가 수 + 5)

  - TMDB 인기도: 집계할 때 TMDB 에서 지금 인기도를 받아 옴 (2-1 의 tmdb.py 사용).
    받지 못하면(키 없음·인터넷 끊김·--offline) 저장해 둔 TMDB 평가 수(content.tmdb_vote_count)로 대신함.
  - 평점: 주간은 집계일까지 최근 7일, 월간은 최근 30일 동안 남긴 평점
  - 상위 100개를 ranking 에 (period, ranked_on, rank, score) 로 저장. 같은 날 다시 집계하면 그날 것을 지우고 새로.
  - 순위 변동(↑↓ NEW)은 저장하지 않고, 조회할 때 '바로 전 집계'와 비교해서 계산 (ERD 원칙 ⑤)
"""
import datetime
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Avg, Count, Q
from django.utils import timezone

from . import models as m
from . import tmdb

TOP_N = 100
POPULARITY_WEIGHT = 70
RATING_WEIGHT = 30
PRIOR_COUNT = 5  # 보정 평점의 '5'
WINDOW_DAYS = {m.RankingPeriod.WEEKLY: 7, m.RankingPeriod.MONTHLY: 30}
MAX_TMDB_PAGES = 50  # 종류(영화/시리즈)마다 인기 목록을 최대 몇 페이지(20개씩)까지 볼지


# =============================================================================
# 1. TMDB 인기도
# =============================================================================


def fetch_popularity(wanted, log=None):
    """{(작품유형, tmdb_id), …} → {(작품유형, tmdb_id): TMDB 인기도}

    import_tmdb 와 같은 '한국 OTT 인기 목록'을 앞에서부터 넘기며, 우리 DB 에 있는 작품을 다 찾으면 멈춤.
    목록에서 못 찾은 작품은 결과에 없음 (= 인기도 가장 낮음).
    """
    found = {}
    for content_type in (m.ContentType.MOVIE, m.ContentType.SERIES):
        targets = {tid for kind, tid in wanted if kind == content_type}
        page, total_pages = 1, 1
        while targets and page <= min(total_pages, MAX_TMDB_PAGES):
            result = tmdb.discover(content_type, page)
            total_pages = result.get("total_pages") or 1
            for item in result.get("results", []):
                tid = item.get("id")
                if tid in targets:
                    found[(content_type, tid)] = float(item.get("popularity") or 0)
                    targets.discard(tid)
            page += 1
        if log and targets:
            log(f"  {content_type}: TMDB 인기 목록 {page - 1}페이지 안에 없는 작품 {len(targets)}개 → 인기도 가장 낮게")
    return found


# =============================================================================
# 2. 지수 계산
# =============================================================================


def _end_of_day(day):
    """집계일 하루가 끝나는 순간 (한국 시간)"""
    return timezone.make_aware(datetime.datetime.combine(day + datetime.timedelta(days=1), datetime.time.min))


def compute_scores(period, ranked_on, popularity=None):
    """작품별 ViewFit 지수를 계산해 높은 순으로 [(작품, 지수 Decimal)] 을 돌려줌.

    popularity 가 None 이면 TMDB 평가 수(tmdb_vote_count)를 인기도로 씀.
    """
    end = _end_of_day(ranked_on)
    start = end - datetime.timedelta(days=WINDOW_DAYS[period])
    in_window = Q(ratings__rated_at__gte=start, ratings__rated_at__lt=end)

    on_ott = m.ContentPlatform.objects.values("content_id")  # OTT 에서 볼 수 있는 작품만
    contents = list(
        m.Content.objects.filter(pk__in=on_ott).annotate(
            w_avg=Avg("ratings__score", filter=in_window),
            w_count=Count("ratings", filter=in_window),
        )
    )
    if not contents:
        return []

    # 전체 평균 (기간 안의 모든 평점)
    window_ratings = m.Rating.objects.filter(rated_at__gte=start, rated_at__lt=end).aggregate(avg=Avg("score"))
    global_avg = float(window_ratings["avg"] or 0)

    # 인기도 순위 백분위: 가장 인기 있는 작품 1.0, 가장 낮은 작품 0.0
    def pop_key(c):
        if popularity is None:
            value = float(c.tmdb_vote_count or 0)
        else:
            value = popularity.get((c.content_type, c.tmdb_id), -1.0)
        return (-value, -(c.tmdb_vote_count or 0), c.id)

    by_pop = sorted(contents, key=pop_key)
    n = len(by_pop)
    percentile = {c.id: (1.0 if n == 1 else 1 - i / (n - 1)) for i, c in enumerate(by_pop)}

    scored = []
    for c in contents:
        v = c.w_count or 0
        avg = float(c.w_avg or 0)
        adjusted = (v * avg + PRIOR_COUNT * global_avg) / (v + PRIOR_COUNT)
        score = POPULARITY_WEIGHT * percentile[c.id] + RATING_WEIGHT * (adjusted / 5)
        scored.append((c, Decimal(str(score)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP), score))

    scored.sort(key=lambda t: (-t[2], pop_key(t[0])))
    return [(c, s) for c, s, _ in scored]


@transaction.atomic
def save_rankings(period, ranked_on, scored, top_n=TOP_N):
    """그날 집계를 지우고 상위 top_n 개 저장. 저장한 행 수를 돌려줌."""
    m.Ranking.objects.filter(period=period, ranked_on=ranked_on).delete()
    rows = [
        m.Ranking(content=c, period=period, ranked_on=ranked_on, rank=i + 1, score=s)
        for i, (c, s) in enumerate(scored[:top_n])
    ]
    m.Ranking.objects.bulk_create(rows)
    return len(rows)


# =============================================================================
# 3. 조회 (API · 홈)
# =============================================================================


def latest_date(period, on_or_before=None):
    qs = m.Ranking.objects.filter(period=period)
    if on_or_before:
        qs = qs.filter(ranked_on__lte=on_or_before)
    return qs.order_by("-ranked_on").values_list("ranked_on", flat=True).first()


def previous_ranks(period, ranked_on):
    """바로 전 집계의 {작품 번호: 순위}. 전 집계가 없으면 None"""
    prev_day = (
        m.Ranking.objects.filter(period=period, ranked_on__lt=ranked_on)
        .order_by("-ranked_on")
        .values_list("ranked_on", flat=True)
        .first()
    )
    if prev_day is None:
        return None
    return dict(
        m.Ranking.objects.filter(period=period, ranked_on=prev_day).values_list("content_id", "rank")
    )


def change_of(row, prev):
    """(rank_change, is_new) — 전체 순위 기준. 전 집계가 아예 없으면 변동 없음(—)으로."""
    if prev is None:
        return 0, False
    if row.content_id not in prev:
        return 0, True
    return prev[row.content_id] - row.rank, False


def ranking_rows(period, ranked_on, content_ids=None):
    """그날 랭킹 행(작품 포함)을 순위 순으로. content_ids 가 있으면 그 작품만."""
    qs = m.Ranking.objects.filter(period=period, ranked_on=ranked_on)
    if content_ids is not None:
        qs = qs.filter(content_id__in=content_ids)
    return list(qs.order_by("rank"))


# =============================================================================
# 6-2 세대별 랭킹 — 저장하지 않고 조회할 때 계산 (docs/prd/6-2_generation_ranking.md 4번 SQL)
# =============================================================================

GENERATION_TOP_N = 30
GENERATION_MIN_COUNT = 3  # 평가 3개 미만은 제외
DEMO_EMAIL_SUFFIX = "@demo.viewfit.local"  # seed_demo 가상 회원 (D12)


def generation_rows(age_group, content_ids=None):
    """평가할 당시 연령대(age_group_at_rating)로 묶은 작품별 평균·평가 수, 높은 순 최대 30개.

    [{"content_id", "average"(Decimal), "count"}, …]
    content_ids 가 있으면 그 작품만 (필터). 회원의 지금 연령대가 아니라 평가 당시 연령대 기준 (ERD 원칙 ④).
    """
    qs = m.Rating.objects.filter(age_group_at_rating=age_group)
    if content_ids is not None:
        qs = qs.filter(content_id__in=content_ids)
    return list(
        qs.values("content_id")
        .annotate(average=Avg("score"), count=Count("id"))
        .filter(count__gte=GENERATION_MIN_COUNT)
        .order_by("-average", "-count", "content_id")[:GENERATION_TOP_N]
    )


def has_demo_ratings(age_group, content_ids):
    """이 순위에 시연용 가상 회원의 평점이 섞여 있는지"""
    return m.Rating.objects.filter(
        age_group_at_rating=age_group, content_id__in=content_ids, member__email__endswith=DEMO_EMAIL_SUFFIX
    ).exists()
