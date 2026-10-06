"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  ListChecks,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  AuthHeader,
  AuthPage,
  CheckTile,
  ChoicePill,
  FormCard,
  InfoNote,
  MoodChip,
  OttStrip,
  PRIMARY_BUTTON,
  PlatformTag,
  SECONDARY_BUTTON,
  SectionTitle,
  StoryDescription,
  StoryHeadline,
} from "../_components/onboarding-ui";
import { MOCK_MOVIES, PLATFORM_STYLES, type PlatformCode } from "../_lib/viewfit";
import { saveOnboarding, type OnboardingAnswers, type WatchedItem } from "../_lib/account";

/* ============================================================================
 * Figma: "ViewFit 설문 — 생활 정보 / 장르 취향 / 시청 이력"
 * ========================================================================== */

type Step = 1 | 2 | 3;

const STEPS: { step: Step; label: string }[] = [
  { step: 1, label: "생활 정보" },
  { step: 2, label: "장르 취향" },
  { step: 3, label: "시청 이력" },
];

const STORY: Record<Step, { first: string; accent: string; lines: string[]; noteTitle: string; note: string[] }> = {
  1: {
    first: "당신의 일상에,",
    accent: "딱 맞는 이야기.",
    lines: ["짧은 휴식에도, 여유로운 밤에도.", "평소의 일상을 알면 추천이 더 가까워져요."],
    noteTitle: "편한 만큼만 알려주세요",
    note: ["모든 생활 정보는 선택 사항이에요.", "답하기 어려운 질문은 건너뛰어도 괜찮아요."],
  },
  2: {
    first: "좋아하는 장면,",
    accent: "더 자주 만나게.",
    lines: ["설레는 로맨스부터 손에 땀을 쥐는 스릴러까지.", "끌리는 이야기와 피하고 싶은 이야기를 알려주세요."],
    noteTitle: "취향에는 정답이 없어요",
    note: ["여러 장르를 골라도 좋아요.", "선택한 취향은 나중에 언제든 바꿀 수 있어요."],
  },
  3: {
    first: "봤던 이야기 너머,",
    accent: "새로운 발견.",
    lines: ["즐겨 봤던 작품과 시청 시간을 바탕으로", "다음에 빠져들 이야기를 찾아드릴게요."],
    noteTitle: "기억나는 작품만으로 충분해요",
    note: ["OTT 계정을 연결할 필요는 없어요.", "직접 알려주신 작품만 추천에 참고해요."],
  },
};

const LIFESTYLE_QUESTIONS: {
  key: keyof OnboardingAnswers["lifestyle"];
  title: string;
  meta: string;
  options: string[];
  hint?: string;
}[] = [
  { key: "age_group", title: "연령대", meta: "하나만 선택", options: ["14–19세", "20대", "30대", "40대", "50대", "60대 이상", "응답 안 함"] },
  {
    key: "occupation",
    title: "직업",
    meta: "하나만 선택",
    options: ["학생", "직장인", "자영업·프리랜서", "가사·돌봄", "구직·휴직 중", "기타", "응답 안 함"],
  },
  {
    key: "sleep",
    title: "평균 수면 시간",
    meta: "하루 기준 · 하나만 선택",
    options: ["5시간 미만", "5–6시간", "6–7시간", "7–8시간", "8시간 이상", "모름·응답 안 함"],
  },
  { key: "pattern", title: "생활 패턴", meta: "하나만 선택", options: ["아침형", "저녁형", "일정하지 않아요", "잘 모르겠어요", "응답 안 함"] },
  {
    key: "stress",
    title: "최근 느끼는 스트레스 수준",
    meta: "하나만 선택",
    options: ["낮아요", "보통이에요", "높아요", "모름·응답 안 함"],
    hint: "편하게 느끼는 정도만 골라주세요. 콘텐츠 추천을 위한 참고 정보예요.",
  },
];

const GENRES = ["드라마", "로맨스", "코미디", "액션", "스릴러", "미스터리", "SF", "판타지", "공포", "다큐멘터리", "애니메이션", "예능"];

const WATCH_TIME_OPTIONS = ["거의 안 봐요", "30분 미만", "30분–1시간 미만", "1–2시간 미만", "2시간 이상", "모름·응답 안 함"];

const INITIAL: OnboardingAnswers = {
  lifestyle: { age_group: null, occupation: null, sleep: null, pattern: null, stress: null },
  genres: { liked: [], liked_all: false, disliked: [], disliked_none: false },
  history: { watched: [], none: false, daily_watch_time: null },
};

/* ============================================================================
 * Page
 * ========================================================================== */

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL);
  const [saving, setSaving] = useState(false);
  const story = STORY[step];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const goPrev = () => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step));
  const goNext = async () => {
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    setSaving(true);
    try {
      await saveOnboarding(answers);
      router.push("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthPage
      header={
        <AuthHeader
          right={
            <div className="flex items-center gap-3 text-sm md:text-base">
              <span className="flex items-center gap-2 text-white/60">
                <CheckCircle2 className="h-5 w-5 text-fuchsia-300" />
                회원가입 완료
              </span>
              <span className="h-4 w-px bg-white/20" />
              <span className="font-medium">나만의 추천 설정</span>
            </div>
          }
        />
      }
    >
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-14 md:px-16 lg:grid-cols-[400px_minmax(0,750px)] lg:justify-between lg:px-28 lg:py-[100px]">
        {/* Survey story */}
        <aside className="flex flex-col gap-8 lg:pt-[72px]">
          <div>
            <MoodChip icon={<Sparkles className="h-4 w-4" />}>당신을 알아가는 시간 · 약 2분</MoodChip>
          </div>
          <StoryHeadline first={story.first} accent={story.accent} />
          <StoryDescription lines={story.lines} />
          <ol className="flex flex-col gap-3" aria-label="설문 진행 단계">
            {STEPS.map(({ step: s, label }) => (
              <StepRow key={s} number={s} label={label} status={s < step ? "done" : s === step ? "current" : "todo"} />
            ))}
          </ol>
          <InfoNote title={story.noteTitle} lines={story.note} />
          <OttStrip />
        </aside>

        {/* Survey card */}
        <div>
          <FormCard>
            <p className="text-sm font-bold text-fuchsia-300">STEP 0{step} / 03</p>
            {step === 1 && <LifestyleStep answers={answers} setAnswers={setAnswers} />}
            {step === 2 && <GenreStep answers={answers} setAnswers={setAnswers} />}
            {step === 3 && <HistoryStep answers={answers} setAnswers={setAnswers} />}

            <div className="mt-10 border-t border-white/10 pt-8">
              <div className="flex gap-4">
                <button type="button" onClick={goPrev} className={`${SECONDARY_BUTTON} h-[54px] w-28 shrink-0`}>
                  <ArrowLeft className="h-5 w-5" /> 이전
                </button>
                <button type="button" onClick={goNext} disabled={saving} className={`${PRIMARY_BUTTON} h-[54px] flex-1 text-lg`}>
                  {step < 3 ? (
                    <>
                      다음 단계 <ArrowRight className="h-5 w-5" />
                    </>
                  ) : saving ? (
                    "추천을 준비하는 중…"
                  ) : (
                    <>
                      나만의 추천 시작하기 <Sparkles className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mx-auto mt-5 block text-sm text-white/55 underline-offset-4 transition hover:text-white hover:underline"
              >
                지금은 건너뛰고 둘러볼게요
              </button>
            </div>
          </FormCard>
        </div>
      </div>
    </AuthPage>
  );
}

/* ============================================================================
 * Left: step indicator
 * ========================================================================== */

function StepRow({ number, label, status }: { number: number; label: string; status: "done" | "current" | "todo" }) {
  const current = status === "current";
  return (
    <li
      aria-current={current ? "step" : undefined}
      className={`flex h-[60px] items-center gap-4 rounded-xl border px-4 ${
        current ? "border-fuchsia-300/40 bg-fuchsia-300/[0.06]" : "border-transparent"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
          status === "todo" ? "border border-white/15 text-white/60" : "bg-fuchsia-300 text-[#1f1029]"
        }`}
      >
        {status === "done" ? <Check className="h-4 w-4" strokeWidth={3} /> : `0${number}`}
      </span>
      <span className={`flex-1 ${current ? "font-bold" : "text-white/65"}`}>{label}</span>
      <span className={`text-xs ${current ? "text-fuchsia-300" : "text-white/45"}`}>
        {status === "done" ? "완료" : current ? "진행 중" : "예정"}
      </span>
    </li>
  );
}

/* ============================================================================
 * Shared bits
 * ========================================================================== */

type StepProps = {
  answers: OnboardingAnswers;
  setAnswers: Dispatch<SetStateAction<OnboardingAnswers>>;
};

function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <>
      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-[34px]">{title}</h2>
      <p className="mt-2 text-white/60">{description}</p>
    </>
  );
}

function Notice({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <p className="mt-8 flex items-center gap-3 rounded-lg bg-fuchsia-300/[0.07] px-5 py-4 text-sm text-fuchsia-100/90">
      {icon}
      {children}
    </p>
  );
}

/** 한국어 주제 조사 (받침 있으면 '은', 없으면 '는') */
const withTopic = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code <= 11171 && code % 28 !== 0 ? "은" : "는");
};

const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/* ============================================================================
 * STEP 1 — 생활 정보
 * ========================================================================== */

function LifestyleStep({ answers, setAnswers }: StepProps) {
  const select = (key: keyof OnboardingAnswers["lifestyle"], option: string) =>
    setAnswers((a) => ({
      ...a,
      lifestyle: { ...a.lifestyle, [key]: a.lifestyle[key] === option ? null : option },
    }));

  return (
    <>
      <StepHeading title="평소의 일상을 알려주세요" description="일상에 어울리는 작품을 추천하기 위한 질문이에요." />
      <Notice>모두 선택 질문이에요. 답변은 추천에만 참고하며, 나중에 수정할 수 있어요.</Notice>
      <div className="mt-10 flex flex-col gap-10">
        {LIFESTYLE_QUESTIONS.map(({ key, title, meta, options, hint }) => (
          <fieldset key={key}>
            <legend className="w-full">
              <SectionTitle title={title} meta={meta} />
            </legend>
            <div className="mt-4 flex flex-wrap gap-3">
              {options.map((option) => (
                <ChoicePill key={option} selected={answers.lifestyle[key] === option} onClick={() => select(key, option)}>
                  {option}
                </ChoicePill>
              ))}
            </div>
            {hint && <p className="mt-4 text-sm text-white/50">{hint}</p>}
          </fieldset>
        ))}
      </div>
    </>
  );
}

/* ============================================================================
 * STEP 2 — 장르 취향
 * ========================================================================== */

function GenreStep({ answers, setAnswers }: StepProps) {
  const { liked, liked_all, disliked, disliked_none } = answers.genres;
  const update = (patch: Partial<OnboardingAnswers["genres"]>) =>
    setAnswers((a) => ({ ...a, genres: { ...a.genres, ...patch } }));

  const summary = useMemo(() => {
    const more = liked_all ? "모든 장르를" : liked.length ? withTopic(liked.join(" · ")) : "";
    const less = disliked.length ? withTopic(disliked.join(" · ")) : "";
    if (!more && !less) return "아직 고른 장르가 없어요";
    if (more && less) return `${more} 더 많이, ${less} 덜`;
    return more ? `${more} 더 많이` : `${less} 덜`;
  }, [liked, liked_all, disliked]);

  return (
    <>
      <StepHeading title="어떤 이야기를 좋아하세요?" description="좋아하는 장르는 더 가깝게, 피하고 싶은 장르는 덜 추천할게요." />
      <Notice icon={<ListChecks className="h-5 w-5 shrink-0 text-fuchsia-300" />}>
        각 질문에서 여러 개를 선택할 수 있어요. 좋아하는 장르와 피하고 싶은 장르는 겹치지 않게 골라주세요.
      </Notice>

      <GenreGroup
        title="선호 장르"
        count={liked.length}
        selected={liked}
        blocked={disliked}
        onToggle={(g) => update({ liked: toggleIn(liked, g), liked_all: false })}
        extraLabel="모든 장르가 좋아요"
        extraChecked={liked_all}
        onExtra={() => update({ liked_all: !liked_all, liked: [] })}
      />
      <div className="my-10 border-t border-white/10" />
      <GenreGroup
        title="비선호 장르"
        count={disliked.length}
        selected={disliked}
        blocked={liked}
        onToggle={(g) => update({ disliked: toggleIn(disliked, g), disliked_none: false })}
        extraLabel="딱히 없어요"
        extraChecked={disliked_none}
        onExtra={() => update({ disliked_none: !disliked_none, disliked: [] })}
      />

      <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] px-6 py-5">
        <p className="font-bold">{summary}</p>
        <p className="mt-2 text-sm text-white/55">
          반대 질문에서 고른 장르는 흐리게 표시돼요. 바꾸려면 먼저 선택을 해제해주세요.
        </p>
      </div>
    </>
  );
}

function GenreGroup({
  title,
  count,
  selected,
  blocked,
  onToggle,
  extraLabel,
  extraChecked,
  onExtra,
}: {
  title: string;
  count: number;
  selected: string[];
  blocked: string[];
  onToggle: (genre: string) => void;
  extraLabel: string;
  extraChecked: boolean;
  onExtra: () => void;
}) {
  return (
    <fieldset className="mt-10">
      <legend className="w-full">
        <SectionTitle title={title} meta={`복수 선택 · ${count}개 선택됨`} />
      </legend>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {GENRES.map((genre) => (
          <CheckTile
            key={genre}
            checked={selected.includes(genre)}
            disabled={blocked.includes(genre)}
            onClick={() => onToggle(genre)}
          >
            {genre}
          </CheckTile>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <CheckTile checked={extraChecked} onClick={onExtra}>
          {extraLabel}
        </CheckTile>
        <span className="text-sm text-white/50">선택하면 개별 선택이 해제돼요</span>
      </div>
    </fieldset>
  );
}

/* ============================================================================
 * STEP 3 — 시청 이력
 * ========================================================================== */

const PLATFORM_OPTIONS = Object.entries(PLATFORM_STYLES) as [PlatformCode, { label: string }][];

function HistoryStep({ answers, setAnswers }: StepProps) {
  const { watched, none, daily_watch_time } = answers.history;
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformCode | "">("");
  const [suggestOpen, setSuggestOpen] = useState(false);

  const update = (patch: Partial<OnboardingAnswers["history"]>) =>
    setAnswers((a) => ({ ...a, history: { ...a.history, ...patch } }));

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return MOCK_MOVIES.filter((m) => m.title.includes(q) && !watched.some((w) => w.title === m.title)).slice(0, 5);
  }, [query, watched]);

  const addItem = (title: string) => {
    const clean = title.trim();
    if (!clean || watched.some((w) => w.title === clean)) return;
    const known = MOCK_MOVIES.find((m) => m.title === clean);
    const item: WatchedItem = {
      id: `${Date.now()}-${clean}`,
      title: clean,
      meta: known ? [known.release_year, ...known.genres.map((g) => g.name)].join(" · ") : "직접 입력한 작품",
      platform: platform || null,
    };
    update({ watched: [...watched, item], none: false });
    setQuery("");
    setPlatform("");
    setSuggestOpen(false);
  };

  return (
    <>
      <StepHeading title="최근에 어떤 작품을 봤나요?" description="기억나는 작품을 알려주시면 취향을 더 잘 이해할 수 있어요." />

      <section className="mt-8">
        <SectionTitle title="전에 봤던 OTT 작품 목록" meta="선택 · 여러 작품 추가 가능" />
        <p className="mt-2 text-sm text-white/55">
          영화나 시리즈 제목을 입력해주세요. 시청한 서비스는 기억나면 함께 골라주세요.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItem(query);
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
            <input
              id="history-title"
              value={query}
              disabled={none}
              onChange={(e) => {
                setQuery(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 120)}
              placeholder="봤던 작품 제목을 입력해주세요"
              aria-label="봤던 작품 제목"
              autoComplete="off"
              className="h-12 w-full rounded-lg border border-white/10 bg-[#0a0c11] pl-12 pr-4 text-[15px] placeholder:text-white/40 focus:border-fuchsia-300/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/30 disabled:opacity-40"
            />
            {suggestOpen && suggestions.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#11141c] shadow-2xl shadow-black/60">
                {suggestions.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addItem(m.title)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-white/[0.06]"
                    >
                      <span className="font-medium">{m.title}</span>
                      <span className="text-white/45">
                        {m.release_year} · {m.genres.map((g) => g.name).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative sm:w-[200px]">
            <select
              id="history-platform"
              value={platform}
              disabled={none}
              onChange={(e) => setPlatform(e.target.value as PlatformCode | "")}
              aria-label="시청한 OTT"
              className="h-12 w-full appearance-none rounded-lg border border-white/10 bg-[#0a0c11] pl-4 pr-10 text-[15px] text-white/80 focus:border-fuchsia-300/60 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/30 disabled:opacity-40"
            >
              <option value="">OTT 선택 (선택)</option>
              {PLATFORM_OPTIONS.map(([code, { label }]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
          </div>
          <button
            type="submit"
            disabled={none || !query.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-fuchsia-300/40 bg-fuchsia-300/[0.08] px-5 font-bold text-fuchsia-200 transition hover:bg-fuchsia-300/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-5 w-5" /> 추가
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm text-white/55">
          <span>추가한 작품</span>
          <span>{watched.length}편</span>
        </div>
        {watched.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-3">
            {watched.map((w) => (
              <li key={w.id} className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <Clapperboard className="h-5 w-5 text-white/70" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{w.title}</span>
                  <span className="block truncate text-sm text-white/45">{w.meta}</span>
                </span>
                {w.platform && <PlatformTag code={w.platform as PlatformCode} />}
                <button
                  type="button"
                  aria-label={`${w.title} 삭제`}
                  onClick={() => update({ watched: watched.filter((x) => x.id !== w.id) })}
                  className="rounded p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-white/10 px-5 py-6 text-center text-sm text-white/40">
            {none ? "기억나는 작품이 없어도 괜찮아요." : "제목을 입력하고 추가를 눌러주세요."}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <CheckTile checked={none} onClick={() => update({ none: !none, watched: !none ? [] : watched })}>
            아직 없어요 · 기억나지 않아요
          </CheckTile>
          <span className="text-sm text-white/50">선택하면 추가한 목록이 비워져요</span>
        </div>
      </section>

      <div className="my-10 border-t border-white/10" />

      <fieldset>
        <legend className="w-full">
          <SectionTitle title="평균 시청 시간" meta="최근 한 달 · 하루 평균" />
        </legend>
        <p className="mt-2 text-sm text-white/55">시청하지 않은 날도 포함해, 모든 OTT에서 본 시간을 합쳐주세요.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {WATCH_TIME_OPTIONS.map((option) => (
            <ChoicePill
              key={option}
              selected={daily_watch_time === option}
              onClick={() => update({ daily_watch_time: daily_watch_time === option ? null : option })}
            >
              {option}
            </ChoicePill>
          ))}
        </div>
      </fieldset>

      <div className="mt-10 flex items-center gap-4 rounded-xl bg-fuchsia-300/[0.07] px-6 py-5">
        <Sparkles className="h-6 w-6 shrink-0 text-fuchsia-300" />
        <div>
          <p className="font-bold">이제, 나만의 이야기를 발견할 시간</p>
          <p className="mt-1 text-sm text-white/60">알려주신 일상, 장르 취향, 시청 이력으로 추천을 시작해요.</p>
        </div>
      </div>
    </>
  );
}
