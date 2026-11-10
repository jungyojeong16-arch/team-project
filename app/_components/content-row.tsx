"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/* ============================================================================
 * 가로로 넘기는 카드 줄 (Figma Home Feed "Row Header" 131:683 + "Carousel Viewport" 9:85)
 * 제목(아이콘 + 24px) · 설명 · [전체보기 ›] + 카드들
 * ========================================================================== */

const SCROLLBAR_HIDE = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export function ContentRow({
  title,
  subtitle,
  icon,
  seeAllHref,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  seeAllHref?: string;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows]);

  const scroll = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrow = "absolute inset-y-0 z-20 hidden w-16 items-center justify-center text-white opacity-0 transition-opacity duration-300 md:flex";

  return (
    <section className="group/row relative">
      <div className="flex items-end justify-between gap-4 px-4 md:px-12">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white md:text-2xl">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-xs text-white/50 md:text-sm">{subtitle}</p>}
        </div>
        {seeAllHref && (
          <Link href={seeAllHref} className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-white/50 transition hover:text-white md:text-sm">
            전체보기
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label="이전"
          onClick={() => scroll(-1)}
          className={`${arrow} left-0 bg-gradient-to-r from-[#0a0a0a] to-transparent ${canPrev ? "group-hover/row:opacity-100" : "pointer-events-none"}`}
        >
          <ChevronLeft className="h-9 w-9 drop-shadow-lg" />
        </button>
        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className={`${SCROLLBAR_HIDE} flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 py-5 md:scroll-px-12 md:gap-4 md:px-12`}
        >
          {children}
        </div>
        <button
          type="button"
          aria-label="다음"
          onClick={() => scroll(1)}
          className={`${arrow} right-0 bg-gradient-to-l from-[#0a0a0a] to-transparent ${canNext ? "group-hover/row:opacity-100" : "pointer-events-none"}`}
        >
          <ChevronRight className="h-9 w-9 drop-shadow-lg" />
        </button>
      </div>
    </section>
  );
}
