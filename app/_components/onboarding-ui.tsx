import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { PLATFORM_STYLES, type PlatformCode } from "../_lib/viewfit";
import { FONT_FAMILY, ViewFitFont } from "./viewfit-font";

/* ============================================================================
 * 회원가입 · 온보딩 공용 UI (Figma: ViewFit 회원가입 / ViewFit 설문)
 * ========================================================================== */

/* Figma 공통 값: 강조색 #f0abfc · 본문 #eceef4 · 보조 글자 #9ca3b5 · 흐린 글자 #6b7487 · 테두리 white 12% */
export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2.5 rounded-md bg-[#f0abfc] font-bold text-[#241229] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-50";

export const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.02] font-medium text-white/85 transition hover:border-white/30 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300";

const OTT_STRIP: PlatformCode[] = ["NETFLIX", "TVING", "DISNEY_PLUS", "WATCHA"];

export function Logo() {
  return (
    <Link href="/" className="text-2xl font-black tracking-[-0.48px]" aria-label="ViewFit 홈">
      <span className="bg-gradient-to-r from-[#d946ef] to-[#f43f5e] bg-clip-text text-transparent">View</span>
      <span className="text-white">Fit</span>
    </Link>
  );
}

export function AuthHeader({ right }: { right: ReactNode }) {
  return (
    <header className="relative z-10 border-b border-white/[0.12]">
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center justify-between px-4 md:px-16">
        <Logo />
        {right}
      </div>
    </header>
  );
}

export function AuthFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.12]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-7 text-xs text-[#6b7487] md:flex-row md:items-center md:justify-between md:px-16">
        <p>© 2026 ViewFit. 나의 상황에 딱 맞는 OTT 큐레이션</p>
        <nav className="flex gap-6 text-[#9ca3b5]">
          <a href="#" className="hover:text-white">이용약관</a>
          <a href="#" className="hover:text-white">개인정보처리방침</a>
          <a href="#" className="hover:text-white">고객센터</a>
        </nav>
      </div>
    </footer>
  );
}

/** 우측 상단 심해 톤 빛 번짐 배경 */
export function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -right-40 -top-56 h-[900px] w-[1100px] rounded-full opacity-70 blur-[140px]"
        style={{ background: "radial-gradient(closest-side, #1e3a8a, transparent)" }}
      />
      <div
        className="absolute right-0 top-40 h-[620px] w-[620px] rounded-full opacity-60 blur-[140px]"
        style={{ background: "radial-gradient(closest-side, #0c4a6e, transparent)" }}
      />
      <div
        className="absolute -top-28 right-24 h-[360px] w-[420px] rounded-full opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, #38bdf8, transparent)" }}
      />
    </div>
  );
}

export function AuthPage({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0a0a] text-white antialiased selection:bg-fuchsia-500/40"
      style={{ fontFamily: FONT_FAMILY }}
    >
      <ViewFitFont />
      <AmbientBackdrop />
      {header}
      <main className="relative z-10 flex-1">{children}</main>
      <AuthFooter />
    </div>
  );
}

export function MoodChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/5 px-3 py-1.5 text-xs font-medium text-[#eceef4]">
      <span className="text-[#f0abfc]">{icon}</span>
      {children}
    </span>
  );
}

/** 큰 제목 두 줄 — 둘째 줄의 lead 는 흰색, accent 는 분홍 (예: "오늘 밤," / "당신의 " + "취향으로.") */
export function StoryHeadline({ first, lead = "", accent }: { first: string; lead?: string; accent: string }) {
  return (
    <h1 className="break-keep text-[40px] font-black leading-[1.28] tracking-[-1.2px] md:text-[52px] md:tracking-[-1.56px]">
      {first}
      <br />
      {lead}
      <span className="text-[#f0abfc]">{accent}</span>
    </h1>
  );
}

export function StoryDescription({ lines }: { lines: string[] }) {
  return (
    <p className="break-keep text-base leading-[1.8] text-[#9ca3b5]">
      {lines.map((line, i) => (
        <span key={line}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </p>
  );
}

export function InfoNote({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Lock className="h-4 w-4 text-fuchsia-300" />
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {lines.map((line, i) => (
          <span key={line}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    </div>
  );
}

export function PlatformTag({ code }: { code: PlatformCode }) {
  const style = PLATFORM_STYLES[code];
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-black tracking-[0.4px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] ${style.className}`}>
      {style.label}
    </span>
  );
}

export function OttStrip({ more = false, note }: { more?: boolean; note?: string }) {
  return (
    <div className="border-t border-white/[0.12] pt-6">
      <p className="text-xs text-[#6b7487]">다양한 OTT의 이야기를, 한곳에서</p>
      <div className="mt-3.5 flex flex-wrap items-center gap-3.5">
        {OTT_STRIP.map((code) => (
          <PlatformTag key={code} code={code} />
        ))}
        {more && <span className="text-xs text-[#6b7487]">외 다양한 OTT</span>}
      </div>
      {note && <p className="mt-3.5 text-[11px] text-[#6b7487]">{note}</p>}
    </div>
  );
}

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.12] bg-[rgba(13,17,27,0.8)] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.31)] backdrop-blur-xl md:p-10">
      {children}
    </section>
  );
}

export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3 className="text-lg font-bold">{title}</h3>
      {meta && <span className="shrink-0 text-xs text-white/45">{meta}</span>}
    </div>
  );
}

/** 단일 선택 칩 (선택 시 • 표시) */
export function ChoicePill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[15px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-300 ${
        selected
          ? "border-fuchsia-300 bg-fuchsia-300/10 font-bold text-fuchsia-200"
          : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/25 hover:text-white"
      }`}
    >
      {selected && <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300" />}
      {children}
    </button>
  );
}

export type CheckState = "checked" | "unchecked" | "indeterminate";

export function CheckMark({ state, disabled = false }: { state: CheckState; disabled?: boolean }) {
  const on = state !== "unchecked";
  return (
    <span
      aria-hidden
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border transition ${
        disabled
          ? "border-white/10"
          : state === "checked"
            ? "border-[#f0abfc] bg-[#f0abfc] text-[#241229]"
            : on
              ? "border-[#f0abfc] bg-[rgba(240,171,252,0.13)]"
              : "border-white/25"
      }`}
    >
      {state === "checked" && <Check className="h-3 w-3" strokeWidth={3} />}
      {state === "indeterminate" && <span className="h-0.5 w-2.5 bg-[#f0abfc]" />}
    </span>
  );
}

/** 복수 선택 타일 (체크박스 + 라벨) */
export function CheckTile({
  checked,
  disabled = false,
  onClick,
  children,
  className = "",
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2.5 rounded-lg border px-4 py-3 text-[15px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-300 ${
        disabled
          ? "cursor-not-allowed border-white/[0.05] text-white/25"
          : checked
            ? "border-fuchsia-300 bg-fuchsia-300/10 font-bold text-fuchsia-200"
            : "border-white/10 bg-white/[0.02] text-white/85 hover:border-white/25"
      } ${className}`}
    >
      <CheckMark state={checked ? "checked" : "unchecked"} disabled={disabled} />
      {children}
    </button>
  );
}
