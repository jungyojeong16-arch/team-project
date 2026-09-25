"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Flame,
  Info,
  Minus,
  Play,
  Search,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

/* ============================================================================
 * 1. Domain Types — Django REST API 응답 스키마와 1:1 매핑 (snake_case 유지)
 * ========================================================================== */

type PlatformCode = "NETFLIX" | "TVING" | "COUPANG_PLAY" | "WAVVE" | "DISNEY_PLUS" | "WATCHA";
type AgeGroup = "20s" | "30s" | "40s";
type ContentType = "movie" | "series";
type AgeRating = "ALL" | "12" | "15" | "19";
type TimeSlot = "morning" | "afternoon" | "evening" | "late_night";

interface Platform {
  code: PlatformCode;
  name: string;
  watch_url: string;
}

interface Genre {
  id: number; // TMDB genre id
  name: string;
}

interface AgeGroupRating {
  age_group: AgeGroup;
  average: number; // 0.0 ~ 5.0
  count: number;
}

interface Rating {
  overall: number; // 0.0 ~ 5.0
  total_count: number;
  by_age_group: AgeGroupRating[];
}

interface Movie {
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
  age_rating: AgeRating;
  genres: Genre[];
  platforms: Platform[];
  rating: Rating;
}

interface RankingItem {
  rank: number;
  rank_change: number; // 전일 대비 (+상승 / -하락 / 0 유지)
  is_new: boolean;
  movie: Movie;
}

interface UserPersona {
  id: number;
  nickname: string;
  age_group: AgeGroup;
  occupation: string;
}

interface TPOContext {
  time_slot: TimeSlot;
  situation: string;
  mood_tags: string[];
}

interface CurationMessage {
  headline: string; // NLP 생성 상황 멘트
  reason: string;
}

interface HeroCuration {
  message: CurationMessage;
  movie: Movie;
}

interface HomeFeed {
  user: UserPersona;
  tpo: TPOContext;
  hero: HeroCuration;
  rankings: RankingItem[];
  cross_age_picks: Movie[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: { generated_at: string; version: string };
}

/* ============================================================================
 * 2. Constants & UI Tokens
 * ========================================================================== */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const AGE_GROUPS: AgeGroup[] = ["20s", "30s", "40s"];

const PLATFORM_STYLES: Record<PlatformCode, { label: string; className: string }> = {
  NETFLIX: { label: "NETFLIX", className: "bg-[#E50914] text-white" },
  TVING: { label: "TVING", className: "bg-[#FF153C] text-white" },
  COUPANG_PLAY: { label: "쿠팡플레이", className: "bg-[#00A3E0] text-white" },
  WAVVE: { label: "wavve", className: "bg-[#1351F9] text-white" },
  DISNEY_PLUS: { label: "Disney+", className: "bg-[#0B1C5A] text-white ring-1 ring-inset ring-sky-300/50" },
  WATCHA: { label: "WATCHA", className: "bg-[#FF0558] text-white" },
};

const AGE_GROUP_META: Record<AgeGroup, { label: string; barClass: string; textClass: string }> = {
  "20s": { label: "20대", barClass: "bg-gradient-to-r from-fuchsia-500 to-pink-400", textClass: "text-fuchsia-300" },
  "30s": { label: "30대", barClass: "bg-gradient-to-r from-sky-500 to-cyan-400", textClass: "text-sky-300" },
  "40s": { label: "40대", barClass: "bg-gradient-to-r from-amber-500 to-yellow-300", textClass: "text-amber-300" },
};

const TIME_SLOT_LABEL: Record<TimeSlot, string> = {
  morning: "아침",
  afternoon: "오후",
  evening: "저녁",
  late_night: "늦은 밤",
};

const NAV_ITEMS = ["홈", "통합 랭킹", "세대별 평점", "TPO 추천", "보관함"];

const SCROLLBAR_HIDE =
  "scrollbar-hide [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/* ============================================================================
 * 3. Mock Data — GET /api/v1/home/feed/ 응답 JSON 형태
 * ========================================================================== */

const MOCK_PLATFORMS: Record<PlatformCode, Platform> = {
  NETFLIX: { code: "NETFLIX", name: "넷플릭스", watch_url: "https://www.netflix.com" },
  TVING: { code: "TVING", name: "티빙", watch_url: "https://www.tving.com" },
  COUPANG_PLAY: { code: "COUPANG_PLAY", name: "쿠팡플레이", watch_url: "https://www.coupangplay.com" },
  WAVVE: { code: "WAVVE", name: "웨이브", watch_url: "https://www.wavve.com" },
  DISNEY_PLUS: { code: "DISNEY_PLUS", name: "디즈니+", watch_url: "https://www.disneyplus.com" },
  WATCHA: { code: "WATCHA", name: "왓챠", watch_url: "https://watcha.com" },
};

const MOCK_GENRES = {
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

const poster = (seed: string) => `https://picsum.photos/seed/viewfit-${seed}/500/750`;
const backdrop = (seed: string) => `https://picsum.photos/seed/viewfit-${seed}-bd/1920/1080`;

const MOCK_MOVIES: Movie[] = [
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

const movieById = (id: number): Movie => {
  const movie = MOCK_MOVIES.find((m) => m.id === id);
  if (!movie) throw new Error(`Mock movie not found: ${id}`);
  return movie;
};

const MOCK_HOME_FEED_RESPONSE: ApiResponse<HomeFeed> = {
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
    cross_age_picks: [11, 5, 1, 8, 4, 10, 7, 9, 6, 2, 3, 12].map(movieById),
  },
};

/* ============================================================================
 * 4. API Layer — NEXT_PUBLIC_API_BASE_URL 설정 시 Django API 호출, 미설정 시 Mock
 * ========================================================================== */

async function fetchHomeFeed(signal?: AbortSignal): Promise<HomeFeed> {
  if (API_BASE_URL) {
    const res = await fetch(`${API_BASE_URL}/api/v1/home/feed/`, {
      signal,
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`홈 피드를 불러오지 못했습니다. (HTTP ${res.status})`);
    const json: ApiResponse<HomeFeed> = await res.json();
    if (!json.success) throw new Error("홈 피드 응답이 올바르지 않습니다.");
    return json.data;
  }
  await new Promise((resolve) => setTimeout(resolve, 450));
  return MOCK_HOME_FEED_RESPONSE.data;
}

function useHomeFeed() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchHomeFeed(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setFeed(data);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  return { feed, error, retry };
}

/* ============================================================================
 * 5. Utils
 * ========================================================================== */

const getAgeAverage = (movie: Movie, age: AgeGroup) =>
  movie.rating.by_age_group.find((r) => r.age_group === age)?.average ?? 0;

const formatCount = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString("ko-KR"));

const formatDuration = (movie: Movie) =>
  movie.content_type === "movie" && movie.runtime
    ? `${Math.floor(movie.runtime / 60)}시간 ${movie.runtime % 60}분`
    : movie.episode_count
      ? `${movie.episode_count}부작`
      : "시리즈";

const formatAgeRating = (rating: AgeRating) => (rating === "ALL" ? "ALL" : `${rating}+`);

/* ============================================================================
 * 6. UI Components
 * ========================================================================== */

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-white/5 bg-[#0a0a0a]/70 shadow-lg shadow-black/40 backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 md:px-12">
        <div className="flex items-center gap-8 lg:gap-10">
          <Link href="/" className="text-2xl font-black tracking-tight" aria-label="ViewFit 홈">
            <span className="bg-gradient-to-r from-fuchsia-500 to-rose-500 bg-clip-text text-transparent">View</span>
            <span className="text-white">Fit</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV_ITEMS.map((item, i) => (
              <a
                key={item}
                href="#"
                className={`transition-colors ${i === 0 ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}
              >
                {item}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <button
            type="button"
            aria-label="검색"
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="알림"
            className="relative rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0a0a0a]" />
          </button>
          <button
            type="button"
            aria-label="프로필"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 to-indigo-600 ring-1 ring-white/20 transition hover:ring-white/60"
          >
            <User className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PlatformBadge({ code, size = "sm" }: { code: PlatformCode; size?: "sm" | "md" }) {
  const style = PLATFORM_STYLES[code];
  return (
    <span
      className={`inline-flex items-center rounded font-black tracking-wide shadow-md shadow-black/40 ${
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      } ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function HeroSection({ hero, user, tpo }: { hero: HeroCuration; user: UserPersona; tpo: TPOContext }) {
  const { movie, message } = hero;
  const primaryPlatform = movie.platforms[0];

  return (
    <section className="relative h-[85vh] min-h-[580px] w-full overflow-hidden">
      <img src={movie.backdrop_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-black/40" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1920px] flex-col justify-end px-4 pb-28 md:px-12 md:pb-40">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
            {TIME_SLOT_LABEL[tpo.time_slot]} · {tpo.situation}
          </div>

          <p className="text-lg font-semibold leading-snug text-white/90 md:text-2xl">
            <span className="text-fuchsia-300">
              {AGE_GROUP_META[user.age_group].label} {user.occupation} {user.nickname}님,
            </span>
            <br />
            {message.headline}
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight drop-shadow-2xl md:text-6xl">{movie.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/70">
            <span className="flex items-center gap-1 font-bold text-yellow-400">
              <Star className="h-4 w-4 fill-yellow-400" />
              {movie.rating.overall.toFixed(1)}
              <span className="font-normal text-white/50">({formatCount(movie.rating.total_count)}명)</span>
            </span>
            <span>{movie.release_year}</span>
            <span className="rounded border border-white/40 px-1.5 text-xs">{formatAgeRating(movie.age_rating)}</span>
            <span>{formatDuration(movie)}</span>
            <span>{movie.genres.map((g) => g.name).join(" · ")}</span>
            <span className="flex gap-1">
              {movie.platforms.map((p) => (
                <PlatformBadge key={p.code} code={p.code} />
              ))}
            </span>
          </div>

          <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            {movie.overview}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tpo.mood_tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 backdrop-blur">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={primaryPlatform?.watch_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2.5 text-base font-bold text-black transition hover:bg-white/80 md:px-8 md:py-3"
            >
              <Play className="h-5 w-5 fill-black" />
              바로 보기
            </a>
            <Link
              href={`/contents/${movie.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-white/20 px-6 py-2.5 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/30 md:px-8 md:py-3"
            >
              <Info className="h-5 w-5" />
              상세 정보
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/50">{message.reason}</p>
        </div>
      </div>
    </section>
  );
}

function ContentRow({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows]);

  const scroll = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/row relative">
      <div className="mx-auto flex max-w-[1920px] items-end justify-between px-4 md:px-12">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold md:text-2xl">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-xs text-white/50 md:text-sm">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center text-xs font-medium text-white/50 transition hover:text-white md:text-sm"
        >
          전체보기
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mx-auto max-w-[1920px]">
        <button
          type="button"
          aria-label="이전"
          onClick={() => scroll(-1)}
          className={`absolute inset-y-0 left-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-r from-[#0a0a0a] to-transparent text-white opacity-0 transition-opacity duration-300 md:flex ${
            canPrev ? "group-hover/row:opacity-100" : "pointer-events-none"
          }`}
        >
          <ChevronLeft className="h-9 w-9 drop-shadow-lg transition hover:scale-125" />
        </button>

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className={`${SCROLLBAR_HIDE} flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 py-5 md:scroll-px-12 md:gap-4 md:px-12`}
        >
          {children}
        </div>

        <button
          type="button"
          aria-label="다음"
          onClick={() => scroll(1)}
          className={`absolute inset-y-0 right-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-l from-[#0a0a0a] to-transparent text-white opacity-0 transition-opacity duration-300 md:flex ${
            canNext ? "group-hover/row:opacity-100" : "pointer-events-none"
          }`}
        >
          <ChevronRight className="h-9 w-9 drop-shadow-lg transition hover:scale-125" />
        </button>
      </div>
    </section>
  );
}

function RankChange({ change, isNew }: { change: number; isNew: boolean }) {
  if (isNew) return <span className="text-[10px] font-black text-fuchsia-400">NEW</span>;
  if (change > 0)
    return (
      <span className="flex items-center gap-0.5 font-semibold text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        {change}
      </span>
    );
  if (change < 0)
    return (
      <span className="flex items-center gap-0.5 font-semibold text-rose-400">
        <TrendingDown className="h-3 w-3" />
        {Math.abs(change)}
      </span>
    );
  return <Minus className="h-3 w-3 text-white/40" />;
}

function RankingCard({ item }: { item: RankingItem }) {
  const { movie, rank } = item;
  const [primary, ...others] = movie.platforms;

  return (
    <Link
      href={`/contents/${movie.id}`}
      className="group/card w-[140px] shrink-0 snap-start outline-none sm:w-[160px] md:w-[190px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-white/5 shadow-lg shadow-black/50 ring-1 ring-white/10 transition duration-300 group-hover/card:scale-105 group-hover/card:ring-white/30 group-focus-visible/card:ring-2 group-focus-visible/card:ring-fuchsia-400">
        <img
          src={movie.poster_url}
          alt={`${movie.title} 포스터`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover/card:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        <div className="absolute left-2 top-2 flex items-center gap-1">
          {primary && <PlatformBadge code={primary.code} />}
          {others.length > 0 && (
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur">
              +{others.length}
            </span>
          )}
        </div>

        {item.is_new && (
          <span className="absolute right-2 top-2 rounded bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-black text-white">
            NEW
          </span>
        )}

        <span className="absolute bottom-1 left-2 text-6xl font-black italic leading-none text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_rgba(255,255,255,0.95)] md:text-7xl">
          {rank}
        </span>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="truncate text-sm font-semibold text-white/90 group-hover/card:text-white">{movie.title}</p>
        <div className="mt-1 flex items-center justify-between text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {movie.rating.overall.toFixed(1)}
            <span className="text-white/30">· {movie.release_year}</span>
          </span>
          <RankChange change={item.rank_change} isNew={item.is_new} />
        </div>
      </div>
    </Link>
  );
}

function CrossRatingCard({ movie, highlightAge }: { movie: Movie; highlightAge: AgeGroup }) {
  const rows = AGE_GROUPS.map((age) => ({ age, average: getAgeAverage(movie, age) }));
  const top = rows.reduce((a, b) => (b.average > a.average ? b : a));
  const gap = Math.max(...rows.map((r) => r.average)) - Math.min(...rows.map((r) => r.average));
  const insight =
    gap >= 0.6
      ? `세대 간 호불호 차이 큼 (Δ${gap.toFixed(1)})`
      : gap <= 0.2
        ? "전 세대가 고르게 호평"
        : `${AGE_GROUP_META[top.age].label}가 가장 높게 평가`;
  const primary = movie.platforms[0];

  return (
    <Link
      href={`/contents/${movie.id}`}
      className="group/card w-[150px] shrink-0 snap-start outline-none sm:w-[170px] md:w-[200px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-white/5 shadow-lg shadow-black/50 ring-1 ring-white/10 transition duration-300 group-hover/card:scale-105 group-hover/card:ring-white/30 group-focus-visible/card:ring-2 group-focus-visible/card:ring-fuchsia-400">
        <img
          src={movie.poster_url}
          alt={`${movie.title} 포스터`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover/card:scale-110"
        />

        {primary && (
          <div className="absolute left-2 top-2 z-10">
            <PlatformBadge code={primary.code} />
          </div>
        )}

        {/* 글래스모피즘 세대별 평점 오버레이 */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-black/10 p-2.5 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          <div className="translate-y-4 rounded-xl border border-white/20 bg-white/10 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-300 group-hover/card:translate-y-0 group-focus-visible/card:translate-y-0">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-white/80">
                <Users className="h-3 w-3" />
                세대별 평점
              </span>
              <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-300">
                <Star className="h-3 w-3 fill-yellow-300" />
                {movie.rating.overall.toFixed(1)}
              </span>
            </div>

            <ul className="space-y-2">
              {rows.map(({ age, average }) => {
                const meta = AGE_GROUP_META[age];
                const isMine = age === highlightAge;
                return (
                  <li key={age} className="flex items-center gap-2">
                    <span className={`w-7 shrink-0 text-[11px] font-bold ${isMine ? meta.textClass : "text-white/75"}`}>
                      {meta.label}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                      <div
                        className={`h-full rounded-full ${meta.barClass} transition-[width] duration-700`}
                        style={{ width: `${(average / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-white">
                      {average.toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-tight text-white/65">{insight}</p>
          </div>
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="truncate text-sm font-semibold text-white/90 group-hover/card:text-white">{movie.title}</p>
        <p className="mt-1 truncate text-xs text-white/45">
          {movie.release_year} · {movie.genres.map((g) => g.name).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative h-[85vh] min-h-[580px] w-full bg-gradient-to-b from-white/[0.06] to-[#0a0a0a]">
        <div className="absolute bottom-28 left-4 max-w-2xl space-y-4 md:bottom-40 md:left-12">
          <div className="h-7 w-48 rounded-full bg-white/10" />
          <div className="h-8 w-80 rounded bg-white/10" />
          <div className="h-14 w-96 max-w-[80vw] rounded bg-white/10" />
          <div className="h-16 w-[28rem] max-w-[85vw] rounded bg-white/5" />
          <div className="flex gap-3">
            <div className="h-12 w-36 rounded-md bg-white/15" />
            <div className="h-12 w-36 rounded-md bg-white/10" />
          </div>
        </div>
      </div>
      <div className="-mt-16 space-y-12 px-4 md:-mt-24 md:px-12">
        {[0, 1].map((row) => (
          <div key={row}>
            <div className="mb-5 h-6 w-56 rounded bg-white/10" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] w-[140px] shrink-0 rounded-lg bg-white/[0.07] sm:w-[160px] md:w-[190px]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
      <p className="text-lg font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-white/80"
      >
        다시 시도
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-10 text-xs text-white/40 md:px-12">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p>
          <span className="font-bold text-white/70">ViewFit</span> · 나의 상황에 딱 맞는 OTT 큐레이션
        </p>
        <nav className="flex gap-4">
          <a href="#" className="hover:text-white/80">서비스 소개</a>
          <a href="#" className="hover:text-white/80">이용약관</a>
          <a href="#" className="hover:text-white/80">개인정보처리방침</a>
          <a href="#" className="hover:text-white/80">고객센터</a>
        </nav>
        <p>© 2026 ViewFit. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ============================================================================
 * 7. Page
 * ========================================================================== */

export default function HomePage() {
  const { feed, error, retry } = useHomeFeed();

  const peerPicks = useMemo(() => {
    if (!feed) return [];
    const unique = new Map<number, Movie>();
    [...feed.rankings.map((r) => r.movie), ...feed.cross_age_picks].forEach((m) => unique.set(m.id, m));
    return [...unique.values()]
      .sort((a, b) => getAgeAverage(b, feed.user.age_group) - getAgeAverage(a, feed.user.age_group))
      .slice(0, 10);
  }, [feed]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-fuchsia-500/40">
      <Header />

      <main>
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : !feed ? (
          <HomeSkeleton />
        ) : (
          <>
            <HeroSection hero={feed.hero} user={feed.user} tpo={feed.tpo} />

            <div className="relative z-10 -mt-20 space-y-6 pb-16 md:-mt-28 md:space-y-10">
              <ContentRow
                title="오늘의 통합 OTT 랭킹 TOP 10"
                subtitle="넷플릭스 · 티빙 · 쿠팡플레이 · 웨이브 · 디즈니+ · 왓챠 실시간 합산"
                icon={<Flame className="h-5 w-5 text-rose-500 md:h-6 md:w-6" />}
              >
                {feed.rankings.map((item) => (
                  <RankingCard key={item.movie.id} item={item} />
                ))}
              </ContentRow>

              <ContentRow
                title="세대별 교차 평점 추천"
                subtitle="포스터에 마우스를 올려 20대 · 30대 · 40대 평점을 비교해 보세요"
                icon={<Users className="h-5 w-5 text-sky-400 md:h-6 md:w-6" />}
              >
                {feed.cross_age_picks.map((movie) => (
                  <CrossRatingCard key={movie.id} movie={movie} highlightAge={feed.user.age_group} />
                ))}
              </ContentRow>

              <ContentRow
                title={`${feed.user.nickname}님 또래 ${AGE_GROUP_META[feed.user.age_group].label}가 극찬한 작품`}
                subtitle={`${AGE_GROUP_META[feed.user.age_group].label} 평균 평점 기준 정렬`}
                icon={<Sparkles className="h-5 w-5 text-fuchsia-400 md:h-6 md:w-6" />}
              >
                {peerPicks.map((movie) => (
                  <CrossRatingCard key={movie.id} movie={movie} highlightAge={feed.user.age_group} />
                ))}
              </ContentRow>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
