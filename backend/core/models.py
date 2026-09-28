from decimal import Decimal

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
    RegexValidator,
)
from django.db import models
from django.db.models import Avg, Count, Q


# =============================================================================
# Choices
# =============================================================================


class AgeGroup(models.TextChoices):
    TEENS = "10s", "10대"
    TWENTIES = "20s", "20대"
    THIRTIES = "30s", "30대"
    FORTIES = "40s", "40대"
    FIFTIES_PLUS = "50s+", "50대 이상"


class Occupation(models.TextChoices):
    STUDENT = "student", "중·고등학생"
    UNIVERSITY_STUDENT = "university_student", "대학생"
    JOB_SEEKER = "job_seeker", "취업준비생"
    OFFICE_WORKER = "office_worker", "직장인"
    FREELANCER = "freelancer", "프리랜서"
    SELF_EMPLOYED = "self_employed", "자영업자"
    HOMEMAKER = "homemaker", "주부"
    OTHER = "other", "기타"


class MediaType(models.TextChoices):
    MOVIE = "movie", "영화"
    SERIES = "series", "시리즈"


# =============================================================================
# Validators
# =============================================================================

SCORE_MIN = Decimal("0.0")
SCORE_MAX = Decimal("5.0")
SCORE_STEP = Decimal("0.5")
ALLOWED_SCORES = [SCORE_STEP * i for i in range(int(SCORE_MAX / SCORE_STEP) + 1)]  # 0.0, 0.5, ..., 5.0

hex_color_validator = RegexValidator(
    regex=r"^#[0-9A-Fa-f]{6}$",
    message="HEX 컬러코드는 #RRGGBB 형식이어야 합니다.",
)


def validate_half_step(value: Decimal) -> None:
    if (Decimal(value) % SCORE_STEP) != 0:
        raise ValidationError("평점은 0.5 단위로만 입력할 수 있습니다.")


# =============================================================================
# Base
# =============================================================================


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# =============================================================================
# 1. User
# =============================================================================


class User(AbstractUser):
    nickname = models.CharField("닉네임", max_length=30, blank=True)
    age_group = models.CharField(
        "연령대",
        max_length=4,
        choices=AgeGroup.choices,
        blank=True,
        db_index=True,
    )
    occupation = models.CharField(
        "직업",
        max_length=20,
        choices=Occupation.choices,
        blank=True,
        db_index=True,
    )

    class Meta:
        verbose_name = "사용자"
        verbose_name_plural = "사용자 목록"

    def __str__(self) -> str:
        return self.nickname or self.username

    @property
    def persona_label(self) -> str:
        """TPO 환영 멘트용 페르소나 라벨 (예: '20대 대학생 정준교')"""
        parts = [
            self.get_age_group_display() if self.age_group else "",
            self.get_occupation_display() if self.occupation else "",
            str(self),
        ]
        return " ".join(p for p in parts if p)


# =============================================================================
# 2. Platform
# =============================================================================


class Platform(models.Model):
    name = models.CharField("플랫폼명", max_length=50, unique=True)
    code = models.SlugField("플랫폼 코드", max_length=30, unique=True, help_text="예: netflix, tving")
    color_code = models.CharField(
        "브랜드 컬러",
        max_length=7,
        validators=[hex_color_validator],
        help_text="예: #E50914",
    )
    homepage_url = models.URLField("홈페이지", blank=True)

    class Meta:
        verbose_name = "OTT 플랫폼"
        verbose_name_plural = "OTT 플랫폼 목록"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


# =============================================================================
# 3. Genre
# =============================================================================


class Genre(models.Model):
    name = models.CharField("장르명", max_length=50)
    tmdb_id = models.PositiveIntegerField("TMDB 장르 ID", unique=True)

    class Meta:
        verbose_name = "장르"
        verbose_name_plural = "장르 목록"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


# =============================================================================
# 4. Content
# =============================================================================


def _round(value) -> float | None:
    return round(float(value), 1) if value is not None else None


class ContentQuerySet(models.QuerySet):
    def with_rating_stats(self):
        """목록/랭킹 API용: 전체 및 세대별 평균 평점을 단일 쿼리로 annotate"""
        annotations = {
            "avg_score": Avg("ratings__score"),
            "rating_count": Count("ratings"),
        }
        for value, _ in AgeGroup.choices:
            key = value.replace("+", "_plus")
            annotations[f"avg_score_{key}"] = Avg("ratings__score", filter=Q(ratings__age_group=value))
        return self.annotate(**annotations)


class Content(TimeStampedModel):
    content_type = models.CharField("콘텐츠 유형", max_length=10, choices=MediaType.choices, default=MediaType.MOVIE)
    title = models.CharField("제목", max_length=255, db_index=True)
    original_title = models.CharField("원제", max_length=255, blank=True)
    tmdb_id = models.PositiveIntegerField("TMDB ID")
    overview = models.TextField("줄거리", blank=True)
    poster_url = models.URLField("포스터 URL", max_length=500, blank=True)
    backdrop_url = models.URLField("배경 이미지 URL", max_length=500, blank=True)
    release_year = models.PositiveSmallIntegerField(
        "개봉 연도",
        null=True,
        blank=True,
        validators=[MinValueValidator(1888), MaxValueValidator(2100)],
        db_index=True,
    )

    platforms = models.ManyToManyField(
        Platform,
        through="ContentPlatform",
        related_name="contents",
        blank=True,
        verbose_name="제공 플랫폼",
    )
    genres = models.ManyToManyField(
        Genre,
        related_name="contents",
        blank=True,
        verbose_name="장르",
    )

    objects = ContentQuerySet.as_manager()

    class Meta:
        verbose_name = "콘텐츠"
        verbose_name_plural = "콘텐츠 목록"
        ordering = ["-release_year", "title"]
        constraints = [
            # TMDB는 movie / tv ID 공간이 분리되어 있으므로 (tmdb_id, content_type) 복합 유니크
            models.UniqueConstraint(fields=["tmdb_id", "content_type"], name="uniq_content_tmdb_id_type"),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.release_year or '미정'})"

    # --- 평점 통계 ---------------------------------------------------------------

    @property
    def average_rating(self) -> float | None:
        """전체 평균 평점 (with_rating_stats()로 annotate된 경우 추가 쿼리 없음)"""
        if hasattr(self, "avg_score"):
            return _round(self.avg_score)
        return _round(self.ratings.aggregate(avg=Avg("score"))["avg"])

    @property
    def rating_total_count(self) -> int:
        if hasattr(self, "rating_count"):
            return self.rating_count
        return self.ratings.count()

    def get_age_group_average(self, age_group: str) -> float | None:
        """특정 세대의 평균 평점 (예: content.get_age_group_average(AgeGroup.TWENTIES))"""
        if age_group not in AgeGroup.values:
            raise ValueError(f"지원하지 않는 연령대입니다: {age_group}")
        annotated = f"avg_score_{age_group.replace('+', '_plus')}"
        if hasattr(self, annotated):
            return _round(getattr(self, annotated))
        return _round(self.ratings.filter(age_group=age_group).aggregate(avg=Avg("score"))["avg"])

    def get_age_group_ratings(self) -> list[dict]:
        """세대별 교차 평점 전체 (단일 GROUP BY 쿼리) — 프론트 by_age_group 스키마와 동일"""
        rows = {
            row["age_group"]: row
            for row in self.ratings.exclude(age_group="")
            .values("age_group")
            .annotate(average=Avg("score"), count=Count("id"))
        }
        return [
            {
                "age_group": value,
                "label": label,
                "average": _round(rows[value]["average"]) if value in rows else None,
                "count": rows[value]["count"] if value in rows else 0,
            }
            for value, label in AgeGroup.choices
        ]


class ContentPlatform(TimeStampedModel):
    """Content ↔ Platform N:M 매핑 (OTT 크롤링 ETL 적재 대상)"""

    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name="platform_links")
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE, related_name="content_links")
    watch_url = models.URLField("시청 URL", max_length=500, blank=True)
    is_available = models.BooleanField("현재 제공 여부", default=True)

    class Meta:
        verbose_name = "콘텐츠-플랫폼 매핑"
        verbose_name_plural = "콘텐츠-플랫폼 매핑 목록"
        unique_together = ("content", "platform")

    def __str__(self) -> str:
        return f"{self.content.title} @ {self.platform.name}"


# =============================================================================
# 5. Rating
# =============================================================================


class Rating(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    content = models.ForeignKey(
        Content,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    score = models.DecimalField(
        "평점",
        max_digits=2,
        decimal_places=1,
        validators=[
            MinValueValidator(SCORE_MIN),
            MaxValueValidator(SCORE_MAX),
            validate_half_step,
        ],
    )
    # 평가 시점의 연령대 스냅샷 — 유저 연령대가 바뀌어도 세대별 통계가 왜곡되지 않도록 보존
    age_group = models.CharField(
        "평가 시점 연령대",
        max_length=4,
        choices=AgeGroup.choices,
        blank=True,
        editable=False,
        db_index=True,
    )

    class Meta:
        verbose_name = "평점"
        verbose_name_plural = "평점 목록"
        unique_together = ("user", "content")
        indexes = [
            models.Index(fields=["content", "age_group"], name="idx_rating_content_age"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(score__in=ALLOWED_SCORES),
                name="chk_rating_score_half_step_0_to_5",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.content.title}: {self.score}"

    def save(self, *args, **kwargs):
        if not self.age_group:
            self.age_group = getattr(self.user, "age_group", "") or ""
        super().save(*args, **kwargs)
