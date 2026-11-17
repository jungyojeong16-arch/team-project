"""
0-4 홈 피드 계산 — GET /api/v1/home/feed/

프론트엔드 app/_lib/viewfit.ts 의 HomeFeed 타입과 같은 모양을 만듭니다.

※ 지금은 "임시 버전"입니다. 아래 영역은 담당 기능이 완성되면 그 결과로 바꿉니다.
  - recommendations · hero : 7-1 맞춤 추천이 생기면 recommendation 테이블의 최신 묶음으로 교체
  - rankings              : 6-1 통합 랭킹이 생기면 ranking 테이블로 교체 (순위 변동도 그때)
  - cross_age_picks       : 6-2 세대별 랭킹이 생기면 교체
"""
from collections import defaultdict
from decimal import Decimal

from django.utils import timezone

from . import models as m
from .common import contents_for_cards
from .serializers import ContentCardSerializer

RECOMMEND_SIZE = 10
RANKING_SIZE = 10
CROSS_AGE_SIZE = 12
CROSS_AGES = ["20s", "30s", "40s"]  # Figma 세대별 교차 평점 영역
CROSS_AGE_MIN_COUNT = 3  # 연령대별 평가가 3개 이상일 때만 평균을 믿음 (4-1 FR2 와 같은 기준)
RANKING_PRIOR_COUNT = 5  # 평가 수가 적은 작품이 1위가 되지 않게 (베이지안 평균)


# =============================================================================
# 시간대 → 상황 (임시 규칙: 7-1 이 생기면 회원이 고른 상황 우선)
# =============================================================================


def time_slot(now):
    hour = now.hour
    if 5 <= hour < 11:
        return "morning"
    if 11 <= hour < 17:
        return "afternoon"
    if 17 <= hour < 22:
        return "evening"
    return "late_night"


def situation_for(now):
    """지금 시각·요일에 어울리는 상황(TPO) 이름 — DB 기본 데이터 5개 중 하나"""
    weekend = now.weekday() >= 5
    slot = time_slot(now)
    if slot == "late_night":
        return "혼자 보는 밤"
    if slot == "evening":
        return "주말에 함께" if weekend else "퇴근 후"
    if slot == "afternoon":
        return "가족과 함께" if weekend else "여행이 필요할 때"
    return "여행이 필요할 때"


# =============================================================================
# 점수 계산
# =============================================================================


def _overall(content):
    return float(content.rating_avg or 0)


def ranking_score(content, global_avg):
    """평가 수가 적으면 전체 평균 쪽으로 당기는 평균 (6-1 ViewFit 지수가 생기기 전 임시)"""
    v = content.rating_count or 0
    k = RANKING_PRIOR_COUNT
    return (v / (v + k)) * _overall(content) + (k / (v + k)) * global_avg


def taste_score(content, liked, situation_ids):
    """7-1 '추천 점수' 표의 간단 버전: 선호 장르 겹침 +3씩, 상황 연결 +4, 평균 평점"""
    genre_ids = {g.id for g in content.genres.all()}
    score = 3 * len(genre_ids & liked)
    if situation_ids is not None and content.id in situation_ids:
        score += 4
    return score + _overall(content)


# =============================================================================
# 홈 피드
# =============================================================================


def _cards(contents):
    return ContentCardSerializer(contents, many=True).data


def _member_payload(member):
    if member is None:
        return {"id": 0, "nickname": "손님", "age_group": None, "occupation": ""}
    return {
        "id": member.id,
        "nickname": member.nickname,
        "age_group": member.age_group,
        "occupation": member.get_job_display() if member.job else "",
    }


def build_home_feed(member=None, now=None):
    now = timezone.localtime(now) if now else timezone.localtime()
    situation = situation_for(now)
    tpo = m.Tpo.objects.filter(name=situation).first()
    situation_ids = set(m.ContentTpo.objects.filter(tpo=tpo).values_list("content_id", flat=True)) if tpo else None

    on_ott = m.ContentPlatform.objects.values("content_id")  # OTT 에서 볼 수 있는 작품만
    contents = list(contents_for_cards(m.Content.objects.filter(pk__in=on_ott)))
    if not contents:
        return _empty_feed(member, now, situation)

    # --- 맞춤 추천 (비선호 장르·이미 평가/시청한 작품 제외) ---
    liked, disliked, seen = set(), set(), set()
    if member is not None:
        for pref in m.GenrePreference.objects.filter(member=member):
            (liked if pref.kind == m.PreferenceKind.LIKE else disliked).add(pref.genre_id)
        seen |= set(m.Rating.objects.filter(member=member).values_list("content_id", flat=True))
        seen |= set(m.WatchHistory.objects.filter(member=member).values_list("content_id", flat=True))
    candidates = [
        c for c in contents if c.id not in seen and not ({g.id for g in c.genres.all()} & disliked)
    ] or contents
    recommended = sorted(candidates, key=lambda c: (-taste_score(c, liked, situation_ids), -(c.rating_count or 0), c.id))
    recommended = recommended[:RECOMMEND_SIZE]
    hero = recommended[0]

    # --- 통합 랭킹 TOP 10 (임시) ---
    rated = [c for c in contents if c.rating_count]
    total_votes = sum(c.rating_count for c in rated)
    global_avg = sum(_overall(c) * c.rating_count for c in rated) / total_votes if total_votes else 0  # 전체 평점 평균
    ranking = sorted(rated or contents, key=lambda c: (-ranking_score(c, global_avg), c.id))[:RANKING_SIZE]

    # --- 세대별 교차 평점 (20·30·40대 모두 평가 3개 이상) ---
    cross = [c for c in contents if _has_all_ages(c)]
    cross = sorted(cross, key=lambda c: (-(c.rating_count or 0), c.id))[:CROSS_AGE_SIZE]

    return {
        "user": _member_payload(member),
        "tpo": {
            "time_slot": time_slot(now),
            "situation": situation,
            "mood_tags": [f"#{situation.replace(' ', '')}"] + [f"#{g.name}" for g in hero.genres.all()][:2],
        },
        "hero": {"message": _hero_message(hero, member, situation), "movie": _cards([hero])[0]},
        "recommendations": _cards(recommended),
        "rankings": [
            {"rank": i + 1, "rank_change": 0, "is_new": False, "movie": card}
            for i, card in enumerate(_cards(ranking))
        ],
        "cross_age_picks": _cards(cross),
    }


def _has_all_ages(content):
    counts = defaultdict(int)
    for r in content.ratings.all():
        counts[r.age_group_at_rating] += 1
    return all(counts[age] >= CROSS_AGE_MIN_COUNT for age in CROSS_AGES)


def _hero_message(hero, member, situation):
    """오늘의 추천 문구 — 실제 숫자만 씀 (7-1 한 줄 큐레이션이 생기면 교체)"""
    genres = [g.name for g in hero.genres.all()]
    headline = f"{situation}에 어울리는 {genres[0] if genres else '작품'} 한 편"
    age = member.age_group if member is not None else None
    if age:
        fans = sum(1 for r in hero.ratings.all() if r.age_group_at_rating == age and r.score >= Decimal("4.0"))
        if fans:
            label = dict(m.AgeGroup.choices)[age]
            return {"headline": headline, "reason": f"{label} {fans:,}명이 4점 이상을 줬어요"}
    count = hero.rating_count or 0
    reason = f"ViewFit 회원 {count:,}명의 평균 ★{_overall(hero):.1f}" if count else "아직 평가가 없는 새 작품이에요"
    return {"headline": headline, "reason": reason}


def _empty_feed(member, now, situation):
    """작품이 하나도 없을 때 (import_tmdb 전) — 화면은 빈 상태로"""
    return {
        "user": _member_payload(member),
        "tpo": {"time_slot": time_slot(now), "situation": situation, "mood_tags": []},
        "hero": None,
        "recommendations": [],
        "rankings": [],
        "cross_age_picks": [],
    }
