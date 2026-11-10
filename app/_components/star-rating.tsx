import { Star } from "lucide-react";

/* ============================================================================
 * 0-3 FR13 별점 표시 (읽기 전용, 0.5 단위 반 별 지원)
 * 별점을 '입력'하는 부품은 5-1 담당이 따로 만듭니다.
 * ========================================================================== */

export function StarRating({ value, size = 16, showValue = false }: { value: number; size?: number; showValue?: boolean }) {
  const clamped = Math.max(0, Math.min(5, Math.round(value * 2) / 2));
  return (
    <span className="inline-flex items-center gap-1" aria-label={`별점 ${clamped.toFixed(1)}점 / 5점`}>
      <span className="inline-flex" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, clamped - i)); // 0, 0.5, 1
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star className="absolute inset-0 text-white/25" style={{ width: size, height: size }} />
              {fill > 0 && (
                <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: size * fill }}>
                  <Star className="fill-[#facc15] text-[#facc15]" style={{ width: size, height: size }} />
                </span>
              )}
            </span>
          );
        })}
      </span>
      {showValue && <span className="text-sm font-bold tabular-nums text-white">{clamped.toFixed(1)}</span>}
    </span>
  );
}
