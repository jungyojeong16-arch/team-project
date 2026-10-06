"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Flame,
  Info,
  Minus,
  Play,
  Search,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";

import {
  AGE_GROUP_META,
  AGE_GROUPS,
  NAV_ITEMS,
  PLATFORM_STYLES,
  SCROLLBAR_HIDE,
  TIME_SLOT_LABEL,
  fetchHomeFeed,
  formatAgeRating,
  formatCount,
  formatDuration,
  getAgeAverage,
  type AgeGroup,
  type HeroCuration,
  type HomeFeed,
  type Movie,
  type PlatformCode,
  type RankingItem,
  type TPOContext,
  type UserPersona,
} from "./_lib/viewfit";

function useHomeFeed() {
  const [feed, setFeed] = useState<HomeFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchHomeFeed(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setFeed(data);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);
  return { feed, error, retry };
}

/* ============================================================================
 * 6. UI Components
 * ========================================================================== */

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-white/5 bg-[#0a0a0a]/70 shadow-lg shadow-black/40 backdrop-blur-xl"
          : "border-b border-transparent bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 md:px-12">
        <div className="flex items-center gap-8 lg:gap-10">
          <Link href="/" className="text-2xl font-black tracking-tight" aria-label="ViewFit 홈">
            <span className="bg-gradient-to-r from-fuchsia-500 to-rose-500 bg-clip-text text-transparent">View</span>
            <span className="text-white">Fit</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {NAV_ITEMS.map((item, i) => (
              <a
                key={item}
                href="#"
                className={`transition-colors ${i === 0 ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}
              >
                {item}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1 md:gap-3">
          <button
            type="button"
            aria-label="검색"
            className="rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="알림"
            className="relative rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0a0a0a]" />
          </button>
          <button
            type="button"
            aria-label="프로필"
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-500 to-indigo-600 ring-1 ring-white/20 transition hover:ring-white/60"
          >
            <User className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}

function PlatformBadge({ code, size = "sm" }: { code: PlatformCode; size?: "sm" | "md" }) {
  const style = PLATFORM_STYLES[code];
  return (
    <span
      className={`inline-flex items-center rounded font-black tracking-wide shadow-md shadow-black/40 ${
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      } ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function HeroSection({ hero, user, tpo }: { hero: HeroCuration; user: UserPersona; tpo: TPOContext }) {
  const { movie, message } = hero;

  return (
    <section className="relative h-[85vh] min-h-[580px] w-full overflow-hidden">
      <img src={movie.backdrop_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-black/40" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1920px] flex-col justify-end px-4 pb-28 md:px-12 md:pb-40">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-md">
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

          <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            {movie.overview}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {tpo.mood_tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 backdrop-blur">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/watch/${movie.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2.5 text-base font-bold text-black transition hover:bg-white/80 md:px-8 md:py-3"
            >
              <Play className="h-5 w-5 fill-black" />
              바로 보기
            </Link>
            <Link
              href={`/contents/${movie.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-white/20 px-6 py-2.5 text-base font-bold text-white backdrop-blur-md transition hover:bg-white/30 md:px-8 md:py-3"
            >
              <Info className="h-5 w-5" />
              상세 정보
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/50">{message.reason}</p>
        </div>
      </div>
    </section>
  );
}

function ContentRow({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows]);

  const scroll = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/row relative">
      <div className="mx-auto flex max-w-[1920px] items-end justify-between px-4 md:px-12">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold md:text-2xl">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-xs text-white/50 md:text-sm">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center text-xs font-medium text-white/50 transition hover:text-white md:text-sm"
        >
          전체보기
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mx-auto max-w-[1920px]">
        <button
          type="button"
          aria-label="이전"
          onClick={() => scroll(-1)}
          className={`absolute inset-y-0 left-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-r from-[#0a0a0a] to-transparent text-white opacity-0 transition-opacity duration-300 md:flex ${
            canPrev ? "group-hover/row:opacity-100" : "pointer-events-none"
          }`}
        >
          <ChevronLeft className="h-9 w-9 drop-shadow-lg transition hover:scale-125" />
        </button>

        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className={`${SCROLLBAR_HIDE} flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 py-5 md:scroll-px-12 md:gap-4 md:px-12`}
        >
          {children}
        </div>

        <button
          type="button"
          aria-label="다음"
          onClick={() => scroll(1)}
          className={`absolute inset-y-0 right-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-l from-[#0a0a0a] to-transparent text-white opacity-0 transition-opacity duration-300 md:flex ${
            canNext ? "group-hover/row:opacity-100" : "pointer-events-none"
          }`}
        >
          <ChevronRight className="h-9 w-9 drop-shadow-lg transition hover:scale-125" />
        </button>
      </div>
    </section>
  );
}

function RankChange({ change, isNew }: { change: number; isNew: boolean }) {
  if (isNew) return <span className="text-[10px] font-black text-fuchsia-400">NEW</span>;
  if (change > 0)
    return (
      <span className="flex items-center gap-0.5 font-semibold text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        {change}
      </span>
    );
  if (change < 0)
    return (
      <span className="flex items-center gap-0.5 font-semibold text-rose-400">
        <TrendingDown className="h-3 w-3" />
        {Math.abs(change)}
      </span>
    );
  return <Minus className="h-3 w-3 text-white/40" />;
}

function RankingCard({ item }: { item: RankingItem }) {
  const { movie, rank } = item;
  const [primary, ...others] = movie.platforms;

  return (
    <Link
      href={`/contents/${movie.id}`}
      className="group/card w-[140px] shrink-0 snap-start outline-none sm:w-[160px] md:w-[190px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-white/5 shadow-lg shadow-black/50 ring-1 ring-white/10 transition duration-300 group-hover/card:scale-105 group-hover/card:ring-white/30 group-focus-visible/card:ring-2 group-focus-visible/card:ring-fuchsia-400">
        <img
          src={movie.poster_url}
          alt={`${movie.title} 포스터`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover/card:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        <div className="absolute left-2 top-2 flex items-center gap-1">
          {primary && <PlatformBadge code={primary.code} />}
          {others.length > 0 && (
            <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur">
              +{others.length}
            </span>
          )}
        </div>

        {item.is_new && (
          <span className="absolute right-2 top-2 rounded bg-fuchsia-500 px-1.5 py-0.5 text-[10px] font-black text-white">
            NEW
          </span>
        )}

        <span className="absolute bottom-1 left-2 text-6xl font-black italic leading-none text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] [-webkit-text-stroke:2px_rgba(255,255,255,0.95)] md:text-7xl">
          {rank}
        </span>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="truncate text-sm font-semibold text-white/90 group-hover/card:text-white">{movie.title}</p>
        <div className="mt-1 flex items-center justify-between text-xs text-white/50">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {movie.rating.overall.toFixed(1)}
            <span className="text-white/30">· {movie.release_year}</span>
          </span>
          <RankChange change={item.rank_change} isNew={item.is_new} />
        </div>
      </div>
    </Link>
  );
}

function CrossRatingCard({ movie, highlightAge }: { movie: Movie; highlightAge: AgeGroup }) {
  const rows = AGE_GROUPS.map((age) => ({ age, average: getAgeAverage(movie, age) }));
  const top = rows.reduce((a, b) => (b.average > a.average ? b : a));
  const gap = Math.max(...rows.map((r) => r.average)) - Math.min(...rows.map((r) => r.average));
  const insight =
    gap >= 0.6
      ? `세대 간 호불호 차이 큼 (Δ${gap.toFixed(1)})`
      : gap <= 0.2
        ? "전 세대가 고르게 호평"
        : `${AGE_GROUP_META[top.age].label}가 가장 높게 평가`;
  const primary = movie.platforms[0];

  return (
    <Link
      href={`/contents/${movie.id}`}
      className="group/card w-[150px] shrink-0 snap-start outline-none sm:w-[170px] md:w-[200px]"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-white/5 shadow-lg shadow-black/50 ring-1 ring-white/10 transition duration-300 group-hover/card:scale-105 group-hover/card:ring-white/30 group-focus-visible/card:ring-2 group-focus-visible/card:ring-fuchsia-400">
        <img
          src={movie.poster_url}
          alt={`${movie.title} 포스터`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover/card:scale-110"
        />

        {primary && (
          <div className="absolute left-2 top-2 z-10">
            <PlatformBadge code={primary.code} />
          </div>
        )}

        {/* 글래스모피즘 세대별 평점 오버레이 */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-black/10 p-2.5 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
          <div className="translate-y-4 rounded-xl border border-white/20 bg-white/10 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-300 group-hover/card:translate-y-0 group-focus-visible/card:translate-y-0">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-white/80">
                <Users className="h-3 w-3" />
                세대별 평점
              </span>
              <span className="flex items-center gap-0.5 text-xs font-bold text-yellow-300">
                <Star className="h-3 w-3 fill-yellow-300" />
                {movie.rating.overall.toFixed(1)}
              </span>
            </div>

            <ul className="space-y-2">
              {rows.map(({ age, average }) => {
                const meta = AGE_GROUP_META[age];
                const isMine = age === highlightAge;
                return (
                  <li key={age} className="flex items-center gap-2">
                    <span className={`w-7 shrink-0 text-[11px] font-bold ${isMine ? meta.textClass : "text-white/75"}`}>
                      {meta.label}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                      <div
                        className={`h-full rounded-full ${meta.barClass} transition-[width] duration-700`}
                        style={{ width: `${(average / 5) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-white">
                      {average.toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-tight text-white/65">{insight}</p>
          </div>
        </div>
      </div>

      <div className="mt-2.5 px-0.5">
        <p className="truncate text-sm font-semibold text-white/90 group-hover/card:text-white">{movie.title}</p>
        <p className="mt-1 truncate text-xs text-white/45">
          {movie.release_year} · {movie.genres.map((g) => g.name).join(" · ")}
        </p>
      </div>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative h-[85vh] min-h-[580px] w-full bg-gradient-to-b from-white/[0.06] to-[#0a0a0a]">
        <div className="absolute bottom-28 left-4 max-w-2xl space-y-4 md:bottom-40 md:left-12">
          <div className="h-7 w-48 rounded-full bg-white/10" />
          <div className="h-8 w-80 rounded bg-white/10" />
          <div className="h-14 w-96 max-w-[80vw] rounded bg-white/10" />
          <div className="h-16 w-[28rem] max-w-[85vw] rounded bg-white/5" />
          <div className="flex gap-3">
            <div className="h-12 w-36 rounded-md bg-white/15" />
            <div className="h-12 w-36 rounded-md bg-white/10" />
          </div>
        </div>
      </div>
      <div className="-mt-16 space-y-12 px-4 md:-mt-24 md:px-12">
        {[0, 1].map((row) => (
          <div key={row}>
            <div className="mb-5 h-6 w-56 rounded bg-white/10" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] w-[140px] shrink-0 rounded-lg bg-white/[0.07] sm:w-[160px] md:w-[190px]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 pt-16 text-center">
      <p className="text-lg font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-white/80"
      >
        다시 시도
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-10 text-xs text-white/40 md:px-12">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p>
          <span className="font-bold text-white/70">ViewFit</span> · 나의 상황에 딱 맞는 OTT 큐레이션
        </p>
        <nav className="flex gap-4">
          <a href="#" className="hover:text-white/80">서비스 소개</a>
          <a href="#" className="hover:text-white/80">이용약관</a>
          <a href="#" className="hover:text-white/80">개인정보처리방침</a>
          <a href="#" className="hover:text-white/80">고객센터</a>
        </nav>
        <p>© 2026 ViewFit. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ============================================================================
 * 7. Page
 * ========================================================================== */

export default function HomePage() {
  const { feed, error, retry } = useHomeFeed();

  const peerPicks = useMemo(() => {
    if (!feed) return [];
    const unique = new Map<number, Movie>();
    [...feed.rankings.map((r) => r.movie), ...feed.cross_age_picks].forEach((m) => unique.set(m.id, m));
    return [...unique.values()]
      .sort((a, b) => getAgeAverage(b, feed.user.age_group) - getAgeAverage(a, feed.user.age_group))
      .slice(0, 10);
  }, [feed]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-fuchsia-500/40">
      <Header />

      <main>
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : !feed ? (
          <HomeSkeleton />
        ) : (
          <>
            <HeroSection hero={feed.hero} user={feed.user} tpo={feed.tpo} />

            <div className="relative z-10 -mt-20 space-y-6 pb-16 md:-mt-28 md:space-y-10">
              <ContentRow
                title="오늘의 통합 OTT 랭킹 TOP 10"
                subtitle="넷플릭스 · 티빙 · 쿠팡플레이 · 웨이브 · 디즈니+ · 왓챠 실시간 합산"
                icon={<Flame className="h-5 w-5 text-rose-500 md:h-6 md:w-6" />}
              >
                {feed.rankings.map((item) => (
                  <RankingCard key={item.movie.id} item={item} />
                ))}
              </ContentRow>

              <ContentRow
                title="세대별 교차 평점 추천"
                subtitle="포스터에 마우스를 올려 20대 · 30대 · 40대 평점을 비교해 보세요"
                icon={<Users className="h-5 w-5 text-sky-400 md:h-6 md:w-6" />}
              >
                {feed.cross_age_picks.map((movie) => (
                  <CrossRatingCard key={movie.id} movie={movie} highlightAge={feed.user.age_group} />
                ))}
              </ContentRow>

              <ContentRow
                title={`${feed.user.nickname}님 또래 ${AGE_GROUP_META[feed.user.age_group].label}가 극찬한 작품`}
                subtitle={`${AGE_GROUP_META[feed.user.age_group].label} 평균 평점 기준 정렬`}
                icon={<Sparkles className="h-5 w-5 text-fuchsia-400 md:h-6 md:w-6" />}
              >
                {peerPicks.map((movie) => (
                  <CrossRatingCard key={movie.id} movie={movie} highlightAge={feed.user.age_group} />
                ))}
              </ContentRow>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
