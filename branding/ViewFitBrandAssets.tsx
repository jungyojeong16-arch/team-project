"use client";

import { useRef, type ReactNode, type RefObject } from "react";

/* ============================================================================
 * ViewFit Brand Tokens
 * ========================================================================== */

const BRAND = {
  base: "#0a0a0a",
  indigo: "#6366f1",
  purple: "#a855f7",
  spark: "#fde047",
  white: "#ffffff",
} as const;

/* ============================================================================
 * Geometry Helpers
 * ========================================================================== */

/** 4-point sparkle (오목한 별) path */
const sparklePath = (cx: number, cy: number, r: number, k = 0.16) => {
  const i = r * k;
  return [
    `M${cx} ${cy - r}`,
    `C${cx + i} ${cy - i} ${cx + i} ${cy - i} ${cx + r} ${cy}`,
    `C${cx + i} ${cy + i} ${cx + i} ${cy + i} ${cx} ${cy + r}`,
    `C${cx - i} ${cy + i} ${cx - i} ${cy + i} ${cx - r} ${cy}`,
    `C${cx - i} ${cy - i} ${cx - i} ${cy - i} ${cx} ${cy - r}Z`,
  ].join(" ");
};

/** 합성 사인파 path (AI 데이터 흐름 / 스크린 빛 파동) */
const wavePath = (baseY: number, amp: number, len: number, phase: number, amp2 = 0, len2 = 1) => {
  const pts: string[] = [];
  for (let x = -40; x <= 1540; x += 12) {
    const y =
      baseY +
      amp * Math.sin((x / len) * Math.PI * 2 + phase) +
      amp2 * Math.sin((x / len2) * Math.PI * 2 + phase * 1.7);
    pts.push(`${x} ${y.toFixed(1)}`);
  }
  return `M${pts.join(" L")}`;
};

const waveY = (x: number, baseY: number, amp: number, len: number, phase: number, amp2 = 0, len2 = 1) =>
  baseY + amp * Math.sin((x / len) * Math.PI * 2 + phase) + amp2 * Math.sin((x / len2) * Math.PI * 2 + phase * 1.7);

/** 결정적 의사난수 (SSR/CSR 동일 결과) */
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/* ============================================================================
 * Symbol — 둥근 사각형 + 딱 맞게 들어간 Play + AI Sparkles (512 좌표계)
 * ========================================================================== */

function ViewFitSymbol({ id, glow = true }: { id: string; glow?: boolean }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-tile`} x1="116" y1="136" x2="396" y2="416" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.indigo} />
          <stop offset="1" stopColor={BRAND.purple} />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="256" y1="136" x2="256" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.white} stopOpacity="0.28" />
          <stop offset="1" stopColor={BRAND.white} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-ring`} x1="100" y1="120" x2="412" y2="432" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.indigo} stopOpacity="0.9" />
          <stop offset="0.5" stopColor={BRAND.purple} stopOpacity="0.25" />
          <stop offset="1" stopColor={BRAND.purple} stopOpacity="0.9" />
        </linearGradient>
        <clipPath id={`${id}-tileclip`}>
          <rect x="116" y="136" width="280" height="280" rx="76" />
        </clipPath>
        <filter id={`${id}-halo`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <filter id={`${id}-play`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#1e1b4b" floodOpacity="0.55" />
        </filter>
        <filter id={`${id}-spark`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {glow && (
        <>
          <rect x="116" y="136" width="280" height="280" rx="76" fill={`url(#${id}-tile)`} opacity="0.75" filter={`url(#${id}-halo)`} />
          <rect x="100" y="120" width="312" height="312" rx="92" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="2" opacity="0.7" />
        </>
      )}

      <rect x="116" y="136" width="280" height="280" rx="76" fill={`url(#${id}-tile)`} />
      <rect x="116" y="136" width="280" height="280" rx="76" fill={`url(#${id}-gloss)`} />
      <rect x="117.5" y="137.5" width="277" height="277" rx="74.5" fill="none" stroke={BRAND.white} strokeOpacity="0.22" strokeWidth="3" />

      <path
        d="M212 202 L212 350 L340 276 Z"
        fill={BRAND.white}
        stroke={BRAND.white}
        strokeWidth="28"
        strokeLinejoin="round"
        filter={`url(#${id}-play)`}
      />

      <g>
        <path
          d={sparklePath(392, 140, 60)}
          fill="none"
          stroke="#1e1b4b"
          strokeWidth="14"
          strokeLinejoin="round"
          clipPath={`url(#${id}-tileclip)`}
        />
        <g filter={`url(#${id}-spark)`} fill={BRAND.spark}>
          <path d={sparklePath(392, 140, 60)} />
          <path d={sparklePath(454, 224, 22)} />
          <path d={sparklePath(322, 96, 13)} />
        </g>
      </g>
    </g>
  );
}

/* ============================================================================
 * Wordmark — 폰트 의존성 없는 모노라인 벡터 레터링 (baseline y=0, cap 100)
 * ========================================================================== */

function ViewFitWordmark({ id }: { id: string }) {
  const stroke = {
    fill: "none",
    strokeWidth: 22,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-fit`} x1="325" y1="0" x2="499" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.indigo} />
          <stop offset="1" stopColor={BRAND.purple} />
        </linearGradient>
        <filter id={`${id}-fitglow`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* View */}
      <g {...stroke} stroke={BRAND.white}>
        <path d="M0 -100 L32 0 L64 -100" />
        <path d="M96 -70 V0" />
        <path d="M132 -35 H200 A35 35 0 1 0 190 -10" />
        <path d="M228 -70 L246 0 L265 -50 L284 0 L302 -70" />
      </g>
      <circle cx="96" cy="-99" r="12.5" fill={BRAND.white} />

      {/* Fit — glow layer */}
      <g {...stroke} stroke={`url(#${id}-fit)`} opacity="0.55" filter={`url(#${id}-fitglow)`}>
        <path d="M336 0 V-100 H386 M336 -52 H376" />
        <path d="M416 -70 V0" />
        <path d="M466 -94 V-22 Q466 0 488 0 M448 -70 H488" />
      </g>
      {/* Fit */}
      <g {...stroke} stroke={`url(#${id}-fit)`}>
        <path d="M336 0 V-100 H386 M336 -52 H376" />
        <path d="M416 -70 V0" />
        <path d="M466 -94 V-22 Q466 0 488 0 M448 -70 H488" />
      </g>
      <path d={sparklePath(416, -100, 15, 0.14)} fill={BRAND.spark} />
    </g>
  );
}

/* ============================================================================
 * 1. Notion Icon — 512 x 512
 * ========================================================================== */

export function ViewFitNotionIcon({ svgRef, className }: { svgRef?: RefObject<SVGSVGElement | null>; className?: string }) {
  const id = "vf-icon";
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width="512"
      height="512"
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="ViewFit 아이콘"
    >
      <defs>
        <radialGradient id={`${id}-bg`} cx="256" cy="270" r="300" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1b1740" />
          <stop offset="0.55" stopColor="#0f0e1a" />
          <stop offset="1" stopColor={BRAND.base} />
        </radialGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.indigo} stopOpacity="0.55" />
          <stop offset="0.5" stopColor={BRAND.white} stopOpacity="0.05" />
          <stop offset="1" stopColor={BRAND.purple} stopOpacity="0.55" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <rect width="512" height="512" rx="112" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${id}-clip)`}>
        <rect width="512" height="512" fill={BRAND.base} />
        <rect width="512" height="512" fill={`url(#${id}-bg)`} />
        <g transform="translate(-20 4)">
          <ViewFitSymbol id={id} />
        </g>
      </g>
      <rect x="1.5" y="1.5" width="509" height="509" rx="110.5" fill="none" stroke={`url(#${id}-edge)`} strokeWidth="3" />
    </svg>
  );
}

/* ============================================================================
 * 2. Notion Cover — 1500 x 600
 * ========================================================================== */

const WAVES = [
  { baseY: 508, amp: 34, len: 760, phase: 0.2, amp2: 10, len2: 260, width: 2.5, opacity: 0.75 },
  { baseY: 530, amp: 42, len: 900, phase: 1.4, amp2: 8, len2: 320, width: 1.6, opacity: 0.5 },
  { baseY: 496, amp: 24, len: 640, phase: 2.6, amp2: 12, len2: 210, width: 1.2, opacity: 0.4 },
  { baseY: 552, amp: 30, len: 1100, phase: 3.3, amp2: 6, len2: 380, width: 1, opacity: 0.3 },
  { baseY: 120, amp: 22, len: 980, phase: 0.9, amp2: 6, len2: 300, width: 1, opacity: 0.22 },
  { baseY: 96, amp: 18, len: 720, phase: 2.1, amp2: 5, len2: 240, width: 0.8, opacity: 0.16 },
];

const DATA_NODES = [
  { wave: 0, x: 180, yellow: false },
  { wave: 0, x: 460, yellow: true },
  { wave: 0, x: 1080, yellow: false },
  { wave: 0, x: 1330, yellow: true },
  { wave: 1, x: 300, yellow: false },
  { wave: 1, x: 860, yellow: false },
  { wave: 1, x: 1210, yellow: false },
  { wave: 2, x: 620, yellow: false },
  { wave: 2, x: 980, yellow: true },
  { wave: 4, x: 240, yellow: false },
  { wave: 4, x: 1260, yellow: true },
];

const STARS = (() => {
  const rand = seeded(20260928);
  return Array.from({ length: 90 }, () => ({
    x: +(rand() * 1500).toFixed(1),
    y: +(rand() * 600).toFixed(1),
    r: +(0.6 + rand() * 1.4).toFixed(2),
    o: +(0.08 + rand() * 0.35).toFixed(2),
  }));
})();

export function ViewFitNotionCover({ svgRef, className }: { svgRef?: RefObject<SVGSVGElement | null>; className?: string }) {
  const id = "vf-cover";
  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      width="1500"
      height="600"
      viewBox="0 0 1500 600"
      className={className}
      role="img"
      aria-label="ViewFit 커버 배너"
    >
      <defs>
        <radialGradient id={`${id}-g1`} cx="260" cy="560" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.indigo} stopOpacity="0.42" />
          <stop offset="1" stopColor={BRAND.indigo} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-g2`} cx="1260" cy="40" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.purple} stopOpacity="0.36" />
          <stop offset="1" stopColor={BRAND.purple} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-g3`} cx="750" cy="300" r="460" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" stopOpacity="0.22" />
          <stop offset="1" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="750" y1="0" x2="750" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c7d2fe" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#c7d2fe" stopOpacity="0.04" />
          <stop offset="1" stopColor="#c7d2fe" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-wave`} x1="0" y1="0" x2="1500" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.indigo} stopOpacity="0" />
          <stop offset="0.22" stopColor={BRAND.indigo} />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="0.78" stopColor={BRAND.purple} />
          <stop offset="1" stopColor={BRAND.purple} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-rule-l`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={BRAND.indigo} stopOpacity="0" />
          <stop offset="1" stopColor={BRAND.indigo} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={`${id}-rule-r`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={BRAND.purple} stopOpacity="0.9" />
          <stop offset="1" stopColor={BRAND.purple} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-vignette`} x1="0" y1="0" x2="0" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRAND.base} stopOpacity="0.55" />
          <stop offset="0.25" stopColor={BRAND.base} stopOpacity="0" />
          <stop offset="0.75" stopColor={BRAND.base} stopOpacity="0" />
          <stop offset="1" stopColor={BRAND.base} stopOpacity="0.7" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id={`${id}-waveglow`} x="-5%" y="-50%" width="110%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-node`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Base & ambient light */}
      <rect width="1500" height="600" fill={BRAND.base} />
      <rect width="1500" height="600" fill={`url(#${id}-g1)`} />
      <rect width="1500" height="600" fill={`url(#${id}-g2)`} />
      <rect width="1500" height="600" fill={`url(#${id}-g3)`} />

      {/* Projector beam */}
      <path d="M690 -20 L810 -20 L1130 620 L370 620 Z" fill={`url(#${id}-beam)`} filter={`url(#${id}-soft)`} />

      {/* Stars / dust */}
      <g fill="#e0e7ff">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>

      {/* Data waves */}
      <g fill="none" stroke={`url(#${id}-wave)`} strokeLinecap="round" filter={`url(#${id}-waveglow)`}>
        {WAVES.map((w, i) => (
          <path
            key={i}
            d={wavePath(w.baseY, w.amp, w.len, w.phase, w.amp2, w.len2)}
            strokeWidth={w.width}
            opacity={w.opacity}
          />
        ))}
      </g>

      {/* Data nodes */}
      <g filter={`url(#${id}-node)`}>
        {DATA_NODES.map((n, i) => {
          const w = WAVES[n.wave];
          const cy = waveY(n.x, w.baseY, w.amp, w.len, w.phase, w.amp2, w.len2);
          return n.yellow ? (
            <path key={i} d={sparklePath(n.x, +cy.toFixed(1), 9)} fill={BRAND.spark} />
          ) : (
            <circle key={i} cx={n.x} cy={+cy.toFixed(1)} r="3" fill="#ddd6fe" />
          );
        })}
      </g>

      <rect width="1500" height="600" fill={`url(#${id}-vignette)`} />

      {/* Lockup: Symbol + Wordmark */}
      <g transform="translate(270.8 141) scale(0.54)">
        <ViewFitSymbol id={`${id}-sym`} />
      </g>
      <g transform="translate(567.7 350) scale(1.2)">
        <ViewFitWordmark id={`${id}-wm`} />
      </g>

      {/* Tagline */}
      <rect x="340" y="428" width="120" height="2" rx="1" fill={`url(#${id}-rule-l)`} />
      <rect x="1040" y="428" width="120" height="2" rx="1" fill={`url(#${id}-rule-r)`} />
      <text
        x="750"
        y="436"
        textAnchor="middle"
        fill="#c4c4d4"
        fontFamily="Pretendard, 'Apple SD Gothic Neo', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        fontSize="19"
        fontWeight="600"
        letterSpacing="7"
      >
        AI CURATION FOR EVERY MOMENT
      </text>
    </svg>
  );
}

/* ============================================================================
 * Export Utils — SVG / PNG 다운로드
 * ========================================================================== */

const serialize = (svg: SVGSVGElement) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(svg)}`;

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const downloadSvg = (svg: SVGSVGElement | null, filename: string) => {
  if (!svg) return;
  triggerDownload(new Blob([serialize(svg)], { type: "image/svg+xml;charset=utf-8" }), filename);
};

const downloadPng = (svg: SVGSVGElement | null, filename: string, scale = 2) => {
  if (!svg) return;
  const width = svg.viewBox.baseVal.width;
  const height = svg.viewBox.baseVal.height;
  const url = URL.createObjectURL(new Blob([serialize(svg)], { type: "image/svg+xml;charset=utf-8" }));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => blob && triggerDownload(blob, filename), "image/png");
  };
  img.src = url;
};

/* ============================================================================
 * Preview Page
 * ========================================================================== */

const PREVIEW_SIZES = [
  { px: 96, className: "h-24 w-24" },
  { px: 48, className: "h-12 w-12" },
  { px: 28, className: "h-7 w-7" },
  { px: 20, className: "h-5 w-5" },
];

function AssetCard({
  title,
  spec,
  children,
  onSvg,
  onPng,
}: {
  title: string;
  spec: string;
  children: ReactNode;
  onSvg: () => void;
  onPng: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <p className="mt-0.5 font-mono text-xs text-white/45">{spec}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSvg}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            SVG 다운로드
          </button>
          <button
            type="button"
            onClick={onPng}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          >
            PNG @2x
          </button>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function ViewFitBrandAssets() {
  const iconRef = useRef<SVGSVGElement>(null);
  const coverRef = useRef<SVGSVGElement>(null);

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-white md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">Brand Kit</p>
          <h1 className="mt-1 text-2xl font-black md:text-3xl">
            View
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Fit</span> Notion
            Assets
          </h1>
        </header>

        <AssetCard
          title="Notion Cover"
          spec="1500 × 600 · 10:4"
          onSvg={() => downloadSvg(coverRef.current, "viewfit-notion-cover.svg")}
          onPng={() => downloadPng(coverRef.current, "viewfit-notion-cover@2x.png")}
        >
          <div className="overflow-hidden rounded-xl ring-1 ring-white/10">
            <ViewFitNotionCover svgRef={coverRef} className="block h-auto w-full" />
          </div>
        </AssetCard>

        <AssetCard
          title="Notion Icon"
          spec="512 × 512 · 1:1"
          onSvg={() => downloadSvg(iconRef.current, "viewfit-notion-icon.svg")}
          onPng={() => downloadPng(iconRef.current, "viewfit-notion-icon@2x.png")}
        >
          <div className="flex flex-wrap items-end gap-8">
            <ViewFitNotionIcon svgRef={iconRef} className="h-auto w-full max-w-[280px]" />
            <div className="flex items-end gap-6">
              {PREVIEW_SIZES.map(({ px, className }) => (
                <div key={px} className="flex flex-col items-center gap-2">
                  <ViewFitNotionIcon className={`block ${className}`} />
                  <span className="font-mono text-[11px] text-white/40">{px}px</span>
                </div>
              ))}
            </div>
          </div>
        </AssetCard>
      </div>
    </main>
  );
}
