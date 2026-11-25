"""
7 AI 추천 정확도 확인 ② '숨겨 두고 맞히기' — python manage.py recommend_accuracy

docs/presentation/추천 정확도 기준과 확인 방법.md 의 ② 단계 (11/25 홍준화 결정으로 만듦, 교수님 지적 4번)

  python manage.py recommend_accuracy             숨긴 작품이 TOP 10 안이면 적중
  python manage.py recommend_accuracy --top 20    TOP 20 안이면 적중
  python manage.py recommend_accuracy -v 2        회원마다 적중 개수까지

가상 회원이 별점 4.0 이상 준 작품을 '하나씩 모두' 숨겨 봅니다 (홍준화 PC: 60명 · 794번 · 약 1분 30초)
  1. 그 작품의 평점·좋아요·시청 기록을 잠시 지우고 추천 순서를 다시 계산 (recommend.rank_contents — 저장하지 않음)
  2. 숨긴 작품이 TOP 10 안에 있으면 적중. 같은 후보 안에서 '통합 랭킹 순 TOP 10'·'무작위 10개'와 비교
  3. 지운 것은 바로 되돌림 → DB 는 바뀌지 않음
  - 처음에는 회원마다 1개만 숨겼는데(60번), 어느 작품을 고르느냐에 따라 적중률이 5~17% 로 흔들려서 모두 숨기는 방식으로 바꿈
    (몇 번을 실행해도 같은 결과)

※ 가상 회원 평점은 seed_demo 가 '연령대 취향 장르면 점수를 높게' 만든 데이터입니다.
   그래서 이 결과는 '계산이 의도대로 도는지' 확인용이고, 정확도의 근거는 ③ 실제 사람 평가·④ 재방문 피드백입니다.
※ 먼저 import_tmdb → seed_demo → build_rankings 가 되어 있어야 합니다.
"""
from collections import defaultdict
from dataclasses import dataclass, field

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core import models as m
from core import recommend
from core.management.commands.seed_demo import demo_members

DEFAULT_TOP = 10


@dataclass
class Trial:
    """작품 1개를 숨겨 본 결과"""

    nickname: str
    recommend_rank: int | None  # 숨긴 작품이 맞춤 추천 몇 위였는지 (후보에 없으면 None — 비선호 장르 등)
    ranking_rank: int | None  # 같은 후보 안에서 통합 랭킹 순으로 몇 위였는지
    pool: int  # 후보 작품 수 (이미 평가한 작품·비선호 장르를 뺀 것)


@dataclass
class HoldoutResult:
    top: int
    trials: list = field(default_factory=list)  # [Trial]
    members: int = 0  # 숨겨 본 회원 수
    skipped: int = 0  # 별점 4.0 이상 평점이 없어 뺀 회원

    def hits(self, attr):
        return sum(1 for t in self.trials if getattr(t, attr) is not None and getattr(t, attr) <= self.top)

    def rate(self, attr):
        return self.hits(attr) / len(self.trials) if self.trials else 0.0

    def average_rank(self, attr):
        ranks = [getattr(t, attr) for t in self.trials if getattr(t, attr) is not None]
        return sum(ranks) / len(ranks) if ranks else 0.0

    @property
    def random_rate(self):
        """무작위로 top 개를 뽑았을 때 숨긴 작품이 들어올 확률의 평균 (기대값, 0~1)"""
        if not self.trials:
            return 0.0
        rates = [min(1.0, self.top / t.pool) if t.recommend_rank is not None else 0.0 for t in self.trials]
        return sum(rates) / len(rates)

    @property
    def average_pool(self):
        return sum(t.pool for t in self.trials) / len(self.trials) if self.trials else 0.0


def ranks_without(member, content_id, weekly):
    """content_id 를 안 본 것처럼 지우고 (맞춤 추천 순위, 통합 랭킹 순 순위, 후보 수) — 끝나면 되돌림"""
    with transaction.atomic():
        # 좋아요·시청 기록도 지워야 '좋아한 작품과 장르 겹침'·'이미 본 작품 제외'에 숨긴 작품이 새어 들어가지 않음
        m.Rating.objects.filter(member=member, content_id=content_id).delete()
        m.ContentLike.objects.filter(member=member, content_id=content_id).delete()
        m.WatchHistory.objects.filter(member=member, content_id=content_id).delete()
        taste = recommend.load_taste(member)
        by_score = [c.id for c, _ in recommend.rank_contents(taste, limit=None)]
        transaction.set_rollback(True)  # 지운 것 되돌리기

    by_ranking = sorted(by_score, key=lambda cid: (weekly.get(cid, recommend.NO_RANK), cid))

    def position(ids):
        return ids.index(content_id) + 1 if content_id in ids else None

    return position(by_score), position(by_ranking), len(by_score)


def holdout_check(top=DEFAULT_TOP, progress=None):
    """가상 회원마다 별점 4.0 이상 작품을 하나씩 숨겨 보고 HoldoutResult 를 돌려줌 (progress(끝난 회원, 전체) 는 진행 표시용)"""
    members = list(demo_members().order_by("id"))
    if not members:
        raise CommandError("가상 회원이 없어요. 먼저 python manage.py seed_demo 로 만들어 주세요.")
    weekly = recommend.weekly_ranks()
    if not weekly:
        raise CommandError("통합 랭킹이 없어요. 먼저 python manage.py build_rankings 로 집계해 주세요.")

    result = HoldoutResult(top=top)
    for done, member in enumerate(members, start=1):
        loved = list(
            m.Rating.objects.filter(member=member, score__gte=recommend.LOVED_SCORE)
            .order_by("content_id")
            .values_list("content_id", flat=True)
        )
        if loved:
            result.members += 1
        else:
            result.skipped += 1
        for content_id in loved:
            result.trials.append(Trial(member.nickname, *ranks_without(member, content_id, weekly)))
        if progress:
            progress(done, len(members))
    if not result.trials:
        raise CommandError("별점 4.0 이상 평점이 있는 가상 회원이 없어요.")
    return result


def percent(rate):
    return f"{rate * 100:.1f}%"


class Command(BaseCommand):
    help = "추천 정확도 ② 숨겨 두고 맞히기 — 가상 회원이 좋아한 작품을 하나씩 숨기고 추천 TOP 10 에 들어오는지 봅니다 (DB 는 그대로)."

    def add_arguments(self, parser):
        parser.add_argument("--top", type=int, default=DEFAULT_TOP, help=f"몇 위 안에 들면 적중으로 볼지 (기본 {DEFAULT_TOP})")

    def handle(self, *args, **opts):
        top = opts["top"]
        if top < 1:
            raise CommandError("--top 은 1 이상이어야 해요.")
        out = self.stdout.write

        def progress(done, total):
            if done % 10 == 0 or done == total:
                out(f"  … {done}/{total}명")

        out("가상 회원이 별점 4.0 이상 준 작품을 하나씩 숨기고 추천을 다시 계산하는 중… (1~2분)")
        r = holdout_check(top=top, progress=progress)
        n = len(r.trials)

        out("")
        out(f"숨겨 두고 맞히기 — 가상 회원 {r.members}명 · {n}번 숨겨 봄 · TOP {top} 안이면 적중")
        if r.skipped:
            out(f"(별점 4.0 이상 평점이 없는 회원 {r.skipped}명은 뺌)")
        if opts["verbosity"] >= 2:
            by_member = defaultdict(list)
            for t in r.trials:
                by_member[t.nickname].append(t)
            for nickname, trials in by_member.items():
                rec = sum(1 for t in trials if t.recommend_rank and t.recommend_rank <= top)
                rank = sum(1 for t in trials if t.ranking_rank and t.ranking_rank <= top)
                out(f"  {nickname} · {len(trials)}개 숨김 → 맞춤 추천 {rec}개 적중 / 통합 랭킹 순 {rank}개 적중")
        out("")
        rec_rate, ranking_rate = r.rate("recommend_rank"), r.rate("ranking_rank")
        out(f"- 맞춤 추천 (7-1 점수): {r.hits('recommend_rank')} / {n}번 = {percent(rec_rate)}")
        out(f"- 통합 랭킹 순 (취향 안 봄): {r.hits('ranking_rank')} / {n}번 = {percent(ranking_rate)}")
        out(f"- 무작위 {top}개 (기대값): {percent(r.random_rate)}")
        out(
            f"- 숨긴 작품의 평균 순위: 맞춤 추천 {r.average_rank('recommend_rank'):.0f}위 · "
            f"통합 랭킹 순 {r.average_rank('ranking_rank'):.0f}위 (후보 평균 {r.average_pool:.0f}개, 낮을수록 좋음)"
        )
        out("")
        gap = f"{(rec_rate - ranking_rate) * 100:+.1f}%p"
        if rec_rate > ranking_rate:
            out(self.style.SUCCESS(f"기준 '맞춤 추천 적중률 > 통합 랭킹 순': 통과 ({gap})"))
        else:
            out(self.style.WARNING(f"기준 '맞춤 추천 적중률 > 통합 랭킹 순': 못 넘음 ({gap}) — 점수 비율을 다시 볼 것"))
        out("※ 가상 데이터라 계산 확인용입니다. 정확도 근거는 ③ 실제 사람 평가 · ④ 재방문 피드백")
        out("※ 숨긴 평점·좋아요는 모두 되돌렸어요 (DB 그대로)")
