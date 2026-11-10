/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Info, Play, Sparkles, Star } from "lucide-react";
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
import { PlatformBadge } from "../platform-badge";

/* ============================================================================
 * 0-4 홈 ① 오늘의 추천 (Figma Home Feed "Hero (TPO)" 9:6)
 * 데이터 연결: 7-1 맞춤 추천 담당 (홍준화) — 추천 1위 작품 + 한 줄 문구
 * 버튼 연결: 4-1 작품 탐색 담당 (정재준) — [바로 보기] OTT 이동, [상세 정보] 상세 팝업
 * ========================================================================== */

export function TodayPick({ hero, user, tpo }: { hero: HeroCuration; user: UserPersona; tpo: TPOContext }) {
  const { movie, message } = hero;

  return (
    <section className="relative h-[85vh] min-h-[580px] w-full overflow-hidden" aria-label="오늘의 추천">
      <img src={movie.backdrop_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-black/40" />

      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-28 md:px-12 md:pb-40">
        <div className="max-w-[580px]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-fuchsia-300" />
            {TIME_SLOT_LABEL[tpo.time_slot]} · {tpo.situation}
          </div>

          <p className="text-lg font-semibold leading-snug text-white/90 md:text-2xl">
            <span className="text-fuchsia-300">
              {AGE_GROUP_META[user.age_group].label} {user.occupation} {user.nickname}님,
            </span>
            <br />
            {message.headline}
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight drop-shadow-2xl md:text-6xl">{movie.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/70">
            <span className="flex items-center gap-1 font-bold text-yellow-400">
              <Star className="h-4 w-4 fill-yellow-400" />
              {movie.rating.overall.toFixed(1)}
              <span className="font-normal text-white/50">({formatCount(movie.rating.total_count)}명)</span>
            </span>
            <span>{movie.release_year}</span>
            <span className="rounded border border-white/40 px-1.5 text-xs">{formatAgeRating(movie.age_rating)}</span>
            <span>{formatDuration(movie)}</span>
            <span>{movie.genres.map((g) => g.name).join(" · ")}</span>
            <span className="flex gap-1">
              {movie.platforms.map((p) => (
                <PlatformBadge key={p.code} code={p.code} />
              ))}
            </span>
          </div>

          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-white/75 md:text-base">{movie.overview}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tpo.mood_tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 backdrop-blur">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {/* TODO(4-1): 제공 OTT 의 deeplink_url 을 새 탭으로 열고 시청 기록 남기기 */}
            <Link
              href={`/watch/${movie.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2.5 text-base font-bold text-black transition hover:bg-white/80 md:px-8 md:py-3"
            >
              <Play className="h-5 w-5 fill-black" />
              바로 보기
            </Link>
            {/* TODO(4-1): 작품 상세 팝업 열기 */}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md bg-white/20 px-6 py-2.5 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/30 md:px-8 md:py-3"
            >
              <Info className="h-5 w-5" />
              상세 정보
            </button>
          </div>

          <p className="mt-4 text-xs text-white/50">{message.reason}</p>
        </div>
      </div>
    </section>
  );
}
