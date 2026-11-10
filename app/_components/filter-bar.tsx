"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { GENRE_NAMES, PLATFORM_ORDER } from "../_lib/catalog";
import type { PlatformCode } from "../_lib/viewfit";
import { PlatformBadge } from "./platform-badge";

/* ============================================================================
 * 0-3 FR9 필터 바 (Figma 통합 랭킹 "Ranking filters" 144:6509)
 * 부품을 따로 내보내서 화면마다 필요한 것만 조합합니다.
 *   <SectionTitle>     통합 랭킹 TOP 100            [주간|월간]
 *   <UnderlineTabs>    전체 100 | 영화 | 시리즈
 *   <PlatformFilter>   [전체 OTT] [NETFLIX] …       <GenreSelect>
 *   <ResultInfo>       총 100개 작품 …               정렬 설명
 * ========================================================================== */

type Option<T extends string> = { value: T; label: string; count?: number };

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-[26px] font-bold tracking-[-0.52px] text-white">
        {title} {sub && <span className="text-[15px] font-normal text-[#9ca3b5]">{sub}</span>}
      </h2>
      {right}
    </div>
  );
}

/** 주간/월간 같은 두세 개 중 하나 고르기 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-md bg-white/[0.02] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-[30px] rounded px-[18px] text-xs transition ${
              active ? "bg-white/10 font-bold text-[#f0abfc]" : "text-white/60 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** 전체/영화/시리즈, 연령대, 상황처럼 밑줄로 표시되는 탭 */
export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-7 overflow-x-auto border-b border-white/[0.12]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="flex shrink-0 flex-col gap-3 text-sm"
          >
            <span className={active ? "font-bold text-[#f0abfc]" : "text-white/60 hover:text-white"}>
              {o.label}
              {o.count !== undefined && <span className="ml-2">{o.count}</span>}
            </span>
            <span className={`h-0.5 w-full ${active ? "bg-[#f0abfc]" : "bg-transparent"}`} />
          </button>
        );
      })}
    </div>
  );
}

/** 전체 OTT + OTT 6개 (null = 전체) */
export function PlatformFilter({
  value,
  onChange,
}: {
  value: PlatformCode | null;
  onChange: (value: PlatformCode | null) => void;
}) {
  const chip = "flex h-8 shrink-0 items-center rounded-md border transition";
  return (
    <div role="radiogroup" aria-label="OTT 선택" className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        onClick={() => onChange(null)}
        className={`${chip} px-3 text-xs ${
          value === null ? "border-white/[0.15] bg-white/10 font-bold text-[#f0abfc]" : "border-white/[0.12] text-white/60 hover:text-white"
        }`}
      >
        전체 OTT
      </button>
      {PLATFORM_ORDER.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={value === code}
          onClick={() => onChange(code)}
          className={`${chip} px-2.5 ${value === code ? "border-[#f0abfc] bg-white/10" : "border-white/[0.12] hover:border-white/30"}`}
        >
          <PlatformBadge code={code} />
        </button>
      ))}
    </div>
  );
}

/** 모든 장르 ⌄ (null = 모든 장르) */
export function GenreSelect({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  return (
    <label className="relative flex h-8 items-center rounded-md border border-white/[0.12] text-xs text-white/60 hover:border-white/30">
      <span className="sr-only">장르 선택</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-full appearance-none bg-transparent pl-3 pr-8 outline-none [&>option]:bg-[#141416]"
      >
        <option value="">모든 장르</option>
        {GENRE_NAMES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5" />
    </label>
  );
}

/** 결과 개수와 정렬 설명 줄 */
export function ResultInfo({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="text-xs text-[#9ca3b5] [&_b]:font-bold [&_b]:text-[#eceef4]">{left}</p>
      {right && <p className="text-[11px] text-white/50">{right}</p>}
    </div>
  );
}
