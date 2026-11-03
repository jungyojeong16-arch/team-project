"""
API (이번 주: 서버 동작 확인용 2개)

  GET /api/v1/health/   서버와 DB 가 잘 연결됐는지, 테이블별 행 개수
  GET /api/v1/options/  취향 설문 화면에 쓸 선택지 (연령대, 직업, 장르, OTT, 상황)

회원가입·로그인·설문 저장 API 는 다음 주에 추가합니다.
"""
from django.db import connection
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import models as m


@api_view(["GET"])
def health(request):
    tables = {
        model._meta.db_table: model.objects.count()
        for model in [
            m.Member, m.Genre, m.Platform, m.Tpo, m.Content, m.Ranking,
            m.Rating, m.ContentLike, m.WatchHistory, m.Recommendation,
            m.GenrePreference, m.ContentGenre, m.ContentPlatform, m.ContentTpo,
        ]
    }
    return Response({"status": "ok", "database": connection.vendor, "tables": tables})


@api_view(["GET"])
def options(request):
    def choices(enum):
        return [{"value": value, "label": label} for value, label in enum.choices]

    return Response(
        {
            "age_groups": choices(m.AgeGroup),
            "jobs": choices(m.Job),
            "genres": list(m.Genre.objects.values("id", "name")),
            "platforms": list(m.Platform.objects.values("id", "code", "name")),
            "tpos": list(m.Tpo.objects.values("id", "name")),
        }
    )
