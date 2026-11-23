"use client";

import { Info, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { openContentDetail } from "../_components/content-detail-modal";
import { ExpandButton, ListEnd, RangeHeader, useExpand } from "../_components/expand-list";
import { GenreSelect, PlatformFilter, ResultInfo, SectionTitle } from "../_components/filter-bar";
import { PosterCard } from "../_components/poster-card";
import { RankingTabs } from "../_components/ranking-tabs";
import { PageContainer, SiteShell } from "../_components/site-shell";
import { EmptyState, ErrorState, LoadingCards } from "../_components/status-view";
import { TopPickSection } from "../_components/top-pick-card";
import { CONTENT_TYPE_OPTIONS, type ContentTypeFilter } from "../_lib/catalog";
import { GENERATION_AGES, fetchGenerationRanking, type GenerationRanking, type GenerationRankingItem } from "../_lib/ranking";
import { AGE_GROUP_META, type AgeGroup, type PlatformCode } from "../_lib/viewfit";

/* ============================================================================
 * 6-2 세대별 랭킹 (Figma "세대별 평점" 144:33778) — 담당: 정준교
 *   소개 + "OO대가 높게 평가한 TOP 3" → 랭킹 탭 → 연령대 · 유형 · OTT · 장르 → 1–20위 → [펼치기] 21–30
 * 평균은 평가할 당시 연령대로 계산 (평가 3개 이상). Figma 의 '샘플 평점' 문구는 실제 기준 문구로 바꿈.
 * ========================================================================== */

const PAGE_STEP = 20;
const TYPE_LABEL: Record<ContentTypeFilter, string> = { all: "전체 작품", movie: "영화", series: "시리즈" };

const typeLabel = (t: string) => (t === "movie" ? "영화" : "시리즈");
const avgText = (n: number) => n.toFixed(2);

/** 상자 모양 선택 버튼 줄 (Figma 연령대 · 유형 칩) */
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-8 rounded-md border px-3 text-xs transition ${
              active ? "border-white/[0.15] bg-white/10 font-bold text-white" : "border-white/[0.12] text-white/60 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function GenerationPage() {
  const [age, setAge] = useState<AgeGroup | null>(null); // null = 서버가 정함 (내 연령대 → 20대)
  const [type, setType] = useState<ContentTypeFilter>("all");
  const [platform, setPlatform] = useState<PlatformCode | null>(null);
  const [genre, setGenre] = useState<string | null>(null);

  const [data, setData] = useState<GenerationRanking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const retry = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setError(null);
    setData(null);
    fetchGenerationRanking({ age, type, platform, genre }, ctrl.signal)
      .then(setData)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctrl.abort();
  }, [age, type, platform, genre, reload]);

  // 처음엔 서버가 고른 연령대(내 연령대 → 없으면 20대)를 탭에 표시
  const shownAge: AgeGroup = age ?? data?.age ?? "20s";
  const ageLabel = AGE_GROUP_META[shownAge].label;
  const basis = data?.sample ? "샘플 평점" : "평균 평점 · 평가 3개 이상";

  return (
    <SiteShell>
      {/* ---------- 소개 + TOP 3 ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 60% 90% at 78% 0%, rgba(37,58,120,0.55) 0%, rgba(10,10,10,0) 70%)" }}
        />
        <PageContainer className="relative flex flex-col gap-7 pb-8 pt-12">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.88px] text-[#f0abfc]">
              <Users className="h-4 w-4" />
              VIEWFIT GENERATION TOP 30
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-[34px] font-bold leading-tight tracking-[-0.88px] text-white md:text-[44px]">세대마다, 마음에 남는 이야기</h1>
              <span className="rounded-md border border-white/[0.15] bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-[#f0abfc]">{basis}</span>
            </div>
            <p className="text-[15px] text-white/60">10대부터 60대 이상까지, 나이대별로 다르게 빛나는 작품. 세대별 평점 TOP 30을 만나보세요.</p>
          </div>

          {data && data.items.length > 0 && (
            <TopPickSection
              heading={`${ageLabel}가 높게 평가한 TOP 3`}
              note={data.sample ? "가상 작품 · 콘셉트 이미지" : undefined}
              picks={data.items.slice(0, 3).map((item) => ({
                rank: item.rank,
                title: item.movie.title,
                meta: [typeLabel(item.movie.content_type), item.movie.genres[0]?.name, item.movie.release_year].filter(Boolean).join(" · "),
                platform: item.movie.platforms[0]?.code,
                imageUrl: item.movie.backdrop_url || item.movie.poster_url,
                label: "TOP PICK",
                metric: { name: "평점", value: avgText(item.average) },
                onClick: () => openContentDetail(item.movie, `세대별 평점 · ${ageLabel} ${item.rank}위`),
              }))}
            />
          )}

          <p className="flex items-start gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-white/60">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#f0abfc]" />
            {data?.sample
              ? "화면 구성을 위한 샘플입니다. 작품명·순위·평점·OTT 표기는 가상 예시이며, 실제 세대별 평가나 서비스 제공 여부를 의미하지 않습니다."
              : "평점을 남길 때의 연령대로 묶어 평균을 냈어요. 평가가 3개 이상인 작품만 순위에 들어가요. 작품을 누르면 다른 세대 평균과 비교할 수 있어요."}
          </p>
        </PageContainer>
      </section>

      {/* ---------- 세대별 평점 TOP 30 ---------- */}
      <PageContainer className="flex flex-col gap-6 pb-16">
        <RankingTabs active="/generation" />

        <div className="flex flex-col gap-5">
          <SectionTitle title="세대별 평점" sub="TOP 30" right={<p className="text-[11px] text-white/50">{basis} · 5점 만점</p>} />
          <ChipGroup
            label="연령대"
            value={age ?? data?.age ?? null}
            onChange={setAge}
            options={GENERATION_AGES.map((a) => ({ value: a, label: AGE_GROUP_META[a].label }))}
          />
          <ChipGroup
            label="작품 유형"
            value={type}
            onChange={setType}
            options={CONTENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: TYPE_LABEL[o.value] }))}
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
        ) : data.items.length === 0 ? (
          <EmptyState
            title="아직 평가가 모이고 있어요"
            description={`${ageLabel} 회원의 평가가 3개 이상 모인 작품이 생기면 여기에 순위가 나타나요.`}
          />
        ) : (
          <GenerationList key={`${data.age}-${type}-${platform}-${genre}`} data={data} />
        )}
      </PageContainer>
    </SiteShell>
  );
}

/** 1–20위 → [펼치기] 21–30 → 끝 (Figma Card group · Expand · 끝 안내) */
function GenerationList({ data }: { data: GenerationRanking }) {
  const total = data.items.length;
  const list = useExpand(total, PAGE_STEP);
  const ageLabel = AGE_GROUP_META[data.age].label;
  const groups: GenerationRankingItem[][] = [];
  for (let i = 0; i < list.visible; i += PAGE_STEP) groups.push(data.items.slice(i, Math.min(i + PAGE_STEP, list.visible)));
  const nextTo = Math.min(list.visible + PAGE_STEP, total);

  return (
    <div className="flex flex-col gap-6">
      <ResultInfo
        left={
          <>
            {ageLabel} · 총 <b>{total}</b>개 작품 · 1–{list.visible}위 표시
          </>
        }
        right={data.sample ? "샘플 평점 높은 순 · 실제 평가 데이터 아님" : "평균 평점 높은 순 · 같으면 평가 수 많은 순"}
      />
      {groups.map((group, gi) => {
        const from = gi * PAGE_STEP + 1;
        return (
          <section key={from} className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <RangeHeader from={from} to={from + group.length - 1} />
              {gi === 0 && <span className="text-[11px] text-white/50">{ageLabel} 평균 평점 높은 순</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-5 md:max-w-[1014px]">
              {group.map((item) => (
                <PosterCard
                  key={item.movie.id}
                  rank={item.rank}
                  title={item.movie.title}
                  posterUrl={item.movie.poster_url}
                  platforms={item.movie.platforms.map((p) => p.code)}
                  stat={
                    <>
                      ★ {data.sample ? "샘플 " : ""}평점 {avgText(item.average)}
                      <span className="text-white/40"> · {item.count}명</span>
                    </>
                  }
                  onClick={() => openContentDetail(item.movie, `세대별 평점 · ${ageLabel} ${item.rank}위`)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {list.hasMore ? (
        <ExpandButton from={list.visible + 1} to={nextTo} hint={`다음 ${nextTo - list.visible}개 작품`} onClick={list.expand} />
      ) : (
        <ListEnd
          title={`${total}개의 이야기를 모두 만나봤어요.`}
          note={total < 30 ? "아직 평가가 모이고 있어요. 평가가 3개 이상 모인 작품만 순위에 들어가요." : `${ageLabel}가 높게 평가한 TOP 30이에요.`}
        />
      )}

      {data.has_demo && (
        <p className="flex items-center gap-2 text-xs text-white/50">
          <Info className="h-3.5 w-3.5" />
          시연용 가상 평점이 포함되어 있어요
        </p>
      )}
    </div>
  );
}
