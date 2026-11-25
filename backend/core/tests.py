"""
자동 테스트 — python manage.py test core

회원가입 → 로그인 → 설문 저장 → 내 정보 → 로그아웃 흐름과
잘못된 입력(중복 이메일, 약한 비밀번호, 별점 4.3 등)을 막는지 확인합니다.
"""
from decimal import Decimal

from django.db import IntegrityError
from rest_framework.test import APITestCase

from .models import Content, GenrePreference, Member, Rating

SIGNUP = {
    "email": "Junkyo@ViewFit.kr",
    "nickname": "준교",
    "password": "viewfit123!",
    "age14": True,
    "terms": True,
    "privacy": True,
    "marketing": False,
}


class AuthFlowTests(APITestCase):
    def signup(self, **override):
        return self.client.post("/api/v1/auth/signup/", {**SIGNUP, **override}, format="json")

    def auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    def test_full_flow(self):
        res = self.signup()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["member"]["email"], "junkyo@viewfit.kr")  # 소문자로 저장
        self.assertFalse(res.data["member"]["survey_completed"])

        res = self.client.post("/api/v1/auth/login/", {"email": "JUNKYO@viewfit.kr", "password": "viewfit123!"}, format="json")
        self.assertEqual(res.status_code, 200, res.data)
        token = res.data["token"]

        self.auth(token)
        res = self.client.put(
            "/api/v1/me/survey/",
            {"age_group": "20s", "job": "student", "liked_genres": ["드라마", "SF"], "disliked_genres": ["공포"]},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(res.data["survey_completed"])
        self.assertCountEqual(res.data["liked_genres"], ["드라마", "SF"])
        self.assertEqual(res.data["disliked_genres"], ["공포"])

        # 다시 설문하면 예전 취향은 지워지고 새로 저장
        res = self.client.put("/api/v1/me/survey/", {"age_group": None, "liked_all": True}, format="json")
        self.assertEqual(len(res.data["liked_genres"]), 12)
        self.assertEqual(res.data["disliked_genres"], [])
        self.assertIsNone(res.data["age_group"])

        self.assertEqual(self.client.get("/api/v1/me/").status_code, 200)
        self.assertEqual(self.client.post("/api/v1/auth/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/v1/me/").status_code, 401)  # 토큰이 지워짐

    def test_signup_rejects_bad_input(self):
        self.signup()
        cases = [
            ({"nickname": "다른닉"}, "email"),                                   # 이미 가입된 이메일
            ({"email": "new@viewfit.kr"}, "nickname"),                          # 이미 쓰는 닉네임
            ({"email": "a@viewfit.kr", "nickname": "a"}, "nickname"),           # 1글자
            ({"email": "b@viewfit.kr", "nickname": "닉2", "password": "abcdefgh"}, "password"),  # 숫자·특수문자 없음
            ({"email": "c@viewfit.kr", "nickname": "닉3", "terms": False}, "non_field_errors"),  # 필수 동의 안 함
        ]
        for override, field in cases:
            res = self.signup(**override)
            self.assertEqual(res.status_code, 400, override)
            self.assertIn(field, res.data, override)

    def test_wrong_password(self):
        self.signup()
        res = self.client.post("/api/v1/auth/login/", {"email": SIGNUP["email"], "password": "wrong-pass1!"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_check_nickname(self):
        self.signup()
        self.assertFalse(self.client.get("/api/v1/auth/check-nickname/", {"nickname": "준교"}).data["available"])
        self.assertTrue(self.client.get("/api/v1/auth/check-nickname/", {"nickname": "새닉네임"}).data["available"])

    def test_survey_rejects_same_genre_in_both(self):
        token = self.signup().data["token"]
        self.auth(token)
        res = self.client.put("/api/v1/me/survey/", {"liked_genres": ["드라마"], "disliked_genres": ["드라마"]}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(GenrePreference.objects.count(), 0)

    def test_survey_requires_login(self):
        self.assertEqual(self.client.put("/api/v1/me/survey/", {}, format="json").status_code, 401)


class TableRuleTests(APITestCase):
    """물리 설계에서 정한 규칙이 DB 에서 실제로 막히는지"""

    def setUp(self):
        self.member = Member.objects.create_user("t@viewfit.kr", "테스터", "viewfit123!", age_group="30s")
        self.content = Content.objects.create(title="기생충", content_type="movie")

    def test_rating_saves_age_at_rating(self):
        rating = Rating.objects.create(member=self.member, content=self.content, score=Decimal("4.5"))
        self.assertEqual(rating.age_group_at_rating, "30s")

    def test_rating_half_step_only(self):
        with self.assertRaises(IntegrityError):
            Rating.objects.create(member=self.member, content=self.content, score=Decimal("4.3"))

    def test_one_rating_per_member_and_content(self):
        Rating.objects.create(member=self.member, content=self.content, score=Decimal("4.0"))
        with self.assertRaises(IntegrityError):
            Rating.objects.create(member=self.member, content=self.content, score=Decimal("3.0"))

    def test_ranking_score_d7(self):
        """D7 — ViewFit 지수는 0~100, 소수 첫째 자리까지 저장"""
        import datetime

        from django.core.exceptions import ValidationError

        from .models import Ranking

        day = datetime.date(2026, 11, 20)
        ranking = Ranking.objects.create(content=self.content, ranked_on=day, rank=1, score=Decimal("87.5"))
        ranking.refresh_from_db()
        self.assertEqual(ranking.score, Decimal("87.5"))
        with self.assertRaises(ValidationError):
            Ranking(content=self.content, ranked_on=day, rank=2, score=Decimal("100.1")).full_clean()


# =============================================================================
# 0번 공통 — 목록 규칙(offset·limit·필터·오류 모양)과 작품 카드 모양
# =============================================================================


class CommonContentListTests(APITestCase):
    URL = "/api/v1/contents/"

    @classmethod
    def setUpTestData(cls):
        from .models import ContentGenre, ContentPlatform, ContentTpo, Genre, Platform, Tpo

        drama, horror = Genre.objects.get(name="드라마"), Genre.objects.get(name="공포")
        netflix, tving = Platform.objects.get(code="NETFLIX"), Platform.objects.get(code="TVING")
        night = Tpo.objects.get(name="혼자 보는 밤")
        cls.contents = []
        for i in range(25):
            c = Content.objects.create(title=f"작품{i:02d}", content_type="movie" if i % 2 else "series", release_year=2020)
            ContentGenre.objects.create(content=c, genre=drama if i < 20 else horror)
            ContentPlatform.objects.create(content=c, platform=netflix, deeplink_url="https://www.netflix.com/search?q=x")
            if i == 0:
                # 장르·OTT 가 여러 개여도 목록에 한 번만, 평균도 그대로여야 함
                ContentGenre.objects.create(content=c, genre=horror)
                ContentPlatform.objects.create(content=c, platform=tving)
                ContentTpo.objects.create(content=c, tpo=night)
            cls.contents.append(c)
        twenties = Member.objects.create_user("a@x.kr", "가", "viewfit123!", age_group="20s")
        thirties = Member.objects.create_user("b@x.kr", "나", "viewfit123!", age_group="30s")
        Rating.objects.create(member=twenties, content=cls.contents[0], score=Decimal("4.0"))
        Rating.objects.create(member=thirties, content=cls.contents[0], score=Decimal("3.0"))

    def test_default_page_is_20_and_next_offset(self):
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["count"], 25)
        self.assertEqual(len(res.data["results"]), 20)
        self.assertEqual(res.data["next_offset"], 20)
        res = self.client.get(self.URL, {"offset": 20})
        self.assertEqual(len(res.data["results"]), 5)
        self.assertIsNone(res.data["next_offset"])

    def test_card_shape_and_rating(self):
        card = self.client.get(self.URL).data["results"][0]  # 평가 수 많은 순 → 작품00
        self.assertEqual(card["title"], "작품00")
        self.assertEqual({p["code"] for p in card["platforms"]}, {"NETFLIX", "TVING"})
        self.assertEqual(card["platforms"][0]["watch_url"], "https://www.netflix.com/search?q=x")
        self.assertEqual({g["name"] for g in card["genres"]}, {"드라마", "공포"})
        self.assertEqual(card["rating"]["overall"], 3.5)
        self.assertEqual(card["rating"]["total_count"], 2)
        self.assertEqual(
            card["rating"]["by_age_group"],
            [{"age_group": "20s", "average": 4.0, "count": 1}, {"age_group": "30s", "average": 3.0, "count": 1}],
        )
        for name in ["original_title", "backdrop_url", "runtime", "episode_count", "age_rating"]:
            self.assertIn(name, card)  # 프론트 Movie 타입과 같은 칸 이름
        self.assertIsNone(card["age_rating"])  # 등급을 모르면 null

    def test_card_d6_fields(self):
        c = Content.objects.get(title="작품00")
        c.backdrop_url, c.age_rating, c.runtime_minutes = "https://image.tmdb.org/t/p/w1280/x.jpg", "12", 95
        c.save()
        card = self.client.get(self.URL).data["results"][0]
        self.assertEqual(
            (card["backdrop_url"], card["age_rating"], card["runtime"], card["episode_count"]),
            ("https://image.tmdb.org/t/p/w1280/x.jpg", "12", 95, None),
        )

    def test_filters(self):
        self.assertEqual(self.client.get(self.URL, {"genre": "공포"}).data["count"], 6)
        self.assertEqual(self.client.get(self.URL, {"platform": "TVING"}).data["count"], 1)
        self.assertEqual(self.client.get(self.URL, {"type": "movie"}).data["count"], 12)
        self.assertEqual(self.client.get(self.URL, {"type": "all", "platform": "all"}).data["count"], 25)
        res = self.client.get(self.URL, {"tpo": "혼자 보는 밤", "platform": "NETFLIX"})
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["rating"]["overall"], 3.5)  # 필터해도 평균 그대로

    def test_bad_values_are_400_with_field_message(self):
        for params, field in [
            ({"limit": "abc"}, "limit"), ({"limit": 0}, "limit"), ({"limit": 101}, "limit"),
            ({"offset": -1}, "offset"), ({"type": "drama"}, "type"),
            ({"platform": "HULU"}, "platform"), ({"genre": "뮤지컬"}, "genre"), ({"tpo": "출근길"}, "tpo"),
        ]:
            res = self.client.get(self.URL, params)
            self.assertEqual(res.status_code, 400, params)
            self.assertIsInstance(res.data[field][0], str)

    def test_login_required_api_is_401(self):
        self.assertEqual(self.client.get("/api/v1/me/").status_code, 401)


# =============================================================================
# 2-1 작품 데이터 수집 — TMDB 응답은 가짜(mock)로 테스트
# =============================================================================

from io import StringIO
from unittest import mock

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings


def _kr_providers(*names):
    return {"results": {"KR": {"flatrate": [{"provider_name": n} for n in names]}}}


FAKE_TMDB = {
    "/discover/movie": {"page": 1, "total_pages": 1, "results": [{"id": 1}, {"id": 2}, {"id": 3}]},
    "/discover/tv": {"page": 1, "total_pages": 1, "results": [{"id": 10}]},
    # 드라마+공포, 넷플릭스+디즈니+ (TMDB 표기 "Disney Plus")
    "/movie/1": {
        "id": 1, "title": "가짜 영화", "overview": "줄거리", "poster_path": "/p1.jpg", "release_date": "2024-05-01",
        "backdrop_path": "/b1.jpg", "runtime": 128, "vote_average": 7.86, "vote_count": 1534,
        "genres": [{"id": 18}, {"id": 27}],
        "watch/providers": _kr_providers("Netflix", "Disney Plus", "Apple TV"),
        "release_dates": {"results": [{"iso_3166_1": "KR", "release_dates": [{"certification": "15"}]}]},
    },
    # 6개 OTT 어디에도 없음 → 저장 안 함
    "/movie/2": {"id": 2, "title": "OTT 없는 영화", "genres": [{"id": 18}], "watch/providers": _kr_providers("Apple TV")},
    # 코미디 + 12세 → 가족과 함께
    "/movie/3": {
        "id": 3, "title": "가족 코미디", "release_date": "2023-01-01", "genres": [{"id": 35}],
        "watch/providers": _kr_providers("Coupang Play"),
        "release_dates": {"results": [{"iso_3166_1": "KR", "release_dates": [{"certification": "12"}]}]},
    },
    # 시리즈: Sci-Fi & Fantasy + 키워드 romance → SF·판타지·로맨스
    "/tv/10": {
        "id": 10, "name": "가짜 시리즈", "first_air_date": "2025-03-01", "genres": [{"id": 10765}],
        "number_of_episodes": 16, "episode_run_time": [60],
        "keywords": {"results": [{"name": "romance"}]},
        "watch/providers": _kr_providers("TVING", "wavve"),
        "content_ratings": {"results": [{"iso_3166_1": "KR", "rating": "15"}]},
    },
}


def fake_get(path, **params):
    return FAKE_TMDB[path]


@override_settings(TMDB_API_TOKEN="test-token")
class ImportTmdbTests(TestCase):
    def run_import(self, **opts):
        out = StringIO()
        with mock.patch("core.tmdb.get", side_effect=fake_get):
            call_command("import_tmdb", stdout=out, stderr=StringIO(), **opts)
        return out.getvalue()

    def test_import_saves_contents_with_genres_platforms_tpos(self):
        from .models import ContentPlatform

        out = self.run_import(movies=5, series=5)
        self.assertIn("영화 2개", out)
        self.assertIn("시리즈 1개", out)
        self.assertIn("OTT 없어서 건너뜀 1", out)

        movie = Content.objects.get(tmdb_id=1, content_type="movie")
        self.assertEqual(movie.poster_url, "https://image.tmdb.org/t/p/w500/p1.jpg")
        self.assertEqual(movie.release_year, 2024)
        self.assertEqual({g.name for g in movie.genres.all()}, {"드라마", "공포"})
        self.assertEqual({p.code for p in movie.platforms.all()}, {"NETFLIX", "DISNEY_PLUS"})
        self.assertEqual({t.name for t in movie.tpos.all()}, {"혼자 보는 밤", "여행이 필요할 때"})
        link = ContentPlatform.objects.get(content=movie, platform__code="NETFLIX").deeplink_url
        self.assertTrue(link.startswith("https://www.netflix.com/search?q="))

        self.assertFalse(Content.objects.filter(tmdb_id=2).exists())
        family = Content.objects.get(tmdb_id=3)
        self.assertIn("가족과 함께", {t.name for t in family.tpos.all()})

        series = Content.objects.get(tmdb_id=10, content_type="series")
        self.assertEqual({g.name for g in series.genres.all()}, {"SF", "판타지", "로맨스"})
        self.assertEqual({p.code for p in series.platforms.all()}, {"TVING", "WAVVE"})

    def test_import_saves_card_fields_d6(self):
        """D6 — 배경·관람 등급·상영 시간·회차·TMDB 평점"""
        self.run_import(movies=5, series=5)
        movie = Content.objects.get(tmdb_id=1, content_type="movie")
        self.assertEqual(movie.backdrop_url, "https://image.tmdb.org/t/p/w1280/b1.jpg")
        self.assertEqual(movie.age_rating, "15")
        self.assertEqual(movie.runtime_minutes, 128)
        self.assertIsNone(movie.episode_count)
        self.assertEqual(movie.tmdb_rating, Decimal("7.9"))
        self.assertEqual(movie.tmdb_vote_count, 1534)

        family = Content.objects.get(tmdb_id=3)  # 정보가 없는 칸은 비워 둠
        self.assertEqual((family.age_rating, family.backdrop_url, family.runtime_minutes), ("12", "", None))
        self.assertIsNone(family.tmdb_rating)
        self.assertEqual(family.tmdb_vote_count, 0)

        series = Content.objects.get(tmdb_id=10, content_type="series")
        self.assertEqual((series.episode_count, series.runtime_minutes, series.age_rating), (16, None, "15"))

    def test_age_rating_code(self):
        from . import tmdb

        cases = {None: "", 0: "ALL", 7: "7", 12: "12", 15: "15", 18: "19", 19: "19"}
        for age, code in cases.items():
            self.assertEqual(tmdb.age_rating_code(age), code)

    def test_running_twice_updates_instead_of_duplicating(self):
        self.run_import(movies=5, series=5)
        out = self.run_import(movies=5, series=5)
        self.assertEqual(Content.objects.count(), 3)
        self.assertIn("수정 2", out)

    def test_limit_is_respected(self):
        self.run_import(movies=1, series=0)
        self.assertEqual(Content.objects.count(), 1)

    @override_settings(TMDB_API_TOKEN="")
    def test_missing_token_stops_with_message(self):
        with self.assertRaisesMessage(CommandError, "TMDB_API_TOKEN"):
            call_command("import_tmdb", stdout=StringIO())

    def test_token_forms(self):
        """읽기 액세스 토큰은 헤더로, 짧은 API 키는 주소로 — 따옴표·Bearer 는 떼고"""
        import io
        import json

        from . import tmdb

        sent = []

        def fake_urlopen(request, timeout=None):
            sent.append(request)
            return io.BytesIO(json.dumps({"ok": True}).encode())

        key = "0123456789abcdef0123456789abcdef"
        with mock.patch("core.tmdb.time.sleep"), mock.patch("core.tmdb.urllib.request.urlopen", side_effect=fake_urlopen):
            with override_settings(TMDB_API_TOKEN='"Bearer eyJabc.def"'):
                tmdb.get("/genre/movie/list", language="ko-KR")
            with override_settings(TMDB_API_TOKEN=f" {key} "):
                tmdb.get("/genre/movie/list", language="ko-KR")
        self.assertEqual(sent[0].get_header("Authorization"), "Bearer eyJabc.def")
        self.assertNotIn("api_key", sent[0].full_url)
        self.assertIsNone(sent[1].get_header("Authorization"))
        self.assertIn(f"api_key={key}", sent[1].full_url)

    def test_retries_three_times_then_fails(self):
        import urllib.error

        from . import tmdb

        with mock.patch("core.tmdb.time.sleep"), mock.patch(
            "core.tmdb.urllib.request.urlopen", side_effect=urllib.error.URLError("down")
        ) as urlopen:
            with self.assertRaises(tmdb.TmdbError):
                tmdb.get("/discover/movie")
        self.assertEqual(urlopen.call_count, 3)


class SeedDemoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from .models import ContentGenre, Genre

        names = list(Genre.objects.values_list("name", flat=True))
        for i in range(45):
            c = Content.objects.create(title=f"작품{i}", content_type="movie")
            ContentGenre.objects.create(content=c, genre=Genre.objects.get(name=names[i % len(names)]))
        cls.real = Member.objects.create_user("real@viewfit.kr", "진짜회원", "viewfit123!")

    def test_seed_and_clear(self):
        from .models import ContentLike

        call_command("seed_demo", stdout=StringIO())
        demo = Member.objects.filter(email__endswith="@demo.viewfit.local")
        self.assertEqual(demo.count(), 60)
        self.assertEqual(demo.filter(age_group="20s").count(), 10)
        ratings = Rating.objects.filter(member__in=demo)
        self.assertTrue(60 * 20 <= ratings.count() <= 60 * 40)
        self.assertFalse(ratings.filter(age_group_at_rating__isnull=True).exists())
        self.assertTrue(all((s * 2) % 1 == 0 for s in ratings.values_list("score", flat=True)))
        self.assertFalse(demo.first().has_usable_password())  # 가상 회원은 로그인 불가

        # 다시 실행해도 60명 그대로 (지우고 새로), 결과도 같음
        first_count = ratings.count()
        call_command("seed_demo", stdout=StringIO())
        self.assertEqual(Member.objects.filter(email__endswith="@demo.viewfit.local").count(), 60)
        self.assertEqual(Rating.objects.filter(member__email__endswith="@demo.viewfit.local").count(), first_count)

        call_command("seed_demo", "--clear", stdout=StringIO())
        self.assertEqual(Member.objects.filter(email__endswith="@demo.viewfit.local").count(), 0)
        self.assertEqual(Rating.objects.count(), 0)
        self.assertEqual(ContentLike.objects.count(), 0)
        self.assertTrue(Member.objects.filter(pk=self.real.pk).exists())  # 진짜 회원은 그대로

    def test_needs_contents_first(self):
        Content.objects.all().delete()
        with self.assertRaisesMessage(CommandError, "import_tmdb"):
            call_command("seed_demo", stdout=StringIO())


# =============================================================================
# 4-1 작품 검색·상세·바로 보기 (백엔드) / 0-4 홈 피드
# =============================================================================


class ContentDetailAndHomeFeedTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        from .models import ContentGenre, ContentPlatform, ContentTpo, Genre, Platform, Tpo

        g = {n: Genre.objects.get(name=n) for n in ["드라마", "공포", "스릴러"]}
        netflix, tving = Platform.objects.get(code="NETFLIX"), Platform.objects.get(code="TVING")
        night = Tpo.objects.get(name="혼자 보는 밤")

        def make(title, genre, platform=netflix):
            c = Content.objects.create(title=title, content_type="movie", release_year=2024)
            ContentGenre.objects.create(content=c, genre=g[genre])
            if platform:
                ContentPlatform.objects.create(content=c, platform=platform, deeplink_url=f"https://x/{title}")
            return c

        cls.thriller = make("밤의 추적자", "스릴러")
        ContentTpo.objects.create(content=cls.thriller, tpo=night)
        cls.horror = make("공포의 밤", "공포", tving)
        cls.drama = make("가족 드라마", "드라마")
        cls.no_ott = make("OTT 없는 작품", "스릴러", platform=None)
        cls.member = Member.objects.create_user("me@x.kr", "나", "viewfit123!", age_group="20s", job="student")
        cls.member.genre_preferences.create(genre=g["스릴러"], kind="like")
        cls.member.genre_preferences.create(genre=g["공포"], kind="dislike")
        for i, age in enumerate(["20s", "30s", "40s"] * 3):
            rater = Member.objects.create_user(f"r{i}@x.kr", f"평가{i}", "viewfit123!", age_group=age)
            Rating.objects.create(member=rater, content=cls.drama, score=Decimal("4.5"))

    # --- 4-1 ---
    def test_search(self):
        self.assertEqual(self.client.get("/api/v1/contents/search/", {"q": "밤"}).status_code, 400)  # 1글자
        res = self.client.get("/api/v1/contents/search/", {"q": "드라마"})
        self.assertEqual([r["title"] for r in res.data], ["가족 드라마"])
        self.assertEqual(set(res.data[0]), {"id", "title", "content_type", "release_year", "poster_url", "genres", "platforms"})
        self.assertEqual((res.data[0]["genres"], res.data[0]["platforms"]), (["드라마"], ["NETFLIX"]))

    def test_detail_has_card_fields_and_my(self):
        res = self.client.get(f"/api/v1/contents/{self.drama.id}/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["rating"]["total_count"], 9)
        self.assertIsNone(res.data["my"])  # 로그인 안 하면 null
        self.client.force_authenticate(self.member)
        Rating.objects.create(member=self.member, content=self.drama, score=Decimal("3.5"))
        self.assertEqual(self.client.get(f"/api/v1/contents/{self.drama.id}/").data["my"], {"score": 3.5, "comment": "", "liked": False})
        res = self.client.get("/api/v1/contents/999999/")
        self.assertEqual((res.status_code, res.data["detail"]), (404, "작품을 찾을 수 없어요."))

    def test_watch_records_direct_history(self):
        from .models import WatchHistory

        url = f"/api/v1/contents/{self.thriller.id}/watch/"
        self.assertEqual(self.client.post(url, {"platform": "NETFLIX"}, format="json").status_code, 401)
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.post(url, {"platform": "TVING"}, format="json").status_code, 400)  # 이 작품엔 없는 OTT
        self.assertEqual(self.client.post(url, {"platform": "NETFLIX"}, format="json").status_code, 204)
        self.assertEqual(WatchHistory.objects.get(member=self.member).source, "direct")

    # --- 0-4 ---
    def feed(self, hour=23):
        from datetime import datetime
        from zoneinfo import ZoneInfo

        from .home import build_home_feed

        now = datetime(2026, 11, 17, hour, 0, tzinfo=ZoneInfo("Asia/Seoul"))  # 화요일
        return build_home_feed(self.member, now=now)

    def test_feed_shape_matches_frontend(self):
        self.client.force_authenticate(self.member)
        res = self.client.get("/api/v1/home/feed/")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])
        data = res.data["data"]
        self.assertEqual(set(data), {"user", "tpo", "hero", "recommendations", "rankings", "cross_age_picks"})
        self.assertEqual(data["user"], {"id": self.member.id, "nickname": "나", "age_group": "20s", "occupation": "학생"})
        self.assertEqual(set(data["rankings"][0]), {"rank", "rank_change", "is_new", "movie"})

    def test_recommendations_follow_taste(self):
        data = self.feed(hour=23)  # 밤 11시 → 혼자 보는 밤
        self.assertEqual(data["tpo"]["situation"], "혼자 보는 밤")
        self.assertEqual(data["tpo"]["time_slot"], "late_night")
        titles = [m["title"] for m in data["recommendations"]]
        self.assertEqual(titles[0], "밤의 추적자")  # 선호 장르 + 상황 연결
        self.assertEqual(data["hero"]["movie"]["title"], "밤의 추적자")
        self.assertNotIn("공포의 밤", titles)  # 비선호 장르 제외
        self.assertNotIn("OTT 없는 작품", titles)  # OTT 없는 작품 제외

    def test_rated_content_not_recommended_and_cross_age(self):
        Rating.objects.create(member=self.member, content=self.thriller, score=Decimal("3.0"))
        data = self.feed()
        self.assertNotIn("밤의 추적자", [m["title"] for m in data["recommendations"]])
        self.assertEqual([m["title"] for m in data["cross_age_picks"]], ["가족 드라마"])  # 20·30·40대 각 3개 이상
        self.assertEqual(data["rankings"][0]["movie"]["title"], "가족 드라마")

    def test_situation_by_time(self):
        from datetime import datetime
        from zoneinfo import ZoneInfo

        from .home import situation_for

        seoul = ZoneInfo("Asia/Seoul")
        self.assertEqual(situation_for(datetime(2026, 11, 17, 19, tzinfo=seoul)), "퇴근 후")  # 화 저녁
        self.assertEqual(situation_for(datetime(2026, 11, 21, 19, tzinfo=seoul)), "주말에 함께")  # 토 저녁
        self.assertEqual(situation_for(datetime(2026, 11, 22, 14, tzinfo=seoul)), "가족과 함께")  # 일 오후

    def test_empty_db_feed(self):
        Content.objects.all().delete()
        data = self.feed()
        self.assertIsNone(data["hero"])
        self.assertEqual(data["recommendations"], [])


# =============================================================================
# 3-1 맞춤 추천 설문 — 기억에 남는 작품 (watch_history source=survey)
# =============================================================================


class SurveyMemorableContentTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        from .models import ContentGenre, ContentPlatform, Genre, Platform

        cls.a = Content.objects.create(title="폭싹 속았수다", content_type="series", release_year=2025)
        cls.b = Content.objects.create(title="선재 업고 튀어", content_type="series", release_year=2024)
        ContentGenre.objects.create(content=cls.a, genre=Genre.objects.get(name="드라마"))
        ContentPlatform.objects.create(content=cls.a, platform=Platform.objects.get(code="NETFLIX"))
        cls.member = Member.objects.create_user("s@x.kr", "설문", "viewfit123!")

    def setUp(self):
        self.client.force_authenticate(self.member)

    def save(self, ids, **extra):
        return self.client.put("/api/v1/me/survey/", {"liked_genres": ["드라마"], "memorable_content_ids": ids, **extra}, format="json")

    def survey_ids(self):
        from .models import WatchHistory

        return list(WatchHistory.objects.filter(member=self.member, source="survey").values_list("content_id", flat=True))

    def test_two_then_one_leaves_one(self):
        res = self.save([self.a.id, self.b.id])
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(sorted(self.survey_ids()), sorted([self.a.id, self.b.id]))
        self.assertEqual([c["title"] for c in res.data["memorable_contents"]], ["폭싹 속았수다", "선재 업고 튀어"])
        self.assertEqual(res.data["memorable_contents"][0]["genres"], ["드라마"])
        self.assertEqual(res.data["memorable_contents"][0]["platforms"], ["NETFLIX"])

        res = self.save([self.b.id])
        self.assertEqual(self.survey_ids(), [self.b.id])
        self.assertEqual([c["title"] for c in res.data["memorable_contents"]], ["선재 업고 튀어"])

    def test_empty_and_duplicates(self):
        self.save([self.a.id, self.a.id])
        self.assertEqual(self.survey_ids(), [self.a.id])  # 같은 작품은 한 번만
        self.save([])
        self.assertEqual(self.survey_ids(), [])  # 비워도 됨
        self.assertEqual(self.client.put("/api/v1/me/survey/", {}, format="json").status_code, 200)  # 칸이 없어도 됨

    def test_unknown_content_is_400_and_nothing_saved(self):
        self.save([self.a.id])
        res = self.save([self.b.id, 999999])
        self.assertEqual(res.status_code, 400)
        self.assertIn("없는 작품이에요: 999999", res.data["memorable_content_ids"][0])
        self.assertEqual(self.survey_ids(), [self.a.id])  # 실패하면 예전 기록 그대로

    def test_direct_watch_history_is_kept(self):
        from .models import WatchHistory

        WatchHistory.objects.create(member=self.member, content=self.b, source="direct")
        self.save([self.a.id])
        self.save([])
        self.assertEqual(WatchHistory.objects.filter(member=self.member, source="direct").count(), 1)

    def test_me_shows_memorable_contents(self):
        self.save([self.a.id])
        self.assertEqual([c["id"] for c in self.client.get("/api/v1/me/").data["memorable_contents"]], [self.a.id])


# =============================================================================
# 6-1 통합 랭킹 — 집계 명령(build_rankings) · 지수 · 순위 변동 · API · 홈 TOP 10
# =============================================================================


import datetime

from django.utils import timezone


@override_settings(TMDB_API_TOKEN="test-token")
class TotalRankingTests(APITestCase):
    URL = "/api/v1/rankings/"

    @classmethod
    def setUpTestData(cls):
        from .models import ContentGenre, ContentPlatform, Genre, Platform

        drama, comedy = Genre.objects.get(name="드라마"), Genre.objects.get(name="코미디")
        netflix, tving = Platform.objects.get(code="NETFLIX"), Platform.objects.get(code="TVING")
        # 작품 A~E: A·C·E 영화, B·D 시리즈 / A·B·C 넷플릭스, D·E 티빙 / A·D 코미디
        cls.c = {}
        for i, name in enumerate("ABCDE"):
            kind = "movie" if name in "ACE" else "series"
            c = Content.objects.create(
                title=f"작품{name}", content_type=kind, tmdb_id=100 + i, tmdb_vote_count=1000 - i * 100
            )
            ContentGenre.objects.create(content=c, genre=comedy if name in "AD" else drama)
            ContentPlatform.objects.create(content=c, platform=netflix if name in "ABC" else tving, deeplink_url="https://x")
            cls.c[name] = c
        Content.objects.create(title="OTT 없는 작품", content_type="movie", tmdb_id=999)  # 랭킹에서 빠져야 함

    def build(self, date, popularity=None, period="weekly"):
        """popularity: {작품이름: 인기도} → 가짜 TMDB 인기 목록. None 이면 --offline"""
        from io import StringIO

        out = StringIO()
        if popularity is None:
            call_command("build_rankings", period=period, date=date, offline=True, stdout=out)
            return out.getvalue()

        def fake(path, **params):
            kind = "movie" if path.endswith("/movie") else "series"
            results = [
                {"id": self.c[n].tmdb_id, "popularity": p}
                for n, p in popularity.items()
                if self.c[n].content_type == kind
            ]
            return {"page": 1, "total_pages": 1, "results": results}

        with mock.patch("core.tmdb.get", side_effect=fake):
            call_command("build_rankings", period=period, date=date, stdout=out)
        return out.getvalue()

    def ranks(self, date, period="weekly"):
        from .models import Ranking

        return {
            r.content.title[-1]: r.rank
            for r in Ranking.objects.filter(period=period, ranked_on=date).select_related("content")
        }

    def test_build_saves_ranking_with_score_by_tmdb_popularity(self):
        from .models import Ranking

        out = self.build("2026-11-20", {"A": 10, "B": 50, "C": 30, "D": 40, "E": 20})
        self.assertIn("랭킹 5개 저장", out)
        self.assertEqual(self.ranks("2026-11-20"), {"B": 1, "D": 2, "C": 3, "E": 4, "A": 5})
        top = Ranking.objects.get(ranked_on="2026-11-20", rank=1)
        self.assertEqual(top.score, Decimal("70.0"))  # 인기 1등(백분위 1.0) + 평점 없음(0)
        self.assertEqual(Ranking.objects.get(ranked_on="2026-11-20", rank=5).score, Decimal("0.0"))

    def test_score_formula_with_prior(self):
        """지수 = 70 × 인기 백분위 + 30 × 보정평점/5 — 평가 1개짜리는 전체 평균 쪽으로 당겨짐"""
        from .models import Ranking

        members = [Member.objects.create_user(f"r{i}@x.kr", f"평가{i}", "viewfit123!", age_group="20s") for i in range(10)]
        for mem in members:
            Rating.objects.create(member=mem, content=self.c["E"], score=Decimal("5.0"))
        Rating.objects.create(member=members[0], content=self.c["D"], score=Decimal("0.5"))
        today = timezone.localdate()
        self.build(today.isoformat())  # 오프라인: TMDB 평가 수 A>B>C>D>E → 백분위 1, .75, .5, .25, 0
        score = {r.content.title[-1]: float(r.score) for r in Ranking.objects.filter(ranked_on=today)}
        overall = (10 * 5 + 0.5) / 11  # 기간 안 전체 평균
        expect = {
            "A": 70 * 1.0 + 30 * overall / 5,  # 평가 없음 → 전체 평균
            "D": 70 * 0.25 + 30 * ((1 * 0.5 + 5 * overall) / 6) / 5,  # 0.5점 1개 → 평균 쪽으로
            "E": 70 * 0.0 + 30 * ((10 * 5 + 5 * overall) / 15) / 5,
        }
        for name, value in expect.items():
            self.assertAlmostEqual(score[name], value, delta=0.051)
        self.assertGreater(score["D"], 70 * 0.25 + 30 * 0.5 / 5)  # 1개뿐인 낮은 평점이 그대로 반영되지 않음

    def test_monthly_counts_older_ratings_weekly_does_not(self):
        from .models import Ranking

        mem = Member.objects.create_user("old@x.kr", "옛평가", "viewfit123!", age_group="30s")
        r = Rating.objects.create(member=mem, content=self.c["E"], score=Decimal("5.0"))
        Rating.objects.filter(pk=r.pk).update(rated_at=timezone.now() - datetime.timedelta(days=20))
        today = timezone.localdate().isoformat()
        self.build(today, period="weekly")
        self.build(today, period="monthly")
        weekly = Ranking.objects.get(period="weekly", ranked_on=today, content=self.c["E"]).score
        monthly = Ranking.objects.get(period="monthly", ranked_on=today, content=self.c["E"]).score
        self.assertEqual(weekly, Decimal("0.0"))  # 최근 7일 평점 없음
        self.assertGreater(monthly, weekly)

    def test_two_dates_rank_change_and_new(self):
        """다른 날짜로 두 번 집계 → 순위 변동(↑↓)과 NEW"""
        from .ranking import compute_scores, save_rankings

        # 11/20: A 1위 · B 2위 · C 3위 · D 4위 (E 는 그때 TOP 에 없었음)
        day1 = datetime.date(2026, 11, 20)
        pop1 = {(c.content_type, c.tmdb_id): p for c, p in
                [(self.c["A"], 50), (self.c["B"], 40), (self.c["C"], 30), (self.c["D"], 20), (self.c["E"], 10)]}
        save_rankings("weekly", day1, [t for t in compute_scores("weekly", day1, pop1) if t[0].title != "작품E"])
        # 11/27 다시 집계
        self.build("2026-11-27", {"A": 10, "B": 40, "C": 50, "D": 20, "E": 30})

        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["ranked_on"], datetime.date(2026, 11, 27))
        items = {i["movie"]["title"][-1]: i for i in res.data["items"]}
        self.assertEqual(items["C"]["rank"], 1)
        self.assertEqual((items["C"]["rank_change"], items["C"]["is_new"]), (2, False))  # 3위 → 1위
        self.assertEqual((items["A"]["rank_change"], items["A"]["is_new"]), (-4, False))  # 1위 → 5위
        self.assertEqual((items["B"]["rank_change"], items["B"]["is_new"]), (0, False))  # 2위 그대로
        self.assertTrue(items["E"]["is_new"])

    def test_first_aggregation_has_no_new_marks(self):
        self.build("2026-11-20", {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5})
        items = self.client.get(self.URL).data["items"]
        self.assertTrue(all(i["rank_change"] == 0 and not i["is_new"] for i in items))

    def test_same_day_rebuild_overwrites(self):
        from .models import Ranking

        self.build("2026-11-20", {"A": 1, "B": 2, "C": 3, "D": 4, "E": 5})
        self.build("2026-11-20", {"A": 5, "B": 4, "C": 3, "D": 2, "E": 1})
        self.assertEqual(Ranking.objects.filter(ranked_on="2026-11-20").count(), 5)
        self.assertEqual(self.ranks("2026-11-20")["A"], 1)

    def test_filters_renumber_from_one(self):
        self.build("2026-11-20", {"A": 50, "B": 40, "C": 30, "D": 20, "E": 10})
        res = self.client.get(self.URL, {"type": "movie", "platform": "NETFLIX"})
        self.assertEqual([(i["rank"], i["overall_rank"], i["movie"]["title"]) for i in res.data["items"]],
                         [(1, 1, "작품A"), (2, 3, "작품C")])
        self.assertEqual(res.data["total"], 2)
        res = self.client.get(self.URL, {"genre": "코미디", "type": "series"})
        self.assertEqual([(i["rank"], i["movie"]["title"]) for i in res.data["items"]], [(1, "작품D")])

    def test_offset_limit_and_period(self):
        self.build("2026-11-20", {"A": 50, "B": 40, "C": 30, "D": 20, "E": 10})
        res = self.client.get(self.URL, {"limit": 2, "offset": 2})
        self.assertEqual([i["rank"] for i in res.data["items"]], [3, 4])
        self.assertEqual(res.data["next_offset"], 4)
        self.assertIsNone(self.client.get(self.URL, {"period": "monthly"}).data["ranked_on"])  # 월간 집계 없음
        self.assertEqual(self.client.get(self.URL, {"period": "daily"}).status_code, 400)
        self.assertEqual(self.client.get(self.URL, {"platform": "HULU"}).status_code, 400)

    def test_empty_before_any_aggregation(self):
        res = self.client.get(self.URL)
        self.assertEqual((res.status_code, res.data["ranked_on"], res.data["total"], res.data["items"]), (200, None, 0, []))

    def test_tmdb_failure_falls_back_to_vote_count(self):
        from io import StringIO

        import urllib.error

        err = StringIO()
        with mock.patch("core.tmdb.time.sleep"), mock.patch(
            "core.tmdb.urllib.request.urlopen", side_effect=urllib.error.URLError("down")
        ):
            call_command("build_rankings", date="2026-11-20", stdout=StringIO(), stderr=err)
        self.assertIn("TMDB 인기도를 받지 못했어요", err.getvalue())
        self.assertEqual(self.ranks("2026-11-20")["A"], 1)  # tmdb_vote_count 가장 많음

    def test_needs_contents_first(self):
        from .models import ContentPlatform

        ContentPlatform.objects.all().delete()
        with self.assertRaisesMessage(CommandError, "import_tmdb"):
            call_command("build_rankings", offline=True)

    def test_home_top10_uses_weekly_ranking(self):
        self.build("2026-11-20", {"A": 1, "B": 2, "C": 3, "D": 5, "E": 4})
        self.build("2026-11-27", {"A": 1, "B": 2, "C": 5, "D": 4, "E": 3})
        feed = self.client.get("/api/v1/home/feed/").data["data"]
        got = [(r["rank"], r["movie"]["title"][-1], r["rank_change"]) for r in feed["rankings"]]
        self.assertEqual(got[:2], [(1, "C", 2), (2, "D", -1)])


# =============================================================================
# 7-1 맞춤 추천 — 추천 점수·묶음 저장 (recommend.py), 추천 API, 홈 오늘의 추천
# =============================================================================


class RecommendationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        from django.utils import timezone

        from .models import ContentGenre, ContentPlatform, ContentTpo, Genre, Platform, Ranking, Tpo, WatchHistory

        g = {n: Genre.objects.get(name=n) for n in ["드라마", "스릴러", "공포", "코미디"]}
        netflix = Platform.objects.get(code="NETFLIX")
        cls.night, after_work = Tpo.objects.get(name="혼자 보는 밤"), Tpo.objects.get(name="퇴근 후")

        def make(title, genres, tpo=None, content_type="movie", ott=True):
            c = Content.objects.create(title=title, content_type=content_type, release_year=2024)
            for name in genres:
                ContentGenre.objects.create(content=c, genre=g[name])
            if ott:
                ContentPlatform.objects.create(content=c, platform=netflix)
            if tpo:
                ContentTpo.objects.create(content=c, tpo=tpo)
            return c

        cls.thriller = make("밤의 추적자", ["스릴러"], cls.night)
        cls.thriller2 = make("새벽의 그림자", ["스릴러"], cls.night)
        cls.horror = make("공포의 밤", ["공포", "스릴러"], cls.night)
        cls.comedy = make("퇴근길 웃음", ["코미디"], after_work, content_type="series")
        cls.drama = make("가족 드라마", ["드라마"])
        cls.memorable = make("기억의 영화", ["스릴러"], cls.night)
        cls.no_ott = make("OTT 없는 작품", ["스릴러"], cls.night, ott=False)

        cls.member = Member.objects.create_user(
            "rec@x.kr", "추천", "viewfit123!", age_group="20s", survey_completed_at=timezone.now()
        )
        cls.member.genre_preferences.create(genre=g["스릴러"], kind="like")
        cls.member.genre_preferences.create(genre=g["공포"], kind="dislike")
        WatchHistory.objects.create(member=cls.member, content=cls.memorable, source="survey")  # 기억에 남는 작품

        # 가족 드라마: 20대 평균 4.5 (30대 1.0 은 내 연령대가 아니라 빠짐)
        for i, (age, score) in enumerate([("20s", "4.5"), ("20s", "4.5"), ("30s", "1.0")]):
            rater = Member.objects.create_user(f"rr{i}@x.kr", f"평가자{i}", "viewfit123!", age_group=age)
            Rating.objects.create(member=rater, content=cls.drama, score=Decimal(score))
        # 같은 점수(스릴러 둘)면 통합 랭킹 순위가 높은 작품 먼저
        Ranking.objects.create(content=cls.thriller2, period="weekly", ranked_on=timezone.localdate(), rank=1)

    def titles(self, rows):
        return [r.content.title for r in rows]

    # --- Step 1: 추천 점수 ---
    def test_score_items(self):
        from . import recommend

        taste = recommend.load_taste(self.member)
        cards = {c.id: c for c in recommend.candidates(taste)}
        self.assertEqual(recommend.liked_genre_points(cards[self.thriller.id], taste), 3)  # 선호 장르 +3
        self.assertEqual(recommend.loved_work_points(cards[self.thriller.id], taste), 1)  # 기억에 남는 작품과 장르 겹침 +1
        self.assertEqual(recommend.loved_work_points(cards[self.drama.id], taste), 0)
        self.assertEqual(recommend.age_average_points(cards[self.drama.id], taste), 4.5)  # 내 연령대(20대) 평균만
        self.assertEqual(recommend.age_average_points(cards[self.comedy.id], taste), 0.0)  # 평가 없음

    def test_order_and_exclusions(self):
        from .recommend import build_recommendations

        rows = build_recommendations(self.member)
        # 드라마 4.5 > 스릴러 둘 4.0 (같은 점수 → 랭킹 1위인 새벽의 그림자 먼저) > 코미디 0
        self.assertEqual(self.titles(rows), ["가족 드라마", "새벽의 그림자", "밤의 추적자", "퇴근길 웃음"])
        self.assertEqual([r.rank for r in rows], [1, 2, 3, 4])
        # 비선호(공포)·이미 본 작품(기억에 남는 작품)·OTT 없는 작품은 빠짐 — PRD 완료 기준 1
        for title in ["공포의 밤", "기억의 영화", "OTT 없는 작품"]:
            self.assertNotIn(title, self.titles(rows))

    def test_rated_content_not_in_next_batch(self):
        from .recommend import build_recommendations

        self.assertIn("가족 드라마", self.titles(build_recommendations(self.member)))
        Rating.objects.create(member=self.member, content=self.drama, score=Decimal("3.0"))
        self.assertNotIn("가족 드라마", self.titles(build_recommendations(self.member)))  # 완료 기준 3

    def test_situation_filter(self):
        from .recommend import build_recommendations, load_taste, rank_contents

        rows = build_recommendations(self.member, tpo=self.night)
        self.assertEqual(self.titles(rows), ["새벽의 그림자", "밤의 추적자"])  # 혼자 보는 밤과 연결된 작품만 — 완료 기준 2
        self.assertTrue(all(r.tpo == self.night for r in rows))
        scores = {c.title: s for c, s in rank_contents(load_taste(self.member), self.night)}
        self.assertEqual(scores["밤의 추적자"], 8.0)  # 선호 장르 3 + 상황 4 + 기억에 남는 작품 1

    def test_reason_template(self):
        from .curation import make_reason, situation_label
        from .recommend import build_recommendations

        reasons = {r.content.title: r.reason for r in build_recommendations(self.member)}
        self.assertEqual(reasons["밤의 추적자"], "혼자 보는 밤에 어울리는 스릴러 한 편")  # 전체 상황 → 작품에 연결된 상황
        self.assertEqual(reasons["퇴근길 웃음"], "퇴근 후에 어울리는 코미디 한 편")
        self.assertEqual(reasons["가족 드라마"], "지금 보기 좋은 드라마 한 편")  # 연결된 상황 없음
        self.assertEqual(make_reason("주말에 함께", "SF"), "주말에 함께 보기 좋은 SF 한 편")
        self.assertEqual(situation_label("혼자 보는 밤"), "늦은 밤 · 혼자")

    def test_situation_genre_pairs(self):
        from collections import Counter

        from .curation import pick_situation_genre

        genres, situations = ["코미디", "스릴러", "애니메이션"], ["혼자 보는 밤", "퇴근 후"]
        # 상황 규칙에 맞는 짝만: 코미디는 혼자 보는 밤과 짝이 되지 않음
        self.assertEqual(pick_situation_genre(genres, situations, {"코미디"}), ("퇴근 후", "코미디"))
        self.assertEqual(pick_situation_genre(genres, situations, {"스릴러"}), ("혼자 보는 밤", "스릴러"))
        # 선호 장르가 여러 상황과 맞으면 덜 쓴 상황 먼저 (전체 상황에 여러 상황이 섞이게)
        used = Counter({"혼자 보는 밤": 3})
        self.assertEqual(pick_situation_genre(genres, situations, {"코미디", "스릴러"}, used), ("퇴근 후", "코미디"))
        self.assertEqual(pick_situation_genre(["드라마"], [], {"스릴러"}), (None, "드라마"))

    def test_batch_is_saved_and_history_kept(self):
        from .models import Recommendation
        from .recommend import build_recommendations, latest_batch

        build_recommendations(self.member)
        build_recommendations(self.member)
        self.assertEqual(Recommendation.objects.filter(member=self.member).count(), 8)  # 다시 만들면 새 행 추가
        batch = latest_batch(self.member)
        self.assertEqual([r.rank for r in batch], [1, 2, 3, 4])
        self.assertEqual(len({r.recommended_at for r in batch}), 1)  # 한 묶음 = 같은 추천일시
        self.assertTrue(all(r.feedback == "pending" and r.tpo is None for r in batch))

    def test_top_50_only(self):
        from .models import ContentPlatform, Platform
        from .recommend import build_recommendations

        netflix = Platform.objects.get(code="NETFLIX")
        for i in range(50):
            ContentPlatform.objects.create(content=Content.objects.create(title=f"작품{i}", content_type="movie"), platform=netflix)
        rows = build_recommendations(self.member)
        self.assertEqual(len(rows), 50)
        self.assertEqual(rows[-1].rank, 50)

    # --- Step 3: 추천 API ---
    def get(self, **params):
        return self.client.get("/api/v1/recommendations/", params)

    def test_login_and_survey_required(self):
        self.assertEqual(self.get().status_code, 401)
        self.client.force_authenticate(Member.objects.create_user("new@x.kr", "새회원", "viewfit123!"))
        res = self.get()
        self.assertEqual(res.status_code, 403)  # 설문 안 함 → 화면이 설문으로 보냄 (FR8)
        self.assertTrue(res.data["survey_required"])
        self.assertEqual(self.client.post("/api/v1/recommendations/refresh/").status_code, 403)

    def test_get_shape_and_reuses_todays_batch(self):
        from .models import Recommendation

        self.client.force_authenticate(self.member)
        res = self.get()
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual((res.data["tpo"], res.data["count"], res.data["next_offset"]), ("전체 상황", 4, None))
        first = res.data["results"][0]
        self.assertEqual(set(first), {"rank", "tpo", "situation_label", "reason", "content"})
        self.assertEqual((first["rank"], first["content"]["title"]), (1, "가족 드라마"))
        self.assertEqual(res.data["results"][2]["situation_label"], "늦은 밤 · 혼자")
        self.assertIn("platforms", first["content"])  # 작품 카드 모양

        self.get()
        self.assertEqual(Recommendation.objects.filter(member=self.member).count(), 4)  # 오늘 만든 묶음을 다시 씀

    def test_filters_and_paging(self):
        self.client.force_authenticate(self.member)
        self.assertEqual([r["content"]["title"] for r in self.get(type="series").data["results"]], ["퇴근길 웃음"])
        self.assertEqual(self.get(genre="스릴러").data["count"], 2)
        res = self.get(limit=3)
        self.assertEqual((len(res.data["results"]), res.data["next_offset"]), (3, 3))
        self.assertEqual(self.get(offset=3).data["results"][0]["rank"], 4)
        for bad in [{"tpo": "없는상황"}, {"type": "drama"}, {"platform": "HULU"}, {"genre": "없는장르"}]:
            res = self.get(**bad)
            self.assertEqual(res.status_code, 400, bad)
            self.assertIn(next(iter(bad)), res.data)

    def test_situation_chip(self):
        self.client.force_authenticate(self.member)
        res = self.get(tpo="혼자 보는 밤")
        self.assertEqual(res.data["tpo"], "혼자 보는 밤")
        self.assertEqual([r["content"]["title"] for r in res.data["results"]], ["새벽의 그림자", "밤의 추적자"])
        self.assertEqual({r["situation_label"] for r in res.data["results"]}, {"늦은 밤 · 혼자"})
        self.assertEqual(self.get(tpo="all").data["tpo"], "전체 상황")

    def test_new_batch_when_needed(self):
        from datetime import timedelta

        from .models import Recommendation

        self.client.force_authenticate(self.member)
        rows = Recommendation.objects.filter(member=self.member)
        self.get(tpo="혼자 보는 밤")
        self.get()
        self.assertEqual(rows.count(), 6)

        rows.update(recommended_at=rows.first().recommended_at - timedelta(days=1))  # 어제 만든 묶음 → 하루 첫 방문
        self.get()
        self.assertEqual(rows.count(), 10)

        self.client.post("/api/v1/recommendations/refresh/")  # 8-1·8-2 에서 부름
        self.assertEqual(rows.count(), 14)
        self.get(tpo="혼자 보는 밤")  # 전체 상황을 새로 만들었으니 상황별도 새로
        self.assertEqual(rows.count(), 16)

        # 설문 다시 저장 (비선호·기억에 남는 작품을 비움 → 공포의 밤·기억의 영화도 후보가 되어 6개)
        self.client.put("/api/v1/me/survey/", {"liked_genres": ["코미디"]}, format="json")
        res = self.get()
        self.assertEqual(rows.count(), 22)
        # 새 취향 반영: 코미디(선호 +3)가 2위로, 스릴러(이제 선호 아님)는 그 아래로 (1위 드라마는 20대 평균 4.5)
        self.assertEqual([r["content"]["title"] for r in res.data["results"][:2]], ["가족 드라마", "퇴근길 웃음"])

    def test_home_today_pick_is_first_recommendation(self):
        self.client.force_authenticate(self.member)
        first = self.get().data["results"]
        feed = self.client.get("/api/v1/home/feed/").data["data"]
        self.assertEqual(feed["hero"]["movie"]["id"], first[0]["content"]["id"])  # 완료 기준 6
        self.assertEqual([m["id"] for m in feed["recommendations"]], [r["content"]["id"] for r in first])
        # 1위 가족 드라마는 선호 장르(스릴러)·기억에 남는 작품과 겹치지 않음 → 취향 점수 1위 문장, 시간대 상황 태그 없음
        self.assertEqual(feed["hero"]["message"]["headline"], "오늘 취향 점수 1위 드라마 한 편")
        self.assertEqual(feed["tpo"]["mood_tags"], ["#드라마"])
        self.assertIn("요일", feed["tpo"]["situation"])

    # --- 홈 문구: 설문 답(직업·선호 장르·기억에 남는 작품) ---
    def test_home_moment_from_job(self):
        from datetime import datetime
        from types import SimpleNamespace
        from zoneinfo import ZoneInfo

        from .home import member_moment

        def at(day, hour, job):
            return member_moment(SimpleNamespace(job=job), datetime(2026, 11, day, hour, tzinfo=ZoneInfo("Asia/Seoul")))

        self.assertEqual(at(20, 21, "student"), "과제 끝난 금요일 밤")  # Figma 예시 그대로 (칩: 저녁 · 과제 끝난 금요일 밤)
        self.assertEqual(at(22, 18, "student"), "과제 없는 일요일")  # 칩 앞 '저녁'과 겹치는 말은 뺌
        self.assertEqual(at(17, 19, "office"), "퇴근한 화요일")
        self.assertEqual(at(17, 14, "office"), "잠깐 쉬어 가는 화요일")
        self.assertEqual(at(21, 2, "home"), "한숨 돌리는 토요일 새벽")
        self.assertEqual(at(17, 23, None), "화요일")  # 직업 응답 안 함 → 요일만 (칩: 늦은 밤 · 화요일)

    def test_home_headline_from_survey(self):
        from datetime import datetime

        from .home import taste_headline, taste_tags
        from .models import WatchHistory

        now = datetime(2026, 11, 22, 18)
        # ① 기억에 남는 작품(기억의 영화 · 스릴러)과 장르가 겹침
        self.assertEqual(taste_headline(self.thriller, self.member, now), "'기억의 영화' 좋아하셨다면 딱 맞을 스릴러 한 편")
        # ② 기억에 남는 작품이 없으면 선호 장르
        WatchHistory.objects.filter(member=self.member, source="survey").delete()
        self.assertEqual(taste_headline(self.thriller, self.member, now), "스릴러 좋아하는 취향에 딱 맞는 한 편")
        # 1년 안에 나온 작품은 '신작'
        self.assertEqual(taste_headline(self.thriller, self.member, datetime(2025, 1, 1)), "스릴러 좋아하는 취향에 딱 맞는 신작")
        # ③ 겹치는 답이 없음
        self.assertEqual(taste_headline(self.comedy, self.member, now), "오늘 취향 점수 1위 코미디 한 편")
        self.assertEqual(taste_tags(self.horror, self.member), ["#스릴러", "#공포"])  # 선호 장르 먼저


# =============================================================================
# 7-2 재방문 추천 피드백 — 팝업 조건 · 별점/못 봤어요 저장 · 다음 추천 반영 (feedback.py)
# =============================================================================


class RevisitFeedbackTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        from .models import ContentGenre, ContentPlatform, Genre, Platform

        drama = Genre.objects.get(name="드라마")
        netflix = Platform.objects.get(code="NETFLIX")

        def make(title):
            c = Content.objects.create(title=title, content_type="movie", release_year=2024)
            ContentGenre.objects.create(content=c, genre=drama)
            ContentPlatform.objects.create(content=c, platform=netflix)
            return c

        cls.a, cls.b, cls.c = make("작품 A"), make("작품 B"), make("작품 C")
        cls.member = Member.objects.create_user("fb@x.kr", "피드백", "viewfit123!", age_group="30s")
        cls.other = Member.objects.create_user("fb2@x.kr", "다른사람", "viewfit123!")

    def setUp(self):
        self.client.force_authenticate(self.member)

    def ago(self, hours):
        from datetime import timedelta

        from django.utils import timezone

        return timezone.now() - timedelta(hours=hours)

    def recommend(self, content, hours_ago, member=None):
        from .models import Recommendation

        rec = Recommendation.objects.create(member=member or self.member, content=content, rank=1)
        Recommendation.objects.filter(pk=rec.pk).update(recommended_at=self.ago(hours_ago))  # auto_now_add 대신 과거 시각
        return rec

    def click(self, content, hours_ago, member=None):
        from .models import WatchHistory

        return WatchHistory.objects.create(
            member=member or self.member, content=content, source="direct", watched_at=self.ago(hours_ago)
        )

    def pending(self):
        res = self.client.get("/api/v1/recommendations/pending-feedback/")
        self.assertEqual(res.status_code, 200)
        return res.data["recommendation"]

    def send(self, rec, body):
        return self.client.post(f"/api/v1/recommendations/{rec.id}/feedback/", body, format="json")

    # --- 팝업을 띄우는 조건 ---
    def test_asks_latest_clicked_after_12_hours(self):
        rec_a, rec_b = self.recommend(self.a, 48), self.recommend(self.b, 48)
        self.recommend(self.c, 48)  # 안 누른 추천은 묻지 않음
        self.click(self.a, 30)
        self.click(self.b, 20)  # 가장 최근에 누른 것
        got = self.pending()
        self.assertEqual((got["id"], got["content"]["title"]), (rec_b.id, "작품 B"))
        self.assertEqual(set(got), {"id", "tpo", "recommended_at", "clicked_at", "content", "my_rating"})
        self.assertIsNone(got["my_rating"])
        self.send(rec_b, {"watched": False})
        self.assertEqual(self.pending()["id"], rec_a.id)  # 답하면 다음 것

    def test_not_asked_too_early_or_clicked_before_recommendation(self):
        from django.test import override_settings

        self.recommend(self.a, 48)
        self.click(self.a, 1)  # 누른 지 1시간
        self.recommend(self.b, 10)
        self.click(self.b, 20)  # 추천받기 전에 누름
        self.assertIsNone(self.pending())
        with override_settings(FEEDBACK_DELAY_HOURS=0.5):  # 손으로 확인할 때처럼 시간 조건을 줄이면
            self.assertEqual(self.pending()["content"]["title"], "작품 A")

    def test_others_and_login(self):
        self.recommend(self.a, 48, member=self.other)
        self.click(self.a, 20, member=self.other)
        self.assertIsNone(self.pending())  # 다른 회원 것은 안 보임
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/v1/recommendations/pending-feedback/").status_code, 401)

    # --- [의견 보내기] ---
    def test_rated_saves_rating_and_all_rows_of_that_content(self):
        from .models import Recommendation

        old, rec = self.recommend(self.a, 72), self.recommend(self.a, 48)  # 같은 작품이 두 번 추천됨
        self.click(self.a, 20)
        res = self.send(rec, {"watched": True, "score": 3.5, "comment": "생각보다 좋았어요"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, {"id": rec.id, "feedback": "rated", "rating": {"score": 3.5, "comment": "생각보다 좋았어요"}})
        rating = Rating.objects.get(member=self.member, content=self.a)  # 완료 기준 2
        self.assertEqual((rating.score, rating.age_group_at_rating), (Decimal("3.5"), "30s"))
        self.assertEqual(set(Recommendation.objects.filter(pk__in=[old.pk, rec.pk]).values_list("feedback", flat=True)), {"rated"})
        self.assertIsNone(self.pending())
        self.assertEqual(self.send(rec, {"watched": False}).status_code, 400)  # 이미 답함

    def test_existing_rating_is_prefilled_and_updated(self):
        Rating.objects.create(member=self.member, content=self.a, score=Decimal("2.0"), comment="별로")
        rec = self.recommend(self.a, 48)
        self.click(self.a, 20)
        self.assertEqual(self.pending()["my_rating"], {"score": 2.0, "comment": "별로"})
        self.send(rec, {"watched": True, "score": 4.5})
        self.assertEqual(list(Rating.objects.filter(member=self.member).values_list("score", "comment")), [(Decimal("4.5"), "")])

    def test_not_watched_no_rating_and_recommended_again(self):
        from django.utils import timezone

        from .models import Recommendation
        from .recommend import build_recommendations

        self.member.survey_completed_at = timezone.now()
        self.member.save()
        rec = self.recommend(self.a, 48)
        self.click(self.a, 20)
        self.click(self.b, 20)  # B 는 [바로 보기]만 누르고 답하지 않음
        self.assertNotIn("작품 A", [r.content.title for r in build_recommendations(self.member)])  # 답 전에는 제외
        res = self.send(rec, {"watched": False, "score": 4.0, "comment": "무시됨"})
        self.assertEqual((res.status_code, res.data["feedback"], res.data["rating"]), (200, "not_watched", None))
        self.assertFalse(Rating.objects.filter(member=self.member).exists())  # 완료 기준 3
        self.assertEqual(Recommendation.objects.get(pk=rec.pk).feedback, "not_watched")
        titles = [r.content.title for r in build_recommendations(self.member)]
        self.assertIn("작품 A", titles)  # 못 봤어요 → 다시 추천 (11/22 결정)
        self.assertNotIn("작품 B", titles)

    def test_validation(self):
        rec = self.recommend(self.a, 48)
        self.click(self.a, 20)
        self.assertEqual(self.send(rec, {}).data, {"score": ["별점을 선택해 주세요."]})  # 아무것도 안 고름
        self.assertEqual(self.send(rec, {"watched": True}).data, {"score": ["별점을 선택해 주세요."]})
        self.assertEqual(self.send(rec, {"watched": True, "score": 4.3}).status_code, 400)  # 0.5 단위 아님
        self.assertEqual(self.send(rec, {"watched": True, "score": 5.5}).status_code, 400)
        self.assertEqual(self.send(rec, {"watched": True, "score": 3, "comment": "가" * 201}).data["comment"],
                         ["한마디는 200자까지 쓸 수 있어요."])
        self.assertFalse(Rating.objects.exists())
        other_rec = self.recommend(self.b, 48, member=self.other)
        self.assertEqual(self.send(other_rec, {"watched": False}).status_code, 404)


# =============================================================================
# 7 추천 정확도 ② 숨겨 두고 맞히기 — recommend_accuracy 명령 (docs/presentation/추천 정확도 기준과 확인 방법.md)
# =============================================================================


class RecommendAccuracyTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.utils import timezone

        from .models import ContentGenre, ContentLike, ContentPlatform, Genre, Platform, Ranking

        thriller, comedy = Genre.objects.get(name="스릴러"), Genre.objects.get(name="코미디")
        netflix = Platform.objects.get(code="NETFLIX")

        def make(title, genre, rank):
            c = Content.objects.create(title=title, content_type="movie", release_year=2024)
            ContentGenre.objects.create(content=c, genre=genre)
            ContentPlatform.objects.create(content=c, platform=netflix)
            Ranking.objects.create(content=c, period="weekly", ranked_on=timezone.localdate(), rank=rank)
            return c

        # 통합 랭킹은 코미디가 위, 가상 회원 취향은 스릴러
        make("인기 코미디1", comedy, 1)
        make("인기 코미디2", comedy, 2)
        cls.hidden = make("숨길 스릴러", thriller, 3)
        make("다른 스릴러", thriller, 4)
        seen = make("본 코미디", comedy, 5)

        cls.demo = Member.objects.create_user(
            "demo01@demo.viewfit.local", "시연01", None, age_group="20s", survey_completed_at=timezone.now()
        )
        cls.demo.genre_preferences.create(genre=thriller, kind="like")
        Rating.objects.create(member=cls.demo, content=cls.hidden, score=Decimal("4.5"))  # 4.0 이상 → 숨겨 볼 작품
        ContentLike.objects.create(member=cls.demo, content=cls.hidden)
        Rating.objects.create(member=cls.demo, content=seen, score=Decimal("2.0"))
        # 4.0 이상 평점이 없는 가상 회원은 빼고, 진짜 회원은 처음부터 대상이 아님
        low = Member.objects.create_user("demo02@demo.viewfit.local", "시연02", None, age_group="20s")
        Rating.objects.create(member=low, content=seen, score=Decimal("3.0"))
        real = Member.objects.create_user("real@x.kr", "진짜", "viewfit123!", age_group="20s")
        Rating.objects.create(member=real, content=seen, score=Decimal("5.0"))

    def test_taste_finds_hidden_work_ranking_does_not(self):
        from .management.commands.recommend_accuracy import holdout_check

        r = holdout_check(top=2)
        self.assertEqual((r.members, r.skipped, len(r.trials)), (1, 1, 1))
        t = r.trials[0]
        # 후보 4개 (본 코미디는 이미 평가해서 빠짐): 맞춤 추천은 스릴러 둘이 위(같은 점수 → 랭킹 3위인 숨길 스릴러 먼저),
        # 통합 랭킹 순은 코미디 둘 다음 3번째
        self.assertEqual((t.nickname, t.recommend_rank, t.ranking_rank, t.pool), ("시연01", 1, 3, 4))
        self.assertEqual((r.hits("recommend_rank"), r.hits("ranking_rank")), (1, 0))
        self.assertEqual(r.random_rate, 0.5)  # 후보 4개 중 무작위 2개

    def test_db_is_unchanged(self):
        from .management.commands.recommend_accuracy import holdout_check
        from .models import ContentLike, Recommendation

        before = (Rating.objects.count(), ContentLike.objects.count())
        holdout_check()
        self.assertEqual((Rating.objects.count(), ContentLike.objects.count()), before)
        self.assertTrue(Rating.objects.filter(member=self.demo, content=self.hidden, score=Decimal("4.5")).exists())
        self.assertTrue(ContentLike.objects.filter(member=self.demo, content=self.hidden).exists())
        self.assertFalse(Recommendation.objects.exists())  # 추천 묶음도 저장하지 않음

    def test_command_output_and_needs_data_first(self):
        from .models import Ranking

        out = StringIO()
        call_command("recommend_accuracy", "--top", "2", stdout=out)
        text = out.getvalue()
        self.assertIn("가상 회원 1명 · 1번 숨겨 봄", text)
        self.assertIn("맞춤 추천 (7-1 점수): 1 / 1번 = 100.0%", text)
        self.assertIn("통합 랭킹 순 (취향 안 봄): 0 / 1번 = 0.0%", text)
        self.assertIn("통과 (+100.0%p)", text)

        Ranking.objects.all().delete()
        with self.assertRaisesMessage(CommandError, "build_rankings"):
            call_command("recommend_accuracy", stdout=StringIO())
        Member.objects.filter(email__endswith="@demo.viewfit.local").delete()
        with self.assertRaisesMessage(CommandError, "seed_demo"):
            call_command("recommend_accuracy", stdout=StringIO())


# =============================================================================
# 6-2 세대별 랭킹 — 평가 당시 연령대로 묶기 · 평가 3개 미만 제외 · 필터 · 기본 연령대
# =============================================================================


class GenerationRankingTests(APITestCase):
    URL = "/api/v1/rankings/generation/"

    @classmethod
    def setUpTestData(cls):
        from .models import ContentGenre, ContentPlatform, Genre, Platform

        drama, comedy = Genre.objects.get(name="드라마"), Genre.objects.get(name="코미디")
        netflix, tving = Platform.objects.get(code="NETFLIX"), Platform.objects.get(code="TVING")
        cls.c = {}
        for name in "ABCD":
            c = Content.objects.create(title=f"작품{name}", content_type="movie" if name in "AB" else "series")
            ContentGenre.objects.create(content=c, genre=comedy if name in "AC" else drama)
            ContentPlatform.objects.create(content=c, platform=netflix if name in "AB" else tving, deeplink_url="https://x")
            cls.c[name] = c
        cls.n = 0

    def rate(self, name, age, *scores, email=None):
        """age 연령대 회원들이 작품 name 에 scores 를 하나씩"""
        for s in scores:
            GenerationRankingTests.n += 1
            mem = Member.objects.create_user(email or f"g{self.n}@x.kr", f"세대{self.n}", "viewfit123!", age_group=age)
            Rating.objects.create(member=mem, content=self.c[name], score=Decimal(str(s)))

    def test_average_order_and_two_ratings_excluded(self):
        self.rate("A", "20s", 5, 4, 4)        # 4.33 (3개)
        self.rate("B", "20s", 5, 5, 4, 4)     # 4.50 (4개)
        self.rate("C", "20s", 4.5, 4.5, 4.5)  # 4.50 (3개) → B 와 같으면 평가 수 많은 B 가 위
        self.rate("D", "20s", 5, 5)           # 평가 2개 → 제외
        res = self.client.get(self.URL, {"age": "20s"})
        self.assertEqual(res.status_code, 200)
        got = [(i["rank"], i["movie"]["title"][-1], i["average"], i["count"]) for i in res.data["items"]]
        self.assertEqual(got, [(1, "B", 4.5, 4), (2, "C", 4.5, 3), (3, "A", 4.33, 3)])
        self.assertEqual((res.data["total"], res.data["age_label"], res.data["min_count"]), (3, "20대", 3))

    def test_tabs_differ_by_age(self):
        self.rate("A", "20s", 5, 5, 5)
        self.rate("B", "20s", 2, 2, 2)
        self.rate("A", "40s", 1, 1, 1)
        self.rate("B", "40s", 5, 5, 5)
        first = lambda age: self.client.get(self.URL, {"age": age}).data["items"][0]["movie"]["title"]
        self.assertEqual((first("20s"), first("40s")), ("작품A", "작품B"))
        self.assertEqual(self.client.get(self.URL, {"age": "60s+"}).data["items"], [])

    def test_member_age_change_keeps_old_ratings_in_old_generation(self):
        self.rate("A", "20s", 5, 5)
        mover = Member.objects.create_user("mover@x.kr", "이사", "viewfit123!", age_group="20s")
        Rating.objects.create(member=mover, content=self.c["A"], score=Decimal("4.0"))
        mover.age_group = "30s"  # 해가 바뀌어 30대가 됨
        mover.save()
        items = self.client.get(self.URL, {"age": "20s"}).data["items"]
        self.assertEqual((items[0]["movie"]["title"], items[0]["count"]), ("작품A", 3))  # 20대에 그대로
        self.assertEqual(self.client.get(self.URL, {"age": "30s"}).data["items"], [])

    def test_filters_and_paging(self):
        for name in "ABCD":
            self.rate(name, "30s", 4, 4, 4)
        res = self.client.get(self.URL, {"age": "30s", "type": "series", "platform": "TVING", "genre": "드라마"})
        self.assertEqual([(i["rank"], i["movie"]["title"]) for i in res.data["items"]], [(1, "작품D")])
        res = self.client.get(self.URL, {"age": "30s", "limit": 2, "offset": 2})
        self.assertEqual(([i["rank"] for i in res.data["items"]], res.data["next_offset"]), ([3, 4], None))
        self.assertEqual(self.client.get(self.URL, {"age": "70s"}).status_code, 400)
        self.assertEqual(self.client.get(self.URL, {"genre": "없는장르"}).status_code, 400)

    def test_default_age_is_my_age_group_then_20s(self):
        self.assertEqual(self.client.get(self.URL).data["age"], "20s")  # 로그인 안 함
        me = Member.objects.create_user("me@x.kr", "사십대", "viewfit123!", age_group="40s")
        self.client.force_authenticate(me)
        self.assertEqual(self.client.get(self.URL).data["age"], "40s")

    def test_demo_flag(self):
        self.rate("A", "50s", 4, 4, 4)
        self.assertFalse(self.client.get(self.URL, {"age": "50s"}).data["has_demo"])
        self.rate("B", "50s", 3, email="demo99@demo.viewfit.local")
        self.rate("B", "50s", 3, 3)
        self.assertTrue(self.client.get(self.URL, {"age": "50s"}).data["has_demo"])

    def test_top_30_only(self):
        from .models import ContentPlatform, Platform

        netflix = Platform.objects.get(code="NETFLIX")
        raters = [Member.objects.create_user(f"t{i}@x.kr", f"삼십{i}", "viewfit123!", age_group="20s") for i in range(3)]
        for i in range(32):
            c = Content.objects.create(title=f"많은작품{i}", content_type="movie")
            ContentPlatform.objects.create(content=c, platform=netflix, deeplink_url="https://x")
            for r in raters:
                Rating.objects.create(member=r, content=c, score=Decimal("3.0"))
        res = self.client.get(self.URL, {"age": "20s", "limit": 100})
        self.assertEqual((res.data["total"], len(res.data["items"])), (30, 30))


# =============================================================================
# 5-1 평점 — 작성·수정·삭제, 나의 평점, 평점 반영 결과
# =============================================================================


class RatingTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        from .models import ContentLike

        cls.member = Member.objects.create_user("me@x.kr", "나", "viewfit123!", age_group="20s", job="student")
        cls.other = Member.objects.create_user("you@x.kr", "너", "viewfit123!", age_group="30s")
        cls.c = [
            Content.objects.create(title=f"작품{i}", content_type="series" if i % 2 else "movie", tmdb_id=500 + i)
            for i in range(12)
        ]
        ContentLike.objects.create(member=cls.member, content=cls.c[0])
        ContentLike.objects.create(member=cls.member, content=cls.c[1])

    def setUp(self):
        self.client.force_authenticate(self.member)

    def put(self, content, score, comment="", **kw):
        return self.client.put(f"/api/v1/contents/{content.id}/rating/", {"score": score, "comment": comment, **kw}, format="json")

    def test_put_creates_then_updates_same_row(self):
        res = self.put(self.c[0], 4.5, "재밌어요")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["score"], 4.5)
        self.assertEqual(res.data["age_group_at_rating"], "20s")  # 평가 당시 연령대 자동 복사 (FR4)

        Member.objects.filter(pk=self.member.pk).update(age_group="30s")  # 해가 바뀌어 30대가 됨
        res = self.put(self.c[0], 3.0, "다시 보니 보통")
        self.assertEqual(res.status_code, 200, res.data)  # 수정 (FR3)
        rows = Rating.objects.filter(member=self.member, content=self.c[0])
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.get().score, Decimal("3.0"))
        self.assertEqual(rows.get().comment, "다시 보니 보통")
        self.assertEqual(rows.get().age_group_at_rating, "20s")  # 처음 평가할 때 연령대 그대로

        detail = self.client.get(f"/api/v1/contents/{self.c[0].id}/").data
        self.assertEqual(detail["my"]["score"], 3.0)
        self.assertEqual(detail["my"]["comment"], "다시 보니 보통")

    def test_invalid_input_and_login(self):
        self.assertEqual(self.put(self.c[0], 4.3).status_code, 400)  # 0.5 단위가 아님
        self.assertEqual(self.put(self.c[0], 0).status_code, 400)
        self.assertEqual(self.put(self.c[0], 5.5).status_code, 400)
        self.assertEqual(self.put(self.c[0], 4.0, "가" * 201).status_code, 400)  # 200자 넘음
        self.assertEqual(self.client.put(f"/api/v1/contents/{self.c[0].id}/rating/", {}, format="json").status_code, 400)
        self.assertEqual(self.client.put("/api/v1/contents/99999/rating/", {"score": 4}, format="json").status_code, 404)
        self.assertFalse(Rating.objects.exists())

        self.client.force_authenticate(None)
        self.assertEqual(self.put(self.c[0], 4.0).status_code, 401)
        self.assertEqual(self.client.get("/api/v1/me/ratings/").status_code, 401)

    def test_no_age_member_rating_has_null_age_group(self):
        nobody = Member.objects.create_user("n@x.kr", "무응답", "viewfit123!")  # 연령대 '응답 안 함'
        self.client.force_authenticate(nobody)
        res = self.put(self.c[0], 4.0)
        self.assertEqual(res.status_code, 201, res.data)
        self.assertIsNone(Rating.objects.get(member=nobody).age_group_at_rating)  # 세대별 랭킹에서 빠짐

    def test_delete(self):
        self.put(self.c[0], 4.0)
        url = f"/api/v1/contents/{self.c[0].id}/rating/"
        self.assertEqual(self.client.delete(url).status_code, 204)
        self.assertFalse(Rating.objects.filter(member=self.member).exists())
        self.assertEqual(self.client.delete(url).status_code, 404)

    def test_my_ratings_filters_sort_pages_and_summary(self):
        scores = [5.0, 4.5, 4.0, 3.5, 4.5, 2.0, 1.0, 4.0]  # 작품0~7 (홀수 번호 = 시리즈)
        for content, score in zip(self.c, scores):
            self.put(content, score, f"{content.title} 감상")
        Rating.objects.create(member=self.other, content=self.c[9], score=Decimal("5.0"))  # 다른 회원 평점은 안 보임

        res = self.client.get("/api/v1/me/ratings/")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["count"], 8)
        self.assertEqual(res.data["page_size"], 3)
        self.assertEqual(res.data["total_pages"], 3)
        self.assertEqual(len(res.data["results"]), 3)
        self.assertEqual(res.data["results"][0]["movie"]["title"], "작품7")  # 최근 평가순
        self.assertEqual(res.data["summary"], {"like_count": 2, "rating_count": 8, "rating_average": 3.6})

        # 시리즈 + 4점대 → 작품1(4.5), 작품7(4.0) (작품3 3.5, 작품5 2.0 제외)
        res = self.client.get("/api/v1/me/ratings/", {"type": "series", "score": "4"})
        self.assertEqual([r["movie"]["title"] for r in res.data["results"]], ["작품7", "작품1"])
        self.assertEqual(res.data["summary"]["rating_count"], 8)  # 요약은 필터와 상관없이 전체

        res = self.client.get("/api/v1/me/ratings/", {"score": "5"})
        self.assertEqual([r["score"] for r in res.data["results"]], [5.0])

        res = self.client.get("/api/v1/me/ratings/", {"sort": "score_desc", "page": 2})
        self.assertEqual(res.data["page"], 2)
        self.assertEqual([r["score"] for r in res.data["results"]], [4.0, 4.0, 3.5])

        res = self.client.get("/api/v1/me/ratings/", {"page": 9})  # 없는 페이지 → 마지막 페이지
        self.assertEqual(res.data["page"], 3)
        self.assertEqual(len(res.data["results"]), 2)

        for bad in ({"type": "anime"}, {"score": "4.5"}, {"sort": "random"}, {"page": "0"}, {"page": "x"}):
            self.assertEqual(self.client.get("/api/v1/me/ratings/", bad).status_code, 400, bad)

    def test_my_ratings_empty(self):
        res = self.client.get("/api/v1/me/ratings/")
        self.assertEqual(res.data["count"], 0)
        self.assertEqual(res.data["total_pages"], 1)
        self.assertEqual(res.data["results"], [])
        self.assertIsNone(res.data["summary"]["rating_average"])

    def _rank(self, date, order):
        from .models import Ranking

        for rank, i in enumerate(order, start=1):
            Ranking.objects.create(period="weekly", ranked_on=date, content=self.c[i], rank=rank)

    def test_rating_result_matches_ranking_table(self):
        import datetime

        url = f"/api/v1/contents/{self.c[5].id}/rating-result/"
        self.assertEqual(self.client.get(url).status_code, 404)  # 아직 평가 안 함
        self.put(self.c[5], 4.5, "끝까지 긴장")

        # 집계가 아직 없음
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertIsNone(res.data["ranking"]["current_rank"])
        self.assertEqual(res.data["rating"]["movie"]["title"], "작품5")
        self.assertEqual(res.data["rating"]["comment"], "끝까지 긴장")

        # 전 집계: 작품5가 5위 → 이번 집계: 3위, 위 2위 작품1(변동 없음), 아래 4위 작품0(1위→4위)
        self._rank(datetime.date(2026, 11, 14), [0, 1, 2, 3, 5, 4])
        self._rank(datetime.date(2026, 11, 21), [2, 1, 5, 0, 3, 4])
        r = self.client.get(url).data["ranking"]
        self.assertEqual(str(r["ranked_on"]), "2026-11-21")
        self.assertEqual(str(r["previous_ranked_on"]), "2026-11-14")
        self.assertEqual((r["previous_rank"], r["current_rank"], r["rank_change"]), (5, 3, 2))
        self.assertEqual([n["rank"] for n in r["neighbors"]], [2, 3, 4])
        self.assertEqual([n["is_mine"] for n in r["neighbors"]], [False, True, False])
        self.assertEqual([n["rank_change"] for n in r["neighbors"]], [0, 2, -3])
        self.assertEqual(r["neighbors"][2]["previous_rank"], 1)

        # 1위 작품은 위가 없음
        self.put(self.c[2], 5.0)
        r = self.client.get(f"/api/v1/contents/{self.c[2].id}/rating-result/").data["ranking"]
        self.assertEqual([n["rank"] for n in r["neighbors"]], [1, 2])

    def test_rating_result_outside_top100(self):
        import datetime

        self._rank(datetime.date(2026, 11, 21), [0, 1, 2])
        self.put(self.c[9], 3.5)
        r = self.client.get(f"/api/v1/contents/{self.c[9].id}/rating-result/").data["ranking"]
        self.assertIsNone(r["current_rank"])  # 화면: "아직 TOP 100 밖이에요"
        self.assertEqual(r["neighbors"], [])
