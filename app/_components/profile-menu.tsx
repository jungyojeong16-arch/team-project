"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight, Bookmark, ChevronRight, LogOut, SlidersHorizontal, Star, User, UserRound, X } from "lucide-react";
import { signOut, type Account } from "../_lib/account";
import { PROFILE_LINKS } from "../_lib/catalog";

/* ============================================================================
 * 0-3 FR2 프로필 메뉴 (Figma "Profile Sidebar" 40:1850 — 오른쪽에서 밀려 나오는 360px 패널)
 * 좋아요·평점 개수는 5-1·5-2 가 만들어지면 counts 로 넘겨 줍니다 (없으면 숨김).
 * ========================================================================== */

export function ProfileMenu({
  open,
  account,
  onClose,
  counts,
}: {
  open: boolean;
  account: Account;
  onClose: () => void;
  counts?: { likes?: number; ratings?: number };
}) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const persona = [account.survey?.age_group, account.survey?.occupation].filter(Boolean).join(" · ");
  const joined = new Date(account.created_at);
  const since = Number.isNaN(joined.getTime()) ? null : `${joined.getFullYear()}년 ${joined.getMonth() + 1}월부터 ViewFit과 함께하고 있어요`;

  const logOut = async () => {
    await signOut();
    onClose();
    router.push("/");
  };

  const items = [
    { href: PROFILE_LINKS.likes, icon: Bookmark, label: "좋아요 표시한 작품", count: counts?.likes },
    { href: PROFILE_LINKS.ratings, icon: Star, label: "나의 평점", count: counts?.ratings },
    { href: PROFILE_LINKS.taste, icon: SlidersHorizontal, label: "취향 수정", count: undefined },
  ];

  return (
    <div className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="내 프로필 메뉴"
        className={`absolute inset-y-0 right-0 flex w-[360px] max-w-full flex-col border-l border-white/[0.08] bg-[#141416] shadow-[-16px_0_48px_rgba(0,0,0,0.4)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-7">
          <p className="text-lg font-bold text-white">내 프로필</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            tabIndex={open ? 0 : -1}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.02] text-white/80 transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 px-7 pt-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/[0.15] bg-gradient-to-r from-[#c24cdf] to-[#5944cb]">
              <User className="h-7 w-7 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold text-white">{account.nickname}</p>
              {persona && <p className="mt-1 text-xs text-[#b99aff]">{persona}</p>}
            </div>
          </div>

          <Link
            href={PROFILE_LINKS.profile}
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            className="flex h-[50px] items-center gap-2.5 rounded-md bg-[#b99aff] px-4 text-[15px] font-bold text-[#181321] transition hover:brightness-110"
          >
            <UserRound className="h-5 w-5" />
            <span className="flex-1">프로필 정보</span>
            <ArrowRight className="h-[18px] w-[18px]" />
          </Link>

          <div className="h-px bg-white/[0.08]" />

          <nav aria-label="내 메뉴" className="flex flex-col gap-1">
            {items.map(({ href, icon: Icon, label, count }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                tabIndex={open ? 0 : -1}
                className="flex h-[52px] items-center gap-3 rounded-md px-3 text-sm text-white transition hover:bg-white/5"
              >
                <Icon className="h-5 w-5 text-white/80" />
                <span className="flex-1">{label}</span>
                {count !== undefined && <span className="text-xs text-[#777580]">{count}</span>}
                <ChevronRight className="h-4 w-4 text-[#777580]" />
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto flex flex-col gap-5 px-7 pb-7">
          <div className="h-px bg-white/[0.08]" />
          <button
            type="button"
            onClick={logOut}
            tabIndex={open ? 0 : -1}
            className="flex h-10 items-center gap-3 rounded-md px-3 text-[13px] text-[#b3b1bc] transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            로그아웃
          </button>
          {since && <p className="text-[11px] text-[#777580]">{since}</p>}
        </div>
      </aside>
    </div>
  );
}
