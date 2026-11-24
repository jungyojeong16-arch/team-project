"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import { RATING_COMMENT_MAX, saveRating, type MyRating } from "../_lib/rating";
import { authHeader, type Movie } from "../_lib/viewfit";
import { openLoginModal } from "./login-modal";
import { Modal } from "./modal";

/* ============================================================================
 * 5-1 별점 입력 (담당: 정준교) — 7-2 재방문 피드백 팝업·4-1 상세 팝업·나의 평점이 같이 씀
 *
 *  <StarInput value onChange />       별 5개 입력 (반 별 = .5, 키보드 ←→ 0.5씩)
 *  <RatingDialog movie open ... />     별점 + 감상 200자 → 저장(PUT) → 평점 반영 결과 화면으로 이동
 *
 * 4-1 상세 팝업에서 쓰는 예:
 *   const [rateOpen, setRateOpen] = useState(false);
 *   <button onClick={() => setRateOpen(true)}>별점 남기기</button>
 *   <RatingDialog movie={movie} open={rateOpen} initial={my} onClose={() => setRateOpen(false)} />
 * ========================================================================== */

const STAR_IMAGES = {
  full: "/images/feedback/star-full.svg",
  half: "/images/feedback/star-half.svg",
  empty: "/images/feedback/star-empty.svg",
};

/** 별 5개 입력 — 별의 왼쪽 반을 누르면 .5, 오른쪽 반은 정수. 키보드 ←↓ −0.5 / →↑ +0.5 / Home 0.5 / End 5 */
export function StarInput({
  value,
  onChange,
  dimmed = false,
  size = 44,
}: {
  value: number | null;
  onChange: (value: number) => void;
  dimmed?: boolean;
  /** 별 하나 크기(px). 7-2 피드백 팝업은 44 */
  size?: number;
}) {
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
      className={`flex items-center justify-center rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-[#f0abfc]/60 ${
        dimmed ? "opacity-40" : ""
      }`}
      style={{ height: size, gap: Math.round(size * 0.32) }}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = shown - i;
        const src = fill >= 1 ? STAR_IMAGES.full : fill >= 0.5 ? STAR_IMAGES.half : STAR_IMAGES.empty;
        return (
          <span
            key={i}
            className="shrink-0 cursor-pointer"
            style={{ width: size, height: size }}
            onMouseMove={(e) => setHover(valueAt(e, i))}
            onClick={(e) => onChange(valueAt(e, i))}
          >
            <img
              src={src}
              alt=""
              width={size}
              height={size}
              draggable={false}
              className="pointer-events-none block select-none"
              style={{ width: size, height: size }}
            />
          </span>
        );
      })}
    </div>
  );
}

/**
 * 별점·감상 남기기 팝업 (FR1·FR2). 저장하면 onSaved, 없으면 평점 반영 결과 화면(/me/ratings/result/{id})으로 이동.
 * 로그인 안 했으면 로그인 창을 띄움.
 */
export function RatingDialog({
  movie,
  open,
  onClose,
  initial,
  onSaved,
}: {
  movie: Pick<Movie, "id" | "title" | "content_type" | "release_year" | "poster_url" | "genres">;
  open: boolean;
  onClose: () => void;
  /** 이미 남긴 평점 (수정할 때 미리 채움) */
  initial?: { score: number | null; comment?: string } | null;
  onSaved?: (rating: MyRating) => void;
}) {
  const needLogin = open && !authHeader().Authorization;
  useEffect(() => {
    if (!needLogin) return;
    onClose();
    openLoginModal();
  }, [needLogin, onClose]);
  if (!open || needLogin) return null;
  return <RatingForm key={movie.id} movie={movie} onClose={onClose} initial={initial} onSaved={onSaved} />;
}

function RatingForm({
  movie,
  onClose,
  initial,
  onSaved,
}: {
  movie: Pick<Movie, "id" | "title" | "content_type" | "release_year" | "poster_url" | "genres">;
  onClose: () => void;
  initial?: { score: number | null; comment?: string } | null;
  onSaved?: (rating: MyRating) => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [score, setScore] = useState<number | null>(initial?.score ?? null);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = initial?.score != null;
  const meta = [movie.release_year || null, movie.content_type === "series" ? "시리즈" : "영화", ...movie.genres.slice(0, 2).map((g) => g.name)]
    .filter(Boolean)
    .join(" · ");

  const submit = async () => {
    if (score === null) {
      setError("별점을 선택해 주세요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveRating(movie.id, score, comment.trim());
      if (onSaved) {
        onSaved(saved);
        onClose();
      } else {
        onClose();
        router.push(`/me/ratings/result/${movie.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "평점을 저장하지 못했어요.");
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="bg-[#17171d]"
      backdropClassName="bg-black/65"
      frameClassName="rounded-[20px] border-white/[0.14] p-6 md:p-8"
      eyebrow={
        <span className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-[rgba(185,154,255,0.1)]">
            <Star className="size-[18px] text-[#b99aff]" strokeWidth={1.7} aria-hidden />
          </span>
          <span className="text-[13px] font-medium text-[#b99aff]">{editing ? "평점·감상 수정" : "별점 남기기"}</span>
        </span>
      }
    >
      <div className="flex flex-col gap-6 pt-2.5">
        <div className="flex items-center gap-3">
          {movie.poster_url ? (
            <img src={movie.poster_url} alt="" className="h-[72px] w-12 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="h-[72px] w-12 shrink-0 rounded-md bg-white/10" aria-hidden />
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[22px] font-bold leading-[1.35] tracking-[-0.5px] text-[#f5f5f8]">
              {movie.title}
            </h2>
            <p className="mt-1 text-[13px] text-[#a5a5b5]">{meta}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-[#f5f5f8]">별점을 선택해주세요</p>
            <p className="text-xs font-medium text-[#797987]">0.5점 단위</p>
          </div>
          <StarInput
            value={score}
            onChange={(v) => {
              setScore(v);
              setError(null);
            }}
          />
          <p className="text-center text-sm" aria-live="polite">
            {score !== null ? (
              <span className="font-bold text-[#f0abfc]">{score.toFixed(1)} / 5</span>
            ) : (
              <span className="text-[#797987]">별을 눌러 골라 주세요</span>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor={`${titleId}-comment`} className="text-[13px] font-medium text-[#f5f5f8]">
            감상 한마디 <span className="font-normal text-[#797987]">(선택)</span>
          </label>
          <div className="flex h-[96px] flex-col justify-between rounded-[10px] border border-white/[0.12] bg-[#101014] p-3.5 focus-within:border-white/25">
            <textarea
              id={`${titleId}-comment`}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, RATING_COMMENT_MAX))}
              maxLength={RATING_COMMENT_MAX}
              rows={2}
              placeholder="좋았던 점이나 아쉬웠던 점을 짧게 남겨 주세요"
              className="min-h-0 flex-1 resize-none bg-transparent text-[13px] leading-[1.45] text-[#f5f5f8] outline-none placeholder:text-[#797987]"
            />
            <p className="text-right text-[11px] text-[#797987] tabular-nums">
              {comment.length} / {RATING_COMMENT_MAX}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3.5">
          {error && (
            <p role="alert" className="w-full text-center text-[13px] text-[#fb7185]">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="flex h-[50px] w-full items-center justify-center rounded-[10px] bg-[#b99aff] text-[15px] font-bold text-[#1c1230] transition hover:bg-[#c9b0ff] disabled:opacity-60"
          >
            {saving ? "저장하는 중…" : editing ? "수정하기" : "저장하기"}
          </button>
          <button type="button" onClick={onClose} className="text-[13px] text-[#a5a5b5] transition hover:text-white">
            취소
          </button>
        </div>
      </div>
    </Modal>
  );
}
