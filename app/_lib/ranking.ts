/* ============================================================================
 * 6-1 통합 랭킹 — API 부르는 함수 (담당: 정준교)
 * GET /api/v1/rankings/?period=weekly|monthly&type=&platform=&genre=&offset=&limit=
 * 백엔드: backend/core/views.py rankings, 계산은 backend/core/ranking.py
 * ========================================================================== */

import type { ContentTypeFilter } from "./catalog";
import { API_BASE_URL, MOCK_MOVIES, type Movie, type PlatformCode } from "./viewfit";

export type RankingPeriod = "weekly" | "monthly";

export interface TotalRankingItem {
  /** 필터를 건 목록 안에서의 순위 (1부터 다시) */
  rank: number;
  /** 전체 TOP 100 에서의 순위 */
  overall_rank: number;
  /** 바로 전 집계 대비 (+상승 / −하락 / 0 유지) */
  rank_change: number;
  is_new: boolean;
  /** ViewFit 지수 0~100 */
  score: number | null;
  movie: Movie;
}

export interface TotalRanking {
  period: RankingPeriod;
  /** 집계일 "2026-11-21". 집계가 한 번도 없으면 null */
  ranked_on: string | null;
  total: number;
  offset: number;
  limit: number;
  next_offset: number | null;
  items: TotalRankingItem[];
  /** 백엔드 없이 볼 때의 샘플 데이터 */
  sample?: boolean;
}

export interface RankingQuery {
  period: RankingPeriod;
  type: ContentTypeFilter;
  platform: PlatformCode | null;
  genre: string | null;
}

/** TOP 100 을 한 번에 받아서 화면에서 20개씩 펼칩니다. */
export async function fetchTotalRanking(q: RankingQuery, signal?: AbortSignal): Promise<TotalRanking> {
  if (!API_BASE_URL) return sampleRanking(q);
  const params = new URLSearchParams({ period: q.period, type: q.type, limit: "100" });
  if (q.platform) params.set("platform", q.platform);
  if (q.genre) params.set("genre", q.genre);
  const res = await fetch(`${API_BASE_URL}/api/v1/rankings/?${params}`, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`랭킹을 불러오지 못했어요. (HTTP ${res.status})`);
  return res.json();
}

/** 백엔드 주소(NEXT_PUBLIC_API_BASE_URL)가 없을 때 — 샘플 작품으로 모양만 보여 줌 */
function sampleRanking(q: RankingQuery): TotalRanking {
  const movies = MOCK_MOVIES.filter(
    (m) =>
      (q.type === "all" || m.content_type === q.type) &&
      (!q.platform || m.platforms.some((p) => p.code === q.platform)) &&
      (!q.genre || m.genres.some((g) => g.name === q.genre)),
  );
  const items = movies.map((movie, i) => ({
    rank: i + 1,
    overall_rank: i + 1,
    rank_change: [0, 2, 3, -4, 0, 1][i % 6],
    is_new: i % 7 === 6,
    score: Math.round((98.8 - i * 0.6) * 10) / 10,
    movie,
  }));
  return { period: q.period, ranked_on: null, total: items.length, offset: 0, limit: 100, next_offset: null, items, sample: true };
}

/** "2026-11-21" → "11월 21일" */
export const formatRankedOn = (day: string) => {
  const [, m, d] = day.split("-").map(Number);
  return `${m}월 ${d}일`;
};
