"""
7-1 한 줄 큐레이션 — 추천 이유 문구 (PRD FR6)

D10 (11/19): 지금은 LLM 없이 문장 틀만 씁니다.
    "{상황}에 어울리는 {장르} 한 편"      예) 혼자 보는 밤에 어울리는 스릴러 한 편
    (상황, 장르) 짝 고르기 — pick_situation_genre()
    - 상황 규칙(2-1 TPO_RULES)에서 서로 맞는 짝만: 스릴러 ↔ 혼자 보는 밤, 코미디 ↔ 퇴근 후 …
    - 회원 선호 장르가 들어간 짝 먼저 → 전체 상황이면 지금까지 덜 쓴 상황 먼저 (여러 상황이 고루 섞이게)
    - 맞는 짝이 없으면 연결된 첫 상황 + 선호(또는 첫) 장르, 연결된 상황이 없으면 "지금 보기 좋은 {장르} 한 편"

LLM 을 붙일 때 (D10 다시 결정하면)
    make_reason() 안에서 LLM 을 부르고, 키가 없거나 실패하면 지금 문장 틀로 돌아오게 합니다.
    같은 (작품, 상황) 문구는 recommendation.reason(D9) 에서 찾아 다시 씁니다 (PRD 5번 규칙 — 비용 절약).

카드에 보이는 상황 라벨("늦은 밤 · 혼자")과 문장 틀의 상황 표현도 여기 한곳에 모아 둡니다.
"""
from .tmdb import TPO_RULES

ALL_SITUATIONS = "전체 상황"

# 상황 → 어울리는 장르 (2-1 상황 규칙. 가족과 함께의 코미디는 12세 이하 작품만 연결되므로, 연결된 작품이면 짝이 됨)
SITUATION_GENRES = {name: set(genres) for name, genres in TPO_RULES.items()}
SITUATION_GENRES["가족과 함께"] = SITUATION_GENRES.get("가족과 함께", set()) | {"코미디"}

# 상황 → 작품 카드 위 분홍 글씨 (Figma 144:36577 예: "늦은 밤 · 혼자", "주말 · 집에서 둘이")
SITUATION_LABELS = {
    "혼자 보는 밤": "늦은 밤 · 혼자",
    "퇴근 후": "평일 저녁 · 퇴근 후",
    "주말에 함께": "주말 · 집에서 둘이",
    "가족과 함께": "거실 · 온 가족과",
    "여행이 필요할 때": "떠나고 싶은 날 · 화면 여행",
}
NO_SITUATION_LABEL = "언제든 · 가볍게"

# 문장 틀 앞부분 — 상황 이름마다 자연스러운 말로 ("주말에 함께에 어울리는" 이 되지 않게)
SITUATION_PHRASES = {
    "혼자 보는 밤": "혼자 보는 밤에 어울리는",
    "퇴근 후": "퇴근 후에 어울리는",
    "주말에 함께": "주말에 함께 보기 좋은",
    "가족과 함께": "가족과 함께 보기 좋은",
    "여행이 필요할 때": "여행이 필요할 때 어울리는",
}
NO_SITUATION_PHRASE = "지금 보기 좋은"


def situation_label(situation):
    """상황 이름(없으면 None) → 카드 라벨"""
    if not situation:
        return NO_SITUATION_LABEL
    return SITUATION_LABELS.get(situation, situation)


def pick_situation_genre(genre_names, situations, liked_genre_names=(), used=None):
    """작품 장르 이름 목록 + 작품과 연결된 상황 이름 목록 → (상황 이름 또는 None, 장르 이름)

    used: 지금까지 고른 상황별 횟수 (전체 상황 묶음에서 상황이 고루 섞이게). 없으면 순서대로.
    """
    used = used or {}
    pairs = [
        ((genre not in liked_genre_names, used.get(situation, 0), s_index, g_index), situation, genre)
        for s_index, situation in enumerate(situations)
        for g_index, genre in enumerate(genre_names)
        if genre in SITUATION_GENRES.get(situation, ())
    ]
    if pairs:
        _, situation, genre = min(pairs)
        return situation, genre
    genre = next((g for g in genre_names if g in liked_genre_names), genre_names[0] if genre_names else "작품")
    return (situations[0] if situations else None), genre


def make_reason(situation, genre):
    """(상황 이름 또는 None, 장르 이름) → 한 줄 (20자 안팎)"""
    phrase = SITUATION_PHRASES.get(situation, f"{situation}에 어울리는" if situation else NO_SITUATION_PHRASE)
    return f"{phrase} {genre} 한 편"
