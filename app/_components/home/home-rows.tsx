import { Flame, Sparkles, Star, Users } from "lucide-react";
import { AGE_GROUPS, AGE_GROUP_META, getAgeAverage, type AgeGroup, type Movie, type RankingItem } from "../../_lib/viewfit";
import { ContentRow } from "../content-row";
import { PosterCard, RankChange } from "../poster-card";

/* ============================================================================
 * 0-4 홈 ②~⑤ 카드 줄들 (Figma Home Feed 9:5 · 프로필 메뉴 열림 40:1849 의 이어지는 영역)
 *   ② RecommendRow    OO님 맞춤 추천작품         → 데이터: 7-1 (홍준화)
 *   ③ RankingTop10    오늘의 통합 OTT랭킹 TOP 10  → 데이터: 6-1 (정준교)
 *   ④ CrossAgePicks   세대별 교차 평점 추천       → 데이터: 6-2 (정준교)
 *   ⑤ PeerPicks       또래 OO대가 극찬한 작품     → 데이터: 6-2 (정준교)
 * 영역마다 데이터만 props 로 받으므로, 담당자는 자기 영역에 넘기는 값만 진짜 API 로 바꾸면 됩니다.
 * ========================================================================== */

const codes = (movie: Movie) => movie.platforms.map((p) => p.code);
const ratingStat = (movie: Movie) => `★ ${movie.rating.overall.toFixed(1)} · ${movie.release_year}`;
// TODO(4-1): 카드를 누르면 작품 상세 팝업 열기 — 지금은 예전 상세 주소
const detailHref = (movie: Movie) => `/watch/${movie.id}`;

/** ② 맞춤 추천작품 (Figma "Tab / 정준교님 맞춤 추천작품" 9:74) */
export function RecommendRow({ nickname, movies }: { nickname: string; movies: Movie[] }) {
  if (movies.length === 0) return null;
  return (
    <ContentRow title={`${nickname}님 맞춤 추천작품`} icon={<Flame className="h-5 w-5 text-rose-500 md:h-6 md:w-6" />} seeAllHref="/recommend">
      {movies.map((movie, i) => (
        <PosterCard key={movie.id} rank={i + 1} title={movie.title} posterUrl={movie.poster_url} platforms={codes(movie)} stat={ratingStat(movie)} href={detailHref(movie)} />
      ))}
    </ContentRow>
  );
}

/** ③ 오늘의 통합 OTT랭킹 TOP 10 (Figma "Row Header" 131:683) */
export function RankingTop10({ items }: { items: RankingItem[] }) {
  return (
    <ContentRow
      title="오늘의 통합 OTT랭킹 TOP 10"
      subtitle="넷플릭스 · 티빙 · 쿠팡플레이 · 웨이브 · 디즈니+ · 왓챠 실시간 합산"
      icon={<Flame className="h-5 w-5 text-rose-500 md:h-6 md:w-6" />}
      seeAllHref="/ranking"
    >
      {items.map((item) => (
        <PosterCard
          key={item.movie.id}
          rank={item.rank}
          title={item.movie.title}
          posterUrl={item.movie.poster_url}
          platforms={codes(item.movie)}
          stat={ratingStat(item.movie)}
          trailing={<RankChange change={item.rank_change} isNew={item.is_new} />}
          href={detailHref(item.movie)}
        />
      ))}
    </ContentRow>
  );
}

/** 포스터에 마우스를 올리면 나오는 세대별 평점 비교 */
function CrossAgeOverlay({ movie, highlightAge }: { movie: Movie; highlightAge: AgeGroup }) {
  const rows = AGE_GROUPS.map((age) => ({ age, average: getAgeAverage(movie, age) }));
  const top = rows.reduce((a, b) => (b.average > a.average ? b : a));
  const gap = Math.max(...rows.map((r) => r.average)) - Math.min(...rows.map((r) => r.average));
  const insight =
    gap >= 0.6 ? `세대 간 호불호 차이 큼 (Δ${gap.toFixed(1)})` : gap <= 0.2 ? "전 세대가 고르게 호평" : `${AGE_GROUP_META[top.age].label}가 가장 높게 평가`;

  return (
    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-black/10 p-2.5 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100">
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
            return (
              <li key={age} className="flex items-center gap-2">
                <span className={`w-7 shrink-0 text-[11px] font-bold ${age === highlightAge ? meta.textClass : "text-white/75"}`}>{meta.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.15]">
                  <div className={`h-full rounded-full ${meta.barClass}`} style={{ width: `${(average / 5) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-white">{average.toFixed(1)}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2.5 border-t border-white/10 pt-2 text-[10px] leading-tight text-white/65">{insight}</p>
      </div>
    </div>
  );
}

function CrossAgeCard({ movie, highlightAge }: { movie: Movie; highlightAge: AgeGroup }) {
  return (
    <PosterCard
      size="lg"
      title={movie.title}
      posterUrl={movie.poster_url}
      platforms={codes(movie).slice(0, 1)}
      stat={`${movie.release_year} · ${movie.genres.map((g) => g.name).join(" · ")}`}
      hoverOverlay={<CrossAgeOverlay movie={movie} highlightAge={highlightAge} />}
      href={detailHref(movie)}
    />
  );
}

/** ④ 세대별 교차 평점 추천 */
export function CrossAgePicks({ movies, myAge }: { movies: Movie[]; myAge: AgeGroup }) {
  return (
    <ContentRow
      title="세대별 교차 평점 추천"
      subtitle="포스터에 마우스를 올려 20대 · 30대 · 40대 평점을 비교해 보세요"
      icon={<Users className="h-5 w-5 text-sky-400 md:h-6 md:w-6" />}
      seeAllHref="/generation"
    >
      {movies.map((movie) => (
        <CrossAgeCard key={movie.id} movie={movie} highlightAge={myAge} />
      ))}
    </ContentRow>
  );
}

/** ⑤ 또래가 극찬한 작품 (내 연령대 평균 높은 순) */
export function PeerPicks({ nickname, myAge, movies }: { nickname: string; myAge: AgeGroup; movies: Movie[] }) {
  const label = AGE_GROUP_META[myAge].label;
  const sorted = [...movies].sort((a, b) => getAgeAverage(b, myAge) - getAgeAverage(a, myAge)).slice(0, 10);
  return (
    <ContentRow
      title={`${nickname}님 또래 ${label}가 극찬한 작품`}
      subtitle={`${label} 평균 평점 기준 정렬`}
      icon={<Sparkles className="h-5 w-5 text-fuchsia-400 md:h-6 md:w-6" />}
      seeAllHref="/generation"
    >
      {sorted.map((movie) => (
        <CrossAgeCard key={movie.id} movie={movie} highlightAge={myAge} />
      ))}
    </ContentRow>
  );
}
