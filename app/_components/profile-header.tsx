"use client";

import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { PROFILE_LINKS } from "../_lib/catalog";

/* ============================================================================
 * 마이페이지 공통 머리 (Figma 나의 평점 220:2672 "Profile overview") — 5-1 에서 만듦, 5-2·8-1 이 같이 씀
 *  ← 내 프로필로 돌아가기 · 이름/연령대·직업 · 좋아요 수·평점 수·평균 · [프로필 요약 | 좋아요 표시한 작품 | 나의 평점] 탭
 * 숫자는 GET /api/v1/me/ratings/ 의 summary (좋아요·평점 수·평균은 저장하지 않고 조회할 때 계산)
 * ========================================================================== */

export type ProfileTab = "profile" | "likes" | "ratings";

export interface ProfileStats {
  like_count: number;
  rating_count: number;
  rating_average: number | null;
}

export function ProfileHeader({
  nickname,
  badge,
  line,
  stats,
  active,
}: {
  nickname: string;
  /** "20대 · 학생" (설문 답이 없으면 생략) */
  badge?: string;
  /** 이름 아래 한 줄 (예: 좋아하는 장르) */
  line?: string;
  stats: ProfileStats | null;
  active: ProfileTab;
}) {
  const tabs: { key: ProfileTab; href: string; label: string; count?: number }[] = [
    { key: "profile", href: PROFILE_LINKS.profile, label: "프로필 요약" },
    { key: "likes", href: PROFILE_LINKS.likes, label: "좋아요 표시한 작품", count: stats?.like_count },
    { key: "ratings", href: PROFILE_LINKS.ratings, label: "나의 평점", count: stats?.rating_count },
  ];
  const metrics = [
    { label: "좋아요 표시한 작품", value: stats ? String(stats.like_count) : "–", accent: false },
    { label: "남긴 평점", value: stats ? String(stats.rating_count) : "–", accent: true },
    { label: "나의 평균 평점", value: stats?.rating_average != null ? stats.rating_average.toFixed(1) : "–", accent: false },
  ];

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="flex items-center justify-between">
        <Link href={PROFILE_LINKS.profile} className="flex items-center gap-2 text-[13px] text-[#b3b1bc] transition hover:text-white">
          <ArrowLeft className="size-4" aria-hidden />
          내 프로필로 돌아가기
        </Link>
        <p className="text-xs text-[#777580]">나만의 공간</p>
      </div>

      <section className="flex flex-col gap-6 rounded-xl border border-white/[0.08] bg-gradient-to-r from-[#221b34] via-[#141416] via-60% to-[#141416] p-6 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-6">
          <div className="flex size-[72px] shrink-0 items-center justify-center rounded-[14.4px] border border-white/15 bg-gradient-to-r from-[#c24cdf] to-[#5944cb]">
            <UserRound className="size-9 text-white" strokeWidth={1.6} aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-white">{nickname}</h1>
              {badge && <span className="text-xs text-[#b99aff]">{badge}</span>}
            </div>
            {line && <p className="truncate text-sm text-[#b3b1bc]">{line}</p>}
          </div>
        </div>
        <dl className="flex shrink-0 items-center justify-around gap-4 md:gap-8">
          {metrics.map((m) => (
            <div key={m.label} className="flex w-[110px] flex-col-reverse items-center gap-[5px]">
              <dt className="text-xs text-[#777580]">{m.label}</dt>
              <dd className={`text-[28px] font-bold tabular-nums ${m.accent ? "text-[#b99aff]" : "text-white"}`}>{m.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="마이페이지" className="flex h-12 gap-8 overflow-x-auto border-b border-white/[0.08]">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={`flex h-full shrink-0 items-center gap-2 border-b-2 px-0.5 whitespace-nowrap transition ${
                on ? "border-[#b99aff]" : "border-transparent hover:text-white"
              }`}
            >
              <span className={`text-sm ${on ? "font-bold text-white" : "text-[#777580]"}`}>{t.label}</span>
              {t.count !== undefined && <span className={`text-xs ${on ? "text-[#b99aff]" : "text-[#777580]"}`}>{t.count}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
