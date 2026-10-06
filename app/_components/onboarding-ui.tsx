import Link from "next/link";
import type { ReactNode } from "react";
import { Check, Lock, Minus } from "lucide-react";
import { PLATFORM_STYLES, type PlatformCode } from "../_lib/viewfit";

/* ============================================================================
 * 회원가입 · 온보딩 공용 UI (Figma: ViewFit 회원가입 / ViewFit 설문)
 * ========================================================================== */

export const PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-300 font-bold text-[#1f1029] transition hover:bg-fuchsia-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-50";

export const SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.02] font-medium text-white/85 transition hover:border-white/30 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300";

const OTT_STRIP: PlatformCode[] = ["NETFLIX", "TVING", "DISNEY_PLUS", "WATCHA"];

export function Logo() {
  return (
    <Link href="/" className="text-3xl font-black tracking-tight" aria-label="ViewFit 홈">
      <span className="text-fuchsia-300">View</span>
      <span className="text-white">Fit</span>
    </Link>
  );
}

export function AuthHeader({ right }: { right: ReactNode }) {
  return (
    <header className="relative z-10 border-b border-white/[0.08]">
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center justify-between px-4 md:px-16">
        <Logo />
        {right}
      </div>
    </header>
  );
}

export function AuthFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-8 text-sm text-white/45 md:flex-row md:items-center md:justify-between md:px-16">
        <p>© 2026 ViewFit. 나의 상황에 딱 맞는 OTT 큐레이션</p>
        <nav className="flex gap-6 text-white/60">
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a0a0a] text-white antialiased selection:bg-fuchsia-500/40">
      <AmbientBackdrop />
      {header}
      <main className="relative z-10 flex-1">{children}</main>
      <AuthFooter />
    </div>
  );
}

export function MoodChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm text-white/90">
      <span className="text-fuchsia-300">{icon}</span>
      {children}
    </span>
  );
}

export function StoryHeadline({ first, accent }: { first: string; accent: string }) {
  return (
    <h1 className="break-keep text-[40px] font-black leading-[1.15] tracking-tight md:text-[52px]">
      {first}
      <br />
      <span className="text-fuchsia-300">{accent}</span>
    </h1>
  );
}

export function StoryDescription({ lines }: { lines: string[] }) {
  return (
    <p className="break-keep text-base leading-relaxed text-white/60 md:text-lg">
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
    <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-black tracking-wide ${style.className}`}>
      {style.label}
    </span>
  );
}

export function OttStrip({ more = false, note }: { more?: boolean; note?: string }) {
  return (
    <div className="border-t border-white/10 pt-8">
      <p className="text-sm text-white/45">다양한 OTT의 이야기를, 한곳에서</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {OTT_STRIP.map((code) => (
          <PlatformTag key={code} code={code} />
        ))}
        {more && <span className="text-sm text-white/45">외 다양한 OTT</span>}
      </div>
      {note && <p className="mt-4 text-sm text-white/40">{note}</p>}
    </div>
  );
}

export function FormCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0d1017]/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl md:p-10">
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
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition ${
        disabled
          ? "border-white/10"
          : state === "checked"
            ? "border-fuchsia-300 bg-fuchsia-300 text-[#1f1029]"
            : on
              ? "border-fuchsia-300 text-fuchsia-300"
              : "border-white/30"
      }`}
    >
      {state === "checked" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      {state === "indeterminate" && <Minus className="h-3.5 w-3.5" strokeWidth={3} />}
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
