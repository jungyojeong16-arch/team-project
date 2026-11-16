/* ============================================================================
 * 0-3 FR4 공통 하단 + TMDB 출처 (2-1 FR9)
 *   variant="home"    Figma Home Feed Footer (9:411 · 40:2276) — 브랜드 · 링크 4개 · All rights reserved
 *   variant="default" Figma 통합 랭킹 Footer (144:7990)       — 저작권 문구 · 링크 3개
 * ========================================================================== */

const TMDB_NOTICE = "작품 정보 제공: TMDB · This product uses the TMDB API but is not endorsed or certified by TMDB.";

export function SiteFooter({ variant = "default" }: { variant?: "home" | "default" }) {
  if (variant === "home") {
    return (
      <footer className="border-t border-white/5 px-4 py-10 text-xs text-white/40 md:px-12">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            <span className="font-bold text-white/70">ViewFit</span> · 나의 상황에 딱 맞는 OTT 큐레이션
          </p>
          <nav aria-label="서비스 안내" className="flex gap-4">
            {["서비스 소개", "이용약관", "개인정보처리방침", "고객센터"].map((label) => (
              <a key={label} href="#" className="transition hover:text-white/80">
                {label}
              </a>
            ))}
          </nav>
          <p>© 2026 ViewFit. All rights reserved.</p>
        </div>
        <p className="mt-4 text-[11px] text-white/30">{TMDB_NOTICE}</p>
      </footer>
    );
  }

  return (
    <footer className="border-t border-white/[0.12] px-4 py-8 text-xs md:px-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <p className="text-white/50">© 2026 ViewFit. 나의 상황에 딱 맞는 OTT 큐레이션</p>
          <p className="text-[11px] text-white/35">{TMDB_NOTICE}</p>
        </div>
        <nav aria-label="약관 및 고객센터" className="flex gap-6 text-white/60">
          {["이용약관", "개인정보처리방침", "고객센터"].map((label) => (
            <a key={label} href="#" className="transition hover:text-white">
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
