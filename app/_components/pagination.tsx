"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/* ============================================================================
 * 0-3 FR11 페이지 번호 (Figma 좋아요 표시한 작품 220:2521 · 나의 평점 220:2672)
 * 예: "전체 24개 중 1–4개"   ‹ 1 2 3 4 5 6 ›   "1 / 6 페이지"
 * ========================================================================== */

export function Pagination({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const button = "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition disabled:opacity-30";

  return (
    <nav aria-label="페이지 이동" className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
      <p>
        전체 {total}개 중 {from}–{to}개
      </p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="이전 페이지" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${button} text-white/70 hover:bg-white/10`}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-current={n === page ? "page" : undefined}
            onClick={() => onChange(n)}
            className={`${button} ${n === page ? "bg-white/10 font-bold text-[#f0abfc]" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
          >
            {n}
          </button>
        ))}
        <button type="button" aria-label="다음 페이지" disabled={page >= pages} onClick={() => onChange(page + 1)} className={`${button} text-white/70 hover:bg-white/10`}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p>
        {page} / {pages} 페이지
      </p>
    </nav>
  );
}
