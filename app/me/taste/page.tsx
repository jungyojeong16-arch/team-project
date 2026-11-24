"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, Info, Sparkles, UserRound } from "lucide-react";
import { openLoginModal } from "../../_components/login-modal";
import { SiteShell } from "../../_components/site-shell";
import { AGE_OPTIONS, CheckOption, GENRES, INITIAL_ONBOARDING, JOB_OPTIONS, MemorableWorks, genreSummary, toggleIn, watchedFromBrief } from "../../_components/survey-questions";
import { ApiError, fetchMe, getAccount, getOnboarding, saveOnboarding, type Account, type OnboardingAnswers, type SavedOnboarding } from "../../_lib/account";
import { refreshRecommendations } from "../../_lib/viewfit";

/* ============================================================================
 * 8-1 Step 3 취향 수정 — Figma "취향 수정" 220:5925 (PRD FR8~FR10)
 * 설문(3-1)과 같은 항목을 기존 값이 채워진 상태로 보여 주고,
 * [변경사항 저장] → PUT /me/survey/ → POST /recommendations/refresh/(실패해도 저장은 성공) → /profile
 * 왼쪽 카드의 한 줄 소개·취향 문장은 D8 팀 결정 후 (Step 1 profile_summary)
 * ========================================================================== */

/** 서버(DB)에 저장된 설문 값 → 화면 값. 기억에 남는 작품도 서버 값으로 채워야
 *  다른 브라우저에서 열고 저장해도 작품이 지워지지 않음 (PUT /me/survey/ 는 작품 목록을 통째로 바꿈) */
const surveyFromServer = (account: Account): SavedOnboarding | null => {
  if (!account.survey_completed || !account.survey) return null;
  return {
    lifestyle: { age_group: account.survey.age_group, occupation: account.survey.occupation, sleep: null, pattern: null, stress: null },
    genres: { liked: account.survey.liked, liked_all: false, disliked: account.survey.disliked, disliked_none: account.survey.disliked.length === 0 },
    history: { watched: (account.survey.memorable ?? []).map(watchedFromBrief), none: false, daily_watch_time: null },
    completed_at: "",
  };
};

const CARD = "rounded-2xl border border-white/[0.12] bg-[rgba(13,17,27,0.94)] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.24)] sm:p-6";

export default function TasteEditPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [answers, setAnswers] = useState<OnboardingAnswers>(INITIAL_ONBOARDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const saved = getAccount();
    if (!saved) {
      setLoading(false);
      openLoginModal();
      return;
    }
    const apply = (a: Account) => {
      setAccount(a);
      // 서버 값이 기준, 서버에 설문이 없을 때만 이 브라우저에 남은 답변 사용
      const base = surveyFromServer(a) ?? getOnboarding();
      if (base) setAnswers({
        lifestyle: { ...INITIAL_ONBOARDING.lifestyle, age_group: base.lifestyle.age_group, occupation: base.lifestyle.occupation },
        genres: base.genres,
        history: { ...INITIAL_ONBOARDING.history, watched: base.history.watched.filter((w) => w.content_id) },
      });
    };
    apply(saved);
    fetchMe().then((fresh) => { if (fresh) apply(fresh); else openLoginModal(); }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveOnboarding(answers);
      try { await refreshRecommendations(); } catch { /* 추천 새로 만들기가 실패해도 저장 성공은 유지 */ }
      router.push("/profile");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) openLoginModal();
      else setSaveError(err instanceof ApiError ? err.message : "변경사항을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally { setSaving(false); }
  };

  const setLifestyle = (key: "age_group" | "occupation") => (v: string | null) =>
    setAnswers((a) => ({ ...a, lifestyle: { ...a.lifestyle, [key]: v } }));
  const likedTags = answers.genres.liked_all ? ["모든 장르"] : answers.genres.liked;
  const name = account?.nickname || account?.email || "회원";

  return (
    <SiteShell>
      <div className="mx-auto max-w-[1440px] px-4 pb-10 pt-7 md:px-10 lg:px-12">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/profile" className="flex items-center gap-2 text-[13px] text-[#eceef4] transition hover:text-[#f0abfc]"><ArrowLeft className="h-4 w-4" />내 프로필로 돌아가기</Link>
          <p className="hidden text-xs text-[#9ca3b5] sm:block">내 프로필 <span className="mx-1">/</span> 취향 수정</p>
        </div>
        <header className="mb-8">
          <h1 className="text-[30px] font-bold tracking-[-0.8px] md:text-[34px]">취향 수정</h1>
          <p className="mt-2 break-keep text-sm leading-[1.6] text-[#9ca3b5]">지금의 취향을 알려주세요. {name}님에게 더 잘 맞는 이야기를 찾아드릴게요.</p>
        </header>

        {loading ? <div className="rounded-2xl border border-white/[0.12] bg-white/[0.02] py-16 text-center text-sm text-[#9ca3b5]">취향 정보를 불러오는 중이에요…</div> : (
          <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* 왼쪽: 프로필 카드 + 안내 */}
            <aside className="flex flex-col gap-7 lg:sticky lg:top-24">
              <section className="rounded-2xl border border-white/[0.12] bg-gradient-to-br from-[rgba(124,58,237,0.16)] to-[rgba(13,17,27,0.94)] p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600"><UserRound className="h-6 w-6 text-white" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">{name}</p>
                    <p className="mt-1 text-xs text-[#b99aff]">{[answers.lifestyle.age_group, answers.lifestyle.occupation].filter((v) => v && v !== "응답 안 함").join(" · ") || "기본 정보 없음"}</p>
                  </div>
                </div>
                <div className="mt-5 border-t border-white/[0.12] pt-5">
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-[#b99aff]"><Sparkles className="h-3.5 w-3.5" />나의 시청 취향</p>
                  {likedTags.length
                    ? <div className="flex flex-wrap gap-2">{likedTags.map((genre) => <span key={genre} className="whitespace-nowrap rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] text-[#d8c8ff]">#{genre}</span>)}</div>
                    : <p className="text-xs text-[#9ca3b5]">선택한 선호 장르가 없어요.</p>}
                </div>
              </section>
              <section className="px-1">
                <p className="text-sm font-bold text-[#eceef4]">취향은 언제든 바뀔 수 있으니까</p>
                <p className="mt-3 break-keep text-xs leading-[1.8] text-[#9ca3b5]">기존에 알려주신 정보를 불러왔어요. 바꾸고 싶은 항목만 수정해주세요.</p>
                <p className="mt-2 break-keep text-xs leading-[1.8] text-[#9ca3b5]">좋아요 표시한 작품과 남긴 평점도 함께 참고해 취향을 알아가고 있어요.</p>
              </section>
            </aside>

            <main className="flex min-w-0 flex-col gap-5">
              {/* 기본 정보 */}
              <section className={CARD}>
                <SectionHead title="기본 정보" desc="현재 나에게 해당하는 정보를 선택해주세요." optional />
                <div className="flex flex-col gap-6">
                  <RadioChoice title="연령대" options={AGE_OPTIONS} value={answers.lifestyle.age_group} onChange={setLifestyle("age_group")} />
                  <RadioChoice title="직업" options={JOB_OPTIONS} value={answers.lifestyle.occupation} onChange={setLifestyle("occupation")} />
                </div>
              </section>

              {/* 장르 취향 (FR10 같은 장르 동시 선택 불가 안내) */}
              <section className={CARD}>
                <SectionHead title="장르 취향" desc="좋아하는 장르와 피하고 싶은 장르를 각각 골라주세요." />
                <div className="grid gap-7 xl:grid-cols-2 xl:gap-8">
                  <GenreColumn liked answers={answers} setAnswers={setAnswers} />
                  <GenreColumn answers={answers} setAnswers={setAnswers} />
                </div>
                <div className="mt-6 flex gap-2.5 rounded-md bg-white/[0.04] px-3.5 py-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#b99aff]" />
                  <div className="text-xs leading-[1.6]">
                    <p className="font-bold text-[#b99aff]">{genreSummary(answers.genres)}</p>
                    <p className="mt-0.5 break-keep text-[#9ca3b5]">같은 장르는 동시에 선택할 수 없어요. 흐리게 표시된 장르를 선택하려면 반대 항목에서 먼저 해제해주세요.</p>
                  </div>
                </div>
              </section>

              {/* 기억에 남는 작품 */}
              <section className={CARD}>
                <SectionHead title="기억에 남는 작품" desc="작품 제목을 입력하고 추가해주세요. 여러 작품을 등록할 수 있어요." optional />
                <MemorableWorks answers={answers} setAnswers={setAnswers} hideHeading />
              </section>
              {saveError && <p role="alert" className="rounded-md border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">{saveError}</p>}

              {/* 저장 (FR9) */}
              <div className="flex flex-col gap-4 border-t border-white/[0.12] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[13px] text-[#eceef4]">변경사항은 저장 후 맞춤 추천에 반영돼요</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => router.push("/profile")} className="h-11 min-w-[70px] rounded-md border border-white/[0.2] px-5 text-sm text-[#eceef4] transition hover:bg-white/[0.05]">취소</button>
                  <button type="button" onClick={save} disabled={saving} className="h-11 min-w-[125px] flex-1 rounded-md bg-[#b99aff] px-5 text-sm font-bold text-[#1e1533] transition hover:bg-[#c9b0ff] disabled:cursor-wait disabled:opacity-70 sm:flex-none">{saving ? "저장 중…" : "변경사항 저장"}</button>
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function SectionHead({ title, desc, optional = false }: { title: string; desc: string; optional?: boolean }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-1.5 break-keep text-xs text-[#9ca3b5]">{desc}</p>
      </div>
      {optional && <span className="mt-1 shrink-0 text-[11px] text-[#9ca3b5]">선택 사항</span>}
    </div>
  );
}

/** 하나만 선택 (○ 표시, 다시 누르면 해제) — Figma 기본 정보 */
function RadioChoice({ title, options, value, onChange }: { title: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-baseline gap-2.5">
        <h3 className="text-sm font-bold text-[#eceef4]">{title}</h3>
        <span className="text-[11px] text-[#9ca3b5]">하나만 선택</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value === option;
          return (
            <button key={option} type="button" role="radio" aria-checked={on} onClick={() => onChange(on ? null : option)}
              className={`flex h-[38px] items-center gap-2 whitespace-nowrap rounded-md border px-3 text-[13px] transition ${on ? "border-[#b99aff] bg-[rgba(185,154,255,0.1)] font-bold text-[#b99aff]" : "border-white/[0.12] bg-white/[0.02] text-[#eceef4] hover:border-white/25"}`}>
              <span aria-hidden className={`flex h-3 w-3 items-center justify-center rounded-full border ${on ? "border-[#b99aff] bg-[#b99aff]" : "border-white/30"}`} />
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** 선호 / 비선호 장르 한 칸 — 반대쪽에서 고른 장르는 흐리게(선택 불가) */
function GenreColumn({ answers, setAnswers, liked = false }: { answers: OnboardingAnswers; setAnswers: (fn: (a: OnboardingAnswers) => OnboardingAnswers) => void; liked?: boolean }) {
  const g = answers.genres;
  const selected = liked ? (g.liked_all ? [] : g.liked) : g.disliked;
  const blocked = liked ? g.disliked : g.liked;
  const extra = liked ? g.liked_all : g.disliked_none;
  const update = (patch: Partial<OnboardingAnswers["genres"]>) => setAnswers((a) => ({ ...a, genres: { ...a.genres, ...patch } }));
  const toggle = (genre: string) => update(liked ? { liked: toggleIn(g.liked, genre), liked_all: false } : { disliked: toggleIn(g.disliked, genre), disliked_none: false });
  const toggleExtra = () => update(liked ? { liked_all: !g.liked_all, liked: [] } : { disliked_none: !g.disliked_none, disliked: [] });

  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="sr-only">{liked ? "선호 장르" : "비선호 장르"}</legend>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-bold text-[#eceef4]">{liked ? "선호 장르" : "비선호 장르"}</h3>
        <span className="text-[11px] text-[#b99aff]">복수 선택 · {selected.length}개 선택됨</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {GENRES.map((genre) => (
          <CheckOption key={genre} checked={selected.includes(genre)} disabled={blocked.includes(genre)} onClick={() => toggle(genre)} violet>{genre}</CheckOption>
        ))}
      </div>
      <Extra label={liked ? "모든 장르가 좋아요" : "딱히 없어요"} checked={extra} onClick={toggleExtra} />
    </fieldset>
  );
}

function Extra({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <CheckOption checked={checked} onClick={onClick} violet>{label}</CheckOption>
      <span className="text-[11px] text-[#9ca3b5]">선택 시 개별 선택 해제</span>
    </div>
  );
}
