/* ============================================================================
 * 0-3 FR4 공통 하단 (Figma 통합 랭킹 Footer 144:7990) + TMDB 출처 (2-1 FR9)
 * ========================================================================== */

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.12] px-4 py-8 text-xs md:px-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <p className="text-white/50">© 2026 ViewFit. 나의 상황에 딱 맞는 OTT 큐레이션</p>
          <p className="text-[11px] text-white/35">
            작품 정보 제공: TMDB · This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
        <nav aria-label="약관 및 고객센터" className="flex gap-6 text-white/60">
          <a href="#" className="transition hover:text-white">
            이용약관
          </a>
          <a href="#" className="transition hover:text-white">
            개인정보처리방침
          </a>
          <a href="#" className="transition hover:text-white">
            고객센터
          </a>
        </nav>
      </div>
    </footer>
  );
}
