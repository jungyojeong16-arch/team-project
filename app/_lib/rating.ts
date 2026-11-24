/* ============================================================================
 * 5-1 평점 — API 부르는 함수 (담당: 정준교)
 * PUT    /api/v1/contents/{id}/rating/          {score, comment} 없으면 만들고 있으면 수정
 * DELETE /api/v1/contents/{id}/rating/          내 평점 삭제
 * GET    /api/v1/contents/{id}/rating-result/   내 평점 + 통합 랭킹(주간) 순위 변화
 * GET    /api/v1/me/ratings/?type=&score=&sort=&page=   나의 평점 (3개씩) + 요약
 * 백엔드: backend/core/views.py content_rating·content_rating_result·my_ratings, 계산은 backend/core/rating.py
 * ========================================================================== */

import { API_BASE_URL, RequestError, authHeader, getWithLogin, type ContentType, type Movie } from "./viewfit";

export const RATING_COMMENT_MAX = 200;

export interface MyRating {
  content_id: number;
  score: number;
  comment: string;
  age_group_at_rating: string | null;
  rated_at: string;
  /** 수정했으면 수정한 시각 — 카드의 "10월 5일 평가함" */
  updated_at: string;
  movie?: Movie;
}

export interface RatingSummary {
  like_count: number;
  rating_count: number;
  rating_average: number | null;
}

export type ScoreFilter = "all" | "5" | "4" | "3" | "2" | "1";
export type RatingSort = "recent" | "score_desc" | "score_asc";

export const SCORE_FILTERS: { value: ScoreFilter; label: string }[] = [
  { value: "all", label: "별점 전체" },
  { value: "5", label: "5점" },
  { value: "4", label: "4점대" },
  { value: "3", label: "3점대" },
  { value: "2", label: "2점대" },
  { value: "1", label: "1점대 이하" },
];

export const RATING_SORTS: { value: RatingSort; label: string }[] = [
  { value: "recent", label: "최근 평가순" },
  { value: "score_desc", label: "별점 높은 순" },
  { value: "score_asc", label: "별점 낮은 순" },
];

export interface MyRatingQuery {
  type?: "all" | ContentType;
  score?: ScoreFilter;
  sort?: RatingSort;
  page?: number;
}

export interface MyRatingList {
  summary: RatingSummary;
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: (MyRating & { movie: Movie })[];
}

export interface RankNeighbor {
  rank: number;
  previous_rank: number | null;
  rank_change: number;
  is_new: boolean;
  is_mine: boolean;
  content_id: number;
  title: string;
}

export interface RatingResult {
  rating: MyRating & { movie: Movie };
  ranking: {
    period: "weekly";
    ranked_on: string | null;
    previous_ranked_on: string | null;
    /** null 이면 아직 TOP 100 밖 (또는 집계 전) */
    current_rank: number | null;
    previous_rank: number | null;
    /** + 오름 / − 내림 */
    rank_change: number;
    is_new: boolean;
    neighbors: RankNeighbor[];
  };
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof data.detail === "string") return data.detail;
  const first = Object.values(data)[0];
  return Array.isArray(first) ? String(first[0]) : `${fallback} (HTTP ${res.status})`;
}

const OFFLINE = "서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.";

async function send(path: string, init: RequestInit, fallback: string): Promise<Response> {
  if (!API_BASE_URL) throw new RequestError("백엔드 주소가 없어요. (.env.local 의 NEXT_PUBLIC_API_BASE_URL)", 0);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeader() },
  }).catch(() => {
    throw new RequestError(OFFLINE, 0);
  });
  if (!res.ok) throw new RequestError(await errorMessage(res, fallback), res.status);
  return res;
}

/** 별점 저장 — 이미 있으면 수정 (FR3) */
export async function saveRating(contentId: number, score: number, comment: string): Promise<MyRating> {
  const res = await send(`/api/v1/contents/${contentId}/rating/`, { method: "PUT", body: JSON.stringify({ score, comment }) }, "평점을 저장하지 못했어요.");
  return (await res.json()) as MyRating;
}

export async function deleteRating(contentId: number): Promise<void> {
  await send(`/api/v1/contents/${contentId}/rating/`, { method: "DELETE" }, "평점을 지우지 못했어요.");
}

async function getJson<T>(path: string, fallback: string, signal?: AbortSignal): Promise<T> {
  if (!API_BASE_URL) throw new RequestError("백엔드 주소가 없어요. (.env.local 의 NEXT_PUBLIC_API_BASE_URL)", 0);
  const res = await getWithLogin(`${API_BASE_URL}${path}`, signal).catch((e: unknown) => {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new RequestError(OFFLINE, 0);
  });
  if (!res.ok) throw new RequestError(await errorMessage(res, fallback), res.status);
  return (await res.json()) as T;
}

export function fetchMyRatings(query: MyRatingQuery = {}, signal?: AbortSignal): Promise<MyRatingList> {
  const params = new URLSearchParams();
  if (query.type && query.type !== "all") params.set("type", query.type);
  if (query.score && query.score !== "all") params.set("score", query.score);
  if (query.sort && query.sort !== "recent") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return getJson<MyRatingList>(`/api/v1/me/ratings/${qs ? `?${qs}` : ""}`, "나의 평점을 불러오지 못했어요.", signal);
}

export function fetchRatingResult(contentId: number, signal?: AbortSignal): Promise<RatingResult> {
  return getJson<RatingResult>(`/api/v1/contents/${contentId}/rating-result/`, "평점 반영 결과를 불러오지 못했어요.", signal);
}

/** "10월 5일 평가함" */
export function formatRatedDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
