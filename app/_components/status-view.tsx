import Link from "next/link";
import type { ReactNode } from "react";

/* ============================================================================
 * 0-3 FR14 상태 표시 — 불러오는 중 / 비어 있음 / 오류
 * API 를 부르는 화면은 세 가지를 모두 이 부품으로 보여 줍니다.
 * ========================================================================== */

/** 카드 줄 모양 뼈대 (불러오는 중) */
export function LoadingCards({ rows = 1, count = 6 }: { rows?: number; count?: number }) {
  return (
    <div className="animate-pulse space-y-10" role="status" aria-label="불러오는 중">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r}>
          <div className="mb-5 h-6 w-56 rounded bg-white/10" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="aspect-[2/3] w-[140px] shrink-0 rounded-lg bg-white/[0.07] sm:w-[160px] md:w-[190px]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** 비어 있음 — 예: "아직 남긴 평점이 없어요" */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.12] px-6 py-14 text-center">
      <p className="text-base font-bold text-white">{title}</p>
      {description && <p className="text-sm text-white/55">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-[#f0abfc] transition hover:bg-white/[0.15]">
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** 오류 + [다시 시도] */
export function ErrorState({ message, onRetry, children }: { message: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="text-lg font-semibold text-white">{message}</p>
      {children}
      {onRetry && (
        <button type="button" onClick={onRetry} className="rounded-md bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-white/80">
          다시 시도
        </button>
      )}
    </div>
  );
}
