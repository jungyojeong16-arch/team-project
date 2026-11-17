"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { AGE_GROUPS, AGE_GROUP_META, PLATFORM_STYLES, formatAgeRating, formatCount, recordWatch, type Movie, type Platform, type PlatformCode } from "../_lib/viewfit";
import { Modal } from "./modal";
import { PlatformBadge } from "./platform-badge";

/* ============================================================================
 * 4-1 작품 상세 · 공통 오버레이 (Figma "ViewFit 작품 상세 · 공통 오버레이" 375:1666,
 *                                   "홈피드 · 작품 상세 팝업 열림" 375:1802)
 * - 작품 카드를 누르면 보던 화면 위에 어두운 막(72%) + 가운데 상세 팝업이 뜹니다. 뒤 화면은 비쳐 보입니다.
 * - 아래 "이 작품 보러 가기" 에 그 작품을 볼 수 있는 OTT 버튼이 최대 3개, OTT 고유 색으로 나옵니다.
 *   누르면 OTT 검색 결과(deeplink_url)를 새 탭으로 열고, 로그인했으면 시청 기록(watch_history direct)을 남깁니다.
 *
 * 어느 화면에서든:  openContentDetail(movie, "오늘의 통합 OTT랭킹 TOP 10 · 1위")
 * 팝업은 SiteShell 안의 <ContentDetailHost /> 가 띄웁니다 (로그인 창과 같은 방식).
 * ========================================================================== */

const OPEN_EVENT = "viewfit:content-detail";
const MAX_PLATFORMS = 3;
/** 세대별 평균은 평가가 이 수 이상인 연령대만 (4-1 FR2) */
const MIN_AGE_COUNT = 3;

type Detail = { movie: Movie; context?: string };

/** 작품 상세 팝업 열기. context = 팝업 맨 위 분홍 글씨 (어디서 눌렀는지) */
export function openContentDetail(movie: Movie, context?: string) {
  window.dispatchEvent(new CustomEvent<Detail>(OPEN_EVENT, { detail: { movie, context } }));
}

export function ContentDetailHost() {
  const [detail, setDetail] = useState<Detail | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setDetail((e as CustomEvent<Detail>).detail);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  const close = useCallback(() => setDetail(null), []);
  return detail ? <ContentDetailModal key={detail.movie.id} movie={detail.movie} context={detail.context} onClose={close} /> : null;
}

/** [바로 보기] — OTT 를 새 탭으로 열고 시청 기록 남기기 (로그인 안 했으면 기록은 건너뜀) */
export function watchOn(movie: Movie, platform: Platform) {
  window.open(platform.watch_url, "_blank", "noopener,noreferrer");
  void recordWatch(movie.id, platform.code);
}

/* ---------------------------------------------------------------------------
 * 버튼 색 (Figma 375:1704 Netflix #C90820 · 383:1873 TVING #CF1036 · 383:1875 wavve #1351F9)
 * 나머지 OTT 는 뱃지 색(PLATFORM_STYLES)을 버튼용으로 한 단계 어둡게
 * ------------------------------------------------------------------------- */
const BUTTON_STYLE: Record<PlatformCode, { name: string; className: string }> = {
  NETFLIX: { name: "Netflix", className: "bg-[#c90820] hover:bg-[#e50914]" },
  TVING: { name: "TVING", className: "bg-[#cf1036] hover:bg-[#ff153c]" },
  WAVVE: { name: "wavve", className: "bg-[#1351f9] hover:bg-[#2f66ff]" },
  COUPANG_PLAY: { name: "쿠팡플레이", className: "bg-[#008cc2] hover:bg-[#00a3e0]" },
  DISNEY_PLUS: { name: "Disney+", className: "bg-[#0b1c5a] ring-1 ring-inset ring-sky-300/50 hover:bg-[#13287a]" },
  WATCHA: { name: "WATCHA", className: "bg-[#e0044d] hover:bg-[#ff0558]" },
};

/** 화면에 보여 줄 주소: https://www. 빼고, %EC… 같은 글자는 한글로 */
const shortUrl = (url: string) => {
  let text = url.replace(/^https?:\/\/(www\.)?/, "");
  try {
    text = decodeURIComponent(text);
  } catch {
    /* 잘못된 인코딩이면 그대로 */
  }
  return text;
};

function ContentDetailModal({ movie, context, onClose }: { movie: Movie; context?: string; onClose: () => void }) {
  const titleId = useId();
  const platforms = movie.platforms.slice(0, MAX_PLATFORMS);
  const [focused, setFocused] = useState<Platform | undefined>(platforms[0]);
  const [copied, setCopied] = useState(false);

  const meta = [
    movie.release_year,
    movie.content_type === "series" ? "시리즈" : "영화",
    movie.genres.map((g) => g.name).join(" · "),
    movie.age_rating && (movie.age_rating === "ALL" ? "전체 관람가" : `${formatAgeRating(movie.age_rating).replace("+", "")}세 이상`),
  ].filter(Boolean);

  // 세대 비교는 홈·세대별 랭킹과 같이 20·30·40대 (평가 3개 이상인 연령대만)
  const byAge = AGE_GROUPS.map((age) => movie.rating.by_age_group.find((r) => r.age_group === age)).filter((r) => r && r.count >= MIN_AGE_COUNT) as Movie["rating"]["by_age_group"];
  const hasRating = movie.rating.total_count > 0;

  const copy = async () => {
    if (!focused) return;
    try {
      await navigator.clipboard.writeText(focused.watch_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      watchOn(movie, focused); // 복사가 막힌 환경이면 그냥 열기
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy={titleId}
      backdropClassName="bg-black/[0.72]"
      panelClassName="bg-[linear-gradient(180deg,#14213a_0%,#0d111b_46.75%,#0d111b_85%)]"
      eyebrow={
        <div className="flex h-8 items-center gap-1.5">
          {platforms.map((p) => (
            <PlatformBadge key={p.code} code={p.code} />
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-3">
        {/* 작품 제목 및 기본 정보 (375:1687) */}
        <div className="flex flex-col gap-2">
          {context && <p className="text-[11px] font-bold leading-[18px] text-[#f0abfc]">{context}</p>}
          <h2 id={titleId} className="text-[26px] font-bold leading-[1.4] text-white md:text-[30px] md:leading-[50px]">
            {movie.title}
          </h2>
          <p className="text-xs leading-5 text-[#b8c0cf]">{meta.join(" · ")}</p>
        </div>

        {/* 작품 평점 (375:1691) */}
        <div className="flex min-h-[86px] items-center gap-5 rounded-[10px] border border-white/[0.08] bg-white/[0.05] px-5 py-3">
          <p className="w-[96px] shrink-0 text-[28px] font-bold leading-[46px] text-[#f0abfc] md:w-[146px]">
            ★ {hasRating ? movie.rating.overall.toFixed(1) : "–"}
          </p>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <p className="text-xs font-bold leading-5 text-white">ViewFit 회원 평점 · 5점 만점</p>
            <p className="text-xs leading-[18px] text-[#d3d8e2]">
              {hasRating ? `${formatCount(movie.rating.total_count)}명 평가` : "아직 평가가 없어요"}
            </p>
            {byAge.length > 0 && (
              <p className="text-[11px] leading-[18px] text-[#aeb8c8]">
                {byAge.map((r) => `${AGE_GROUP_META[r.age_group].label} ${r.average.toFixed(1)}`).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {/* 간단한 작품 소개 (375:1696) */}
        {movie.overview && (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-bold leading-[21px] text-white">작품 소개</p>
            <p className="line-clamp-4 text-sm leading-[23px] text-[#d3d8e2]">{movie.overview}</p>
          </div>
        )}

        <div className="h-px bg-white/10" />

        {/* OTT 딥링크 영역 (375:1700) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between whitespace-nowrap">
            <p className="text-[13px] font-bold leading-[21px] text-white">이 작품 보러 가기</p>
            <p className="text-[11px] leading-[18px] text-[#aeb8c8]">외부 OTT로 이동</p>
          </div>

          {platforms.length === 0 ? (
            <p className="rounded-md bg-white/[0.04] px-3 py-4 text-center text-xs text-[#aeb8c8]">지금은 볼 수 있는 OTT 정보가 없어요.</p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              {platforms.map((p, i) => {
                const style = BUTTON_STYLE[p.code] ?? { name: PLATFORM_STYLES[p.code]?.label ?? p.name, className: "bg-white/10" };
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => watchOn(movie, p)}
                    onMouseEnter={() => setFocused(p)}
                    onFocus={() => setFocused(p)}
                    className={`flex h-[54px] w-full min-w-0 shrink-0 items-center justify-center sm:w-auto sm:flex-1 rounded-md px-2 text-xs font-bold leading-[23px] text-white transition ${style.className}`}
                  >
                    {`${style.name}에서 ${i === 0 ? "바로 " : ""}보기  ↗`}
                  </button>
                );
              })}
            </div>
          )}

          {focused && (
            <button
              type="button"
              onClick={copy}
              title="눌러서 주소 복사"
              className="w-full truncate rounded-md bg-white/[0.04] py-2 pl-3 pr-3 text-left text-[11px] leading-[18px] text-[#c5cbda] transition hover:bg-white/[0.08]"
            >
              {copied ? "주소를 복사했어요" : shortUrl(focused.watch_url)}
            </button>
          )}
          <p className="text-[11px] leading-[18px] text-[#aeb8c8]">각 OTT의 작품 검색 결과로 연결됩니다.</p>
        </div>

        <p className="text-[11px] leading-[18px] text-[#aeb8c8]">시청에는 해당 OTT의 로그인 또는 이용권이 필요할 수 있어요.</p>
      </div>
    </Modal>
  );
}
