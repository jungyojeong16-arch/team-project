"""
API 입력 검사 · 응답 모양

화면(프론트엔드)과 같은 규칙으로 검사합니다.
  - 이메일: 형식 + 중복 금지 (소문자로 저장)
  - 닉네임: 한글·영문·숫자·밑줄 2~12자 + 중복 금지
  - 비밀번호: 영문·숫자·특수문자 포함 8자 이상
"""
import re

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import AgeGroup, Genre, Job, Member, PreferenceKind

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


class MeSerializer(serializers.ModelSerializer):
    """내 정보 (프로필·헤더에서 사용)"""

    survey_completed = serializers.SerializerMethodField()
    liked_genres = serializers.SerializerMethodField()
    disliked_genres = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "id", "email", "nickname", "age_group", "job", "marketing_opt_in", "date_joined",
            "survey_completed", "survey_completed_at", "liked_genres", "disliked_genres",
        ]

    def get_survey_completed(self, member):
        return member.survey_completed_at is not None

    def _genres(self, member, kind):
        return [p.genre.name for p in member.genre_preferences.all() if p.kind == kind]

    def get_liked_genres(self, member):
        return self._genres(member, PreferenceKind.LIKE)

    def get_disliked_genres(self, member):
        return self._genres(member, PreferenceKind.DISLIKE)


class SurveySerializer(serializers.Serializer):
    """취향 설문 저장 — 연령대·직업은 회원 테이블, 장르는 장르 취향 테이블"""

    age_group = serializers.ChoiceField(choices=AgeGroup.choices, allow_null=True, required=False)
    job = serializers.ChoiceField(choices=Job.choices, allow_null=True, required=False)
    liked_genres = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    liked_all = serializers.BooleanField(required=False, default=False)  # "모든 장르가 좋아요"
    disliked_genres = serializers.ListField(child=serializers.CharField(), required=False, default=list)

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
