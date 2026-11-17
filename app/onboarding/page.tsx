"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type Dispatch, type KeyboardEvent, type ReactNode, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Info, ListChecks, LockKeyhole, Sparkles, X } from "lucide-react";
import { AuthHeader, AuthPage, MoodChip, OttStrip, PlatformTag } from "../_components/onboarding-ui";
import { SEARCH_MIN_LENGTH, searchContents, type ContentBrief, type PlatformCode } from "../_lib/viewfit";
import { ApiError, getAccount, getOnboarding, saveOnboarding, type OnboardingAnswers, type WatchedItem } from "../_lib/account";

/* ============================================================================
 * 3-1 맞춤 추천 설문 — Figma "ViewFit 맞춤 추천 설문" 39:3071
 * 한 화면에 5문항: 연령대 → 직업 → 선호 장르 → 비선호 장르 → 기억에 남는 작품
 * (수면 시간·생활 패턴·스트레스·시청 시간 질문은 D2 결정으로 삭제)
 *
 * 저장: PUT /api/v1/me/survey/ — 연령대·직업(member), 장르(genre_preference),
 *       기억에 남는 작품(watch_history source=survey, 작품 번호로)
 * 작품 찾기: GET /api/v1/contents/search/?q= (2글자 이상)
 * ========================================================================== */

type Answers = OnboardingAnswers;
type SetAnswers = Dispatch<SetStateAction<Answers>>;

const AGE_OPTIONS = ["14–19세", "20대", "30대", "40대", "50대", "60대 이상", "응답 안 함"];
const JOB_OPTIONS = ["학생", "직장인", "자영업·프리랜서", "가사·돌봄", "구직·휴직 중", "기타", "응답 안 함"];
const GENRES = ["드라마", "로맨스", "코미디", "액션", "스릴러", "미스터리", "SF", "판타지", "공포", "다큐멘터리", "애니메이션", "예능"];

const INITIAL: Answers = {
  // sleep·pattern·stress·daily_watch_time 은 더 묻지 않음 (프로필 화면 호환을 위해 칸만 null 로 유지)
  lifestyle: { age_group: null, occupation: null, sleep: null, pattern: null, stress: null },
  genres: { liked: [], liked_all: false, disliked: [], disliked_none: false },
  history: { watched: [], none: false, daily_watch_time: null },
};

/** 이 브라우저에 저장해 둔 지난 답변이 있으면 이어서 (없으면 처음부터) */
const loadInitial = (): Answers => {
  const saved = getOnboarding();
  if (!saved) return INITIAL;
  return {
    lifestyle: { ...INITIAL.lifestyle, age_group: saved.lifestyle.age_group, occupation: saved.lifestyle.occupation },
    genres: saved.genres,
    history: { ...INITIAL.history, watched: saved.history.watched.filter((w) => w.content_id) },
  };
};

const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** 한국어 주제 조사 (받침 있으면 '은', 없으면 '는') */
const withTopic = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code <= 11171 && code % 28 !== 0 ? "은" : "는");
};

/* ============================================================================
 * Page
 * ========================================================================== */

export default function OnboardingPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(INITIAL);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 설문은 로그인한 회원만 저장할 수 있음
  useEffect(() => {
    if (!getAccount()) router.replace("/login");
    else setAnswers(loadInitial());
  }, [router]);

  const submit = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveOnboarding(answers);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setSaveError(err instanceof ApiError ? err.message : "설문을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthPage
      header={
        <AuthHeader
          right={
            <div className="flex items-center gap-2.5 text-[13px]">
              <span className="flex items-center gap-2.5 text-[#9ca3b5]">
                <CheckCircle2 className="h-[18px] w-[18px] text-[#f0abfc]" />
                회원가입 완료
              </span>
              <span className="h-3.5 w-px bg-white/[0.12]" />
              <span className="text-[#eceef4]">나만의 추천 설정</span>
            </div>
          }
        />
      }
    >
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-4 py-12 md:px-16 lg:grid-cols-[400px_minmax(0,752px)] lg:justify-between lg:gap-16 lg:px-28">
        <SurveyStory />

        {/* Survey form (39:3125) */}
        <section className="flex flex-col justify-between gap-6 rounded-2xl border border-white/[0.12] bg-[rgba(13,17,27,0.94)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.31)] sm:p-9 lg:min-h-[968px]">
          <div className="flex flex-col gap-7">
            <header className="flex flex-col gap-2">
              <p className="text-xs font-bold leading-[1.6] text-[#f0abfc]">나만의 추천을 위한 5가지 질문</p>
              <h2 className="text-[26px] font-bold tracking-[-0.6px] text-white sm:text-[30px]">당신을 위한 추천을 준비해드릴게요</h2>
              <p className="text-sm leading-[1.6] text-[#9ca3b5]">연령대와 직업은 하나씩, 선호 장르와 비선호 장르는 여러 개씩 선택해주세요.</p>
            </header>

            <div className="flex flex-col gap-6">
              <Guidance icon={<ListChecks className="h-[18px] w-[18px]" />}>
                연령대와 직업은 하나씩, 선호 장르와 비선호 장르는 여러 개씩 선택할 수 있어요.
              </Guidance>
              <SingleChoice
                title="연령대"
                options={AGE_OPTIONS}
                value={answers.lifestyle.age_group}
                onChange={(v) => setAnswers((a) => ({ ...a, lifestyle: { ...a.lifestyle, age_group: v } }))}
              />
              <SingleChoice
                title="직업"
                options={JOB_OPTIONS}
                value={answers.lifestyle.occupation}
                onChange={(v) => setAnswers((a) => ({ ...a, lifestyle: { ...a.lifestyle, occupation: v } }))}
              />
              <Divider />
              <GenreQuestions answers={answers} setAnswers={setAnswers} />
              <MemorableWorks answers={answers} setAnswers={setAnswers} />
            </div>
          </div>

          {/* Survey actions (39:3235) */}
          <div className="flex flex-col gap-4 border-t border-white/[0.12] pt-6">
            {saveError && (
              <p role="alert" className="rounded-md border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                {saveError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex h-[54px] w-28 shrink-0 items-center justify-center gap-2 rounded-md border border-white/[0.12] text-sm text-[#eceef4] transition hover:bg-white/[0.05]"
              >
                <ArrowLeft className="h-[18px] w-[18px]" /> 이전
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="flex h-[54px] min-w-0 flex-1 items-center justify-center gap-2.5 rounded-md bg-[#f0abfc] text-base font-bold text-[#241229] transition hover:bg-[#f5c2fd] disabled:cursor-wait disabled:opacity-70"
              >
                {saving ? "추천을 준비하는 중…" : "나만의 추천 시작하기"}
                {!saving && <ArrowRight className="h-[18px] w-[18px]" />}
              </button>
            </div>
            <button type="button" onClick={() => router.push("/")} className="mx-auto text-xs text-[#9ca3b5] underline transition hover:text-white">
              지금은 건너뛰고 둘러볼게요
            </button>
          </div>
        </section>
      </div>
    </AuthPage>
  );
}

/* ============================================================================
 * 왼쪽 안내 (Survey story 39:3083)
 * ========================================================================== */

function SurveyStory() {
  return (
    <aside className="flex flex-col gap-8">
      <div>
        <MoodChip icon={<Sparkles className="h-3.5 w-3.5" />}>당신을 알아가는 시간 · 약 2분</MoodChip>
      </div>
      <div className="flex flex-col gap-5">
        <h1 className="break-keep text-[38px] font-black leading-[1.3] tracking-[-1.38px] sm:text-[46px]">
          당신의 취향,
          <br />
          <span className="text-[#f0abfc]">한 번에 알려주세요.</span>
        </h1>
        <p className="break-keep text-[15px] leading-[1.6] text-[#9ca3b5]">
          연령대와 직업, 좋아하는 장르, 피하고 싶은 장르를 알려주면
          <br className="hidden sm:block" /> 나의 상황에 딱 맞는 OTT 추천을 준비해드릴게요.
        </p>
      </div>
      <div className="flex h-[60px] items-center gap-3.5 rounded-md border border-[rgba(240,171,252,0.25)] bg-[rgba(240,171,252,0.08)] px-4" aria-current="step">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0abfc] text-xs font-bold text-[#241229]">01</span>
        <span className="flex-1 text-sm font-bold text-white">나의 정보와 취향</span>
        <span className="text-[11px] text-[#f0abfc]">진행 중</span>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-white/[0.12] bg-white/[0.02] p-5">
        <p className="flex items-center gap-2 text-[13px] font-bold text-[#eceef4]">
          <LockKeyhole className="h-4 w-4 text-[#f0abfc]" />
          편한 만큼만 알려주세요
        </p>
        <p className="text-xs leading-[1.6] text-[#9ca3b5]">
          모든 질문은 선택 사항이에요.
          <br />
          나중에 언제든 수정할 수 있어요.
        </p>
      </div>
      <OttStrip />
    </aside>
  );
}

/* ============================================================================
 * 공통 조각 (Figma 크기: 칩 높이 38 · 글자 13 · 모서리 6)
 * ========================================================================== */

function Divider() {
  return <div className="h-px bg-white/[0.12]" />;
}

function Guidance({ icon, children, fit = false }: { icon: ReactNode; children: ReactNode; fit?: boolean }) {
  return (
    <p className={`flex items-center gap-2.5 rounded-md bg-[rgba(240,171,252,0.08)] px-3.5 py-3 text-xs leading-[1.6] text-[#f0abfc] ${fit ? "w-fit" : ""}`}>
      <span className="shrink-0">{icon}</span>
      {children}
    </p>
  );
}

function QuestionHeading({ title, meta, inline = false }: { title: string; meta: string; inline?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${inline ? "" : "justify-between"}`}>
      <h3 className="text-[15px] font-bold text-[#eceef4]">{title}</h3>
      <span className="text-[11px] text-[#9ca3b5]">{meta}</span>
    </div>
  );
}

const OPTION_BASE = "flex h-[38px] items-center justify-center gap-2 rounded-md border px-[13px] text-[13px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0abfc]";
const OPTION_OFF = "border-white/[0.12] bg-white/[0.02] text-[#eceef4] hover:border-white/25";
const OPTION_ON = "border-[#f0abfc] bg-[rgba(240,171,252,0.08)] font-bold text-[#f0abfc]";

/** 하나만 선택 (다시 누르면 해제) — Figma Answer option */
function SingleChoice({ title, options, value, onChange }: { title: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="sr-only">{title}</legend>
      <QuestionHeading title={title} meta="하나만 선택" />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option;
          return (
            <button key={option} type="button" aria-pressed={selected} onClick={() => onChange(selected ? null : option)} className={`${OPTION_BASE} ${selected ? OPTION_ON : OPTION_OFF}`}>
              {selected && <span className="h-[5px] w-[5px] rounded-full bg-[#f0abfc]" />}
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** 복수 선택 체크 칸 — Figma Genre choices (체크 14px) */
function CheckOption({ checked, disabled = false, onClick, children, className = "" }: { checked: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      className={`${OPTION_BASE} ${checked ? OPTION_ON : OPTION_OFF} ${disabled ? "cursor-not-allowed opacity-35 hover:border-white/[0.12]" : ""} ${className}`}
    >
      <span
        aria-hidden
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${checked ? "border-[#f0abfc] bg-[#f0abfc] text-[#241229]" : "border-white/25"}`}
      >
        {checked && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </span>
      {children}
    </button>
  );
}

/* ============================================================================
 * 3·4번 질문 — 선호 장르 / 비선호 장르 (FR3)
 * ========================================================================== */

function GenreQuestions({ answers, setAnswers }: { answers: Answers; setAnswers: SetAnswers }) {
  const { liked, liked_all, disliked, disliked_none } = answers.genres;
  const update = (patch: Partial<Answers["genres"]>) => setAnswers((a) => ({ ...a, genres: { ...a.genres, ...patch } }));

  const summary = useMemo(() => {
    const more = liked_all ? "모든 장르를" : liked.length ? withTopic(liked.join(" · ")) : "";
    const less = disliked.length ? withTopic(disliked.join(" · ")) : "";
    if (!more && !less) return "아직 고른 장르가 없어요";
    if (more && less) return `${more} 더 많이, ${less} 덜`;
    return more ? `${more} 더 많이` : `${less} 덜`;
  }, [liked, liked_all, disliked]);

  return (
    <>
      <GenreGroup
        title="선호 장르"
        selected={liked_all ? [] : liked}
        blocked={disliked}
        onToggle={(g) => update({ liked: toggleIn(liked, g), liked_all: false })}
        extraLabel="모든 장르가 좋아요"
        extraChecked={liked_all}
        onExtra={() => update({ liked_all: !liked_all, liked: [] })}
      />
      <Divider />
      <GenreGroup
        title="비선호 장르"
        selected={disliked}
        blocked={liked}
        onToggle={(g) => update({ disliked: toggleIn(disliked, g), disliked_none: false })}
        extraLabel="딱히 없어요"
        extraChecked={disliked_none}
        onExtra={() => update({ disliked_none: !disliked_none, disliked: [] })}
      />
      {/* Taste summary (39:3232) */}
      <div className="flex flex-col gap-2 rounded-md border border-white/[0.12] bg-white/[0.02] p-4 leading-[1.6]">
        <p className="text-[13px] font-bold text-[#eceef4]">{summary}</p>
        <p className="text-[11px] text-[#9ca3b5]">반대 질문에서 고른 장르는 흐리게 표시돼요. 바꾸려면 먼저 선택을 해제해주세요.</p>
      </div>
    </>
  );
}

function GenreGroup({
  title,
  selected,
  blocked,
  onToggle,
  extraLabel,
  extraChecked,
  onExtra,
}: {
  title: string;
  selected: string[];
  blocked: string[];
  onToggle: (genre: string) => void;
  extraLabel: string;
  extraChecked: boolean;
  onExtra: () => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="sr-only">{title}</legend>
      <QuestionHeading title={title} meta={`복수 선택 · ${selected.length}개 선택됨`} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {GENRES.map((genre) => (
          <CheckOption key={genre} checked={selected.includes(genre)} disabled={blocked.includes(genre)} onClick={() => onToggle(genre)}>
            {genre}
          </CheckOption>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CheckOption checked={extraChecked} onClick={onExtra}>
          {extraLabel}
        </CheckOption>
        <span className="text-[11px] text-[#9ca3b5]">선택하면 개별 선택이 해제돼요</span>
      </div>
    </fieldset>
  );
}

/* ============================================================================
 * 5번 질문 — 기억에 남는 작품 (FR4): 제목 검색 → 작품 DB 에서 골라 등록·삭제
 * ========================================================================== */

const briefMeta = (c: ContentBrief) => [c.release_year, ...c.genres.slice(0, 2)].filter(Boolean).join(" · ");

function MemorableWorks({ answers, setAnswers }: { answers: Answers; setAnswers: SetAnswers }) {
  const watched = answers.history.watched;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentBrief[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const listId = useId();

  const candidates = results.filter((r) => !watched.some((w) => w.content_id === r.id));

  // 입력이 멈추고 0.25초 뒤에 검색 (2글자 이상)
  useEffect(() => {
    const q = query.trim();
    if (q.length < SEARCH_MIN_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => {
      searchContents(q, controller.signal)
        .then((rows) => {
          setResults(rows);
          setActive(0);
        })
        .catch(() => !controller.signal.aborted && setResults([]))
        .finally(() => !controller.signal.aborted && setSearching(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const setWatched = (next: WatchedItem[]) => setAnswers((a) => ({ ...a, history: { ...a.history, watched: next, none: next.length === 0 && a.history.none } }));

  const add = (c: ContentBrief) => {
    setWatched([
      ...watched,
      { id: `content-${c.id}`, content_id: c.id, title: c.title, meta: briefMeta(c), platform: c.platforms[0] ?? null },
    ]);
    setQuery("");
    setResults([]);
    setOpen(false);
    setMessage(null);
  };

  /** [추가] · Enter: 고른(또는 제목이 똑같은) 작품을 등록 */
  const addFromInput = () => {
    const q = query.trim();
    if (q.length < SEARCH_MIN_LENGTH) return setMessage("작품 제목을 두 글자 이상 입력해 주세요.");
    if (searching) return setMessage("작품을 찾는 중이에요. 잠시만요…");
    const exact = candidates.find((c) => c.title === q);
    const pick = exact ?? candidates[active];
    if (pick) return add(pick);
    setMessage(results.length ? "이미 등록한 작품이에요." : "찾는 작품이 아직 없어요. 다른 제목으로 찾아보세요.");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addFromInput();
    } else if (e.key === "ArrowDown" && candidates.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % candidates.length);
    } else if (e.key === "ArrowUp" && candidates.length) {
      e.preventDefault();
      setActive((i) => (i - 1 + candidates.length) % candidates.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= SEARCH_MIN_LENGTH && (candidates.length > 0 || !searching);

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby={`${listId}-title`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 id={`${listId}-title`} className="text-[15px] font-bold text-[#eceef4]">
          기억에 남는 작품
        </h3>
        <span className="text-[11px] text-[#9ca3b5]">선택 사항 · 여러 작품 입력 가능</span>
      </div>
      <Guidance icon={<Info className="h-[18px] w-[18px]" />} fit>
        작품 제목을 입력하고 추가 버튼을 눌러 여러 작품을 등록할 수 있어요.
      </Guidance>

      {/* Entry row (120:684) */}
      <div className="flex gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setMessage(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
            placeholder="작품 제목을 입력하세요"
            aria-label="기억에 남는 작품 제목"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            className="h-11 w-full rounded-md border border-white/[0.12] bg-white/[0.02] px-3.5 text-[13px] text-[#eceef4] placeholder:text-[#9ca3b5] focus:border-[#f0abfc]/60 focus:outline-none focus:ring-2 focus:ring-[#f0abfc]/25"
          />
          {showList && (
            <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-md border border-white/[0.12] bg-[#11141c] py-1 shadow-2xl shadow-black/60">
              {candidates.length === 0 ? (
                <li className="px-3.5 py-3 text-xs text-[#9ca3b5]">{results.length ? "이미 등록한 작품이에요." : "찾는 작품이 아직 없어요."}</li>
              ) : (
                candidates.map((c, i) => (
                  <li key={c.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => add(c)}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i === active ? "bg-white/[0.07]" : ""}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-[#eceef4]">{c.title}</span>
                        <span className="block truncate text-[11px] text-[#9ca3b5]">
                          {briefMeta(c)} · {c.content_type === "series" ? "시리즈" : "영화"}
                        </span>
                      </span>
                      {c.platforms[0] && <PlatformTag code={c.platforms[0]} />}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={addFromInput}
          className="h-11 w-[88px] shrink-0 rounded-md bg-[#f0abfc] text-sm font-bold text-[#241229] transition hover:bg-[#f5c2fd] sm:w-28"
        >
          추가
        </button>
      </div>
      {message && (
        <p role="status" className="text-xs text-[#f0abfc]">
          {message}
        </p>
      )}

      {/* Saved works (120:689) */}
      <div className="flex flex-col gap-3 rounded-md border border-white/[0.12] bg-white/[0.02] p-4">
        <div className="flex items-baseline gap-2">
          <p className="text-[13px] font-bold text-[#eceef4]">저장된 작품</p>
          <span className="text-[11px] text-[#9ca3b5]">{watched.length}개 등록됨</span>
        </div>
        {watched.length > 0 && (
          <ul className="flex flex-col gap-3">
            {watched.map((w) => (
              <li key={w.id} className="flex items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <p className="truncate text-[13px] font-bold text-[#eceef4]">{w.title}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[11px] text-[#9ca3b5]">{w.meta}</span>
                    {w.platform && <PlatformTag code={w.platform as PlatformCode} />}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`${w.title} 삭제`}
                  onClick={() => setWatched(watched.filter((x) => x.id !== w.id))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.02] text-[#9ca3b5] transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-[#9ca3b5]">기억에 남는 작품이 없다면 입력하지 않아도 돼요.</p>
      </div>
    </section>
  );
}
