"""
2-1 TMDB 연결 모듈 — TMDB API 를 부르는 함수와, TMDB 정보를 ViewFit 값으로 바꾸는 규칙

  - 키: backend/.env 의 TMDB_API_TOKEN (TMDB "API Read Access Token")
  - 실패하면 3번까지 다시 시도, 요청 사이 0.25초 쉬기 (TMDB 사용량 제한)
  - 추가 패키지 없이 Python 기본 urllib 로 호출

규칙 표: docs/prd/2-1_tmdb_import.md 의 "장르 연결", "상황(TPO) 규칙"
"""
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

BASE_URL = "https://api.themoviedb.org/3"
POSTER_BASE = "https://image.tmdb.org/t/p/w500"
REQUEST_PAUSE = 0.25  # 요청 사이 쉬는 시간(초)
RETRIES = 3

# ViewFit 작품유형 → TMDB 주소 이름
TMDB_KIND = {"movie": "movie", "series": "tv"}


class TmdbError(Exception):
    """TMDB 요청이 3번 모두 실패했거나 키가 없을 때"""


class MissingToken(TmdbError):
    pass


# =============================================================================
# 1. TMDB 부르기
# =============================================================================


def _token():
    token = getattr(settings, "TMDB_API_TOKEN", "")
    if not token:
        raise MissingToken("backend/.env 에 TMDB_API_TOKEN 을 넣어 주세요.")
    return token


def get(path, **params):
    """TMDB GET 요청 → JSON. 실패하면 3번까지 다시 시도."""
    token = _token()
    url = f"{BASE_URL}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    last_error = None
    for attempt in range(1, RETRIES + 1):
        time.sleep(REQUEST_PAUSE)
        try:
            with urllib.request.urlopen(request, timeout=15) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise TmdbError("TMDB 키가 올바르지 않아요. backend/.env 의 TMDB_API_TOKEN 을 확인해 주세요.") from e
            if e.code == 404:
                raise TmdbError(f"TMDB 에 없는 주소예요: {path}") from e
            last_error = e
            if e.code == 429:  # 사용량 제한 → 조금 더 쉬기
                time.sleep(2 * attempt)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_error = e
            time.sleep(attempt)
    raise TmdbError(f"TMDB 요청 실패 ({RETRIES}번 시도): {path} — {last_error}")


def discover(content_type, page=1):
    """한국(KR)에서 구독형 OTT 로 볼 수 있는 인기 작품 한 페이지(20개)"""
    return get(
        f"/discover/{TMDB_KIND[content_type]}",
        language="ko-KR",
        watch_region="KR",
        with_watch_monetization_types="flatrate",
        sort_by="popularity.desc",
        include_adult="false",
        page=page,
    )


def details(content_type, tmdb_id):
    """작품 상세 + KR 제공처 + 관람 등급 (+ 시리즈는 키워드) 를 요청 1번으로"""
    extra = "watch/providers,release_dates" if content_type == "movie" else "watch/providers,content_ratings,keywords"
    return get(f"/{TMDB_KIND[content_type]}/{tmdb_id}", language="ko-KR", append_to_response=extra)


def genre_list(content_type):
    """TMDB 장르 목록 (확인용)"""
    return get(f"/genre/{TMDB_KIND[content_type]}/list", language="ko-KR")["genres"]


# =============================================================================
# 2. TMDB 정보 → ViewFit 값
# =============================================================================

# TMDB 장르 번호 → ViewFit 장르 이름 (PRD "장르 연결" 표). TMDB 장르 번호는 고정값입니다.
MOVIE_GENRES = {
    18: ["드라마"], 10749: ["로맨스"], 35: ["코미디"], 28: ["액션"], 12: ["액션"],
    53: ["스릴러"], 80: ["스릴러"], 9648: ["미스터리"], 878: ["SF"], 14: ["판타지"],
    27: ["공포"], 99: ["다큐멘터리"], 16: ["애니메이션"],
}
SERIES_GENRES = {
    18: ["드라마"], 35: ["코미디"], 10759: ["액션"], 80: ["스릴러"], 9648: ["미스터리"],
    10765: ["SF", "판타지"], 99: ["다큐멘터리"], 16: ["애니메이션"], 10764: ["예능"], 10767: ["예능"],
}

# TMDB 제공처 이름(소문자·기호 제거) 앞부분 → ViewFit OTT 코드
PROVIDERS = [
    ("netflix", "NETFLIX"),
    ("tving", "TVING"),
    ("coupangplay", "COUPANG_PLAY"),
    ("wavve", "WAVVE"),
    ("disneyplus", "DISNEY_PLUS"),
    ("watcha", "WATCHA"),
]

# 각 OTT 의 작품 검색 주소 (FR5 — OTT 들이 작품별 공식 주소를 공개하지 않아 검색 결과로 이동)
SEARCH_URLS = {
    "NETFLIX": "https://www.netflix.com/search?q={q}",
    "TVING": "https://www.tving.com/search?keyword={q}",
    "COUPANG_PLAY": "https://www.coupangplay.com/search?keyword={q}",
    "WAVVE": "https://www.wavve.com/search?searchWord={q}",
    "DISNEY_PLUS": "https://www.disneyplus.com/search?q={q}",
    "WATCHA": "https://watcha.com/search?query={q}",
}

# 상황(TPO) 규칙 (PRD "상황(TPO) 규칙" 표 — 추천 품질을 보며 조정)
TPO_RULES = {
    "혼자 보는 밤": {"스릴러", "미스터리", "공포", "SF"},
    "퇴근 후": {"코미디", "예능", "애니메이션", "로맨스"},
    "주말에 함께": {"액션", "판타지", "SF", "코미디"},
    "가족과 함께": {"애니메이션", "다큐멘터리"},  # + 코미디는 관람등급 12세 이하만 (아래 함수)
    "여행이 필요할 때": {"다큐멘터리", "드라마", "로맨스"},
}
FAMILY_MAX_AGE = 12


def _normalize(name):
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def map_genres(content_type, data):
    """TMDB 상세 → ViewFit 장르 이름 집합"""
    table = MOVIE_GENRES if content_type == "movie" else SERIES_GENRES
    names = set()
    for g in data.get("genres", []):
        names.update(table.get(g.get("id"), []))
    # 시리즈에는 TMDB 로맨스 장르가 없어서 키워드 "romance" 가 붙은 것만 로맨스로
    if content_type == "series":
        keywords = (data.get("keywords") or {}).get("results", [])
        if any("romance" in (k.get("name") or "").lower() for k in keywords):
            names.add("로맨스")
    return names


def map_platforms(data):
    """TMDB 상세의 KR 제공처 → ViewFit OTT 코드 집합 (6개 OTT 만)"""
    kr = ((data.get("watch/providers") or {}).get("results") or {}).get("KR") or {}
    codes = set()
    for kind in ("flatrate", "ads", "free"):
        for p in kr.get(kind, []):
            name = _normalize(p.get("provider_name"))
            for prefix, code in PROVIDERS:
                if name.startswith(prefix):
                    codes.add(code)
    return codes


def deeplink(code, title):
    return SEARCH_URLS[code].format(q=urllib.parse.quote(title))


def korean_age(content_type, data):
    """KR 관람 등급 → 나이 숫자 (전체관람가 0). 모르면 None"""
    if content_type == "movie":
        for r in (data.get("release_dates") or {}).get("results", []):
            if r.get("iso_3166_1") == "KR":
                certs = [d.get("certification") for d in r.get("release_dates", []) if d.get("certification")]
                return _age_number(certs[0]) if certs else None
    else:
        for r in (data.get("content_ratings") or {}).get("results", []):
            if r.get("iso_3166_1") == "KR":
                return _age_number(r.get("rating"))
    return None


def _age_number(cert):
    cert = (cert or "").strip()
    if not cert:
        return None
    if cert.upper() in {"ALL", "G"} or "전체" in cert:
        return 0
    if "청소년" in cert:
        return 19
    digits = re.match(r"\d+", cert)
    return int(digits.group()) if digits else None


def map_tpos(genres, age):
    """ViewFit 장르 + 관람 나이 → 어울리는 상황 이름 집합"""
    tpos = {name for name, rule in TPO_RULES.items() if genres & rule}
    if "코미디" in genres and age is not None and age <= FAMILY_MAX_AGE:
        tpos.add("가족과 함께")
    return tpos


def to_content_fields(content_type, data):
    """TMDB 상세 → content 테이블 칸"""
    date = data.get("release_date") if content_type == "movie" else data.get("first_air_date")
    year = int(date[:4]) if date and date[:4].isdigit() else None
    poster = data.get("poster_path")
    title = data.get("title") if content_type == "movie" else data.get("name")
    return {
        "title": (title or data.get("original_title") or data.get("original_name") or "")[:255],
        "overview": data.get("overview") or "",
        "poster_url": f"{POSTER_BASE}{poster}" if poster else "",
        "release_year": year,
    }
