"""
6-1 통합 랭킹 집계 — python manage.py build_rankings

  python manage.py build_rankings                          주간, 오늘 날짜로 집계
  python manage.py build_rankings --period monthly         월간
  python manage.py build_rankings --date 2026-11-27        집계일 바꾸기 (순위 변동 확인용)
  python manage.py build_rankings --offline                TMDB 에 접속하지 않고 저장된 TMDB 평가 수로 인기도 대신

- ViewFit 지수 = 70 × TMDB 인기도 순위 백분위 + 30 × (보정 평점 / 5)   (core/ranking.py)
- 상위 100개를 ranking 표에 저장합니다. 같은 날·같은 기간을 다시 집계하면 덮어씁니다.
- import_tmdb 로 작품을 먼저 모아야 합니다.
"""
import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from core import models as m
from core import ranking, tmdb


class Command(BaseCommand):
    help = "ViewFit 지수를 계산해 통합 랭킹 TOP 100 을 저장합니다 (6-1)."

    def add_arguments(self, parser):
        parser.add_argument("--period", choices=m.RankingPeriod.values, default=m.RankingPeriod.WEEKLY,
                            help="weekly(주간, 기본) 또는 monthly(월간)")
        parser.add_argument("--date", help="집계일 YYYY-MM-DD (기본: 오늘)")
        parser.add_argument("--offline", action="store_true",
                            help="TMDB 에 접속하지 않고 저장된 TMDB 평가 수로 인기도를 대신")

    def handle(self, *args, **opts):
        period = opts["period"]
        if opts["date"]:
            try:
                ranked_on = datetime.date.fromisoformat(opts["date"])
            except ValueError:
                raise CommandError("--date 는 2026-11-27 처럼 입력해 주세요.")
        else:
            ranked_on = timezone.localdate()

        wanted = set(
            m.Content.objects.filter(pk__in=m.ContentPlatform.objects.values("content_id"), tmdb_id__isnull=False)
            .values_list("content_type", "tmdb_id")
        )
        if not m.ContentPlatform.objects.exists():
            raise CommandError("작품이 없어요. 먼저 python manage.py import_tmdb 로 작품을 모아 주세요.")

        popularity = None
        if opts["offline"]:
            self.stdout.write("TMDB 에 접속하지 않고 저장된 TMDB 평가 수로 인기도를 대신합니다.")
        else:
            try:
                self.stdout.write(f"TMDB 인기도 받는 중… (작품 {len(wanted)}개)")
                popularity = ranking.fetch_popularity(wanted, log=self.stdout.write)
            except tmdb.TmdbError as e:
                self.stderr.write(f"TMDB 인기도를 받지 못했어요 → 저장된 TMDB 평가 수로 대신합니다. ({e})")

        scored = ranking.compute_scores(period, ranked_on, popularity)
        saved = ranking.save_rankings(period, ranked_on, scored)

        label = dict(m.RankingPeriod.choices)[period]
        self.stdout.write(self.style.SUCCESS(f"완료: {ranked_on} {label} 랭킹 {saved}개 저장"))
        for i, (c, score) in enumerate(scored[:3], start=1):
            self.stdout.write(f"  {i}위 {c.title} (지수 {score})")
