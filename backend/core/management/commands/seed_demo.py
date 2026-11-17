"""
2-1 시연용 가상 데이터 — python manage.py seed_demo

세대별 랭킹·추천을 시연하려면 평점이 많이 필요해서 가상 회원과 평점을 만듭니다.
  - 연령대 6개 × 10명 = 가상 회원 60명 (이메일 demo01@demo.viewfit.local ~ demo60@…)
  - 회원마다 작품 20~40개에 0.5 단위 평점, 마음에 든 작품 일부는 좋아요
  - 연령대마다 좋아하는 장르를 다르게 해서 세대별 랭킹에 차이가 보이게 함
  - random seed 고정 → 몇 번을 실행해도 같은 결과

  python manage.py seed_demo           가상 데이터 만들기 (있으면 지우고 새로)
  python manage.py seed_demo --clear   가상 회원과 그 기록만 지우기 (진짜 회원은 그대로)

※ 발표·보고서에서 "가상 데이터"라고 밝힙니다 (D12).
※ 먼저 import_tmdb 로 작품을 채워야 합니다.
"""
import random
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from core import models as m

DEMO_DOMAIN = "demo.viewfit.local"
PER_AGE_GROUP = 10
SEED = 20261208  # 최종 발표일

# 연령대별로 좋아하는 장르 (평점이 높게 나오는 쪽)
AGE_TASTE = {
    "10s": ["애니메이션", "판타지", "코미디", "액션"],
    "20s": ["로맨스", "스릴러", "예능", "SF"],
    "30s": ["스릴러", "미스터리", "드라마", "액션"],
    "40s": ["드라마", "다큐멘터리", "스릴러", "코미디"],
    "50s": ["드라마", "다큐멘터리", "예능", "로맨스"],
    "60s+": ["드라마", "다큐멘터리", "예능", "코미디"],
}
JOBS = [value for value, _ in m.Job.choices]


def demo_members():
    return m.Member.objects.filter(email__endswith=f"@{DEMO_DOMAIN}")


def half_step(value):
    """0.5 단위, 0.5~5.0 사이로"""
    return Decimal(str(min(5.0, max(0.5, round(value * 2) / 2))))


class Command(BaseCommand):
    help = "시연용 가상 회원 60명과 평점·좋아요를 만듭니다 (2-1 FR8)."

    def add_arguments(self, parser):
        parser.add_argument("--clear", action="store_true", help="가상 회원과 그 기록만 지우기")

    def handle(self, *args, **opts):
        deleted = self.clear()
        if opts["clear"]:
            self.stdout.write(self.style.SUCCESS(f"가상 회원 {deleted}명과 그 평점·좋아요를 지웠어요."))
            return

        contents = list(m.Content.objects.prefetch_related("genres").order_by("id"))
        if len(contents) < 40:
            raise CommandError(
                f"작품이 {len(contents)}개뿐이에요. 먼저 python manage.py import_tmdb 로 작품을 40개 이상 채워 주세요."
            )
        with transaction.atomic():
            ratings, likes = self.create(contents)
        self.stdout.write(
            self.style.SUCCESS(f"가상 회원 {len(AGE_TASTE) * PER_AGE_GROUP}명, 평점 {ratings}개, 좋아요 {likes}개를 만들었어요.")
        )

    def clear(self):
        qs = demo_members()
        count = qs.count()
        qs.delete()  # 평점·좋아요·시청 이력·추천은 회원과 함께 지워짐 (CASCADE)
        return count

    def create(self, contents):
        rng = random.Random(SEED)
        genres = {g.name: g for g in m.Genre.objects.all()}
        content_genres = {c.id: {g.name for g in c.genres.all()} for c in contents}
        now = timezone.now()
        rating_rows, like_rows, pref_rows = [], [], []
        number = 0

        for age_group, taste in AGE_TASTE.items():
            for _ in range(PER_AGE_GROUP):
                number += 1
                member = m.Member.objects.create_user(
                    email=f"demo{number:02d}@{DEMO_DOMAIN}",
                    nickname=f"시연{number:02d}",
                    password=None,  # 로그인할 수 없는 계정
                    age_group=age_group,
                    job=rng.choice(JOBS),
                    terms_agreed_at=now,
                    survey_completed_at=now,
                )
                liked = rng.sample(taste, 2)
                pref_rows += [m.GenrePreference(member=member, genre=genres[n], kind=m.PreferenceKind.LIKE) for n in liked]

                # 좋아하는 장르 작품을 더 자주 고름
                weights = [3 if content_genres[c.id] & set(taste) else 1 for c in contents]
                want = rng.randint(20, 40)
                picked = {}  # 순서를 지키면서 중복 없이
                while len(picked) < want:
                    c = rng.choices(contents, weights=weights)[0]
                    picked[c.id] = c
                for content in picked.values():
                    match = len(content_genres[content.id] & set(taste))
                    score = half_step(rng.gauss(2.8 + 0.7 * match, 0.8))
                    rating_rows.append(
                        m.Rating(member=member, content=content, score=score, age_group_at_rating=age_group)
                    )
                    if score >= Decimal("4.0") and rng.random() < 0.5:
                        like_rows.append(m.ContentLike(member=member, content=content))

        m.GenrePreference.objects.bulk_create(pref_rows)
        m.Rating.objects.bulk_create(rating_rows)  # bulk_create 는 save() 를 안 거쳐서 연령대를 직접 넣음
        m.ContentLike.objects.bulk_create(like_rows)
        return len(rating_rows), len(like_rows)
