import { ClipboardList, Info, Play, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import {
  AGE_GROUP_META,
  TIME_SLOT_LABEL,
  formatAgeRating,
  formatCount,
  formatDuration,
  type HeroCuration,
  type TPOContext,
  type UserPersona,
} from "../../_lib/viewfit";
import { openContentDetail, watchOn } from "../content-detail-modal";
import { PlatformBadge } from "../platform-badge";

/* ============================================================================
 * 0-4 홈 ① 오늘의 추천 (Figma Home Feed "Hero (TPO)" 9:6 — 높이 720)
 * 배경: Figma 처럼 깊은 바다 빛 번짐 (작품 배경 사진은 D6 결정 후 backdrop_url 이 생기면 교체)
 * 데이터 연결: 7-1 맞춤 추천 — 추천 1위 작품 + 한 줄 문구
 * 버튼 연결: 4-1 작품 탐색 — [바로 보기] OTT 이동(여러 개면 팝업), [상세 정보] 작품 상세 공통 오버레이
 * ========================================================================== */

function Glow({ className, color }: { className: string; color: string }) {
  return <div aria-hidden className={`absolute rounded-full blur-[90px] ${className}`} style={{ background: `radial-gradient(closest-side, ${color}, transparent)` }} />;
}

export function TodayPick({ hero, user, tpo }: { hero: HeroCuration; user: UserPersona; tpo: TPOContext }) {
  const { movie, message } = hero;
  const context = `오늘의 추천 · ${tpo.situation}`;
  // [바로 보기]: 볼 수 있는 OTT 가 하나면 바로 그 OTT 로, 여러 개면 상세 팝업에서 고르게 (4-1 FR4)
  const watchNow = () => (movie.platforms.length === 1 ? watchOn(movie, movie.platforms[0]) : openContentDetail(movie, context));

  return (
    <section className="relative h-[720px] w-full overflow-hidden bg-[#0a0a0a]" aria-label="오늘의 추천">
      {/* Backdrop Glow / Deep Sea · Abyss · Surf */}
      <Glow className="-right-[200px] -top-[160px] h-[760px] w-[1000px] opacity-100" color="#1e3a8a" />
      <Glow className="-right-[160px] top-[180px] h-[520px] w-[620px] opacity-90" color="#0c4a6e" />
      <Glow className="-right-[60px] -top-[120px] h-[360px] w-[420px] opacity-60" color="#38bdf8" />
      {/* Overlay L→R · Overlay Bottom */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[rgba(10,10,10,0.7)] via-45% to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[rgba(10,10,10,0.1)] via-55% to-[#0a0a0a]" />

      <div className="absolute left-4 right-4 top-[150px] flex max-w-[580px] flex-col items-start gap-4 md:left-12 md:top-[207px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-[6px]">
          <Sparkles className="h-3.5 w-3.5 fill-[#f0abfc] text-[#f0abfc]" />
          {TIME_SLOT_LABEL[tpo.time_slot]} · {tpo.situation}
        </div>

        <p className="text-xl font-bold leading-[1.4] text-white/[0.92] md:text-2xl">
          <span className="text-[#f0abfc]">
            {[user.age_group && AGE_GROUP_META[user.age_group].label, user.occupation, `${user.nickname}님,`].filter(Boolean).join(" ")}
          </span>
          <br />
          {message.headline}
        </p>

        <h1 className="text-[44px] font-black leading-normal tracking-[-1.2px] text-white md:text-[60px]">{movie.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-[#facc15] text-[#facc15]" />
            <span className="font-bold text-[#facc15]">{movie.rating.overall.toFixed(1)}</span>
            <span className="text-white/50">({formatCount(movie.rating.total_count)}명)</span>
          </span>
          <span>{movie.release_year}</span>
          {movie.age_rating && <span className="rounded border border-white/40 px-1.5 text-xs">{formatAgeRating(movie.age_rating)}</span>}
          {formatDuration(movie) && <span>{formatDuration(movie)}</span>}
          <span>{movie.genres.map((g) => g.name).join(" · ")}</span>
          {movie.platforms.map((p) => (
            <PlatformBadge key={p.code} code={p.code} />
          ))}
        </div>

        <p className="line-clamp-3 text-base leading-[1.6] text-white/75">{movie.overview}</p>

        <div className="flex flex-wrap gap-2">
          {tpo.mood_tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3">
          <button type="button" onClick={watchNow} className="inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-base font-bold text-black transition hover:bg-white/80">
            <Play className="h-5 w-5 fill-black" />
            바로 보기
          </button>
          <button
            type="button"
            onClick={() => openContentDetail(movie, context)}
            className="inline-flex items-center gap-2 rounded-md bg-white/20 px-8 py-3 text-base font-bold text-white backdrop-blur-[6px] transition hover:bg-white/30"
          >
            <Info className="h-5 w-5" />
            상세 정보
          </button>
        </div>

        <p className="text-xs text-white/50">{message.reason}</p>
      </div>
    </section>
  );
}


/* ----------------------------------------------------------------------------
 * 설문을 안 한 회원 — 오늘의 추천 자리에 설문 안내 (PRD 0-4 5번: "취향을 알려주시면 딱 맞는 작품을 골라 드릴게요 [설문하기]")
 * Figma 에는 이 상태 화면이 없어서 오늘의 추천과 같은 배경·글자 크기 체계를 씀
 * -------------------------------------------------------------------------- */
export function SurveyPrompt({ user, tpo }: { user: UserPersona; tpo: TPOContext }) {
  return (
    <section className="relative h-[600px] w-full overflow-hidden bg-[#0a0a0a]" aria-label="오늘의 추천 — 취향 설문 안내">
      <Glow className="-right-[200px] -top-[160px] h-[760px] w-[1000px] opacity-100" color="#1e3a8a" />
      <Glow className="-right-[160px] top-[180px] h-[520px] w-[620px] opacity-90" color="#0c4a6e" />
      <Glow className="-right-[60px] -top-[120px] h-[360px] w-[420px] opacity-60" color="#38bdf8" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[rgba(10,10,10,0.7)] via-45% to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[rgba(10,10,10,0.1)] via-55% to-[#0a0a0a]" />

      <div className="absolute left-4 right-4 top-[150px] flex max-w-[580px] flex-col items-start gap-4 md:left-12 md:top-[207px]">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-[6px]">
          <Sparkles className="h-3.5 w-3.5 fill-[#f0abfc] text-[#f0abfc]" />
          {TIME_SLOT_LABEL[tpo.time_slot]} · 오늘의 추천
        </div>

        <p className="text-xl font-bold leading-[1.4] text-[#f0abfc] md:text-2xl">{user.nickname}님,</p>
        <h1 className="break-keep text-[32px] font-black leading-[1.3] tracking-[-0.8px] text-white md:text-[44px]">
          취향을 알려주시면
          <br />딱 맞는 작품을 골라 드릴게요
        </h1>
        <p className="break-keep text-base leading-[1.6] text-white/75">
          연령대·직업·좋아하는 장르처럼 다섯 가지 질문에 답하면, 오늘 볼 작품 한 편을 골라 드려요.
        </p>

        <div className="pt-3">
          <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-md bg-white px-8 py-3 text-base font-bold text-black transition hover:bg-white/80">
            <ClipboardList className="h-5 w-5" />
            설문하기
          </Link>
        </div>
      </div>
    </section>
  );
}
