"""
0-4 홈 피드 계산 — GET /api/v1/home/feed/

프론트엔드 app/_lib/viewfit.ts 의 HomeFeed 타입과 같은 모양을 만듭니다.

영역별 데이터
  - recommendations · hero : ✅ 7-1 — 설문을 마친 회원은 맞춤 추천(전체 상황) 오늘 묶음의 상위 10개, hero = 1위
                             칩·한 줄·태그는 설문 답(직업·선호 장르·기억에 남는 작품)으로 (아래 '설문 답으로 만드는 홈 문구')
                             (설문 안 한 회원·손님은 아래 임시 규칙: 시간대 상황 + 선호 장르)
  - rankings              : ✅ 6-1 주간 랭킹(ranking 테이블)이 있으면 그 1~10위·순위 변동 (없으면 임시 계산)
  - cross_age_picks       : 임시 — 6-2 세대별 랭킹이 생기면 교체
"""
from collections import defaultdict
from decimal import Decimal

from django.utils import timezone

from . import models as m
from . import ranking, recommend
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
# 설문 답으로 만드는 홈 문구 — 설문을 마친 회원만 (Figma "저녁 · 과제 끝난 금요일 밤", PRD 0-4 FR2)
#   칩      : 직업 + 요일 (+ 때)          예) 저녁 · 과제 끝난 금요일 밤
#   한 줄   : 기억에 남는 작품 → 선호 장르 → 취향 점수 1위 순서로 설문 답과 겹치는 것
# =============================================================================

WEEKDAYS = "월화수목금토일"
SLOT_WORDS = {"morning": "아침", "afternoon": "오후", "evening": "저녁", "late_night": "늦은 밤"}  # 화면 칩 앞부분과 같음
# 직업 → (평일 낮, 평일 저녁·밤, 주말) 에 붙는 말. 기타·응답 안 함은 직업 말 없이 요일만
JOB_MOMENTS = {
    m.Job.STUDENT: ("공강인", "과제 끝난", "과제 없는"),
    m.Job.OFFICE: ("잠깐 쉬어 가는", "퇴근한", "출근 없는"),
    m.Job.FREELANCE: ("잠깐 쉬어 가는", "일 마친", "한숨 돌리는"),
    m.Job.HOME: ("한숨 돌리는", "집안일 마친", "한숨 돌리는"),
    m.Job.SEEKING: ("여유로운", "하루를 마친", "여유로운"),
}
TITLE_MAX = 15  # 한 줄에 넣는 기억에 남는 작품 제목 길이


def day_part(now):
    """요일 뒤에 붙는 때"""
    hour = now.hour
    if 5 <= hour < 11:
        return "아침"
    if 11 <= hour < 17:
        return "오후"
    if 17 <= hour < 20:
        return "저녁"
    return "밤" if hour >= 20 else "새벽"


def member_moment(member, now):
    """예) 금 21시 학생 → '과제 끝난 금요일 밤', 일 18시 학생 → '과제 없는 일요일' (칩 앞의 '저녁'과 겹치는 말은 뺌)"""
    slot = time_slot(now)
    phrases = JOB_MOMENTS.get(member.job)
    phrase = ""
    if phrases:
        if now.weekday() >= 5:
            phrase = phrases[2]
        else:
            phrase = phrases[0] if slot in ("morning", "afternoon") else phrases[1]
    part = day_part(now)
    words = [phrase, f"{WEEKDAYS[now.weekday()]}요일", "" if part in SLOT_WORDS[slot] else part]
    return " ".join(w for w in words if w)


def _short_title(title):
    title = title.split(":")[0].strip()  # "헝거게임: 판엠의 불꽃" → "헝거게임"
    return title if len(title) <= TITLE_MAX else title[: TITLE_MAX - 1] + "…"


def taste_headline(hero, member, now):
    """오늘의 추천 한 줄 — 작품 정보와 설문 답에 실제로 있는 것만 씀 (앞에 '20대 학생 ○○님,' 은 화면이 붙임)"""
    genres = [g.name for g in hero.genres.all()]
    kind = "신작" if hero.release_year and hero.release_year >= now.year - 1 else "한 편"
    liked = set(member.genre_preferences.filter(kind=m.PreferenceKind.LIKE).values_list("genre__name", flat=True))

    # ① 기억에 남는 작품(설문)과 장르가 겹치면 그 작품 이름으로
    memorable = (
        m.WatchHistory.objects.filter(member=member, source=m.WatchSource.SURVEY)
        .exclude(content=hero)
        .select_related("content")
        .prefetch_related("content__genres")
        .order_by("watched_at", "id")
    )
    best, shared = None, []
    for row in memorable:
        overlap = [g for g in genres if g in {x.name for x in row.content.genres.all()}]
        if len(overlap) > len(shared):
            best, shared = row.content, overlap
    if best:
        genre = next((g for g in shared if g in liked), shared[0])
        return f"'{_short_title(best.title)}' 좋아하셨다면 딱 맞을 {genre} {kind}"

    # ② 선호 장르가 겹치면 그 장르로
    matched = [g for g in genres if g in liked][:2]
    if matched:
        return f"{'·'.join(matched)} 좋아하는 취향에 딱 맞는 {kind}"

    # ③ 겹치는 답이 없으면 취향 점수 1위라는 사실만
    return f"오늘 취향 점수 1위 {genres[0] if genres else '작품'} {kind}"


def taste_tags(hero, member):
    """작품 장르를 선호 장르부터 최대 3개 (시간대 상황 태그는 추천 작품과 어긋날 수 있어 쓰지 않음)"""
    liked = set(member.genre_preferences.filter(kind=m.PreferenceKind.LIKE).values_list("genre__name", flat=True))
    genres = sorted((g.name for g in hero.genres.all()), key=lambda g: g not in liked)
    return [f"#{g.replace(' ', '')}" for g in genres[:3]]


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

    # --- 맞춤 추천: 설문을 마친 회원은 7-1 오늘 묶음 (맞춤 추천 화면 1위 = 오늘의 추천) ---
    by_id = {c.id: c for c in contents}
    batch = []
    if member is not None and member.survey_completed_at:
        batch = [r for r in recommend.current_recommendations(member, None, now=now) if r.content_id in by_id]
    if batch:
        recommended = [by_id[r.content_id] for r in batch[:RECOMMEND_SIZE]]
        hero = recommended[0]
        # 칩·한 줄·태그 모두 설문 답(직업·선호 장르·기억에 남는 작품)으로 — 시간대 상황 이름은 쓰지 않음
        moment = member_moment(member, now)
        headline = taste_headline(hero, member, now)
        mood_tags = taste_tags(hero, member)
    else:
        recommended = _temporary_recommendations(member, contents, situation_ids)
        hero = recommended[0]
        moment, headline = situation, None
        mood_tags = [f"#{situation.replace(' ', '')}"] + [f"#{g.name}" for g in hero.genres.all()][:2]

    # --- 통합 랭킹 TOP 10: 6-1 주간 랭킹(build_rankings)이 있으면 그것, 없으면 임시 계산 ---
    rankings = _weekly_top(contents)
    if rankings is None:
        rated = [c for c in contents if c.rating_count]
        total_votes = sum(c.rating_count for c in rated)
        global_avg = sum(_overall(c) * c.rating_count for c in rated) / total_votes if total_votes else 0
        temp = sorted(rated or contents, key=lambda c: (-ranking_score(c, global_avg), c.id))[:RANKING_SIZE]
        rankings = [
            {"rank": i + 1, "rank_change": 0, "is_new": False, "movie": card} for i, card in enumerate(_cards(temp))
        ]

    # --- 세대별 교차 평점 (20·30·40대 모두 평가 3개 이상) ---
    cross = [c for c in contents if _has_all_ages(c)]
    cross = sorted(cross, key=lambda c: (-(c.rating_count or 0), c.id))[:CROSS_AGE_SIZE]

    return {
        "user": _member_payload(member),
        "tpo": {
            "time_slot": time_slot(now),
            "situation": moment,  # 화면 칩 "저녁 · {situation}"
            "mood_tags": mood_tags,
        },
        "hero": {"message": _hero_message(hero, member, situation, headline), "movie": _cards([hero])[0]},
        "recommendations": _cards(recommended),
        "rankings": rankings,
        "cross_age_picks": _cards(cross),
    }


def _weekly_top(contents):
    """가장 최근 주간 랭킹 1~10위 (순위 변동 포함). 집계가 없으면 None"""
    ranked_on = ranking.latest_date(m.RankingPeriod.WEEKLY)
    if ranked_on is None:
        return None
    by_id = {c.id: c for c in contents}
    rows = [r for r in ranking.ranking_rows(m.RankingPeriod.WEEKLY, ranked_on) if r.content_id in by_id][:RANKING_SIZE]
    prev = ranking.previous_ranks(m.RankingPeriod.WEEKLY, ranked_on)
    cards = _cards([by_id[r.content_id] for r in rows])
    items = []
    for row, card in zip(rows, cards):
        change, is_new = ranking.change_of(row, prev)
        items.append({"rank": row.rank, "rank_change": change, "is_new": is_new, "movie": card})
    return items


def _temporary_recommendations(member, contents, situation_ids):
    """설문 안 한 회원·손님용 임시 규칙 (비선호 장르·이미 평가/시청한 작품 제외, 시간대 상황 +4)"""
    liked, disliked, seen = set(), set(), set()
    if member is not None:
        for pref in m.GenrePreference.objects.filter(member=member):
            (liked if pref.kind == m.PreferenceKind.LIKE else disliked).add(pref.genre_id)
        seen |= set(m.Rating.objects.filter(member=member).values_list("content_id", flat=True))
        seen |= set(m.WatchHistory.objects.filter(member=member).values_list("content_id", flat=True))
    candidates = [
        c for c in contents if c.id not in seen and not ({g.id for g in c.genres.all()} & disliked)
    ] or contents
    ordered = sorted(candidates, key=lambda c: (-taste_score(c, liked, situation_ids), -(c.rating_count or 0), c.id))
    return ordered[:RECOMMEND_SIZE]


def _has_all_ages(content):
    counts = defaultdict(int)
    for r in content.ratings.all():
        counts[r.age_group_at_rating] += 1
    return all(counts[age] >= CROSS_AGE_MIN_COUNT for age in CROSS_AGES)


def _hero_message(hero, member, situation, headline=None):
    """오늘의 추천 문구 — headline 은 설문 답 한 줄(taste_headline, 없으면 시간대 상황 문장 틀), reason 은 실제 숫자만 씀"""
    genres = [g.name for g in hero.genres.all()]
    headline = headline or f"{situation}에 어울리는 {genres[0] if genres else '작품'} 한 편"
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
