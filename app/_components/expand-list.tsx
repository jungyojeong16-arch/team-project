"use client";

import { ArrowUp, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

/* ============================================================================
 * 0-3 FR10 펼치기 목록 (Figma 통합 랭킹 "Card group 01–20" · "Expand button 21–40" · "Ranking end")
 * 20개씩 보여 주고 [펼치기]로 다음 20개를 엽니다. 통합 랭킹·세대별 랭킹·맞춤 추천에서 같이 씁니다.
 * ========================================================================== */

const pad = (n: number) => String(n).padStart(2, "0");

/** 20개씩 펼치기 상태 */
export function useExpand(total: number, step = 20) {
  const [visible, setVisible] = useState(Math.min(step, total));
  return {
    visible: Math.min(visible, total),
    hasMore: visible < total,
    expand: () => setVisible((v) => Math.min(v + step, total)),
    reset: () => setVisible(Math.min(step, total)),
  };
}

/** "01 — 20" 묶음 머리 */
export function RangeHeader({ from, to, shown, total }: { from: number; to: number; shown?: number; total?: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="rounded-md border border-white/[0.12] bg-white/[0.02] px-2.5 py-1 text-[11px] font-bold tracking-[0.44px] text-white/60">
        {pad(from)} — {pad(to)}
      </span>
      {shown !== undefined && total !== undefined && (
        <span className="text-[11px] text-white/50">
          {shown} / {total} 표시 중
        </span>
      )}
    </div>
  );
}

/** [펼치기 · 21–40위] 줄 */
export function ExpandButton({
  from,
  to,
  unit = "위",
  hint,
  onClick,
}: {
  from: number;
  to: number;
  unit?: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/5 py-5">
      <div className="flex items-center gap-3">
        <span className="rounded-md border border-white/[0.12] bg-white/[0.02] px-2.5 py-1 text-[11px] font-bold tracking-[0.44px] text-white/60">
          {from} — {to}
        </span>
        <span className="hidden text-sm text-white/60 sm:inline">{hint ?? `다음 ${to - from + 1}개 작품`}</span>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 rounded-lg border border-white/[0.15] bg-white/10 px-6 py-2.5 text-sm font-bold text-[#f0abfc] transition hover:bg-white/[0.15]"
      >
        펼치기 · {from}–{to}
        {unit}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** 목록 끝 — 안내 문구 + [맨 위로] */
export function ListEnd({ title, note }: { title: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 py-5">
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        {note && <p className="mt-1 text-xs text-white/50">{note}</p>}
      </div>
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex items-center gap-2 rounded-lg border border-white/[0.15] px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
      >
        <ArrowUp className="h-4 w-4" />맨 위로
      </button>
    </div>
  );
}
