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
            self.assertIn(name, card)  # D6 칸이 생기기 전에도 프론트 타입과 같은 칸 이름

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
