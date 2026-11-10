import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/* ============================================================================
 * 0-3 공통 화면 틀 — 상단 바 + 내용 + 하단
 * 회원가입·로그인·설문처럼 Figma 에서 상단 바가 다른 화면을 빼고, 모든 화면을 이걸로 감쌉니다.
 *   <SiteShell>…</SiteShell>                 내용이 상단 바 아래(64px)부터 시작
 *   <SiteShell underHeader>…</SiteShell>     홈처럼 큰 배경 위에 상단 바가 겹치는 화면
 * ========================================================================== */

export function SiteShell({
  children,
  underHeader = false,
  onSearch,
}: {
  children: ReactNode;
  underHeader?: boolean;
  onSearch?: (query: string) => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white antialiased selection:bg-fuchsia-500/40">
      <SiteHeader onSearch={onSearch} />
      <main className={`flex-1 ${underHeader ? "" : "pt-16"}`}>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** 화면 가운데 내용 폭 (Figma 1440 화면에서 좌우 48px) */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1440px] px-4 md:px-12 ${className}`}>{children}</div>;
}
