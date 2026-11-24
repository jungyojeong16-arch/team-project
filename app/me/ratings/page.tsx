"use client";

import { ChevronDown, Ellipsis, Film, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { openContentDetail } from "../../_components/content-detail-modal";
import { openLoginModal } from "../../_components/login-modal";
import { Pagination } from "../../_components/pagination";
import { ProfileHeader } from "../../_components/profile-header";
import { PageContainer, SiteShell } from "../../_components/site-shell";
import { RatingDialog } from "../../_components/star-input";
import { StarRating } from "../../_components/star-rating";
import { EmptyState, ErrorState } from "../../_components/status-view";
import { useAccount } from "../../_lib/use-account";
import {
  RATING_SORTS,
  SCORE_FILTERS,
  deleteRating,
  fetchMyRatings,
  formatRatedDay,
  type MyRatingList,
  type MyRatingQuery,
  type RatingSort,
  type ScoreFilter,
} from "../../_lib/rating";
import type { Movie } from "../../_lib/viewfit";

/* ============================================================================
 * 5-1 나의 평점 (Figma 220:2672) — 담당: 정준교
 *   마이페이지 머리(공통 ProfileHeader) → "나의 평점 N" + 평균 → 전체/시리즈/영화 · 별점 · 정렬 → 평점 카드 3개 → 페이지 번호
 *   [평점·감상 수정] → 별점 팝업(RatingDialog) → 저장하면 평점 반영 결과 화면
 *   [⋯] → 평점 삭제
 * Figma 와 다른 점: 이름 아래 문구(예시 카피)는 설문의 좋아하는 장르로, 하단 '샘플 데이터' 안내는 지움 (PRD 5번)
 * ========================================================================== */

type TypeFilter = NonNullable<MyRatingQuery["type"]>;
const TYPES: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "series", label: "시리즈" },
  { value: "movie", label: "영화" },
];

const CONTROL = "flex h-9 items-center rounded-md border px-3.5 text-[13px] transition";
const CONTROL_OFF = "border-white/[0.08] bg-[#141416] text-[#b3b1bc] hover:border-white/20";
const CONTROL_ON = "border-[rgba(185,154,255,0.4)] bg-[rgba(167,139,250,0.08)] font-medium text-[#b99aff]";

/** 별점 · 정렬 드롭다운 (Figma "Filter control" + chevron-down) */
function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className={`${CONTROL} ${CONTROL_OFF} relative gap-2 pr-9 focus-within:border-white/30`}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="cursor-pointer appearance-none bg-transparent text-[13px] text-[#b3b1bc] outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#141416] text-white">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 size-3.5 text-[#b3b1bc]" aria-hidden />
    </label>
  );
}

function metaLine(movie: Movie) {
  return [movie.release_year || null, ...movie.genres.slice(0, 2).map((g) => g.name)].filter(Boolean).join(" · ");
}

/** [⋯] 메뉴 — 평점 삭제 */
function MoreMenu({ title, onDelete }: { title: string; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={`${title} 평점 메뉴`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-7 items-center justify-center rounded-md text-[#b3b1bc] transition hover:bg-white/10 hover:text-white"
      >
        <Ellipsis className="size-[18px]" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-white/[0.12] bg-[#1b1b20] p-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="w-full rounded-md px-3 py-2 text-left text-[13px] text-[#fb7185] transition hover:bg-white/5"
          >
            평점 삭제
          </button>
        </div>
      )}
    </div>
  );
}

function RatingCard({
  item,
  onEdit,
  onDelete,
}: {
  item: MyRatingList["results"][number];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { movie } = item;
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-white/[0.08] bg-[#141416] p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 items-center gap-6">
        <button type="button" onClick={() => openContentDetail(movie, "나의 평점")} className="shrink-0" aria-label={`${movie.title} 상세 보기`}>
          {movie.poster_url ? (
            <img src={movie.poster_url} alt="" className="h-[120px] w-20 rounded object-cover" />
          ) : (
            <span className="flex h-[120px] w-20 items-center justify-center rounded bg-gradient-to-br from-[#b4464f] to-[#2a1416]">
              <Film className="size-7 text-white/50" strokeWidth={1.5} aria-hidden />
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-3.5 gap-y-1">
            <button type="button" onClick={() => openContentDetail(movie, "나의 평점")} className="truncate text-left text-lg font-bold text-white hover:underline">
              {movie.title}
            </button>
            <span className="text-xs text-[#777580]">{metaLine(movie)}</span>
          </div>
          {item.comment ? (
            <p className="text-[15px] leading-[1.6] break-words text-[#b3b1bc]">{item.comment}</p>
          ) : (
            <p className="text-[15px] leading-[1.6] text-[#777580]">남긴 감상이 없어요.</p>
          )}
          <p className="text-[11px] text-[#777580]">{formatRatedDay(item.updated_at)} 평가함</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-row items-center justify-between gap-[18px] sm:w-[200px] sm:flex-col sm:items-end">
        <div className="flex items-center gap-3">
          <StarRating value={item.score} size={20} />
          <span className="text-2xl font-bold tabular-nums text-white">{item.score.toFixed(1)}</span>
          <span className="text-xs text-[#777580]">/ 5</span>
        </div>
        <div className="flex items-center gap-5">
          <button type="button" onClick={onEdit} className="flex items-center gap-1.5 text-xs text-[#b99aff] transition hover:text-[#d4c2ff]">
            <Pencil className="size-[13px]" aria-hidden />
            평점·감상 수정
          </button>
          <MoreMenu title={movie.title} onDelete={onDelete} />
        </div>
      </div>
    </article>
  );
}

export default function MyRatingsPage() {
  const { account, ready } = useAccount();
  const [type, setType] = useState<TypeFilter>("all");
  const [score, setScore] = useState<ScoreFilter>("all");
  const [sort, setSort] = useState<RatingSort>("recent");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MyRatingList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MyRatingList["results"][number] | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!ready || !account) return;
    const controller = new AbortController();
    setError(null);
    fetchMyRatings({ type, score, sort, page }, controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return;
        setData(d);
        if (d.page !== page) setPage(d.page); // 지우고 나서 마지막 페이지가 사라진 경우
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "나의 평점을 불러오지 못했어요.");
      });
    return () => controller.abort();
  }, [ready, account, type, score, sort, page, reload]);

  const changeFilter = useCallback(<T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  }, []);

  const remove = async (item: MyRatingList["results"][number]) => {
    if (!window.confirm(`'${item.movie.title}' 평점을 삭제할까요?`)) return;
    try {
      await deleteRating(item.content_id);
      setReload((n) => n + 1);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "평점을 지우지 못했어요.");
    }
  };

  if (ready && !account) {
    return (
      <SiteShell>
        <PageContainer className="py-24">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-lg font-bold text-white">로그인하면 내가 남긴 평점을 볼 수 있어요</p>
            <button
              type="button"
              onClick={openLoginModal}
              className="rounded-md bg-[#b99aff] px-5 py-2.5 text-sm font-bold text-[#181321] transition hover:bg-[#c9b0ff]"
            >
              로그인
            </button>
          </div>
        </PageContainer>
      </SiteShell>
    );
  }

  const survey = account?.survey;
  const badge = [survey?.age_group, survey?.occupation].filter((v) => v && v !== "응답 안 함").join(" · ");
  const liked = survey?.liked ?? [];
  const summary = data?.summary ?? null;
  const filtered = type !== "all" || score !== "all";

  return (
    <SiteShell>
      <PageContainer>
        <ProfileHeader
          nickname={account?.nickname || account?.email || ""}
          badge={badge || undefined}
          line={liked.length ? `좋아하는 장르 · ${liked.slice(0, 4).join(", ")}${liked.length > 4 ? " 외" : ""}` : undefined}
          stats={summary}
          active="ratings"
        />

        <section className="flex flex-col gap-6 pt-8 pb-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="flex items-center gap-3 font-bold">
                <span className="text-[28px] tracking-[-0.56px] text-white">나의 평점</span>
                <span className="text-[22px] text-[#b99aff]">{summary?.rating_count ?? ""}</span>
              </h2>
              <p className="text-sm text-[#b3b1bc]">내가 본 이야기, 내가 느낀 만큼. 남긴 별점과 감상을 한곳에서 관리해요.</p>
            </div>
            <div className="flex items-start gap-2.5 self-start rounded-md bg-[rgba(167,139,250,0.08)] px-4 py-3 sm:self-auto">
              <span className="text-xs text-[#b3b1bc]">나의 평균 평점</span>
              <span className="text-lg leading-none font-bold text-[#b99aff]">
                ★ {summary?.rating_average != null ? summary.rating_average.toFixed(1) : "–"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="작품 유형·별점">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={type === t.value}
                  onClick={() => changeFilter(setType)(t.value)}
                  className={`${CONTROL} ${type === t.value ? CONTROL_ON : CONTROL_OFF}`}
                >
                  {t.label}
                </button>
              ))}
              <SelectControl label="별점" value={score} options={SCORE_FILTERS} onChange={changeFilter(setScore)} />
            </div>
            <SelectControl label="정렬" value={sort} options={RATING_SORTS} onChange={changeFilter(setSort)} />
          </div>

          {error ? (
            <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
          ) : !data ? (
            <div className="flex animate-pulse flex-col gap-3" role="status" aria-label="불러오는 중">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[162px] rounded-lg bg-white/[0.05]" />
              ))}
            </div>
          ) : data.count === 0 ? (
            filtered ? (
              <EmptyState title="조건에 맞는 평점이 없어요" description="다른 유형이나 별점을 골라 보세요." />
            ) : (
              <EmptyState
                title="아직 남긴 평점이 없어요"
                description="작품을 눌러 상세 정보에서 별점을 남겨 보세요."
                action={{ label: "통합 랭킹 보러 가기", href: "/ranking" }}
              />
            )
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {data.results.map((item) => (
                  <RatingCard key={item.content_id} item={item} onEdit={() => setEditing(item)} onDelete={() => remove(item)} />
                ))}
              </div>
              <div className="pt-7 pb-3">
                <Pagination
                  page={data.page}
                  pageSize={data.page_size}
                  total={data.count}
                  onChange={setPage}
                  activeClassName="bg-[#b99aff] font-bold text-[#181321]"
                />
              </div>
            </>
          )}
        </section>
      </PageContainer>

      {editing && (
        <RatingDialog
          movie={editing.movie}
          open
          initial={{ score: editing.score, comment: editing.comment }}
          onClose={() => setEditing(null)}
        />
      )}
    </SiteShell>
  );
}
