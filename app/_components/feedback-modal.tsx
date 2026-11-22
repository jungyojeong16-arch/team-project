"use client";

import { MessageCircleHeart } from "lucide-react";
import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import {
  fetchPendingFeedback,
  isFeedbackPostponed,
  postponeFeedback,
  sendFeedback,
  type PendingFeedback,
} from "../_lib/feedback";
import { Modal } from "./modal";

/* ============================================================================
 * 7-2 재방문 추천 피드백 팝업 (Figma 145:2341 "지난 추천 만족도 설문") — 담당: 홍준화
 * 홈에 들어왔을 때 GET pending-feedback 결과가 있으면 띄움 (조건: [바로 보기] 누르고 12시간 뒤 · backend/core/feedback.py)
 * - 별점 0.5 단위 (별의 왼쪽 반 = .5) · 키보드 ←→ 로도 조절 · 또는 "아직 못 봤어요"
 * - [나중에 할게요]·X·Esc·바깥 클릭 → 이번 방문(sessionStorage) 동안 다시 안 띄움
 * Figma 와 다른 점: PRD FR1 의 "작품 이름"을 보여 주려고 작품 줄을 넣음, 입력 칸 둘째 줄은 실제 동작대로
 * ("추천 작품에 반영됩니다" → 한마디는 추천 계산에 쓰이지 않고 내 평점과 함께 저장됨)
 * ========================================================================== */

const STAR_IMAGES = {
  full: "/images/feedback/star-full.svg",
  half: "/images/feedback/star-half.svg",
  empty: "/images/feedback/star-empty.svg",
};
const COMMENT_MAX = 200;

export function FeedbackModal() {
  const [pending, setPending] = useState<PendingFeedback | null>(null);

  useEffect(() => {
    if (isFeedbackPostponed()) return;
    const controller = new AbortController();
    fetchPendingFeedback(controller.signal)
      .then((item) => !controller.signal.aborted && setPending(item))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!pending) return null;
  return (
    <FeedbackDialog
      key={pending.id}
      item={pending}
      onLater={() => {
        postponeFeedback();
        setPending(null);
      }}
      onDone={() => setPending(null)}
    />
  );
}

function FeedbackDialog({ item, onLater, onDone }: { item: PendingFeedback; onLater: () => void; onDone: () => void }) {
  const [score, setScore] = useState<number | null>(item.my_rating?.score ?? null);
  const [notWatched, setNotWatched] = useState(false);
  const [comment, setComment] = useState(item.my_rating?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const titleId = useId();

  const pickScore = (value: number) => {
    setScore(value);
    setNotWatched(false);
    setError(null);
  };

  const submit = async () => {
    if (!notWatched && score === null) {
      setError("별점을 선택해 주세요.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendFeedback(item.id, notWatched || score === null ? { watched: false } : { watched: true, score, comment: comment.trim() });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "의견을 보내지 못했어요.");
      setSending(false);
    }
  };

  return (
    <Modal
      open
      onClose={onLater}
      labelledBy={titleId}
      panelClassName="bg-[#17171d]"
      backdropClassName="bg-black/65"
      frameClassName="rounded-[20px] border-white/[0.14] p-6 md:p-8"
      eyebrow={
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-[rgba(240,171,252,0.07)]">
            <MessageCircleHeart className="size-[18px] text-[#f0abfc]" strokeWidth={1.7} aria-hidden />
          </span>
          <span className="text-[13px] font-medium text-[#f0abfc]">다시 오셨네요, 반가워요!</span>
        </span>
      }
    >
      {/* Modal 안쪽 mt-2(8px) + pt-2.5(10px) = Figma 머리줄↔질문 18px (margin 은 겹쳐서 줄어드니 padding 으로) */}
      <div className="flex flex-col gap-6 pt-2.5">
        {/* Question + 작품 (PRD FR1) */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 id={titleId} className="text-[28px] font-bold leading-[1.4] tracking-[-0.84px] text-[#f5f5f8]">
              이번 작품은 어떠셨나요?
            </h2>
            <p className="text-sm leading-[1.6] text-[#a5a5b5]">짧게 알려주세요. 다음 추천에 참고할게요.</p>
          </div>
          <WorkLine item={item} />
        </div>

        {/* Rating feedback */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#f5f5f8]">별점을 선택해주세요</p>
            <p className="text-xs text-[#797987]">약 10초</p>
          </div>
          <p className="text-xs font-medium text-[#797987]">0.5점 단위로 평가할 수 있어요</p>
          <StarInput value={notWatched ? null : score} onChange={pickScore} dimmed={notWatched} />
          <p className="flex items-center gap-2 text-sm" aria-live="polite">
            {!notWatched && score !== null ? (
              <>
                <span className="font-bold text-[#f0abfc]">{score.toFixed(1)} / 5</span>
                <span className="text-[#a5a5b5]">선택됨</span>
              </>
            ) : (
              <span className="text-[#797987]">{notWatched ? "별점 없이 '아직 못 봤어요'로 보내요" : "별을 눌러 골라 주세요"}</span>
            )}
          </p>
          <button
            type="button"
            role="radio"
            aria-checked={notWatched}
            onClick={() => {
              setNotWatched((v) => !v);
              setError(null);
            }}
            className={`flex h-11 w-full items-center gap-2.5 rounded-[10px] border px-3.5 text-left text-[13px] transition ${
              notWatched
                ? "border-[#f0abfc]/60 bg-[rgba(240,171,252,0.07)] text-[#f5f5f8]"
                : "border-white/[0.12] text-[#a5a5b5] hover:border-white/25"
            }`}
          >
            <span className="relative size-4 shrink-0">
              <img src="/images/feedback/radio.svg" alt="" width={16} height={16} className="block size-4" />
              {notWatched && <span className="absolute inset-[4px] rounded-full bg-[#f0abfc]" />}
            </span>
            아직 못 봤어요
          </button>
        </div>

        {/* Optional comment */}
        <div className={`flex flex-col gap-2.5 transition ${notWatched ? "opacity-40" : ""}`}>
          <label htmlFor={`${titleId}-comment`} className="text-[13px] font-medium text-[#f5f5f8]">
            한마디 더 남겨주실래요? <span className="font-normal text-[#797987]">(선택)</span>
          </label>
          <div className="flex h-[88px] flex-col justify-between rounded-[10px] border border-white/[0.12] bg-[#101014] p-3.5 focus-within:border-white/25">
            <textarea
              id={`${titleId}-comment`}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
              maxLength={COMMENT_MAX}
              disabled={notWatched}
              rows={2}
              placeholder={"좋았던 점이나 아쉬웠던 점을 편하게 적어주세요\n남긴 글은 내 평점과 함께 저장돼요"}
              className="min-h-0 flex-1 resize-none bg-transparent text-[13px] leading-[1.45] text-[#f5f5f8] outline-none placeholder:text-[#797987] disabled:cursor-not-allowed"
            />
            <p className="text-right text-[11px] text-[#797987] tabular-nums">
              {comment.length} / {COMMENT_MAX}
            </p>
          </div>
        </div>

        {/* Survey actions */}
        <div className="flex flex-col items-center gap-3.5">
          {error && (
            <p role="alert" className="w-full text-center text-[13px] text-[#fb7185]">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="flex h-[50px] w-full items-center justify-center rounded-[10px] bg-[#f0abfc] text-[15px] font-bold text-[#27152d] transition hover:bg-[#f5c2fd] disabled:opacity-60"
          >
            {sending ? "보내는 중…" : "의견 보내기"}
          </button>
          <button type="button" onClick={onLater} className="text-[13px] text-[#a5a5b5] transition hover:text-white">
            나중에 할게요
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** 어떤 작품을 묻는지 (Figma 에는 없지만 PRD FR1 "작품 이름") */
function WorkLine({ item }: { item: PendingFeedback }) {
  const { content } = item;
  const clicked = new Date(item.clicked_at);
  const day = Number.isNaN(clicked.getTime()) ? "" : `${clicked.getMonth() + 1}월 ${clicked.getDate()}일`;
  const meta = [content.content_type === "series" ? "시리즈" : "영화", content.release_year || null].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-white/[0.12] bg-[#101014] p-3">
      {content.poster_url ? (
        <img src={content.poster_url} alt="" className="h-[60px] w-10 shrink-0 rounded-md object-cover" />
      ) : (
        <span className="h-[60px] w-10 shrink-0 rounded-md bg-white/10" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-[#f5f5f8]">{content.title}</p>
        <p className="mt-1 text-xs text-[#a5a5b5]">
          {meta}
          {day && ` · ${day}에 [바로 보기]로 열었어요`}
        </p>
      </div>
    </div>
  );
}

/** 별 5개 입력 — 별의 왼쪽 반을 누르면 .5, 오른쪽 반은 정수. 키보드 ←↓ −0.5 / →↑ +0.5 / Home 0.5 / End 5 */
function StarInput({ value, onChange, dimmed }: { value: number | null; onChange: (value: number) => void; dimmed: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  const valueAt = (e: MouseEvent<HTMLSpanElement>, index: number) => {
    const box = e.currentTarget.getBoundingClientRect();
    return index + (e.clientX - box.left < box.width / 2 ? 0.5 : 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = value ?? 0;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? current + 0.5
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? current - 0.5
          : e.key === "Home"
            ? 0.5
            : e.key === "End"
              ? 5
              : null;
    if (next === null) return;
    e.preventDefault();
    onChange(Math.min(5, Math.max(0.5, next)));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="별점"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value === null ? "선택 전" : `${value.toFixed(1)}점`}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHover(null)}
      className={`flex h-11 items-center justify-center gap-3.5 rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-[#f0abfc]/60 ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = shown - i;
        const src = fill >= 1 ? STAR_IMAGES.full : fill >= 0.5 ? STAR_IMAGES.half : STAR_IMAGES.empty;
        return (
          <span
            key={i}
            className="size-11 shrink-0 cursor-pointer"
            onMouseMove={(e) => setHover(valueAt(e, i))}
            onClick={(e) => onChange(valueAt(e, i))}
          >
            <img src={src} alt="" width={44} height={44} draggable={false} className="pointer-events-none block size-11 select-none" />
          </span>
        );
      })}
    </div>
  );
}
