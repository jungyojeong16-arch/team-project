/**
 * ViewFit 공용 데이터 레이어 — 타입 / 상수 / 목업 / API 클라이언트 / 포맷터
 * 홈 · 플레이어 · 회원가입 · 온보딩 화면이 함께 사용한다. (app/ 안에 두어 Tailwind 클래스 스캔 대상에 포함)
 */

/* ============================================================================
 * 1. Domain Types — Django REST API 응답 스키마와 1:1 매핑 (snake_case 유지)
 * ========================================================================== */

export type PlatformCode = "NETFLIX" | "TVING" | "COUPANG_PLAY" | "WAVVE" | "DISNEY_PLUS" | "WATCHA";
/** 회원 연령대 (DB 기본값과 같음). 세대별 비교 화면은 AGE_GROUPS(20·30·40대)만 보여 줌 */
export type AgeGroup = "10s" | "20s" | "30s" | "40s" | "50s" | "60s+";
export type ContentType = "movie" | "series";
export type AgeRating = "ALL" | "7" | "12" | "15" | "19"; // 한국 관람 등급 (DB content.age_rating, D6)
export type TimeSlot = "morning" | "afternoon" | "evening" | "late_night";

export interface Platform {
  code: PlatformCode;
  name: string;
  watch_url: string;
}

export interface Genre {
  id: number; // TMDB genre id
  name: string;
}

export interface AgeGroupRating {
  age_group: AgeGroup;
  average: number; // 0.0 ~ 5.0
  count: number;
}

export interface Rating {
  overall: number; // 0.0 ~ 5.0
  total_count: number;
  by_age_group: AgeGroupRating[];
}

export interface Movie {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string;
  content_type: ContentType;
  overview: string;
  poster_url: string;
  backdrop_url: string;
  release_year: number;
  runtime: number | null; // 분 단위 (시리즈는 null)
  episode_count: number | null;
  age_rating: AgeRating | null; // 등급 정보가 없으면 null
  genres: Genre[];
  platforms: Platform[];
  rating: Rating;
}

export interface RankingItem {
  rank: number;
  rank_change: number; // 전일 대비 (+상승 / -하락 / 0 유지)
  is_new: boolean;
  movie: Movie;
}

export interface UserPersona {
  id: number;
  nickname: string;
  age_group: AgeGroup | null; // 설문에서 "응답 안 함"이면 null
  occupation: string;
}

export interface TPOContext {
  time_slot: TimeSlot;
  situation: string;
  mood_tags: string[];
}

export interface CurationMessage {
  headline: string; // NLP 생성 상황 멘트
  reason: string;
}

export interface HeroCuration {
  message: CurationMessage;
  movie: Movie;
}

export interface HomeFeed {
  user: UserPersona;
  tpo: TPOContext;
  hero: HeroCuration | null; // 작품 데이터가 하나도 없으면 null
  /** 회원 맞춤 추천작품 줄 (7-1 맞춤 추천 상위 10개) */
  recommendations?: Movie[];
  rankings: RankingItem[];
  cross_age_picks: Movie[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: { generated_at: string; version: string };
}

/* ============================================================================
 * 2. Constants & UI Tokens
 * ========================================================================== */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const AGE_GROUPS: AgeGroup[] = ["20s", "30s", "40s"];

export const PLATFORM_STYLES: Record<PlatformCode, { label: string; className: string }> = {
  NETFLIX: { label: "NETFLIX", className: "bg-[#E50914] text-white" },
  TVING: { label: "TVING", className: "bg-[#FF153C] text-white" },
  COUPANG_PLAY: { label: "쿠팡플레이", className: "bg-[#00A3E0] text-white" },
  WAVVE: { label: "wavve", className: "bg-[#1351F9] text-white" },
  DISNEY_PLUS: { label: "Disney+", className: "bg-[#0B1C5A] text-white ring-1 ring-inset ring-sky-300/50" },
  WATCHA: { label: "WATCHA", className: "bg-[#FF0558] text-white" },
};

export const AGE_GROUP_META: Record<AgeGroup, { label: string; barClass: string; textClass: string }> = {
  "10s": { label: "10대", barClass: "bg-gradient-to-r from-emerald-500 to-teal-400", textClass: "text-emerald-300" },
  "20s": { label: "20대", barClass: "bg-gradient-to-r from-fuchsia-500 to-pink-400", textClass: "text-fuchsia-300" },
  "30s": { label: "30대", barClass: "bg-gradient-to-r from-sky-500 to-cyan-400", textClass: "text-sky-300" },
  "40s": { label: "40대", barClass: "bg-gradient-to-r from-amber-500 to-yellow-300", textClass: "text-amber-300" },
  "50s": { label: "50대", barClass: "bg-gradient-to-r from-orange-500 to-red-400", textClass: "text-orange-300" },
  "60s+": { label: "60대 이상", barClass: "bg-gradient-to-r from-violet-500 to-purple-400", textClass: "text-violet-300" },
};

export const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  morning: "아침",
  afternoon: "오후",
  evening: "저녁",
  late_night: "늦은 밤",
};

export const SCROLLBAR_HIDE =
  "scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/* ============================================================================
 * 3. Mock Data — GET /api/v1/home/feed/ 응답 JSON 형태
 * ========================================================================== */

export const MOCK_PLATFORMS: Record<PlatformCode, Platform> = {
  NETFLIX: { code: "NETFLIX", name: "넷플릭스", watch_url: "https://www.netflix.com" },
  TVING: { code: "TVING", name: "티빙", watch_url: "https://www.tving.com" },
  COUPANG_PLAY: { code: "COUPANG_PLAY", name: "쿠팡플레이", watch_url: "https://www.coupangplay.com" },
  WAVVE: { code: "WAVVE", name: "웨이브", watch_url: "https://www.wavve.com" },
  DISNEY_PLUS: { code: "DISNEY_PLUS", name: "디즈니+", watch_url: "https://www.disneyplus.com" },
  WATCHA: { code: "WATCHA", name: "왓챠", watch_url: "https://watcha.com" },
};

export const MOCK_GENRES = {
  DRAMA: { id: 18, name: "드라마" },
  ROMANCE: { id: 10749, name: "로맨스" },
  THRILLER: { id: 53, name: "스릴러" },
  ACTION: { id: 28, name: "액션" },
  COMEDY: { id: 35, name: "코미디" },
  FANTASY: { id: 14, name: "판타지" },
  MYSTERY: { id: 9648, name: "미스터리" },
  HORROR: { id: 27, name: "공포" },
  REALITY: { id: 10764, name: "리얼리티" },
  HISTORY: { id: 36, name: "역사" },
} satisfies Record<string, Genre>;

// 예시 데이터는 Figma 처럼 사진 없이 색 배경 + 제목으로 보여 줍니다 (진짜 포스터는 2-1 TMDB 연결 후)
export const poster = (_seed: string) => "";
export const backdrop = (_seed: string) => "";

export const MOCK_MOVIES: Movie[] = [
  {
    id: 1,
    tmdb_id: 218230,
    title: "폭싹 속았수다",
    original_title: "When Life Gives You Tangerines",
    content_type: "series",
    overview:
      "제주에서 태어난 요망진 반항아 애순이와 팔불출 무쇠 관식이의 모험 가득한 일생을 사계절로 풀어낸 이야기. 웃다가 울다가, 결국엔 마음 한구석이 따뜻해지는 인생 드라마.",
    poster_url: poster("tangerines"),
    backdrop_url: backdrop("tangerines"),
    release_year: 2025,
    runtime: null,
    episode_count: 16,
    age_rating: "12",
    genres: [MOCK_GENRES.DRAMA, MOCK_GENRES.ROMANCE],
    platforms: [MOCK_PLATFORMS.NETFLIX],
    rating: {
      overall: 4.6,
      total_count: 182340,
      by_age_group: [
        { age_group: "20s", average: 4.5, count: 61230 },
        { age_group: "30s", average: 4.7, count: 70110 },
        { age_group: "40s", average: 4.8, count: 51000 },
      ],
    },
  },
  {
    id: 2,
    tmdb_id: 93405,
    title: "오징어 게임 시즌2",
    original_title: "Squid Game Season 2",
    content_type: "series",
    overview:
      "복수를 다짐하고 다시 돌아와 게임에 참가하는 기훈과 그를 맞이하는 프론트맨. 거액의 상금을 두고 다시 시작된 잔혹한 생존 게임.",
    poster_url: poster("squidgame2"),
    backdrop_url: backdrop("squidgame2"),
    release_year: 2024,
    runtime: null,
    episode_count: 7,
    age_rating: "19",
    genres: [MOCK_GENRES.THRILLER, MOCK_GENRES.DRAMA],
    platforms: [MOCK_PLATFORMS.NETFLIX],
    rating: {
      overall: 4.0,
      total_count: 240115,
      by_age_group: [
        { age_group: "20s", average: 4.3, count: 98200 },
        { age_group: "30s", average: 3.9, count: 84015 },
        { age_group: "40s", average: 3.7, count: 57900 },
      ],
    },
  },
  {
    id: 3,
    tmdb_id: 245703,
    title: "흑백요리사: 요리 계급 전쟁",
    original_title: "Culinary Class Wars",
    content_type: "series",
    overview:
      "맛 하나는 최고라 자부하는 재야의 고수 '흑수저' 셰프들이 대한민국 최고의 스타 셰프 '백수저'들에게 도전장을 내밀며 펼쳐지는 요리 계급 전쟁.",
    poster_url: poster("culinary"),
    backdrop_url: backdrop("culinary"),
    release_year: 2024,
    runtime: null,
    episode_count: 12,
    age_rating: "15",
    genres: [MOCK_GENRES.REALITY],
    platforms: [MOCK_PLATFORMS.NETFLIX],
    rating: {
      overall: 4.4,
      total_count: 156780,
      by_age_group: [
        { age_group: "20s", average: 4.6, count: 60210 },
        { age_group: "30s", average: 4.4, count: 55870 },
        { age_group: "40s", average: 4.1, count: 40700 },
      ],
    },
  },
  {
    id: 4,
    tmdb_id: 229672,
    title: "선재 업고 튀어",
    original_title: "Lovely Runner",
    content_type: "series",
    overview:
      "삶의 의지를 놓아버린 순간, 자신을 살게 해줬던 유명 아티스트 류선재. 그의 죽음으로 절망했던 열성팬 임솔이 최애를 살리기 위해 시간을 거슬러 2008년으로 돌아간다.",
    poster_url: poster("lovelyrunner"),
    backdrop_url: backdrop("lovelyrunner"),
    release_year: 2024,
    runtime: null,
    episode_count: 16,
    age_rating: "15",
    genres: [MOCK_GENRES.ROMANCE, MOCK_GENRES.FANTASY],
    platforms: [MOCK_PLATFORMS.TVING],
    rating: {
      overall: 4.5,
      total_count: 98450,
      by_age_group: [
        { age_group: "20s", average: 4.8, count: 52300 },
        { age_group: "30s", average: 4.4, count: 31150 },
        { age_group: "40s", average: 3.9, count: 15000 },
      ],
    },
  },
  {
    id: 5,
    tmdb_id: 203744,
    title: "무빙",
    original_title: "Moving",
    content_type: "series",
    overview:
      "초능력을 숨긴 채 현재를 살아가는 아이들과, 아픈 비밀을 숨긴 채 과거를 살아온 부모들이 시대와 세대를 넘어 거대한 위험에 함께 맞서는 초능력 액션 히어로물.",
    poster_url: poster("moving"),
    backdrop_url: backdrop("moving"),
    release_year: 2023,
    runtime: null,
    episode_count: 20,
    age_rating: "19",
    genres: [MOCK_GENRES.ACTION, MOCK_GENRES.FANTASY],
    platforms: [MOCK_PLATFORMS.DISNEY_PLUS],
    rating: {
      overall: 4.4,
      total_count: 87620,
      by_age_group: [
        { age_group: "20s", average: 4.2, count: 28100 },
        { age_group: "30s", average: 4.5, count: 33420 },
        { age_group: "40s", average: 4.6, count: 26100 },
      ],
    },
  },
  {
    id: 6,
    tmdb_id: 229415,
    title: "소년시대",
    original_title: "Boyhood",
    content_type: "series",
    overview:
      "1989년 충청남도, 안 맞고 사는 게 일생일대의 목표인 온양 찌질이 병태가 하루아침에 부여 짱으로 오해받으며 벌어지는 인생 역전 코믹 활극.",
    poster_url: poster("boyhood"),
    backdrop_url: backdrop("boyhood"),
    release_year: 2023,
    runtime: null,
    episode_count: 10,
    age_rating: "19",
    genres: [MOCK_GENRES.COMEDY, MOCK_GENRES.ACTION],
    platforms: [MOCK_PLATFORMS.COUPANG_PLAY],
    rating: {
      overall: 4.5,
      total_count: 45210,
      by_age_group: [
        { age_group: "20s", average: 4.6, count: 15400 },
        { age_group: "30s", average: 4.5, count: 17810 },
        { age_group: "40s", average: 4.4, count: 12000 },
      ],
    },
  },
  {
    id: 7,
    tmdb_id: 156484,
    title: "약한영웅 Class 1",
    original_title: "Weak Hero Class 1",
    content_type: "series",
    overview:
      "성적은 최상위권이지만 교실에선 존재감 없는 약한 소년 연시은. 폭력에 맞서 싸우기 시작한 그가 친구들과 함께 여러 부당한 상황에 맞서 나가는 처절한 생존기.",
    poster_url: poster("weakhero"),
    backdrop_url: backdrop("weakhero"),
    release_year: 2022,
    runtime: null,
    episode_count: 8,
    age_rating: "19",
    genres: [MOCK_GENRES.ACTION, MOCK_GENRES.DRAMA],
    platforms: [MOCK_PLATFORMS.WAVVE, MOCK_PLATFORMS.NETFLIX],
    rating: {
      overall: 4.3,
      total_count: 67230,
      by_age_group: [
        { age_group: "20s", average: 4.7, count: 34500 },
        { age_group: "30s", average: 4.2, count: 21730 },
        { age_group: "40s", average: 3.7, count: 11000 },
      ],
    },
  },
  {
    id: 8,
    tmdb_id: 838209,
    title: "파묘",
    original_title: "Exhuma",
    content_type: "movie",
    overview:
      "미국 LA, 거액의 의뢰를 받은 무당 화림과 봉길은 기이한 병이 대물림되는 집안의 장손을 만난다. 조상의 묫자리가 화근임을 알아챈 화림은 파묘를 권하는데…",
    poster_url: poster("exhuma"),
    backdrop_url: backdrop("exhuma"),
    release_year: 2024,
    runtime: 134,
    episode_count: null,
    age_rating: "15",
    genres: [MOCK_GENRES.MYSTERY, MOCK_GENRES.HORROR],
    platforms: [MOCK_PLATFORMS.TVING, MOCK_PLATFORMS.WAVVE, MOCK_PLATFORMS.COUPANG_PLAY],
    rating: {
      overall: 4.0,
      total_count: 132980,
      by_age_group: [
        { age_group: "20s", average: 3.9, count: 48200 },
        { age_group: "30s", average: 4.1, count: 49780 },
        { age_group: "40s", average: 4.1, count: 35000 },
      ],
    },
  },
  {
    id: 9,
    tmdb_id: 222269,
    title: "눈물의 여왕",
    original_title: "Queen of Tears",
    content_type: "series",
    overview:
      "퀸즈 그룹 재벌 3세이자 백화점의 여왕 홍해인과 용두리 이장 아들이자 슈퍼마켓 왕자 백현우, 3년 차 부부의 아찔한 위기와 기적처럼 다시 시작되는 사랑 이야기.",
    poster_url: poster("queenoftears"),
    backdrop_url: backdrop("queenoftears"),
    release_year: 2024,
    runtime: null,
    episode_count: 16,
    age_rating: "15",
    genres: [MOCK_GENRES.ROMANCE, MOCK_GENRES.COMEDY],
    platforms: [MOCK_PLATFORMS.TVING, MOCK_PLATFORMS.NETFLIX],
    rating: {
      overall: 4.2,
      total_count: 121400,
      by_age_group: [
        { age_group: "20s", average: 4.0, count: 39800 },
        { age_group: "30s", average: 4.3, count: 45600 },
        { age_group: "40s", average: 4.4, count: 36000 },
      ],
    },
  },
  {
    id: 10,
    tmdb_id: 135340,
    title: "시맨틱 에러",
    original_title: "Semantic Error",
    content_type: "series",
    overview:
      "융통성 제로, 원칙주의 공대생 추상우와 자유로운 영혼의 디자인과 스타 장재영. 서로의 인생에 '에러'가 되어버린 두 사람의 캠퍼스 로맨스.",
    poster_url: poster("semanticerror"),
    backdrop_url: backdrop("semanticerror"),
    release_year: 2022,
    runtime: null,
    episode_count: 8,
    age_rating: "15",
    genres: [MOCK_GENRES.ROMANCE, MOCK_GENRES.COMEDY],
    platforms: [MOCK_PLATFORMS.WATCHA],
    rating: {
      overall: 4.2,
      total_count: 38900,
      by_age_group: [
        { age_group: "20s", average: 4.6, count: 22100 },
        { age_group: "30s", average: 4.0, count: 11800 },
        { age_group: "40s", average: 3.5, count: 5000 },
      ],
    },
  },
  {
    id: 11,
    tmdb_id: 919207,
    title: "서울의 봄",
    original_title: "12.12: The Day",
    content_type: "movie",
    overview:
      "1979년 12월 12일, 수도 서울 군사반란 발생. 그날, 대한민국의 운명이 바뀌었다. 대한민국을 뒤흔든 반란군과 진압군 사이, 일촉즉발의 9시간.",
    poster_url: poster("theday"),
    backdrop_url: backdrop("theday"),
    release_year: 2023,
    runtime: 141,
    episode_count: null,
    age_rating: "12",
    genres: [MOCK_GENRES.HISTORY, MOCK_GENRES.DRAMA],
    platforms: [MOCK_PLATFORMS.NETFLIX, MOCK_PLATFORMS.WATCHA],
    rating: {
      overall: 4.4,
      total_count: 176500,
      by_age_group: [
        { age_group: "20s", average: 4.2, count: 51200 },
        { age_group: "30s", average: 4.4, count: 63300 },
        { age_group: "40s", average: 4.7, count: 62000 },
      ],
    },
  },
  {
    id: 12,
    tmdb_id: 241554,
    title: "하이퍼나이프",
    original_title: "Hyper Knife",
    content_type: "series",
    overview:
      "과거 촉망받는 천재 의사였던 세옥이 자신을 나락으로 떨어뜨린 스승 덕희와 재회하며 펼쳐지는 치열하고 광기 어린 메디컬 스릴러.",
    poster_url: poster("hyperknife"),
    backdrop_url: backdrop("hyperknife"),
    release_year: 2025,
    runtime: null,
    episode_count: 8,
    age_rating: "19",
    genres: [MOCK_GENRES.THRILLER, MOCK_GENRES.DRAMA],
    platforms: [MOCK_PLATFORMS.DISNEY_PLUS],
    rating: {
      overall: 3.9,
      total_count: 29870,
      by_age_group: [
        { age_group: "20s", average: 4.0, count: 10200 },
        { age_group: "30s", average: 3.9, count: 11670 },
        { age_group: "40s", average: 3.6, count: 8000 },
      ],
    },
  },
];

export const movieById = (id: number): Movie => {
  const movie = MOCK_MOVIES.find((m) => m.id === id);
  if (!movie) throw new Error(`Mock movie not found: ${id}`);
  return movie;
};

export const MOCK_HOME_FEED_RESPONSE: ApiResponse<HomeFeed> = {
  success: true,
  meta: { generated_at: "2026-09-25T21:30:00+09:00", version: "v1" },
  data: {
    user: { id: 1024, nickname: "정준교", age_group: "20s", occupation: "대학생" },
    tpo: {
      time_slot: "evening",
      situation: "과제 끝난 금요일 밤",
      mood_tags: ["#맥주한잔", "#힐링", "#정주행각"],
    },
    hero: {
      message: {
        headline: "과제 후 맥주 한잔하며 보기 좋은 신작",
        reason: "오늘 밤 비슷한 취향의 20대 3,241명이 선택했어요",
      },
      movie: movieById(1),
    },
    rankings: [
      { rank: 1, rank_change: 0, is_new: false, movie: movieById(1) },
      { rank: 2, rank_change: 2, is_new: false, movie: movieById(3) },
      { rank: 3, rank_change: -1, is_new: false, movie: movieById(2) },
      { rank: 4, rank_change: 0, is_new: true, movie: movieById(12) },
      { rank: 5, rank_change: -2, is_new: false, movie: movieById(4) },
      { rank: 6, rank_change: 3, is_new: false, movie: movieById(9) },
      { rank: 7, rank_change: 1, is_new: false, movie: movieById(5) },
      { rank: 8, rank_change: -3, is_new: false, movie: movieById(8) },
      { rank: 9, rank_change: 0, is_new: true, movie: movieById(6) },
      { rank: 10, rank_change: -1, is_new: false, movie: movieById(7) },
    ],
    recommendations: [1, 2, 4, 6, 8, 10, 12, 3, 5, 7].map(movieById),
    cross_age_picks: [11, 5, 1, 8, 4, 10, 7, 9, 6, 2, 3, 12].map(movieById),
  },
};

/* ============================================================================
 * 4. API Layer — NEXT_PUBLIC_API_BASE_URL 설정 시 Django API 호출, 미설정 시 Mock
 * ========================================================================== */

/** 로그인했으면 Authorization 헤더 (토큰 키는 account.ts 의 TOKEN_KEY 와 같음) — 홈 피드가 내 취향을 반영하게 */
export function authHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem("viewfit.token");
    const token = raw ? (JSON.parse(raw) as string) : null;
    return token ? { Authorization: `Token ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * 로그인 토큰을 붙여 GET. 토큰이 만료·삭제돼 401 이 오면 (예: DB 를 새로 만듦)
 * 저장된 로그인 정보를 지우고(→ 화면이 웹 시작 화면으로 바뀜, PRD 1-2 5번) 토큰 없이 한 번 더 요청합니다.
 * (account.ts 가 이 파일을 불러오므로 여기서는 같은 저장소 키·신호 이름을 직접 씁니다)
 */
export async function getWithLogin(url: string, signal?: AbortSignal): Promise<Response> {
  const auth = authHeader();
  const res = await fetch(url, { signal, headers: { Accept: "application/json", ...auth } });
  if (res.status !== 401 || !auth.Authorization) return res;
  try {
    localStorage.removeItem("viewfit.token");
    localStorage.removeItem("viewfit.account");
    window.dispatchEvent(new Event("viewfit:auth"));
  } catch {
    /* 무시 */
  }
  return fetch(url, { signal, headers: { Accept: "application/json" } });
}

/**
 * 0-4 홈 피드. 실패하면 오류를 던져 화면이 "오류 안내 + [다시 시도]"를 보여 줌 — 샘플 데이터로 대신하지 않음 (PRD 0-4 5번)
 * 샘플 데이터는 백엔드 주소(.env.local 의 NEXT_PUBLIC_API_BASE_URL)가 아예 없을 때의 화면 미리보기용으로만 씀
 */
export async function fetchHomeFeed(signal?: AbortSignal): Promise<HomeFeed> {
  if (API_BASE_URL) {
    const res = await getWithLogin(`${API_BASE_URL}/api/v1/home/feed/`, signal).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      throw new Error("서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.");
    });
    if (!res.ok) throw new Error(`홈 화면을 불러오지 못했어요. (HTTP ${res.status})`);
    const json = (await res.json().catch(() => null)) as ApiResponse<HomeFeed> | null;
    if (!json?.success) throw new Error("홈 화면 응답이 올바르지 않아요. 잠시 뒤 다시 시도해 주세요.");
    return json.data;
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
  return MOCK_HOME_FEED_RESPONSE.data;
}

/* ============================================================================
 * 5. Utils
 * ========================================================================== */

export const getAgeAverage = (movie: Movie, age: AgeGroup) =>
  movie.rating.by_age_group.find((r) => r.age_group === age)?.average ?? 0;

export const formatCount = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString("ko-KR"));

/** 상영 시간 · 회차 — 모르면 빈 문자열 (D6 칸이 생기기 전) */
export const formatDuration = (movie: Movie) =>
  movie.content_type === "movie" && movie.runtime
    ? `${Math.floor(movie.runtime / 60)}시간 ${movie.runtime % 60}분`
    : movie.content_type === "series" && movie.episode_count
      ? `${movie.episode_count}부작`
      : "";

export const formatAgeRating = (rating: AgeRating | null) => (!rating ? "" : rating === "ALL" ? "ALL" : `${rating}+`);

/** 4-1 [바로 보기] 시청 기록 (watch_history source=direct). 로그인 안 했거나 백엔드가 없으면 조용히 건너뜀 */
export async function recordWatch(contentId: number, platform: PlatformCode): Promise<void> {
  const auth = authHeader();
  if (!API_BASE_URL || !auth.Authorization) return;
  await fetch(`${API_BASE_URL}/api/v1/contents/${contentId}/watch/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ platform }),
  }).catch(() => undefined);
}

/** 작품 검색 결과 한 줄 (GET /api/v1/contents/search/?q=) — 3-1 설문·4-1 검색창에서 사용 */
export interface ContentBrief {
  id: number;
  title: string;
  content_type: ContentType;
  release_year: number | null;
  poster_url: string;
  genres: string[];
  platforms: PlatformCode[];
}

export const SEARCH_MIN_LENGTH = 2;

/** 제목으로 작품 찾기 (2글자 이상, 최대 20개). 백엔드가 없으면 샘플 작품에서 찾음 */
export async function searchContents(query: string, signal?: AbortSignal): Promise<ContentBrief[]> {
  const q = query.trim();
  if (q.length < SEARCH_MIN_LENGTH) return [];
  if (API_BASE_URL) {
    const res = await fetch(`${API_BASE_URL}/api/v1/contents/search/?q=${encodeURIComponent(q)}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`작품을 찾지 못했어요. (HTTP ${res.status})`);
    return res.json();
  }
  return MOCK_MOVIES.filter((m) => m.title.includes(q))
    .slice(0, 20)
    .map((m) => ({
      id: m.id,
      title: m.title,
      content_type: m.content_type,
      release_year: m.release_year,
      poster_url: m.poster_url,
      genres: m.genres.map((g) => g.name),
      platforms: m.platforms.map((p) => p.code),
    }));
}

/* ============================================================================
 * 7-1 맞춤 추천 — GET /api/v1/recommendations/ (로그인 + 취향 설문 필요)
 * ========================================================================== */

/** "전체 상황" 이면 tpo 를 보내지 않음 */
export const ALL_SITUATIONS = "전체 상황";

export interface RecommendationItem {
  rank: number;
  /** 이 추천의 상황 이름 (전체 상황이면 작품에 연결된 첫 상황, 없으면 null) */
  tpo: string | null;
  /** 카드 위 분홍 글씨 — 예: "늦은 밤 · 혼자" */
  situation_label: string;
  /** 한 줄 이유 — 예: "혼자 보는 밤에 어울리는 스릴러 한 편" */
  reason: string;
  content: Movie;
}

export interface RecommendationList {
  tpo: string;
  recommended_at: string | null;
  count: number;
  offset: number;
  limit: number;
  next_offset: number | null;
  results: RecommendationItem[];
}

export interface RecommendationQuery {
  tpo?: string | null;
  type?: ContentType | "all";
  platform?: PlatformCode | null;
  genre?: string | null;
  offset?: number;
  limit?: number;
}

/** 서버 오류 + HTTP 상태 (401 → 로그인 창, 403 → 설문으로) */
export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function fetchRecommendations(query: RecommendationQuery = {}, signal?: AbortSignal): Promise<RecommendationList> {
  const { tpo, type = "all", platform, genre, offset = 0, limit = 50 } = query;
  if (!API_BASE_URL) return mockRecommendations(query);

  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (tpo && tpo !== ALL_SITUATIONS) params.set("tpo", tpo);
  if (type !== "all") params.set("type", type);
  if (platform) params.set("platform", platform);
  if (genre) params.set("genre", genre);

  if (!authHeader().Authorization) throw new RequestError("로그인이 필요해요.", 401);
  // 토큰이 DB에 없으면(401) getWithLogin 이 로그인 정보를 지움 → 화면은 로그인 안내로 바뀜 (홈과 같은 처리, 1-2)
  const res = await getWithLogin(`${API_BASE_URL}/api/v1/recommendations/?${params}`, signal).catch((e: unknown) => {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new RequestError("서버에 연결할 수 없어요. 백엔드 서버가 켜져 있는지 확인해 주세요.", 0);
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = Object.values(data as Record<string, unknown>)[0];
    const message = (data as { detail?: string }).detail ?? (Array.isArray(first) ? String(first[0]) : `추천을 불러오지 못했어요. (HTTP ${res.status})`);
    throw new RequestError(message, res.status);
  }
  return data as RecommendationList;
}

/** 백엔드 없이 화면만 볼 때 — 샘플 작품을 문장 틀과 함께 */
function mockRecommendations({ tpo, type = "all", platform, genre, offset = 0, limit = 50 }: RecommendationQuery): RecommendationList {
  const rows = MOCK_MOVIES.filter(
    (m) =>
      (type === "all" || m.content_type === type) &&
      (!platform || m.platforms.some((p) => p.code === platform)) &&
      (!genre || m.genres.some((g) => g.name === genre)),
  );
  const situation = tpo && tpo !== ALL_SITUATIONS ? tpo : null;
  return {
    tpo: situation ?? ALL_SITUATIONS,
    recommended_at: null,
    count: rows.length,
    offset,
    limit,
    next_offset: offset + limit < rows.length ? offset + limit : null,
    results: rows.slice(offset, offset + limit).map((m, i) => ({
      rank: offset + i + 1,
      tpo: situation,
      situation_label: situation ?? "언제든 · 가볍게",
      reason: `${situation ? `${situation}에 어울리는` : "지금 보기 좋은"} ${m.genres[0]?.name ?? "작품"} 한 편`,
      content: m,
    })),
  };
}

export async function fetchContent(id: number, signal?: AbortSignal): Promise<Movie> {
  if (API_BASE_URL) {
    const res = await getWithLogin(`${API_BASE_URL}/api/v1/contents/${id}/`, signal).catch(() => null);
    // TODO(11/17 주): 작품 API 를 만들면 이 404 대체 처리를 지우기
    if (res && res.status !== 404) {
      if (!res.ok) throw new Error(`콘텐츠를 불러오지 못했습니다. (HTTP ${res.status})`);
      return res.json();
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  const movie = MOCK_MOVIES.find((m) => m.id === id);
  if (!movie) throw new Error("존재하지 않는 콘텐츠입니다.");
  return movie;
}
