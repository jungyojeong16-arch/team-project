"use client";

/* 3-1 설문(/onboarding)과 8-1 취향 수정(/me/taste)이 같이 쓰는 질문 부품 (Figma 39:3071 크기: 칩 높이 38 · 글자 13 · 모서리 6) */

import { useEffect, useId, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Check, Info, X } from "lucide-react";
import { SEARCH_MIN_LENGTH, searchContents, type ContentBrief, type PlatformCode } from "../_lib/viewfit";
import type { OnboardingAnswers, WatchedItem } from "../_lib/account";
import { PlatformTag } from "./onboarding-ui";

export type Answers = OnboardingAnswers;
export type SetAnswers = Dispatch<SetStateAction<Answers>>;

export const AGE_OPTIONS = ["14–19세", "20대", "30대", "40대", "50대", "60대 이상", "응답 안 함"];
export const JOB_OPTIONS = ["학생", "직장인", "자영업·프리랜서", "가사·돌봄", "구직·휴직 중", "기타", "응답 안 함"];
export const GENRES = ["드라마", "로맨스", "코미디", "액션", "스릴러", "미스터리", "SF", "판타지", "공포", "다큐멘터리", "애니메이션", "예능"];

export const INITIAL_ONBOARDING: Answers = {
  lifestyle: { age_group: null, occupation: null, sleep: null, pattern: null, stress: null },
  genres: { liked: [], liked_all: false, disliked: [], disliked_none: false },
  history: { watched: [], none: false, daily_watch_time: null },
};

export function SurveyDivider() {
  return <div className="h-px bg-white/[0.12]" />;
}

export function SurveyGuidance({ icon, children, fit = false }: { icon: ReactNode; children: ReactNode; fit?: boolean }) {
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

const OPTION_BASE = "whitespace-nowrap flex h-[38px] items-center justify-center gap-2 rounded-md border px-[13px] text-[13px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f0abfc]";
const OPTION_OFF = "border-white/[0.12] bg-white/[0.02] text-[#eceef4] hover:border-white/25";
const OPTION_ON = "border-[#f0abfc] bg-[rgba(240,171,252,0.08)] font-bold text-[#f0abfc]";

export function SingleChoice({ title, options, value, onChange }: { title: string; options: string[]; value: string | null; onChange: (v: string | null) => void }) {
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

/** violet: 8-1 취향 수정 화면(Figma 220:5925)의 보라 강조색 — 기본값은 설문 화면의 분홍 */
export function CheckOption({ checked, disabled = false, onClick, children, className = "", violet = false }: { checked: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; className?: string; violet?: boolean }) {
  const on = violet ? "border-[#b99aff] bg-[rgba(185,154,255,0.1)] font-bold text-[#b99aff]" : OPTION_ON;
  const box = violet ? "border-[#b99aff] bg-[#b99aff] text-[#1e1533]" : "border-[#f0abfc] bg-[#f0abfc] text-[#241229]";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      className={`${OPTION_BASE} ${checked ? on : OPTION_OFF} ${disabled ? "cursor-not-allowed opacity-35 hover:border-white/[0.12]" : ""} ${className}`}
    >
      <span aria-hidden className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${checked ? box : "border-white/25"}`}>
        {checked && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </span>
      {children}
    </button>
  );
}

export const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

const withTopic = (word: string) => {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code <= 11171 && code % 28 !== 0 ? "은" : "는");
};

/** "드라마 · 로맨스는 더 많이, 공포는 덜" (Figma Taste summary) */
export const genreSummary = ({ liked, liked_all, disliked }: Answers["genres"]) => {
  const more = liked_all ? "모든 장르를" : liked.length ? withTopic(liked.join(" · ")) : "";
  const less = disliked.length ? withTopic(disliked.join(" · ")) : "";
  if (!more && !less) return "아직 고른 장르가 없어요";
  if (more && less) return `${more} 더 많이, ${less} 덜`;
  return more ? `${more} 더 많이` : `${less} 덜`;
};

export function GenreQuestions({ answers, setAnswers, threeColumns = false }: { answers: Answers; setAnswers: SetAnswers; threeColumns?: boolean }) {
  const { liked, liked_all, disliked, disliked_none } = answers.genres;
  const update = (patch: Partial<Answers["genres"]>) => setAnswers((a) => ({ ...a, genres: { ...a.genres, ...patch } }));

  const summary = useMemo(() => genreSummary(answers.genres), [answers.genres]);

  return (
    <>
      <GenreGroup title="선호 장르" selected={liked_all ? [] : liked} blocked={disliked} onToggle={(g) => update({ liked: toggleIn(liked, g), liked_all: false })} extraLabel="모든 장르가 좋아요" extraChecked={liked_all} onExtra={() => update({ liked_all: !liked_all, liked: [] })} threeColumns={threeColumns} />
      <SurveyDivider />
      <GenreGroup title="비선호 장르" selected={disliked} blocked={liked} onToggle={(g) => update({ disliked: toggleIn(disliked, g), disliked_none: false })} extraLabel="딱히 없어요" extraChecked={disliked_none} onExtra={() => update({ disliked_none: !disliked_none, disliked: [] })} threeColumns={threeColumns} />
      <div className="flex flex-col gap-2 rounded-md border border-white/[0.12] bg-white/[0.02] p-4 leading-[1.6]">
        <p className="text-[13px] font-bold text-[#eceef4]">{summary}</p>
        <p className="text-[11px] text-[#9ca3b5]">반대 질문에서 고른 장르는 흐리게 표시돼요. 바꾸려면 먼저 선택을 해제해주세요.</p>
      </div>
    </>
  );
}

function GenreGroup({ title, selected, blocked, onToggle, extraLabel, extraChecked, onExtra, threeColumns }: { title: string; selected: string[]; blocked: string[]; onToggle: (genre: string) => void; extraLabel: string; extraChecked: boolean; onExtra: () => void; threeColumns: boolean }) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="sr-only">{title}</legend>
      <QuestionHeading title={title} meta={`복수 선택 · ${selected.length}개 선택됨`} />
      <div className={`grid gap-2 ${threeColumns ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
        {GENRES.map((genre) => (
          <CheckOption key={genre} checked={selected.includes(genre)} disabled={blocked.includes(genre)} onClick={() => onToggle(genre)}>
            {genre}
          </CheckOption>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CheckOption checked={extraChecked} onClick={onExtra}>{extraLabel}</CheckOption>
        <span className="text-[11px] text-[#9ca3b5]">선택하면 개별 선택이 해제돼요</span>
      </div>
    </fieldset>
  );
}

const briefMeta = (c: ContentBrief) => [c.release_year, ...c.genres.slice(0, 2)].filter(Boolean).join(" · ");

/** 검색 결과(또는 서버에 저장된 작품) → "저장된 작품" 한 줄 */
export const watchedFromBrief = (c: ContentBrief): WatchedItem => ({
  id: `content-${c.id}`, content_id: c.id, title: c.title, meta: briefMeta(c), platform: c.platforms[0] ?? null,
});

/** hideHeading: 화면 쪽에서 제목·설명을 따로 그릴 때 (8-1 취향 수정) — 기본값은 설문 화면 그대로 */
export function MemorableWorks({ answers, setAnswers, hideHeading = false }: { answers: Answers; setAnswers: SetAnswers; hideHeading?: boolean }) {
  const watched = answers.history.watched;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentBrief[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const listId = useId();

  const candidates = results.filter((r) => !watched.some((w) => w.content_id === r.id));

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
        .then((rows) => { setResults(rows); setActive(0); })
        .catch(() => !controller.signal.aborted && setResults([]))
        .finally(() => !controller.signal.aborted && setSearching(false));
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const setWatched = (next: WatchedItem[]) => setAnswers((a) => ({ ...a, history: { ...a.history, watched: next, none: next.length === 0 && a.history.none } }));

  const add = (c: ContentBrief) => {
    setWatched([...watched, watchedFromBrief(c)]);
    setQuery(""); setResults([]); setOpen(false); setMessage(null);
  };

  const addFromInput = () => {
    const q = query.trim();
    if (q.length < SEARCH_MIN_LENGTH) return setMessage("작품 제목을 두 글자 이상 입력해 주세요.");
    if (searching) return setMessage("작품을 찾는 중이에요. 잠시만요…");
    const exact = candidates.find((c) => c.title === q);
    const pick = exact ?? candidates[active];
    if (pick) return add(pick);
    setMessage(results.length ? "이미 등록한 작품이에요." : "찾는 작품이 아직 없어요. 다른 제목으로 찾아보세요.");
  };

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby={hideHeading ? undefined : `${listId}-title`} aria-label={hideHeading ? "기억에 남는 작품" : undefined}>
      {!hideHeading && (
        <>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 id={`${listId}-title`} className="text-[15px] font-bold text-[#eceef4]">기억에 남는 작품</h3>
            <span className="text-[11px] text-[#9ca3b5]">선택 사항 · 여러 작품 입력 가능</span>
          </div>
          <SurveyGuidance icon={<Info className="h-[18px] w-[18px]" />} fit>
            작품 제목을 입력하고 추가 버튼을 눌러 여러 작품을 등록할 수 있어요.
          </SurveyGuidance>
        </>
      )}
      <div className="flex gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setMessage(null); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addFromInput(); }
              else if (e.key === "ArrowDown" && candidates.length) { e.preventDefault(); setOpen(true); setActive((i) => (i + 1) % candidates.length); }
              else if (e.key === "ArrowUp" && candidates.length) { e.preventDefault(); setActive((i) => (i - 1 + candidates.length) % candidates.length); }
              else if (e.key === "Escape") setOpen(false);
            }}
            placeholder="작품 제목을 입력하세요"
            aria-label="기억에 남는 작품 제목"
            role="combobox"
            aria-expanded={open && query.trim().length >= SEARCH_MIN_LENGTH && (candidates.length > 0 || !searching)}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            className="h-11 w-full rounded-md border border-white/[0.12] bg-white/[0.02] px-3.5 text-[13px] text-[#eceef4] placeholder:text-[#9ca3b5] focus:border-[#f0abfc]/60 focus:outline-none focus:ring-2 focus:ring-[#f0abfc]/25"
          />
          {open && query.trim().length >= SEARCH_MIN_LENGTH && (candidates.length > 0 || !searching) && (
            <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-md border border-white/[0.12] bg-[#11141c] py-1 shadow-2xl shadow-black/60">
              {candidates.length === 0 ? (
                <li className="px-3.5 py-3 text-xs text-[#9ca3b5]">{results.length ? "이미 등록한 작품이에요." : "찾는 작품이 아직 없어요."}</li>
              ) : candidates.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === active}>
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => add(c)} className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i === active ? "bg-white/[0.07]" : ""}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-[#eceef4]">{c.title}</span>
                      <span className="block truncate text-[11px] text-[#9ca3b5]">{briefMeta(c)} · {c.content_type === "series" ? "시리즈" : "영화"}</span>
                    </span>
                    {c.platforms[0] && <PlatformTag code={c.platforms[0]} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" onClick={addFromInput} className="h-11 w-[88px] shrink-0 rounded-md bg-[#f0abfc] text-sm font-bold text-[#241229] transition hover:bg-[#f5c2fd] sm:w-28">추가</button>
      </div>
      {message && <p role="status" className="text-xs text-[#f0abfc]">{message}</p>}
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
                <button type="button" aria-label={`${w.title} 삭제`} onClick={() => setWatched(watched.filter((x) => x.id !== w.id))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.02] text-[#9ca3b5] transition hover:bg-white/10 hover:text-white"><X className="h-3.5 w-3.5" strokeWidth={3} /></button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-[#9ca3b5]">기억에 남는 작품이 없다면 입력하지 않아도 돼요.</p>
      </div>
    </section>
  );
}
