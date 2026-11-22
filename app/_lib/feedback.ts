/* ============================================================================
 * 7-2 재방문 추천 피드백 — API 부르는 함수 (담당: 홍준화)
 * GET  /api/v1/recommendations/pending-feedback/   물어볼 추천 1개 또는 null
 * POST /api/v1/recommendations/{id}/feedback/      {watched: true, score, comment} 또는 {watched: false}
 * 백엔드: backend/core/views.py pending_feedback·submit_feedback, 조건·저장은 backend/core/feedback.py
 * ========================================================================== */

import { API_BASE_URL, RequestError, authHeader, getWithLogin, type Movie } from "./viewfit";

export interface PendingFeedback {
  /** recommendation 번호 — 답을 보낼 때 씀 */
  id: number;
  /** 추천받은 상황 (전체 상황 / 혼자 보는 밤 …) */
  tpo: string;
  recommended_at: string;
  /** 마지막으로 [바로 보기]를 누른 시각 */
  clicked_at: string;
  content: Movie;
  /** 이미 남긴 평점이 있으면 미리 채움 (보내면 수정) */
  my_rating: { score: number; comment: string } | null;
}

export type FeedbackAnswer = { watched: true; score: number; comment: string } | { watched: false };

/** 물어볼 추천 — 로그인 안 했거나 백엔드 없이 볼 때·실패하면 null (팝업은 부가 기능이라 조용히 안 띄움) */
export async function fetchPendingFeedback(signal?: AbortSignal): Promise<PendingFeedback | null> {
  if (!API_BASE_URL || !authHeader().Authorization) return null;
  const res = await getWithLogin(`${API_BASE_URL}/api/v1/recommendations/pending-feedback/`, signal);
  if (!res.ok) return null;
  const data = (await res.json().catch(() => ({}))) as { recommendation?: PendingFeedback | null };
  return data.recommendation ?? null;
}

export async function sendFeedback(id: number, answer: FeedbackAnswer): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/recommendations/${id}/feedback/`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(answer),
  }).catch(() => {
    throw new RequestError("서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.", 0);
  });
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const first = Object.values(data)[0];
  const message = typeof data.detail === "string" ? data.detail : Array.isArray(first) ? String(first[0]) : `의견을 보내지 못했어요. (HTTP ${res.status})`;
  throw new RequestError(message, res.status);
}

/* [나중에 할게요]·X → 이번 방문(브라우저 세션) 동안 다시 묻지 않음. 브라우저를 다시 열면 다시 물음 (PRD 7-2 FR6) */
const LATER_KEY = "viewfit.feedback.later";

export function isFeedbackPostponed(): boolean {
  try {
    return sessionStorage.getItem(LATER_KEY) === "1";
  } catch {
    return false;
  }
}

export function postponeFeedback(): void {
  try {
    sessionStorage.setItem(LATER_KEY, "1");
  } catch {
    /* 저장이 막힌 브라우저면 이번 화면에서만 닫힘 */
  }
}
