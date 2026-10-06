"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  SkipForward,
  Star,
  Subtitles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  AGE_GROUPS,
  AGE_GROUP_META,
  PLATFORM_STYLES,
  fetchContent,
  formatAgeRating,
  getAgeAverage,
  type Movie,
} from "../../_lib/viewfit";

/* ============================================================================
 * Constants
 * ========================================================================== */

const EPISODE_MINUTES = 60;
const CONTROLS_HIDE_MS = 3000;
const SEEK_SECONDS = 10;

// 더미 플레이어용 자막 큐 (실제 대사 대신 효과음 자막)
const CAPTIONS = ["[잔잔한 음악]", "[파도 소리]", "[멀리서 들려오는 웃음소리]", "[바람 소리]", "[음악 고조]", "[정적]"];

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

/* ============================================================================
 * Data
 * ========================================================================== */

function useContent(id: number) {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError("잘못된 콘텐츠 주소입니다.");
      return;
    }
    const controller = new AbortController();
    fetchContent(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setMovie(data);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      });
    return () => controller.abort();
  }, [id]);

  return { movie, error };
}

/* ============================================================================
 * Page
 * ========================================================================== */

export default function WatchPage() {
  const params = useParams<{ id: string }>();
  const { movie, error } = useContent(Number(params.id));

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black px-4 text-center text-white">
        <p className="text-lg font-semibold">{error}</p>
        <Link href="/" className="rounded-md bg-white px-5 py-2 text-sm font-bold text-black transition hover:bg-white/80">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-fuchsia-500" />
      </div>
    );
  }

  return <Player movie={movie} />;
}

/* ============================================================================
 * Player
 * ========================================================================== */

function Player({ movie }: { movie: Movie }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSeries = movie.content_type === "series";
  const duration = (movie.runtime ?? EPISODE_MINUTES) * 60;
  const platform = movie.platforms[0];

  const [episode, setEpisode] = useState(1);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [flash, setFlash] = useState<"play" | "pause" | "back" | "forward" | null>(null);

  const ended = current >= duration;
  const hasNextEpisode = isSeries && episode < (movie.episode_count ?? 1);

  // --- 재생 시뮬레이션 (1초 = 1초) -------------------------------------------
  useEffect(() => {
    if (!playing || ended) return;
    const t = setInterval(() => setCurrent((c) => Math.min(c + 1, duration)), 1000);
    return () => clearInterval(t);
  }, [playing, ended, duration]);

  useEffect(() => {
    if (ended) setPlaying(false);
  }, [ended]);

  // --- 컨트롤 자동 숨김 --------------------------------------------------------
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
  }, []);

  useEffect(() => {
    if (!playing) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setControlsVisible(true);
    } else {
      revealControls();
    }
  }, [playing, revealControls]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // --- 액션 --------------------------------------------------------------------
  const showFlash = useCallback((kind: "play" | "pause" | "back" | "forward") => {
    setFlash(kind);
    setTimeout(() => setFlash(null), 600);
  }, []);

  const togglePlay = useCallback(() => {
    if (ended) {
      setCurrent(0);
      setPlaying(true);
      return;
    }
    showFlash(playing ? "pause" : "play");
    setPlaying(!playing);
  }, [ended, playing, showFlash]);

  const seekBy = useCallback(
    (delta: number) => {
      setCurrent((c) => Math.min(Math.max(c + delta, 0), duration));
      showFlash(delta < 0 ? "back" : "forward");
      revealControls();
    },
    [duration, revealControls, showFlash],
  );

  const goBack = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootRef.current?.requestFullscreen();
    } catch {
      /* 전체화면을 지원하지 않는 환경 */
    }
  }, []);

  const playNextEpisode = () => {
    setEpisode((e) => e + 1);
    setCurrent(0);
    setPlaying(true);
  };

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // --- 키보드 단축키 -----------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          seekBy(-SEEK_SECONDS);
          break;
        case "ArrowRight":
          seekBy(SEEK_SECONDS);
          break;
        case "m":
          setMuted((m) => !m);
          break;
        case "f":
          void toggleFullscreen();
          break;
        case "Escape":
          if (!document.fullscreenElement) goBack();
          break;
      }
      revealControls();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen, goBack, revealControls]);

  const progress = (current / duration) * 100;
  const caption = CAPTIONS[Math.floor(current / 6) % CAPTIONS.length];
  const showChrome = controlsVisible || !playing;

  return (
    <div
      ref={rootRef}
      onMouseMove={revealControls}
      className={`vf-fade-in fixed inset-0 select-none overflow-hidden bg-black text-white ${showChrome ? "" : "cursor-none"}`}
    >
      <style>{`
        @keyframes vf-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes vf-kenburns { from { transform: scale(1.02) translate(0, 0) } to { transform: scale(1.14) translate(-2%, -1.5%) } }
        @keyframes vf-flash { 0% { opacity: 0; transform: scale(.8) } 30% { opacity: 1 } 100% { opacity: 0; transform: scale(1.25) } }
        .vf-fade-in { animation: vf-fade-in .45s ease-out both }
        .vf-flash { animation: vf-flash .6s ease-out both }
        @media (prefers-reduced-motion: reduce) { .vf-fade-in, .vf-flash, .vf-stage { animation: none !important } }
      `}</style>

      {/* Stage (더미 영상: 백드롭 + Ken Burns) */}
      <button type="button" aria-label={playing ? "일시정지" : "재생"} onClick={togglePlay} className="absolute inset-0 block h-full w-full">
        <img
          src={movie.backdrop_url}
          alt=""
          className="vf-stage h-full w-full object-cover"
          style={{
            animation: "vf-kenburns 40s ease-in-out infinite alternate",
            animationPlayState: playing ? "running" : "paused",
            filter: playing ? "none" : "brightness(.45) blur(2px)",
            transition: "filter .4s ease",
          }}
        />
      </button>

      {/* Center flash */}
      {flash && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="vf-flash flex h-24 w-24 items-center justify-center rounded-full bg-black/50 backdrop-blur-md">
            {flash === "play" && <Play className="h-10 w-10 fill-white" />}
            {flash === "pause" && <Pause className="h-10 w-10 fill-white" />}
            {flash === "back" && <RotateCcw className="h-10 w-10" />}
            {flash === "forward" && <RotateCw className="h-10 w-10" />}
          </div>
        </div>
      )}

      {/* Captions */}
      {captionsOn && playing && !ended && (
        <p
          className={`pointer-events-none absolute inset-x-0 text-center text-lg font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] transition-all duration-300 md:text-2xl ${
            showChrome ? "bottom-32" : "bottom-16"
          }`}
        >
          {caption}
        </p>
      )}

      {/* Paused info panel */}
      {!playing && !ended && <PausedPanel movie={movie} episode={isSeries ? episode : null} />}

      {/* Ended overlay */}
      {ended && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-4">
          <div className="vf-fade-in flex max-w-md flex-col items-center gap-4 text-center">
            <p className="text-sm text-white/60">{isSeries ? `${episode}화 시청 완료` : "시청 완료"}</p>
            <h2 className="text-3xl font-black">{movie.title}</h2>
            <div className="flex gap-3">
              {hasNextEpisode && (
                <button
                  type="button"
                  onClick={playNextEpisode}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 font-bold text-black transition hover:bg-white/80"
                >
                  <SkipForward className="h-5 w-5 fill-black" /> {episode + 1}화 재생
                </button>
              )}
              <button
                type="button"
                onClick={togglePlay}
                className="inline-flex items-center gap-2 rounded-md bg-white/20 px-6 py-3 font-bold backdrop-blur-md transition hover:bg-white/30"
              >
                <RotateCcw className="h-5 w-5" /> 처음부터
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className={`absolute inset-x-0 top-0 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-4 pb-16 pt-5 transition-opacity duration-300 md:px-10 ${
          showChrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="뒤로 가기"
            className="rounded-full p-2 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-7 w-7" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold md:text-xl">{movie.title}</p>
            <p className="text-xs text-white/60 md:text-sm">
              {isSeries ? `${episode}화` : `${movie.release_year} · 영화`} · {formatAgeRating(movie.age_rating)}
            </p>
          </div>
        </div>
        {platform && (
          <a
            href={platform.watch_url}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-md transition hover:bg-white/20 sm:inline-flex"
          >
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-black tracking-wide ${PLATFORM_STYLES[platform.code].className}`}
            >
              {PLATFORM_STYLES[platform.code].label}
            </span>
            에서 이어보기
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-5 pt-20 transition-opacity duration-300 md:px-10 ${
          showChrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ProgressBar
          progress={progress}
          onSeek={(ratio) => {
            setCurrent(Math.round(ratio * duration));
            revealControls();
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 md:gap-3">
            <ControlButton label={playing ? "일시정지 (Space)" : "재생 (Space)"} onClick={togglePlay}>
              {playing ? <Pause className="h-7 w-7 fill-white" /> : <Play className="h-7 w-7 fill-white" />}
            </ControlButton>
            <ControlButton label="10초 뒤로 (←)" onClick={() => seekBy(-SEEK_SECONDS)}>
              <RotateCcw className="h-6 w-6" />
            </ControlButton>
            <ControlButton label="10초 앞으로 (→)" onClick={() => seekBy(SEEK_SECONDS)}>
              <RotateCw className="h-6 w-6" />
            </ControlButton>
            <div className="group/vol flex items-center">
              <ControlButton label={muted ? "음소거 해제 (M)" : "음소거 (M)"} onClick={() => setMuted((m) => !m)}>
                {muted || volume === 0 ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </ControlButton>
              <input
                id="vf-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setMuted(false);
                }}
                aria-label="볼륨"
                className="hidden w-0 opacity-0 accent-fuchsia-500 transition-all duration-300 focus-visible:w-24 focus-visible:opacity-100 group-hover/vol:w-24 group-hover/vol:opacity-100 md:block"
              />
            </div>
            <span className="ml-2 text-sm tabular-nums text-white/80">
              {formatTime(current)} <span className="text-white/40">/ {formatTime(duration)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 md:gap-3">
            {hasNextEpisode && (
              <button
                type="button"
                onClick={playNextEpisode}
                className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-white/15 md:inline-flex"
              >
                <SkipForward className="h-5 w-5" /> 다음 화
              </button>
            )}
            <ControlButton label={captionsOn ? "자막 끄기" : "자막 켜기"} onClick={() => setCaptionsOn((c) => !c)} active={captionsOn}>
              <Subtitles className="h-6 w-6" />
            </ControlButton>
            <ControlButton label={fullscreen ? "전체화면 종료 (F)" : "전체화면 (F)"} onClick={() => void toggleFullscreen()}>
              {fullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
            </ControlButton>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Sub components
 * ========================================================================== */

function ControlButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-full p-2 transition hover:scale-110 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-400 ${
        active ? "text-fuchsia-300" : "text-white"
      }`}
    >
      {children}
    </button>
  );
}

function ProgressBar({ progress, onSeek }: { progress: number; onSeek: (ratio: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const seekFromEvent = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek(Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1));
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="재생 위치"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      tabIndex={0}
      onClick={(e) => seekFromEvent(e.clientX)}
      className="group/progress relative flex h-4 cursor-pointer items-center"
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/progress:h-1.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className="absolute h-4 w-4 -translate-x-1/2 scale-0 rounded-full bg-white shadow-lg transition-transform group-hover/progress:scale-100"
        style={{ left: `${progress}%` }}
      />
    </div>
  );
}

function PausedPanel({ movie, episode }: { movie: Movie; episode: number | null }) {
  return (
    <div className="vf-fade-in pointer-events-none absolute inset-y-0 left-0 flex max-w-xl flex-col justify-center gap-4 px-6 md:px-16">
      <p className="text-sm font-medium text-white/60">일시정지됨</p>
      <h2 className="text-4xl font-black tracking-tight md:text-5xl">{movie.title}</h2>
      <p className="text-sm text-white/70">
        {episode ? `${episode}화 · ` : ""}
        {movie.release_year} · {movie.genres.map((g) => g.name).join(" · ")}
      </p>
      <p className="line-clamp-3 text-sm leading-relaxed text-white/75 md:text-base">{movie.overview}</p>

      <div className="mt-2 w-full max-w-xs rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between text-xs font-semibold text-white/80">
          <span>세대별 평점</span>
          <span className="flex items-center gap-1 text-yellow-300">
            <Star className="h-3.5 w-3.5 fill-yellow-300" />
            {movie.rating.overall.toFixed(1)}
          </span>
        </div>
        <ul className="space-y-2">
          {AGE_GROUPS.map((age) => {
            const avg = getAgeAverage(movie, age);
            return (
              <li key={age} className="flex items-center gap-3">
                <span className={`w-8 text-xs font-bold ${AGE_GROUP_META[age].textClass}`}>{AGE_GROUP_META[age].label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div className={`h-full rounded-full ${AGE_GROUP_META[age].barClass}`} style={{ width: `${(avg / 5) * 100}%` }} />
                </div>
                <span className="w-7 text-right text-xs font-bold tabular-nums">{avg.toFixed(1)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
