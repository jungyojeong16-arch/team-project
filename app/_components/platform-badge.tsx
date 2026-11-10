import { PLATFORM_STYLES, type PlatformCode } from "../_lib/viewfit";

/** 0-3 FR8 OTT 뱃지 (Figma Platform Badge 3:14) */
export function PlatformBadge({ code, className = "" }: { code: PlatformCode; className?: string }) {
  const style = PLATFORM_STYLES[code];
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-black leading-normal tracking-[0.4px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)] ${style.className} ${className}`}
    >
      {style.label}
    </span>
  );
}
