"use client";

import { ChartNoAxesColumnIncreasing, Info } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { openContentDetail } from "../_components/content-detail-modal";
import { ExpandButton, ListEnd, RangeHeader, useExpand } from "../_components/expand-list";
import { GenreSelect, PlatformFilter, ResultInfo, SectionTitle, SegmentedToggle, UnderlineTabs } from "../_components/filter-bar";
import { PosterCard, RankChange } from "../_components/poster-card";
import { PageContainer, SiteShell } from "../_components/site-shell";
import { EmptyState, ErrorState, LoadingCards } from "../_components/status-view";
import { TopPickSection } from "../_components/top-pick-card";
import { CONTENT_TYPE_OPTIONS, type ContentTypeFilter } from "../_lib/catalog";
import { fetchTotalRanking, formatRankedOn, type RankingPeriod, type TotalRanking, type TotalRankingItem } from "../_lib/ranking";
import type { PlatformCode } from "../_lib/viewfit";

/* ============================================================================
 * 6-1 통합 랭킹 (Figma "ViewFit 통합 랭킹" 144:6421) — 담당: 정준교
 *   소개 + 먼저 만나보는 TOP 3 → 랭킹 탭 → 필터(주간/월간·유형·OTT·장르) → 1–20위 → [펼치기] 20개씩 → [맨 위로]
 * Figma 의 '샘플' 문구는 실제 집계일 기준 문구로 바꿨습니다 (PRD 6-1 5번).
 * ========================================================================== */

const PAGE_STEP = 20;
const PERIOD_OPTIONS: { value: RankingPeriod; label: string }[] = [
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월간" },
];
/** Figma 144:6508 위쪽 랭킹 탭 */
const RANKING_TABS = [
  { href: "/ranking", label: "통합 랭킹" },
  { href: "/recommend", label: "맞춤 추천" },
  { href: "/generation", label: "세대별 평점" },
];

const typeLabel = (t: string) => (t === "movie" ? "영화" : "시리즈");
const scoreText = (score: number | null) => (score === null ? "—" : score.toFixed(1));

export default function RankingPage() {
  const [period, setPeriod] = useState<RankingPeriod>("weekly");
  const [type, setType] = useState<ContentTypeFilter>("all");
  const [platform, setPlatform] = useState<PlatformCode | null>(null);
  const [genre, setGenre] = useState<string | null>(null);

  const [data, setData] = useState<TotalRanking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const retry = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setError(null);
    setData(null);
    fetchTotalRanking({ period, type, platform, genre }, ctrl.signal)
      .then(setData)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
  }, [period, type, platform, genre, reload]);

  const filtered = type !== "all" || platform !== null || genre !== null;
  const basis = data?.sample ? "샘플 랭킹" : data?.ranked_on ? `${formatRankedOn(data.ranked_on)} 기준` : null;

  return (
    <SiteShell>
      {/* ---------- 소개 + TOP 3 (Figma Ranking introduction 144:6444) ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 90% at 78% 0%, rgba(37,58,120,0.55) 0%, rgba(10,10,10,0) 70%)" }}
        />
        <PageContainer className="relative flex flex-col gap-7 pb-8 pt-12">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.88px] text-[#f0abfc]">
              <ChartNoAxesColumnIncreasing className="h-4 w-4" />
              VIEWFIT TOP 100
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[34px] font-bold leading-tight tracking-[-0.88px] text-white md:text-[44px]">지금, 모두가 궁금한 이야기</h1>
              {basis && (
                <span className="flex items-center gap-1.5 rounded-full border border-white/[0.15] bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-[#f0abfc]">
                  <Info className="h-3.5 w-3.5" />
                  {basis}
                </span>
              )}
            </div>
            <p className="text-[15px] text-white/60">영화부터 시리즈까지, 여러 OTT의 이야기를 한눈에. 통합 랭킹 1위부터 100위까지 만나보세요.</p>
          </div>

          {data && data.items.length > 0 && (
            <TopPickSection
              heading="먼저 만나보는 TOP 3"
              note={data.sample ? "가상 작품 · 콘셉트 이미지" : filtered ? "선택한 조건 안의 TOP 3" : undefined}
              picks={data.items.slice(0, 3).map((item) => ({
                rank: item.rank,
                title: item.movie.title,
                meta: [typeLabel(item.movie.content_type), item.movie.genres[0]?.name, item.movie.release_year].filter(Boolean).join(" · "),
                platform: item.movie.platforms[0]?.code,
                imageUrl: item.movie.backdrop_url || item.movie.poster_url,
                metric: { name: "지수", value: scoreText(item.score) },
                onClick: () => openContentDetail(item.movie, `통합 랭킹 · ${item.rank}위`),
              }))}
            />
          )}

          <p className="flex items-start gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/60">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#f0abfc]" />
            {data?.sample
              ? "화면 구성을 위한 샘플입니다. 작품명·순위·변동·지수·OTT 표기는 가상 예시이며, 실제 인기 순위나 서비스 제공 여부를 의미하지 않습니다."
              : `ViewFit 지수는 TMDB 인기도 순위(70%)와 ViewFit 회원 평점(30%)으로 계산해요. 평가가 적은 작품은 전체 평균 쪽으로 보정합니다.${
                  data?.ranked_on ? ` · ${formatRankedOn(data.ranked_on)} 집계` : ""
                }`}
          </p>
        </PageContainer>
      </section>

      {/* ---------- 전체 랭킹 (Figma Complete ranking 144:6508) ---------- */}
      <PageContainer className="flex flex-col gap-6 pb-16">
        <nav aria-label="랭킹 종류" className="flex gap-7 border-b border-white/[0.12]">
          {RANKING_TABS.map((tab) => {
            const active = tab.href === "/ranking";
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className="flex flex-col gap-3 text-sm">
                <span className={active ? "font-bold text-white" : "text-white/60 hover:text-white"}>{tab.label}</span>
                <span className={`h-0.5 w-full ${active ? "bg-white" : "bg-transparent"}`} />
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-5">
          <SectionTitle
            title="통합 랭킹"
            sub="TOP 100"
            right={<SegmentedToggle label="집계 기간" value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />}
          />
          <UnderlineTabs
            label="작품 유형"
            value={type}
            onChange={setType}
            options={CONTENT_TYPE_OPTIONS.map((o) => ({ ...o, count: o.value === type && data ? data.total : undefined }))}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PlatformFilter value={platform} onChange={setPlatform} />
            <GenreSelect value={genre} onChange={setGenre} />
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : !data ? (
          <LoadingCards rows={2} count={5} />
        ) : !data.ranked_on && !data.sample ? (
          <EmptyState title="아직 랭킹을 집계하지 않았어요" description="python manage.py build_rankings 로 집계하면 여기에 TOP 100이 나타나요." />
        ) : data.items.length === 0 ? (
          <EmptyState title="조건에 맞는 작품이 없어요" description="OTT나 장르를 바꿔 보세요." />
        ) : (
          <RankingList key={`${period}-${type}-${platform}-${genre}-${data.ranked_on}`} data={data} />
        )}
      </PageContainer>
    </SiteShell>
  );
}

/** 1–20위 → [펼치기] 20개씩 → 끝 + [맨 위로] (Figma Card group · Expand button · Ranking end) */
function RankingList({ data }: { data: TotalRanking }) {
  const total = data.items.length;
  const list = useExpand(total, PAGE_STEP);
  const groups: TotalRankingItem[][] = [];
  for (let i = 0; i < list.visible; i += PAGE_STEP) groups.push(data.items.slice(i, Math.min(i + PAGE_STEP, list.visible)));
  const nextFrom = list.visible + 1;
  const nextTo = Math.min(list.visible + PAGE_STEP, total);

  return (
    <div className="flex flex-col gap-6">
      <ResultInfo
        left={
          <>
            총 <b>{total}</b>개 작품 · 1–{list.visible}위 표시
          </>
        }
        right={data.sample ? "샘플 지수 높은 순 · 변동은 가상 비교값" : "ViewFit 지수 높은 순 · 변동은 지난 집계 대비"}
      />
      {groups.map((group, gi) => {
        const from = gi * PAGE_STEP + 1;
        return (
          <section key={from} className="flex flex-col gap-5">
            <RangeHeader from={from} to={from + group.length - 1} shown={gi === 0 ? list.visible : undefined} total={gi === 0 ? total : undefined} />
            <div className="flex flex-wrap gap-x-4 gap-y-5 md:max-w-[1014px]">
              {group.map((item) => (
                <PosterCard
                  key={item.movie.id}
                  rank={item.rank}
                  title={item.movie.title}
                  posterUrl={item.movie.poster_url}
                  platforms={item.movie.platforms.map((p) => p.code)}
                  stat={<>★ {data.sample ? "샘플 " : ""}지수 {scoreText(item.score)}</>}
                  trailing={<RankChange change={item.rank_change} isNew={item.is_new} />}
                  onClick={() => openContentDetail(item.movie, `통합 랭킹 · ${item.rank}위`)}
                />
              ))}
            </div>
          </section>
        );
      })}
      {list.hasMore ? (
        <ExpandButton
          from={nextFrom}
          to={nextTo}
          hint={nextTo === total ? `마지막 ${nextTo - nextFrom + 1}개 작품` : undefined}
          onClick={list.expand}
        />
      ) : (
        <ListEnd
          title={`${total}개의 이야기, 다음엔 어떤 작품을 볼까요?`}
          note={
            data.sample
              ? `1위부터 ${total}위까지 모두 확인했어요. 이 목록은 실제 집계가 아닌 샘플 랭킹입니다.`
              : `1위부터 ${total}위까지 모두 확인했어요. ViewFit 지수 · ${data.ranked_on ? formatRankedOn(data.ranked_on) : ""} 기준`
          }
        />
      )}
    </div>
  );
}
