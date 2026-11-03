"""
기본 데이터 넣기 (python manage.py migrate 할 때 자동 실행)

  - 장르 12개: 취향 설문 화면의 장르 버튼과 같음
  - OTT 플랫폼 6개: 화면의 OTT 뱃지와 같음
  - TPO(상황) 5개: Figma "맞춤 추천" 화면의 상황 버튼과 같음
"""
from django.db import migrations

# (장르명, TMDB 장르 번호) — 예능은 TMDB TV 장르 "Reality"(10764)
GENRES = [
    ("드라마", 18),
    ("로맨스", 10749),
    ("코미디", 35),
    ("액션", 28),
    ("스릴러", 53),
    ("미스터리", 9648),
    ("SF", 878),
    ("판타지", 14),
    ("공포", 27),
    ("다큐멘터리", 99),
    ("애니메이션", 16),
    ("예능", 10764),
]

PLATFORMS = [
    ("NETFLIX", "넷플릭스"),
    ("TVING", "티빙"),
    ("COUPANG_PLAY", "쿠팡플레이"),
    ("WAVVE", "웨이브"),
    ("DISNEY_PLUS", "디즈니+"),
    ("WATCHA", "왓챠"),
]

TPOS = ["혼자 보는 밤", "퇴근 후", "주말에 함께", "가족과 함께", "여행이 필요할 때"]


def seed(apps, schema_editor):
    Genre = apps.get_model("core", "Genre")
    Platform = apps.get_model("core", "Platform")
    Tpo = apps.get_model("core", "Tpo")
    for name, tmdb_id in GENRES:
        Genre.objects.get_or_create(name=name, defaults={"tmdb_id": tmdb_id})
    for code, name in PLATFORMS:
        Platform.objects.get_or_create(code=code, defaults={"name": name})
    for name in TPOS:
        Tpo.objects.get_or_create(name=name)


def unseed(apps, schema_editor):
    apps.get_model("core", "Genre").objects.filter(name__in=[n for n, _ in GENRES]).delete()
    apps.get_model("core", "Platform").objects.filter(code__in=[c for c, _ in PLATFORMS]).delete()
    apps.get_model("core", "Tpo").objects.filter(name__in=TPOS).delete()


class Migration(migrations.Migration):
    dependencies = [("core", "0001_initial")]
    operations = [migrations.RunPython(seed, unseed)]
