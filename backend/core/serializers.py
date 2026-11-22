"""
API 입력 검사 · 응답 모양

화면(프론트엔드)과 같은 규칙으로 검사합니다.
  - 이메일: 형식 + 중복 금지 (소문자로 저장)
  - 닉네임: 한글·영문·숫자·밑줄 2~12자 + 중복 금지
  - 비밀번호: 영문·숫자·특수문자 포함 8자 이상
"""
import re
from decimal import Decimal

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import SCORE_CHOICES, AgeGroup, Content, Genre, Job, Member, PreferenceKind, WatchSource

NICKNAME_RE = re.compile(r"^[가-힣A-Za-z0-9_]{2,12}$")


def check_nickname(nickname: str) -> str | None:
    """사용할 수 없으면 이유를, 쓸 수 있으면 None 을 돌려줌"""
    if not NICKNAME_RE.fullmatch(nickname):
        return "닉네임은 한글·영문·숫자·밑줄(_)로 2~12자까지 쓸 수 있어요."
    if Member.objects.filter(nickname__iexact=nickname).exists():
        return "이미 사용 중인 닉네임이에요."
    return None


def check_password_rule(password: str) -> None:
    if not (
        len(password) >= 8
        and re.search(r"[A-Za-z]", password)
        and re.search(r"\d", password)
        and re.search(r"[^A-Za-z0-9]", password)
    ):
        raise serializers.ValidationError("영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.")
    validate_password(password)


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    nickname = serializers.CharField(max_length=12)
    password = serializers.CharField(write_only=True)
    # 필수 동의 3개 + 선택 동의 1개 (회원가입 화면의 체크박스)
    age14 = serializers.BooleanField()
    terms = serializers.BooleanField()
    privacy = serializers.BooleanField()
    marketing = serializers.BooleanField(default=False)

    def validate_email(self, value):
        value = value.strip().lower()
        if Member.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("이미 가입된 이메일이에요.")
        return value

    def validate_nickname(self, value):
        value = value.strip()
        reason = check_nickname(value)
        if reason:
            raise serializers.ValidationError(reason)
        return value

    def validate_password(self, value):
        check_password_rule(value)
        return value

    def validate(self, attrs):
        if not (attrs["age14"] and attrs["terms"] and attrs["privacy"]):
            raise serializers.ValidationError("필수 항목에 모두 동의해 주세요.")
        return attrs

    def create(self, data):
        return Member.objects.create_user(
            email=data["email"],
            nickname=data["nickname"],
            password=data["password"],
            marketing_opt_in=data["marketing"],
            terms_agreed_at=timezone.now(),
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        member = authenticate(
            request=self.context.get("request"),
            email=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        if member is None:
            raise serializers.ValidationError("이메일 또는 비밀번호가 올바르지 않아요.")
        attrs["member"] = member
        return attrs


def content_brief(content):
    """작품 요약 — 검색 결과(4-1)·기억에 남는 작품(3-1) 목록 한 줄
    {id, title, content_type, release_year, poster_url, genres: [이름], platforms: [OTT 코드]}
    """
    return {
        "id": content.id,
        "title": content.title,
        "content_type": content.content_type,
        "release_year": content.release_year,
        "poster_url": content.poster_url,
        "genres": [g.name for g in content.genres.all()],
        "platforms": [cp.platform.code for cp in content.contentplatform_set.all()],
    }


class MeSerializer(serializers.ModelSerializer):
    """내 정보 (프로필·헤더에서 사용)"""

    survey_completed = serializers.SerializerMethodField()
    liked_genres = serializers.SerializerMethodField()
    disliked_genres = serializers.SerializerMethodField()
    memorable_contents = serializers.SerializerMethodField()  # 3-1 설문의 기억에 남는 작품

    class Meta:
        model = Member
        fields = [
            "id", "email", "nickname", "age_group", "job", "marketing_opt_in", "date_joined",
            "survey_completed", "survey_completed_at", "liked_genres", "disliked_genres", "memorable_contents",
        ]

    def get_survey_completed(self, member):
        return member.survey_completed_at is not None

    def _genres(self, member, kind):
        return [p.genre.name for p in member.genre_preferences.all() if p.kind == kind]

    def get_liked_genres(self, member):
        return self._genres(member, PreferenceKind.LIKE)

    def get_disliked_genres(self, member):
        return self._genres(member, PreferenceKind.DISLIKE)

    def get_memorable_contents(self, member):
        histories = (
            member.watch_histories.filter(source=WatchSource.SURVEY)
            .select_related("content")
            .prefetch_related("content__genres", "content__contentplatform_set__platform")
            .order_by("id")
        )
        return [content_brief(h.content) for h in histories]


class SurveySerializer(serializers.Serializer):
    """취향 설문 저장 — 연령대·직업은 회원 테이블, 장르는 장르 취향 테이블"""

    age_group = serializers.ChoiceField(choices=AgeGroup.choices, allow_null=True, required=False)
    job = serializers.ChoiceField(choices=Job.choices, allow_null=True, required=False)
    liked_genres = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    liked_all = serializers.BooleanField(required=False, default=False)  # "모든 장르가 좋아요"
    disliked_genres = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    # 기억에 남는 작품 (작품 번호 목록, 비어도 됨) → watch_history 에 source='survey' 로 저장
    memorable_content_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False, default=list)

    def validate_memorable_content_ids(self, ids):
        ids = list(dict.fromkeys(ids))  # 같은 작품을 두 번 넣어도 한 번만 (순서 유지)
        missing = set(ids) - set(Content.objects.filter(pk__in=ids).values_list("pk", flat=True))
        if missing:
            raise serializers.ValidationError(f"없는 작품이에요: {', '.join(map(str, sorted(missing)))}")
        return ids

    def validate(self, attrs):
        names = set(attrs["liked_genres"]) | set(attrs["disliked_genres"])
        known = set(Genre.objects.filter(name__in=names).values_list("name", flat=True))
        unknown = names - known
        if unknown:
            raise serializers.ValidationError(f"없는 장르예요: {', '.join(sorted(unknown))}")
        if attrs["liked_all"]:
            attrs["liked_genres"] = list(Genre.objects.values_list("name", flat=True))
        both = set(attrs["liked_genres"]) & set(attrs["disliked_genres"])
        if both:
            raise serializers.ValidationError(f"선호와 비선호에 같은 장르가 있어요: {', '.join(sorted(both))}")
        return attrs


# =============================================================================
# 0번 공통 — 작품 카드 (0-3 FR5·FR8·FR13)
# 홈·랭킹·추천·좋아요·검색 등 작품을 보여 주는 API 는 모두 이 모양을 씁니다.
# 프론트엔드 app/_lib/viewfit.ts 의 Movie 타입과 같은 칸 이름입니다.
# 작품 목록은 core/common.py 의 contents_for_cards() 로 불러와야 평점이 한 번에 계산됩니다.
# =============================================================================

# 아직 DB 에 칸이 없는 값 — 칸이 생기면 자동으로 채워짐 (D6 의 나머지 칸은 11/17 추가됨)
_PENDING_FIELDS = {
    "original_title": "",
}


def _round1(value):
    return round(float(value), 1) if value is not None else 0.0


class ContentCardSerializer(serializers.ModelSerializer):
    genres = serializers.SerializerMethodField()
    platforms = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = [
            "id", "tmdb_id", "title", "content_type", "overview", "poster_url",
            "release_year", "tagline", "genres", "platforms", "rating",
            # D6 (프론트 Movie 타입의 칸 이름: runtime_minutes → runtime, 등급 모르면 null)
            "backdrop_url", "runtime", "episode_count", "age_rating",
        ]

    runtime = serializers.IntegerField(source="runtime_minutes", read_only=True)
    age_rating = serializers.SerializerMethodField()

    def to_representation(self, content):
        data = super().to_representation(content)
        for name, empty in _PENDING_FIELDS.items():
            data[name] = getattr(content, name, empty)
        return data

    def get_age_rating(self, content):
        return content.age_rating or None

    def get_genres(self, content):
        return [{"id": g.id, "name": g.name} for g in content.genres.all()]

    def get_platforms(self, content):
        return [
            {"code": cp.platform.code, "name": cp.platform.name, "watch_url": cp.deeplink_url}
            for cp in content.contentplatform_set.all()
        ]

    def get_rating(self, content):
        ratings = list(content.ratings.all())
        by_age = {}
        for r in ratings:
            if r.age_group_at_rating:
                by_age.setdefault(r.age_group_at_rating, []).append(r.score)
        # contents_for_cards() 로 불러왔으면 DB 가 계산한 값, 아니면 여기서 계산
        total = getattr(content, "rating_count", None)
        avg = getattr(content, "rating_avg", None)
        if total is None:
            total = len(ratings)
            avg = sum(r.score for r in ratings) / total if total else None
        return {
            "overall": _round1(avg),
            "total_count": total,
            "by_age_group": [
                {"age_group": age, "average": _round1(sum(s) / len(s)), "count": len(s)}
                for age, s in sorted(by_age.items())
            ],
        }


# =============================================================================
# 평점 입력 (5-1 평점 · 7-2 재방문 피드백 공통) — 별점 0.5 단위, 한마디 200자
# 저장은 core/common.py 의 save_rating() (한 작품 1개 · 다시 하면 수정 · 평가 당시 연령대는 Rating.save() 가 채움)
# =============================================================================

_SCORE_MESSAGE = "별점은 0.5점부터 5점까지 0.5점 단위로 골라 주세요."


class RatingInputSerializer(serializers.Serializer):
    """{score: 3.5, comment: "..."} — 5-1 평점 PUT 도 이것으로 검사하면 같은 규칙이 됩니다."""

    score = serializers.DecimalField(
        max_digits=4,
        decimal_places=2,
        error_messages={key: _SCORE_MESSAGE for key in (
            "invalid", "max_digits", "max_decimal_places", "max_whole_digits", "max_string_length", "null"
        )} | {"required": "별점을 선택해 주세요."},
    )
    comment = serializers.CharField(
        max_length=200, required=False, allow_blank=True, default="",
        error_messages={"max_length": "한마디는 200자까지 쓸 수 있어요."},
    )

    def validate_score(self, value):
        if value is None:
            return value
        if value not in SCORE_CHOICES:  # 4.3 처럼 0.5 단위가 아니면 (DB CHECK 도 거부)
            raise serializers.ValidationError(_SCORE_MESSAGE)
        return value.quantize(Decimal("0.1"))


class FeedbackSerializer(RatingInputSerializer):
    """7-2 {watched: true, score: 3.5, comment: ""} 또는 {watched: false}"""

    watched = serializers.BooleanField(required=False, allow_null=True, default=None)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["score"].required = False  # "아직 못 봤어요" 면 별점 없음
        self.fields["score"].allow_null = True

    def validate(self, attrs):
        watched = attrs.get("watched")
        if watched is False:
            return {"watched": False}
        if attrs.get("score") is None:  # 별점도 "못 봤어요" 도 안 고름 (PRD 7-2 5번)
            raise serializers.ValidationError({"score": ["별점을 선택해 주세요."]})
        return {"watched": True, "score": attrs["score"], "comment": attrs.get("comment", "")}
