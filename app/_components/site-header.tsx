"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Bell, Search, User } from "lucide-react";
import { getAccount, type Account } from "../_lib/account";
import { NAV_LINKS } from "../_lib/catalog";
import { ProfileMenu } from "./profile-menu";

/* ============================================================================
 * 0-3 FR1·FR3 공통 상단 바 (Figma 통합 랭킹 Header 144:6422)
 * 로고 · 통합 랭킹 · 맞춤 추천 · 세대별 랭킹 · 검색창 · 알림 · 프로필(→ 프로필 메뉴)
 * 로그인 안 했으면 프로필 자리에 [로그인] [회원가입]
 * ========================================================================== */

export function SiteHeader({ onSearch }: { onSearch?: (query: string) => void }) {
  const pathname = usePathname();
  const [account, setAccount] = useState<Account | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState("");

  // 로그인 정보는 브라우저에만 있으므로 화면이 뜬 뒤에 읽습니다
  useEffect(() => setAccount(getAccount()), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    // TODO(4-1 작품 탐색): 검색 결과 보여 주기 — 지금은 넘겨받은 onSearch 만 부릅니다
    onSearch?.(q);
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-16 border-b transition-colors duration-300 ${
          scrolled
            ? "border-white/[0.12] bg-[#0a0a0a]/80 shadow-lg shadow-black/40 backdrop-blur-xl"
            : "border-white/[0.12] bg-gradient-to-b from-black/80 to-transparent"
        }`}
      >
        <div className="flex h-full items-center gap-6 px-4 md:gap-16 md:px-12">
          <Link href="/" aria-label="ViewFit 홈" className="shrink-0 text-2xl font-black tracking-[-0.48px]">
            <span className="bg-gradient-to-r from-[#d946ef] to-[#f43f5e] bg-clip-text text-transparent">View</span>
            <span className="text-white">Fit</span>
          </Link>

          <nav aria-label="주요 메뉴" className="hidden h-full items-stretch gap-9 md:flex">
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

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 md:gap-6">
            <form
              role="search"
              onSubmit={submit}
              className="hidden h-9 w-[234px] items-center gap-2.5 rounded-md border border-white/[0.12] bg-white/[0.02] px-3 focus-within:border-fuchsia-300/60 sm:flex"
            >
              <Search className="h-4 w-4 shrink-0 text-white/60" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="어떤 이야기를 찾으세요?"
                aria-label="작품 검색"
                className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-white/60 focus:outline-none"
              />
            </form>
            <button
              type="button"
              aria-label="알림 (준비 중)"
              title="알림은 준비 중이에요"
              className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
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
                <Link href="/login" className="rounded-md px-3 py-1.5 text-white/80 transition hover:text-white">
                  로그인
                </Link>
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
