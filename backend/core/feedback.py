"""
7-2 재방문 추천 피드백 — 추천받은 작품을 [바로 보기]로 연 뒤 다시 오면 "이번 작품은 어떠셨나요?"

  pending_feedback(member)                       물어볼 추천 1개 (없으면 None)
  submit_feedback(member, rec, watched, ...)     별점 → 평점 저장 + feedback=rated / 못 봤어요 → feedback=not_watched

팝업을 띄우는 조건 (docs/prd/7-2_revisit_feedback.md)
  1. [바로 보기]를 누른(시청 기록 source=direct) 작품이 내 추천(recommendation)에 있고, 그 추천이 아직 pending
  2. 추천을 받은 뒤에 눌렀고, 누른 지 FEEDBACK_DELAY_HOURS(settings, 기본 12시간) 이상 지남
  3. 그중 가장 최근에 누른 것 1개

- 답은 "작품"에 대한 것이라, 같은 작품의 pending 추천 행(다른 날·다른 상황 묶음)을 모두 같은 답으로 바꿉니다.
- 다음 추천에 반영: 별점은 평점이 되어 7-1 점수(4점 이상이면 좋아한 작품)에 쓰이고,
  "아직 못 봤어요" 작품은 7-1 이 다시 추천할 수 있습니다 (recommend.load_taste — 11/22 홍준화 결정).
"""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.utils import timezone

from . import models as m
from .common import save_rating


def pending_feedback(member, now=None):
    """물어볼 추천 1개 — clicked_at(마지막으로 [바로 보기]를 누른 시각)을 붙여서. 없으면 None"""
    now = now or timezone.now()
    cutoff = now - timedelta(hours=settings.FEEDBACK_DELAY_HOURS)
    clicks = m.WatchHistory.objects.filter(
        member=member,
        source=m.WatchSource.DIRECT,
        content=OuterRef("content"),
        watched_at__gte=OuterRef("recommended_at"),  # 추천을 받은 뒤에 누른 것만
        watched_at__lte=cutoff,
    ).order_by("-watched_at")
    return (
        m.Recommendation.objects.filter(member=member, feedback=m.RecommendationFeedback.PENDING)
        .annotate(clicked_at=Subquery(clicks.values("watched_at")[:1]))
        .filter(clicked_at__isnull=False)
        .select_related("content", "tpo")
        .order_by("-clicked_at", "-recommended_at", "-id")
        .first()
    )


@transaction.atomic
def submit_feedback(member, rec, watched, score=None, comment=""):
    """답 저장 → 저장한 평점(못 봤어요면 None). rec.feedback 도 새 값으로 바꿔 둠"""
    rating = None
    if watched:
        rating = save_rating(member, rec.content, score, comment)  # 5-1 과 같은 규칙 (이미 있으면 수정)
        status = m.RecommendationFeedback.RATED
    else:
        status = m.RecommendationFeedback.NOT_WATCHED
    m.Recommendation.objects.filter(
        member=member, content=rec.content, feedback=m.RecommendationFeedback.PENDING
    ).update(feedback=status)
    rec.feedback = status
    return rating
