"use client";

import { ArrowLeft, ArrowRight, Check, Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { openLoginModal } from "../../../../_components/login-modal";
import { PageContainer, SiteShell } from "../../../../_components/site-shell";
import { ErrorState } from "../../../../_components/status-view";
import { PROFILE_LINKS } from "../../../../_lib/catalog";
import { fetchRatingResult, type RankNeighbor, type RatingResult } from "../../../../_lib/rating";
import { useAccount } from "../../../../_lib/use-account";

/* ============================================================================
 * 5-1 평점 반영 결과 · 랭킹 변화 (Figma 224:4225) — 담당: 정준교
 *   ✓ 평점이 반영되었어요 → [방금 평가한 작품 · 나의 평점] | [통합 랭킹 이전 집계 → 현재 집계, N계단 상승]
 *   → 안내(FR8) + 주변 순위(위·아래 1개) → [나의 평점 보기] [통합 랭킹 확인]
 * 순위는 통합 랭킹(주간)의 가장 최근 집계와 그 전 집계 (ranking 표 그대로). TOP 100 밖이면 "아직 TOP 100 밖이에요"
 * Figma 와 다른 점: '예시 데이터' 문구 3곳은 지움 (PRD 5번) — 대신 집계일을 보여 줌
 * ========================================================================== */

const fmtDay = (iso: string | null) => {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  return `${m}월 ${d}일`;
};

function ChangeText({ n }: { n: RankNeighbor }) {
  if (n.is_new) return <span className="font-bold text-[#b99aff]">NEW</span>;
  if (n.rank_change > 0) return <span className="font-bold text-[#b99aff]">↑ {n.rank_change}</span>;
  if (n.rank_change < 0) return <span className="font-bold text-[#b3b1bc]">↓ {-n.rank_change}</span>;
  return <span className="font-bold text-[#b3b1bc]">— 변동 없음</span>;
}

function NeighborRow({ n }: { n: RankNeighbor }) {
  return (
    <div
      className={`flex items-center gap-[18px] rounded-md border px-[18px] py-[11px] ${
        n.is_mine ? "border-[rgba(185,154,255,0.25)] bg-[rgba(167,139,250,0.08)]" : "border-white/[0.08] bg-[#141416]"
      }`}
    >
      <span className={`w-9 shrink-0 text-2xl font-bold tabular-nums ${n.is_mine ? "text-[#b99aff]" : "text-[#b3b1bc]"}`}>{n.rank}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-sm font-bold text-white">{n.title}</p>
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-[#85828f]">{n.previous_rank != null ? `이전 ${n.previous_rank}위 → 현재 ${n.rank}위` : `이전 집계 없음 → 현재 ${n.rank}위`}</span>
          <ChangeText n={n} />
        </div>
      </div>
      {n.is_mine && <span className="shrink-0 rounded-md bg-[rgba(185,154,255,0.12)] px-2 py-[5px] text-[10px] text-[#b99aff]">내가 평가한 작품</span>}
    </div>
  );
}

function RankBox({ ranking }: { ranking: RatingResult["ranking"] }) {
  const { current_rank: now, previous_rank: before, rank_change: change, ranked_on } = ranking;

  if (ranked_on == null || now == null) {
    return (
      <div className="flex flex-col gap-3 py-6">
        <p className="text-[28px] font-bold text-white">아직 TOP 100 밖이에요</p>
        <p className="text-[13px] leading-[1.7] text-[#b3b1bc]">
          {ranked_on == null
            ? "아직 통합 랭킹 집계가 없어요. 다음 집계부터 평가가 반영돼요."
            : `${fmtDay(ranked_on)} 집계 기준 통합 랭킹 TOP 100에 들지 않았어요.${before != null ? ` (이전 집계 ${before}위)` : ""}`}
        </p>
      </div>
    );
  }

  const trend =
    ranking.is_new || before == null
      ? { icon: TrendingUp, text: "새로 진입", tone: "text-[#b99aff]" }
      : change > 0
        ? { icon: TrendingUp, text: `${change}계단 상승`, tone: "text-[#b99aff]" }
        : change < 0
          ? { icon: TrendingDown, text: `${-change}계단 하락`, tone: "text-[#b3b1bc]" }
          : { icon: Minus, text: "순위 변동 없음", tone: "text-[#b3b1bc]" };
  const TrendIcon = trend.icon;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[#85828f]">이전 집계{ranking.previous_ranked_on ? ` · ${fmtDay(ranking.previous_ranked_on)}` : ""}</p>
          <p className="font-semibold tracking-[-3.2px] text-[#b3b1bc]">
            {before != null ? (
              <>
                <span className="text-[64px] leading-none tabular-nums">{before}</span>
                <span className="text-xl tracking-normal">위</span>
              </>
            ) : (
              <span className="text-[40px] leading-none tracking-normal">–</span>
            )}
          </p>
        </div>
        <ArrowRight className="size-8 text-[#85828f]" strokeWidth={1.5} aria-hidden />
        <div className="flex flex-col gap-2 text-[#b99aff]">
          <p className="text-xs">현재 집계 · {fmtDay(ranked_on)}</p>
          <p className="font-bold tracking-[-4px]">
            <span className="text-[80px] leading-none tabular-nums">{now}</span>
            <span className="text-2xl font-normal tracking-normal">위</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 rounded-md bg-[rgba(167,139,250,0.08)] px-4 py-3">
        <TrendIcon className={`size-[18px] ${trend.tone}`} aria-hidden />
        <span className={`text-[15px] font-bold ${trend.tone}`}>{trend.text}</span>
        <span className="text-[11px] text-[#b3b1bc]">이전 집계 대비</span>
      </div>
    </>
  );
}

export default function RatingResultPage() {
  const params = useParams<{ id: string }>();
  const contentId = Number(params.id);
  const { account, ready } = useAccount();
  const [data, setData] = useState<RatingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!ready || !account || !Number.isFinite(contentId)) return;
    const controller = new AbortController();
    setError(null);
    fetchRatingResult(contentId, controller.signal)
      .then((d) => !controller.signal.aborted && setData(d))
      .catch((e: unknown) => !controller.signal.aborted && setError(e instanceof Error ? e.message : "평점 반영 결과를 불러오지 못했어요."));
    return () => controller.abort();
  }, [ready, account, contentId, reload]);

  const rating = data?.rating;
  const movie = rating?.movie;
  const meta = movie ? [movie.release_year || null, ...movie.genres.slice(0, 2).map((g) => g.name)].filter(Boolean).join(" · ") : "";

  return (
    <SiteShell>
      <PageContainer className="lg:px-40">
        <div className="flex flex-col gap-7 pt-7 pb-10">
          <nav aria-label="경로" className="flex items-center gap-2 text-[13px]">
            <Link href={PROFILE_LINKS.ratings} className="flex items-center gap-2 text-[#b3b1bc] transition hover:text-white">
              <ArrowLeft className="size-4" aria-hidden />
              나의 평점
            </Link>
            <span className="text-xs text-[#85828f]">/</span>
            <span className="text-white">평점 반영 결과</span>
          </nav>

          {ready && !account ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <p className="text-lg font-bold text-white">로그인하면 내 평점 반영 결과를 볼 수 있어요</p>
              <button type="button" onClick={openLoginModal} className="rounded-md bg-[#b99aff] px-5 py-2.5 text-sm font-bold text-[#181321]">
                로그인
              </button>
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => setReload((n) => n + 1)}>
              <Link href={PROFILE_LINKS.ratings} className="text-sm text-[#b99aff] underline">
                나의 평점으로 돌아가기
              </Link>
            </ErrorState>
          ) : !data || !rating || !movie ? (
            <div className="h-[420px] animate-pulse rounded-xl bg-white/[0.05]" role="status" aria-label="불러오는 중" />
          ) : (
            <>
              <div className="flex items-center gap-5">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[rgba(185,154,255,0.25)] bg-[rgba(167,139,250,0.08)]">
                  <Check className="size-7 text-[#b99aff]" strokeWidth={2} aria-hidden />
                </span>
                <div className="flex min-w-0 flex-col gap-2">
                  <h1 className="text-[26px] font-bold tracking-[-0.96px] text-white md:text-[32px]">평점이 반영되었어요</h1>
                  <p className="text-sm text-[#b3b1bc]">남긴 별점과 함께, 여러 사용자의 평가로 달라진 랭킹을 확인해 보세요.</p>
                </div>
              </div>

              <section className="flex flex-col gap-8 rounded-xl border border-[rgba(185,154,255,0.25)] bg-gradient-to-b from-[#211a30] to-[#141416] to-65% p-6 md:p-8 lg:flex-row lg:items-center">
                <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
                  <div className="relative h-[285px] w-[190px] shrink-0 overflow-hidden rounded-lg border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                    {movie.poster_url ? (
                      <img src={movie.poster_url} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-start justify-center bg-[linear-gradient(124deg,#fca5a5_0%,#991b1b_50%,#1c1917_100%)] px-3 pt-11">
                        <p className="text-center text-xl font-black text-white/90">{movie.title}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-[22px] sm:w-[260px]">
                    <div className="flex flex-col gap-2.5">
                      <p className="text-xs text-[#b99aff]">방금 평가한 작품</p>
                      <p className="text-[28px] font-bold tracking-[-0.56px] break-words text-white">{movie.title}</p>
                      <p className="text-[13px] text-[#85828f]">{meta}</p>
                    </div>
                    <div className="h-px bg-white/[0.08]" />
                    <div className="flex flex-col gap-2.5">
                      <p className="flex items-center gap-2.5 text-[13px] text-[#b3b1bc]">
                        나의 평점 <span className="text-[11px] text-[#b99aff]">✓ 등록 완료</span>
                      </p>
                      <p className="font-bold text-white">
                        <span className="text-[34px] text-[#facc15]">★ </span>
                        <span className="text-[34px] tabular-nums">{rating.score.toFixed(1)}</span>
                        <span className="text-[15px] font-normal text-[#85828f]"> / 5.0</span>
                      </p>
                      {rating.comment && <p className="text-[13px] leading-[1.65] break-words text-[#b3b1bc]">{rating.comment}</p>}
                    </div>
                  </div>
                </div>
                <div className="hidden h-[225px] w-px shrink-0 bg-white/[0.08] lg:block" />
                <div className="flex min-w-0 flex-1 flex-col gap-[22px]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white">통합 랭킹 · 전체 작품</p>
                    <p className="text-[11px] text-[#b99aff]">주간 집계{data.ranking.ranked_on ? ` · ${fmtDay(data.ranking.ranked_on)}` : ""}</p>
                  </div>
                  <RankBox ranking={data.ranking} />
                </div>
              </section>

              <section className="flex flex-col gap-10 lg:flex-row lg:items-start">
                <div className="flex flex-col gap-3.5 pt-1.5 lg:w-[320px] lg:shrink-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-white">
                    <Info className="size-[17px] text-[#b99aff]" aria-hidden />
                    랭킹은 함께 만드는 변화예요
                  </p>
                  <p className="text-[13px] leading-[1.8] text-[#b3b1bc]">
                    여러 사용자의 평가를 합산한 집계 변화예요. 내 평점 하나만으로 즉시 바뀌지 않아요.
                  </p>
                  <p className="text-[11px] leading-[1.8] text-[#85828f]">
                    통합 랭킹은 TMDB 인기도와 ViewFit 회원 평점을 모아 정기적으로 다시 집계해요. 방금 남긴 평점은 다음 집계부터 반영돼요.
                  </p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-0.5">
                    <p className="text-base font-bold text-white">주변 순위에서 확인하기</p>
                    <p className="text-[11px] text-[#85828f]">통합 랭킹 · 주간</p>
                  </div>
                  {data.ranking.neighbors.length ? (
                    data.ranking.neighbors.map((n) => <NeighborRow key={n.rank} n={n} />)
                  ) : (
                    <p className="rounded-md border border-white/[0.08] bg-[#141416] px-[18px] py-5 text-[13px] text-[#85828f]">
                      이 작품이 TOP 100에 들면 주변 순위가 보여요.
                    </p>
                  )}
                </div>
              </section>

              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={PROFILE_LINKS.ratings}
                  className="flex h-[50px] w-full items-center justify-center rounded-md border border-white/15 bg-[#141416] text-sm font-medium text-white transition hover:border-white/30 sm:w-[200px]"
                >
                  나의 평점 보기
                </Link>
                <Link
                  href="/ranking"
                  className="flex h-[50px] w-full items-center justify-center gap-3 rounded-md bg-[#b99aff] text-sm font-bold text-[#181321] transition hover:bg-[#c9b0ff] sm:w-[240px]"
                >
                  통합 랭킹 확인
                  <ArrowRight className="size-[17px]" aria-hidden />
                </Link>
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </SiteShell>
  );
}
