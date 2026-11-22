"""
7-1 맞춤 추천 (TPO · AI) — 추천 점수 계산과 추천 묶음 저장

추천 점수 (docs/prd/7-1_tpo_recommend.md '추천 점수' 표, 처음 버전 — 규칙 기반)
    선호 장르와 겹침                                   장르 1개당 +3        liked_genre_points
    비선호 장르 포함                                   후보에서 제외        candidates
    고른 상황(TPO)과 연결된 작품                        +4                  situation_points
        - 상황을 고르면 그 상황과 연결된 작품만 후보 (전체 상황이면 거르지 않고 점수도 생략)
    기억에 남는 작품·좋아요·평점 4.0 이상 작품과 장르가 겹침   겹치는 작품 1개당 +1 (최대 +4)   loved_work_points
    내 연령대 평균 평점                                 +평균 (0~5)          age_average_points
        - 내 연령대 평가가 없거나 연령대를 고르지 않았으면 전체 평균
    이미 평가했거나 시청 기록(설문의 기억에 남는 작품 포함)이 있는 작품   후보에서 제외
        - 단, [바로 보기]만 누르고 7-2 재방문 피드백에서 "아직 못 봤어요"라고 답한 작품은 다시 후보 (11/22)
    같은 점수면 통합 랭킹(주간) 순위가 높은 작품 → 평가 수 많은 작품 → 작품 번호 순

추천 묶음 (recommendation 테이블)
    - 회원 × 상황마다 상위 50개를 저장합니다. 전체 상황 묶음은 tpo 가 비어 있습니다(NULL).
    - 한 묶음의 행은 추천일시가 모두 같습니다. 다시 만들면 새 행이 추가되고(기록은 남김, ERD 원칙 ③)
      화면은 가장 최근 묶음을 보여 줍니다.
    - 새로 만드는 때 (FR7)
        · 오늘 만든 묶음이 없을 때 (하루 첫 방문)
        · 설문·취향을 다시 저장했을 때 (member.survey_completed_at 이 묶음보다 나중)
        · POST /recommendations/refresh/ (8-1·8-2) — 전체 상황 묶음을 새로 만들면 상황별 묶음도 다음 조회 때 새로 만듦
"""
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from decimal import Decimal

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from . import models as m
from . import ranking
from .common import contents_for_cards
from .curation import ALL_SITUATIONS, make_reason, pick_situation_genre

BATCH_SIZE = 50
LIKED_GENRE_POINT = 3
SITUATION_POINT = 4
LOVED_WORK_POINT = 1
LOVED_WORK_MAX = 4
LOVED_SCORE = Decimal("4.0")
NO_RANK = 10**6  # 통합 랭킹에 없는 작품


# =============================================================================
# 회원 취향 (한 번만 불러와서 모든 작품 점수에 씀)
# =============================================================================


@dataclass
class Taste:
    liked: set = field(default_factory=set)  # 선호 장르 번호
    liked_names: set = field(default_factory=set)  # 선호 장르 이름 (한 줄 이유에 씀)
    disliked: set = field(default_factory=set)  # 비선호 장르 번호
    seen: set = field(default_factory=set)  # 평가했거나 시청 기록이 있는 작품 번호
    loved_genres: list = field(default_factory=list)  # 기억에 남는 작품·좋아요·평점 4.0 이상 작품마다 장르 번호 집합
    age_group: str | None = None


def load_taste(member):
    taste = Taste(age_group=member.age_group)
    for pref in member.genre_preferences.select_related("genre"):
        if pref.kind == m.PreferenceKind.LIKE:
            taste.liked.add(pref.genre_id)
            taste.liked_names.add(pref.genre.name)
        else:
            taste.disliked.add(pref.genre_id)

    ratings = m.Rating.objects.filter(member=member)
    watched = m.WatchHistory.objects.filter(member=member)
    # 7-2 에서 "아직 못 봤어요"라고 답한 작품은 [바로 보기] 기록이 있어도 다시 추천 (평가·설문의 기억에 남는 작품은 그대로 제외)
    not_watched = set(
        m.Recommendation.objects.filter(member=member, feedback=m.RecommendationFeedback.NOT_WATCHED).values_list(
            "content_id", flat=True
        )
    )
    taste.seen = (
        set(ratings.values_list("content_id", flat=True))
        | set(watched.filter(source=m.WatchSource.SURVEY).values_list("content_id", flat=True))
        | (set(watched.exclude(source=m.WatchSource.SURVEY).values_list("content_id", flat=True)) - not_watched)
    )

    loved = set(watched.filter(source=m.WatchSource.SURVEY).values_list("content_id", flat=True))
    loved |= set(m.ContentLike.objects.filter(member=member).values_list("content_id", flat=True))
    loved |= set(ratings.filter(score__gte=LOVED_SCORE).values_list("content_id", flat=True))
    genres_of = defaultdict(set)
    for content_id, genre_id in m.ContentGenre.objects.filter(content_id__in=loved).values_list("content_id", "genre_id"):
        genres_of[content_id].add(genre_id)
    taste.loved_genres = list(genres_of.values())
    return taste


# =============================================================================
# 점수 항목 — 항목마다 작은 함수로 나눠서 나중에 조정하기 쉽게
# =============================================================================


def genre_ids(content):
    return {g.id for g in content.genres.all()}


def liked_genre_points(content, taste):
    return LIKED_GENRE_POINT * len(genre_ids(content) & taste.liked)


def situation_points(content, tpo):
    """상황을 골랐으면 후보가 모두 그 상황과 연결된 작품이라 +4 (전체 상황이면 0)"""
    return SITUATION_POINT if tpo is not None else 0


def loved_work_points(content, taste):
    mine = genre_ids(content)
    overlaps = sum(1 for genres in taste.loved_genres if genres & mine)
    return min(LOVED_WORK_MAX, overlaps * LOVED_WORK_POINT)


def age_average_points(content, taste):
    scores = [r.score for r in content.ratings.all()]
    same_age = [r.score for r in content.ratings.all() if taste.age_group and r.age_group_at_rating == taste.age_group]
    scores = same_age or scores
    return float(sum(scores) / len(scores)) if scores else 0.0


def score(content, taste, tpo=None):
    return (
        liked_genre_points(content, taste)
        + situation_points(content, tpo)
        + loved_work_points(content, taste)
        + age_average_points(content, taste)
    )


# =============================================================================
# 후보 · 순서
# =============================================================================


def candidates(taste, tpo=None):
    """OTT 에서 볼 수 있는 작품 중 비선호 장르·이미 본 작품을 뺀 것 (상황을 고르면 그 상황과 연결된 작품만)"""
    qs = m.Content.objects.filter(pk__in=m.ContentPlatform.objects.values("content_id"))
    if tpo is not None:
        qs = qs.filter(pk__in=m.ContentTpo.objects.filter(tpo=tpo).values("content_id"))
    qs = qs.exclude(pk__in=taste.seen)
    qs = qs.exclude(pk__in=m.ContentGenre.objects.filter(genre_id__in=taste.disliked).values("content_id"))
    return list(contents_for_cards(qs).prefetch_related("tpos"))


def weekly_ranks():
    """가장 최근 주간 통합 랭킹의 {작품 번호: 순위} (6-1 이 랭킹을 만들기 전에는 비어 있음)"""
    latest = ranking.latest_date(m.RankingPeriod.WEEKLY)
    if latest is None:
        return {}
    return {row.content_id: row.rank for row in ranking.ranking_rows(m.RankingPeriod.WEEKLY, latest)}


def rank_contents(taste, tpo=None, limit=BATCH_SIZE):
    """점수 높은 순으로 [(작품, 점수)] — 저장하지 않음"""
    ranks = weekly_ranks()
    scored = [(c, round(score(c, taste, tpo), 4)) for c in candidates(taste, tpo)]
    scored.sort(key=lambda cs: (-cs[1], ranks.get(cs[0].id, NO_RANK), -(cs[0].rating_count or 0), cs[0].id))
    return scored[:limit]


def assign_situations(contents, tpo, liked_names):
    """묶음 순서대로 작품마다 (상황 이름, 장르 이름) — 한 줄 이유와 상황 라벨에 씀.
    고른 상황이 있으면 그 상황, 전체 상황이면 작품에 연결된 상황 중 덜 쓴 상황 먼저 (curation.pick_situation_genre)"""
    used = Counter()
    pairs = []
    for content in contents:
        situations = [tpo.name] if tpo is not None else [t.name for t in content.tpos.all()]
        situation, genre = pick_situation_genre([g.name for g in content.genres.all()], situations, liked_names, used)
        used[situation] += 1
        pairs.append((situation, genre))
    return pairs


# =============================================================================
# 추천 묶음 만들기 · 불러오기
# =============================================================================


def build_recommendations(member, tpo=None, limit=BATCH_SIZE):
    """점수를 계산해 상위 limit 개를 recommendation 에 새 묶음으로 저장하고, 저장한 행 목록을 돌려줌.
    돌려주는 행의 content 는 작품 카드에 필요한 장르·OTT·평점·상황을 이미 불러온 상태입니다."""
    taste = load_taste(member)
    contents = [content for content, _ in rank_contents(taste, tpo, limit)]
    rows = [
        m.Recommendation(member=member, content=content, tpo=tpo, rank=rank, reason=make_reason(situation, genre))
        for rank, (content, (situation, genre)) in enumerate(
            zip(contents, assign_situations(contents, tpo, taste.liked_names)), start=1
        )
    ]
    stamp = timezone.now()
    with transaction.atomic():
        m.Recommendation.objects.bulk_create(rows)
        # 추천일시(auto_now_add)는 행마다 조금씩 달라서, 한 묶음의 추천일시를 하나로 맞춤 (묶음 = 같은 추천일시)
        m.Recommendation.objects.filter(member=member, tpo=tpo, recommended_at__gte=stamp).update(recommended_at=stamp)
    for row in rows:
        row.recommended_at = stamp
    return rows


def latest_stamp(member, tpo=None):
    return m.Recommendation.objects.filter(member=member, tpo=tpo).aggregate(at=Max("recommended_at"))["at"]


def latest_batch(member, tpo=None):
    """가장 최근 묶음 (순위 순). 묶음이 없으면 빈 목록"""
    stamp = latest_stamp(member, tpo)
    if stamp is None:
        return []
    return list(m.Recommendation.objects.filter(member=member, tpo=tpo, recommended_at=stamp).order_by("rank"))


def is_fresh(member, tpo, stamp, now):
    if stamp is None or timezone.localdate(stamp) != timezone.localdate(now):
        return False  # 오늘 처음
    if member.survey_completed_at and stamp < member.survey_completed_at:
        return False  # 설문·취향을 다시 저장함
    if tpo is not None:
        overall = latest_stamp(member, None)
        if overall and stamp < overall:
            return False  # 전체 상황 묶음을 새로 만듦 (refresh)
    return True


def current_recommendations(member, tpo=None, now=None):
    """오늘의 추천 묶음 — 없거나 지난 것이면 새로 만들어서 돌려줌 (GET /recommendations/, 홈 피드)"""
    now = now or timezone.now()
    rows = latest_batch(member, tpo)
    if rows and is_fresh(member, tpo, rows[0].recommended_at, now):
        return rows
    return build_recommendations(member, tpo)


def batch_items(member, rows, tpo=None):
    """묶음 행 → [(행, 작품, 상황 이름)] — 작품은 카드에 필요한 것을 불러온 상태, 상황은 만들 때와 같은 규칙으로 계산"""
    cards = {
        c.id: c
        for c in contents_for_cards(m.Content.objects.filter(pk__in=[r.content_id for r in rows])).prefetch_related("tpos")
    }
    rows = [r for r in rows if r.content_id in cards]
    liked = set(
        member.genre_preferences.filter(kind=m.PreferenceKind.LIKE).values_list("genre__name", flat=True)
    )
    pairs = assign_situations([cards[r.content_id] for r in rows], tpo, liked)
    return [(row, cards[row.content_id], situation) for row, (situation, _) in zip(rows, pairs)]


def tpo_from_param(value):
    """요청의 tpo 값 → Tpo (비어 있거나 all·전체 상황이면 None). 없는 상황이면 400"""
    value = (value or "").strip()
    if value in ("", "all", ALL_SITUATIONS):
        return None
    tpo = m.Tpo.objects.filter(name=value).first()
    if tpo is None:
        names = ", ".join(m.Tpo.objects.values_list("name", flat=True))
        raise ValidationError({"tpo": [f"없는 상황이에요: {value} ({ALL_SITUATIONS}, {names} 중 하나)"]})
    return tpo
