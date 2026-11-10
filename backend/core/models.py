"""
ViewFit 물리 설계 (Django 모델)

최종 개념 ERD(docs/erd/ViewFit_ERD_midterm_final.drawio)를 실제 테이블로 옮긴 것입니다.
  - 엔터티 6개: 회원, 작품, 장르, OTT 플랫폼, TPO(상황), 랭킹
  - N:M 관계 8개 → 연결 테이블 8개
  = 테이블 14개 (설명: docs/erd/ViewFit_ERD_physical.md)

Django 규칙
  - 모든 테이블은 번호(id, 자동 증가)를 기본키로 둡니다.
  - "같은 조합은 한 번만" 이 필요한 연결 테이블은 UniqueConstraint 로 막습니다.
    (번호 PK + 두 외래키 중복 금지 = 복합 기본키와 같은 효과)
"""
from decimal import Decimal

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


# =============================================================================
# 선택지 (화면의 버튼 목록과 맞춤)
# =============================================================================


class AgeGroup(models.TextChoices):
    TEENS = "10s", "10대"
    TWENTIES = "20s", "20대"
    THIRTIES = "30s", "30대"
    FORTIES = "40s", "40대"
    FIFTIES = "50s", "50대"
    SIXTIES_PLUS = "60s+", "60대 이상"


class Job(models.TextChoices):
    STUDENT = "student", "학생"
    OFFICE = "office", "직장인"
    FREELANCE = "freelance", "자영업·프리랜서"
    HOME = "home", "가사·돌봄"
    SEEKING = "seeking", "구직·휴직 중"
    ETC = "etc", "기타"


class ContentType(models.TextChoices):
    MOVIE = "movie", "영화"
    SERIES = "series", "시리즈"


class PreferenceKind(models.TextChoices):
    LIKE = "like", "선호"
    DISLIKE = "dislike", "비선호"


class WatchSource(models.TextChoices):
    SURVEY = "survey", "취향 설문에서 입력"
    DIRECT = "direct", "직접 기록"


class RecommendationFeedback(models.TextChoices):
    PENDING = "pending", "응답 전"
    RATED = "rated", "평가함"
    NOT_WATCHED = "not_watched", "아직 못 봤어요"


class RankingPeriod(models.TextChoices):
    WEEKLY = "weekly", "주간"
    MONTHLY = "monthly", "월간"


# 별점은 0.5 단위 (0.5, 1.0, ..., 5.0)
SCORE_CHOICES = [Decimal(n) / 2 for n in range(1, 11)]


# =============================================================================
# 엔터티 6개
# =============================================================================


class MemberManager(BaseUserManager):
    def create_user(self, email, nickname, password=None, **extra):
        if not email:
            raise ValueError("이메일은 꼭 입력해야 합니다.")
        member = self.model(email=self.normalize_email(email), nickname=nickname, **extra)
        member.set_password(password)  # 비밀번호는 암호화(해시)해서 저장
        member.save(using=self._db)
        return member

    def create_superuser(self, email, nickname, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, nickname, password, **extra)


class Member(AbstractBaseUser, PermissionsMixin):
    """회원 — ERD: 아이디(PK), 이메일, 비밀번호, 연령대, 직업, 가입일"""

    # id(회원번호)는 Django 가 자동으로 만듭니다. 로그인 아이디는 이메일을 씁니다.
    email = models.EmailField("이메일", max_length=254, unique=True)
    nickname = models.CharField("닉네임", max_length=12, unique=True)
    # password 칸은 AbstractBaseUser 에 이미 들어 있습니다 (암호화 저장).
    age_group = models.CharField("연령대", max_length=5, choices=AgeGroup.choices, null=True, blank=True)
    job = models.CharField("직업", max_length=10, choices=Job.choices, null=True, blank=True)
    marketing_opt_in = models.BooleanField("마케팅 수신 동의", default=False)
    terms_agreed_at = models.DateTimeField("약관 동의 일시", null=True, blank=True)
    # 비어 있으면 아직 취향 설문을 안 한 회원 → 로그인 후 설문 화면으로 보냄
    survey_completed_at = models.DateTimeField("설문 완료 일시", null=True, blank=True)
    date_joined = models.DateTimeField("가입일", default=timezone.now)
    is_active = models.BooleanField("활성 계정", default=True)
    is_staff = models.BooleanField("관리자 페이지 접근", default=False)

    objects = MemberManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nickname"]

    class Meta:
        db_table = "member"
        verbose_name = verbose_name_plural = "회원"

    def __str__(self):
        return f"{self.nickname} ({self.email})"


class Genre(models.Model):
    """장르 — ERD: 장르 번호(PK), 장르명"""

    name = models.CharField("장르명", max_length=30, unique=True)
    tmdb_id = models.PositiveIntegerField("TMDB 장르 번호", unique=True, null=True, blank=True)

    class Meta:
        db_table = "genre"
        ordering = ["id"]
        verbose_name = verbose_name_plural = "장르"

    def __str__(self):
        return self.name


class Platform(models.Model):
    """OTT 플랫폼 — ERD: 플랫폼 번호(PK), 플랫폼명"""

    code = models.CharField("코드", max_length=20, unique=True)  # 화면에서 쓰는 이름 (예: NETFLIX)
    name = models.CharField("플랫폼명", max_length=30, unique=True)

    class Meta:
        db_table = "ott_platform"
        ordering = ["id"]
        verbose_name = verbose_name_plural = "OTT 플랫폼"

    def __str__(self):
        return self.name


class Tpo(models.Model):
    """TPO(상황) — ERD: TPO 번호(PK), 상황명"""

    name = models.CharField("상황명", max_length=30, unique=True)

    class Meta:
        db_table = "tpo"
        ordering = ["id"]
        verbose_name = verbose_name_plural = "TPO(상황)"

    def __str__(self):
        return self.name


class Content(models.Model):
    """작품 — ERD: 작품 번호(PK), 제목, 작품유형, 줄거리, 포스터, 공개연도"""

    tmdb_id = models.PositiveIntegerField("TMDB 작품 번호", null=True, blank=True)
    title = models.CharField("제목", max_length=255)
    content_type = models.CharField("작품유형", max_length=10, choices=ContentType.choices)
    overview = models.TextField("줄거리", blank=True)
    poster_url = models.URLField("포스터 주소", max_length=500, blank=True)
    release_year = models.PositiveSmallIntegerField("공개연도", null=True, blank=True)
    tagline = models.CharField("한 줄 큐레이션", max_length=100, blank=True)

    genres = models.ManyToManyField(Genre, through="ContentGenre", related_name="contents", verbose_name="장르")
    platforms = models.ManyToManyField(
        Platform, through="ContentPlatform", related_name="contents", verbose_name="제공 OTT"
    )
    tpos = models.ManyToManyField(Tpo, through="ContentTpo", related_name="contents", verbose_name="어울리는 상황")

    class Meta:
        db_table = "content"
        verbose_name = verbose_name_plural = "작품"
        constraints = [
            # TMDB 는 영화와 시리즈 번호가 따로라서 (번호 + 유형) 조합으로 중복을 막습니다.
            models.UniqueConstraint(fields=["tmdb_id", "content_type"], name="uq_content_tmdb"),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_content_type_display()})"


class Ranking(models.Model):
    """랭킹 — ERD: 랭킹 번호(PK), 순위, 작품 번호(FK) / 작품 1 : N 랭킹"""

    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name="rankings", verbose_name="작품")
    period = models.CharField("집계 기간", max_length=10, choices=RankingPeriod.choices, default=RankingPeriod.WEEKLY)
    ranked_on = models.DateField("집계일")
    rank = models.PositiveSmallIntegerField("순위", validators=[MinValueValidator(1)])

    class Meta:
        db_table = "ranking"
        ordering = ["-ranked_on", "period", "rank"]
        verbose_name = verbose_name_plural = "랭킹"
        constraints = [
            # 같은 날·같은 기간 랭킹에서 순위와 작품은 각각 한 번만
            models.UniqueConstraint(fields=["period", "ranked_on", "rank"], name="uq_ranking_rank"),
            models.UniqueConstraint(fields=["period", "ranked_on", "content"], name="uq_ranking_content"),
        ]

    def __str__(self):
        return f"{self.ranked_on} {self.get_period_display()} {self.rank}위 - {self.content.title}"


# =============================================================================
# 회원 – 작품 사이의 N:M 관계 4개
# =============================================================================


class Rating(models.Model):
    """평가한다 → 평점 — 별점, 후기, 평가일시, 평가 당시 연령대"""

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="ratings", verbose_name="회원")
    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name="ratings", verbose_name="작품")
    score = models.DecimalField(
        "별점",
        max_digits=2,
        decimal_places=1,
        validators=[MinValueValidator(Decimal("0.5")), MaxValueValidator(Decimal("5.0"))],
    )
    comment = models.CharField("후기", max_length=200, blank=True)
    # 회원의 연령대는 시간이 지나면 바뀌므로, 세대별 랭킹을 위해 "평가할 때의" 연령대를 따로 저장
    age_group_at_rating = models.CharField(
        "평가 당시 연령대", max_length=5, choices=AgeGroup.choices, null=True, blank=True
    )
    rated_at = models.DateTimeField("평가일시", auto_now_add=True)
    updated_at = models.DateTimeField("수정일시", auto_now=True)

    class Meta:
        db_table = "rating"
        verbose_name = verbose_name_plural = "평점"
        constraints = [
            # 한 회원은 한 작품에 평점을 하나만 (다시 평가하면 수정)
            models.UniqueConstraint(fields=["member", "content"], name="uq_rating_member_content"),
            models.CheckConstraint(condition=models.Q(score__in=SCORE_CHOICES), name="ck_rating_score_half_step"),
        ]

    def save(self, *args, **kwargs):
        if self._state.adding and not self.age_group_at_rating:
            self.age_group_at_rating = self.member.age_group
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.member.nickname} → {self.content.title}: {self.score}"


class ContentLike(models.Model):
    """좋아요 — 좋아요 일시"""

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="likes", verbose_name="회원")
    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name="likes", verbose_name="작품")
    liked_at = models.DateTimeField("좋아요 일시", auto_now_add=True)

    class Meta:
        db_table = "content_like"
        verbose_name = verbose_name_plural = "좋아요"
        constraints = [models.UniqueConstraint(fields=["member", "content"], name="uq_like_member_content")]

    def __str__(self):
        return f"{self.member.nickname} ♥ {self.content.title}"


class WatchHistory(models.Model):
    """시청한다 → 시청 이력 — 시청 일시

    같은 작품을 여러 번 볼 수 있으므로 (회원, 작품) 중복을 막지 않습니다.
    """

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="watch_histories", verbose_name="회원")
    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name="watch_histories", verbose_name="작품")
    source = models.CharField("입력 경로", max_length=10, choices=WatchSource.choices, default=WatchSource.DIRECT)
    watched_at = models.DateTimeField("시청 일시", default=timezone.now)

    class Meta:
        db_table = "watch_history"
        ordering = ["-watched_at"]
        verbose_name = verbose_name_plural = "시청 이력"
        indexes = [models.Index(fields=["member", "-watched_at"], name="ix_watch_member_time")]

    def __str__(self):
        return f"{self.member.nickname} ▶ {self.content.title}"


class Recommendation(models.Model):
    """AI에게 추천 받는다 → 추천 — 추천일시, 추천 순위, 피드백 상태

    같은 작품이 날마다 다시 추천될 수 있으므로 (회원, 작품) 중복을 막지 않습니다.
    TPO 추천일 때는 어떤 상황에서 추천했는지(tpo)도 남깁니다.
    """

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="recommendations", verbose_name="회원")
    content = models.ForeignKey(Content, on_delete=models.CASCADE, related_name="recommendations", verbose_name="작품")
    tpo = models.ForeignKey(
        Tpo, on_delete=models.SET_NULL, null=True, blank=True, related_name="recommendations", verbose_name="추천 상황"
    )
    rank = models.PositiveSmallIntegerField("추천 순위", validators=[MinValueValidator(1)])
    feedback = models.CharField(
        "피드백 상태", max_length=12, choices=RecommendationFeedback.choices, default=RecommendationFeedback.PENDING
    )
    recommended_at = models.DateTimeField("추천일시", auto_now_add=True)

    class Meta:
        db_table = "recommendation"
        ordering = ["-recommended_at", "rank"]
        verbose_name = verbose_name_plural = "AI 추천"
        indexes = [models.Index(fields=["member", "-recommended_at"], name="ix_rec_member_time")]

    def __str__(self):
        return f"{self.member.nickname} ← {self.rank}위 {self.content.title}"


# =============================================================================
# 나머지 N:M 관계 4개
# =============================================================================


class GenrePreference(models.Model):
    """선호한다 → 장르 취향 — 회원 N : M 장르, 취향 구분(선호/비선호)"""

    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name="genre_preferences", verbose_name="회원")
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE, related_name="preferences", verbose_name="장르")
    kind = models.CharField("취향 구분", max_length=10, choices=PreferenceKind.choices)

    class Meta:
        db_table = "genre_preference"
        verbose_name = verbose_name_plural = "장르 취향"
        # 한 장르를 선호와 비선호에 동시에 넣을 수 없게
        constraints = [models.UniqueConstraint(fields=["member", "genre"], name="uq_pref_member_genre")]

    def __str__(self):
        return f"{self.member.nickname}: {self.genre.name} {self.get_kind_display()}"


class ContentGenre(models.Model):
    """속한다 → 작품 장르 — 작품 N : M 장르"""

    content = models.ForeignKey(Content, on_delete=models.CASCADE, verbose_name="작품")
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE, verbose_name="장르")

    class Meta:
        db_table = "content_genre"
        verbose_name = verbose_name_plural = "작품 장르"
        constraints = [models.UniqueConstraint(fields=["content", "genre"], name="uq_content_genre")]


class ContentPlatform(models.Model):
    """제공된다 → 작품 제공 OTT — 작품 N : M OTT, 딥링크 주소"""

    content = models.ForeignKey(Content, on_delete=models.CASCADE, verbose_name="작품")
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE, verbose_name="OTT 플랫폼")
    deeplink_url = models.URLField("딥링크 주소", max_length=500, blank=True)

    class Meta:
        db_table = "content_platform"
        verbose_name = verbose_name_plural = "작품 제공 OTT"
        constraints = [models.UniqueConstraint(fields=["content", "platform"], name="uq_content_platform")]


class ContentTpo(models.Model):
    """TPO 추천(어울린다) → 작품 TPO — 작품 N : M TPO"""

    content = models.ForeignKey(Content, on_delete=models.CASCADE, verbose_name="작품")
    tpo = models.ForeignKey(Tpo, on_delete=models.CASCADE, verbose_name="TPO(상황)")

    class Meta:
        db_table = "content_tpo"
        verbose_name = verbose_name_plural = "작품 TPO"
        constraints = [models.UniqueConstraint(fields=["content", "tpo"], name="uq_content_tpo")]
