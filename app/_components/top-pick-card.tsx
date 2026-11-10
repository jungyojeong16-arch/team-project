"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useState } from "react";
import type { PlatformCode } from "../_lib/viewfit";
import { PlatformBadge } from "./platform-badge";

/* ============================================================================
 * 0-3 FR7 TOP 3 큰 카드 (Figma 통합 랭킹 "Featured picks" 144:6456)
 * 통합 랭킹(6-1)·세대별 랭킹(6-2)·맞춤 추천(7-1)에서 같이 씁니다.
 * ========================================================================== */

export type TopPickCardProps = {
  rank: number;
  title: string;
  /** 예: "시리즈 · 미스터리 · 2026" 또는 상황 라벨 "주말 · 집에서 둘이" */
  meta: string;
  platform?: PlatformCode;
  imageUrl?: string | null;
  /** 오른쪽 위 작은 표시 — 기본: 1위 "TOP PICK", 나머지 "TOP 3" */
  label?: string;
  /** 오른쪽 아래 지표 — 예: { name: "지수", value: "98.8" } / { name: "평점", value: "4.92" } */
  metric?: { name: string; value: string };
  href?: string;
  onClick?: () => void;
};

export function TopPickCard({ rank, title, meta, platform, imageUrl, label, metric, href, onClick }: TopPickCardProps) {
  const [broken, setBroken] = useState(false);
  const body = (
    <>
      {imageUrl && !broken ? (
        <img src={imageUrl} alt="" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/top:scale-105" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#312e81] via-[#1e1b4b] to-[#020617]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(2,5,11,0.14)] via-[rgba(2,5,11,0.19)] via-45% to-[rgba(2,5,11,0.96)]" />

      <div className="relative flex w-full items-start justify-between">
        <span className={`text-5xl font-black leading-none ${rank === 1 ? "text-[#f0abfc]" : "text-white"}`}>
          {String(rank).padStart(2, "0")}
        </span>
        <span className="rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
          {label ?? (rank === 1 ? "TOP PICK" : "TOP 3")}
        </span>
      </div>

      <div className="relative flex w-full flex-col gap-[9px]">
        <p className="truncate text-[23px] font-bold tracking-[-0.46px] text-white">{title}</p>
        <p className="truncate text-xs text-white/70">{meta}</p>
        <div className="flex items-center justify-between">
          {platform ? <PlatformBadge code={platform} /> : <span />}
          {metric && (
            <p className="text-[11px] text-[#9ca3b5]">
              {metric.name} <span className="text-base font-bold text-[#f0abfc]">{metric.value}</span>
            </p>
          )}
        </div>
      </div>
    </>
  );

  const className =
    "group/top relative flex h-[262px] min-w-0 flex-1 flex-col justify-between overflow-hidden rounded-xl border border-white/[0.12] p-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400";
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

/** TOP 3 묶음 — 제목 줄 + 카드 3장 */
export function TopPickSection({ heading, note, picks }: { heading: string; note?: string; picks: TopPickCardProps[] }) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white">{heading}</h2>
        {note && <p className="text-[11px] text-white/60">{note}</p>}
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        {picks.slice(0, 3).map((pick) => (
          <TopPickCard key={pick.rank} {...pick} />
        ))}
      </div>
    </section>
  );
}
