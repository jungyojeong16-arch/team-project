"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { PlatformCode } from "../_lib/viewfit";
import { PlatformBadge } from "./platform-badge";

/* ============================================================================
 * 0-3 FR5·FR6 작품 카드 / 순위 카드 (Figma Ranking Card 3:15 — 190×285 포스터 + 제목 + 한 줄 정보)
 * - rank 를 주면 왼쪽 아래에 큰 순위 숫자가 생깁니다 (순위 카드).
 * - 포스터가 없으면 Figma 처럼 색 배경 위에 제목을 보여 줍니다.
 * ========================================================================== */

export type PosterCardProps = {
  title: string;
  posterUrl?: string | null;
  platforms?: PlatformCode[];
  /** 있으면 큰 순위 숫자 표시 */
  rank?: number;
  /** 제목 아래 왼쪽 (예: "★ 4.7 · 2025") */
  stat?: ReactNode;
  /** 제목 아래 오른쪽 (예: <RankChange />) */
  trailing?: ReactNode;
  /** 포스터 오른쪽 위 (예: 좋아요 버튼 — 5-2) */
  topRight?: ReactNode;
  /** 포스터 위에 마우스를 올렸을 때 덮는 내용 (예: 세대별 평점) */
  hoverOverlay?: ReactNode;
  href?: string;
  onClick?: () => void;
  size?: "md" | "lg";
};

const FALLBACK_GRADIENTS = [
  "from-[#fda4af] via-[#7c3aed] to-[#1e1b4b]",
  "from-[#f59e0b] via-[#c2410c] to-[#431407]",
  "from-[#38bdf8] via-[#1d4ed8] to-[#0b1020]",
  "from-[#34d399] via-[#0f766e] to-[#042f2e]",
];

export function PosterCard({
  title,
  posterUrl,
  platforms = [],
  rank,
  stat,
  trailing,
  topRight,
  hoverOverlay,
  href,
  onClick,
  size = "md",
}: PosterCardProps) {
  const [primary, ...others] = platforms;
  const [broken, setBroken] = useState(false);
  const fallback = FALLBACK_GRADIENTS[title.length % FALLBACK_GRADIENTS.length];
  const width = size === "lg" ? "w-[150px] sm:w-[170px] md:w-[200px]" : "w-[140px] sm:w-[160px] md:w-[190px]";

  const body = (
    <>
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.5)] transition duration-300 group-hover/card:scale-[1.03] group-hover/card:border-white/30 group-focus-visible/card:ring-2 group-focus-visible/card:ring-fuchsia-400">
        {posterUrl && !broken ? (
          <img
            src={posterUrl}
            alt={`${title} 포스터`}
            loading="lazy"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover transition duration-500 group-hover/card:scale-110"
          />
        ) : (
          <div className={`flex h-full w-full items-start justify-center bg-gradient-to-br ${fallback} px-3 pt-[15%]`}>
            <span className="text-center text-xl font-black text-white/90">{title}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-black/10 via-45% to-black/90" />

        {primary && (
          <div className="absolute left-[7px] top-[7px] flex items-center gap-1">
            <PlatformBadge code={primary} />
            {others.length > 0 && (
              <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white/80">+{others.length}</span>
            )}
          </div>
        )}
        {topRight && <div className="absolute right-[7px] top-[7px] z-10">{topRight}</div>}

        {rank !== undefined && (
          <span className="pointer-events-none absolute -bottom-2 left-[9px] font-[Inter,sans-serif] text-[64px] font-black italic leading-none text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_rgba(255,255,255,0.95)] md:text-[76px]">
            {rank}
          </span>
        )}
        {hoverOverlay}
      </div>

      <div className="mt-2.5 flex flex-col gap-1">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        {(stat || trailing) && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-white/55">{stat}</span>
            {trailing}
          </div>
        )}
      </div>
    </>
  );

  const className = `group/card block ${width} shrink-0 snap-start text-left outline-none`;
  if (href)
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  return <div className={className}>{body}</div>;
}

/** 순위 변동 (Figma: ↑ 2 초록 / ↓ 4 빨강 / — / NEW) */
export function RankChange({ change, isNew = false }: { change: number; isNew?: boolean }) {
  if (isNew) return <span className="shrink-0 font-bold text-white/40">NEW</span>;
  if (change > 0)
    return (
      <span className="shrink-0 font-bold text-[#34d399]" aria-label={`${change}계단 상승`}>
        ↑ {change}
      </span>
    );
  if (change < 0)
    return (
      <span className="shrink-0 font-bold text-[#fb7185]" aria-label={`${Math.abs(change)}계단 하락`}>
        ↓ {Math.abs(change)}
      </span>
    );
  return (
    <span className="shrink-0 font-bold text-white/40" aria-label="변동 없음">
      —
    </span>
  );
}
