"use client";

import { useState, type ReactNode } from "react";
import { Flame } from "lucide-react";
import { CONTENT_TYPE_OPTIONS, PLATFORM_ORDER, type ContentTypeFilter } from "../../_lib/catalog";
import { MOCK_HOME_FEED_RESPONSE, type PlatformCode } from "../../_lib/viewfit";
import { ContentRow } from "../../_components/content-row";
import { ExpandButton, ListEnd, RangeHeader, useExpand } from "../../_components/expand-list";
import { GenreSelect, PlatformFilter, ResultInfo, SectionTitle, SegmentedToggle, UnderlineTabs } from "../../_components/filter-bar";
import { Modal } from "../../_components/modal";
import { Pagination } from "../../_components/pagination";
import { PlatformBadge } from "../../_components/platform-badge";
import { PosterCard, RankChange } from "../../_components/poster-card";
import { PageContainer, SiteShell } from "../../_components/site-shell";
import { StarRating } from "../../_components/star-rating";
import { EmptyState, ErrorState, LoadingCards } from "../../_components/status-view";
import { TopPickSection } from "../../_components/top-pick-card";

/* ============================================================================
 * 0-3 공통 부품 모음 — http://localhost:3000/dev/components
 * 1~8번 담당자는 화면을 만들기 전에 여기서 쓸 수 있는 부품을 확인하세요. (예시 데이터)
 * ========================================================================== */

const ranking = MOCK_HOME_FEED_RESPONSE.data.rankings;

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-white/10 py-10">
      <h2 className="text-sm font-bold text-[#f0abfc]">
        {id} · {title}
      </h2>
      {children}
    </section>
  );
}

export default function ComponentsPage() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [type, setType] = useState<ContentTypeFilter>("all");
  const [platform, setPlatform] = useState<PlatformCode | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const list = useExpand(100);

  return (
    <SiteShell>
      <PageContainer className="py-12">
        <h1 className="text-3xl font-black tracking-tight">공통 부품 모음</h1>
        <p className="mt-2 text-sm text-white/60">
          0번 공통 기반(0-3)에서 만든 부품입니다. 파일 위치: <code className="text-white/80">app/_components/</code>
        </p>

        <Block id="FR1~FR4" title="상단 바 · 프로필 메뉴 · 하단 (site-header / profile-menu / site-footer)">
          <p className="text-sm text-white/60">이 페이지 맨 위·맨 아래가 공통 상단 바와 하단입니다. 로그인한 상태에서 오른쪽 위 프로필 버튼을 누르면 프로필 메뉴가 열립니다.</p>
        </Block>

        <Block id="FR5·FR6" title="작품 카드 · 순위 카드 (poster-card)">
          <div className="flex flex-wrap gap-4">
            <PosterCard title="포스터 없는 작품" platforms={["NETFLIX"]} stat="★ 4.7 · 2025" trailing={<RankChange change={0} isNew />} />
            {ranking.slice(0, 4).map((r) => (
              <PosterCard
                key={r.rank}
                rank={r.rank}
                title={r.movie.title}
                posterUrl={r.movie.poster_url}
                platforms={r.movie.platforms.map((p) => p.code)}
                stat={`★ ${r.movie.rating.overall.toFixed(1)} · ${r.movie.release_year}`}
                trailing={<RankChange change={r.rank_change} isNew={r.is_new} />}
              />
            ))}
          </div>
        </Block>

        <Block id="FR7" title="TOP 3 큰 카드 (top-pick-card)">
          <TopPickSection
            heading="먼저 만나보는 TOP 3"
            note="예시 데이터"
            picks={ranking.slice(0, 3).map((r) => ({
              rank: r.rank,
              title: r.movie.title,
              meta: `${r.movie.content_type === "movie" ? "영화" : "시리즈"} · ${r.movie.genres[0]?.name ?? ""} · ${r.movie.release_year}`,
              platform: r.movie.platforms[0]?.code,
              imageUrl: r.movie.backdrop_url,
              metric: { name: "지수", value: (99 - r.rank * 0.6).toFixed(1) },
            }))}
          />
        </Block>

        <Block id="FR8" title="OTT 뱃지 (platform-badge)">
          <div className="flex flex-wrap gap-2">
            {PLATFORM_ORDER.map((code) => (
              <PlatformBadge key={code} code={code} />
            ))}
          </div>
        </Block>

        <Block id="FR9" title="필터 바 (filter-bar)">
          <div className="flex flex-col gap-5">
            <SectionTitle
              title="통합 랭킹"
              sub="TOP 100"
              right={
                <SegmentedToggle
                  label="집계 기간"
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: "weekly", label: "주간" },
                    { value: "monthly", label: "월간" },
                  ]}
                />
              }
            />
            <UnderlineTabs
              label="작품 유형"
              value={type}
              onChange={setType}
              options={CONTENT_TYPE_OPTIONS.map((o) => ({ ...o, count: o.value === "all" ? 100 : undefined }))}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <PlatformFilter value={platform} onChange={setPlatform} />
              <GenreSelect value={genre} onChange={setGenre} />
            </div>
            <ResultInfo
              left={
                <>
                  총 <b>100</b>개 작품 · 1–100위 전체 표시
                </>
              }
              right="ViewFit 지수 높은 순"
            />
            <p className="text-xs text-white/40">
              선택값: {period} / {type} / {platform ?? "전체 OTT"} / {genre ?? "모든 장르"}
            </p>
          </div>
        </Block>

        <Block id="FR10" title="펼치기 목록 (expand-list)">
          <RangeHeader from={1} to={list.visible} shown={list.visible} total={100} />
          {list.hasMore ? (
            <ExpandButton from={list.visible + 1} to={Math.min(list.visible + 20, 100)} onClick={list.expand} />
          ) : (
            <ListEnd title="100개의 이야기, 다음엔 어떤 작품을 볼까요?" note="1위부터 100위까지 모두 확인했어요." />
          )}
        </Block>

        <Block id="FR11" title="페이지 번호 (pagination)">
          <Pagination page={page} pageSize={4} total={24} onChange={setPage} />
        </Block>

        <Block id="FR12" title="팝업 틀 (modal)">
          <button type="button" onClick={() => setModal(true)} className="rounded-md bg-white/10 px-4 py-2 text-sm font-bold text-[#f0abfc]">
            팝업 열기
          </button>
          <Modal open={modal} onClose={() => setModal(false)} eyebrow={<p className="text-sm font-bold text-[#f0abfc]">예시 팝업</p>} title="이번 작품은 어떠셨나요?">
            <p className="text-white/70">Esc 를 누르거나 바깥을 누르면 닫혀요.</p>
          </Modal>
        </Block>

        <Block id="FR13" title="별점 표시 (star-rating)">
          <div className="flex flex-wrap gap-6">
            <StarRating value={5} showValue />
            <StarRating value={3.5} showValue />
            <StarRating value={0.5} size={20} showValue />
          </div>
        </Block>

        <Block id="FR14" title="상태 표시 (status-view)">
          <LoadingCards count={4} />
          <EmptyState title="아직 남긴 평점이 없어요" description="본 작품에 별점을 남기면 여기에서 모아 볼 수 있어요." action={{ label: "작품 둘러보기", href: "/" }} />
          <ErrorState message="정보를 불러오지 못했어요." onRetry={() => undefined} />
        </Block>

        <Block id="기타" title="가로 카드 줄 (content-row)">
          <div className="-mx-4 md:-mx-12">
            <ContentRow title="오늘의 통합 OTT랭킹 TOP 10" subtitle="예시 데이터" icon={<Flame className="h-6 w-6 text-rose-500" />} seeAllHref="/ranking">
              {ranking.map((r) => (
                <PosterCard key={r.rank} rank={r.rank} title={r.movie.title} posterUrl={r.movie.poster_url} platforms={r.movie.platforms.map((p) => p.code)} />
              ))}
            </ContentRow>
          </div>
        </Block>
      </PageContainer>
    </SiteShell>
  );
}
