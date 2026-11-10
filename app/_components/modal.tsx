"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/* ============================================================================
 * 0-3 FR12 팝업 틀 (Figma 재방문 추천 피드백 145:2341 · 최근 관심사 반영 224:5091 의 가운데 상자)
 * 어두운 배경 + 가운데 상자 + 닫기(X). Esc·배경 클릭으로 닫힙니다.
 * 로그인 창(1-2)·작품 상세(4-1)·피드백(7-2)·관심사 반영(8-2)이 이 틀을 씁니다.
 * ========================================================================== */

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  width = "max-w-[600px]",
  closeOnBackdrop = true,
}: {
  open: boolean;
  onClose: () => void;
  /** 상자 위쪽 굵은 제목 */
  title?: ReactNode;
  /** 제목 위 작은 안내 (예: 아이콘 + "다시 오셨네요, 반가워요!") */
  eyebrow?: ReactNode;
  children: ReactNode;
  width?: string;
  closeOnBackdrop?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeOnBackdrop ? onClose : undefined} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative max-h-[90vh] w-full ${width} overflow-y-auto rounded-2xl border border-white/10 bg-[#141416] p-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)] outline-none`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">{eyebrow}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.02] text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {title && (
          <h2 id={titleId} className="mt-4 text-[28px] font-black leading-tight tracking-tight">
            {title}
          </h2>
        )}
        <div className={title ? "mt-6" : "mt-2"}>{children}</div>
      </div>
    </div>
  );
}
