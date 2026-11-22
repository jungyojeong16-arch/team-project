"use client";

import { Info, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { openContentDetail } from "../_components/content-detail-modal";
import { ExpandButton, RangeHeader, useExpand } from "../_components/expand-list";
import { ChipGroup, GenreSelect, PlatformFilter, ResultInfo, SectionTitle } from "../_components/filter-bar";
import { openLoginModal } from "../_components/login-modal";
import { PosterCard } from "../_components/poster-card";
import { PageContainer, SiteShell } from "../_components/site-shell";
import { EmptyState, ErrorState, LoadingCards } from "../_components/status-view";
import { TopPickSection } from "../_components/top-pick-card";
import { TPO_NAMES } from "../_lib/catalog";
import { useAccount } from "../_lib/use-account";
import {
  ALL_SITUATIONS,
  RequestError,
  fetchRecommendations,
  type ContentType,
  type Movie,
  type PlatformCode,
  type RecommendationItem,
  type RecommendationList,
} from "../_lib/viewfit";

/* ============================================================================
 * 7-1 맞춤 추천 (TPO TOP 50) — Figma "ViewFit 맞춤 추천" 144:36577
 * ① 소개: 제목 + "이런 순간, 이런 작품" TOP 3 (전체 상황 1~3위) + 추천 방법 안내
 * ② 목록: 상황 칩 · 작품 유형 · OTT · 장르 → 1–20위, [펼치기] 21–40, 41–50 (상황 라벨 + 한 줄 이유)
 * 데이터: GET /api/v1/recommendations/ (로그인 + 취향 설문 필요 — 안 했으면 로그인 창 / 설문으로)
 * Figma 의 "샘플 추천 · 실제 개인화 데이터 아님" 문구는 실제 추천이라 뺐습니다 (PRD 5번).
 * ========================================================================== */

type Filters = { tpo: string; type: ContentType | "all"; platform: PlatformCode | null; genre: string | null };

const DEFAULT_FILTERS: Filters = { tpo: ALL_SITUATIONS, type: "all", platform: null, genre: null };
const isDefault = (f: Filters) => f.tpo === ALL_SITUATIONS && f.type === "all" && !f.platform && !f.genre;

const SITUATION_OPTIONS = [ALL_SITUATIONS, ...TPO_NAMES].map((name) => ({ value: name, label: name }));
const TYPE_OPTIONS: { value: Filters["type"]; label: string }[] = [
  { value: "all", label: "전체 작품" },
  { value: "movie", label: "영화" },
  { value: "series", label: "시리즈" },
];
const TYPE_LABEL: Record<ContentType, string> = { movie: "영화", series: "시리즈" };
const GROUP_SIZE = 20;

/** "시리즈 · 로맨스" (+ 공개연도) */
const metaOf = (movie: Movie, withYear = false) =>
  [TYPE_LABEL[movie.content_type], movie.genres[0]?.name, withYear ? movie.release_year : null].filter(Boolean).join(" · ");

const openDetail = (item: RecommendationItem) => openContentDetail(item.content, `맞춤 추천 · ${item.situation_label}`);

/* ============================================================================
 * Page — 로그인·설문 확인 (FR8)
 * ========================================================================== */

export default function RecommendPage() {
  const router = useRouter();
  const { account, ready } = useAccount();

  useEffect(() => {
    if (!ready) return;
    if (!account) openLoginModal();
    else if (!account.survey_completed) router.replace("/onboarding");
  }, [ready, account, router]);

  return (
    <SiteShell>
      {!ready || (account && !account.survey_completed) ? (
        <div className="min-h-[70vh]" />
      ) : account ? (
        <RecommendView nickname={account.nickname} />
      ) : (
        <>
          <Intro>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.12] px-6 py-14 text-center">
              <p className="text-base font-bold text-white">로그인하면 나에게 꼭 맞는 TOP 50을 볼 수 있어요</p>
              <p className="text-sm text-white/55">취향 설문을 바탕으로 상황별 추천을 매일 새로 골라 드려요.</p>
              <button
                type="button"
                onClick={openLoginModal}
                className="mt-2 rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-[#f0abfc] transition hover:bg-white/[0.15]"
              >
                로그인
              </button>
            </div>
          </Intro>
          <div className="pb-12" />
        </>
      )}
    </SiteShell>
  );
}

/* ============================================================================
 * 추천 화면
 * ========================================================================== */

function RecommendView({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [list, setList] = useState<RecommendationList | null>(null);
  const [featured, setFeatured] = useState<RecommendationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchRecommendations({ ...filters, limit: 50 }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setList(data);
        // TOP 3 는 전체 상황·필터 없음 묶음의 1~3위 (칩을 바꿔도 그대로)
        if (isDefault(filters)) setFeatured(data.results.slice(0, 3));
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        if (e instanceof RequestError && e.status === 403) return router.replace("/onboarding");
        if (e instanceof RequestError && e.status === 401) openLoginModal();
        setError(e instanceof Error ? e.message : "추천을 불러오지 못했어요.");
      })
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [filters, reloadKey, router]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <>
      <Intro>
        {featured === null ? (
          <FeaturedSkeleton />
        ) : (
          featured.length > 0 && (
            <TopPickSection
              heading="이런 순간, 이런 작품"
              note={`${nickname}님 취향 · 전체 상황 TOP 3`}
              picks={featured.map((item, i) => ({
                rank: i + 1,
                title: item.content.title,
                meta: metaOf(item.content, true),
                platform: item.content.platforms[0]?.code,
                imageUrl: item.content.backdrop_url || item.content.poster_url,
                label: item.situation_label,
                plainLabel: true,
                note: item.reason,
                onClick: () => openDetail(item),
              }))}
            />
          )
        )}
      </Intro>

      {/* Figma "TPO 추천 전체 순위" 144:36660 — 줄 사이 24 */}
      <PageContainer className="flex flex-col gap-6 pb-12">
        <PageTabs />
        <SectionTitle title="맞춤 추천" sub="TOP 50" right={<p className="text-xs text-white/60">시간 · 장소 · 상황별 큐레이션</p>} />
        <ChipGroup label="상황 선택" options={SITUATION_OPTIONS} value={filters.tpo} onChange={(tpo) => update({ tpo })} />
        <ChipGroup label="작품 유형" options={TYPE_OPTIONS} value={filters.type} onChange={(type) => update({ type })} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlatformFilter value={filters.platform} onChange={(platform) => update({ platform })} />
          <GenreSelect value={filters.genre} onChange={(genre) => update({ genre })} />
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : !list ? (
          <LoadingCards count={5} />
        ) : list.count === 0 ? (
          <EmptyState
            title={isDefault(filters) ? "지금은 추천할 작품이 없어요" : "조건에 맞는 추천 작품이 없어요"}
            description={isDefault(filters) ? "볼 수 있는 작품을 모두 평가했거나, 아직 작품 데이터가 없어요." : "상황이나 필터를 바꿔 보세요."}
          />
        ) : (
          <div className={`transition-opacity ${loading ? "pointer-events-none opacity-50" : ""}`} aria-busy={loading}>
            {/* 새 목록을 받으면 펼친 상태를 처음(1–20위)으로 */}
            <RecommendList key={`${list.tpo}|${filters.type}|${filters.platform}|${filters.genre}|${list.recommended_at}`} list={list} />
          </div>
        )}
      </PageContainer>
    </>
  );
}

/** ① 소개 영역 (Figma "Ranking introduction" 144:36600) — 위 48 · 아래 32 · 사이 28 */
function Intro({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 115% at 80% 10%, rgba(24,53,100,0.6) 0%, rgba(17,32,55,0.3) 50%, rgba(10,10,10,0) 100%)" }}
      />
      <PageContainer className="relative flex flex-col gap-7 pb-8 pt-12">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.96px] text-[#f0abfc]">
            <Sparkles className="h-4 w-4" strokeWidth={1.7} aria-hidden />
            VIEWFIT TPO TOP 50
          </p>
          <h1 className="text-[30px] font-black leading-tight tracking-[-1.32px] text-white md:text-[44px]">지금 이 순간에 딱 맞는 이야기</h1>
          <p className="text-[15px] leading-[1.6] text-white/60">
            혼자 보내는 밤부터 함께하는 주말까지. 시간·장소·상황에 어울리는 영화와 시리즈 TOP 50을 만나보세요.
          </p>
        </div>
        {children}
        <div className="flex items-center gap-2.5 rounded-md border border-white/[0.12] bg-white/[0.02] px-4 py-[13px]">
          <Info className="h-4 w-4 shrink-0 text-[#f0abfc]" strokeWidth={1.7} aria-hidden />
          <p className="text-xs leading-[1.6] text-white/60">
            선호·비선호 장르, 기억에 남는 작품, 좋아요와 평점, 내 연령대의 평점을 바탕으로 매일 새로 골라요. 이미 평가했거나 본 작품은 빼고 추천해요.
          </p>
        </div>
      </PageContainer>
    </section>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3.5" role="status" aria-label="불러오는 중">
      <div className="h-5 w-40 rounded bg-white/10" />
      <div className="flex flex-col gap-4 md:flex-row">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[262px] flex-1 rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}

/** 통합 랭킹 · 맞춤 추천 · 세대별 평점 (Figma "Ranking navigation" 144:36661) */
function PageTabs() {
  const tabs = [
    { href: "/ranking", label: "통합 랭킹" },
    { href: "/recommend", label: "맞춤 추천", active: true },
    { href: "/generation", label: "세대별 평점" },
  ];
  return (
    <nav aria-label="랭킹·추천 화면" className="flex gap-7 border-b border-white/[0.12]">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`flex flex-col gap-3 text-sm ${tab.active ? "font-bold text-white" : "text-white/60 hover:text-white"}`}
        >
          {tab.label}
          <span className={`h-0.5 w-full ${tab.active ? "bg-white" : "bg-transparent"}`} />
        </Link>
      ))}
    </nav>
  );
}

/* ============================================================================
 * ② 목록 — 20개씩 묶음 + [펼치기] + 진행 표시
 * ========================================================================== */

function RecommendList({ list }: { list: RecommendationList }) {
  const total = list.results.length;
  const { visible, hasMore, expand } = useExpand(total, GROUP_SIZE);
  const groups = Array.from({ length: Math.ceil(visible / GROUP_SIZE) }, (_, g) => list.results.slice(g * GROUP_SIZE, Math.min((g + 1) * GROUP_SIZE, visible)));
  const madeAt = list.recommended_at
    ? new Date(list.recommended_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <ResultInfo
        left={
          <>
            {list.tpo} · 총 {total}개 작품 · 1–{visible}위 표시
          </>
        }
        right={madeAt ? `오늘 ${madeAt}에 만든 추천 · 취향 점수 순` : "취향 점수 순"}
      />

      {groups.map((items, g) => (
        <section key={g} className="flex flex-col gap-5" aria-label={`${g * GROUP_SIZE + 1}–${g * GROUP_SIZE + items.length}위`}>
          <RangeHeader accent from={g * GROUP_SIZE + 1} to={g * GROUP_SIZE + items.length} note="상황별 큐레이션 · 취향 점수 순" />
          {/* 카드 폭 고정, 한 줄에 최대 5개 (Figma 1440 화면: 190 × 5 + 16 × 4 = 1014) */}
          <div className="flex max-w-[1014px] flex-wrap gap-x-4 gap-y-5">
            {items.map((item, i) => (
              <RecommendCard key={item.content.id} item={item} position={g * GROUP_SIZE + i + 1} />
            ))}
          </div>
        </section>
      ))}

      {hasMore && <ExpandButton from={visible + 1} to={Math.min(visible + GROUP_SIZE, total)} onClick={expand} />}

      {/* Figma "Ranking progress" 144:37604 */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pb-2 pt-7">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-white">
            {total}개의 이야기 중 {visible}개를 만나봤어요.
          </p>
          <p className="text-xs text-white/50">
            {hasMore ? "아래 순위는 펼치기로 이어서 확인하세요." : "오늘의 맞춤 추천을 모두 확인했어요. 내일 새로운 추천을 만나보세요."}
          </p>
        </div>
        <div className="flex w-[180px] flex-col gap-2">
          <p className="text-right text-xs text-white/60">
            {visible} / {total} 표시 중
          </p>
          <div className="h-[3px] w-full overflow-hidden rounded-sm bg-white/[0.12]">
            <div className="h-full bg-[#f0abfc] transition-[width]" style={{ width: `${(visible / total) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 순위 카드 + 상황 라벨 + 한 줄 이유 (Figma "Ranked work" 144:36732) */
function RecommendCard({ item, position }: { item: RecommendationItem; position: number }) {
  const movie = item.content;
  return (
    <div className="flex w-[140px] flex-col gap-2 sm:w-[160px] md:w-[190px]">
      <PosterCard
        title={movie.title}
        posterUrl={movie.poster_url}
        platforms={movie.platforms.map((p) => p.code)}
        rank={position}
        stat={metaOf(movie)}
        onClick={() => openDetail(item)}
      />
      <div className="flex flex-col gap-1.5 text-[11px]">
        <p className="font-bold text-[#f0abfc]">{item.situation_label}</p>
        <p className="leading-[1.5] text-white/60">{item.reason}</p>
      </div>
    </div>
  );
}
