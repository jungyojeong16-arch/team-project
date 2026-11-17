"""
2-1 작품 데이터 수집 — python manage.py import_tmdb

TMDB 에서 한국어(ko-KR) 인기 영화·시리즈를 가져와 저장합니다.
  content, content_genre, content_platform(검색 주소), content_tpo

  python manage.py import_tmdb                       영화 100 + 시리즈 100 (기본)
  python manage.py import_tmdb --movies 500 --series 500
  python manage.py import_tmdb --movies 0 --series 20 시리즈만 20개

- 같은 작품(tmdb_id + 작품유형)을 다시 가져오면 새로 만들지 않고 수정합니다.
- 6개 OTT(넷플릭스·티빙·쿠팡플레이·웨이브·디즈니+·왓챠) 어디에도 없는 작품은 저장하지 않습니다.
- 실패한 작품은 건너뛰고 마지막에 개수를 알려 줍니다.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core import models as m
from core import tmdb

MAX_PAGES = 500  # TMDB discover 는 500페이지까지


class Command(BaseCommand):
    help = "TMDB 에서 인기 영화·시리즈를 가져와 작품 DB 를 채웁니다 (2-1)."

    def add_arguments(self, parser):
        parser.add_argument("--movies", type=int, default=100, help="가져올 영화 수 (기본 100)")
        parser.add_argument("--series", type=int, default=100, help="가져올 시리즈 수 (기본 100)")

    def handle(self, *args, **opts):
        try:
            tmdb._token()
        except tmdb.MissingToken as e:
            raise CommandError(str(e))

        self.genres = {g.name: g for g in m.Genre.objects.all()}
        self.platforms = {p.code: p for p in m.Platform.objects.all()}
        self.tpos = {t.name: t for t in m.Tpo.objects.all()}

        totals = {}
        for content_type, target in (("movie", opts["movies"]), ("series", opts["series"])):
            if target > 0:
                totals[content_type] = self.import_kind(content_type, target)

        label = {"movie": "영화", "series": "시리즈"}
        saved = ", ".join(f"{label[k]} {v['created'] + v['updated']}개" for k, v in totals.items())
        self.stdout.write(self.style.SUCCESS(f"완료: {saved} 저장"))
        for k, v in totals.items():
            self.stdout.write(
                f"  {label[k]}: 새로 {v['created']} · 수정 {v['updated']} · "
                f"OTT 없어서 건너뜀 {v['no_ott']} · 실패 {v['failed']}"
            )

    def import_kind(self, content_type, target):
        counts = {"created": 0, "updated": 0, "no_ott": 0, "failed": 0}
        seen = set()
        page, total_pages = 1, 1
        while counts["created"] + counts["updated"] < target and page <= min(total_pages, MAX_PAGES):
            try:
                result = tmdb.discover(content_type, page)
            except tmdb.TmdbError as e:
                self.stderr.write(f"목록 {page}페이지 실패 — 건너뜀: {e}")
                page += 1
                continue
            total_pages = result.get("total_pages") or 1
            for item in result.get("results", []):
                if counts["created"] + counts["updated"] >= target:
                    break
                tmdb_id = item.get("id")
                if not tmdb_id or tmdb_id in seen:
                    continue
                seen.add(tmdb_id)
                try:
                    data = tmdb.details(content_type, tmdb_id)
                    outcome = self.save_one(content_type, tmdb_id, data)
                except tmdb.TmdbError as e:
                    self.stderr.write(f"작품 {tmdb_id} 실패 — 건너뜀: {e}")
                    outcome = "failed"
                counts[outcome] += 1
            done = counts["created"] + counts["updated"]
            self.stdout.write(f"  {content_type} {page}페이지 → 누적 {done}/{target}")
            page += 1
        return counts

    @transaction.atomic
    def save_one(self, content_type, tmdb_id, data):
        codes = tmdb.map_platforms(data)
        if not codes:
            return "no_ott"  # FR7 — 6개 OTT 어디에도 없으면 저장하지 않음

        fields = tmdb.to_content_fields(content_type, data)
        content, created = m.Content.objects.update_or_create(
            tmdb_id=tmdb_id, content_type=content_type, defaults=fields
        )

        genre_names = tmdb.map_genres(content_type, data)
        tpo_names = tmdb.map_tpos(genre_names, tmdb.korean_age(content_type, data))

        # 연결 테이블은 지우고 다시 넣기 (TMDB 정보가 바뀌었을 수 있음)
        m.ContentGenre.objects.filter(content=content).delete()
        m.ContentGenre.objects.bulk_create(
            [m.ContentGenre(content=content, genre=self.genres[n]) for n in sorted(genre_names) if n in self.genres]
        )
        m.ContentPlatform.objects.filter(content=content).delete()
        m.ContentPlatform.objects.bulk_create(
            [
                m.ContentPlatform(content=content, platform=self.platforms[c], deeplink_url=tmdb.deeplink(c, content.title))
                for c in sorted(codes)
                if c in self.platforms
            ]
        )
        m.ContentTpo.objects.filter(content=content).delete()
        m.ContentTpo.objects.bulk_create(
            [m.ContentTpo(content=content, tpo=self.tpos[n]) for n in sorted(tpo_names) if n in self.tpos]
        )
        return "created" if created else "updated"
