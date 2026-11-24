"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ListChecks, LockKeyhole, Sparkles } from "lucide-react";
import { AuthHeader, AuthPage, MoodChip, OttStrip } from "../_components/onboarding-ui";
import { ApiError, getAccount, getOnboarding, saveOnboarding, type OnboardingAnswers } from "../_lib/account";
// 질문 부품은 8-1 취향 수정 화면(/me/taste)과 같이 쓰려고 공용 파일로 옮김
import { AGE_OPTIONS, GenreQuestions, INITIAL_ONBOARDING, JOB_OPTIONS, MemorableWorks, SingleChoice, SurveyDivider, SurveyGuidance } from "../_components/survey-questions";

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

const INITIAL: Answers = INITIAL_ONBOARDING;

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
      <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-4 py-12 md:px-16 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10 lg:px-12 xl:grid-cols-[400px_minmax(0,752px)] xl:justify-between xl:gap-16 xl:px-28">
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
              <SurveyGuidance icon={<ListChecks className="h-[18px] w-[18px]" />}>
                연령대와 직업은 하나씩, 선호 장르와 비선호 장르는 여러 개씩 선택할 수 있어요.
              </SurveyGuidance>
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
              <SurveyDivider />
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
        <h1 className="break-keep text-[38px] font-black leading-[1.3] tracking-[-1.38px] sm:text-[46px] lg:text-[36px] xl:text-[46px]">
          당신의 취향,
          <br />
          <span className="text-[#f0abfc]">한 번에 알려주세요.</span>
        </h1>
        <p className="break-keep text-[15px] leading-[1.6] text-[#9ca3b5]">
          연령대와 직업, 좋아하는 장르, 피하고 싶은 장르를 알려주면
          <br className="hidden xl:block" /> 나의 상황에 딱 맞는 OTT 추천을 준비해드릴게요.
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
