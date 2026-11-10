"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHomeFeed, type HomeFeed, type Movie } from "./_lib/viewfit";
import { SiteShell } from "./_components/site-shell";
import { ErrorState, LoadingCards } from "./_components/status-view";
import { TodayPick } from "./_components/home/today-pick";
import { CrossAgePicks, PeerPicks, RankingTop10, RecommendRow } from "./_components/home/home-rows";

/* ============================================================================
 * 0-4 홈 화면 (Figma Home Feed 9:5) — 3명 공동
 * 화면 순서: ① 오늘의 추천 → ② 맞춤 추천작품 → ③ 통합 랭킹 TOP 10 → ④ 세대별 교차 평점 → ⑤ 또래 추천
 * 영역별 부품: app/_components/home/ , 데이터: GET /api/v1/home/feed/ (지금은 가짜 데이터)
 * ========================================================================== */

function useHomeFeed() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchHomeFeed(controller.signal)
      .then((data) => !controller.signal.aborted && setFeed(data))
      .catch((e: unknown) => !controller.signal.aborted && setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했어요."));
    return () => controller.abort();
  }, [reloadKey]);

  return { feed, error, retry: useCallback(() => setReloadKey((k) => k + 1), []) };
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-[85vh] min-h-[580px] w-full bg-gradient-to-b from-white/[0.06] to-[#0a0a0a]" />
      <div className="-mt-16 px-4 md:-mt-24 md:px-12">
        <LoadingCards rows={2} count={8} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const { feed, error, retry } = useHomeFeed();

  // 또래 추천 후보: 랭킹 + 교차 평점 작품 (6-2 API 가 생기면 그 결과로 바꿈)
  const peerCandidates = useMemo<Movie[]>(() => {
    if (!feed) return [];
    const unique = new Map<number, Movie>();
    [...feed.rankings.map((r) => r.movie), ...feed.cross_age_picks].forEach((m) => unique.set(m.id, m));
    return [...unique.values()];
  }, [feed]);

  return (
    <SiteShell underHeader>
      {error ? (
        <div className="pt-16">
          <ErrorState message={error} onRetry={retry} />
        </div>
      ) : !feed ? (
        <HomeSkeleton />
      ) : (
        <>
          <TodayPick hero={feed.hero} user={feed.user} tpo={feed.tpo} />
          <div className="relative z-10 -mt-20 space-y-6 pb-16 md:-mt-28 md:space-y-10">
            <RecommendRow nickname={feed.user.nickname} movies={feed.recommendations ?? []} />
            <RankingTop10 items={feed.rankings} />
            <CrossAgePicks movies={feed.cross_age_picks} myAge={feed.user.age_group} />
            <PeerPicks nickname={feed.user.nickname} myAge={feed.user.age_group} movies={peerCandidates} />
          </div>
        </>
      )}
    </SiteShell>
  );
}
