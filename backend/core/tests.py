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
        self.assertEqual(self.client.get(f"/api/v1/contents/{self.drama.id}/").data["my"], {"score": 3.5, "liked": False})
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
