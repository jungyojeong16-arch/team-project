import Link from "next/link";

/* ============================================================================
 * 랭킹 화면 위쪽 탭 (Figma 통합 랭킹 200:1456 · 세대별 평점 같은 자리)
 * 통합 랭킹(6-1) · 맞춤 추천(7-1) · 세대별 평점(6-2) 사이를 오갑니다.
 * ========================================================================== */

const TABS = [
  { href: "/ranking", label: "통합 랭킹" },
  { href: "/recommend", label: "맞춤 추천" },
  { href: "/generation", label: "세대별 평점" },
] as const;

export function RankingTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="랭킹 종류" className="flex gap-7 border-b border-white/[0.12]">
      {TABS.map((tab) => {
        const on = tab.href === active;
        return (
          <Link key={tab.href} href={tab.href} aria-current={on ? "page" : undefined} className="flex flex-col gap-3 text-sm">
            <span className={on ? "font-bold text-white" : "text-white/60 hover:text-white"}>{tab.label}</span>
            <span className={`h-0.5 w-full ${on ? "bg-white" : "bg-transparent"}`} />
          </Link>
        );
      })}
    </nav>
  );
}
