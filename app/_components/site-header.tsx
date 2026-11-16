"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bell, Search, User } from "lucide-react";
import { NAV_LINKS } from "../_lib/catalog";
import { useAccount } from "../_lib/use-account";
import { openLoginModal } from "./login-modal";
import { ProfileMenu } from "./profile-menu";

/* ============================================================================
 * 0-3 FR1·FR3 공통 상단 바
 *   variant="home"    Figma Home Feed "Header (top, not scrolled)" 9:50
 *                     로고 · 메뉴(간격 24) ……… 돋보기 아이콘 · 알림 · 프로필 (아래 테두리 없음)
 *   variant="default" Figma 통합 랭킹 Header 144:6422
 *                     로고 · 메뉴(간격 36, 지금 페이지 밑줄) ……… 검색창 · 알림 · 프로필 (아래 테두리)
 * 로그인 안 했으면 프로필 자리에 [로그인] [회원가입]
 * ========================================================================== */

export function SiteHeader({ variant = "default", onSearch }: { variant?: "home" | "default"; onSearch?: (query: string) => void }) {
  const pathname = usePathname();
  const { account } = useAccount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const isHome = variant === "home";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    // TODO(4-1 작품 탐색): 검색 결과 보여 주기 — 지금은 넘겨받은 onSearch 만 부릅니다
    onSearch?.(q);
  };

  const searchBox = (
    <form
      role="search"
      onSubmit={submit}
      className="flex h-9 w-[234px] items-center gap-2.5 rounded-md border border-white/[0.12] bg-white/[0.02] px-3 focus-within:border-fuchsia-300/60"
    >
      <Search className="h-4 w-4 shrink-0 text-white/60" aria-hidden />
      <input
        ref={searchRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => isHome && !query && setSearchOpen(false)}
        placeholder="어떤 이야기를 찾으세요?"
        aria-label="작품 검색"
        className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/60 focus:outline-none"
      />
    </form>
  );

  const borderClass = isHome ? (scrolled ? "border-white/5" : "border-transparent") : "border-white/[0.12]";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-16 border-b transition-colors duration-300 ${borderClass} ${
          scrolled ? "bg-[#0a0a0a]/80 shadow-lg shadow-black/40 backdrop-blur-xl" : "bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        <div className={`flex h-full items-center px-4 md:px-12 ${isHome ? "justify-between gap-6" : "gap-6 md:gap-16"}`}>
          <div className={`flex h-full items-center ${isHome ? "gap-10" : "gap-6 md:gap-16"}`}>
            <Link href="/" aria-label="ViewFit 홈" className="shrink-0 text-2xl font-black tracking-[-0.48px]">
              <span className="bg-gradient-to-r from-[#d946ef] to-[#f43f5e] bg-clip-text text-transparent">View</span>
              <span className="text-white">Fit</span>
            </Link>

            <nav aria-label="주요 메뉴" className={`hidden h-full items-stretch md:flex ${isHome ? "gap-6" : "gap-9"}`}>
              {NAV_LINKS.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center text-sm transition-colors ${active ? "text-white" : "text-white/60 hover:text-white"}`}
                  >
                    {item.label}
                    {active && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#f0abfc]" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className={`flex min-w-0 items-center justify-end ${isHome ? "gap-5" : "flex-1 gap-3 md:gap-6"}`}>
            {isHome ? (
              searchOpen ? (
                <div className="hidden sm:block">{searchBox}</div>
              ) : (
                <button type="button" aria-label="작품 검색" onClick={() => setSearchOpen(true)} className="text-white transition hover:text-white/70">
                  <Search className="h-5 w-5" />
                </button>
              )
            ) : (
              <div className="hidden sm:block">{searchBox}</div>
            )}
            <button
              type="button"
              aria-label="알림 (준비 중)"
              title="알림은 준비 중이에요"
              className={isHome ? "text-white transition hover:text-white/70" : "rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"}
            >
              <Bell className="h-5 w-5" />
            </button>

            {account ? (
              <button
                type="button"
                aria-label="내 프로필 메뉴 열기"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/20 bg-[linear-gradient(135deg,#d946ef_0%,#4f46e5_100%)] transition hover:border-white/60"
              >
                <User className="h-4 w-4 text-white" />
              </button>
            ) : (
              <div className="flex shrink-0 items-center gap-2 text-sm">
                <button type="button" onClick={openLoginModal} className="rounded-md px-3 py-1.5 text-white/80 transition hover:text-white">
                  로그인
                </button>
                <Link
                  href="/signup"
                  className="rounded-md bg-gradient-to-r from-[#d946ef] to-[#f43f5e] px-3 py-1.5 font-bold text-white transition hover:brightness-110"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {account && <ProfileMenu open={menuOpen} account={account} onClose={() => setMenuOpen(false)} />}
    </>
  );
}
