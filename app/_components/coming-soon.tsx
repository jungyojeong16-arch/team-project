import Link from "next/link";
import { Construction } from "lucide-react";
import { PageContainer, SiteShell } from "./site-shell";

/* ============================================================================
 * 아직 만들지 않은 화면 자리 — 담당자가 기능을 만들면 이 파일 대신 진짜 화면으로 바꿉니다.
 * ========================================================================== */

export function ComingSoon({ title, program, figma }: { title: string; program: string; figma?: string }) {
  return (
    <SiteShell>
      <PageContainer className="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-24 text-center">
        <Construction className="h-10 w-10 text-[#f0abfc]" aria-hidden />
        <h1 className="text-3xl font-black tracking-tight text-white">{title}</h1>
        <p className="text-white/60">이 화면은 준비 중이에요. 곧 만나요!</p>
        <p className="text-xs text-white/35">
          프로그램 {program}
          {figma && <> · Figma {figma}</>}
        </p>
        <Link href="/" className="mt-4 rounded-md bg-white/10 px-5 py-2 text-sm font-bold text-[#f0abfc] transition hover:bg-white/[0.15]">
          홈으로
        </Link>
      </PageContainer>
    </SiteShell>
  );
}
