/* ============================================================================
 * 0-2 공통 규칙 — 화면 전체가 같이 쓰는 이름 목록
 * DB 기본 데이터(backend/core/migrations/0002_seed_basics.py)와 이름을 똑같이 맞춥니다.
 * ========================================================================== */

import type { PlatformCode } from "./viewfit";

/** 상단 메뉴 (Figma 통합 랭킹 144:6422 Header) */
export const NAV_LINKS = [
  { href: "/ranking", label: "통합 랭킹" },
  { href: "/recommend", label: "맞춤 추천" },
  { href: "/generation", label: "세대별 랭킹" },
] as const;

/** 프로필 메뉴 (Figma 40:1850) */
export const PROFILE_LINKS = {
  profile: "/profile",
  likes: "/me/likes",
  ratings: "/me/ratings",
  taste: "/me/taste",
} as const;

/** 장르 12개 — DB genre 테이블과 같은 이름·순서 */
export const GENRE_NAMES = [
  "드라마",
  "로맨스",
  "코미디",
  "액션",
  "스릴러",
  "미스터리",
  "SF",
  "판타지",
  "공포",
  "다큐멘터리",
  "애니메이션",
  "예능",
] as const;
export type GenreName = (typeof GENRE_NAMES)[number];

/** OTT 6개 — Figma 필터 줄 순서 (144:6528) */
export const PLATFORM_ORDER: PlatformCode[] = ["NETFLIX", "TVING", "DISNEY_PLUS", "WATCHA", "COUPANG_PLAY", "WAVVE"];

/** 상황(TPO) 5개 — DB tpo 테이블과 같은 이름 */
export const TPO_NAMES = ["혼자 보는 밤", "퇴근 후", "주말에 함께", "가족과 함께", "여행이 필요할 때"] as const;

/** 작품 유형 */
export const CONTENT_TYPE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "movie", label: "영화" },
  { value: "series", label: "시리즈" },
] as const;
export type ContentTypeFilter = (typeof CONTENT_TYPE_OPTIONS)[number]["value"];
